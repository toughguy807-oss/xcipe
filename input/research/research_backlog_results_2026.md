# 리서치 백로그 분석 결과 (2026-03-25)

## 요약 매트릭스

| # | 주제 | 우선순위 | ELUO 영향도 | 즉시 적용 | 핵심 인사이트 |
|---|------|---------|------------|----------|-------------|
| 1 | Figma Agent API | P1 | 높음 | 가능 (Beta) | design 3스킬 대체 가능. 읽기/쓰기 모두 지원 |
| 2 | Claude Auto Mode | P1 | 높음 | 조건부 (Team+) | CCD와 다른 계층. 병행 시 완전 자율 파이프라인 |
| 3 | Hyperagents | P2 | 높음 | 규칙 추가만 | 평가 기준 방화벽(P0). anti-rationalization 핵심 보강 |
| 4 | PlayerZero | P2 | 중간 | 패턴 참고 | FR→FN→UI→TC 추적 체인으로 인과 그래프 구현 가능 |
| 5 | Long-running Claude | P2 | 중간 | 검증됨 | ELUO 기존 설계가 Anthropic 공식 권장 패턴과 정렬 |

---

## 1. Figma Agent API

### API 핵심
- MCP 엔드포인트: `https://mcp.figma.com/mcp`
- 읽기: `get_design_context`, `get_variable_defs`, `get_metadata`, `search_design_system`
- 쓰기: `use_figma` (Plugin API JS 실행)
- Rate Limit: `use_figma`와 `search_design_system`은 면제

### 파이프라인 연동
- **Figma 시안 있음**: benchmark → [Figma 읽기] → publish-markup (knowledge/layout/ui 3스킬 스킵)
- **Figma 시안 없음**: benchmark → knowledge → layout → [use_figma 쓰기] → 디자이너 검수 → [읽기] → publish
- Stitch MCP 위치와 `use_figma` 삽입 위치 일치

### 적용 액션
- P0: Figma MCP Remote 서버 설치 + `enabledPlugins` 토글
- P1: design 마스터 스킬에 Figma-First 분기 로직 추가
- P2: Agent-First(역방향) use_figma 테스트

---

## 2. Claude Code Auto Mode

### 핵심 메커니즘
- 분류기(Sonnet 4.6)가 모든 tool call 사전 검토
- 안전 → 자동 실행, 위험 → 차단 + 대안 시도
- 3회 연속 차단 시 수동 전환

### CCD와의 관계
| 계층 | CCD | Auto Mode |
|------|-----|-----------|
| 파이프라인 Gate | ✅ | — |
| tool call 권한 | — | ✅ |

**CCD + Auto Mode = 완전 자율 파이프라인** (충돌 없음)

### 설정 방법
```json
{
  "permissions": { "defaultMode": "auto" },
  "autoMode": {
    "environment": ["Organization: ELUO..."],
    "allow": ["Writing to local output directories is allowed"],
    "soft_deny": ["Never run database migrations outside the migrations CLI"]
  }
}
```

### 적용 조건
- Team 플랜 이상 + 관리자 활성화 + Sonnet/Opus 4.6
- Research Preview 단계

---

## 3. Hyperagents (메타인지적 자기수정)

### 핵심 개념
- Task Agent(수행) + Meta Agent(수정)를 단일 편집 가능 프로그램으로 통합
- Meta Agent가 **자기 자신의 수정 절차**까지 편집 가능
- 단, **평가 기준은 수정 불가** (Evaluation Firewall)

### 추출 패턴 5건
1. **이중 에이전트 통합** — 수행자와 감시자를 하나의 코드베이스에
2. **평가 기준 방화벽** — 평가 기준 수정 시 자기합리화 발생
3. **부모 선택 다양성** — 성능 비례 + 자식 수 반비례
4. **창발적 인프라** — 영속 메모리, 편향 감지가 자발적 출현
5. **도메인 간 전이** — 메타 역량이 새 도메인에 전이 가능

