---
name: dkb-search
description: >
  DKB references + section-packs 매칭 검색 스킬. 프로젝트 컨텍스트(업종/타겟/우선축)에 매칭되는
  페이지 단위 references와 섹션 단위 packs(2026-05-04 신설)를 직교 매칭하여 design-replicate 입력으로 제공합니다.
  정적 매칭(LLM 호출 0회) 알고리즘. dkb-policy.md §1 References-First + §7 Section Packs의 실행 메커니즘.
  "DKB 검색", "references 매칭", "dkb-search", "레퍼런스 찾기", "참고 사이트 찾아줘", "비슷한 사이트",
  "벤치마크 찾아줘", "이런 느낌의 사이트" 등 디자인 시안 생성 직전 자동 호출.
argument-hint: "[--industry {업종} --target {타겟} --priority {축} --top {n} --section-packs hero,feature,pricing,footer --patterns hero,kpi,motion,color-systems,korean-typo]"
---

# DKB References + Section Packs 매칭 검색 (Dkb-Search)

당신은 **DKB references + section-packs 큐레이터**입니다. 정적 매칭으로 토큰 0 호출 가능.

## KnowQL 4축 매핑 (Pinecone Nexus 호환)

본 스킬은 Pinecone Nexus(2026-05-04)의 **KnowQL 선언적 쿼리 언어**와 동등한 4축 구조:

| KnowQL 축 | dkb-search 인자 | 역할 |
|-----------|----------------|------|
| **Intent** (질문, 응답 형태, 컨텍스트 범위) | `--industry`, `--target`, `--priority` | 검색 의도 명세 |
| **Filter** (결정론적 술어 + 접근 제어) | tier 가중, target 가중, Step 0.5 reject penalty | 후보 풀 좁히기 |
| **Provenance** (필드 수준 인용) | `dna_path`, `tokens_path`, `why_matched`, `essence` | 매칭 근거 추적 |
| **Control** (깊이/지연 시간 예산) | `--top`, `--section-packs`, `--patterns` | 검색 비용 통제 |

> 외부 검증: 사전 컴파일된 corpus + 4축 선언적 쿼리는 KRAFTBench에서 Agentic RAG 대비 정확도 +65%, 토큰 -86% 입증.
> 참조: `~/.claude/projects/d--SYS-v4/memory/project_rag_direction.md`

## 호출 시그니처

```
Skill: dkb-search --industry industrial-ai --target investor --priority signature --top 3 --section-packs hero,feature,pricing,footer
```

| 인자 | 설명 | 기본값 |
|------|------|------|
| `--industry` | 업종 (industrial-ai / frontier-ai / b2b-saas / korea-b2b / manufacturing-korea) | (필수) |
| `--target` | 1순위 타겟 (investor / executive / developer / consumer) | (선택) |
| `--priority` | 우선축 (signature / kpi-impact / korean-fit / trend) | signature |
| `--top` | 페이지 references 결과 수 | 3 |
| `--section-packs` | **(2026-05-04 신설)** 매칭할 섹션 카테고리 콤마 리스트 (hero / feature / pricing / footer / nav / testimonial). 비워두면 섹션 매칭 SKIP | (선택) |
| `--patterns` | **(2026-05-04 신설)** 매칭할 패턴 카테고리 콤마 리스트 (hero / kpi / case-study / partner-grid / motion / color-systems / korean-typo / korean-design-system). 비워두면 자동 매칭 (priority + industry 기반 추천) | (선택) |

## 동작 절차

### Step 0: dkb-config.json 로드

```
Read ~/.claude/dkb/dkb-config.json
```

업종별 tier 우선순위 + 등재 임계 확인.

### Step 0.5: Reject 페널티 로드 (2026-05-04 신설 · 동적 가중치)

```
Read ~/.claude/dkb/feedback/rejections.jsonl (없으면 SKIP)
```

각 라인 파싱 후 다음 페널티 맵 구성:

```
penalty_map[ref_path] = sum(
  reason_weight(reason_code) ×
  context_match_factor(this_query, event.context) ×
  time_decay(now - event.ts)
)
```

| 항목 | 룰 |
|------|---|
| `reason_weight` | `dkb/feedback/README.md` §reason_code 별 가중치 표 (tone_mismatch -3, domain_unfit -5, ...) |
| `context_match_factor` | 동일 industry+target+priority+tone → 1.0 / industry만 일치 → 0.6 / 무관 → 0.3 (글로벌 페널티만) |
| `time_decay` | ≤90일 → 1.0 / 90~180일 → 0.5 / >180일 → 0 (무시) |
| `누적 cap` | ref당 페널티 합계 절대값 ≤ 10 (overfit 방지) |

