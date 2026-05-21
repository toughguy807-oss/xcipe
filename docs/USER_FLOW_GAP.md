# SYS_v4 사용자 플로우 갭 분석 (User Flow Gap Audit)

> **작성일**: 2026-04-30
> **목적**: F/G 시리즈가 운영(back-office) 보강에 치우쳐 있다는 인식에서 출발 — "사용자 입장에서 실제로 막히는 지점"을 페르소나 시나리오로 구체화하고, 코드 레벨 근거와 함께 우선순위(P0/P1/P2) 부여
> **방법**: 4 페르소나 × 단계별 행동·시스템 응답·마찰 지점 트레이스. 갭은 `U-G##`로 ID 부여하여 후속 구현 티켓에 매핑 가능

---

## 페르소나 정의

| ID | 이름 | 역할 | 컨텍스트 | 첫 진입 화면 |
|----|------|------|---------|-------------|
| **P1** | 김기획 | admin (신규) | 회사가 처음 SYS_v4 도입, 첫 셋업자 | `/login` → `/dashboard`(0 프로젝트) |
| **P2** | 박PM | member | 셋업 끝난 환경, 새 프로젝트 시작 | `/dashboard` → `/projects` |
| **P3** | 이검토 | guest | 외부 검토자, 산출물 보러 초대 받음 | `/login` (초대 토큰) |
| **P4** | 최운영 | admin | 도입 1개월차, 비용·아카이브 점검 | `/dashboard` → `/settings` |

---

## P1. 김기획 — 신규 admin 첫날

### 1-1. 가입/로그인
- **행동**: 설치 후 `localhost:3747` 진입 → `/login` 도달
- **시스템**: [login.js](../public/js/components/login.js) 기본값 `admin@eluo.kr / admin1234` 하드코딩 표시
- **결과**: 즉시 로그인 가능 ✅

