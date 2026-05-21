# 유지운영 관리 (Maintenance)

유지운영 허브(`d:/운영_v2/`)에서 운영 요청을 접수하고 관리합니다.

## 사용법

```
/maintenance [요청 내용]     — 운영 요청 접수 (전체 워크플로우)
/maintenance list [프로젝트]  — 티켓 목록 조회
/maintenance status [티켓ID]  — 티켓 상태 조회
/maintenance sync [프로젝트]  — Notion 동기화
/maintenance projects         — 등록 프로젝트 목록
```

## 실행

maintenance-orchestrator 에이전트를 호출하여 처리합니다.

### 요청 접수 (기본)
사용자의 운영 요청을 받아 프로젝트를 식별하고, 유형을 분류하고, 티켓을 생성한 뒤 적절한 파이프라인을 실행합니다.

### list
`d:/운영_v2/` 하위 프로젝트의 `tickets/_index.md`를 읽어 티켓 목록을 출력합니다.
프로젝트를 지정하면 해당 프로젝트만, 미지정 시 전체 프로젝트 티켓을 표시합니다.

### status
특정 티켓 ID의 상세 정보와 진행 이력을 출력합니다.

### sync
로컬 티켓 데이터를 Notion DB-4와 동기화합니다.
프로젝트를 지정하면 해당 프로젝트만, 미지정 시 전체를 동기화합니다.

### projects
`d:/운영_v2/PROJECT.md`에 등록된 프로젝트 목록을 출력합니다.

$ARGUMENTS
