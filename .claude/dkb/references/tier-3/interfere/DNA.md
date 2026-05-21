# interfere (interfere.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (140/180)
**interaction_archetype**: tool
**platform**: hybrid
**도메인**: Dev tools / SaaS / 버그 트래킹 / 옵저버빌리티
**18축 종합**: **140/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `product-screenshot-hero` (2순위)
**어워드**: 자체 SaaS (lapa.ninja Top 10 dev tools 등재)
**적합 도메인**: Dev tools / SaaS / 버그 트래킹 / 옵저버빌리티 / 인시던트 매니지먼트
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + DevTools eval
**출처**: lapa.ninja Top 10 #9 (2026-05-04)

## 본질 (1줄)

> "흰 BG + Inter Variable + italic 'breaks' Editorial emphasis + 핑크 ambient blur + 거대 product screenshot 카드 z축 — Modern dev tools Editorial."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | Inter Variable + italic emphasis ("breaks" italic) — Editorial 시그니처 |
| L1-2 Color | 7 | Pure white BG + 검정 #000 (rgba 0.875) + 핑크 ambient blur (subtle) |
| L1-3 Color Subtlety | 7 | rgba 알파 0.875/0.608 — opacity 단계 정밀 |
| L1-4 Trend Currency | 8 | 2026 dev tools editorial italic + product screenshot 카드 |
| L2-1 White Space | 8 | 좌측 H1 + 우측 부제 비대칭 + product 카드 풀폭 |
| L2-2 Typo Hierarchy | 8 | H1 56px + 부제 15px (rgba 0.608) + CTA 3단 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 8 | 핑크 ambient blur 좌측 + 흰 product 카드 — 일관 톤 |
| L3-1 Asymmetric Layout | 8 | 좌 H1 + 우 부제 + product 카드 (z-2) — Magazine 비대칭 |
| L3-2 Grid Depth ★ | 9 | **product screenshot 카드 z축 합성** (오른쪽 상세 패널 + 메인 inbox) |
| L3-3 Motion Intent | 7 | 추정 — 핑크 blur 천천히 morph + 카드 hover |
| L3-4 Interaction Craft | 8 | "Login" / "Request a demo" / "Join waitlist" 3단 CTA + DevTools 스타일 좌 nav |
| L3-5 Mobile Fidelity ★ | 8 | 375 캡처 정합 (모바일 product 카드 단축) |
| L3-6 LCP Visual Impact ★ | 8 | 거대 H1 italic + product 카드 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | H1 → 부제 → product card (Inbox / Activity) → impacted users 명확 |
| L3-8 Visual Rhythm | 7 | italic emphasis + product 카드 + 좌 nav 변주 |
| L4-1 Content Weight | 8 | "Build software that never *breaks*" italic 시그니처 명제 + "Detect, triage, fix bugs automatically — no human required" |
| L4-2 Signature Element | 9 | **italic "breaks" + 핑크 ambient blur + product screenshot 카드 z축 + Inter Variable 1:1 line-height** (4대 시그니처) |
| **종합** | **140/180** | **PASS — tier-3 등재 (110~144 범위)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `#FFFFFF` (Pure white — dev tools light 기조)
- 텍스트 primary: `rgba(0, 0, 0, 0.875)` ⚠️ ✅ Pure black 회피 (alpha 87.5%)
- 텍스트 secondary: `rgba(0, 0, 0, 0.608)` (60.8%)
- Primary 액센트: `hsl(228, 100%, 60%)` (~`#3366FF` blue — c15t-primary)
- 핑크 ambient blur: 추정 (좌측 hero blur)
- CSS vars: 629개 (rich token system — c15t-* prefix)

### 폰트
- Display H1: **InterVariable** (Inter Variable) / weight 500 / 56px / letter-spacing -0.56px / line-height 56px (1:1 시그니처)
- Body: InterVariable
- 시그니처: **InterVariable 단일 family + 1:1 line-height + italic emphasis**

### 간격
- H1: 56px / line-height 56px (1:1 — Editorial 시그니처)
- CTA: 6px border-radius / 0px 6px 0px 10px padding

### 모션
- 추정: 핑크 ambient blur slow morph + product 카드 hover/scroll

## 시그니처 요소

1. **italic "breaks" emphasis** — Editorial 시그니처 단어 변주
2. **핑크 ambient blur (좌측 hero)** — 절제 색채
3. **거대 product screenshot 카드 z축** — Inbox + 상세 패널 합성
4. **InterVariable + 1:1 line-height** — Modern dev tools 표준

## 사진 톤
- product screenshot 합성 100% (Inbox UI + 상세 패널)
- 핑크 ambient blur 절제 (액센트)

## 모션 정책
- 적용: ambient blur slow morph + product 카드 hover/scroll fade
- 절대 부재: parallax, glassmorphism, neon

## 절대 안 쓰는 것 (NEVER List)
- 다크 BG (light 기조)
- 비비드 다채 (절제 ambient blur 정책)
- glassmorphism

## 적용 가이드 (Dev tools editorial 1순위)
- **Dev tools / SaaS / 버그 트래킹** 1순위
- **italic emphasis 단어 변주** 차용 (Editorial)
- **product screenshot z축 합성** hero 차용
- **InterVariable + 1:1 line-height** 표준

### 적용 부적합
- ❌ Frontier infra dark (scale-pure-black 권고)
- ❌ AI dev retro CRT (air-dev-retro-cyan 권고)
- ❌ 한국 SI (lgcns-mint-pastel 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/interfere-{desktop,mobile}.png` (2026-05-06)
- tokens: `c:/tmp/dkb-rescore/batch2-tokens.json` § interfere
- gallery: lapa.ninja Top 10 #9 (2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | 초기 등재 (140/180) — Vision 1440+375 + DevTools 토큰 + tier-3 게이트 통과 |

## 후속 보정 권고
1. 핑크 ambient blur 모션 비디오 캡처 — morph timing
2. patterns/typography/editorial-italic-emphasis.md 신규 등재 검토 (interfere "breaks" + studio375 "creative/meet" + relace "001" 통합)
