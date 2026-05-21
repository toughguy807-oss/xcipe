# 외부 리서치 정리 (2026-03-26)

---

## 1. Harness Design for Long-Running Apps (Anthropic Engineering)
> https://www.anthropic.com/engineering/harness-design-long-running-apps

### 핵심
- **GAN 영감 Generator-Evaluator 분리**: 에이전트가 자기 산출물을 평가하면 낙관적 편향 발생 → 평가자를 분리해야 신뢰할 수 있는 피드백
- **Harness = 에이전트 주변 오케스트레이션 프레임워크**: 작업 분해, 컨텍스트 전달, 역할 정의

### 3-에이전트 아키텍처
| 역할 | 기능 |
|------|------|
| **Planner** | 1~4문장 → 상세 사양 확장, 스프린트 16개 기능 분해 |
| **Generator** | 스프린트 단위 구현, Git 버전관리, 자가 평가 |
| **Evaluator** | Playwright MCP로 실제 UI 테스트, 스프린트 계약 기준 PASS/FAIL |

### 핵심 패턴
1. **컨텍스트 리셋 > 컴팩션**: 컴팩션은 "컨텍스트 불안감" 남음. 리셋이 깨끗한 시작 제공
2. **스프린트 계약**: Generator-Evaluator가 "완료 기준" 사전 합의 후 구현
3. **프론트엔드 디자인 루프**: 5~15회 반복, 4기준(디자인/독창성/공예/기능) 평가
4. **Opus 4.6 이후 단순화**: 스프린트 구조 제거, 자동 컴팩션 활용, 최종 평가만

### ELUO SYS 시사점
- **reviewer 에이전트 = Evaluator 역할**. 현재 Self-Check가 자기평가라 낙관 편향 위험 → Evaluator 분리 패턴 적용 검토
- **스프린트 계약 = AC/검증 기준**. REQ AC → FN 검증기준 전파가 동일 패턴
- **컨텍스트 리셋 vs 컴팩션**: 우리도 `/compact` 사용 중. 장시간 파이프라인에서 리셋 방식 고려
- **Opus 4.6 단순화**: 모델 업그레이드마다 harness 재검토 필요 (불필요한 구조 제거)

---

## 2. TurboQuant: AI 극단적 압축 (Google Research)
> https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/

### 핵심
- **3개 양자화 알고리즘**: TurboQuant, QJL, PolarQuant
- KV 캐시 **6배 압축**, 3비트 손실 없는 양자화, H100에서 **8배 속도**

### 기술
- PolarQuant: 극좌표 변환으로 정규화 오버헤드 제거
- QJL: 1비트 잔여 압축으로 편향 제거
- LongBench/RULER 등 장문맥 벤치마크에서 정확도 유지

### ELUO SYS 시사점
- **직접 관련 낮음** — 우리는 모델 추론이 아닌 프롬프트 파이프라인. 하지만:
- KV 캐시 압축 → 더 긴 컨텍스트 윈도우 가능 → 스킬 실행 시 더 많은 문맥 유지
- 로컬 LLM 배포 시 비용 절감 가능성

---

## 3. Anthropic Economic Index (2026년 3월)
> https://www.anthropic.com/research/economic-index-march-2026-report

### 핵심 수치
| 항목 | 데이터 |
|------|--------|
| 사용 사례 다양화 | 상위 10개 작업 비중 24%→19% |
| 개인 사용 증가 | 35%→42% |
| 코딩 작업 | Claude.ai → API로 이동 |
| 장기 사용자 성공률 | **10% 더 높음** |
| 고가치 작업 Opus 비율 | 시간급 $10↑마다 1.5~2.8%p↑ |

### 자동화 확대 영역
- 영업 자동화 (자료 생성, 리드 심사, 이메일)
- 거래/시장 운영 (모니터링, 투자 제안)
- **소프트웨어 개발자 Opus 사용률 34%** — 가장 높은 고급 모델 의존도

### 숙련도 편향 (Skill-Biased Technological Change)
- 초기 채택자: 높은 성공률 + 고가치 작업 집중 + AI에 가장 노출
- 학습-하기(learning-by-doing) 효과: 6개월+ 사용자가 10% 더 높은 성공률
- **교육 수준 6% 격차** — 거의 1년 교육 차이

