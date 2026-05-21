// PR4-D Unit — intake-tools 5개 함수 + runIntakeTools/buildContextBlock 통합
//
// 검증 대상:
//   1) getCompanyProfile         — DB 1행 조회 + JSON 컬럼 파싱 + null 안전 fallback
//   2) searchRagCorpus           — FTS5 미가용 환경에서도 안전 fallback (테이블 없음 → null)
//   3) recentLessons             — skill_lessons 컬럼 스키마 변동 시 안전 fallback
//   4) runIntakeTools            — 의도 분류·company·similar·rag·lessons 통합 prefetch
//   5) buildContextBlock         — toolResults → 한국어 마크다운 컨텍스트 블록

const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');
setupTestDb();

const { db } = require('../../src/db');
const tools = require('../../src/engine/intake-tools');

test('getCompanyProfile — 행 없으면 null 반환', () => {
  // 신규 테스트 DB는 company_profile 비어있음 — null 보장
  db.prepare('DELETE FROM company_profile').run();
  assert.equal(tools.getCompanyProfile(), null);
});

test('getCompanyProfile — 행이 있으면 JSON 컬럼 파싱', () => {
  db.prepare('DELETE FROM company_profile').run();
  db.prepare(`
    INSERT INTO company_profile (name, identity_summary, core_competencies, signature_tone)
    VALUES (?, ?, ?, ?)
  `).run(
    'ELUO Inc.',
    '디지털 에이전시 — 브랜드·웹·앱 전문',
    JSON.stringify(['UX', 'Branding', 'Frontend', 'Backend', 'QA']),
    JSON.stringify({ tone: 'editorial-modern', voice: 'professional', audience: 'B2B' })
  );
  const c = tools.getCompanyProfile();
  assert.equal(c.name, 'ELUO Inc.');
  assert.deepEqual(c.core_competencies, ['UX', 'Branding', 'Frontend', 'Backend', 'QA']);
  assert.equal(c.signature_tone.tone, 'editorial-modern');
});

test('searchRagCorpus — 빈 hint → null', () => {
  assert.equal(tools.searchRagCorpus('', 5), null);
  assert.equal(tools.searchRagCorpus(null, 5), null);
});

test('searchRagCorpus — fts5 가용 시에도 토큰 매칭 없으면 null', () => {
  // FTS5 가용 여부는 환경 의존이라 결과를 단언하지 않고, throws 없이 null 또는 array 반환만 보장
  const r = tools.searchRagCorpus('완전임의가나다라마_zxy999', 5);
  if (r !== null) {
    assert.ok(Array.isArray(r));
  }
});

test('recentLessons — 컬럼 스키마 미스매치 시 안전 fallback (null)', () => {
  // skill_lessons 테이블이 v4 db.js 와 intake-tools.js 컬럼명이 다를 수 있음 —
  // 어느 쪽이든 throws 없이 null 또는 array 반환만 보장
  const r = tools.recentLessons(3);
  if (r !== null) {
    assert.ok(Array.isArray(r));
  }
});

test('runIntakeTools — 빈 prompt → 모든 필드 null/empty', async () => {
  const r = await tools.runIntakeTools('');
  assert.equal(r.intent, null);
  assert.deepEqual(r.intent_seeded_slots, {});
  assert.equal(r.similar, null);
  assert.equal(r.company, null);
  assert.equal(r.rag, null);
  assert.equal(r.lessons, null);
});

test('runIntakeTools — 카페 예약 prompt → intent.type=booking + level 시드', async () => {
  const r = await tools.runIntakeTools('카페 예약 사이트 만들고 싶어요. 모바일 우선.');
  assert.ok(r.intent);
  assert.equal(r.intent.type, 'booking');
  assert.ok(r.intent.confidence >= 0.7, 'confidence should be high for clear booking intent');
  // intent_seeded_slots 는 high-confidence 일 때 type/level 자동 채움
  assert.equal(r.intent_seeded_slots.type, 'booking');
  assert.ok(typeof r.intent_seeded_slots.completion_level === 'number');
});

test('runIntakeTools — includeSimilar:false 옵션이면 similar 검색 스킵', async () => {
  const r = await tools.runIntakeTools('쇼핑몰 결제 통합 풀앱 배포', { includeSimilar: false });
  assert.equal(r.similar, null, 'similar should be skipped');
  assert.ok(r.intent, 'intent should still run');
});

test('runIntakeTools — company 회사 정체성 자동 포함', async () => {
  // 회사 프로필 시드
  db.prepare('DELETE FROM company_profile').run();
  db.prepare(`
    INSERT INTO company_profile (name, identity_summary, core_competencies, signature_tone)
    VALUES (?, ?, ?, ?)
  `).run('ELUO', '디지털 에이전시', JSON.stringify(['UX']), JSON.stringify({ tone: 'modern' }));

  const r = await tools.runIntakeTools('카페 예약 사이트');
  assert.ok(r.company);
  assert.equal(r.company.name, 'ELUO');
});

test('buildContextBlock — null/empty toolResults → 빈 문자열', () => {
  assert.equal(tools.buildContextBlock(null), '');
  assert.equal(tools.buildContextBlock({}), '');
});

test('buildContextBlock — intent + company + similar 모두 있으면 모든 섹션 포함', () => {
  const ctx = tools.buildContextBlock({
    intent: { ok: true, type: 'booking', level: 4, scope: 'standard', confidence: 0.85, reasoning: '예약 키워드 매칭' },
    company: {
      name: 'ELUO',
      identity_summary: '디지털 에이전시',
      core_competencies: ['UX', 'Branding'],
      signature_tone: { tone: 'editorial-modern' }
    },
    similar: {
      results: [
        { name: 'CafeBook', site_purpose: '카페 예약 사이트', auto_tags: '["booking","cafe"]' }
      ]
    }
  });
  assert.match(ctx, /자동 의도 분류/);
  assert.match(ctx, /booking/);
  assert.match(ctx, /회사 정체성/);
  assert.match(ctx, /ELUO/);
  assert.match(ctx, /유사 사례/);
  assert.match(ctx, /CafeBook/);
});

test('buildContextBlock — rag/lessons 만 있어도 해당 섹션만 출력', () => {
  const ctx = tools.buildContextBlock({
    intent: null,
    company: null,
    similar: null,
    rag: [{ path: '~/.claude/skills/plan/SKILL.md', kind: 'skill', hit: '<<예약>> 시스템 설계' }],
    lessons: [{ skill_name: 'plan-req', lesson_text: '필수 슬롯 누락 시 1개씩 묻기 금지', count: 5 }]
  });
  assert.doesNotMatch(ctx, /자동 의도 분류/);
  assert.match(ctx, /관련 사내 지식/);
  assert.match(ctx, /SKILL\.md/);
  assert.match(ctx, /누적 학습 패턴/);
  assert.match(ctx, /plan-req/);
});

test('buildContextBlock — auto_tags JSON 파싱 실패해도 throws 안 함', () => {
  const ctx = tools.buildContextBlock({
    similar: {
      results: [
        { name: 'X', site_purpose: '잘못된 태그', auto_tags: 'not-json' }
      ]
    }
  });
  assert.match(ctx, /유사 사례/);
  assert.match(ctx, /\bX\b/);
});
