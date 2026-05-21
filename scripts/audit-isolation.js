#!/usr/bin/env node
// 격리 가드 audit — routes/* 의 단건/목록 라우트가 격리 가드를 보유하는지 정적 점검
//
// 사용:
//   node scripts/audit-isolation.js          — 사람용 리포트
//   node scripts/audit-isolation.js --json   — JSON 출력
//   node scripts/audit-isolation.js --strict — 누락 1건이라도 있으면 exit 1 (CI/hook 용)
//
// 점검 대상 파일: src/routes/*.js (admin/, client-assets 제외 — 별도 인증)
// 점검 기준 (다음 중 하나만 있어도 ✓):
//   - 라우트 본문에 ownsProject(req) / assertProjectAccess / assertChildAccess 호출
//   - SQL WHERE 절에 created_by 필터 (member 격리 SQL)
//   - projectScopeFilter 사용
//   - router.use(... assertProjectAccess ...) 형태의 상위 미들웨어
//   - router.use(requireRole('admin')) — admin 전용 라우터
//   - 본문에 req.user.role === 'admin' 분기 + 명시적 SQL 필터

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');
const EXCLUDE = new Set([
  'admin',          // requireRole('admin') 사용
  'client-assets.js', // X-API-Key 별도 인증
  'auth.js',        // 로그인/회원가입 — 인증 자체
  'doctor.js'       // admin 전용 + 자체 진단
]);

function extractRoutes(src) {
  const lines = src.split('\n');
  const routes = [];
  let cur = null;
  // depth tracking — 라우트는 보통 router.METHOD( ..., (req, res) => { ... }); 형태
  // body 종료 감지를 위해 brace 균형 추적
  let braceDepth = 0;
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const m = ln.match(/^router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
    if (m && !started) {
      cur = { line: i + 1, method: m[1], path: m[2], body: '' };
      braceDepth = 0;
      started = true;
    }
    if (cur) {
      cur.body += ln + '\n';
      // 첫 {부터 추적
      for (const ch of ln) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }
      if (started && braceDepth === 0 && ln.includes(');')) {
        routes.push(cur);
        cur = null;
        started = false;
      }
    }
  }
  if (cur) routes.push(cur);
  return routes;
}

