---
category: color-systems
name: anthropic-warm-cream
source_refs: [anthropic.com, relace.ai]
domains: [AI 연구, AI dev tools, Editorial, B2B 진중한 톤, warm-cream Hero]
created: 2026-05-06
---

## 시그니처 (1줄)
크림 베이지 베이스(#F0EEE6 ~ #F5F0E5) + 검정/charcoal 텍스트 + 코랄/오렌지 액센트 → AI/Editorial warm-cream 톤.

## 변종

### Variant A — anthropic.com (오프화이트 + 코랄, 진중)
- 베이스: `#F0EEE6` (Bone — 약간 회색 기조)
- 텍스트: `#1A1815` charcoal
- 액센트: `#CC785C` 코랄 (Anthropic Coral)
- 보조: `#FAF9F5` lighter / `#3D3929` darker
- 시그니처: italic 강조 + AI 연구 진중 톤

### Variant B — relace.ai (크림 ivory + amber, 매거진) — 실측 2026-05-06
- 베이스: `#FFFEF2` ivory (Pure white 회피, 더 엷은 노란기)
- 텍스트 primary: `#191918` charcoal
- 텍스트 60%/50%: `#19191899` / `#19191880`
- 액센트 amber: `#FCAA2D` ⚠️ (오렌지가 아닌 amber/gold — selection 시그니처)
- 액센트 다크 amber: `#A36404`
- BG alt: `#F3F2E7` / `#E3E2D8` / `#FFFEF2CC` (semi)
- Border subtle: `#1919181A`
- H1 폰트: **Parabole Trial Regular Text** (Serif!) / weight 400 / size 64px / letter-spacing -3.2px
- 빌드: Framer 플랫폼 (token UUID 패턴)
- 시그니처: FIG 001/003 mono 라벨 + 산악 풍경 위 검정 코드 패널 합성 + Editorial 매거진 도판 번호 + Serif H1

## 핵심 토큰 (공통)
- 베이스 범위: `#F0EEE6` ~ `#F5F0E5` (Pure white #FFF 회피 — warm 톤 절대)
- 텍스트 primary: `#1A1815` 계열 charcoal (Pure black #000 회피)
- 액센트: 코랄(`#CC785C`) 또는 오렌지(`#FF8C42`) 단일
- 코드 패널: `#0A0A0A` (warm-cream 위 검정 박스 z-축 합성)

## 적용 가이드
- **AI 연구 / B2B 진중** → Variant A (anthropic) 1순위
- **AI dev tools / Editorial 매거진** → Variant B (relace) 1순위
- **합성 hero 이미지** Variant B 차용 — 자연 풍경 + 검정 UI/코드 패널 합성
- **FIG 001 도판 번호** mono 라벨 디테일 (Variant B 시그니처)
- **Trust 로고 그리드** 그레이톤 좌측 정렬

## 차단 조건
- ❌ Frontier infra 다크 → scale-pure-black / air-dev-retro-cyan 권고
- ❌ 한국 SI → lgcns-mint-pastel 권고
- ❌ 컨슈머 친근 → cute-mascot-multicolor 권고
- ❌ Bento Grid → bento-gradient-mesh 권고
- ❌ Pure dark KPI → kpi-dark-monogrid 권고
- ❌ Pure #FFF / #000 (warm 톤 충돌)

## 출처 references
- `tier-1/anthropic.com/DNA.md` § 오프화이트 + 코랄 (Variant A)
- `tier-2/relace.ai/DNA.md` § 크림 베이지 + 오렌지 + FIG 라벨 + 산악 풍경 위 코드 패널 (Variant B)

## 변경 이력
- 2026-05-06 v1.0 — anthropic-off-white.md 단독 → relace.ai 변종 추가하여 warm-cream 통합 패턴으로 확장
