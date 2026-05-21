---
name: dkb-curate
description: >
  DKB references / section-packs 큐레이션 스킬. 등재된 자산 풀의 건강성을 점검하고
  trending rejects / 중복 시그니처 / 사용 빈도 0 / 시간 만료 등을 트리아지하여
  운영자 의사결정을 보조한다. dkb-analyze가 등재(추가), dkb-curate가 정리(유지보수).
  "DKB 정리", "references 큐레이션", "DKB 헬스체크", "강등 검토", "사용 안 하는 references" 맥락에서 호출.
argument-hint: "[--scope all|references|section-packs] [--last 30d|90d|180d] [--threshold 5] [--dry-run]"
---

# DKB Curate (References / Section-Packs 큐레이션)

당신은 **DKB 큐레이터**입니다. 등재된 자산 풀의 건강성을 점검하고 운영자에게 강등/유지/보강 권고를 출력합니다.

## 설계 철학 (Pinecone Nexus Context Compiler 패턴)

본 스킬은 Pinecone Nexus(2026-05-04 발표)의 **Context Compiler** 패턴과 동일 철학:
- 런타임 검색 대신 **사전 컴파일된 artifacts**를 도메인별로 큐레이션
- KRAFTBench 검증: 사전 컴파일이 Agentic RAG 대비 정확도 +65%, 토큰 -86%
- dkb-curate는 references/section-packs 풀의 건강성을 유지 → **"Compiler의 GC(Garbage Collection)"** 역할

> 외부 검증: `~/.claude/projects/d--SYS-v4/memory/project_rag_direction.md` "외부 검증 — Pinecone Nexus" 섹션

## dkb-analyze 와의 차이

| 항목 | dkb-analyze | dkb-curate |
|------|-------------|-----------|
| 목적 | **등재** (신규 추가) | **유지보수** (기존 정리) |
| 입력 | URL 1개 | 전체 풀 |
| 산출 | DNA.md / PACK.md 생성 | 트리아지 리포트 + 강등 권고 |
| 자동 archive | 금지 | 금지 (운영자 컨펌만) |
| 빈도 | 등재 시점 | 월 1회 권장 (정기 점검) |

> **주의**: dkb-analyze에 `--mode review` 옵션이 있지만, 그것은 **단일 ref**의 reject 트렌드만 본다. dkb-curate는 **전체 풀** 횡단 점검.

## 호출 시그니처

```
Skill: dkb-curate                                      # 기본: 전체 / 30일
Skill: dkb-curate --scope references --last 90d        # references만 90일
Skill: dkb-curate --scope section-packs --threshold 3  # section-packs만 임계 3회
Skill: dkb-curate --dry-run                            # 권고만, 운영자 입력 대기 X
```

| 인자 | 설명 | 기본 |
|------|------|------|
| `--scope` | `all` / `references` / `section-packs` | `all` |
| `--last` | 분석 윈도우 | `30d` |
| `--threshold` | trending 판정 최소 reject 횟수 | `5` |
| `--dry-run` | 권고만 출력, Y/N 컨펌 단계 생략 | `false` |

## 동작 절차

### Step 1: 자산 인벤토리 수집

```bash
# references 풀
ls ~/.claude/dkb/references/{tier-1,tier-2,tier-3,archive}/*/DNA.md

# section-packs 풀
ls ~/.claude/dkb/section-packs/*/*/PACK.md

# rejection 누적
cat ~/.claude/dkb/feedback/rejections.jsonl | wc -l

# stats.json 캐시
[ -f ~/.claude/dkb/feedback/stats.json ] && cat ~/.claude/dkb/feedback/stats.json
```

### Step 2: 4축 헬스체크

각 자산을 다음 4축으로 평가:

| 축 | 측정 | 임계 |
|----|------|------|
| **A. Trending Rejects** | `--last` 기간 내 reject 횟수 (시간 감쇠 적용) | ≥ `--threshold` |
| **B. Duplicate Signature** | DNA.md `signature_elements[]` 다른 ref와 70%+ 중복 | 1쌍이라도 |
| **C. Sleeping Asset** | dkb-search Step 5 `matched[]`에 90일+ 미등장 (사용 빈도 0) | 0회 매칭 |
| **D. Stale Capture** | screenshots/ mtime > 365일 | 1년 초과 |

### Step 3: 트리아지 분류

| 분류 | 조건 | 권고 |
|------|------|------|
| 🔴 **강등 권고** | A=YES (≥3 컨텍스트 모두 threshold) OR D=YES + B=YES | tier 강등 또는 archive 이동 |
| 🟡 **수정 권고** | B=YES (단일 중복) OR D=YES (단독) | 시그니처 차별화 / screenshots 재캡처 |
| 🟢 **휴면 알림** | C=YES (사용 빈도 0) | 90일 이상 미사용 — 의도된 보존인지 확인 |
| ⚪ **유지** | 4축 모두 정상 | 조치 불필요 |

### Step 4: 리포트 출력

