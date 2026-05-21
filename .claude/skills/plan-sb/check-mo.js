const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 2200, height: 1300 }, deviceScaleFactor: 1, bypassCSP: true });
  const p = await ctx.newPage();
  const html = `file:///D:/SYS_v4/output/KT마이알뜰폰_test/output/KT마이알뜰폰/20260512/SB_KTMVNO_A_v1.0.html?t=${Date.now()}`;
  await p.goto(html);
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(800);
  const slides = await p.$$('section.slide, .slide');
  const slide = slides[5];
  const inner = await slide.$('.ui-capture-inner');
  await inner.screenshot({ path: 'D:/SYS_v4/output/KT마이알뜰폰_test/inner-A-06.png' });
  const info = await inner.evaluate(el => {
    const r = el.getBoundingClientRect();
    const img = el.querySelector('img');
    const ir = img.getBoundingClientRect();
    return { wrapperRect: { w: r.width, h: r.height }, imgRect: { w: ir.width, h: ir.height }, imgComputed: getComputedStyle(img).cssText };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
