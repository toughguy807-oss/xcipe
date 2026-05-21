---
name: design-replicate
description: >
  DKB references 1개 → V1 충실/V3 비판 대안/V4 건설 3종 관점 시안.
  AX_D_P 5종(V1~V5) → 3종 압축 (Claude-only 정책). "참고했음" 모방 다양성이 아닌 "관점 다양성"으로 평균값 회귀 차단.
  "복제", "replicate", "참고했음", "관점 다양성", "5종 프롬프트", "V1 V3 V4", "design-replicate"
  맥락에서 자동 호출.
argument-hint: "[프로젝트 경로 또는 references 경로]"
---

# 레퍼런스 3종 관점 시안 (Design-Replicate v2.1) Generator

당신은 **시니어 웹 디자이너 + Creative Director**입니다.

벤치마크가 결과물에 반영되도록 **1개 reference의 본질을 3가지 관점으로 재해석**합니다. 9개 사이트 1:1 복제(모방 다양성)는 평균값 회귀를 유발하므로 **금지**.

## ★ Step 0: Pre-Generation Gate (BLOCK · 2026-05-04 신설 v2.1)

> 모든 디자인 시안 생성 진입 전 다음 4개 모두 ✓이어야 함.
> 1개라도 미충족 시 **즉시 중단 + 사용자 질의 + 시안 생성 거부**.

### Gate 검증 체크리스트

| # | 항목 | 검증 방법 | 미충족 시 |
|---|------|---------|---------|
| 1 | **PROJECT.md.시각방향성 작성** | `grep -E "Tone 11종.*1개 commit|Q-V2.*[xX✓]" PROJECT.md` | "사용자 PROJECT.md §시각 디자인 방향성 작성 후 재진입" 메시지 |
| 2 | **Tone 1개 명시** | 사용자 메시지 또는 PROJECT.md에서 11종 중 1개 추출 가능 | "Tone 11종 중 1개 commit 필수" 질의 |
| 3 | **dkb-search 실행** | `~/.claude/dkb/dkb-config.json` Tone matching 표 적용 | dkb-search 직접 호출 |
| 4 | **references DNA + tokens.css 입력 완료** | 매칭된 references의 DNA.md + tokens.css 직접 Read 호출 흔적 확인 | references Read 강제 |

### Anti-Pattern (자가 발명 차단)

LLM이 Tone 라벨만 받고 references 우회 시 발생하는 패턴:
- Tone commit ✓ + dkb-search ❌ + DNA Read ❌ → **LLM 머릿속 가족 변주** (이전 시안과 본질 동일)
- references 1개 매칭 + 자가 발명 추가 → **합성 후퇴 → 평균값**

→ Tone commit만으로 부족. **dkb-search → DNA 입력 → 토큰 1:1 적용**이 진짜 차단 메커니즘.

> 검증 사례 학습: `~/.claude/projects/c--Users-hj-moon--claude/memory/feedback_default_house_style_failures.md`

### Gate 통과 시 흐름

```
1. PROJECT.md §시각 디자인 방향성 확정 ✓
2. Tone 1개 추출 ✓
3. Skill: dkb-search --tone {tone} --industry {industry} 호출
   → dkb-config.json tone_mapping 표 적용
   → primary references 1~2개 매칭
4. 매칭된 references DNA.md + tokens.css Read 호출
   → 컬러 hex / 폰트 / 간격 / 시그니처 직접 입력
5. design-replicate 진입 (V1 충실 1순위, V3/V4는 사용자 선택 시만)
6. PostToolUse hook이 default 회귀 grep 자동 검증
```

### Tone과 references 매칭 부재 시

`dkb-config.json` `tone_mapping`에서 `primary: []`인 톤 (maximalist-chaos / organic-natural / luxury-refined / art-deco-geometric):

```
사용자 결정 필요:
A) dkb-analyze로 새 references 등재 후 진입
B) 톤 변경 (primary references 보유한 톤으로)
C) 작업 중단

LLM 자가 발명 절대 금지 (가족 변주 위험).
```

