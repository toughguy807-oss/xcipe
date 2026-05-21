# floema (floema.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-1 (152/180 — siteinspire #4 E-Commerce, Portuguese furniture/lifestyle)
**interaction_archetype**: tool
**platform**: hybrid
**도메인**: 가구·생활용품 / Sustainable lifestyle / E-commerce Editorial
**18축 종합**: **152/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `craft-organic` (2순위)
**어워드/갤러리**: siteinspire #4 E-Commerce
**적합 도메인**: 가구·인테리어 / 라이프스타일 / 지속가능 / Editorial e-commerce / Craft 브랜드
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 (Cookiebot 디스미스) + 멀티모달 view + DevTools eval
**출처**: siteinspire.com #4 E-Commerce (2026-05-04 큐)

## 본질 (1줄)

> "Sustainable furniture editorial — 따뜻한 cream `#F2EFEA` BG + Zimula Serif 헤드라인 + scattered product card collage(흩어진 카드 16+ panel) + Locomotive 24-col + clamp 기반 fluid grid의 portuguese craft editorial."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **Zimula Serif H1 57.2px / -2.288px / 400 + 60.06 line-height — refined Editorial Serif** |
| L1-2 Color | 9 | **warm cream `#F2EFEA` + `#241F21` near-black — Pure white/black 회피 만점** |
| L1-3 Color Subtlety | 9 | 단일 cream tone + product photo로 색감 분산 — 절제된 팔레트 |
| L1-4 Trend Currency | 9 | 2026 Editorial collage + scattered cards 트렌드 직격 |
| L2-1 White Space | 9 | scattered 16+ product cards 사이 cream negative space 정밀 |
| L2-2 Typo Hierarchy | 9 | H1 57.2px → H2 51px 1:1.12 비율 + 메뉴 캡슐 4개 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (포르투갈어) |
| L2-4 Image Tonality | 9 | 16+ 작은 product cutout cards — Editorial collage 일관 톤 |
| L3-1 Asymmetric Layout ★ | 10 | **scattered product cards (위치 랜덤) + 중앙 H1 — 강한 비대칭 collage** |
| L3-2 Grid Depth | 10 | **Locomotive 24-col `--grid-columns: 24` + clamp 기반 fluid gap** |
| L3-3 Motion Intent ★ | 9 | Locomotive scroll + scattered cards parallax (추정) |
| L3-4 Interaction Craft | 8 | 캡슐 메뉴 hover + product card hover (추정) |
| L3-5 Mobile Fidelity ★ | 9 | 375 — H1 3-line wrap + scattered cards reflow 정합 |
| L3-6 LCP Visual Impact ★ | 9 | "Espaços pensados para viver e durar uma vida." Serif 카피 + 16+ cards 즉시 임팩트 |
| L3-7 Visual Flow ★ | 9 | nav → H1 → scattered cards → fold-below 전체 1장면 |
| L3-8 Visual Rhythm ★ | 9 | 큰 H1 1축 + 작은 cards 16+ 1축 + nav 캡슐 4개 — 3축 리듬 |
| L4-1 Content Weight | 9 | "Espaços pensados para viver e durar uma vida" (살고 지속하기 위한 공간) — 명제 강 |
| L4-2 Signature Element ★ | 10 | **scattered product cards 16+ panel + cream + Zimula Serif + Locomotive 24-col** (4대 시그니처) |
| **종합** | **152/180** | **PASS — tier-1 등재 (siteinspire #4)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: **`#F2EFEA`** (`--body-backgroundColor: #f2efea`) — warm cream
- 텍스트: **`#241F21`** rgb(36,31,33) — near-black warm
- accent: product photo color (cards 자체)
- 캡슐 메뉴 BG: cream tinted (희미한 white 배경)

### 폰트
- 시그니처 family: **Zimula** (custom Serif)
- H1: 57.2px / weight 400 / letter-spacing -2.288px / line-height 60.06px
- H2: 51px / weight 400 / -2.04px
- 본문 fallback: sans-serif

### 그리드 (Locomotive 24-col)
- `--grid-columns: 24` ★ (24-col 시스템 — 16-col / 12-col 대비 정밀)
- `--grid-margin: clamp(16px, 10.15px + 100vw * .015, 36px)`
- `--grid-gap: clamp(14px, 9.71px + 100vw * .011, 28px)`
- `--grid-half-gap: calc(--grid-gap * .5)`
- `--grid-padding: calc(--grid-margin - --grid-half-gap)`
- `--grid-width: calc(100vw - --grid-margin * 2)`
- modal-width / modal-row-width: clamp 기반 fluid

### Modern CSS
- **dvh / svh / lvh / 100vw** 4종 viewport units 모두 사용
- **clamp() 기반 fluid scaling** 전 시스템 적용
- 17 vars (간결하지만 sophisticated)

## 시그니처 요소

1. **scattered product cards 16+ panel** — 페이지 전체에 무작위 위치 배치 (가운데 H1 둘러싸기)
2. **warm cream `#F2EFEA` BG** — Anti-Slop pure white 회피
3. **Zimula Serif H1 -2.288px letter-spacing** — Editorial Serif 시그니처
4. **Locomotive 24-col + clamp fluid grid** — 정밀 industry-leading grid

## 사진 톤
- product photos: cutout (배경 제거) + warm tone match cream BG
- 16+ products / cards 작은 사이즈로 흩뿌림 (Editorial collage)
- 대형 photo zero — 모두 작은 cards 통일

## 모션 정책
- 적용: Locomotive scroll + scattered cards parallax (추정)
- 절대 부재: 글래스모피즘, 네온 글로우, pastel, 자동재생 비디오 (cards 정적)

## 절대 안 쓰는 것 (NEVER List)
- Pure white BG / Pure black BG
- 풀블리드 photo hero (scattered cards가 시그니처)
- pastel / cute
- 한국 SI 스타일

## 적용 가이드 (editorial-magazine 1순위)
- **가구·인테리어·라이프스타일 e-commerce** 1순위
- **scattered cards 16+ collage** 차용 (제품 다수 시각화)
- **cream + Serif H1** 듀얼 — Editorial 톤
- **Locomotive 24-col** 자체 도입 어려우면 12-col로 대체

### 적용 부적합
- ❌ B2B SaaS / 정부 (Editorial collage 부적합)
- ❌ FinTech (cream warm tone 충돌)
- ❌ AI dev tools (air-dev-retro-cyan 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/floema-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/floema-favicon-55.ico`
- tokens: `c:/tmp/dkb-rescore/batch4-tokens.json` § floema
- gallery: siteinspire #4 E-Commerce (2026-05-04 큐)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + Cookiebot 디스미스 후 캡처 (152/180) |

## 후속 보정 권고
1. patterns/editorial/scattered-product-collage.md 신규 등재 검토 (16+ panel 시그니처 분리)
2. Locomotive 24-col 시스템 → publish-style 신규 grid 옵션 추가 검토
3. Zimula Serif 라이선스/대안 조사 (Fraunces / Aglet Slab 매핑)
