#!/usr/bin/env node
/**
 * verify-never-rules.js
 *
 * 목적: lib/rules/publish-patterns.md 의 Never-Rules 6 카테고리(Typography/
 *       Color/Layout/Motion/Content/Icon&Image)를 CSS + HTML 전수 grep.
 *
 * 출력: JSON — 카테고리별 위반 목록 + 파일/줄번호/매치 문자열.
 * 종료코드: 0 = 위반 0건 (PASS), 1 = 위반 ≥1건 (FAIL), 2 = 오류.
 *
 * 사용:
 *   node verify-never-rules.js --root output/.../publish/ [--include html,css,js]
 */

const fs = require('fs');
const path = require('path');

const RULES = [
  // Typography
  { cat: 'Typography', sev: 'FAIL', pattern: /font-family:\s*['"]?(Inter|Roboto|Arial|system-ui|sans-serif)[,'"\s;]/gi, reason: '포화 폰트 — Pretendard/Geist/Variable Serif로 대체' },
  { cat: 'Typography', sev: 'WARN', pattern: /font-family:\s*['"]?(Fraunces)[,'"\s;]/gi, reason: 'Fraunces는 2024~2025 포화 진입. 2026 기준 재검토' },
  { cat: 'Typography', sev: 'FAIL', pattern: /font-size:\s*1[0-4]px(?![0-9])/g, reason: '본문 스케일 하한 위반 (< 16px)' },
  // Color
  { cat: 'Color', sev: 'FAIL', pattern: /#000000|#000(?![0-9a-fA-F])|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/g, reason: 'pure black 금지 — OKLCH tinted black 사용' },
  { cat: 'Color', sev: 'FAIL', pattern: /(?:#6366[Ff]1|#7[Cc]3[Aa][Ee][Dd]|#8[Bb]5[Cc][Ff]6)/g, reason: '포화 퍼플 팔레트' },
  { cat: 'Color', sev: 'WARN', pattern: /\b(purple|violet)\b(?!-[0-9])/gi, reason: '퍼플 키워드 — 사용 맥락 재확인' },
  { cat: 'Color', sev: 'WARN', pattern: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.[0-9]+\s*\)/g, reason: 'black shadow — color-mix(in oklch, ...) 로 대체' },
  // Layout
  { cat: 'Layout', sev: 'WARN', pattern: /\b(?:min-)?height:\s*100vh\b/g, reason: '100vh 고정 — dvh/svh/lvh 또는 clamp() 권장' },
  { cat: 'Layout', sev: 'WARN', pattern: /grid-template-columns:\s*repeat\(\s*3\s*,\s*1fr\)/gi, reason: '3-col 카드 반복 — Bento/Editorial로 1건+ 교체' },
  // Motion
  { cat: 'Motion', sev: 'FAIL', pattern: /transition:[^;]*\b(top|left|width|height)\b[^;]*;/gi, reason: 'layout-trigger 속성 트랜지션 — transform/opacity로' },
  { cat: 'Motion', sev: 'FAIL', pattern: /:hover[^{]*\{[^}]*transform:\s*scale\(1\.0[3-9]\)/gi, reason: 'hover scale(1.05) 일괄 — 컴포넌트별 고유 모션' },
  // Content (HTML)
  { cat: 'Content', sev: 'FAIL', pattern: /\b(John Doe|Jane Doe|Acme|Nexus|Globex|Initech|Lorem ipsum|Example Inc\.?)\b/gi, reason: '플레이스홀더 콘텐츠 — 실제 카피로 대체' },
  { cat: 'Content', sev: 'FAIL', pattern: /\b(Elevate|Seamless|Unleash|Empower|Next-?Gen|Revolutionary|Leverage|Synergize)\b/gi, reason: 'generic marketing speak — 구체 동사/수치로' },
  // Icon & Image
  { cat: 'Icon&Image', sev: 'WARN', pattern: /via\.placeholder\.com|placehold\.co/g, reason: '플레이스홀더 이미지 — 실제 비주얼로' },
];

function parseArgs(argv) {
  const out = { root: null, include: ['html', 'css', 'js'] };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--root') out.root = v, !argv[i].includes('=') && i++;
    else if (k === '--include') out.include = v.split(','), !argv[i].includes('=') && i++;
  }
  return out;
}

function walk(dir, include, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(node_modules|\.git|dist|build)$/.test(entry.name)) walk(p, include, acc);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (include.includes(ext)) acc.push(p);
    }
  }
  return acc;
}

function scanFile(file, rules) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m;
    while ((m = re.exec(content)) !== null) {
      // 줄번호 계산
      const prefix = content.slice(0, m.index);
      const line = prefix.split(/\r?\n/).length;
      hits.push({
        category: rule.cat,
        severity: rule.sev,
        reason: rule.reason,
        file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
        line,
        match: m[0].slice(0, 80),
      });
      if (!re.global) break;
    }
  }
  return hits;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.root) {
    console.error('USAGE: node verify-never-rules.js --root <dir> [--include html,css,js]');
    process.exit(2);
  }
  const files = walk(args.root, args.include);
  const allHits = [];
  for (const f of files) allHits.push(...scanFile(f, RULES));

  const byCat = {};
  for (const h of allHits) {
    (byCat[h.category] = byCat[h.category] || { FAIL: 0, WARN: 0, hits: [] });
    byCat[h.category][h.severity]++;
    byCat[h.category].hits.push(h);
  }

  const failCount = allHits.filter((h) => h.severity === 'FAIL').length;
  const warnCount = allHits.filter((h) => h.severity === 'WARN').length;

  const report = {
    root: args.root,
    files_scanned: files.length,
    total_violations: allHits.length,
    fail_count: failCount,
    warn_count: warnCount,
    verdict: failCount === 0 ? 'PASS' : 'FAIL',
    by_category: byCat,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(failCount === 0 ? 0 : 1);
}

main();