```
═══════════════════════════════════════════════
DKB Curate 리포트 — 2026-05-04 (윈도우: 30d, threshold: 5)
═══════════════════════════════════════════════

총 자산: references 12 / section-packs 8 / 합계 20
트리아지: 강등 1 / 수정 2 / 휴면 3 / 유지 14

[🔴 강등 권고: 1건]
1. tier-1/anthropic.com (references)
   - A: 18회 reject (industrial-ai/finance/medical 3개 컨텍스트 모두 threshold)
   - 권고: tier-2 강등
   - 명령: mv ~/.claude/dkb/references/tier-1/anthropic.com ~/.claude/dkb/references/tier-2/

[🟡 수정 권고: 2건]
2. tier-1/linear.app (references)
   - B: signature_elements가 tier-2/notion.so와 75% 중복 (둘 다 "Editorial Serif H1 + Coral Dot")
   - 권고: 시그니처 1개 재정의 또는 둘 중 하나 archive

3. section-packs/hero/split-screen-investor (section-packs)
   - D: screenshots 마지막 캡처 2025-04-12 (387일 경과)
   - 권고: dkb-analyze --mode section --section hero {URL} 재실행

[🟢 휴면 알림: 3건]
4-6. tier-3/{korean-site-1,2,3} — 90일+ 미사용
   - 의도된 한국 컨텍스트 보존이면 유지, 아니면 archive 이동 검토

[⚪ 유지: 14건]
(생략)

═══════════════════════════════════════════════
```

### Step 5: 운영자 컨펌 (`--dry-run` 미지정 시)

```
실행할 권고를 선택하세요 (쉼표 구분, 'none' = 종료):
> 1, 2

확인:
- 1번: tier-1/anthropic.com → tier-2 (mv 명령 실행)
- 2번: tier-1/linear.app → 시그니처 재정의 안내만 (자동 수정 X)

진행하시겠습니까? (Y/N)
```

`Y` 입력 시 mv 실행 + INDEX.md 카운트 갱신. 시그니처 재정의는 사용자에게 안내만(수동 편집 필요).

## Self-Check

| # | 검증 | 기준 |
|---|------|------|
| 1 | 자산 인벤토리 수집 | references + section-packs 모두 스캔 |
| 2 | 4축 헬스체크 적용 | A/B/C/D 각 축 측정 |
| 3 | 트리아지 분류 | 4 분류 중 정확히 1개 |
| 4 | 권고 명령 명시성 | 강등 권고는 mv 명령 포함 |
| 5 | 자동 archive 차단 | --dry-run 또는 운영자 컨펌만 |
| 6 | INDEX.md 갱신 | 강등/이동 시 카운트 동기화 |

## Anti-Pattern

- ❌ 자동 archive 이동 (운영자 컨펌 없이 mv 실행)
- ❌ rejections.jsonl 직접 수정
- ❌ DNA.md/PACK.md 자동 편집 (수정 권고만, 실제 편집은 운영자)
- ❌ 30일 미만 윈도우로 강등 결정 (시간 감쇠 미반영 구간)
- ❌ dkb-search 호출 없이 휴면 판정 (실측 사용 빈도 필수)

## 토큰 절약

- 전체 풀 스캔이지만 DNA.md는 시그니처 섹션만 Read (전체 X)
- aggregate-stats.js 결과(stats.json) 우선 사용 → 없으면 rejections.jsonl 직접 집계
- screenshots 메타데이터(mtime)만 확인, 이미지 자체 Read X

## 핸드오프

### 입력
- `~/.claude/dkb/references/**/*/DNA.md`
- `~/.claude/dkb/section-packs/**/*/PACK.md`
- `~/.claude/dkb/feedback/rejections.jsonl`
- `~/.claude/dkb/feedback/stats.json` (선택)

### 출력
- 트리아지 리포트 (chat 출력 + 선택적 `~/.claude/dkb/curate-report-{YYYYMMDD}.md` 저장)
- 강등 명령 실행 결과 (mv + INDEX.md 갱신 카운트)

## 관련

- `skills/dkb-analyze` — 등재 (단일 추가)
- `skills/dkb-search` Step 5 — feedback_alert 출력 (curate 호출 트리거)
- `commands/dkb-feedback` — reject 로그 조회 (curate 의사결정 보조)
- `lib/rules/dkb-policy.md` §9-2 — 자동 archive 금지 정책
- `~/.claude/dkb/feedback/README.md` — 가중치 표

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **자동 archive 실행**: trending reject 다수라도 운영자 명시 결정 없이 archive 금지. curate는 트리아지 + 보고만, 결정은 운영자.
- ❌ **trending alert 무시 통계**: reject 빈도 높은 references를 "데이터 부족"으로 평가 보류 → 지속 사용. 5회+ alert는 명시 보고 의무.
- ❌ **reject 컨텍스트 무시한 일률 강등**: 특정 컨텍스트(industrial-ai|brand-safe)에서만 reject되는 references를 전체 강등 → 다른 컨텍스트 손실. 컨텍스트별 가중치 적용.
- ❌ **dkb-feedback 데이터 30일 미만 평가**: 시간 감쇠 0.5× 미반영 구간(30일 미만) 데이터로 강등 결정 → 노이즈. 30일+ 데이터만 평가.
- ❌ **dkb-analyze 역할과 혼동**: curate에서 신규 references 등재 시도 → 분담 위반. curate는 정리/유지보수, analyze는 등재.
- ❌ **rejections.jsonl 수정**: 로그 클렌징 명목으로 reject 이벤트 삭제 → 추적 가능성 손실. jsonl은 append-only.
