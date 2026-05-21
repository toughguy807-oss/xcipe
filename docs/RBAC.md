# RBAC 권한 매트릭스

> **자동 생성 파일** — 직접 수정 금지. `src/rbac-matrix.js`를 수정한 뒤
> `node scripts/sync-rbac-docs.js`로 재생성하세요.

| 구분 | 의미 |
| --- | --- |
| 🌐 public | 인증 불필요 — 누구나 호출 가능 |
| 🔐 authed | 로그인 필요, 역할 무관 |
| 👤 admin / member / guest | 명시된 역할만 호출 가능 |

## 인증 (auth)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/auth/login` | 🌐 public (인증 불필요) |
| `POST /api/auth/refresh` | 🔐 authed (로그인만) |
| `POST /api/auth/invite/:token/accept` | 🌐 public (인증 불필요) |

## 관리자 · 사용자 (admin/users)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `GET /api/admin/users` | 👤 admin |
| `PUT /api/admin/users/:id/role` | 👤 admin |

## 관리자 · 초대 (admin/invite)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/admin/invite` | 👤 admin |

## 관리자 · 설정 (admin/settings)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `PUT /api/admin/settings/ai` | 👤 admin |
| `POST /api/admin/settings/ai/test` | 👤 admin |
| `PUT /api/admin/settings/reviewer` | 👤 admin |
| `POST /api/admin/settings/backup` | 👤 admin |
| `POST /api/admin/settings/backup/verify` | 👤 admin |
| `PUT /api/admin/settings/cost-limits` | 👤 admin |
| `PUT /api/admin/settings/error-budget` | 👤 admin |
| `PUT /api/admin/settings/archive` | 👤 admin |
| `POST /api/admin/settings/archive/run` | 👤 admin |
| `PUT /api/admin/settings/retention` | 👤 admin |
| `POST /api/admin/settings/retention/run` | 👤 admin |
| `POST /api/admin/settings/cost-report/run` | 👤 admin |
| `PUT /api/admin/settings/notify` | 👤 admin |
| `POST /api/admin/settings/notify/test` | 👤 admin |

## 관리자 · 자산 (admin/assets)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/admin/assets/rebuild` | 👤 admin |
| `POST /api/admin/assets/pull` | 👤 admin |
| `POST /api/admin/assets/sync` | 👤 admin |
| `POST /api/admin/assets/approve` | 👤 admin |
| `POST /api/admin/assets/reject` | 👤 admin |
| `POST /api/admin/assets/rollback` | 👤 admin |
| `POST /api/admin/assets/alerts/ack` | 👤 admin |
| `POST /api/admin/assets/lock/release` | 👤 admin |
| `POST /api/admin/assets/client-keys` | 👤 admin |
| `DELETE /api/admin/assets/client-keys/:id` | 👤 admin |

## 사용자 (users)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `PUT /api/users/me/password` | 🔐 authed (로그인만) |

## 프로젝트 메시지 (messages)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/projects/:id/messages` | 👤 admin, member |

## 프로젝트 (projects)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/projects` | 👤 admin, member |
| `POST /api/projects/analyze` | 👤 admin, member |
| `POST /api/projects/analyze-prompt` | 👤 admin, member |
| `PUT /api/projects/:id` | 👤 admin, member |
| `PUT /api/projects/:id/status` | 👤 admin, member |
| `POST /api/projects/:id/restore` | 👤 admin, member |
| `POST /api/projects/import` | 👤 admin, member |

## 파이프라인 (pipelines)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/pipelines` | 👤 admin, member |
| `POST /api/pipelines/:id/steps/:sid/approve` | 👤 admin, member |
| `POST /api/pipelines/:id/steps/:sid/reject` | 👤 admin, member |
| `POST /api/pipelines/:id/steps/:sid/retry` | 👤 admin, member |
| `POST /api/pipelines/:id/steps/:sid/skip` | 👤 admin, member |
| `POST /api/pipelines/:id/pause` | 👤 admin, member |
| `POST /api/pipelines/:id/resume` | 👤 admin, member |
| `POST /api/pipelines/:id/cancel` | 👤 admin, member |
| `POST /api/pipelines/:id/retry-all` | 👤 admin, member |

## 티켓 (tickets)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/tickets` | 👤 admin, member |
| `PUT /api/tickets/:id/status` | 👤 admin, member |

## 검색 (search)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/search/reindex` | 👤 admin |

## 알림 (notifications)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/notifications/:id/read` | 🔐 authed (로그인만) |
| `POST /api/notifications/read-all` | 🔐 authed (로그인만) |

## 디자인 시스템 (design-systems)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/design-systems` | 👤 admin |
| `PUT /api/design-systems/:id` | 👤 admin |
| `DELETE /api/design-systems/:id` | 👤 admin |

## 탐색 (discovery)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/discovery/similar` | 🔐 authed (로그인만) |

## 인테이크 (intake)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/intake/start` | 🔐 authed (로그인만) |
| `POST /api/intake/:id/turn` | 🔐 authed (로그인만) |
| `POST /api/intake/:id/commit` | 🔐 authed (로그인만) |
| `POST /api/intake/:id/abandon` | 🔐 authed (로그인만) |

## RAG (rag)

| 메서드/경로 | 권한 정책 |
| --- | --- |
| `POST /api/rag/reindex` | 👤 admin |

## 통계

- 총 라우트: **62**
- 🌐 public: 2
- 🔐 authed: 9
- 👤 admin only: 32
- 👤 admin + member: 19
