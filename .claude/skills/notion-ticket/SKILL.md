---
name: notion-ticket
description: >
  Notion 태스크 관리 스킬. Notion API로 프로젝트 페이지 + Tasks DB CRUD를
  수행합니다. 티켓 내 개별 태스크를 행 단위로 관리합니다.
user-invocable: false
---

# Notion 태스크 관리 (Notion Task)

당신은 **Notion 연동 담당자**입니다.
로컬 티켓의 개별 태스크를 Notion Tasks DB에 동기화하고, 프로젝트 페이지를 관리합니다.

## 전제조건

- **필수**: Notion API 호출 가능 (Python urllib)
- **필수**: `notion-config.json` 설정 (허브 `.claude/notion-config.json`)
- **권장**: maintenance-intake 스킬에서 생성한 로컬 티켓 파일

> Notion 연결 실패 시: 로컬-only 모드로 전환. 나중에 `/maintenance sync`로 일괄 동기화 가능.

## 설정 참조 (CRITICAL)

**반드시 CWD 기준 허브의 로컬 config를 사용한다. 전역 config를 사용하면 안 된다.**

```
설정 파일 감지 순서:
1. CWD에서 PROJECT.md 탐색 → "유형: 유지운영 허브"이면 CWD = 허브 루트
2. CWD 상위 1-depth에서 PROJECT.md 탐색 → 허브 루트 판별
3. 허브 루트 확정 후 → {허브}/.claude/notion-config.json 읽기
4. 환경변수 NOTION_TOKEN (토큰 오버라이드만)

⚠️ 절대 금지:
- ~/.claude/project-assets/notion-docs/notion-config.json 사용 금지 (전역 템플릿)
- 다른 허브(운영_v2 등)의 config 참조 금지
- ops.projects.{코드}.notion.tasks_db_id는 반드시 현재 허브 config에서 읽기

설정 구조:
  인증 토큰: auth.token (또는 환경변수 NOTION_TOKEN)
  API 버전: auth.notion_version
  워크스페이스 DB ID: pages.parent_db.id
  태스크 스키마: tasks_schema.properties
  프로젝트 Notion IDs: ops.projects.{코드}.notion
    - page_id: 프로젝트 페이지 ID
    - tasks_db_id: 프로젝트별 Tasks DB ID

검증 방법: config 로드 후 ops.hub_path가 현재 작업 디렉토리와 일치하는지 확인
```

### Notion 구조 (플랫)

```
프로젝트 문서 허브 (workspace DB — pages.parent_db)
  └─ {프로젝트} (프로젝트 개요 + 사이트 정보 + 대시보드)
       └─ Tasks (inline DB — 태스크 단위 행)
            ├─ #1 안내 문구 추가  [OPS-VGN-001]
            ├─ #2 범례 삭제       [OPS-VGN-001]
            └─ ...
```

> 중간 허브 레이어 없이 프로젝트 page가 workspace DB 직하에 위치한다.

**핵심: 티켓이 아닌 태스크가 행 단위.** 하나의 티켓에 7개 항목이 있으면 7행이 생긴다.

---

## API 호출 패턴

Windows cmd.exe 환경에서 **Python urllib** 사용 (curl 한글 인코딩 문제 회피).

```python
import json, urllib.request, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN = "{token}"
NOTION_VER = "{notion_version}"

def notion_api(method, url, payload=None):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Notion-Version": NOTION_VER,
        "Content-Type": "application/json"
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))
```

---

## 기능 1: 프로젝트 페이지 관리

### 1-1. 확인

`ops.projects.{코드}.notion.page_id`가 있으면 이미 존재.

### 1-2. 생성 (신규 프로젝트)

parent_db(워크스페이스 DB) 직하에 프로젝트 페이지를 생성합니다.

**페이지 구성**:
- callout: 프로젝트 한 줄 설명
- 프로젝트 정보 테이블 (코드, URL, CMS, 등록일, 로컬 경로)
- 구분선
- "태스크 관리" 헤딩
- Tasks DB (기능 2-0으로 생성)

### 1-3. notion-config 업데이트

생성된 ID를 `ops.projects.{코드}.notion`에 기록:

```json
"notion": {
  "page_id": "{페이지 ID}",
  "page_url": "https://www.notion.so/{ID}",
  "tasks_db_id": "{DB ID}"
}
```

---

