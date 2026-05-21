---
category: korean-typo
name: wanted-sans-typography
source_refs: [wanted.co.kr, wantedsans.com]
domains: [한국 B2B, 채용/플랫폼, 모던 한글, B2C 친근]
created: 2026-05-04
---

## 시그니처 (1줄)
Wanted Sans 단독 시스템 + 한글 가독성 우선 → 모던 한국 플랫폼 시그니처.

## 핵심 토큰
- 폰트: Wanted Sans (314★ 오픈소스, Pretendard 대안)
- 영문 fallback: 자체 라틴 글리프 우수 (Inter 불필요)
- 크기: 본문 `0.9375rem` / 헤딩 `clamp(1.875rem, 4vw, 3.5rem)`
- weight: 100~900 9단계 가변
- 시그니처: 한 폰트로 헤딩+본문 통일 / Pretendard 대안

## 적용 가이드
- **한국 B2B / 채용 플랫폼 / 모던 한국 사이트** 1순위
- **Pretendard 식상함 회피** 시그니처
- B2C 친근 톤도 가능 (가변 weight 활용)

## 차단 조건
- ❌ 다국어 9종 → visitseoul-multilingual 권고 (Pretendard 베이스 stack)
- ❌ 한영 병기 거대 H1 → lgcns-dual-h1 권고

## 출처 references
- `tier-3/wanted.co.kr/DNA.md` § Wanted Sans 시스템
- `dkb/industries/korea-public-tourism.md` § Wanted Sans 314★ 대안
