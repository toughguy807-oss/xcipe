---
name: ELUO SYS 아키텍처 설계
description: 온프레미스 AI 에이전시 통합 플랫폼 (Hub) 전체 아키텍처. 2026-03-19 설계 완료.
type: reference
---

# ELUO SYS — 온프레미스 AI 에이전시 플랫폼

## 핵심 컨셉
- Notion + Slack + Jira + Google Drive를 하나의 로컬 서버로 대체
- Claude Code(DEV) + Claude API(PRD) 이중 환경
- 외부 의존: Claude API 1건만. 나머지 전부 온프레미스
- 월 비용: Claude Code $20 + API ~$0.50

## 기술 스택
- Node.js + Express (서버)
- SQLite WAL 모드 (DB)
- MCP 서버 (Claude Code 연결)
- HTTP 서버 (브라우저 대시보드)
- 포트: 3747

## Phase 1 범위 (19개 영역)
1. 업무 자동화 (기존 5패키지 34스킬)
2. 프로젝트 관리
3. 태스크 관리
4. 산출물 관리 (파일 서버, 버전, 미리보기)
5. 소통 (알림, 메시지)
6. 지식 (프로젝트 + 사내)
7. 대시보드
8. 권한 (7단계 역할)
9. 보안 (인증, 세션, 토큰)
10. 감사 로그
11. 백업/복구
12. 템플릿 (프로젝트 유형별)
13. 에러 대응
14. DEV/PRD 환경
15. Git Hook
16. 리포팅 (주간/월간)
17. API (외부 연동)
18. 마이그레이션
19. 칸반 (구축+운영 모두)

## SQLite 테이블 (Phase 1)
projects, pipeline_runs, tasks, files, knowledge,
notifications, messages, users, audit_log,
knowledge_docs, knowledge_embeddings,
project_channels, channel_messages, execution_queue,
skill_health, tickets, ticket_comments, comments

## Hub 스킬 11개
hub-status, hub-today, hub-dashboard, hub-record,
hub-sync, hub-request, hub-config, hub-notify,
hub-files, hub-knowledge, hub-skills

## 대시보드 구조
좌측: 내 할 일 / 프로젝트 목록 / 지식 검색 / 설정
우측: 프로젝트 뷰
  [개요] [파이프라인] [칸반] [산출물] [채널] [설정]

## 핵심 아키텍처 원칙
1. 파일(JSON)이 에이전트 간 유일한 인터페이스
2. 각 스킬은 격리 컨텍스트(Agent 도구)로 실행
3. 생산 에이전트 ≠ 검토 에이전트 (편향 방지)
4. 사람이 판단, AI가 실행
5. 대화는 휘발, 데이터는 영속 (JSON/DB)
6. 채널 = 표시, 실행 = 격리 (혼재 방지)
7. 모델 자동 라우팅 (opus→sonnet→haiku 에스컬레이션)

## 실행 파이프라인
1. Planning: QST → REQ → FN → IA → WBS → SB
2. Design: Benchmark → Knowledge → Layout → UI
3. Publish: Markup → Style → Interaction
4. QA: Functional → Accessibility → Performance
5. 개발: FN.json → 칸반 티켓 → 서버 코드
6. SB 배포: install.sh, 패키지 구조, Git repo

## 구현 로드맵
Week 1: Planning 전체 (QST~SB) + 프로젝트 셋업
Week 2: Design + Publish (대시보드 UI)
Week 3: 개발 (서버 + MCP + API)
Week 4: QA + 안정화 + SB 배포
