# Patterns 카탈로그 INDEX

**도입일**: 2026-05-04 (v1.0) → 2026-05-06 v1.1 (Batch 5 신규 5건) → 2026-05-06 v1.2 (Batch 4 부산물 5건 + editorial/cinematic 카테고리 신설)
**용도**: 32 references DNA 시그니처를 12 패턴 카테고리로 분해 등재. dkb-search 매칭 시 직교 차원으로 사용.
**관계**: references/(페이지·사이트 단위) ⊥ section-packs/(섹션 단위) ⊥ patterns/(시그니처 패턴 단위)

## 12 카테고리

| 카테고리 | 정의 | 등재 | 시그니처 references |
|---------|------|:---:|--------------------|
| [hero/](hero/) | Hero/LCP 영역 시각 패턴 | 6 | anthropic / linear / vercel / family / visitseoul / overlay |
| [kpi/](kpi/) | 정량 KPI 표현 패턴 | 3 | linear / augury / c3.ai |
| [case-study/](case-study/) | Before/After·사례 그리드 | 2 | vercel / locomotive |
| [partner-grid/](partner-grid/) | 로고 그리드·신뢰 배지 | 2 | makinarocks / superb-ai |
| [motion/](motion/) | 모션·스크롤·인터랙션 | 3 | locomotive / stripe / shadcn |
| [color-systems/](color-systems/) | 컬러 시스템·팔레트 전략 | 6 | anthropic / scale / lgcns / **americanhousing(cumulus)** / **overlay(lavender)** / **owo(fintech-candy)** |
| [korean-typo/](korean-typo/) | 한글 타이포·다국어 처리 | 3 | lgcns / visitseoul / wanted |
| [korean-design-system/](korean-design-system/) | 한국 DS 메타 패턴 | 1 | wanted (Montage) |
| [typography/](typography/) | extreme typography 패턴 | 3 | **dashburger(extreme-condensed-headline)** / **paodao(multi-family-stack)** ★ / **isadeburgh(oversized-condensed-wordmark)** ★ |
| [build/](build/) | 빌드 시스템 / 토큰 아키텍처 | 1 | **fabiocaverzasio(explicit-device-tier-tokens)** |
| [editorial/](editorial/) ★ NEW | 매거진 / 콜라주 Editorial 시각 | 1 | **floema(scattered-product-collage)** |
| [cinematic/](cinematic/) ★ NEW | cinematic 시그니처 hero / 게이트 | 2 | **donmolinico(heritage-food-brand-hero)** / **pieterkoopt(audio-splash-gate)** |

## 패턴 vs References vs Section Packs

| 차원 | 단위 | 매칭 시점 | 산출물 |
|------|------|---------|--------|
| **references** | 페이지·사이트 | dkb-search Top N | 1:1 충실 모방 베이스 (V1) |
| **patterns** | 시그니처 토큰 (hero/kpi/...) | dkb-search 보조 | V3·V4 조합 시 시그니처 차용 |
| **section-packs** | 섹션 (hero/feature/pricing) | dkb-search --section-packs | 섹션 단위 재조합 |

## PATTERN.md 표준 구조

```markdown
---
category: hero
name: editorial-italic-em
source_refs: [anthropic.com]
domains: [editorial, magazine, frontier AI]
created: 2026-05-04
---

## 시그니처 (1줄)
{본질}

## 핵심 토큰
- 컬러: ...
- 폰트: ...
- 레이아웃: ...

## 적용 가이드
{언제 / 어떻게 차용}

## 차단 조건
{어느 도메인에서 사용 금지}

## 출처 references
- {tier}/{site}/DNA.md § {축}
```

## dkb-search 매칭 (P2 #6 — 2026-05-04 추가)

```
Skill: dkb-search
  --industry industrial-ai
  --patterns hero,kpi,partner-grid    # NEW (P2 #6)
  --top 3
```

→ 출력에 `matched_patterns[]` (신규) 포함.

## 변경 이력

| v1.0 | 2026-05-04 | 8 카테고리 INDEX + 카테고리별 시그니처 패턴 1+개 등재 (P2 #5) |
| v1.1 | 2026-05-06 | Batch 5 부산물 패턴 5건 신규 등재 — color-systems +3 (cumulus-cream / lavender-tinted-white / fintech-candy-palette), typography +1 (extreme-condensed-headline), build +1 (explicit-device-tier-tokens). hero/overlay AI Beauty 시그니처 +1. 10 카테고리 확장. |
| v1.2 | 2026-05-06 | Batch 4 부산물 패턴 5건 신규 등재 — editorial NEW +1 (scattered-product-collage / floema), cinematic NEW +2 (heritage-food-brand-hero / donmolinico, audio-splash-gate / pieterkoopt), typography +2 (multi-family-stack / paodao, oversized-condensed-wordmark / isadeburgh). 12 카테고리 확장. 누계 패턴 13건 → 18건. |
