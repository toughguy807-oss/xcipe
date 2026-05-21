const router = require('express').Router();
const { db } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);
// 활동 로그는 다른 사용자의 actor_email/detail이 포함되어 admin 한정
//   본인 알림은 /api/notifications가 user_id 필터로 별도 제공
router.use(requireRole('admin'));

// IA-A031: GET /api/activity (FN-039)
//   - page, limit (1-100, default 20)
//   - entity_type (project|pipeline|pipeline_step|ticket|user|message 등)
//   - action (started|approved|rejected|paused|cancelled 등)
//   - actor_id
//   - days (1-365, 기본 무제한)
//   - q (entity_type/action/detail 부분 일치)
// T0-4: 활동 로그 3-tier 분리
//   Audit  = login·daily_cost_report·error_budget_*·projects_csv_exported · system 엔티티 등 (admin 디버그용)
//   Feed   = pipeline·project·ticket·message (일반 사용자 의미 있는 이벤트, 기본 표시)
//   Inbox  = 본인 멘션·할당 (notifications 별도 처리 — 본 API 범위 외)
//   기본은 Feed만 노출. ?include_internal=1 → Audit 포함 (admin 한정 라우트라 권한 OK)
const INTERNAL_ACTIONS = new Set([
  'login', 'logout', 'daily_cost_report',
  'error_budget_alert', 'error_budget_exceeded',
  'projects_csv_exported'
]);
const INTERNAL_ENTITY_TYPES = new Set(['user', 'system']);

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const conds = [];
  const args = [];

  // T0-4: 기본 Feed 모드 — internal 노이즈 제외 (admin이 명시적으로 ?include_internal=1 시 전체)
  const includeInternal = req.query.include_internal === '1' || req.query.include_internal === 'true';
  if (!includeInternal) {
    const internalActions = [...INTERNAL_ACTIONS];
    const internalEntities = [...INTERNAL_ENTITY_TYPES];
    conds.push(`a.action NOT IN (${internalActions.map(() => '?').join(',')})`);
    args.push(...internalActions);
    conds.push(`a.entity_type NOT IN (${internalEntities.map(() => '?').join(',')})`);
    args.push(...internalEntities);
  }

  if (req.query.entity_type) { conds.push('a.entity_type = ?'); args.push(req.query.entity_type); }
  if (req.query.action) { conds.push('a.action = ?'); args.push(req.query.action); }
  if (req.query.actor_id) { conds.push('a.actor_id = ?'); args.push(parseInt(req.query.actor_id, 10) || 0); }

  const days = parseInt(req.query.days, 10);
  if (days && days >= 1 && days <= 365) {
    conds.push("a.created_at >= datetime('now', ?)");
    args.push(`-${days} days`);
  }

  const q = (req.query.q || '').trim();
  if (q) {
    conds.push('(a.entity_type LIKE ? OR a.action LIKE ? OR a.detail LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like);
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';

  const logs = db.prepare(`
    SELECT a.id, a.entity_type, a.entity_id, a.action, a.detail, a.created_at,
           a.actor_id, u.email as actor_email
    FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id
    ${where}
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...args, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_log a ${where}`).get(...args).c;

  res.json({ data: logs, total, page, limit });
});

// GET /api/activity/facets — 필터 옵션 (entity_type/action 분포)
router.get('/facets', (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const cutoff = `-${Math.min(365, Math.max(1, days))} days`;
  const entityTypes = db.prepare(`
    SELECT entity_type as name, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', ?)
    GROUP BY entity_type ORDER BY count DESC
  `).all(cutoff);
  const actions = db.prepare(`
    SELECT action as name, COUNT(*) as count
    FROM activity_log
    WHERE created_at >= datetime('now', ?)
    GROUP BY action ORDER BY count DESC LIMIT 30
  `).all(cutoff);
  res.json({ entity_types: entityTypes, actions, days });
});

// GET /api/activity/export.csv — 활동 로그 CSV 내보내기 (E5)
//   현재 필터(entity_type/action/days/q)를 그대로 사용, 최대 10,000행
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

router.get('/export.csv', (req, res) => {
  const conds = [];
  const args = [];
  if (req.query.entity_type) { conds.push('a.entity_type = ?'); args.push(req.query.entity_type); }
  if (req.query.action)      { conds.push('a.action = ?');      args.push(req.query.action); }
  if (req.query.actor_id)    { conds.push('a.actor_id = ?');    args.push(parseInt(req.query.actor_id, 10) || 0); }
  const days = parseInt(req.query.days, 10);
  if (days && days >= 1 && days <= 365) {
    conds.push("a.created_at >= datetime('now', ?)"); args.push(`-${days} days`);
  }
  const q = (req.query.q || '').trim();
  if (q) {
    conds.push('(a.entity_type LIKE ? OR a.action LIKE ? OR a.detail LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit, 10) || 10000));

  const rows = db.prepare(`
    SELECT a.id, a.created_at, a.entity_type, a.entity_id, a.action, a.detail,
           u.email as actor_email
    FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id
    ${where}
    ORDER BY a.created_at DESC LIMIT ?
  `).all(...args, limit);

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="activity_${new Date().toISOString().slice(0,10)}.csv"`
  });
  // BOM for Excel compatibility (한글)
  res.write('﻿');
  res.write('id,created_at,entity_type,entity_id,action,detail,actor_email\n');
  for (const r of rows) {
    res.write([r.id, r.created_at, r.entity_type, r.entity_id ?? '', r.action, r.detail ?? '', r.actor_email ?? '']
      .map(csvEscape).join(',') + '\n');
  }
  res.end();
});

// GET /api/activity/stream — Server-Sent Events 실시간 활동 피드 (D4)
//   클라이언트가 EventSource 로 연결, 2초마다 새 로그를 푸시.
//   ?since=<id> 로 마지막 본 id 이후만 보냄. 연결 시 last id 응답 헤더에 포함.
router.get('/stream', (req, res) => {
  let lastId = parseInt(req.query.since, 10) || 0;
  if (!lastId) {
    const row = db.prepare('SELECT MAX(id) as id FROM activity_log').get();
    lastId = row && row.id ? row.id : 0;
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders && res.flushHeaders();

  // 초기 sync 이벤트로 last id 알림
  res.write(`event: sync\ndata: ${JSON.stringify({ last_id: lastId })}\n\n`);

  let closed = false;
  const stmt = db.prepare(`
    SELECT a.id, a.entity_type, a.entity_id, a.action, a.detail, a.created_at,
           a.actor_id, u.email as actor_email
    FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.id > ?
    ORDER BY a.id ASC LIMIT 50
  `);

  const tick = () => {
    if (closed) return;
    try {
      const rows = stmt.all(lastId);
      for (const r of rows) {
        res.write(`event: activity\ndata: ${JSON.stringify(r)}\n\n`);
        lastId = r.id;
      }
      // heartbeat — 프록시 idle timeout 회피
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (e) {
      // DB 오류는 무시 (다음 tick 재시도)
    }
  };

  const interval = setInterval(tick, 2000);
  req.on('close', () => {
    closed = true;
    clearInterval(interval);
    try { res.end(); } catch {}
  });
});

module.exports = router;
