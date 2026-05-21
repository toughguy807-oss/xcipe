# DKB Section Packs

**도입일**: 2026-05-04
**근거**: motionsites.ai 리서치 (페이지가 아닌 hero 섹션 단위 65개 프롬프트팩 운영)
**정책**: `lib/rules/dkb-policy.md` §7 Section Packs

페이지 단위 references(`~/.claude/dkb/references/`)와 **직교 차원**으로 운영되는 섹션 단위 미니 프롬프트팩 저장소.

## 구조

```
section-packs/
├── README.md                  ← 본 파일
├── hero/                      ← 히어로 섹션
│   └── {pack-name}/
│       ├── PACK.md            ← 6축 채점 + Code Skeleton + Motion DNA
│       └── preview.png        ← (선택) 미리보기 캡처
├── feature/                   ← 기능 소개 섹션
├── pricing/                   ← 가격 비교 섹션
├── footer/                    ← 푸터 섹션
├── nav/                       ← 네비게이션 / GNB
└── testimonial/               ← 고객 후기 섹션
```

## 운영 원칙

| 원칙 | 적용 |
|------|------|
| 등재 트리거 | `Skill: dkb-analyze <URL> --mode section --section hero` (수동) 또는 `/curate-theme` 커맨드 |
| 등재 기준 | 6축 간이 채점 70+/100 (Visual Hierarchy 20 / Motion DNA 20 / CSS-Native 15 / Layout Originality 20 / Color Coherence 15 / Code Skeleton 10) |
| 자동 매칭 | `dkb-search --section-packs hero,pricing,footer` → `matched_section_packs[]` 산출 |
| design-replicate 활용 | V3(비판 대안)·V4(건설 대안) 생성 시 섹션 packs 조합 활용 권장 |

## PACK.md 표준 구조

각 PACK.md는 다음 섹션 모두 포함 의무:

```markdown
---
section: hero
name: split-screen-investor
source_url: https://example.com
score: 78
created: 2026-05-04
---

## Aesthetic
{톤 1줄 + 적합 업종}

## Color Palette
{hex / oklch + 다크/라이트 분기}

## Layout
{grid/flex 골격 + max-width + 여백 토큰}

## Motion DNA
{lib/rules/modern-design-stack.md §8 CG-4 형식 — easing/duration/sequence}

## CSS-Native Stack
- View Transitions: {사용/미사용}
- scroll-driven:    {사용/미사용}
- Anchor Positioning: {사용/미사용}
- Popover:          {사용/미사용}

## Code Skeleton
\`\`\`html
<!-- 순수 HTML + CSS만. React/Framer Motion 등 프레임워크 의존 X -->
\`\`\`

## Preview
{스크린샷 또는 캡처 비디오 경로}
```

## 자동화 진입점

| 단계 | 동작 |
|------|------|
| `/design` 실행 → design-orchestrator Step 2B-2.7 | dkb-search가 references + section packs 동시 매칭 |
| `/publish` 실행 → publish-orchestrator Step 1 직전 | 매칭된 section packs Code Skeleton 참조 가능 |
| `/curate-theme` 커맨드 | 신규 섹션 pack 등재 트리거 |

## 등재 시드 권장 (초기 빈 상태)

각 카테고리 최소 3~5개 등재 시 design-replicate 조합 폭이 의미있어짐. 초기 추천 시드:

| 카테고리 | 시드 후보 |
|---------|---------|
| hero | linear.app · vercel.com · stripe.com · anthropic.com |
| feature | notion.so · figma.com · airtable.com |
| pricing | stripe.com/pricing · linear.app/pricing · webflow.com/pricing |
| footer | github.com · vercel.com · stripe.com |
| nav | apple.com · vercel.com · linear.app |
| testimonial | notion.so · linear.app · circle.so |

> 시드 등재는 사용자 명시 트리거 (`Skill: dkb-analyze <URL> --mode section --section hero`).
