#!/usr/bin/env node
/**
 * verify-computed-style.js
 *
 * 목적: 실제 브라우저에서 렌더링된 computed style을 샘플링해
 *       CSS가 "기본값으로 무너졌는지"를 검출.
 *
 * 배경:
 *   - 실측 사고 케이스: BEM variant 클래스가 86건 HTML에 있었으나
 *     CSS 선언 누락 → computed display 가 'block' 으로 나옴.
 *   - Grep만으로는 "선언은 있으나 !important 등으로 덮였다" 케이스를 못 잡음.
 *   - 이 스크립트는 샘플링 셀렉터 목록의 핵심 속성(display/grid-template-columns/
 *     background-color/color/font-family 등)이 토큰 기반인지 기본값인지 검사.
 *
 * 사용:
 *   node verify-computed-style.js \
 *     --base http://localhost:8090 \
 *     --url /index.html \
 *     --selectors selectors.json \
 *     [--strict]
 *
 * selectors.json 예:
 *   [
 *     { "selector": ".section--bento-asymmetric", "expect": { "display": ["grid","flex"] } },
 *     { "selector": ".hero--asymmetric-split .hero__inner", "expect": { "display": ["grid","flex"] } },
 *     { "selector": "body", "expect": { "fontFamily": ["Pretendard", "Geist"] } }
 *   ]
 *
 * 종료코드: 0 = 모든 expect 충족, 1 = 1건 이상 불충족, 2 = 오류
 */

const fs = require('fs');

function parseArgs(argv) {
  const out = { base: null, url: '/', selectors: null, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--base') out.base = v, !argv[i].includes('=') && i++;
    else if (k === '--url') out.url = v, !argv[i].includes('=') && i++;
    else if (k === '--selectors') out.selectors = v, !argv[i].includes('=') && i++;
    else if (k === '--strict') out.strict = true;
  }
  return out;
}

function matchExpect(actual, expected) {
  if (Array.isArray(expected)) {
    return expected.some((e) => typeof e === 'string'
      ? (actual || '').toLowerCase().includes(e.toLowerCase())
      : false);
  }
  if (typeof expected === 'string') {
    return (actual || '').toLowerCase().includes(expected.toLowerCase());
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.base || !args.selectors) {
    console.error('USAGE: node verify-computed-style.js --base <url> --url </path> --selectors <file> [--strict]');
    process.exit(2);
  }
  if (!fs.existsSync(args.selectors)) {
    console.error(`selectors file not found: ${args.selectors}`);
    process.exit(2);
  }

  let playwright;
  try { playwright = require('playwright'); }
  catch (e) {
    console.error('playwright 미설치.');
    process.exit(2);
  }

  const spec = JSON.parse(fs.readFileSync(args.selectors, 'utf-8'));
  const pageUrl = new URL(args.url, args.base).toString();

  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => (document.fonts && document.fonts.ready) || Promise.resolve());
  await page.waitForTimeout(300);

  const results = [];
  for (const item of spec) {
    const { selector, expect = {} } = item;
    const raw = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        gridTemplateRows: cs.gridTemplateRows,
        gridTemplateAreas: cs.gridTemplateAreas,
        flexDirection: cs.flexDirection,
        position: cs.position,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        padding: cs.padding,
        gap: cs.gap,
        minHeight: cs.minHeight,
      };
    }, selector);

    if (!raw) {
      results.push({ selector, found: false, pass: false, reason: 'element not found' });
      continue;
    }

    const failures = [];
    for (const [prop, exp] of Object.entries(expect)) {
      if (!matchExpect(raw[prop], exp)) {
        failures.push({ prop, actual: raw[prop], expected: exp });
      }
    }

    results.push({
      selector,
      found: true,
      actual: raw,
      pass: failures.length === 0,
      failures,
    });
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass).length;
  const report = {
    url: pageUrl,
    total: results.length,
    passed: results.length - failed,
    failed,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    results,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