### ELUO SYS 시사점
- **에이전시 자동화 = 최전선**: 웹 기획/디자인/퍼블리싱이 자동화 확대 영역에 정확히 위치
- **숙련도 격차 = 경쟁 우위**: ELUO SYS 파이프라인 숙련자 vs 비숙련자 간 생산성 차이 확대
- **개인 사용 증가**: SaaS/마켓플레이스 배포 시 개인 사용자도 타겟 가능
- **코딩 API 이동**: Agent SDK/CLI 기반 접근이 시장 방향과 일치

---

## 종합 — ELUO SYS 액션 아이템

| 우선순위 | 항목 | 근거 |
|---------|------|------|
| **P1** | reviewer를 Generator/Evaluator 분리 패턴으로 강화 | Harness Design — 자기평가 낙관 편향 |
| **P1** | 장시간 파이프라인 시 컨텍스트 리셋 방식 도입 | Harness Design — 컴팩션 한계 |
| **P2** | Opus 4.6 단순화 적용 (불필요 harness 제거) | Harness Design — 모델별 재검토 |
| **P2** | 개인 사용자 타겟 배포 전략 수립 | Economic Index — 개인 사용 42% |
| **P3** | 장문맥 활용 방안 (KV 캐시 최적화 추이 모니터링) | TurboQuant — 간접 영향 |

---

## 4. Claude Code Game Studios (GitHub)
> https://github.com/Donchitos/Claude-Code-Game-Studios — ⭐5,032

### 개요
Claude Code를 **게임 개발 스튜디오**로 전환. 48개 AI 에이전트 + 36개 워크플로우 스킬 + 실제 스튜디오 조직 구조 미러링.

### 구조 (ELUO SYS와 동일 패턴)
```
.claude/
├── agents/     48개 (art-director, qa-lead, gameplay-programmer 등)
├── skills/     36개 (sprint-plan, code-review, gate-check 등)
├── rules/      11개 (ai-code, test-standards, shader-code 등)
├── hooks/
└── settings.json
```

### ELUO SYS 시사점
- **동일 아키텍처**: `.claude/agents+skills+rules` 구조 = ELUO SYS와 완전 동일
- **도메인 특화**: 우리가 웹 에이전시에 특화한 것처럼, 이 프로젝트는 게임 개발에 특화
- **에이전트 수 48개**: 우리 7개 대비 6.8배. 역할 세분화가 극단적
- **팀 단위 스킬**: `team-combat`, `team-level`, `team-narrative` 등 팀별 워크플로우 → 우리도 팀 단위 스킬 검토 가능
- **gate-check 스킬**: reviewer와 유사. 단계별 게이트 패턴 공유
- **⭐5,032**: Claude Code 에코시스템에서 높은 관심도. 시장 검증

---

## 5. MiniMind (GitHub)
> https://github.com/jingyaogong/minimind — ⭐43,700+

### 개요
64M 파라미터 LLM을 **2시간, $3**에 처음부터 훈련. LLM 입문 교육용 오픈소스.

### 기술
- PyTorch 네이티브, Dense + MoE 아키텍처
- 풀 파이프라인: Pretrain → SFT → LoRA → RLHF → RLAIF
- 멀티모달(Vision), Tool Calling, Agent RL 지원
- llama.cpp, vLLM, Ollama 호환

### ELUO SYS 시사점
- **직접 관련 낮음** — 모델 훈련 프로젝트. 우리는 모델 사용 측
- 참고: 로컬 LLM 배포 시 경량 모델 후보 (비용 절감)

---

## 6. NoDeskClaw — Cyber Office (GitHub)
> https://github.com/NoDeskAI/nodeskclaw — ⭐544

### 개요
**인간과 AI 직원이 함께 비즈니스를 운영하는 사이버 오피스**. 헥사곤 토폴로지 워크스페이스, 자율 협업, 스킬 진화, 성과 측정.

### 구조
- Python 기반, Docker 배포
- CLAUDE.md + AGENTS.md 존재 (Claude Code 호환)
- 클라우드 네이티브 아키텍처

