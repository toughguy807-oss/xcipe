const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { db, logActivity } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { assertProjectAccess, projectScopeFilter } = require('../middleware/project-access');

router.use(authMiddleware);

// T0-1 + 팀 격리: assertProjectAccess 사용 (admin / created_by 본인 / team 멤버 허용)
function ownsProject(req) {
  return assertProjectAccess(req, req.params.id);
}

// IA-A010: GET /api/projects (FN-008)
// query.include_archived=1 → 아카이브(soft-delete)된 프로젝트 포함
// query.archived_only=1 → 아카이브된 프로젝트만 (휴지통 뷰)
// T0-1: 멀티유저 격리 — member는 본인 created_by 프로젝트만, admin은 전체
router.get('/', (req, res) => {
  const { page = 1, limit = 20, status, search, include_archived, archived_only } = req.query;
  const offset = (page - 1) * limit;
  let where;
  if (archived_only === '1' || archived_only === 'true') {
    where = 'WHERE p.deleted_at IS NOT NULL';
  } else if (include_archived === '1' || include_archived === 'true') {
    where = 'WHERE 1=1';
  } else {
    where = 'WHERE p.deleted_at IS NULL';
  }
  const params = [];
  // 격리: created_by 본인 OR 본인이 속한 팀
  const scope = projectScopeFilter(req, 'p');
  where += scope.sql;
  params.push(...scope.params);
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  if (search) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM projects p ${where}`).get(...params).c;
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM artifacts WHERE project_id = p.id) as artifact_count,
      (SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status != 'closed') as open_ticket_count,
      (SELECT status FROM pipelines WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_pipeline_status
    FROM projects p ${where}
    ORDER BY p.updated_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ data: projects, total, page: +page, limit: +limit });
});

// IA-A011: POST /api/projects (FN-007)
router.post('/', requireRole('admin', 'member'), (req, res) => {
  // ISOLATION: create-self — 신규 프로젝트 생성, created_by 는 본인으로 자동 설정
  const { name, code, type = 'web', description, prompt, completion_level = 1,
          tech_stack, framework, reference_url, reference_content, optional_skills,
          design_system_id, team_id } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'ESYS-PRJ-001', message: 'Name and code required' });

  // 입력 검증: 프로젝트 코드는 대문자 영문/숫자/언더스코어만, 2~20자
  if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(code)) {
    return res.status(400).json({
      error: 'ESYS-PRJ-013',
      message: '코드는 대문자로 시작하고 대문자 영문/숫자/언더스코어만 2~20자로 사용할 수 있습니다'
    });
  }
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: 'ESYS-PRJ-014', message: '프로젝트 이름은 2~50자여야 합니다' });
  }
  const lvl = +completion_level;
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > 6) {
    return res.status(400).json({ error: 'ESYS-PRJ-015', message: 'completion_level은 1~6 정수여야 합니다' });
  }
  // 선택적 스킬 검증
  let optSkillsJson = null;
  if (optional_skills) {
    if (!Array.isArray(optional_skills)) {
      return res.status(400).json({ error: 'ESYS-PRJ-016', message: 'optional_skills는 배열이어야 합니다' });
    }
    const { OPTIONAL_SKILLS } = require('../engine/pipeline-stages');
    const invalid = optional_skills.filter(s => !OPTIONAL_SKILLS[s]);
    if (invalid.length > 0) {
      return res.status(400).json({ error: 'ESYS-PRJ-017', message: '지원하지 않는 선택 스킬: ' + invalid.join(', ') });
    }
    optSkillsJson = JSON.stringify(optional_skills);
  }
  // reference_url 기본 검증 (URL 형식)
  if (reference_url && !/^https?:\/\//.test(reference_url)) {
    return res.status(400).json({ error: 'ESYS-PRJ-018', message: 'reference_url은 http(s)로 시작해야 합니다' });
  }

  const existing = db.prepare('SELECT id FROM projects WHERE code = ?').get(code);
  if (existing) return res.status(409).json({ error: 'ESYS-PRJ-002', message: 'Code already exists' });

  // design_system_id 검증 — 존재하는 DS 만 허용
  let dsId = null;
  if (design_system_id != null && design_system_id !== '') {
    const ds = db.prepare('SELECT id FROM project_design_systems WHERE id = ?').get(parseInt(design_system_id, 10));
    if (!ds) return res.status(400).json({ error: 'ESYS-PRJ-021', message: '존재하지 않는 design_system_id' });
    dsId = ds.id;
  }
  // team_id 검증 — admin이거나 본인이 속한 팀이어야
  let teamIdValue = null;
  if (team_id != null && team_id !== '') {
    const tid = parseInt(team_id, 10);
    if (req.user.role !== 'admin') {
      const tm = db.prepare('SELECT 1 AS ok FROM team_members WHERE team_id = ? AND user_id = ?').get(tid, req.user.id);
      if (!tm) return res.status(403).json({ error: 'ESYS-PRJ-022', message: '본인이 속한 팀만 지정 가능' });
    } else {
      const tExists = db.prepare('SELECT 1 AS ok FROM teams WHERE id = ?').get(tid);
      if (!tExists) return res.status(400).json({ error: 'ESYS-PRJ-023', message: '존재하지 않는 team_id' });
    }
    teamIdValue = tid;
  }

  const result = db.prepare(
    `INSERT INTO projects (name, code, type, description, prompt, completion_level,
     tech_stack, framework, reference_url, reference_content, optional_skills, created_by,
     design_system_id, team_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(name, code, type, description, prompt, lvl,
        tech_stack || null, framework || null, reference_url || null,
        reference_content || null, optSkillsJson, req.user.id,
        dsId, teamIdValue);

  logActivity('project', result.lastInsertRowid, 'created', `${name} (L${completion_level})`, req.user.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// POST /api/projects/analyze (FN-11) — Model Bridge 실연동
router.post('/analyze', requireRole('admin', 'member'), async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'ESYS-PRJ-010', message: 'Prompt required' });

  try {
    const { analyzePrompt } = require('../engine/model-bridge');
    const result = await analyzePrompt(prompt, { userId: req.user && req.user.id });
    if (!result.ok) {
      return res.status(502).json({ error: 'ESYS-PRJ-011', message: result.error, suggestion: null });
    }
    res.json({ suggestion: result.data, raw_prompt: prompt, provider: require('../engine/model-bridge').getProvider().getProviderName() });
  } catch (err) {
    res.status(500).json({ error: 'ESYS-PRJ-012', message: err.message });
  }
});

// Legacy path alias for existing UI
router.post('/analyze-prompt', requireRole('admin', 'member'), async (req, res) => {
  req.url = '/analyze';
  router.handle(req, res);
});

// IA-A013: GET /api/projects/check-code/:code (FN-007)
router.get('/check-code/:code', requireRole('admin', 'member'), (req, res) => {
  const existing = db.prepare('SELECT id FROM projects WHERE code = ?').get(req.params.code);
  res.json({ available: !existing });
});

// F4: GET /api/projects/export.csv — 프로젝트 목록 CSV 내보내기
//   동일한 필터(status/search/include_archived/archived_only)를 GET / 와 공유.
//   인증된 사용자라면 누구나 가능 (read 권한). 페이지네이션은 적용하지 않고 모두 export.
//   /:id 보다 반드시 먼저 등록되어야 'export.csv'가 :id로 매칭되지 않음.
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
router.get('/export.csv', (req, res) => {
  const { status, search, include_archived, archived_only } = req.query;
  // 격리: member는 본인 created_by + 소속 팀
  let where;
  if (archived_only === '1' || archived_only === 'true') {
    where = 'WHERE p.deleted_at IS NOT NULL';
  } else if (include_archived === '1' || include_archived === 'true') {
    where = 'WHERE 1=1';
  } else {
    where = 'WHERE p.deleted_at IS NULL';
  }
  const params = [];
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  if (search) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const scope = projectScopeFilter(req, 'p');
  where += scope.sql;
  params.push(...scope.params);

  const rows = db.prepare(`
    SELECT p.id, p.code, p.name, p.status, p.type, p.completion_level,
           p.tech_stack, p.framework, p.created_at, p.updated_at, p.deleted_at,
           (SELECT COUNT(*) FROM artifacts WHERE project_id = p.id) as artifact_count,
           (SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status != 'closed') as open_ticket_count,
           (SELECT status FROM pipelines WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as last_pipeline_status
    FROM projects p ${where}
    ORDER BY p.updated_at DESC
  `).all(...params);

  const cols = ['id', 'code', 'name', 'status', 'type', 'completion_level',
    'tech_stack', 'framework', 'created_at', 'updated_at', 'deleted_at',
    'artifact_count', 'open_ticket_count', 'last_pipeline_status'];

  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push(cols.map(c => csvEscape(r[c])).join(','));
  }
  // Excel UTF-8 호환을 위한 BOM 첨부
  const csv = '﻿' + lines.join('\r\n') + '\r\n';

  const ts = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.setHeader('Content-Disposition', `attachment; filename="projects-${ts}.csv"`);
  res.send(csv);
  try { logActivity('system', null, 'projects_csv_exported', `프로젝트 목록 CSV 내보내기 (${rows.length}건)`, req.user && req.user.id); } catch {}
});

