# dashburger (dashburger.ie) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (140/180 — siteinspire #9 Food & Beverage)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 식품 / 버거 체인 / 아일랜드 D2C / Food experience
**18축 종합**: **140/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위 — Kommissar XCond) / `playful-toy` (2순위 — '100%' + Burger Club)
**어워드**: siteinspire #9 Food & Beverage (2026-05-04)
**적합 도메인**: Food / Restaurant / D2C / Burger / 캐주얼 식음료
**Vision 검증**: 2026-05-06 — Playwright 1440+375 + Cookiebot 처리 + 멀티모달 view + DevTools eval
**출처**: siteinspire.com #9 (Batch 5)

## 본질 (1줄)

> "JOIN THE BURGER CLUB — Pure white BG + Kommissar XCond Regular 거대 H2 190px / H1 100% 80px (line-height 210px) + MessinaSans-Regular body + Bootstrap 토큰 — 버거 체인이 매거진 표지처럼."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 10 | **Kommissar XCond Regular H2 190px / H1 80px line-height 210px (2.6) — XCond extreme 시그니처** ★ |
| L1-2 Color | 4 | **Pure white `#FFFFFF` BG ⚠️ + Pure black text — Anti-Slop 위반 (풀블리드 burger photo로 보완)** |
| L1-3 Color Subtlety | 6 | Bootstrap palette 다채 (yellow/info/orange/success/danger) but 실사 사진 의존 |
| L1-4 Trend Currency | 8 | **2026 Kommissar XCond extreme + 풀블리드 product photo 트렌드** |
| L2-1 White Space | 8 | hero 거대 padding + 풀블리드 burger photo |
| L2-2 Typo Hierarchy | 9 | H1 80px → H2 190px (역전) → body 16px — XCond contrast 강 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (영문 D2C) |
| L2-4 Image Tonality | 9 | **풀블리드 burger photo macro — 일관 식욕 톤** |
| L3-1 Asymmetric Layout ★ | 8 | 'JOIN THE BURGER CLUB' 거대 + photo 균형 |
| L3-2 Grid Depth | 7 | 70 vars Bootstrap (관행) — 정교 토큰 부족 |
| L3-3 Motion Intent ★ | 8 | **`cursor: none !important` 시그니처 + animate-duration 1s + animate-delay 1s — custom cursor 의식** |
| L3-4 Interaction Craft | 8 | "View Menus" CTA + custom cursor + Burger Club 멤버십 |
| L3-5 Mobile Fidelity ★ | 8 | 375 모바일 hero 적합 (XCond 트리밍) |
| L3-6 LCP Visual Impact ★ | 9 | **거대 'JOIN THE BURGER CLUB' 190px Kommissar XCond + burger photo — 즉시 시그니처** |
| L3-7 Visual Flow ★ | 8 | hero → 100% → menu → Burger Club 선형 |
| L3-8 Visual Rhythm ★ | 8 | XCond H2 190px + H1 80px + body MessinaSans + photo — 4축 리듬 |
| L4-1 Content Weight | 9 | **'100%' + 'JOIN THE BURGER CLUB' Editorial 명제 — 버거 체인을 매거진처럼** |
| L4-2 Signature Element ★ | 9 | **Kommissar XCond Regular + MessinaSans + custom cursor + 풀블리드 burger + Bootstrap** (5대 시그니처) |
| **종합** | **140/180** | **PASS — tier-3 등재 (siteinspire #9 Food & Beverage; Pure white 패널티 -3 적용)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러 (Bootstrap 5 시그니처)
- Background: **`#FFFFFF`** (Pure white) ⚠️ Anti-Slop 위반
- 텍스트 primary: `#000000` (Pure black)
- bs-primary: `#0D6EFD` (blue)
- bs-yellow: `#FFC107` / bs-orange: `#FD7E14` / bs-info: `#0DCAF0` / bs-cyan: `#0DCAF0`
- bs-success: `#198754` / bs-green: `#198754`
- bs-danger: `rgb(220,53,69)` / bs-warning: `rgb(255,193,7)`
- bs-purple: `#6F42C1` / bs-code-color: `#D63384`
- bs-gray: `#6C757D` / bs-gray-200: `#E9ECEF` / bs-gray-400: `#CED4DA`
- bs-secondary: `#6C757D`
- bs-border-color: `#DEE2E6`
- bs-link-hover-color: `#0A58CA`

### 폰트
- body: **`MessinaSans-Regular`** + **`MessinaSans-Bold`** (Luzi Type custom)
- H1/H2: **`"Kommissar XCond Regular Regular"`** ★ (extreme condensed Sans by Reservoir Type)
- H1: **80px / weight 500 / letter-spacing -0.4px / line-height 210px** (2.625 — extreme spacing)
- H2: **190px / weight 500 / -0.4px** (signature 거대)
- bs-body-font-size: 1rem / bs-body-line-height: 1.5
- bs-body-font-weight: 400
- bs-font-monospace: SFMono-Regular,Menlo,Monaco,Consolas

### 그리드 / spacing
- 70 vars Bootstrap 5 표준
- bs-border-radius: 0.25rem / sm / xl 1rem / 2xl 2rem
- bs-border-width: 1px

### 모션 / 인터랙션
- **`cursor: none !important`** ★ (custom cursor 시그니처 — body, html 강제 적용)
- `animate-duration: 1s`
- `animate-delay: 1s`
- (Animate.css 추정)

## 시그니처 요소

1. **Kommissar XCond Regular** — Reservoir Type extreme condensed Sans 190px H2 (signature)
2. **MessinaSans-Regular / Bold** — Luzi Type custom body
3. **`cursor: none !important`** — custom cursor 의식 (interactive food experience)
4. **풀블리드 burger photo macro** — Editorial product photo
5. **Bootstrap 5** — 식음료 D2C 빌드 stack

## 사진 톤
- 풀블리드 burger macro photo (식욕 톤)
- product 화이트 배경 catalog (페어링 보조)
- MessinaSans body 정합 톤

## 모션 정책
- 적용: custom cursor + animate-css transition
- 절대 부재: WebGL, 3D, 글래스모피즘 (식음료 D2C 정합성)

## 절대 안 쓰는 것 (NEVER List)
- 다크 BG (식음료 light 톤)
- 한국어 (영문 아일랜드 D2C 전용)
- 절제 미니멀 (풀블리드 photo 시그니처와 충돌)

## 적용 가이드 (editorial-magazine 1순위)

- **Food / Restaurant / D2C / Burger / 캐주얼 식음료** 1순위
- **Kommissar XCond / extreme condensed Sans** — 거대 H2 190px Editorial 표지
- **풀블리드 burger / product macro photo** — 식욕 톤 차용
- **custom cursor (`cursor: none !important`)** — interactive food experience
- **Bootstrap 5** — 식음료 D2C 빌드 stack 활용

### 적용 부적합
- ❌ B2B SaaS dashboard (Editorial food 톤)
- ❌ 럭셔리 / refined (캐주얼 burger 톤)
- ❌ 한국 SI (영문 캐주얼)

## ⚠️ 주의 사항

- **Pure white BG 사용** — Anti-Slop 정책 ⚠️ (풀블리드 photo로 보완하지만 회피 권고)
- **Kommissar XCond 라이선스** — Reservoir Type 외부 차용 시 확인 필요
- **MessinaSans 라이선스** — Luzi Type 확인 필요

## 출처

- screenshots: `c:/tmp/dkb-rescore/dashburger-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/dashburger-favicon-*.png|svg`
- tokens: `c:/tmp/dkb-rescore/batch5-tokens.json` § dashburger
- gallery: siteinspire #9 Food & Beverage (2026-05-04 추출)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + Cookiebot 처리 + DevTools 토큰 (140/180, tier-3 — Batch 5 #5) |

## 후속 보정 권고
1. Kommissar XCond Regular Reservoir Type 라이선스 확인 (외부 차용 시)
2. extreme condensed Sans 190px → `patterns/typography/extreme-condensed-headline.md` 신규 등재 검토
3. `cursor: none !important` custom cursor → `patterns/interaction/custom-cursor-food.md` 검토
4. 풀블리드 burger macro → `patterns/cinematic/food-product-macro-hero.md` 검토
