#!/usr/bin/env node
/**
 * mockup-capture.js — HTML 목업 → PNG 스크린샷 (Mode A 기본 도구)
 *
 * Usage:
 *   node mockup-capture.js <input-html> <output-dir> [options]
 *
 * Options:
 *   --name=NAME         출력 파일명 prefix (기본: input HTML basename)
 *   --mobile-only       MO 캡쳐 (375×812 viewport)
 *   --pc-only           PC 캡쳐 (1920×1080 viewport, 기본)
 *   --full-page         전체 페이지 캡쳐 (모바일 권장)
 *   --width=N           PC viewport width (기본 1920)
 *   --height=N          PC viewport height (기본 1080)
 *
 * 출력:
 *   PC:  {output-dir}/{name}-pc.png
 *   MO:  {output-dir}/{name}-mo.png
 *
 * SKILL.md L226, L287, L293에서 호출. plan-sb Mode A 기본 캡쳐 도구.
 */

const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  const candidates = [
    path.resolve(__dirname, 'node_modules/playwright'),
    path.resolve(__dirname, '../../../../node_modules/playwright'),
    'playwright'
  ];
  for (const mod of candidates) {
    try { return require(mod); } catch {}
  }
  throw new Error('playwright not found — try: npm install playwright --no-save');
}

function parseArgs(argv) {
  const args = { positional: [], opts: {} };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args.opts[k] = v === undefined ? true : v;
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

async function capture(htmlPath, outPath, { width, height, fullPage, isMobile }) {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    // 모바일이라도 isMobile:true 옵션을 켜지 않음. mockup HTML에 viewport meta가 없으면
    // mobile emulation이 width=980 fallback을 적용해 body가 viewport 작게 표시되는 문제 발생.
    // 우리는 viewport width=375 자체가 모바일 폭 — DPR 2로 750 PNG 출력.
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2
    });
    const page = await ctx.newPage();
    const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);

    if (fullPage) {
      // 콘텐츠의 실제 마지막 visible 요소까지 height 계산 — 빈 흰 여백 캡쳐 방지
      const contentH = await page.evaluate(() => {
        // body 직속 자식 중 가장 아래 bottom 좌표 사용
        const children = Array.from(document.body.children).filter(el => {
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden';
        });
        if (!children.length) return document.body.scrollHeight;
        const maxBottom = children.reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
        const padB = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
        return Math.ceil(maxBottom + padB + 4);
      });
      await page.setViewportSize({ width, height: Math.max(contentH, 100) });
      await page.waitForTimeout(200);
      await page.screenshot({ path: outPath, fullPage: false });
    } else {
      await page.screenshot({ path: outPath, fullPage: false });
    }
    console.log(`[OK] ${outPath}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const { positional, opts } = parseArgs(process.argv);
  if (positional.length < 2) {
    console.error('Usage: node mockup-capture.js <input-html> <output-dir> [--name=NAME] [--mobile-only] [--pc-only] [--full-page] [--width=N] [--height=N]');
    process.exit(1);
  }

  const [htmlPath, outDir] = positional;
  if (!fs.existsSync(htmlPath)) {
    console.error(`HTML not found: ${htmlPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const baseName = opts.name || path.basename(htmlPath, path.extname(htmlPath));
  const fullPage = !!opts['full-page'];
  const mobileOnly = !!opts['mobile-only'];
  const pcOnly = !!opts['pc-only'];

  // PC 캡쳐 (기본 또는 명시)
  if (!mobileOnly) {
    const pcWidth = parseInt(opts.width, 10) || 1920;
    const pcHeight = parseInt(opts.height, 10) || 1080;
    const pcOut = path.join(outDir, `${baseName}-pc.png`);
    await capture(htmlPath, pcOut, {
      width: pcWidth,
      height: pcHeight,
      fullPage,
      isMobile: false
    });
  }

  // MO 캡쳐 (mobile-only 또는 둘 다)
  if (mobileOnly || (!pcOnly && !mobileOnly && htmlPath.toLowerCase().includes('-mo'))) {
    const moWidth = parseInt(opts.width, 10) || 375;
    const moHeight = parseInt(opts.height, 10) || 812;
    const moOut = path.join(outDir, `${baseName}-mo.png`);
    // 모바일 풀페이지: --full-page 옵션 명시 시에만. 미지정 시 viewport 높이까지만 캡쳐
    // (이전 `fullPage || true` 버그로 항상 true 강제되어 빈 영역 길어지던 문제 수정)
    await capture(htmlPath, moOut, {
      width: moWidth,
      height: moHeight,
      fullPage: !!fullPage,
      isMobile: true
    });
  }
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
