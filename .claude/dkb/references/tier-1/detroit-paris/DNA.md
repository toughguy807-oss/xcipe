# detroit-paris (detroit.paris) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-1 (150/180 — Awwwards SOTD Apr 27, 2026)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI Production House / 럭셔리 브랜드 캠페인 / Editorial cinematic
**18축 종합**: **150/180**
**Tone 11종 라벨**: `cinematic-photo-hero` (1순위) / `editorial-magazine` (2순위)
**어워드**: Awwwards SOTD Apr 27, 2026
**적합 도메인**: 럭셔리 브랜드 / 캠페인 / Editorial / 콘텐츠 제작사 / AI Production
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD Apr 27 (Batch 3)

## 본질 (1줄)

> "AI Production House for Luxury — 풀블랙 cinematic + 'CRAFTING CULTURE' 거대 H1 + Mangogrotesque/Barlow 듀얼 + 럭셔리 음식·향수·인물 photo grid의 Editorial 명제."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **Mangogrotesque (custom Sans 시그니처) + Barlow 듀얼 family** |
| L1-2 Color | 7 | Pure black `#000000` BG + Pure white text — agency cinematic 의도 (Pure 사용 ⚠️) |
| L1-3 Color Subtlety | 6 | 흑백 단색 + accent `#ff4c24` (--color-primary 한 점만) |
| L1-4 Trend Currency | 9 | **2026 cinematic-photo-hero + AI Production 카피 트렌드 직격** |
| L2-1 White Space | 9 | 거대 photo grid + 풀블랙 negative space 정밀 |
| L2-2 Typo Hierarchy | 9 | "CRAFTING CULTURE" 거대 H1 + 부카피 + 메뉴 3단 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 9 | **럭셔리 음식·향수·인물·식기 photo grid — Editorial 일관 톤** |
| L3-1 Asymmetric Layout ★ | 9 | photo grid 비대칭 (faces / champagne macro / oranges / dinner table 4면) |
| L3-2 Grid Depth | 9 | photo grid + 거대 H1 z축 + Osmo.supply osmo helper 인터랙션 |
| L3-3 Motion Intent ★ | 8 | 추정 — Osmo.supply 모션 헬퍼 사용 (cssVar 주석에 명기) |
| L3-4 Interaction Craft | 8 | 풀블랙 환경에서 photo grid hover 인터랙션 (추정) |
| L3-5 Mobile Fidelity ★ | 8 | 375 캡처 — photo grid 세로 정합 확인 |
| L3-6 LCP Visual Impact ★ | 9 | "CRAFTING CULTURE" 거대 H1 + photo grid 즉시 임팩트 |
| L3-7 Visual Flow ★ | 9 | H1 → photo grid 4면 → 클라이언트 카피 명확 |
| L3-8 Visual Rhythm ★ | 9 | photo grid 4면 + H1 + 부카피 3축 리듬 |
| L4-1 Content Weight | 9 | **"AI Production House in Paris, Crafting Culture for Luxury Brands" — AI 프로덕션 명제 시그니처** |
| L4-2 Signature Element ★ | 9 | **Mangogrotesque 자체 폰트 + 풀블랙 cinematic + 럭셔리 photo grid 4면 + Osmo 모션** (4대 시그니처) |
| **종합** | **150/180** | **PASS — tier-1 등재 (Awwwards SOTD Apr 27)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `#000000` (Pure black 사용 — agency cinematic 의도)
- 텍스트 primary: `#000000` body color (사진 영역 위 텍스트는 흰색 — body color는 reset 영역만)
- 액센트: `#ff4c24` (`--color-primary` 단독 — 추정 hover/CTA)
- CSS vars: 8개 (최소 — Webflow + Osmo.supply 모션 헬퍼)
- 부가 컬러: `--white: white`, `--black: black`, `--grey: #0b0b0b1a`, `--grey-bold: #0009`, `--color-neutral-300: #e3e1de`

### 폰트
- 시그니처 family: **Mangogrotesque (Custom Sans, agency 자체)** — H1 시그니처
- 보조 family: **Barlow** (body + 주변 카피)
- fallback: Arial, sans-serif
- H1: Mangogrotesque, fontWeight 700, fontSize ~ 28.8px (문서 첫 detected element는 nav — 메인 화면 카피는 더 큰 사이즈)

### 모션
- **Osmo.supply 모션 헬퍼** 통합 (`/* Osmo [https://osmo.supply/] */` cssVar 주석)
- 추정: photo grid hover 줌 + scroll-triggered fade

## 시그니처 요소

1. **Mangogrotesque (자체 Custom Sans)** — H1 "CRAFTING CULTURE" 시그니처
2. **풀블랙 BG cinematic** — 럭셔리 production house 정책
3. **럭셔리 photo grid 4면** (faces / champagne macro / oranges / dinner table — Editorial 일관 톤)
4. **AI Production House 카피 명제** — "Crafting Culture for Luxury Brands" 차별화

## 사진 톤
- 럭셔리 cinematic 100% (faces close-up + 음식 macro + 식기)
- 색채 absent / 어둠+조명 contrast 극대

## 모션 정책
- 적용: Osmo.supply 모션 헬퍼 (industry-standard motion lib)
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- pastel/cute (cinematic 진중 충돌)
- glassmorphism / neon glow
- 한국 SI 스타일

## 적용 가이드 (cinematic-photo-hero 1순위)
- **럭셔리 브랜드 캠페인 / 콘텐츠 제작사 / Editorial** 1순위
- **풀블랙 BG + 럭셔리 photo grid 4면** 차용
- **자체 Custom Sans (Mangogrotesque류)** H1 — system font 충돌
- **AI Production 카피 명제** 차용 (단, 도메인 일치 시)

### 적용 부적합
- ❌ 한국 SI / 정부 (lgcns-mint-pastel 권고)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ B2B SaaS dashboard (linear/stripe-pure 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/detroitparis-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/detroitparis-favicon-50.png` (8139B)
- tokens: `c:/tmp/dkb-rescore/batch3-tokens.json` § detroitparis
- award: Awwwards SOTD Apr 27, 2026
- gallery: awwwards.com Top 10 (2026-04-25 ~ 2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + Awwwards SOTD 게이트 통과 (150/180) |

## 후속 보정 권고
1. photo grid hover 비디오 캡처 — Osmo 모션 시그니처 검증
2. Mangogrotesque 폰트 라이선스/대안 조사
3. patterns/cinematic/luxury-photo-grid-hero.md 신규 등재 검토 (Detroit + studio375 + Old Tom 통합)
