---
name: publish-markup
description: >
  HTML 마크업 스킬. UI 명세 + IA + STYLE 토큰을 입력받아
  시맨틱 HTML5, BEM 네이밍, SEO, WCAG 2.1 AA 접근성을 갖춘 마크업을 생성합니다.
  "마크업", "markup", "HTML 코딩", "퍼블리싱", "HTML 작성", "시맨틱",
  "HTML 구조", "페이지 코딩", "HTML 변환", "코드 생성" 등
  HTML 마크업을 작성하거나 퍼블리싱하는 맥락에서 자동 호출.
argument-hint: "[UI 명세 파일경로 또는 마크업 요구사항]"
paths: ["output/**/publish/**"]
---

# HTML 마크업 (Publish-Markup) Generator

당신은 **시니어 프론트엔드 퍼블리셔**입니다.

UI 명세를 시맨틱 HTML5로 변환합니다. 디자인 토큰은 CSS 클래스로, 기능 요구사항은 data 속성으로 매핑합니다.

## 전제조건 (Stop 조건)
- **필수**: UI 명세 (UI-### ID가 정의된 .md 파일)
- **권장**: STYLE 가이드 (CSS Custom Properties 정의), IA (페이지 구조)
- **선택**: FN (기능 명세 — 인터랙션 참조)

> 전제조건 미충족 시 오케스트레이터에 보고하고 중단합니다.

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수여부 |
|------|------|------|------|:---:|
| HTML 문법 검증 | npx | `npx html-validate output/publish/*.html` | 잘못된 중첩·누락 태그 검출 | 권장 |
| OG/메타 확인 | curl | `curl -sL {url} \| grep -E 'og:\|meta\s'` | SNS 공유 메타 검증 | 선택 |
| 시맨틱 + 모던 CSS 참조 | Read | `lib/rules/modern-design-stack.md` | :has(), Container Query 기반 구조 | **필수** |
| 히어로 이미지 생성 | `design-image` 스킬 | 플레이스홀더 대체 | 선택 |

> 시맨틱 HTML5 랜드마크(`<main>`, `<article>`, `<aside>`) + BEM 기본. Container Query 반응형 기준으로 카드/리스트 구조 설계.

## 작성 절차

### 1. 입력 분석
- UI 명세에서 컴포넌트 목록 추출 (UI-### ID별)
- IA에서 페이지 계층 구조 확인 (GNB, 사이트맵, Depth)
- STYLE에서 사용 가능한 CSS 클래스명 확인

### 2. 문서 구조 설계
- `<!DOCTYPE html>` + lang 속성 (다국어 시 `hreflang`)
- `<head>`: charset, viewport, title, description, OG 태그, 파비콘
- `<body>`: 시맨틱 랜드마크 순서 — `header > nav > main > footer`
- main 내부: `<section>` 단위로 UI 명세 섹션 매핑

### 3. 컴포넌트 마크업
각 UI-### 컴포넌트를 BEM 규칙으로 변환:

| UI 요소 | HTML 매핑 | BEM 예시 |
|---------|----------|---------|
| 카드 그리드 | `<div class="card-grid">` | `card-grid--{n}col` |
| 카드 | `<article class="card">` | `card__image`, `card__body`, `card__title` |
| 네비게이션 | `<nav class="gnb">` | `gnb__menu`, `gnb__item--active` |
| 히어로 | `<section class="hero">` | `hero__title`, `hero__cta` |
| 리스트 | `<ul class="notice-list">` | `notice-list__item`, `notice-list__date` |
| 버튼 | `<a class="btn">` | `btn--primary`, `btn--secondary-white` |
| 탭 | `<div role="tablist">` | `tab__trigger--active`, `tab__panel` |

### 업종별 시맨틱 구조 힌트 (참고)

업종마다 강조되는 시맨틱 구조가 다릅니다. 마크업 시 참고합니다.

| 업종 | 필수 랜드마크 | 특화 구조 | schema.org |
|------|-------------|----------|-----------|
| 이커머스 | `nav`(카테고리) + `aside`(필터) | `<form>`(검색/결제), `<dialog>`(장바구니) | Product, Offer, BreadcrumbList |
| 관광/문화 | `nav`(다국어) + `main`(코스) | `hreflang` 속성, `<figure>`(갤러리) | TouristAttraction, Event, Place |
| 공공/기관 | `nav`(법적 메뉴) + `form`(민원) | `<table>`(정보공개), 높은 제목 밀도 | GovernmentOrganization, FAQPage |
| 의료/헬스케어 | `nav` + `form`(예약) | `<time>`(진료시간), `<address>`(위치) | MedicalOrganization, Physician |
| 금융/핀테크 | `nav` + `main`(대시보드) | `<table>`(상품비교), `role="alert"` | FinancialProduct, BankAccount |

> 프로젝트 UI 명세가 우선입니다. 위 힌트는 누락 방지 가이드로만 활용합니다.

### 4. 접근성 + SEO 적용
- **ARIA**: `role`, `aria-label`, `aria-expanded`, `aria-hidden`, `aria-current`
- **키보드**: `tabindex`, `focus-visible` 지원
- **제목 계층**: h1(1개) → h2(섹션) → h3(서브) — 건너뜀 금지
- **이미지**: `alt` 필수 (장식 이미지는 `alt=""` + `aria-hidden="true"`)
- **링크**: 의미 있는 텍스트 (`"더보기"` → `"문화행사 더보기"` + `sr-only` 보충)
- **OG/메타**: title ≤60자, description ≤160자, og:image 1200×630

### 5. UI-ID 매핑
모든 섹션 루트에 `data-ui-id="UI-###"` 속성 부여:
```html
<section class="events" data-ui-id="UI-001">
```
→ 디자인 산출물과 퍼블리싱 간 역추적 가능

## 콘텐츠-레이아웃 적합성 판단 (코딩 전 필수)

마크업 구조를 결정하기 **전에** 콘텐츠 유형을 분석하고 적합한 레이아웃을 선택한다.
잘못된 레이아웃은 CSS로 고칠 수 없다.

### 콘텐츠 밀도 분석

| 콘텐츠 유형 | 적합한 레이아웃 | 부적합한 레이아웃 |
|------------|--------------|----------------|
| **텍스트 중심** (블로그, 이력서, 포트폴리오) | 좁은 1컬럼(max-width 680px) 또는 비대칭 2컬럼(사이드바+콘텐츠) | 풀스크린 1컬럼 — 텍스트가 퍼져서 빈약해 보임 |
| **이미지 중심** (갤러리, 쇼핑몰, 관광) | 풀스크린 히어로 + 카드 그리드 + 풀블리드 섹션 | 좁은 1컬럼 — 이미지가 작아져서 임팩트 손실 |
| **데이터 중심** (대시보드, 비교표) | 사이드바+콘텐츠 또는 그리드 대시보드 | 풀스크린 카드 — 데이터 밀도 부족 |
| **혼합형** (기업 소개, 서비스 페이지) | 섹션별 레이아웃 전환 (히어로→카드→텍스트) | 단일 패턴 반복 — 단조로움 |

### 밀도 규칙

- **텍스트 밀도가 낮으면 공간을 좁혀라** — 넓은 공간에 텍스트만 두면 "빈약함"으로 인식
- **비주얼 앵커가 없으면 구조로 프레이밍하라** — 사이드바, 보더, 배경색 변화로 시각적 기둥 생성
- **같은 패턴이 3회 이상 반복되면 변화를 주어라** — 카드 3개 연속 → 4번째는 Featured 또는 다른 레이아웃
- **콘텐츠 양에 비해 공간이 과도하면 max-width를 줄여라** — "여백"과 "빈 곳"은 다르다

### visual-hierarchy 참조 (필수 확인)

마크업 구조가 시각적 위계를 지원하는지 확인:
- Primary (h1, CTA) → 가장 먼저 보이는가?
- Secondary (h2, 주요 콘텐츠) → 다음으로 스캔되는가?
- Tertiary (메타데이터, 태그) → 필요할 때만 읽히는가?
- 한 화면에 Primary가 2개 이상이면 위계 실패

> 참조: `~/.claude/skills/designer-skills-collection/ui-design/skills/visual-hierarchy/SKILL.md`

## Anti-Slop 프로토콜 (마크업 레벨)

design-knowledge의 Anti-Slop 토큰이 마크업에 올바르게 반영되도록 아래를 **강제**한다. 스킵 금지.

### 폰트 로딩 (Google Fonts / CDN)

STYLE 가이드에서 지정한 서체를 `<head>`에 preconnect + Google Fonts `<link>`로 로드.
**금지 폰트(Inter, Roboto, Arial, Open Sans, Lato)는 절대 로드하지 않는다.**

```html
<!-- ✅ Anti-Slop 승인 폰트 예시 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;400;500;700;900&display=swap" rel="stylesheet">

<!-- 한국어 전용: Pretendard CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">

<!-- ❌ 절대 금지 -->
<!-- <link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet"> -->
```

### 레이아웃 Anti-Pattern 회피

| 금지 패턴 | 대안 |
|----------|------|
| 예측 가능한 3-col 동일 카드 그리드 | 비대칭 그리드, 매거진 레이아웃, featured+grid 혼합 |
| 기본 CTA 버튼 "Get Started" / "시작하기" | 프로젝트 맥락에 맞는 구체적 CTA 텍스트 |
| 제네릭 히어로 (큰 텍스트 + 버튼만) | 스토리텔링, 비주얼 임팩트, 인터랙션 요소 추가 |
| 쿠키커터 카드 (아이콘 + 제목 + 설명 × 3) | 다양한 정보 밀도, 비대칭 크기, 호버 상태 차별화 |

### 그레인 텍스처 SVG (프리미엄 질감)

Aesthetic Direction이 premium/refined/editorial인 경우, `<body>` 직후에 그레인 오버레이 삽입:

```html
<svg class="grain-overlay" aria-hidden="true" style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;opacity:0.015;">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#grain)"/>
</svg>
```

> 그레인은 CSS가 아닌 마크업 레벨에서 삽입해야 전체 페이지에 균일하게 적용된다.

### Aesthetic Direction 참조

마크업 구조 결정 시 STYLE 가이드의 Aesthetic Direction(Tone)을 반드시 참조:
- **luxury/refined**: 극단적 여백, 대형 타이포, 최소 요소
- **editorial/magazine**: 비대칭 그리드, 이미지-텍스트 교차, 칼럼 변화
- **brutalist/raw**: 모노스페이스, 그리드 파괴, 고대비
- **organic/natural**: 곡선 컨테이너, 따뜻한 톤, 자연 이미지 중심

## 복잡도별 분기

| 레벨 | 조건 | 처리 |
|------|------|------|
| **높음** | 페이지 10개+, 메가메뉴, 다국어 | 공통 파셜 분리 (header/footer), 템플릿 변수 |
| **중간** | 페이지 3-9개, 기본 GNB | 페이지별 단일 HTML, 공통 구조 복사 |
| **낮음** | 페이지 1-2개, 단순 구조 | 단일 HTML, 인라인 구조 |

## 결과 출력

```
═══════════════════════════════════
[Markup 작성 결과]
═══════════════════════════════════
페이지: {파일명}.html
UI 컴포넌트: {n}개 매핑 완료
───────────────────────────────────
[구조]
시맨틱 랜드마크: header / nav / main({n} sections) / footer
제목 계층: h1(1) → h2({n}) → h3({n})
───────────────────────────────────
[접근성]
ARIA 속성: {n}개
alt 텍스트: {n}/{n} 이미지
키보드 내비: {지원 여부}
───────────────────────────────────
[매핑]
UI-ID: {n}/{n} 매핑됨
미매핑: {목록 또는 "없음"}
═══════════════════════════════════
```

## 금지 규칙 (Hard Rules)

아래 규칙 위반 시 reviewer에서 **Critical** 판정됩니다. 예외 없이 준수하십시오.

| # | 규칙 | 사유 | 위반 시 증상 |
|---|------|------|-------------|
| 1 | **인라인 `style=""` 속성 금지** | 유지보수성 파괴, CSS 캐싱 무효화 | 스타일 일괄 변경 불가 |
| 2 | **`<style>` 태그 금지** | 모든 CSS는 외부 파일로 분리 | CSS 파일과 충돌, 우선순위 혼란 |
| 3 | **이미지 URL 추측 금지** | AI가 존재하지 않는 경로 생성 | 깨진 이미지 다수 발생 |
| 4 | **GNB 메뉴 수 보존** (운영 모드) | 현행 메뉴 항목 수 = 마크업 메뉴 수 | 메뉴 누락 → 네비게이션 파괴 |
| 5 | **Swiper 마크업 3단 구조 필수** | `swiper-container > swiper-wrapper > swiper-slide` | Swiper JS 초기화 실패 |
| 6 | **중복 ID 금지** | 동일 `id` 속성 2회 이상 사용 불가 | JS 셀렉터 오작동, 접근성 위반 |
| 7 | **외부 이미지 URL 직접 `src` 금지** | Unsplash/CDN/브랜드 사이트 이미지는 로컬 다운로드 후 상대경로 사용 | CDN 종료·rate limit·오프라인 동작 실패 |

**이미지 처리 원칙**:
- 실제 확인된 URL만 `src`에 사용
- 불확실하면 `src="placeholder.jpg"` + `alt` 텍스트로 의도 전달
- `data-src-keyword="gangnam nightlife"` 속성으로 후속 소싱 힌트 제공

**이미지 로컬화 정책** (폴더 자체완결성):
- 외부 URL 이미지는 `output/publish/images/`에 다운로드 후 `images/{파일명}` 상대경로로 참조
- 브랜드 공식 사이트의 로고·제품 누끼도 동일
- 다운로드 시 절대경로 사용: `curl -sL -o "/절대경로/output/publish/images/xxx.jpg" "{URL}"`
- 완료 후 `node scripts/check-images.js output/publish/*.html` 실행 → 깨진 이미지 0건 확인
- 이 폴더만 복사하면 어디서든 즉시 동작하는 구조를 유지

## design-image Batch 산출물 자동 소비 (2026-05-04 신설)

design-image 스킬이 `--batch <manifest.json>` 모드로 실행되면 `manifest-output.json`이 생성된다.
publish-markup은 마크업 작성 **시작 전 Step 0.5**에서 이를 자동 탐색·소비하여 `<img>` 태그를 자동 주입한다.

### 자동 탐색 경로 (우선순위)

```
1. output/{프로젝트}/design/assets-manifest-output.json   (design 단계 산출)
2. output/{프로젝트}/assets-manifest-output.json          (루트)
3. output/{프로젝트}/publish/assets-manifest-output.json  (publish 자체 생성 — 후행 작업)
```

존재하지 않으면 자동 주입은 SKIP. 기존 placeholder 처리 절차로 진행한다.

### 자동 주입 컨트랙트

manifest-output.json의 각 result는 `consumer[]` 배열을 가진다. 각 consumer 항목은 다음 스키마를 따른다:

```json
{
  "id": "hero-main",
  "output_path": "output/myproject/publish/images/hero-main.png",
  "alt": "강남구 야경을 배경으로 한 카페 외관",
  "consumer": [
    { "selector": "section.hero[data-ui-id='UI-001'] .hero__image", "attr": "src" },
    { "selector": "meta[property='og:image']", "attr": "content" }
  ]
}
```

| 필드 | 의미 | 처리 |
|------|------|------|
| `output_path` | 생성된 이미지 절대경로 | `images/` 상대경로로 변환 후 `attr` 값에 주입 |
| `alt` | 이미지 alt 텍스트 | `<img>`인 경우 `alt` 속성 동시 주입 |
| `consumer[].selector` | 주입 대상 CSS 셀렉터 | 셀렉터로 요소 탐색. 미존재 시 `errors[]`에 기록하고 계속 |
| `consumer[].attr` | 주입할 속성 | `src`/`href`/`content`/`style:background-image` |

### 처리 절차

1. manifest-output.json 로드 → `summary.success` 건만 처리 대상
2. 각 result에 대해 `consumer[]` 순회
3. 마크업 작성 시 셀렉터에 매칭되는 요소를 만들 때 `output_path`를 상대경로로 변환하여 주입
4. `<img>`는 동시에 `alt`, `loading="lazy"`(히어로 제외) 추가
5. `meta[property='og:image']`처럼 `<head>` 영역 셀렉터는 OG 메타 작성 단계에서 적용
6. 주입 실패(셀렉터 미매치) 시 META 블록 `image_inject_errors`에 nodeId 기록

### 주입 결과 리포트 (Self-Check 직전 출력)

```
═══════════════════════════════════
[design-image Batch 자동 주입 결과]
═══════════════════════════════════
manifest:        output/{프로젝트}/design/assets-manifest-output.json
대상 asset:      {n}건 (success only)
주입 성공:       {m}건
주입 실패:       {n-m}건 (셀렉터 미매치)
실패 상세:       {[id, selector] 목록 또는 "없음"}
───────────────────────────────────
META 기록:       counts.batch_injected = {m}, counts.batch_inject_errors = {n-m}
═══════════════════════════════════
```

> **금지**: manifest에 명시되지 않은 이미지를 자동 추론으로 매칭하지 말 것. consumer[] 셀렉터 매칭만 처리한다.
> **금지**: manifest-output.json의 `success: false` 항목을 placeholder로 채우지 말 것. errors 그대로 보존하여 design-image 재실행으로 해결한다.

**Swiper 마크업 예시**:
```html
<div class="hero-swiper swiper-container" data-ui-id="UI-001">
  <div class="swiper-wrapper">
    <div class="swiper-slide">...</div>
  </div>
  <div class="swiper-pagination"></div>
</div>
<!-- JS 초기화는 publish-interaction에서 담당 -->
```

## 출력 형식
- 파일명: `{페이지명}.html`
- 저장 경로: `output/publish/`
- 이미지: `output/publish/images/` (외부 URL 다운로드 후 상대경로 참조)
- 산출물 폴더 전체가 **자체완결형** — 이 폴더만 복사하면 어디서든 즉시 동작

**HTML 버전 주석** (수정 시):
```html
<head>
  ...
  <!-- 버전 정보: v2 | 작업: 인터랙션 추가 | 원본: v1_A -->
</head>
```
- 작업 유형 enum: `디자인 원본` / `인터랙션 추가` / `이미지 수리` / `검수 수정` / `사용자 수정`
- META 블록의 `parent` / `change_type` 필드와 동일 정보 중복 기재 (HTML 단독 공유 시 가독성)

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 입력 검증

| ID | 검증 항목 | 판정 기준 |
|----|----------|----------|
| V1 | UI 명세 존재 | UI-### ID가 정의된 .md 파일 존재. 미존재 시 STOP |

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 시맨틱 랜드마크 | header > nav > main > footer 순서 존재 |
| 2 | 제목 계층 | h1 정확히 1개, h1→h2→h3 건너뜀 0건 |
| 3 | BEM 네이밍 | 모든 커스텀 클래스가 block__element--modifier 패턴 준수 |
| 4 | UI-ID 매핑 | 모든 섹션 루트에 `data-ui-id="UI-###"` 존재. UI 명세 대비 누락 0건 |
| 5 | ARIA 완전성 | 인터랙티브 요소(탭/드롭다운/모달)에 role + aria-* 존재. 잘못된 ARIA 0건 |
| 6 | 이미지 alt | 모든 `<img>`에 alt 존재 (장식 이미지 = `alt=""` + `aria-hidden="true"`) |
| 7 | 금지 규칙 위반 | 인라인 style 0건, `<style>` 태그 0건, 추측 이미지 URL 0건, 중복 ID 0건 |
| 8 | OG/메타 | title ≤60자, description ≤160자, og:title/description/image 존재, favicon `<link rel="icon">` 존재 |
| 9 | SVG 참조 무결성 | `<use href="#icon-*">` 사용 시 동일 HTML 내 `<symbol id="icon-*">` 정의 존재. 미정의 아이콘 0건 |
| 10 | skip-link 존재 | `<a class="skip-link" href="#main-content">` + `<main id="main-content">` 쌍 존재 |
| 11 | 콘텐츠 밀도 | 반복 콘텐츠 ≥6개, 후기 섹션 존재 시 ≥6개, 푸터 열 ≥4, 타이틀+서브+CTA 미비 섹션 0건 |
| 12 | 이미지 로컬화 | 외부 URL 직접 `src` 0건. 모든 이미지가 상대경로 또는 placeholder |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] publish-markup
═══════════════════════════════════
▶ 입력 검증
| V1 | UI 명세 존재               | {Pass/STOP} |
▶ 내부 구조 검증
| 1 | 시맨틱 랜드마크             | {Pass/Fail} |
| 2 | 제목 계층                   | {Pass/Fail} |
| 3 | BEM 네이밍                  | {Pass/Fail} |
| 4 | UI-ID 매핑                  | {Pass/Fail — n/n 매핑} |
| 5 | ARIA 완전성                 | {Pass/Fail} |
| 6 | 이미지 alt                  | {Pass/Fail — n/n} |
| 7 | 금지 규칙 위반              | {Pass/Fail — 위반: xxx} |
| 8 | OG/메타 + favicon            | {Pass/Fail} |
| 9 | SVG 참조 무결성              | {Pass/Fail — 미정의 n건} |
| 10 | skip-link 존재              | {Pass/Fail} |
| 11 | 콘텐츠 밀도                 | {Pass/Fail — 반복 n/6, 후기 n/6, 푸터 n열/4} |
| 12 | 이미지 로컬화               | {Pass/Fail — 외부 URL n건} |
▶ PM Devil's Advocate
| DA1 | 완전성 — UI 명세 대비 누락 섹션/컴포넌트 | {OK/WARN — 사유} |
| DA2 | 접근성 — 스크린리더 정보 전달 순서 논리성 | {OK/WARN — 사유} |
| DA3 | 견고성 — CMS 연동 시 깨질 하드코딩 구조   | {OK/WARN — 사유} |
▶ Design Taste Gate (콘텐츠-레이아웃 적합성 — FAIL 시 구조 재설계)
| DT1 | 밀도 — 콘텐츠 양 대비 레이아웃 너비가 적절한가 (텍스트 중심인데 풀스크린 아닌가) | {PASS/FAIL} |
| DT2 | 리듬 — 같은 패턴이 3회+ 반복되지 않는가 (카드-카드-카드 단조로움) | {PASS/FAIL} |
| DT3 | 앵커 — 비주얼 앵커(사이드바/이미지/구조적 프레임)가 존재하는가 | {PASS/FAIL} |
| DT4 | 위계 — Squint Test: 눈 흐리게 봐도 Primary/Secondary/Tertiary가 구분되는가 | {PASS/FAIL} |
───────────────────────────────────
판정: {PASS — 15/15} 또는 {FAIL — n/15}
═══════════════════════════════════
```

### 상세 체크리스트
전체 항목: [checklist.md](checklist.md) 참조 (reviewer 검수 시 사용)

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 STYLE 토큰 수, LAYOUT 페이지 수, UI 컴포넌트 수, IA 페이지 구조를 로드.

### 쓰기 (완료 시)
```markdown
## MARKUP 요약
- 생성일: {YYYY-MM-DD}
- 섹션 수: {n}개
- UI ID 매핑: {n}건
- ARIA 속성: {n}건
```

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | UI-### ID 미매핑 | TC에서 요소 찾기 불가 | data-ui-id 전수 부여 |
| 2 | 시맨틱 태그 미사용 (div 남용) | 접근성 + SEO 하락 | header/nav/main/section/article 사용 |
| 3 | ARIA 역할 누락 | 스크린리더 미인식 | 인터랙티브 요소에 role + aria-* 필수 |
| 4 | BEM 네이밍 미준수 | CSS 충돌 | block__element--modifier 엄수 |

## 내장 지식: 구현 검증 6대 카테고리

- **Visual**: 색상=토큰 일치, 타이포 스타일 일치, 간격/크기 정확, 아이콘 정확
- **Layout**: 그리드 정렬, 반응형 브레이크포인트별 동작, overflow/clipping 없음, min/max width
- **Interaction**: 5종 상태(default/hover/focus/active/disabled) 전수, 트랜지션 동작, 클릭 타겟 44px+
- **Content**: lorem ipsum 금지, 말줄임 동작, 빈 상태/에러 상태 정상
- **Accessibility**: 스크린리더 낭독, 대비 AA, 포커스 관리, ARIA 정확, reduced-motion
- **Cross-Platform**: 필수 브라우저, 필수 디바이스, OS 텍스트 크기 설정, 화면 밀도

## 내장 지식: 컴포넌트 마크업 구조

각 컴포넌트: Overview(용도) → Anatomy(분해) → Variants(크기/스타일) → States(7종) → Behavior(인터랙션/반응형/엣지) → Accessibility(ARIA/키보드/포커스)

## 내장 지식: Craft 원칙

- Surface: 미세 톤 차이로 영역 분리 (`#fafafa` vs `#ffffff`), 소프트 그림자 > 하드 보더
- Border: 최후의 수단 — 1px, `rgba(0,0,0,0.06)`. 보더 중첩 금지
- 여백: 관련 요소 8px tight, 비관련 그룹 24px+
- Interactive States: default/hover(배경 변화)/active(scale 0.98)/focus-visible(2px outline)/disabled(40% opacity)

## 내장 지식: 콘텐츠 밀도 기준

> "미니멀이어도 콘텐츠 부족으로 인한 빈 느낌은 미완성이다."

| 요소 | 최소 기준 |
|------|----------|
| 반복 콘텐츠 (제품/서비스/포트폴리오/기사) | **6~8개 이상** (3~4개 금지) |
| 후기/리뷰 섹션 존재 시 | **6개 이상**, 각 구체적 내용 포함 |
| 모든 섹션 | **타이틀 + 서브타이틀 + CTA/더보기 링크** 3종 세트 |
| 푸터 | **로고 + 브랜드 카피 + 4열 링크 + 법적 정보 + SNS 아이콘** (한 줄짜리 푸터 금지) |
| 카드형 콘텐츠 | 이미지 + 제목 + 설명 + CTA 전수 포함 |
| 보조 요소 | 인증/수상 배지 바, 숫자 카운터, 상단 띠배너, 섹션 구분(배경 교차/구분선) 중 1종 이상 |

**콘텐츠 삭제/추가 시 근거 필수** (리뉴얼·운영 모드):
- 기존 콘텐츠를 **뺄 때**: UX 분석, 전환 기여도, 사용자 인터뷰 중 근거 필요
- 새 콘텐츠를 **넣을 때**: CRO 근거, 경쟁사 분석, 소셜프루프 수요 중 근거 필요
- 근거 없는 임의 축소/추가 금지

## 합리화 방지 (Rationalizations + Red Flags)

> 전역 anti-rationalization.md의 스킬별 구체화. 생성 중 아래 패턴 감지 시 즉시 재검토.

### Rationalizations (변명 vs 반박)

| # | 변명 | 반박 | 대응 |
|---|------|------|------|
| R1 | "ARIA는 이 프로젝트에서 불필요하다" | WCAG 2.1 AA는 법적 요건. 포트폴리오 v1→v5에서 ARIA 55건→1건 퇴화 실증 사례 존재 | Self-Check #5 ARIA 완전성 + META aria_count 기록. 이전 버전 대비 하락 시 Fail |
| R2 | "인라인 style은 이 한 곳만이니 괜찮다" | 1건이 선례가 되어 확산. 금지 규칙 #1 위반 = reviewer Critical | 인라인 style 0건 절대 원칙. CSS 파일 분리 |
| R3 | "div로 빨리 구조 잡고 시맨틱은 나중에" | 나중은 실행되지 않음. 초기 시맨틱 미적용 → QA 접근성 전수 Fail | header/nav/main/section/article/footer 최소 5종 필수 |
| R4 | "이미지 alt는 디자이너가 채울 것이다" | CCD 모드에서 외부 의존 금지. alt 미기재 = 접근성 Fail | 확정 텍스트 또는 `alt="[TBD: 이미지 설명]"` 표기 |
| R5 | "BEM 네이밍이 너무 길어 축약한다" | 축약은 CSS 충돌과 유지보수 비용 증가의 원인 | block__element--modifier 원칙 준수. 길이보다 명확성 |
| R6 | "미니멀 디자인이라 콘텐츠 적어도 됨" | 미니멀과 콘텐츠 부족은 다름. 빈 느낌은 미완성 | 내장 지식 콘텐츠 밀도 기준 전수 충족 |
| R7 | "레퍼런스에 없는 섹션이라 생략" | 레퍼런스 복사는 Iron Law 위반. 업종·브랜드 기준 재판단 | 후기/푸터/CTA/보조 요소 기본값 적용 |
| R8 | "외부 이미지 URL이 깨지면 그때 고치면 됨" | CDN 종료·rate limit은 사전 예측 불가. 로컬화가 정책 | 모든 외부 이미지 `images/` 다운로드 후 상대경로 |

### Red Flags (즉시 중단 신호)

| # | 징후 | 의미 | 조치 |
|---|------|------|------|
| RF1 | aria 속성 0건 | 접근성 전무. 포트폴리오 퇴화 패턴 재현 | ARIA 최소 10건 이상 (인터랙티브 요소 전수) |
| RF2 | 시맨틱 태그 3종 이하 | div 남용. SEO + 접근성 동시 하락 | 최소 5종 시맨틱 태그 사용 |
| RF3 | data-ui-id 매핑률 80% 미만 | QA에서 요소 추적 불가 | UI 명세 대비 전수 매핑 |
| RF4 | Anti-Slop 금지 폰트 사용 | Inter/Roboto/Arial 등 금지 폰트 로드 | STYLE 가이드 지정 폰트만 사용 |
| RF5 | 반복 콘텐츠 3개 이하 | 빈 느낌 산출물 확정 패턴 | 최소 6개로 확장 또는 섹션 구조 재설계 |
| RF6 | 외부 URL `src` 직접 사용 | CDN 종료 시 깨짐 + 폴더 복사 시 동작 불가 | `images/`로 다운로드 후 상대경로 |

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 기획서(FN/IA) 범위 외 섹션 임의 추가 금지 | 스코프 크리프 유발 |
| 2 | 디자인 토큰 없이 하드코딩 색상/폰트 사용 금지 | 유지보수 비용 증가 |
| 3 | 접근성(WCAG 2.1 AA) 미충족 마크업 의도적 생략 금지 | 법적 리스크 |

## META 블록 생성 (산출물 하단 필수)

산출물 HTML 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "publish-markup",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "state_version": 1,
  "parent": null,
  "change_type": "design_original",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "section_count": 0,
    "ui_id_mapped": 0,
    "aria_count": 0,
    "repeated_content_max": 0,
    "external_image_urls": 0,
    "batch_injected": 0,
    "batch_inject_errors": 0
  },
  "ids": {
    "first_ui": "UI-001",
    "last_ui": "UI-000"
  },
  "dependencies": [],
  "next_skill": "publish-style"
} -->
```

## 흔한 AI 실수 — 실전 사례

- **ARIA 퇴화 현상**: 포트폴리오 v1(55건 aria) → v5(1건). 버전 올라갈수록 접근성 하락. Self-Check가 이 퇴화를 못 잡았음. **매 생성 시 aria/role 수를 META에 기록하고 이전 버전 대비 하락 시 경고**.
- **Self-Check ≠ 실제 검증**: v3에서 ARIA 0건인데 Self-Check PASS 판정. 코드 내 aria 패턴을 Grep으로 실수 세야 함.
- **시맨틱 태그 최소 기준**: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>` 중 최소 5종 사용. 미달 시 FAIL.
- **BEM 클래스명 일관성**: 한 파일 내에서 BEM과 비-BEM을 섞지 않는다.
- **이미지 lazy loading**: 히어로 제외 모든 `<img>`에 `loading="lazy"` 필수. 카페예약에서 P0 이슈.

$ARGUMENTS
