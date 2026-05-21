// /api/auth — 인증 (login, refresh, invite 토큰 검증/수락)
//   초대 발급(POST /invite)은 admin 전용이므로 /api/admin/invite 로 분리됨 (src/routes/admin/invite.js)
const router = require('express').Router();
const { db, logActivity } = require('../db');
const { hashPassword, comparePassword, generateToken, authMiddleware } = require('../auth');

// IA-A001: POST /api/auth/login (FN-029)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'ESYS-AUTH-001', message: 'Email and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'ESYS-AUTH-001', message: 'Invalid credentials' });
  }
  const token = generateToken(user);
  logActivity('user', user.id, 'login', null, user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// IA-A002: POST /api/auth/refresh (FN-030)
router.post('/refresh', authMiddleware, (req, res) => {
  const token = generateToken(req.user);
  res.json({ token });
});

// IA-A004: GET /api/auth/invite/:token (FN-034) — 초대 토큰 검증 (public)
router.get('/invite/:token', (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE token = ? AND status = ?').get(req.params.token, 'pending');
  if (!inv) return res.status(404).json({ error: 'ESYS-AUTH-013', message: 'Invalid or expired invitation' });
  if (new Date(inv.expires_at) < new Date()) {
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('expired', inv.id);
    return res.status(410).json({ error: 'ESYS-AUTH-014', message: 'Invitation expired' });
  }
  res.json({ email: inv.email, role: inv.role, expires_at: inv.expires_at });
});

// IA-A005: POST /api/auth/invite/:token/accept (FN-034) — 초대 수락 (public)
router.post('/invite/:token/accept', (req, res) => {
  const { name, password } = req.body;
  if (!password) return res.status(400).json({ error: 'ESYS-AUTH-015', message: 'Password required' });

  const inv = db.prepare('SELECT * FROM invitations WHERE token = ? AND status = ?').get(req.params.token, 'pending');
  if (!inv) return res.status(404).json({ error: 'ESYS-AUTH-013', message: 'Invalid invitation' });
  if (new Date(inv.expires_at) < new Date()) {
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('expired', inv.id);
    return res.status(410).json({ error: 'ESYS-AUTH-014', message: 'Invitation expired' });
  }

  const hash = hashPassword(password);
  const result = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(inv.email, name || inv.email.split('@')[0], hash, inv.role);
  db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('accepted', inv.id);
  logActivity('user', result.lastInsertRowid, 'account_created', `via invitation`, null);

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);
  res.status(201).json({ token, user });
});

module.exports = router;
