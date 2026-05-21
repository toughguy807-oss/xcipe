# Eluo Hub 에이전트 시스템 (v2.1 — 2026-05-11 compound + 메타 자가 진화 룰 추가)

**6개 패키지 (기획/디자인/퍼블/개발/QA/운영) · 8개 에이전트 · 39개 스킬(Dev 4 미구현, 2026-05-11 compound 추가) · 23개 rules · 9개 ref · 9개 commands · 5개 hooks**로 구성된 웹사이트 자동화 시스템.

> 카탈로그 등재 vs 실제 구현 분리 표기: 등재 45개 ÷ 구현 41개. Dev 4종(dev-spec/component/api/test)은 카탈로그 등재만, SKILL.md 미구현. claude-wireframe은 2026-05-12 폐기(plan-sb 흡수). 상세는 `SKILLS_CATALOG.md` 수치 요약 참조.

> 2026-04-24 기준 — v1.9: 방법론 편입 (SSoT 시드 3단 패턴 + Manus 대비 Structure 원칙)
> v1.8 기준(2026-04-17) — Opus 4.7 GA + CLI/MCP 명시 반영

## 에이전트 총괄 (8개)

| # | 에이전트 | 모델 | 패키지 | 역할 |
|---|---------|------|--------|------|
| 1 | planning-orchestrator | opus | Planning | 기획 워크플로우 통합 (QST~Dashboard) |
| 2 | design-orchestrator | opus | Design | 디자인 워크플로우 (Benchmark~UI) + design-image 통합. design-bench-scrape는 2026-05-18 dkb-analyze에 흡수 (stub 2026-07-15까지) |
| 3 | publish-orchestrator | opus | Publish | 퍼블리싱 통합 (Markup/Style/Interaction) |
| 4 | qa-orchestrator | opus | QA | QA 통합 (기능/접근성/성능/보안) + qa-lighthouse 자동 호출 + check-images.js |
| 5 | maintenance-orchestrator | opus | OPS | 유지운영 워크플로우 통합 (접수→티켓→처리→검증) |
| 6 | pm-router | sonnet | 진입 | 작업 요청 자동 감지 → orchestrator 라우팅 |
| 7 | reviewer | sonnet | 공통 | 통합 검수 (§A 기획 / §B 디자인 / §C 퍼블리싱 / §D QA) |
| 8 | sb-wf-design | opus | Planning 보조 | plan-sb 자동 호출 보조 (와이어프레임 UX 강화) |

## 파이프라인 체인

```
Planning → Design → Publish → Dev → QA → [Deploy]
   │          │         │       │      │
   └─ _handoff.md ─→ _handoff.md ─→ _handoff.md ─→ 최종 리포트
```

### 구축 (Full)
```
QST → REQ → FN → SB → IA → WBS → Dashboard
  → Benchmark → [bench-scrape] → Knowledge → [image] → Layout → UI
    → Markup → Style → Interaction
      → Spec → Component → API → Test
        → Functional → Accessibility → Performance → Lighthouse → Security → Debug
```

### 운영 (Simple)
```
[QST] → REQ → FN → [Dashboard]
  → [Benchmark] → 변경 영역 HTML 직접 수정
    → 회귀/스모크 테스트
```

## 공통 원칙

### 1. Flat Call (중첩 금지)
- 에이전트가 다른 에이전트를 직접 호출하지 않음
- Orchestrator → Skill() 순차 로딩만 허용

### 2. Gate 패턴 (단계별 확인)
- 모든 산출물은 사용자 확인 후 다음 단계로
- A/B/C 선택형 질의로 30초 내 답변 가능

### 3. [미확인] 프로토콜
- AI가 모르는 정보는 추측 금지 → `[미확인]` 표시
- `[미확인]` 0건이 되어야 다음 단계 진행

### 4. 정량적 판정
- 감각이 아닌 수치 기반: 100점 채점, Critical/Major 건수
- 90점 이상 + Critical 0건 = PASS (2026-04 reviewer 기준 상향)

### 5. 이터레이션 루프
- BLOCK(Critical 1건+) 또는 90점 미만 시 최대 3회 수정→재검수
- 해당 항목만 재검수 (전체 재실행 X)
- 3회 후 미해결 시 사용자 에스컬레이션