### ELUO SYS 시사점
- **AI 직원 개념**: 에이전트를 "직원"으로 프레이밍. 우리 에이전트도 유사한 포지셔닝 가능
- **스킬 진화**: 에이전트가 작업을 통해 스킬을 발전시키는 개념 → 우리 스킬 자동 개선 아이디어와 연결
- **성과 측정**: 정량적 성과 트래킹 → reviewer 채점과 유사
- 아직 초기 단계 (⭐544)

---

## 7. Error Monitoring Agent (Airweave)
> https://github.com/airweave-ai/error-monitoring-agent — ⭐330

### 개요
**지능형 에러 모니터링 에이전트**. Airweave로 코드/티켓/Slack에서 컨텍스트를 찾아 유사 에러를 클러스터링하고, 관련 컨텍스트로 보강하여 실행 가능한 알림 생성.

### ELUO SYS 시사점
- **QA-debug 보강 참고**: 에러 클러스터링 + 컨텍스트 보강 패턴
- **운영 모드 연동**: 에러 모니터링 → 자동 티켓 생성 → maintenance-intake 연계 가능성
- Airweave 자체가 데이터 통합 플랫폼 — 외부 데이터 소스 연동 레퍼런스

---

## 8. Agent Orchestrator (Composio)
> https://github.com/ComposioHQ/agent-orchestrator — ⭐5,421

### 개요
**병렬 코딩 에이전트 오케스트레이터**. 작업 계획 → 에이전트 스폰 → CI 수정/머지 충돌/코드 리뷰 자율 처리.

### 키워드
`agent-fleet`, `agent-swarm`, `claude-code`, `codex-cli`, `git-worktrees`, `multi-agent`, `parallel-agents`, `parallel-coding`, `skills`, `tmux`

### ELUO SYS 시사점
- **병렬 에이전트 패턴**: 우리 planning-orchestrator가 순차 실행인데, 독립 단계 병렬화 참고
- **git-worktrees 활용**: 에이전트마다 독립 워크트리 → 충돌 없는 병렬 작업. Agent isolation 패턴
- **CI 자동 수정**: QA FAIL → 자동 수정 루프. qa-debug + publish 연계와 유사
- **⭐5,421**: ELUO SYS의 orchestrator 개념과 직접 비교 가능한 경쟁/참고 프로젝트

---

## 9. ClawBox (Commonstack)
> https://github.com/CommonstackAI/clawbox — ⭐16

### 개요
**OpenClaw 에이전트용 가이드 셋업 + 통합 대시보드**. TypeScript 기반.

### ELUO SYS 시사점
- 초기 단계(⭐16). 구조 참고 정도
- "agent-skills" 토픽 — 스킬 기반 에이전트 프레임워크 트렌드 확인

---

## 종합 — 추가 액션 아이템 (업데이트)

| 우선순위 | 항목 | 근거 |
|---------|------|------|
| **P1** | reviewer를 Generator/Evaluator 분리 패턴으로 강화 | Harness Design |
| **P1** | 장시간 파이프라인 컨텍스트 리셋 도입 | Harness Design |
| **P1** | Game Studios 구조 벤치마킹 — 팀 단위 스킬, gate-check 패턴 | ⭐5,032 검증 |
| **P2** | agent-orchestrator 병렬화 패턴 분석 — worktree 기반 | ⭐5,421 |
| **P2** | Opus 4.6 단순화 적용 | Harness Design |
| **P2** | 개인 사용자 타겟 배포 전략 | Economic Index |
| **P3** | 에러 모니터링 → maintenance-intake 연계 | Airweave |
| **P3** | 장문맥/KV 캐시 최적화 추이 모니터링 | TurboQuant |

---

## 10. Agent Kernel (oguzbilgic)
> https://github.com/oguzbilgic/agent-kernel — ⭐245

### 개요
**AI 에이전트를 stateful하게 만드는 최소 커널**. 프레임워크/DB 없이 마크다운 3개 + git repo만으로 에이전트에 기억력 부여.

