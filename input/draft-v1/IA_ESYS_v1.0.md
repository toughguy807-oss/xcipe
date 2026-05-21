# 정보구조설계 (IA)

- **프로젝트**: ELUO SYS
- **코드**: ESYS
- **버전**: v1.0
- **작성일**: 2026-03-19
- **모드**: 연계 모드 (REQ + FN 참조)

---

## 1. 시스템 구조 (사이트맵)

ELUO SYS는 웹사이트가 아닌 **Node.js 서버 + 단일 페이지 대시보드** 구조이므로, IA는 API 엔드포인트 구조 + 대시보드 UI 구조로 정의한다.

### 1.1 API 엔드포인트 구조

```
/api
├── /auth
│   ├── POST /login              ← FN-019
│   └── POST /refresh            ← FN-020
├── /skills
│   ├── GET /                    ← FN-001
│   ├── POST /                   ← FN-002
│   ├── POST /install            ← FN-006, FN-007
│   ├── GET /:id                 ← (단건 조회)
│   ├── PUT /:id                 ← FN-004
│   ├── DELETE /:id              ← FN-003
│   └── GET /:id/history         ← FN-005
├── /projects
│   ├── GET /                    ← FN-009
│   ├── POST /                   ← FN-008
│   ├── GET /:id                 ← FN-010
│   ├── PUT /:id                 ← FN-011
│   ├── DELETE /:id              ← FN-012
│   └── GET /:id/artifacts       ← FN-014
│       └── POST /               ← FN-013
├── /tickets
│   ├── GET /                    ← FN-016
│   ├── POST /                   ← FN-015
│   ├── GET /:id
│   ├── PUT /:id/status          ← FN-017
│   └── GET /:id/history         ← FN-018
├── /activity
│   └── GET /                    ← FN-031
├── /dashboard
│   └── GET /summary             ← FN-032
└── /settings
    └── GET /                    ← FR-014
```

### 1.2 대시보드 UI 구조

```
IA-P001: 로그인 페이지
  └── 이메일 + 비밀번호 폼

IA-P002: 대시보드 메인 (/)
  ├── IA-N001: 사이드바 내비게이션
  │   ├── 대시보드 (홈)
  │   ├── 프로젝트
  │   ├── 스킬
  │   ├── 티켓
  │   └── 설정
  ├── IA-C001: 통계 카드 영역
  │   ├── 총 프로젝트 수
  │   ├── 활성 프로젝트 수
  │   ├── 총 산출물 수
  │   └── 열린 티켓 수
  ├── IA-C002: 프로젝트 카드 그리드
  │   └── 프로젝트 카드 (이름, 상태 배지, 진행률 바, 티켓 수)
  ├── IA-C003: 상태 분포 차트 (도넛)
  └── IA-C004: 최근 활동 피드

IA-P003: 프로젝트 상세 (/projects/:id)
  ├── 프로젝트 정보 헤더
  ├── 산출물 목록 테이블
  ├── 티켓 목록
  └── 활동 이력

IA-P004: 스킬 관리 (/skills)
  ├── 스킬 테이블 (정렬 가능)
  ├── 설치 폼
  └── 상세 모달 (메타데이터 + 버전 이력)

IA-P005: 티켓 보드 (/tickets)
  ├── 프로젝트 필터 드롭다운
  └── 4열 칸반 (Open | In Progress | Resolved | Closed)
      └── 티켓 카드 (제목, 프로젝트, 타입 배지, 상태 변경 버튼)

IA-P006: 설정 (/settings)
  └── 시스템 설정 표시 (읽기 전용)
```

---

## 2. 파일 구조 (소스코드)

```
d:/ELUO_SYS/
├── src/
│   ├── server.js           ← Express 앱 + 라우팅 + 정적 파일 서빙
│   ├── db.js               ← SQLite 초기화 + 스키마 + 쿼리 함수
│   ├── hub.js              ← 스킬 레지스트리 + 설치/업데이트 로직
│   ├── auth.js             ← JWT 발급/검증 + bcrypt + 미들웨어
│   ├── mcp-server.js       ← MCP 도구 정의 + stdio 서버
│   └── routes/
│       ├── skills.js       ← /api/skills 라우터
│       ├── projects.js     ← /api/projects 라우터
│       ├── tickets.js      ← /api/tickets 라우터
│       ├── activity.js     ← /api/activity 라우터
│       ├── dashboard.js    ← /api/dashboard 라우터
│       └── auth.js         ← /api/auth 라우터
├── public/
│   ├── index.html          ← 대시보드 SPA (Vanilla JS)
│   ├── login.html          ← 로그인 페이지
│   ├── css/
│   │   └── style.css       ← 대시보드 스타일
│   └── js/
│       ├── app.js          ← 라우팅 + 상태 관리
│       ├── api.js          ← API 클라이언트
│       └── components/
│           ├── stats.js    ← 통계 카드
│           ├── projects.js ← 프로젝트 그리드
│           ├── skills.js   ← 스킬 테이블
│           ├── tickets.js  ← 티켓 보드
│           └── activity.js ← 활동 피드
├── data/
│   └── eluo.db             ← SQLite 데이터베이스 (자동 생성)
├── package.json
├── .env.example
├── PROJECT.md
└── output/                 ← 기획 산출물
```

---

## 3. DB 스키마 (SQLite)

### 테이블 목록

| 테이블 | 설명 | FN 매핑 |
|--------|------|---------|
| users | 관리자 계정 | FN-019, FN-022 |
| skills | 스킬 레지스트리 | FN-001~003, FN-006 |
| skill_history | 스킬 버전 이력 | FN-004, FN-005 |
| projects | 프로젝트 | FN-008~012 |
| artifacts | 산출물 | FN-013, FN-014 |
| tickets | 티켓 | FN-015~017 |
| ticket_items | 티켓 항목 | FN-015 |
| ticket_history | 티켓 이력 | FN-017, FN-018 |
| activity_log | 활동 로그 | FN-031 |

---

## 4. 네비게이션 설계

### 사이드바 (IA-N001)
| 순서 | 메뉴 | 아이콘 | 경로 | FN 매핑 |
|------|------|--------|------|---------|
| 1 | 대시보드 | LayoutDashboard | / | FN-028, FN-032 |
| 2 | 프로젝트 | FolderKanban | /projects | FN-009 |
| 3 | 스킬 | Puzzle | /skills | FN-029 |
| 4 | 티켓 | TicketCheck | /tickets | FN-030 |
| 5 | 설정 | Settings | /settings | FR-014 |

---

<!-- META {
  "skill": "plan-ia",
  "version": "v1",
  "project": "ELUO_SYS",
  "created": "2026-03-19",
  "self_check": "PASS",
  "self_check_detail": "5/5",
  "counts": {
    "page_count": 6,
    "depth_max": 3,
    "gnb_count": 5,
    "api_endpoint_count": 22,
    "table_count": 9
  },
  "ids": {
    "first_page": "IA-P001",
    "last_page": "IA-P006"
  },
  "dependencies": ["REQ_ESYS_v1.0.md", "FN_ESYS_v1.0.md"],
  "next_skill": "plan-wbs"
} -->
