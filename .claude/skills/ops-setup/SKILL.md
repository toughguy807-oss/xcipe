                                                                        ---
name: ops-setup
description: >
  유지운영 온보딩 위자드. internal-ticket 초기화, ops-deploy/auth-gate 설치,
  IMAP 메일 수집(선택), 프로젝트 등록을 단계별로 수행합니다. 빈 폴더에서 SYS_v4 자체 인프라 기반
  유지운영 허브를 구성합니다. Notion 연동은 레거시 옵션으로 격하 (분기 D⁺ 정책).
user-invocable: true
---

# OPS Setup — 유지운영 온보딩 위자드

당신은 **유지운영 시스템 설치 전문가**입니다.
팀원이 빈 폴더에서 유지운영 허브를 처음 세팅할 때, 단계별로 안내하여 완전한 환경을 구성합니다.

**원칙**:
- **자체 인프라 우선** — internal-ticket(로컬 파일) + ops-deploy(GitHub Pages) + auth-gate를 기본 경로로
- **외부 SaaS는 옵션** — Notion은 레거시 호환만 지원 (분기 D⁺ 폐기 진행 중), IMAP은 메일 수집 시에만
- 모든 단계는 스킵 가능 (로컬-only 동작 보장)
- 민감 정보(토큰, 비밀번호, 패스워드)는 설정 파일/secret에만 저장
- 실패 시 명확한 안내 + 다음 단계로 계속 진행

---

## Phase 0: 환경 확인

### 0-1. 허브 경로 확인

```
1. CWD에 PROJECT.md 존재 확인
   - "유형: 유지운영 허브"이면 → 기존 허브로 인식
2. CWD가 빈 폴더이면 → 신규 허브로 세팅
3. CWD에 다른 프로젝트 파일이 있으면 → 경고 후 확인
```

### 0-2. 기존 설정 확인

```
1. .claude/ops-config.json 존재 여부 (신규 SSoT — 분기 D⁺)
   - 있으면 → 기존 설정 표시 + "재설정하시겠습니까?" 확인
   - 없으면 → 신규 설정 시작
2. .claude/notion-config.json 존재 여부 (레거시)
   - 있으면 → "Notion 레거시 설정 감지. 자체 인프라로 마이그레이션할까요?" 확인
   - 마이그레이션 동의 시 → 기존 설정 보존 + ops-config.json 신규 생성
3. Python 사용 가능 여부 확인 (sys.executable)
```

### 0-3. 진행 안내

```
╔════════════════════════════════════════════════╗
║  유지운영 허브 세팅 위자드 (분기 D⁺)            ║
╠════════════════════════════════════════════════╣
║  Phase 1: 자체 티켓 시스템 초기화 (필수)        ║
║  Phase 2: 산출물 배포 + 인증 게이트 (선택)      ║
║  Phase 3: IMAP 메일 수집 (선택)                ║
║  Phase 4: 프로젝트 등록                        ║
║  Phase 5: GitHub 자동화 (선택)                 ║
║  Phase 6: Notion 레거시 호환 (선택, 비추천)     ║
║  Phase 7: 연결 확인 + 완료                     ║
╚════════════════════════════════════════════════╝

자체 인프라(internal-ticket + ops-deploy + auth-gate)가 기본 경로입니다.
Notion 연동은 마이그레이션/병행 운영 시에만 사용하세요.
```

---

## Phase 1: 자체 티켓 시스템 초기화 (필수)

> 분기 D⁺ 정책: SYS_v4 자체 티켓(internal-ticket)이 SSoT. 외부 의존 0.

### 1-1. tickets/ 디렉토리 생성

```
{허브}/tickets/
├── _index.json       # 캐시 (재생성 가능)
└── (TKT-YYYY-####.md 누적 생성)
```

```python
import pathlib, json, datetime
tickets_dir = pathlib.Path("tickets")
tickets_dir.mkdir(exist_ok=True)
```

### 1-2. _index.json 초기화

빈 인덱스 생성 (internal-ticket reindex와 동일 포맷):

