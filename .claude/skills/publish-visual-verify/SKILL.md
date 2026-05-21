---
name: publish-visual-verify
description: 퍼블리싱 산출물의 시각 품질을 3 Phase로 검증. Phase 1 Grep 기반 Anthropic Content Guidelines + Never-Rules 자동 검출, Phase 2 Taste 9-Axis 루브릭 평가, Phase 3 Playwright 3 breakpoint 캡처 + Vision LLM 채점. Ralph Loop의 외부 verifier로 편입되어 "Self-Check 수치 PASS인데 시각 실패" 반복을 차단한다.
type: skill
model: sonnet
---

# 시각 검증 (Publish-Visual-Verify) Generator

당신은 **시니어 프론트엔드 QA + 디자인 리뷰어**입니다.

퍼블리싱 산출물의 시각 완성도를 **3 Phase 자동 검증** 체계로 측정하고, 실패 시 구체 수정 지시를 반환합니다.

## 배경

SYS v4 파이프라인은 텍스트 산출물 기준으로 설계되어 **시각 품질을 검증하는 메커니즘이 부재**했습니다. 그 결과 다회 재시도 사고 케이스에서 다음이 반복됐습니다:
- Self-Check 100/100 PASS인데 실제 시각 결과는 평범 산출물과 동급
- BEM variant 클래스가 HTML에 86건 있으나 CSS에 직접 선언 0건
- 서버 포트 충돌로 캡처 대상이 엉뚱한 디렉토리였음을 아무도 감지 못함

본 스킬은 Anthropic 공식 Claude Design 시스템 프롬프트 + taste-skill + gstack + Frontend Design plugin의 교집합을 SYS v4 내부 검증 루프로 내재화합니다.

## 모드 (Phase Mode)

본 스킬은 두 단계에서 호출된다:

| 모드 | 호출 시점 | 입력 | 차이점 |
|------|---------|------|------|
| **design** | design-orchestrator Step 2B-3 직후 | 단일 HTML 시안 N개 (`디자인_*.html`) | manifest 미존재, 1.3 variant SKIP, BEM 검증 완화, **시안 N개 일괄 채점 + 최고 점수 선정** |
| **publish** | publish-markup/style/interaction 완료 후 | 분리된 HTML/CSS/JS 산출물 | manifest 필수, 1.3 variant 필수, 전체 검증 |

호출 시 `--mode=design` 또는 `--mode=publish` 인자로 지정. 미지정 시 입력 구조로 자동 추론:
- 단일 HTML + 인라인 CSS → **design 모드**
- HTML + 별도 css/ 디렉토리 + manifest.json → **publish 모드**

### design 모드 핵심 차이

1. **Phase 1.3 (variant 베이스 선언) SKIP** — manifest 미존재 (design 단계는 BEM 정리 전)
2. **Phase 1.3-A (마케팅 카피) 적용** — 의도 없는 카피 차단은 design 단계가 더 효과적
3. **Phase 2 (9-Axis) 적용** — 평균 85점 임계값은 동일
4. **Phase 3.4 (Visibility Audit) 적용** — Hero 빈 화면 차단
5. **N개 시안 일괄 처리** — A/B/C 각각 채점 후 비교표 + 최고 1안 추천
6. **자동 재생성 트리거** — 전 시안 평균 < 85 → orchestrator에 재생성 신호 반환

## 전제조건

### 공통
- **권장**: Playwright chromium 설치 (`npx playwright install chromium`)
- **권장**: `ANTHROPIC_API_KEY` 환경변수 (Phase 3 Vision 평가)

### design 모드
- **필수**: `output/design/디자인_*.html` 1개 이상 (시안 파일)
- **권장**: 프로젝트 CLAUDE.md에 3-Dial 선언 (없으면 vendor 기본값)
- **선택**: `output/design/REPLICATE_NOTE.md` (design-replicate 산출 시)

### publish 모드
- **필수**: publish-markup / publish-style / publish-interaction 완료
- **필수**: `component-manifest.json` 존재 (design-knowledge 산출)
- **필수**: 프로젝트 CLAUDE.md에 3-Dial 선언 (DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY)

## 핵심 원칙

1. **Grep 1차 → Vision 2차** 계층 검증 (비용 효율)
2. **Iron Rules 위반은 즉시 FAIL** (Ralph Loop 진입 없이 수정 요구)
3. **9-Axis 평균 85점 미만은 FAIL** (개별 축 5점 미만은 해당 축 즉시 에스컬레이션). 2026-04-20 상향 — 다회 재시도 사고로 75점 임계는 "평범 산출물 통과"가 확인됨
4. **무한루프 방지 안전장치** — Ralph Loop 회차 간 9-Axis 평균 변동이 ±2점 이내로 2회 연속이면 점수 정체로 간주, 즉시 에스컬레이션 (Vision 점수 변동성 한계)
5. **Before-After diff 5% 미만**이면 "개선 미미" 경고 → 아키텍처 재검토 트리거
6. 메모리 `feedback_selfcheck_limits.md` 준수 — 자기 보고 PASS는 합격 아님

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 필수 |
|---|---|---|:---:|
| Grep 검증 | ripgrep / grep | `grep -rE "font-family: Inter" css/` | 필수 |
| 구조 검증 | node | `node scripts/verify-variant-declarations.js` | 필수 |
| 브라우저 렌더 | Playwright | `npx playwright install chromium` | 필수 |
| 캡처 | Playwright | `scripts/capture-viewports.js` | 필수 |
| Vision 채점 | Claude API | `scripts/visual-rubric-eval.js` (Sonnet 4.6 vision) | 권장 |
| 서버 관리 | node | `scripts/check-server-port.js` | 필수 |

