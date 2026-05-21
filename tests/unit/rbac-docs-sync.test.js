// Unit — G5: RBAC 매트릭스 ↔ docs/RBAC.md 동기화 회귀 방지
//
// 목적: src/rbac-matrix.js를 변경하면 docs/RBAC.md를 같이 갱신해야 함.
//       drift 발생 시 테스트가 실패하여 PR 단계에서 차단된다.
//       (sync-rbac-docs.js --check 로직과 동일하지만 단위 테스트로도 보장)
const test = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_PATH = path.join(ROOT, 'docs', 'RBAC.md');
const SCRIPT = path.join(ROOT, 'scripts', 'sync-rbac-docs.js');

test('docs/RBAC.md 가 src/rbac-matrix.js 와 동기화되어 있어야 함', () => {
  // sync-rbac-docs.js --check 가 exit 0 이면 OK, exit 1 이면 drift
  try {
    execSync(`node "${SCRIPT}" --check`, { stdio: 'pipe', cwd: ROOT });
  } catch (e) {
    const out = (e.stdout || Buffer.from('')).toString() + (e.stderr || Buffer.from('')).toString();
    assert.fail(
      `docs/RBAC.md 가 ROUTE_MATRIX 와 어긋남.\n` +
      `→ \`node scripts/sync-rbac-docs.js\` 실행 후 변경 사항 커밋 필요.\n\n${out}`
    );
  }
});

test('docs/RBAC.md 자체 무결성 — 자동생성 헤더 포함', () => {
  assert.ok(fs.existsSync(DOCS_PATH), 'docs/RBAC.md 가 존재해야 함');
  const md = fs.readFileSync(DOCS_PATH, 'utf8');
  assert.match(md, /자동 생성 파일/);
  assert.match(md, /src\/rbac-matrix\.js/);
  // 모든 카테고리 헤더 존재 (인증/사용자/프로젝트/파이프라인/티켓/검색/알림/설정)
  assert.match(md, /## 인증/);
  assert.match(md, /## 관리자 · 설정/);
});

test('rbac-matrix.js: 모든 entry는 policy 키를 가져야 함', () => {
  const { ROUTE_MATRIX } = require('../../src/rbac-matrix');
  for (const [key, def] of Object.entries(ROUTE_MATRIX)) {
    assert.ok(def && def.policy !== undefined, `${key} 에 policy 누락`);
    if (typeof def.policy === 'object') {
      assert.ok(Array.isArray(def.policy.roles), `${key} 의 roles 가 배열이어야 함`);
      assert.ok(def.policy.roles.length > 0, `${key} 의 roles 가 비어있음`);
    } else {
      assert.ok(['public', 'authed'].includes(def.policy), `${key} 의 policy 값 부적절: ${def.policy}`);
    }
  }
});
