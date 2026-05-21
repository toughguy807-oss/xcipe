# ELUO XCIPE 분산 워커 가이드 (v25)

> 각 사용자가 자기 PC에서 자기 Claude 계정 OAuth 로 파이프라인을 실행하는 분산 워커 모델.
>
> 클라우드(Vercel + Railway)는 UI/티켓/대시보드/큐 관리만 담당. 실제 LLM 호출은 사용자 PC 의 `xcipe-worker` daemon 이 본인 `~/.claude` OAuth 로 수행.

---

## 동작 모델

```
[사용자 A 의 브라우저]                    [Railway 클라우드]
JWT 로그인  ───────────────────────►  Web UI + DB(SQLite) + 큐
"파이프라인 시작" 클릭                     │
                                          │ pipeline_steps INSERT (user_id=A)
                                          │
[사용자 A 의 PC — xcipe-worker]            │
~/.claude OAuth (본인 Max 구독)            │
  ▲                                       │
  │  매 5초                               │
  │  POST /api/worker/jobs/claim   ◄──────┤
  │  (X-Worker-Token: A의 토큰)            │
  │                                       │
  │  본인 작업 1건 받음                    │
  │  ────────────────────────►  claim 응답 (skill+컨텍스트)
  │
  │  claude CLI spawn (본인 계정으로 호출)
  │   ↓
  │  매 15초 heartbeat
  │   ↓
  │  완료 → POST .../result  ────────────►  saveArtifact + status=awaiting_approval
```

핵심 보장:
- 사용자 A 의 작업은 사용자 A 의 워커만 처리 (pipeline_steps.user_id 필터)
- 사용자 A 의 OAuth 토큰은 **A의 PC 에만 존재** — 서버에 절대 업로드되지 않음
- 워커 down → 60초 heartbeat 미수신 → 서버가 stale 처리 → 재claim 가능
- admin 사용자는 모든 작업 claim 가능 (운영 backstop)

---

## 1회 설치 (사용자 PC, Windows/Mac/Linux)

### 1. xcipe repo clone

```bash
git clone https://github.com/eluoaxjun/xcipe.git
cd xcipe
npm install
```

### 2. Claude Code CLI 설치 + 로그인

```bash
npm install -g @anthropic-ai/claude-code
claude /login          # 브라우저에서 본인 Claude Pro/Max/Team 계정 OAuth
claude auth status     # 로그인 확인
```

> Claude 계정이 없거나 OAuth 가 어려운 경우: `ANTHROPIC_API_KEY` 직접 발급 후 `claude` 대신 SDK 직접 호출 모드 (Phase 2.5 예정)

### 3. 워커 토큰 발급 받기

xcipe admin 에게 본인 계정의 워커 토큰 발급 요청 → admin 이 `/admin/users` 페이지에서 [토큰 발급] 클릭 → **1회 노출되는 64자 hex 토큰** 을 안전한 곳에 저장.

### 4. 환경변수 설정

**Windows (PowerShell)**:
```powershell
$env:XCIPE_SERVER = "https://xcipe-production.up.railway.app"
$env:XCIPE_WORKER_TOKEN = "발급받은_64자_hex_토큰"
```

**Mac/Linux (bash)**:
```bash
export XCIPE_SERVER="https://xcipe-production.up.railway.app"
export XCIPE_WORKER_TOKEN="발급받은_64자_hex_토큰"
```

또는 프로젝트 루트에 `.env` 파일 생성 (gitignore 됨):
```
XCIPE_SERVER=https://xcipe-production.up.railway.app
XCIPE_WORKER_TOKEN=발급받은_64자_hex_토큰
```

### 5. 워커 실행

```bash
npm run worker
# 또는
node bin/xcipe-worker.js
```

성공 시 로그:
```
[xcipe-worker ...] 서버: https://xcipe-production.up.railway.app
[xcipe-worker ...] 워커 ID: hostname:12345
[xcipe-worker ...] claude CLI OK — user@example.com (max plan)
[xcipe-worker ...] 인증 OK — user=user@example.com (role=member)
[xcipe-worker ...] polling 시작 (5000ms 간격, heartbeat 15000ms)
```

