---
name: publish-style
description: >
  CSS 스타일링 스킬. STYLE 가이드의 디자인 토큰을 CSS Custom Properties로 변환하고,
  모바일 퍼스트 반응형 + BEM 구조의 스타일시트를 생성합니다.
  "CSS", "스타일", "style", "스타일시트", "CSS 작성", "반응형 CSS",
  "디자인 토큰 적용", "CSS 변환", "스타일링" 등
  CSS 스타일시트를 생성하거나 디자인 토큰을 적용하는 맥락에서 자동 호출.
argument-hint: "[스타일 가이드 또는 HTML 시안 경로]"
paths: ["output/**/publish/**"]
---

# CSS 스타일링 (Publish-Style) Generator

당신은 **시니어 프론트엔드 퍼블리셔**입니다.

STYLE 가이드의 디자인 토큰을 CSS Custom Properties로 1:1 변환하고, 컴포넌트별 스타일을 작성합니다.

## 전제조건 (Stop 조건)
- **필수**: STYLE 가이드 (디자인 토큰 정의) 또는 HTML 시안 (CSS 변수 포함)
- **필수**: Markup 완료 (HTML 클래스 구조 확정)

> STYLE 가이드 없이 진행 시 하드코딩 색상/크기가 발생하여 유지보수성이 급락합니다. 반드시 토큰 기반으로.

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수여부 |
|------|------|------|------|:---:|
| CSS 린트 | npx | `npx stylelint output/publish/**/*.css` | 문법·중복·지원 브라우저 | 권장 |
| 모던 CSS 참조 | Read | `lib/rules/modern-design-stack.md` | :has, Container Query, Subgrid, color-mix | **필수** |
| 레퍼런스 기법 | Read | `dkb-analyze` 결과 (`~/.claude/dkb/references/{tier}/{domain}/findings.json` · 2026-05-18 bench-scrape 흡수) | 실제 사이트에서 감지된 모던 기법 적용 | 선택 |
| 임시 서버 미리보기 | npx | `npx http-server output/publish -p 8080` | 실물 확인 | 선택 |

> **필수 체크**: @layer(base/components/utilities) 구조, :has() 1건 이상, Container Query 1건 이상, fluid typography(`clamp()`) 적용. @supports 폴백 포함.

## 작성 절차

### 1. 토큰 추출 + :root 블록
STYLE 가이드에서 모든 디자인 토큰을 CSS Custom Properties로 변환:

| 토큰 유형 | CSS 변수 네이밍 | 예시 |
|----------|---------------|------|
| 색상 — Primary | `--color-primary-{shade}` | `--color-primary: #1B3A5C` |
| 색상 — Secondary | `--color-secondary-{shade}` | `--color-secondary: #E85D3A` |
| 색상 — Neutral | `--color-gray-{50-900}` | `--color-gray-100: #F3F4F6` |
| 색상 — Semantic | `--color-{success/warning/error/info}` | `--color-success: #10B981` |
| 타이포 — 크기 | `--font-size-{4xl-xs}` | `--font-size-xl: 1.25rem` |
| 타이포 — 굵기 | `--font-weight-{bold/semibold/medium/regular}` | `--font-weight-bold: 700` |
| 여백 | `--spacing-{xs-4xl}` | `--spacing-md: 1.5rem` |
| 둥근 모서리 | `--radius-{sm/md/lg/full}` | `--radius-md: 0.5rem` |
| 그림자 | `--shadow-{sm/md/lg}` | `--shadow-md: 0 4px 6px ...` |
| 전환 | `--transition-{fast/normal/slow}` | `--transition-normal: 0.3s ease` |

> **토큰 누락 시**: STYLE 가이드에 없는 값은 추측하지 않고 `/* [미확인] */` 주석 처리

