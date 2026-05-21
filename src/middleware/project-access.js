// 프로젝트 격리 — 멀티유저 환경에서 member의 타인 프로젝트 접근 차단
//
//   admin: 모든 프로젝트 접근 가능 (격리 우회)
//   member: created_by === req.user.id 인 프로젝트만 접근
//
// 사용 패턴:
//   const { assertProjectAccess } = require('../middleware/project-access');
//   router.get('/:id', (req, res) => {
//     const r = assertProjectAccess(req, req.params.id);
//     if (!r.ok) return res.status(r.status).json(r.body);
//     ...
//   });
//
// 또는 라우트 단일 미들웨어:
//   router.get('/:id', requireProjectAccess('id'), (req, res) => {...});

const { db } = require('../db');

// projectIdOrCode: 숫자 id 또는 영문 code 둘 다 허용
// 격리 규칙: admin 우회 / created_by 본인 / 본인이 속한 team_id 와 일치
function assertProjectAccess(req, projectIdOrCode) {
  if (!req.user) {
    return { ok: false, status: 401, body: { error: 'ESYS-AUTH-001', message: '인증 필요' } };
  }
  if (req.user.role === 'admin') return { ok: true };

  // id (정수) 또는 code (대문자/숫자/언더바)
  const asInt = parseInt(projectIdOrCode, 10);
  const row = (Number.isInteger(asInt) && String(asInt) === String(projectIdOrCode))
    ? db.prepare('SELECT created_by, team_id FROM projects WHERE id = ?').get(asInt)
    : db.prepare('SELECT created_by, team_id FROM projects WHERE code = ?').get(projectIdOrCode);

  if (!row) {
    return { ok: false, status: 404, body: { error: 'ESYS-PRJ-003', message: 'Project not found' } };
  }
  if (row.created_by === req.user.id) return { ok: true };

  // 팀 멤버 격리 — projects.team_id 가 설정되어 있고 user가 그 팀 멤버면 허용
  if (row.team_id) {
    const tm = db.prepare('SELECT 1 AS ok FROM team_members WHERE team_id = ? AND user_id = ?').get(row.team_id, req.user.id);
    if (tm) return { ok: true };
  }
  return { ok: false, status: 403, body: { error: 'ESYS-PRJ-019', message: '본인이 생성하거나 소속 팀의 프로젝트만 접근 가능' } };
}

// Express 미들웨어 형태 — req.params[paramName] 으로 projectId 추출
function requireProjectAccess(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body?.project_id || req.query?.project_id;
    if (!id) {
      return res.status(400).json({ error: 'ESYS-PRJ-020', message: `project ${paramName} 필요` });
    }
    const r = assertProjectAccess(req, id);
    if (!r.ok) return res.status(r.status).json(r.body);
    next();
  };
}

// 자식 리소스 (ticket/pipeline/message/artifact)의 project_id 컬럼을 통해 접근 가드
//   예) ticket.id → ticket.project_id → projects.created_by
function assertChildAccess(req, { table, idColumn = 'id', idValue, projectIdColumn = 'project_id' }) {
  if (req.user?.role === 'admin') return { ok: true };
  const row = db.prepare(`SELECT ${projectIdColumn} AS pid FROM ${table} WHERE ${idColumn} = ?`).get(idValue);
  if (!row) {
    return { ok: false, status: 404, body: { error: 'ESYS-CHILD-001', message: `${table} not found` } };
  }
  return assertProjectAccess(req, row.pid);
}

// member 격리 SQL 조각 — WHERE 절에 합칠 때 사용
//   const { sql, params } = projectScopeFilter(req, 'p');  // alias
//   → admin: { sql: '', params: [] }
//   → member: { sql: ' AND (p.created_by = ? OR p.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?))', params: [user.id, user.id] }
function projectScopeFilter(req, alias = 'p') {
  if (!req.user || req.user.role === 'admin') return { sql: '', params: [] };
  return {
    sql: ` AND (${alias}.created_by = ? OR ${alias}.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?))`,
    params: [req.user.id, req.user.id]
  };
}

module.exports = {
  assertProjectAccess,
  requireProjectAccess,
  assertChildAccess,
  projectScopeFilter
};
