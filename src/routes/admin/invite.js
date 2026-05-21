// /api/admin/invite — 관리자 전용 사용자 초대 발급
//   초대 토큰 검증/수락은 public 영역(/api/auth/invite/:token, /api/auth/invite/:token/accept)에 남아 있음
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { db, logActivity } = require('../../db');
const { authMiddleware, requireRole } = require('../../auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

// IA-A003: POST /api/admin/invite (FN-033)
router.post('/', (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'ESYS-AUTH-010', message: 'Email required' });
  if (role !== 'member') {
    return res.status(400).json({ error: 'ESYS-AUTH-011', message: 'Role must be member' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
  if (existing) return res.status(409).json({ error: 'ESYS-AUTH-012', message: 'User already exists' });

  const token = uuidv4();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO invitations (email, role, token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(email, role, token, req.user.id, expires);
  logActivity('invitation', null, 'invited', `${email} as ${role}`, req.user.id);
  res.status(201).json({ token, email, role, expires_at: expires });
});

module.exports = router;
