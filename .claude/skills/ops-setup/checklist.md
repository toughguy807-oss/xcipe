# ops-setup Reviewer Checklist

> reviewer unit 모드에서 사용하는 검수 체크리스트

## 환경 설정 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 1 | 허브 경로 감지 | CWD 기반 허브 루트 정확히 판별 (하드코딩 경로 0건) | |
| 2 | 기존 설정 보존 | 재실행 시 기존 notion-config.json 덮어쓰기 전 확인 | |
| 3 | Python 가용성 | sys.executable 확인 후 미설치 시 안내 메시지 출력 | |

## Notion 연동 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 4 | 토큰 유효성 | Notion API /v1/users/me 호출 성공 (401/403 시 재입력 안내) | |
| 5 | DB 연결 | parent_db_id로 DB 조회 성공 (404 시 ID 재확인 안내) | |
| 6 | 스킵 동작 | "로컬만" 선택 시 enabled: false 정상 설정 | |

## IMAP 연동 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 7 | 연결 테스트 | IMAP4_SSL 로그인 성공 + UNSEEN 카운트 출력 | |
| 8 | 필터 설정 | skip_domains 입력값이 배열로 정상 저장 | |
| 9 | 스킵 동작 | "스킵" 선택 시 email.enabled: false 정상 설정 | |

## 프로젝트 등록 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 10 | 폴더 구조 | 7개 디렉토리 정상 생성 (PROJECT.md + input/ + output/4 + tickets/ + .claude/) | |
| 11 | PROJECT.md | 필수 6필드 전수 기입 (프로젝트명/코드/업종/URL/유형/시작일) | |
| 12 | .claude/CLAUDE.md | 파이프라인 + 산출물 경로 + 스킬 목록 포함 | |
| 13 | tickets/_index.md | 인덱스 테이블 헤더 정상 생성 | |
| 14 | Notion 페이지 | 연동 시 프로젝트 페이지 + Tasks DB 생성 확인 | |

## Config 파일 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 15 | notion-config.json | JSON 파싱 정상 + 필수 키 존재 (auth/pages/ops) | |
| 16 | 허브 PROJECT.md | 등록 프로젝트 테이블에 행 추가 완료 | |
| 17 | 보안 | 토큰/비밀번호가 config 파일에만 저장 (산출물/로그 미노출) | |

## GitHub 연동 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 20 | 스킵 동작 | "스킵" 선택 시 github.enabled: false 정상 설정 | |
| 21 | App 설치 안내 | Claude GitHub App 설치 URL + 안내 메시지 출력 | |
| 22 | Workflow 생성 | .github/workflows/claude.yml 정상 생성 (YAML 파싱 가능) | |
| 23 | Secret 안내 | ANTHROPIC_API_KEY Secret 등록 절차 안내 포함 | |
| 24 | config 반영 | notion-config.json에 github 섹션 정상 추가 | |

## 완료 보고 검증

| # | 항목 | 판정 기준 | Pass/Fail |
|---|------|----------|-----------|
| 25 | 완료 박스 | 허브 경로/Notion/IMAP/GitHub/프로젝트 수 정확히 표시 | |
| 26 | 다음 단계 | 세션 재시작 + /maintenance 안내 포함 | |

---

## 합격 기준
- **PASS**: 26/26 항목 전수 Pass (스킵 단계 N/A 처리 허용)
- **CONDITIONAL**: 20/26 이상 Pass + Fail 항목이 스킵 가능 단계
- **BLOCK**: 19/26 이하 또는 보안(#17) Fail
