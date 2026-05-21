# 전역 적용 + 생태계 액션 아이템 (2026-03-26)

리서치 11건 + Claude Code 릴리즈(v2.1.79~84) 기반 정리.
파이프라인 무관하게 **전역/공통 업무**에 즉시 적용 가능한 항목.

---

## A. Claude Code 생태계 — 즉시 적용 가능

### A1. `initialPrompt` frontmatter (v2.1.83)
에이전트에 `initialPrompt` 추가하면 **첫 turn이 자동 제출**됨.

```yaml
---
name: planning-orchestrator
initialPrompt: "프로젝트 컨텍스트를 읽고 PM Direction 수행"
---
```

**적용**: 7개 에이전트 전부. CCD 모드에서 에이전트 시작 시 수동 프롬프트 불필요.

### A2. `effort` frontmatter (v2.1.80)
스킬별 모델 effort 레벨 오버라이드.

```yaml
---
name: plan-qst
effort: high
---
```

**적용**:
- `effort: high` — plan-req, plan-fn, design-benchmark (품질 중요)
- `effort: medium` — 나머지 대부분
- `effort: low` — plan-dashboard, playground (집계/생성 단순 작업)

### A3. `paths:` YAML 리스트 glob (v2.1.84)
스킬/룰의 `paths:` 필드가 glob 패턴 지원.

```yaml
---
paths:
  - "output/**/*.md"
  - "output/**/publish/**"
---
```

**적용**: 스킬이 특정 경로에서만 자동 호출되도록 제한. publish-* 스킬을 `output/**/publish/**`에서만 트리거.

### A4. 새 Hooks — `TaskCreated`, `CwdChanged`, `FileChanged` (v2.1.83~84)

| Hook | 용도 | ELUO 적용 |
|------|------|----------|
| `TaskCreated` | task 생성 시 | 산출물 생성 시 자동 로깅 |
| `CwdChanged` | 작업 디렉토리 변경 시 | 프로젝트 전환 시 _context.md 자동 로드 |
| `FileChanged` | 파일 변경 시 | 산출물 파일 변경 감지 → reviewer 자동 트리거 |

**적용**: `CwdChanged`로 프로젝트 전환 시 자동으로 PROJECT.md + _context.md 읽기. 현재 수동.

### A5. `managed-settings.d/` drop-in 디렉토리 (v2.1.83)
정책 조각을 개별 파일로 분리해서 병합 가능.

```
~/.claude/managed-settings.d/
├── permissions.json
├── mcp-servers.json
└── figma-plugin.json
```

**적용**: 현재 settings.json 하나에 모든 설정이 뭉쳐 있음. 플러그인/권한/MCP를 분리하면 관리 용이.

### A6. `--bare` CLI 플래그 (v2.1.81)
스크립트에서 Claude Code 호출 시 hooks/LSP/plugin 동기화 스킵.

**적용**: 자동화 스크립트(E2E 테스트, 배치 실행)에서 오버헤드 제거.

---

## B. 전역 업무 패턴 — 리서치 기반

### B1. 컴팩션 시 Plan 재읽기 (리서치 #11 — @onusoz)
> "If context compaction happens, make sure to re-read the plan to stay on track"

**현재**: `/compact` 후 수동으로 _context.md 확인 중.
**개선**: 모든 스킬 SKILL.md에 컴팩션 대응 지시 추가.

```markdown
## 컴팩션 대응
컨텍스트 컴팩션이 감지되면:
1. `output/{프로젝트명}/_context.md` 재읽기
2. 현재 스킬의 입력 산출물 재확인
3. 중단된 지점부터 이어서 진행
```

### B2. Generator/Evaluator 분리 (리서치 #1 — Harness Design)
> "에이전트가 자기 산출물을 평가하면 낙관적 편향"

**현재**: Self-Check가 동일 스킬 내에서 자기 검증.
**개선**:
- Self-Check는 유지 (1차 필터)
- reviewer 에이전트를 **별도 컨텍스트**에서 실행 (Generator ≠ Evaluator)
- reviewer가 산출물만 읽고 독립 채점

### B3. 자동 머지 금지 원칙 (리서치 #11)
> "Do not merge automatically unless the user explicitly asks"

**적용**: CCD 모드에서도 **배포/머지/외부 전송은 사람 승인 필수**. `ccd-autogate.md`에 명시 추가.

