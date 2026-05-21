// OTel GenAI emitter — 외부 SDK 의존 0 (fetch + OTLP/HTTP JSON)
//
// 환경 변수:
//   OTEL_EXPORTER_OTLP_ENDPOINT  — 미설정 시 no-op (zero overhead)
//                                  설정 시 예: http://localhost:4318
//   OTEL_EXPORTER_OTLP_HEADERS   — "key=value,key2=value2" (선택)
//   OTEL_SERVICE_NAME            — 기본 "sys_v4"
//   OTEL_GENAI_ENABLED           — "0"이면 비활성화 (기본 "1" — 단, endpoint 미설정이면 어차피 no-op)
//
// GenAI Semantic Conventions (2026-05 기준):
//   gen_ai.system, gen_ai.operation.name, gen_ai.request.model,
//   gen_ai.usage.input_tokens, gen_ai.usage.output_tokens,
//   gen_ai.response.finish_reasons, gen_ai.response.model
//
// 본 모듈은 fire-and-forget — emit 실패는 console.warn 한 줄 후 무시 (파이프라인 영향 없음)

const crypto = require('crypto');

const SPAN_KIND = { INTERNAL: 1, CLIENT: 3 };
const STATUS_CODE = { UNSET: 0, OK: 1, ERROR: 2 };

function isEnabled() {
  if (process.env.OTEL_GENAI_ENABLED === '0') return false;
  return !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
}

function newTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function newSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

function nowUnixNano() {
  // BigInt 기반 — JS Number는 53bit 한계, ns precision 안전 보장
  return (BigInt(Date.now()) * 1000000n).toString();
}

function toUnixNano(ms) {
  return (BigInt(Math.floor(ms)) * 1000000n).toString();
}

// JS value → OTLP AnyValue
function anyValue(v) {
  if (v === null || v === undefined) return { stringValue: '' };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { boolValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { intValue: String(v) };
    return { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(anyValue) } };
  }
  if (typeof v === 'object') {
    return { stringValue: JSON.stringify(v) };
  }
  return { stringValue: String(v) };
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ key, value: anyValue(value) }));
}

function parseHeaders(raw) {
  if (!raw) return {};
  return raw.split(',').reduce((acc, pair) => {
    const [k, v] = pair.split('=').map(s => s && s.trim());
    if (k) acc[k] = v || '';
    return acc;
  }, {});
}

// OTLP/HTTP Trace v1 payload (JSON)
function buildPayload(span) {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'sys_v4';
  return {
    resourceSpans: [{
      resource: {
        attributes: attrs({
          'service.name': serviceName,
          'service.namespace': 'eluo.sys',
          'service.version': process.env.SYS_VERSION || 'v4'
        })
      },
      scopeSpans: [{
        scope: { name: 'sys-v4.model-bridge', version: '1.0.0' },
        spans: [span]
      }]
    }]
  };
}

async function postOtlp(payload) {
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '');
  // 표준: 별도 path 설정이 없으면 /v1/traces 자동 부착
  const url = base.endsWith('/v1/traces') ? base : base + '/v1/traces';
  const headers = {
    'content-type': 'application/json',
    ...parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  };
  // Node 18+ fetch (Windows + claude-api 환경 보장). AbortSignal로 5s 타임아웃.
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ac.signal
    });
    if (!res.ok) {
      console.warn(`[otel] OTLP export failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn(`[otel] OTLP export error: ${err.message}`);
  } finally {
    clearTimeout(t);
  }
}

// invoke_agent span — model-bridge.executeSkill / analyzePrompt 직후 호출
//
// args: {
//   operation: 'execute_skill' | 'analyze_prompt' | 'check_session',
//   provider:  'mock' | 'claude-api' | 'claude-code',
//   model:     string | null,
//   skillName: string | null,
//   tier:      'light' | 'medium' | 'heavy' | null,
//   startedAtMs: number,        // Date.now() 호출 직전
//   endedAtMs:   number,        // Date.now() 호출 직후
//   inputTokens:  number | null,
//   outputTokens: number | null,
//   cacheCreationTokens: number | null,
//   cacheReadTokens:     number | null,
//   ok: boolean,
//   error: string | null,
//   finishReason: string | null,
//   projectCode: string | null,
//   invocationId: string | null
// }
function emitInvokeAgent(args) {
  if (!isEnabled()) return;
  try {
    const {
      operation, provider, model, skillName, tier,
      startedAtMs, endedAtMs,
      inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens,
      ok, error, finishReason, projectCode, invocationId
    } = args;

    const span = {
      traceId: newTraceId(),
      spanId: newSpanId(),
      name: operation === 'execute_skill' && skillName ? `invoke_agent ${skillName}` : `invoke_agent ${operation}`,
      kind: SPAN_KIND.CLIENT,
      startTimeUnixNano: toUnixNano(startedAtMs),
      endTimeUnixNano: toUnixNano(endedAtMs),
      attributes: attrs({
        'gen_ai.system': 'anthropic',
        'gen_ai.operation.name': operation === 'execute_skill' ? 'chat' : (operation === 'analyze_prompt' ? 'chat' : operation),
        'gen_ai.request.model': model,
        'gen_ai.response.finish_reasons': finishReason ? [finishReason] : undefined,
        'gen_ai.usage.input_tokens': inputTokens,
        'gen_ai.usage.output_tokens': outputTokens,
        // Anthropic 캐시 확장 (sys_v4 자체 정의 — Semantic Conventions 외)
        'anthropic.cache.creation_tokens': cacheCreationTokens,
        'anthropic.cache.read_tokens': cacheReadTokens,
        // sys_v4 컨텍스트
        'sys.provider': provider,
        'sys.skill': skillName,
        'sys.tier': tier,
        'sys.project_code': projectCode,
        'sys.invocation_id': invocationId,
        'sys.operation': operation,
      }),
      status: {
        code: ok ? STATUS_CODE.OK : STATUS_CODE.ERROR,
        ...(error ? { message: String(error).slice(0, 500) } : {})
      }
    };

    // fire-and-forget — emit 결과 await 안 함 (파이프라인 차단 금지)
    postOtlp(buildPayload(span));
  } catch (err) {
    console.warn(`[otel] emit error: ${err.message}`);
  }
}

module.exports = { emitInvokeAgent, isEnabled };
