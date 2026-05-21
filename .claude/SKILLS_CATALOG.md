# 전역 스킬 카탈로그 (구현 38개 + Dev 미구현 4개 + 외부 plugin 2개)

> 업무 프로세스 단위 정리. **2026-05-06 갱신** (DKB 3종 + design-replicate + publish-visual-verify 등재 / Dev 4종 미구현 명시).

## 프로세스 흐름

```
[진입]
  pm-router (요청 분류 → 오케스트레이터 라우팅)
      ↓
┌─────────────────────────────────────────────────────────┐
│                  업무 파이프라인 (6단계)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  기획 → 디자인 → 퍼블리싱 → 개발 → QA → [배포]             │
│                                                           │
└─────────────────────────────────────────────────────────┘
      ↓
  [운영] 유지운영 / 모니터링
```

## 🧪 공통 구조 (17개 SKILL.md 적용)

각 스킬은 **"권장 CLI/MCP 도구"** 공통 섹션 보유 (2026-04 보강):
- 단계 / 도구 / 명령 / 용도 / 필수여부 (5컬럼)
- 팀 배포 시 환경 세팅 가이드 자동 파악
- 외부 런타임 명시: Playwright, Lighthouse, Gemini API, Figma MCP, curl
  - 분기 D⁺(2026-05-07) Notion API 폐기 — `ops-setup` Phase 6 레거시 호환 시에만 활성화

---

## 🎯 진입/라우팅 (1개)

| 스킬 | 역할 |
|------|------|
| **pm-router** | 요청 분류 → 운영/구축/전환 판별 → 적절한 오케스트레이터 라우팅 |

---

## 🚀 마스터 스킬 (전체 워크플로우 일괄 실행) — 5개

한 명령으로 해당 단계 전체를 순차 실행하는 상위 스킬. **내부에서 해당 orchestrator 호출** (Skill() → Agent()).

| 스킬 | 실행 흐름 | 용도 |
|------|---------|------|
| **plan** | QST → REQ → FN → WBS → Dashboard | 기획 전체 |
| **design** | 벤치마킹 → [bench-scrape] → Knowledge → [image] → Layout → UI | 디자인 전체 |
| **publish** | Markup → Style → Interaction | 퍼블리싱 전체 |
| **qa** | Functional → Accessibility → Performance → [Lighthouse] → Security → Debug | QA 전체 |
| **deploy** | Dockerfile / docker-compose / CI/CD / 가이드 생성 | 배포 자산 |

---

## 📋 1. 기획 (Planning) — 10개

**작업 흐름 단계별 분류:**

### 🔍 Discovery — 발견/이해 (4개)
프로젝트 착수 전 "무엇을, 왜" 파악. 필요한 것만 선택.

| 스킬 | 역할 | 언제 |
|------|------|------|
| **plan-qst** | 고객이 원하는 것 파악 | 항상 (첫 단계) |
| **plan-persona** | 최종 사용자 이해 (JTBD/페인) | 신규 서비스, 타겟 불명확 |
| **plan-competitor** | 경쟁 환경 + 포지셔닝 기회 | 리뉴얼/신규 진입 |
| **plan-premortem** | 실패 시나리오 역산 → 위험 식별 | 복잡/고위험 프로젝트 |

### 📐 Definition — 정의/명세 (3개)
Discovery 결과를 실행 가능한 명세로 변환.

| 스킬 | 역할 | 출력 |
|------|------|------|
| **plan-req** | 무엇을 만들지 정의 | FR+NFR+BR |
| **plan-fn** | 기능이 어떻게 동작할지 | FN-### 카드 (처리/검증/복잡도) |
| **plan-ia** | 구조 조직 | 사이트맵+페이지+URL+네비 |

### 📅 Planning — 실행 준비 (2개)
명세를 실행 단위로 분해.

| 스킬 | 역할 | 출력 |
|------|------|------|
| **plan-wbs** | 일정/공수/의존성 | 간트+크리티컬 패스 |
| **plan-sb** | 화면 단위 상세 설계 | 화면설계서 HTML/PDF (Playwright 기반) |

### 📊 Monitoring — 진행 추적 (1개)

| 스킬 | 역할 |
|------|------|
| **plan-dashboard** | 산출물/KPI/이슈/마일스톤 종합 |

