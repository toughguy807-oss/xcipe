#!/usr/bin/env node
// U-G24 라이브 사이트 백필 — Step B (외부 라이브 사이트 전용)
//
// 정책: 로컬 산출물 대신 라이브 운영 사이트만 인덱싱 (정확도 우선)
//
// 사용:
//   node scripts/backfill-live-site.js \
//     --url "https://novita.co.kr/main" \
//     --name "노비타" \
//     --client "노비타" \
//     --domain "가전" \
//     --tone "이런 사이트도 구축/운영하고 있어요"
//
//   --max-pages <N>   : 자동 발견 페이지 상한 (기본 12)
//   --depth <N>       : 동일 호스트 링크 따라가는 깊이 (기본 1)
//   --no-embed        : 임베딩 생략

const path = require('path');
const crypto = require('crypto');

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

function sha256(s) {
  return crypto.createHash('sha256').update(typeof s === 'string' ? s : Buffer.from(s)).digest('hex');
}

function stripHtml(html) {
  let h = html;
  h = h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  return h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
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

function extractLinks(html, baseUrl) {
  const re = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>/gi;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl);
      // 동일 호스트만
      if (u.hostname !== new URL(baseUrl).hostname) continue;
      // 정적 파일 스킵
      if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|css|js|ico|woff2?|ttf|mp4|mov)(\?.*)?$/i.test(u.pathname)) continue;
      // anchor 제거
      u.hash = '';
      links.add(u.toString());
    } catch { /* skip invalid */ }
  }
  return [...links];
}

async function fetchPage(url, ua = 'EluoSysBackfill/1.0 (+internal indexing)') {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': ua, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const html = await res.text();
  return { ok: true, status: res.status, html, finalUrl: res.url };
}

