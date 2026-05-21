const router = require('express').Router();
const { db, logActivity } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { assertProjectAccess, assertChildAccess, projectScopeFilter } = require('../middleware/project-access');

router.use(authMiddleware);

// Valid state transitions (FN-027, BR-003)
const VALID_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  closed: []
};

// T1-A: 티켓 Asana baseline — 신규 필드 8개 + comments
const VALID_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const VALID_TYPES = ['TXT', 'STR', 'FNC', 'IMG', 'BUG'];

// labels는 JSON 배열로 저장 (TEXT 컬럼). 입력은 배열, 출력도 배열.
function normalizeLabels(input) {
  if (!input) return null;
  const arr = Array.isArray(input) ? input : [];
  return arr.length ? JSON.stringify(arr.filter(x => typeof x === 'string').slice(0, 10)) : null;
}
function parseLabels(stored) {
  if (!stored) return [];
  try { const a = JSON.parse(stored); return Array.isArray(a) ? a : []; } catch { return []; }
}

// 행 응답 가공 — labels JSON→array, comment_count 추가
function hydrate(row) {
  if (!row) return row;
  row.labels = parseLabels(row.labels);
  return row;
}

// IA-A026: GET /api/tickets (FN-026)
//   T1-A: assignee email + comment_count 조인, 필터 확장 (assignee_id, priority)
router.get('/', (req, res) => {
  const { project_id, status, priority, assignee_id, page = 1, limit = 50 } = req.query;

  // project_id 명시 시 격리 가드 — 타인 소유면 즉시 403
  if (project_id) {
    const g = assertProjectAccess(req, project_id);
    if (!g.ok) return res.status(g.status).json(g.body);
  }

  let where = 'WHERE 1=1';
  const params = [];
  if (project_id)  { where += ' AND t.project_id = ?';  params.push(project_id); }
  if (status)      { where += ' AND t.status = ?';       params.push(status); }
  if (priority)    { where += ' AND t.priority = ?';     params.push(priority); }
  if (assignee_id) { where += ' AND t.assignee_id = ?';  params.push(parseInt(assignee_id, 10) || 0); }

  // 격리: member는 본인 created_by 프로젝트의 티켓만
  const scope = projectScopeFilter(req, 'p');
  where += scope.sql;
  params.push(...scope.params);

  const rows = db.prepare(`
    SELECT t.*, p.name AS project_name, p.code AS project_code,
           u.email AS assignee_email,
           (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) AS comment_count
    FROM tickets t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);
  res.json(rows.map(hydrate));
});

// IA-A027: POST /api/tickets (FN-025)
//   T1-A: 신규 필드 8개 수용 (assignee_id·priority·due_date·labels·parent_id·estimate)
//   started_at·closed_at은 status 전환 시 자동 채움
router.post('/', requireRole('admin', 'member'), (req, res) => {
  const {
    project_id, title, type, description,
    assignee_id, priority, due_date, labels, parent_id, estimate
  } = req.body;

  if (!project_id || !title || !type) {
    return res.status(400).json({ error: 'ESYS-TKT-002', message: 'project_id, title, type required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'ESYS-TKT-003', message: 'Invalid ticket type' });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'ESYS-TKT-006', message: 'Invalid priority' });
  }
  // 격리: 본인이 생성한 프로젝트에만 티켓 생성 가능
  const guard = assertProjectAccess(req, project_id);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const project = db.prepare('SELECT code FROM projects WHERE id = ? AND deleted_at IS NULL').get(project_id);
  if (!project) return res.status(404).json({ error: 'ESYS-TKT-004', message: 'Project not found' });

  // assignee_id가 지정됐으면 사용자 존재 검증
  if (assignee_id) {
    const u = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(assignee_id);
    if (!u) return res.status(400).json({ error: 'ESYS-TKT-007', message: 'Assignee not found' });
  }
  // parent_id가 지정됐으면 티켓 존재 검증
  if (parent_id) {
    const t = db.prepare('SELECT id FROM tickets WHERE id = ?').get(parent_id);
    if (!t) return res.status(400).json({ error: 'ESYS-TKT-008', message: 'Parent ticket not found' });
  }

  const seq = (db.prepare('SELECT COUNT(*) AS c FROM tickets WHERE project_id = ?').get(project_id).c) + 1;
  const ticket_number = `OPS-${project.code}-${String(seq).padStart(3, '0')}`;

  const result = db.prepare(`
    INSERT INTO tickets (
      project_id, ticket_number, title, type, description, created_by,
      assignee_id, priority, due_date, labels, parent_id, estimate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    project_id, ticket_number, title, type, description, req.user.id,
    assignee_id || null,
    priority || 'normal',
    due_date || null,
    normalizeLabels(labels),
    parent_id || null,
    estimate != null ? parseInt(estimate, 10) : null
  );

  db.prepare('INSERT INTO ticket_history (ticket_id, actor_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(result.lastInsertRowid, req.user.id, 'created', title);
  logActivity('ticket', result.lastInsertRowid, 'created', ticket_number, req.user.id);

  res.status(201).json(hydrate(db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid)));
});

// IA-A028: GET /api/tickets/:id (FN-026)
router.get('/:id', (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const ticket = db.prepare(`
    SELECT t.*, p.name AS project_name, p.code AS project_code,
           u.email AS assignee_email,
           cu.email AS creator_email
    FROM tickets t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN users cu ON t.created_by = cu.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ESYS-TKT-005', message: 'Ticket not found' });
  res.json(hydrate(ticket));
});

// T1-A: PUT /api/tickets/:id — 필드 수정 (status는 별도 라우트 유지)
router.put('/:id', requireRole('admin', 'member'), (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ESYS-TKT-005', message: 'Ticket not found' });

  const { title, description, assignee_id, priority, due_date, labels, parent_id, estimate } = req.body;
  const updates = [];
  const params = [];

  if (title !== undefined)        { updates.push('title = ?');        params.push(title); }
  if (description !== undefined)  { updates.push('description = ?');  params.push(description); }
  if (assignee_id !== undefined)  {
    if (assignee_id) {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(assignee_id);
      if (!u) return res.status(400).json({ error: 'ESYS-TKT-007', message: 'Assignee not found' });
    }
    updates.push('assignee_id = ?'); params.push(assignee_id || null);
  }
  if (priority !== undefined)     {
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'ESYS-TKT-006', message: 'Invalid priority' });
    }
    updates.push('priority = ?'); params.push(priority || 'normal');
  }
  if (due_date !== undefined)     { updates.push('due_date = ?');     params.push(due_date || null); }
  if (labels !== undefined)       { updates.push('labels = ?');       params.push(normalizeLabels(labels)); }
  if (parent_id !== undefined)    {
    if (parent_id) {
      if (parseInt(parent_id, 10) === parseInt(req.params.id, 10)) {
        return res.status(400).json({ error: 'ESYS-TKT-011', message: '자기 자신을 부모로 설정 불가' });
      }
      const t = db.prepare('SELECT id FROM tickets WHERE id = ?').get(parent_id);
      if (!t) return res.status(400).json({ error: 'ESYS-TKT-008', message: 'Parent ticket not found' });
      // 다단 순환 차단 — parent 체인을 따라가다 자기 id 만나면 거부 (최대 10단)
      let cur = t.id, hops = 0;
      while (cur && hops < 10) {
        const row = db.prepare('SELECT parent_id FROM tickets WHERE id = ?').get(cur);
        if (!row || !row.parent_id) break;
        if (parseInt(row.parent_id, 10) === parseInt(req.params.id, 10)) {
          return res.status(400).json({ error: 'ESYS-TKT-012', message: '순환 부모 관계 차단' });
        }
        cur = row.parent_id;
        hops++;
      }
    }
    updates.push('parent_id = ?'); params.push(parent_id || null);
  }
  if (estimate !== undefined)     {
    updates.push('estimate = ?'); params.push(estimate != null ? parseInt(estimate, 10) : null);
  }

  if (updates.length === 0) return res.json(hydrate(ticket));

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  db.prepare('INSERT INTO ticket_history (ticket_id, actor_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, 'updated', updates.filter(u => !u.startsWith('updated_at')).join(', '));
  logActivity('ticket', req.params.id, 'updated', null, req.user.id);

  res.json(hydrate(db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id)));
});

// IA-A029: PUT /api/tickets/:id/status (FN-027)
//   T1-A: status 전환 시 started_at·closed_at 자동 채움
router.put('/:id/status', requireRole('admin', 'member'), (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const { status } = req.body;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ESYS-TKT-005', message: 'Ticket not found' });

  const allowed = VALID_TRANSITIONS[ticket.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: 'ESYS-TKT-001',
      message: `Invalid transition: ${ticket.status} → ${status}. Allowed: ${allowed.join(', ') || 'none'}`
    });
  }

  // started_at은 in_progress 진입 시 최초 1회, closed_at은 closed/resolved 진입 시
  let extra = '';
  if (status === 'in_progress' && !ticket.started_at) extra += ", started_at = datetime('now')";
  if (status === 'closed' || status === 'resolved') extra += ", closed_at = datetime('now')";

  db.prepare(`UPDATE tickets SET status = ?, updated_at = datetime('now')${extra} WHERE id = ?`).run(status, req.params.id);
  db.prepare('INSERT INTO ticket_history (ticket_id, actor_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, 'status_changed', `${ticket.status} → ${status}`);
  logActivity('ticket', req.params.id, 'status_changed', `${ticket.status} → ${status}`, req.user.id);
  res.json({ message: 'Status updated', status });
});

// IA-A030: GET /api/tickets/:id/history (FN-028)
router.get('/:id/history', (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const history = db.prepare(`
    SELECT h.*, u.email AS actor_email FROM ticket_history h
    LEFT JOIN users u ON h.actor_id = u.id
    WHERE h.ticket_id = ? ORDER BY h.created_at DESC
  `).all(req.params.id);
  res.json(history);
});

// T1-A: GET /api/tickets/:id/comments — 댓글 목록 (시간순)
router.get('/:id/comments', (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ESYS-TKT-005', message: 'Ticket not found' });
  const rows = db.prepare(`
    SELECT c.id, c.ticket_id, c.body, c.created_at,
           c.actor_id, u.email AS actor_email
    FROM ticket_comments c
    LEFT JOIN users u ON c.actor_id = u.id
    WHERE c.ticket_id = ? ORDER BY c.id ASC
  `).all(req.params.id);
  res.json(rows);
});

// T1-A: POST /api/tickets/:id/comments — 댓글 작성
router.post('/:id/comments', requireRole('admin', 'member'), (req, res) => {
  const g = assertChildAccess(req, { table: 'tickets', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  const ticket = db.prepare('SELECT id, ticket_number FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ESYS-TKT-005', message: 'Ticket not found' });
  const body = (req.body && req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'ESYS-TKT-009', message: 'body required' });
  if (body.length > 10000) return res.status(400).json({ error: 'ESYS-TKT-010', message: 'body too long (max 10000)' });

  const r = db.prepare('INSERT INTO ticket_comments (ticket_id, actor_id, body) VALUES (?, ?, ?)')
    .run(req.params.id, req.user.id, body);
  db.prepare('INSERT INTO ticket_history (ticket_id, actor_id, action, detail) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.id, 'commented', body.slice(0, 80));
  logActivity('ticket', req.params.id, 'commented', ticket.ticket_number, req.user.id);

  const created = db.prepare(`
    SELECT c.id, c.ticket_id, c.body, c.created_at,
           c.actor_id, u.email AS actor_email
    FROM ticket_comments c LEFT JOIN users u ON c.actor_id = u.id
    WHERE c.id = ?
  `).get(r.lastInsertRowid);
  res.status(201).json(created);
});

// GET /api/tickets/export.csv — 티켓 CSV (E5)
//   T1-A: assignee_id 컬럼명 정정 + priority/due_date 컬럼 추가
function csvEscapeT(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
router.get('/export.csv', (req, res) => {
  // project_id 명시 시 격리 가드
  if (req.query.project_id) {
    const g = assertProjectAccess(req, req.query.project_id);
    if (!g.ok) return res.status(g.status).json(g.body);
  }
  const conds = ['1=1'];
  const args = [];
  if (req.query.project_id) { conds.push('t.project_id = ?'); args.push(parseInt(req.query.project_id, 10) || 0); }
  if (req.query.status)     { conds.push('t.status = ?');     args.push(req.query.status); }
  // member 격리 SQL 필터
  const scope = projectScopeFilter(req, 'p');
  if (scope.sql) { conds.push(scope.sql.replace(/^\s*AND\s+/, '')); args.push(...scope.params); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const rows = db.prepare(`
    SELECT t.id, t.project_id, p.name AS project_name, t.title, t.status, t.priority,
           t.assignee_id, u.email AS assignee_email, t.due_date, t.created_at, t.updated_at
    FROM tickets t LEFT JOIN projects p ON t.project_id = p.id
                   LEFT JOIN users u ON t.assignee_id = u.id
    ${where}
    ORDER BY t.created_at DESC LIMIT 10000
  `).all(...args);
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="tickets_${new Date().toISOString().slice(0,10)}.csv"`
  });
  res.write('﻿');
  res.write('id,project_id,project_name,title,status,priority,assignee_email,due_date,created_at,updated_at\n');
  for (const r of rows) {
    res.write([r.id, r.project_id, r.project_name ?? '', r.title, r.status, r.priority ?? '',
               r.assignee_email ?? '', r.due_date ?? '', r.created_at, r.updated_at]
      .map(csvEscapeT).join(',') + '\n');
  }
  res.end();
});

module.exports = router;
