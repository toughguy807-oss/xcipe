# 기획 자동화 시스템 기본값 (2026-05-11 갱신)

**6개 패키지 · 8개 에이전트 · 39개 스킬(Dev 4 미구현) · 23개 rules (on-demand) · 9개 commands · 9개 ref**로 구성된 웹사이트 기획→디자인→퍼블리싱→개발→QA→운영 자동화 시스템.

> Opus 4.7 GA (2026-04-16) 기반. 상세 구성은 `AGENTS.md`, 스킬 카탈로그는 `SKILLS_CATALOG.md` 참조.
> **2026-05-04 motionsites.ai 리서치 도입**: design-knowledge 토큰 7→**8대(Motion DNA 추가)**, dkb에 **Section Packs** 차원 신설 (`~/.claude/dkb/section-packs/`), publish-interaction **CSS-Native 1순위** 정책 강제. 상세는 `lib/rules/modern-design-stack.md` §8·§9 + `lib/rules/dkb-policy.md` §7.

## 폴더 구조
```
~/.claude/                    ← 전역 (모든 프로젝트 공통)
├── CLAUDE.md                 ← 이 파일 (핵심 설정만)
├── AGENTS.md                 ← 에이전트 시스템 v1.8 정의
├── SKILLS_CATALOG.md         ← 스킬 프로세스 단위 카탈로그 (구현 38개 + Dev 미구현 4개)
├── settings.json             ← env (xhigh, 75%), permissions, hooks
├── lib/rules/                ← 토픽별 규칙 (on-demand, 22개) — INDEX.md/PROTECTED.md 포함, 매핑 테이블 기준 Read 호출
├── agents/                   ← 서브에이전트 8개 (orchestrator 5 + pm-router + reviewer + sb-wf-design)
├── skills/                   ← 스킬 38개 (Dev 4종 미구현 — AGENTS.md/SKILLS_CATALOG.md만 등재)
├── commands/                 ← 슬래시 커맨드 9개 (status/run/maintenance/qa-run/doctor/figma-pull/figma-push/curate-theme/dkb-feedback)
├── ref/                      ← 참조 문서 8개 (명시 호출만)
├── dkb/                      ← Design Knowledge Base
│   ├── references/           ← 페이지 단위 사이트 DNA (tier-1/2/3)
│   └── section-packs/        ← 섹션 단위 미니 프롬프트팩 (2026-05-04 신설 — hero/feature/pricing/footer/nav/testimonial)
└── tests/baseline/           ← 회귀 탐지 자산 (2026-04-17 신규)

{프로젝트}/
├── PROJECT.md                ← 프로젝트 정보
├── input/                    ← 참고 자료
├── output/                   ← 산출물 (자동 생성)
└── .claude/CLAUDE.md         ← 파이프라인, 선택 단계
```

## Rules On-Demand 매핑

