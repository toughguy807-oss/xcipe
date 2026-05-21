// Claude API Provider — Anthropic SDK
// 실제 AI 호출. ANTHROPIC_API_KEY 필요.
// PR1-A3/A4: thinking 강제 (Ultra-Plan 정책) + 4.7 GA 모델 default

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch {}

// 티어별 thinking budget — extended thinking 강제 (ai_provider=claude-api 기준)
//   light  =  4K → 4.7 짧은 추출/JSON 작업
//   medium = 16K → 표준 마크다운 산출물
//   heavy  = 32K → 복잡 코드/구조 결정 (SB·Markup·Style 등)
// 0이면 thinking 비활성 (fallback / 명시 비활성용)
const TIER_THINKING_BUDGET = { light: 4000, medium: 16000, heavy: 32000 };

const SDK_MISSING_MSG = '@anthropic-ai/sdk not installed. Run: npm install @anthropic-ai/sdk';

class ClaudeApiProvider {
  constructor({ apiKey, model = 'claude-opus-4-7' }) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY required');
    }
    // SDK 미설치 환경에서도 인스턴스는 생성 가능 (테스트가 client 를 mock 으로 주입할 수 있도록).
    // 실제 호출 시점에 sdkAvailable 가드.
    this.sdkAvailable = !!Anthropic;
    this.apiKey = apiKey;
    this.client = Anthropic ? new Anthropic({ apiKey }) : null;
    this.model = model;
  }

  getProviderName() { return 'claude-api'; }

  // claude-api 는 OS 인증이 아닌 키 기반 — checkSession 은 단순 유효성만 확인
  // (LLM 호출 없는 가벼운 체크가 필요할 때만 사용. 실제 검증은 testConnection)
  async checkSession() {
    const has = !!this.apiKey;
    return {
      ok: has,
      loggedIn: has,
      authMethod: 'api-key',
      apiProvider: 'firstParty',
      hasKey: has,
      sdkInstalled: this.sdkAvailable
    };
  }

  async testConnection() {
    if (!this.client) return { ok: false, provider: 'claude-api', error: SDK_MISSING_MSG };
    try {
      const r = await this.client.messages.create({
        model: this.model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'ping' }]
      });
      return { ok: true, provider: 'claude-api', model: this.model, message: 'Connected' };
    } catch (err) {
      return { ok: false, provider: 'claude-api', error: err.message };
    }
  }

  async sendMessage({ task, skillName, context, systemPrompt, userPrompt, model: modelOverride, tier, thinkingBudget }) {
    if (!this.client) return { ok: false, error: SDK_MISSING_MSG };
    try {
      const messages = [{ role: 'user', content: userPrompt || JSON.stringify(context) }];
      const useModel = modelOverride || this.model;

      // PR1-A3: tier → thinking budget 자동 매핑 (Ultra-Plan: 모든 호출에 thinking)
      const budget = (typeof thinkingBudget === 'number')
        ? thinkingBudget
        : (TIER_THINKING_BUDGET[tier] || TIER_THINKING_BUDGET.medium);

      // thinking 활성 시 max_tokens 는 budget + 응답 본문 여유분
      const maxTokens = budget > 0 ? budget + 8000 : 8000;

      // T0-2: Prompt Caching — system 프롬프트는 호출마다 거의 동일(SKILL.md/rules prefix)
      //   array form + cache_control: ephemeral → cache write 1.25× × 1회 / hit 0.1× (90% 절감)
      //   1024 토큰 미만이면 캐시 미스(SDK가 자동으로 무시) — 짧은 system도 안전
      const sysText = systemPrompt || 'You are a helpful assistant.';
      const params = {
        model: useModel,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: sysText, cache_control: { type: 'ephemeral' } }],
        messages
      };
      if (budget > 0) {
        params.thinking = { type: 'enabled', budget_tokens: budget };
      }

      const r = await this.client.messages.create(params);

      // thinking 블록과 응답 본문 분리 — DB artifacts.thinking_text 저장용
      const textParts = [];
      const thinkingParts = [];
      for (const b of r.content) {
        if (b.type === 'thinking') thinkingParts.push(b.thinking || '');
        else if (b.type === 'redacted_thinking') thinkingParts.push('[REDACTED]');
        else if (b.text) textParts.push(b.text);
      }
      return {
        ok: true,
        content: textParts.join('\n'),
        thinking: thinkingParts.length ? thinkingParts.join('\n\n---\n\n') : null,
        thinking_budget: budget,
        model: useModel,
        tokens: {
          input: r.usage.input_tokens,
          output: r.usage.output_tokens,
          // T0-2: cache 메트릭 — hit ratio 모니터링·비용 측정용
          cache_creation: r.usage.cache_creation_input_tokens || 0,
          cache_read: r.usage.cache_read_input_tokens || 0
        }
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = ClaudeApiProvider;
module.exports.TIER_THINKING_BUDGET = TIER_THINKING_BUDGET;