## v2.0 변경 (2026-04-30)

| | v1.0 (어제 작성) | v2.0 (현재) |
|---|---|---|
| 다양성 전략 | 3개 사이트 1:1 복제 (모방) | 1개 reference → 3종 관점 (V1/V3/V4) |
| 결과 | 9개 갤러리 사고 (평균값 회귀) | 명시적 차별화 (충실 vs 대안 vs 건설) |
| 토큰 | 5×+ (시안 복제) | 1.5× (3종 압축) |
| 출처 | design-bench-scrape (2026-05-18 dkb-analyze 흡수) | DKB references DNA |

## 배경

기존 파이프라인 사고:
- 다회 재시도 케이스 (manufacturing AI 등): 벤치마크 분석만 하고 결과 미반영
- 9개 갤러리 (2026-04-30): 9개 사이트 표면 모방 → 모두 거지같음
- 본질: **모방 다양성으로는 평균값. 관점 다양성이어야 차별화**

본 v2.0은 **AX_D_P 5종 시스템 흡수 + 토큰/Claude-only 정책으로 3종 압축**.

## 전제조건 (Stop 조건)

- **필수**: DKB references 1개 이상 (`~/.claude/dkb/references/{tier}/{site}/DNA.md`)
- **필수**: 프로젝트 콘텐츠 (PROJECT.md)
- **권장**: 브랜드 시트 (컬러/폰트 토큰)
- **권장**: input/ 의 실제 이미지 자산

> references 매칭 0건이면 STOP. dkb-search 실행 → 매칭 사이트 등재(dkb-analyze) 후 진행.

## 권장 CLI/MCP 도구

| 단계 | 도구 | 용도 | 필수 |
|------|------|------|:---:|
| references 검색 | dkb-search | 프로젝트 컨텍스트 매칭 | 필수 |
| 18축 채점 | publish-visual-verify --mode=design | 3종 시안 채점 | 필수 |
| 이미지 검색 | WebSearch | 콘텐츠 교체용 실사 | 권장 |
| Vision 채점 | Claude Sonnet vision | 3종 동시 입력 1회 호출 | 필수 |

## 핵심 원칙

1. **References-First**: DKB references DNA 기반 (벤치마크 무시 LLM 직접 생성 금지)
2. **3종 관점 (V1/V3/V4)**: 같은 reference를 3가지 다른 뇌로 재해석
3. **본질 보존**: reference DNA의 "L4 시그니처 + L3 구성 논리"를 3종 모두에 보존
4. **콘텐츠 동일**: 3종 모두 PROJECT.md 콘텐츠 사용 (헤드라인/CTA/텍스트 일치)
5. **차별화 명시**: 각 시안의 [APPROACH NOTES] 주석으로 관점 차이 명확
6. **추적성 필수**: PROMPT-NOTE.md에 reference 어느 영역을 어떻게 가져왔는지 추적

## 3종 관점 정의

### V1 — 충실 (Faithful)

**철학**: reference DNA에 가장 충실하게. Tone·여백·타이포·컬러를 references DNA 그대로 적용 + PROJECT 콘텐츠만 교체.

**적용 영역**:
- L1 표면 토큰: references 100% 적용
- L2 정밀도: references 100% 적용 (여백 비율, 타이포 위계)
- L3 구성 논리: references 90%+ 적용
- L4 본질: references 시그니처 그대로 흡수

**차별화 축**: 안전한 충실. 사용자 의도가 "이 reference 톤 그대로"일 때 적합.

### V3 — 비판 대안 (Alternative)

**철학**: V1의 한계를 비판하고 **완전히 다른 접근**. reference의 L4 본질은 보존하되 L1~L3는 정반대 시도.

**대안 매트릭스** (V1 vs V3):

