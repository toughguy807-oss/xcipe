#!/usr/bin/env node
// U-G24 프로젝트 백필 — Step B
//
// 단일 프로젝트 폴더를 스캔하여 project_index + artifact_index + artifact_corpus(FTS5) 에 적재.
//
// 사용:
//   node scripts/backfill-project.js --root "D:\검증\visitgangnam" [--dump <path>] [--no-embed]
//
// 동작:
//   1. PROJECT.md 파싱 (선택) — 이름·코드·목적 추출
//   2. output/ 재귀 스캔 — 파일명 패턴으로 kind 분류
//        REQ_*  → req
//        FN_*   → fn
//        IA_*   → ia
//        SB_*   → sb
//        WBS_*  → wbs
//        QST_*  → qst
//        Benchmark_* → bench
//        publish/*.html → publish
//        qa/*.{md,html,json} → qa
//   3. 각 파일 본문 → artifact_index 행 1건 + artifact_corpus FTS5 행 1건
//   4. project_index 1건 INSERT (external_path 기준 idempotent)
//   5. embedding은 project_index 1개 + artifact_index 각각 (현재는 mock 가정)
//
// 옵션 B 워크플로:
//   --dump <path>  : 시그니처 추출용 corpus(JSON)만 덤프하고 종료. Claude Code가 읽고 시그니처 작성 → 별도 갱신.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function sha256(s) {
  return crypto.createHash('sha256').update(typeof s === 'string' ? s : Buffer.from(s)).digest('hex');
}

function classifyKind(filename, relPath) {
  const base = path.basename(filename);
  const lower = base.toLowerCase();
  const rel = relPath.replace(/\\/g, '/').toLowerCase();

  if (/^qst[_-]/i.test(base)) return 'qst';
  if (/^req[_-]/i.test(base)) return 'req';
  if (/^fn[_-]/i.test(base)) return 'fn';
  if (/^ia[_-]/i.test(base)) return 'ia';
  if (/^sb[_-]/i.test(base)) return 'sb';
  if (/^wbs[_-]/i.test(base)) return 'wbs';
  if (/^benchmark[_-]/i.test(base)) return 'bench';
  if (/^persona[_-]/i.test(base)) return 'persona';
  if (/^competitor[_-]/i.test(base)) return 'competitor';
  if (/^premortem[_-]/i.test(base)) return 'premortem';
  if (/^dashboard[_-]/i.test(base)) return 'dashboard';

  if (rel.includes('/publish/') && (lower.endsWith('.html') || lower.endsWith('.htm'))) return 'publish';
  if (rel.includes('/qa/') && (lower.endsWith('.md') || lower.endsWith('.html') || lower.endsWith('.json'))) return 'qa';
  if (rel.includes('/design/') || rel.includes('/시안') || rel.includes('/visual/')) return 'design';

  if (lower === 'project.md' || lower === 'readme.md') return 'meta';
  return null;
}

function walk(dir, baseDir, hits) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, baseDir, hits);
      continue;
    }
    if (!e.isFile()) continue;
    const rel = path.relative(baseDir, full);
    const kind = classifyKind(e.name, rel);
    if (!kind) continue;
    hits.push({ full, rel, kind });
  }
}

function readSafe(p, max = 200000) {
  try {
    const buf = fs.readFileSync(p);
    if (buf.length <= max) return buf.toString('utf8');
    return buf.slice(0, max).toString('utf8') + '\n\n[... truncated]';
  } catch (e) {
    return null;
  }
}

