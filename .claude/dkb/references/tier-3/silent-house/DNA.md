# silent-house (silent-house.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (139/180 — Awwwards SOTD Apr 28, 2026)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 크리에이티브 에이전시 / 이벤트 + 브랜딩 + 프로덕션 통합 / Editorial split layout
**18축 종합**: **139/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `cinematic-photo-hero` (2순위)
**어워드**: Awwwards SOTD Apr 28, 2026
**적합 도메인**: 크리에이티브 에이전시 / 이벤트 / 브랜드 캠페인 / 프로덕션 / Editorial split
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD Apr 28 (Batch 3)

## 본질 (1줄)

> "Three unique companies under one roof — Pure white BG + 'Silent / House' split wordmark + 중앙 3D folded photo card + 거대 'Press' 160px H2 + aktiv_grotesk 듀얼 family의 통합 에이전시 시그니처."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | aktiv_grotesk Variable + H1 54px / -2.16px ls + H2 160px / -6.4px ls — 극단 대비 |
| L1-2 Color | 6 | Pure white `#FFFFFF` BG + Pure black `#000000` text (Pure 사용 ⚠️ — agency 의도) |
| L1-3 Color Subtlety | 5 | overlay `#191919` 보조만 — 흑백 단색 정책 |
| L1-4 Trend Currency | 8 | 2026 split-layout + 3D folded card + 거대 H2 트렌드 |
| L2-1 White Space | 9 | "Silent" 좌 + "House" 우 split — 거대 negative space 정밀 |
| L2-2 Typo Hierarchy | 9 | **H1 54px / H2 160px — 1:3 극단 대비 시그니처** |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 8 | 3D folded photo (3 women in dresses) — 시그니처 도판 |
| L3-1 Asymmetric Layout ★ | 9 | "Silent / House" split + 중앙 3D folded card 3축 비대칭 |
| L3-2 Grid Depth | 8 | wordmark + folded card z축 + Press 160px 별도 z |
| L3-3 Motion Intent ★ | 8 | 추정 — folded card 펼침 모션 + scroll-triggered transitions |
| L3-4 Interaction Craft | 8 | folded card hover + Press toggle |
| L3-5 Mobile Fidelity ★ | 7 | 375 캡처 — split 정합 (cookie modal 일부 잔존) |
| L3-6 LCP Visual Impact ★ | 9 | "Silent / House" + 3D folded photo 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | wordmark → folded card → Press 명확 |
| L3-8 Visual Rhythm ★ | 8 | wordmark split + 카드 + Press + 3 companies 4축 |
| L4-1 Content Weight | 7 | "Three unique companies under one roof, creating experiences you'll never forget." |
| L4-2 Signature Element ★ | 9 | **3D folded photo card + Silent/House split wordmark + 거대 Press 160px + aktiv_grotesk** (4대 시그니처) |
| **종합** | **139/180** | **PASS — tier-3 등재 (Awwwards SOTD Apr 28)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `rgba(0, 0, 0, 0)` (transparent — Pure white BG는 html/section level)
- 텍스트 primary: `#000000` (Pure black 사용 — agency 의도)
- overlay color: `#191919` (`--color-overlay`)
- 보조: gray2 `#c5c5c5` (`--color-gray2`)
- CSS vars: 140개 (Tailwind v4 + custom 풍부 시스템)

### 폰트
- 단일 family: **aktiv_grotesk (Variable Sans, Linotype Original)**
- H1: aktiv_grotesk, 54px, weight 450, letterSpacing -2.16px (-0.04em), lineHeight 56.7px (1.05)
- H2: aktiv_grotesk, 160px, weight 450, letterSpacing -6.4px (-0.04em)
- Variable weight 450 — non-integer 시그니처 (Variable font 정밀 조정)

### 빌드 플랫폼
- **Tailwind v4** (--text-* + oklch 컬러 시스템)
- font-mono: ui-monospace stack
- Swiper.js + animation system (--tw-animation-*)

### 토큰 시스템
- 텍스트 스케일: --text-h1/h2/h3/h4/h5/body/lg/2xl ... (semantic naming)
- 컬러: oklch 시스템 (purple/red/green-* 9 stage 추정)
- 그리드: --grid-col calc 기반 12 col (1rem gap)
- ease: cubic-bezier(.32,0,.67,0) (--ease-in)

### 모션
- speed-fast .2s
- 추정: folded card 펼침 + scroll-triggered fade

## 시그니처 요소

1. **"Silent / House" split wordmark** — 좌우 분리 비대칭
2. **중앙 3D folded photo card** (3 women in dresses — folded portrait)
3. **거대 "Press" 160px H2** — H1 54px와 1:3 대비
4. **aktiv_grotesk Variable weight 450** — non-integer Variable 시그니처

## 사진 톤
- 3D folded photography (펼침/접힘 효과 합성)
- 패션/이벤트/dress 시그니처 도판

## 모션 정책
- 적용: folded card 펼침 + scroll fade + speed-fast .2s 인터랙션
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- pastel/cute (Editorial 진중 충돌)
- glassmorphism / neon glow

## 적용 가이드 (Editorial agency 1순위)
- **크리에이티브 에이전시 / 이벤트 / 브랜딩 통합** 1순위
- **wordmark split + 중앙 카드 3축** 비대칭 차용
- **Variable Sans non-integer weight** (450/550 등) 시그니처
- **거대 H2 (160px)** + 적정 H1 (54px) 1:3 극단 대비

### 적용 부적합
- ❌ 한국 SI / 정부 (lgcns-mint-pastel 권고)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ B2B SaaS dashboard

## 출처

- screenshots: `c:/tmp/dkb-rescore/silenthouse-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/silenthouse-favicon-68.png` (6412B)
- tokens: `c:/tmp/dkb-rescore/batch3-tokens.json` § silenthouse
- award: Awwwards SOTD Apr 28, 2026
- gallery: awwwards.com Top 10 (2026-04-25 ~ 2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + Awwwards SOTD 게이트 통과 (139/180) |

## 후속 보정 권고
1. folded card 모션 비디오 캡처 — 펼침 sequence 검증
2. cookie modal 디스미스 후 재캡처 — 모바일 정합 (현재 일부 잔존)
3. patterns/composition/wordmark-split-hero.md 신규 등재 검토 (Silent House + 다른 split 변종)