| 영역 | V1 | V3 |
|------|------|------|
| 톤 | 다크/시네마틱 → V3는 라이트/오가닉 |
| 레이아웃 | 풀블리드/몰입형 → V3는 그리드/에디토리얼 |
| 인터랙션 | GSAP 헤비 → V3는 CSS 네이티브/미니멀 |
| 미디어 | 영상 풀블리드 → V3는 사진/일러스트 |
| 내러티브 | 제품 쇼케이스 → V3는 스토리텔링 |

**원칙**:
- V1이 다크면 V3는 라이트
- V1이 모션 헤비면 V3는 타이포 중심
- V1이 미니멀이면 V3는 에디토리얼
- V1이 전통적 IA면 V3는 비선형/실험적

**차별화 축**: 과감한 대안. "이 방향이 맞는지 다른 시도 해보자"일 때 적합.

### V4 — 건설적 (Constructive)

**철학**: V1을 70% 유지 + 약점 30%만 개선. **부분 수정과 강화**에 집중.

**Change Ratio**: 유지 70% / 변경 30%

**적용 매트릭스** (V1 → V4):

| V1 약점 | V4 개선 |
|--------|--------|
| 모바일 충실도 부족 | 모바일 전용 시그니처 추가 (L3-5) |
| 한글 타이포 처리 미흡 | font-feature-settings + word-break: keep-all (L2-3) |
| LCP 시각 임팩트 약함 | Skeleton + 단계적 등장 (L3-6) |
| 인터랙션 디테일 0 | hover delay + focus-ring + easing 차별 (L3-4) |

**원칙**:
- V1 핵심 디자인 의도 보존
- 발견된 약점만 정밀 보완
- "Change ratio: 70% kept, 30% improved" 명시

**차별화 축**: 안전한 진화. "V1 좋은데 한국 B2B 약점만 보완"일 때 적합.

## V1/V3/V4 Tone Assignment (2026-05-04 신설 · Tone 추천 엔진 결과 활용)

design-orchestrator Step 0-D.2 Tone Commit Gate에서 결정된 **Top 3 Tone**을 perspective 다양성에 1:1 매핑한다. 동일 Tone으로 V1/V3/V4 모두 생성하는 것은 관점 다양성 부족 → 모방 다양성 회귀 위험.

### Tone 배정 규칙

| Perspective | 사용 Tone | 의도 |
|-------------|----------|------|
| **V1 충실** | Top 3의 **#1 (Selected)** Tone | 사용자가 선택한 Tone 100% 충실 — 안전선 |
| **V3 비판 대안** | Top 3의 **#3 (대조 후보)** Tone | Selected와 가장 거리 먼 Tone — 평균값 회귀 차단 |
| **V4 건설** | Top 3의 **#2 (인접 후보)** Tone | Selected와 인접한 Tone — V1 70% 유지 + 인접성으로 부드러운 변주 |

### 예시 (Top 3 = ["refined", "editorial", "brand-safe"])

| Perspective | Tone | 적용 |
|-------------|------|------|
| V1 | refined | Selected — 정확 충실 |
| V3 | brand-safe | 대조 — refined의 정제미 vs brand-safe의 평이함 정반대 시도 |
| V4 | editorial | 인접 — refined와 editorial은 둘 다 출판 톤, 부드러운 변주 |

### Tone 입력 누락 시 fallback

design-orchestrator가 `tone_assignment`를 명시 전달하지 않으면:
- V1 = PROJECT.md 시각 디자인 방향성 Tone 1개
- V3 = V1과 11종 카탈로그상 가장 거리 먼 Tone 자동 선정 (예: refined ↔ brutalist)
- V4 = V1과 카탈로그상 인접 Tone (Aesthetic Direction 슬래시 그룹 기준)

### 금지

- 3종 perspective 모두 동일 Tone 사용 금지 (관점 다양성 0)
- Top 3 외 Tone 임의 선정 금지 (Tone 추천 엔진 결과 우회)
- design-orchestrator의 `tone_assignment` 메타를 무시하고 LLM 자가 판단 금지

### 핸드오프

design-replicate 산출물 META `tone_assignment` 필드에 다음 형식 기록 (handoff-schema §Design 참조):

