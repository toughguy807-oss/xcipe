// Unit — 토큰/비용 계산 + 한도 체크 로직
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

setupTestDb();
const dbMod = require('../../src/db');
const { calcCostUsd, MODEL_PRICING, recordTokenUsage, getCostUsage, setSetting, db } = dbMod;

test('calcCostUsd: opus 4-7 단가 적용', () => {
  // input 1M, output 1M → $15 + $75 = $90
  const cost = calcCostUsd('claude-opus-4-7', 1_000_000, 1_000_000);
  assert.equal(cost, 90);
});

test('calcCostUsd: haiku 단가 적용', () => {
  // input 1M, output 1M → $0.80 + $4 = $4.80
  const cost = calcCostUsd('claude-haiku-4-5', 1_000_000, 1_000_000);
  assert.ok(Math.abs(cost - 4.8) < 1e-9, `expected 4.8, got ${cost}`);
});

test('calcCostUsd: 알 수 없는 모델 → 0 반환 (조용히)', () => {
  assert.equal(calcCostUsd('unknown-model', 1000, 1000), 0);
});

test('calcCostUsd: 0 토큰 → 0', () => {
  assert.equal(calcCostUsd('claude-opus-4-7', 0, 0), 0);
});

test('MODEL_PRICING: 등록된 모델 카탈로그 무결성', () => {
  for (const [name, p] of Object.entries(MODEL_PRICING)) {
    assert.ok(typeof p.input === 'number' && p.input >= 0, `${name} input price`);
    assert.ok(typeof p.output === 'number' && p.output >= 0, `${name} output price`);
    assert.ok(p.output >= p.input, `${name}: output >= input 가정 (현재 가격 정책)`);
  }
});

test('recordTokenUsage + getCostUsage: 일/월 누적 정확성', () => {
  // 임시 DB는 빈 상태 — 5건 적재
  recordTokenUsage({ skillName: 'test-skill', task: 'test', model: 'claude-opus-4-7', inputTokens: 1000, outputTokens: 1000 });
  recordTokenUsage({ skillName: 'test-skill', task: 'test', model: 'claude-sonnet-4-6', inputTokens: 5000, outputTokens: 2000 });
  recordTokenUsage({ skillName: 'other', task: 'test', model: 'claude-haiku-4-5', inputTokens: 10000, outputTokens: 1000 });

  setSetting('cost_limit_daily_usd', '0.10');
  setSetting('cost_limit_monthly_usd', '5');
  setSetting('cost_alert_at_pct', '80');

  const usage = getCostUsage();
  assert.ok(usage.daily.cost > 0, '일별 비용 누적');
  assert.equal(usage.daily.limit, 0.10);
  assert.equal(usage.monthly.limit, 5);
  assert.equal(usage.alertPct, 0.8);
  // 위 3건 합계 비용 = (1000*15 + 1000*75) + (5000*3 + 2000*15) + (10000*0.8 + 1000*4) = 90000 + 45000 + 12000 = 147000 / 1M = 0.147
  // 0.10 한도 초과
  assert.ok(usage.daily.exceeded, `daily exceeded should be true (cost=${usage.daily.cost})`);
  assert.ok(usage.daily.alert, 'alert도 true');
});

test('getCostUsage: 한도 0이면 alert/exceeded 모두 false', () => {
  setSetting('cost_limit_daily_usd', '0');
  setSetting('cost_limit_monthly_usd', '0');
  const usage = getCostUsage();
  assert.equal(usage.daily.alert, false);
  assert.equal(usage.daily.exceeded, false);
  assert.equal(usage.monthly.alert, false);
  assert.equal(usage.monthly.exceeded, false);
});

test('logError: 메시지 4000자 / 스택 8000자 / context 4000자 슬라이스', () => {
  dbMod.logError({
    source: 'test',
    code: 'UNIT-001',
    message: 'x'.repeat(5000),
    stack: 'y'.repeat(10000),
    context: { big: 'z'.repeat(10000) }
  });
  const row = db.prepare("SELECT * FROM error_log WHERE code = 'UNIT-001'").get();
  assert.ok(row);
  assert.equal(row.message.length, 4000);
  assert.equal(row.stack.length, 8000);
  assert.ok(row.context_json.length <= 4000);
});

test.after(() => cleanupTestDb());
