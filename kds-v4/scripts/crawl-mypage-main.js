const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const url = 'https://ktmyr.com/fe/mypage/main.do';

  // Mobile
  const mCtx = await browser.newContext({ ...devices['iPhone 13'] });
  const mPage = await mCtx.newPage();
  let mResult = { url: null, redirected: false };
  try {
    const resp = await mPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    mResult.status = resp.status();
    mResult.url = mPage.url();
    mResult.redirected = mPage.url() !== url;
    await mPage.screenshot({ path: 'research/ktmyr-mypage-main/screenshots/mobile.png', fullPage: true });
    const dom = await mPage.evaluate(() => {
      const collect = (sel) => Array.from(document.querySelectorAll(sel)).map(e => e.textContent.trim()).filter(Boolean).slice(0, 30);
      return {
        title: document.title,
        h1: collect('h1'),
        h2: collect('h2'),
        h3: collect('h3'),
        nav: collect('nav a, .gnb a, .menu a, [class*="menu"] a').slice(0, 40),
        cta: collect('button, a[class*="btn"], [class*="button"]').slice(0, 40),
        bodyTextSample: document.body.innerText.slice(0, 4000),
      };
    });
    require('fs').writeFileSync('research/ktmyr-mypage-main/screenshots/mobile.dom.json', JSON.stringify(dom, null, 2), 'utf8');
    mResult.dom = 'saved';
  } catch (e) {
    mResult.error = String(e).slice(0, 500);
  }

  // Desktop
  const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await dCtx.newPage();
  let dResult = { url: null, redirected: false };
  try {
    const resp = await dPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    dResult.status = resp.status();
    dResult.url = dPage.url();
    dResult.redirected = dPage.url() !== url;
    await dPage.screenshot({ path: 'research/ktmyr-mypage-main/screenshots/desktop.png', fullPage: true });
    const dom = await dPage.evaluate(() => {
      const collect = (sel) => Array.from(document.querySelectorAll(sel)).map(e => e.textContent.trim()).filter(Boolean).slice(0, 30);
      return {
        title: document.title,
        h1: collect('h1'),
        h2: collect('h2'),
        h3: collect('h3'),
        nav: collect('nav a, .gnb a, .menu a, [class*="menu"] a').slice(0, 40),
        cta: collect('button, a[class*="btn"], [class*="button"]').slice(0, 40),
        bodyTextSample: document.body.innerText.slice(0, 4000),
      };
    });
    require('fs').writeFileSync('research/ktmyr-mypage-main/screenshots/desktop.dom.json', JSON.stringify(dom, null, 2), 'utf8');
    dResult.dom = 'saved';
  } catch (e) {
    dResult.error = String(e).slice(0, 500);
  }

  await browser.close();
  console.log(JSON.stringify({ mobile: mResult, desktop: dResult }, null, 2));
})();
