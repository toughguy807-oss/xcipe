// /api/admin/users — 관리자 전용 사용자 관리
//   사용자 목록 조회 + 역할 변경 + 워커 토큰 발급/회수 (v25)
//   일반 사용자용 라우트 (GET /me, PUT /me/password)는 /api/users 에 남아 있음
const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../../db');
const { authMiddleware, requireRole } = require('../../auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

// IA-A006: GET /api/admin/users (FN-035) — 전체 사용자 목록 (워커 토큰 보유 여부 포함)
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, role, created_at,
           CASE WHEN worker_token IS NOT NULL THEN 1 ELSE 0 END AS has_worker_token
    FROM users WHERE deleted_at IS NULL
  `).all();
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

// v25: POST /api/admin/users/:id/worker-token — 워커 토큰 발급 (rotation)
//   기존 토큰이 있으면 덮어쓰기 (rotation). 응답에 plaintext 토큰 1회 반환 → 클라이언트가 안전 보관.
//   서버에는 그대로 저장 (해시 없음 — 워커 polling 매 요청 비교라 bcrypt 비용 큼).
//   토큰 노출 시 회수 후 재발급으로 대응.
router.post('/:id/worker-token', (req, res) => {
  const target = db.prepare('SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'ESYS-USR-005', message: 'User not found' });

  const token = crypto.randomBytes(32).toString('hex'); // 64 chars hex
  db.prepare('UPDATE users SET worker_token = ? WHERE id = ?').run(token, req.params.id);

  res.json({
    ok: true,
    user_id: target.id,
    user_email: target.email,
    worker_token: token,
    warning: '이 토큰은 1회만 표시됩니다. 안전한 곳에 보관하세요. 분실 시 재발급 필요.'
  });
});

// v25: DELETE /api/admin/users/:id/worker-token — 토큰 회수 (즉시 비활성화)
router.delete('/:id/worker-token', (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'ESYS-USR-006', message: 'User not found' });
  db.prepare('UPDATE users SET worker_token = NULL WHERE id = ?').run(req.params.id);
  res.json({ ok: true, message: '워커 토큰 회수됨' });
});

module.exports = router;
