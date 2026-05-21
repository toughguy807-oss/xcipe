#!/usr/bin/env node
// U-G24 회사 정체성 저장 — 옵션 B 워크플로 (Claude Code 작성 JSON → DB)
//
// 사용:
//   node scripts/save-company-profile.js --identity D:\SYS_v4\data\company-identity.json [--corpus D:\SYS_v4\data\company-corpus.json] [--no-embed]
//
// identity JSON 스키마 (extractIdentity와 동일):
//   {
//     "company_name": string,
//     "identity_summary": string,
//     "core_competencies": [string],
//     "strength_domains": [{"domain": string, "evidence": string, "count": number|null}],
//     "signature_tone": {"tone": string, "voice": string, "audience": string},
//     "brand_tokens": {"primary_colors": [string], "fonts": [string], "imagery": string},
//     "awards": [{"name": string, "year": number|null, "category": string|null}],
//     "client_logos": [string]
//   }
//
// 동작:
//   1) identity JSON 읽기
//   2) corpus JSON 있으면 source_files 메타에 첨부 (없으면 빈 배열)
//   3) embed.js로 identity_embedding 1개 계산 (--no-embed로 비활성화)
//   4) company_profile UPDATE-or-INSERT

const fs = require('fs');
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

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.identity || typeof args.identity !== 'string') {
    console.error('--identity <json-path> 필수');
    process.exit(1);
  }

  const identityPath = path.resolve(args.identity);
  if (!fs.existsSync(identityPath)) {
    console.error(`identity 파일 없음: ${identityPath}`);
    process.exit(1);
  }
  const identity = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
  console.log(`[1/3] identity 로드: ${identityPath}`);
  console.log(`      company_name="${identity.company_name}"`);
  console.log(`      competencies=${(identity.core_competencies || []).length}, domains=${(identity.strength_domains || []).length}, awards=${(identity.awards || []).length}, clients=${(identity.client_logos || []).length}`);

  let sources = [];
  if (args.corpus && typeof args.corpus === 'string') {
    const corpusPath = path.resolve(args.corpus);
    if (fs.existsSync(corpusPath)) {
      const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
      sources = corpus.sources || [];
      console.log(`      corpus 첨부: ${corpusPath} (${sources.length} 소스)`);
    } else {
      console.warn(`      corpus 파일 없음 (스킵): ${corpusPath}`);
    }
  }

  let embedding = null;
  let embeddingInfo = null;
  if (!args['no-embed'] && identity.identity_summary) {
    console.log('[2/3] 임베딩 계산');
    try {
      const { embed, getProviderInfo } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));
      embeddingInfo = getProviderInfo();
      console.log(`      provider=${embeddingInfo.provider}, model=${embeddingInfo.model}, dim=${embeddingInfo.dim}`);
      const text = [
        identity.identity_summary,
        (identity.core_competencies || []).join(', '),
        (identity.strength_domains || []).map(d => d.domain).filter(Boolean).join(', '),
        identity.signature_tone?.tone || ''
      ].filter(Boolean).join(' | ');
      embedding = await embed(text);
      console.log(`      → ${embedding.length}차원 벡터`);
    } catch (e) {
      console.error(`      임베딩 실패: ${e.message}`);
      console.error(`      embedding 없이 진행 (EMBED_PROVIDER=mock 또는 --no-embed 권장)`);
    }
  } else {
    console.log('[2/3] 임베딩 스킵');
  }

  console.log('[3/3] DB 저장');
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const { toBlob } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));
  const blob = embedding ? toBlob(embedding) : null;

  const sourceMeta = sources.map(s => ({
    source: s.source,
    url: s.url || null,
    path: s.source_path || null,
    pages: s.pages || null,
    digest: s.digest,
    captured_at: s.captured_at
  }));

  const existing = db.prepare(`SELECT id FROM company_profile ORDER BY id ASC LIMIT 1`).get();
  const websiteUrl = sources.find(s => s.source === 'company_site')?.url || null;

  const params = [
    identity.company_name || '엘루오씨앤씨',
    websiteUrl,
    identity.identity_summary || null,
    JSON.stringify(identity.core_competencies || []),
    JSON.stringify(identity.strength_domains || []),
    JSON.stringify(identity.signature_tone || {}),
    JSON.stringify(identity.brand_tokens || {}),
    JSON.stringify(identity.awards || []),
    JSON.stringify(identity.client_logos || []),
    JSON.stringify(sourceMeta),
    blob,
    embeddingInfo?.model || null,
    embeddingInfo?.dim || null
  ];

  if (existing) {
    db.prepare(`
      UPDATE company_profile SET
        name = ?, website_url = ?,
        identity_summary = ?, core_competencies = ?,
        strength_domains = ?, signature_tone = ?, brand_tokens = ?,
        awards = ?, client_logos = ?,
        source_files = ?, identity_embedding = ?,
        embedding_model = ?, embedding_dim = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(...params, existing.id);
    console.log(`     → updated (id=${existing.id})`);
  } else {
    const r = db.prepare(`
      INSERT INTO company_profile (
        name, website_url,
        identity_summary, core_competencies,
        strength_domains, signature_tone, brand_tokens,
        awards, client_logos,
        source_files, identity_embedding,
        embedding_model, embedding_dim
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(...params);
    console.log(`     → inserted (id=${r.lastInsertRowid})`);
  }

  console.log('\n완료.');
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
