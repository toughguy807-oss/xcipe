# ELUO SYS v4.0 — Distribution Strategy

## 1. 배포 모델: Open-Core

무료 공개(Public)로 사용자 기반을 확보하고, 프리미엄(Premium) 번들로 수익화한다.

### Public (GitHub, MIT License)

| 패키지 | 포함 스킬 | 가치 제안 |
|--------|----------|----------|
| **Planning Starter** | plan-qst, plan-req, plan-fn | 기획 산출물 자동 생성 (QST→REQ→FN) |
| **Design Starter** | design-benchmark, design-knowledge | 벤치마킹 + 스타일 가이드 |
| **QA Starter** | qa-functional, qa-accessibility | 테스트 케이스 + 접근성 검증 |
| **Core Infra** | reviewer, rules/ (5개), commands/ | 품질 게이트 + 추적성 |

### Premium (Gumroad, 유료)

| 번들 | 포함 스킬 | 가격대 |
|------|----------|-------|
| **Planning Pro** | planning-orchestrator + plan-ia, plan-wbs, plan-dashboard, 선택적 스킬 7개 | $49 |
| **Design Pro** | design-layout, design-ui + design-orchestrator | $39 |
| **Publish Suite** | publish-markup, publish-style, publish-interaction + publish-orchestrator | $49 |
| **QA Pro** | qa-performance, qa-security, qa-debug + qa-orchestrator | $39 |
| **Full Pipeline** | 위 전체 + maintenance-orchestrator, pm-router, ops-setup | $149 |

## 2. 배포 채널

### 1차: GitHub + Gumroad (즉시)

```
GitHub Repository (Public)
├── skills/           ← Public 스킬만
├── rules/            ← 전체 공개
├── commands/         ← 전체 공개
├── agents/reviewer.md
├── install.sh        ← 자동 설치 스크립트
└── README.md

Gumroad (Premium)
├── eluo-planning-pro.zip
├── eluo-design-pro.zip
├── eluo-publish-suite.zip
├── eluo-qa-pro.zip
└── eluo-full-pipeline.zip
```

### 2차: Claude Plugin Marketplace (대기)

- `.claude-plugin/plugin.json` 형식 배포
- 개인 배포 경로 확인 후 진행
- rules/ 디렉토리 대안 필요 (Plugin에 rules/ 전용 경로 없음)

### 3차: agentskills.io (브랜딩)

- SKILL.md 오픈 표준 호환 (Codex/Gemini CLI/Cursor 지원)
- 디렉토리 등록으로 검색 노출

### 4차: SkillKit / CCPI (마켓플레이스)

- SkillKit: 40만+ 스킬 마켓. `npx skills add eluo-planning-pro` 형식
- CCPI: Claude Code Plugin Index. JSON 카탈로그 기반 패키지 매니저
- SKILL.md 포맷 호환 → 별도 변환 불필요

### 5차: Routines 기반 SaaS (서버리스)

- 로컬 설치 없이 Anthropic 클라우드에서 파이프라인 실행
- 사용자는 웹 UI에서 프로젝트 생성 → Routines API trigger → 산출물 수신
- **설치형 → SaaS 전환의 핵심 경로**

### 폐기 채널

| 채널 | 사유 |
|------|------|
| n8n 서드파티 | 워크플로 형식 불일치 |
| MindStudio | 에이전트 앱 형식 불일치 |
| Claude Marketplace | 엔터프라이즈 전용 |

## 3. GitHub 리포지토리 구조

```
eluo-sys/
├── .github/
│   └── workflows/
│       └── claude.yml         ← @claude 멘션 CI/CD
├── skills/
│   ├── plan-qst/SKILL.md
│   ├── plan-req/SKILL.md
│   ├── plan-fn/SKILL.md
│   ├── design-benchmark/SKILL.md
│   ├── design-knowledge/SKILL.md
│   ├── qa-functional/SKILL.md
│   └── qa-accessibility/SKILL.md
├── rules/
│   ├── quality.md
│   ├── traceability.md
│   ├── pipeline.md
│   ├── anti-rationalization.md
│   └── change-mgmt.md
├── commands/
│   ├── qst.md
│   ├── req.md
│   └── fn.md
├── agents/
│   └── reviewer.md
├── install.sh
├── install.bat
└── README.md
```

## 4. 설치 방법

### Quick Start (Public)

```bash
# Unix/Mac
curl -sSL https://raw.githubusercontent.com/eluo-dev/eluo-sys/main/install.sh | bash

# Windows
powershell -c "irm https://raw.githubusercontent.com/eluo-dev/eluo-sys/main/install.bat | iex"
```

설치 스크립트가 수행하는 작업:
1. `~/.claude/skills/` 에 Public 스킬 복사
2. `~/.claude/rules/` 에 품질 규칙 복사
3. `~/.claude/commands/` 에 슬래시 커맨드 복사
4. `~/.claude/agents/reviewer.md` 복사
5. **`npm i -g agnix` 설치 + `agnix ~/.claude/ --fix-safe` 자동 린팅**
6. **린팅 결과 리포트 출력 (오류/경고/정보 분류)**

### Premium 설치

