// U-G22: RAG 라우트 — ~/.claude 자산 검색·재색인
//   GET  /api/rag/search?q=...&source=...&limit=...   (인증 필요, 모든 역할)
//   GET  /api/rag/stats                               (인증 필요)
//   POST /api/rag/reindex                             (admin only)

const router = require('express').Router();
const { authMiddleware, requireRole } = require('../auth');
const rag = require('../engine/rag-index');

router.use(authMiddleware);

router.get('/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) {
    return res.status(400).json({ error: 'ESYS-RAG-001', message: 'q (query) is required' });
  }
  const result = rag.search(q, {
    source: req.query.source ? String(req.query.source) : null,
    limit: req.query.limit
  });
  if (!result.ready) {
    return res.status(503).json({ error: 'ESYS-RAG-002', message: 'RAG corpus not ready (FTS5 unavailable or not indexed)' });
  }
  res.json(result);
});

router.get('/stats', (req, res) => {
  const s = rag.getStats();
  if (!s.ready) {
    return res.status(503).json({ error: 'ESYS-RAG-002', message: 'RAG corpus not ready' });
  }
  res.json(s);
});

router.post('/reindex', requireRole('admin'), (req, res) => {
  try {
    const r = rag.reindexAll();
    if (!r.ready) {
      return res.status(503).json({ error: 'ESYS-RAG-002', message: 'RAG corpus not ready (FTS5 unavailable)' });
    }
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: 'ESYS-RAG-003', message: e.message });
  }
});

module.exports = router;