> rejections.jsonl 미존재 또는 빈 파일이면 penalty_map = {} (페널티 없음).
> Step 3 점수 계산 시 `final_score = base + tier + axis + target - penalty_map[ref_path] + bonus_map[ref_path]` 적용.

### Step 0.6: Lessons 보너스 로드 (2026-05-06 신설 · reviewer Experiment Ledger 연동)

```
Read ~/.claude/dkb/lessons/lessons.jsonl (없으면 SKIP)
```

각 라인 파싱 후 보너스 맵 구성:

```
bonus_map[ref_path] = sum(
  applicability_factor(this_query, lesson.applicable_to) × 0.1
)
```

| 항목 | 룰 |
|------|---|
| `applicability_factor` | 도메인 일치 + 모드 일치 → 1.0 / 도메인만 일치 → 0.5 / 무관 → 0 |
| `누적 cap` | ref당 보너스 합계 ≤ 1.0 (과적합 방지) |

> lessons.jsonl 미존재 또는 빈 파일이면 bonus_map = {} (보너스 없음).
> Lessons는 winning_approach가 명시한 references만 보너스 부여 (discarded_approaches는 무시).

### Step 1: 업종 매핑 조회

```
Read ~/.claude/dkb/industries/{industry}.md
```

후보 references 풀 추출. 미존재 업종이면:
- `frontier-ai` 또는 `b2b-saas` fallback
- 사용자에게 업종 매핑 작성 권고

### Step 2: references 글로브

```
Glob ~/.claude/dkb/references/{tier-1|tier-2|tier-3}/*/DNA.md
```

매칭된 사이트 목록 추출.

### Step 3: 우선순위 정렬

각 reference DNA.md에서 18축 채점 + tier 가중치 + Step 0.5 페널티 차감:

```
final_score = base_score(18축) + tier_weight + axis_weight + target_weight + archetype_weight - penalty_map[ref_path] + bonus_map[ref_path]
```

> penalty_map은 Step 0.5에서 사전 계산된 reject 페널티. 미존재 시 0.
> bonus_map은 Step 0.6에서 사전 계산된 lessons 보너스. 미존재 시 0.
> archetype_weight는 dkb-config.json `archetype_mapping`과 매칭한 가중. 미존재 시 0.

### archetype_weight 계산 (2026-05-15 v1.1 신설)

쿼리 컨텍스트(`--archetype` 인자 또는 PROJECT.md에서 추론)와 reference DNA.md frontmatter `interaction_archetype` 일치 시 가중 적용:

| 매칭 | 가중 |
|------|:---:|
| 동일 archetype + 동일 industry_fit | +1.5 |
| 동일 archetype만 | +1.0 |
| industry_fit만 일치 | +0.3 |
| 불일치 | 0 |
| reference에 `interaction_archetype` 부재 (legacy 미마이그레이션) | 0 (페널티 없음, backward-compat) |

> 쿼리에 `--archetype` 미지정 시: dkb-config.json `archetype_mapping` 표에서 industry_fit 기반 추론. 추론 실패 시 archetype_weight = 0.

| 우선축 | 가중치 적용 |
|--------|------------|
| `signature` | L4-2 시그니처 요소 + L3-3 모션 의도 가중 |
| `kpi-impact` | L1-2 컬러 절제 + L4-1 콘텐츠 무게 + L3-1 비대칭 가중 |
| `korean-fit` | L2-3 한글 타이포 + tier-3 가중 |
| `trend` | L1-4 Trend Currency + L1-3 Color Subtlety 가중 |

타겟 가중치:
| 타겟 | 가중치 |
|------|--------|
| `investor` | tier-1 + signature axes 1.3× |
| `executive` | tier-1 + L4-1 콘텐츠 무게 1.2× |
| `developer` | tier-2 + L1-4 Trend Currency 1.3× |
| `consumer` | tier-3 + L3-5 모바일 1.3× |

### Step 4: Top N 선정 + 다양성 검증

