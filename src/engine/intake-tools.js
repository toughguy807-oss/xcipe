// PR4: 인테이크 도구 prefetch — LLM 호출 전에 "쌓아온 데이터"를 묶어 컨텍스트 블록 생성
//
// 사용자 지적: "쌓아온 데이터에 맞춰 답변" — searchSimilar/company_profile/rag_corpus가
// 데이터는 있는데 LLM 컨텍스트에 주입되지 않아 LLM이 사내 누적 자산을 못 봄. 이 모듈이
// 그 격차를 메운다. 호출 흐름:
//
//   user message → runIntakeTools(prompt) → {intent, similar, company, lessons, rag}
//                → buildContextBlock(toolResults) → systemPrompt 에 주입
//                → LLM (플랜 응답)
//
// 결정론 도구(intent classifier)는 항상 실행, 비용/지연 도구(임베딩 검색)는 hint 충분 시만.

const { db } = require('../db');
const { classify, toInitialSlots } = require('./intent-classifier');
const { searchSimilar } = require('../routes/discovery');

// 회사 프로필 1행 조회 — v10 company_profile 테이블
function getCompanyProfile() {
  try {
    const row = db.prepare(`
      SELECT name, identity_summary, core_competencies, strength_domains,
             signature_tone, brand_tokens, awards
      FROM company_profile
      ORDER BY id ASC
      LIMIT 1
    `).get();
    if (!row) return null;
    const parse = (s) => { try { return JSON.parse(s || 'null'); } catch { return null; } };
    return {
      name: row.name,
      identity_summary: row.identity_summary,
      core_competencies: parse(row.core_competencies),
      strength_domains: parse(row.strength_domains),
      signature_tone: parse(row.signature_tone),
      brand_tokens: parse(row.brand_tokens),
      awards: parse(row.awards)
    };
  } catch (e) {
    return null;
  }
}

// rag_corpus FTS5 검색 — ~/.claude skills/rules/ref 인덱스에서 인테이크 hint 와 매칭
//   v8 마이그레이션이 fts5 미가용 환경에선 테이블 자체가 없음 → 안전 fallback
function searchRagCorpus(hint, limit = 5) {
  try {
    const exists = db.prepare(
      "SELECT 1 AS v FROM sqlite_master WHERE type='table' AND name='rag_corpus'"
    ).get();
    if (!exists) return null;

    // FTS5 쿼리 안전화 — 특수문자 제거, 토큰만 OR 결합
    const tokens = (hint || '')
      .toLowerCase()
      .split(/[\s,·/]+/)
      .filter(t => t.length >= 2)
      .map(t => t.replace(/[^\p{L}\p{N}_]/gu, ''))
      .filter(Boolean);
    if (!tokens.length) return null;
    const q = tokens.map(t => `"${t}"`).join(' OR ');

    const rows = db.prepare(`
      SELECT path, kind, snippet(rag_corpus, 2, '<<', '>>', '...', 16) AS hit
      FROM rag_corpus
      WHERE rag_corpus MATCH ?
      LIMIT ?
    `).all(q, limit);

    if (!rows.length) return null;
    return rows.map(r => ({ path: r.path, kind: r.kind, hit: r.hit }));
  } catch (e) {
    return null;
  }
}

