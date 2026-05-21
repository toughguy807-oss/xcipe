# DNA.md 표준 양식 (v1.0)

> 새 reference 등재 시 이 양식 그대로 복사하여 작성. 빈 항목은 "(미수집)"으로 표기.

---

# {site.com} — 시각 DNA

**분석일**: {YYYY-MM-DD}
**Tier**: {tier-1 / tier-2 / tier-3}
**도메인**: {Industrial AI / Frontier AI / B2B SaaS / 한국 B2B 등}
**18축 종합**: {n}/180
**어워드**: {Awwwards SOTD YYYY-MM-DD / SOTM / GDWEB / 없음}

## 본질 (1줄)

> "{디자이너 시점 1줄 정의 — 이 사이트의 디자인 정수}"

예: "AI 회사가 출판물처럼 보일 때 권위가 생긴다" (Anthropic)

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | n | {예: Styrene B + Copernicus Serif 믹스} |
| L1-2 Color | n | {예: Off-white #FAFAF7 + Coral #CC7856 단일 accent} |
| L1-3 Color Subtlety | n | {예: Pure white 회피, 4 단위 따뜻 톤다운} |
| L1-4 Trend Currency | n | {예: 2025-2026 Off-white + Serif 믹스 시그니처} |
| L2-1 White Space | n | {예: Hero 점유율 42% (절제)} |
| L2-2 Typo Hierarchy | n | {예: weight 400→700 차이, size 4× 대비} |
| L2-3 Korean Typo ★ | n | {한국어 처리 — 한국 사이트만 의미} |
| L2-4 Image Tonality | n | {예: 인물 100% B&W + sepia 후처리} |
| L3-1 Asymmetric Layout | n | {예: 비대칭 6:4 Editorial + 카드 변주} |
| L3-2 Grid Depth | n | {예: Subgrid + Container Query 사용} |
| L3-3 Motion Intent | n | {예: fade-up 0.4s 단독, 외 모션 부재} |
| L3-4 Interaction Craft ★ | n | {예: focus-ring + hover-delay 미세조정} |
| L3-5 Mobile Fidelity ★ | n | {예: 햄버거 풀스크린 nav 시그니처} |
| L3-6 LCP Visual Impact ★ | n | {예: Hero 텍스트 즉시 + 사진 점진} |
| L3-7 Visual Flow ★ | n | {예: Hero → 인용 → CTA 명확} |
| L3-8 Visual Rhythm ★ | n | {예: 배경색 교차 + 밀도 교차} |
| L4-1 Content Weight | n | {예: 인용 1줄 + 단일 KPI} |
| L4-2 Signature Element | n | {예: Coral 점 + Italic Serif H1} |
| **종합** | **{n}/180** | **{판정: PASS/CONDITIONAL/FAIL}** |

## 정확 토큰

### 컬러
- Background: `#FAFAF7` (HSL 50, 14%, 97%) — Pure white(#FFF) 대비 4 단위 따뜻
- Accent: `#CC7856` (HSL 18, 53%, 57%) — 채도 53%, 절대 100% 아님
- Body text: `#1A1815` (Pure black 아님)
- Border: `#1A18151A`
- (그 외 색상)

### 폰트
- H1: {폰트명} / {Italic/Regular} / weight {n} / size {clamp(...)} / line-height {n} / letter-spacing {n}em
- Body: {폰트명} / weight {n} / size {n}px / line-height {n} / color {hex}
- Mono (코드): {폰트명}
- (그 외)

### 간격
- Section 간격: {n}px (대다수 사이트 80~120px 대비)
- Container max-width: {n}px (1440px 아님 의도적)
- Grid gap: {n}px

### 모션
- Fade-up: {n}s {easing}
- Hover transition: {n}s {easing}
- Stagger delay: {n}s × {n} 단계
- (없으면 "모션 부재가 시그니처" 명시)

## 시그니처 요소 (★)

이 사이트만의 고유 요소:
1. **{시그니처 1}**: {설명 — 예: Coral 점 Hero 우상단 작은 1개}
2. **{시그니처 2}**: {예: Italic Serif H1 — AI 회사가 절대 안 쓰는 톤}
3. **{시그니처 3}**: {예: 인용 1줄 + 큰 숫자 Editorial 매거진 룩}

## 사진 톤

- 인물: {예: B&W + 약간 sepia}
- 그래픽: {예: 일러스트 X, 사진만}
- 톤 일관성: {%}

## 모션 정책

- {적용된 모션 목록}
- 절대 안 쓰는 모션: {예: scroll-driven 없음, parallax 없음, hover 과장 없음}

## 절대 안 쓰는 것

- {예: Pure black/white}
- {예: 보라/파랑/Inter}
- {예: 글래스모피즘/그라디언트}
- {예: 3-col 카드 반복}

## {프로젝트 유형} 적용 가이드

### 적용 가능 영역
- **Hero**: {예: Italic Serif + Coral accent}
- **About**: {예: B&W 인물 사진 + 인용}
- **Service**: {예: Serif 번호 큰 H1}

### 적용 부적합 영역
- ❌ **Cases**: {예: Before/After 수치 임팩트가 약함 → Vercel 톤 권고}
- ❌ **Numbers**: {예: 22+/26+/37/5는 다른 톤 필요}

### 가중치 추천
- 1순위 적용: {Hero / About}
- 2순위 적용: {Service}
- 미적용: {Cases / Numbers}

## 출처

- screenshots/full-1440.png ({YYYY-MM-DD} 캡처)
- screenshots/hero-1440.png
- analysis.json (Vision LLM Sonnet 4.6 분석)
- source/index.html (curl {YYYY-MM-DD})
- 어워드 출처: {Awwwards SOTD URL / GDWEB URL}

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | {YYYY-MM-DD} | 초기 등재 (18축 {n}/180) |
