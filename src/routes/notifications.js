// 알림 (notifications) — 읽지 않은 건수 + 목록 + 읽음 처리
const express = require('express');
const { db, logActivity } = require('../db');
const { authMiddleware } = require('../auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/notifications — 본인의 알림 (기본: 미읽 우선, 최근순)
router.get('/', (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
  const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';

  const where = ['user_id = ?'];
  const params = [userId];
  if (onlyUnread) where.push('read_at IS NULL');

  const rows = db.prepare(`
    SELECT id, type, entity_type, entity_id, message, read_at, created_at
    FROM notifications
    WHERE ${where.join(' AND ')}
    ORDER BY (read_at IS NULL) DESC, id DESC
    LIMIT ?
  `).all(...params, limit);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL
  `).get(userId).n;

  res.json({ items: rows, unread: unreadCount, total: rows.length });
});

// GET /api/notifications/unread-count — 사이드바 배지용 경량 엔드포인트
router.get('/unread-count', (req, res) => {
  const n = db.prepare(`
    SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL
  `).get(req.user.id).n;
  res.json({ unread: n });
});

// POST /api/notifications/:id/read — 단건 읽음 처리
router.post('/:id/read', (req, res) => {
  const r = db.prepare(`
    UPDATE notifications SET read_at = datetime('now')
    WHERE id = ? AND user_id = ? AND read_at IS NULL
  `).run(req.params.id, req.user.id);
  res.json({ ok: true, updated: r.changes });
});

// POST /api/notifications/read-all — 본인 알림 전체 읽음 처리
router.post('/read-all', (req, res) => {
  const r = db.prepare(`
    UPDATE notifications SET read_at = datetime('now')
    WHERE user_id = ? AND read_at IS NULL
  `).run(req.user.id);
  res.json({ ok: true, updated: r.changes });
});

module.exports = router;