### 메모리 구조
```
AGENTS.md       ← 커널 (에이전트 행동 규칙)
IDENTITY.md     ← 이 에이전트가 누구인지 (에이전트가 관리)
KNOWLEDGE.md    ← 지식 파일 인덱스 (에이전트가 관리)
knowledge/      ← 현재 사실 (mutable — 현실 변경 시 업데이트)
notes/          ← 세션 로그 (append-only — 수정 불가)
```

### 핵심 원리
- AI 에이전트는 이미 `AGENTS.md`/`CLAUDE.md`를 프로젝트 지침으로 읽음
- 이 메커니즘을 활용해 "기억하는 법"을 가르침
- DB/벡터스토어/커스텀 프레임워크 불필요
- **knowledge/ = mutable 상태**, **notes/ = immutable 내러티브** 이원 구조
- 에이전트마다 별도 git repo = 별도 아이덴티티

### kern-ai 런타임
- 데몬 모드, Telegram/Slack 연동
- `npx kern-ai init my-agent`로 즉시 시작
- 하나의 brain으로 모든 채널 통합

### ELUO SYS 시사점
- **우리 `_context.md` + `memory/` = 동일 패턴**: knowledge/(mutable) + notes/(append-only) 구분이 우리 _context.md(누적 상태) + memory/(세션 간 기억)와 구조적으로 동일
- **IDENTITY.md 개념**: 에이전트별 페르소나 파일. 우리 에이전트 frontmatter의 description과 유사하지만 더 풍부
- **git 기반 메모리**: 버전관리 + 변경 이력 자동 추적. 우리도 산출물을 git으로 관리하면 동일 효과
- **극단적 단순화**: 마크다운 3개로 stateful 에이전트 구현 — "불필요한 복잡성 제거" 원칙의 좋은 사례

---

## 11. Agentic Workflow — @onusoz (X/Twitter)
> https://x.com/onusoz/status/2035085513305334011
> 실제 예시: https://github.com/textcortex/spritz/blob/main/docs/2026-03-19-unified-extension-framework-architecture.md

### 워크플로우 요약
**"Implementation Plan 마크다운 → 에이전트에게 던지고 → 끝까지 자동 실행"**

#### 6단계 프롬프트 패턴
| 단계 | 내용 |
|------|------|
| 1. **구현** | Plan MD 기반 E2E 구현. 컨텍스트 컴팩션 시 Plan 재읽기. PR 생성 |
| 2. **테스트** | 로컬 스모크 테스트, dev 서버 기동, 요청 보내기. 로컬에서 테스트 불가한 항목 명시 |
| 3. **코드 리뷰** | `codex review --base <branch>` 루프 실행. P0/P1 이슈 0건까지 반복 |
| 4. **리뷰 코멘트 처리** | PR 인라인/이슈 코멘트 확인 → 유효하면 수정, 무효하면 답변+resolve |
| 5. **CI/CD 확인** | 그린 확인. 자기 변경과 무관한 실패는 명시적으로 분리 |
| 6. **완료 보고** | PR 링크 + 검증 명령어 + 결과 요약. **자동 머지 금지** (명시 요청 시만) |

#### 핵심 원칙
- **Plan이 가장 중요**: underspecified하면 에이전트가 경로 이탈
- **자동 완결 루프**: 구현→테스트→리뷰→수정→CI 반복
- **사람은 code smell 스킴 + 머지 승인만**: 최소 개입
- **스테이징 검증 후 이슈 발견 → 같은 루프 반복**

### ELUO SYS 시사점
- **Plan = REQ/FN**: 우리 REQ→FN이 "implementation plan" 역할. 동일 패턴 확인
- **codex review 루프 = reviewer + qa-debug**: P0/P1 이슈 0건까지 반복 = Self-Check PASS까지 이터레이션
- **컴팩션 시 Plan 재읽기**: 우리 `/compact` 후 _context.md 재로드와 동일. 명시적 "re-read plan" 지시가 핵심
- **CI/CD 무관 실패 분리**: QA에서도 "이 변경과 무관한 기존 이슈"를 분리하는 패턴 필요
- **자동 머지 금지**: CCD 모드에서도 "배포/머지는 사람 승인" 원칙 참고
- **실전 검증된 워크플로우**: textcortex/spritz 레포에서 실제 사용 중
