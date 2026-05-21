---
category: korean-typo
name: visitseoul-multilingual
source_refs: [visitseoul.net]
domains: [한국 공공, 관광, 지자체, 다국어 사이트]
created: 2026-05-04
---

## 시그니처 (1줄)
9개 언어 fallback 스택 + Pretendard 베이스 → 한국 공공 다국어 시그니처.

## 핵심 토큰
- 폰트 스택: `Pretendard, "Wanted Sans", "Noto Sans KR", "Noto Sans JP", "Noto Sans SC", "Noto Sans TC", "Noto Sans Arabic", "Noto Sans Cyrillic", "Noto Sans Thai", system-ui, sans-serif`
- 9개 언어: 한 / 영 / 일 / 중간 / 중번 / 러 / 말 / 스 / Partners
- weight: 본문 400 / 헤딩 700 (모든 스크립트 균형)
- 시그니처: 언어 토글 + 자동 폰트 fallback + RTL 지원 (아랍어)

## 적용 가이드
- **한국 공공/관광/지자체** Hero 1순위
- **다국어 9종 사이트** 시그니처
- 언어별 line-height 별도 조정 (아랍어 1.7 / 한자 1.6)

## 차단 조건
- ❌ 영문 단독 → 일반 sans 권고
- ❌ 한국 SI 한영 병기 → lgcns-dual-h1 권고

## 출처 references
- `tier-3/visitseoul.net/DNA.md` § 9개 언어 fallback