const GUARD_PATTERNS = [
  { name: 'ownsProject',           re: /ownsProject\s*\(\s*req\s*\)/ },
  { name: 'assertProjectAccess',   re: /assertProjectAccess\s*\(/ },
  { name: 'assertChildAccess',     re: /assertChildAccess\s*\(/ },
  { name: 'projectScopeFilter',    re: /projectScopeFilter\s*\(/ },
  { name: 'SQL created_by filter', re: /\bcreated_by\s*=\s*\?/ },
  { name: 'admin role branch',     re: /req\.user\.role\s*===\s*['"]admin['"]/ },
];

function hasFileLevelGuard(src) {
  // multi-line router.use 도 지원 — [\s\S] 사용
  // router.use((req, res, next) => { ... assertProjectAccess ... })
  // router.use(requireRole('admin'))
  // router.use('/:id', guardPipelineById)
  return (
    /router\.use\(\s*\([\s\S]{0,500}?assertProjectAccess/.test(src) ||
    /router\.use\(\s*requireRole\(\s*['"]admin['"]/.test(src) ||
    /router\.use\(\s*['"]\/:id['"]?\s*,/.test(src)
  );
}

// 라우트 본문에 본인-격리 SQL/패턴이 있으면 OK (notifications, users/me, intake 세션 등)
function hasSelfScopedPattern(body) {
  return (
    /user_id\s*=\s*\?[^?]*req\.user\.id|user_id\s*=\s*req\.user\.id/.test(body) ||
    /WHERE\s+user_id\s*=/.test(body) ||
    /actor_id\s*=\s*req\.user\.id/.test(body) ||
    /\.user_id\s*!==?\s*req\.user\.id/.test(body) ||  // intake.js 세션 본인-격리
    /\.user_id\s*===\s*req\.user\.id/.test(body) ||
    /user_id\s*FROM\s+\w+\s+WHERE\s+id/.test(body) ||  // 자식 → user_id 조회 후 비교
    /created_by\s*=\s*req\.user\.id/.test(body)
  );
}

// admin 전용 라우트 (본문에 명시적 admin 체크)
function isAdminOnly(body) {
  return /req\.user\.role\s*!==\s*['"]admin['"]/.test(body) ||
         /requireRole\(\s*['"]admin['"]\s*\)/.test(body);
}

// 명시적 격리-면제 마커 — 의도적 false positive 차단
//   // ISOLATION: shared-readonly  — 모든 인증 사용자 read 가능 (디자인 시스템 등 공유 자원)
//   // ISOLATION: create-self      — 생성 라우트, created_by 자동 본인
//   // ISOLATION: admin-only       — admin 전용
//   // ISOLATION: public           — 인증 없이 접근 가능
function hasMagicAllow(body) {
  return /\/\/\s*ISOLATION:\s*(shared-readonly|create-self|admin-only|public)/i.test(body);
}

function audit() {
  const results = [];
  for (const f of fs.readdirSync(ROUTES_DIR)) {
    if (EXCLUDE.has(f)) continue;
    const full = path.join(ROUTES_DIR, f);
    if (!fs.statSync(full).isFile()) continue;
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const fileLevelGuard = hasFileLevelGuard(src);
    const routes = extractRoutes(src);
    const fileResult = { file: f, fileLevelGuard, routes: [] };
    for (const r of routes) {
      // 인증 자체 라우트 (login/refresh)는 skip
      if (/\/(login|register|refresh|logout)\b/.test(r.path)) {
        fileResult.routes.push({ ...r, status: 'auth', body: undefined });
        continue;
      }
      // 단건/자식 라우트만 점검 — :id 또는 project_id 컬럼 사용 가능성
      const isSensitive = r.path.includes(':id') || r.path === '/' || /project_id|projectId/.test(r.body);
      if (!isSensitive) {
        fileResult.routes.push({ ...r, status: 'na', body: undefined });
        continue;
      }
      const matched = GUARD_PATTERNS.find(p => p.re.test(r.body));
      if (hasMagicAllow(r.body)) {
        const m = r.body.match(/\/\/\s*ISOLATION:\s*(\S+)/i);
        fileResult.routes.push({ ...r, status: 'ok-magic', guard: `ISOLATION:${m[1]}`, body: undefined });
      } else if (matched) {
        fileResult.routes.push({ ...r, status: 'ok', guard: matched.name, body: undefined });
      } else if (fileLevelGuard) {
        fileResult.routes.push({ ...r, status: 'ok-file', guard: 'router.use', body: undefined });
      } else if (hasSelfScopedPattern(r.body)) {
        fileResult.routes.push({ ...r, status: 'ok-self', guard: 'self-scoped (user_id)', body: undefined });
      } else if (isAdminOnly(r.body)) {
        fileResult.routes.push({ ...r, status: 'ok-admin', guard: 'admin-only', body: undefined });
      } else {
        fileResult.routes.push({ ...r, status: 'missing', body: undefined });
      }
    }
    results.push(fileResult);
  }
  return results;
}

function formatReport(results) {
  const lines = [];
  let okCount = 0, missCount = 0, naCount = 0;
  for (const r of results) {
    lines.push(`\n[${r.file}]${r.fileLevelGuard ? ' (file-level guard ✓)' : ''}`);
    for (const rt of r.routes) {
      const tag = {
        ok: '✓',
        'ok-file': '✓',
        'ok-self': '✓',
        'ok-admin': '✓',
        'ok-magic': '✓',
        missing: '✗',
        na: '·',
        auth: 'A'
      }[rt.status];
      const note = rt.status === 'ok' || rt.status === 'ok-self' || rt.status === 'ok-admin' ? ` [${rt.guard}]`
                : rt.status === 'ok-file' ? ' [router.use]'
                : rt.status === 'missing' ? ' ⚠️ GUARD MISSING'
                : '';
      lines.push(`  ${tag} L${rt.line.toString().padStart(4)}  ${rt.method.toUpperCase().padEnd(6)} ${rt.path}${note}`);
      if (rt.status.startsWith('ok')) okCount++;
      else if (rt.status === 'missing') missCount++;
      else naCount++;
    }
  }
  lines.push(`\n=== 요약: OK=${okCount}, MISSING=${missCount}, N/A=${naCount} ===`);
  return { text: lines.join('\n'), okCount, missCount, naCount };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const results = audit();
  const formatted = formatReport(results);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ results, summary: { ok: formatted.okCount, missing: formatted.missCount, na: formatted.naCount } }, null, 2));
  } else {
    console.log(formatted.text);
  }
  if (args.includes('--strict') && formatted.missCount > 0) {
    console.error(`\n❌ STRICT: ${formatted.missCount}개 라우트에 격리 가드 누락`);
    process.exit(1);
  }
}

module.exports = { audit, formatReport };