// IA-A014: GET /api/projects/:id (FN-009)
router.get('/:id', (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const project = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM artifacts WHERE project_id = p.id) as artifact_count,
      (SELECT COUNT(*) FROM tickets WHERE project_id = p.id AND status != 'closed') as open_ticket_count
    FROM projects p WHERE p.id = ? AND p.deleted_at IS NULL
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });
  res.json(project);
});

// IA-A015: PUT /api/projects/:id (FN-010)
router.put('/:id', requireRole('admin', 'member'), (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const { name, description, type, completion_level, tech_stack, framework, reference_url, reference_content, optional_skills, design_system_id, team_id } = req.body;
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (completion_level !== undefined) {
    const lvl = +completion_level;
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 6) {
      return res.status(400).json({ error: 'ESYS-PRJ-015', message: 'completion_level은 1~6 정수여야 합니다' });
    }
    updates.push('completion_level = ?'); params.push(lvl);
  }
  if (tech_stack !== undefined) { updates.push('tech_stack = ?'); params.push(tech_stack); }
  if (framework !== undefined) { updates.push('framework = ?'); params.push(framework); }
  if (reference_url !== undefined) {
    if (reference_url && !/^https?:\/\//.test(reference_url)) {
      return res.status(400).json({ error: 'ESYS-PRJ-018', message: 'reference_url은 http(s)로 시작해야 합니다' });
    }
    updates.push('reference_url = ?'); params.push(reference_url || null);
  }
  if (reference_content !== undefined) {
    updates.push('reference_content = ?'); params.push(reference_content || null);
  }
  if (optional_skills !== undefined) {
    if (!Array.isArray(optional_skills)) {
      return res.status(400).json({ error: 'ESYS-PRJ-016', message: 'optional_skills는 배열이어야 합니다' });
    }
    updates.push('optional_skills = ?'); params.push(JSON.stringify(optional_skills));
  }
  if (design_system_id !== undefined) {
    if (design_system_id === null || design_system_id === '') {
      updates.push('design_system_id = ?'); params.push(null);
    } else {
      const ds = db.prepare('SELECT id FROM project_design_systems WHERE id = ?').get(parseInt(design_system_id, 10));
      if (!ds) return res.status(400).json({ error: 'ESYS-PRJ-021', message: '존재하지 않는 design_system_id' });
      updates.push('design_system_id = ?'); params.push(ds.id);
    }
  }
  if (team_id !== undefined) {
    if (team_id === null || team_id === '') {
      updates.push('team_id = ?'); params.push(null);
    } else {
      const tid = parseInt(team_id, 10);
      if (req.user.role !== 'admin') {
        const tm = db.prepare('SELECT 1 AS ok FROM team_members WHERE team_id = ? AND user_id = ?').get(tid, req.user.id);
        if (!tm) return res.status(403).json({ error: 'ESYS-PRJ-022', message: '본인이 속한 팀만 지정 가능' });
      } else {
        const tExists = db.prepare('SELECT 1 AS ok FROM teams WHERE id = ?').get(tid);
        if (!tExists) return res.status(400).json({ error: 'ESYS-PRJ-023', message: '존재하지 않는 team_id' });
      }
      updates.push('team_id = ?'); params.push(tid);
    }
  }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  logActivity('project', req.params.id, 'updated', null, req.user.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

// IA-A016: PUT /api/projects/:id/status (FN-011)
router.put('/:id/status', requireRole('admin', 'member'), (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const { status } = req.body;
  if (!['active', 'paused', 'completed', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'ESYS-PRJ-004', message: 'Invalid status' });
  }
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  if (status === 'archived') {
    db.prepare("UPDATE projects SET status = ?, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  } else {
    db.prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  }
  logActivity('project', req.params.id, 'status_changed', `${project.status} → ${status}`, req.user.id);
  res.json({ message: 'Status updated', status });
});

// POST /api/projects/:id/restore — 아카이브에서 복원 (B4)
router.post('/:id/restore', requireRole('admin', 'member'), (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const project = db.prepare('SELECT id, name, status FROM projects WHERE id = ? AND deleted_at IS NOT NULL').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-016', message: '아카이브된 프로젝트를 찾을 수 없습니다' });

  db.prepare(`
    UPDATE projects SET status = 'active', deleted_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);
  logActivity('project', req.params.id, 'restored', `${project.name} 복원`, req.user.id);
  res.json({ ok: true, message: '복원되었습니다' });
});

// IA-A017: GET /api/projects/:id/artifacts (FN-019)
// L3: 메인 산출물 + 부속(자식) 행을 children 컬렉션으로 임베드 (v24 스키마)
//   - parent_artifact_id IS NULL → 메인
//   - role / mime_type 노출 → UI 가 mockup/wireframe/preview/tokens 그룹화
router.get('/:id/artifacts', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);

  const mains = db.prepare(
    `SELECT id, project_id, type, version, file_path, file_name, meta_json, pipeline_step_id,
            created_at, role, mime_type
       FROM artifacts
      WHERE project_id = ? AND parent_artifact_id IS NULL
      ORDER BY created_at DESC, id DESC`
  ).all(req.params.id);

  const childrenByParent = {};
  if (mains.length > 0) {
    const ids = mains.map(m => m.id);
    const placeholders = ids.map(() => '?').join(',');
    const childRows = db.prepare(
      `SELECT id, parent_artifact_id, file_name, file_path, role, mime_type, meta_json
         FROM artifacts
        WHERE parent_artifact_id IN (${placeholders})
        ORDER BY role, file_name`
    ).all(...ids);
    const { OUTPUT_ROOT } = require('../engine/pipeline/artifact-saver');
    for (const c of childRows) {
      // M-fix: static_url — iframe 의 상대 경로가 자기 폴더 기준으로 해석되도록
      //   /api/.../file 은 single endpoint 라 그 위치의 ../images/foo.png 같은 상대 src 깨짐.
      //   /static/output/<rel> 로 서빙하면 자식 파일이 자기 폴더 안에 있는 것처럼 동작.
      let staticUrl = null;
      try {
        const abs = path.resolve(c.file_path);
        const root = path.resolve(OUTPUT_ROOT);
        if (abs.startsWith(root + path.sep)) {
          const rel = abs.slice(root.length).replace(/\\/g, '/').replace(/^\/+/, '');
          staticUrl = '/static/output/' + rel.split('/').map(encodeURIComponent).join('/');
        }
      } catch {}
      (childrenByParent[c.parent_artifact_id] = childrenByParent[c.parent_artifact_id] || []).push({
        id: c.id,
        file_name: c.file_name,
        role: c.role,
        mime_type: c.mime_type,
        static_url: staticUrl,
        sub_rel_path: (() => {
          try { return (JSON.parse(c.meta_json || '{}').sub_rel_path) || null; } catch { return null; }
        })()
      });
    }
  }

  // 메인도 static_url 추가 (MARKUP, STYLE, INTERACTION, SB-html 등 단일 시안 미리보기 위해)
  const { OUTPUT_ROOT: _OR } = require('../engine/pipeline/artifact-saver');
  const _rootAbs = path.resolve(_OR);
  const _toStatic = (abs) => {
    try {
      const a = path.resolve(abs);
      if (!a.startsWith(_rootAbs + path.sep)) return null;
      return '/static/output/' + a.slice(_rootAbs.length).replace(/\\/g, '/').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
    } catch { return null; }
  };
  const enriched = mains.map(r => {
    let meta = {};
    try { meta = JSON.parse(r.meta_json || '{}'); } catch {}
    return Object.assign({}, r, {
      meta,
      artifact_dir: meta.artifact_dir || null,
      review_score: (meta.review && meta.review.score) || null,
      review_gate: (meta.review && meta.review.gate) || null,
      static_url: _toStatic(r.file_path),
      children: childrenByParent[r.id] || []
    });
  });
  res.json(enriched);
});

// R1: POST /api/projects/:id/figma-push — 산출물 HTML 을 Figma 로 자동 전송
//   body: { artifactId } — push 대상 (FINAL/MARKUP/HTML 자식)
//   동작: claude CLI subprocess 로 /figma-push 실행 → captureId + figmaendpoint 추출
//   응답: { ok, captureId, figmaendpoint, chromeUrl, figmaFileKey? }
//   사용자 브라우저가 chromeUrl 을 새 탭으로 열어 Figma 데스크탑 앱이 캡처 수신.
router.post('/:id/figma-push', requireRole('admin', 'member'), async (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const { artifactId } = req.body || {};
  if (!artifactId) return res.status(400).json({ error: 'ESYS-FIGMA-001', message: 'artifactId required' });

  const art = db.prepare(
    'SELECT id, project_id, file_path, file_name, mime_type FROM artifacts WHERE id = ?'
  ).get(artifactId);
  if (!art || String(art.project_id) !== String(req.params.id)) {
    return res.status(404).json({ error: 'ESYS-FIGMA-002', message: 'Artifact not found' });
  }
  // HTML 만 허용
  const isHtml = (art.mime_type || '').startsWith('text/html') || /\.(html|htm)$/i.test(art.file_name);
  if (!isHtml) {
    return res.status(400).json({ error: 'ESYS-FIGMA-003', message: 'HTML 산출물만 Figma push 가능' });
  }
  const fs = require('fs');
  if (!fs.existsSync(art.file_path)) {
    return res.status(404).json({ error: 'ESYS-FIGMA-004', message: 'File missing on disk' });
  }

  const { getProvider } = require('../engine/model-bridge');
  const provider = getProvider();
  if (provider.getProviderName() !== 'claude-code' || typeof provider.invokeSlashCommand !== 'function') {
    return res.status(503).json({
      error: 'ESYS-FIGMA-005',
      message: `Figma push 는 claude-code provider + invokeSlashCommand 필요 (현재 ${provider.getProviderName()})`
    });
  }

  // 슬래시 명령 — figma-push 자동 탐색 키워드 + HTML 경로
  const slashLine = `/figma-push ${art.file_path}`;
  let result;
  try {
    result = await provider.invokeSlashCommand(slashLine, { timeout: 180000, effort: 'high' });
  } catch (e) {
    return res.status(500).json({ error: 'ESYS-FIGMA-006', message: e.message });
  }

  if (!result.ok) {
    return res.status(502).json({
      error: 'ESYS-FIGMA-007',
      message: result.error || 'claude CLI 실패',
      raw: (result.content || '').slice(0, 500)
    });
  }

  // Chrome 캡처 URL — figma-export.md F4 패턴
  //   {file://html}#figmacapture=<id>&figmaendpoint=<encoded endpoint>
  //   단 file:// 은 보안상 브라우저가 거부할 수 있음 → /static/output 경로 사용
  const { OUTPUT_ROOT: _OR2 } = require('../engine/pipeline/artifact-saver');
  const _root2 = path.resolve(_OR2);
  const abs2 = path.resolve(art.file_path);
  let chromeUrl = null;
  if (result.captureId && result.figmaendpoint) {
    if (abs2.startsWith(_root2 + path.sep)) {
      const rel = abs2.slice(_root2.length).replace(/\\/g, '/').replace(/^\/+/, '');
      const staticPath = '/static/output/' + rel.split('/').map(encodeURIComponent).join('/');
      const token = req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : (req.query.access_token || '');
      const base = `http://localhost:${process.env.PORT || 3747}${staticPath}?access_token=${encodeURIComponent(token)}`;
      chromeUrl = `${base}#figmacapture=${result.captureId}&figmaendpoint=${encodeURIComponent(result.figmaendpoint)}&figmadelay=4000`;
    }
  }

  // 채팅 알림 — 사용자가 결과 확인
  try {
    const { addMessage } = require('../db');
    addMessage({ projectId: parseInt(req.params.id, 10), role: 'assistant', kind: 'status',
      content: result.captureId
        ? `Figma push 준비 완료 (artifact=${art.file_name}, captureId=${result.captureId}). Chrome 새 탭으로 캡처 페이지가 열립니다.${result.figmaFileKey ? '\nFigma 파일: https://www.figma.com/file/' + result.figmaFileKey : ''}`
        : `Figma push 응답 수신 — captureId 추출 실패. raw: ${(result.content || '').slice(0, 200)}` });
  } catch {}

  res.json({
    ok: true,
    artifactId: art.id,
    captureId: result.captureId,
    figmaendpoint: result.figmaendpoint,
    figmaFileKey: result.figmaFileKey,
    chromeUrl,
    content_preview: (result.content || '').slice(0, 400)
  });
  logActivity('project', parseInt(req.params.id, 10), 'figma_push',
    `artifact=${art.id} capture=${result.captureId || 'none'}`, req.user.id);
});

// R2: POST /api/projects/:id/figma-push — xcipe UI 에서 한 클릭 Figma push
//   body: { html_path | artifact_id, page?, output_mode='newFile' }
//   응답: { ok, captureId, figmaendpoint, chromeUrl, htmlPath, outputMode }
//   클라이언트: window.open(chromeUrl) → Chrome 새 탭 → Figma 데스크탑 앱 핸드셰이크
router.post('/:id/figma-push', requireRole('admin', 'member'), async (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const body = req.body || {};
  // camelCase / snake_case 둘 다 허용
  const artifactId = body.artifact_id ?? body.artifactId;
  const htmlPath = body.html_path ?? body.htmlPath;
  const page = body.page || '';
  const outputMode = body.output_mode || body.outputMode || 'newFile';
  let target = htmlPath;
  if (artifactId) {
    const art = db.prepare('SELECT file_path FROM artifacts WHERE id = ? AND project_id = ?').get(artifactId, req.params.id);
    if (!art) return res.status(404).json({ error: 'ESYS-FP-001', message: 'artifact 없음' });
    target = art.file_path;
  }
  if (!target) return res.status(400).json({ error: 'ESYS-FP-002', message: 'html_path 또는 artifact_id 필요' });
  if (!/\.html?$/i.test(target)) return res.status(400).json({ error: 'ESYS-FP-003', message: '.html 파일만 가능' });
  try {
    const { preparePush } = require('../engine/figma-push-runner');
    const r = await preparePush({ htmlPath: target, page, outputMode });
    if (!r.ok) return res.status(502).json({ error: 'ESYS-FP-004', message: r.error, raw: r.raw });
    logActivity('figma', null, 'push_prepared', `cid=${r.captureId} html=${path.basename(target)}`, req.user.id);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: 'ESYS-FP-005', message: err.message });
  }
});

