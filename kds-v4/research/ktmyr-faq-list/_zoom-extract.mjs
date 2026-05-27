import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://ktmyr.com/fe/service/cctr/faqList.do';
const OUT = path.resolve('research/ktmyr-faq-list');

async function run() {
  const browser = await chromium.launch({ headless: true });

  // === MOBILE — zoom on FAQ card + tab + search ===
  const ctxM = await browser.newContext({
    viewport: { width: 750, height: 1624 }, // 2x for clarity
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const pageM = await ctxM.newPage();
  await pageM.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await pageM.waitForTimeout(2000);

  // get exact styles of FAQ card components
  const styleProbe = await pageM.evaluate(() => {
    const all = (el) => el ? {
      tag: el.tagName,
      text: (el.innerText || '').slice(0, 100),
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
      border: getComputedStyle(el).border,
      borderRadius: getComputedStyle(el).borderRadius,
      padding: getComputedStyle(el).padding,
      margin: getComputedStyle(el).margin,
      fontSize: getComputedStyle(el).fontSize,
      fontWeight: getComputedStyle(el).fontWeight,
      width: getComputedStyle(el).width,
      height: getComputedStyle(el).height,
      cls: el.className,
    } : null;

    // search for FAQ items more aggressively
    const faqItems = [...document.querySelectorAll('li[class*="faq"], .accordion-item, [class*="qa-item"], .qaList > li, .infoList > li, dl.unitList, .listItem')];
    if (!faqItems.length) {
      // try ul.tabContent li, or any list directly under #faqList
      const ul = document.querySelector('ul.tabContent, ul.faqList, ul.qaList, #faqList, [class*="faqWrap"] ul');
      if (ul) faqItems.push(...ul.querySelectorAll(':scope > li'));
    }

    const out = { faqItems: [] };
    for (const li of faqItems.slice(0, 3)) {
      const cardStyle = all(li);
      const qBtn = li.querySelector('button, a, .q, .question, dt, [class*="quest"]');
      const tag = li.querySelector('.tag, .cate, .category, [class*="tag"], [class*="cate"], .topMark, [class*="top10"]');
      const chevron = li.querySelector('svg, .ico-arr, .arrow, [class*="arrow"], [class*="chevron"]');
      out.faqItems.push({
        card: cardStyle,
        question: all(qBtn),
        categoryTag: all(tag),
        chevron: all(chevron),
        innerHTML: (li.innerHTML || '').slice(0, 800),
      });
    }

    // search input
    out.searchInput = all(document.querySelector('#searchValue, input[name="searchValue"]'));
    out.searchBtn = all(document.querySelector('.btnSearch, [class*="searchBtn"], button[type="submit"]'));
    out.searchWrap = all(document.querySelector('.searchBox, .searchArea, [class*="searchBox"], [class*="searchArea"], [class*="srchBox"]'));

    // category cells
    const cells = [...document.querySelectorAll('.tabButton')];
    out.cells = cells.slice(0, 4).map(c => all(c));

    // h2/h3 for "FAQ" / "전체 (10건)"
    out.h2 = all(document.querySelector('main h2, #content h2'));
    out.totalCount = all([...document.querySelectorAll('h3')].find(h => /\d+건/.test(h.innerText)));

    // page wrapper bg
    const main = document.querySelector('#mainContent, #content, main');
    if (main) out.mainBg = getComputedStyle(main).backgroundColor;

    // active top nav menu
    const activeNav = document.querySelector('.menu.active, .gnb .menu.active, [class*="gnb"] [class*="active"]');
    out.activeNav = all(activeNav);

    // header logo
    out.logo = all(document.querySelector('.logo, [class*="logo"] svg, [class*="logo"] img'));

    return out;
  });

  fs.writeFileSync(path.join(OUT, 'styles-mobile.json'), JSON.stringify(styleProbe, null, 2));

  // crop screenshots: header, search, category grid, faq cards
  const header = await pageM.$('header, .header, #header');
  if (header) await header.screenshot({ path: path.join(OUT, 'screenshots/m-crop-header.png') });

  // capture viewport-fit screenshots showing fold area then mid then bottom
  await pageM.evaluate(() => window.scrollTo(0, 200));
  await pageM.waitForTimeout(300);
  await pageM.screenshot({ path: path.join(OUT, 'screenshots/m-fold-top.png'), fullPage: false });

  await pageM.evaluate(() => window.scrollTo(0, 700));
  await pageM.waitForTimeout(300);
  await pageM.screenshot({ path: path.join(OUT, 'screenshots/m-fold-cat.png'), fullPage: false });

  await pageM.evaluate(() => window.scrollTo(0, 1200));
  await pageM.waitForTimeout(300);
  await pageM.screenshot({ path: path.join(OUT, 'screenshots/m-fold-faq.png'), fullPage: false });

  // Try search interaction by clicking the search input first
  try {
    const searchValue = await pageM.$('#searchValue');
    if (searchValue) {
      const box = await searchValue.boundingBox();
      if (box) {
        await pageM.evaluate(() => {
          const sv = document.querySelector('#searchValue');
          if (sv) sv.scrollIntoView({ block: 'center' });
        });
        await pageM.waitForTimeout(500);
        await searchValue.click({ force: true, timeout: 3000 }).catch(() => {});
        await searchValue.type('유심', { delay: 50 }).catch(() => {});
        await pageM.keyboard.press('Enter');
        await pageM.waitForTimeout(2000);
        await pageM.screenshot({ path: path.join(OUT, 'screenshots/m-search-yusim.png'), fullPage: true });
      }
    }
  } catch (e) {
    console.log('search interaction failed:', e.message);
  }

  await ctxM.close();

  // === DESKTOP zoom ===
  const ctxD = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const pageD = await ctxD.newPage();
  await pageD.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await pageD.waitForTimeout(2000);

  // probe again on desktop
  const styleProbeD = await pageD.evaluate(() => {
    const all = (el) => el ? {
      text: (el.innerText || '').slice(0, 100),
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
      borderRadius: getComputedStyle(el).borderRadius,
      padding: getComputedStyle(el).padding,
      fontSize: getComputedStyle(el).fontSize,
      fontWeight: getComputedStyle(el).fontWeight,
      width: getComputedStyle(el).width,
      height: getComputedStyle(el).height,
      cls: el.className,
    } : null;
    return {
      h1: all(document.querySelector('main h1, #content h1, .pageTit')),
      breadcrumb: all(document.querySelector('.breadcrumb, [class*="breadcrumb"]')),
      searchBox: all(document.querySelector('#searchValue, input[name="searchValue"]')),
      faqCardSample: all(document.querySelector('.faqList li, ul.tabContent > li, [class*="faqWrap"] ul > li')),
      activeCell: all(document.querySelector('.tabButton.on, .tabButton.active')),
      mascot: all(document.querySelector('[class*="mascot"], [class*="character"], [class*="ang"], img[alt*="앙뜰"]')),
      sitemap: all(document.querySelector('footer .sitemap, [class*="sitemap"]')),
    };
  });
  fs.writeFileSync(path.join(OUT, 'styles-desktop.json'), JSON.stringify(styleProbeD, null, 2));

  // crops
  await pageD.evaluate(() => window.scrollTo(0, 0));
  await pageD.screenshot({ path: path.join(OUT, 'screenshots/d-fold-top.png'), fullPage: false, clip: { x:0, y:0, width: 1440, height: 600 } });

  // categoy + faq area
  await pageD.evaluate(() => window.scrollTo(0, 300));
  await pageD.waitForTimeout(300);
  await pageD.screenshot({ path: path.join(OUT, 'screenshots/d-fold-cat.png'), fullPage: false });

  await pageD.evaluate(() => window.scrollTo(0, 700));
  await pageD.waitForTimeout(300);
  await pageD.screenshot({ path: path.join(OUT, 'screenshots/d-fold-faq.png'), fullPage: false });

  // try search on desktop
  try {
    const sv = await pageD.$('#searchValue');
    if (sv) {
      await pageD.evaluate(() => document.querySelector('#searchValue')?.scrollIntoView({ block: 'center' }));
      await pageD.waitForTimeout(500);
      await sv.click({ force: true, timeout: 3000 }).catch(() => {});
      await sv.type('유심', { delay: 50 });
      await pageD.keyboard.press('Enter');
      await pageD.waitForTimeout(2000);
      await pageD.screenshot({ path: path.join(OUT, 'screenshots/d-search-yusim.png'), fullPage: true });
    }
  } catch {}

  await ctxD.close();
  await browser.close();
  console.log('done');
}

run().catch(e => { console.error(e); process.exit(1); });
