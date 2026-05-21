---
category: motion
name: locomotive-scroll-jacking
source_refs: [locomotive.ca]
domains: [agency, portfolio, editorial, creative shop]
created: 2026-05-04
---

## 시그니처 (1줄)
scroll-driven parallax + smooth-scroll + 거대 타이포 reveal → agency motion 시그니처.

## 핵심 토큰
- 라이브러리: Locomotive Scroll / Lenis (smooth-scroll)
- 효과: parallax 다층 / scroll-pin / horizontal scroll mix
- 이징: cubic-bezier(0.77, 0, 0.175, 1) 부드러운 곡선
- 시그니처: 섹션 진입 시 거대 타이포 fade+rise / 이미지 mask reveal

## 적용 가이드
- **Agency / portfolio / editorial** 1순위
- **고급 prefers-reduced-motion 분기 필수**
- 풀스크린 storytelling 페이지

## 차단 조건
- ❌ Dev tools / B2B 빠른 정보 → shadcn-css-native 권고
- ❌ 한국 공공 (접근성 우선) → 단순 fade 권고

## 출처 references
- `tier-1/locomotive.ca/DNA.md` § scroll-jacking + parallax