// skill_lessons 누적 실패 패턴 — 인테이크 단계에서는 도메인별 일반 패턴 1~2건만
//   pipeline-worker 가 실행 시 주입하는 것과는 다른 용도 (인테이크는 사용자 안내 차원)
function recentLessons(limit = 3) {
  try {
    const exists = db.prepare(
      "SELECT 1 AS v FROM sqlite_master WHERE type='table' AND name='skill_lessons'"
    ).get();
    if (!exists) return null;

    const rows = db.prepare(`
      SELECT skill_name, pattern_key, lesson_text, count
      FROM skill_lessons
      WHERE count >= 2
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit);
    return rows.length ? rows : null;
  } catch (e) {
    return null;
  }
}

// 통합 prefetch — LLM 호출 전 1회
//   prompt: 사용자 입력 (description hint 로도 사용)
//   options.includeSimilar: 임베딩 검색 호출 여부 (비용/지연 가드)
async function runIntakeTools(prompt, options = {}) {
  const out = {
    intent: null,
    intent_seeded_slots: {},
    similar: null,
    company: null,
    rag: null,
    lessons: null
  };

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return out;

  // 1) 의도 분류 — 결정론, 무비용
  out.intent = classify(prompt);
  out.intent_seeded_slots = toInitialSlots(out.intent);

  // 2) 회사 프로필 — DB 1건 조회
  out.company = getCompanyProfile();

  // 3) 유사 프로젝트 — 임베딩 검색 (옵션, 기본 ON, hint 4자 이상일 때)
  if (options.includeSimilar !== false && prompt.trim().length >= 4) {
    try {
      const r = await searchSimilar({ hint: prompt, limit: 5 });
      if (r.ok && r.results && r.results.length) {
        out.similar = {
          hint: r.hint,
          embed_used: r.embed_used,
          results: r.results
        };
      }
    } catch (e) { /* 흡수 */ }
  }

  // 4) RAG corpus — FTS5
  if (options.includeRag !== false) {
    out.rag = searchRagCorpus(prompt, 5);
  }

  // 5) 누적 학습 — 일반 1~2건
  if (options.includeLessons !== false) {
    out.lessons = recentLessons(3);
  }

  return out;
}

// LLM systemPrompt/userPrompt 에 주입할 컨텍스트 블록 (한국어 마크다운, 토큰 절약 위해 압축)
//   필수 슬롯·이전 대화 등은 상위에서 별도로 붙임. 이 함수는 "데이터 컨텍스트"만 담당.
function buildContextBlock(toolResults) {
  if (!toolResults) return '';
  const parts = [];

  if (toolResults.intent && toolResults.intent.ok) {
    const it = toolResults.intent;
    parts.push(`[자동 의도 분류]
- 추정 type: ${it.type} (${it.confidence >= 0.7 ? '신뢰' : '낮음'})
- 추정 level: ${it.level} (scope=${it.scope})
- 근거: ${it.reasoning}`);
  }

  if (toolResults.company) {
    const c = toolResults.company;
    const comp = Array.isArray(c.core_competencies) ? c.core_competencies.slice(0, 5).join(', ') : '';
    const tone = c.signature_tone && (c.signature_tone.tone || c.signature_tone.voice) || '';
    parts.push(`[회사 정체성]
- 이름: ${c.name || '(미입력)'}
- 정체성: ${(c.identity_summary || '').slice(0, 200)}
- 핵심역량: ${comp || '(미입력)'}
- 시그니처 톤: ${tone || '(미입력)'}`);
  }

  if (toolResults.similar && toolResults.similar.results) {
    const top = toolResults.similar.results.slice(0, 3);
    const lines = top.map((r, i) => {
      const tags = (() => { try { return (JSON.parse(r.auto_tags || '[]') || []).slice(0, 4).join(','); } catch { return ''; } })();
      return `  ${i + 1}. ${r.name} — ${(r.site_purpose || '').slice(0, 80)} [${tags}]`;
    }).join('\n');
    parts.push(`[유사 사례 ${top.length}건 (사내 누적)]
${lines}`);
  }

  if (toolResults.rag && toolResults.rag.length) {
    const lines = toolResults.rag.slice(0, 3).map(r =>
      `  - ${r.path} (${r.kind}): ${(r.hit || '').slice(0, 100)}`
    ).join('\n');
    parts.push(`[관련 사내 지식]
${lines}`);
  }

  if (toolResults.lessons && toolResults.lessons.length) {
    const lines = toolResults.lessons.slice(0, 2).map(l =>
      `  - [${l.skill_name}] ${l.lesson_text} (${l.count}회)`
    ).join('\n');
    parts.push(`[누적 학습 패턴]
${lines}`);
  }

  return parts.length ? parts.join('\n\n') : '';
}

module.exports = {
  runIntakeTools,
  buildContextBlock,
  // 단위 테스트용 export
  getCompanyProfile,
  searchRagCorpus,
  recentLessons
};
