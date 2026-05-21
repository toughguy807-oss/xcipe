---
category: typography
name: multi-family-stack
source_refs: [paodao.fr]
domains: [Creative coding, WebGL portfolio, Interactive narrative, 게임, 캠페인 micro-site]
created: 2026-05-06
---

## 시그니처 (1줄)
하나의 사이트에 4-family 멀티 (Lato + Playfair + Orbitron + indie_flowerregular) 동시 사용 — Editorial Serif + 기본 Sans + sci-fi geometric + handwritten script 4종 typography 병치 드문 패턴.

## 핵심 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--fontFamily-default` | **`Lato`** ★ | 기본 Sans (UI/body) |
| `--fontFamily-title` | **`Playfair, serif`** ★ | Editorial Serif (Title) |
| `--fontFamily-orbitron` | **`Orbitron`** ★ | sci-fi geometric (futuristic) |
| `--fontFamily-script` | **`indie_flowerregular`** ★ | handwritten script |
| font-size small | `.85rem` | 작은 본문 |
| font-size default | `1.3rem` | 기본 본문 |
| font-size title | `2rem` | Title |
| H1 size | `38px` | weight 700 / Lato (3D 영역 외 작은 카피) |
| (BG) | `#0B0B0B` (Pure black 추정) | ⚠️ Anti-Slop 위반 (paper warm으로 보완) |
| `--color-white` | `rgb(242 242 247)` `#F2F2F7` | warm off-white |
| `--color-paper` | **`#9D7E4C`** ★ | paper warm tone |
| `--color-blue` | `#0066FF` | accent |
| `--transitionDuration` | `.25s` | 모션 base |
| `--blurSize` | `5px` | blur effect |

## 본질
- **4-family 멀티 typography** — 하나의 사이트에 4종 family 의도적 병치 (드문 패턴)
- **Lato (default) + Playfair (Editorial Serif title) + Orbitron (sci-fi geometric) + indie_flower (handwritten script)** 4축 대비
- **각 family 별도 토큰화** (`--fontFamily-default/title/orbitron/script`) — CSS var 분리
- **font-size 3단계** (small/default/title) 단순 — multi-family가 시각 차별 담당
- **Editorial + sci-fi + script 의도적 충돌** — Creative coding / WebGL micro-site 시그니처
- **WebGL 3D + 멀티 family** 정합 — Three.js cinematic 톤 보강

## 변종
- Variant A — paodao (WebGL 3D + 4-family, 본 패턴)
- (잠재) Variant B — Editorial 매거진 cover (Serif + Display + script 3-family)
- (잠재) Variant C — 1인 portfolio playful (Sans + Serif + handwritten 3-family)
- (잠재) Variant D — 캠페인 micro-site (futuristic Orbitron + Editorial Serif 2-family)

## 적용 가이드
- **Creative coding portfolio / 캠페인 micro-site / 인터랙티브 narrative / 게임** 1순위
- **WebGL Three.js 3D scene + 멀티 family** 정합 (cinematic 톤 보강)
- **Editorial + sci-fi + handwritten 3-4 family 의도적 병치** 차용
- **시적 / 문학적 카피** — 단순 마케팅 카피 회피
- **font-family 별도 CSS var 토큰화** (`--fontFamily-{role}`) 권고
- **font-size 단순 3단계** (small/default/title) — family 자체가 시각 차별

## 차단 조건
- ❌ B2B SaaS / 대시보드 (multi-family 가독성 부담)
- ❌ AI dev tools 표준 사이트 (단일 family 권고)
- ❌ E-commerce / 빠른 진입 (multi-family 로딩 비용)
- ❌ 가독성 우선 사이트 (4-family 일관성 부족)
- ❌ 모바일 우선 사이트 (multi-family 로딩 / FOIT 부담)
- ❌ 한국 SI / 정부 (절제 문화 충돌)

## 라이선스 / 외부 차용 주의
- **Lato** — Google Fonts (자유)
- **Playfair Display** — Google Fonts (자유)
- **Orbitron** — Google Fonts (자유)
- **indie_flowerregular / Indie Flower** — Google Fonts (자유)
- ✓ 4-family 모두 Google Fonts에서 자유 차용 가능 (라이선스 부담 0)
- ⚠️ multi-family 로딩 비용 — woff2 + subset + preload 필수

## 출처 references
- `tier-3/paodao/DNA.md` § 4-fontFamily 멀티 (Lato/Playfair/Orbitron/indie_flowerregular) (126/180, Awwwards SOTD May 03)

## 변경 이력
- 2026-05-06 v1.0 — Batch 4 신규 등재 (paodao.fr 단독 출처)
