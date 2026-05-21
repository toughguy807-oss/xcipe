# 요구사항정의서 (REQ)

- **프로젝트**: ELUO SYS
- **코드**: ESYS
- **버전**: v1.0
- **작성일**: 2026-03-19
- **모드**: 독립 모드 (선행 QST 없음)

---

## 1. 범위 경계 정의 (SOW Boundary)

| # | 영역 | 항목 | In | Out | Nego | 비고 |
|---|------|------|:--:|:---:|:----:|------|
| 1 | 백엔드 | Express.js REST API | ✓ | | | Node.js 20+ |
| 2 | 백엔드 | SQLite DB 계층 | ✓ | | | better-sqlite3 |
| 3 | 백엔드 | JWT 인증 | ✓ | | | 단일 관리자 |
| 4 | 백엔드 | MCP 서버 | ✓ | | | Claude Code 통합 |
| 5 | 프론트 | 관리자 대시보드 | ✓ | | | Vanilla HTML/JS |
| 6 | 프론트 | 사용자 등록 UI | | ✓ | | 관리자 단일 계정 |
| 7 | 인프라 | 클라우드 배포 | | ✓ | | 로컬 실행 우선 |
| 8 | 인프라 | Docker 컨테이너 | | | ✓ | v2 고려 |
| 9 | 데이터 | 기존 산출물 마이그레이션 | | | ✓ | 수동 import 가능 |
| 10 | 테스트 | 유닛 테스트 | | ✓ | | v2 범위 |
| 11 | 테스트 | E2E 테스트 | | ✓ | | v2 범위 |
| 12 | 운영 | 모니터링/알림 | | ✓ | | v2 범위 |
| 13 | 백엔드 | 스킬 설치/업데이트 자동화 | ✓ | | | hub.js 핵심 |
| 14 | 백엔드 | 프로젝트 CRUD | ✓ | | | API + DB |
| 15 | 백엔드 | 티켓 라이프사이클 관리 | ✓ | | | 운영 워크플로우 |
| 16 | 프론트 | 실시간 WebSocket | | | ✓ | SSE 대안 |

---

## 2. 기능 요구사항 (FR)

### FR-001: 스킬 레지스트리 관리
- **우선순위**: Must
- **설명**: 설치된 스킬 목록을 조회·등록·삭제한다. 스킬 메타데이터(이름, 버전, 설명, 의존성)를 관리한다.
- **AC**:
  1. `GET /api/skills` → 전체 스킬 목록 반환 (200)
  2. `POST /api/skills` → 스킬 등록 (201), 중복 시 409
  3. `DELETE /api/skills/:id` → 스킬 삭제 (200), 미존재 시 404
  4. 스킬 메타데이터에 name, version, description, type, dependencies 포함

### FR-002: 스킬 버전 관리
- **우선순위**: Must
- **설명**: 스킬의 버전 이력을 추적하고, 업데이트 시 이전 버전을 보존한다.
- **AC**:
  1. `PUT /api/skills/:id` → 버전 업데이트 (200), 이전 버전 history 테이블에 기록
  2. `GET /api/skills/:id/history` → 버전 이력 조회
  3. SemVer(major.minor.patch) 형식 강제

### FR-003: 스킬 설치 자동화
- **우선순위**: Must
- **설명**: GitHub 또는 로컬 경로에서 스킬 패키지를 읽어 자동 설치한다.
- **AC**:
  1. `POST /api/skills/install` body: `{source: "local", path: "..."}` → 스킬 폴더 스캔 + DB 등록
  2. `POST /api/skills/install` body: `{source: "github", repo: "..."}` → clone + 설치
  3. SKILL.md 파싱하여 메타데이터 자동 추출
  4. 설치 실패 시 롤백 + 에러 메시지 반환

