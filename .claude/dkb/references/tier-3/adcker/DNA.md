# adcker (adcker.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (142/180 — Awwwards SOTD May 01, 2026)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 소셜 미디어 에이전시 / 뷰티 캠페인 / Editorial typographic experiment
**18축 종합**: **142/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `playful-toy` (2순위)
**어워드**: Awwwards SOTD May 01, 2026
**적합 도메인**: 소셜 미디어 에이전시 / 뷰티/패션 캠페인 / 크리에이티브 에이전시 / typographic 실험
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD May 01 (Batch 3)

## 본질 (1줄)

> "Built for Beauty — warm cream `#EFEDEA` BG + sliced typography 'THE ART OF HACKING SOCIAL' + 자체 'nhm' Sans + 메뉴 토글 인터랙션의 social agency 시그니처."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **자체 'nhm' Custom Sans** + sliced/cut 문자 효과 |
| L1-2 Color | 8 | warm cream `#EFEDEA` BG (Pure white 회피 ✅) + `#191919` text (Pure black 회피) |
| L1-3 Color Subtlety | 6 | warm cream + 다크그레이 단색 — 액센트 부재 |
| L1-4 Trend Currency | 9 | 2026 typographic 실험 + sliced effect 트렌드 |
| L2-1 White Space | 9 | 거대 sliced H1 + 좌우 negative space 정밀 |
| L2-2 Typo Hierarchy | 8 | 거대 H1 + 메뉴 14px + 부카피 3단 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 7 | 추정 — Beauty/social media 캠페인 photo (caption 'Beauty on social media') |
| L3-1 Asymmetric Layout ★ | 9 | sliced split layout — 문자 절단으로 z 분리 시그니처 |
| L3-2 Grid Depth | 7 | 12-col grid (Tailwind) + sliced 절단 z축 |
| L3-3 Motion Intent ★ | 8 | 추정 — sliced 모션 (slice 분리 hover/scroll) |
| L3-4 Interaction Craft | 8 | "Click me" + Showreel + Menu 토글 (캡처 detected) |
| L3-5 Mobile Fidelity ★ | 7 | 375 캡처 — sliced 효과 모바일 정합 |
| L3-6 LCP Visual Impact ★ | 9 | sliced 거대 typography 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | H1 → Showreel → 서비스 명확 |
| L3-8 Visual Rhythm ★ | 8 | sliced 좌우 + 메뉴 + Showreel 3축 |
| L4-1 Content Weight | 8 | "THE ART OF HACKING SOCIAL" + "Beauty on social media is a g..." 도발적 카피 |
| L4-2 Signature Element ★ | 9 | **sliced typography + 자체 nhm 폰트 + warm cream + Click me 인터랙션** (4대 시그니처) |
| **종합** | **142/180** | **PASS — tier-3 등재 (Awwwards SOTD May 01)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `#EFEDEA` rgb(239, 237, 234) — **warm cream (Pure white 회피 ✅)**
- 텍스트 primary: `#191919` rgb(25, 25, 25) — 다크 그레이 (Pure black 회피 ✅)
- 메뉴 텍스트 색: `#EFEDEA` (BG와 동일 — 다크 메뉴 위 cream 텍스트)
- CSS vars: 53개 (Tailwind 기반)
- 액센트: 부재 (warm cream + dark gray 단색 정책)

### 폰트
- 단일 family: **nhm (자체 폰트, Sans)** — agency 자체 시그니처
- fallback: sans-serif
- body fontSize: 16px, weight 400, lineHeight 19.2px (1.2)
- letterSpacing: normal

### 빌드 플랫폼
- **Tailwind CSS** (53 `--tw-*` vars 확인)
- WordPress (b-cdn.net CDN — bunny.net) — adcker.b-cdn.net 호스팅
- Swiper.js (`--swiper-navigation-size: 44px`)

### 모션
- 추정: sliced hover 분리 + Showreel modal + Click me 인터랙션

## 시그니처 요소

1. **자체 'nhm' Custom Sans** — agency 자체 폰트 단일 family
2. **sliced typography** ("THE ART OF HACKING SOCIAL" 절단 효과)
3. **warm cream BG `#EFEDEA`** — Pure white 회피 정책
4. **"Click me" + Showreel** 인터랙션 안내 명시

## 사진 톤
- 추정: Beauty/social media 캠페인 (cropped/sliced photo 추정)

## 모션 정책
- 적용: sliced 분리 hover (추정) + Swiper 슬라이드 + Showreel modal
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- Pure white BG (warm cream `#EFEDEA` 정책)
- pastel/cute (Editorial 진중 충돌)
- glassmorphism / neon glow

## 적용 가이드 (Editorial agency 1순위)
- **소셜 미디어 / 뷰티 / 패션 캠페인** 1순위
- **sliced typography 실험** 차용 (Editorial 시그니처)
- **warm cream + dark gray 듀얼** 컬러 정책
- **자체 Custom Sans 단일 family** (system 톤 충돌)

### 적용 부적합
- ❌ 한국 SI / 정부 (lgcns-mint-pastel 권고)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ B2B Capital (oldtomcapital editorial 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/adcker-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/adcker-favicon-32x32.png` (4487B — Playwright context fetch — direct CDN 403 차단)
- tokens: `c:/tmp/dkb-rescore/batch3-tokens.json` § adcker
- award: Awwwards SOTD May 01, 2026
- gallery: awwwards.com Top 10 (2026-04-25 ~ 2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + Awwwards SOTD 게이트 통과 (142/180) |

## 후속 보정 권고
1. sliced 모션 비디오 캡처 — slice 분리 sequence 검증
2. patterns/typography/sliced-letter-experiment.md 신규 등재 검토
3. 'nhm' 폰트 라이선스 조사
