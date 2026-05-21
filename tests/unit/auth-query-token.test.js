// Unit — authMiddleware: 쿼리 ?access_token= 허용 (D4 SSE 지원)
//
// EventSource는 헤더 추가 불가 → SSE 엔드포인트만 토큰을 쿼리로 받음.
// 동시에 헤더 토큰도 여전히 동작해야 하며 (우선순위), 토큰 없으면 401.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db } = require('../../src/db');
const { authMiddleware, generateToken } = require('../../src/auth');
const bcrypt = require('bcryptjs');

function mkUser() {
  const ph = bcrypt.hashSync('test1234', 4);
  const info = db.prepare(`
    INSERT INTO users (email, name, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run('q-tok@test', 'q', ph, 'admin');
  return db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function mkRes() {
  let code = null, body = null;
  return {
    res: {
      status: (c) => { code = c; return mkRes._lastRes; },
      json: (b)   => { body = b; return mkRes._lastRes; }
    },
    get: () => ({ code, body })
  };
}

test('authMiddleware: 헤더 Bearer 토큰은 그대로 통과', () => {
  const u = mkUser();
  const tok = generateToken(u);
  let nextCalled = false;
  const req = { headers: { authorization: `Bearer ${tok}` }, query: {} };
  const wrap = mkRes(); mkRes._lastRes = wrap.res;
  authMiddleware(req, wrap.res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.email, 'q-tok@test');
});

test('authMiddleware: 헤더 없고 쿼리 access_token 있으면 통과 (SSE)', () => {
  const u = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get('q-tok@test');
  const tok = generateToken(u);
  let nextCalled = false;
  const req = { headers: {}, query: { access_token: tok } };
  const wrap = mkRes(); mkRes._lastRes = wrap.res;
  authMiddleware(req, wrap.res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.email, 'q-tok@test');
});

test('authMiddleware: 헤더/쿼리 모두 없으면 401', () => {
  const req = { headers: {}, query: {} };
  const wrap = mkRes(); mkRes._lastRes = wrap.res;
  authMiddleware(req, wrap.res, () => { assert.fail('next should not be called'); });
  const r = wrap.get();
  assert.equal(r.code, 401);
  assert.equal(r.body.error, 'ESYS-AUTH-002');
});

test('authMiddleware: 쿼리 access_token이 잘못된 토큰이면 401', () => {
  const req = { headers: {}, query: { access_token: 'not-a-jwt' } };
  const wrap = mkRes(); mkRes._lastRes = wrap.res;
  authMiddleware(req, wrap.res, () => { assert.fail('next should not be called'); });
  const r = wrap.get();
  assert.equal(r.code, 401);
});

test.after(() => cleanupTestDb());