### 6. ID 추적 체인
```
Q-### → FR-### → FN-### → UI-### → TC-###
           │         │         │
        IA-P###   Layout-###  data-ui-id
```

### 7. 핸드오프 프로토콜
- 발신측 책임: 각 패키지가 _handoff.md 생성
- 수신측 Step 0: 0-A(핸드오프 파싱) + 0-B(전제조건 확인)
- META 블록 교차 검증 (handoff-schema.md 참조)

### 8. CLI/MCP 도구 명시 (2026-04 신규)
- 17개 SKILL.md에 "권장 CLI/MCP 도구" 공통 섹션 존재
- 각 단계별 사용 도구·명령·필수여부 명시 → 팀 배포 시 환경 세팅 가이드 자동
- 외부 의존: curl, npx (Playwright/Lighthouse/html-validate), Gemini API, Figma MCP
  - 분기 D⁺(2026-05-07) Notion API 폐기 — `ops-setup` Phase 6 레거시 호환 시에만 활성화

### 9. 크로스플랫폼 호환성 (lib/rules/environment.md)
- Bash `grep -P` 금지 → `-E` 사용 (Git Bash 미지원)
- 절대경로 강제, LF 라인엔딩, http-server 캐시 0
- 장애 시 단계 스킵 + 로그 + 나머지 계속 진행 (전역 실패 금지)

---

## 패키지 상세

### 1. Planning (기획) — 카탈로그 10 / 구현 8

**파이프라인**: QST → REQ → FN → SB → IA → WBS → Dashboard

| 스킬 | 산출물 | 카테고리 |
|------|--------|---------|
| `/plan` | 전체 마스터 | 마스터 (오케스트레이터 호출) |
| `plan-qst` | 고객질의서 | Discovery |
| `plan-persona` | 사용자 페르소나 (JTBD) | Discovery |
| `plan-competitor` | 경쟁사 전략 분석 | Discovery |
| `plan-premortem` | 위험 사전 식별 | Discovery |
| `plan-req` | 요구사항정의서 | Definition |
| `plan-fn` | 기능정의서 | Definition |
| `plan-ia` | 정보구조 (사이트맵) | Definition |
| `plan-wbs` | 작업분해구조 | Planning |
| `plan-sb` | 화면설계서 (HTML/PDF) | Planning |
| `plan-dashboard` | 프로젝트 현황 종합 | Monitoring |

> 폐기 (2026-04-15): plan-swot, plan-stakeholder, plan-prioritize

**ID 체계**: Q-### / FR-### / NFR-### / FN-### / IA-P### / IA-N### / IA-C###

---

### 2. Design (디자인) — 10 스킬 (디자인 7 + DKB 3)

AI는 "감성"이 아닌 **"규칙"**으로 디자인한다. **References-First** 정책 (벤치마크 무시한 LLM 직접 생성 금지).

**파이프라인**: Benchmark → [bench-scrape] → **dkb-search** → Knowledge → [image] → Layout → UI → **design-replicate** (3종 관점 시안)

| 스킬 | 산출물 | 외부 런타임 |
|------|--------|-----------|
| `/design` | 마스터 | — |
| `design-benchmark` | 벤치마킹 분석 (어워드 사이트) | Playwright (스크린샷) |
| ~~`design-bench-scrape`~~ | **2026-05-18 dkb-analyze 흡수** (Step 1 부수효과). stub은 2026-07-15까지. 신규 호출은 `dkb-analyze` 사용 | curl |
| `dkb-search` ★ | DKB references + section-packs 매칭 (정적 LLM 0회) | — |
| `design-knowledge` | 디자인 토큰 8대 카테고리 (2026-05-04: **Motion DNA** — signature_easing/duration/sequence) | — |
| `design-image` | AI 이미지 생성 (키비주얼/무드보드) | Gemini API (`GEMINI_API_KEY`) |
| `design-layout` | 페이지별 레이아웃, 반응형 3단계 | — |
| `design-ui` | 컴포넌트별 UI 명세 | — |
| `design-replicate` ★ | V1 충실 / V3 비판 / V4 건설 3종 관점 시안 (모방 다양성 → 관점 다양성 전환) | — |
| `dkb-analyze` ★ | DKB references/section-packs 등재 | — |
| `dkb-curate` ★ | DKB 헬스체크 / trending rejects 트리아지 | — |