function stripHtmlBody(html) {
  let h = html;
  h = h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  return h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMetaFromProjectMd(text) {
  if (!text) return {};
  const m = {};
  const grab = (re) => { const x = text.match(re); return x ? x[1].trim() : null; };
  m.name = grab(/^#\s+(.+)$/m);
  m.code = grab(/프로젝트\s*코드\s*[:：*]+\s*([^\n]+)/);
  m.kind = grab(/유형\s*[:：*]+\s*([^\n]+)/);
  m.url  = grab(/현행\s*사이트\s*[:：*]+\s*([^\n\s]+)/) || grab(/사이트\s*[:：*]+\s*([^\n\s]+)/);
  m.purpose = grab(/목적\s*[:：*]+\s*([^\n]+)/);
  return m;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root || typeof args.root !== 'string') {
    console.error('--root <project-folder> 필수');
    process.exit(1);
  }
  const root = path.resolve(args.root);
  if (!fs.existsSync(root)) {
    console.error(`경로 없음: ${root}`);
    process.exit(1);
  }

  console.log(`[1/4] 프로젝트 스캔: ${root}`);
  // PROJECT.md
  const projectMdPath = path.join(root, 'PROJECT.md');
  let projectMeta = {};
  if (fs.existsSync(projectMdPath)) {
    const t = readSafe(projectMdPath);
    projectMeta = extractMetaFromProjectMd(t);
    console.log(`      PROJECT.md → name="${projectMeta.name || '?'}" code="${projectMeta.code || '?'}"`);
  } else {
    projectMeta.name = path.basename(root);
    console.log(`      PROJECT.md 없음 → 폴더명 사용 ("${projectMeta.name}")`);
  }

  // 산출물 스캔
  const hits = [];
  walk(path.join(root, 'output'), root, hits);
  walk(path.join(root, 'input'), root, hits);
  if (fs.existsSync(projectMdPath)) hits.unshift({ full: projectMdPath, rel: 'PROJECT.md', kind: 'meta' });

  console.log(`      → 산출물 ${hits.length}건 발견`);
  const byKind = {};
  for (const h of hits) byKind[h.kind] = (byKind[h.kind] || 0) + 1;
  for (const [k, v] of Object.entries(byKind)) console.log(`        · ${k}: ${v}`);

  // 본문 적재
  const artifacts = [];
  for (const h of hits) {
    const raw = readSafe(h.full);
    if (!raw) continue;
    const isHtml = h.full.toLowerCase().endsWith('.html');
    const body = isHtml ? stripHtmlBody(raw) : raw;
    if (!body || body.length < 20) continue;
    artifacts.push({
      kind: h.kind,
      section: null,
      path: h.rel.replace(/\\/g, '/'),
      digest: sha256(raw),
      body,
      body_excerpt: body.slice(0, 600)
    });
  }
  console.log(`[2/4] 본문 적재 후보: ${artifacts.length}건`);

  // dump 모드: corpus를 파일로 저장하고 종료
  if (args.dump && typeof args.dump === 'string') {
    const dumpPath = path.resolve(args.dump);
    fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
    fs.writeFileSync(dumpPath, JSON.stringify({
      generated_at: new Date().toISOString(),
      root,
      project_meta: projectMeta,
      artifacts
    }, null, 2), 'utf8');
    console.log(`\n[DUMP] corpus → ${dumpPath}`);
    console.log(`       파일 크기 ${fs.statSync(dumpPath).size}바이트, 산출물 ${artifacts.length}건`);
    console.log(`       다음: Claude Code가 읽고 시그니처 작성 → scripts/save-project-index.js로 DB 저장`);
    return;
  }

  // DB 적재 (시그니처 비워두고 본문만)
  console.log('[3/4] DB 적재');
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const { embed, toBlob, getProviderInfo } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));

  const externalPath = root.replace(/\\/g, '/');
  const projectName = projectMeta.name || path.basename(root);
  const projectCode = projectMeta.code || null;
  const sitePurpose = projectMeta.purpose || null;

  // 1) 임베딩은 트랜잭션 밖에서 미리 계산 (better-sqlite3 트랜잭션은 sync only)
  let embInfo = null;
  let projectEmbBlob = null;
  const artifactBlobs = new Array(artifacts.length).fill(null);

  if (!args['no-embed']) {
    try {
      embInfo = getProviderInfo();
      console.log(`      provider=${embInfo.provider}, model=${embInfo.model}, dim=${embInfo.dim}`);
      const v = await embed([projectName, projectCode, sitePurpose].filter(Boolean).join(' | ') || projectName);
      projectEmbBlob = toBlob(v);
      for (let i = 0; i < artifacts.length; i++) {
        try {
          const av = await embed(artifacts[i].body.slice(0, 4000));
          artifactBlobs[i] = toBlob(av);
        } catch { /* skip individual failure */ }
      }
      console.log(`      embedding 완료 (project 1 + artifacts ${artifactBlobs.filter(Boolean).length}/${artifacts.length})`);
    } catch (e) {
      console.warn(`      임베딩 실패: ${e.message} — embedding 없이 진행`);
      embInfo = null;
    }
  }

  // 2) FTS5 가용성 확인
  let ftsAvailable = false;
  let insFts;
  try {
    insFts = db.prepare(`
      INSERT INTO artifact_corpus (artifact_index_id, project_index_id, kind, section, path, body)
      VALUES (?,?,?,?,?,?)
    `);
    ftsAvailable = true;
  } catch { ftsAvailable = false; }

  // 3) sync 트랜잭션
  const digest = sha256(JSON.stringify({ projectName, projectCode, sitePurpose, count: artifacts.length }));
  const insArt = db.prepare(`
    INSERT INTO artifact_index (
      project_index_id, kind, section, path, digest, body_excerpt,
      embedding, embedding_model
    ) VALUES (?,?,?,?,?,?,?,?)
  `);

  const tx = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM project_index WHERE external_path = ?`).get(externalPath);

    let projectIndexId;
    if (existing) {
      db.prepare(`
        UPDATE project_index SET
          name = ?, code = ?, site_purpose = ?,
          artifact_counts = ?, embedding = ?, embedding_model = ?, embedding_dim = ?,
          digest = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        projectName, projectCode, sitePurpose,
        JSON.stringify(byKind),
        projectEmbBlob, embInfo?.model || null, embInfo?.dim || null,
        digest, existing.id
      );
      projectIndexId = existing.id;
      console.log(`      project_index updated (id=${projectIndexId})`);
    } else {
      const r = db.prepare(`
        INSERT INTO project_index (
          external_path, name, code, site_purpose,
          artifact_counts, embedding, embedding_model, embedding_dim, digest
        ) VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        externalPath, projectName, projectCode, sitePurpose,
        JSON.stringify(byKind),
        projectEmbBlob, embInfo?.model || null, embInfo?.dim || null,
        digest
      );
      projectIndexId = r.lastInsertRowid;
      console.log(`      project_index inserted (id=${projectIndexId})`);
    }

    // 기존 artifact_index/corpus 정리 (해당 프로젝트만)
    db.prepare(`DELETE FROM artifact_index WHERE project_index_id = ?`).run(projectIndexId);
    if (ftsAvailable) {
      try { db.prepare(`DELETE FROM artifact_corpus WHERE project_index_id = ?`).run(projectIndexId); } catch {}
    }

    let inserted = 0;
    for (let i = 0; i < artifacts.length; i++) {
      const a = artifacts[i];
      const ar = insArt.run(
        projectIndexId, a.kind, a.section, a.path, a.digest, a.body_excerpt,
        artifactBlobs[i], embInfo?.model || null
      );
      if (ftsAvailable && insFts) {
        insFts.run(ar.lastInsertRowid, projectIndexId, a.kind, a.section, a.path, a.body);
      }
      inserted++;
    }
    console.log(`      artifact_index ${inserted}건 적재`);
    console.log(`      artifact_corpus FTS5 적재 ${ftsAvailable ? '완료' : '스킵 (FTS5 없음)'}`);
  });

  tx();

  console.log('\n[4/4] 검증');
  const sample = db.prepare(`
    SELECT pi.id, pi.name, pi.code, COUNT(ai.id) AS artifact_count
    FROM project_index pi LEFT JOIN artifact_index ai ON ai.project_index_id = pi.id
    GROUP BY pi.id ORDER BY pi.id DESC LIMIT 5
  `).all();
  console.table(sample);

  console.log('\n완료.');
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
