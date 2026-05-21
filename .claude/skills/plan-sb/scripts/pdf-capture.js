#!/usr/bin/env node
/**
 * PDF → 페이지별 이미지 변환 (Playwright + pdf.js 기반, poppler 불필요)
 * Usage: node pdf-capture.js <pdf-file> [output-dir]
 *
 * pdf.js(CDN)로 각 페이지를 Canvas에 렌더링 → Playwright로 스크린샷.
 * Chrome PDF 뷰어를 사용하지 않으므로 줌 문제 없음.
 * 결과: {output-dir}/pdf-page-1.png, pdf-page-2.png, ...
 */

const fs = require('fs');
const path = require('path');

const pdfFile = process.argv[2];
const outputDir = process.argv[3] || path.join(process.cwd(), 'input');

if (!pdfFile) {
  console.error('Usage: node pdf-capture.js <pdf-file> [output-dir]');
  process.exit(1);
}

const pdfPath = path.resolve(pdfFile);
if (!fs.existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('[pdf-capture] playwright 패키지를 찾을 수 없습니다.');
    console.error('설치: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // PDF 파일을 base64로 인코딩 (HTML 내 인라인 로드용)
  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');

  // pdf.js CDN으로 렌더링하는 임시 HTML 생성
  const tempHtml = path.join(outputDir, '_pdf-render-temp.html');
  fs.writeFileSync(tempHtml, `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { background: #fff; }
  canvas { display: block; margin: 0 auto; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs" type="module"></script>
</head>
<body>
<canvas id="pdf-canvas"></canvas>
<script type="module">
  // pdf.js 글로벌 로드
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

  // base64 → Uint8Array
  const base64 = document.getElementById('pdf-data').textContent.trim();
  const raw = atob(base64);
  const uint8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

  const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
  window.__pdfTotalPages = pdf.numPages;

  // renderPage: 지정 페이지를 Canvas에 그림
  window.__renderPage = async function(pageNum) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.0; // 고해상도 (1920px 기준 충분)
    const viewport = page.getViewport({ scale });
    const canvas = document.getElementById('pdf-canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return { width: viewport.width, height: viewport.height };
  };

  // 준비 완료 시그널
  window.__pdfReady = true;
</script>
<pre id="pdf-data" style="display:none">${pdfBase64}</pre>
</body></html>`, 'utf-8');

  console.log(`[PDF] 파일: ${path.basename(pdfPath)}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const fileUrl = 'file:///' + tempHtml.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // pdf.js 로딩 대기
  await page.waitForFunction(() => window.__pdfReady === true, { timeout: 20000 });

  const totalPages = await page.evaluate(() => window.__pdfTotalPages);
  const maxPages = Math.min(totalPages, 30);
  console.log(`[PDF] 총 ${totalPages} 페이지 (최대 ${maxPages}페이지 캡쳐)`);

  const capturedPages = [];
  for (let i = 1; i <= maxPages; i++) {
    // 해당 페이지를 Canvas에 렌더링
    const size = await page.evaluate((num) => window.__renderPage(num), i);
    // Canvas가 그려질 때까지 약간 대기
    await page.waitForTimeout(300);

    // Canvas 요소만 스크린샷
    const canvas = page.locator('#pdf-canvas');
    const pagePath = path.join(outputDir, `pdf-page-${i}.png`);
    await canvas.screenshot({ path: pagePath });
    capturedPages.push(`pdf-page-${i}.png`);
    console.log(`[OK] 페이지 ${i}/${maxPages}: ${pagePath} (${size.width}x${size.height})`);
  }

  // 임시 HTML 정리
  try { fs.unlinkSync(tempHtml); } catch {}

  // PDF 정보 저장
  const infoPath = path.join(outputDir, 'pdf-info.json');
  fs.writeFileSync(infoPath, JSON.stringify({
    source: path.basename(pdfPath),
    captured: new Date().toISOString().slice(0, 10),
    totalPages,
    capturedPages: maxPages,
    pages: capturedPages,
    scale: 2.0,
    note: 'pdf.js+Playwright로 촬영. Read(Vision)로 각 페이지 이미지를 열어 레이아웃/스타일을 분석할 것.'
  }, null, 2), 'utf-8');
  console.log(`[OK] PDF 정보: ${infoPath}`);

  await browser.close();

  console.log('\n=== PDF 캡쳐 완료 ===');
  console.log(`→ ${maxPages}페이지 캡쳐됨 (${outputDir})`);
  console.log('→ Read(Vision)로 이미지를 열어 포맷 분석에 사용하십시오.');
}

main().catch(err => {
  console.error('[pdf-capture] 오류:', err.message);
  process.exit(1);
});
