#!/usr/bin/env node
// project_index 의 brochure stub 행에 대해 root URL 1페이지만 fetch 해서
// title / og:description / og:image 만 빠르게 채운다.
//
// 본 백필은 site_purpose 가 비어있는 stub 만 대상으로 한다.
// SPA/Cloudflare 등으로 실패한 건은 feature_signature.fetch_status 에 기록.
//
// 사용:
//   node scripts/backfill-stub-meta.js [--limit 20] [--retry-failed] [--dry]

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

function stripHtml(html) {
  let h = html;
  h = h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  return h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : '';
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

// 일반 브라우저 UA
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

async function fetchOnce(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    const html = await res.text();
    return { ok: true, status: res.status, html, finalUrl: res.url };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, reason: e.name === 'AbortError' ? 'timeout' : (e.code || e.message) };
  }
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const limit = parseInt(args.limit, 10) || 0;
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));

  // brochure stub 중 site_purpose 가 비어있거나 첫 케이스명 그대로인 행
  // (또는 fetch_status 가 실패였던 것)
  let where;
  if (args['retry-failed']) {
    where = `feature_signature LIKE '%"source":"brochure"%' AND feature_signature LIKE '%"fetch_status"%' AND feature_signature NOT LIKE '%"fetch_status":"ok"%'`;
  } else {
    where = `feature_signature LIKE '%"source":"brochure"%' AND feature_signature NOT LIKE '%"fetch_status"%'`;
  }
  let q = `SELECT id, external_path, name, site_purpose, feature_signature FROM project_index WHERE ${where} ORDER BY id`;
  if (limit > 0) q += ` LIMIT ${limit}`;

  const rows = db.prepare(q).all();
  console.log(`대상: ${rows.length}건`);
  if (rows.length === 0) return;

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

    const result = await fetchOnce(r.external_path);
    let sig;
    try { sig = JSON.parse(r.feature_signature || '{}'); } catch { sig = {}; }

    if (!result.ok) {
      sig.fetch_status = 'failed';
      sig.fetch_reason = result.reason;
      sig.fetch_at = new Date().toISOString();
      console.log(`FAIL (${result.reason})`);
      if (!args.dry) upd.run(null, JSON.stringify(sig), r.id);
      failed++;
      continue;
    }

    const html = result.html;
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description') || extractMeta(html, 'og:description') || '';
    const ogImg = extractMeta(html, 'og:image') || null;
    const ogTitle = extractMeta(html, 'og:title') || null;
    const text = stripHtml(html);

    sig.fetch_status = 'ok';
    sig.fetch_at = new Date().toISOString();
    sig.final_url = result.finalUrl;
    sig.title = title || ogTitle;
    sig.og_image = ogImg;
    sig.text_length = text.length;

    const newPurpose = desc || title || null;
    console.log(`OK (${text.length}자, "${(title || '').slice(0, 30)}")`);

    if (!args.dry) upd.run(newPurpose, JSON.stringify(sig), r.id);
    ok++;

    // rate limit
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n완료: 성공 ${ok}건, 실패 ${failed}건`);

  if (!args.dry) {
    const total = db.prepare(`SELECT COUNT(*) as c FROM project_index`).get().c;
    const live = db.prepare(`SELECT COUNT(*) as c FROM project_index WHERE feature_signature LIKE '%"fetch_status":"ok"%' OR feature_signature LIKE '%"source":"live_site"%'`).get().c;
    console.log(`project_index: 총 ${total}건, 메타 채워진 ${live}건`);
  }
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