// L3: GET /api/projects/:id/artifacts/:artifactId/file — 부속(자식) 파일 단건 서빙
//   :artifactId 는 자식 artifact id. 메인 id 가 잘못 오면 403.
//   path traversal / 프로젝트 격리 / mime 자동.
router.get('/:id/artifacts/:artifactId/file', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const art = db.prepare(
    'SELECT id, project_id, file_path, mime_type, parent_artifact_id FROM artifacts WHERE id = ?'
  ).get(req.params.artifactId);
  if (!art || String(art.project_id) !== String(req.params.id)) {
    return res.status(404).json({ error: 'ESYS-ART-001', message: 'Artifact not found' });
  }
  // 메인 / 자식 모두 허용 — 단 file_path 가 OUTPUT 루트 안인지 검증
  const { OUTPUT_ROOT } = require('../engine/pipeline/artifact-saver');
  const absPath = path.resolve(art.file_path);
  const rootAbs = path.resolve(OUTPUT_ROOT);
  if (!absPath.startsWith(rootAbs + path.sep) && absPath !== rootAbs) {
    return res.status(403).json({ error: 'ESYS-ART-003', message: 'Path outside OUTPUT_ROOT' });
  }
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({ error: 'ESYS-ART-004', message: 'File missing on disk' });
  }
  res.setHeader('Content-Type', art.mime_type || 'application/octet-stream');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.sendFile(absPath);
});

