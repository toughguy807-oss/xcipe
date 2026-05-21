---
name: internal-ticket
description: >
  SYS_v4 자체 티켓 CRUD 스킬. 외부 SaaS 의존 없이 로컬 파일(tickets/*.md + _index.json)
  기반으로 티켓을 생성/조회/갱신/이관합니다. Notion 의존을 대체합니다 (분기 D⁺).
user-invocable: false
---

# Internal Ticket (SYS_v4 자체 티켓)

당신은 **SYS_v4 자체 티켓 관리자**입니다.
외부 SaaS(Notion 등) 없이 로컬 파일만으로 티켓 CRUD를 수행합니다.

## 전제조건

- **필수**: CWD에 `tickets/` 폴더 (없으면 자동 생성)
- **필수**: `~/.claude/skills/internal-ticket/schema/ticket.schema.json` 참조
- **권장**: `maintenance-intake`로 프로젝트 식별 후 호출

> 인터넷/API 토큰/외부 DB **불필요**. Git 친화적 (md + json).

---

## 데이터 구조

```
{프로젝트}/
├── tickets/
│   ├── _index.json              # 검색·집계용 캐시 (모든 티켓 메타)
│   ├── TKT-2026-0001.md         # 티켓 = frontmatter + body
│   └── TKT-2026-0002.md
└── PROJECT.md                   # 프로젝트 메타 (maintenance-intake 생성)
```

### 티켓 파일 형식

```markdown
---
id: TKT-2026-0001
title: 둘레길 메인 안내 문구 추가
project_code: VGN
type: change
status: in-progress
priority: P2
pipeline_stage: publish
labels: [content, urgent]
assignee: hj.moon
requester: client-a
created_at: 2026-05-07T10:00:00+09:00
updated_at: 2026-05-07T15:00:00+09:00
due_at: 2026-05-10T18:00:00+09:00
subtasks:
  - { no: 1, title: "텍스트 초안 작성", done: true,  owner: hj.moon, completed_at: 2026-05-07T11:00:00+09:00 }
  - { no: 2, title: "QA 검수",          done: false, owner: null,    completed_at: null }
related_artifacts: [FN-012, IA-P-003]
---

# 본문

상세 설명, 이미지 링크, 외부 참조 등.

## 참고 자료
- [디자인 시안](../output/design/v3.html)
```

### `_index.json` (캐시)

```json
{
  "version": 1,
  "generated_at": "2026-05-07T15:00:00+09:00",
  "tickets": [
    {
      "id": "TKT-2026-0001",
      "title": "둘레길 메인 안내 문구 추가",
      "status": "in-progress",
      "priority": "P2",
      "type": "change",
      "project_code": "VGN",
      "assignee": "hj.moon",
      "updated_at": "2026-05-07T15:00:00+09:00",
      "subtask_done": 1,
      "subtask_total": 2
    }
  ]
}
```

> `_index.json`은 항상 `tickets/*.md`로부터 재생성 가능 (SSoT는 .md). 분실 시 `reindex` 호출.

---

## 기능 1: Create (티켓 생성)

**입력**: 제목, 타입(bug/feature/change/question/chore), 프로젝트 코드(옵션)

```python
import json, uuid, datetime, pathlib, re

def next_ticket_id(tickets_dir):
    year = datetime.datetime.now().year
    pattern = re.compile(rf"^TKT-{year}-(\d{{4}})\.md$")
    nums = [int(m.group(1)) for f in tickets_dir.glob("*.md") if (m := pattern.match(f.name))]
    next_n = max(nums, default=0) + 1
    return f"TKT-{year}-{next_n:04d}"

def create_ticket(tickets_dir, title, type_="change", project_code=None, **kwargs):
    tickets_dir.mkdir(exist_ok=True)
    tid = next_ticket_id(tickets_dir)
    now = datetime.datetime.now().astimezone().isoformat()

    fm = {
        "id": tid,
        "title": title,
        "project_code": project_code,
        "type": type_,
        "status": "open",
        "priority": kwargs.get("priority", "P2"),
        "pipeline_stage": kwargs.get("pipeline_stage"),
        "labels": kwargs.get("labels", []),
        "assignee": kwargs.get("assignee"),
        "requester": kwargs.get("requester"),
        "created_at": now,
        "updated_at": now,
        "subtasks": [],
        "related_artifacts": [],
    }
    body = kwargs.get("body", "")
    write_ticket(tickets_dir / f"{tid}.md", fm, body)
    return tid
```

## 기능 2: Read (조회)

```python
def read_ticket(path):
    text = path.read_text(encoding="utf-8")
    # frontmatter 파싱 (--- ~ ---)
    if not text.startswith("---"):
        raise ValueError("missing frontmatter")
    _, fm_text, body = text.split("---", 2)
    import yaml
    fm = yaml.safe_load(fm_text)
    return fm, body.strip()
```

> YAML 의존이 부담이면 frontmatter를 JSON으로 저장(`---json` 펜스 패턴)도 가능. 기본은 YAML.

## 기능 3: Update (상태/필드 갱신)

```python
def update_ticket(path, **changes):
    fm, body = read_ticket(path)
    fm.update(changes)
    fm["updated_at"] = datetime.datetime.now().astimezone().isoformat()
    write_ticket(path, fm, body)
```

**상태 전이**:
```
open → in-progress → review → done
open → blocked → in-progress (블로커 해소 후)
어디서든 → archived
```

## 기능 4: List (필터·집계)

```python
def list_tickets(tickets_dir, status=None, project_code=None, assignee=None):
    out = []
    for f in tickets_dir.glob("TKT-*.md"):
        fm, _ = read_ticket(f)
        if status and fm.get("status") != status: continue
        if project_code and fm.get("project_code") != project_code: continue
        if assignee and fm.get("assignee") != assignee: continue
        out.append(fm)
    return sorted(out, key=lambda x: x.get("updated_at", ""), reverse=True)
```

## 기능 5: Reindex (인덱스 재생성)

```python
def reindex(tickets_dir):
    items = []
    for f in tickets_dir.glob("TKT-*.md"):
        fm, _ = read_ticket(f)
        items.append({
            "id": fm["id"],
            "title": fm["title"],
            "status": fm["status"],
            "priority": fm.get("priority"),
            "type": fm.get("type"),
            "project_code": fm.get("project_code"),
            "assignee": fm.get("assignee"),
            "updated_at": fm.get("updated_at"),
            "subtask_done": sum(1 for s in fm.get("subtasks", []) if s.get("done")),
            "subtask_total": len(fm.get("subtasks", [])),
        })
    index_path = tickets_dir / "_index.json"
    index_path.write_text(
        json.dumps({
            "version": 1,
            "generated_at": datetime.datetime.now().astimezone().isoformat(),
            "tickets": sorted(items, key=lambda x: x["updated_at"] or "", reverse=True),
        }, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
```

---

## 규칙

1. **로컬 파일이 SSoT** — `_index.json`은 항상 재생성 가능한 캐시
2. **외부 의존 0** — Notion API/DB/네트워크 호출 금지
3. **변경 즉시 인덱스 갱신** — Create/Update 후 reindex 자동 호출
4. **YAML frontmatter** — Git diff 친화적, 사람이 읽기 쉬움
5. **ID 영구 불변** — 한번 발급된 TKT-ID는 archive돼도 유지

---

## Self-Check

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | frontmatter 필수 필드 | id/title/status/type/created_at 존재 |
| 2 | ID 패턴 | `^TKT-\d{4}-\d{4}$` 일치 |
| 3 | 인덱스 정합성 | `_index.json`의 티켓 수 == `*.md` 파일 수 |
| 4 | 상태 enum | open/in-progress/review/blocked/done/archived 중 1 |
| 5 | 외부 호출 0 | Notion API/네트워크 호출 없음 |

---

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 사용자 미확인 상태 변경 금지 | 워크플로우 혼란 |
| 2 | 티켓 .md 파일 임의 삭제 금지 | 데이터 손실 (archive 사용) |
| 3 | _index.json 직접 편집 금지 | reindex로만 갱신 (SSoT 보호) |

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **_index.json 직접 편집**: tickets/*.md 추가 후 _index.json을 손으로 수정 → SSoT 깨짐. reindex 스크립트로만 갱신.
- ❌ **티켓 .md 파일 rm 처리**: 완료 티켓을 삭제 → 이력 손실. archive/ 폴더로 이동만.
- ❌ **티켓 ID 충돌 미검사**: 새 ID 생성 시 기존 ID 중복 체크 없음. _index.json에서 last_id 조회 + 1 의무.
- ❌ **상태 무단 전이**: in_progress → done을 사용자 확인 없이 → 워크플로우 단축. 모든 상태 변경은 사용자 명시 또는 시스템 이벤트 근거 필요.
- ❌ **Notion 동기화 자동 시도**: 분기 D⁺ 정책 (외부 SaaS 의존 0). Notion 코드 경로 호출 금지.
- ❌ **티켓 본문에 PII 평문 저장**: 고객 이메일/전화 등을 .md에 그대로 → 백업 시 유출. 마스킹 또는 별도 안전 저장소.