### 1-2. 첫 대시보드
- **행동**: 로그인 직후 `/dashboard` 진입
- **시스템**: [dashboard.js:8](../public/js/components/dashboard.js#L8) `projects.total === 0` 분기 → `_renderOnboarding()` 3-step 환영 화면
- **결과**: "+ 새 프로젝트" 버튼 명확 ✅
- **⚠️ 마찰 [U-G1]**: 온보딩 카드는 "프로젝트 만들기"만 안내. **AI 키 설정 단계가 빠져 있음** — 이 상태로 파이프라인 시작하면 mock provider로 동작 → 실제 AI 산출물이 안 나옴. settings에서만 알 수 있음
- **⚠️ 마찰 [U-G2]**: 비밀번호 변경 유도 없음. 기본값 `admin1234`로 운영 시작할 가능성

### 1-3. AI 키 설정
- **행동**: 사이드바 "설정" 클릭 → `/settings`
- **시스템**: [settings.js:5](../public/js/components/settings.js#L5) admin 가드 통과. AI 카드 3종(mock/claude-code/claude-api) 라디오 + API key + 모델 드롭다운
- **결과**: 카드 UI는 명확 ✅
- **⚠️ 마찰 [U-G3]**: "테스트 연결" 버튼은 있으나 **현재 어떤 provider가 사실상 동작 중인지** 대시보드에 표시 안 됨. mock으로 운영 중인 채 산출물 품질 문제 디버깅하는 사고 위험
- **⚠️ 마찰 [U-G4]**: API key 마스킹 표시는 있지만 **저장 직후 자동 헬스체크 안 함**. 키 오타 시 첫 파이프라인 실패로 발견

### 1-4. 사용자 초대
- **행동**: settings 하단 "사용자 관리 → + 초대" 클릭
- **시스템**: 초대 토큰 발급 → `/invite/accept/:token` 페이지 존재
- **결과**: 초대 링크 복사·전달 가능 ✅
- **⚠️ 마찰 [U-G5]**: **이메일 발송 미구현** — admin이 링크를 직접 복사해 슬랙/메일로 보내야 함. 초대 만료(TTL) 표시 없음

---

## P2. 박PM — 새 프로젝트 시작

### 2-1. 프로젝트 생성
- **행동**: `/projects` → "+ 새 프로젝트" → 2-step 모달 (프롬프트 분석 → 폼)
- **시스템**: POST `/projects/analyze` → AI가 code/name/type/optional_skills 추론
- **결과**: 프롬프트 한 줄로 프로젝트 자동 분류 ✅
- **⚠️ 마찰 [U-G6]**: **선택 스킬 8종 체크박스가 모두 한 번에 노출** — persona/competitor/swot/premortem/stakeholder/prioritize/sb/dashboard. 신규 사용자는 차이를 모름. 각 항목 hover 설명도 없음
- **⚠️ 마찰 [U-G7]**: `completion_level 1~6` 의미 불명. 폼에 점수 의미 안내 없음

### 2-2. 파이프라인 시작
- **행동**: 프로젝트 진입 → "파이프라인 시작" 버튼
- **시스템**: [project-detail.js:55](../public/js/components/project-detail.js#L55) start-btn → POST `/pipelines`. 채팅 스레드에 메시지 스트리밍 (artifact/approval_request/status/text/error 4종)
- **결과**: 챗 UX는 직관적 ✅. 사이드패널에 단계 + 게이트 배지(AUTO/⚠/!) 표시
- **⚠️ 마찰 [U-G8]**: **프로젝트 생성 직후 자동 시작 옵션 없음** — 매번 별도 클릭. 신규 사용자는 "왜 안 돌아가지" 혼란
- **⚠️ 마찰 [U-G9]**: 폴링 2초 + tick 1초로 화면은 갱신되지만 **예상 완료 시각·남은 단계 수 표시 없음**. 30분짜리 파이프라인을 멍하니 기다리게 됨

### 2-3. HITL 게이트 도달
- **행동**: 단계 산출물 점수가 70 미만 → HITL_REQUIRED 게이트 발생, 채팅에 approval_request 메시지
- **시스템**: 채팅 입력에 `승인` / `/approve` / `/retry` / `/skip` 가능
- **결과**: 인라인 액션은 단순 ✅
- **⚠️ 마찰 [U-G10]**: **외부 알림 부재** — 박PM이 다른 탭/PC에 있으면 게이트 도달을 모름. 60초 폴링은 [shell.js notif badge](../public/js/components/shell.js)에만 반영됨, 푸시/이메일/슬랙 미연동
- **⚠️ 마찰 [U-G11]**: 점수 70점 산출물의 **"왜 부족한지" 사유 표시가 약함** — reviewer가 채점만 하고 개선 권고 텍스트가 채팅 메시지에 풀어 표시되지 않음

### 2-4. 산출물 검토·재생성
- **행동**: 사이드 패널 "산출물 전체 보기" → 모달에서 markdown 렌더링
- **시스템**: [artifact-viewer.js](../public/js/components/artifact-viewer.js) marked.parse + HTML 미리보기 iframe(sandbox)
- **결과**: 마크다운/HTML/CSS/JS 모두 미리보기 가능 ✅
- **⚠️ 마찰 [U-G12]**: **버전 비교/diff 부재** — 동일 step을 retry하면 새 artifact row 생성되지만 "이전 버전과 어디가 달라졌는지" 보여주는 UI 없음
- **⚠️ 마찰 [U-G13]**: dedupe로 동일 콘텐츠 재사용 시 ([artifact-saver.js:153](../src/engine/pipeline/artifact-saver.js#L153)) **사용자에게 "재사용됨" 표시 없음** — 새 버전이 만들어졌는지 헷갈림

### 2-5. 부분 수정 지시
- **행동**: 채팅에 자유 입력 ("FN 003번 항목 더 자세히 써줘")
- **시스템**: [project-detail.js:65](../public/js/components/project-detail.js#L65) "자유 입력은 현재 단계 수정 지시로 해석"
- **⚠️ 마찰 [U-G14]**: 실제 처리 동작이 모호 — 새 단계 실행인지, 인라인 수정인지, retry인지 응답에서 명확하지 않음. "수정 반영됨" 같은 시스템 확인 메시지 부재

---

## P3. 이검토 — guest viewer

### 3-1. 초대 수락
- **행동**: admin이 보낸 초대 링크 클릭 → `/invite/accept/:token` → 비밀번호 설정
- **시스템**: 토큰 검증 → users 테이블에 추가
- **⚠️ 마찰 [U-G15]**: **role=guest의 가시성 정의 부족** — 어떤 프로젝트의 어떤 산출물까지 볼 수 있는지 초대 시 지정 못함. 전체 노출 또는 차단 양극 운영

### 3-2. 산출물 열람
- **행동**: 프로젝트 진입 → 산출물 모달 열기
- **시스템**: API.get `/projects/:id/artifacts/:aid` → artifact-viewer 렌더
- **결과**: 읽기는 됨 ✅
- **⚠️ 마찰 [U-G16]**: **댓글/코멘트 기능 부재** — 검토자가 "여기 수정 필요" 메모 남길 곳 없음. 별도 채널(슬랙)로 우회

### 3-3. 산출물 다운로드/공유
- **행동**: zip 다운로드 또는 PDF 변환 요청
- **시스템**: GET `/projects/:id/artifacts.zip` 존재. PDF는 export?format=pdf 라우트 존재
- **결과**: 단건 export ✅
- **⚠️ 마찰 [U-G17]**: **외부 공유 링크 부재** — guest 계정 없는 외부 사람에게 산출물 1건만 공유하려면 zip 다운로드 후 메일 첨부 필요

---

## P4. 최운영 — 1개월차 admin

### 4-1. 비용 점검
- **행동**: `/dashboard` 진입 → 토큰/비용 패널 + 비용 한도 진척률 확인
- **시스템**: [dashboard.js:75-85](../public/js/components/dashboard.js#L75-L85) 토큰 패널 + [settings.js:25-31](../public/js/components/settings.js#L25-L31) cost-limits 카드. GET `/settings/cost-report?date=...` 일별 리포트
- **결과**: 모델별/스킬별/프로젝트별 그룹화 ✅
- **⚠️ 마찰 [U-G18]**: **member·guest는 비용 패널 접근 불가** — admin only. PM이 "이 프로젝트 얼마 들었나" 보려면 admin에게 매번 문의
- **⚠️ 마찰 [U-G19]**: 비용 알림은 24시간 디바운스 + admin에게만. **임계 80% 도달 시 노티피케이션 배지([shell.js](../public/js/components/shell.js))에 노출되지만 60초 폴링이라 즉시성 낮음**

### 4-2. 에러 예산·로그
- **행동**: 대시보드 에러 로그 패널 + error budget 배지 확인
- **시스템**: GET `/dashboard/error-summary?days=N`, 24h/1h budget 임계
- **결과**: 시각적 ✅
- **⚠️ 마찰 [U-G20]**: 로그가 카테고리별 분류만 됨. **"같은 패턴 반복 에러"를 묶어 보여주는 그룹핑이 없어** 동일 ECONN 폭주를 30개 row로 봐야 함

### 4-3. 아카이브 정리
- **행동**: settings → archive 카드 → "지금 실행" 또는 cron 대기
- **시스템**: F3 archive_retention_days, archive_auto_cleanup, dry_run 옵션
- **결과**: dry-run 안전장치 ✅
- **⚠️ 마찰 [U-G21]**: **삭제 대상 미리보기 부재** — dry_run 결과를 UI에 표 형태로 보여주지 않고 JSON 응답만. 클릭 한 번으로 무엇이 사라지는지 시각화 부족

### 4-4. RAG (스킬 컨텍스트 자동 주입)
- **행동**: 박PM이 "FN 단계가 너무 일반적" 불평 → 최운영이 "rules/ref/agents 가이드를 자동 참조하게 할 수 있나?" 검토
- **시스템**: 메모리 [project_rag_direction.md](../C:/Users/hj.moon/.claude/projects/d--SYS-v4/memory/project_rag_direction.md) 방향만 정의. **src/engine/에 rag/embed/vector 코드 0건**
- **❌ 갭 [U-G22]**: **RAG 미구현** — 스킬 실행 시 ~/.claude/skills/*/SKILL.md, lib/rules/*.md, ref/*.md를 corpus로 자동 검색·주입하는 메커니즘 없음. 결과적으로 모든 산출물이 "일반론"에 가깝게 나옴. 도입 시 산출물 품질 + 토큰 비용 양쪽 개선 가능 (캐시 히트 + 컨텍스트 정확도)
- **✅ 해결 [U-G22, 2026-04-30]**: `src/engine/rag-index.js` + `src/routes/rag.js`. sqlite-fts5(`unicode61 remove_diacritics 2`) 가상 테이블 `rag_corpus`로 ~/.claude의 skills/rules/ref/agents/CLAUDE.md/AGENTS.md/SKILLS_CATALOG.md 색인 (76 docs: skill 42 + rule 17 + ref 6 + agent 8 + catalog 3). BM25 ranking + snippet highlighting. 부팅 시 비어 있으면 1회 백필. `/api/rag/search`, `/api/rag/stats`, `/api/rag/reindex` 노출

### 4-5. 프로젝트 생성 UX
- **행동**: 신규 박PM이 "AI한테 말하듯이 만들고 싶다", 진행 중 박PM이 "FN 결과 본 뒤 IA 단계 입력에 추가 코멘트 남기고 싶다"
- **시스템 (이전)**: 모달 폼 — name/code/type/description/completion_level 5필드를 한 번에 채워야 시작. 진행 중 자유 코멘트는 HITL 거부(=재작성)로만 가능
- **❌ 갭 [U-G23]**: **대화형 진입 + 비차단 중간 피드백 부재** — 첫 입력은 모달, 진행 중 코멘트는 step retry로만 반영됨. 에이전틱 UX 답지 않음
- **✅ 해결 [U-G23, 2026-04-30]**:
  - **Phase 1 (통합 채팅 진입)**: `intake_sessions` 테이블 + `src/engine/intake-agent.js` (slot-filling) + `/api/intake/start|/:id|/:id/turn|/:id/commit|/:id/abandon` + `public/js/components/intake.js`. 대시보드 chat-intake-card에 한 줄 입력 → `/intake/:id` 페이지에서 좌:대화 / 우:슬롯 진행도 → 5필수 슬롯 충족 시 [생성·시작]
  - **Phase 2 (중간 피드백)**: `messages.kind`에 `user_feedback` 추가 + `consumed_at` 컬럼. 파이프라인 active 상태에서 일반 메시지 입력 시 자동 `user_feedback`으로 변환 → `pipeline-worker.consumeUserFeedback`이 다음 step 직전 1회 주입 후 `consumed_at` 마킹. UI는 `피드백 → 다음 단계 반영` (오렌지) / `반영 완료` (그린) 뱃지로 가시화
  - HITL(차단형 게이트)와 user_feedback(비차단형 컨텍스트)을 명확히 분리

---

## 갭 종합 + 우선순위

### P0 — 첫 사용 막힘 / 데이터 위험 (즉시 처리 권장)

| ID | 갭 | 영향 페르소나 | 해결 방향 |
|----|---|---|---|
| **U-G1** | 온보딩에 AI 키 설정 단계 없음 | P1 | dashboard `_renderOnboarding()` 카드를 1)키 설정 → 2)프로젝트 → 3)파이프라인 3-step으로 재구성. 키 미설정 시 "+ 새 프로젝트" 버튼 disabled + 안내 |
| **U-G3** | 현재 사용 중 provider/모델 대시보드 미노출 | P1, P2 | 헤더 우상단에 "AI: claude-api · opus-4-7" 뱃지. mock일 때 노란색 경고 |
| **U-G4** | API key 저장 후 헬스체크 안 함 | P1 | settings PUT 직후 testConnection 자동 실행, 실패 시 빨간 경고 |
| **U-G10** | HITL 게이트 외부 알림 부재 | P2 | 슬랙 incoming webhook + 이메일 SMTP 옵션. 배지 폴링은 그대로 유지 |
| **U-G22** | **RAG 미구현** | 전 페르소나 | corpus = ~/.claude skills/rules/ref/agents, 단순 BM25/sqlite-fts5로 시작 (별도 KB 불필요). prompt cache 히트율 ↑ — **✅ 2026-04-30 해결** |
| **U-G23** | 모달 폼 진입 + 비차단 피드백 부재 | 전 페르소나 | 통합 채팅 intake + `user_feedback` kind로 다음 step에 자동 주입 — **✅ 2026-04-30 해결** |

### P1 — 일상 사용 마찰 (한 달 내 처리)

| ID | 갭 | 페르소나 | 해결 방향 |
|----|---|---|---|
| **U-G6** | 8개 선택 스킬 설명 부재 | P2 | 각 체크박스에 hover tooltip + "추천" 자동 체크 |
| **U-G8** | 프로젝트 생성 후 자동 시작 옵션 없음 | P2 | 폼에 "생성 후 즉시 파이프라인 시작" 체크박스 (기본 on) |
| **U-G9** | 예상 완료 시간/남은 단계 미표시 | P2 | step별 평균 소요시간 학습값 누적 → 진행바 ETA |
| **U-G11** | 게이트 사유 텍스트 약함 | P2 | reviewer 결과 channel별 코멘트를 채팅 메시지로 풀어쓰기 |
| **U-G12** | 산출물 버전 diff 부재 | P2 | artifact-viewer에 "이전 버전과 비교" 탭 (markdown 라인 diff) |
| **U-G18** | member 비용 가시성 없음 | P2, P4 | 프로젝트별 비용 카드를 member도 자기 프로젝트 한정 열람 가능 |
| **U-G16** | 댓글/코멘트 부재 | P3 | artifact별 댓글 스레드 (간단 SQLite 테이블) |
| **U-G5** | 초대 이메일 발송 안 됨 | P1 | nodemailer + SMTP 옵션 (Resend/SES 추후) |

### P2 — 보강 (분기 단위)

| ID | 갭 | 페르소나 | 비고 |
|----|---|---|---|
| **U-G2** | 기본 비번 변경 강제 안 함 | P1 | 첫 로그인 시 비번 변경 화면 1회 강제 |
| **U-G7** | completion_level 1~6 의미 불명 | P2 | 폼에 "L1=PoC ~ L6=프로덕션" 가이드 |
| **U-G13** | dedupe 재사용 표시 없음 | P2 | 산출물 카드에 "♻ 재사용됨" 뱃지 + 원본 링크 |
| **U-G14** | 자유 입력 처리 결과 모호 | P2 | 시스템 메시지로 "수정 반영 → step retry 트리거" 명시 |
| **U-G15** | guest 가시 범위 정의 부족 | P3 | 초대 시 프로젝트 multi-select |
| **U-G17** | 외부 공유 링크 부재 | P3 | 산출물별 단방향 read-only token URL |
| **U-G19** | 비용 임계 즉시성 약함 | P4 | WebSocket 또는 SSE로 폴링 대체 (큰 변경, 후순위) |
| **U-G20** | 에러 로그 그룹핑 없음 | P4 | error_log에 fingerprint(stack hash) 컬럼 추가 |
| **U-G21** | 아카이브 dry-run UI 시각화 부족 | P4 | 삭제 후보 목록 테이블 렌더 |

---

## 결론 — F/G 시리즈 vs 사용자 플로우 비교

이전 F/G 시리즈는 **백오피스(retention/budget/dedupe/cost-report/archive/RBAC)** 보강이었습니다. 사용자 가시 기능은 F2 검색 1건뿐.

**다음 series는 P0 5건 + P1 8건을 묶어 U 시리즈(User Flow)로 진행 권장**:
- U-G1, U-G3, U-G4 → 온보딩·AI 가시성 (1주)
- U-G10 → 외부 알림 (1주)
- U-G22 → RAG 최소 구현 (2주, 별도 phase)
- U-G6~U-G18 → 챗·산출물 UX 개선 (2주)

이렇게 하면 "이슈 백로그가 끝없는" 인상이 "사용자가 직접 체감하는 변화"로 전환됩니다. 운영 시리즈(H/S/O 등)는 기능 안정화 이후로 미룹니다.
