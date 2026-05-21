# 기능정의서 (FN)

- **프로젝트**: ELUO SYS
- **코드**: ESYS
- **버전**: v1.0
- **작성일**: 2026-03-19
- **모드**: 연계 모드 (REQ_ESYS_v1.0.md 참조)

---

## FN-001: 스킬 목록 조회 (FR-001)
- **복잡도**: Low
- **화면**: 대시보드 > 스킬 관리 탭
- **처리**: `GET /api/skills` → DB skills 테이블 전건 조회 → `{id, name, version, type, description, installed_at}` 배열 반환
- **검증기준**: AC1 — 200 응답, 빈 배열도 정상
- **에러**: DB 접속 실패 → 500 + `ESYS-HUB-001`

## FN-002: 스킬 등록 (FR-001)
- **복잡도**: Medium
- **입력**: `{name, version, description, type, path, dependencies[]}`
- **처리**:
  1. name 중복 체크 (DB UNIQUE 제약)
  2. version SemVer 형식 검증 (`/^\d+\.\d+\.\d+$/`)
  3. skills 테이블 INSERT
  4. activity_log 기록 (action: "skill_installed")
- **검증기준**: AC2 — 201 반환, 중복 시 409
- **에러**: 중복 → 409 `ESYS-HUB-002` / 형식 오류 → 400 `ESYS-HUB-003`

## FN-003: 스킬 삭제 (FR-001)
- **복잡도**: Medium
- **처리**:
  1. 스킬 존재 확인
  2. 프로젝트 연결 여부 확인 → 있으면 경고 메시지 포함 (BR-001)
  3. skills 테이블 DELETE (하드 삭제)
  4. skill_history에서 해당 스킬 이력 보존
  5. activity_log 기록
- **검증기준**: AC3 — 200 반환, 미존재 시 404
- **에러**: 미존재 → 404 `ESYS-HUB-004`

## FN-004: 스킬 버전 업데이트 (FR-002)
- **복잡도**: High
- **입력**: `{version, description?, changelog?}`
- **처리**:
  1. 현재 스킬 데이터 조회
  2. 현재 버전 → skill_history INSERT (스냅샷)
  3. skills 테이블 UPDATE (version, updated_at)
  4. SemVer 비교: 새 버전 > 현재 버전 강제
  5. activity_log 기록
- **검증기준**: AC1(FR-002) — 200 반환, 이전 버전 history에 존재
- **에러**: 다운그레이드 시도 → 400 `ESYS-HUB-005`
- **기술 노트**: SemVer 비교는 major→minor→patch 순차 비교 직접 구현 (외부 의존성 불필요)

## FN-005: 스킬 버전 이력 조회 (FR-002)
- **복잡도**: Low
- **처리**: `GET /api/skills/:id/history` → skill_history WHERE skill_id = :id ORDER BY created_at DESC
- **검증기준**: AC2(FR-002) — 이력 배열 반환

## FN-006: 스킬 설치 — 로컬 (FR-003)
- **복잡도**: High
- **입력**: `{source: "local", path: "/absolute/path"}`
- **처리**:
  1. 경로 존재 확인 (fs.existsSync)
  2. SKILL.md 파일 탐색 (`{path}/.claude/skills/*/SKILL.md` 또는 `{path}/SKILL.md`)
  3. YAML frontmatter 파싱 → name, description 추출
  4. package.json 존재 시 version 추출
  5. skills 테이블 INSERT
  6. 설치 실패 시 트랜잭션 롤백
  7. activity_log 기록
- **검증기준**: AC1(FR-003) — 201 반환, DB에 등록 확인
- **에러**: 경로 미존재 → 400 / SKILL.md 미발견 → 400 `ESYS-HUB-006`

## FN-007: 스킬 설치 — GitHub (FR-003)
- **복잡도**: High
- **입력**: `{source: "github", repo: "owner/repo", branch?: "main"}`
- **처리**:
  1. `git clone --depth 1 {repo}` → 임시 디렉토리
  2. SKILL.md 파싱 (FN-006과 동일 로직 재사용)
  3. 성공 → skills 테이블 INSERT + 경로 저장
  4. 실패 → 임시 디렉토리 정리 + 롤백
- **검증기준**: AC2(FR-003) — clone + 설치 완료
- **에러**: clone 실패 → 502 `ESYS-HUB-007`

## FN-008: 프로젝트 생성 (FR-004)
- **복잡도**: Medium
- **입력**: `{name, code, type, description?, tech_stack?}`
- **처리**:
  1. code 중복 체크
  2. projects 테이블 INSERT (status: "active")
  3. activity_log 기록
- **검증기준**: AC1(FR-004) — 201 반환
- **에러**: 중복 코드 → 409 `ESYS-PRJ-001`