---

## 환경변수 전체 명세

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `XCIPE_SERVER` | ✅ | - | xcipe 서버 URL (Railway 또는 로컬) |
| `XCIPE_WORKER_TOKEN` | ✅ | - | admin 발급 64자 hex 토큰 |
| `XCIPE_WORKER_ID` | - | `hostname:pid` | 워커 식별자 (로그 표시용) |
| `XCIPE_POLL_INTERVAL` | - | 5000 | claim polling 간격(ms) |
| `XCIPE_HEARTBEAT_INT` | - | 15000 | heartbeat 간격(ms) |
| `XCIPE_CLAUDE_CMD` | - | `claude` | claude CLI 명령 경로 |
| `XCIPE_CLAUDE_TIMEOUT` | - | 900000 | claude 한 번 호출 최대 시간(ms, 15분) |

---

## 운영 SOP

### 워커가 멈췄을 때

1. 사용자 PC 에서 `Ctrl+C` 또는 process kill → 진행 중 작업은 자동으로 fail 보고
2. 60초 내 heartbeat 미수신 시 서버가 stale 처리 → `pipeline_steps.status='pending'` 복귀 → 다른 워커(또는 재시작된 본인) 재claim
3. 3회 stale 시 step 은 `failed` 처리되어 사용자 결정 대기

### claude OAuth 토큰 만료

```bash
claude auth status  # invalid 면
claude /login       # 재로그인
```

워커는 매 claim 마다 `claude` CLI 를 호출하므로 토큰 만료 시 즉시 fail. 재로그인 후 워커 재시작 불필요 — 다음 polling 부터 자동 동작.

### 워커 토큰 노출 의심 시

xcipe admin 에서 `/admin/users` → [회수] → [재발급]. 기존 토큰은 즉시 무효화되어 401 응답.

### 여러 PC 에서 동시 실행

같은 사용자 토큰으로 여러 PC 에서 동시 실행 가능. 첫 claim 한 워커가 작업 가져감. **단 같은 PC 에서 2개 이상은 권장 안 함** — claude CLI 동시 호출 시 OAuth rate limit 충돌 가능.

---

## 트러블슈팅

### `claude CLI 인증 안 됨`
→ `claude /login` 실행 후 `claude auth status` 확인

### `401 Unauthorized` (서버 인증 실패)
→ XCIPE_WORKER_TOKEN 확인. admin 에 재발급 요청.

### `409 claim 토큰 불일치 또는 step 이미 종료됨`
→ 다른 워커가 같은 step 을 처리했거나 stale 회수됨. 정상 동작.

### `204 No Content` 가 계속 반환됨
→ 본인이 요청한 pending step 이 없음. 정상. 클라우드 UI 에서 새 파이프라인 시작 시 claim 됨.

### Playwright/post-process 가 워커 없이 실패
→ 현재 MVP 는 워커가 LLM 호출만 처리. post-process(`scripts/post-process.js`), figma-push prepare, visual-verify 는 서버 사이드(Railway 컨테이너)에서 수행. Railway 컨테이너에 Playwright/poppler 가 설치되어 있음 (Dockerfile 참고).

---

## 보안 메모

- `~/.claude/credentials` (OAuth 토큰): **사용자 PC 에만 존재**. 워커 daemon 도 이 파일을 읽지 않고 `claude` CLI 가 spawn 시 자동 사용.
- `XCIPE_WORKER_TOKEN`: 서버 인증용. 노출 시 admin 회수.
- 워커 daemon 은 서버에 `content`(LLM 응답), `usage`(토큰 사용량), `generated_files`(워커가 만든 보조 파일) 만 전송. OAuth 토큰은 절대 전송하지 않음.

---

## 다음 단계 (Phase 2.5)

- reviewer 스킬 (품질 점수) 워커 처리 — 현재 서버는 스킵
- visual-verify(Playwright) 워커 처리 — 현재 서버에서 시도
- mockup-gen 워커 처리
- `ANTHROPIC_API_KEY` 직접 사용 모드 (OAuth 없이)
- 워커 다중 동시 실행 (concurrency)
- 산출물 양방향 동기화 (워커 PC ↔ 서버)