### FR-004: 프로젝트 CRUD
- **우선순위**: Must
- **설명**: 프로젝트를 생성·조회·수정·삭제한다. 프로젝트별 메타데이터와 상태를 관리한다.
- **AC**:
  1. `POST /api/projects` → 프로젝트 생성 (201)
  2. `GET /api/projects` → 전체 목록 조회 (pagination 지원)
  3. `GET /api/projects/:id` → 단건 조회 (산출물 수, 티켓 수 포함)
  4. `PUT /api/projects/:id` → 수정 (200)
  5. `DELETE /api/projects/:id` → 소프트 삭제 (archived 상태)
  6. 프로젝트 상태: active, paused, completed, archived

### FR-005: 프로젝트 산출물 추적
- **우선순위**: Must
- **설명**: 프로젝트별 산출물(REQ, FN, IA, WBS 등) 생성 현황을 추적한다.
- **AC**:
  1. `GET /api/projects/:id/artifacts` → 산출물 목록 (type, version, created_at)
  2. `POST /api/projects/:id/artifacts` → 산출물 등록 (파일 경로 + 메타데이터)
  3. 산출물 타입: QST, REQ, FN, IA, WBS, SB, MARKUP, STYLE, JS, QA
  4. 각 산출물에 META 블록 파싱 결과 저장

### FR-006: 티켓 관리
- **우선순위**: Must
- **설명**: 운영 티켓을 생성·할당·상태 변경·종료한다.
- **AC**:
  1. `POST /api/tickets` → 티켓 생성 (201)
  2. `GET /api/tickets` → 목록 조회 (status 필터, project 필터)
  3. `PUT /api/tickets/:id/status` → 상태 변경 (open→in_progress→resolved→closed)
  4. 티켓 타입: TXT, STR, FNC, IMG, BUG
  5. 각 티켓에 항목(items) 배열 포함

### FR-007: 티켓 히스토리
- **우선순위**: Should
- **설명**: 티켓의 상태 변경, 코멘트 추가 등 이벤트를 이력으로 기록한다.
- **AC**:
  1. `GET /api/tickets/:id/history` → 이벤트 이력 조회
  2. 상태 변경, 코멘트, 산출물 연결 시 자동 기록
  3. 이벤트에 actor, action, detail, timestamp 포함

### FR-008: JWT 인증
- **우선순위**: Must
- **설명**: 관리자 인증을 JWT 토큰 기반으로 처리한다.
- **AC**:
  1. `POST /api/auth/login` → email + password → JWT 발급 (1h)
  2. `POST /api/auth/refresh` → 토큰 갱신
  3. 보호 API 호출 시 `Authorization: Bearer <token>` 필수
  4. 유효하지 않은 토큰 → 401
  5. 초기 관리자 계정은 서버 첫 실행 시 환경변수로 생성

### FR-009: MCP 서버
- **우선순위**: Must
- **설명**: Claude Code에서 ELUO SYS를 도구로 사용할 수 있도록 MCP 서버를 제공한다.
- **AC**:
  1. MCP 도구: `eluo_list_skills`, `eluo_install_skill`, `eluo_list_projects`, `eluo_create_ticket`, `eluo_project_status`
  2. stdio 기반 MCP 프로토콜 구현
  3. 각 도구에 inputSchema (JSON Schema) 정의
  4. 에러 시 isError: true + 명확한 에러 메시지

### FR-010: 대시보드 — 프로젝트 현황
- **우선순위**: Must
- **설명**: 전체 프로젝트 현황을 한눈에 볼 수 있는 대시보드를 제공한다.
- **AC**:
  1. 프로젝트 목록 카드 (이름, 상태, 산출물 진행률, 티켓 수)
  2. 전체 통계: 총 프로젝트, 활성 프로젝트, 총 산출물, 열린 티켓
  3. 최근 활동 피드 (최근 10건)
  4. Chart.js 파이 차트: 프로젝트 상태 분포

### FR-011: 대시보드 — 스킬 관리
- **우선순위**: Must
- **설명**: 설치된 스킬 목록과 상태를 대시보드에서 관리한다.
- **AC**:
  1. 스킬 목록 테이블 (이름, 버전, 타입, 설치일)
  2. 스킬 설치 폼 (로컬 경로 입력)
  3. 스킬 삭제 버튼 + 확인 모달
  4. 스킬 상세 보기 (메타데이터 + 버전 이력)