## Phase 1 — Anthropic Content Guidelines Compliance

### 1.1 Iron Rules 검증 (자동 Grep)

| IR | 검증 방법 | 판정 |
|---|---|---|
| IR-1 의도 없는 콘텐츠 | `Lorem|John Doe|Acme|Feature 1` grep | 매치 0건 = PASS |
| IR-2 시스템 선언 | `design-knowledge` 산출물 + `aesthetic-contract.yaml` 존재 | 파일 존재 = PASS |
| IR-3 스케일 하한 | CSS에 `font-size` 최솟값 검사 (본문 < 16px 금지) | 본문 16px+ = PASS |
| IR-4 소스 토큰 리프트 | tokens.css의 hex가 레퍼런스 브랜드 가이드와 일치 | 수동 확인 (v1에서는 권고 수준) |
| IR-5 OKLCH 확장 | `color-mix(in oklch` 사용 or OKLCH 토큰 100% | `oklch(` count ≥ 20 = PASS |

### 1.2 Never-Rules Grep (6 카테고리)

`lib/rules/publish-patterns.md` 섹션 3 전수 grep:

```bash
# Typography
grep -rE "font-family:\s*['\"]?(Inter|Roboto|Arial|system-ui|Fraunces)" css/
# Color
grep -rE "#000000|#000[^\w]|rgb\(0,\s*0,\s*0\)" css/
grep -rE "(purple|violet|#6366F1|#7C3AED|#8B5CF6)" css/
grep -rE "rgba\(0,\s*0,\s*0," css/
# Layout
grep -rE "height:\s*100vh|min-height:\s*100vh" css/
# Motion
grep -rE "transition:.*\b(top|left|width|height)\b" css/
grep -rE "hover.*scale\(1\.05\)" css/
# Content
grep -rE "John Doe|Jane Doe|Acme|Lorem ipsum|Nexus|Globex" .
grep -rE "Elevate|Seamless|Unleash|Empower|Next-?Gen|Revolutionary" .
```

각 매치 발견 시 **FAIL + 구체 수정 지시**.

### 1.3-A 마케팅 카피 품질 (자동 탐지 + 재작성 후보 출력 · Critical)

> 다회 재시도 양방 사례: HTML이 시맨틱하고 빌드도 통과했지만, **카피가 "Elevate / Seamless / Lorem Ipsum"** 등 마케팅 stock 문구 — Anthropic Iron Rule 1(의도 없는 콘텐츠) 위반. Self-Check는 PASS인데 시각은 평범. 본 단계가 그 패턴의 차단선.

`scripts/rewrite-marketing-copy.js` 실행 → 5개 카테고리 탐지:

| kind | 의미 | 판정 |
|------|-----|:--:|
| `marketing-overhype` | Elevate / Seamless / Unleash / Empower / Next-Gen 등 | 1건 이상 = **BLOCK** |
| `placeholder-name` | John Doe / Jane Doe / Acme / Nexus / Globex | 1건 이상 = **BLOCK** |
| `lorem-ipsum` | Lorem / Bacon / Cupcake ipsum | 1건 이상 = **BLOCK** |
| `fake-clean-stat` | 99.99% / $100.00 / 24/7 등 깔끔한 가짜 수치 | 4건 이상 = WARN |
| `emoji-overuse` | 페이지당 이모지 5개 이상 (B2B/엔터프라이즈 기준) | 1건 = WARN |

**자동 교체 금지 원칙**:
- LLM이 임의로 재작성하면 또 다른 추측이 됨 (figma-fidelity Rule R4 동일)
- 출력의 `findings[].hint`를 **사용자에게 제시** → 고객 자료 기반 카피로 교체 요청
- 자료가 없으면 `[CARRIER]` 임시 카피 + 사용자 에스컬레이션
- `findings[].context`로 원문 위치 50자 미리보기 제공 → 사용자가 즉시 판단 가능

```bash
node C:/Users/hj.moon/.claude/skills/publish-visual-verify/scripts/rewrite-marketing-copy.js \
  --html {publishDir} --out {publishDir}/_marketing-copy.json
```

### 1.3 variant 베이스 선언 Grep (Critical)

```bash
grep -cE "^\.([a-z_-]+--[a-z0-9-]+)\s*\{" css/*.css
```

- `component-manifest.json`의 variant 개수 대비 직접 선언 비율 ≥ 86% = PASS
- 50% 미만 = Critical FAIL (실측 사고 케이스 유형 — variant 자식만 스타일 + 베이스 미선언)

### Phase 1 출력