```json
"tone_assignment": {"V1": "refined", "V3": "brand-safe", "V4": "editorial"}
```

## 작성 절차

### Step 0: DKB references 매칭

`Skill: dkb-search` 실행:

```
dkb-search --industry {project.industry} --target {project.target} --priority {axis} --top 1
```

출력: 매칭된 reference 1개 (예: anthropic.com 142/180)

### Step 1: reference DNA 로드

```
Read ~/.claude/dkb/references/tier-1/{site}/DNA.md
```

DNA.md 구조 확인:
- 본질 1줄
- 18축 채점
- 정확 토큰 (L1)
- 측정 디테일 (L2)
- 구성 논리 (L3)
- 시그니처 요소 (L4)
- 프로젝트 적용 가이드

### Step 2: 프로젝트 콘텐츠 매핑

`PROJECT.md` 로드 → 각 V 시안에 적용할 콘텐츠 매핑:

| 영역 | 콘텐츠 |
|------|------|
| Hero | headline / subhead / primary CTA |
| About | 회사 소개 / 4-step 프로세스 |
| Service | 서비스 설명 |
| Cases | Before/After 케이스 |
| Numbers | KPI 수치 |
| Partners | 파트너 로고 |
| Contact | 문의 카피 + 폼 |

### Step 3: V1 충실 시안 생성

reference DNA 기반 + PROJECT 콘텐츠 + L1·L2·L3·L4 그대로 적용.

**저장**: `output/design/디자인_{프로젝트}_V1_faithful.html`

**상단 주석**:
```html
<!--
[V1 — Faithful Approach]
Reference: {site} (DKB tier-1, 142/180)
Approach: reference DNA에 충실하게 콘텐츠만 교체
Change Ratio: ~5% (콘텐츠/이미지/브랜드 컬러만 변경)
-->
```

### Step 4: V3 비판 대안 시안 생성

V1 비판 + 대안 매트릭스 적용 → 정반대 톤·레이아웃·인터랙션.

**비판 분석 작성**:
```markdown
## V1 비판 분석

### 강점
1. {V1의 인정할 점}
2. ...

### 약점 및 한계
1. {약점}: {설명} → {대안 방향}
2. ...

### 놓친 기회
1. {기회}: {설명}

### 리스크
1. {리스크}: {설명}
```

**대안 전략 매트릭스 작성**:
| 영역 | V1 접근 | V3 대안 접근 | 근거 |
|------|---------|-------------|------|
| 톤 | {V1} | {V3} | {근거} |
| 레이아웃 | {V1} | {V3} | {근거} |
| 인터랙션 | {V1} | {V3} | {근거} |
| 기술 | {V1} | {V3} | {근거} |
| 내러티브 | {V1} | {V3} | {근거} |

**저장**: `output/design/디자인_{프로젝트}_V3_alternative.html`

**상단 주석**:
```html
<!--
[V3 — Alternative Approach]
Reference: {site} (V1과 동일)
Critique Summary:
  - {V1 약점 1}
  - {V1 약점 2}
  - {V1 약점 3}
Alternative Design Philosophy:
  "{대안 디자인 철학 한 줄}"
Key Differentiators from V1:
  - {차이 1}: {V1} → {V3}
  - {차이 2}: {V1} → {V3}
  - {차이 3}: {V1} → {V3}
Why This Alternative Works:
  {대안이 효과적인 이유 2-3문장}
-->
```

### Step 5: V4 건설적 시안 생성

V1 70% 유지 + 약점 30% 개선. 한국 B2B 4축(L2-3 한글 / L3-4 인터랙션 / L3-5 모바일 / L3-6 LCP) 우선 보완.

**저장**: `output/design/디자인_{프로젝트}_V4_constructive.html`

**상단 주석**:
```html
<!--
[V4 — Constructive Approach]
Reference: {site} (V1과 동일)
V1 Acceptance (Kept Elements ~70%):
  - {수용 요소}: {유지 이유}
V1 Improvements (Modified Elements ~30%):
  - {개선}: {V1 약점} → {V4 개선} — Rationale: {근거}
Design Philosophy:
  "{V4 접근 철학}"
Change Ratio: ~70% kept, ~30% improved
-->
```