async function crawl(rootUrl, { maxPages = 12, depth = 1 } = {}) {
  const seen = new Map();
  const queue = [{ url: rootUrl, d: 0 }];
  const root = new URL(rootUrl);

  while (queue.length && seen.size < maxPages) {
    const { url, d } = queue.shift();
    if (seen.has(url)) continue;

    try {
      const r = await fetchPage(url);
      if (!r.ok) {
        console.warn(`  [${r.status}] skip ${url}`);
        continue;
      }
      const text = stripHtml(r.html);
      if (!text || text.length < 30) continue;

      seen.set(url, {
        url,
        title: extractTitle(r.html),
        description: extractMeta(r.html, 'description') || extractMeta(r.html, 'og:description') || '',
        og_title: extractMeta(r.html, 'og:title') || '',
        og_image: extractMeta(r.html, 'og:image') || '',
        text: text.slice(0, 16384),
        digest: sha256(r.html),
        captured_at: new Date().toISOString()
      });

      console.log(`  [✓] ${url}  (${text.length}자)`);

      if (d < depth) {
        const links = extractLinks(r.html, url);
        for (const l of links) {
          if (!seen.has(l) && seen.size + queue.length < maxPages * 2) {
            queue.push({ url: l, d: d + 1 });
          }
        }
      }
      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.warn(`  [error] ${url} — ${e.message}`);
    }
  }

  return [...seen.values()];
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || typeof args.url !== 'string') {
    console.error('--url <root-url> 필수');
    process.exit(1);
  }
  if (!args.name || typeof args.name !== 'string') {
    console.error('--name <project-name> 필수');
    process.exit(1);
  }

  const rootUrl = args.url;
  const projectName = args.name;
  const client = (typeof args.client === 'string' && args.client) || projectName;
  const domain = (typeof args.domain === 'string' && args.domain) || null;
  const tone = (typeof args.tone === 'string' && args.tone) || '엘루오가 구축/운영한 라이브 사이트';
  const maxPages = parseInt(args['max-pages'], 10) || 12;
  const depth = parseInt(args.depth, 10) || 1;

  console.log(`[1/4] 라이브 사이트 크롤: ${rootUrl}`);
  console.log(`      max-pages=${maxPages}, depth=${depth}`);
  const pages = await crawl(rootUrl, { maxPages, depth });
  if (!pages.length) {
    console.error('수집 페이지 0건 — 종료');
    process.exit(1);
  }
  console.log(`      → ${pages.length} 페이지 수집`);

  // 임베딩
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const { embed, toBlob, getProviderInfo } = require(path.join(__dirname, '..', 'src', 'engine', 'embed'));

  let embInfo = null;
  let projectEmbBlob = null;
  const pageBlobs = new Array(pages.length).fill(null);

  if (!args['no-embed']) {
    console.log('[2/4] 임베딩 계산');
    try {
      embInfo = getProviderInfo();
      console.log(`      provider=${embInfo.provider}, model=${embInfo.model}, dim=${embInfo.dim}`);
      const summary = [projectName, client, domain, pages[0]?.title, pages[0]?.description].filter(Boolean).join(' | ');
      const v = await embed(summary);
      projectEmbBlob = toBlob(v);
      for (let i = 0; i < pages.length; i++) {
        try {
          const av = await embed(pages[i].text.slice(0, 4000));
          pageBlobs[i] = toBlob(av);
        } catch { /* skip */ }
      }
      console.log(`      → project 1 + pages ${pageBlobs.filter(Boolean).length}/${pages.length}`);
    } catch (e) {
      console.warn(`      임베딩 실패: ${e.message} — 계속 진행`);
      embInfo = null;
    }
  } else {
    console.log('[2/4] 임베딩 스킵');
  }

  // FTS5 가용성
  let ftsAvailable = false;
  let insFts;
  try {
    insFts = db.prepare(`
      INSERT INTO artifact_corpus (artifact_index_id, project_index_id, kind, section, path, body)
      VALUES (?,?,?,?,?,?)
    `);
    ftsAvailable = true;
  } catch { ftsAvailable = false; }

  console.log('[3/4] DB 적재');
  const externalPath = rootUrl;
  const sitePurpose = pages[0]?.description || pages[0]?.title || tone;
  const featureSig = JSON.stringify({
    source: 'live_site',
    client,
    domain,
    tone,
    root_url: rootUrl,
    title: pages[0]?.title || null,
    og_image: pages[0]?.og_image || null,
    crawled_at: new Date().toISOString(),
    page_count: pages.length
  });
  const digest = sha256(JSON.stringify({ rootUrl, projectName, client, domain, count: pages.length }));

  const insArt = db.prepare(`
    INSERT INTO artifact_index (
      project_index_id, kind, section, path, digest, body_excerpt,
      embedding, embedding_model
    ) VALUES (?,?,?,?,?,?,?,?)
  `);

  const tx = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM project_index WHERE external_path = ?`).get(externalPath);

    let projectIndexId;
    if (existing) {
      db.prepare(`
        UPDATE project_index SET
          name = ?, site_purpose = ?, feature_signature = ?,
          auto_tags = ?,
          artifact_counts = ?, embedding = ?, embedding_model = ?, embedding_dim = ?,
          digest = ?, status = 'active',
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        projectName, sitePurpose, featureSig,
        [client, domain].filter(Boolean).join(','),
        JSON.stringify({ live_page: pages.length }),
        projectEmbBlob, embInfo?.model || null, embInfo?.dim || null,
        digest, existing.id
      );
      projectIndexId = existing.id;
      console.log(`      project_index updated (id=${projectIndexId})`);
    } else {
      const r = db.prepare(`
        INSERT INTO project_index (
          external_path, name, site_purpose, feature_signature,
          auto_tags,
          artifact_counts, embedding, embedding_model, embedding_dim, digest, status
        ) VALUES (?,?,?,?,?,?,?,?,?,?, 'active')
      `).run(
        externalPath, projectName, sitePurpose, featureSig,
        [client, domain].filter(Boolean).join(','),
        JSON.stringify({ live_page: pages.length }),
        projectEmbBlob, embInfo?.model || null, embInfo?.dim || null,
        digest
      );
      projectIndexId = r.lastInsertRowid;
      console.log(`      project_index inserted (id=${projectIndexId})`);
    }

    // 기존 페이지 정리
    db.prepare(`DELETE FROM artifact_index WHERE project_index_id = ?`).run(projectIndexId);
    if (ftsAvailable) {
      try { db.prepare(`DELETE FROM artifact_corpus WHERE project_index_id = ?`).run(projectIndexId); } catch {}
    }

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const body = [p.title, p.description, p.text].filter(Boolean).join('\n');
      const ar = insArt.run(
        projectIndexId, 'live_page', null, p.url, p.digest,
        body.slice(0, 600),
        pageBlobs[i], embInfo?.model || null
      );
      if (ftsAvailable && insFts) {
        insFts.run(ar.lastInsertRowid, projectIndexId, 'live_page', null, p.url, body);
      }
    }
    console.log(`      artifact_index ${pages.length}건 적재`);
    console.log(`      artifact_corpus FTS5 ${ftsAvailable ? '완료' : '스킵'}`);
  });
  tx();

  console.log('\n[4/4] 검증');
  const summary = db.prepare(`
    SELECT pi.id, pi.name, pi.external_path, pi.auto_tags, COUNT(ai.id) AS pages
    FROM project_index pi LEFT JOIN artifact_index ai ON ai.project_index_id = pi.id
    GROUP BY pi.id ORDER BY pi.id ASC
  `).all();
  console.table(summary);

  console.log('\n완료.');
})().catch(e => {
  console.error('\nFATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
