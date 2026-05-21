# pieterkoopt (pieterkoopt.nl) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (140/180 — Awwwards SOTD Apr 29, 2026)
**interaction_archetype**: tool
**platform**: hybrid
**도메인**: 네덜란드 보안/위기관리 컨설팅 / Premium B2B 서비스
**18축 종합**: **140/180**
**Tone 11종 라벨**: `cinematic-photo-hero` (1순위) / `editorial-magazine` (2순위)
**어워드**: Awwwards SOTD Apr 29, 2026
**적합 도메인**: Premium B2B 컨설팅 / 보안·위기관리 / 럭셔리 서비스 / Editorial 단일 메시지 사이트
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 (audio splash + Cookiebot 동시 노출 — 시그니처 인정) + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD Apr 29 (Batch 4)

## 본질 (1줄)

> "네덜란드 premium 컨설팅 — dark olive `#171C1C` (eerie-black) BG + warm beige `#D4C6B9` 텍스트 + Basic Grotesque 단일 family + audio splash 'WITHOUT/WITH AUDIO' 진입 의식 + Webflow Osmo.supply scaling system 209 vars 풍부 토큰의 cinematic premium service site."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 7 | Basic Grotesque H1 54px / -1.35px / 54 line-height — 절제된 medium scale |
| L1-2 Color | 9 | **dark olive eerie-black `#171C1C` + warm beige `#D4C6B9` — Pure black 회피, 따뜻한 dark 톤 만점** |
| L1-3 Color Subtlete | 9 | olive + beige + black-60 (#171c1c99) + border `#706D66` 회색 — 4단계 정밀 |
| L1-4 Trend Currency | 9 | 2026 dark cinematic + audio splash 트렌드 (소수 사이트 도입) |
| L2-1 White Space | 9 | audio splash centered + 거대 negative space — 절제 |
| L2-2 Typo Hierarchy | 8 | H1 54px / H2 21px 1:0.39 + heading-{xs,m,l,xxl} 5단계 토큰화 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 7 | audio splash 가운데 audio waveform 그래픽 (실사 photo 영역은 fold 아래) |
| L3-1 Asymmetric Layout ★ | 8 | 좌상 wordmark + 가운데 audio splash + 우상 nav + 하단 Cookiebot |
| L3-2 Grid Depth | 9 | **Webflow `--_layout---grid` 시스템 + Osmo.supply scaling + container clamp 992-1600** |
| L3-3 Motion Intent ★ | 9 | **Osmo.supply scaling system 통합 ★** (cssVar 헤더 주석 명기) |
| L3-4 Interaction Craft | 9 | audio choice + WhatsApp CTA + Cookiebot 3-layer + How it works button |
| L3-5 Mobile Fidelity ★ | 9 | 209 vars 중 `*-mobile`/`*-tablet`/`*-desktop` 토큰 분리 (Webflow 풍부) |
| L3-6 LCP Visual Impact ★ | 7 | audio splash centered — content 영역 작음 (LCP는 splash 자체) |
| L3-7 Visual Flow ★ | 7 | wordmark → audio choice → fold-below 진입 (1단계 게이트) |
| L3-8 Visual Rhythm ★ | 7 | splash 1축 + nav 1축 + Cookiebot 1축 — 단순 |
| L4-1 Content Weight | 9 | "Time changes everything. Except history." H1 명제 강 |
| L4-2 Signature Element ★ | 9 | **audio splash 진입 의식 + dark olive + Webflow Osmo 209 vars + Basic Grotesque 단일 + WhatsApp CTA** (5대 시그니처) |
| **종합** | **140/180** | **PASS — tier-3 등재 (Awwwards SOTD Apr 29)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: **`#171C1C`** rgb(23,28,28) — eerie-black (dark olive cast) ★ Anti-Slop pure black 회피
- 텍스트 primary: **`#D4C6B9`** rgb(212,198,185) — warm beige
- 테두리: **`#706D66`** (`--_theme---border`, `--_theme---tooltip-border`) gray-warm
- accent semi-transparent: `rgba(212, 198, 185, 0.05)` (CTA BG translucent beige)
- 50% black: **`#171c1c99`** (`--_colors---swatch--black-60`)
- swatch root: `--swatch--eerie-black: #171c1c`

### 폰트
- 시그니처 family: **`"Basic Grotesque", Arial, sans-serif`** (단일 family 일관)
- weight scale: black `900` (`--_fonts---font-weight--black`)
- H1: 54px / 400 / -1.35px / 54px line-height
- H2: 21px / 500 / -0.525px
- 5단계 heading scale: `heading-{xs, s, m, l, xl, xxl}` 모두 Basic Grotesque

### 그리드 / 빌드 (Webflow + Osmo.supply)
- **209 CSS vars 총수** ★ (Batch 4 최다)
- **3-layer 토큰 시스템** ★ — Webflow Custom Code 표준:
  - `--_primitives---*` (10+) — 색상 swatch
  - `--_responsive---` (그리드/패딩 모바일/태블릿/데스크톱 분기)
  - `--_ui-styles---` (UI 컴포넌트 토큰 — card, button, footer)
- **Osmo.supply scaling system** ★ (body 주석에 헤더 명기): `/* Scaling System by Osmo */`
- container: `clamp(992px, 100vw, 1600px)` — 데스크톱 기준
- size-unit: `16` (1rem 기준)
- em-based fluid spacing: `--_sizes---size--{2px..40px}` 다단계

### Modern CSS
- **em-based + clamp container** 패턴 — Webflow modern grid
- 다중 mode 지원: `--color-mode-default--*` (default/dark/light 모드 분기 준비됨)
- `--blueprint--label-height: 3em`

## 시그니처 요소

1. **audio splash 진입 의식** — "WITHOUT AUDIO / WITH AUDIO" 게이트 (premium 사이트 시그니처)
2. **dark olive `#171C1C` + warm beige `#D4C6B9`** 듀얼 — pure black 회피 cinematic dark 톤
3. **Basic Grotesque 단일 family** — 모든 heading 통일 (절제)
4. **Webflow + Osmo 209 vars 3-layer 토큰** — industry-leading custom code 시스템
5. **WhatsApp CTA + Cookiebot 3-layer** — 인터랙션 풍부

## 사진 톤
- audio splash 가운데 audio waveform 그래픽 (캡처 가시 영역)
- fold-below 영역에 실사 photo 추정 (캡처 미확인)

## 모션 정책
- 적용: **Osmo.supply scaling system + scroll FX (추정)**
- 헤더 코멘트 명기: `/* Scaling System by Osmo [https://osmo.supply/] */`
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- Pure black `#000000` (eerie-black `#171C1C` 사용)
- 차가운 blue/gray (warm beige + olive 톤)
- pastel / cute
- 한국 SI 스타일

## 적용 가이드 (cinematic 1순위 — premium B2B)
- **Premium B2B 컨설팅 / 보안 / 위기관리 / 럭셔리 서비스** 1순위
- **dark olive + warm beige 듀얼** 차용 (Pure black 대체)
- **Webflow 3-layer 토큰 (`--_primitives` / `--_responsive` / `--_ui-styles`)** 자체 도입 권고
- **audio splash 진입 의식** — premium 차별화 (단, 모바일 우선 사이트는 회피)

### 적용 부적합
- ❌ E-commerce 다상품 (audio splash 전환 마찰)
- ❌ B2C 빠른 진입 (게이트 부담)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ 한국 SI / 정부

## 출처

- screenshots: `c:/tmp/dkb-rescore/pieterkoopt-{desktop,mobile}.png` (2026-05-06, audio splash + Cookiebot 노출)
- favicons: `c:/tmp/dkb-rescore/pieterkoopt-favicon-{50,20}.png` (PNG primary)
- tokens: `c:/tmp/dkb-rescore/batch4-tokens.json` § pieterkoopt (209 vars)
- award: Awwwards SOTD Apr 29, 2026

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + audio splash canonical state 캡처 (140/180) |

## 후속 보정 권고
1. audio splash 통과 후 메인 fold 재캡처 — premium 컨텐츠 시그니처 검증
2. patterns/cinematic/audio-splash-gate.md 신규 등재 검토 (premium 진입 의식)
3. Webflow `--_primitives---/--_responsive---/--_ui-styles---` 3-layer 패턴 → publish-style 신규 토큰 옵션 추가 검토 (Detroit Paris + pieterkoopt 통합)
4. Osmo.supply scaling system 라이선스/문서 조사 (industry-standard motion lib)
