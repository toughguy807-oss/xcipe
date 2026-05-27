// Crawl ktmyr.com FAQ page (mobile + desktop) and dump structured content + screenshots.
// Run: node research/ktmyr-faq-list/_crawl.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://ktmyr.com/fe/service/cctr/faqList.do';
const OUT_DIR = path.resolve('research/ktmyr-faq-list');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812, isMobile: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

async function dumpDom(page, label, vw) {
  const data = await page.evaluate(() => {
    const visText = (el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 200);
    const out = {
      title: document.title,
      url: location.href,
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].map(h => ({ tag: h.tagName, text: h.innerText.trim() })),
      tabs: [...document.querySelectorAll('[class*="tab"] a, [class*="tab"] button, [role="tab"], .tabBox a, .tabBox li')].map(a => ({
        text: (a.innerText || '').trim(), cls: a.className, active: /active|on|selected/.test(a.className)
      })).filter(t => t.text),
      searchInputs: [...document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')].map(i => ({
        placeholder: i.placeholder, name: i.name, id: i.id, value: i.value, cls: i.className
      })),
      buttons: [...document.querySelectorAll('button, .btn, [role="button"]')].map(b => ({
        text: (b.innerText || b.value || '').trim(), cls: b.className, type: b.type
      })).filter(b => b.text).slice(0, 50),
      faqItems: [...document.querySelectorAll('.faqList li, .faq_list li, [class*="faq"] li, .accordion li, dl dt, .qaList li')].map(li => ({
        text: visText(li), cls: li.className
      })).filter(t => t.text).slice(0, 30),
      lists: [...document.querySelectorAll('dl')].map(dl => ({
        cls: dl.className,
        dts: [...dl.querySelectorAll('dt')].map(d => d.innerText.trim()).slice(0, 12),
        dds: [...dl.querySelectorAll('dd')].map(d => d.innerText.trim().slice(0, 200)).slice(0, 12)
      })),
      bodyClasses: document.body.className,
      bodyText: visText(document.body).slice(0, 2000),
      // category chips / counts
      counts: [...document.querySelectorAll('[class*="count"], [class*="total"]')].map(c => (c.innerText || '').trim()).filter(Boolean).slice(0, 10),
      // colors observation: pick element with class that suggests primary/main
      sampleColors: (() => {
        const candidates = [
          ['h1', document.querySelector('h1')],
          ['headerLogo', document.querySelector('[class*="logo"] svg path, [class*="logo"] img')],
          ['searchBtn', document.querySelector('[class*="search"] button, [class*="srch"] button')],
          ['activeTab', document.querySelector('.on, .active, [aria-selected="true"]')],
          ['firstFaqDt', document.querySelector('dl dt')],
          ['firstFaqDd', document.querySelector('dl dd')],
          ['mainBody', document.body],
        ];
        const out = {};
        for (const [k, el] of candidates) {
          if (!el) { out[k] = null; continue; }
          const s = getComputedStyle(el);
          out[k] = {
            color: s.color, background: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight,
            borderColor: s.borderColor, borderRadius: s.borderRadius, padding: s.padding
          };
        }
        return out;
      })(),
      // sidebar nav
      sidebar: [...document.querySelectorAll('aside a, .gnb a, .lnb a, [class*="snb"] a, nav a')].map(a => ({
        text: a.innerText.trim(), href: a.getAttribute('href')
      })).filter(a => a.text).slice(0, 40),
      footer: [...document.querySelectorAll('footer a, .footer a')].map(a => a.innerText.trim()).filter(Boolean).slice(0, 20),
    };
    return out;
  });
  fs.writeFileSync(path.join(OUT_DIR, `dom-${label}-${vw}.json`), JSON.stringify(data, null, 2));
  return data;
}

async function tryClickFirstTab(page, label) {
  // attempt to expand to see actual FAQ items
  try {
    // try clicking a category tab e.g. "유심"
    const candidate = await page.$('a:has-text("유심"), button:has-text("유심"), li:has-text("유심") a');
    if (candidate) {
      await candidate.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
  } catch {}
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const vw of VIEWPORTS) {
    console.log(`[${vw.name}] launching context ${vw.width}x${vw.height}`);
    const ctx = await browser.newContext({
      viewport: { width: vw.width, height: vw.height },
      isMobile: vw.isMobile,
      hasTouch: vw.isMobile,
      userAgent: vw.isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('goto err', e.message));
    await page.waitForTimeout(1500);

    // initial snapshot
    await dumpDom(page, 'initial', vw.name);
    await page.screenshot({ path: path.join(SHOTS_DIR, `${vw.name}-01-initial.png`), fullPage: true });

    // try to expand a faq item
    const firstQ = await page.$('dl dt, [class*="question"] button, .faq_q, .qaList li button');
    if (firstQ) {
      await firstQ.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SHOTS_DIR, `${vw.name}-02-faq-expanded.png`), fullPage: true });
      await dumpDom(page, 'after-expand', vw.name);
    }

    // try clicking a category tab
    await tryClickFirstTab(page, vw.name);
    await page.screenshot({ path: path.join(SHOTS_DIR, `${vw.name}-03-tab-changed.png`), fullPage: true });
    await dumpDom(page, 'after-tab', vw.name);

    // try search interaction
    const search = await page.$('input[type="text"], input[type="search"], input[placeholder*="검색"]');
    if (search) {
      await search.fill('유심').catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SHOTS_DIR, `${vw.name}-04-search-yusim.png`), fullPage: true });
      await dumpDom(page, 'after-search', vw.name);
    }

    await ctx.close();
  }
  await browser.close();
  console.log('done');
}

run().catch(e => { console.error(e); process.exit(1); });