> ★ DKB 인프라 — design-orchestrator가 자동 호출 (Step 2B-2 search / Step 2B-2.7 replicate / Step 7 reject API).
> **5종 UX 옵션 탐색**(2026-05-12 claude-wireframe 폐기 후 흡수): plan-sb Mode A `--explore` 플래그 또는 design-layout에서 `skills/plan-sb/references/ux-philosophies.md` 참조.

**참조**: DESIGN_PRINCIPLES.md, ref-design-policy.md, design-taste.md, anthropic-frontend-design.md (Tone Commit Gate)
**ID 체계**: BM-### / UI-### / CSS `--{카테고리}-{속성}`

---

### 3. Publish (퍼블리싱) — 4 스킬

**"퍼블리싱 = 시안"** — STYLE 토큰 → CSS Custom Properties 1:1 전사.

**파이프라인**: Markup → Style → Interaction → Visual-Verify (3 Phase)

| 스킬 | 외부 런타임 |
|------|-----------|
| `/publish` (마스터) | — |
| `publish-markup` | npx html-validate, curl (OG 메타 검증) |
| `publish-style` | — |
| `publish-interaction` | — (2026-05-04: **CSS-Native 1순위** 강제 — View Transitions / scroll-driven / Anchor Positioning + Motion DNA 토큰 변수 강제) |
| `publish-visual-verify` ★ | Playwright + Vision LLM (3 Phase 검증: Grep / Taste 9축 / 렌더링 Vision) |