```
═══════════════════════════════════
[Phase 1] Anthropic Content Guidelines
═══════════════════════════════════
IR-1 의도 없는 콘텐츠        | {PASS/FAIL — 매치 n건}
IR-2 시스템 선언             | {PASS/FAIL}
IR-3 스케일 하한             | {PASS/FAIL — 최소 font-size Npx}
IR-4 소스 토큰 리프트         | {PASS/WARN — 수동 확인 권고}
IR-5 OKLCH 확장              | {PASS/FAIL — oklch() n건}

Never-Rules
  Typography  | {PASS/FAIL — 위반 n건: [세부]}
  Color       | {PASS/FAIL — 위반 n건: [세부]}
  Layout      | {PASS/FAIL — 위반 n건: [세부]}
  Motion      | {PASS/FAIL — 위반 n건: [세부]}
  Content     | {PASS/FAIL — 위반 n건: [세부]}

마케팅 카피 품질 (Section 1.3-A)
  marketing-overhype | {n}건 | {PASS 0 / BLOCK ≥1}
  placeholder-name   | {n}건 | {PASS 0 / BLOCK ≥1}
  lorem-ipsum        | {n}건 | {PASS 0 / BLOCK ≥1}
  fake-clean-stat    | {n}건 | {PASS <4 / WARN ≥4}
  emoji-overuse      | {n}건 | {PASS 0 / WARN ≥1}
  카피 판정          | {PASS / WARN / BLOCK} — 사용자 카피 자료 필요 시 에스컬레이션

Variant 베이스 선언
  manifest 개수 | {n}
  직접 선언     | {n}  ({비율}%)
  판정          | {PASS ≥86% / FAIL <86%}

Phase 1 판정: {PASS / FAIL}
```

FAIL 시 Phase 2 진행 없이 반환.

---

## Phase 2 — Taste 18-Axis Audit (v2.0 · DKB 통합)

### 2.0 18축 확장 배경

기존 9축은 publish 산출물 검증에 적합했으나, **design 단계 시각 평균값 회귀**(다회 재시도 사고 + 9개 갤러리 사고)를 차단하지 못함.

v2.0 (2026-04-30): AX_landing 어워드 수치 + 한국 B2B 4축 + 어워드 인터랙션 디테일 흡수하여 18축으로 확장.

### 2.1 18-Axis 루브릭

#### 표면 토큰 (L1)

| 축 | 0점 | 5점 | 10점 |
|---|---|---|---|
| **L1-1 Typography** | Inter/Roboto + 깨짐 | Pretendard 단일 + 고정 px | Variable font + 극단 weight 대비(100 vs 900) + fluid clamp + text-wrap: pretty |
| **L1-2 Color** | 퍼플 그라디언트 #6366F1 + pure #000 / 8색+ 잡탕 | Hex 2-tier + black shadow / 4~5색 + 1 accent | OKLCH 3-tier + 단일 accent (면적 10~15%) + tinted shadow + P3 gamut |
| **L1-3 Color Subtlety** | Pure #FFF / #000 사용 | 약간 톤다운 (#FAFAFA급) | Off-white #FAFAF7 정밀 + 자연 톤 액센트 (Coral/Terracotta) |
| **L1-4 Trend Currency** | 2020년 톤 (글래스모피즘 / 보라 그라디언트) | 2023년 톤 | 2025-2026 최신 (`:has()`, container query, OKLCH, view-transitions) |

#### 정밀도 (L2)

| 축 | 0점 | 5점 | 10점 |
|---|---|---|---|
| **L2-1 White Space** | Hero 콘텐츠 점유 80%+ 빽빽 | 50~60% | 35~45% (절제 — 어워드 시그니처) |
| **L2-2 Typo Hierarchy** | weight 동일, size 1.5× | weight 200차, size 2.5× | weight 600차+, size 3.5× + 섹션 라벨(영문 lowercase) + 큰 타이틀 조합 |
| **L2-3 Korean Typo ★** | 영문 그대로 적용 | Pretendard 단독 | font-feature-settings + 자간 미세 + 행간 1.6~1.8 + word-break: keep-all |
| **L2-4 Image Tonality** | placeholder 다수 | 일부 일관 | 100% 후처리 일관 (sepia/B&W/desaturate) + 단일 톤 분포 |

#### 구성 논리 (L3)

| 축 | 0점 | 5점 | 10점 |
|---|---|---|---|
| **L3-1 Asymmetric Layout** | 3-col 카드 grid 반복 3+건 | 2-col + asymmetric 1건 | Bento + Editorial + 비대칭 6:4/7:3 + 카드 그리드 변주 (3+4) |
| **L3-2 Grid Depth** | flex만 | grid 12-col | Subgrid + Container Query + grid-template-areas |
| **L3-3 Motion Intent** | hover:scale(1.05) 일괄 / transition 일괄 | 기본 hover만 | hover translateY+shadow / 이미지 scale(1.03~1.05) / transition 0.2~0.3s / scroll-driven fade-up + stagger (transition-delay 0.05s × 8) |
| **L3-4 Interaction Craft ★** | 디테일 0 | 일부 미세조정 | 모든 인터랙션 micro-tuning (focus-ring / hover-delay / easing 차별) |
| **L3-5 Mobile Fidelity ★** | 단순 축소 | 일부 재배치 | 모바일 전용 시그니처 (햄버거 메뉴 / 풀스크린 nav / 모바일 전용 인터랙션) |
| **L3-6 LCP Visual Impact ★** | 빈 화면 / 텍스트만 로딩 | 텍스트 빠른 로딩 | 단계적 등장 (skeleton → content) + 의도된 LCP 이미지 + Hero 즉시 노출 |
| **L3-7 Visual Flow ★** | 시선 흐름 무관 | F/Z 패턴 일부 | Hero → 핵심정보 → CTA 명확 + 한 섹션 포커스 1개 |
| **L3-8 Visual Rhythm ★** | 백색 배경 반복 | 일부 교차 | 배경색 교차 + 이미지↔텍스트 교차 + 밀도 교차 (스크롤 리듬) |

