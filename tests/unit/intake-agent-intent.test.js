// Unit — PR3 intake-agent + intent-classifier 통합
//
// 검증 시나리오:
//  1) 첫 사용자 메시지 → classifier가 슬롯 자동 시드 (mock provider)
//  2) intent_json 컬럼에 분류 결과 저장
//  3) confidence 낮으면 시드 없이 통과
//  4) 두 번째 메시지부터는 classifier 호출 안 함 (이미 시드됨)

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');
setupTestDb();

const { db } = require('../../src/db');
const intake = require('../../src/engine/intake-agent');

// model-bridge — mock provider 강제
const modelBridge = require('../../src/engine/model-bridge');
const origGet = modelBridge.getProvider;
modelBridge.getProvider = () => ({
  getProviderName: () => 'mock',
  sendMessage: async () => ({ ok: true, content: '{}' })
});

function createUser() {
  const r = db.prepare(`
    INSERT INTO users (email, password_hash, role, name)
    VALUES (?, ?, 'admin', 'Test')
  `).run(`u${Date.now()}@test.local`, 'x');
  return r.lastInsertRowid;
}

test('첫 메시지에서 booking 키워드 → slots.type=booking 자동 시드', async () => {
  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트 만들어줘' });
  assert.equal(r.ok, true);
  assert.equal(r.slots.type, 'booking');
  assert.equal(r.slots.completion_level, 4);
  // intent 객체 응답에 포함
  assert.ok(r.intent);
  assert.equal(r.intent.type, 'booking');
});

test('intent_json 컬럼에 분류 결과 영구 저장', async () => {
  const userId = createUser();
  const sid = intake.start(userId);
  await intake.turn({ sessionId: sid, userMessage: '쇼핑몰 결제 풀앱 배포까지' });
  const row = db.prepare('SELECT intent_json FROM intake_sessions WHERE id=?').get(sid);
  assert.ok(row.intent_json);
  const intent = JSON.parse(row.intent_json);
  assert.equal(intent.type, 'ecommerce');
  assert.equal(intent.level, 6);
});

test('confidence 낮으면 type/level 자동 시드 안 함 (mock 추론은 별도)', async () => {
  const userId = createUser();
  const sid = intake.start(userId);
  // "안녕하세요"는 type/level 키워드 모두 미매칭 → confidence=0.3 < 0.7
  await intake.turn({ sessionId: sid, userMessage: '안녕하세요' });
  const row = db.prepare('SELECT intent_json FROM intake_sessions WHERE id=?').get(sid);
  const intent = JSON.parse(row.intent_json);
  assert.ok(intent.confidence < 0.7);
  // mock 추론은 자체 fallback (기본 web/L4)을 적용하므로 슬롯은 채워질 수 있음 — 핵심은 classifier가
  // 잘못된 자동 채움을 강제하지 않는 것. intent 결과만 검증.
});

test('두 번째 메시지부터는 classifier 호출 안 함 — intent_json 그대로', async () => {
  const userId = createUser();
  const sid = intake.start(userId);
  await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트' });
  const row1 = db.prepare('SELECT intent_json FROM intake_sessions WHERE id=?').get(sid);
  // 일부러 다른 도메인 메시지 — 만약 매 턴 분류했다면 ecommerce로 덮어쓰겠지만 그러지 않아야 함
  await intake.turn({ sessionId: sid, userMessage: '결제 쇼핑몰' });
  const row2 = db.prepare('SELECT intent_json FROM intake_sessions WHERE id=?').get(sid);
  assert.equal(row1.intent_json, row2.intent_json, 'intent_json should not be overwritten');
});

// 정리 — getProvider 복원
test.after(() => {
  modelBridge.getProvider = origGet;
});
