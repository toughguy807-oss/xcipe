#!/usr/bin/env node
/**
 * design-benchmark post-process 어댑터
 * Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>
 *
 * capture.json(### FILE 블록)에서 참조 사이트 URL 읽어 Puppeteer로 스크린샷 자동 캡처.
 * 로컬 Chromium(puppeteer) 사용. 외부 API 없음.
 * 결과: outputDir/screenshots/{name}.png + index.md
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// puppeteer 탐색 — plan-sb/node_modules에 이미 설치돼 있음 (재활용)
function resolvePuppeteer() {
  const candidates = [
    path.join(__dirname, '..', '..', 'plan-sb', 'scripts', 'node_modules', 'puppeteer'),
    path.join(__dirname, '..', '..', 'plan-sb', 'node_modules', 'puppeteer'),
    path.join(__dirname, 'node_modules', 'puppeteer')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readCapture(outputDir, artifactPath) {
  const candidates = [
    path.join(outputDir, 'BENCHMARK', 'capture.json'),
    path.join(outputDir, 'benchmark', 'capture.json'),
    path.join(outputDir, 'capture.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
    }
  }
  const content = fs.readFileSync(artifactPath, 'utf8');
  const m = content.match(/```json\s*\n([\s\S]*?targets[\s\S]*?)\n```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

async function main() {
  const artifactPath = process.argv[2];
  const outputDir = process.argv[3];
  if (!artifactPath || !outputDir) { console.error('Usage: node post-process.js <artifactPath> <outputDir>'); process.exit(1); }

  const cap = readCapture(outputDir, artifactPath);
  if (!cap || !Array.isArray(cap.targets) || cap.targets.length === 0) {
    console.log('[design-benchmark pp] capture.json 미검출 또는 빈 배열. 스크린샷 skip.');
    process.exit(0);
  }

  const puppeteerPath = resolvePuppeteer();
  if (!puppeteerPath) {
    console.log('[design-benchmark pp] puppeteer 미설치 (plan-sb/node_modules 포함). 스크린샷 skip.');
    process.exit(0);
  }

  let puppeteer;
  try { puppeteer = require(puppeteerPath); }
  catch (e) {
    console.log(`[design-benchmark pp] puppeteer require 실패: ${e.message}. skip.`);
    process.exit(0);
  }

  const shotDir = path.join(outputDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });

  const viewport = cap.viewport || { width: 1440, height: 900 };
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const results = [];

  for (const t of cap.targets.slice(0, 10)) {
    if (!t.url) continue;
    const safeName = (t.name || t.url).replace(/[<>:"/\\|?*]/g, '_').slice(0, 40);
    const outPath = path.join(shotDir, `${safeName}.png`);
    try {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.screenshot({ path: outPath, fullPage: false });
      await page.close();
      results.push({ name: safeName, url: t.url, ok: true, path: outPath });
      console.log(`[design-benchmark pp] ${safeName}.png 캡처`);
    } catch (err) {
      results.push({ name: safeName, url: t.url, ok: false, error: err.message });
      console.warn(`[design-benchmark pp] ${safeName} 실패: ${err.message}`);
    }
  }

  await browser.close();

  const lines = ['# 참조 사이트 스크린샷', ''];
  for (const r of results) {
    if (r.ok) {
      const rel = path.relative(outputDir, r.path).replace(/\\/g, '/');
      lines.push(`## ${r.name}`);
      lines.push(`- URL: ${r.url}`);
      lines.push(`- 캡처: ![${r.name}](${rel})`);
      lines.push('');
    } else {
      lines.push(`## ${r.name}`);
      lines.push(`- URL: ${r.url}`);
      lines.push(`- ERROR: ${r.error}`);
      lines.push('');
    }
  }
  fs.writeFileSync(path.join(shotDir, 'index.md'), lines.join('\n'), 'utf8');

  const ok = results.filter(r => r.ok).length;
  console.log(`[design-benchmark pp] ${ok}/${results.length} 스크린샷 → screenshots/`);
}

main().catch(err => { console.error('[design-benchmark pp] error:', err.message); process.exit(1); });