#### 본질 (L4)

| 축 | 0점 | 5점 | 10점 |
|---|---|---|---|
| **L4-1 Content Weight** | Lorem/John Doe/"Empower"/"Seamless" | 일반 카피 / placeholder 일부 | 인용 가능한 단일 수치 + 구체 제품명 + 고유 카피 |
| **L4-2 Signature Element** | 표면 모방 | 1개 시그니처 | 시그니처 + 일관 적용 (예: Anthropic Coral 점, Vercel 네온) |

★ = 한국 B2B 핵심 4축 (L2-3 Korean Typo / L3-4 Interaction / L3-5 Mobile / L3-6 LCP) + 어워드 정밀도 4축 (L3-7 Flow / L3-8 Rhythm)

### 2.1.1 점수 체계

- **총점: 180점 만점** (18축 × 10점)
- **publish 모드 임계 (PASS)**: 145+ (이전 9축 85점 → 18축 145점, 동등 비율 강화)
- **design 모드 임계 (PASS)**: 145+ (DKB references 등재 기준과 동일)
- **CONDITIONAL**: 130~144
- **FAIL**: <130

축별 5점 미만 1개 즉시 에스컬레이션은 유지.

### 2.1.2 9축 → 18축 매핑

기존 publish 산출물에서 9축으로 채점된 경우:
- 9축 원점수 × 2 = 18축 환산 점수 (근사)
- 단 한국 B2B + 어워드 8축은 별도 채점 필요 (자동 환산 불가)
- 권장: 18축 전수 재채점 (Vision LLM 1회 호출로 가능)

### 2.2 3-Dial 정합성

프로젝트 CLAUDE.md 선언값과 실제 렌더링 일치:

| Dial | 측정 방법 |
|---|---|
| DESIGN_VARIANCE | Bento + Editorial + Subgrid 사용 빈도 |
| MOTION_INTENSITY | scroll-driven + Lenis + GSAP 사용 빈도 |
| VISUAL_DENSITY | 섹션당 요소 수 + 여백 비율 |

선언값 ± 2 이내 = PASS, 이상 = WARN, ± 4 이상 = FAIL

### Phase 2 출력

```
═══════════════════════════════════
[Phase 2] 9-Axis Taste Audit
═══════════════════════════════════
Typography           | {n}/10 | {코멘트}
Color                | {n}/10 | {코멘트}
Layout               | {n}/10 | {코멘트}
Interactivity        | {n}/10 | {코멘트}
Content              | {n}/10 | {코멘트}
Components           | {n}/10 | {코멘트}
Iconography          | {n}/10 | {코멘트}
Code Quality         | {n}/10 | {코멘트}
Strategic Omissions  | {n}/10 | {코멘트}

평균: {n}/10 (× 10 = {m}/100)
판정: {PASS ≥85 / CONDITIONAL 70~84 / FAIL <70}
개별 축 5점 미만 1개라도 존재 시 → 해당 축 즉시 에스컬레이션 (전체 평균 무관)

이전 회차 비교 (Ralph Loop 안전장치)
  v(n-1) 평균: {m}점
  v(n)   평균: {m}점
  변동:        {±n}점
  연속 정체:   {n}/2회 (±2 이내 2회 연속 시 → 에스컬레이션, Ralph Loop 종료)

3-Dial 정합
  DESIGN_VARIANCE   | 선언 {n} / 실측 {m} | {PASS/WARN/FAIL}
  MOTION_INTENSITY  | 선언 {n} / 실측 {m} | {PASS/WARN/FAIL}
  VISUAL_DENSITY    | 선언 {n} / 실측 {m} | {PASS/WARN/FAIL}
```

---

## Phase 3 — Playwright Visual Loop

### 3.1 서버 포트 관리 (선행)

```javascript
// scripts/check-server-port.js 호출
// 1. 기존 8080 점유 시 프로세스 확인
// 2. 점유 프로세스가 대상 디렉토리와 다르면 경고
// 3. 가용 포트 자동 선택 (8090~8099)
```

### 3.2 3 Breakpoint 캡처

```javascript
// scripts/capture-viewports.js 호출
// breakpoints: [375, 768, 1440]
// pages: index.html + 메인 5개 (총 6 × 3 = 18 캡처)
// reducedMotion: 'reduce', networkidle 대기
```

### 3.3 Vision LLM 9-Axis 채점

```javascript
// scripts/visual-rubric-eval.js 호출
// 각 캡처를 Claude Sonnet 4.6 vision에 전송
// 9-Axis 각 항목 0~10 + 한 줄 코멘트
// JSON 응답: { typography: {score: 8, comment: "..."}, ... }
```

### 3.4 Visibility Audit (Hero 빈 화면 자동 탐지 · Critical)