```python
now = datetime.datetime.now().astimezone().isoformat()
index = {
    "version": 1,
    "generated_at": now,
    "tickets": []
}
(tickets_dir / "_index.json").write_text(
    json.dumps(index, ensure_ascii=False, indent=2),
    encoding="utf-8"
)
```

### 1-3. 샘플 티켓 생성 (선택)

AskUserQuestion:

```
"샘플 티켓 1건을 만들어 시스템 동작을 확인할까요?"
- [생성] TKT-{YYYY}-0001 샘플 티켓 작성 + 인덱싱 검증
- [스킵] 빈 상태로 시작
```

생성 시 `internal-ticket.create_ticket()` 호출 → 자동 reindex 확인.

### 1-4. tickets/.gitignore 설정

민감/임시 디렉토리 제외:

```gitignore
# tickets/.gitignore
_archive/
private/
*.draft.md
```

> 티켓 자체는 Git에 커밋 (Markdown + frontmatter 친화적). archive/private는 별도 백업.

---

## Phase 2: 산출물 배포 + 인증 게이트 (선택)

> Notion 공유 페이지를 대체. GitHub Pages + auth-gate.

### 2-1. 배포 사용 여부 확인

AskUserQuestion:

```
"산출물(티켓 보드, 디자인 시안 등)을 외부에 공유하시겠습니까?"
- [GitHub Pages] ops-deploy로 정적 사이트 배포 (무료, 외부 의존 0)
- [로컬만] 배포 없이 로컬에서만 확인
```

**"로컬만" 선택 시**: `ops-config.json`의 `deploy.enabled: false` 유지 → Phase 3로.

### 2-2. 인증 게이트 모드 선택

AskUserQuestion:

```
"공유 사이트 접근 보호 수준을 선택하세요."
- [password] 패스워드 게이트 (Tier-A) — 간편, 클라이언트사이드 SHA-256
- [workers] Magic Link (Tier-B) — Cloudflare Workers + KV + 메일링
- [none] 보호 없음 (전체 공개)
```

기본값: `password` (Notion 공유 링크와 동급 보안).

### 2-3. ops-deploy 설치

`Skill(ops-deploy)` 호출하여 다음 산출:

```
.github/workflows/pages.yml
docs/                       # 빌드 산출물 (자동 생성)
ops/build.py                # 빌드 스크립트
```

**Giscus 댓글** (선택): PROJECT.md에 `giscus:` 블록 추가하면 티켓 페이지에 자동 임베드.

**PWA** (선택): `pwa.enabled: true` 설정 시 manifest + service worker 생성.
> 사용자가 `docs/icon-192.png`, `docs/icon-512.png` 직접 배치 필요.

### 2-4. auth-gate 설치

password 모드 선택 시:

```python
# Skill(auth-gate)로 다음 자동 생성
docs/_auth/login.html       # SHA-256 검증
docs/_auth/auth.js          # AuthGate 객체 (TTL 7일)

# 모든 산출물 HTML <head> 최상단에 가드 스니펫 자동 주입
```

AskUserQuestion:

```
"공유 사이트 패스워드를 입력하세요. (환경 변수 {PROJECT}_AUTH_PW에 저장)"
```

**workers 모드**: Cloudflare Wrangler + KV namespace + Resend 키 가이드 (auth-gate SKILL.md Tier-B 참조).

### 2-5. 배포 설정 저장

`ops-config.json`:

```json
{
  "deploy": {
    "enabled": true,
    "target": "github-pages",
    "repo": "{owner}/{repo}",
    "auth": {
      "mode": "password",
      "password_env": "{PROJECT}_AUTH_PW"
    },
    "giscus": false,
    "pwa": false
  }
}
```

---

## Phase 3: IMAP 메일 수집 (선택)

### 3-1. 메일 사용 여부 확인

AskUserQuestion:

```
"메일 자동 수집을 설정하시겠습니까?"
- [설정] IMAP으로 메일을 자동 수집하여 inbox에 저장합니다
- [스킵] 메일 수집 없이 수동으로 요청을 접수합니다
```

**"스킵" 선택 시**: `email.enabled: false` 유지 → Phase 4로.

