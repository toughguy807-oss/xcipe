// Smoke 테스트 — 모든 핵심 모듈이 로드 가능한지 확인
// 실패 시: syntax error, missing require, schema 깨짐 등을 즉시 감지
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

setupTestDb();

test('db 모듈 로드 + 핵심 export 노출', () => {
  const dbMod = require('../../src/db');
  assert.ok(dbMod.db, 'db 인스턴스');
  assert.equal(typeof dbMod.logActivity, 'function');
  assert.equal(typeof dbMod.recordTokenUsage, 'function');
  assert.equal(typeof dbMod.calcCostUsd, 'function');
  assert.equal(typeof dbMod.logError, 'function');
  assert.equal(typeof dbMod.getCostUsage, 'function');
  assert.ok(dbMod.MODEL_PRICING, 'MODEL_PRICING 상수');
});

test('보안 미들웨어 모듈 로드', () => {
  const { securityHeaders, rateLimit } = require('../../src/middleware/security');
  assert.equal(typeof securityHeaders, 'function');
  assert.equal(typeof rateLimit, 'function');
});

test('Express 라우트 모듈 로드', () => {
  // 각 라우트는 express.Router를 반환해야 함
  const routes = ['auth', 'users', 'projects', 'pipelines', 'tickets', 'activity', 'search', 'notifications', 'dashboard', 'doctor', 'metrics', 'messages'];
  for (const r of routes) {
    const mod = require(`../../src/routes/${r}`);
    assert.ok(mod, `${r} router exists`);
    assert.equal(typeof mod, 'function', `${r} router is mountable`);
  }
  // admin 네임스페이스 라우트 (src/routes/admin/*)
  const adminRoutes = ['users', 'invite', 'settings', 'assets'];
  for (const r of adminRoutes) {
    const mod = require(`../../src/routes/admin/${r}`);
    assert.ok(mod, `admin/${r} router exists`);
    assert.equal(typeof mod, 'function', `admin/${r} router is mountable`);
  }
});

test('engine 모듈 로드', () => {
  assert.ok(require('../../src/engine/model-bridge'));
  assert.ok(require('../../src/engine/skill-loader'));
  assert.ok(require('../../src/engine/pipeline-worker'));
});

test.after(() => cleanupTestDb());
