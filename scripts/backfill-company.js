#!/usr/bin/env node
// U-G24 회사 정체성 백필 — Step A
//
// 입력 2소스:
//   1) PDF (회사소개서)    : --pdf "C:\path\엘루오씨앤씨_회사소개서_2026.pdf"
//   2) 회사 사이트          : --site "https://www.eluocnc.com/ko"
//
// 동작:
//   1. PDF 텍스트 추출 (pdf-parse)
//   2. 사이트 6 페이지 크롤 (메인/about/business/works/news/contact)
//   3. Anthropic Haiku 4.5로 7개 시그니처 추출 (JSON)
//   4. embed.js로 identity_embedding 1개 계산
//   5. company_profile에 INSERT (또는 갱신)
//
// 사용:
//   node scripts/backfill-company.js \
//     --pdf "C:\Users\hj.moon\Downloads\엘루오씨앤씨_회사소개서_2026.pdf" \
//     --site "https://www.eluocnc.com/ko"
//
//   --dry-run     : DB 쓰지 않고 추출 결과만 출력
//   --no-pdf      : PDF 건너뜀
//   --no-site     : 사이트 건너뜀
//   --no-llm      : LLM 호출 건너뜀 (corpus만 적재, 시그니처 비움)
//   --no-embed    : 임베딩 건너뜀
//   --dump <path> : corpus 추출 후 JSON 파일로 덤프하고 종료 (옵션 B 워크플로)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = parseArgs(process.argv.slice(2));
const DRY = args['dry-run'];
const SKIP_PDF = args['no-pdf'];
const SKIP_SITE = args['no-site'];
const SKIP_LLM = args['no-llm'];
const SKIP_EMBED = args['no-embed'];

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

// ─────────────────────────────────────────────────────────
// 1. PDF 인제스트
// ─────────────────────────────────────────────────────────
async function ingestPdf(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF 파일 없음: ${pdfPath}`);
  }
  let pdfParse;
  try { pdfParse = require('pdf-parse'); }
  catch {
    throw new Error('pdf-parse 미설치. `npm i pdf-parse` 실행 필요.');
  }
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  return {
    source: 'company_brochure',
    source_path: pdfPath,
    pages: data.numpages,
    info: data.info || {},
    text: (data.text || '').replace(/\s+\n/g, '\n').trim(),
    digest: sha256(buf),
    captured_at: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────────────────
// 2. 회사 사이트 크롤
// ─────────────────────────────────────────────────────────
const SITE_PATHS_KO = ['', '/about', '/business', '/works', '/news', '/contact'];

async function crawlSite(rootUrl) {
  const results = [];
  const root = rootUrl.replace(/\/$/, '');
  for (const sub of SITE_PATHS_KO) {
    const url = root + sub;
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'EluoSysBackfill/1.0 (+internal indexing)',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
        }
      });
      if (!res.ok) {
        console.warn(`[site] ${res.status} ${url} — skip`);
        continue;
      }
      const html = await res.text();
      const cleaned = stripHtml(html);
      results.push({
        source: 'company_site',
        url,
        title: extractTitle(html),
        html_size: html.length,
        text: cleaned.text.slice(0, 16384),
        images: cleaned.images.slice(0, 80),
        digest: sha256(html),
        captured_at: new Date().toISOString()
      });
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.warn(`[site] ${url} — ${e.message}`);
    }
  }
  return results;
}

// 정규식 기반 HTML 정제 (cheerio 의존성 회피)
function stripHtml(html) {
  let h = html;
  // script/style/noscript 제거
  h = h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');

  // img alt 수집 (works 페이지의 클라이언트 로고용)
  const images = [];
  const imgRe = /<img\b[^>]*?(?:src=["']([^"']+)["'])[^>]*?(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    if (m[2] && m[2].trim()) images.push({ src: m[1], alt: m[2].trim() });
  }
  // src/alt 순서가 반대인 경우도
  const imgRe2 = /<img\b[^>]*?alt=["']([^"']+)["'][^>]*?src=["']([^"']+)["'][^>]*>/gi;
  while ((m = imgRe2.exec(html)) !== null) {
    if (m[1] && m[1].trim()) images.push({ src: m[2], alt: m[1].trim() });
  }

  // 태그 제거 + 공백 정리
  const text = h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();

  return { text, images };
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

// ─────────────────────────────────────────────────────────
// 3. LLM 시그니처 추출 (Anthropic Haiku 4.5)
// ─────────────────────────────────────────────────────────
async function extractIdentity(sources) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 미설정. .env 확인.');
  }
  const corpus = sources.map(s => {
    const head = `### ${s.source} — ${s.url || s.source_path || ''}`;
    const body = (s.text || s.title || '').slice(0, 12000);
    return `${head}\n${body}`;
  }).join('\n\n').slice(0, 60000);

  const prompt = `다음 자료에서 회사 정체성을 7개 항목으로 추출하라.
빈 항목은 null. 자료에 명시된 사실만, 추측 금지.
JSON만 출력 (마크다운 펜스, 설명문 금지).

자료:
${corpus}

스키마:
{
  "company_name": string,
  "identity_summary": string,
  "core_competencies": [string],
  "strength_domains": [{"domain": string, "evidence": string, "count": number|null}],
  "signature_tone": {"tone": string, "voice": string, "audience": string},
  "brand_tokens": {"primary_colors": [string], "fonts": [string], "imagery": string},
  "awards": [{"name": string, "year": number|null, "category": string|null}],
  "client_logos": [string]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: '회사 정체성 시그니처 추출기. JSON만 출력.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`[anthropic] ${res.status} ${res.statusText} — ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  const text = (json.content || []).map(c => c.text || '').join('').trim();
  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  // 마크다운 펜스 제거
  let t = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  // 첫 { ~ 마지막 } 사이만
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

