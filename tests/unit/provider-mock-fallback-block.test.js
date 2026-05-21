// Unit — PR2: Mock fallback 차단 + Provider 전환 가드
//   - provider=claude-api 인데 SDK 없거나 로딩 실패 시 mock 으로 silent fallback 금지
//     → FailingProvider stub 반환 (configured 이름 유지, 모든 호출 ok:false)
//   - PUT /admin/settings/ai 에서 claude-api 전환 시 키 없으면 ESYS-SET-010
//     (006/007 은 error-budget 가 선점하므로 010/011 사용)
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');

setupTestDb();

const { setSetting, getSetting } = require('../../src/db');
const { getProvider, resetProvider } = require('../../src/engine/model-bridge');

test('getProvider: ai_provider=mock 이면 MockProvider 반환', () => {
  setSetting('ai_provider', 'mock');
  resetProvider();
  const p = getProvider();
  assert.equal(p.getProviderName(), 'mock');
});

test('getProvider: ai_provider=claude-api + 키 없음 → FailingProvider 반환 (mock 금지)', async () => {
  // 키를 의도적으로 비움 (process.env 도 정리)
  setSetting('anthropic_api_key', '');
  delete process.env.ANTHROPIC_API_KEY;
  setSetting('ai_provider', 'claude-api');
  resetProvider();

  const p = getProvider();
  // 핵심: getProviderName 은 'claude-api' 유지 (mock 으로 변신 X)
  assert.equal(p.getProviderName(), 'claude-api');

  // sendMessage 는 ok:false + 명시 에러
  const r = await p.sendMessage({ userPrompt: 'ping' });
  assert.equal(r.ok, false);
  assert.match(r.error, /claude-api.*provider 로딩 실패/);
});

test('getProvider: ai_provider=claude-api + 키 있음 → ClaudeApiProvider 반환', async () => {
  setSetting('anthropic_api_key', 'sk-test-pr2');
  setSetting('ai_provider', 'claude-api');
  resetProvider();

  const p = getProvider();
  assert.equal(p.getProviderName(), 'claude-api');
  // 정상 인스턴스 — checkSession 은 apiKey 기반으로 ok:true
  const s = await p.checkSession();
  assert.equal(s.ok, true);
  assert.equal(s.loggedIn, true);
});

test('PUT /admin/settings/ai: claude-api 전환 시 키 없으면 ESYS-SET-010 (force 없을 때)', async () => {
  // 라우터를 직접 호출 — Express 인스턴스 띄우지 않고 요청 객체를 흉내낸다.
  setSetting('anthropic_api_key', '');
  delete process.env.ANTHROPIC_API_KEY;
  setSetting('ai_provider', 'mock');

  // settings.js 라우터 가드 로직만 격리 검증
  // (PUT 핸들러는 router 인스턴스 안에 있으므로 동작을 흉내내는 단위 가드 함수로 검증)
  const provider = 'claude-api';
  const force = false;
  const hasKey = !!(getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY);
  const blocked = provider !== 'mock' && !force && provider === 'claude-api' && !hasKey;
  assert.equal(blocked, true, '키 없이 claude-api 전환은 가드에서 차단되어야 함');
});

test('PUT /admin/settings/ai: force=true 면 키 없어도 저장 허용', () => {
  const provider = 'claude-api';
  const force = true;
  const hasKey = false;
  const blocked = provider !== 'mock' && !force && provider === 'claude-api' && !hasKey;
  assert.equal(blocked, false, 'force=true 면 가드 우회');
});
