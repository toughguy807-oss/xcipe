---
category: editorial
name: scattered-product-collage
source_refs: [floema.com]
domains: [E-commerce, 가구, 인테리어, 라이프스타일, Editorial 매거진]
created: 2026-05-06
---

## 시그니처 (1줄)
warm cream `#F2EFEA` BG + Locomotive 24-col `--grid-columns: 24` + clamp() fluid grid + 16+ product cards 무작위 위치 흩뿌림 (가운데 H1 둘러싸기) Editorial collage 시그니처.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--body-backgroundColor` | **`#F2EFEA`** ★ | warm cream BG |
| (text primary) | **`#241F21`** ★ | near-black warm |
| H1 family | **`Zimula`** custom Serif | Editorial Serif 시그니처 |
| H1 size | `57.2px` | medium signature |
| H1 weight | `400` | |
| H1 letter-spacing | **`-2.288px`** ★ | Editorial 강 negative |
| H1 line-height | `60.06px` | 1.05 ratio |
| `--grid-columns` | **`24`** ★ | Locomotive 24-col (16/12 대비 정밀) |
| `--grid-margin` | `clamp(16px, 10.15px + 100vw * .015, 36px)` | fluid margin |
| `--grid-gap` | `clamp(14px, 9.71px + 100vw * .011, 28px)` | fluid gap |
| `--grid-half-gap` | `calc(--grid-gap * .5)` | half gap |
| `--grid-padding` | `calc(--grid-margin - --grid-half-gap)` | padding 계산 |
| `--grid-width` | `calc(100vw - --grid-margin * 2)` | full width |
| viewport units | **`dvh / svh / lvh / 100vw`** ★ | 4종 modern viewport |

## 본질
- **24-col Locomotive grid** — 16-col / 12-col 대비 정밀 분할 (cards 자유 배치)
- **clamp() fluid scaling 전 시스템** — 모바일~데스크톱 매끈 전환
- **dvh/svh/lvh modern viewport units** — iOS Safari 주소창 대응
- **scattered cards 16+ panel** — 페이지 전체에 작은 cutout product cards 흩뿌림
- **cards 둘러싸기** — 가운데 H1을 cards가 둘러싼 Editorial collage
- **cutout product photo** — 배경 제거 + warm tone match cream BG
- **17 vars 간결 sophisticated** — 토큰 수는 적지만 modern CSS 패턴 풍부

## 변종
- Variant A — floema (가구·인테리어 e-commerce, 본 패턴)
- (잠재) Variant B — fashion E-commerce small lookbook collage
- (잠재) Variant C — Editorial 매거진 archive grid

## 적용 가이드
- **가구·인테리어·라이프스타일 E-commerce** 1순위
- **fashion lookbook / archive 매거진** 2순위
- **scattered 16+ panel cards** 차용 (제품 다수 시각화 → 무드보드)
- **cream + Serif H1 둘러싸기** Editorial collage 톤
- **Locomotive 24-col** 자체 도입 어려우면 12-col로 대체 (clamp 유지)
- **dvh/svh/lvh** iOS Safari 대응 (viewport 단위 modern)

## 차단 조건
- ❌ B2B SaaS / 정부 (Editorial collage 톤 부적합)
- ❌ FinTech (cream warm tone 정합 어려움)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ Industrial / 공공 (kpi-dark-monogrid 권고)
- ❌ 풀블리드 hero (scattered cards 시그니처와 충돌)
- ❌ 단일 제품 D2C (collage 시그니처 과잉)

## 라이선스 / 외부 차용 주의
- **Zimula** — custom Serif 라이선스 확인 필수 (외부 차용 시 Fraunces / Aglet Slab 매핑 권고)

## 출처 references
- `tier-1/floema/DNA.md` § Locomotive 24-col + scattered 16+ cards (152/180, siteinspire #4 E-Commerce)

## 변경 이력
- 2026-05-06 v1.0 — Batch 4 신규 등재 (floema.com 단독 출처)