> 다회 재시도 양방 사례: data-reveal 요소가 영구 opacity:0 → Hero 텅 빈 채 출고. Self-Check + 9-Axis 다 PASS인데 시각은 빈 화면. 본 단계가 그 패턴의 차단선.

캡처 단계와 같은 Playwright 컨텍스트에서 **viewport 1차 스크롤(=fold above)** 가시 텍스트·요소를 측정한다. fullPage 캡처와 별개.

| # | 측정 | 임계값 | 판정 |
|---|------|------|:--:|
| V1 | Hero 영역(`section.hero`, `[data-section="hero"]`, 또는 `<main>` 첫 자식) **표시 텍스트 길이** (`element.innerText.replace(/\s+/g,' ').trim().length`) | **≥ 30자** | 미만 시 **FAIL** |
| V2 | Hero 영역 내 가시 요소 (`getBoundingClientRect().width × height > 100` AND `computedStyle.opacity > 0` AND `visibility !== 'hidden'`) 개수 | **≥ 3개** | 미만 시 **FAIL** |
| V3 | `[data-reveal]` 요소 중 viewport 진입 후 1.5s 시점 `opacity === 1` 비율 | **≥ 95%** | 미만 시 **FAIL** (JS 누락 신호) |
| V4 | Hero CTA 버튼(`a.btn`, `button.btn`, `[role="button"]`) viewport 내 존재 + 클릭 가능 영역 ≥ 44×44 | **≥ 1개** | 미만 시 **FAIL** |
| V5 | 콘솔 에러 + 요청 실패 (404/CORS/JS) | **0건** | ≥ 1건 시 **FAIL** |
| V6 | 이미지 src 404/broken (`<img>` + CSS `url()` + `<source srcset>`) | **0건** | ≥ 1건 시 **FAIL** (로컬·원격 모두 HEAD 검증) |

**측정 코드 시그니처** (`scripts/visibility-audit.js`):
```javascript
const result = await page.evaluate(() => {
  const hero = document.querySelector('section.hero, [data-section="hero"], main > section:first-child, main > :first-child');
  if (!hero) return { v1_textLen: 0, v2_visEls: 0, v3_revealRatio: 0, v4_ctaCount: 0 };
  const txt = (hero.innerText || '').replace(/\s+/g,' ').trim();
  const visEls = Array.from(hero.querySelectorAll('*')).filter(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width * r.height > 100 && parseFloat(cs.opacity) > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  });
  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  const revealVisible = reveals.filter(el => parseFloat(getComputedStyle(el).opacity) === 1);
  const ctas = Array.from(hero.querySelectorAll('a.btn, button.btn, [role="button"]'));
  return {
    v1_textLen: txt.length,
    v2_visEls: visEls.length,
    v3_revealRatio: reveals.length ? revealVisible.length / reveals.length : 1,
    v3_revealCount: reveals.length,
    v4_ctaCount: ctas.length,
  };
});
```

**판정 규칙**: V1~V5 중 **1건이라도 FAIL이면 Phase 3 전체 FAIL** (Hero가 빈 화면이면 다른 모든 점수 무의미). FAIL 시 9-Axis Vision 호출 생략(비용 절감) + 즉시 publish-interaction 재실행 지시.

### 3.5 Before-After Diff (선택)

이전 버전 캡처가 존재하면:
- pixelmatch 또는 resemble.js로 변경율 측정
- 변경율 < 5% 경고 → 개선 미미 (Ralph Loop 재실행 또는 아키텍처 재검토 트리거)

### 3.6 Figma Reference Diff (Figma 시안 기반 프로젝트 전용)

> `lib/rules/figma-fidelity.md` Section 7 연동. Figma → HTML 충실도 게이트.

**전제조건**: Pull 단계(`figma-sync.md` 3-C)에서 export한 reference 이미지가 존재.

```
output/{프로젝트}/assets/reference/
├── {pageName}-full.png          # 페이지 전체
├── {sectionName}.png             # 섹션별 (Hero/Nav/Cards/Footer 등)
└── {pageName}-{device}.png       # Mobile/Tablet/Desktop
```

**실행 절차**:

1. **reference 이미지 존재 확인**
   - 없으면 **SKIP + 경고**: "Figma reference 미존재 — `/figma-pull` 3-C 절차 실행 권고"
   - 있으면 아래 진행

2. **1:1 매칭**
   | Playwright 캡처 | Figma reference |
   |---|---|
   | `screenshots/v{n}/{page}-1440.png` | `assets/reference/{page}-desktop.png` (또는 `{page}-full.png`) |
   | `screenshots/v{n}/{page}-768.png` | `assets/reference/{page}-tablet.png` |
   | `screenshots/v{n}/{page}-375.png` | `assets/reference/{page}-mobile.png` |

3. **Vision LLM 동시 입력 채점** (두 이미지 한 번에 전송)

   Claude Sonnet 4.6 vision 프롬프트 구조:
   ```
   [system] 프롬프트 캐시: figma-fidelity.md Section 6 Self-Check 10항목
   [user] image_1: Figma reference
          image_2: Playwright 캡처
          instruction: 아래 4개 축 0~25점씩 채점 (총 100점)
             1. Layout Fidelity      (요소 위치·크기 비율 일치)
             2. Color Fidelity       (색상 hex·투명도·그라디언트)
             3. Typography Fidelity  (폰트·크기·행간·자간·정렬)
             4. Asset Fidelity       (이미지·SVG 존재 여부, 빠짐 0건)
          output: JSON {layout:{score,diff[]}, color:..., typo:..., asset:...}
   ```

