// Unit — G2: error_log + 에러 예산 + 단계 평균 메트릭 노출 회귀
//
// 검증:
//  1) esys_errors_1h 노출
//  2) esys_errors_total{source,code} 라벨별 노출 (24h 카디널리티 30 제한)
//  3) esys_error_budget_limit, _pct, _exceeded 노출 (window 라벨)
//  4) esys_pipeline_step_avg_ms 노출 (phase 라벨)
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const express = require('express');
const { db, setSetting } = require('../../src/db');
const { generateToken } = require('../../src/auth');
const bcrypt = require('bcryptjs');

function mkAdmin(email) {
  const ph = bcrypt.hashSync('test1234', 4);
  const info = db.prepare(`INSERT INTO users (email, name, password_hash, role)
                           VALUES (?, ?, ?, 'admin')`).run(email, 'a', ph);
  return db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function call(app, url, headers = {}) {
  return new Promise((resolve) => {
    const chunks = [];
    let statusCode = 200, resHeaders = {};
    const req = { method: 'GET', url, originalUrl: url, headers, query: {}, get: (k) => headers[k.toLowerCase()], connection: {}, socket: {}, app };
    const res = {
      statusCode: 200, headersSent: false, _headers: {},
      status(c) { this.statusCode = c; statusCode = c; return this; },
      set(n, v) { if (typeof n === 'object') Object.assign(this._headers, Object.fromEntries(Object.entries(n).map(([k, vv]) => [k.toLowerCase(), vv]))); else this._headers[n.toLowerCase()] = v; return this; },
      setHeader(n, v) { this._headers[n.toLowerCase()] = v; },
      getHeader(n) { return this._headers[n.toLowerCase()]; },
      json(b) { this._headers['content-type'] = 'application/json'; this.end(JSON.stringify(b)); },
      send(b) { if (!this._headers['content-type']) this._headers['content-type'] = 'text/plain'; this.end(typeof b === 'string' ? b : JSON.stringify(b)); },
      write(c) { chunks.push(c); },
      end(c) {
        if (c) chunks.push(c);
        resHeaders = this._headers;
        const text = chunks.map(x => Buffer.isBuffer(x) ? x.toString('utf8') : String(x)).join('');
        resolve({ status: statusCode, text, headers: resHeaders });
      }
    };
    app(req, res);
  });
}

test('esys_errors_1h + esys_errors_total{source,code} 라벨 노출', async () => {
  // 에러 로그 시드
  db.prepare('DELETE FROM error_log').run();
  for (let i = 0; i < 5; i++) {
    db.prepare(`INSERT INTO error_log (source, code, message) VALUES (?, ?, ?)`)
      .run('http', 'E-AUTH', `m${i}`);
  }
  for (let i = 0; i < 2; i++) {
    db.prepare(`INSERT INTO error_log (source, code, message) VALUES (?, ?, ?)`)
      .run('worker', 'E-AI', `w${i}`);
  }

  const u = mkAdmin('g2-1@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await call(app, '/api/metrics', { authorization: `Bearer ${tok}` });
  assert.equal(r.status, 200);
  assert.match(r.text, /esys_errors_1h\s+\d+/, '1h 에러 메트릭');
  assert.match(r.text, /esys_errors_total\{[^}]*source="http"[^}]*code="E-AUTH"[^}]*\}\s+5/, 'http/E-AUTH=5');
  assert.match(r.text, /esys_errors_total\{[^}]*source="worker"[^}]*code="E-AI"[^}]*\}\s+2/, 'worker/E-AI=2');
});

test('esys_error_budget_* 메트릭 (window 라벨)', async () => {
  setSetting('error_budget_24h', '10');
  setSetting('error_budget_1h', '5');
  setSetting('error_alert_at_pct', '80');

  const u = mkAdmin('g2-2@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await call(app, '/api/metrics', { authorization: `Bearer ${tok}` });

  assert.match(r.text, /esys_error_budget_limit\{window="24h"\}\s+10/);
  assert.match(r.text, /esys_error_budget_limit\{window="1h"\}\s+5/);
  assert.match(r.text, /esys_error_budget_pct\{window="24h"\}\s+[\d.]+/);
  assert.match(r.text, /esys_error_budget_exceeded\{window="(24h|1h)"\}\s+[01]/);
});

test('esys_pipeline_step_avg_ms 메트릭 (phase 라벨)', async () => {
  // 시드: project + pipeline + step
  db.prepare('DELETE FROM pipeline_steps').run();
  db.prepare('DELETE FROM pipelines').run();
  db.prepare('DELETE FROM projects').run();

  const pi = db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
                         VALUES ('m', 'METRICS_X', 'web', 'active', 1)`).run().lastInsertRowid;
  const pl = db.prepare(`INSERT INTO pipelines (project_id, status) VALUES (?, 'completed')`).run(pi).lastInsertRowid;

  // planning 단계: 1000ms, 2000ms (avg 1500)
  db.prepare(`INSERT INTO pipeline_steps (pipeline_id, phase, step, status, duration_ms, completed_at)
              VALUES (?, 'planning', 'qst', 'approved', 1000, datetime('now'))`).run(pl);
  db.prepare(`INSERT INTO pipeline_steps (pipeline_id, phase, step, status, duration_ms, completed_at)
              VALUES (?, 'planning', 'req', 'approved', 2000, datetime('now'))`).run(pl);
  // design 단계: 500ms (avg 500)
  db.prepare(`INSERT INTO pipeline_steps (pipeline_id, phase, step, status, duration_ms, completed_at)
              VALUES (?, 'design', 'layout', 'approved', 500, datetime('now'))`).run(pl);

  const u = mkAdmin('g2-3@test');
  const tok = generateToken(u);
  const app = express();
  app.use('/api/metrics', require('../../src/routes/metrics'));
  const r = await call(app, '/api/metrics', { authorization: `Bearer ${tok}` });

  assert.match(r.text, /esys_pipeline_step_avg_ms\{phase="planning"\}\s+1500/);
  assert.match(r.text, /esys_pipeline_step_avg_ms\{phase="design"\}\s+500/);
  assert.match(r.text, /esys_pipeline_step_runs\{phase="planning"\}\s+2/);
});

test.after(() => cleanupTestDb());
