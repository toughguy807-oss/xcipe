#!/usr/bin/env node
// xcipe 디자인 시스템 정적 검수 (P2-3)
//
// 목적: SYS_v4 자체 UI(public/css, public/js/components)가 xcipe 토큰
// (--navy/--yellow + 의미 토큰)만 사용하는지 검사. 토큰 우회한 raw hex/rgb
// 사용을 검출하여 디자인 시스템 일관성 회귀를 막는다.
//
// 사용:
//   node scripts/verify-xcipe.js          → 리포트 출력 (위반 시 exit 1)
//   node scripts/verify-xcipe.js --json   → JSON 출력 (CI/대시보드용)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS_PATH = path.join(ROOT, 'public', 'css', 'style.css');
const JS_DIR = path.join(ROOT, 'public', 'js', 'components');

// xcipe 공식 토큰 — :root에 정의된 변수만 사용. raw hex/rgb는 위반.
// 단, CSS 변수 *정의* 라인(--xxx: #yyy)은 허용.
const ALLOWED_RAW = new Set([
  '#fff', '#ffffff', '#000', '#000000',  // 기본 흑백
  'transparent', 'currentcolor', 'inherit', 'none', 'initial', 'unset'
]);

// xcipe 핵심 색상 (정보 메시지용)
const XCIPE_NAVY = '#00007F';
const XCIPE_YELLOW = '#FEFE01';

function isVarDefinitionLine(line) {
  // :root 또는 .xxx { --foo: #yyy } 형태 → 변수 정의이므로 허용
  return /^\s*--[\w-]+\s*:/.test(line);
}

// CSS 주석(/* ... */) 또는 JS 단일 라인 주석(// ...) 내부의 색상은 무시 (문서·예시일 가능성)
// 라인 단위 휴리스틱: 라인 전체가 주석이거나 // 뒤에 hex가 등장하면 제외.
// 멀티라인 /* */ 추적은 스캐너에서 수행.
function stripComments(content) {
  // /* ... */ 블록 주석을 공백으로 치환 (라인 수 보존)
  return content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function findRawColors(content, filePath) {
  const violations = [];
  const stripped = stripComments(content);
  const lines = stripped.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isVarDefinitionLine(line)) continue;
    // JS 단일 라인 주석(// ...): 주석 시작 위치에서 잘라냄
    const lineForScan = line.replace(/\/\/.*$/, '');
    if (!lineForScan.trim()) continue;

    // hex (#xxx, #xxxxxx, #xxxxxxxx)
    const hexMatches = [...lineForScan.matchAll(/#([0-9a-fA-F]{3,8})\b/g)];
    for (const m of hexMatches) {
      const hex = m[0].toLowerCase();
      if (ALLOWED_RAW.has(hex)) continue;
      // 8자리(투명도) hex 중 ALLOWED_RAW 변형도 허용 (예: #ffffff80 = 흰색 50%)
      if (hex.length === 9 && ALLOWED_RAW.has(hex.slice(0, 7))) continue;
      violations.push({
        file: filePath, line: i + 1, value: hex,
        snippet: line.trim().slice(0, 120)
      });
    }

    // rgb()/rgba() — var(--xxx) 안에 들어있으면 허용 (rgba 함수 내부에 변수 사용)
    const rgbMatches = [...lineForScan.matchAll(/rgba?\([^)]+\)/g)];
    for (const m of rgbMatches) {
      const value = m[0];
      // var(--xxx)나 0,0,0 / 255,255,255 / 0,0,127 (navy) / 254,254,1 (yellow) 는 허용
      if (/var\(--/.test(value)) continue;
      if (/^rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255|0\s*,\s*0\s*,\s*127|254\s*,\s*254\s*,\s*1)\b/.test(value)) continue;
      violations.push({
        file: filePath, line: i + 1, value,
        snippet: line.trim().slice(0, 120)
      });
    }
  }
  return violations;
}

function walkJs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJs(p));
    else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) files.push(p);
  }
  return files;
}

function main() {
  const isJson = process.argv.includes('--json');
  const allViolations = [];

  // 1) style.css 검사
  if (fs.existsSync(CSS_PATH)) {
    const content = fs.readFileSync(CSS_PATH, 'utf-8');
    allViolations.push(...findRawColors(content, path.relative(ROOT, CSS_PATH)));
  }

  // 2) public/js/components/*.js 검사 (인라인 스타일 검출)
  if (fs.existsSync(JS_DIR)) {
    for (const f of walkJs(JS_DIR)) {
      const content = fs.readFileSync(f, 'utf-8');
      allViolations.push(...findRawColors(content, path.relative(ROOT, f)));
    }
  }

  // 그룹핑
  const byFile = {};
  for (const v of allViolations) {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  }

  if (isJson) {
    console.log(JSON.stringify({
      ok: allViolations.length === 0,
      tokens: { navy: XCIPE_NAVY, yellow: XCIPE_YELLOW },
      total: allViolations.length,
      byFile,
      violations: allViolations
    }, null, 2));
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  xcipe 디자인 시스템 정적 검수');
    console.log(`  공식 토큰: navy=${XCIPE_NAVY}, yellow=${XCIPE_YELLOW}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (allViolations.length === 0) {
      console.log('  ✓ 위반 없음 — 모든 색상이 토큰을 통해 사용됨');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(0);
    }
    console.log(`  ✗ 토큰을 우회한 raw 색상 ${allViolations.length}건 검출\n`);
    for (const file of Object.keys(byFile).sort()) {
      console.log(`▸ ${file} (${byFile[file].length}건)`);
      for (const v of byFile[file].slice(0, 10)) {
        console.log(`    L${v.line}: ${v.value}`);
        console.log(`        ${v.snippet}`);
      }
      if (byFile[file].length > 10) {
        console.log(`    ... 외 ${byFile[file].length - 10}건`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  대응: --navy / --yellow / --success / --warn / --danger 토큰 사용');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
}

main();