4. **판정 규칙**

   | 총점 | 판정 | 조치 |
   |------|:----:|------|
   | ≥85 | PASS | 다음 페이지 진행 |
   | 70~84 | CONDITIONAL | WARN 기록 + 가장 낮은 축 재작업 지시 |
   | <70 | **FAIL** | **Ralph Loop 재수정 (최대 3회)** |

5. **Asset 누락 자동 탐지** (Asset Fidelity 특화)

   Vision 호출 전 정적 검증:
   ```javascript
   // Figma reference에 존재하나 HTML에 없는 자산
   const figmaAssets = glob('assets/reference/**/*.{png,svg,jpg}');
   const htmlRefs = grepAllRefs('publish/**/*.html', /(src|href)=["']([^"']+)["']/);
   const missing = figmaAssets.filter(a => !htmlRefs.some(r => r.includes(basename(a))));
   if (missing.length > 0) return { asset: 0, missing };
   ```

   Asset 0점 = 즉시 publish-markup 재실행 지시 (Vision 호출 생략).

### Phase 3.6 출력

```
═══════════════════════════════════
[Phase 3.6] Figma Reference Diff
═══════════════════════════════════
Reference 존재: {n}/{m} 파일
  - missing: [asset1.svg, asset2.png]

Vision 채점 (페이지별)
  index (desktop)   | L:{n}/25 C:{n}/25 T:{n}/25 A:{n}/25 = {총}/100 | {PASS/CONDITIONAL/FAIL}
  index (tablet)    | ...
  index (mobile)    | ...
  about (desktop)   | ...

프로젝트 평균: {n}/100
판정: {PASS ≥85 / CONDITIONAL 70~84 / FAIL <70}

Top 3 수정 지시 (낮은 축 기준)
  1. [Typography] index-desktop: Hero 제목 line-height 1.1 → 1.3 (reference 대비 20% 좁음)
  2. [Asset] about-mobile: 팀 멤버 아이콘 4개 missing
  3. [Color] platform-desktop: CTA 버튼 #E0282F → #BB1B21 (dark variant 오사용)
```

### Phase 3 출력

```
═══════════════════════════════════
[Phase 3] Playwright Visual Loop
═══════════════════════════════════
서버 포트: {8080/8090 자동 선택}
캡처 완료: {n}/{18}

Visibility Audit (Hero 빈 화면 차단)
  V1 Hero 표시 텍스트  | {n}자  | {PASS ≥30 / FAIL}
  V2 Hero 가시 요소    | {n}개  | {PASS ≥3 / FAIL}
  V3 reveal opacity:1  | {n}/{m} ({비율}%) | {PASS ≥95% / FAIL — JS 누락 의심}
  V4 Hero CTA          | {n}개  | {PASS ≥1 / FAIL}
  V5 콘솔/요청 에러    | {n}건  | {PASS 0 / FAIL}
  V6 이미지 404/broken | {n}건  | {PASS 0 / FAIL — 로컬+원격 HEAD}
  Visibility 판정      | {PASS / FAIL — Phase 3 즉시 종료}

Vision 9-Axis 평균 (페이지별 · Visibility PASS 시에만)
  index.html           | {m}/90
  about.html           | {m}/90
  platform.html        | {m}/90
  solutions.html       | {m}/90
  service.html         | {m}/90
  solutions/{업종}.html | {m}/90

프로젝트 평균: {m}/90 ({비율}%)
판정: {PASS ≥75% / FAIL <75%}

Before-After Diff
  이전 버전: {경로 또는 "없음"}
  변경율: {n}% (5% 미만 시 경고)
```

---

## Ralph Loop 연동

publish-orchestrator의 Ralph Loop에 외부 verifier로 편입:

1. publish-style 완료 → Phase 1 실행
2. Phase 1 FAIL 시:
   - Iron Rules 위반: 즉시 publish-style 재실행 지시 (Ralph Loop n=1)
   - Never-Rules 위반: 구체 수정 지시 + Ralph Loop n=2
3. Phase 1 PASS → Phase 2 실행
4. Phase 2 FAIL 시: 해당 축 개선 지시 + Ralph Loop n=3
5. Phase 3 FAIL 시: 아키텍처 재검토 트리거 (에스컬레이션)
6. 3회 실패 시: anti-rationalization.md Red Flag 경고 + 사용자 확인

## 출력 형식

- MD: `VISUAL_VERIFY_{프로젝트}_v{n}.md`
- 스크린샷: `screenshots/v{n}/{page}-{breakpoint}.png`
- JSON 루브릭: `visual-rubric-v{n}.json`
- 저장 경로: `output/{프로젝트}/{YYYYMMDD}/`

## Self-Check