## 기능 2: Tasks CRUD

### 2-0. Tasks DB 초기화 (프로젝트별 최초 1회)

스키마는 `tasks_schema`를 참조합니다.

```python
db = notion_api("POST", "https://api.notion.com/v1/databases", {
    "parent": {"page_id": "{project_page_id}"},
    "title": [{"text": {"content": "Tasks"}}],
    "properties": {
        "Name": {"title": {}},
        "Ticket": {"rich_text": {}},
        "Task #": {"number": {"format": "number"}},
        "Type": {"select": {"options": [
            {"name": "TXT", "color": "gray"},
            {"name": "IMG", "color": "blue"},
            {"name": "FNC", "color": "orange"},
            {"name": "NEW", "color": "green"},
            {"name": "STR", "color": "purple"},
            {"name": "ETC", "color": "default"}
        ]}},
        "Status": {"select": {"options": [
            {"name": "대기", "color": "default"},
            {"name": "진행중", "color": "orange"},
            {"name": "완료", "color": "green"},
            {"name": "확인필요", "color": "yellow"},
            {"name": "블로커", "color": "red"},
            {"name": "보류", "color": "gray"}
        ]}},
        "Priority": {"select": {"options": [
            {"name": "긴급", "color": "red"},
            {"name": "높음", "color": "orange"},
            {"name": "보통", "color": "yellow"},
            {"name": "낮음", "color": "gray"}
        ]}},
        "Target Pages": {"rich_text": {}},
        "Detail": {"rich_text": {}},
        "Blocker": {"rich_text": {}}
    }
})
```

### 2-1. Create (태스크 등록)

로컬 티켓 파일의 **변경 대상** 테이블에서 각 항목을 읽어 개별 행으로 추가합니다.

**입력**: 티켓 파일 경로 (예: `tickets/OPS-VGN-001.md`)

티켓 파일의 변경 대상 테이블:
```markdown
| # | 항목 | 유형 | 대상 페이지 | 상세 |
```

각 행 → Tasks DB 1행:

```python
notion_api("POST", "https://api.notion.com/v1/pages", {
    "parent": {"database_id": "{tasks_db_id}"},
    "properties": {
        "Name": {"title": [{"text": {"content": "{항목명}"}}]},
        "Ticket": {"rich_text": [{"text": {"content": "OPS-VGN-001"}}]},
        "Task #": {"number": 1},
        "Type": {"select": {"name": "TXT"}},
        "Status": {"select": {"name": "대기"}},
        "Priority": {"select": {"name": "보통"}},
        "Target Pages": {"rich_text": [{"text": {"content": "둘레길 메인"}}]},
        "Detail": {"rich_text": [{"text": {"content": "상세 내용"}}]}
    }
})
```

### 2-2. Read (태스크 조회)

```python
# 전체 조회
result = notion_api("POST", f"https://api.notion.com/v1/databases/{tasks_db_id}/query", {})

# 티켓별 필터
result = notion_api("POST", f"https://api.notion.com/v1/databases/{tasks_db_id}/query", {
    "filter": {
        "property": "Ticket",
        "rich_text": {"equals": "OPS-VGN-001"}
    }
})

# 상태별 필터
result = notion_api("POST", f"https://api.notion.com/v1/databases/{tasks_db_id}/query", {
    "filter": {
        "property": "Status",
        "select": {"equals": "블로커"}
    }
})
```

### 2-3. Update (상태 변경)

```python
notion_api("PATCH", f"https://api.notion.com/v1/pages/{task_page_id}", {
    "properties": {
        "Status": {"select": {"name": "완료"}}
    }
})
```

**태스크 상태**:
```
대기 → 진행중 → 완료
대기 → 확인필요 → 대기 (고객 답변 후)
대기 → 블로커 (외부 의존)
블로커 → 대기 (의존 해소 후)
어디서든 → 보류
```

---

## 기능 3: 동기화

### 3-1. 로컬 → Notion

티켓 파일의 변경 대상 테이블을 순회하면서:
1. Tasks DB에 해당 Ticket + Task # 조합이 없으면 → Create
2. 있으면 → 상태 비교 → 로컬이 최신이면 Update

### 3-2. 동기화 보고

```
[Notion Sync] 프로젝트: {프로젝트명}
- 신규 등록: {n}건
- 상태 갱신: {n}건
- 블로커: {n}건
- 완료: {n}건
```

