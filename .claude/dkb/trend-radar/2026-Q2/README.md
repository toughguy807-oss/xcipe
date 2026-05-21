# Trend Radar 2026-Q2

**도입일**: 2026-05-04
**범위**: 2026-04 ~ 2026-06
**갱신 주기**: 수동 (분기 1회 권장)
**정책**: `dkb-config.json` `automation.trend_radar_update: "manual_trigger"` (자동 갱신 ❌)

## 메타-레퍼런스 4종 (인덱스 사이트)

이 섹션의 사이트는 일반 references와 달리 **자체 디자인이 아닌 큐레이션 역할**을 한다.
18축 채점 X, "분기별 Top 10 추출" 메타로만 사용.

| 사이트 | 역할 | 갱신 주기 | 가치 |
|---|---|---|:---|
| [awwwards.com](awwwards.com/META.md) | SOTD/SOTM 톱 어워드 | 일일 | 어워드 톤 인덱스 (글로벌) |
| [godly.website](godly.website/META.md) | AI 도메인 큐레이션 | 주간 | AI/Frontier 어워드 추적 |
| [gdweb.co.kr](gdweb.co.kr/META.md) | 한국 어워드 | 분기 | 한국 톤 인덱스 ⭐ |
| [lapa.ninja](lapa.ninja/META.md) | 랜딩 페이지 톱 | 주간 | B2B/B2C 통합 (7300+ landing) |

## 운용 절차 (수동 트리거)

분기 1회 다음 절차 사용자가 명시적 호출:

```
사용자 입력: "/trend-radar 갱신 2026-Q3"

처리:
1. 4 메타 사이트 fullpage 캡처 (Playwright)
2. 각 사이트에서 분기 Top 10 SOTD 추출 (Vision LLM 1회 / 사이트)
3. 추출된 후보 중 "도메인 직격 + 시그니처 강함" 1~2건 → dkb-analyze 자동 트리거
4. 후보 7~8건은 후보 큐(`queue/pending.json`)에 보존 (사용자 결정 대기)
```

자동 갱신 차단 사유 (`dkb-policy.md` §4):
- 토큰 부담 (Vision 4회 + dkb-analyze N회 = 50K+)
- 트렌드 무분별 추적 시 dkb references 30+ → dkb-search 정렬 비용 폭증

## 분기 트렌드 시그니처 (수기 입력 — 갱신 시)

| 시그니처 | 빈도 | 사이트 (예시) |
|---|---|---|
| (분기 갱신 시 작성) | | |

## 도메인별 권장 트렌드 사이트

| 도메인 | 우선 큐레이션 | 보조 |
|---|---|---|
| AI / Frontier | godly.website | awwwards (AI 카테고리) |
| B2B SaaS | lapa.ninja | awwwards |
| 한국 B2B / 공공 | gdweb.co.kr | (미수집) |
| 컨슈머 / 어워드 cute | awwwards | godly |
| 랜딩 페이지 | lapa.ninja | onepagelove (미등재) |

## 변경 이력

| 일자 | 변경 |
|------|------|
| 2026-05-04 | 초기 4건 등재 (awwwards / godly / gdweb / lapa) |

## 참조

- `~/.claude/dkb/INDEX.md` — DKB 마스터 인덱스
- `~/.claude/dkb/dkb-config.json` § automation — 갱신 정책
- `~/.claude/lib/rules/dkb-policy.md` §4 — 토큰 절약
