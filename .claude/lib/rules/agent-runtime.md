# Agent Runtime 흡수 로드맵 (외부 멀티에이전트 패턴 → SYS_v4)

2026-05-15 작성, 2026-05-15 검증 후 v1.1 갱신.
AIMAX v0.1 (한국) 스크린샷 분석에서 출발해 픽셀아트 AI 오피스 장르(AgentOffice / Outworked / Claude Office / Pixel Agents / Claw-Empire) 6+ 서비스와 B2B 멀티에이전트 플랫폼(CrewAI / Relevance AI / Dust / Salesforce Agentforce) 5+를 조사한 결과의 **흡수 판정과 통합 설계도**를 정의한다.

> **범위 한정**: 본 룰은 **외부 패턴 흡수 결정**에만 적용. 실제 코드 변경은 `commands/status.md`, `skills/plan-dashboard/SKILL.md`, `lib/rules/handoff-schema.md`, `lib/rules/ccd-autogate.md` 등 해당 자산 갱신 시 본 룰을 Read.
> **호출 시점**: 신규 멀티에이전트 패턴 차용 검토 시 · 본 룰의 Top 3 흡수 후보 구현 착수 시 · "왜 그건 흡수 안 했나" 질의 시.

## 1. 흡수 원칙

| # | 원칙 | 이유 |
|---|------|------|
| P1 | **시각화 패턴 제외, 동작 메커니즘만 흡수** | 사용자 명시 (2026-05-15) — 픽셀아트/캐릭터화는 SYS_v4 방향과 무관 |
| P2 | **Flat Call 원칙 유지** (`AGENTS.md` 공통 원칙 #1) | inter-agent 직접 통신은 카오스 유발, 검수 가능성 훼손 |
| P3 | **결정적 검증 시스템 유지** | Big Five 성격 트레이트 등 비결정성 주입 차단 |
| P4 | **8 에이전트 고정** | 자가성장(인턴 고용)은 단순성/Protected Rules 위배 |
| P5 | **외부 SaaS 의존 0 유지** (`project_d_plus_completed`) | MCP 추가 도입은 `cli-internalization.md` 판단 기준 통과 시에만 |
| **P6** | **Claude Code SDK 능력 대조 후 결정** (v1.1 추가) | 흡수 후보가 실제로 구현 가능한지 SDK 사양·hook 능력·LLM 강제력 한계에 비춰 검증 필수 |

## 2. 외부 리서치 요약 (조사 대상)

| 서비스 | 핵심 패턴 | 비고 |
|---|---|---|
| **AIMAX v0.1** (한국, aimax.ai.kr) | 11 마케팅 직군 캐릭터, 시간 배속, **토큰/비용 상단 노출** | "mock · 연결됨" 라벨 — 백엔드는 단일 콘텐츠 생성기 추정 |
| **Outworked** (Electron + Claude Code SDK) | `[ASK:AgentName]` 통신, shared message bus, **cost dashboard per agent/session**, SKILL.md 플러그인, MCP | 우리 시스템과 가장 가까운 사촌 |
| **AgentOffice** (TypeScript + Ollama 로컬) | **Perceive→Think→Act** 라이프사이클, **Memory with importance scoring**, Big Five, 7명 cap 자가성장 | 학술 계보 (Stanford Smallville 2023 → Simile 2026.02 Series A) |
| **Claude Office** (paulrobello, Next.js + PixiJS) | boss/employee 계층, **상태 6단계** (working/delegating/waiting), tool usage pie, **background task panel**, Kanban whiteboard | Claude Code subagent 시각화 |
| **CrewAI** (Python OSS) | Sequential/Hierarchical/Hybrid 프로세스, **Crews(자율) vs Flows(정밀제어) 2모드**, guardrails + HITL, Composio Tool Router | 산업 표준 멀티에이전트 프레임워크 |
| **Relevance AI** | **agent-to-agent feedback (QC)** | SYS_v4 `reviewer` 에이전트와 동일 패턴 |

## 3. 흡수 판정 매트릭스 (v1.1 — 구현 가능성 반영)

| # | 패턴 | 출처 | 우선도 | **구현 가능성** | 사유 |
|---|------|------|:---:|:---:|------|
| 1 | Cost/Token **per-session/Phase** 가시화 | Outworked, AIMAX | High | **90%** | 세션 jsonl `usage` 필드 파싱은 100%. AIMAX 모형의 "per-agent" 깔끔한 분리는 SDK 한계로 불가 → Phase 단위로 대체 |
| 2 | 에이전트 상태 **2 시점 강제** (진입/완료) + best-effort 6단계 | Claude Office, AIMAX | High | **70%** | LLM이 매 Step `_state.json` 갱신을 100% 따르지 않음. 진입/완료 2 시점만 강제, 중간 상태는 best-effort |
| 3 | Crews(자율) vs Flows(정밀제어) 2모드 | CrewAI | High | **100%** | **`lib/rules/ccd-autogate.md`에 이미 존재**. 트리거 키워드 + `--auto` 인자 매핑만 추가 (5분) |
| 4 | Memory importance scoring (surprisal 가중치) | AgentOffice | Med | 60% | auto memory의 중요도 차등 — 현재 평탄. surprisal 자동 산출은 LLM 의존 |
| 5 | Tool usage 통계 (pie/bar) | Claude Office | Med | 80% | 세션 jsonl의 tool_use 메시지 카운트로 가능. `/doctor` 보강 |
| 6 | Perceive→Think→Act 사이클 명시화 | AgentOffice | Med | 50% | 각 orchestrator 공통 헤더로 표준화 가능하나 LLM 준수 강제력 약함 |
| 7 | Background task panel (run_in_background:true) | Claude Office | Med | 70% | `~/.claude/projects/{path}/tasks/*.output` 파일 존재 — `/status` 확장으로 가능 |
| 8 | agent-to-agent feedback (QC) | Relevance AI | 유지 | — | `reviewer` 이미 존재 |
| 9 | MCP Tool Router (Composio) | CrewAI, Outworked | Low | — | `cli-internalization.md` 판단 기준 통과 시에만 |
| 10 | Shared message bus (양방향) | Outworked | Low | 30% | Flat Call 위배 위험 — 별도 정책 검토 필요 |
| 11 | `[ASK:AgentName]` 직접 통신 | Outworked | ❌ | — | P2 위배 |
| 12 | Big Five 성격 트레이트 | AgentOffice | ❌ | — | P3 위배 |
| 13 | 7명 cap 자가성장 | AgentOffice | ❌ | — | P4 위배 |
| 14 | 픽셀아트 사무실 / 캐릭터 메타포 | 전부 | ❌ | — | P1 위배 |
| 15 | 시간 배속 (0.5×~4×) | AIMAX | ❌ | — | 시뮬레이션 X |

## 4. Top 3 흡수 설계도 (v1.1 — 한계 명시)

각 항목 구성: **사용자 체감 변화 (전/후 모형) → 만드는 것 → 한계 → 작업량**

---

### ③ Crews vs Flows 2모드 — ✅ 거의 완료 (이미 존재)

**검증 결과**: `lib/rules/ccd-autogate.md`가 이미 100% 동등 기능 제공:
- 활성화 트리거: "CCD", "자동 진행", "PM 개입 없이"
- reviewer 점수 기반 자동 결정 (planning/design 90+ PASS, publish/qa 80+ PASS)
- PASS / 이터레이션 (최대 3회) / 에스컬레이션 분기
- 비가역 작업(배포/머지/외부 전송/삭제/권한)은 하드 게이트 — CCD에서도 자동 X

**사용자 체감**: `/run --auto` (또는 `/run "..." CCD 모드"`) 시 게이트 자동 통과, BLOCK만 멈춤.

**남은 작업** (5분)
1. `commands/run.md`에 `--auto` / `--gated` 인자 명시적 매핑 추가
2. `lib/rules/ccd-autogate.md` §"적용 조건"에 `--auto` 키워드 트리거 1줄 추가

**작업량**: 5분

---

### ② 에이전트 상태 — 2 시점 강제, 6단계는 best-effort

**사용자 체감 한 줄**: `/status` 칠 때 "지금 어느 Phase에 있는지" 표시.

**SDK 한계 솔직 인정**
- orchestrator는 LLM이라 매 Step마다 `_state.json` 갱신을 **확률적으로** 따름
- 강제 가능한 것은 **2 시점만**: ① orchestrator 진입 직후, ② `_handoff.md` 작성 직후
- 중간 상태(`구상중`/`검토중`/`협업중`)는 인스트럭션 + Self-Check로 best-effort

**`/status` 출력 — 변경 후**
```
Planning: 완료 | Design: 진행중 | Publish: 대기 | QA: 대기

[현재 Phase]
  ▶ design-orchestrator · 작업중
    └ 시작: 14:30 (경과 12분)
    └ 마지막 갱신: design-knowledge 진입 (14:38)
  ⏸ planning-orchestrator · 완료 (15:12 → _handoff.md)
  ⏸ publish-orchestrator · 대기
```

**`_state.json` 파일 형식** (단순화 — 2 시점만 강제)
```json
{
  "agent": "design-orchestrator",
  "phase": "design",
  "state": "작업중",
  "started_at": "2026-05-15T14:30:00",
  "last_step": "design-knowledge",
  "last_step_at": "2026-05-15T14:38:00",
  "completed_at": null
}
```

**만드는 것** (7개 파일)
1. `lib/rules/handoff-schema.md` v2 — `_state.json` 스키마 정의 (단순화 버전)
2. `output/{stage}/_state.json` — 신규 상태 파일 (orchestrator 진입/완료 시 강제 갱신)
3. `agents/{planning,design,publish,qa,maintenance}-orchestrator.md` (5개) — Step 0 진입 시 `_state.json` Write + `_handoff.md` 작성 후 `completed_at` 갱신 의무 라인 추가
4. `commands/status.md` — `_state.json` 읽어 `[현재 Phase]` 섹션 표시

**한계 (문서화)**
- 중간 Step `_state.json` 미갱신 시 `last_step_at`이 오래된 값으로 남음 → `last_step_at` 기준 5분+ 무갱신 시 `/status`가 "갱신 지연" 경고 표시
- 멀티세션 동시 실행 시 같은 phase의 `_state.json` 충돌 가능 — 세션 ID 필드 포함하여 구분

**작업량**: 1~2시간
**호환성**: 기존 `_handoff.md`는 그대로 유지 — `_state.json`은 추가 레이어

---

### ① Cost Dashboard — per-session/Phase (per-agent는 한계로 미제공)

**사용자 체감 한 줄**: `/status` 칠 때 세션 토큰/비용 + Phase별 비중이 보임.

**SDK 한계 솔직 인정**
- 데이터 소스: `~/.claude/projects/{path}/{session-id}.jsonl`에 메시지별 `usage` 필드 (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`)
- 세션 토탈은 100% 가능
- **"per-agent" 분리 불가**: 메인 세션 내 `Skill()` 호출은 동일 세션 jsonl에 기록됨. `Agent()` 서브에이전트 호출만 별도 세션 분리 가능
- **현실적 대안**: Phase 단위 (planning/design/publish/qa) — `_state.json`의 phase 전환 시점을 jsonl 타임스탬프와 매칭

**`/status` 출력 — 변경 후**
```
[프로젝트 현황] VISIT강남
Planning: 완료 (92/100) | Design: 진행중 | ...

[토큰 누적]
  세션 입력: 1.22M / 출력: 628K
  캐시 히트: 84% / 예상 비용: $13.45

[Phase별 토큰 비중]
  Planning:  ████░░░░░░ 38% ($5.12)
  Design:    █████░░░░░ 52% ($7.00)  ◀ 현재
  Publish:   ░░░░░░░░░░ 0%
  QA:        ░░░░░░░░░░ 0%
  기타:      █░░░░░░░░░ 10% ($1.33)

다음: /design 실행
```

**만드는 것** (3개 파일)
1. `commands/status.md` — `[토큰 누적]` + `[Phase별 토큰 비중]` 섹션 추가 + jsonl 파싱 로직 안내
2. `skills/plan-dashboard/SKILL.md` — Dashboard HTML 비용 섹션 추가 (Phase별 막대그래프)
3. `~/.claude/projects/{path}/cost-summary.json` (신규, 캐시 파일) — jsonl 파싱 결과 캐시 (재실행 시 변경분만 누적)

**계산 방식**
- 비용 = `(input_tokens × $15/1M) + (output_tokens × $75/1M) - (cache_read_input_tokens × $13.5/1M 할인)` (Opus 4.7 가격, 갱신 필요 시 본 룰에서 단가만 수정)
- Phase 매칭: `_state.json.started_at` ~ `completed_at` 구간의 jsonl 메시지를 해당 phase로 귀속

**한계 (문서화)**
- Phase 경계 외 메시지 (orchestrator 호출 전/후, 사용자 휴식 시간 중)는 "기타"로 분류
- `_state.json` 갱신 누락 시 Phase 분류 정확도 ↓ → 세션 토탈은 항상 정확, Phase 비중만 영향

**작업량**: 1~2시간 (단가 단가 검증 + 파싱 스크립트 + 표시 포맷)

---

## 5. 의도적 제외 항목 (왜 흡수하지 않는가)

| 패턴 | 흡수 X 이유 | 대체 |
|------|------------|------|
| 시각화 (픽셀/캐릭터) | 사용자 명시 방향성 + 산출물 중심 시스템에 부적합 | Dashboard HTML + `/status` 텍스트 |
| `[ASK:AgentName]` 통신 | Flat Call 원칙 (AGENTS.md #1) | `_handoff.md` 단방향 + reviewer 게이트 |
| 자가성장 (인턴 고용) | 8 에이전트 고정 + Protected Rules 위배 | 스킬 추가로 능력 확장 |
| Big Five 성격 | 결정적 검증 시스템과 비결정성 충돌 | 스킬별 명시적 description |
| 시간 배속 | 시뮬레이션 X — 실제 산출물 생성 시간 단위 | 진행률 % + ETA 추정 (별도 검토) |
| **per-agent 토큰 분리** (v1.1 추가) | Claude Code SDK 한계 — 메인 세션 내 Skill() 호출 분리 불가 | **Phase 단위** 비중으로 대체 |
| **상태 6단계 실시간 강제** (v1.1 추가) | LLM이 매 Step `_state.json` 갱신을 100% 따르지 않음 | **2 시점(진입/완료) 강제 + best-effort 중간** |

## 6. 구현 우선순위 (v1.1 갱신)

```
Phase 1 (즉시, 5분):
  ③ Crews vs Flows  ← CCD에 이미 존재. 트리거 + 인자 매핑만

Phase 2 (1~2h):
  ② 상태 2 시점 강제  ← _state.json 스키마 + orchestrator 5개 패치
     └─ ①의 Phase 매칭 입력으로 활용 가능

Phase 3 (1~2h):
  ① Phase 단위 Cost  ← jsonl 파싱 + _state.json 매칭

Phase 4 (검토 영역):
  ⑤ Tool usage 통계  ← /doctor 보강
  ⑦ Background task panel
  ④ Memory importance scoring (LLM 의존 — 보류)
  ⑥ Perceive→Think→Act 명시화 (강제력 약함 — 검토 후)
```

**총 작업량**: 약 2~3시간 (원안 4~6h에서 축소 — 검증으로 ③ 제거 + ①② 단순화)

## 7. 변경 영향 파일 매핑 (v1.1 갱신)

| Top 3 | 신규/수정 파일 | 비고 |
|------|----------|------|
| ③ 2모드 | `commands/run.md`, `lib/rules/ccd-autogate.md` (트리거 키워드 1줄 추가) | 작업 최소 — 5분 |
| ② 상태 2시점 | `lib/rules/handoff-schema.md` (v2 스키마), `output/{stage}/_state.json` (신규), `agents/{planning,design,publish,qa,maintenance}-orchestrator.md` (5개), `commands/status.md` | LLM 강제력 한계 명시 필수 |
| ① Phase Cost | `commands/status.md` (`[토큰 누적]` 섹션), `skills/plan-dashboard/SKILL.md`, `~/.claude/projects/{path}/cost-summary.json` (신규 캐시) | jsonl 파싱 스크립트 별도 |

## 8. 검증 체크리스트 (구현 후)

- [ ] ③ Crews vs Flows: `/run --auto` 인자가 ccd-autogate.md 트리거를 활성화
- [ ] ② 상태 2시점: orchestrator 5개 모두 진입/완료 시점에 `_state.json` Write 의무 라인 포함
- [ ] ② 상태 best-effort: `last_step_at` 5분+ 무갱신 시 `/status` 경고 표시
- [ ] ① Phase Cost: 세션 토탈 == jsonl `usage.input_tokens` 합산 (정합성)
- [ ] ① Phase Cost: Phase 분류 누락분이 "기타"로 표시되어 사용자 혼동 방지
- [ ] 모든 변경 시 `AGENTS.md` 공통 원칙 #1 (Flat Call) 미위반
- [ ] `lib/rules/INDEX.md`에 본 룰 매핑 유지 (#22)
- [ ] Opus 4.7 단가 (`$15/1M in, $75/1M out, $13.5/1M cache discount`) 본 룰에 단일 소스로 보관

## 9. 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-15 | 초안 — AIMAX/Outworked/AgentOffice/CrewAI/Claude Office 리서치 기반 흡수 매트릭스 + Top 3 설계도 |
| **v1.1** | **2026-05-15** | **Claude Code SDK 능력 대조 검증 결과 반영**: ① ③은 ccd-autogate.md에 이미 존재 — 흡수 작업 5분으로 축소. ② "상태 6단계 실시간"은 LLM 강제력 한계 — "2 시점 강제 + best-effort 중간"으로 현실화. ③ ①의 "per-agent 분리"는 SDK 한계 — "Phase 단위"로 대체. ④ 원칙 P6 추가(SDK 능력 대조). ⑤ §5에 의도적 제외 2건 추가. ⑥ 총 작업량 4~6h → 2~3h로 축소 |

## 10. 검증 근거 (v1.1 추가)

본 룰의 흡수 결정은 다음 SDK·시스템 대조 결과에 기반한다 — 향후 흡수 후보 검토 시 동일 대조 절차 권장.

### 10-A. Claude Code 세션 jsonl 스키마
- 위치: `~/.claude/projects/{path}/{session-id}.jsonl`
- 메시지별 `usage` 필드: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- **세션 토탈 비용 계산은 100% 가능**
- **per-agent 분리 불가**: 메인 세션 내 `Skill()` 호출은 동일 jsonl. `Agent()` 서브에이전트만 별도 세션 jsonl

### 10-B. settings.json hook 능력
- 현재 운영 hook: `SessionStart`, `CwdChanged`, `UserPromptSubmit`, `PostToolUse`, `Stop` (총 5종)
- hook은 stdin으로 컨텍스트 JSON 수신. **토큰 사용량은 직접 전달되지 않음** — jsonl 파싱이 1차 소스
- `PostToolUse` matcher `Write|Edit` 등 도구 필터링 가능

### 10-C. LLM 강제력 한계
- orchestrator 프롬프트에 "Step 진입 시 _state.json Write" 명시 가능
- 그러나 LLM이 매 Step 100% 따른다는 보장 없음 — Opus 4.7도 동일
- **현실적 강제 시점**: ① orchestrator 진입 (Step 0 시작 직후), ② `_handoff.md` 작성 직후 — 이 2개는 Self-Check 검증 항목으로 만들어 강제 가능
- 중간 Step 갱신은 best-effort — 인스트럭션 + 검증 항목 추가로 80%+ 달성 가능, 100%는 어려움

### 10-D. ccd-autogate.md 기존 능력
- `lib/rules/ccd-autogate.md`의 §"적용 조건"이 CrewAI Crews vs Flows의 자율 모드와 기능 동등
- 활성화 트리거: "CCD", "자동 진행", "PM 개입 없이" 중 명시 시
- reviewer 점수 기반 자동 결정 표 + 비가역 작업 하드 게이트 5종 명시 존재
- → **새 모드 신설 불필요**. `--auto` 인자를 위 트리거에 매핑만 추가
