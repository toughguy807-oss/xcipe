# ELUO SYS v4.0

## 프로젝트 정보
- **프로젝트명**: ELUO SYS
- **프로젝트 코드**: ESYS
- **버전**: v4.0
- **유형**: 스킬팩 프레임워크
- **담당**: Eluo Digital Agency
- **시작일**: 2026-04-13

## 프로젝트 개요
Claude Code를 디지털 에이전시로 변환하는 스킬팩 프레임워크.
마크다운 파일(Skills + Agents + Rules + Commands)이 제품이며, Claude Code가 런타임이다.

## 아키텍처
```
Claude Code (런타임) — Opus 4.6 / Opus 4.7 (이번 주 출시 예정)
├── Commands (6개 진입점)   → /run, /status, /doctor, ...
├── Agents (8개 조율)       → planning/design/publish/qa/... orchestrator
├── Rules (9개 거버넌스)    → quality, traceability, anti-rationalization, ...
└── Skills (41개 생산)      → plan-*, design-*, publish-*, qa-*, dev-*

입출력: 파일 시스템 (output/, _context.md, META 블록)
실행 모드: 로컬 서버 (Express+SQLite) 또는 Anthropic Routines (서버리스)
```

## 폴더 구조
```
d:\SYS_v4/
├── input/                  ← 리서치 아카이브
│   ├── research/           ← 리서치 12건
│   ├── benchmark/          ← 벤치마킹 데이터
│   ├── architecture/       ← v4 아키텍처 설계
│   └── draft-v1/           ← v3 기획 초안 (참고용)
├── dist/                   ← 배포 패키지 빌드
├── test/                   ← E2E 테스트 시나리오+결과
├── tools/                  ← 자동화 스크립트 (sync, validate, catalog)
├── docs/                   ← 문서, 슬라이드
└── output/                 ← 산출물 (자동 생성)
```

## 실제 제품 위치 (단일 소스)
```
~/.claude/skills/     ← 41개 스킬 (마스터 — 개발 시 직접 편집)
~/.claude/agents/     ← 8개 에이전트
~/.claude/lib/rules/  ← 17개 규칙 (on-demand)
~/.claude/commands/   ← 8개 커맨드
~/.claude/ref/        ← 5개 참조 문서

D:/SYS_v4/.claude/    ← 번들 미러 (배포 자기완결성)
  └ scripts/bundle-claude.js 가 ~/.claude → 여기로 일방향 동기화
```

## 동기화 워크플로우

| 모드 | 명령 | 동작 |
|------|------|------|
| 개발 | `npm run dev` | `ESYS_DEV=1` — `~/.claude` 직접 참조 (drift 0) |
| 운영 | `npm start` | 번들 `D:/SYS_v4/.claude` 참조 (자기완결) |
| 동기화 | `npm run bundle:claude` | `~/.claude` → 번들 일방향 mirror |
| 미리보기 | `npm run bundle:dry` | 변경분만 출력 |
| CI 검증 | `npm run bundle:check` | drift 있으면 exit 1 |

**규칙**: 스킬·rules·ref 수정은 항상 `~/.claude/`에서. 번들 직접 편집 금지(다음 sync에서 덮어쓰임). 배포 전 `npm run bundle:claude`로 미러링하고 D:/eluo-hub_v4/ git에 커밋.

## 거버넌스 규칙 (Rules 9개)
| # | 규칙 | 역할 |
|---|------|------|
| 1 | quality.md | 산출물 품질 기준 (MECE, 두괄식, 정량적 근거) |
| 2 | traceability.md | FR→FN→UI→TC 추적 체인, orphan ID 0건 목표 |
| 3 | pipeline.md | 파이프라인 설계 원칙, Ralph Loop, 선택적 단계 |
| 4 | anti-rationalization.md | 합리화 방지 7개 Red Flag, 증거 기반 검증 |
| 5 | compaction.md | 컨텍스트 컴팩션 대응, `/compact` 선제 실행, 포커스 지정 |
| 6 | handoff-schema.md | META 블록 표준, state_version 이터레이션 추적 |
| 7 | pm-direction.md | Step 0 방향 설정, PM 의사결정 기준 |
| 8 | ccd-autogate.md | CCD 자동 게이트, Self-Check/reviewer 기반 자동 판정 |
| 9 | change-mgmt.md | 전역 변경 관리, Notion 이중 기록 |

## 경쟁 우위
1. FR→FN→UI→TC 추적 체인
2. 4도메인 통합 reviewer (sonnet 독립 검증)
3. PM Devil's Advocate + Anti-Rationalization 프로토콜
4. _handoff.md + META 블록 (state_version 이터레이션 추적)
5. 디지털 에이전시 전용 14단계 파이프라인
6. 3회 이터레이션 + 에스컬레이션 (Ralph Loop)
7. VeriMAP 코드 기반 검증 (Self-Check 자동화) — 로드맵
8. Advisor Strategy 모델 자동 배정 (비용 60-80% 절감) — 로드맵
9. Routines Provider 서버리스 실행 (설치 허들 제거) — 로드맵
10. 토큰/비용 모니터링 대시보드 — 로드맵

## 프로세스 인프라 (배포 시 동봉)
| 도구 | 용도 | 시점 |
|------|------|------|
| agnix | SKILL.md/AGENTS.md/Rules 린팅 (385규칙) | 설치 후 자동 검증 |
| claude-usage | 세션별/프로젝트별 토큰 소비 대시보드 | 운영 시 비용 가시화 |
| claudectx | 역할별 프로필 전환 (기획/디자인/퍼블/QA) | 팀 분산 운영 |
| ccflare | 멀티 계정 프록시 + 비용 쿼터 | 팀 5명+ 확장 시 |
| Rulesync | Claude Code↔Cursor/Copilot 규칙 동기화 | 멀티 도구 팀 |

## 레퍼런스
- input/architecture/ref_architecture.md — 아키텍처 설계
- input/benchmark/benchmark_summary_v4.md — 벤치마킹 종합
- v3 코드: d:\ELUO_SYS\_archived/ — 보존