| # | 검증 항목 | 기준 |
|---|---|---|
| 1 | Phase 1 실행 완료 | Iron Rules 5 + Never-Rules 6 카테고리 전수 grep |
| 2 | **마케팅 카피 품질 (Section 1.3-A)** | `rewrite-marketing-copy.js` 실행 → BLOCK 0건 (overhype/placeholder/lorem). 사용자 카피 자료 부재 시 에스컬레이션 |
| 3 | variant 베이스 선언 검증 | manifest 대비 비율 리포팅 |
| 4 | Phase 2 실행 완료 | 9-Axis 전수 + 3-Dial 정합 + **개별 축 5점 미만 0건** |
| 5 | **Phase 2 안전장치 (무한루프 방지)** | v(n-1) ↔ v(n) 평균 변동 ±2 이내 2회 연속 시 → Ralph Loop 즉시 종료, 사용자 에스컬레이션 |
| 6 | Phase 3 실행 완료 | 3 breakpoint × N 페이지 캡처 |
| 7 | **Visibility Audit 실행 (V1~V6)** | Hero 빈 화면·JS 누락·이미지 404 차단 — 1건이라도 FAIL 시 Phase 3 즉시 종료 |
| 8 | Vision 채점 | 각 캡처 JSON 루브릭 보유 (Visibility PASS 시에만). **평균 ≥85 = PASS** (75 → 85 상향) |
| 9 | Before-After diff | 이전 버전 있으면 실행, 없으면 skip 명시 |
| 10 | **Figma Reference Diff (Phase 3.6)** | Figma 프로젝트면 필수, 아니면 skip. Asset 누락 0건 + 평균 ≥70점 |
| 11 | 최종 판정 | 3 Phase 모두 PASS = PASS, 하나라도 FAIL = FAIL |
| 12 | 메모리 준수 | "자기 보고 PASS ≠ 합격" 원칙 주석 |

## 합리화 방지

| # | 변명 | 반박 |
|---|------|------|
| R1 | "시각은 주관적" | 9-Axis 각 항목 구체 수치화 (카드 반복 ≤ 2, weight 대비 ≥ 700) |
| R2 | "Playwright 설치 필요" | `environment.md` 명시, 미설치 시 skip + 수동 확인 권고 |
| R3 | "Vision API 비용" | Grep 1차 FAIL 시 Vision 생략 (계층 검증) |
| R4 | "9-Axis 채점이 LLM 주관" | Sonnet 독립 호출 + 다수결 검토 옵션 |

## Do not

| # | 금지 | 사유 |
|---|---|---|
| 1 | Grep 생략하고 Vision만 호출 | 비용·시간 낭비 |
| 2 | Phase 1 FAIL 시 Phase 2·3 강행 | 기본부터 안 됨 |
| 3 | 동일 모델(Opus)이 생성 + 검증 | 편향. Sonnet 분리 |
| 4 | 스크린샷 fullPage만 사용 | sticky/scroll-snap은 viewport 단독 |

## META 블록

산출물 MD 파일 최하단:

```html
<!-- META {
  "skill": "publish-visual-verify",
  "version": "v1",
  "project": "{프로젝트}",
  "created": "{YYYY-MM-DD}",
  "phase_1": "{PASS/FAIL}",
  "phase_2": "{PASS/FAIL/CONDITIONAL}",
  "phase_3": "{PASS/FAIL}",
  "phase_3_6_figma_diff": "{PASS/CONDITIONAL/FAIL/SKIP}",
  "figma_fidelity_avg": 0,
  "asset_missing_count": 0,
  "overall": "{PASS/FAIL}",
  "9_axis_avg": 0,
  "9_axis_threshold": 85,
  "9_axis_min_per_axis": 5,
  "9_axis_stagnation_count": 0,
  "variant_coverage_pct": 0,
  "never_rules_violations": 0,
  "marketing_copy_block": 0,
  "marketing_copy_warn": 0,
  "next_action": "{다음 스킬 또는 Ralph Loop 재호출}"
} -->
```

## Design Phase 모드 — N개 시안 일괄 채점

design-orchestrator가 Step 2B-3 또는 Step 3에서 본 스킬을 호출할 때 적용.

### 입력

```
output/design/
├── 디자인_{프로젝트}_replicate_A_{ref}.html  (또는 _A.html)
├── 디자인_{프로젝트}_replicate_B_{ref}.html  (또는 _B.html)
├── 디자인_{프로젝트}_replicate_C_{ref}.html  (또는 _C.html)
└── REPLICATE_NOTE.md  (선택)
```

### 절차

1. **시안 N개 자동 감지**: `output/design/디자인_*.html` 글로브
2. **Phase 1 적용** — 각 시안별 IR + Never-Rules + 마케팅 카피 검증
   - 1.3 (variant 베이스 선언) **SKIP** — manifest 미존재
   - 다른 모든 항목 적용
3. **Phase 2 적용** — 각 시안별 9-Axis 루브릭 채점
   - publish 모드와 동일한 9축 (Typography ~ Strategic Omissions)
   - 단일 HTML이므로 BEM 컴포넌트 깊이는 가산점 없음
4. **Phase 3.4 적용** — 각 시안별 Hero Visibility Audit
   - V1~V6 전수 적용 (FAIL 시 시안 자동 제외)
5. **시안별 점수 집계 + 비교표 출력**

### 비교표 출력 형식

