#!/usr/bin/env node
// 회사소개서 포트폴리오 → project_index 백필
//
// data/brochure-portfolio-extract.md 의 표를 파싱해서
// project_index 에 stub 행으로 적재한다 (URL 기준 idempotent).
//
// 기존 라이브 크롤 행 (site_purpose가 있는 행)은 보존하고
// auto_tags 에 브로셔 카테고리만 추가 병합한다.
//
// 사용:
//   node scripts/backfill-brochure-projects.js [--dry] [--md <path>]

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

// 카테고리 헤더 → 태그
const CATEGORY_MAP = [
  { re: /이커머스 구축\/개편\/운영/, tag: 'commerce', industry: '리테일·커머스' },
  { re: /기업\/브랜드 마케팅 채널/, tag: 'marketing-channel', industry: '기업·브랜드' },
  { re: /로레알 코리아 글로벌/, tag: 'loreal', industry: '코스메틱·뷰티(로레알)' },
  { re: /금융 구축\/개편\/운영/, tag: 'finance', industry: '디지털 금융' },
  { re: /코스메틱\/패션/, tag: 'cosmetic-fashion', industry: '코스메틱·패션' },
  { re: /레저\/호텔/, tag: 'leisure-hotel', industry: '레저·호텔·F&B' },
  { re: /교육 구축\/개편\/운영/, tag: 'education', industry: '교육' },
  { re: /웹진, 콘텐츠/, tag: 'content', industry: '콘텐츠' },
  { re: /서비스 UIUX/, tag: 'service-uiux', industry: '서비스' }
];