### 3-2. IMAP 정보 입력

AskUserQuestion (한번에 모아서):

```
메일 설정 정보를 입력해주세요.

1. 메일 주소: (예: user@company.com)
2. IMAP 호스트: (기본값: imap.worksmobile.com)
3. 앱 비밀번호: (.claude/docs/imap-setup-guide.md 참조)
```

### 3-3. 연결 테스트

```python
import imaplib, ssl

HOST = "{입력된 호스트}"
PORT = 993
EMAIL = "{입력된 메일}"
PASSWORD = "{입력된 비밀번호}"

ctx = ssl.create_default_context()
try:
    conn = imaplib.IMAP4_SSL(HOST, PORT, ssl_context=ctx)
    conn.login(EMAIL, PASSWORD)
    status, counts = conn.status("INBOX", "(UNSEEN)")
    unseen = int(counts[0].decode().split("UNSEEN")[1].strip(" )"))
    print(f"연결 성공! 미읽은 메일: {unseen}건")
    conn.logout()
except Exception as e:
    print(f"연결 실패: {e}")
```

**성공**: 설정 저장 + `email.enabled: true` → 3-4로.
**실패**: 에러 안내 + "다시 시도 / 스킵" 선택.

### 3-4. 필터 설정 (선택)

```
"스킵할 발신 도메인이 있습니까? (예: email.figma.com)"
- 콤마 구분으로 입력
- 빈 입력 → 기본값 유지
```

설정을 `email.filter.skip_domains`에 저장.

---

## Phase 4: 프로젝트 등록

### 4-1. 첫 프로젝트 등록

AskUserQuestion (한번에 모아서):

```
첫 프로젝트를 등록하겠습니다.

1. 프로젝트명: (예: 비짓강남)
2. 프로젝트 코드: 영문 2~4자 (예: VGN) — 자동 생성 가능
3. 사이트 URL: (선택, 예: https://www.visitgangnam.net)
4. 업종: (선택, 예: 관광)
```

### 4-2. 프로젝트 폴더 생성

```
{허브}/{프로젝트코드}/
├── PROJECT.md
├── input/
├── output/
│   ├── planning/
│   ├── design/
│   ├── publish/
│   └── qa/
├── tickets/                 # 프로젝트 단위 티켓 (internal-ticket)
│   └── _index.json
├── inbox/
└── .claude/
    └── CLAUDE.md
```

> 허브 단위 `tickets/`(Phase 1)는 공통/관리용, 프로젝트 단위 `tickets/`는 해당 프로젝트 작업용.

### 4-3. PROJECT.md 템플릿

```markdown
---
project_code: {코드}
project_name: {프로젝트명}
url: {URL}
domain: {업종}
deploy:
  enabled: {true/false}
  target: github-pages
  auth: { mode: password|workers|none }
giscus:
  enabled: false
pwa:
  enabled: false
created_at: {ISO datetime}
---

# {프로젝트명}

## 개요
{한 줄 요약}

## 산출물
- [티켓 보드](./tickets/)
- [디자인 시안](./output/design/)
- [퍼블리싱](./output/publish/)
```

### 4-4. 추가 프로젝트

```
"프로젝트를 더 등록하시겠습니까?"
- [등록] → 4-1로 반복
- [완료] → Phase 5로
```

### 4-5. 발신자-프로젝트 매핑 (IMAP 설정 시)

```
"각 프로젝트의 메일 발신자를 매핑하시겠습니까?"
프로젝트 {코드}: 발신자 도메인 또는 주소 (예: client@gangnam.go.kr)
- 빈 입력 → 매핑 없이 제목 기반 자동 매칭
```

설정을 `email.filter.sender_project_map`에 저장.

---

## Phase 5: GitHub 자동화 (선택)

### 5-1. GitHub 사용 여부 확인

AskUserQuestion:

```
"GitHub CI/CD 자동화를 설정하시겠습니까?"
- [설정] Claude GitHub App + Actions 워크플로우를 구성합니다
- [스킵] GitHub 연동 없이 로컬에서만 사용합니다
```

**"스킵" 선택 시**: Phase 6로.

