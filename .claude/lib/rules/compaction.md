# 컴팩션 대응 프로토콜

컨텍스트 컴팩션(자동 압축) 발생 시 핵심 정보를 복구하는 규칙.

## 배경

장시간 파이프라인 실행 중 컨텍스트 윈도우가 한계에 도달하면 자동 컴팩션이 발생한다. 이때 입력 산출물, 누적 상태, 품질 기준이 소실되어 후반부 산출물 품질이 저하된다.

> "컴팩션은 컨텍스트 불안감을 남긴다" — Anthropic Harness Design

## 컴팩션 감지 시 즉시 수행

### 1. _context.md 재로드 (최우선)

```
output/{프로젝트명}/_context.md
```

_context.md에는 이전 단계에서 누적된 프로젝트 상태, 의사결정, 수치가 있다. 컴팩션 후 반드시 첫 번째로 읽는다.

### 2. 현재 단계의 입력 산출물 재읽기

| 현재 스킬 | 재읽기 대상 |
|-----------|------------|
| plan-req | QST 파일 |
| plan-fn | REQ 파일 |
| plan-ia | FN 파일 |
| plan-wbs | FN 파일 |
| design-benchmark | REQ 또는 프로젝트 브리프 |
| design-knowledge | benchmark 결과 |
| design-layout | STYLE + IA |
| design-ui | Layout + FN |
| publish-markup | UI + IA + STYLE |
| publish-style | STYLE + HTML |
| publish-interaction | FN + HTML |
| qa-functional | FN |
| qa-accessibility | HTML |
| qa-performance | HTML |
| qa-debug | QA 리포트 |

### 3. META 블록 확인

이전 단계 산출물의 META 블록을 파싱하여 교차 검증 수치를 복원한다:
- `counts` (FR/FN/UI 수)
- `ids` (첫/끝 ID)
- `self_check` 결과

### 4. 품질 기준 재확인

- `rules/quality.md` 의 핵심 원칙
- `rules/traceability.md` 의 추적 체인
- 현재 스킬의 Self-Check 항목

## 오케스트레이터 컴팩션 대응

오케스트레이터(planning/design/publish/qa)가 컴팩션을 감지하면:

1. `_context.md` 재읽기
2. 현재 Gate 위치 확인 (어디까지 완료했는지)
3. 마지막 완료된 산출물의 META 블록에서 상태 복원
4. 다음 스킬을 정상 호출

## 스킬 실행 중 컴팩션 대응

스킬이 산출물 생성 중 컴팩션이 발생하면:

1. **중단하지 않는다** — 현재 작성 중인 내용을 계속한다
2. _context.md + 입력 산출물을 재읽는다
3. 이미 작성한 부분과 대조하여 일관성을 확인한다
4. Self-Check에서 컴팩션 발생 여부를 기록한다

## `/compact` 실전 활용

### 토크나이저 변경 주의 (Opus 4.7, 2026-04-16)

Opus 4.7은 새 토크나이저를 사용하며, 동일 입력에 **최대 1.35배 토큰**을 소비한다. 기존 60% 기준을 **75% 기준으로 상향**하여 컴팩션 빈도를 낮추고 reasoning thread 보존을 우선한다. (선제 55% 기준은 잦은 압축으로 품질이 더 저하되는 경우가 많아 철회.)

### 선제적 컴팩션 (핵심)

Auto-compaction은 컨텍스트 한계 도달 후 발동하므로, 품질이 저하되기 전 지점을 수동으로 선택해야 한다. **75% 시점에서 수동 `/compact`를 선제 실행**한다. (과거 Opus 4.6 60%·4.7 초기 55% 설정 모두 잦은 압축으로 reasoning thread 소실이 잦아, 75%로 상향하여 단계 완결 직후에만 압축한다.)

### 타이밍 규칙

| 시점 | 행동 |
|------|------|
| 파이프라인 단계 완료 직후 | `/compact` 실행 — 논리 단위가 끊긴 자연스러운 지점 |
| 구현 중간 | **compact 금지** — reasoning thread가 소실됨 |
| 시행착오 반복 후 | `/compact` 실행 — 실패 이력은 압축, 최종 결정만 보존 |

### compact 전 필수 행동

compact 직전에 Claude에게 요청한다:
> "compact 전에 핵심 결정사항, 수정 파일 목록, 현재 상태를 불릿 리스트로 정리해줘"

이 요약을 `_context.md`에 갱신한 후 compact를 실행하면, 다음 세션이 상황 인식을 유지한다.

### 포커스 지정 컴팩션

`/compact <지시>` 형식으로 보존 대상을 명시할 수 있다:
```
/compact API 변경사항과 테스트 커맨드에 집중
/compact FN-001~FN-012 매핑 결과 보존
```

### CLAUDE.md 연동

프로젝트 CLAUDE.md에 아래를 추가하면 자동 컴팩션 시에도 보존 항목을 지정할 수 있다:
```
When compacting, always preserve: _context.md 경로, 현재 파이프라인 단계, META 블록 수치
```

## 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | 컴팩션 후 이전 내용을 "기억"하는 척 | 소실된 정보를 추측하면 hallucination |
| 2 | 재읽기 없이 진행 | 입력 누락으로 산출물 품질 저하 |
| 3 | "이미 읽었으니 생략" | 컴팩션 후에는 읽은 적 없는 상태 |