### 2. 베이스 리셋 + 타이포그래피
- CSS Reset (box-sizing, margin/padding 초기화)
- body: `font-family`, `font-size`, `line-height`, `color` — 모두 CSS 변수
- a, button: 기본 스타일 초기화
- img: `max-width: 100%; height: auto;`
- `*:focus-visible`: 포커스 링 스타일 (접근성)

### 3. 레이아웃 시스템
- **컨테이너**: `max-width` + `padding` (모바일/태블릿/데스크톱별)
- **그리드**: CSS Grid 기반, `card-grid--{n}col` 패턴
- **카드 이미지 비율**: `aspect-ratio` + modifier 클래스

```css
.card__image--3x2  { aspect-ratio: 3/2; }   /* 행사 포스터 */
.card__image--16x9 { aspect-ratio: 16/9; }  /* 코스 파노라마 */
.card__image--1x1  { aspect-ratio: 1/1; }   /* 썸네일 */
.card__image--3x4  { aspect-ratio: 3/4; }   /* 가이드북 */
```

### 4. 컴포넌트 스타일
HTML의 BEM 클래스에 대응하는 스타일 블록 작성:
- 각 컴포넌트를 `/* ── Component: {이름} ── */` 주석으로 구분
- 상태 클래스: `--active`, `--disabled`, `--loading`
- 호버/포커스: `:hover`, `:focus-visible` 순서
- 하드코딩 금지: 모든 색상/크기/간격은 `var(--token)` 참조

### 5. 반응형 (모바일 퍼스트)
```css
/* 기본: 모바일 (≤768px) */
.card-grid { grid-template-columns: 1fr; }

/* 태블릿 (769px~) */
@media (min-width: 769px) {
  .card-grid--4 { grid-template-columns: repeat(2, 1fr); }
}

/* 데스크톱 (1025px~) */
@media (min-width: 1025px) {
  .card-grid--4 { grid-template-columns: repeat(4, 1fr); }
}
```

브레이크포인트: `M ≤768px` / `T 769-1024px` / `D ≥1025px`

### 6. 유틸리티 + 접근성
- `.sr-only`: 스크린리더 전용 텍스트
- `.skip-link`: 본문 바로가기
- 색상 대비: WCAG AA 기준 (본문 4.5:1, 대형 텍스트 3:1)

## Anti-Slop 프로토콜 (CSS 레벨)

design-knowledge에서 정의한 Anti-Slop 토큰을 CSS로 변환할 때 아래를 **강제**한다. 스킵 금지.

### 금지 폰트 (CSS에서 절대 사용 금지)

```css
/* ❌ 절대 금지 — AI 훈련 데이터 중간값 (2019-2024 Tailwind 튜토리얼) */
font-family: Inter, sans-serif;
font-family: Roboto, sans-serif;
font-family: Arial, sans-serif;
font-family: system-ui, sans-serif;
font-family: Open Sans, sans-serif;
font-family: Lato, sans-serif;
```

STYLE 가이드에서 지정한 서체만 사용. 지정 서체가 없으면 Anti-Slop 추천 목록에서 선택:
- **헤딩**: Plus Jakarta Sans, Instrument Serif, Crimson Pro, Newsreader
- **본문**: IBM Plex Sans, Source Sans 3, DM Sans, Pretendard, **Wanted Sans** (한글 대안 — GitHub 314★)
- **모노/액센트**: JetBrains Mono, Fira Code, IBM Plex Mono

### 예외 — DKB references 디자인 시스템 (2026-05-04 추가)

`~/.claude/dkb/references/{tier}/` 등재된 **공식 디자인 시스템 사이트**를 1:1 충실 모방(V1)할 때만 다음 폰트 예외 허용:

| reference | 예외 폰트 | 점수 | 사유 |
|-----------|----------|------|------|
| ui.shadcn.com | Inter | 160/180 | 디자인 시스템 공식 폰트 — Anti-Slop 평균값 회귀가 아닌 의도적 시스템 시그니처 |
| (향후 등재 시) | (해당 시스템 공식 폰트) | 145+ | DKB 등재 검증된 시스템만 |