// C2: GET /api/projects/:id/export.json — 프로젝트 메타+산출물 메타+티켓+메시지를 JSON으로 백업
// import 시 동일 코드의 새 프로젝트 생성. 산출물 파일 자체는 포함하지 않음 (zip 사용).
router.get('/:id/export.json', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  const artifacts = db.prepare(
    'SELECT id, type, version, file_name, file_path, meta_json, created_at FROM artifacts WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  const tickets = db.prepare(
    'SELECT id, ticket_number, title, type, description, status, created_at FROM tickets WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  const messages = db.prepare(
    'SELECT role, kind, content, created_at FROM messages WHERE project_id = ? ORDER BY id ASC LIMIT 1000'
  ).all(req.params.id);
  const pipelines = db.prepare(
    'SELECT id, status, current_phase, current_step, progress, started_at, completed_at, created_at FROM pipelines WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const safeName = String(project.code || `project-${project.id}`).replace(/[^A-Za-z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}-export.json"`);
  res.json({
    schema: 'eluo-sys.project-export.v1',
    exported_at: new Date().toISOString(),
    project: {
      name: project.name, code: project.code, type: project.type,
      description: project.description, prompt: project.prompt,
      status: project.status, completion_level: project.completion_level,
      tech_stack: project.tech_stack, framework: project.framework,
      reference_url: project.reference_url, optional_skills: project.optional_skills,
      created_at: project.created_at
    },
    artifacts, tickets, messages, pipelines
  });
  logActivity('project', project.id, 'exported_json', `메타 JSON 백업`, req.user.id);
});