---

## 에러 처리

| 에러 | 대응 |
|------|------|
| Notion API 401 | 토큰 만료 안내 + 로컬-only 전환 |
| Notion API 404 | DB 초기화 실행 (2-0) |
| Notion API 429 | 3초 대기 후 재시도 (최대 3회) |
| 네트워크 오류 | 로컬-only 전환 + 나중에 sync |

---

## 규칙

1. **태스크 단위 관리** — 티켓이 아닌 개별 태스크가 DB의 행. 티켓 1건 = N개 행
2. **로컬 우선** — 로컬 티켓이 원본, Notion은 미러
3. **실패해도 멈추지 않는다** — Notion 에러 시 로컬-only로 전환
4. **notion-config.json 즉시 갱신** — DB ID 등 생성 시 즉시 기록
5. **Python urllib 사용** — Windows cmd.exe 한글 인코딩 대응

## 품질 체크 (Self-Check)

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | Notion 연결 | API 토큰 유효 + DB 접근 가능 (실패 시 로컬-only 전환 확인) |
| 2 | 동기화 정합성 | 로컬 티켓 태스크 수 = Notion DB 행 수 (신규/갱신/삭제 정확) |
| 3 | 상태 전이 | 접수→분석중→진행중→검수중→완료 순서 준수 |
| 4 | 에러 처리 | API 401/404/429/네트워크 오류 각각에 대해 정의된 대응 실행 |
| 5 | config 갱신 | notion-config.json에 DB ID 등 즉시 기록 완료 |

### Devil's Advocate 3챌린지

1. **"로컬과 Notion 간 데이터 불일치가 남아있지 않은가?"** — 부분 동기화 후 불일치 = 이중관리 실패
2. **"API 실패 시 로컬-only 전환이 정상 작동했는가?"** — 전환 실패 시 데이터 유실 가능
3. **"동기화 누락 건이 있는가?"** — 신규 생성 후 미동기 = 팀 가시성 차단

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] notion-ticket
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | Notion 연결                | {Pass/Fail} |
| 2 | 동기화 정합성              | {Pass/Fail} |
| 3 | 상태 전이                  | {Pass/Fail} |
| 4 | 에러 처리                  | {Pass/Fail} |
| 5 | config 갱신                | {Pass/Fail} |
▶ PM Devil's Advocate
| DA1 | 로컬-Notion 데이터 일치    | {OK/WARN — 사유} |
| DA2 | API 실패 시 로컬-only 전환 | {OK/WARN — 사유} |
| DA3 | 동기화 누락 건 확인        | {OK/WARN — 사유} |
───────────────────────────────────
판정: {PASS — 8/8} 또는 {FAIL — n/8}
═══════════════════════════════════
```

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 사용자 미확인 상태에서 티켓 상태 변경 금지 | 워크플로우 혼란 |
| 2 | API 키/토큰을 산출물에 노출 금지 | 보안 사고 |
| 3 | 운영 데이터 임의 삭제/수정 금지 | 복구 불가 데이터 손실 |

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **분기 D⁺ 정책 무시 신규 권유**: Notion 사용을 신규 프로젝트에 권유 → 분기 D⁺ (외부 SaaS 의존 0) 정책 위배. 본 스킬은 **레거시 호환용**. 신규는 internal-ticket.
- ❌ **NOTION_API_KEY 환경변수 누락 시 추측**: 키 없으면 묻지 말고 차단. 추측 호출 → 에러 카탈로그 누적.
- ❌ **Rate Limit 무시 일괄 동기화**: 100건 이상을 동시 호출 → 429 응답. Notion API rate limit (3 req/s) 준수 + 배치 처리.
- ❌ **로컬 변경 우선 합의 없음**: Notion vs 로컬 internal-ticket 양쪽 수정 시 충돌 해결 정책 없음. internal-ticket = SSoT, Notion = mirror. 충돌 시 internal-ticket 우선.
- ❌ **DB 스키마 변경 자동 적용**: Notion DB 컬럼 추가/삭제를 코드가 자동 처리 → 데이터 손실. 스키마 변경은 사용자 명시 마이그레이션.
- ❌ **API 키 코드 하드코딩**: NOTION_API_KEY를 SKILL.md 또는 산출물에 평문 → 유출. 환경변수 또는 사용자 입력만.
