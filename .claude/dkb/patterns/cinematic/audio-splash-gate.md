---
category: cinematic
name: audio-splash-gate
source_refs: [pieterkoopt.nl]
domains: [Premium B2B 컨설팅, 보안, 위기관리, 럭셔리 서비스, Editorial 단일 메시지]
created: 2026-05-06
---

## 시그니처 (1줄)
"WITHOUT AUDIO / WITH AUDIO" 진입 게이트 + dark olive eerie-black `#171C1C` BG + warm beige `#D4C6B9` text + Basic Grotesque 단일 family + Webflow Osmo.supply 209 vars 3-layer 토큰 — premium 차별화 cinematic 진입 의식.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| (BG body) | **`#171C1C`** ★ | eerie-black (dark olive cast) — Pure black 회피 |
| (text primary) | **`#D4C6B9`** ★ | warm beige |
| `--_theme---border` | `#706D66` | gray-warm border |
| (CTA BG) | `rgba(212, 198, 185, 0.05)` | translucent beige |
| `--_colors---swatch--black-60` | `#171c1c99` | 50% black |
| `--swatch--eerie-black` | `#171c1c` | swatch root |
| H1 family | **`"Basic Grotesque", Arial, sans-serif`** ★ | 단일 family 일관 |
| H1 size | `54px` | medium scale |
| H1 weight | `400` | |
| H1 letter-spacing | `-1.35px` | |
| H1 line-height | `54px` | 1.0 ratio |
| H2 size | `21px` | weight 500 / -0.525px |
| heading scale | `heading-{xs, s, m, l, xl, xxl}` | 5단계 모두 Basic Grotesque |
| (총 vars) | **`209`** ★ | Batch 4 최다 |
| container | `clamp(992px, 100vw, 1600px)` | 데스크톱 기준 |
| size-unit | `16` | 1rem 기준 |

## 3-layer 토큰 시스템 (Webflow Custom Code 표준)
- `--_primitives---*` (10+) — 색상 swatch primary
- `--_responsive---*` (그리드/패딩 모바일/태블릿/데스크톱 분기)
- `--_ui-styles---*` (UI 컴포넌트 토큰 — card, button, footer)

## 본질
- **audio splash 진입 게이트** — "WITHOUT AUDIO / WITH AUDIO" 2-choice 의식 (premium 시그니처)
- **dark olive `#171C1C` + warm beige `#D4C6B9`** 듀얼 — Pure black 회피 cinematic dark
- **Basic Grotesque 단일 family** — 모든 heading 통일 (절제)
- **Webflow Osmo.supply scaling system** ★ — body 헤더 주석 명기 `/* Scaling System by Osmo */`
- **3-layer 토큰** (`--_primitives` / `--_responsive` / `--_ui-styles`) — industry-leading custom code 시스템
- **WhatsApp CTA + Cookiebot 3-layer** — 인터랙션 풍부 (premium B2B 정합)
- **container clamp(992-1600px)** — 데스크톱 wide-screen 대응

## 변종
- Variant A — pieterkoopt (premium B2B 보안 컨설팅, 본 패턴 — audio splash)
- (잠재) Variant B — language splash gate ("ENGLISH / KOREAN")
- (잠재) Variant C — region splash gate ("EU / US / ASIA")
- (잠재) Variant D — age gate (alcohol / mature content)

## 적용 가이드
- **Premium B2B 컨설팅 / 보안 / 위기관리 / 럭셔리 서비스 / Editorial 단일 메시지** 1순위
- **dark olive + warm beige 듀얼** Pure black 대체 차용
- **Webflow 3-layer 토큰** (`--_primitives` / `--_responsive` / `--_ui-styles`) 자체 도입 권고
- **audio splash 진입 의식** — premium 차별화 (단, 모바일 우선 사이트는 회피)
- **Osmo.supply scaling system** 통합 (cssVar 헤더 주석 명기 패턴)
- **container clamp(992-1600)** wide-screen premium 대응

## 차단 조건
- ❌ E-commerce 다상품 (audio splash 전환 마찰)
- ❌ B2C 빠른 진입 (게이트 부담)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ 한국 SI / 정부 (premium 톤 충돌)
- ❌ 모바일 우선 사이트 (audio 자동 정합 어려움)
- ❌ 접근성 우선 사이트 (게이트 추가 단계)

## 적합 빌드 환경
- **Webflow Custom Code + Osmo.supply** scaling system
- **Vanilla CSS + 3-layer token 자체 정의**
- **Astro / Eleventy** 정적 사이트 + custom token system

## 출처 references
- `tier-3/pieterkoopt/DNA.md` § audio splash + 209 vars 3-layer + dark olive (140/180, Awwwards SOTD Apr 29)

## 변경 이력
- 2026-05-06 v1.0 — Batch 4 신규 등재 (pieterkoopt.nl 단독 출처)