### FR-012: 대시보드 — 티켓 보드
- **우선순위**: Should
- **설명**: 칸반 형태의 티켓 보드를 제공한다.
- **AC**:
  1. 4열 칸반: Open → In Progress → Resolved → Closed
  2. 티켓 카드에 제목, 프로젝트, 타입 배지 표시
  3. 드래그앤드롭 상태 변경 (v2 — 초기엔 버튼 클릭)
  4. 프로젝트별 필터

### FR-013: 활동 로그
- **우선순위**: Should
- **설명**: 시스템 전체 활동을 로그로 기록하고 조회한다.
- **AC**:
  1. `GET /api/activity` → 최근 활동 목록 (pagination)
  2. 기록 대상: 스킬 설치/삭제, 프로젝트 생성/상태변경, 티켓 변경, 산출물 등록
  3. 각 로그에 entity_type, entity_id, action, detail, timestamp

### FR-014: 시스템 설정
- **우선순위**: Could
- **설명**: 시스템 설정(포트, 비밀키 등)을 환경변수 또는 .env로 관리한다.
- **AC**:
  1. `GET /api/settings` → 현재 설정 조회 (민감 정보 마스킹)
  2. 환경변수: PORT, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, DB_PATH
  3. .env 파일 미존재 시 기본값 적용

---

## 3. 비기능 요구사항 (NFR)

### NFR-001: 성능
- 서버 응답 시간: 95% 요청 < 200ms
- SQLite WAL 모드 활성화 (동시 읽기 성능)
- 대시보드 초기 로딩 < 2초

### NFR-002: 보안
- JWT 만료: 1시간 (갱신 가능)
- 비밀번호: bcrypt 해싱 (salt rounds 12)
- SQL Injection 방지: prepared statements 필수
- XSS 방지: HTML 이스케이프 처리
- CORS: 설정 가능한 origin

### NFR-003: 호환성
- Node.js 20+ (LTS)
- Windows 11 / macOS / Linux 지원
- SQLite 3.35+ (RETURNING 절 활용)
- 브라우저: Chrome/Edge 최신 2버전

### NFR-004: 유지보수성
- 모듈별 분리 (db.js, hub.js, auth.js, mcp-server.js)
- JSDoc 주석 (공개 함수)
- 에러 코드 체계: ESYS-{모듈}-{번호}

### NFR-005: 데이터 무결성
- SQLite 외래키 강제 (PRAGMA foreign_keys = ON)
- 소프트 삭제 (deleted_at 컬럼)
- 트랜잭션 사용 (다중 테이블 변경 시)

---

## 4. 비즈니스 규칙

| # | 규칙 | 적용 FR |
|---|------|---------|
| BR-001 | 스킬 삭제 시 프로젝트에서 사용 중이면 경고 (강제 삭제 가능) | FR-001 |
| BR-002 | 프로젝트 삭제는 소프트 삭제만 허용 (archived 상태) | FR-004 |
| BR-003 | 티켓 상태 역전 금지 (closed→open 불가, 별도 reopen 필요) | FR-006 |
| BR-004 | 초기 관리자 계정은 서버 최초 실행 시 1회만 생성 | FR-008 |
| BR-005 | MCP 도구는 인증 없이 동작 (로컬 stdio 기반) | FR-009 |
| BR-006 | 산출물 META 블록 파싱 실패 시 경고만 (블로킹 아님) | FR-005 |

---

<!-- META {
  "skill": "plan-req",
  "version": "v1",
  "project": "ELUO_SYS",
  "created": "2026-03-19",
  "self_check": "PASS",
  "self_check_detail": "5/5",
  "counts": {
    "fr_count": 14,
    "nfr_count": 5,
    "must": 9,
    "should": 3,
    "could": 2
  },
  "ids": {
    "first_fr": "FR-001",
    "last_fr": "FR-014"
  },
  "dependencies": [],
  "next_skill": "plan-fn"
} -->