### Step 6: PROMPT-NOTE.md 작성 (필수)

추적성 보장:

```markdown
# Prompt Note — {프로젝트}

생성일: {YYYY-MM-DD}
시안 수: 3 (V1 + V3 + V4)
Reference: {site} (DKB {tier}, {n}/180)

## V1 충실
- Approach: reference DNA에 충실하게 콘텐츠만 교체
- Change Ratio: ~5%
- 출력: `디자인_{프로젝트}_V1_faithful.html`

## V3 비판 대안
- Approach: V1 비판 + 정반대 접근
- Critique Summary: {3가지}
- Alternative Philosophy: "{한 줄}"
- Key Differentiators: {3가지}
- 출력: `디자인_{프로젝트}_V3_alternative.html`

## V4 건설적
- Approach: V1 70% 유지 + 30% 개선
- Kept: {V1 강점}
- Improved: {약점 → 개선}
- 출력: `디자인_{프로젝트}_V4_constructive.html`

## 콘텐츠 매핑
- 모든 시안 동일 콘텐츠 (PROJECT.md 기반)
- Hero: {headline}
- CTA: {primary} / {secondary}
- Numbers: {KPI 수치}

## 다음 단계
- design-orchestrator Step 3-0 자동 진입
- publish-visual-verify --mode=design 18축 채점
- 145+ PASS 시 사용자 비교 + 최고점 시안 선정
```

## 출력 규칙

### 파일 위치

```
output/design/
├── 디자인_{프로젝트}_V1_faithful.html
├── 디자인_{프로젝트}_V3_alternative.html
├── 디자인_{프로젝트}_V4_constructive.html
└── PROMPT-NOTE.md
```

### 검증 체크리스트 (자가 검증)

- [ ] 3개 HTML 모두 동일 콘텐츠 (텍스트 비교 시 일치)
- [ ] 3개 HTML이 명확히 다른 디자인 철학 (V1 충실 / V3 정반대 / V4 부분 개선)
- [ ] 각 HTML 상단에 [APPROACH NOTES] 주석 존재
- [ ] PROMPT-NOTE.md에 비판 분석 + 대안 매트릭스 + Change Ratio 명시
- [ ] reference DNA 토큰 적용 (Anti-Slop 폰트 0건)
- [ ] 이미지 src 모두 유효 (placeholder 0건)
- [ ] V1·V3·V4 시그니처 요소 보존 (reference L4 본질)

## V5 큐트 (조건부 — 사용자 명시 시만)

토큰 절약 정책으로 V5 큐트는 **3종 기본에서 제외**. 사용자가 "큐트하게 해줘", "친근하게" 명시 시만 V5 추가 생성:

```markdown
[V5 — Cute Trend Approach]
Cute Design Direction: "{귀여운 디자인 철학}"
Applied Cute Trends:
  - {cute trend}: {적용 방식}
Cuteness Level: {세련된/풍부한/절제된/스마트}
```

## 핸드오프

### 입력 (DKB → Replicate)
```
~/.claude/dkb/references/{tier}/{site}/DNA.md  (DKB references 본질)
~/.claude/dkb/references/{tier}/{site}/tokens.css  (정확 토큰)
PROJECT.md  (프로젝트 콘텐츠)
input/  (이미지 자산)
```

### 출력 (Replicate → Visual Verify → Orchestrator)
```
output/design/
├── 디자인_*_V1_faithful.html
├── 디자인_*_V3_alternative.html
├── 디자인_*_V4_constructive.html
└── PROMPT-NOTE.md
```

design-orchestrator가 이 3종을 publish-visual-verify --mode=design 18축으로 동시 채점하고, 145+ 최고점 시안을 자동 선정.

### decisions[] 필수 적용 (2026-05-11 신설)

본 스킬은 **Decision Log 필수 적용 스킬**. 각 V1/V3/V4 perspective의 비자명한 결정을 PROMPT-NOTE.md 하단 META 블록에 기록:

```html
<!-- META {
  "skill": "design-replicate",
  "decisions": [
    {
      "id": "DEC-001",
      "topic": "v1_reference_choice",
      "chosen": "tier-1/anthropic.com",
      "alternatives_considered": ["tier-1/linear.app", "tier-2/scale.com"],
      "reasoning": "industrial-ai + brand-safe 컨텍스트 + refined Tone에 최적 매칭. DKB 점수 +12",
      "source": "reference_dna",
      "reversibility": "hard"
    },
    {
      "id": "DEC-002",
      "topic": "v3_critique_axis",
      "chosen": "compress_hero_layout",
      "alternatives_considered": ["change_color_palette", "remove_animation"],
      "reasoning": "V1의 hero가 768px+. 모바일 first 비판 — fold 위 CTA 도달 시간 우선",
      "source": "orchestrator_default",
      "reversibility": "easy"
    },
    {
      "id": "DEC-003",
      "topic": "v4_construction_direction",
      "chosen": "add_dashboard_widget",
      "alternatives_considered": ["expand_features_grid", "add_pricing"],
      "reasoning": "프로젝트 PROJECT.md의 KPI = '전환율'. dashboard widget으로 직접 측정 지원",
      "source": "user_request",
      "reversibility": "medium"
    }
  ]
} -->
```

**적용 영역**:

| 결정 영역 | topic 값 | source 분포 |
|---|---|---|
| reference 선택 | `v1_reference_choice` | reference_dna |
| Tone 배정 | `v1_tone`, `v3_tone`, `v4_tone` | user_request / orchestrator_default |
| 비판 축 (V3) | `v3_critique_axis` | orchestrator_default |
| 건설 방향 (V4) | `v4_construction_direction` | user_request / orchestrator_default |
| Section Packs 사용 | `section_packs_chosen` | reference_dna |

**Self-Check 추가**:
- [ ] V1/V3/V4 각각 최소 1개 decision 기록 (3건 이상)
- [ ] 각 decision의 reasoning 1문장 이상 + 출처(DKB 점수·KPI·Tone 추천 등) 명시
- [ ] reversibility 명시 (V1 reference 선택은 hard, Tone 변경은 easy/medium)

상세 스키마: `lib/rules/handoff-schema.md` §"decisions[] — 결정 로그 필드"

## CCD 모드

CCD 모드에서:
- 3종 자동 생성
- 18축 채점 + 자동 선정
- 145 미달 시 자동 재생성 (최대 3회)
- 3회 후 미달 시 사용자 에스컬레이션 (`lib/rules/dkb-policy.md` §6)

## 주의사항

1. **저작권**: reference 디자인 권리는 원저작자. 본 스킬은 학습/내부 시안 검토 용도
2. **상용 배포 전**: 디자이너가 충분히 변형 (보존 70% → 변형 30%+)
3. **모방 다양성 금지**: "9개 사이트 베끼기" 패턴은 9개 갤러리 사고. 본 스킬은 1개 reference + 3종 관점만
4. **Anti-Slop**: Inter/Roboto/보라 그라디언트/3-col 카드 반복 금지 (`ref/anthropic-frontend-design.md`)

## 참조

- `~/.claude/dkb/references/` — DKB references DNA
- `lib/rules/dkb-policy.md` — DKB 정책
- `agents/design-orchestrator.md` — 호출 진입점 (Step 2B-2.7)
- `skills/publish-visual-verify` --mode=design — 18축 채점
- `ref/anthropic-frontend-design.md` — Anthropic 원본 가이드
- `ref/design-taste.md` — Anti-Slop 룰

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-04-30 | 신규 작성 (1:1 복제 3안 — 모방 다양성) |
| **v2.0** | **2026-04-30** | **재작성: 3종 관점 (V1/V3/V4) — 관점 다양성. AX_D_P 5종 시스템 흡수 + 토큰/Claude-only 압축. 9개 갤러리 사고 본질 차단** |