> ★ 2026-05-06 결합: Phase 1 Grep은 publish-orch Step 2 사후 게이트(#8/#9/#10)로 흡수, Phase 2/3는 Step 3-final에서 호출.

**ID 체계**: `data-ui-id="UI-###"` / CSS `--color-*`, `--font-size-*`, `--spacing-*`, `--ease-*`, `--dur-*` (Motion DNA)

---

### 4. Dev (개발) — 4 스킬 (**카탈로그 등재만, SKILL.md 미구현**)

> ⚠️ **2026-05-06 검증**: 4종 모두 `~/.claude/skills/` 디렉토리에 부재. 카탈로그·AGENTS.md만 등재. 사내 개발자용으로 별도 구현 또는 카탈로그 제거 결정 필요.
> 현재 `Publish → QA` 직결 흐름으로 우회 동작.

**파이프라인 (계획안)**: Spec → Component / API / Test

| 스킬 | 산출물 | 외부 런타임 | 상태 |
|------|--------|-----------|------|
| `dev-spec` | 개발 명세서 (ERD / API / 시퀀스) | — | 미구현 |
| `dev-component` | React/Vue 컴포넌트 (HTML→프레임워크) | npm/node | 미구현 |
| `dev-api` | 백엔드 API 코드 (Express/Laravel/FastAPI) | npm/node | 미구현 |
| `dev-test` | 테스트 코드 (Unit/Integration/E2E) | Playwright | 미구현 |

---

### 5. QA (품질 검증) — 6 스킬

**파이프라인**: Functional → Accessibility → Performance → [Lighthouse] → Security → Debug

| 스킬 | 외부 런타임 |
|------|-----------|
| `/qa` / `/qa-run` (마스터) | — |
| `qa-functional` | Playwright (정적/브라우저 모드) + check-images.js (이미지 무결성) |
| `qa-accessibility` | Playwright + axe |
| `qa-performance` | Playwright + Lighthouse |
| `qa-lighthouse` | npx lighthouse (CWV 실측, qa-performance에서 자동 호출) |
| `qa-security` | OWASP Top 10 (정적 분석) |
| `qa-debug` | Playwright (재현) — Iron Law 4단계 |

**테스트 범위**: full(전체) / regression(회귀) / smoke(스모크)
**통과 기준**: Must TC 커버 100% + Critical 0건 + WCAG AA + CWV Good ≥60% + 보안 Critical 0건
**ID 체계**: TC-F-### / TC-A-### / TC-P-### / TC-R-### / TC-V-### / TC-SEO-### / TC-CB-### / SEC-{카테고리}-### / DEF-###

---

### 6. OPS (유지운영) — 3 스킬

메일 수집 → 요청 접수 → 티켓 관리 → 파이프라인 라우팅 → as-is/to-be 검증.

| 스킬 | 외부 런타임 |
|------|-----------|
| `ops-setup` | internal-ticket (자체) + IMAP. Notion API는 Phase 6 레거시 호환만 (분기 D⁺ 2026-05-07) |
| `maintenance-intake` | — |
| `notion-ticket` | Notion API + curl (분기 D⁺ 레거시 호환 한정 — 신규 사용 X, `internal-ticket`으로 라우팅) |

**운영 복잡도별 파이프라인**:
- 경미 (TXT/IMG): publish-orchestrator만
- 보통 (FNC 2~5건): planning → publish → qa
- 복합 (6+ 페이지): 구축 전환 권고

**ID 체계**: OPS-{코드}-### / MAIL-{MMDD}

---

### 7. Master 스킬 (5개) — 워크플로우 일괄 실행

`/plan`, `/design`, `/publish`, `/qa`, `/deploy` — 각각 해당 카테고리 orchestrator를 호출하여 일괄 실행.

> **마스터 vs 오케스트레이터 관계**: `/plan` 등 마스터 스킬은 SKILL.md에서 직접 planning-orchestrator를 호출함 (Skill() → Agent()). 사용자는 마스터 스킬을 호출하면 자동으로 오케스트레이터 워크플로우가 실행된다.

---

### 8. Utility (유틸리티) — 2개 (독립)

| 스킬 | 설명 |
|------|------|
| `playground` | 인터랙티브 HTML 플레이그라운드 (6템플릿) |
| `frontend-slides` (외부) | 애니메이션 HTML 프레젠테이션 (PPT 변환) |

> 2026-05-12: ~~claude-wireframe~~ 폐기 → plan-sb로 자원 흡수. 5종 UX 옵션 탐색은 plan-sb Mode A `--explore` 플래그 또는 design-layout의 `ux-philosophies.md` 참조.

---

## Rules (22개) — On-Demand 매핑

> 상시 로드 금지. `lib/rules/INDEX.md` 매핑 테이블 기준 트리거 발생 시에만 명시 Read.
> 상세 매핑 (트리거·범주): `lib/rules/INDEX.md` 참조 (20행 매핑 + 메타 2건)

| 카테고리 | rules | 개수 |
|---------|------|:---:|
| 품질 | quality, anti-rationalization, artifact-scope, traceability | 4 |
| 파이프라인 | pipeline, pm-direction, ccd-autogate, handoff-schema, change-mgmt | 5 |
| 환경/도구 | environment, cli-internalization, claude-api-usage, compaction, context-engineering | 5 |
| 외부 통합 | figma-sync, figma-fidelity, modern-design-stack, publish-patterns, dkb-policy, vercel-wig | 6 |
| 메타 | INDEX, PROTECTED | 2 |

## Commands (9개) — 슬래시 진입

| 커맨드 | 용도 | 호출 빈도 (사내 사용) |
|--------|------|:---:|
| `/status` | 진행 현황 | 매우 활발 |
| `/run` | 전체 파이프라인 | 매우 활발 |
| `/maintenance` | 유지운영 | 활발 |
| `/qa-run` | QA 일괄 | 활발 |
| `/doctor` | 시스템 자가 진단 | 보통 |
| `/figma-pull` / `/figma-push` | Figma 동기화 | 가끔 |
| `/curate-theme` | 테마 큐레이션 | 가끔 |
| `/dkb-feedback` | DKB Reject 피드백 로그 조회/통계 (2026-05-04) | 가끔 |

---

## Ref (9개) — 명시 참조 (자동 로드 안 됨)

| ref | 용도 |
|-----|------|
| `DESIGN_PRINCIPLES.md` | 디자인 원칙 |
| `ref-design-policy.md` | 디자인 정책 |
| `design-taste.md` | Anti-Slop 패턴 / 디자인 감각 가이드 |
| `cron-patterns.md` | cron 표현식 패턴 |
| `opus-4-7-followup-recommendations.md` | 4.7 후속 권고안 (2026-04-17) |
| `visual-verification-architecture.md` | publish-visual-verify Iron Rules 5축 검증 |
| `anthropic-frontend-design.md` | Tone Commit Gate / Default House Style 회피 |
| `PROJECT-md-template.md` | 프로젝트 PROJECT.md 초기화 (pm-router Phase 1) |
| `serena-mcp-review.md` | Serena MCP 도입 검토 (Watch List) |

---

## 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-12 | 6 패키지 초판 (IA 독립) |
| v1.1 | 2026-02-18 | IA → Planning 통합, 핸드오프 체인 문서화 |
| v1.2 | 2026-02-19 | DK 강화 (6업종 가이드), 배포 인프라 (standards.md, install.bat) |
| v1.3 | 2026-02-20 | PM Devil's Advocate Layer (5대 챌린지 + PM-BLOCK/WARN/OK) |
| v1.4 | 2026-02-24 | CDD 개선 (업종별 프리셋 5종, 비주얼 리그레션 TC-V-###) |
| v1.5 | 2026-02-25 | OPS 패키지 (maintenance-orchestrator + 4스킬) |
| v1.6 | 2026-03-03 | AX Planning 벤치마킹 (SOW/리스크/공수보정) |
| v1.7 | 2026-03-18 | 생태계 전수 점검 + 단위 배포 설계 구현 |
| v1.8 | 2026-04-17 | Opus 4.7 대응 + 보강 종합: ① 8 에이전트 / 41 스킬 / 15 rules로 수치 갱신 ② 신규 스킬 통합 (design-bench-scrape/design-image/qa-lighthouse/claude-wireframe 진입점 4건) ③ 신규 rule (environment.md) 등재 ④ "권장 CLI/MCP 도구" 17개 SKILL.md 공통 섹션 명시 ⑤ qa-functional 실행 모드(정적/브라우저) + check-images.js 자동 호출 ⑥ figma-sync.md DTCG 2025.10 확장 ⑦ Dev 패키지 정식 등재 (4 스킬, 사내 개발자용) ⑧ 마스터 스킬 vs 오케스트레이터 관계 명확화 ⑨ Master/Utility 섹션 분리 ⑩ Commands/Ref 섹션 신설 |
| **v1.9** | **2026-04-24** | **방법론 편입 (외부 리서치 → 전역 자산 반영)**: ① SSoT 시드 3단 패턴 (Sakana AI "String Seed of Thought"): plan-persona 1.5단계 신설 + Self-Check 7항목 (PASS 10/10), plan-premortem 0.5단계 신설 + Self-Check 6항목 (PASS 9/9) ② lib/rules/anti-rationalization.md 각주 추가: "LLM 분포 편향의 구조적 원인" — 전형값 수렴 대응 원칙 명문화 ③ ref/DESIGN_PRINCIPLES.md §0 신설: "왜 우리는 Structure를 유지하는가" — Manus AI autonomy-first 노선 대비 우리 5원칙(재현성·검증·축적·국소화·편향차단) 명시 ④ 외부 모델/서비스 도입은 배제, 방법론만 추출해 스킬·룰·ref에 편입 (사용자 2026-04-24 지시) |
| **v2.0** | **2026-05-12** | **claude-wireframe 흡수 + 디자인 그룹핑 정리**: ① claude-wireframe(외부 plugin) 폐기 → `_archived/claude-wireframe/` 이동 ② 자원 흡수: 22종 UX 철학 + Optimization Goal Lens + Quality Checks + Anti-Patterns → `skills/plan-sb/references/ux-philosophies.md` ③ 5종 옵션 탐색 패턴 → plan-sb Step 1.3 (Mode A `--explore` 플래그, 기본 OFF) ④ design-layout SKILL.md에 cross-reference 추가 (SB는 흡수·자체 보유 / 디자인은 참조 호출) ⑤ pm-router claude-wireframe 라우팅 제거, design-orchestrator 외부 plugin 통합 라인 제거 ⑥ 유틸리티 3개→2개, 디렉토리 42→41 |