### anti-rationalization 보강 (4건)
- **규칙 6 (P0)**: 평가 기준 방화벽 — Self-Check/DA/reviewer 기준은 스킬 실행 중 수정 불가
- **규칙 7 (P1)**: 영속 메모리 패턴 감지 — 과거 Self-Check 분포와 비교
- **규칙 8 (P2)**: 다양성 강제 — reviewer 이터레이션 시 동일 수정 반복 금지
- **규칙 9 (P3)**: 창발적 체크리스트 학습 — 프로젝트 경험에서 새 합리화 패턴 수집

---

## 4. PlayerZero (엔지니어링 월드 모델)

### 핵심 개념
- 제품 전체를 인과 관계 그래프(causal graph)로 모델링
- 개별 레이어가 아닌 프론트엔드→백엔드→인프라 통합 뷰

### QA 적용 패턴 5건
1. **인과 체인 디버깅** — TC FAIL 여러 건 → FN/FR 역추적으로 공통 원인 식별
2. **멀티레이어 교차 검증** — TC-F/TC-A/TC-P를 FN 기준으로 조인하여 교차 영향도 매트릭스
3. **영향도 우선순위** — Severity × FN 복잡도 × Flow 위치 = Priority Score
4. **릴리스 전후 비교** — 이전 TC 결과 vs 현재 TC 결과 자동 diff
5. **이슈 클러스터링** — 동일 FN/UI 기준 그룹핑

### 핵심 인사이트
> 개별 TC를 독립적으로 보지 말고, FR→FN→UI→TC 추적 체인으로 인과 관계 그래프를 엮어라.

---

## 5. Long-running Claude

### 핵심 개념
- 수일(multi-day) 자율 코딩/과학 연산
- 3계층 영속 메모리: CLAUDE.md(계획) + CHANGELOG.md(진행+실패 기록) + Git(이력)
- Ralph loop: 완료 주장 시 재확인 (agentic laziness 방지)

### ELUO SYS 정렬 상태
| ELUO 구성요소 | Long-running 패턴 | 상태 |
|--------------|-------------------|------|
| CLAUDE.md | 동일 | ✅ 정렬 |
| 오케스트레이터 | Ralph loop 보강 필요 | ⚠️ |
| MEMORY.md | "실패 기록" 부재 | ⚠️ |
| CCD 자동 게이트 | Auto Mode와 동일 개념 | ✅ 정렬 |
| Self-Check / DA | 테스트 오라클과 일치 | ✅ 정렬 |

### 아키텍처 결정
- **하이브리드**: 개별 스킬 = 서버리스, 파이프라인 오케스트레이션 = 상시 실행

### 보강 항목
- P0: 실패 기록 패턴 도입
- P1: Ralph loop (재확인 패턴)
- P2: 파이프라인 중 Git commit 자동화

---

## 통합 액션 플랜 (우선순위순)

### P0 (즉시)
1. anti-rationalization에 **평가 기준 방화벽** 규칙 추가 (Hyperagents)
2. MEMORY에 **실패 기록** 섹션 추가 (Long-running)

### P1 (이번 이터레이션)
3. Figma MCP Remote 서버 설치 + enabledPlugins 토글
4. design 마스터 스킬에 Figma-First 분기 로직
5. 영속 메모리 패턴 감지 규칙 (Hyperagents)
6. QA 교차 영향도 매트릭스 (PlayerZero)

### P2 (다음 이터레이션)
7. Auto Mode settings.json 적용 (Team 플랜 확인 후)
8. Ralph loop 오케스트레이터 보강 (Long-running)
9. reviewer 다양성 강제 (Hyperagents)
10. 이슈 클러스터링 qa-debug 보강 (PlayerZero)

### P3 (장기)
11. 창발적 체크리스트 학습 (Hyperagents)
12. Code to Canvas 양방향 워크플로우 (Figma)
