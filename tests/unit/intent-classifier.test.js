// Unit — PR3 intent-classifier
//
// 결정론적 분류기. LLM 호출 0회 → 빠르고 안정적.
// 핵심 회귀 시나리오:
//   - type: booking/ecommerce/saas/tourism/web 5종 키워드 매칭
//   - level: L1~L6 키워드 매칭 (가장 높은 level 우선)
//   - type-default-level: level 키워드 미매칭 시 type 기본값
//   - confidence: 매칭 조합별 임계값
//   - toInitialSlots: confidence < 0.7 면 빈 슬롯 반환

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classify,
  toInitialSlots,
  CONFIDENCE_THRESHOLD
} = require('../../src/engine/intent-classifier');

test('빈 입력 — 기본값 반환 + ok=false', () => {
  const r = classify('');
  assert.equal(r.ok, false);
  assert.equal(r.type, 'web');
  assert.equal(r.level, 4);
  assert.equal(r.confidence, 0);
});

test('null/undefined 입력도 안전하게 fallback', () => {
  assert.equal(classify(null).ok, false);
  assert.equal(classify(undefined).ok, false);
  assert.equal(classify(123).ok, false); // non-string
});

test('한글 booking — 예약 키워드 → type=booking, level=4 (default)', () => {
  const r = classify('카페 예약 사이트 만들어줘');
  assert.equal(r.ok, true);
  assert.equal(r.type, 'booking');
  assert.equal(r.level, 4);          // 사이트 = L4 매칭
  assert.equal(r.scope, 'publish');
  assert.ok(r.confidence >= 0.7);
});

test('한글 ecommerce — 쇼핑몰 결제 → type=ecommerce, level=5', () => {
  const r = classify('상품 결제까지 되는 쇼핑몰 풀앱');
  assert.equal(r.type, 'ecommerce');
  assert.equal(r.level, 5);
  assert.equal(r.scope, 'fullstack');
});

test('한글 saas — 어드민/대시보드 → type=saas, level=5 (default)', () => {
  const r = classify('어드민 대시보드 관리자 도구');
  assert.equal(r.type, 'saas');
  assert.equal(r.level, 5); // type default
});

test('한글 tourism — 관광/여행 → type=tourism, level=4 (default)', () => {
  const r = classify('지역 관광 안내 사이트');
  assert.equal(r.type, 'tourism');
  assert.equal(r.level, 4);
});

test('한글 web — 회사 홈페이지 → type=web, level=4', () => {
  const r = classify('회사 소개 홈페이지');
  assert.equal(r.type, 'web');
  assert.equal(r.level, 4);
});

test('영문 booking — appointment → type=booking', () => {
  const r = classify('appointment booking website');
  assert.equal(r.type, 'booking');
  assert.equal(r.level, 4);
});

test('영문 ecommerce — checkout cart → type=ecommerce', () => {
  const r = classify('shop with cart and checkout payment');
  assert.equal(r.type, 'ecommerce');
});

test('L1 — 기획만 → level=1, scope=planning', () => {
  const r = classify('홈페이지 기획만 해주세요 초안 정도면 충분');
  assert.equal(r.level, 1);
  assert.equal(r.scope, 'planning');
});

test('L2 — 와이어프레임/SB → level=2, scope=design', () => {
  const r = classify('회사 사이트 와이어프레임까지');
  assert.equal(r.level, 2);
  assert.equal(r.scope, 'design');
});

test('L6 — 배포까지 → level=6, scope=deploy', () => {
  const r = classify('카페 예약 사이트 배포까지 docker로');
  assert.equal(r.level, 6);
  assert.equal(r.scope, 'deploy');
});

test('복합 — 사이트+배포 → 가장 높은 level 채택', () => {
  const r = classify('웹사이트 만들고 production 배포');
  assert.equal(r.level, 6); // L4 + L6 → 6 우선
});

test('confidence — type+level 둘 다 매칭은 0.9 이상', () => {
  const r = classify('카페 예약 사이트 배포까지');
  assert.ok(r.confidence >= 0.9, `expected >=0.9, got ${r.confidence}`);
});

test('confidence — type만 매칭은 0.7 ~ 0.75', () => {
  // type 키워드는 있지만 level 키워드는 없게
  const r = classify('관광 정보');
  assert.equal(r.type, 'tourism');
  assert.ok(r.confidence >= 0.7 && r.confidence < 0.85);
});

test('confidence — 둘 다 미매칭은 낮음 (< THRESHOLD)', () => {
  const r = classify('뭔가 만들어줘');
  assert.ok(r.confidence < CONFIDENCE_THRESHOLD,
    `expected < ${CONFIDENCE_THRESHOLD}, got ${r.confidence}`);
});

test('toInitialSlots — confidence 충분 시 type/completion_level 채움', () => {
  const cls = classify('카페 예약 사이트');
  const slots = toInitialSlots(cls);
  assert.equal(slots.type, 'booking');
  assert.equal(slots.completion_level, 4);
});

test('toInitialSlots — confidence 부족 시 빈 객체', () => {
  const cls = classify('뭔가 만들어줘');
  const slots = toInitialSlots(cls);
  assert.deepEqual(slots, {});
});

test('toInitialSlots — null/실패 입력 안전 처리', () => {
  assert.deepEqual(toInitialSlots(null), {});
  assert.deepEqual(toInitialSlots({ ok: false }), {});
});

test('matched 디버그 정보 — typeHits/levelHits 포함', () => {
  const r = classify('카페 예약 사이트 배포');
  assert.ok(Array.isArray(r.matched.typeHits));
  assert.ok(Array.isArray(r.matched.levelHits));
  assert.ok(r.matched.typeHits.length > 0);
  assert.ok(r.matched.levelHits.length > 0);
});

test('reasoning 한 줄 근거 포함', () => {
  const r = classify('카페 예약 사이트');
  assert.equal(typeof r.reasoning, 'string');
  assert.ok(r.reasoning.length > 0);
  assert.ok(r.reasoning.includes('booking'));
});

test('우선순위 — booking 키워드가 web 키워드 압도', () => {
  // "예약" + "홈페이지" 둘 다 매칭 → 둘 다 1 hit
  // 동률일 때는 순위(booking > ecommerce > saas > tourism > web)에 따라 booking 채택
  const r = classify('예약 홈페이지 만들어줘');
  assert.equal(r.type, 'booking');
});

test('regex case-insensitive — Booking, BOOKING 모두 매칭', () => {
  assert.equal(classify('Booking system').type, 'booking');
  assert.equal(classify('BOOKING flow').type, 'booking');
});
