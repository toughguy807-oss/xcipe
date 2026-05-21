#!/usr/bin/env node
/**
 * 화면설계서 자동 생성기 v2
 * Usage: node generate-screen-design.js [data-file.json]
 *
 * JSON 데이터 → 스키마 정규화 → 테마 로드 → HTML 렌더링 → PDF 내보내기
 */

const fs = require('fs');
const path = require('path');
const { normalizeSchema } = require('./lib/schema');
const { loadTheme } = require('./lib/theme');
const { generateHTML } = require('./template');

async function main() {
  const dataFile = process.argv[2];
  if (!dataFile) {
    console.error('Usage: node generate-screen-design.js <data-file.json>');
    console.error('Example: node generate-screen-design.js data/KMVNO-5628.json');
    process.exit(1);
  }

  const dataPath = path.resolve(dataFile);
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const projectRoot = process.cwd();

  // 0. config.json 디폴트 로드 → JSON 병합 → 스키마 정규화 → 테마 로드
  const configPath = path.join(__dirname, '..', 'config.json');
  let config = { defaults: {} };
  if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
  }
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const data = normalizeSchema(raw, config.defaults);

  // 이미지 strategy 자동 결정 — 비율별 처리 정책 + 분할 segments + 마커 절단 방지
  const { decide: decideImageStrategy } = require('./lib/image-strategy');
  for (const screen of (data.screens || [])) {
    if (!screen.uiImagePath || screen.viewportType !== 'Mobile') continue;
    const absImg = path.resolve(process.cwd(), screen.uiImagePath);
    const strategy = decideImageStrategy(absImg, { markers: screen.descriptions || [] });
    screen.imageStrategy = strategy;
    console.log(`[IMAGE] ${screen.uiImagePath} → ${strategy.strategy} (${strategy.reason})`);
  }

  // 프로젝트별 테마 자동 생성·자동 적용
  // 1) projectCode 도출 → themes/{projectCode}.json 없으면 default 복사로 생성
  // 2) data.theme.preset 미명시면 projectCode를 자동 preset으로 주입 → 동일 프로젝트 재실행 시 같은 테마 자동 적용
  const projectCode = (data.project.id || data.project.serviceName || '').replace(/[<>:"/\\|?*]/g, '_').trim();
  if (projectCode) {
    const projectThemePath = path.join(__dirname, '..', 'themes', `${projectCode}.json`);
    if (!fs.existsSync(projectThemePath)) {
      const defaultThemePath = path.join(__dirname, '..', 'themes', 'default.json');
      if (fs.existsSync(defaultThemePath)) {
        fs.copyFileSync(defaultThemePath, projectThemePath);
        console.log(`[THEME] ${projectCode}.json 자동 생성 (default.json 복사)`);
      }
    }
    // ★ 자동 연결: preset 명시 없으면 projectCode를 preset으로 주입
    if (!data.theme || !data.theme.preset) {
      data.theme = { ...(data.theme || {}), preset: projectCode };
      console.log(`[THEME] preset 자동 적용: ${projectCode}`);
    }
  }
  const theme = loadTheme(data);

  const outputPrefix = data.project.outputPrefix
    || data.project.id
    || (data.project.title || '').replace(/[<>:"/\\|?*]/g, '_').trim()
    || 'output';
  console.log(`[SCHEMA] ${raw.$schema ? 'v2' : 'v1'} → normalized (preset: ${theme.preset || 'default'})`);

  // 1. output 경로 먼저 결정 (이미지 상대경로 계산에 필요)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outputDir = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(projectRoot, 'output', (data.project.serviceName || data.project.id || outputPrefix).replace(/[<>:"/\\|?*]/g, '_'), today);

  // 2. input/ 폴더 이미지 우선 체크 — 상대경로 동적 계산
  const inputDir = path.join(projectRoot, 'input');
  if (data.screens) {
    const relPath = path.relative(outputDir, inputDir).replace(/\\/g, '/');
    for (const screen of data.screens) {
      if (!screen.uiImagePath) continue;
      const filename = path.basename(screen.uiImagePath);
      const inputPath = path.join(inputDir, filename);
      if (fs.existsSync(inputPath)) {
        screen.uiImagePath = `${relPath}/${filename}`;
        console.log(`[INPUT] ${filename} → input/ 폴더 사용 (${relPath})`);
      } else {
        console.log(`[CAPTURE] ${filename} → 기존 경로 유지`);
      }
    }
  }

  // 3. HTML 생성 (input 이미지 경로 재계산 후 실행)
  const html = generateHTML(data, theme);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const htmlPath = path.join(outputDir, `${outputPrefix}.html`);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`[OK] HTML: ${htmlPath}`);

  // 2.5. sources.json — 참조 이력 기록 (output/_ref/)
  const refDir = path.join(outputDir, '_ref');
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });
  const inputs = [];
  if (fs.existsSync(inputDir)) {
    for (const f of fs.readdirSync(inputDir).filter(f => !f.startsWith('.'))) {
      const ext = path.extname(f).toLowerCase();
      let type = 'unknown';
      if (['.png','.jpg','.jpeg','.gif','.webp'].includes(ext)) type = 'capture';
      else if (['.pdf','.pptx','.ppt'].includes(ext)) type = 'format';
      else if (ext === '.json') type = 'data';
      else if (ext === '.md') type = 'document';
      const usages = [];
      if (type === 'capture' && data.screens) {
        data.screens.forEach((s, i) => {
          if (s.uiImagePath && s.uiImagePath.includes(f)) usages.push(`uiImagePath (screen ${i})`);
        });
      }
      inputs.push({ file: f, type, usage: usages.join(', ') || 'input 참조' });
    }
  }
  const sourcesPath = path.join(refDir, 'sources.json');
  fs.writeFileSync(sourcesPath, JSON.stringify({ created: new Date().toISOString().slice(0,10), dataFile: path.basename(dataPath), inputs }, null, 2), 'utf-8');
  console.log(`[OK] sources: ${sourcesPath}`);

  // 3. PDF 생성 (Playwright)
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.log('[INFO] Playwright not found. 자동 설치 중...');
    const { execSync } = require('child_process');
    const installDir = path.join(__dirname, '..');
    execSync('npm install playwright --no-save', { stdio: 'inherit', cwd: installDir });
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: installDir });
    playwright = require('playwright');
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (launchErr) {
    if (launchErr.message && launchErr.message.includes('Executable')) {
      console.log('[INFO] Chromium 바이너리 미설치. 자동 설치 중...');
      const { execSync } = require('child_process');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      browser = await playwright.chromium.launch({ headless: true });
    } else {
      throw launchErr;
    }
  }
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // 16:9 landscape 고정 PDF (1920×1080)
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => {
    document.querySelectorAll('.slide').forEach(s => { s.style.zoom = ''; });
  });

  const frameCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`[PDF] 슬라이드 ${frameCount}개, 1920×1080 landscape`);

  const pdfPath = path.join(outputDir, `${outputPrefix}.pdf`);
  await page.pdf({
    path: pdfPath,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  console.log(`[OK] PDF: ${pdfPath}`);
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
