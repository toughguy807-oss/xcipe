# old-tom-capital (oldtomcapital.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (143/180 — siteinspire #2)
**interaction_archetype**: tool
**platform**: hybrid
**도메인**: B2B Capital / 골프 산업 투자 / Editorial cinematic
**18축 종합**: **143/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `cinematic-photo-hero` (2순위)
**갤러리**: siteinspire.com Top 10 (2026-05-04)
**적합 도메인**: B2B Capital / 투자/금융 / 골프 산업 / Editorial / 럭셔리 산업
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: siteinspire.com Top 10 (Batch 3)

## 본질 (1줄)

> "Golf's Institutional Platform — B&W cinematic 골프 코스 항공 사진 + 거대 'Golf's' 120px Messinasans `#EDECE9` 라이트 크림 H1 + 우하단 sand 톤 카드 CTA + Editorial 4-color 시스템 (mist/sand/green/black)의 골프 투자 플랫폼 시그니처."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **Messinasans (Custom Sans, weight 400, ls -4px)** + 120px H1 / 24px H2 / Geist Mono accent 듀얼 |
| L1-2 Color | 7 | Pure white `#FFFFFF` BG + body color `#26251c` (sand text — Pure black 회피 ✅) |
| L1-3 Color Subtlety | 7 | **mist/sand/green/black 4-tone 시스템** (`--mist--white`, `--sand--text: #26251c`, `--mist--surface: #cbe3c9`, `--green--demoted: #768363`, `--green--pop: #f34e30`) |
| L1-4 Trend Currency | 8 | 2026 cinematic + 거대 H1 ls -4px Editorial 트렌드 |
| L2-1 White Space | 9 | 거대 사진 + H1 좌하단 + 카드 우하단 — 정밀 negative space |
| L2-2 Typo Hierarchy | 9 | **H1 120px / H2 24px / body 15px — 8:1 극단 대비 (Editorial 시그니처)** |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 9 | **B&W 골프 코스 항공 사진 — 와이어 잔디 텍스처 디테일 시그니처** |
| L3-1 Asymmetric Layout ★ | 8 | 좌하단 H1 + 우하단 sub-card + 상단 nav 3축 |
| L3-2 Grid Depth | 9 | 사진 z + H1 z + 우하단 카드 z + nav z 4 layer |
| L3-3 Motion Intent ★ | 7 | 추정 — scroll fade + 사진 patallax |
| L3-4 Interaction Craft | 8 | "Explore the Platform" + "INVEST with us" 2 CTA pill |
| L3-5 Mobile Fidelity ★ | 7 | 375 캡처 — H1 정합 |
| L3-6 LCP Visual Impact ★ | 9 | B&W 골프 코스 + 거대 H1 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | 사진 → H1 → CTA 명확 |
| L3-8 Visual Rhythm ★ | 8 | nav + H1 + sub-card + body 4축 리듬 |
| L4-1 Content Weight | 8 | "Golf's Institutional Platform" + "The Opportunity in Plain Sight" + "specialist firm consolidating the business of the game" |
| L4-2 Signature Element ★ | 8 | **Messinasans 120px / -4px ls + B&W 골프 항공 사진 + sand sub-card + mist/sand/green/black 4-tone** (4대 시그니처) |
| **종합** | **143/180** | **PASS — tier-3 등재 (siteinspire #2)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `#FFFFFF` (Pure white — 사진 위에서는 invisible)
- Body text: `#26251c` rgb(38, 37, 28) — **sand-text (Pure black 회피 ✅)**
- H1 color: `#EDECE9` rgb(237, 236, 233) — **light cream (사진 위 contrast 흰색 톤)**
- 4-tone 시스템:
  - mist: `--mist--white: white` / `--mist--surface: #cbe3c9` (light mint) / `--mist--demoted: #6f896b`
  - sand: `--sand--text: #26251c` (dark warm)
  - green: `--green--demoted: #768363` / `--green--pop: #f34e30` (orange-red pop)
  - black: `--black--line: #28271f`
- CSS vars: 83개 (Webflow + custom 풍부 시스템)

### 폰트
- 시그니처 family: **Messinasans (Custom Sans, Lineto type foundry)**
- Accent family: **Geist Mono** (`--_responsive---font-styles--accent: "Geist Mono", sans-serif`)
- H1: Messinasans, 120px, weight 400, letterSpacing -4px (-0.033em), lineHeight 102px (0.85)
- H2: Messinasans, 24px, weight 400, letterSpacing -0.2px
- 토큰 명명: clamp 기반 responsive (`--_responsive---font-styles--hdopportunity`)

### 빌드 플랫폼
- **Webflow** (`--_primitives---*` / `--_responsive---*` / `--_ui-styles---*` 3계층 시스템 — Webflow Custom Code 시그니처)
- radius--medium: 0px / radius--small: 0px (선명한 직선 시그니처)
- stroke--border-width: 1px

### 토큰 시스템 (3계층)
1. `--_primitives---colors--*` (neutral/opacity 원시값)
2. `--_responsive---font-styles--*` (반응형 폰트 토큰 — clamp)
3. `--_ui-styles---*` (UI 추상 — radius/gaps/stroke)

### 모션
- 추정: scroll-triggered fade + 사진 parallax + CTA pill hover

## 시그니처 요소

1. **Messinasans 120px / weight 400 / -4px ls** — Editorial 거대 H1 시그니처
2. **B&W 골프 코스 항공 사진** — 와이어 잔디 텍스처 도판
3. **우하단 sand sub-card + 2 CTA pill** — Editorial 카드 보조 시그니처
4. **mist/sand/green/black 4-tone** + Geist Mono accent 듀얼

## 사진 톤
- B&W 골프 코스 항공 100% (와이어 잔디 텍스처 디테일)
- 인물 1명 + 강아지 1마리 (스케일감 부여)

## 모션 정책
- 적용: scroll fade + parallax + CTA pill hover (추정)
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- Pure black `#000000` text (sand-text `#26251c` 정책)
- pastel/cute (Editorial 진중 충돌)
- glassmorphism / neon glow

## 적용 가이드 (Editorial B2B Capital 1순위)
- **B2B Capital / 투자 / 골프 산업 / 럭셔리 산업** 1순위
- **B&W cinematic landscape + 거대 H1** 차용
- **mist/sand/green/black 4-tone** 컬러 정책 (시그니처)
- **Messinasans + Geist Mono** 듀얼 family

### 적용 부적합
- ❌ 한국 SI / 정부 (lgcns-mint-pastel 권고)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ 컬러풀 SaaS (linear/stripe 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/oldtomcapital-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/oldtomcapital-favicon-30.jpg` (11083B)
- tokens: `c:/tmp/dkb-rescore/batch3-tokens.json` § oldtomcapital
- gallery: siteinspire.com Top 10 (2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + siteinspire 갤러리 게이트 통과 (143/180) |

## 후속 보정 권고
1. scroll parallax 비디오 캡처 — 사진 patallax 강도 검증
2. patterns/color-systems/golf-mist-sand-green.md 신규 등재 검토 (4-tone 시스템 시그니처)
3. patterns/typography/messinasans-editorial-120px.md 신규 등재 검토 (B&W landscape + 거대 H1 패턴)