// "www.innisfree.com" / "innisfree.com" / "fendi.com/en-ko" → "https://www.innisfree.com"
function normalizeUrl(raw) {
  if (!raw) return null;
  // 괄호·따옴표·별표 등 모든 비-URL 문자 제거
  const cleaned = raw.trim().replace(/[`*()'"「」『』]+/g, '');
  if (!cleaned || cleaned === '–' || cleaned === '-') return null;

  // "추정" / "예상" 등이 포함되면 제외 (확인 안 된 URL)
  if (/추정|예상|미확인/.test(cleaned)) return null;

  // 첫 번째 도메인 토큰 (공백·슬래시·콤마로 분리)
  const tokens = cleaned.split(/[\s,]+/);
  for (const t of tokens) {
    const candidate = t.replace(/^https?:\/\//i, '').replace(/^\/+/, '').split('/')[0].toLowerCase();
    // 호스트 검증: 알파벳·숫자·하이픈·점만, 점 1개 이상, 확장자 길이 2~6자
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(candidate)) continue;
    if (!/\.(com|net|org|kr|co\.kr|or\.kr|club\.co\.kr|club|io|ai|app)$/.test(candidate)) {
      // 확장자가 일반적이지 않아도 .xxx 패턴이면 허용
      if (!/\.[a-z]{2,6}$/.test(candidate)) continue;
    }
    return 'https://' + candidate;
  }
  return null;
}

// "(주)아모레퍼시픽" → "아모레퍼시픽"
function cleanClient(s) {
  if (!s) return null;
  return s.replace(/^\(주\)/, '').replace(/\(유\)$/, '').replace(/주식회사/, '').trim();
}

function parseMarkdownTables(md) {
  const lines = md.split('\n');
  const projects = [];
  let currentCategory = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 카테고리 헤더 인식
    if (line.startsWith('## 포트폴리오')) {
      currentCategory = CATEGORY_MAP.find(c => c.re.test(line)) || null;
      continue;
    }

    // 표 데이터 행: | # | 페이지 | 클라이언트 | 프로젝트 | URL | 운영기간 | 비고 |
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/);
    if (!m) continue;

    const [, idx, page, client, project, urlRaw, period, note] = m;
    const url = normalizeUrl(urlRaw);

    projects.push({
      idx: parseInt(idx, 10),
      page: page.trim(),
      client: cleanClient(client),
      clientRaw: client.trim(),
      project: project.trim(),
      url,
      urlRaw: urlRaw.trim(),
      period: period.trim() === '–' ? null : period.trim(),
      note: note.trim() === '–' ? null : note.trim(),
      category: currentCategory ? currentCategory.tag : 'other',
      industry: currentCategory ? currentCategory.industry : null
    });
  }

  return projects;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const mdPath = path.resolve(args.md || 'data/brochure-portfolio-extract.md');
  if (!fs.existsSync(mdPath)) {
    console.error(`경로 없음: ${mdPath}`);
    process.exit(1);
  }

  const md = fs.readFileSync(mdPath, 'utf8');
  const projects = parseMarkdownTables(md);

  console.log(`[1/3] 파싱: ${projects.length}건`);
  const withUrl = projects.filter(p => p.url);
  const noUrl = projects.filter(p => !p.url);
  console.log(`      URL 있음: ${withUrl.length}건`);
  console.log(`      URL 없음: ${noUrl.length}건 (DB 미적재 — 클라이언트만 기록)`);

  // URL 정규화 후 중복 합치기
  const byUrl = new Map();
  for (const p of withUrl) {
    if (!byUrl.has(p.url)) byUrl.set(p.url, []);
    byUrl.get(p.url).push(p);
  }
  console.log(`      고유 URL: ${byUrl.size}개`);

  if (args.dry) {
    console.log('\n[DRY RUN] 적재 대상 미리보기 (상위 10건):');
    let n = 0;
    for (const [url, ps] of byUrl) {
      const first = ps[0];
      console.log(`  ${++n}. ${url} | ${first.client} | ${first.category} | (${ps.length}개 사례)`);
      if (n >= 10) break;
    }
    console.log('\n--dry 모드 — DB 변경 없음');
    return;
  }

  // DB 적재
  console.log('\n[2/3] DB 적재');
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));

  const existing = db.prepare(`SELECT id, external_path, name, auto_tags, site_purpose FROM project_index`).all();
  const existingByUrl = new Map();
  for (const r of existing) {
    if (r.external_path) {
      // host 매칭 (path 제거)
      const host = r.external_path.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      existingByUrl.set(host, r);
    }
  }

  const insStmt = db.prepare(`
    INSERT INTO project_index (
      external_path, name, code, site_purpose,
      feature_signature, auto_tags, status, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?, datetime('now'), datetime('now'))
  `);
  const updStmt = db.prepare(`
    UPDATE project_index SET
      auto_tags = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  let inserted = 0, updated = 0, skipped = 0;

  const tx = db.transaction(() => {
    for (const [url, ps] of byUrl) {
      const first = ps[0];
      const host = url.replace(/^https?:\/\//, '');
      const existingRow = existingByUrl.get(host);

      // 모든 사례에서 클라이언트·카테고리 수집
      const clients = [...new Set(ps.map(p => p.client).filter(Boolean))];
      const categories = [...new Set(ps.map(p => p.category).filter(Boolean))];
      const industries = [...new Set(ps.map(p => p.industry).filter(Boolean))];

      // auto_tags: 클라이언트 + 카테고리 + 산업
      const tags = [...clients, ...categories, ...industries].join(',');

      if (existingRow) {
        // 라이브 크롤 데이터가 있으면 auto_tags만 병합 (다른 필드 보존)
        const oldTags = (existingRow.auto_tags || '').split(',').map(s => s.trim()).filter(Boolean);
        const newTags = tags.split(',').map(s => s.trim()).filter(Boolean);
        const merged = [...new Set([...oldTags, ...newTags])].join(',');
        if (merged !== existingRow.auto_tags) {
          updStmt.run(merged, existingRow.id);
          updated++;
          console.log(`  [UPD] ${url} (${existingRow.name}) tags+="${newTags.join(',')}"`);
        } else {
          skipped++;
        }
      } else {
        // 신규 stub 행
        const projectName = ps.length === 1 ? first.project : `${clients[0]} (${ps.length}개 사례)`;
        const sig = JSON.stringify({
          source: 'brochure',
          client: clients.join(' / '),
          categories,
          industries,
          cases: ps.map(p => ({
            page: p.page,
            project: p.project,
            period: p.period,
            note: p.note
          })),
          extracted_at: new Date().toISOString()
        });
        insStmt.run(
          url,
          projectName,
          null, // code
          first.project, // site_purpose: 일단 첫 케이스 프로젝트명
          sig,
          tags,
          'active' // status (CHECK 제약: active/archived/template만)
        );
        inserted++;
        console.log(`  [INS] ${url} | ${projectName} | ${tags.slice(0, 60)}...`);
      }
    }
  });

  tx();

  console.log(`\n[3/3] 완료: 신규 ${inserted}건, 업데이트 ${updated}건, 변경없음 ${skipped}건`);

  // 요약
  const total = db.prepare(`SELECT COUNT(*) as c FROM project_index`).get().c;
  const stubs = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE feature_signature LIKE '%"source":"brochure"%'`).get().c;
  const live = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE feature_signature LIKE '%"source":"live_site"%'`).get().c;
  console.log(`\nproject_index 현황: 총 ${total}건 (라이브 크롤 ${live}, 브로셔 stub ${stubs})`);

  if (noUrl.length > 0) {
    console.log(`\nURL 없는 ${noUrl.length}건 (DB 미적재):`);
    for (const p of noUrl) {
      console.log(`  · ${p.page} | ${p.client} | ${p.project}`);
    }
  }
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