**적용 조건 (3개 모두 충족 시에만)**:
1. `dkb-search` 매칭 결과 해당 reference가 **Top 1** 으로 선정됨
2. design-replicate 모드가 **V1 충실** (V3 비판/V4 건설은 예외 미적용)
3. 산출물 META에 `reference_exception: "ui.shadcn.com:Inter"` 명시 기록

**예외 미적용**: V3/V4 또는 references 매칭 0건 시 → 기본 금지 룰 그대로 적용 (Anti-Slop 회귀 차단)

**Why**: DKB references 디자인 시스템(shadcn 160점 등)은 LLM 평균값이 아닌 의도된 디자인 결정. 차별 없이 Inter를 차단하면 reference 충실 모방 자체가 불가능 → DKB 도입 효과 무력화.

### 극단 타이포 대비 (필수 적용)

```css
/* Weight jump: 200 이하 vs 800 이상 — 극단 대비가 제네릭 느낌을 깬다 */
--font-weight-display: 900;
--font-weight-subtitle: 200;

/* Size jump: 3배 이상 차이 */
--font-size-hero: clamp(3.5rem, 8vw, 7rem);  /* ~112px */
--font-size-body: 1rem;                        /* 16px → 7:1 비율 */
```

### 프리미엄 CSS 공식 (적극 활용)

STYLE 가이드의 Aesthetic Direction에 맞는 기법을 선택 적용:

| 기법 | CSS 패턴 | 효과 |
|------|---------|------|
| 프리미엄 컨테이너 | `padding: clamp(2rem,5vw,4rem); border-radius: 1.5rem; backdrop-filter: blur(20px)` | 플랫→오브젝트 느낌 |
| 앰비언트 배경 | `radial-gradient(ellipse at 20% 50%, rgba(...,0.15), transparent 50%)` 다중 레이어 | 깊이감 |
| 극단 타이포 | heading: weight 900, size 7rem / subtitle: weight 200, size 1rem | 시각적 임팩트 |
| 그레인 텍스처 | SVG feTurbulence + opacity 0.015 고정 오버레이 | 필름 질감 |
| 유리 효과 | `background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.2)` | 모던 깊이감 |
| 서브틀 그라디언트 | `linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-alt) 100%)` | 단색 배경 탈피 |
| 마이크로 인터랙션 | `transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1)` | 스프링 바운스 |

### 보라색 그라디언트 + 흰색 배경 조합 금지

이 조합은 AI 생성 디자인의 가장 흔한 패턴이다. STYLE 가이드에서 **명시적으로** 지정하지 않는 한 절대 사용하지 않는다.

### 의도 기반 토큰 설명 (CSS 주석 필수)

`:root` 블록의 상위 20개 토큰에 1줄 설명을 CSS 주석으로 추가:

```css
:root {
  --color-accent: #2563EB;       /* 링크, CTA, 활성 상태 — 신뢰/전문성 전달 */
  --spacing-section: 5rem;       /* 섹션 간 여백 — 호흡감, 콘텐츠 구분 */
  --font-size-hero: clamp(3.5rem, 8vw, 7rem); /* 히어로 제목 — 극단 대비 */
  --radius-card: 1.5rem;         /* 카드 모서리 — 프리미엄 오브젝트 느낌 */
}
```

## 결과 출력

```
═══════════════════════════════════
[Style 작성 결과]
═══════════════════════════════════
파일: {파일명}.css
───────────────────────────────────
[토큰]
CSS Custom Properties: {n}개
하드코딩 값: {n}개 (0이어야 함)
───────────────────────────────────
[구조]
섹션: Reset / Typography / Layout / Components({n}) / Responsive / Utility
컴포넌트: {목록}
───────────────────────────────────
[반응형]
브레이크포인트: M({n}규칙) / T({n}규칙) / D({n}규칙)
═══════════════════════════════════
```

