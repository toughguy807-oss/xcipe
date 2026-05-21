// Unit — G1: activity_log + error_log 보존 정리
//
// 검증:
//  1) 기본 정책 (activity 90일, error 30일)
//  2) 보존기간 초과 행만 삭제
//  3) 0/음수 = 비활성 (영구 보존)
//  4) settings 변경 반영
//  5) runRetentionCleanup 결과 통계
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db, setSetting } = require('../../src/db');
const { runRetentionCleanup, getRetentionPolicy } = require('../../src/engine/retention-cleanup');

function clearLogs() {
  db.prepare('DELETE FROM activity_log').run();
  db.prepare('DELETE FROM error_log').run();
}

function insertActivityAged(days, action = 'test') {
  // created_at을 직접 과거로 설정
  db.prepare(`INSERT INTO activity_log (entity_type, entity_id, action, detail, created_at)
              VALUES ('system', NULL, ?, 'aged', datetime('now', '-${days} days'))`).run(action);
}

function insertErrorAged(days, code = 'E') {
  db.prepare(`INSERT INTO error_log (source, code, message, created_at)
              VALUES ('test', ?, 'aged', datetime('now', '-${days} days'))`).run(code);
}

test('getRetentionPolicy: 기본 (activity=90, error=30)', () => {
  // 설정 비우면 default
  db.prepare(`DELETE FROM settings WHERE key IN ('activity_log_retention_days', 'error_log_retention_days')`).run();
  const p = getRetentionPolicy();
  assert.equal(p.activity_days, 90);
  assert.equal(p.error_days, 30);
});

test('runRetentionCleanup: 90일 초과 activity_log + 30일 초과 error_log 삭제', () => {
  clearLogs();
  setSetting('activity_log_retention_days', '90');
  setSetting('error_log_retention_days', '30');

  // activity: 100일 전 (삭제) + 30일 전 (보존)
  insertActivityAged(100, 'old');
  insertActivityAged(30, 'fresh');
  // error: 60일 전 (삭제) + 10일 전 (보존)
  insertErrorAged(60, 'OLD');
  insertErrorAged(10, 'NEW');

  const r = runRetentionCleanup();
  assert.equal(r.activity_deleted, 1);
  assert.equal(r.error_deleted, 1);

  const a = db.prepare('SELECT action FROM activity_log ORDER BY id').all();
  assert.deepEqual(a.map(x => x.action), ['fresh']);
  const e = db.prepare('SELECT code FROM error_log ORDER BY id').all();
  assert.deepEqual(e.map(x => x.code), ['NEW']);
});

test('보존기간 0 = 영구 (삭제 안 함)', () => {
  clearLogs();
  setSetting('activity_log_retention_days', '0');
  setSetting('error_log_retention_days', '0');

  insertActivityAged(1000, 'ancient');
  insertErrorAged(1000, 'ANCIENT');

  const r = runRetentionCleanup();
  assert.equal(r.activity_deleted, 0);
  assert.equal(r.error_deleted, 0);

  assert.equal(db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c, 1);
  assert.equal(db.prepare('SELECT COUNT(*) as c FROM error_log').get().c, 1);
});

test('settings 변경 반영 — activity=7, error=1', () => {
  clearLogs();
  setSetting('activity_log_retention_days', '7');
  setSetting('error_log_retention_days', '1');

  insertActivityAged(10, 'over7');
  insertActivityAged(3, 'under7');
  insertErrorAged(2, 'OVER1');
  insertErrorAged(0, 'TODAY'); // 오늘은 보존

  const r = runRetentionCleanup();
  assert.equal(r.activity_deleted, 1);
  assert.equal(r.error_deleted, 1);
  assert.equal(r.activity_retention_days, 7);
  assert.equal(r.error_retention_days, 1);
});

test('runRetentionCleanup: duration_ms 측정', () => {
  clearLogs();
  setSetting('activity_log_retention_days', '90');
  setSetting('error_log_retention_days', '30');
  const r = runRetentionCleanup();
  assert.ok(typeof r.duration_ms === 'number' && r.duration_ms >= 0);
});

test.after(() => cleanupTestDb());
