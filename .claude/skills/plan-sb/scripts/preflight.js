#!/usr/bin/env node
/**
 * preflight.js — 플러그인·환경 자가 진단 (빠른 응답, 2초 이내)
 *
 * Usage:
 *   node scripts/preflight.js              # 사람용 가이드 출력
 *   node scripts/preflight.js --json       # AI/오케스트레이터용 JSON
 *
 * 검사 항목 (각각 응답 타임 측정):
 *   1. node 버전
 *   2. SKILL.md 존재 + 읽기 가능
 *   3. playwright 패키지 설치 (node_modules 존재 — launch 안함)
 *   4. chromium 바이너리 설치 (ms-playwright 캐시 폴더)
 *   5. visit.js 실행 가능 여부 (--help 1초 timeout)
 *
 * 정책:
 *   - 각 단계 타임아웃 1.5초 → 빠른 실패
 *   - 한 항목이라도 FAIL이면 exit code 2 (visit.js 동일 정책)
 *   - JSON 모드: AI가 status·guide·elapsed_ms 읽어 사용자에게 전달
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const SCRIPT_DIR = __dirname;
const SKILL_ROOT = path.resolve(SCRIPT_DIR, '..');
const wantJson = process.argv.includes('--json');

const checks = [];
let overallOk = true;

function add(name, ok, elapsed_ms, detail, guide) {
  checks.push({ name, ok, elapsed_ms, detail, guide: ok ? null : guide });
  if (!ok) overallOk = false;
}

function timed(fn) {
  const t0 = Date.now();
  try {
    const r = fn();
    return { elapsed: Date.now() - t0, result: r, error: null };
  } catch (e) {
    return { elapsed: Date.now() - t0, result: null, error: e.message };
  }
}

// ─── 1. Node 버전 ───
{
  const ver = process.versions.node;
  const major = parseInt(ver.split('.')[0], 10);
  add('node-version', major >= 18, 0, `node ${ver}`,
    'Node 18 이상 필요. https://nodejs.org/ko 에서 LTS 설치');
}

// ─── 2. SKILL.md ───
{
  const t = timed(() => {
    const p = path.join(SKILL_ROOT, 'SKILL.md');
    if (!fs.existsSync(p)) throw new Error('SKILL.md 없음');
    const stat = fs.statSync(p);
    if (stat.size < 1000) throw new Error(`SKILL.md 크기 비정상 (${stat.size} bytes)`);
    return `${stat.size} bytes`;
  });
  add('skill-md', !t.error, t.elapsed, t.error || t.result,
    '플러그인 미설치 가능성. 배포 폴더 안에서 claude를 실행했는지 확인. SKILL.md 위치: ' + path.join(SKILL_ROOT, 'SKILL.md'));
}

// ─── 3. Playwright npm 패키지 ───
{
  const t = timed(() => {
    const local = path.join(SKILL_ROOT, 'node_modules', 'playwright');
    if (fs.existsSync(local)) return `로컬 (${SKILL_ROOT}/node_modules/playwright)`;
    // 글로벌 require 시도
    try { require.resolve('playwright'); return '글로벌'; }
    catch { throw new Error('미설치'); }
  });
  add('playwright-pkg', !t.error, t.elapsed, t.error || t.result,
    `cd "${SKILL_ROOT}" && npm install playwright  (사내망: IT팀에 npm registry 접근 요청)`);
}

// ─── 4. Chromium 바이너리 ───
{
  const t = timed(() => {
    // 표준 캐시 위치
    const candidates = [
      path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),  // Windows
      path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
      path.join(os.homedir(), '.cache', 'ms-playwright'),            // Linux
    ];
    for (const dir of candidates) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir).filter(n => /^chromium/i.test(n));
      if (entries.length > 0) return `${dir}/${entries[0]}`;
    }
    throw new Error('Chromium 바이너리 없음');
  });
  add('chromium-binary', !t.error, t.elapsed, t.error || t.result,
    `cd "${SKILL_ROOT}" && npx playwright install chromium  (사내망: storage.googleapis.com 도메인 허용 요청)`);
}

// ─── 5. visit.js 호출 가능 여부 (1초 timeout) ───
{
  const t = timed(() => {
    const visitPath = path.join(SKILL_ROOT, 'scripts', 'visit.js');
    if (!fs.existsSync(visitPath)) throw new Error('visit.js 없음');
    // node --check 로 syntax 검증만 (실행 X)
    execSync(`node --check "${visitPath}"`, { stdio: 'pipe', timeout: 1500 });
    return 'syntax OK';
  });
  add('visit-js', !t.error, t.elapsed, t.error || t.result,
    'visit.js 손상 가능성. 배포본 재설치 또는 마스터 동기화 필요');
}

// ─── 결과 출력 ───
const totalMs = checks.reduce((s, c) => s + c.elapsed_ms, 0);

if (wantJson) {
  console.log(JSON.stringify({ ok: overallOk, total_ms: totalMs, checks }, null, 2));
  process.exit(overallOk ? 0 : 2);
}

// 사람용 출력
const symbol = ok => ok ? '✓' : '✗';
console.log('\n[plan-sb 사전 점검]');
console.log('─'.repeat(60));
checks.forEach(c => {
  console.log(`  ${symbol(c.ok)} ${c.name.padEnd(18)} ${c.elapsed_ms.toString().padStart(4)}ms  ${c.detail}`);
  if (c.guide) console.log(`     → 해결: ${c.guide}`);
});
console.log('─'.repeat(60));
console.log(`  총 ${totalMs}ms · ${overallOk ? '✓ 정상' : '✗ 문제 발견'}`);
console.log();

if (!overallOk) {
  console.log('[빠른 가이드]');
  console.log('  운영 SB(현행 캡쳐) 작업이라면 위 FAIL 항목을 먼저 해결하세요.');
  console.log('  신규 SB(HTML 목업)만 만들 거라면 일부 FAIL은 무시 가능합니다.');
  console.log();
  process.exit(2);
}
