#!/usr/bin/env node
/**
 * capture-viewports.js
 *
 * 목적: Playwright로 여러 페이지 × 3 breakpoint 스크린샷 일괄 캡처.
 *
 * 배경:
 *   - 모바일/태블릿/데스크톱 응답성은 실제 렌더로만 검증 가능.
 *   - reduced-motion 강제 + networkidle 대기로 일관성 확보.
 *   - fullPage + viewport 2종 — sticky/scroll-snap은 viewport 단독이 정확.
 *
 * 사용:
 *   node capture-viewports.js \
 *     --base http://localhost:8080 \
 *     --pages / /about.html /platform.html \
 *     --out output/.../screenshots/v5/ \
 *     [--breakpoints 375,768,1440]
 *
 * 산출: {out}/{breakpoint}-{slug}-{full|fold}.png + manifest.json
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { base: null, pages: [], out: null, breakpoints: [375, 768, 1440] };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--base') out.base = v, !argv[i].includes('=') && i++;
    else if (k === '--pages') out.pages = v.split(/[\s,]+/).filter(Boolean), !argv[i].includes('=') && i++;
    else if (k === '--out') out.out = v, !argv[i].includes('=') && i++;
    else if (k === '--breakpoints') out.breakpoints = v.split(',').map((n) => parseInt(n, 10)), !argv[i].includes('=') && i++;
  }
  return out;
}

function slugify(p) {
  return (p || '/').replace(/^\/+/, '').replace(/\.html?$/, '').replace(/[\/\\]/g, '-').replace(/[^\w.-]/g, '_') || 'root';
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.base || args.pages.length === 0 || !args.out) {
    console.error('USAGE: node capture-viewports.js --base <url> --pages "/ /about.html" --out <dir> [--breakpoints 375,768,1440]');
    process.exit(2);
  }

  let playwright;
  try { playwright = require('playwright'); }
  catch (e) {
    console.error('playwright 미설치. `npm i -D playwright && npx playwright install chromium` 필요.');
    process.exit(2);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const browser = await playwright.chromium.launch();
  const manifest = { base: args.base, captured_at: new Date().toISOString(), captures: [] };

  for (const bp of args.breakpoints) {
    const ctx = await browser.newContext({
      viewport: { width: bp, height: bp >= 1024 ? 900 : 820 },
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    for (const p of args.pages) {
      const url = new URL(p, args.base + (args.base.endsWith('/') ? '' : '/')).toString();
      const slug = slugify(p);
      const entry = { page: p, url, breakpoint: bp, full: null, fold: null, error: null };
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        // 폰트 로딩 대기
        await page.evaluate(() => (document.fonts && document.fonts.ready) || Promise.resolve());
        await page.waitForTimeout(300);

        const foldPath = path.join(args.out, `${bp}-${slug}-fold.png`);
        await page.screenshot({ path: foldPath, fullPage: false });
        entry.fold = path.basename(foldPath);

        const fullPath = path.join(args.out, `${bp}-${slug}-full.png`);
        await page.screenshot({ path: fullPath, fullPage: true });
        entry.full = path.basename(fullPath);
      } catch (e) {
        entry.error = e.message;
      }
      manifest.captures.push(entry);
      console.error(`[${bp}px] ${p} — ${entry.error ? 'FAIL: ' + entry.error : 'ok'}`);
    }

    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({
    captured: manifest.captures.filter((c) => !c.error).length,
    failed: manifest.captures.filter((c) => c.error).length,
    total: manifest.captures.length,
    manifest: path.join(args.out, 'manifest.json'),
  }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(2); });