> **원칙**: 모든 rules/*.md는 **상시 로드 금지**. 룰 필요 시 → `Read lib/rules/INDEX.md`로 22개 룰 트리거 매핑 조회 → 해당 룰만 Read. 선제 전수 Read 금지.
> **이유**: Opus 4.7 한글 1.35× + 매 턴 system-reminder 재주입 부하 차단. CLAUDE.md 60줄 권고 (Anthropic 공식 + alexop.dev) 준수.

매핑 테이블 전체: `lib/rules/INDEX.md` (22개 룰 + 트리거 + Protected Rules 참조)

## Commands (9개 — 슬래시 진입점)

| 커맨드 | 용도 |
|--------|------|
| `/status` | 프로젝트 진행 현황 |
| `/run` | 전체 파이프라인 실행 |
| `/maintenance` | 유지운영 관리 |
| `/qa-run` | QA Generator |
| `/doctor` | 시스템 자가 진단 |
| `/figma-pull` / `/figma-push` | Figma 동기화 |
| `/curate-theme` | 테마 큐레이션 |
| `/dkb-feedback` | DKB Reject 피드백 로그 조회/통계 (2026-05-04 추가) |

> **commands/ vs skills/ 차이**:
> - `commands/`: 사용자가 직접 입력하는 슬래시 커맨드 (진입점)
> - `skills/`: 자동 호출되는 에이전트 스킬 (pm-router가 라우팅 또는 키워드 자동 감지)
> - 스킬은 description 기반 자동 매칭, 커맨드는 명시적 슬래시 입력

## 파이프라인 (6단계)

```
Planning → Design → Publish → Dev → QA → [Deploy]
   │          │         │      │      │
   └── _handoff.md ──→ ──→ ──→ ──→ 최종 리포트
```

- **Planning** (8 스킬 구현): 기획 — QST/REQ/FN/IA/WBS/SB/Dashboard/Persona
- **Design** (10 스킬 구현 = 디자인 7 + DKB 3): 디자인 — Benchmark/~~bench-scrape~~(2026-05-18 dkb-analyze 흡수, stub 2026-07-15까지)/Knowledge/image/Layout/UI/Replicate + DKB(search/analyze+`interaction_archetype`/curate). claude-wireframe은 2026-05-12 폐기 (plan-sb 흡수 — `skills/plan-sb/references/ux-philosophies.md` + Step 1.3)
- **Publish** (4 스킬 구현): 퍼블리싱 — Markup/Style/Interaction/Visual-Verify
- **Dev** (4 스킬 미구현): 개발 — Spec/Component/API/Test (사내 개발자용, AGENTS.md 등재만)
- **QA** (6 스킬 구현): 검증 — Functional/Accessibility/Performance/Lighthouse/Security/Debug
- **Ops** (3 스킬 구현): 유지운영 — Setup/Intake/Notion-ticket

## CLI/MCP 도구 종속 (17 SKILL.md 공통 섹션)

각 SKILL.md 상단에 "**권장 CLI/MCP 도구**" 테이블 존재. 단계/도구/명령/용도/필수여부 5컬럼. 팀 배포 시 환경 세팅 가이드 자동 파악 가능.

**주요 외부 런타임**:
- **Playwright**: plan-sb, design-benchmark, qa-* 대부분, dev-test (`npx playwright install chromium`)
- **Lighthouse**: qa-lighthouse, qa-performance (`npm i -g lighthouse`)
- **Gemini API**: design-image (`GEMINI_API_KEY`)
- **Figma MCP**: design (`FIGMA_ACCESS_TOKEN`)
- **curl**: dkb-analyze (2026-05-18 bench-scrape 흡수), publish-markup (OG 메타), design-image
- ~~**Notion API**~~: 분기 D⁺ 폐기 (2026-05-07) — `internal-ticket` + `ops-deploy`로 흡수. `NOTION_API_KEY`는 `ops-setup` Phase 6 레거시 호환 시에만

## 마스터 스킬 vs 오케스트레이터

- `/plan`, `/design`, `/publish`, `/qa`, `/deploy` → **마스터 스킬** (skills/plan/SKILL.md 등)
- 마스터 스킬은 내부에서 해당 orchestrator 호출 (`Skill() → Agent()`)
- 사용자는 `/plan` 입력 시 자동으로 planning-orchestrator 워크플로우 실행
- 개별 스킬 호출 시 orchestrator 없이 단독 실행도 가능

## Ref (9개 — 명시 호출만)

| 파일 | 언제 호출 |
|------|----------|
| `ref/DESIGN_PRINCIPLES.md` | 디자인 원칙 필요 시 (design-orchestrator Step 0) |
| `ref/ref-design-policy.md` | 디자인 정책 결정 시 |
| `ref/design-taste.md` | Anti-Slop 패턴 필요 시 |
| `ref/cron-patterns.md` | cron 표현식 작성 시 |
| `ref/opus-4-7-followup-recommendations.md` | 4.7 후속 권고안 (2026-04-17) |
| `ref/visual-verification-architecture.md` | publish-visual-verify 실행 시, Iron Rules 5축 검증 직전 |
| `ref/anthropic-frontend-design.md` | Tone Commit Gate / Default House Style 회피 룰 |
| `ref/PROJECT-md-template.md` | 프로젝트 PROJECT.md 초기화 시 (pm-router Phase 1) |
| `ref/serena-mcp-review.md` | Serena MCP 도입 검토 (Watch List, 트리거: src/engine/ 50+ 또는 첫 cross-file rename) |

## 비활성화 플러그인 관리
- **Atlassian** 비활성화 (토큰 절약), **Figma** 활성화
- 비활성화 기능 요청 시: 안내 → 확인 → settings.json 변경 → 재시작 안내

## 기술적 제약 (v2.1.33+)
- Skills SKILL.md: 자동완성 미작동 → `commands/` 사용
- 슬래시 커맨드: `~/.claude/commands/*.md`만 인식
- Windows Git Bash: `grep -P` 미지원 → `-E` 사용 (lib/rules/environment.md 참조)
- 프로젝트 메모리: `~/.claude/projects/{경로}/memory/` (프로젝트 간 공유 안 됨)
- Opus 4.7 토크나이저: 한글 1.35x → 컴팩션 75% 트리거 + effort xhigh (55% 시 reasoning thread 소실 잦아 2026-04-21 상향)

## Opus 4.7 (2026-04-16 GA) 주요 변화
- **문자적 지시 따르기** 강화 — "전부/모든" 일반화 안 함 (구체적 열거 필요)
- **도구 호출 감소** — effort xhigh로 보완
- **서브에이전트 감소** — 명시적 Skill() 호출로 대응
- **adaptive thinking 기본 OFF** — 필요 시 명시 호출
- **토크나이저 변경** — 한글 1.35x 토큰 증가

## 배포 원칙 (사내 배포)
- **마스터 repo**: `D:/eluo-hub_v4/` (Git: github.com/eluoaxjun/eluohub.git)
- **배포 단위**: 현재 plan-* 6개 단위 패키지 (각자 `.claude/` 자체 보유)
- **플러그인 관련 모든 변경 시 Git 배포 필수**: skills, agents, rules, AGENTS.md, README 등 예외 없음
- **병렬 세션 충돌 방지**: Git을 Single Source of Truth로 사용

## 참조

- `AGENTS.md` — 에이전트 시스템 상세 (v1.8)
- `SKILLS_CATALOG.md` — 41 스킬 프로세스 단위 카탈로그
- `D:/claude-backup/ref-old/` — 구식 ref-*.md (2026-02-09 작성, 2026-04-17 이동)