### B4. CI/CD 무관 실패 분리 (리서치 #11)
> "Ignore the fails unrelated to your changes"

**적용**: QA 스킬에서 "이번 변경과 무관한 기존 이슈"를 명시적으로 분리하는 패턴. Self-Check에 `[기존 이슈]` 태그 도입.

### B5. 코드 리뷰 루프 (리서치 #11)
> "Run codex review in a loop until P0/P1 = 0"

**적용**: reviewer → 수정 → 재채점 루프가 현재 최대 3회. @onusoz 패턴처럼 "P0/P1 0건까지" 조건부 루프로 변경 검토.

---

## C. 생태계 동향 — 경쟁/참고

### C1. Claude Code 스킬 생태계 폭발
| 프로젝트 | ⭐ | 에이전트 | 스킬 | 구조 |
|---------|-----|---------|------|------|
| **ELUO SYS** | — | 7 | 33 | `.claude/agents+skills+rules` |
| Game Studios | 5,032 | 48 | 36 | 동일 |
| Agent Orchestrator | 5,421 | — | — | 병렬 worktree |
| Agent Kernel | 245 | — | — | 마크다운 3개 stateful |

- `.claude/` 구조가 **사실상 표준**으로 자리잡음
- 에이전트 수보다 **스킬 품질과 오케스트레이션**이 차별화 요소
- Game Studios(5K⭐)가 우리와 동일 구조 → ELUO SYS가 웹 에이전시 도메인에서 유일한 포지션 확인

### C2. Stateful 에이전트 패턴 표준화
Agent Kernel의 knowledge/(mutable) + notes/(immutable) = 우리 _context.md + memory/ 와 동일.
→ 이 패턴이 **커뮤니티 표준**으로 수렴 중. 우리 구조가 올바른 방향.

### C3. 숙련도 격차 확대 (Economic Index)
- 6개월+ 사용자가 **10% 더 높은 성공률**
- 소프트웨어 개발자 Opus 사용률 34% (최고)
- **에이전시 자동화 = 최전선**: 파이프라인 숙련자 vs 비숙련자 간 격차 심화
→ ELUO SYS가 이 격차를 메우는 도구로 포지셔닝 가능

---

## D. 즉시 실행 체크리스트

| # | 항목 | 소요 | 상태 |
|---|------|------|------|
| 1 | 7개 에이전트에 `initialPrompt` 추가 | 30분 | ⬜ |
| 2 | 주요 스킬에 `effort` frontmatter 추가 | 30분 | ⬜ |
| 3 | publish-* 스킬에 `paths:` glob 추가 | 15분 | ⬜ |
| 4 | `CwdChanged` 훅 — 프로젝트 전환 시 _context.md 자동 로드 | 1시간 | ⬜ |
| 5 | settings.json → `managed-settings.d/` 분리 | 30분 | ⬜ |
| 6 | 컴팩션 대응 지시를 전 스킬 공통 rules에 추가 | 15분 | ⬜ |
| 7 | `ccd-autogate.md`에 "배포/머지 사람 승인 필수" 명시 | 5분 | ⬜ |
| 8 | reviewer 에이전트를 별도 컨텍스트 실행으로 변경 | 2시간 | ⬜ |

---

## E. 이전 리서치(2026-03-25) 미적용 항목 통합

### E1. Auto Mode 설정 (research_tech #2)
```json
// settings.json
"permissions": { "defaultMode": "auto" }
```
**현재**: allow 100개+ 수동 관리. **개선**: auto 모드로 전환하면 안전 작업 자동 승인, 위험 작업 자동 차단. deny만 유지.

### E2. Figma MCP 모듈 토글 (research_tech #1)
```json
"enabledPlugins": ["figma"]  // 끄면 벤치마킹→HTML 경로로 전환
```
**현재**: 활성화 상태. **적용**: 유료 전환 시 한 줄로 비활성화. `ccd-autogate.md`에 조건 추가 — "Figma 비활성 시 design-benchmark 필수 포함".

### E3. GitHub 자동화 연동 (research_tech #6)
| 기능 | 적용 |
|------|------|
| `/install-github-app` | Claude 봇으로 PR/Issue 자동 처리 |
| `@claude` 멘션 | Issue에 요청 → 코드 작성 → PR 자동 생성 |
| `claude-code-action@v1` | CI/CD에서 자동 리뷰 |
| Cloud Scheduled Tasks | PC 꺼져도 스케줄 실행 (최소 1h 간격) |

