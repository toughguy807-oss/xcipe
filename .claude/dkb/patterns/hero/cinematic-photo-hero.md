---
category: hero
name: cinematic-photo-hero
source_refs: [fourmula.ai, happyrobot.ai]
domains: [Industrial AI, Logistics, Editorial Portfolio, Luxury brand, B2B operations]
created: 2026-05-04
---

## 시그니처 (1줄)
시네마 sunset/황혼 톤 풀폭 사진 hero(인물 또는 풍경) + 절제된 텍스트/카운터 → 패션 룩북 미감.

## 핵심 토큰
- 배경: 풀폭 시네마 사진 (인물 단독 또는 산악+도로+트럭 풍경)
- 톤: warm orange/amber sunset 일관 (시네마 보정 + 약한 비네팅)
- Text on photo: `#FFFFFF` 또는 `#FAFAFA` (Pure white 회피)
- CTA pill BG: `#FFFFFF` 라이트 또는 `#0A0A0A` 검정 (대비 명확)
- 카운터/워드마크: 거대 sans-serif (~140px+) — 선택적
- 시그니처: 사진 점유율 80%+ / 카피 절제 / 황혼 톤 일관 / 카운터 또는 인디케이터 디테일

## 변종

### Variant A — 인물 단독 (fourmula.ai)
- 좌상단 거대 카운터("89") + 중앙 인물 + 양 하단 로고/로딩 인디케이터
- 화이트스페이스 점유율 ~95% (압도적 절제)
- 페이지 시퀀스 카운터 모션 (89→90)

### Variant B — 풍경+오브젝트 (happyrobot.ai)
- 산악 + 도로 + 트럭 + 황혼 (Industrial 도메인 시각화)
- 중앙 정렬 H1 + 라이트 CTA pill
- 사진 점유율 100% (텍스트는 사진 위 오버레이)

## 적용 가이드
- **Industrial AI / Logistics / Operations** 1순위 (Variant B 직격)
- **Editorial Portfolio / Luxury brand / Hospitality** 1순위 (Variant A 직격)
- **About 인물 페이지** Variant A 차용 가능
- **Brand 캠페인 시퀀스** 페이지 카운터 + cross-fade 모션 적용

## 차단 조건
- ❌ B2B Hero KPI 임팩트 → kpi-dark-monogrid 권고 (콘텐츠 가중치 약함)
- ❌ Bento Grid → bento-gradient-mesh 권고
- ❌ AI dev tools 다크 → air-dev-retro-cyan 권고
- ❌ 다채 색상 / 글래스모피즘 / 보라 그라디언트 (시네마 단색 일관 충돌)

## 실측 폰트 시그니처 (2026-05-06 DevTools eval)
- **Variant A (fourmula)**: SF Pro Display (Apple) — 거대 카운터 + Hero H1 73px / weight 400
- **Variant B (happyrobot)**: Tobias (Serif Display, Klim Type Foundry) + Suisse Int'l (Body, Swiss Typefaces) — 매거진 Serif+Sans 조합
- 공통 정책: Pure black 회피 (`#020108` / `#0E0D0C`), letter-spacing 음수 (-2.08px ~ -3.2px) 시네마 헤드라인

## 출처 references
- `tier-1/fourmula.ai/DNA.md` § 거대 카운터 + 시네마 인물 + 압도적 화이트스페이스 (Variant A)
- `tier-3/happyrobot.ai/DNA.md` § 산악+트럭 풍경 hero + 흰색 H1 + CTA pill (Variant B)
