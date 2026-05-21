#!/usr/bin/env node
/**
 * 참조 사이트 방문 스크립트
 * Usage: node visit.js <url> [output-dir]
 *
 * - Chromium 미설치 시 자동 설치
 * - 스크린샷 저장 + 페이지 구조(GNB·주요기능·레이아웃) 추출
 * - 결과: {output-dir}/screenshot.png + {output-dir}/structure.json
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const url = process.argv[2];
const outputDir = process.argv[3] || path.join(process.cwd(), 'input');

if (!url) {
  console.error('Usage: node visit.js <url> [output-dir]');
  process.exit(1);
}

const SCRIPT_DIR = __dirname;
const SKILL_ROOT = path.resolve(SCRIPT_DIR, '..');

function tryRequirePlaywright() {
  // 우선순위: 스킬 폴더 node_modules → 글로벌
  const localPath = path.join(SKILL_ROOT, 'node_modules', 'playwright');
  if (fs.existsSync(localPath)) {
    try { return require(localPath); } catch {}
  }
  try { return require('playwright'); } catch {}
  return null;
}

function installPlaywrightPkg() {
  console.log('[visit.js] playwright npm 패키지 자동 설치 중... (스킬 폴더 내)');
  try {
    execSync('npm install playwright --no-audit --no-fund --prefix .', {
      stdio: 'inherit', cwd: SKILL_ROOT,
    });
    console.log('[visit.js] playwright 패키지 설치 완료.');
    return true;
  } catch (e) {
    console.error('[visit.js] [INSTALL_FAIL] playwright npm 설치 실패 — 사내망/방화벽 가능성.');
    console.error('  대응: (1) IT팀에 npm registry 접근 요청  (2) 현행 사이트 캡쳐를 input/screenshot.png 로 직접 제공');
    return false;
  }
}

function installChromium() {
  console.log('[visit.js] Chromium 자동 설치 중...');
  try {
    execSync('npx playwright install chromium', {
      stdio: 'inherit', cwd: SKILL_ROOT,
    });
    console.log('[visit.js] Chromium 설치 완료.');
    return true;
  } catch (e) {
    console.error('[visit.js] [INSTALL_FAIL] Chromium 설치 실패 — 사내망/방화벽 가능성.');
    console.error('  대응: (1) IT팀에 storage.googleapis.com 도메인 허용 요청  (2) PC에 Chrome 설치되어 있으면 자동 사용 가능  (3) 현행 사이트 캡쳐를 input/screenshot.png 로 직접 제공');
    return false;
  }
}

async function ensureBrowser(chromium) {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return installChromium();
  }
}

async function main() {
  let pw = tryRequirePlaywright();
  if (!pw) {
    if (!installPlaywrightPkg()) {
      console.error('[visit.js] [SETUP_FAIL] playwright 패키지 설치 불가 — 현행 분석 진행 차단');
      process.exit(2); // exit code 2 = 설치 실패 (AI/오케스트레이터가 감지)
    }
    pw = tryRequirePlaywright();
    if (!pw) {
      console.error('[visit.js] [SETUP_FAIL] playwright 설치 후에도 require 실패 — 환경 점검 필요');
      process.exit(2);
    }
  }
  const { chromium } = pw;

  if (!(await ensureBrowser(chromium))) {
    console.error('[visit.js] [SETUP_FAIL] Chromium 미설치 + 자동 설치 실패 — 현행 분석 진행 차단');
    process.exit(2);
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 실행 단계 timeout 강화 — 사용자 대기시간 최소화 + 실패 시 즉시 해결책
  const LAUNCH_TIMEOUT_MS = 10000;   // chromium 기동 10초
  const NAVIGATE_TIMEOUT_MS = 15000; // 페이지 로드 15초 (기존 30초 → 절반)

  let browser, context, page;
  try {
    browser = await Promise.race([
      chromium.launch({ headless: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('LAUNCH_TIMEOUT')), LAUNCH_TIMEOUT_MS)),
    ]);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
  } catch (e) {
    console.error(`[visit.js] [LAUNCH_FAIL] Chromium 기동 실패: ${e.message}`);
    console.error('  해결책 (즉시):');
    console.error('  1) 다른 chromium 프로세스 종료 후 재시도 (작업관리자에서 chromium.exe 종료)');
    console.error('  2) chromium 강제 재설치: cd .claude/skills/plan-sb && npx playwright install chromium --force');
    if (browser) try { await browser.close(); } catch {}
    process.exit(3); // exit 3 = 실행 실패 (설치 실패와 구분)
  }

  console.log(`[visit.js] 방문 중: ${url} (${NAVIGATE_TIMEOUT_MS / 1000}s 타임아웃)`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAVIGATE_TIMEOUT_MS });
  } catch (e) {
    const msg = e.message || '';
    console.error(`[visit.js] [NAVIGATE_FAIL] ${url} 접속 실패: ${msg.split('\n')[0]}`);
    console.error('  해결책 (즉시 — 아래 중 1개 선택):');
    if (/timeout|TimeoutError/i.test(msg)) {
      console.error('  1) URL이 매우 느린 경우 — 사용자에게 input/screenshot.png 직접 제공 요청');
      console.error('  2) 사내망 차단 — IT팀에 해당 도메인 허용 요청');
    } else if (/net::ERR|getaddrinfo|ENOTFOUND/i.test(msg)) {
      console.error('  1) URL 오타 확인 (https:// 포함, 도메인 정확)');
      console.error('  2) DNS 문제 — ping 으로 접근성 확인');
    } else {
      console.error('  1) 사용자에게 input/screenshot.png 직접 제공 요청 (Mode B 수동)');
      console.error('  2) Mode A로 전환 — "Mode A로" 입력');
    }
    try { await browser.close(); } catch {}
    process.exit(3);
  }

  // 풀페이지 스크린샷 (기존 호환)
  const screenshotPath = path.join(outputDir, 'screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[visit.js] 뷰포트 스크린샷: ${screenshotPath}`);

  // 섹션별 스크롤 뷰포트 캡쳐
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 1080;
  const scrollSteps = Math.ceil(pageHeight / viewportHeight);
  const sectionShots = [];
  for (let i = 0; i < scrollSteps && i < 10; i++) { // 최대 10장
    await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
    await page.waitForTimeout(300);
    const shotPath = path.join(outputDir, `screenshot-section-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    sectionShots.push(shotPath);
  }
  console.log(`[visit.js] 섹션별 캡쳐: ${sectionShots.length}장 (페이지 높이 ${pageHeight}px)`);

  // 페이지 구조 추출 (GNB·섹션·CTA)
  const structure = await page.evaluate(() => {
    const gnbEl = document.querySelector('nav, header, [role="navigation"]');
    const gnbLinks = gnbEl
      ? [...gnbEl.querySelectorAll('a')].map(a => a.innerText.trim()).filter(Boolean).slice(0, 10)
      : [];

    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .map(h => ({ tag: h.tagName, text: h.innerText.trim() }))
      .filter(h => h.text)
      .slice(0, 20);

    const ctas = [...document.querySelectorAll('a[class*="btn"], button, a[class*="cta"]')]
      .map(el => el.innerText.trim())
      .filter(Boolean)
      .slice(0, 10);

    const sectionCount = document.querySelectorAll('section, [class*="section"], [class*="block"]').length;

    // persistent header 구조 추출 (plan-sb wireframe용)
    const headerEl = document.querySelector('header') || document.querySelector('[role="banner"]');
    const persistentHeader = headerEl ? {
      logo: (() => {
        const logoEl = headerEl.querySelector('img[class*="logo"], img[alt*="logo"], a[class*="logo"] img, h1 img');
        return logoEl ? (logoEl.alt || logoEl.src.split('/').pop()) : '';
      })(),
      gnbItems: gnbLinks,
      utils: [...(headerEl.querySelectorAll('[class*="util"] a, [class*="menu"] button, [class*="search"], [class*="login"]') || [])]
        .map(el => el.innerText.trim() || el.getAttribute('aria-label') || '').filter(Boolean).slice(0, 5)
    } : null;

    return { title: document.title, url: location.href, gnb: gnbLinks, headings, ctas, sectionCount, persistentHeader };
  });

  const structurePath = path.join(outputDir, 'structure.json');
  fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2), 'utf8');
  console.log(`[visit.js] 구조 저장: ${structurePath}`);

  await browser.close();

  console.log('\n=== 사이트 분석 결과 ===');
  console.log(`타이틀: ${structure.title}`);
  console.log(`GNB: ${structure.gnb.join(' / ')}`);
  console.log(`주요 헤딩: ${structure.headings.slice(0, 5).map(h => h.text).join(' | ')}`);
  console.log(`섹션 수: ${structure.sectionCount}`);
  if (structure.persistentHeader) {
    console.log(`Header 로고: ${structure.persistentHeader.logo || '(없음)'}`);
    console.log(`Header 유틸: ${structure.persistentHeader.utils.join(' / ') || '(없음)'}`);
  }
  console.log(`스크린샷: ${screenshotPath}`);
  console.log(`구조 JSON: ${structurePath}`);
}

main().catch(err => {
  console.error('[visit.js] 오류:', err.message);
  process.exit(1);
});