```
═══════════════════════════════════
[Design Phase] N개 시안 채점 결과
═══════════════════════════════════
시안   | Phase 1 | Phase 2 (9-Axis) | Phase 3 (Visibility) | 종합 | 추천
A (vercel)     | PASS    | 87/100          | PASS                 | 87  | ★ 최고
B (landing-ai) | PASS    | 82/100          | PASS                 | 82  |
C (linear)     | FAIL    | -               | -                    | -   | ✗ 마케팅 카피 BLOCK

자동 결정: 시안 A 선택 (최고 점수 + Phase 1·3 PASS)
재생성 필요: 0건 (전 시안 평균 ≥85 충족 시)

전 시안 평균 < 85 시 → 자동 재생성 신호 반환:
  next_action: "design-replicate 재실행 with diversity=high"
```

### 자동 결정 규칙

| 조건 | 결정 |
|------|------|
| 전 시안 Phase 1·3 PASS + 1개 이상 ≥85 | 최고 점수 시안 자동 선택 |
| 일부 시안만 PASS | PASS 시안 중 최고 점수 선택 |
| 전 시안 < 85 | **재생성 신호** — orchestrator에 `regenerate=true` 반환 (최대 3회) |
| Phase 1 BLOCK 시안 ≥ 1개 | 해당 시안 제외 + 카피 자료 사용자 요청 |
| 3회 재생성 후에도 < 85 | 사용자 에스컬레이션 — 잔존 이슈 + 근본 원인 |

### Design Phase 출력 형식

`output/design/VISUAL_VERIFY_{프로젝트}_design_v{n}.md`:

```markdown
# Design Phase Visual Verify — {프로젝트} v{n}

생성일: {YYYY-MM-DD}
시안 수: 3
재생성 회차: {n}/3

## 시안 비교

| 시안 | 레퍼런스 | Phase 1 | Phase 2 | Phase 3 | 종합 |
|------|--------|--------|--------|--------|------|
| A | vercel | PASS | 87/100 | PASS | 87 |
| B | landing-ai | PASS | 82/100 | PASS | 82 |
| C | linear | BLOCK | - | - | - |

## 추천: 시안 A
- 9-Axis 강점: Typography 9, Layout 9, Components 9
- 9-Axis 약점: Iconography 7 (Phosphor + Heroicons 혼용 권고)
- 개선 지시: 아이콘 라이브러리 1개 추가 시 +1 가능

## 시안 C 차단 사유
- 마케팅 카피 BLOCK: "Empower your business" (overhype) 1건
- 수정 후 재채점 가능

## META
<!-- META {
  "skill": "publish-visual-verify",
  "mode": "design",
  "version": "v{n}",
  "regenerate_count": {n},
  "candidates": 3,
  "best_score": 87,
  "best_candidate": "A",
  "best_reference": "vercel",
  "next_action": "publish-markup with output/design/디자인_*_replicate_A_vercel.html"
} -->
```

## 참조

- `lib/rules/publish-patterns.md` — Iron Rules + Never-Rules 정의
- `lib/rules/figma-fidelity.md` — Figma → HTML 충실도 (Phase 3.6 연동)
- `lib/rules/figma-sync.md` — reference 이미지 export 절차 (Pull 3-C)
- `lib/rules/pipeline.md` — Ralph Loop 프로토콜
- `lib/rules/anti-rationalization.md` — 합리화 방지 (Red Flag #8 포함)
- `agents/publish-orchestrator.md` — 호출 진입점 (publish 모드)
- `agents/design-orchestrator.md` — 호출 진입점 (design 모드 — Step 2B-3, Step 3)
- `skills/design-replicate` — Design 모드 입력 시안 생성
- `skills/qa-debug` — Phase 3.6 FAIL 시 근본 원인 추적 (Phase 5)

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **Self-Check 통과 = 검증 완료 착각**: publish-style/markup의 자체 점수가 PASS여도 본 verify를 통과한 게 아님. Self-Check는 룰 준수, verify는 시각 품질. 둘은 직교.
- ❌ **Phase 1 grep만 통과 후 종료**: Never-Rules 0건이어도 Phase 2 Taste + Phase 3 Vision LLM 미실행 시 합격 처리 금지. 3 Phase 모두 통과해야 PASS.
- ❌ **3 breakpoint 중 일부만 캡처**: M/T/D 중 하나만 캡처 + "잘 나옴"으로 합격 → 반응형 실패 누락. 3개 모두 필수.
- ❌ **Vision LLM 채점 해석 합리화**: 6.5/10 같은 borderline 점수를 "충분히 좋음"으로 통과 → anti-rationalization 위반. Iron Rules: 7.0 미만 = FAIL.
- ❌ **Ralph Loop 무한 반복**: Phase 3.6 FAIL → publish 재실행 → 다시 FAIL 패턴. 3회 실패 시 qa-debug 또는 design 단계 복귀 필수.
- ❌ **Figma reference 미사용 design 모드 verify**: design 모드 verify에서 Figma 시안과 대조 없이 자체 미감만 채점 → 충실도 누락. figma-fidelity.md 의무 적용.
- ❌ **breakpoint Playwright 미설치 시 우회**: `npx playwright install chromium` 실패를 "수동 검수로 갈음"으로 회피 → Phase 3 데이터 부재. 설치 안 되면 차단 보고.
