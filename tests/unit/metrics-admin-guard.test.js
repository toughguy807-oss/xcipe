// Unit — /api/metrics: admin-only 가드 회귀 방지 (E4)
//
// /api/metrics 와 /api/metrics/json 은 운영 메트릭(DB 크기, 사용자 수,
// 에러 카운트 등)을 노출하므로 외부에 새지 않도록 admin 전용이어야 한다.
// 정적 검사 + 런타임 미들웨어 호출로 다음을 검증:
//   1) routes/metrics.js 가 authMiddleware 와 requireRole('admin') 둘 다 마운트
//   2) member 권한으로는 403
//   3) admin 권한으로는 통과 (200, Content-Type: text/plain)
//   4) 토큰 없으면 401
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const express = require('express');
const { db } = require('../../src/db');
const { generateToken } = require('../../src/auth');
const bcrypt = require('bcryptjs');

function mkUser(role, email) {
  const ph = bcrypt.hashSync('test1234', 4);
  const info = db.prepare(`
    INSERT INTO users (email, name, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run(email, role, ph, role);
  return db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);
}

test('routes/metrics.js — authMiddleware + requireRole(\'admin\')을 동시에 마운트', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'routes', 'metrics.js'), 'utf8');
  assert.match(src, /router\.use\(\s*authMiddleware\s*\)/, 'authMiddleware 를 router.use 로 마운트해야 함');
  assert.match(src, /router\.use\(\s*requireRole\(\s*['"]admin['"]\s*\)\s*\)/, "requireRole('admin') 을 router.use 로 마운트해야 함");
});

test('runtime: 토큰 없으면 401', async () => {
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await invoke(app, 'GET', '/api/metrics');
  assert.equal(r.status, 401);
});

test('runtime: member 권한은 403 (admin only)', async () => {
  const u = mkUser('member', 'metrics-mem@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await invoke(app, 'GET', '/api/metrics', { authorization: `Bearer ${tok}` });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'ESYS-AUTH-005');
});

test('runtime: admin 권한은 200 + Prometheus text 포맷', async () => {
  const u = mkUser('admin', 'metrics-adm@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await invoke(app, 'GET', '/api/metrics', { authorization: `Bearer ${tok}` });
  assert.equal(r.status, 200);
  assert.match(r.contentType || '', /text\/plain/);
  assert.match(r.text || '', /^# HELP esys_/m, '# HELP 라인이 존재해야 함');
  assert.match(r.text || '', /^# TYPE esys_/m, '# TYPE 라인이 존재해야 함');
  assert.match(r.text || '', /esys_projects_total\s+\d+/, 'esys_projects_total 메트릭 노출');
});

test('runtime: /json 경로도 admin only', async () => {
  const u = mkUser('member', 'metrics-mem-json@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await invoke(app, 'GET', '/api/metrics/json', { authorization: `Bearer ${tok}` });
  assert.equal(r.status, 403);
});

test.after(() => cleanupTestDb());

// --- 헬퍼: Express 앱을 실제 listen 없이 호출 ---
function invoke(app, method, url, headers = {}) {
  return new Promise((resolve) => {
    const chunks = [];
    let statusCode = 200;
    let resHeaders = {};
    const req = {
      method,
      url,
      originalUrl: url,
      headers,
      query: parseQuery(url),
      get: (k) => headers[k.toLowerCase()],
      connection: {},
      socket: {},
      app,
      res: null
    };
    const res = {
      statusCode: 200,
      headersSent: false,
      _headers: {},
      status(code) { this.statusCode = code; statusCode = code; return this; },
      set(name, val) {
        if (typeof name === 'object') {
          for (const k of Object.keys(name)) this._headers[k.toLowerCase()] = name[k];
        } else {
          this._headers[name.toLowerCase()] = val;
        }
        return this;
      },
      setHeader(name, val) { this._headers[name.toLowerCase()] = val; },
      getHeader(name) { return this._headers[name.toLowerCase()]; },
      json(body) {
        this._headers['content-type'] = 'application/json';
        this.end(JSON.stringify(body));
      },
      send(body) {
        if (!this._headers['content-type']) this._headers['content-type'] = 'text/plain';
        this.end(typeof body === 'string' ? body : JSON.stringify(body));
      },
      write(chunk) { chunks.push(chunk); },
      end(chunk) {
        if (chunk) chunks.push(chunk);
        resHeaders = this._headers;
        const text = chunks.map((c) => c == null ? '' : (Buffer.isBuffer(c) ? c.toString('utf8') : String(c))).join('');
        let body = null;
        try { body = JSON.parse(text); } catch {}
        resolve({
          status: statusCode,
          headers: resHeaders,
          contentType: resHeaders['content-type'],
          text,
          body
        });
      }
    };
    req.res = res;
    app(req, res);
  });
}

function parseQuery(url) {
  const i = url.indexOf('?');
  if (i < 0) return {};
  const q = {};
  for (const part of url.slice(i + 1).split('&')) {
    if (!part) continue;
    const [k, v] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return q;
}
