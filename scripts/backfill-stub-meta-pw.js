#!/usr/bin/env node
// backfill-stub-meta.js 의 Playwright 버전.
// SPA / Cloudflare 차단 사이트 대응.
//
// 대상 선정:
//   --target failed : feature_signature.fetch_status = 'failed'
//   --target spa    : fetch_status = 'ok' && text_length = 0
//   --target all    : 둘 다
//
// 사용:
//   node scripts/backfill-stub-meta-pw.js --target failed [--limit 5] [--dry]

const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const target = args.target || 'all';
  const limit = parseInt(args.limit, 10) || 0;

  const { db } = require(path.join(__dirname, '..', 'src', 'db'));

  let where;
  if (target === 'failed') {
    where = `feature_signature LIKE '%"fetch_status":"failed"%'`;
  } else if (target === 'spa') {
    where = `feature_signature LIKE '%"fetch_status":"ok"%' AND feature_signature LIKE '%"text_length":0%'`;
  } else {
    where = `(feature_signature LIKE '%"fetch_status":"failed"%' OR (feature_signature LIKE '%"fetch_status":"ok"%' AND feature_signature LIKE '%"text_length":0%'))`;
  }
  let q = `SELECT id, external_path, name, feature_signature FROM project_index WHERE ${where} ORDER BY id`;
  if (limit > 0) q += ` LIMIT ${limit}`;
  const rows = db.prepare(q).all();
  console.log(`대상: ${rows.length}건 (target=${target})`);
  if (rows.length === 0) return;

  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  });

  const upd = db.prepare(`
    UPDATE project_index SET
      site_purpose = COALESCE(?, site_purpose),
      feature_signature = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  let ok = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = `[${i+1}/${rows.length}]`;
    process.stdout.write(`${tag} ${r.external_path} ... `);

    let sig;
    try { sig = JSON.parse(r.feature_signature || '{}'); } catch { sig = {}; }

    const page = await context.newPage();
    let result = null;
    try {
      const resp = await page.goto(r.external_path, {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });
      // 추가 렌더링 대기 (SPA)
      await page.waitForTimeout(2500);

      const status = resp ? resp.status() : 0;
      const finalUrl = page.url();

      const title = await page.title().catch(() => '');
      const desc = await page.evaluate(() => {
        const m = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
        return m ? m.content : '';
      }).catch(() => '');
      const ogImg = await page.evaluate(() => {
        const m = document.querySelector('meta[property="og:image"]');
        return m ? m.content : null;
      }).catch(() => null);
      const text = await page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 16384)).catch(() => '');

      result = { ok: true, status, title, desc, ogImg, text, finalUrl };
    } catch (e) {
      result = { ok: false, reason: e.message.split('\n')[0].slice(0, 80) };
    } finally {
      await page.close().catch(() => {});
    }

    if (result.ok) {
      sig.fetch_status = 'ok';
      sig.fetch_at = new Date().toISOString();
      sig.fetch_method = 'playwright';
      sig.final_url = result.finalUrl;
      sig.title = result.title;
      sig.og_image = result.ogImg;
      sig.text_length = result.text.length;
      const newPurpose = result.desc || result.title || null;
      console.log(`OK (${result.text.length}자, "${(result.title || '').slice(0, 30)}")`);
      if (!args.dry) upd.run(newPurpose, JSON.stringify(sig), r.id);
      ok++;
    } else {
      sig.fetch_status = 'failed';
      sig.fetch_reason = result.reason;
      sig.fetch_method = 'playwright';
      sig.fetch_at = new Date().toISOString();
      console.log(`FAIL (${result.reason})`);
      if (!args.dry) upd.run(null, JSON.stringify(sig), r.id);
      failed++;
    }
  }

  await context.close();
  await browser.close();

  console.log(`\n완료: 성공 ${ok}건, 실패 ${failed}건`);
})().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
