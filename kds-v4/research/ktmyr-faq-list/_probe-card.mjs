import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://ktmyr.com/fe/service/cctr/faqList.do';
const OUT = path.resolve('research/ktmyr-faq-list');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // probe FAQ card structure on mobile (real 375 viewport)
  const probe = await page.evaluate(() => {
    const out = { found: false };

    // try selectors known from main-content.txt structure
    const lists = ['.faqList', 'ul.tabContent', '#faqList', '[class*="faqList"]', '[class*="qaList"]', '[class*="accordion"]'];
    let listEl = null;
    for (const sel of lists) {
      const el = document.querySelector(sel);
      if (el) { listEl = el; out.foundListSel = sel; break; }
    }
    if (!listEl) {
      // find by content: ul containing TOP10
      const uls = [...document.querySelectorAll('ul, dl')];
      for (const ul of uls) {
        if (/TOP10/.test(ul.innerText) && /답변 열기|kt멤버십/.test(ul.innerText)) {
          listEl = ul;
          out.foundListSel = 'content-search';
          break;
        }
      }
    }
    if (!listEl) return out;

    out.found = true;
    out.listCls = listEl.className;
    out.listTag = listEl.tagName;
    out.listChildrenCount = listEl.children.length;

    // sample first 3 children
    const all = (el) => el ? {
      tag: el.tagName,
      cls: el.className,
      text: (el.innerText || '').slice(0, 200),
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
      borderTop: getComputedStyle(el).borderTopColor + ' ' + getComputedStyle(el).borderTopWidth + ' ' + getComputedStyle(el).borderTopStyle,
      borderBottom: getComputedStyle(el).borderBottomColor + ' ' + getComputedStyle(el).borderBottomWidth + ' ' + getComputedStyle(el).borderBottomStyle,
      padding: getComputedStyle(el).padding,
      margin: getComputedStyle(el).margin,
      fontSize: getComputedStyle(el).fontSize,
      fontWeight: getComputedStyle(el).fontWeight,
      width: getComputedStyle(el).width,
      height: getComputedStyle(el).height,
    } : null;

    out.children = [...listEl.children].slice(0, 3).map(li => {
      const innerSpan = li.querySelectorAll('span, em, strong, b, i');
      const allChildren = [...li.querySelectorAll('*')].slice(0, 30);
      return {
        ...all(li),
        innerHTML: li.innerHTML.slice(0, 1200),
        descendants: allChildren.map(c => ({
          tag: c.tagName,
          cls: c.className,
          text: (c.innerText || c.textContent || '').slice(0, 80).trim(),
          color: getComputedStyle(c).color,
          bg: getComputedStyle(c).backgroundColor,
          fontSize: getComputedStyle(c).fontSize,
          fontWeight: getComputedStyle(c).fontWeight,
          borderRadius: getComputedStyle(c).borderRadius,
        }))
      };
    });
    return out;
  });

  fs.writeFileSync(path.join(OUT, 'card-probe-mobile.json'), JSON.stringify(probe, null, 2));

  // also probe the top-nav underline area
  const topnavProbe = await page.evaluate(() => {
    const out = {};
    const active = document.querySelector('.gnb .menu.active, [class*="gnb"] [class*="active"], .menu.active');
    if (active) {
      // check pseudo / ::after for underline
      out.activeText = active.innerText.trim();
      out.activeCls = active.className;
      // check element below/parent for border-bottom
      out.activeStyle = {
        color: getComputedStyle(active).color,
        borderBottom: getComputedStyle(active).borderBottomColor + ' ' + getComputedStyle(active).borderBottomWidth,
      };
      // get the inner anchor element
      const link = active.querySelector('a, button');
      if (link) {
        out.linkStyle = {
          color: getComputedStyle(link).color,
          borderBottom: getComputedStyle(link).borderBottomColor + ' ' + getComputedStyle(link).borderBottomWidth,
        };
        out.linkAfter = getComputedStyle(link, '::after').backgroundColor;
      }
      out.activeAfter = getComputedStyle(active, '::after').backgroundColor;
    }
    return out;
  });
  fs.writeFileSync(path.join(OUT, 'topnav-probe-mobile.json'), JSON.stringify(topnavProbe, null, 2));

  // sub-tab FAQ pill (검정 알약)
  const subtabProbe = await page.evaluate(() => {
    // try to find "FAQ" sub-tab pill
    const all = (el) => el ? {
      tag: el.tagName, cls: el.className,
      text: (el.innerText || '').trim().slice(0, 50),
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
      borderColor: getComputedStyle(el).borderColor,
      borderRadius: getComputedStyle(el).borderRadius,
      padding: getComputedStyle(el).padding,
      fontSize: getComputedStyle(el).fontSize,
      fontWeight: getComputedStyle(el).fontWeight,
    } : null;

    const candidates = [
      document.querySelector('.subMenu li.active a, .subMenu li.on a, [class*="subMenu"] .active a'),
      [...document.querySelectorAll('a, button')].find(a => a.innerText.trim() === 'FAQ' && a.classList.contains('on')),
      [...document.querySelectorAll('li')].find(li => li.innerText.trim() === 'FAQ' && (li.classList.contains('on') || li.classList.contains('active'))),
    ].filter(Boolean);

    return {
      candidates: candidates.map(all),
      all_pillish: [...document.querySelectorAll('a, button')]
        .filter(a => /^(FAQ|고객상담|고객센터 안내|공지사항)$/.test(a.innerText.trim()))
        .map(all)
    };
  });
  fs.writeFileSync(path.join(OUT, 'subtab-probe-mobile.json'), JSON.stringify(subtabProbe, null, 2));

  await ctx.close();
  await browser.close();
  console.log('done');
}

run().catch(e => { console.error(e); process.exit(1); });
