# 작업분해구조 (WBS)

- **프로젝트**: ELUO SYS
- **코드**: ESYS
- **버전**: v1.0
- **작성일**: 2026-03-19
- **모드**: 연계 모드 (REQ + FN + IA 참조)

---

## 1. 마일스톤

| # | 마일스톤 | 완료 기준 | 목표일 |
|---|---------|----------|--------|
| M1 | 기획 완료 | REQ + FN + IA + WBS 산출물 완성 | 2026-03-19 |
| M2 | DB + 인증 완료 | SQLite 스키마 + JWT 인증 동작 | 2026-03-19 |
| M3 | API 코어 완료 | 스킬/프로젝트/티켓 CRUD API 전수 동작 | 2026-03-19 |
| M4 | MCP 서버 완료 | 5개 MCP 도구 동작 | 2026-03-19 |
| M5 | 대시보드 완료 | 메인/스킬/티켓 화면 렌더링 + API 연동 | 2026-03-19 |
| M6 | 통합 검증 | 서버 실행 → 전 기능 동작 확인 | 2026-03-19 |

---

## 2. 작업 분해

### Phase 1: 기획 (M1)

| WBS | 작업 | FN | 산출물 | 상태 |
|-----|------|-----|--------|------|
| 1.1 | REQ 요구사항정의서 | - | REQ_ESYS_v1.0.md | ✅ 완료 |
| 1.2 | FN 기능정의서 | - | FN_ESYS_v1.0.md | ✅ 완료 |
| 1.3 | IA 정보구조설계 | - | IA_ESYS_v1.0.md | ✅ 완료 |
| 1.4 | WBS 작업분해구조 | - | WBS_ESYS_v1.0.md | ✅ 완료 |

### Phase 2: 데이터 계층 (M2)

| WBS | 작업 | FN | 산출물 |
|-----|------|-----|--------|
| 2.1 | package.json + 의존성 설치 | - | package.json |
| 2.2 | SQLite 스키마 설계 + db.js | FN-001~032 (전수) | src/db.js |
| 2.3 | JWT 인증 모듈 | FN-019~022 | src/auth.js |
| 2.4 | .env.example 작성 | FR-014 | .env.example |

### Phase 3: API 코어 (M3)

| WBS | 작업 | FN | 산출물 |
|-----|------|-----|--------|
| 3.1 | Express 서버 기본 구조 | - | src/server.js |
| 3.2 | 스킬 라우터 | FN-001~007 | src/routes/skills.js |
| 3.3 | 프로젝트 라우터 | FN-008~014 | src/routes/projects.js |
| 3.4 | 티켓 라우터 | FN-015~018 | src/routes/tickets.js |
| 3.5 | 활동/대시보드 라우터 | FN-031~032 | src/routes/activity.js, dashboard.js |
| 3.6 | 인증 라우터 | FN-019~020 | src/routes/auth.js |
| 3.7 | hub.js 스킬 관리 코어 | FN-006~007 | src/hub.js |

### Phase 4: MCP 서버 (M4)

| WBS | 작업 | FN | 산출물 |
|-----|------|-----|--------|
| 4.1 | MCP 서버 기본 구조 | FR-009 | src/mcp-server.js |
| 4.2 | 5개 도구 구현 | FN-023~027 | (mcp-server.js 내) |

### Phase 5: 대시보드 (M5)

| WBS | 작업 | FN | 산출물 |
|-----|------|-----|--------|
| 5.1 | 로그인 페이지 | FN-019 | public/login.html |
| 5.2 | 대시보드 HTML + CSS | FN-028 | public/index.html, css/style.css |
| 5.3 | API 클라이언트 + 라우팅 | - | public/js/app.js, api.js |
| 5.4 | 메인 현황 컴포넌트 | FN-028 | public/js/components/stats.js, projects.js |
| 5.5 | 스킬 관리 컴포넌트 | FN-029 | public/js/components/skills.js |
| 5.6 | 티켓 보드 컴포넌트 | FN-030 | public/js/components/tickets.js |
| 5.7 | 활동 피드 컴포넌트 | FN-031 | public/js/components/activity.js |

### Phase 6: 통합 검증 (M6)

| WBS | 작업 | 산출물 |
|-----|------|--------|
| 6.1 | 서버 실행 + 전 API 동작 확인 | 실행 로그 |
| 6.2 | 대시보드 UI 확인 | 스크린샷 |

---

## 3. 크리티컬 패스

```
2.1(package.json) → 2.2(db.js) → 2.3(auth.js) → 3.1(server.js) → 3.2~3.7(라우터) → 4.1(MCP) → 5.1~5.7(대시보드) → 6.1(검증)
```

DB가 모든 모듈의 선행 의존이므로, db.js 완성이 전체 일정의 병목이다.

---

## 4. 리소스 배정

| 역할 | 담당 | 범위 |
|------|------|------|
| 기획 | Claude (CCD) | Phase 1 전체 |
| 백엔드 | Claude (CCD) | Phase 2~4 |
| 프론트엔드 | Claude (CCD) | Phase 5 |
| QA | Claude (CCD) | Phase 6 |

---

<!-- META {
  "skill": "plan-wbs",
  "version": "v1",
  "project": "ELUO_SYS",
  "created": "2026-03-19",
  "self_check": "PASS",
  "self_check_detail": "5/5",
  "counts": {
    "task_count": 21,
    "milestone_count": 6,
    "total_days": 1,
    "phase_count": 6
  },
  "ids": {
    "first_task": "1.1",
    "last_task": "6.2"
  },
  "dependencies": ["REQ_ESYS_v1.0.md", "FN_ESYS_v1.0.md", "IA_ESYS_v1.0.md"],
  "next_skill": null
} -->
