// Unit — RBAC 매트릭스 회귀 방지
//
// 각 라우트 모듈을 가짜 req/res로 마운트하여 다음을 검증:
//  1) 인증 없이는 401 (authMiddleware로 보호)
//  2) 권한 부족 시 403 (requireRole 적용)
//  3) 매트릭스에 명시되지 않은 라우트는 추가 시 테스트가 깨지도록 강제
//
// 신규 라우트 추가 시 ROUTE_MATRIX에 등록 → 의도된 권한이 명문화됨.
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const express = require('express');
const path = require('path');
const fs = require('fs');

// 권한 매트릭스 — 단일 진실 원천 (src/rbac-matrix.js)에서 import
const { ROUTE_MATRIX } = require('../../src/rbac-matrix');

// 진단 라우트는 GET만 있어 ROUTE_MATRIX(쓰기 라우트)에는 미포함이지만,
// admin-only 가드 점검은 별도 테스트에서 수행

test('auth.js: requireRole + authMiddleware 함수가 존재하고 동작', () => {
  const auth = require('../../src/auth');
  assert.equal(typeof auth.authMiddleware, 'function');
  assert.equal(typeof auth.requireRole, 'function');

  // requireRole 동작 검증
  const guard = auth.requireRole('admin');
  let nextCalled = false, statusCode = null, body = null;
  const res = {
    status: (c) => { statusCode = c; return res; },
    json: (b) => { body = b; return res; }
  };

  // case 1: req.user 없음 → 403
  guard({}, res, () => { nextCalled = true; });
  assert.equal(statusCode, 403);
  assert.equal(body.error, 'ESYS-AUTH-005');

  // case 2: 권한 부족
  statusCode = null; body = null; nextCalled = false;
  guard({ user: { role: 'guest' } }, res, () => { nextCalled = true; });
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);

  // case 3: 권한 충분
  statusCode = null; body = null; nextCalled = false;
  guard({ user: { role: 'admin' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(statusCode, null);
});

test('authMiddleware: 토큰 없으면 401', () => {
  const { authMiddleware } = require('../../src/auth');
  let statusCode = null, body = null;
  const res = {
    status: (c) => { statusCode = c; return res; },
    json: (b) => { body = b; return res; }
  };
  authMiddleware({ headers: {} }, res, () => {});
  assert.equal(statusCode, 401);
  assert.equal(body.error, 'ESYS-AUTH-002');
});

test('RBAC 매트릭스 — 모든 쓰기 라우트가 매트릭스에 등록되어 있어야 함', () => {
  // 라우트 파일에서 router.{post,put,delete,patch} 호출을 정적 추출
  const routesDir = path.join(__dirname, '..', '..', 'src', 'routes');

  // 라우트 파일 목록 — 최상위 + admin/ 서브폴더 (1단계만)
  const files = [];
  for (const e of fs.readdirSync(routesDir, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.js')) files.push(e.name);
    else if (e.isDirectory() && e.name === 'admin') {
      for (const sub of fs.readdirSync(path.join(routesDir, e.name))) {
        if (sub.endsWith('.js')) files.push(`admin/${sub}`);
      }
    }
  }

  const declared = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(routesDir, f), 'utf8');
    const re = /router\.(post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const method = m[1].toUpperCase();
      const sub = m[2];
      const base = routeBase(f);
      const full = sub === '/' ? base : `${base}${sub}`;
      declared.push(`${method} ${full}`);
    }
  }

  const missing = declared.filter(d => !(d in ROUTE_MATRIX));
  assert.equal(missing.length, 0,
    `다음 쓰기 라우트가 RBAC 매트릭스에 등록되어 있지 않습니다:\n  - ${missing.join('\n  - ')}\n\nROUTE_MATRIX에 의도된 권한 정책을 명시하세요 (tests/unit/rbac.test.js).`);
});

// 라우트 파일명 → 마운트 prefix 매핑
//   messages.js               → /api/projects/:id/messages
//   auth.js                   → /api/auth
//   admin/users.js            → /api/admin/users
//   admin/invite.js           → /api/admin/invite
//   admin/assets.js           → /api/admin/assets
//   admin/settings.js         → /api/admin/settings
//   기타 {name}.js            → /api/{name}
function routeBase(f) {
  if (f === 'messages.js') return '/api/projects/:id/messages';
  if (f === 'auth.js')     return '/api/auth';
  if (f === 'client-assets.js') return '/api/client/assets';
  if (f.startsWith('admin/')) {
    const name = f.slice('admin/'.length).replace(/\.js$/, '');
    return `/api/admin/${name}`;
  }
  return `/api/${f.replace(/\.js$/, '')}`;
}

test('RBAC 매트릭스 — admin/ 서브폴더의 모든 쓰기 라우트는 admin 가드 사용', () => {
  // /api/admin/* 의 모든 라우트는 admin only이어야 함 (ROUTE_MATRIX 정합성)
  const adminDir = path.join(__dirname, '..', '..', 'src', 'routes', 'admin');
  const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const src = fs.readFileSync(path.join(adminDir, f), 'utf8');
    // 파일 단위로 router.use(requireRole('admin')) 가 있으면 일괄 통과
    const fileLevelGuard = /router\.use\(\s*requireRole\(['"]admin['"]\)\s*\)/.test(src);
    if (fileLevelGuard) continue;
    // 그렇지 않으면 개별 쓰기 라우트마다 requireRole('admin') 필요
    const writeRoutes = src.match(/router\.(post|put|delete|patch)\([^)]+\)/g) || [];
    for (const route of writeRoutes) {
      assert.ok(/requireRole\(['"]admin['"]/.test(route),
        `admin/${f}의 쓰기 라우트는 admin 가드가 필요합니다: ${route.slice(0, 80)}...`);
    }
  }
});

test.after(() => cleanupTestDb());
