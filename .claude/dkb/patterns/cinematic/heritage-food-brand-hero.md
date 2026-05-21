---
category: cinematic
name: heritage-food-brand-hero
source_refs: [donmolinico.com]
domains: [Food, Heritage, Hospitality, 농수산, 식품 브랜드, 와이너리]
created: 2026-05-06
---

## 시그니처 (1줄)
warm cream `#FBF5E7` BG + super-med 거대 216px H1 (line-height 0.85) + red dominant `#D70321` body text + gold `#CBA058` accent + 풀블리드 charcuterie macro photo + "DESDE 1987" heritage marker + 빨간 wordmark badge 좌상 고정.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--c-bg` | **`#FBF5E7`** ★ | warm cream BG |
| `--c-accent` / `--text-color` | **`#D70321`** ★ | red dominant body text |
| `--c-text-alt` | `#FBF5E7` | cream (photo 위) |
| `--c-secondary` | **`#CBA058`** ★ | gold accent |
| `--c-accent-dark` | `#9F0005` | red dark |
| (placeholder) | `#363636` | dim grey |
| H1 family | **`super-med`** custom Sans (illustrative weight) | |
| H1 size | **`216px`** ★ | super-med signature |
| H1 weight | `400` | |
| H1 line-height | **`183.6px`** ★ | 0.85 ratio (extreme tight) |
| `--columns` | `12` | 12-col fluid |
| `--width` | `96vw` | margin 4vw |
| `--gutter` | **`max(2rem, min(2vw, 4rem))`** ★ | clamp via max(min()) modern pattern |
| `--col` | `calc((96vw - 11 * gutter) / 12)` | col 계산 |
| `--col-{1..12}` | 사전 계산 12개 | static col widths |
| `--offset` / `--offset-half` / `--offset-double` | 3종 | offset 시스템 |
| `--height` | `100svh` | svh viewport unit |
| `--radius` | `2rem` | 큰 둥근 모서리 |

## 본질
- **빨간 wordmark badge** 좌상 absolute 고정 — Heritage seal 형태
- **super-med 216px 거대 H1** — Spanish heritage typography 명제
- **line-height 0.85 ratio** — extreme tight (216px → 183.6px) heritage 진중
- **풀블리드 charcuterie macro photo** — Iberico ham + olives + cheese cinematic
- **cream + red 듀얼 + gold accent** heritage food brand 톤
- **"DESDE 1987" 마커 라벨** — heritage years 강조
- **clamp via max(min())** modern fluid grid 패턴 — Webflow 표준 외 sophisticated
- **`100svh` viewport unit** — iOS Safari 주소창 대응

## 변종
- Variant A — donmolinico (Spanish charcuterie, 본 패턴 — red dominant)
- (잠재) Variant B — Italian heritage (green-cream-gold 변주)
- (잠재) Variant C — French boulangerie (brown-cream-gold)
- (잠재) Variant D — 한국 전통 식품 (먹색-cream-금장)

## 적용 가이드
- **식품 브랜드 / heritage / hospitality / 농수산 / 와이너리 / 양조장** 1순위
- **풀블리드 macro photo + 거대 condensed H1 (200px+)** 차용
- **cream + brand color (red/green/blue) 듀얼 + gold accent** 팔레트
- **wordmark badge 좌상 고정** 헤리티지 seal 패턴
- **"DESDE/SINCE/이래로 {year}"** heritage marker 라벨
- **풀블리드 macro photo** 자연광 + 따뜻한 톤 (식욕 / 헤리티지)

## 차단 조건
- ❌ B2B SaaS dashboard (cinematic 부적합)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ 의료 / 법률 (red 위험)
- ❌ FinTech (heritage 진중 충돌 — fintech-candy-palette 권고)
- ❌ 빠른 prototyping / launchpad (Editorial 묵직)
- ❌ 한국 SI / 정부 (heritage 톤 충돌)

## 라이선스 / 외부 차용 주의
- **super-med** — custom Sans 라이선스 확인 필수
- 자체 폰트 대체 검토 권고: Druk Wide / Migra (Pangram Pangram) / Editorial New

## 출처 references
- `tier-1/donmolinico/DNA.md` § super-med 216px H1 + cream-red-gold 헤리티지 (149/180, Awwwards SOTD Apr 25)

## 변경 이력
- 2026-05-06 v1.0 — Batch 4 신규 등재 (donmolinico.com 단독 출처)