**적용**: 배포 후 GitHub 연동이 사용자 온보딩 핵심. ops-setup 스킬에 GitHub 설정 단계 추가.

### E4. Agent Teams 병렬 실행 (research_tech #5)
- 리드 1명 + 팀메이트 N명 병렬 (토큰 7배)
- Git Worktree: 에이전트별 독립 브랜치
- Background Tasks: 서브태스크 분리

**적용**: planning-orchestrator에서 QST→REQ 순차지만, design-benchmark + design-knowledge는 **병렬 가능**. 토큰 비용 고려해서 선택적 활성화.

### E5. 스킬 트리거 실패 대응 (research_market — Reddit)
Reddit 주요 불만: "스킬이 트리거 안 됨"
**원인**: description 키워드 불일치, 컨텍스트 40%+ MCP 소비
**적용**:
- description when 트리거 이미 6개 보강 완료 ✅
- MCP 과소비 모니터링: `rate_limits` statusline 활용 (v2.1.80)
- Figma MCP 비활성화 시 컨텍스트 40% 절약

### E6. SDD(Spec-Driven Development) 패턴 적용 (research_market — 개발 자동화)
- REQ→FN = SDD의 Requirements→Design과 구조 동치
- **FN→Code 직접 변환은 시장에 없음** → 차별화 기회
- Phase 1: dev-spec(FN→SDD) + dev-component
- Gotchas: 컨텍스트 드리프트(70%에서 하락), 코드 환각(19.7%)

**적용**: 개발 스킬은 E2E 완주 후 Phase 2. 현재는 기획~퍼블리싱~QA 범위 유지.

### E7. 배포 전략 확정 (research_distribution)
- **1차: GitHub 오픈코어 + Gumroad 프리미엄 번들** ← 확정
- Plugin Marketplace: 개인 배포 경로 미확인 → 2차 대기
- n8n/MindStudio: 폐기

### E8. DA3 PM-BLOCK 해소 현황
| # | 항목 | 상태 |
|---|------|------|
| 1 | SKILL.md 500줄 초과 | ✅ 해소 (plan-ia/fn/req 전부 500줄 이하) |
| 2 | 컨텍스트 예산 미검증 | ✅ 해소 (~3,802tok 안전) |
| 3 | Plugin Marketplace 배포 미확인 | ⬜ GitHub 1차 확정, Plugin 2차 대기 |
| 4 | n8n/MindStudio 부적합 | ✅ 폐기 확정 |
| 5 | E2E 테스트 0건 | ✅ 카페예약 11스킬 완주 (기획→디자인→퍼블리싱) |

---

## F. 종합 우선순위 (전체 통합)

### 즉시 (이번 주)
| # | 항목 | 근거 |
|---|------|------|
| 1 | Auto Mode 설정 적용 | research_tech — allow 100개 간소화 |
| 2 | 에이전트 `initialPrompt` 추가 | v2.1.83 — CCD 자동 시작 |
| 3 | 스킬 `effort` frontmatter 추가 | v2.1.80 — 품질 분기 |
| 4 | 컴팩션 대응 룰 전역 추가 | @onusoz — Plan 재읽기 |
| 5 | `CwdChanged` 훅 설정 | v2.1.83 — 프로젝트 전환 자동 로드 |

### 단기 (2주 내)
| # | 항목 | 근거 |
|---|------|------|
| 6 | reviewer Generator/Evaluator 분리 | Harness Design — 낙관 편향 제거 |
| 7 | publish-* `paths:` glob 추가 | v2.1.84 — 트리거 정밀화 |
| 8 | GitHub 자동화 연동 (ops-setup 보강) | research_tech — 배포 핵심 |
| 9 | `managed-settings.d/` 분리 | v2.1.83 — 설정 관리 |

### 중기 (1개월)
| # | 항목 | 근거 |
|---|------|------|
| 10 | 병렬 에이전트 패턴 적용 (디자인 단계) | Agent Teams + Orchestrator |
| 11 | GitHub 오픈코어 배포 구조 확정 | research_distribution |
| 12 | 화면설계 스킬 보강/신설 | E2E 이슈 #1 |
