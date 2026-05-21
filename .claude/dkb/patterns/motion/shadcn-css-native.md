---
category: motion
name: shadcn-css-native
source_refs: [ui.shadcn.com]
domains: [dev tools, B2B, lightweight UI, 접근성 우선]
created: 2026-05-04
---

## 시그니처 (1줄)
CSS-native transition + 마이크로 이징 + JS 의존 최소 → 접근성/성능 친화 모션.

## 핵심 토큰
- 이징: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo)
- duration: 150~300ms 마이크로
- 속성: opacity / transform 우선 (paint 트리거 회피)
- 시그니처: hover state 즉각 반응 / focus ring 명확 / reduced-motion 자동 분기

## 적용 가이드
- **Dev tools / B2B / 접근성 우선** 모든 인터랙션 1순위
- **한국 공공 / 정부 사이트** 모션 시그니처
- prefers-reduced-motion 자동 매핑

## 차단 조건
- ❌ Agency portfolio storytelling → locomotive-scroll 권고
- ❌ Frontier infra Hero → stripe-mesh-shift 권고

## 출처 references
- `tier-1/ui.shadcn.com/DNA.md` § CSS-native transition
