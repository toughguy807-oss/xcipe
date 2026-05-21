// /api/admin/users — 관리자 전용 사용자 관리
//   사용자 목록 조회 + 역할 변경
//   일반 사용자용 라우트 (GET /me, PUT /me/password)는 /api/users 에 남아 있음
const router = require('express').Router();
const { db } = require('../../db');
const { authMiddleware, requireRole } = require('../../auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

// IA-A006: GET /api/admin/users (FN-035) — 전체 사용자 목록
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE deleted_at IS NULL').all();
  res.json(users);
});

// IA-A009: PUT /api/admin/users/:id/role (FN-035) — 역할 변경
router.put('/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'ESYS-USR-003', message: 'Invalid role' });
  }
  const target = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'ESYS-USR-004', message: 'User not found' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

module.exports = router;
