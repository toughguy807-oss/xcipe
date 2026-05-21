// U-G23: 통합 채팅 UX — intake 슬롯 채움 에이전트
//   대화형으로 프로젝트 메타데이터(name/code/type/level 등) 수집.
//   - 입력: 사용자 자연어 + 누적 슬롯
//   - 출력: { mode: 'ask' | 'confirm', question?, slot?, summary?, missing? }
//
// 설계 원칙:
//   - 한 번에 1개 슬롯만 묻기 (피로도 ↓)
//   - 사용자가 "추천해줘" 하면 합리적 default 자동 채움
//   - 필수 슬롯 모두 채워지면 confirm 단계 (요약 + [생성·시작] 버튼 노출)
//   - light-tier (Haiku) 사용 — 비용/지연 최소화

const modelBridge = require('./model-bridge');
const { pickModel } = modelBridge;
const { db, getSetting, recordTokenUsage } = require('../db');
const { searchSimilar } = require('../routes/discovery');
const { runIntakeTools, buildContextBlock } = require('./intake-tools');

// 슬롯 정의 (필수/권장)
const REQUIRED_SLOTS = ['name', 'code', 'type', 'description', 'completion_level'];
const OPTIONAL_SLOTS = ['tech_stack', 'framework', 'reference_url'];

const SLOT_LABELS = {
  name: '프로젝트명 (예: 카페 예약, 회사 홈페이지)',
  code: '코드 (대문자+숫자+언더스코어, 12자 이내)',
  type: '유형 (web/ecommerce/booking/saas/tourism)',
  description: '한 줄 설명',
  completion_level: '완성 수준 (1=기획만 ~ 6=배포까지)',
  tech_stack: '기술 스택 (선택)',
  framework: '프론트 프레임워크 (L5 이상에서)',
  reference_url: '레퍼런스 URL (선택)'
};

const SYSTEM_PROMPT = `너는 웹사이트 제작 자동화 시스템의 인테이크 에이전트다.
프로젝트 메타데이터를 모으는 폼 채우기 봇이 아니다 — 사내 누적 데이터(회사 정체성, 유사 사례,
누적 학습, 자동 의도 분류)를 바탕으로 **다중 단계 plan**을 제시하고 사용자 확인을 받는 역할이다.

⚠️ 출력 형식 절대 규칙 ⚠️
- 응답 첫 글자는 반드시 \`{\`. 마지막 글자는 반드시 \`}\`.
- JSON 외 어떤 텍스트도 출력 금지 — 인사말, 설명, 마크다운 펜스(\`\`\`), 표, 헤더 모두 금지.
- 사용자에게 보여줄 마크다운(##, **, 표, 리스트)은 plan_markdown 또는 question 필드 **값** 안에 문자열로 넣어라.
- 줄바꿈은 \\n. JSON 외부 출력 시도 시 시스템 파싱 실패로 사용자에게 502 에러가 노출됨.

행동 원칙:
1. 슬롯 1개씩 묻는 폼 채우기 금지. 컨텍스트가 충분하면 한 번에 plan 을 제시한다.
2. 자동 의도 분류·유사 사례·회사 정체성을 적극 활용해 합리적 default 를 채운다.
3. 정말 모호한 1가지(주로 프로젝트 이름·핵심 차별점)만 사용자에게 묻는다 — 그 외는 자동.
4. 응답은 반드시 아래 JSON 스키마 — 마크다운 펜스 X, JSON만. plan_markdown 안의 마크다운은 OK.

응답 스키마:
{
  "mode": "plan" | "ask" | "confirm",
  "slots": { ... 갱신/추가된 슬롯들 (필수 슬롯 우선 자동 채움) ... },
  "plan_markdown": "plan 모드에서만 — 사용자에게 보여줄 한국어 마크다운. ## 제안 / 단계 / 근거(유사 사례·회사 톤 인용) / 확인 사항 섹션",
  "question": "ask 모드에서만 — 자연스러운 한국어 질문 (1~2문장)",
  "slot": "ask 모드에서만 — 묻는 슬롯 키",
  "rationale": "plan/confirm 모드 — '왜 이 값들로 정했는지' 1~2줄 (유사사례·자동분류 근거 포함)",
  "summary": "confirm 모드에서만 — 사용자 친화 요약 (3~5줄)",
  "missing_optional": ["권장 미입력"]
}

필수 슬롯: name, code, type, description, completion_level
권장 슬롯: tech_stack, framework, reference_url

mode 결정:
- 첫 사용자 메시지 + 자동 분류 confidence ≥ 0.7 + 유사 사례 1건 이상 → mode='plan' (필수 슬롯 자동 채우고 plan 제시)
- 정보 부족(이름 등)으로 1가지 명확히 물어야 함 → mode='ask'
- 사용자가 plan 에 OK 하거나 모든 정보 확정 → mode='confirm'

코드 자동 생성: 프로젝트명에서 핵심 단어 1~2개 → 영문 대문자 + 도메인 (예: "카페 예약"→"CAFE_BOOK")
타입 추론: 예약→booking, 쇼핑/결제→ecommerce, 관리자/대시보드→saas, 관광→tourism, 그 외→web
완성수준: "사이트 만들어줘"→4, "기획만"→1, "배포까지"→6, "쇼핑몰 풀앱"→5

plan_markdown 작성 가이드:
- 첫 줄: 한 문장 개요 ("회사 톤(시그니처)에 맞춘 카페 예약 사이트(L4) 제안")
- ## 제안 — 슬롯 값과 근거 (자동 분류 결과·유사 사례 인용 필수)
- ## 다음 단계 — 파이프라인 어떤 스텝이 돌지 (L4면 plan→design→publish→QA)
- ## 확인 사항 — 사용자가 결정해야 할 1가지 (이름·차별점 등)`;

