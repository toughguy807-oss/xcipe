// /api/users — 일반 사용자용 라우트 (본인 정보 조회/수정)
//   admin 전용 라우트(목록/역할 변경)는 /api/admin/users 로 분리됨 (src/routes/admin/users.js)
const router = require('express').Router();
const { db } = require('../db');
const { authMiddleware, hashPassword, comparePassword } = require('../auth');

router.use(authMiddleware);

// IA-A007: GET /api/users/me (FN-035)
router.get('/me', (req, res) => {
  res.json(req.user);
});

// IA-A008: PUT /api/users/me/password (FN-035)
router.put('/me/password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'ESYS-USR-001', message: 'Both passwords required' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!comparePassword(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'ESYS-USR-002', message: 'Current password incorrect' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(new_password), req.user.id);
  res.json({ message: 'Password updated' });
});

// GET /api/users/me/ai-key — 본인 등록된 키 마스킹 표시
router.get('/me/ai-key', (req, res) => {
  // ISOLATION: 본인 키만 조회 (req.user.id)
  const row = db.prepare('SELECT anthropic_api_key, anthropic_model FROM users WHERE id = ?').get(req.user.id);
  const masked = row && row.anthropic_api_key
    ? row.anthropic_api_key.slice(0, 8) + '...' + row.anthropic_api_key.slice(-4)
    : null;
  res.json({
    has_key: !!(row && row.anthropic_api_key),
    masked_key: masked,
    model: row && row.anthropic_model ? row.anthropic_model : null
  });
});

// PUT /api/users/me/ai-key — 본인 키 등록/갱신
router.put('/me/ai-key', (req, res) => {
  // ISOLATION: 본인 키만 수정
  const { anthropic_api_key, anthropic_model } = req.body || {};
  if (anthropic_api_key !== undefined && anthropic_api_key !== null && anthropic_api_key !== '') {
    if (typeof anthropic_api_key !== 'string' || !/^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(anthropic_api_key)) {
      return res.status(400).json({ error: 'ESYS-USR-010', message: 'sk-ant- 로 시작하는 유효한 키 형식이어야 합니다' });
    }
  }
  const updates = [];
  const args = [];
  if (anthropic_api_key !== undefined) {
    updates.push('anthropic_api_key = ?');
    args.push(anthropic_api_key === '' ? null : anthropic_api_key);
  }
  if (anthropic_model !== undefined) {
    updates.push('anthropic_model = ?');
    args.push(anthropic_model || null);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'ESYS-USR-011', message: '변경 항목 없음' });
  args.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

// DELETE /api/users/me/ai-key — 본인 키 제거
router.delete('/me/ai-key', (req, res) => {
  // ISOLATION: 본인 키만 삭제
  db.prepare('UPDATE users SET anthropic_api_key = NULL, anthropic_model = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
