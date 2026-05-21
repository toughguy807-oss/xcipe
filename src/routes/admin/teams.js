// /api/admin/teams — 팀 CRUD + 멤버 관리 (admin 전용)
//
//   GET    /                    팀 목록 (멤버 수 + 프로젝트 수)
//   POST   /                    팀 생성 (name 필수)
//   GET    /:id                 단건 + 멤버 목록
//   PUT    /:id                 name/description 수정
//   DELETE /:id                 팀 삭제 (CASCADE: team_members 자동 삭제, projects.team_id NULL)
//   POST   /:id/members         { user_id, role? } 멤버 추가
//   DELETE /:id/members/:userId 멤버 제거

const router = require('express').Router();
const { db, logActivity } = require('../../db');
const { authMiddleware, requireRole } = require('../../auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.name, t.description, t.created_by, t.created_at,
           (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
           (SELECT COUNT(*) FROM projects WHERE team_id = t.id AND deleted_at IS NULL) AS project_count,
           u.email AS creator_email
    FROM teams t LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.id DESC
  `).all();
  res.json({ total: rows.length, items: rows });
});

router.post('/', (req, res) => {
  const { name, description } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'ESYS-TEAM-001', message: 'name 필수' });
  }
  if (name.length > 50) return res.status(400).json({ error: 'ESYS-TEAM-002', message: 'name 최대 50자' });
  try {
    const r = db.prepare('INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)').run(name.trim(), description || null, req.user.id);
    // 생성자 자동으로 owner 추가
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(r.lastInsertRowid, req.user.id, 'owner');
    logActivity('team', r.lastInsertRowid, 'created', name, req.user.id);
    res.status(201).json({ id: r.lastInsertRowid, name, description });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'ESYS-TEAM-003', message: '이미 존재하는 팀명' });
    }
    throw e;
  }
});

router.get('/:id', (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'ESYS-TEAM-004', message: 'Team not found' });
  const members = db.prepare(`
    SELECT tm.user_id, tm.role, tm.added_at, u.email
    FROM team_members tm JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ? ORDER BY tm.added_at ASC
  `).all(req.params.id);
  res.json({ ...team, members });
});

router.put('/:id', (req, res) => {
  const { name, description } = req.body || {};
  const updates = [];
  const args = [];
  if (name !== undefined) {
    if (!name || name.length > 50) return res.status(400).json({ error: 'ESYS-TEAM-005', message: 'invalid name' });
    updates.push('name = ?'); args.push(name.trim());
  }
  if (description !== undefined) {
    updates.push('description = ?'); args.push(description || null);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'ESYS-TEAM-006', message: '변경 항목 없음' });
  args.push(req.params.id);
  db.prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'ESYS-TEAM-004', message: 'Team not found' });
  // projects.team_id NULL로 (FK ON DELETE 미설정이라 명시)
  db.prepare('UPDATE projects SET team_id = NULL WHERE team_id = ?').run(req.params.id);
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  logActivity('team', req.params.id, 'deleted', team.name, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/members', (req, res) => {
  const { user_id, role = 'member' } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'ESYS-TEAM-010', message: 'user_id 필수' });
  if (!['owner', 'member'].includes(role)) return res.status(400).json({ error: 'ESYS-TEAM-011', message: 'invalid role' });
  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'ESYS-TEAM-004', message: 'Team not found' });
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(user_id);
  if (!user) return res.status(404).json({ error: 'ESYS-TEAM-012', message: 'User not found' });
  try {
    db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user_id, role);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: 'ESYS-TEAM-013', message: '이미 멤버' });
    }
    throw e;
  }
});

router.delete('/:id/members/:userId', (req, res) => {
  const r = db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'ESYS-TEAM-014', message: 'Membership not found' });
  res.json({ ok: true });
});

module.exports = router;