### 5-2. Claude GitHub App 설치

```
1. 리포지토리 URL 입력받기 (Phase 2 ops-deploy와 동일 repo 권장)
2. Claude GitHub App 설치 안내:
   - https://github.com/apps/claude 방문
   - 대상 리포지토리에 설치
3. ANTHROPIC_API_KEY를 리포지토리 Secret에 등록 안내:
   - Settings → Secrets and variables → Actions
   - Name: ANTHROPIC_API_KEY
```

### 5-3. GitHub Actions 워크플로우 생성

`.github/workflows/claude.yml` (인터랙티브):

```yaml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: |
      contains(github.event.comment.body, '@claude') ||
      contains(github.event.review.body, '@claude') ||
      (github.event_name == 'issues' && contains(github.event.issue.body, '@claude'))
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

> Phase 2의 `pages.yml`(ops-deploy)와 별개. 두 workflow 공존 가능.

### 5-4. Cloud Scheduled Tasks 안내 (선택)

```
"정기 실행 작업을 설정하시겠습니까?"
- [설정] /schedule create 로 예약된 Claude 작업 등록 (≥1시간 간격)
- [스킵] 나중에 설정
```

### 5-5. GitHub 설정 저장

`ops-config.json`:

```json
{
  "github": {
    "enabled": true,
    "repo": "{owner}/{repo}",
    "workflow": ".github/workflows/claude.yml",
    "scheduled_tasks": false
  }
}
```

---

## Phase 6: Notion 레거시 호환 (선택, 비추천)

> **분기 D⁺ 정책**: 신규 허브는 자체 인프라 권장. 기존 Notion 의존 워크플로우 마이그레이션 중에만 활성화.

### 6-1. 레거시 사용 여부 확인

AskUserQuestion:

```
"Notion 레거시 호환 모드를 활성화하시겠습니까?"
- [활성화] 기존 Notion 워크스페이스를 병행 사용 (마이그레이션 기간)
- [비활성화] 자체 인프라(internal-ticket)만 사용 (권장)
```

**"비활성화" 선택 시**: `ops-config.json`의 `notion.enabled: false` → Phase 7로.

### 6-2. 토큰 입력 + 연결 테스트

```python
import json, urllib.request

TOKEN = "{입력된 토큰}"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}
req = urllib.request.Request("https://api.notion.com/v1/users/me", headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"연결 성공: {data.get('name', 'Unknown')}")
except urllib.error.HTTPError as e:
    print(f"연결 실패: {e.code} {e.reason}")
```

### 6-3. 워크스페이스 DB 지정 + 마이그레이션 가이드

```
"기존 Notion DB의 항목을 internal-ticket으로 이관하시겠습니까?"
- [이관] DB 항목을 TKT-YYYY-#### 티켓으로 변환 (마이그레이션 1회성)
- [병행] 양쪽 모두 유지 (수동 동기화)
```

**이관 선택 시**: `ops/migrate-notion-to-tickets.py` 스크립트 실행 안내.

### 6-4. 레거시 설정 저장

`ops-config.json` (notion 블록은 옵션):

```json
{
  "notion": {
    "enabled": true,
    "legacy_mode": true,
    "token_env": "NOTION_API_TOKEN",
    "parent_db": "{db-id}",
    "deprecation_note": "분기 D⁺에서 폐기 예정 — 신규 작업은 tickets/에 작성"
  }
}
```

---

## Phase 7: 연결 확인 + 완료

### 7-1. 설정 파일 최종 생성

`{허브}/.claude/ops-config.json`에 모든 설정을 저장합니다.

```json
{
  "version": "v4-d-plus",
  "tickets": { "enabled": true, "root": "tickets" },
  "deploy": { ... },
  "email": { ... },
  "github": { ... },
  "notion": { "enabled": false }
}
```

### 7-2. 허브 PROJECT.md 생성

```markdown
# 유지운영 허브

