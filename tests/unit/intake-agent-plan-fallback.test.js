// PR4-D Unit — intake-agent.turn graceful fallback + tools_used 관찰
//
// 검증 시나리오:
//   1) provider 가 자연어 markdown 반환 (JSON 무시) → 502 대신 _parse_fallback:true plan-card 응답
//   2) tools_used 에 intent / intent_seeded_slots 포함 (booking 같은 명확 키워드)
//   3) provider 가 정상 JSON 반환 → 일반 plan/ask 경로 (parse_fallback 없음)
//   4) provider 가 짧은 비-마크다운 텍스트 반환 → 502 (잘못된 fallback 트리거 금지)

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');
setupTestDb();

const { db } = require('../../src/db');
const intake = require('../../src/engine/intake-agent');
const modelBridge = require('../../src/engine/model-bridge');

const origGetProvider = modelBridge.getProvider;

// 테스트별 provider 응답을 주입
function stubProvider(response) {
  modelBridge.getProvider = () => ({
    getProviderName: () => 'claude-code', // mock 분기 우회
    sendMessage: async () => response
  });
}

function createUser() {
  const r = db.prepare(`
    INSERT INTO users (email, password_hash, role, name)
    VALUES (?, ?, 'admin', 'Test')
  `).run(`u${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.local`, 'x');
  return r.lastInsertRowid;
}

test('자연어 markdown 응답 → _parse_fallback:true plan-card 매핑', async () => {
  // claude-code 가 JSON 무시하고 한국어 markdown 반환하는 실제 시나리오 재현
  const naturalLangMarkdown = `카페 예약 사이트, 좋습니다. 디자인 작업 진입 전 **Tone Gate** 통과가 필요합니다.

## 제안

다음 3가지 확정 부탁드립니다:
- **Tone**: brutally-minimal 추천
- **참고 사이트**: URL 1개 또는 "없음"
- **카페 이름**: 코드명도 OK

## 다음 단계

L4 파이프라인: plan → design → publish → QA`;

  stubProvider({ ok: true, content: naturalLangMarkdown, tokens: { input: 100, output: 200 } });

  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트 만들고 싶어요' });

  assert.equal(r.ok, true, 'should not 502');
  assert.equal(r._parse_fallback, true, '_parse_fallback flag must be set');
  assert.equal(r.plan_markdown, naturalLangMarkdown, 'raw markdown should be carried over to plan_markdown');
  // intent_seeded slot 시드 확인 — booking 키워드 → type=booking
  assert.equal(r.slots.type, 'booking');
  assert.ok(r.intent, 'intent classification still attached');
  // tools_used 에 intent / intent_seeded_slots 가 포함되어 UI tool-chip 렌더 가능
  assert.ok(Array.isArray(r.tools_used));
  assert.ok(r.tools_used.includes('intent'));
  assert.ok(r.tools_used.includes('intent_seeded_slots'));
});

test('자연어 markdown + 필수 슬롯 다수 누락 → mode=ask, 추가 question 노출', async () => {
  stubProvider({ ok: true, content: '## 제안\n- 모바일 우선\n- 결제 토스페이\n\n**확인 사항**: 프로젝트 이름' });

  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트 만들기' });

  assert.equal(r.ok, true);
  assert.equal(r._parse_fallback, true);
  // intent_seeded 가 type/level 채우지만 name/code/description 누락 → missing > 1 → mode=ask
  assert.equal(r.mode, 'ask');
  assert.ok(r.question, 'ask 모드는 question 채워져야 함');
  assert.ok(r.missing_required.length > 1);
});

test('짧은 비-마크다운 텍스트 응답 → 502 (잘못된 fallback 금지)', async () => {
  // 30자 미만 + 마크다운 패턴 없음 — 단순 에러 메시지나 거부 응답
  stubProvider({ ok: true, content: '실패' });

  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약' });

  assert.equal(r.ok, false, 'short non-markdown content should still fail-safe to 502');
  assert.equal(r._parse_fallback, undefined);
  assert.match(r.error, /파싱/);
});

test('정상 JSON 응답 → 일반 plan/ask 경로 (parse_fallback 없음)', async () => {
  stubProvider({
    ok: true,
    content: JSON.stringify({
      mode: 'plan',
      slots: { name: '카페예약', code: 'CAFE_BOOK', description: '모바일 우선 예약 사이트' },
      plan_markdown: '## 제안\n- 카페 예약 사이트\n- 모바일 우선',
      rationale: '자동 분류 + 회사 톤 매칭'
    })
  });

  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트 만들기' });

  assert.equal(r.ok, true);
  assert.equal(r._parse_fallback, undefined, '정상 JSON 경로엔 fallback flag 없어야 함');
  assert.equal(r.mode, 'plan');
  assert.equal(r.slots.name, '카페예약');
  assert.equal(r.slots.code, 'CAFE_BOOK');
  // 슬롯 자동 시드 (intent) + JSON 슬롯이 머지됨
  assert.equal(r.slots.type, 'booking');
});

test('JSON 코드펜스(```json…```) 래핑된 응답도 정상 파싱', async () => {
  stubProvider({
    ok: true,
    content: '```json\n{"mode":"ask","question":"이름을 알려주세요","slot":"name"}\n```'
  });

  const userId = createUser();
  const sid = intake.start(userId);
  const r = await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트' });

  assert.equal(r.ok, true);
  assert.equal(r._parse_fallback, undefined);
  assert.equal(r.mode, 'ask');
  assert.equal(r.question, '이름을 알려주세요');
});

test('두 번째 턴에선 도구 prefetch 생략 — tools_used 빈 배열', async () => {
  stubProvider({
    ok: true,
    content: JSON.stringify({ mode: 'ask', question: '코드를 알려주세요', slot: 'code' })
  });

  const userId = createUser();
  const sid = intake.start(userId);
  // 1턴 — 분류 + 시드
  await intake.turn({ sessionId: sid, userMessage: '카페 예약 사이트' });
  // 2턴 — already classified → toolResults 생성 안 함
  const r2 = await intake.turn({ sessionId: sid, userMessage: '코드는 CAFE_BOOK으로' });

  assert.equal(r2.ok, true);
  assert.deepEqual(r2.tools_used, [], '두 번째 턴부터 tools_used 비어야 함');
});

// 정리
test.after(() => {
  modelBridge.getProvider = origGetProvider;
});
