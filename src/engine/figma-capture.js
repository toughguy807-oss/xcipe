// figma-capture.js — _figma/{name}-figma.html 을 puppeteer 로 로드해 Figma MCP 캡처 트리거
//
// MVP2 (2026-05-15): figma-push-prepare 가 captureId 발급하면 본 모듈이 자동 캡처.
//   plan-sb F4 chrome 단계의 노드측 자동화 — Bash 권한 부여 회피.
//
// 입력: { capturePath (절대), captureId, endpoint?, timeoutMs? }
//   - capturePath: figma-prep.js 가 만든 _figma/{name}-figma.html 경로
//   - captureId: figma MCP generate_figma_design 응답의 captureId
//   - endpoint: 기본 https://mcp.figma.com/mcp/capture/{captureId}/submit
// 출력: { ok, captureId, durationMs, error? }

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let _puppeteer = null;
function getPuppeteer() {
  if (!_puppeteer) {
    try { _puppeteer = require('puppeteer'); }
    catch (err) { throw new Error('puppeteer 미설치: ' + err.message); }
  }
  return _puppeteer;
}

// figma capture URL 빌드 — plan-sb/references/figma-export.md F4 절차와 동일 hash fragment
//   #figmacapture={id}&figmaendpoint={url-encoded}&figmadelay={ms}
function buildCaptureUrl(capturePath, captureId, endpoint, delayMs = 4000) {
  const fileUrl = pathToFileURL(capturePath).href;
  const ep = endpoint || `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
  const escapedEndpoint = encodeURIComponent(ep);
  return `${fileUrl}#figmacapture=${captureId}&figmaendpoint=${escapedEndpoint}&figmadelay=${delayMs}`;
}

async function runCapture({ capturePath, captureId, endpoint, timeoutMs = 30_000, delayMs = 4000, viewport = { width: 1920, height: 1080 } }) {
  if (!capturePath || !fs.existsSync(capturePath)) {
    return { ok: false, error: `capture HTML 미존재: ${capturePath}` };
  }
  if (!captureId) {
    return { ok: false, error: 'captureId 필수' };
  }
  const url = buildCaptureUrl(capturePath, captureId, endpoint, delayMs);
  const startedAt = Date.now();
  const puppeteer = getPuppeteer();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--force-device-scale-factor=1'
      ],
      defaultViewport: viewport
    });
    const page = await browser.newPage();
    // file:// + mcp.figma.com 만 허용. 기타 외부 호출은 통과 (capture.js 가 mcp endpoint 로 POST 하는 것 정상)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (u.startsWith('file://') || u.startsWith('https://mcp.figma.com/') || u.startsWith('about:') || u.startsWith('data:')) {
        return req.continue();
      }
      // 외부 이미지 등 부속 리소스도 허용 (figma-prep 변환 HTML 안의 img src)
      if (u.startsWith('https://') || u.startsWith('http://')) return req.continue();
      req.abort();
    });

    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    // capture.js 가 figmadelay ms 후 endpoint 에 POST 함 → 그 시간 + 여유 대기
    await new Promise(r => setTimeout(r, delayMs + 2000));

    await browser.close();
    return { ok: true, captureId, durationMs: Date.now() - startedAt, url };
  } catch (err) {
    if (browser) { try { await browser.close(); } catch {} }
    return { ok: false, captureId, durationMs: Date.now() - startedAt, error: err.message };
  }
}

module.exports = { runCapture, buildCaptureUrl };
