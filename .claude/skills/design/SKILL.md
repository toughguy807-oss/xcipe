---
name: design
description: >
  디자인 마스터 스킬. 벤치마킹 → HTML A/B/C 직접 생성 또는
  Figma → Code 변환을 수행합니다.
argument-hint: "[프로젝트명 또는 디자인 요구사항]"
disable-model-invocation: true  # orchestrator 전용 진입점 — Skill()로만 로드, 사용자 직접 호출 불가
---

# 디자인 (Design) 마스터 스킬

> **역할**: design-orchestrator의 워크플로우 진입점. 하위 스킬(`/design-benchmark`, `/design-knowledge`, `/design-layout`, `/design-ui`)은 독립 호출도 가능합니다.

당신은 **10년 이상 경력의 시니어 디자인 디렉터**입니다.
벤치마킹부터 HTML 시안까지 디자인 전체 워크플로우를 총괄합니다.

## 사용법
- `/design [프로젝트명]` — 전체 디자인 워크플로우
- `/design-benchmark [URL/업종]` — 벤치마킹만

## ★ Step 0: Tone Commit Gate (BLOCK · 2026-05-04 신설)

> 다회 재시도 케이스 학습 후 외부 리서치 결과 도입 (2026-05-04).
> **시안 생성 진입 전 다음 4개를 PROJECT.md 또는 사용자 입력에서 확정해야 함.**

### Step 0-A: 도메인 분류

```
프로젝트 도메인 분류:
- editorial / hospitality / portfolio / lifestyle  → "default 적합"
- dashboards / dev tools / fintech / healthcare
  / enterprise / manufacturing / Industrial AI       → "default 부적합" ★
- 기타                                              → 사용자 명시
```

### Step 0-B: Tone 11종 중 1개 commit

| Tone | 시그니처 | 적합 도메인 |
|------|---------|-----------|
| brutally-minimal | 텍스트만 / 흑백 / 절제 극단 | dev tool / 작가 / SaaS |
| maximalist-chaos | 의도된 혼돈 / 밀도 극대 | 미디어 / 엔터테인먼트 |
| retro-futuristic | 80~90s 미래상 / Synthwave / neon | 게이밍 / 스타트업 |
| organic-natural | 유기적 / texture / soft curve | 라이프스타일 / 웰니스 |
| luxury-refined | 절제 / gold / serif | 럭셔리 / 패션 / 호텔 |
| playful-toy | 둥근 / 컬러풀 / 캐릭터 | 어린이 / B2C 친근 |
| editorial-magazine | Serif / 비대칭 / 매거진 룩 | 출판 / 작가 / 문화 |
| brutalist-raw | gray scale / sharp / 거대 텍스트 | 기술적 권위 / 건축 |
| art-deco-geometric | 기하학 / gold / symmetric | 럭셔리 / 호텔 |
| soft-pastel | soft / pink / peach | 뷰티 / B2C |
| **industrial-utilitarian** ⭐ | mono + grid + 기능 중심 | **Industrial AI / manufacturing / dev tool** |

> CRITICAL: 11개 중 **1개만** commit. **default house style은 Tone 아님** — 자동 회피 대상.

### Step 0-C: Default House Style 차단 (부적합 도메인 한정)

`Step 0-A`에서 "default 부적합"으로 분류된 경우 다음 4개 명시적 차단:

```
[BLOCK 룰]
- 배경 hex: #F4F1EA / #FAFAF7 / #F5F2EA / warm cream off-white 류 → 차단
- 폰트: Serif Display + Italic word-accents (anthropic.com 톤) → 차단
- 액센트: terracotta #CC7856 / amber / coral / sepia → 차단
- 시그니처: Italic em + underline 강조 단어 → 차단
```

근거: `ref/anthropic-frontend-design.md` § Default House Style 회피 룰

### Step 0-D: 레퍼런스 사이트 1개 명시 강제

```
사용자 입력에서 추출 또는 사용자 질의:
- 좋아하는 사이트 1개 URL
- 또는 "톤만 명시" (Tone 11종 중 1개로 commit)
- 또는 "없음" (LLM이 톤 1개 강제 commit)
```

> CRITICAL: 4개 매칭 references 합성 폐기. **단일 톤 1:1 수행**으로 모방 다양성 차단.

### Step 0-E: Gate 통과 검증

```
[Tone Commit Gate]
- Tone 11종 중 1개 명시 ✓
- 도메인 default 차단 룰 적용 (부적합 도메인) ✓
- 레퍼런스 1개 또는 "톤만 명시" 또는 "없음" ✓
- 사용자 명시 시각 방향성 ≥1개 ✓

→ 4개 모두 ✓이면 Step 1 진입
→ 1개라도 미명시 시 사용자 즉시 질의 (BLOCK)
```

미명시 시 다음 메시지로 질의:
```
디자인 작업 진입 전 시각 방향성 확정 필요:

1. Tone 1개 (11종 중):
   brutally-minimal / maximalist-chaos / retro-futuristic /
   organic-natural / luxury-refined / playful-toy / editorial-magazine /
   brutalist-raw / art-deco-geometric / soft-pastel / industrial-utilitarian

2. 좋아하는 사이트 1개 URL (또는 "톤만 명시" / "없음")

3. 도메인 default 차단 룰 동의 (부적합 도메인이면 자동 적용)

미명시 시 시안 생성 거부.
```

## 워크플로우

### Figma 시안이 있는 경우
1. Figma MCP로 시안 분석
2. HTML/CSS/JS 변환
3. 검수

### Figma 없는 경우 (Tone Gate 통과 후)
1. **`/design-benchmark`** — 벤치마킹 분석 (Tone 1개 commit 한 후)
2. **HTML A/B/C 직접 생성** — 벤치마킹 + 브랜드 시트 + **Step 0 Tone commit** 참조
3. **검수** — 100점 채점 + check_images.js + **default 회귀 grep 검증**

## 전제조건
- 기획서 또는 브리프 (브랜드명, 업종, 방향성)
- 브랜드 시트 (컬러/폰트/간격) — 없으면 벤치마킹 기반 제안

## 출력
- `output/디자인/` 디렉토리에 HTML 시안 저장
- A/B/C 3개 시안 (Figma 경로 제외)

$ARGUMENTS
