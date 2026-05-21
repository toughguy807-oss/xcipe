// G5: RBAC 권한 매트릭스 — 단일 진실 원천 (Single Source of Truth)
//
// 이 파일은 모든 쓰기 라우트의 의도된 권한을 명문화한다.
// - tests/unit/rbac.test.js: 회귀 검증 (라우트 추가 시 누락 감지)
// - scripts/sync-rbac-docs.js: docs/RBAC.md 마크다운 표 자동 생성
// - 신규 라우트 추가 시 반드시 이 파일에 등록할 것
//
// 정책 형식:
//   'public'              인증 불필요 (login, invite/accept 등)
//   'authed'              로그인만 필요 (역할 무관)
//   { roles: [...] }      특정 역할만 허용 (admin, member, guest)
const ROUTE_MATRIX = {
  'POST /api/auth/login':                { policy: 'public' },
  'POST /api/auth/refresh':              { policy: 'authed' },
  'POST /api/auth/invite/:token/accept': { policy: 'public' },

  'PUT /api/users/me/password':           { policy: 'authed' },

  // 관리자 영역 — /api/admin/* (모두 admin role 필수)
  'POST /api/admin/invite':               { policy: { roles: ['admin'] } },
  'GET /api/admin/users':                 { policy: { roles: ['admin'] } },
  'PUT /api/admin/users/:id/role':        { policy: { roles: ['admin'] } },

  'POST /api/projects':                   { policy: { roles: ['admin', 'member'] } },
  'POST /api/projects/analyze':           { policy: { roles: ['admin', 'member'] } },
  'POST /api/projects/analyze-prompt':    { policy: { roles: ['admin', 'member'] } },
  'PUT /api/projects/:id':                { policy: { roles: ['admin', 'member'] } },
  'PUT /api/projects/:id/status':         { policy: { roles: ['admin', 'member'] } },
  'POST /api/projects/:id/restore':       { policy: { roles: ['admin', 'member'] } },
  'POST /api/projects/import':            { policy: { roles: ['admin', 'member'] } },

  'POST /api/pipelines':                              { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/steps/:sid/approve':       { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/steps/:sid/reject':        { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/steps/:sid/retry':         { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/steps/:sid/skip':          { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/pause':                    { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/resume':                   { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/cancel':                   { policy: { roles: ['admin', 'member'] } },
  'POST /api/pipelines/:id/retry-all':                { policy: { roles: ['admin', 'member'] } },

  'POST /api/tickets':                    { policy: { roles: ['admin', 'member'] } },
  'PUT /api/tickets/:id/status':          { policy: { roles: ['admin', 'member'] } },

  'POST /api/projects/:id/messages':      { policy: { roles: ['admin', 'member'] } },

  'POST /api/search/reindex':             { policy: { roles: ['admin'] } },

  'POST /api/notifications/:id/read':     { policy: 'authed' },
  'POST /api/notifications/read-all':     { policy: 'authed' },

  'PUT /api/admin/settings/ai':                 { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/ai/test':           { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/reviewer':           { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/backup':            { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/backup/verify':     { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/cost-limits':        { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/error-budget':       { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/archive':            { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/archive/run':       { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/retention':          { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/retention/run':     { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/cost-report/run':   { policy: { roles: ['admin'] } },
  'PUT /api/admin/settings/notify':             { policy: { roles: ['admin'] } },
  'POST /api/admin/settings/notify/test':       { policy: { roles: ['admin'] } },

  'POST /api/admin/assets/rebuild':       { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/pull':          { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/sync':          { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/approve':       { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/reject':        { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/rollback':      { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/alerts/ack':    { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/lock/release':  { policy: { roles: ['admin'] } },
  'POST /api/admin/assets/client-keys':   { policy: { roles: ['admin'] } },
  'DELETE /api/admin/assets/client-keys/:id': { policy: { roles: ['admin'] } },

  'POST /api/design-systems':             { policy: { roles: ['admin'] } },
  'PUT /api/design-systems/:id':          { policy: { roles: ['admin'] } },
  'DELETE /api/design-systems/:id':       { policy: { roles: ['admin'] } },

  'POST /api/discovery/similar':          { policy: 'authed' },

  'POST /api/intake/start':               { policy: 'authed' },
  'POST /api/intake/:id/turn':            { policy: 'authed' },
  'POST /api/intake/:id/commit':          { policy: 'authed' },
  'POST /api/intake/:id/abandon':         { policy: 'authed' },

  'POST /api/rag/reindex':                { policy: { roles: ['admin'] } }
};

// 라우트 카테고리 — docs 표를 섹션별로 그룹화
//   prefix 매칭은 위에서 아래 순서대로. 더 구체적인 prefix를 먼저 둘 것.
const CATEGORY_RULES = [
  { prefix: '/api/auth',                  title: '인증 (auth)' },
  { prefix: '/api/admin/users',           title: '관리자 · 사용자 (admin/users)' },
  { prefix: '/api/admin/invite',          title: '관리자 · 초대 (admin/invite)' },
  { prefix: '/api/admin/settings',        title: '관리자 · 설정 (admin/settings)' },
  { prefix: '/api/admin/assets',          title: '관리자 · 자산 (admin/assets)' },
  { prefix: '/api/users',                 title: '사용자 (users)' },
  { prefix: '/api/projects/:id/messages', title: '프로젝트 메시지 (messages)' },
  { prefix: '/api/projects',              title: '프로젝트 (projects)' },
  { prefix: '/api/pipelines',             title: '파이프라인 (pipelines)' },
  { prefix: '/api/tickets',               title: '티켓 (tickets)' },
  { prefix: '/api/search',                title: '검색 (search)' },
  { prefix: '/api/notifications',         title: '알림 (notifications)' },
  { prefix: '/api/design-systems',        title: '디자인 시스템 (design-systems)' },
  { prefix: '/api/discovery',             title: '탐색 (discovery)' },
  { prefix: '/api/intake',                title: '인테이크 (intake)' },
  { prefix: '/api/rag',                   title: 'RAG (rag)' }
];

function categorize(routeKey) {
  // routeKey: 'METHOD /api/...' — path만 분리
  const path = routeKey.split(' ')[1] || '';
  for (const c of CATEGORY_RULES) {
    if (path.startsWith(c.prefix)) return c.title;
  }
  return '기타';
}

function policyToText(policy) {
  if (policy === 'public') return '🌐 public (인증 불필요)';
  if (policy === 'authed') return '🔐 authed (로그인만)';
  if (typeof policy === 'object' && Array.isArray(policy.roles)) {
    return `👤 ${policy.roles.join(', ')}`;
  }
  return JSON.stringify(policy);
}

module.exports = { ROUTE_MATRIX, CATEGORY_RULES, categorize, policyToText };
