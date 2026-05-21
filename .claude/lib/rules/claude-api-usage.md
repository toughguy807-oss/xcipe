# Claude API 활용 원칙

전역 프로젝트에서 Claude API / Anthropic SDK를 사용할 때 적용되는 **원칙**. 구체 SDK 호출 코드 작성은 `claude-api` 스킬에 위임한다.

## 언제 적용되나

| 상황 | 적용 |
|------|:---:|
| LLM 기반 검증·분석 스킬 구현 | ✅ |
| 파이프라인이 외부 LLM을 호출하는 경우 | ✅ |
| Claude Code 세션 내부 호출 (subagent, skill inherit) | ❌ (세션 모델 그대로) |

## 핵심 원칙

### 1. Prompt Caching 필수

> API 호출당 90% 비용 절감. 구조 설계 단계부터 고정부/동적부를 분리하라.

**원칙**: 2회 이상 반복 호출되는 프롬프트는 반드시 prompt caching을 적용한다.

| 구성 | 위치 |
|------|------|
| 시스템 프롬프트 (검수 기준, 응답 형식, 예시) | `system[]` 블록 + `cache_control: { type: "ephemeral" }` |
| 동적 데이터 (청크별 텍스트, 사용자 입력) | `messages[]` 배열 |

**금지**: 매 호출마다 다른 시스템 프롬프트 조립 → 캐시 영구 미스.
**권장**: 시스템 프롬프트를 상수로 export (testability + 캐시 히트율 향상).

참조 구현: `d:/tmp/_archive/figlint/packages/core/src/validator/prompt-builder.ts:SPELL_CHECK_SYSTEM_PROMPT` (사이드 프로젝트)

### 2. Structured Outputs (JSON Schema)

> 2026-02 GA. LLM이 스키마를 절대 벗어나지 않는다. 파싱 실패 0건.

**원칙**: JSON 응답이 필요하면 `output_config.format: { type: "json_schema", schema }` 를 사용한다. 수동 JSON 파싱은 Claude Code 세션(수동 붙여넣기) 용도에만 유지.

| 대안 | 판단 |
|------|------|
| Structured Outputs + JSON Schema | ✅ API 호출 경로 |
| Regex/lenient JSON 추출 | ⚠️ fallback (수동 모드) |
| XML 태그 프롬프팅 | ❌ 레거시 (사용 금지) |

**주의**: 첫 호출은 grammar 컴파일 때문에 추가 지연이 있다. 24시간 캐싱됨.
**지원 모델**: Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 (2026-04 기준).

### 3. Opus 4.7 대응

2026-04-16 릴리스된 Opus 4.7의 행동 변화를 반영한다.

| 변화 | 대응 |
|------|------|
| **토크나이저 1.35×** | 동일 입력에 토큰 최대 35% ↑ — 청크 크기를 3000 → 2200자로 하향 |
| **문자적 지시 강화** | "전부"/"모든" 대신 구체적 열거 |
| **도구 호출 감소** | `effort: xhigh` 권장 |
| **서브에이전트 감소** | 명시적 `Skill()` 호출로 대응 |

### 3-1. 공식 `claude-api` 스킬 활용 (2026-04-29 GA)

Anthropic 공식 `claude-api` 스킬이 출시되었다. **신규 모델 GA / SDK 변경 / 캐싱·thinking 튜닝 시 1순위로 시도**.

| 상황 | 우선 절차 |
|------|----------|
| 신규 모델 GA (4.7 → 4.8 등) | `/claude-api migrate` 먼저 실행 → diff 검토 → 우리 시스템 룰(이 파일) 정합성 확인 후 적용 |
| Anthropic SDK 코드의 캐싱 적중률 개선 | 공식 스킬 자동 호출 (description 키워드 매칭) |
| `thinking`/`compaction`/`tool use`/`batch`/`citations` 파라미터 튜닝 | 공식 스킬 위임 |
| Managed Agents 도입 | **현재 보류** — 자체 오케스트레이터(planning/design/publish/qa/maintenance) 우선. 비용·데이터 주권 검토 후 재논의 |

**충돌 방지**:
- 공식 스킬은 SDK 호출 코드(영어 기준) 작성 전담
- 본 룰(`lib/rules/claude-api-usage.md`)은 **우리 시스템 정책**(한국어 지침, 모델 배정, 청크 크기, 토큰 리포트 형식) 전담
- 공식 스킬이 출력한 코드를 본 룰의 §1~§5 기준으로 한 번 더 검토 후 커밋

### 4. 모델 선택 (Advisor Strategy)

`rules/pipeline.md:단계별 모델 배정` 참조. API 호출 코드에서는 환경변수로 override 가능하도록 구현.

```
ELUO_MODEL=claude-opus-4-7           # 기본
ELUO_MODEL=claude-sonnet-4-6         # 검증/분석 단계
ELUO_MODEL=claude-haiku-4-5          # 단순 포맷팅
```

### 5. 토큰 사용량 리포트

API 응답의 `usage` 필드를 산출물에 포함한다. 캐시 히트율은 비용 최적화 피드백 루프의 핵심 지표.

```json
{
  "apiUsage": {
    "inputTokens": 1234,
    "outputTokens": 567,
    "cacheRead": 10000,
    "cacheCreate": 2000
  }
}
```

## 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | API 키 하드코딩 | `rules/cli-internalization.md` — 환경변수 사용 |
| 2 | 반복 프롬프트에 caching 미적용 | 비용 10배 차이 |
| 3 | JSON 응답을 regex로만 추출 | 파싱 실패 시 silent loss |
| 4 | 레거시 `output_format` 파라미터 사용 | 2026-02 deprecated → `output_config.format` |
| 5 | `anthropic-version` 헤더 누락 | 응답 포맷 변경 시 break |
| 6 | 토크나이저 변경 미반영 청크 크기 사용 | Opus 4.7에서 토큰 초과로 실패 |

## 참조

- 공식 스킬: `claude-api` (Anthropic, 2026-04-29 GA) — SDK 호출 코드 작성 + 모델 마이그레이션 위임
- 공식 커맨드: `/claude-api migrate` — 모델 세대 마이그레이션 (4.x → 4.x+1)
- 공식 커맨드: `/claude-api managed-agents-onboard` — Managed Agents 온보딩 (현재 도입 보류)
- 룰: `rules/pipeline.md` — 단계별 모델 배정
- 룰: `rules/compaction.md` — Opus 4.7 토크나이저 55% 기준
- 룰: `rules/anti-rationalization.md` — 검증 증거 원칙
- 공식 문서: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- 공식 문서: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- 공식 블로그: https://claude.com/blog/claude-api-skill (2026-04-29)