// C2: POST /api/projects/import — JSON에서 프로젝트 메타 복원 (admin/member)
// 충돌 시 코드 뒤에 _imported_{ts} 접미사. 산출물 파일은 미포함이므로 메타만 복원.
router.post('/import', requireRole('admin', 'member'), (req, res) => {
  // ISOLATION: create-self — import는 새 프로젝트 생성, created_by 는 본인으로 자동
  const data = req.body;
  if (!data || data.schema !== 'eluo-sys.project-export.v1' || !data.project) {
    return res.status(400).json({ error: 'ESYS-PRJ-019', message: 'export 스키마가 일치하지 않습니다' });
  }
  const p = data.project;
  if (!p.name || !p.code) {
    return res.status(400).json({ error: 'ESYS-PRJ-020', message: 'project.name/code 누락' });
  }

  // 코드 충돌 시 접미사
  let code = p.code;
  const collision = db.prepare('SELECT id FROM projects WHERE code = ?').get(code);
  if (collision) {
    const ts = Date.now().toString(36);
    code = `${p.code}_${ts}`.slice(0, 20);
  }
  if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(code)) {
    return res.status(400).json({ error: 'ESYS-PRJ-013', message: '복원된 코드가 형식을 만족하지 않습니다: ' + code });
  }

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO projects (name, code, type, description, prompt, status,
        completion_level, tech_stack, framework, reference_url, optional_skills, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.name, code, p.type || 'web', p.description || null, p.prompt || null,
      p.status || 'active', p.completion_level || 1,
      p.tech_stack || null, p.framework || null, p.reference_url || null,
      p.optional_skills || null, req.user.id
    );
    const newId = result.lastInsertRowid;

    // 티켓 메타 복원 (ticket_number 충돌 회피용 prefix)
    if (Array.isArray(data.tickets)) {
      for (const t of data.tickets) {
        if (!t.title || !t.type) continue;
        const newNumber = `IMP_${newId}_${t.ticket_number || t.id || Date.now()}`.slice(0, 50);
        try {
          db.prepare(`
            INSERT INTO tickets (project_id, ticket_number, title, type, description, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(newId, newNumber, t.title, t.type, t.description || null, t.status || 'open', req.user.id);
        } catch { /* 충돌 시 skip */ }
      }
    }

    return newId;
  });

  try {
    const newId = tx();
    logActivity('project', newId, 'imported', `JSON에서 복원 (원본 코드 ${p.code})`, req.user.id);
    res.status(201).json({ ok: true, project_id: newId, code, original_code: p.code });
  } catch (err) {
    res.status(500).json({ error: 'ESYS-PRJ-021', message: 'import 실패: ' + err.message });
  }
});

// C1: GET /api/projects/:id/artifacts.zip — 전체 산출물 zip 다운로드
// 프로젝트 모든 artifact의 file_path 를 읽어 zip으로 스트리밍.
// 파일이 없거나 읽기 실패한 항목은 manifest.json 에 기록하고 건너뜀.
router.get('/:id/artifacts.zip', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const project = db.prepare('SELECT id, code, name FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  const artifacts = db.prepare(
    'SELECT id, skill_name, file_name, file_path, version, created_at FROM artifacts WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  if (artifacts.length === 0) {
    return res.status(404).json({ error: 'ESYS-ART-003', message: '산출물이 없습니다' });
  }

  const safeName = String(project.code || `project-${project.id}`).replace(/[^A-Za-z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}-artifacts.zip"`);

  const { ZipStream } = require('../engine/zip-stream');
  const zip = new ZipStream(res);

  const manifest = {
    project: { id: project.id, code: project.code, name: project.name },
    exported_at: new Date().toISOString(),
    artifacts: []
  };

  // 동일 파일명 충돌 회피용 카운터
  const usedNames = new Set();
  function uniqueName(base) {
    if (!usedNames.has(base)) { usedNames.add(base); return base; }
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    let i = 2;
    while (usedNames.has(`${stem}_${i}${ext}`)) i++;
    const n = `${stem}_${i}${ext}`;
    usedNames.add(n);
    return n;
  }

  for (const a of artifacts) {
    const entry = {
      id: a.id, skill: a.skill_name, file_name: a.file_name,
      version: a.version, created_at: a.created_at, included: false
    };
    try {
      if (a.file_path && fs.existsSync(a.file_path)) {
        const buf = fs.readFileSync(a.file_path);
        // 폴더: artifacts/{skill_name}/{file_name}
        const skillDir = String(a.skill_name || 'misc').replace(/[/\\]/g, '_');
        const arcName = uniqueName(`artifacts/${skillDir}/${a.file_name}`);
        const mtime = a.created_at ? new Date(a.created_at + 'Z') : new Date();
        zip.addFile(arcName, buf, isNaN(mtime.getTime()) ? new Date() : mtime);
        entry.included = true;
        entry.archive_path = arcName;
      } else {
        entry.error = 'file_missing';
      }
    } catch (err) {
      entry.error = err.message;
    }
    manifest.artifacts.push(entry);
  }

  // manifest.json 마지막에 포함
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.finish();

  logActivity('project', project.id, 'exported', `산출물 ${artifacts.length}건 zip 다운로드`, req.user.id);
});

// T1-B: GET /api/projects/:id/files — 프로젝트 output/ 폴더 트리 + latest 표시
//   응답: { project, output_root, latest, tree: [{ name, type, size?, mtime, children?, is_latest }] }
//   tree는 2단계 깊이 (날짜 폴더 + 그 안의 파일들)
//   member는 본인 프로젝트만 (ownsProject 가드)
const OUTPUT_ROOT = path.join(__dirname, '..', '..', 'output');

function _readDirTree(dir, depth = 2) {
  if (depth === 0 || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).map(e => {
    const full = path.join(dir, e.name);
    let stat; try { stat = fs.statSync(full); } catch { return null; }
    const node = {
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      mtime: stat.mtime.toISOString()
    };
    if (e.isDirectory()) {
      node.children = depth > 1 ? _readDirTree(full, depth - 1) : null;
    } else {
      node.size = stat.size;
    }
    return node;
  }).filter(Boolean).sort((a, b) => b.mtime.localeCompare(a.mtime));
}

router.get('/:id/files', (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const project = db.prepare('SELECT id, code FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  const projDir = path.join(OUTPUT_ROOT, project.code);
  if (!fs.existsSync(projDir)) {
    return res.json({ project: { id: project.id, code: project.code }, output_root: projDir, latest: null, tree: [] });
  }
  const tree = _readDirTree(projDir, 2);
  // 최상위 날짜 폴더 중 mtime 최신 = latest (이미 mtime desc 정렬되어 있음)
  const dateFolders = tree.filter(n => n.type === 'dir');
  const latest = dateFolders.length ? dateFolders[0].name : null;
  // is_latest 표기
  tree.forEach(n => { if (n.type === 'dir' && n.name === latest) n.is_latest = true; });

  res.json({
    project: { id: project.id, code: project.code },
    output_root: projDir,
    latest,
    tree
  });
});

// T1-B: GET /api/projects/:id/files/raw?path=... — 텍스트 파일 본문 (텍스트 확장자만)
//   path는 프로젝트 폴더 내 상대 경로. ../ 같은 traversal 차단.
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.html', '.css', '.js', '.csv', '.yaml', '.yml', '.svg']);
router.get('/:id/files/raw', (req, res) => {
  const access = ownsProject(req);
  if (!access.ok) return res.status(access.status).json(access.body);
  const project = db.prepare('SELECT id, code FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-003', message: 'Project not found' });

  const rel = (req.query.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return res.status(400).json({ error: 'ESYS-FIL-001', message: '잘못된 경로' });
  const ext = path.extname(rel).toLowerCase();
  if (!TEXT_EXTS.has(ext)) return res.status(415).json({ error: 'ESYS-FIL-002', message: '텍스트 확장자만 지원' });

  const projDir = path.join(OUTPUT_ROOT, project.code);
  const fullPath = path.resolve(projDir, rel);
  if (!fullPath.startsWith(path.resolve(projDir))) return res.status(400).json({ error: 'ESYS-FIL-003', message: '경로 범위 초과' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'ESYS-FIL-004', message: '파일 없음' });

  const stat = fs.statSync(fullPath);
  if (stat.size > 2 * 1024 * 1024) return res.status(413).json({ error: 'ESYS-FIL-005', message: '파일이 너무 큼 (2MB 초과)' });

  const content = fs.readFileSync(fullPath, 'utf8');
  res.json({ path: rel, ext, size: stat.size, mtime: stat.mtime.toISOString(), content });
});

// IA-A018: GET /api/projects/:id/artifacts/:aid (FN-020)
router.get('/:id/artifacts/:aid', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!artifact) return res.status(404).json({ error: 'ESYS-ART-001', message: 'Artifact not found' });

  let content = '';
  try {
    content = fs.readFileSync(artifact.file_path, 'utf-8');
  } catch (e) {
    content = '[파일 읽기 실패]';
  }
  res.json({ ...artifact, content });
});

// IA-A019: GET /api/projects/:id/artifacts/:aid/download (FN-021)
router.get('/:id/artifacts/:aid/download', (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!artifact) return res.status(404).json({ error: 'ESYS-ART-001', message: 'Artifact not found' });
  if (!fs.existsSync(artifact.file_path)) {
    return res.status(404).json({ error: 'ESYS-ART-002', message: 'File not found on disk' });
  }
  res.download(artifact.file_path, artifact.file_name);
});

