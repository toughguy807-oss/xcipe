// Extract full FAQ item list with categories
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://ktmyr.com/fe/service/cctr/faqList.do';
const OUT = path.resolve('research/ktmyr-faq-list');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Full mainContent text
  const mainText = await page.evaluate(() => {
    const candidates = [
      document.querySelector('#mainContent'),
      document.querySelector('#content'),
      document.querySelector('main'),
      document.querySelector('.faqWrap'),
      document.querySelector('[class*="faq"]'),
    ].filter(Boolean);
    if (candidates.length) {
      return candidates[0].innerText;
    }
    return document.body.innerText;
  });
  fs.writeFileSync(path.join(OUT, 'main-content.txt'), mainText);

  // Get all FAQ DT and DD pairs and category labels
  const data = await page.evaluate(() => {
    // FAQ rows often in dl > dt + dd or li with question/answer
    const out = { rows: [], categories: [], tabs: [], topQuestions: [] };

    // try common FAQ pattern: .faqList li, .accordion-item, etc.
    const allLi = [...document.querySelectorAll('.faqList > li, [class*="faqList"] li, .accordion li, .qa-list li, [class*="qaList"] li')];
    for (const li of allLi.slice(0, 50)) {
      const cat = li.querySelector('.category, .cate, .tag, [class*="cate"], [class*="categ"]');
      const q = li.querySelector('.question, .q, button, [class*="question"], strong, .tit, [class*="tit"]');
      const a = li.querySelector('.answer, .a, [class*="answer"], .cont, .desc, [class*="cont"], p');
      out.rows.push({
        cls: li.className,
        category: cat ? cat.innerText.trim() : null,
        question: q ? q.innerText.trim() : null,
        answer: a ? a.innerText.trim().slice(0, 300) : null,
        rawText: li.innerText.trim().slice(0, 400)
      });
    }

    // category chips
    const chips = [...document.querySelectorAll('.tabButton, [class*="tabButton"], .category-tab, .cate-btn, button[role="tab"]')];
    for (const c of chips.slice(0, 20)) {
      out.tabs.push({
        text: c.innerText.trim(),
        cls: c.className,
        active: c.classList.contains('on') || c.classList.contains('active') || c.getAttribute('aria-selected') === 'true',
        style: {
          color: getComputedStyle(c).color,
          background: getComputedStyle(c).backgroundColor,
          border: getComputedStyle(c).borderColor,
          borderRadius: getComputedStyle(c).borderRadius,
          padding: getComputedStyle(c).padding,
          fontSize: getComputedStyle(c).fontSize,
          fontWeight: getComputedStyle(c).fontWeight,
        }
      });
    }

    // search box
    const sb = document.querySelector('#searchValue, input[name="searchValue"], input[placeholder*="검색"]');
    out.searchBox = sb ? {
      placeholder: sb.placeholder,
      style: {
        color: getComputedStyle(sb).color,
        background: getComputedStyle(sb).backgroundColor,
        border: getComputedStyle(sb).borderColor + ' ' + getComputedStyle(sb).borderWidth + ' ' + getComputedStyle(sb).borderStyle,
        height: getComputedStyle(sb).height,
        fontSize: getComputedStyle(sb).fontSize,
      },
      parentBg: sb.parentElement ? getComputedStyle(sb.parentElement).backgroundColor : null,
    } : null;

    // page wrapper background
    out.pageBg = (() => {
      const main = document.querySelector('main, #content, #mainContent');
      return main ? getComputedStyle(main).backgroundColor : null;
    })();

    // section heading style
    const h2 = document.querySelector('main h2, #content h2, .faqWrap h2');
    if (h2) {
      out.h2 = {
        text: h2.innerText.trim(),
        style: {
          color: getComputedStyle(h2).color,
          fontSize: getComputedStyle(h2).fontSize,
          fontWeight: getComputedStyle(h2).fontWeight,
        }
      };
    }

    // count "전체 (10건)"
    const countEls = [...document.querySelectorAll('h3, .totalCount, [class*="total"], [class*="count"]')];
    for (const e of countEls) {
      const t = e.innerText.trim();
      if (/\(\d+/.test(t)) {
        out.countSection = { text: t, color: getComputedStyle(e).color, fontSize: getComputedStyle(e).fontSize };
        break;
      }
    }

    // active tab style after expansion attempt
    const activeTab = document.querySelector('.tabButton.on, .tabButton.active');
    if (activeTab) {
      out.activeTabStyle = {
        text: activeTab.innerText.trim(),
        color: getComputedStyle(activeTab).color,
        background: getComputedStyle(activeTab).backgroundColor,
        borderColor: getComputedStyle(activeTab).borderColor,
      };
    }

    // sample question card style (any visible Q row)
    const qRow = document.querySelector('.accordion li, .faqList li, [class*="faqList"] li, dl dt');
    if (qRow) {
      out.qRowStyle = {
        text: qRow.innerText.trim().slice(0, 200),
        color: getComputedStyle(qRow).color,
        background: getComputedStyle(qRow).backgroundColor,
        borderTop: getComputedStyle(qRow).borderTopColor + ' ' + getComputedStyle(qRow).borderTopWidth,
        borderBottom: getComputedStyle(qRow).borderBottomColor + ' ' + getComputedStyle(qRow).borderBottomWidth,
        padding: getComputedStyle(qRow).padding,
      };
    }

    return out;
  });
  fs.writeFileSync(path.join(OUT, 'faq-extracted.json'), JSON.stringify(data, null, 2));

  // also screenshot of just visible viewport (above-fold)
  await page.screenshot({ path: path.join(OUT, 'screenshots/desktop-above-fold.png'), fullPage: false });

  // expand all FAQs and capture
  await page.evaluate(() => {
    document.querySelectorAll('.faqList li button, .accordion button, [class*="faq"] button').forEach((b, i) => {
      if (i < 10) b.click();
    });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'screenshots/desktop-all-expanded.png'), fullPage: true });

  await ctx.close();

  // also mobile
  const ctx2 = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const p2 = await ctx2.newPage();
  await p2.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(2000);
  await p2.screenshot({ path: path.join(OUT, 'screenshots/mobile-above-fold.png'), fullPage: false });
  await p2.evaluate(() => {
    document.querySelectorAll('.faqList li button, .accordion button, [class*="faq"] button').forEach((b, i) => {
      if (i < 5) b.click();
    });
  });
  await p2.waitForTimeout(1000);
  await p2.screenshot({ path: path.join(OUT, 'screenshots/mobile-all-expanded.png'), fullPage: true });

  // mobile click TOP10 tab
  const top10 = await p2.$('button:has-text("TOP10"), a:has-text("TOP10")');
  if (top10) {
    await top10.click().catch(() => {});
    await p2.waitForTimeout(1200);
    await p2.screenshot({ path: path.join(OUT, 'screenshots/mobile-tab-top10.png'), fullPage: true });
  }

  // search 유심
  await p2.evaluate(() => { window.scrollTo(0,0); });
  const sb2 = await p2.$('#searchValue, input[name="searchValue"], input[placeholder*="검색"]');
  if (sb2) {
    await sb2.fill('유심');
    await p2.keyboard.press('Enter');
    await p2.waitForTimeout(1500);
    await p2.screenshot({ path: path.join(OUT, 'screenshots/mobile-search-yusim.png'), fullPage: true });

    // clear & search non-existent
    await sb2.fill('');
    await sb2.fill('asdfqwer1234');
    await p2.keyboard.press('Enter');
    await p2.waitForTimeout(1500);
    await p2.screenshot({ path: path.join(OUT, 'screenshots/mobile-search-empty-result.png'), fullPage: true });
  }

  await ctx2.close();
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
