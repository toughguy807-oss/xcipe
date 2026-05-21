---
category: color-systems
name: air-dev-retro-cyan
source_refs: [air.dev]
domains: [AI dev tools, Agentic IDE, Frontier infra, Retro-futuristic 캠페인]
created: 2026-05-04
---

## 시그니처 (1줄)
다크 + 시안/Teal 액센트 + 노란 형광 CTA + pixel/mono 폰트 → 90년대 CRT 터미널 미감.

## 핵심 토큰 (실측, 2026-05-06)
- 베이스: `#292B2C` warm 다크 그레이 ⚠️ Pure black 회피 (HSL `210 3.5% 16.7%`)
- 베이스 alt: HSL `200 10% 12%` (~`#1B1F21`) — 카드 BG
- 텍스트 primary: `#FFFFFF` (Pure white 사용 — 다크 BG 위 명도 최대)
- Primary 액센트: HSL `162 54% 40%` (~`#2FA37D` 시안/Teal 그린)
- 액센트 노란 형광 (CTA): `#FEFC4F` ✅ 시그니처 (Linear와 유사)
- 폰트: **JetBrains Mono** (단일 family, sans-serif 부재)
- 빌드: Tailwind CSS
- 시그니처: JetBrains Mono 단일 family + warm 다크 그레이 BG + 노란 형광 CTA 단일

## 적용 가이드
- **AI dev tools / Agentic IDE / Frontier infra** 1순위
- **JetBrains 생태계** 동반 가능
- pixel/mono 폰트 단일 (sans-serif 부재)
- 시안 보더 박스 + 노란 형광 CTA 1~2개 절제

## 차단 조건
- ❌ warm-cream Editorial → anthropic-off-white 권고
- ❌ Editorial 인물 hero → cinematic-photo-hero 권고
- ❌ 한국 SI → lgcns-mint-pastel 권고
- ❌ 부드러운 hover/글래스모피즘 (CRT 미감 충돌)

## 출처 references
- `tier-1/air.dev/DNA.md` § pixel/mono + 시안/Teal 액센트 + 노란 형광 CTA
