# Context Engineering Policy v1.0

**도입일**: 2026-04-30
**적용 범위**: 전역 시스템 부하 의사결정, skill description 압축, tool result 회수, 매 턴 토큰 측정
**On-demand 트리거**: 컨텍스트 비대화 감지 · description/매핑 테이블 압축 직전 · tool result 미회수 의심 · 시스템 프롬프트 길이 제한 도입 검토

## 배경

Anthropic 공식 가이드 (effective-context-engineering-for-ai-agents) + RAG-MCP 논문 (arXiv 2505.03275) + 14주 누적 엔트로피 (21→42 스킬, 0→18 rules) 기반 도입.

매 턴 system-reminder가 자동 주입하는 Skills Level 1 메타데이터(~100 tokens/skill × 한글 1.35x)가 진짜 부담임을 정량 확인 (2026-04-30 분석).

## 핵심 원칙

### 1. Just-in-time 우선

매 턴 자동 주입을 최소화하고, 런타임 조회로 전환한다.

| 패턴 | 적용 |
|------|------|
| Lightweight identifier 유지 | 파일 경로, stored query, 링크 형태로 보관 |
| 매 턴 주입 vs 런타임 조회 | 호출 빈도 < 주당 1회면 런타임 조회 |
| 매핑 테이블 위치 | CLAUDE.md (매 턴 주입) → `lib/rules/INDEX.md` (on-demand) 분리 검토 |

### 2. Tool Result Clearing (재호출 가능한 결과만)

재호출 가능한 tool 결과는 clear가 cheaper + lossless. 단, 비결정적 결과는 clear 금지.

| 결정성 | clear 정책 |
|--------|----------|
| ✅ 결정적 (qa-functional, qa-security, file read) | clear 안전, 재호출 보장 |
| ❌ 비결정적 (publish-visual-verify Vision LLM, qa-lighthouse 네트워크, qa-performance) | clear 금지, 결과 변동 위험 |

### 3. 압축 시 트리거 키워드 100% 보존 의무

Skill description / 룰 매핑 표현 압축 시 매칭 트리거 키워드는 **모두 보존**해야 한다.

**근거**: Anthropic 자체 사례 — 시스템 프롬프트에 "tool 호출 사이 25 단어 이내" 길이 제한 추가 후 Opus 4.6/4.7 코딩 성능 **3% 하락** 측정. 무지성 압축은 매칭 정확도 손실로 이어진다.

**검증 의무**: 압축 후 `verify-keyword-preservation.js` 통과 (1.0 미만 롤백).

### 4. Memory Systems = 외부 영구 저장소

매 턴 컨텍스트가 아닌 외부 영구 저장소(`memory/`)에 노트 작성. 컨텍스트 한도 도달 직전 compaction 의무. 본 시스템은 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=75` 적용 (2026-04-21).

### 5. 4-Block 시스템 프롬프트 패턴

`INSTRUCTIONS / CONTEXT / TASK / OUTPUT FORMAT` 4-블록으로 구조화. 각 블록은 단일 책임. context hygiene 유지.

## Context Anxiety Check — Turn Budget × Progress Matrix (v1.1, 2026-05-06 추가)

**도입 사유**: Opus 4.7 long-horizon 태스크에서 컨텍스트 잔량 인식이 추론 품질을 좌우. 매 턴 잔량을 ad-hoc 추측하는 대신 **2축 매트릭스**로 의사결정 룰화.

### 2축 정의

| 축 | 측정 | 임계값 |
|----|------|--------|
| **X: Turn Budget Used** | 현재 세션의 토큰 사용률 (compaction 75% 기준) | Low <40%, Mid 40~65%, High >65% |
| **Y: Task Progress** | 명시 todo/단계 대비 완료 비율 | Low <33%, Mid 33~66%, High >66% |

### 4분면 → 액션 매핑

| 분면 | 상태 | 액션 |
|------|------|------|
| Q1: Budget Low + Progress High | **Excellent** — 효율 진행 | 현 페이스 유지. 메모리 기록 보류 (정리는 종료 시) |
| Q2: Budget Low + Progress Low | **Healthy Start** — 초반 탐색 | 정상. 단 Mid 진입 시 Q3/Q4 회피 위해 todo 재정렬 |
| Q3: Budget High + Progress High | **Sprint Finish** — 마무리 가능 | 현 작업 마무리 우선. 신규 부수 작업 거절. 종료 후 compaction |
| Q4: Budget High + Progress Low | **🚨 Anxiety Zone** | **즉시 조치**: ① 현재 상태 메모리 기록 → ② 사용자에게 분할 제안 → ③ 미완 todo만 남기고 컨텍스트 cleanup |

### Anxiety 감지 시 표준 응답 템플릿

```
[Context Anxiety Check] Q4 진입 — Budget {x}% / Progress {y}%
- 완료: {todo_done 목록}
- 미완: {todo_pending 목록}
- 권고: {분할 / compaction / 메모리 기록 후 종료} 중 1개 선택해주세요.
```

### 자동 점검 트리거

다음 시점에 매트릭스 자가 점검 의무:
- todo 항목 완료/추가 시점
- 외부 도구 결과 30k tokens 이상 수신 직후
- 한 응답 내 Bash/Read/Grep 5회 이상 호출 시
- 사용자 새 요구 추가 시 (현 todo 진행 중)

> **이 룰은 메모리 `MEMORY.md` 기록과 별개**. 매트릭스는 in-session 자기 점검, 메모리는 cross-session 영구 저장.

## 측정 의무

진화/정리 작업 시 **베이스라인 토큰 측정 선행**. 측정 없이 정리 = 추측 (메모리 `feedback_analyze_before_answer.md` 위반).

| 지표 | 측정 도구 | 임계 |
|------|---------|------|
| 매 턴 평균 토큰 | `scripts/measure-prompt-bloat.js` (Week 1 도입) | 베이스라인 ±10% |
| Skill 호출 매트릭스 | `metrics/skill-call-matrix.json` | 압축 후 호출 누락 0건 |
| 트리거 키워드 보존 | `verify-keyword-preservation.js` | 1.0 |

## 금지 사항

- 권위 기반 흡수 ("Anthropic 공식이라" "외부 가이드 5.4k stars라") **금지**. 사용자 워크플로우 인용 1건 이상 명시 의무 (`cli-internalization.md` 흡수 게이트와 연동).
- description 일괄 60% 이상 압축 **금지** (3% 하락 사례 회피, 30% 한도).
- 비결정적 tool result clear **금지**.
- 호출 빈도 0 = archive 자동 결정 **금지**. 안전 룰 보호 리스트 (`lib/rules/PROTECTED.md`) 우선.

## 참조

- Anthropic 공식: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- RAG-MCP 논문: https://arxiv.org/pdf/2505.03275
- 본 시스템 분석: `archive/history_milestones.md` 04-30 항목, 본 대화 04-30 분석