## 금지 규칙 (Hard Rules)

아래 규칙 위반 시 reviewer에서 **Critical** 판정됩니다. 예외 없이 준수하십시오.

| # | 규칙 | 사유 | 위반 시 증상 |
|---|------|------|-------------|
| 1 | **`transition: all` 금지** | 의도치 않은 프로퍼티까지 전환 발생 | 레이아웃 깜빡임, 성능 저하 |
| 2 | **GPU 비가속 프로퍼티 애니메이션 금지** | `width`, `height`, `top`, `left` 변경 애니메이션 금지 | 리플로우 발생, 60fps 미달 |
| 3 | **`.scroll-fade-in` Above-the-fold 적용 금지** | 페이지 최초 렌더 시 보여야 하는 요소에 `opacity:0` 시작 클래스 금지 | **화면 공백** (히어로 안 보임) |
| 4 | **외부 CSS 파일 분리 필수** | HTML 내 `<style>` 태그 작성 금지 | CSS 우선순위 충돌, 캐싱 무효화 |
| 5 | **미사용 CSS 규칙 금지** | HTML에 매칭 클래스 없는 규칙 작성 금지 | 파일 비대화, 혼란 유발 |
| 6 | **섹션별 UI-### 주석 필수** | 각 CSS 블록에 대응 UI-### ID 표기 | 디자인→퍼블리싱 역추적 불가 |

**허용 애니메이션 프로퍼티**: `transform`, `opacity`만
```css
/* GOOD */
.card:hover { transition: transform 0.3s ease, opacity 0.3s ease; }

/* BAD — Critical 위반 */
.card:hover { transition: all 0.3s ease; }
.card:hover { transition: width 0.3s ease; }
```

**scroll-fade-in 적용 기준**:
```
Above-the-fold (적용 금지): 히어로, GNB, 로고, 첫 번째 CTA
Below-the-fold (적용 가능): 두 번째 섹션 이하 모든 요소
```

