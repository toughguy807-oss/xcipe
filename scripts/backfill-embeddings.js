#!/usr/bin/env node
// project_index 의 active 행에 임베딩 BLOB 채움.
//
// 임베딩 텍스트: name + site_purpose + auto_tags (최대 8KB)
// EMBED_PROVIDER (voyage|openai|mock) 환경변수에 따라 동작.
//   - voyage/openai: API 호출 (배치 16건)
//   - mock: SHA256 기반 deterministic (인프라 검증용)
//
// 사용:
//   node scripts/backfill-embeddings.js [--limit 10] [--force] [--dry]
//   EMBED_PROVIDER=mock node scripts/backfill-embeddings.js

const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function buildText(r) {
  const parts = [];
  if (r.name) parts.push(r.name);
  if (r.site_purpose) parts.push(r.site_purpose);
  if (r.auto_tags) parts.push(r.auto_tags.split(',').join(' '));
  return parts.join('\n').slice(0, 8000);
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const { embedBatch, toBlob, getProviderInfo } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));

  const info = getProviderInfo();
  console.log(`[1/3] Provider: ${info.provider} (model=${info.model}, dim=${info.dim})`);

  let q = `SELECT id, name, site_purpose, auto_tags, embedding, embedding_model FROM project_index WHERE status = 'active'`;
  if (!args.force) {
    q += ` AND (embedding IS NULL OR embedding_model != '${info.model}')`;
  }
  q += ` ORDER BY id`;
  if (args.limit) q += ` LIMIT ${parseInt(args.limit, 10) || 10}`;

  const rows = db.prepare(q).all();
  console.log(`[2/3] 대상: ${rows.length}건`);
  if (rows.length === 0) {
    const total = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE status='active' AND embedding IS NOT NULL`).get().c;
    const all = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE status='active'`).get().c;
    console.log(`현재 임베딩 보유: ${total}/${all}`);
    return;
  }

  if (args.dry) {
    for (const r of rows.slice(0, 5)) console.log(`  · ${r.id} | ${(r.name || '').slice(0, 40)} | ${buildText(r).length}자`);
    console.log(`--dry — 변경 없음`);
    return;
  }

  const upd = db.prepare(`
    UPDATE project_index SET embedding = ?, embedding_model = ?, embedding_dim = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const BATCH = 16;
  let ok = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map(buildText);
    const tag = `[${i + 1}-${Math.min(i + BATCH, rows.length)}/${rows.length}]`;
    process.stdout.write(`${tag} embedding ${batch.length}건 ... `);
    try {
      const vectors = await embedBatch(texts);
      const tx = db.transaction(() => {
        for (let j = 0; j < batch.length; j++) {
          const v = vectors[j];
          if (!v) { failed++; continue; }
          upd.run(toBlob(v), info.model, v.length, batch[j].id);
          ok++;
        }
      });
      tx();
      console.log('OK');
    } catch (e) {
      failed += batch.length;
      console.log(`FAIL (${e.message.slice(0, 80)})`);
    }
    // rate limit (실 API)
    if (info.provider !== 'mock') await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n[3/3] 완료: 성공 ${ok}건, 실패 ${failed}건`);
  const total = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE status='active' AND embedding IS NOT NULL`).get().c;
  const all = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE status='active'`).get().c;
  console.log(`임베딩 보유: ${total}/${all}`);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
