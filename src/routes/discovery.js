// U-G24 Agentic Project Discovery
//   기존 프로젝트 80건(브로셔 + 라이브 크롤)을 기반으로 새 프로젝트와 유사한 사례 추천.
//
//   GET  /api/discovery/projects?q=<keywords>&limit=10[&category=commerce]
//        → 키워드/태그/site_purpose LIKE 매칭 (FTS 또는 LIKE 폴백)
//   POST /api/discovery/similar { hint, audience?, scale?, tone?, embedding?, limit }
//        → 임베딩 (제공 시) cosine + 태그/카테고리 보너스로 정렬
//   GET  /api/discovery/categories
//        → auto_tags 기반 카테고리 카운트 (UI 필터용)

const router = require('express').Router();
const { authMiddleware } = require('../auth');
const { db } = require('../db');
const { embed, fromBlob, cosine } = require('../engine/embed');

router.use(authMiddleware);

const CATEGORIES = ['commerce', 'marketing-channel', 'loreal', 'finance', 'cosmetic-fashion', 'leisure-hotel', 'education', 'content', 'service-uiux'];

function rowToCard(r) {
  let sig = {};
  try { sig = JSON.parse(r.feature_signature || '{}'); } catch {}
  return {
    id: r.id,
    name: r.name,
    url: r.external_path,
    site_purpose: r.site_purpose,
    tags: (r.auto_tags || '').split(',').map(s => s.trim()).filter(Boolean),
    source: sig.source || 'unknown',
    category: CATEGORIES.find(c => (r.auto_tags || '').includes(c)) || null,
    industries: sig.industries || [],
    cases: sig.cases || null,
    fetch_status: sig.fetch_status || null,
    title: sig.title || null,
    og_image: sig.og_image || null,
    crawled_at: sig.crawled_at || sig.fetch_at || null
  };
}

// GET /api/discovery/projects — 키워드 검색
router.get('/projects', (req, res) => {
  const q = (req.query.q || '').trim();
  const category = (req.query.category || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const conds = [];
  const args = [];
  if (q) {
    if (q.length < 2) return res.status(400).json({ error: 'ESYS-DISC-001', message: '검색어 2자 이상' });
    const like = `%${q}%`;
    conds.push('(name LIKE ? OR site_purpose LIKE ? OR auto_tags LIKE ? OR external_path LIKE ?)');
    args.push(like, like, like, like);
  }
  if (category) {
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'ESYS-DISC-002', message: 'Unknown category' });
    conds.push('auto_tags LIKE ?');
    args.push(`%${category}%`);
  }

  conds.unshift("status = 'active'");
  const where = `WHERE ${conds.join(' AND ')}`;
  const rows = db.prepare(`
    SELECT id, external_path, name, site_purpose, auto_tags, feature_signature
    FROM project_index
    ${where}
    ORDER BY
      CASE WHEN feature_signature LIKE '%"source":"live_site"%' THEN 0 ELSE 1 END,
      id DESC
    LIMIT ?
  `).all(...args, limit);

  res.json({
    q,
    category: category || null,
    total: rows.length,
    results: rows.map(rowToCard)
  });
});

// 핵심 검색 로직 — 라우터 외부(intake-agent 등)에서도 재사용 가능
async function searchSimilar({ hint, category = null, limit = 10 }) {
  if (!hint || hint.trim().length < 2) {
    return { ok: false, error: 'hint 2자 이상' };
  }
  if (category && !CATEGORIES.includes(category)) {
    return { ok: false, error: `Unknown category: ${category}` };
  }
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  let queryEmb = null;
  let embedFailed = false;
  try {
    queryEmb = await embed(hint);
  } catch (e) {
    embedFailed = true;
  }

  const rows = db.prepare(`
    SELECT id, external_path, name, site_purpose, auto_tags, feature_signature,
           embedding, embedding_dim
    FROM project_index
    WHERE status = 'active'
  `).all();

  const tokens = hint.toLowerCase().split(/[\s,·/]+/).filter(t => t.length >= 2);

  const scored = [];
  for (const r of rows) {
    let score = 0;

    if (queryEmb && r.embedding && r.embedding_dim) {
      const v = fromBlob(r.embedding, r.embedding_dim);
      if (v) score += cosine(queryEmb, v) * 60;
    }

    const haystack = `${r.name || ''} ${r.site_purpose || ''} ${r.auto_tags || ''}`.toLowerCase();
    let kwHits = 0;
    for (const t of tokens) if (haystack.includes(t)) kwHits++;
    score += Math.min(kwHits * 5, 25);

    if (category && (r.auto_tags || '').includes(category)) score += 15;

    let sig = {};
    try { sig = JSON.parse(r.feature_signature || '{}'); } catch {}
    if (sig.source === 'live_site') score += 5;
    if (sig.fetch_status === 'ok' && (sig.text_length || 0) > 100) score += 3;

    scored.push({ row: r, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, lim).map(s => ({
    ...rowToCard(s.row),
    score: Math.round(s.score * 10) / 10
  }));

  return {
    ok: true,
    hint,
    category: category || null,
    embed_used: !!queryEmb,
    embed_failed: embedFailed,
    total: top.length,
    results: top
  };
}

// POST /api/discovery/similar — 신규 프로젝트 hint로 유사 사례 찾기
//   body: { hint: string, category?: string, limit?: number }
//   1) hint 임베딩 → 모든 project_index 임베딩과 cosine
//   2) auto_tags / category 키워드 부스트
//   3) 라이브 크롤 사이트 우대
router.post('/similar', async (req, res) => {
  const { hint = '', category = null, limit = 10 } = req.body || {};
  const result = await searchSimilar({ hint, category, limit });
  if (!result.ok) {
    const code = /Unknown category/.test(result.error) ? 'ESYS-DISC-002' : 'ESYS-DISC-003';
    return res.status(400).json({ error: code, message: result.error });
  }
  res.json(result);
});

// GET /api/discovery/categories — 카테고리별 카운트
router.get('/categories', (req, res) => {
  const rows = db.prepare(`SELECT auto_tags FROM project_index WHERE status = 'active'`).all();
  const counts = {};
  for (const c of CATEGORIES) counts[c] = 0;
  for (const r of rows) {
    for (const c of CATEGORIES) {
      if ((r.auto_tags || '').includes(c)) counts[c]++;
    }
  }
  const total = rows.length;
  res.json({
    total,
    categories: CATEGORIES.map(code => ({ code, count: counts[code] }))
  });
});

module.exports = router;
module.exports.searchSimilar = searchSimilar;
module.exports.CATEGORIES = CATEGORIES;