### 🗑️ 폐기 (2026-04-15)
- ~~plan-swot~~ — 고전 프레임워크, 산출물 품질 기여 낮음
- ~~plan-stakeholder~~ — 에이전시에 과잉, QST로 대체
- ~~plan-prioritize~~ — plan-fn의 Must/Should/Could와 중복

---

## 🎨 2. 디자인 (Design) — 10개 (디자인 7 + DKB 3)

### Discovery — 벤치마킹/리서치 (3개)

References-First 정책의 진입 단계. design-orchestrator Step 2B-1~2에서 호출.

| 스킬 | 입력 | 출력 | 외부 런타임 |
|------|------|------|-----------|
| **design-benchmark** | REQ/업종 | 경쟁사 분석, 어워드 사이트 레퍼런스 | Playwright |
| ~~**design-bench-scrape**~~ | 참조 URL | **2026-05-18 dkb-analyze 흡수** (Step 1 부수효과로 항상 실행). stub은 2026-07-15까지 | curl + node |
| **dkb-search** ★ | industry/target/priority | DKB references + section-packs 매칭 (정적 LLM 0회) | — |

### Definition — 시스템/시안 (4개)

| 스킬 | 입력 | 출력 | 외부 런타임 |
|------|------|------|-----------|
| **design-knowledge** | 벤치마킹 + 브랜드 시트 | 디자인 토큰 **8대** 카테고리 (Color/Typo/Spacing/Radius/Shadow/Transition/Icon/**Motion DNA**) | — |
| **design-layout** | STYLE + IA | 와이어프레임, 반응형 3단계 | — |
| **design-ui** | STYLE + Layout + FN | UI 명세서 (상태/인터랙션) | — |
| **design-replicate** ★ | dkb-search Top 1 reference | V1 충실 / V3 비판 대안 / V4 건설 3종 관점 시안 (모방 다양성 → 관점 다양성 전환) | — |

### Asset Generation / Management (3개)

| 스킬 | 입력 | 출력 | 외부 런타임 |
|------|------|------|-----------|
| **design-image** | visual-dna.json | AI 이미지 생성 (Gemini Nano Banana + Vision 검증) | Gemini API |
| **dkb-analyze** ★ | 사이트 URL | DKB references/section-packs 등재 (18축 채점 + DNA.md 또는 6축 + PACK.md) | — |
| **dkb-curate** ★ | DKB 자산 풀 | 헬스체크 / trending rejects / 중복 시그니처 / 시간 만료 트리아지 | — |

> ★ = DKB 인프라. design-orchestrator가 자동 호출:
> - Step 2B-2: `dkb-search` 매칭 (References-First)
> - Step 2B-2.7: `design-replicate` 시안 생성
> - Step 7: Reject 시 `dkb-search reject API` 자동 호출 (피드백 루프)
> - 매칭 0건 시 `dkb-analyze` 수동 트리거 권고

> 일반 호출:
> - design-orchestrator가 `bench-scrape`를 URL 있을 시 자동 호출
> - `image`를 사용자 요청 시 호출 (assets-manifest.json 기반 batch)

---

## 🏗️ 3. 퍼블리싱 (Publish) — 4개

| 스킬 | 입력 | 출력 | 외부 런타임 |
|------|------|------|-----------|
| **publish-markup** | UI + IA + STYLE | 시맨틱 HTML | npx html-validate, curl (OG 메타) |
| **publish-style** | STYLE + HTML | CSS (토큰화, 반응형) | — |
| **publish-interaction** | FN + HTML | JS (인터랙션, 상태 머신, CSS-Native 1순위) | — |
| **publish-visual-verify** ★ | publish 산출물 | 3 Phase 검증 (Phase 1 Grep / Phase 2 Taste 9축 / Phase 3 Playwright + Vision LLM) | Playwright + Vision LLM |

> ★ Phase 1 Grep은 publish-orchestrator Step 2 사후 게이트로 흡수 (2026-05-06 결합).
> Phase 2/3는 Step 3-final에서 호출. Ralph Loop 외부 verifier로 편입.

---

## 💻 4. 개발 (Dev) — 4개 (사내 개발자용)

> 우리(기획자)는 거의 사용 안 함. 사내 개발팀/풀스택에게 필수.

| 스킬 | 입력 | 출력 | 외부 런타임 |
|------|------|------|-----------|
| **dev-spec** | FN | 개발 명세서 (기술 스택 / ERD / API) | — |
| **dev-component** | HTML + STYLE + UI | React/Vue 컴포넌트 | npm/node |
| **dev-api** | dev-spec | 백엔드 API (Next.js/Express/Laravel/FastAPI) | npm/node |
| **dev-test** | FN + dev-spec | 테스트 코드 (Unit/Integration/E2E) | Playwright |

---

## ✅ 5. QA — 6개

### 테스트 스킬
| 스킬 | 검증 | 외부 런타임 |
|------|------|-----------|
| **qa-functional** | FN 기반 TC 생성 (정상/예외/에러 3단계) + 이미지 무결성 (check-images.js) | Playwright |
| **qa-accessibility** | WCAG 2.1 AA 4원칙 | Playwright + axe |
| **qa-performance** | Core Web Vitals + NFR 목표값 | Playwright + Lighthouse |
| **qa-lighthouse** | npx lighthouse 실측 (qa-performance + a11y 연동) | npx lighthouse |
| **qa-security** | OWASP Top 10 + 프론트/백엔드 취약점 | — |

### 보조
| 스킬 | 용도 |
|------|------|
| **qa-debug** | 4단계 근본 원인 추적 (Iron Law: 원인 없이 수정 금지) |

> qa-orchestrator가 qa-performance 실행 후 로컬 서버 감지 시 qa-lighthouse를 자동 호출.

---

## 🔧 6. 유지운영 (Ops) — 3개

| 스킬 | 용도 | 외부 런타임 |
|------|------|-----------|
| **ops-setup** | 유지운영 허브 온보딩 (internal-ticket+IMAP+프로젝트 등록). Notion은 Phase 6 레거시 | IMAP (선택) |
| **maintenance-intake** | 요청 접수 → 프로젝트 식별 → 티켓 생성 | — |
| **notion-ticket** | Notion Tasks DB CRUD (분기 D⁺ 레거시 호환 한정 — 신규 사용 X) | Notion API + curl |

---

## 🧰 유틸리티 — 3개 (비프로세스)

| 스킬 | 용도 | 비고 |
|------|------|------|
| **playground** | 인터랙티브 HTML 탐색기 (6템플릿: 디자인/데이터/컨셉맵/리뷰/Diff/코드맵) | 독립 |
| **frontend-slides** | 애니메이션 HTML 프레젠테이션 (PPT 변환 포함) | 외부 plugin |
| **compound** (2026-05-11 신설) | 세션 학습 추출 → memory/rules/anti-pattern 3종 후보 제안 (자동 쓰기 금지) | 메타 자가 진화 진입점. 사용자 명시 호출만 |

> **claude-wireframe 2026-05-12 폐기** — plan-sb로 자원 흡수 (`skills/plan-sb/references/ux-philosophies.md` + Step 1.3). 5종 옵션 탐색은 plan-sb Mode A `--explore` 플래그로 진입.

---

## 📊 수치 요약 (2026-05-11 정합 정정)

### 카운팅 정의 (Single Source of Truth)

**실제 디렉토리** = `~/.claude/skills/*/` 모두 SKILL.md 보유 = **42 디렉토리**

| 분류 | 카운트 | 비고 |
|---|:---:|---|
| 마스터 (워크플로우 진입) | 4 | plan/design/publish/qa — 각자 orchestrator 호출 (deploy는 카탈로그 등재만, SKILL.md 부재) |
| 라우터 | 1 | pm-router |
| 일반 스킬 (마스터/라우터 제외) | 37 | plan-*/design-*/dkb-*/publish-*/qa-*/운영/유틸 |
| **합계 (실제 디렉토리)** | **42** | grep `ls -d skills/*/` |

### 카탈로그 등재 vs 실제 구현

| 카테고리 | 카탈로그 등재 | 실제 SKILL.md |
|---------|:---:|:---:|
| 진입/라우팅 (pm-router) | 1 | 1 |
| 마스터 (워크플로우 5: plan/design/publish/qa/deploy) | 5 | 4 ✱ |
| 기획 (qst/req/fn/ia/wbs/sb/dashboard/persona/competitor/premortem) | 10 | 8 ✱✱ |
| 디자인 (benchmark/bench-scrape/knowledge/image/layout/ui/replicate) + DKB(search/analyze/curate) | 10 | 10 |
| 퍼블리싱 (Markup/Style/Interaction/Visual-Verify) | 4 | 4 |
| 개발 (Spec/Component/API/Test) | 4 | **0** ✱✱✱ |
| QA (Functional/A11y/Perf/Lighthouse/Security/Debug) | 6 | 6 |
| 유지운영 (auth-gate/internal-ticket/maintenance-intake/notion-ticket/ops-deploy/ops-setup) | 6 | 6 |
| 유틸리티 (playground/frontend-slides/compound) | 3 | 3 |
| **합계** | **48** | **41** |

> ✱ deploy 마스터는 카탈로그 등재만. 실제 SKILL.md 부재.
> ✱✱ plan-competitor / plan-premortem 카탈로그 등재만 (실제 SKILL.md 부재).
> ✱✱✱ Dev 4종(dev-spec/component/api/test)은 카탈로그 등재만, 실제 SKILL.md 미구현 (사내 개발자용).
> ✱✱✱✱ ~~claude-wireframe~~ 2026-05-12 폐기 (plan-sb로 자원 흡수, `_archived/claude-wireframe/`).

### CLAUDE.md / AGENTS.md "39개 스킬" 표기 의미

**"39"는 레거시 카운트**. 2026-05-12 claude-wireframe 폐기 후 실제 정합 카운트는 **41 디렉토리** (42 - 1).

다음 갱신 시 CLAUDE.md/AGENTS.md 표기를 "42 디렉토리 (마스터 4 + 라우터 1 + 일반 37)" 또는 "39 SKILL.md 구현(외부 plugin 제외)"로 명확화 권장. 본 표가 SSoT.

---

## 실행 패턴

### A. 전체 파이프라인 (구축 프로젝트)
```
pm-router → plan → design → publish → dev → qa → deploy
          ↑                                              ↓
          └── maintenance-intake (이후 운영) ────────────┘
```

### B. 빠른 프로토타입 (소규모)
```
pm-router → plan-qst → plan-fn → design → publish → qa-functional
```

### C. 디자인 전용
```
design-benchmark → dkb-analyze (2026-05-18 bench-scrape 흡수) → design-knowledge → [design-image] → design-layout → design-ui
```

### D. QA 전용
```
qa-run → qa-functional → qa-accessibility → qa-performance → [qa-lighthouse] → qa-security → qa-debug (이슈 발견 시)
```

### E. 유지운영
```
maintenance-intake → notion-ticket → (필요시) 파이프라인 재실행
```

### F. 디자인 탐색 (옵션 비교, 2026-05-12 갱신)
```
plan-sb Mode A --explore (5종 UX 옵션 wireframe[]) → 선택
    ↑ 또는 design-layout에서 ux-philosophies.md 참조 → 22종 카탈로그 적용
```
> claude-wireframe(외부 plugin)은 2026-05-12 폐기. 자원은 plan-sb로 흡수, design-layout은 cross-reference 사용.

---

## 업데이트 이력

- 2026-04-15: 카탈로그 최초 작성. 44개 스킬 프로세스 단위 분류
- 2026-04-15: plan-swot/stakeholder/prioritize 3개 폐기 → 41개. 기획을 Discovery/Definition/Planning/Monitoring 4단계로 재분류
- **2026-05-12: claude-wireframe 폐기 + plan-sb 흡수** — 5종 옵션 탐색 + 22종 UX 철학 카탈로그 자원을 `skills/plan-sb/references/ux-philosophies.md` 및 plan-sb Mode A `--explore` 플래그(Step 1.3)로 흡수. design-layout은 cross-reference 사용. 폴더는 `_archived/claude-wireframe/`로 이동.
- **2026-04-17**: **Opus 4.7 보강 종합** — ① 모든 카테고리에 외부 런타임 컬럼 추가 ② design-orchestrator 통합 4건 반영 (claude-wireframe/design-bench-scrape/design-image/qa-lighthouse) ③ qa-functional 이미지 무결성(check-images.js) 명시 ④ CLI/MCP 공통 섹션(17 SKILL.md) 공시 ⑤ Dev 섹션 "사내 개발자용" 라벨 추가 ⑥ pptx-creator "대기 자산" 섹션 분리 + frontend-slides 대안 안내 ⑦ 실행 패턴 F(디자인 탐색) 추가
