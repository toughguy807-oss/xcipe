// Unit — F4: GET /api/projects/export.csv
//
// 검증:
//  1) authMiddleware 적용 (토큰 없으면 401)
//  2) 헤더: Content-Type=text/csv, Content-Disposition=attachment + projects-YYYY-MM-DD.csv
//  3) UTF-8 BOM (﻿) 첨부
//  4) 컬럼 헤더 + 행 데이터 포함, CSV escape 동작
//  5) 필터 (status/search/archived_only) 반영
//  6) /:id 보다 먼저 등록되어 'export.csv'가 :id로 잡히지 않음
//  7) RBAC 매트릭스 — 읽기 라우트이므로 추가 가드 불필요 (rbac.test.js에서는 쓰기만 추적)
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const express = require('express');
const { db } = require('../../src/db');
const { generateToken } = require('../../src/auth');

let app;

function makeApp() {
  if (app) return app;
  app = express();
  app.use(express.json());
  app.use('/api/projects', require('../../src/routes/projects'));
  return app;
}

function invoke(method, path, { token } = {}) {
  return new Promise((resolve) => {
    const a = makeApp();
    const req = {
      method,
      url: path,
      originalUrl: path,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      query: {},
      params: {},
      body: undefined,
      ip: '127.0.0.1'
    };
    // express는 url 파싱을 자동으로 하지만, 가짜 req에서는 직접 설정 필요
    const u = new URL(`http://localhost${path}`);
    req.path = u.pathname;
    req.query = Object.fromEntries(u.searchParams);

    let statusCode = 200;
    let bodyChunks = [];
    let headers = {};
    const res = {
      statusCode,
      status(c) { this.statusCode = c; statusCode = c; return this; },
      setHeader(k, v) { headers[k.toLowerCase()] = v; return this; },
      getHeader(k) { return headers[k.toLowerCase()]; },
      json(obj) { bodyChunks.push(Buffer.from(JSON.stringify(obj))); resolve({ status: this.statusCode, headers, body: JSON.parse(bodyChunks[0].toString()), raw: bodyChunks[0] }); },
      send(buf) {
        const b = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf));
        bodyChunks.push(b);
        resolve({ status: this.statusCode, headers, body: b.toString('utf8'), raw: b });
      },
      end() { resolve({ status: this.statusCode, headers, body: '', raw: Buffer.alloc(0) }); }
    };
    a.handle(req, res, (err) => {
      if (err) resolve({ status: 500, headers, body: { error: err.message }, raw: Buffer.alloc(0) });
      else resolve({ status: 404, headers, body: { error: 'not_found' }, raw: Buffer.alloc(0) });
    });
  });
}

function clearProjects() {
  db.prepare('DELETE FROM artifacts').run();
  db.prepare('DELETE FROM tickets').run();
  db.prepare('DELETE FROM pipelines').run();
  db.prepare('DELETE FROM projects').run();
}

function makeAdminToken() {
  let u = db.prepare('SELECT * FROM users WHERE email = ?').get('csv-admin@test');
  if (!u) {
    db.prepare(`INSERT INTO users (email, name, password_hash, role)
                VALUES (?, ?, 'x', 'admin')`).run('csv-admin@test', 'CSV Admin');
    u = db.prepare('SELECT * FROM users WHERE email = ?').get('csv-admin@test');
  }
  return generateToken(u);
}

test('export.csv: 토큰 없으면 401', async () => {
  const r = await invoke('GET', '/api/projects/export.csv');
  assert.equal(r.status, 401);
});

test('export.csv: 헤더 + BOM + 컬럼 + 행', async () => {
  clearProjects();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
              VALUES ('테스트, 콤마', 'CSV_A', 'web', 'active', 1)`).run();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
              VALUES ('일반', 'CSV_B', 'web', 'completed', 2)`).run();

  const token = makeAdminToken();
  const r = await invoke('GET', '/api/projects/export.csv', { token });
  assert.equal(r.status, 200);

  const ct = r.headers['content-type'] || '';
  assert.match(ct, /text\/csv/);
  const cd = r.headers['content-disposition'] || '';
  assert.match(cd, /attachment;\s*filename="projects-\d{4}-\d{2}-\d{2}\.csv"/);

  const csv = r.raw.toString('utf8');
  // BOM
  assert.equal(csv.charCodeAt(0), 0xFEFF, 'UTF-8 BOM 첨부');

  const lines = csv.replace(/^﻿/, '').split('\r\n').filter(Boolean);
  assert.equal(lines[0], 'id,code,name,status,type,completion_level,tech_stack,framework,created_at,updated_at,deleted_at,artifact_count,open_ticket_count,last_pipeline_status');
  // CSV escape: 콤마 포함 이름은 따옴표로 감싸짐
  const aRow = lines.find(l => l.includes('CSV_A'));
  assert.ok(aRow.includes('"테스트, 콤마"'), `콤마 escape 필요: ${aRow}`);
});

test('export.csv: status 필터 반영', async () => {
  clearProjects();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
              VALUES ('A', 'F_A', 'web', 'active', 1)`).run();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
              VALUES ('C', 'F_C', 'web', 'completed', 1)`).run();

  const token = makeAdminToken();
  const r = await invoke('GET', '/api/projects/export.csv?status=active', { token });
  const csv = r.raw.toString('utf8').replace(/^﻿/, '');
  const dataLines = csv.split('\r\n').filter(Boolean).slice(1);
  assert.equal(dataLines.length, 1, 'active 만 1건');
  assert.ok(dataLines[0].includes('F_A'));
});

test('export.csv: archived_only 필터 — deleted_at IS NOT NULL', async () => {
  clearProjects();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level, deleted_at)
              VALUES ('arc', 'ARC_X', 'web', 'archived', 1, datetime('now'))`).run();
  db.prepare(`INSERT INTO projects (name, code, type, status, completion_level)
              VALUES ('live', 'ARC_Y', 'web', 'active', 1)`).run();

  const token = makeAdminToken();
  const r = await invoke('GET', '/api/projects/export.csv?archived_only=1', { token });
  const csv = r.raw.toString('utf8').replace(/^﻿/, '');
  const dataLines = csv.split('\r\n').filter(Boolean).slice(1);
  assert.equal(dataLines.length, 1);
  assert.ok(dataLines[0].includes('ARC_X'));
});

test('export.csv 라우트가 /:id 보다 먼저 등록 — projects.js 라우트 순서', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'routes', 'projects.js'), 'utf8');
  const exportIdx = src.indexOf("router.get('/export.csv'");
  // /:id 정확 매칭 (뒤에 영문이 오는 /:id/... 는 제외)
  const idMatch = src.match(/router\.get\(\s*['"]\/:id['"]\s*,/);
  const idIdx = idMatch ? idMatch.index : -1;
  assert.ok(exportIdx > 0, "router.get('/export.csv', ...)이 존재해야 함");
  assert.ok(idIdx > 0, "router.get('/:id', ...)이 존재해야 함");
  assert.ok(exportIdx < idIdx, 'export.csv는 /:id 보다 먼저 등록되어야 함');
});

test.after(() => cleanupTestDb());