| 항목 | 내용 |
|------|------|
| 유형 | 유지운영 허브 |
| 생성일 | {오늘 날짜} |
| 자체 티켓 | ✓ (internal-ticket) |
| 산출물 배포 | {GitHub Pages ✓ / 미설정 ✗} |
| 인증 게이트 | {password / workers / none} |
| IMAP 수집 | {활성/비활성} |
| GitHub 자동화 | {활성/비활성} |
| Notion 레거시 | {활성/비활성} |

## 등록 프로젝트

| 코드 | 프로젝트명 | URL | 로컬 경로 | 배포 |
|------|-----------|-----|-----------|------|
| {코드} | {프로젝트명} | {URL} | {경로} | {URL/미배포} |
```

### 7-3. 허브 .claude/CLAUDE.md 생성

`ops/templates/hub-CLAUDE.md` 템플릿 기반 생성. 자체 인프라 우선 + 분기 D⁺ 정책 명시.

### 7-4. 완료 보고

```
╔════════════════════════════════════════════════╗
║  유지운영 허브 세팅 완료! (분기 D⁺)            ║
╠════════════════════════════════════════════════╣
║                                                ║
║  허브 경로: {CWD}                              ║
║  티켓 시스템: internal-ticket ✓                ║
║  산출물 배포: {GitHub Pages ✓ / 로컬 ✗}        ║
║  인증 게이트: {password / workers / none}      ║
║  IMAP: {활성 ✓ / 비활성 ✗}                    ║
║  GitHub Actions: {연동 ✓ / 미연동 ✗}          ║
║  Notion 레거시: {활성 ✓ / 비활성 ✗}            ║
║  프로젝트: {n}개 등록                          ║
║                                                ║
║  외부 SaaS 의존: 0건 (legacy 제외)             ║
║                                                ║
║  다음 단계:                                    ║
║  1. Claude Code 세션 재시작                    ║
║  2. /status 로 대시보드 확인                   ║
║  3. /maintenance 로 업무 시작                  ║
║                                                ║
╚════════════════════════════════════════════════╝
```

---

## 에러 처리

| 상황 | 대응 |
|------|------|
| Python 미설치 | Python 설치 안내 + 로컬-only 모드 (티켓 시스템만) |
| tickets/ 폴더 생성 실패 | 권한/경로 확인 + 재시도 |
| ops-deploy 의존(GitHub repo) 미설정 | 안내 + Phase 2 스킵 → Phase 3 |
| auth-gate password 환경변수 미설정 | 안내 + 평문 저장 거부 |
| IMAP 연결 실패 | 호스트/포트/비밀번호 확인 안내 + 스킵 |
| 폴더 권한 없음 | 경로 변경 제안 |
| 기존 설정 충돌 (notion-config.json) | 마이그레이션 안내 + ops-config.json 신규 생성 |
| GitHub App 미설치 | 설치 URL 안내 + 스킵 |
| ANTHROPIC_API_KEY 미등록 | Secret 등록 가이드 + 스킵 |
| Notion 토큰 무효 (Phase 6) | 재입력 or 레거시 비활성화 |

---

## 규칙

1. **자체 인프라 우선** — Phase 1(internal-ticket)은 필수, Notion(Phase 6)은 레거시 옵션
2. **한번에 모아서 묻는다** — 같은 Phase의 정보는 한 질문으로
3. **모든 외부 SaaS 단계 스킵 가능** — 자체 인프라만으로 100% 기능 동작 (Phase 1만 필수)
4. **실패해도 멈추지 않는다** — 에러 안내 후 다음 단계로
5. **민감 정보 관리** — 토큰/비밀번호/패스워드 환경 변수에만 저장, config는 `*_env` 키만 보유
6. **기존 설정 보존** — 재실행 시 기존 설정을 존중, 덮어쓰기 전 확인
7. **허브 경로 동적 감지** — 하드코딩된 경로 절대 사용 금지
8. **외부 의존 0 추적** — 활성화된 외부 SaaS 카운트를 완료 보고에 명시

## 품질 체크 (Self-Check)

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 허브 경로 감지 | CWD 기반 허브 루트 정확히 판별 (하드코딩 0건) |
| 2 | 자체 티켓 시스템 | tickets/ + _index.json 생성 + JSON 파싱 정상 |
| 3 | 산출물 배포 | (옵션) docs/ 빌드 + .github/workflows/pages.yml 생성 (스킵 시 N/A) |
| 4 | 인증 게이트 | (옵션) login.html + auth.js + 가드 스니펫 주입 (스킵 시 N/A) |
| 5 | IMAP 연결 | (옵션) 로그인 성공 + UNSEEN 카운트 정상 (스킵 시 N/A) |
| 6 | 프로젝트 등록 | 폴더 구조 7개 + PROJECT.md 필수 frontmatter + .claude/CLAUDE.md 생성 |
| 7 | config 완전성 | ops-config.json JSON 파싱 정상 + 필수 키(version/tickets) 존재 |
| 8 | GitHub Actions | (옵션) claude.yml 생성 + Secret 등록 안내 완료 (스킵 시 N/A) |
| 9 | Notion 레거시 | (옵션) 활성화 시 deprecation_note 포함 (비활성/스킵 시 N/A) |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] ops-setup (분기 D⁺)
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | 허브 경로 감지              | {Pass/Fail} |
| 2 | 자체 티켓 시스템            | {Pass/Fail} |
| 3 | 산출물 배포                | {Pass/Fail/N/A} |
| 4 | 인증 게이트                | {Pass/Fail/N/A} |
| 5 | IMAP 연결                  | {Pass/Fail/N/A} |
| 6 | 프로젝트 등록               | {Pass/Fail} |
| 7 | config 완전성               | {Pass/Fail} |
| 8 | GitHub Actions              | {Pass/Fail/N/A} |
| 9 | Notion 레거시               | {Pass/Fail/N/A} |
▶ PM Devil's Advocate
| DA1 | 자체 인프라가 기본 경로로 안내됐는가      | {OK/WARN — 사유} |
| DA2 | 민감 정보가 config 외부에 노출되지 않았는가 | {OK/WARN — 사유} |
| DA3 | 외부 SaaS 의존 카운트가 보고에 명시됐는가  | {OK/WARN — 사유} |
| DA4 | Phase 1 외 모든 단계가 스킵 가능한가      | {OK/WARN — 사유} |
───────────────────────────────────
판정: {PASS — 13/13} 또는 {FAIL — n/13}
═══════════════════════════════════
```

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 사용자 미확인 상태에서 티켓 상태 변경 금지 | 워크플로우 혼란 |
| 2 | API 키/토큰/패스워드를 config 파일이나 산출물에 평문 노출 금지 | 보안 사고 |
| 3 | 운영 데이터 임의 삭제/수정 금지 | 복구 불가 데이터 손실 |
| 4 | Notion(Phase 6) 신규 활성화 권유 금지 | 분기 D⁺ 폐기 정책 위배 |
| 5 | tickets/.md 파일 직접 수정 시 reindex 누락 금지 | _index.json 정합성 깨짐 |

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **Notion 우선 권유**: Phase 6 Notion을 기본 추천 → 분기 D⁺ 정책 위배. 신규 프로젝트는 internal-ticket + ops-deploy + auth-gate.
- ❌ **빈 폴더 검증 누락**: 기존 파일이 있는 디렉토리에 setup 실행 → 덮어쓰기 위험. ops-setup 시작 전 빈 폴더 검증 또는 사용자 확인.
- ❌ **IMAP 자격 증명 평문 저장**: 메일 수집 설정 시 password를 .env 외 위치 저장 → 유출. .env 또는 OS keychain만.
- ❌ **PROJECT.md 템플릿 무수정 출력**: `[App Name]` placeholder 남긴 채 setup 완료 보고 → 후속 작업에서 식별 실패. setup 마지막에 placeholder 검사 의무.
- ❌ **단계 중간 실패 시 롤백 없음**: Phase 3에서 실패해도 Phase 1-2 산출물 그대로 남김 → 부분 설치 상태. 실패 시 사용자 확인 후 정리 또는 재개 가이드.
- ❌ **권한 검사 없이 진행**: ops-deploy GitHub Pages 활성화 단계에서 repo 권한 미확인 → 403 후 중단. 사전 `gh auth status` 확인.
