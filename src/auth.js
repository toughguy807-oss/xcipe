const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, logActivity } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';
const JWT_EXPIRES = '1h';
const SALT_ROUNDS = 12;

// Hash password
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

// Compare password
function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// Verify JWT
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Auth middleware (FN-031)
//
// 헤더 우선, 없으면 쿼리 ?access_token= 허용 (SSE / EventSource 용 — D4)
// 쿼리 토큰은 access logs에 남을 수 있으므로 SSE 외 일반 API는 헤더 권장.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.query && typeof req.query.access_token === 'string' && req.query.access_token) {
    token = req.query.access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'ESYS-AUTH-002', message: 'No token provided' });
  }
  try {
    const decoded = verifyToken(token);
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ? AND deleted_at IS NULL').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'ESYS-AUTH-003', message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'ESYS-AUTH-004', message: 'Token expired' });
    }
    return res.status(401).json({ error: 'ESYS-AUTH-002', message: 'Invalid token' });
  }
}

// RBAC middleware (FN-035)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ESYS-AUTH-005', message: 'Insufficient permissions' });
    }
    next();
  };
}

// Create initial admin (FN-032)
function ensureInitialAdmin() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@eluo.kr';
    const password = process.env.ADMIN_PASSWORD || 'admin1234';
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(email, 'Admin', hash, 'admin');
    console.log(`[ESYS] Initial admin created: ${email}`);
  }
}

module.exports = {
  hashPassword, comparePassword, generateToken, verifyToken,
  authMiddleware, requireRole, ensureInitialAdmin
};