// ─────────────────────────────────────────────────────────
// 4. DB 저장
// ─────────────────────────────────────────────────────────
function saveCompanyProfile({ identity, embedding, embeddingInfo, sources }) {
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const { toBlob } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));

  const existing = db.prepare(`SELECT id FROM company_profile ORDER BY id ASC LIMIT 1`).get();

  const sourceMeta = sources.map(s => ({
    source: s.source,
    url: s.url || null,
    path: s.source_path || null,
    pages: s.pages || null,
    digest: s.digest,
    captured_at: s.captured_at
  }));

  const blob = embedding ? toBlob(embedding) : null;

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
    `).run(
      identity.company_name || '엘루오씨앤씨',
      sources.find(s => s.source === 'company_site')?.url || null,
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
      embeddingInfo?.dim || null,
      existing.id
    );
    return { id: existing.id, action: 'updated' };
  }

  const r = db.prepare(`
    INSERT INTO company_profile (
      name, website_url,
      identity_summary, core_competencies,
      strength_domains, signature_tone, brand_tokens,
      awards, client_logos,
      source_files, identity_embedding,
      embedding_model, embedding_dim
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    identity.company_name || '엘루오씨앤씨',
    sources.find(s => s.source === 'company_site')?.url || null,
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
  );
  return { id: r.lastInsertRowid, action: 'inserted' };
}

// ─────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────
(async () => {
  const sources = [];

  if (!SKIP_PDF && args.pdf) {
    console.log(`[1/4] PDF 인제스트: ${args.pdf}`);
    const pdf = await ingestPdf(args.pdf);
    console.log(`      → ${pdf.pages} 페이지, ${pdf.text.length} 문자, digest=${pdf.digest.slice(0, 12)}`);
    sources.push(pdf);
  } else if (SKIP_PDF) {
    console.log('[1/4] PDF 스킵 (--no-pdf)');
  } else {
    console.log('[1/4] PDF 입력 없음 (--pdf 미지정)');
  }

  if (!SKIP_SITE && args.site) {
    console.log(`[2/4] 사이트 크롤: ${args.site}`);
    const pages = await crawlSite(args.site);
    console.log(`      → ${pages.length} 페이지 수집`);
    for (const p of pages) {
      console.log(`        · ${p.url}  text=${p.text.length}자  images=${p.images.length}`);
    }
    sources.push(...pages);
  } else if (SKIP_SITE) {
    console.log('[2/4] 사이트 스킵 (--no-site)');
  } else {
    console.log('[2/4] 사이트 입력 없음 (--site 미지정)');
  }

  if (!sources.length) {
    console.error('소스 0건 — 종료');
    process.exit(1);
  }

  // 옵션 B: corpus를 파일로 덤프하고 종료 (Claude Code가 읽고 시그니처 작성)
  if (args.dump && typeof args.dump === 'string') {
    const dumpPath = path.resolve(args.dump);
    fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
    fs.writeFileSync(dumpPath, JSON.stringify({
      generated_at: new Date().toISOString(),
      sources_count: sources.length,
      sources
    }, null, 2), 'utf8');
    console.log(`\n[DUMP] corpus → ${dumpPath}`);
    console.log(`       파일 크기 ${fs.statSync(dumpPath).size}바이트, 소스 ${sources.length}건`);
    console.log(`       다음: Claude Code에서 이 파일 읽고 시그니처 JSON 작성 → scripts/save-company-profile.js 로 DB 저장`);
    return;
  }

  let identity = {
    company_name: null,
    identity_summary: null,
    core_competencies: [],
    strength_domains: [],
    signature_tone: {},
    brand_tokens: {},
    awards: [],
    client_logos: []
  };

  if (!SKIP_LLM) {
    console.log('[3/4] LLM 시그니처 추출 (Haiku 4.5)');
    try {
      identity = await extractIdentity(sources);
      console.log(`      → company_name="${identity.company_name}"`);
      console.log(`      → competencies=${(identity.core_competencies || []).length}, domains=${(identity.strength_domains || []).length}, awards=${(identity.awards || []).length}, clients=${(identity.client_logos || []).length}`);
    } catch (e) {
      console.error(`      LLM 실패: ${e.message}`);
      console.error(`      시그니처 추출 건너뛰고 corpus만 적재 (--no-llm 효과)`);
    }
  } else {
    console.log('[3/4] LLM 스킵 (--no-llm)');
  }

  let embedding = null;
  let embeddingInfo = null;
  if (!SKIP_EMBED && identity.identity_summary) {
    console.log('[4/4] 임베딩 계산');
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
    }
  } else {
    console.log('[4/4] 임베딩 스킵');
  }

  if (DRY) {
    console.log('\n=== DRY RUN — DB 쓰기 생략 ===');
    console.log(JSON.stringify({ identity, sources_count: sources.length, embedded: !!embedding }, null, 2));
    return;
  }

  console.log('\n[DB] company_profile 저장');
  const result = saveCompanyProfile({ identity, embedding, embeddingInfo, sources });
  console.log(`     → ${result.action} (id=${result.id})`);
  console.log('\n완료.');
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