상위 N개 추출. **다양성 검증** (Premortem #2 차단):
- Top N의 시그니처가 모두 비슷하면 (예: 모두 다크 미니멀) 1~2개 강제 교체
- 강제 교체 후보: 반대 톤의 차순위 references

### Step 4.5: Section Packs 매칭 (2026-05-04 신설 · `--section-packs` 인자 시)

`--section-packs hero,feature,pricing,footer` 형식 인자가 주어지면 페이지 references와 **직교 차원**으로 섹션 단위 packs를 매칭한다.

```
For each section_category in --section-packs:
  Glob ~/.claude/dkb/section-packs/{section_category}/*/PACK.md
  → 카테고리당 Top 2~3 선정 (간이 6축 채점: Visual Hierarchy / Motion DNA / CSS-Native / Layout Originality / Color Coherence / Code Skeleton)
```

**산출 의무**: design-replicate가 V3(비판 대안)·V4(건설 대안) 생성 시 섹션 packs 조합 활용하도록 출력 페이로드에 `matched_section_packs[]` 포함.

### Step 4.6: Patterns 매칭 (2026-05-04 신설 · `--patterns` 인자 또는 자동 매칭)

`patterns/`는 references DNA에서 추출한 **시그니처 단위** 미니 라이브러리 (8개 카테고리):

| 카테고리 | 패턴 수 | 적용 |
|---------|--------|------|
| `hero` | 5 | Hero 섹션 시그니처 (editorial-italic-em, kpi-dark-monogrid, bento-gradient-mesh, cute-mascot-multicolor, nature-fullbleed-widget) |
| `kpi` | 3 | 정량 임팩트 (linear-giant-numbers, augury-dark-navy-box, c3-trust-metrics) |
| `case-study` | 2 | 케이스 그리드 (vercel-before-after, locomotive-case-grid) |
| `partner-grid` | 2 | 신뢰 시그널 (makinarocks-korean-logos, superb-ai-nvidia-badge) |
| `motion` | 3 | 모션 (locomotive-scroll-jacking, stripe-mesh-shift, shadcn-css-native) |
| `color-systems` | 3 | 컬러 (anthropic-off-white, scale-pure-black, lgcns-mint-pastel) |
| `korean-typo` | 3 | 한글 타이포 (lgcns-dual-h1, visitseoul-multilingual, wanted-sans-typography) |
| `korean-design-system` | 1 | 한국 디자인 시스템 (wanted-design-system) |

**자동 매칭 모드** (`--patterns` 미지정 시):
- `--priority signature` → `hero` + `motion` 자동 매칭
- `--priority kpi-impact` → `kpi` + `case-study` + `partner-grid` 자동 매칭
- `--priority korean-fit` → `korean-typo` + `korean-design-system` + `color-systems` 자동 매칭
- `--priority trend` → `hero` + `motion` + `color-systems` 자동 매칭

**매칭 알고리즘**:
```
For each pattern_category in (--patterns 또는 자동 매칭 카테고리):
  Glob ~/.claude/dkb/patterns/{pattern_category}/*.md (INDEX.md 제외)
  → 각 PATTERN.md frontmatter `domains[]` 파싱
  → industry/target과 domain 매칭 점수 계산:
     - 정확 매칭: +3 (예: industry="korean-public-tourism", domain="한국 공공")
     - 카테고리 매칭: +1 (예: B2B → B2B SaaS)
  → 차단 조건 체크 (## 차단 조건 섹션) — 매칭 시 -10
  → 카테고리당 Top 1~2 선정
```

**산출 의무**: 출력 페이로드에 `matched_patterns[]` 포함. design-replicate가 V1/V3/V4 생성 시 시그니처 토큰 (Hero motion, KPI 스타일, 컬러 시스템) 직접 활용.

### Step 5: 결과 출력

```json
{
  "matched": [
    {
      "site": "anthropic.com",
      "tier": "tier-1",
      "score": 142,
      "dna_path": "~/.claude/dkb/references/tier-1/anthropic.com/DNA.md",
      "tokens_path": "~/.claude/dkb/references/tier-1/anthropic.com/tokens.css",
      "why_matched": "Off-white + Serif Editorial — investor target signature 1순위",
      "essence": "AI 회사가 출판물처럼 보일 때 권위가 생긴다"
    },
    ...
  ],
  "matched_section_packs": [
    {
      "category": "hero",
      "pack": "split-screen-investor",
      "pack_path": "~/.claude/dkb/section-packs/hero/split-screen-investor/PACK.md",
      "score": 78,
      "why_matched": "Motion DNA + CSS-Native 우수, investor 톤 적합",
      "uses_css_native": ["@view-transition", "animation-timeline"]
    },
    {
      "category": "pricing",
      "pack": "anchor-comparison-table",
      "pack_path": "~/.claude/dkb/section-packs/pricing/anchor-comparison-table/PACK.md",
      "score": 74,
      "why_matched": "Anchor Positioning + popover로 비교 UX 우수",
      "uses_css_native": ["anchor-name", "popover"]
    }
  ],
  "matched_patterns": [
    {
      "category": "hero",
      "pattern": "kpi-dark-monogrid",
      "pattern_path": "~/.claude/dkb/patterns/hero/kpi-dark-monogrid.md",
      "match_score": 6,
      "why_matched": "industrial-ai domain 정확 매칭 + investor target signature axis"
    },
    {
      "category": "kpi",
      "pattern": "augury-dark-navy-box",
      "pattern_path": "~/.claude/dkb/patterns/kpi/augury-dark-navy-box.md",
      "match_score": 5,
      "why_matched": "Industrial AI 도메인 + 정량 임팩트"
    },
    {
      "category": "motion",
      "pattern": "shadcn-css-native",
      "pattern_path": "~/.claude/dkb/patterns/motion/shadcn-css-native.md",
      "match_score": 4,
      "why_matched": "B2B 톤 + 접근성 우선 모션"
    }
  ],
  "diversity_check": "PASS (3종 시그니처 차별화: Editorial Serif / KPI Dark / Bento Neon)",
  "section_packs_used": true,
  "patterns_used": true,
  "fallback_used": false,
  "reject_penalty_applied": {
    "tier-1/anthropic.com": -3,
    "tier-2/scale.com": 0
  },
  "feedback_alert": []
}
```

> `matched_section_packs[]`는 `--section-packs` 인자 부재 시 빈 배열. design-replicate가 자동으로 V1(페이지 references 충실) / V3·V4(섹션 packs 조합)로 분기 활용.

### Step 6: 매칭 0건 처리

references 매칭 0건 시:

```
⚠ DKB references 매칭 0건

업종: {industry}
검색 경로: ~/.claude/dkb/references/{tier-1,tier-2,tier-3}/
결과: 0개

해결 방법 (택 1):
1. dkb-analyze 수동 트리거로 후보 사이트 등재:
   "Skill: dkb-analyze https://anthropic.com" 등
2. 다른 업종으로 재시도 (frontier-ai / b2b-saas / korea-b2b)
3. design-replicate 단독 실행 (DKB 미사용 — Speed Mode 권고)

권장: 1번 (시드 4~6개 등재)
- frontier-ai: anthropic.com / cohere.com
- b2b-saas: linear.app / vercel.com
- industrial-ai: augury.com / scale.com
- korea-b2b: toss.tech / makinarocks.ai
```

### Step 7: Reject 기록 API (2026-05-04 신설 · 동적 가중치 입력)

dkb-search 호출 시 인자 `--reject <ref_path> --reason <code> [--reason-text "..."]`가 주어지면 매칭 대신 **reject 이벤트를 append**하고 종료한다.

| 인자 | 설명 | 필수 |
|------|------|:---:|
| `--reject` | 자산 절대 경로 (`~/.claude/dkb/references/...`) | ✓ |
| `--reason` | reason_code (tone_mismatch / domain_unfit / visual_overlap / user_taste / duplicate_signature / other) | ✓ |
| `--reason-text` | 자유 서술 | - |
| `--source` | user / orchestrator / reviewer (기본 user) | - |
| `--context` | JSON 문자열 — `{"industry":"...","target":"...","priority":"...","tone":"..."}` | - |

처리:
```
1. ref_path 존재 검증 (Read 시도) — 미존재 시 에러
2. reason_code 6종 화이트리스트 검증
3. 한 줄 JSON 객체 구성 (스키마: ~/.claude/dkb/feedback/README.md)
4. Bash: append 한 줄 → ~/.claude/dkb/feedback/rejections.jsonl
5. stats.json 자동 트리거 (50건 단위):
   LINES=$(wc -l < ~/.claude/dkb/feedback/rejections.jsonl)
   if [ $((LINES % 50)) -eq 0 ] && [ $LINES -ge 50 ]; then
     # aggregate-stats.js 또는 inline JS로 stats.json 재생성
     # 자세한 절차는 ~/.claude/dkb/feedback/README.md "stats.json 자동 생성 트리거" 참조
   fi
6. 결과 출력:
   {
     "logged": true,
     "ref_path": "...",
     "reason_code": "...",
     "total_rejects_for_ref": 3,
     "next_penalty_estimate": -6,
     "stats_regenerated": true | false
   }
```

> orchestrator는 시안 검수에서 사용자 BLOCK 신호를 받으면 본 API를 자동 호출.
> 수동 호출 예: `Skill: dkb-search --reject ~/.claude/dkb/references/tier-1/anthropic.com/DNA.md --reason tone_mismatch --reason-text "프로젝트 톤이 brand-safe인데 너무 editorial"`

## 출력 형식

JSON 또는 콜링 에이전트가 사용 가능한 구조:
- `matched[]` — 시안 생성 입력 (design-replicate)
- `diversity_check` — 시그니처 차별화 검증 결과
- `fallback_used` — 업종 매핑 미존재 시 fallback 여부

## 예시

### 사용 시나리오 (Industrial AI 예시)

```
입력: --industry industrial-ai --target investor --priority signature,kpi-impact --top 3

처리:
1. industries/industrial-ai.md 로드 (tier 우선순위: tier-2 → tier-1 → tier-3)
2. Glob ~/.claude/dkb/references/{tier}/ → 매칭된 사이트
3. 18축 채점 + tier 가중 + signature axes 가중 + investor target 가중
4. Top 3 선정 + 다양성 검증

출력 (시드 등재 후 가정):
- 1순위: anthropic.com (tier-1, 142, Editorial Signature)
- 2순위: linear.app (tier-1, 138, KPI Dark)
- 3순위: augury.com (tier-2, 124, Industrial Domain)
```

## 토큰

**0회 LLM 호출**. 정적 파일 읽기 + 정렬 + 매칭. dkb-policy.md §4 토큰 절약 정책의 핵심.

## 핸드오프

### 입력
- `~/.claude/dkb/dkb-config.json` (정책)
- `~/.claude/dkb/industries/{industry}.md` (업종 매핑)
- `~/.claude/dkb/references/{tier}/*/DNA.md` (등재된 references)

### 출력 (design-replicate가 받음)
- `matched[].dna_path` → DNA.md 경로
- `matched[].tokens_path` → tokens.css 경로
- `matched[].essence` → 본질 1줄
- `matched[].why_matched` → 매칭 근거
- `matched_section_packs[]` → 섹션 단위 PACK.md 경로 + Code Skeleton (V3/V4 활용)
- `matched_patterns[]` → 시그니처 단위 PATTERN.md 경로 + 적용 가이드 (V1/V3/V4 활용)

## Self-Check

| # | 검증 | 기준 |
|---|---|---|
| 1 | dkb-config.json 로드 | 성공 |
| 2 | industries/{industry}.md 로드 | 성공 또는 fallback |
| 3 | references 글로브 | 1개+ 매칭 (0건 시 §Step 6 처리) |
| 4 | Top N 선정 | N개 정확 추출 |
| 5 | 다양성 검증 | PASS 또는 강제 교체 |

## 참조

- `lib/rules/dkb-policy.md` §1 References-First
- `~/.claude/dkb/INDEX.md` — DKB 마스터 인덱스
- `agents/design-orchestrator.md` Step 2B-2.7 — 호출 진입점
- `skills/design-replicate` v2.0 — 결과 수신 스킬
- `skills/dkb-analyze` — references 등재 (시드 부족 시)

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **LLM 호출로 매칭**: dkb-policy.md §1 "정적 매칭, LLM 호출 0회" 원칙 위반. 점수 계산은 결정론적 함수만.
- ❌ **References-First 위반**: section-packs만 검색하고 references 생략 → 페이지 단위 DNA 손실. references 우선 + packs 보충.
- ❌ **reject 페널티 미적용**: rejections.jsonl 미참조 → 거부된 references 반복 추천. Step 0.5에서 reject 페널티 적용 의무.
- ❌ **컨텍스트 부정확**: 업종/타겟/우선축 키 누락 또는 추측 → 매칭 정확도 ↓. PROJECT.md 또는 사용자 명시 컨텍스트만 사용.
- ❌ **시드 부족 시 매칭 강행**: references 풀 < 5개인데 강제 매칭 → 결과 신뢰도 낮음. dkb-analyze 호출 권고 후 중단.
- ❌ **3개 미만 출력**: design-replicate가 V1/V3/V4 3종 관점 요구 → 검색 결과 3개 미만이면 관점 다양성 실패. 최소 3개 보장 또는 명시 부족 보고.
