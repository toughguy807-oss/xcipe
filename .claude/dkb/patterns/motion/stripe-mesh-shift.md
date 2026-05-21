---
category: motion
name: stripe-mesh-shift
source_refs: [stripe.com]
domains: [infra, fintech, dev tools, B2B SaaS]
created: 2026-05-04
---

## 시그니처 (1줄)
거대 그라디언트 메쉬 + scroll color shift + WebGL 가능 → frontier infra 모션.

## 핵심 토큰
- 메쉬: 다채 그라디언트 stop (pink/orange/purple/cyan)
- 모션: scroll position에 따른 hue/saturation shift
- 구현: CSS conic-gradient + transform 또는 WebGL shader
- 시그니처: Hero 메쉬 회전 / Cases 진입 시 컬러 시프트

## 적용 가이드
- **Frontier infra / fintech / dev tools** Hero 모션 1순위
- **WebGL/Canvas 허용** 환경
- 고성능 디바이스 우선 (저성능 fallback CSS only)

## 차단 조건
- ❌ 한국 공공 (성능/접근성) → 단순 fade 권고
- ❌ Editorial 매거진 → 정적 권고

## 출처 references
- `tier-1/stripe.com/DNA.md` § 거대 메쉬 + scroll shift