function _sanitizeJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  // ```json ... ``` 제거
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(s); } catch {}
  // 첫 { ~ 마지막 } 추출 시도
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch {}
  }
  return null;
}

function _buildHistory(sessionId) {
  // 같은 session의 모든 메시지를 시간 순 (user/assistant 역할)
  const rows = db.prepare(`
    SELECT role, content FROM messages
    WHERE intake_session_id = ?
    ORDER BY id ASC
  `).all(sessionId);
  return rows.filter(r => r.content);
}

function getSession(sessionId) {
  const row = db.prepare('SELECT * FROM intake_sessions WHERE id = ?').get(sessionId);
  if (!row) return null;
  let slots = {};
  try { slots = JSON.parse(row.slots_json || '{}'); } catch {}
  return { ...row, slots };
}

function updateSlots(sessionId, slots) {
  db.prepare(`
    UPDATE intake_sessions SET slots_json = ?, updated_at = datetime('now') WHERE id = ?
  `).run(JSON.stringify(slots || {}), sessionId);
}

function _missingRequired(slots) {
  return REQUIRED_SLOTS.filter(k => slots[k] === undefined || slots[k] === null || slots[k] === '');
}

function _missingOptional(slots) {
  return OPTIONAL_SLOTS.filter(k => slots[k] === undefined || slots[k] === null || slots[k] === '');
}