Gumroad 구매 후 ZIP 다운로드 → 압축 해제 → `~/.claude/` 하위에 병합.

```bash
unzip eluo-full-pipeline.zip -d ~/.claude/
```

## 5. Gumroad 번들 패키징

### 번들 구성 원칙

- 각 번들은 독립 실행 가능 (Public 스킬 의존 시 함께 포함)
- SKILL.md + checklist.md + 관련 에이전트를 하나의 ZIP으로
- 버전 태그: `v4.0.0` (semver)
- 라이선스: 구매자 1인 사용, 재배포 금지

### 번들별 파일 목록

**Planning Pro** (`eluo-planning-pro.zip`)
```
agents/planning-orchestrator.md
skills/plan-ia/
skills/plan-wbs/
skills/plan-dashboard/
skills/plan-competitor/
skills/plan-persona/
skills/plan-premortem/
skills/plan-swot/
skills/plan-stakeholder/
skills/plan-prioritize/
rules/ccd-autogate.md
rules/handoff-schema.md
```

**Design Pro** (`eluo-design-pro.zip`)
```
agents/design-orchestrator.md
skills/design-layout/
skills/design-ui/
```

**Publish Suite** (`eluo-publish-suite.zip`)
```
agents/publish-orchestrator.md
skills/publish-markup/
skills/publish-style/
skills/publish-interaction/
```

**QA Pro** (`eluo-qa-pro.zip`)
```
agents/qa-orchestrator.md
skills/qa-performance/
skills/qa-security/
skills/qa-debug/
```

**Full Pipeline** (`eluo-full-pipeline.zip`)
```
agents/                    ← 전체 (8개)
skills/                    ← 전체 (41개)
rules/                     ← 전체 (9개)
commands/                  ← 전체
hooks/                     ← session-start 등
tools/                     ← VeriMAP 검증 스크립트
settings-template.json     ← 권장 설정 템플릿
profiles/                  ← 역할별 프로필 프리셋 (planner/designer/publisher/qa)
```

### 동봉 인프라 도구

| 도구 | 번들 | 용도 |
|------|------|------|
| agnix | 전체 | 설치 후 린팅 검증 |
| claude-usage | Full Pipeline | 토큰/비용 대시보드 |
| claudectx 프로필 | Full Pipeline | 역할별 설정 전환 |

## 6. 경쟁사 대비 포지셔닝

| 경쟁사 | 배포 방식 | 차이점 |
|--------|----------|--------|
| BMAD | npx + Plugin | 범용 에이전트, 산업 특화 없음 |
| superpowers | Plugin | 개발자 도구 중심 |
| gstack | Git Clone | 프롬프트 컬렉션, 파이프라인 없음 |
| claude-code-spec-workflow | Git Clone | REQ→Design→Tasks만. 추적성 없음 |
| CCPM | Git Clone | GitHub Issues 기반 PM. 기획 산출물 없음 |
| Devin | SaaS ($500/월) | 코딩 에이전트. 기획 파이프라인 없음 |
| bolt.new / v0 | SaaS | 프로토타이핑 전용. 기획 산출물 없음 |
| **Anthropic Design Tool** | **SaaS (내장)** | **자연어→웹사이트/프레젠테이션 원클릭. 라이브 프리뷰 + 원클릭 배포. Opus 4.7 기반. 빌더형 — 프로세스/추적성 없음** |
| Gamma | SaaS | 프레젠테이션 특화. 웹사이트 기능 제한적 |
| Google Stitch | SaaS | 프로토타이핑 중심. 기획 연계 없음 |
| **ELUO SYS** | **GitHub + Gumroad + SaaS(로드맵)** | **디지털 에이전시 특화, E2E 14단계 파이프라인, 추적성 + VeriMAP + 비용 모니터링** |

> **포지셔닝**: Anthropic Design Tool/bolt.new/v0 = **"빌더"** (프롬프트→결과물 직행). ELUO SYS = **"프로세스"** (QST→REQ→FN→IA→WBS→디자인→퍼블→QA, 추적성 + 품질 게이트). 빌더는 1회성 산출물, 프로세스는 반복 가능한 에이전시 워크플로우. 타겟이 다르다.
>
> **경쟁 대응**: 빌더형 도구의 강점(라이브 프리뷰, 원클릭 배포)은 우리 파이프라인의 publish 단계에 흡수해야 한다. 추적성 + 품질 게이트는 빌더에 없는 우리만의 차별점.

## 7. 로드맵

| 시점 | 마일스톤 |
|------|---------|
| v4.0 (현재) | GitHub Public 배포 + Gumroad 4개 번들 |
| v4.1 | Claude Plugin Marketplace 등록 + agnix 린팅 통합 + claude-usage 동봉 |
| v4.2 | `npx @eluo/sys init` 패키지화 + SkillKit/CCPI 마켓 등록 |
| v4.3 | VeriMAP 코드 검증 (tools/verify-*) + Advisor Strategy (모델 자동 배정) |
| v4.4 | Routines Provider + GitHub 이벤트 트리거 |
| v5.0 | **SaaS 전환** — 로컬 설치 없이 Routines 기반 서버리스 파이프라인. 웹 UI만으로 기획→QA 실행 |