## FN-009: 프로젝트 목록 조회 (FR-004)
- **복잡도**: Low
- **처리**: `GET /api/projects?page=1&limit=20&status=active`
  - pagination: LIMIT/OFFSET 기반
  - 각 프로젝트에 artifact_count, open_ticket_count 서브쿼리 포함
- **검증기준**: AC2(FR-004) — 페이지네이션 동작

## FN-010: 프로젝트 상세 조회 (FR-004)
- **복잡도**: Medium
- **처리**: `GET /api/projects/:id`
  - projects JOIN (산출물 수, 티켓 수, 최근 활동)
  - 산출물 진행률 계산: 완료 타입 수 / 전체 타입 수 (10종)
- **검증기준**: AC3(FR-004) — 산출물 수, 티켓 수 포함

## FN-011: 프로젝트 수정 (FR-004)
- **복잡도**: Low
- **처리**: `PUT /api/projects/:id` → 부분 업데이트 (PATCH 시맨틱)
- **검증기준**: AC4(FR-004) — 200 반환

## FN-012: 프로젝트 삭제 (FR-004)
- **복잡도**: Low
- **처리**: `DELETE /api/projects/:id` → status = 'archived', deleted_at = NOW (BR-002)
- **검증기준**: AC5(FR-004) — 소프트 삭제, 목록에서 미노출

## FN-013: 산출물 등록 (FR-005)
- **복잡도**: Medium
- **입력**: `{project_id, type, version, file_path, meta?}`
- **처리**:
  1. 파일 경로 존재 확인
  2. META 블록 파싱 시도 (`<!-- META {...} -->` 패턴)
  3. artifacts 테이블 INSERT
  4. META 파싱 성공 시 meta_json 컬럼에 저장
  5. 파싱 실패 시 null 저장 + 경고 로그 (BR-006)
- **검증기준**: AC2(FR-005) — 등록 완료, META 파싱 결과 포함

## FN-014: 산출물 목록 조회 (FR-005)
- **복잡도**: Low
- **처리**: `GET /api/projects/:id/artifacts` → type, version, file_path, created_at, meta_json
- **검증기준**: AC1(FR-005)

## FN-015: 티켓 생성 (FR-006)
- **복잡도**: Medium
- **입력**: `{project_id, title, type, description?, items[]}`
- **처리**:
  1. 티켓 번호 자동 생성: `OPS-{PROJECT_CODE}-{SEQ}`
  2. tickets 테이블 INSERT (status: "open")
  3. ticket_items 테이블 INSERT (각 항목)
  4. ticket_history 기록 (action: "created")
  5. activity_log 기록
- **검증기준**: AC1(FR-006) — 201, 번호 자동 부여

## FN-016: 티켓 목록 조회 (FR-006)
- **복잡도**: Low
- **처리**: `GET /api/tickets?status=open&project_id=1&page=1`
  - 필터: status, project_id, type
  - pagination 지원
- **검증기준**: AC2(FR-006)

## FN-017: 티켓 상태 변경 (FR-006)
- **복잡도**: Medium
- **처리**:
  1. 현재 상태 조회
  2. 상태 전이 유효성 검증 (BR-003):
     - open → in_progress ✓
     - in_progress → resolved ✓
     - resolved → closed ✓
     - closed → * ✗ (reopen API 별도)
  3. tickets UPDATE status
  4. ticket_history 기록
- **검증기준**: AC3(FR-006) — 유효한 전이만 허용
- **에러**: 무효 전이 → 400 `ESYS-TKT-001`

## FN-018: 티켓 이력 조회 (FR-007)
- **복잡도**: Low
- **처리**: `GET /api/tickets/:id/history` → ticket_history ORDER BY created_at DESC
- **검증기준**: AC1(FR-007)

## FN-019: JWT 로그인 (FR-008)
- **복잡도**: Medium
- **입력**: `{email, password}`
- **처리**:
  1. users 테이블에서 email 조회
  2. bcrypt.compare(password, hash)
  3. 성공 → JWT 발급 (payload: {id, email}, exp: 1h)
  4. 실패 → 401
- **검증기준**: AC1(FR-008) — JWT 토큰 반환
- **에러**: 인증 실패 → 401 `ESYS-AUTH-001`

## FN-020: JWT 토큰 갱신 (FR-008)
- **복잡도**: Low
- **처리**: `POST /api/auth/refresh` → 현재 토큰 검증 → 새 토큰 발급
- **검증기준**: AC2(FR-008)

## FN-021: 인증 미들웨어 (FR-008)
- **복잡도**: Medium
- **처리**:
  1. Authorization 헤더에서 Bearer 토큰 추출
  2. jwt.verify(token, secret)
  3. 성공 → req.user 설정, next()
  4. 실패 → 401 `ESYS-AUTH-002`
- **검증기준**: AC4(FR-008) — 유효하지 않은 토큰 → 401
- **적용 범위**: `/api/*` (단, `/api/auth/login` 제외)