## 출력 형식
- 파일명: `style.css` (단일 파일 원칙, 1500L 초과 시 분할)
- 저장 경로: `output/publish/css/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 입력 검증

| ID | 검증 항목 | 판정 기준 |
|----|----------|----------|
| V1 | STYLE 가이드 존재 | 디자인 토큰 정의 파일 존재. 미존재 시 STOP |
| V2 | Markup 완료 | HTML 클래스 구조 확정. 미완료 시 STOP |

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 하드코딩 0건 | 색상/크기/간격에 리터럴 값 0건. 전부 `var(--token)` 참조 |
| 2 | 토큰 완전성 | STYLE 가이드 토큰 전수 → `:root` 블록에 누락 0건 |
| 3 | BEM 클래스 매칭 | HTML의 모든 커스텀 클래스에 대응 CSS 규칙 존재. 미사용 규칙 0건 |
| 4 | 반응형 3단 | M(≤768) / T(769~1024) / D(≥1025) 브레이크포인트 정의 |
| 5 | 섹션 UI-### 주석 | 각 CSS 블록에 대응 `/* UI-### */` 주석 존재 |
| 6 | 금지 규칙 위반 | `transition: all` 0건, GPU 비가속 애니메이션 0건, above-fold `scroll-fade-in` 0건, `<style>` 태그 0건 |
| 7 | 접근성 | `.sr-only` 정의 존재, `.skip-link` 정의 존재, `*:focus-visible` 정의 존재 |
| 8 | 컬러 대비 | 텍스트/배경 조합이 WCAG AA 기준(4.5:1 일반, 3:1 대형) 충족. 미달 조합 0건 |
| 9 | 미디어쿼리 순서 | mobile-first 기준 min-width 오름차순. max-width 혼용 0건 |
| 10 | **variant 베이스 선언 커버리지** | component-manifest.json의 BEM variant 중 CSS에 `.block--variant { ... }` 로 직접 선언된 비율 **≥ 86%**. 자식만 스타일하고 베이스 미선언 시 기본값(display:block) 렌더링 사고 발생 (실측 사고 케이스) |
| 11 | **Never-Rules (publish-patterns.md) 전수 0건** | Typography(Inter/Arial/<16px)·Color(#000/#6366F1)·Layout(100vh/3-col repeat)·Motion(transition all/hover scale 1.05)·Content(Lorem/Seamless) 매치 0건 |
| 12 | **aesthetic-contract.yaml 참조** | `output/{프로젝트}/.../aesthetic-contract.yaml` 존재 + 선언된 tone/color_banned/typography_banned 전수 준수 |

> 10·11·12는 `publish-visual-verify` Phase 1 의 사전 검증. style 단계에서 선제적으로 통과해야 Ralph Loop 재작업 방지.

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] publish-style
═══════════════════════════════════
▶ 입력 검증
| V1 | STYLE 가이드 존재          | {Pass/STOP} |
| V2 | Markup 완료                | {Pass/STOP} |
▶ 내부 구조 검증
| 1 | 하드코딩 0건                | {Pass/Fail — n건 발견} |
| 2 | 토큰 완전성                 | {Pass/Fail — n/n 토큰} |
| 3 | BEM 클래스 매칭             | {Pass/Fail — 미사용 n건} |
| 4 | 반응형 3단                  | {Pass/Fail} |
| 5 | 섹션 UI-### 주석            | {Pass/Fail} |
| 6 | 금지 규칙 위반              | {Pass/Fail — 위반: xxx} |
| 7 | 접근성                      | {Pass/Fail} |
| 10 | variant 베이스 선언 ≥86%   | {Pass/Fail — 실측 n%} |
| 11 | Never-Rules 0건            | {Pass/Fail — 카테고리별 n건} |
| 12 | aesthetic-contract 참조     | {Pass/Fail — 파일 {존재/부재}} |
▶ PM Devil's Advocate
| DA1 | 토큰 — `var()` 뒤에 숨은 하드코딩(fallback값 남용) | {OK/WARN — 사유} |
| DA2 | 반응형 — 모바일/태블릿 레이아웃 붕괴 구간           | {OK/WARN — 사유} |
| DA3 | 미사용 — HTML에 없는 CSS 규칙이 포함되어 있는가     | {OK/WARN — 사유} |
▶ Design Taste Gate (design-taste.md 기준 — FAIL 시 수정 필수)
| DT1 | Squint Test — 눈을 흐리게 봐도 CTA·제목·본문·네비 위계가 보이는가 | {PASS/FAIL} |
| DT2 | Swap Test — 브랜드를 가려도 아무 사이트나 될 수 있는 디자인이 아닌가 | {PASS/FAIL} |
| DT3 | Signature Test — 기억에 남는 고유한 디테일이 1개 이상 있는가 | {PASS/FAIL} |
| DT4 | Token Test — 선택한 토큰 세트를 일관되게 사용하는가 (warm/cool 혼용 없는가) | {PASS/FAIL} |
───────────────────────────────────
판정: {PASS — 16/16} 또는 {FAIL — n/16}
═══════════════════════════════════
```

### 상세 체크리스트
전체 항목: [checklist.md](checklist.md) 참조 (reviewer 검수 시 사용)

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 STYLE 토큰 목록, MARKUP 섹션 수를 로드.

