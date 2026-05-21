---
name: dkb-feedback
description: DKB Reject 피드백 로그 조회/통계 — references별 reject 빈도, 컨텍스트별 분포, trending 30d 알림. dkb-search Step 7 reject API와 페어링.
argument-hint: "[--ref {site}] [--last {Nd}] [--reason {code}] [--summary]"
---

# DKB Feedback — Reject 로그 조회

dkb-search reject 누적 로그(`~/.claude/dkb/feedback/rejections.jsonl`)를 조회하고 통계를 출력합니다. dkb-policy.md §9 Reject Feedback Loop의 운영 가시성 도구.

## 인자

| 인자 | 설명 | 기본 |
|------|------|------|
| `--ref {site}` | 특정 references만 필터 (예: `tier-1/anthropic.com`) | 전체 |
| `--last {Nd}` | 최근 N일 이벤트만 조회 (예: `30d`, `90d`) | 180d |
| `--reason {code}` | 특정 reason_code 필터 (tone_mismatch / domain_unfit / visual_overlap / user_taste / duplicate_signature / other) | 전체 |
| `--summary` | 라인 단위 출력 대신 집계만 | false |

## 동작 절차

### Step 1: 로그 로드

```
Read ~/.claude/dkb/feedback/rejections.jsonl
```

미존재 시:
```
ℹ rejections.jsonl 미존재 — reject 이벤트 0건
```

### Step 2: 필터 적용

각 라인 JSON 파싱 → 인자 조건 매칭:
- `--ref` 매칭: `event.ref_path` endsWith `{ref}/DNA.md` 또는 contains `{ref}`
- `--last`: `event.ts >= now - {N}일`
- `--reason`: `event.reason_code === {code}`

### Step 3: 출력

#### 일반 모드 (라인 단위)

```
DKB Reject 로그 — 필터: --ref tier-1/anthropic.com --last 30d
─────────────────────────────────────────────────────────
2026-05-03T14:12 | tone_mismatch | reviewer | industrial-ai|investor|signature|brand-safe
   ↳ "reviewer Critical: Editorial Serif가 brand-safe 톤과 충돌"
2026-04-28T09:30 | user_taste | user | finance|executive|kpi-impact|refined
   ↳ "톤이 너무 강함"
─────────────────────────────────────────────────────────
총 2건 / 필터 매칭 2건
```

#### `--summary` 모드 (집계)

```
DKB Reject 통계 — 최근 30일
─────────────────────────────────────────────────────────
총 reject: 17건
unique references: 6개

Top 5 reject references:
1. tier-1/anthropic.com — 8회 (tone_mismatch 6, user_taste 2)
2. tier-2/scale.com — 4회 (domain_unfit 3, visual_overlap 1)
3. tier-1/linear.app — 2회
...

Reason 분포:
- tone_mismatch: 9 (52%)
- domain_unfit: 4 (23%)
- user_taste: 2 (11%)
- visual_overlap: 1 (6%)
- duplicate_signature: 1 (6%)

⚠ Trending Alert (5회+ 동일 컨텍스트):
- tier-1/anthropic.com @ industrial-ai|investor|signature|brand-safe (8회)
  → dkb-curate 재검토 권고
─────────────────────────────────────────────────────────
```

### Step 4: 페널티 추정 미리보기 (선택)

`--summary` + `--ref` 조합 시 다음 dkb-search 호출에서 적용될 페널티 추정값 출력:

```
페널티 추정 (next dkb-search):
- 동일 컨텍스트(industrial-ai|investor|signature|brand-safe): -10 (cap 적용)
- 다른 컨텍스트: -3 (글로벌 페널티만)
```

## 사용 예시

```bash
# 1. 전체 요약
/dkb-feedback --summary

# 2. 특정 references 최근 30일
/dkb-feedback --ref tier-1/anthropic.com --last 30d

# 3. tone_mismatch 사유만 조회
/dkb-feedback --reason tone_mismatch --summary

# 4. trending alert 확인 (운영자 정기 점검)
/dkb-feedback --summary --last 30d
```

## 금지

- rejections.jsonl 직접 수정/삭제 금지 — 본 커맨드는 **읽기 전용**
- 자동 archive 트리거 금지 — trending alert는 정보성, archive는 운영자 명시 결정 (dkb-policy §9-2)
- 30일 미만 데이터로 references 평가 금지 (시간 감쇠 0.5× 미반영 구간)

## 관련

- `lib/rules/dkb-policy.md` §9 — Reject Feedback Loop 정책
- `~/.claude/dkb/feedback/README.md` — 스키마 + 가중치 표
- `skills/dkb-search` Step 5/7 — reject 기록 + 페널티 적용
- `skills/dkb-curate` — trending alert 후속 강등 결정 (후속 과제)
