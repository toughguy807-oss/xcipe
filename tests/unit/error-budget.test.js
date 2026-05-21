// Unit — F1: 에러 예산 (getErrorBudget, logError 알람 발사)
//
// 검증:
//  1) 기본 임계 (24h=50, 1h=20)
//  2) setSetting으로 임계 변경 시 반영
//  3) 임계 초과 시 logError → activity_log에 'error_budget_exceeded' 기록
//  4) 24h 디바운스 — 같은 scope/level은 한 번만 발사
//  5) 임계 0 = 비활성 (배지 표시 안 함)
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db, getErrorBudget, logError, setSetting, _shouldFireErrorAlert } = require('../../src/db');

function clearAlertDebounce() {
  // 모든 디바운스 키 초기화
  db.prepare(`DELETE FROM settings WHERE key LIKE 'error_alert_last_%'`).run();
}

function clearErrorLog() {
  db.prepare(`DELETE FROM error_log`).run();
}

function clearActivity() {
  db.prepare(`DELETE FROM activity_log`).run();
}

test('getErrorBudget: 기본 임계 (24h=50, 1h=20, alert=80%)', () => {
  // settings 비어있는 상태에서 default 반환
  db.prepare(`DELETE FROM settings WHERE key LIKE 'error_budget_%' OR key = 'error_alert_at_pct'`).run();
  clearErrorLog();
  const eb = getErrorBudget();
  assert.equal(eb.day.limit, 50);
  assert.equal(eb.hour.limit, 20);
  assert.equal(eb.alertPct, 0.8);
  assert.equal(eb.day.count, 0);
  assert.equal(eb.day.alert, false);
  assert.equal(eb.day.exceeded, false);
});

test('setSetting → 임계 변경 반영', () => {
  setSetting('error_budget_24h', '10');
  setSetting('error_budget_1h', '3');
  const eb = getErrorBudget();
  assert.equal(eb.day.limit, 10);
  assert.equal(eb.hour.limit, 3);
});

test('logError: 임계 초과 시 activity_log에 exceeded 기록', () => {
  clearErrorLog();
  clearActivity();
  clearAlertDebounce();
  setSetting('error_budget_1h', '3');
  setSetting('error_budget_24h', '50');

  // 4건 → 1h 한도(3) 초과
  for (let i = 0; i < 4; i++) {
    logError({ source: 'test', code: 'E', message: `err${i}` });
  }

  const acts = db.prepare(
    `SELECT action, detail FROM activity_log WHERE entity_type = 'system' ORDER BY id DESC`
  ).all();
  const exceeded = acts.find(a => a.action === 'error_budget_exceeded' && /1시간/.test(a.detail || ''));
  assert.ok(exceeded, `1h exceeded 알람이 기록되어야 함 (실제: ${JSON.stringify(acts)})`);
});

test('24h 디바운스: 같은 scope/level은 한 번만 발사', () => {
  clearActivity();
  clearAlertDebounce();
  // 첫 번째 호출 — true
  assert.equal(_shouldFireErrorAlert('hour', 'exceeded'), true);
  // 두 번째 즉시 호출 — false (24h 내)
  assert.equal(_shouldFireErrorAlert('hour', 'exceeded'), false);
  // 다른 scope는 독립
  assert.equal(_shouldFireErrorAlert('day', 'exceeded'), true);
  assert.equal(_shouldFireErrorAlert('hour', 'alert'), true);
});

test('임계 0 = 비활성 — alert/exceeded 모두 false', () => {
  setSetting('error_budget_1h', '0');
  setSetting('error_budget_24h', '0');
  // 100건 쌓아도
  clearErrorLog();
  for (let i = 0; i < 100; i++) {
    db.prepare(`INSERT INTO error_log (source, message) VALUES (?, ?)`).run('test', `e${i}`);
  }
  const eb = getErrorBudget();
  assert.equal(eb.day.alert, false);
  assert.equal(eb.day.exceeded, false);
  assert.equal(eb.hour.alert, false);
  assert.equal(eb.hour.exceeded, false);
});

test('top_codes: 1h 내 자주 발생하는 코드 5개', () => {
  clearErrorLog();
  setSetting('error_budget_1h', '20');
  for (let i = 0; i < 5; i++) {
    db.prepare(`INSERT INTO error_log (source, code, message) VALUES (?, ?, ?)`)
      .run('http', 'E-DUP', `dup${i}`);
  }
  for (let i = 0; i < 2; i++) {
    db.prepare(`INSERT INTO error_log (source, code, message) VALUES (?, ?, ?)`)
      .run('worker', 'E-OTHER', `o${i}`);
  }
  const eb = getErrorBudget();
  assert.ok(eb.top_codes.length >= 2);
  assert.equal(eb.top_codes[0].code, 'E-DUP');
  assert.equal(eb.top_codes[0].c, 5);
});

test.after(() => cleanupTestDb());