### 쓰기 (완료 시)
```markdown
## STYLE-CSS 요약
- 생성일: {YYYY-MM-DD}
- CSS 토큰: {n}개
- 하드코딩: {n}건
- 브레이크포인트: {n}개
```

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 토큰 대신 하드코딩 (#1B65A7) | 브랜드 변경 시 전수 수정 | var(--color-primary) 사용 |
| 2 | 모바일 브레이크포인트 누락 | 모바일에서 레이아웃 깨짐 | min-width: 768px, 1024px 필수 |
| 3 | z-index 관리 안 함 | 레이어 겹침 버그 | 토큰화 (--z-modal: 100) |
| 4 | 다크모드 미고려 | 접근성 + UX 저하 | prefers-color-scheme 대응 |

## 내장 지식: 간격 시스템

- Base unit: 4px → 스케일: 4/8/12/16/24/32/48/64
- Inset(패딩): 컨테이너 최소 16px, 권장 24px
- Stack(수직): 관련 항목 sm/md, 비관련 섹션 lg/xl
- 밀도 모드: Compact(데이터 뷰) / Comfortable(기본) / Spacious(읽기 중심)

## 내장 지식: 다크모드

- 단순 반전 금지 — luminance를 의도적으로 줄일 것
- Surface 위계: 배경(가장 어둡게) → Surface 1(카드) → Surface 2(모달) → Surface 3(툴팁) 순으로 밝게
- 색상: Primary 채도 10~20% 감소, 텍스트 off-white(`#E0E0E0`) not 순백
- 보더: 저 opacity white, 이미지 살짝 딤, 로고 라이트 버전
- `prefers-color-scheme` 존중 + 수동 토글 제공, 시맨틱 토큰으로 전환

## 내장 지식: 테마 시스템

- 3-Layer: Global(원시값) → Semantic(의미 별칭, 테마가 여기를 오버라이드) → Component(범위)
- 테마 유형: color modes(light/dark/high-contrast) + brand + density
- CSS custom properties 기반, 런타임 전환

## 내장 지식: CSS Craft 원칙

- **Surface**: 미세 톤 차이(`#fafafa` vs `#ffffff`)로 영역 분리. 소프트 그림자(`0 1px 3px rgba(0,0,0,0.08)`) > 하드 보더
- **Border**: 최후의 수단 — 간격/배경 대비/그림자 우선. 쓸 때 1px `rgba(0,0,0,0.06)`. 보더 중첩 금지
- **Color Intent**: 모든 색상에 역할. 장식적 색상 금지. 배경에 브랜드 2-5% 틴트
- **Spacing**: 관련 요소 8px, 비관련 24px+. 여백은 기능
- **Animation**: 호버 150ms ease-out, 레이아웃 200ms ease-out, 진입 fade+translate(8~12px) stagger 50ms
- **States**: default/hover(배경 변화)/active(scale 0.98)/focus-visible(2px outline)/disabled(40%)

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 디자인 토큰 없이 하드코딩 값 사용 금지 | 일관성 파괴 + 유지보수 비용 |
| 2 | 미디어 쿼리 breakpoint 임의 변경 금지 | 반응형 정합성 파괴 |
| 3 | BEM 네이밍 미준수 선택자 사용 금지 | CSS 구조 일관성 파괴 |

## META 블록 생성 (산출물 하단 필수)

산출물 CSS 파일 최상단 주석에 아래 JSON을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
/* META {
  "skill": "publish-style",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "token_count": 0,
    "hardcoded": 0,
    "breakpoint_count": 0
  },
  "dependencies": [],
  "next_skill": "publish-interaction"
} */
```

## 흔한 AI 실수 — 실전 사례

- **NFR 브레이크포인트 불일치**: 카페예약에서 NFR 명세 D=1280px인데 CSS `min-width: 1025px` (255px 차이). **NFR 수치와 CSS 미디어쿼리를 반드시 대조**.
- **히어로 preload 누락**: 히어로 배경 이미지에 `<link rel="preload">` 미적용은 P1. 카페예약 발견.
- **WebP 미사용**: `<picture>` + WebP 소스 미제공은 P1. 카페예약 발견.
- **img width/height 미명시**: CLS 방지를 위해 모든 `<img>`에 width/height 속성 필수.

$ARGUMENTS