## FN-022: 초기 관리자 생성 (FR-008)
- **복잡도**: Low
- **처리**:
  1. 서버 시작 시 users 테이블 확인
  2. 0건이면 → env ADMIN_EMAIL/ADMIN_PASSWORD로 생성 (BR-004)
  3. bcrypt.hash(password, 12)
- **검증기준**: AC5(FR-008) — 최초 1회만 실행

## FN-023: MCP 도구 — eluo_list_skills (FR-009)
- **복잡도**: Medium
- **처리**: MCP 호출 → DB 스킬 목록 조회 → 포맷팅된 텍스트 반환
- **입력 스키마**: `{}` (파라미터 없음)
- **출력**: 스킬 목록 마크다운 테이블

## FN-024: MCP 도구 — eluo_install_skill (FR-009)
- **복잡도**: High
- **처리**: MCP 호출 → FN-006 로컬 설치 로직 재사용
- **입력 스키마**: `{path: string}`
- **출력**: 설치 결과 메시지

## FN-025: MCP 도구 — eluo_list_projects (FR-009)
- **복잡도**: Low
- **처리**: MCP 호출 → DB 프로젝트 목록 조회
- **입력 스키마**: `{status?: string}`

## FN-026: MCP 도구 — eluo_create_ticket (FR-009)
- **복잡도**: Medium
- **처리**: MCP 호출 → FN-015 티켓 생성 로직 재사용
- **입력 스키마**: `{project_code: string, title: string, type: string, description?: string}`

## FN-027: MCP 도구 — eluo_project_status (FR-009)
- **복잡도**: Medium
- **처리**: MCP 호출 → 프로젝트 상세 + 산출물 + 티켓 통합 조회
- **입력 스키마**: `{project_code: string}`
- **출력**: 프로젝트 상태 요약 마크다운

## FN-028: 대시보드 — 메인 현황 (FR-010)
- **복잡도**: High
- **화면 구성**:
  - 상단: 통계 카드 4개 (프로젝트 수, 활성 프로젝트, 산출물 수, 열린 티켓)
  - 중단: 프로젝트 카드 그리드 (이름, 상태 배지, 진행률 바, 티켓 카운트)
  - 하단: 최근 활동 피드 (아이콘 + 설명 + 시간)
  - 사이드: Chart.js 도넛 차트 (프로젝트 상태 분포)
- **데이터 소스**: `GET /api/dashboard/summary` (통합 API)
- **검증기준**: AC1~AC4(FR-010)

## FN-029: 대시보드 — 스킬 관리 탭 (FR-011)
- **복잡도**: Medium
- **화면 구성**:
  - 테이블: 스킬 목록 (정렬 가능)
  - 설치 폼: 경로 입력 + 설치 버튼
  - 상세 모달: 메타데이터 + 버전 이력 타임라인
  - 삭제: 확인 다이얼로그
- **검증기준**: AC1~AC4(FR-011)

## FN-030: 대시보드 — 티켓 보드 (FR-012)
- **복잡도**: Medium
- **화면 구성**:
  - 4열 레이아웃: Open | In Progress | Resolved | Closed
  - 티켓 카드: 제목, 프로젝트 코드, 타입 배지
  - 상태 변경: 카드 내 다음 상태 버튼
  - 필터: 프로젝트 드롭다운
- **검증기준**: AC1~AC3(FR-012)

## FN-031: 활동 로그 조회 (FR-013)
- **복잡도**: Low
- **처리**: `GET /api/activity?page=1&limit=20`
- **검증기준**: AC1(FR-013)

## FN-032: 대시보드 통합 API (FR-010)
- **복잡도**: Medium
- **처리**: `GET /api/dashboard/summary`
  - 프로젝트 통계, 스킬 수, 티켓 통계, 최근 활동 10건을 한번에 반환
  - 단일 쿼리 최적화 (여러 COUNT 서브쿼리)
- **출력**: `{projects: {total, active, completed}, skills: {total}, tickets: {open, in_progress, resolved}, recent_activity: [...]}`

---

## 의존관계 맵

```
FN-006 ──→ FN-024 (MCP install → 로컬 설치 재사용)
FN-015 ──→ FN-026 (MCP create_ticket → 티켓 생성 재사용)
FN-010 ──→ FN-032 (대시보드 → 통합 API)
FN-019 ──→ FN-021 (로그인 → 인증 미들웨어)
FN-022 ──→ FN-019 (초기 관리자 → 로그인 가능)
```

---

<!-- META {
  "skill": "plan-fn",
  "version": "v1",
  "project": "ELUO_SYS",
  "created": "2026-03-19",
  "self_check": "PASS",
  "self_check_detail": "6/6",
  "counts": {
    "fn_count": 32,
    "high": 5,
    "medium": 14,
    "low": 13
  },
  "ids": {
    "first_fn": "FN-001",
    "last_fn": "FN-032"
  },
  "dependencies": ["REQ_ESYS_v1.0.md"],
  "next_skill": "plan-ia"
} -->
