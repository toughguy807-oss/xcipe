# ELUO SYS v4.0 벤치마킹 종합 보고서
> 작성일: 2026-03-23 | 분석 대상: 20개 레포/글 + Reddit 2트랙 + 현행 보완점

## 분석 완료 목록

| # | 대상 | 유형 | 핵심 가치 |
|---|------|------|----------|
| 1 | gstack (Garry Tan) | 스킬팩 | 역할 페르소나, 3-tier 테스트, 브라우저 데몬 |
| 2 | browser-use | 브라우저 자동화 | (분석 미완료) |
| 3 | Claude-Code-Game-Studios | 프레임워크 | 48 에이전트, 팀 오케스트레이션, gate-check |
| 4 | claude-peers-mcp | MCP 서버 | 브로커 패턴, 피어 디스커버리, channel 인터럽트 |
| 5 | agency-agents | 프롬프트 라이브러리 | NEXUS 7-Phase, 핸드오프 템플릿, Dev-QA 루프, 런북 |
| 6 | awesome-claude-skills | 카탈로그 | 배포 패턴 3종, .claude-plugin/ 표준 |
| 7 | clawflows | 워크플로 관리 | symlink 활성화, doctor, 단일 HTML 대시보드 |
| 8 | superpowers (105K stars) | 스킬 프레임워크 | CSO, anti-rationalization, 서브에이전트 상태 코드, Pressure Test |
| 9 | feature-dev (Anthropic 공식) | 플러그인 | 7-Phase, code-explorer/architect/reviewer 3종 서브에이전트 |
| 10 | LSP 플러그인 | 코드 인텔리전스 | 22개 언어, 참조 검색, 진단 게이트 |
| 11 | Stitch MCP+SDK | 디자인→코드 | generate→edit→variants→getHtml, 무료 |
| 12 | afterworkai | 입문 가이드 | 셋업 가이드 1장→프로젝트 자동 생성, skillsmp.com |
| 13 | dgk-claude | 실전 셋업 | 토큰 절약 훅, bash-guard, HANDOFF.md, GLM 무료 리뷰 |
| 14 | Awesome MCP 한국어 가이드 | MCP 카탈로그 | 2,596개 서버, 32개 카테고리, TOP 10 선정 |
| 15 | gitdiagram | 시각화 | 코드→Mermaid 다이어그램, 자동 검증+복구 루프 |
| 16 | erp (cptkuk91) | ERP | 8개 도메인, Snapshot 패턴, RBAC, 예산 추적 |
| 17 | BMAD-METHOD (41K stars) | 프레임워크 | 9 에이전트, 35+ 워크플로, Step 분할, module-help.csv |
| 18 | Karpathy autoresearch | 자율 실험 | 수정→실행→평가→유지/롤백 루프, 하룻밤 100건 |
| 19 | Fraggell (Obsidian+Claude+MCP) | 사례 | 오후 만에 15명 회사 운영 절반 자동화 |
| 20 | Thariq/Anthropic | 인사이트 | 스킬에 Gotchas 섹션 필수 |

## ELUO SYS만의 경쟁 우위 (18개 레포 어디에도 없음)

1. **FR→FN→UI→TC 추적 체인** — orphan 0건 목표
2. **4도메인 통합 reviewer** — 기획/디자인/퍼블리싱/QA 교차 검수
3. **PM Devil's Advocate** — DA1(범위)/DA2(우선순위)/DA3(가정) 3축 챌린지
4. **_handoff.md + META 블록** — 구조화된 스킬 간 데이터 전달
5. **웹 에이전시 전용 파이프라인** — Planning→Design→Publish→QA 고정 순서
6. **3회 이터레이션 + 에스컬레이션** — 모든 오케스트레이터에 구현

## P1 보완점 (즉시 구현)

1. **Anti-rationalization 패턴** — rules/ 신규
2. **세션 상태 자동 복구** — output/ 스캔→중단점 파악→이어서 진행
3. **session-start 훅** — MEMORY.md + output/ 스캔 자동 로드
4. **eluo doctor** — 시스템 정합성 자가 진단

## P2 보완점 (다음 이터레이션)

5. 스킬별 Gotchas 섹션
6. 서브에이전트 상태 NEEDS_CONTEXT 추가
7. Sprint 모드 (축약 파이프라인)
8. 시나리오 런북 4종
9. 위험 명령 차단 확장
10. 토큰 절약 훅
11. catalog.json 카탈로그

## v4.0 재설계 방향 (확정 대기)

### 컨셉 전환
```
v3.0: "서버를 만들어서 Notion+Slack+Jira를 대체한다"
v4.0: "스킬팩을 배포해서 Claude Code를 웹 에이전시로 변환한다"
```

### 4 Layer 아키텍처
```
Layer 4: Dashboard (선택) — MCP 서버 + 단일 HTML
Layer 3: Hub (경량 브로커) — SQLite 2~3테이블 + localhost HTTP
Layer 2: Orchestration — 7 오케스트레이터 + Dev-QA 루프 + 3 모드(Full/Sprint/Micro)
Layer 1: Skill Pack (핵심) — 34+ 스킬 + Gotchas + anti-rationalization
```

### 디자인 파이프라인 변경
```
기존: benchmark → knowledge → layout → ui → markup → style → interaction
변경: benchmark → knowledge → layout → [Stitch] → style → interaction
                                        ↑ design-ui + publish-markup 대체
```

### MCP 통합 우선순위
1. Playwright (이미 활성화)
2. Figma (이미 활성화)
3. Stitch (신규)
4. Firecrawl (벤치마킹 크롤링)
5. Context7 (이미 설치)

### 시장 데이터
- 95% 개발자 주간 AI 도구 사용
- 75% 업무 절반 이상 AI 의존
- Claude Code 플러그인 9,000+개
- 비즈니스 자동화 90% 달성 사례
- 소규모 팀 3~5배 생산성 증폭 일관 보고