// 단일 턴 처리 — 사용자 메시지 받아 AI 응답 생성
async function turn({ sessionId, userMessage, userId = null }) {
  const session = getSession(sessionId);
  if (!session) return { ok: false, error: 'session_not_found' };

  const provider = modelBridge.getProvider();
  // v28: queue-only + claude-code → 사용자 PC 워커에 위임 (real LLM)
  const useWorker = userId
    && modelBridge.getEffectiveWorkerMode() === 'queue-only'
    && (require('../db').getSetting('ai_provider') || 'claude-code') === 'claude-code';
  const history = _buildHistory(sessionId);
  let currentSlots = session.slots || {};

  // PR4: 첫 사용자 메시지면 "쌓아온 데이터" 도구 prefetch
  //   - intent classifier (결정론) → type/level seed
  //   - searchSimilar (project_index 임베딩) → 유사 사례 Top 3
  //   - getCompanyProfile (company_profile) → 회사 정체성·톤
  //   - searchRagCorpus (rag_corpus FTS5) → 관련 사내 지식
  //   - recentLessons (skill_lessons) → 누적 실패 패턴
  // 두 번째 턴부터는 prefetch 생략 (이미 systemPrompt 에 한 번 주입됐고, 사용자 답변만 받으면 됨)
  const alreadyClassified = !!session.intent_json;
  let toolResults = null;
  if (!alreadyClassified && userMessage) {
    toolResults = await runIntakeTools(userMessage);
    // intent seed 슬롯 채움
    if (toolResults.intent_seeded_slots && Object.keys(toolResults.intent_seeded_slots).length > 0) {
      currentSlots = { ...currentSlots, ...toolResults.intent_seeded_slots };
      updateSlots(sessionId, currentSlots);
    }
    // intent_json 보존 (PR3 호환)
    if (toolResults.intent && toolResults.intent.ok) {
      try {
        db.prepare('UPDATE intake_sessions SET intent_json = ? WHERE id = ?')
          .run(JSON.stringify(toolResults.intent), sessionId);
      } catch (e) { /* 컬럼 없는 구식 DB 흡수 */ }
    }
  }
  const classification = toolResults && toolResults.intent || null;
  const contextBlock = toolResults ? buildContextBlock(toolResults) : '';

  // 사용자 prompt — 이전 대화 + 현재 슬롯 상태 + 새 사용자 메시지
  const historyText = history.map(m => `${m.role === 'user' ? '사용자' : '어시스턴트'}: ${m.content}`).join('\n');
  const slotsText = JSON.stringify(currentSlots, null, 2);
  const missingReq = _missingRequired(currentSlots);
  const missingOpt = _missingOptional(currentSlots);

  const userPrompt = `${contextBlock ? contextBlock + '\n\n' : ''}[현재 누적 슬롯]
${slotsText}

[필수 미입력] ${missingReq.length ? missingReq.join(', ') : '없음 (confirm 가능)'}
[권장 미입력] ${missingOpt.length ? missingOpt.join(', ') : '없음'}

[이전 대화]
${historyText || '(없음)'}

[방금 사용자 메시지]
${userMessage}

지침:
- 위 [자동 의도 분류]·[회사 정체성]·[유사 사례]·[관련 사내 지식]·[누적 학습 패턴]을 적극 인용하라.
- 첫 턴 + confidence ≥ 0.7 + 유사 사례 ≥ 1건이면 mode='plan' 으로 plan_markdown 을 채워라.
- 정말 모호한 1가지(주로 이름/차별점)만 mode='ask'.
- 사용자가 plan 에 OK 의사를 보이거나 모든 필수 슬롯이 채워졌으면 mode='confirm'.`;

  // mock provider 처리 — 실제 AI 없이 진행 가능하도록.
  // v28: queue-only + claude-code 면 워커로 위임하므로 mock fallback skip
  if (provider.getProviderName() === 'mock' && !useWorker) {
    const mockResult = _mockTurn({ currentSlots, userMessage, missingReq, toolResults });
    if (mockResult.ok && mockResult.slots) updateSlots(sessionId, mockResult.slots);
    // mock에서도 유사 사례 추천 — UI/API 일관성
    const hint = mockResult.slots?.description || mockResult.slots?.name || '';
    if (mockResult.ok && hint && hint.length >= 4) {
      try {
        const r = await searchSimilar({ hint, limit: 5 });
        if (r.ok && r.results.length) {
          mockResult.similar_projects = { hint: r.hint, embed_used: r.embed_used, results: r.results };
        }
      } catch (e) { /* swallow */ }
    }
    if (classification) mockResult.intent = classification;
    if (toolResults) mockResult.tools_used = Object.keys(toolResults).filter(k => toolResults[k] && (Array.isArray(toolResults[k]) ? toolResults[k].length : true));
    return mockResult;
  }

  const intakeModel = pickModel({ task: 'analyze-prompt' });
  let result;
  if (useWorker) {
    // v28: 워커로 위임 — Railway 컨테이너엔 OAuth 없으니 사용자 PC 워커가 claude 실행
    const { invokeViaWorker } = require('./worker-invocation');
    const inv = await invokeViaWorker({
      userId,
      kind: 'intake-turn',
      payload: { systemPrompt: SYSTEM_PROMPT, userPrompt },
      timeoutMs: 120_000
    });
    if (!inv.ok) {
      return { ok: false, error: inv.error };
    }
    result = { ok: true, content: inv.content, tokens: inv.usage || null };
  } else {
    result = await provider.sendMessage({
      task: 'intake-turn',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      model: intakeModel,
      tier: 'light'
    });
  }

  // 2026-05-13: intake-turn 토큰 사용량 로컬 적재 (provider/result 성공 여부와 무관, 토큰 있으면 기록)
  if (result.tokens && (result.tokens.input || result.tokens.output)) {
    try {
      recordTokenUsage({
        projectId: null,
        skillName: null,
        task: 'intake-turn',
        model: intakeModel,
        provider: provider.getProviderName(),
        inputTokens: result.tokens.input || 0,
        outputTokens: result.tokens.output || 0,
        cacheCreationTokens: result.tokens.cache_creation || 0,
        cacheReadTokens: result.tokens.cache_read || 0
      });
    } catch (e) { /* swallow */ }
  }

  if (!result.ok) return { ok: false, error: result.error || 'provider failed' };

  const parsed = _sanitizeJson(result.content);
  if (!parsed) {
    // claude-code 등 일부 provider는 JSON 강제 무시하고 자연어 markdown 반환.
    // 502 대신 plan-card 형식으로 우아하게 표시 — raw를 plan_markdown 으로 매핑.
    const raw = (result.content || '').trim();
    const looksLikeMarkdown = raw.length >= 40 && /[#*\-•]|\n\s*\d+\.|\*\*/.test(raw);
    if (looksLikeMarkdown) {
      // T0-3 + 2026-05-13 강화: fallback 무한 반복 차단 — missing slot에 맞는 휴리스틱 매칭
      const fallbackSlots = { ...currentSlots, ...(toolResults?.intent_seeded_slots || {}) };
      const msg = (userMessage || '').trim();
      if (msg.length >= 1) {
        // code 패턴 — 2~20자 + 대문자/숫자/언더바만 (예: KTMVNO, SOLUTIONTREE_V2)
        if (!fallbackSlots.code && /^[A-Z][A-Z0-9_]{1,19}$/.test(msg)) {
          fallbackSlots.code = msg;
        }
        // type 키워드 매칭 — 한글은 \b 안 통하므로 substring 매칭
        // 우선순위: specific (예약/쇼핑/대시보드) > generic (사이트/웹)
        else if (!fallbackSlots.type) {
          const m = msg.toLowerCase();
          if (/(예약|부킹)|\b(booking|reserve)\b/.test(m)) fallbackSlots.type = 'booking';
          else if (/(쇼핑몰|커머스|이커머스)|\b(ecommerce|shop|store)\b/.test(m)) fallbackSlots.type = 'ecommerce';
          else if (/(대시보드|관리자|어드민)|\b(saas|admin|dashboard)\b/.test(m)) fallbackSlots.type = 'saas';
          else if (/(앱|모바일)|\b(app|mobile)\b/.test(m)) fallbackSlots.type = 'app';
          else if (/(웹사이트|홈페이지|사이트|랜딩페이지|랜딩)|\b(web|page|landing)\b/.test(m)) fallbackSlots.type = 'web';
        }
        // completion_level 키워드 매칭
        if (!fallbackSlots.completion_level) {
          const m = msg.toLowerCase();
          const hasPlan = /(기획|plan)/.test(m);
          const hasDesign = /(디자인|design|시안)/.test(m);
          const hasPublish = /(퍼블|publish|코딩|html)/.test(m);
          const hasDeploy = /(배포|deploy|launch)/.test(m);
          if (hasDeploy) fallbackSlots.completion_level = 6;
          else if (hasPublish && hasDesign && hasPlan) fallbackSlots.completion_level = 4;
          else if (hasPublish) fallbackSlots.completion_level = 4;
          else if (hasDesign && hasPlan) fallbackSlots.completion_level = 2;
          else if (hasDesign) fallbackSlots.completion_level = 2;
          else if (hasPlan) fallbackSlots.completion_level = 1;
          // L1, L2 등 명시 형태
          const lvlMatch = msg.match(/\bL?([1-6])\b/);
          if (lvlMatch) fallbackSlots.completion_level = parseInt(lvlMatch[1], 10);
        }
        // name: 비어있고 한 줄·80자 이내 → name 후보 (code 매칭 안 된 경우만)
        if (!fallbackSlots.name && msg.length <= 80 && !msg.includes('\n')
            && !/^[A-Z][A-Z0-9_]{1,19}$/.test(msg)
            && !['ok','네','예','응','no','아니'].includes(msg.toLowerCase())) {
          fallbackSlots.name = msg;
        }
        // description: 비어있으면 그대로, 이후엔 줄바꿈 누적 (중복 방지)
        if (!fallbackSlots.description) {
          fallbackSlots.description = msg;
        } else if (msg.length >= 10 && !fallbackSlots.description.includes(msg)) {
          fallbackSlots.description = fallbackSlots.description + '\n\n' + msg;
        }
      }
      updateSlots(sessionId, fallbackSlots);
      const fallbackMissing = _missingRequired(fallbackSlots);
      const fallbackMode = fallbackMissing.length > 1 ? 'ask' : 'plan';
      // missing 슬롯별 안내 — 같은 메시지 무한 반복 방지
      const FALLBACK_QUESTIONS = {
        name: '프로젝트 이름·목표를 한 줄로 알려주세요. (예: "솔루션트리 - 디자인 리뉴얼")',
        code: '프로젝트 코드를 알려주세요 — 대문자 영문/숫자/언더스코어, 예: SOLUTIONTREE_V2',
        type: '프로젝트 유형을 선택해주세요: web / app / saas 중 하나.',
        description: '프로젝트 설명을 좀 더 자세히 알려주세요 (페이지 구성·핵심 기능 등).',
        completion_level: '완성 수준을 알려주세요 — L1 기획만 / L2 +디자인 / L4 +퍼블+QA / L6 배포까지 등.'
      };
      const nextSlot = fallbackMissing[0];
      const fallbackQuestion = fallbackMode === 'ask'
        ? (FALLBACK_QUESTIONS[nextSlot] || `${SLOT_LABELS[nextSlot] || '추가 정보'}를 알려주세요.`)
        : null;
      return {
        ok: true,
        mode: fallbackMode,
        slots: fallbackSlots,
        plan_markdown: raw,
        question: fallbackQuestion,
        slot: nextSlot || null,
        summary: null,
        rationale: null,
        missing_required: fallbackMissing,
        missing_optional: _missingOptional(fallbackSlots),
        similar_projects: null,
        intent: classification || null,
        tools_used: toolResults ? Object.keys(toolResults).filter(k => toolResults[k] && (Array.isArray(toolResults[k]) ? toolResults[k].length : true)) : [],
        tokens: result.tokens || null,
        _parse_fallback: true
      };
    }
    return { ok: false, error: 'AI 응답을 JSON으로 파싱하지 못했습니다.', raw: result.content };
  }

  // 슬롯 머지
  const newSlots = { ...currentSlots, ...(parsed.slots || {}) };
  updateSlots(sessionId, newSlots);

  // 모드 보정 — plan/confirm/ask 3가지 인정
  //   confirm 인데 필수 누락 → ask 강등
  //   plan 인데 필수 누락(여전히 자동 채움 못함) → ask 강등
  let mode = ['plan', 'confirm', 'ask'].includes(parsed.mode) ? parsed.mode : 'ask';
  const stillMissing = _missingRequired(newSlots);
  if (mode === 'confirm' && stillMissing.length) mode = 'ask';
  if (mode === 'plan' && stillMissing.length > 1) mode = 'ask';
  // plan 인데 plan_markdown 비어있으면 ask 로 강등 — 사용자에게 빈 화면 노출 방지
  if (mode === 'plan' && !parsed.plan_markdown) mode = 'ask';

  // U-G24: description이 채워졌으면 유사 사례 추천 (라이트, 비차단)
  let similar = null;
  const hint = newSlots.description || newSlots.name || '';
  if (hint && hint.length >= 4) {
    try {
      const r = await searchSimilar({ hint, limit: 5 });
      if (r.ok && r.results.length) {
        similar = { hint: r.hint, embed_used: r.embed_used, results: r.results };
      }
    } catch (e) { /* 추천 실패는 흡수 */ }
  }

  return {
    ok: true,
    mode,
    slots: newSlots,
    plan_markdown: parsed.plan_markdown || null,
    question: parsed.question || null,
    slot: parsed.slot || (stillMissing[0] || null),
    summary: parsed.summary || null,
    rationale: parsed.rationale || null,
    missing_required: stillMissing,
    missing_optional: _missingOptional(newSlots),
    similar_projects: similar,
    intent: classification || null,
    tools_used: toolResults ? Object.keys(toolResults).filter(k => toolResults[k] && (Array.isArray(toolResults[k]) ? toolResults[k].length : true)) : [],
    tokens: result.tokens || null
  };
}

// mock 모드 — 실제 AI 없이 슬롯 채움 (테스트/체험)
//   PR4: toolResults 가 들어오면 plan-first 응답 흉내 (plan_markdown 자동 생성)
function _mockTurn({ currentSlots, userMessage, missingReq, toolResults }) {
  const newSlots = { ...currentSlots };
  // 첫 메시지면 prompt에서 추정
  if (!newSlots.description && userMessage) {
    newSlots.description = userMessage.slice(0, 80);
    if (!newSlots.name) {
      const word = userMessage.match(/[\p{L}]{2,}/u);
      newSlots.name = word ? word[0] : '새 프로젝트';
    }
    if (!newSlots.code) {
      newSlots.code = (newSlots.name || 'PROJECT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PROJECT';
    }
    if (!newSlots.type) newSlots.type = /예약/.test(userMessage) ? 'booking' : /쇼핑|결제/.test(userMessage) ? 'ecommerce' : 'web';
    if (!newSlots.completion_level) newSlots.completion_level = 4;
  } else if (missingReq[0] === 'completion_level') {
    newSlots.completion_level = parseInt(userMessage, 10) || 4;
  } else if (missingReq[0]) {
    newSlots[missingReq[0]] = userMessage.slice(0, 200);
  }

  const stillMissing = _missingRequired(newSlots);

  // PR4: 첫 턴 + intent 신뢰 + 모든 필수 슬롯 채워짐 → plan 모드
  const isFirstTurn = !!toolResults;
  const intentConfident = toolResults && toolResults.intent && toolResults.intent.confidence >= 0.7;
  const canPlan = isFirstTurn && intentConfident && !stillMissing.length;

  let mode;
  if (canPlan) mode = 'plan';
  else if (stillMissing.length) mode = 'ask';
  else mode = 'confirm';

  let plan_markdown = null;
  if (mode === 'plan') {
    const it = toolResults.intent;
    const similarLine = (toolResults.similar && toolResults.similar.results || [])
      .slice(0, 2)
      .map(r => `${r.name} (${r.site_purpose ? r.site_purpose.slice(0, 40) : '유사'})`)
      .join(', ');
    const companyTone = toolResults.company && toolResults.company.signature_tone
      ? (toolResults.company.signature_tone.tone || toolResults.company.signature_tone.voice) : null;
    plan_markdown = `**제안**: ${newSlots.name} (${newSlots.code}) — ${newSlots.type}, L${newSlots.completion_level}

## 제안 근거
- 자동 의도 분류: type=${it.type}, level=${it.level} (confidence ${it.confidence})
- 유사 사례: ${similarLine || '(없음)'}
- 회사 톤: ${companyTone || '(미입력)'}

## 다음 단계
- L${newSlots.completion_level} 파이프라인 자동 실행

## 확인 사항
- 이대로 진행? (예/수정)`;
  }

  return {
    ok: true,
    mode,
    slots: newSlots,
    plan_markdown,
    question: mode === 'ask' ? `${SLOT_LABELS[stillMissing[0]]}을(를) 알려주세요.` : null,
    slot: mode === 'ask' ? (stillMissing[0] || null) : null,
    summary: mode === 'confirm'
      ? `[Mock] ${newSlots.name} (${newSlots.code}) — ${newSlots.type}, L${newSlots.completion_level}\n${newSlots.description}`
      : null,
    rationale: mode !== 'ask' ? 'Mock 추론' : null,
    missing_required: stillMissing,
    missing_optional: _missingOptional(newSlots)
  };
}

// 시작 — 빈 세션 생성
function start(userId) {
  const id = `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO intake_sessions (id, user_id, slots_json, status) VALUES (?, ?, '{}', 'active')
  `).run(id, userId);
  return id;
}

// 커밋 — projects 행 생성 + intake 메시지 project_id 업데이트
function commit({ sessionId, optionalSkills = [] }) {
  const session = getSession(sessionId);
  if (!session) throw new Error('session_not_found');
  if (session.status !== 'active') throw new Error('session_not_active');
  const slots = session.slots || {};
  const missing = _missingRequired(slots);
  if (missing.length) throw new Error(`필수 슬롯 미입력: ${missing.join(', ')}`);

  // code 충돌 방지
  const exists = db.prepare('SELECT id FROM projects WHERE code = ?').get(slots.code);
  if (exists) throw new Error(`코드 충돌: ${slots.code} (이미 존재)`);

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO projects (name, code, type, description, prompt, completion_level, tech_stack, framework, reference_url, optional_skills, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slots.name,
      slots.code,
      slots.type || 'web',
      slots.description || '',
      slots.description || '',  // prompt = description
      parseInt(slots.completion_level, 10) || 4,
      slots.tech_stack || null,
      slots.framework || null,
      slots.reference_url || null,
      JSON.stringify(optionalSkills || []),
      session.user_id
    );
    const projectId = result.lastInsertRowid;
    db.prepare(`UPDATE messages SET project_id = ? WHERE intake_session_id = ?`).run(projectId, sessionId);
    db.prepare(`UPDATE intake_sessions SET status = 'committed', committed_project_id = ?, updated_at = datetime('now') WHERE id = ?`).run(projectId, sessionId);
    return projectId;
  });

  return tx();
}

module.exports = { start, turn, commit, getSession, REQUIRED_SLOTS, OPTIONAL_SLOTS, SLOT_LABELS };
