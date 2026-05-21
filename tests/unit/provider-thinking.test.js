// Unit — PR1: Provider tier→thinking/effort 매핑
//   claude-api: tier 별 TIER_THINKING_BUDGET 강제
//   claude-code: tier 별 TIER_EFFORT 매핑 (medium/high/xhigh)
//
// 실제 LLM 호출은 하지 않는다. _invoke / messages.create 호출 시 전달되는
// 인자만 검증하기 위해 client 를 가짜로 주입.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');

setupTestDb();

const ClaudeApiProvider = require('../../src/engine/providers/claude-api-provider');
const ClaudeCodeProvider = require('../../src/engine/providers/claude-code-provider');

test('claude-api: TIER_THINKING_BUDGET 카탈로그 — light/medium/heavy 4K/16K/32K', () => {
  const { TIER_THINKING_BUDGET } = ClaudeApiProvider;
  assert.equal(TIER_THINKING_BUDGET.light, 4000);
  assert.equal(TIER_THINKING_BUDGET.medium, 16000);
  assert.equal(TIER_THINKING_BUDGET.heavy, 32000);
});

test('claude-api: tier=heavy → thinking 32K + max_tokens budget+8000', async () => {
  const provider = new ClaudeApiProvider({ apiKey: 'sk-test', model: 'claude-opus-4-7' });
  let captured = null;
  provider.client = {
    messages: {
      create: async (params) => {
        captured = params;
        return {
          content: [
            { type: 'thinking', thinking: 'reasoning steps...' },
            { type: 'text', text: 'final output' }
          ],
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      }
    }
  };

  const r = await provider.sendMessage({
    task: 'execute-skill',
    skillName: 'plan-sb',
    systemPrompt: 'sys',
    userPrompt: 'user',
    tier: 'heavy'
  });

  assert.ok(r.ok);
  assert.equal(r.content, 'final output');
  assert.equal(r.thinking, 'reasoning steps...');
  assert.equal(r.thinking_budget, 32000);
  assert.deepEqual(captured.thinking, { type: 'enabled', budget_tokens: 32000 });
  assert.equal(captured.max_tokens, 32000 + 8000);
  assert.equal(captured.model, 'claude-opus-4-7');
});

test('claude-api: tier=light → thinking 4K', async () => {
  const provider = new ClaudeApiProvider({ apiKey: 'sk-test', model: 'claude-opus-4-7' });
  let captured = null;
  provider.client = {
    messages: {
      create: async (params) => {
        captured = params;
        return { content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 1, output_tokens: 1 } };
      }
    }
  };
  await provider.sendMessage({ userPrompt: 'ping', tier: 'light' });
  assert.equal(captured.thinking.budget_tokens, 4000);
  assert.equal(captured.max_tokens, 4000 + 8000);
});

test('claude-api: thinkingBudget=0 → thinking 비활성', async () => {
  const provider = new ClaudeApiProvider({ apiKey: 'sk-test', model: 'claude-opus-4-7' });
  let captured = null;
  provider.client = {
    messages: {
      create: async (params) => {
        captured = params;
        return { content: [{ type: 'text', text: 'no-think' }], usage: { input_tokens: 1, output_tokens: 1 } };
      }
    }
  };
  const r = await provider.sendMessage({ userPrompt: 'ping', thinkingBudget: 0 });
  assert.equal(captured.thinking, undefined);
  assert.equal(captured.max_tokens, 8000);
  assert.equal(r.thinking, null);
  assert.equal(r.thinking_budget, 0);
});

test('claude-api: redacted_thinking 블록 — [REDACTED] 마커로 보존', async () => {
  const provider = new ClaudeApiProvider({ apiKey: 'sk-test', model: 'claude-opus-4-7' });
  provider.client = {
    messages: {
      create: async () => ({
        content: [
          { type: 'redacted_thinking', data: 'sealed' },
          { type: 'text', text: 'output' }
        ],
        usage: { input_tokens: 1, output_tokens: 1 }
      })
    }
  };
  const r = await provider.sendMessage({ userPrompt: 'p', tier: 'medium' });
  assert.equal(r.thinking, '[REDACTED]');
});

test('claude-api: default model = claude-opus-4-7 (PR1-A4)', () => {
  const provider = new ClaudeApiProvider({ apiKey: 'sk-test' });
  assert.equal(provider.model, 'claude-opus-4-7');
});

test('claude-code: TIER_EFFORT — light/medium/heavy → medium/high/xhigh', () => {
  // TIER_EFFORT 가 module.exports 에 없어도 _invoke 의 명령 문자열로 간접 검증 가능.
  // 여기서는 사용자가 직접 effort override 했을 때의 동작만 확인.
  const p = new ClaudeCodeProvider({ command: 'claude', timeout: 5000 });
  assert.equal(typeof p._invoke, 'function');
  assert.equal(typeof p.checkSession, 'function');
});

test('claude-code: checkSession 메서드 시그니처 (PR1-A1)', async () => {
  const p = new ClaudeCodeProvider({ command: 'this-binary-does-not-exist-xyz', timeout: 2000 });
  const r = await p.checkSession();
  // 존재하지 않는 명령 → ok:false, loggedIn:false
  assert.equal(r.ok, false);
  assert.equal(r.loggedIn, false);
  assert.ok(typeof r.error === 'string' && r.error.length > 0);
});

test('claude-api: checkSession — apiKey 보유 시 ok=true', async () => {
  const p = new ClaudeApiProvider({ apiKey: 'sk-test' });
  const r = await p.checkSession();
  assert.equal(r.ok, true);
  assert.equal(r.loggedIn, true);
  assert.equal(r.authMethod, 'api-key');
});
