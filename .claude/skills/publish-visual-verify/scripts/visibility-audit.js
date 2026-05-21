#!/usr/bin/env node
/**
 * visibility-audit.js
 *
 * Hero 빈 화면·JS 누락 자동 탐지 (Phase 3.4)
 * solutiontri v1·v2 사고 차단선 — data-reveal 영구 opacity:0 + JS 미생성 패턴.
 *
 * Usage:
 *   node visibility-audit.js --url http://localhost:8765/ [--out audit.json]
 *
 * Output (JSON):
 * {
 *   "v1_textLen": 142,
 *   "v2_visEls": 18,
 *   "v3_revealRatio": 1.0,
 *   "v3_revealCount": 12,
 *   "v4_ctaCount": 2,
 *   "v5_errors": [],
 *   "v5_failedRequests": [],
 *   "verdicts": { "V1":"PASS", "V2":"PASS", "V3":"PASS", "V4":"PASS", "V5":"PASS" },
 *   "overall": "PASS"
 * }
 *
 * Exit code: 0 = PASS, 1 = FAIL (1건이라도)
 */

const { chromium } = require('playwright');
const fs = require('node:fs');

const THRESHOLDS = {
  v1_textLen: 30,        // Hero 표시 텍스트 최소 글자
  v2_visEls: 3,          // Hero 가시 요소 최소 개수
  v3_revealRatio: 0.95,  // reveal opacity:1 비율 (95% 이상)
  v4_ctaCount: 1,        // Hero CTA 버튼 최소 개수
  v5_errorCount: 0,      // 콘솔/요청 에러 최대 개수
};

const HERO_SELECTORS = [
  'section.hero',
  '[data-section="hero"]',
  'main > section:first-of-type',
  'main > :first-child',
  'body > section:first-of-type',
];

function parseArgs() {
  const args = { url: 'http://localhost:8080/', out: null, viewport: '1440x900', wait: 2000 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--url') args.url = argv[++i];
    else if (k === '--out') args.out = argv[++i];
    else if (k === '--viewport') args.viewport = argv[++i];
    else if (k === '--wait') args.wait = parseInt(argv[++i], 10) || 2000;
  }
  return args;
}

async function audit({ url, viewport, wait }) {
  const [w, h] = viewport.split('x').map(Number);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w || 1440, height: h || 900 } });

  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (err) => errors.push({ kind: 'pageerror', msg: String(err && err.message || err) }));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push({ kind: 'console', msg: m.text() });
  });
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), reason: req.failure() ? req.failure().errorText : 'unknown' });
  });

  let navError = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    navError = String(e && e.message || e);
  }
  await page.waitForTimeout(wait);

  const measured = await page.evaluate((heroSelList) => {
    let hero = null;
    for (const sel of heroSelList) {
      hero = document.querySelector(sel);
      if (hero) break;
    }
    if (!hero) hero = document.body;
    const txt = (hero.innerText || '').replace(/\s+/g, ' ').trim();
    const visEls = Array.from(hero.querySelectorAll('*')).filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width * r.height > 100 &&
        parseFloat(cs.opacity) > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none'
      );
    });
    // V3: viewport 진입한 reveal만 측정 (페이지 첫 로드 시 화면 밖 reveal은 정상적으로 opacity:0이므로 false positive 차단)
    const vh = window.innerHeight || 900;
    const allReveals = Array.from(document.querySelectorAll('[data-reveal]'));
    const reveals = allReveals.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < vh && r.bottom > 0; // viewport 교차
    });
    const revealVisible = reveals.filter((el) => parseFloat(getComputedStyle(el).opacity) === 1);
    const ctas = Array.from(hero.querySelectorAll('a.btn, button.btn, [role="button"], a[class*="cta"], button[class*="cta"]'));
    return {
      heroTag: hero.tagName + (hero.className ? '.' + hero.className.split(' ').filter(Boolean).join('.') : ''),
      v1_textLen: txt.length,
      v2_visEls: visEls.length,
      v3_revealCount: reveals.length,
      v3_revealRatio: reveals.length ? revealVisible.length / reveals.length : 1,
      v4_ctaCount: ctas.length,
    };
  }, HERO_SELECTORS).catch((e) => ({ error: String(e && e.message || e) }));

  await browser.close();

  const v5_errorCount = errors.length + failedRequests.length;
  const verdicts = {
    V1: measured.v1_textLen >= THRESHOLDS.v1_textLen ? 'PASS' : 'FAIL',
    V2: measured.v2_visEls >= THRESHOLDS.v2_visEls ? 'PASS' : 'FAIL',
    V3: measured.v3_revealCount === 0 || measured.v3_revealRatio >= THRESHOLDS.v3_revealRatio ? 'PASS' : 'FAIL',
    V4: measured.v4_ctaCount >= THRESHOLDS.v4_ctaCount ? 'PASS' : 'FAIL',
    V5: v5_errorCount <= THRESHOLDS.v5_errorCount ? 'PASS' : 'FAIL',
  };
  const overall = Object.values(verdicts).every((v) => v === 'PASS') ? 'PASS' : 'FAIL';

  return {
    url,
    viewport,
    navError,
    hero: measured.heroTag,
    v1_textLen: measured.v1_textLen,
    v2_visEls: measured.v2_visEls,
    v3_revealRatio: measured.v3_revealRatio,
    v3_revealCount: measured.v3_revealCount,
    v4_ctaCount: measured.v4_ctaCount,
    v5_errors: errors,
    v5_failedRequests: failedRequests,
    thresholds: THRESHOLDS,
    verdicts,
    overall,
  };
}

(async () => {
  const args = parseArgs();
  try {
    const result = await audit(args);
    const json = JSON.stringify(result, null, 2);
    if (args.out) fs.writeFileSync(args.out, json, 'utf8');
    console.log(json);
    process.exit(result.overall === 'PASS' ? 0 : 1);
  } catch (e) {
    console.error('FATAL:', e && e.stack || e);
    process.exit(2);
  }
})();
