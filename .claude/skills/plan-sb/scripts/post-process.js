#!/usr/bin/env node
/**
 * plan-sb post-process 어댑터 (SYS v4 pipeline-worker 호출용)
 * Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>
 *
 * 처리 절차:
 * 1) data.json 위치 탐색 (sb/data.json 또는 ```json 블록 추출)
 * 2) mockups/*.html 감지 시 puppeteer로 PNG 캡쳐 → input/{screenId}-pc.png
 *    + data.json의 해당 screen.uiImagePath 자동 주입
 * 3) generate.js 실행 → HTML/PDF 화면설계서 생성
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SB_SCRIPTS = __dirname;

function loadPuppeteer() {
  // SYS v4의 puppeteer를 우선 시도
  const candidates = [
    path.resolve(__dirname, '../../../../puppeteer'), // Skill 경로 기준
    'puppeteer'
  ];
  for (const mod of candidates) {
    try { return require(mod); } catch {}
  }
  // SYS v4 node_modules 경로 직접 탐색
  const sysV4Paths = [
    'D:/SYS_v4/node_modules/puppeteer',
    path.join(process.cwd(), 'node_modules/puppeteer'),
    path.join(process.cwd(), '..', 'node_modules/puppeteer')
  ];
  for (const p of sysV4Paths) {
    try { if (fs.existsSync(p)) return require(p); } catch {}
  }
  throw new Error('puppeteer not found');
}

async function capturePng(html, outPath, { width = 1152, height = 990, fullPage = true } = {}) {
  const puppeteer = loadPuppeteer();
  // 마커가 바깥으로 튀어나오는 경우 캡쳐에서 잘리지 않도록 body padding 강제 주입 + overflow 허용
  // 마커 pill 형태(1-1, 1-2 등 서브 넘버링 지원) + 컨테이너 overflow 보호
  const cssInject = `<style>
    html, body { overflow: visible !important; }
    body { padding: 32px !important; }
    .mark, .mark-area { position: relative !important; overflow: visible !important; }
    .marker { z-index: 9999 !important; white-space: nowrap !important; }
    .mark, .mark-area, .mark > .marker, .mark-area > .marker { overflow: visible; }
  </style>`;
  const patched = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, cssInject + '</head>')
    : cssInject + html;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    // 여백 포함한 더 넓은 뷰포트로 캡쳐
    await page.setViewport({ width: width + 48, height: height + 48, deviceScaleFactor: 1 });
    // networkidle0 보다 domcontentloaded 사용 — 외부 이미지 로딩 무한 대기 방지
    await page.setContent(patched, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 폰트/이미지 렌더 보장 — 최대 1초 추가 대기
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: outPath, fullPage });
  } finally {
    await browser.close();
  }
}

// data.json 폴백 보강 — LLM 누락 필드 자동 채움 + 디자인 결정 스크러빙
// SB는 기획 단계 문서로 디자인 결정(색상/폰트/테마)을 포함하면 안 됨.
// LLM이 실수로 theme·divider.color를 넣어도 여기서 중립 톤으로 리셋.
function normalizeDataJson(dataJsonPath) {
  let data;
  try { data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8')); }
  catch (e) { return; }

  let changed = false;

  // outputPrefix가 한글 포함 시 영문 슬러그로 대체 (파일시스템 경로 안전)
  if (data.project && data.project.outputPrefix && /[^\x00-\x7F]/.test(data.project.outputPrefix)) {
    const code = data.project.id || 'PROJECT';
    const date = (data.project.date || '').replace(/-/g, '');
    const ver = data.project.version || 'v1.0';
    data.project.outputPrefix = `${code}_SB_${date}_${ver}`;
    changed = true;
  }

  // theme 스크러빙 — LLM이 브랜드 컬러 넣어도 제거
  // SB는 기획 단계이므로 디자인 결정(theme) 금지. design-knowledge 이후 결정.
  if (data.theme && Object.keys(data.theme).length > 0) {
    delete data.theme;
    changed = true;
  }

  // divider.color 스크러빙 — 브랜드 컬러 제거, 중립 다크 톤으로 통일
  (data.screens || []).forEach(s => {
    if (s.hasDivider && s.divider && typeof s.divider === 'object') {
      if (s.divider.color) { delete s.divider.color; changed = true; }
      if (s.divider.background) { delete s.divider.background; changed = true; }
    }
  });

  if (changed) {
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[plan-sb pp] data.json 스크러빙 완료 (theme/divider.color 제거)');
  }
}

function findMockupFiles(outputDir) {
  // outputDir 또는 outputDir/sb 하위의 mockups/ 폴더 모두 탐색
  const candidates = [
    path.join(outputDir, 'mockups'),
    path.join(outputDir, 'sb', 'mockups'),
    path.join(outputDir, 'SB', 'mockups')
  ];
  const existing = candidates.find(p => fs.existsSync(p));
  if (!existing) return [];
  return fs.readdirSync(existing)
    .filter(f => /\.html?$/i.test(f))
    .map(f => ({
      name: f,
      path: path.join(existing, f),
      screenId: f.replace(/\.html?$/i, '').replace(/-(pc|mo|tablet)$/i, ''),
      variant: (f.match(/-(pc|mo|tablet)\.html?$/i) || [, 'pc'])[1].toLowerCase()
    }));
}

async function processMockups(outputDir, dataJsonPath) {
  const mockups = findMockupFiles(outputDir);
  if (mockups.length === 0) {
    console.log('[plan-sb pp] mockups/ 폴더 없음 — wireframe[] 렌더 경로로 진행');
    return { captured: 0, injected: 0 };
  }

  console.log(`[plan-sb pp] mockups 감지: ${mockups.length}개`);
  const inputDir = path.join(outputDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });

  // data.json 읽고 screens 인덱스 맵 만들기
  let data;
  try { data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8')); }
  catch (e) { console.error('[plan-sb pp] data.json 파싱 실패:', e.message); return { captured: 0, injected: 0 }; }

  let captured = 0;
  let injected = 0;

  for (const m of mockups) {
    const html = fs.readFileSync(m.path, 'utf8');
    const outPng = path.join(inputDir, m.name.replace(/\.html?$/i, '.png'));
    try {
      const dims = m.variant === 'mo'
        ? { width: 390, height: 844, fullPage: true }
        : { width: 1152, height: 990, fullPage: false };
      await capturePng(html, outPng, dims);
      captured++;
      console.log(`  ✓ ${m.name} → ${path.basename(outPng)}`);

      // data.json screens에 uiImagePath 주입
      // 매칭 규칙: screen.id === screenId (대소문자 무시) 또는 ia === screenId
      const relPath = path.relative(outputDir, outPng).replace(/\\/g, '/');
      const targetScreen = (data.screens || []).find(s => {
        const sid = (s.id || '').toLowerCase();
        const iaid = (s.ia || '').toLowerCase();
        const mid = m.screenId.toLowerCase();
        // MO 목업이면 viewportType:Mobile 화면 우선 매칭
        if (m.variant === 'mo' && (s.viewportType || '').toLowerCase().includes('mobile')) {
          return sid === mid || iaid === mid || sid.startsWith(mid);
        }
        return sid === mid || iaid === mid || sid.startsWith(mid);
      });
      if (targetScreen && !targetScreen.uiImagePath) {
        targetScreen.uiImagePath = relPath;
        injected++;
      }
    } catch (e) {
      console.warn(`  ✗ ${m.name} 캡쳐 실패:`, e.message);
    }
  }

  // data.json 업데이트 저장
  if (injected > 0) {
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[plan-sb pp] uiImagePath 주입: ${injected}건 → data.json 업데이트`);
  }

  return { captured, injected };
}

async function main() {
  const artifactPath = process.argv[2];
  const outputDir = process.argv[3];

  if (!artifactPath || !outputDir) {
    console.error('Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>');
    process.exit(1);
  }
  if (!fs.existsSync(artifactPath)) {
    console.error(`[plan-sb pp] artifact not found: ${artifactPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(outputDir)) {
    console.error(`[plan-sb pp] output dir not found: ${outputDir}`);
    process.exit(1);
  }

  // 1) data.json 위치 탐색
  const candidates = [
    path.join(outputDir, 'SB', 'data.json'),
    path.join(outputDir, 'sb', 'data.json'),
    path.join(outputDir, 'data.json')
  ];
  let dataJsonPath = candidates.find(p => fs.existsSync(p));

  // 2) 없으면 artifact md에서 ```json 코드블록 추출
  if (!dataJsonPath) {
    const content = fs.readFileSync(artifactPath, 'utf8');
    const match = content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!match) {
      console.log('[plan-sb pp] data.json 미검출 — generate.js skip.');
      process.exit(0);
    }
    try { JSON.parse(match[1]); }
    catch (e) { console.error('[plan-sb pp] JSON 파싱 실패:', e.message); process.exit(1); }
    dataJsonPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(dataJsonPath, match[1], 'utf8');
    console.log(`[plan-sb pp] JSON 블록 추출 → ${dataJsonPath}`);
  } else {
    console.log(`[plan-sb pp] data.json 감지 → ${dataJsonPath}`);
  }

  // 3) data.json 폴백 보강 (LLM이 누락한 필드 자동 채움)
  try {
    normalizeDataJson(dataJsonPath);
  } catch (e) {
    console.warn('[plan-sb pp] 폴백 보강 실패 (비차단):', e.message);
  }

  // 4) mockups 캡쳐 (Mode A 자동화)
  try {
    await processMockups(outputDir, dataJsonPath);
  } catch (e) {
    console.warn('[plan-sb pp] mockup 캡쳐 단계 실패 (비차단):', e.message);
  }

  // 4) generate.js 실행
  const generatePath = path.join(SB_SCRIPTS, 'generate.js');
  if (!fs.existsSync(generatePath)) {
    console.error(`[plan-sb pp] generate.js not found: ${generatePath}`);
    process.exit(1);
  }

  const cmd = `node "${generatePath}" "${dataJsonPath}" "${outputDir}"`;
  console.log(`[plan-sb pp] running: ${cmd}`);
  await new Promise((resolve, reject) => {
    exec(cmd, {
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true
    }, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) return reject(err);
      resolve();
    });
  });

  console.log('[plan-sb pp] done');
}

main().catch(err => {
  console.error('[plan-sb pp] error:', err.message);
  process.exit(1);
});