// GET /api/projects/:id/artifacts/:aid/export?format=html|pdf
// 기획 단계 등 markdown 산출물을 HTML/PDF 로 변환해 다운로드
router.get('/:id/artifacts/:aid/export', async (req, res) => {
  const guard = ownsProject(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  const format = String(req.query.format || '').toLowerCase();
  if (!['html', 'pdf'].includes(format)) {
    return res.status(400).json({ error: 'ESYS-EXP-001', message: 'format must be html or pdf' });
  }
  const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!artifact) return res.status(404).json({ error: 'ESYS-ART-001', message: 'Artifact not found' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'ESYS-PRJ-001', message: 'Project not found' });

  try {
    const { exportArtifact } = require('../engine/artifact-export');
    const step = db.prepare('SELECT step, skill_name FROM pipeline_steps WHERE id = ?').get(artifact.pipeline_step_id);
    const stepLabel = step ? step.step : artifact.type;
    const out = await exportArtifact(artifact, project, stepLabel, format);
    const downloadName = path.basename(artifact.file_name, path.extname(artifact.file_name)) + '.' + out.extension;
    res.setHeader('Content-Type', out.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
    res.send(out.buffer);
  } catch (err) {
    console.error('[artifact-export] 실패:', err);
    res.status(500).json({ error: 'ESYS-EXP-002', message: err.message });
  }
});

module.exports = router;
