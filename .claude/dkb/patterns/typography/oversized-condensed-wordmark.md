---
category: typography
name: oversized-condensed-wordmark
source_refs: [isadeburgh.com]
domains: [1인 Creative Portfolio, Brand Architect, Photographer, Stylist, Content Strategist]
created: 2026-05-06
---

## 시그니처 (1줄)
FoundersGroteskCondensedMedium 거대 240px H1 + warm white `#FFFEFC` BG + B&W portrait + 4-line 서비스 스택 좌측 정렬 — 1인 brand wordmark 시그니처 minimal-mono 톤.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| (BG body) | **`#FFFEFC`** ★ | warm white (cream tint 1단계) — Pure white 회피 |
| (text) | `#000000` | Pure black |
| H1 family | **`FoundersGroteskCondensedMedium`** ★ | custom Condensed Medium (Klim Type) |
| H1 size | **`240px`** ★ | 거대 condensed display |
| H1 weight | `500` (Medium) | |
| H1 letter-spacing | **`-9.6px`** ★ | extreme negative (240 × -0.04) |
| H1 line-height | **`198px`** ★ | 0.825 ratio (lh/fs) — extreme tight |
| H2 size | `128px` | "Magic mind" 등 sub-wordmark |
| H2 weight | `500` | -5.12px |
| H1 → H2 비율 | `1:0.53` | |
| `--vh` | **`9px`** ★ | 단 1개 var only (mobile vh fix) |

## 본질
- **FoundersGroteskCondensedMedium 240px H1** — 1인 brand wordmark "ISA DE BURGH"
- **letter-spacing -9.6px (240 × -0.04)** — extreme negative condensed
- **line-height 0.825 ratio** — extreme tight (240 → 198px)
- **warm white `#FFFEFC` BG** — Pure white 회피 (1단계 cream tint)
- **B&W 100%** + 약한 cream tint — minimal-mono 톤
- **B&W portrait** 인물 1장 단독 우측 정렬
- **4-line 서비스 스택** "Brand Architecture / Creative Content / Storytelling / Art Direction" 좌측
- **CSS vars 1개만** (`--vh`) — 토큰 시스템 부재 의도 (직접 px 명시 스타일)
- **12s 프리로더** 진입 효과 — premium 1인 site 시그니처
- **H1 240px → H2 128px → portrait → 4-line 서비스** 4축 리듬

## 변종
- Variant A — isadeburgh (1인 Brand Architect, 본 패턴)
- (잠재) Variant B — Photographer wordmark (200px+ Condensed)
- (잠재) Variant C — Stylist / Art Director portfolio (180px+ Condensed)
- (잠재) Variant D — Designer 1인 site (Druk Wide / Druk Condensed 변주)

## 적용 가이드
- **1인 Creative / Brand Architect / Photographer / Stylist / Content Strategist** 1순위
- **거대 condensed H1 (200px+)** 차용 (wordmark 시그니처)
- **letter-spacing -4% extreme negative** condensed 압축
- **line-height 0.8~0.85 extreme tight** 압축 vertical rhythm
- **B&W + warm white tint (1단계 cream)** 듀얼 — minimal-mono 톤
- **서비스 4-line list** 좌측 stack — Editorial 명제
- **B&W portrait 1장 단독** — multi-image collage 회피

## 차단 조건
- ❌ B2B SaaS / 대시보드 (1인 portfolio 전용)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ E-commerce 다상품 (단일 wordmark 적합)
- ❌ 가독성 우선 사이트 (240px H1 부담)
- ❌ 한국어 (FoundersGroteskCondensed — 영문 라틴 전용)
- ❌ 모바일 hero (240px reflow 어려움 — 1단어/줄 부담)

## 라이선스 / 외부 차용 주의
- **FoundersGroteskCondensedMedium** — Klim Type Foundry 라이선스 확인 필수
- 자체 폰트 대체 검토 권고:
  - **Druk Condensed / Druk XX Cond** (Commercial Type) — extreme condensed 직접 매핑
  - **Founders Grotesk Condensed** — Klim Type 정식 (custom 변종 아닌 정식 weight)
  - **GT Pressura Mono** — 변종 가능
  - **Open-source 대체**: Inter Tight (단, condensed 강도 낮음)

## 출처 references
- `tier-3/isadeburgh/DNA.md` § FoundersGroteskCondensedMedium 240px H1 (128/180, lapa.ninja #1 Portfolio)

## 변경 이력
- 2026-05-06 v1.0 — Batch 4 신규 등재 (isadeburgh.com 단독 출처)
