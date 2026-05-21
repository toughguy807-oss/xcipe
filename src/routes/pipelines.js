const router = require('express').Router();
const { db, logActivity } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { assertProjectAccess, assertChildAccess, projectScopeFilter } = require('../middleware/project-access');
const { getStagesForLevel, getStagesForPreset, PRESETS } = require('../engine/pipeline-stages');
const worker = require('../engine/pipeline-worker');

router.use(authMiddleware);

// 파이프라인 단건/세부 라우트 공통 격리 가드 — :id 는 pipelines.id, 해당 pipeline.project_id 로 격리 검증
function guardPipelineById(req, res, next) {
  if (!req.params.id) return next();
  const g = assertChildAccess(req, { table: 'pipelines', idValue: req.params.id });
  if (!g.ok) return res.status(g.status).json(g.body);
  next();
}

// POST /api/pipelines (FN-16)
//   body: { project_id, prompt, preset? }
//     preset: 'design-only' | 'publish-only' | 'qa-only' | 'plan-only' | 'plan+design' | 'design+publish'
//             미지정 시 completion_level 기반 (기존 동작)
router.post('/', requireRole('admin', 'member'), (req, res) => {
  const { project_id, prompt, preset } = req.body;
  if (!project_id) return res.status(400).json({ error: 'ESYS-PIP-001', message: 'project_id required' });

  // 격리: 본인 프로젝트만 파이프라인 시작 가능
  const g = assertProjectAccess(req, project_id);
  if (!g.ok) return res.status(g.status).json(g.body);

  // v26: AI provider 사전 검증 — mock 은 더미 응답이라 실제 파이프라인 불가
  //   claude-api: API 키 필요
  //   claude-code: 본인 워커가 polling + claude CLI 인증 OK 필요
  const { getSetting } = require('../db');
  const aiProvider = getSetting('ai_provider') || 'claude-code';
  if (aiProvider === 'mock') {
    return res.status(412).json({
      error: 'ESYS-PIP-AI-001',
      message: 'AI provider 가 mock 모드입니다. 실제 파이프라인 실행 불가.',
      hint: '/admin/settings 에서 claude-code(분산 워커) 또는 claude-api(키 발급) 로 전환하세요.'
    });
  }
  if (aiProvider === 'claude-api') {
    const hasKey = !!(getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY);
    const userKey = !!db.prepare('SELECT anthropic_api_key FROM users WHERE id = ?').get(req.user.id)?.anthropic_api_key;
    if (!hasKey && !userKey) {
      return res.status(412).json({
        error: 'ESYS-PIP-AI-002',
        message: 'claude-api 모드인데 ANTHROPIC_API_KEY 가 없습니다.',
        hint: 'Variables 에 ANTHROPIC_API_KEY 추가 또는 본인 설정에 키 등록 필요.'
      });
    }
  }
  if (aiProvider === 'claude-code') {
    // 본인 워커가 polling 중인지 + claude CLI 인증 OK 인지 확인
    const myWorkerActive = db.prepare(`
      SELECT COUNT(*) AS n FROM pipeline_steps
      WHERE worker_id IS NOT NULL
        AND user_id = ?
        AND heartbeat_at > datetime('now', '-2 minutes')
    `).get(req.user.id).n;
    const userRow = db.prepare('SELECT claude_session_info FROM users WHERE id = ?').get(req.user.id);
    let claudeOk = false;
    if (userRow && userRow.claude_session_info) {
      try { claudeOk = !!(JSON.parse(userRow.claude_session_info).loggedIn); } catch {}
    }
    // active worker 가 1명도 없으면 (어떤 사용자든) 일단 차단
    const anyActiveWorker = db.prepare(`
      SELECT COUNT(*) AS n FROM pipeline_steps
      WHERE worker_id IS NOT NULL AND heartbeat_at > datetime('now', '-2 minutes')
    `).get().n;
    if (anyActiveWorker === 0 && req.user.role !== 'admin') {
      return res.status(412).json({
        error: 'ESYS-PIP-AI-003',
        message: '활성 워커가 없습니다. 본인 PC 에서 npm run worker 실행 필요.',
        hint: '/admin/users 에서 본인 토큰 발급 → PC 에서 워커 실행 → 새로고침 후 재시도.'
      });
    }
    if (!claudeOk && myWorkerActive === 0) {
      return res.status(412).json({
        error: 'ESYS-PIP-AI-004',
        message: '본인 워커가 polling 중이 아니거나 claude CLI 인증 OK 가 확인되지 않았습니다.',
        hint: '본인 PC 에서 claude /login 확인 후 npm run worker 재시작.'
      });
    }
  }

  const project = db.prepare('SELECT id, name, code, completion_level, optional_skills FROM projects WHERE id = ? AND deleted_at IS NULL').get(project_id);
  if (!project) return res.status(404).json({ error: 'ESYS-PIP-002', message: 'Project not found' });

  const level = project.completion_level || 1;
  let optSkills = [];
  try { if (project.optional_skills) optSkills = JSON.parse(project.optional_skills); } catch {}

  // preset 모드 — completion_level 무시, 명시된 phase 만
  let stages;
  if (preset) {
    if (!PRESETS[preset]) {
      return res.status(400).json({ error: 'ESYS-PIP-011', message: `Unknown preset: ${preset}. Valid: ${Object.keys(PRESETS).join(', ')}` });
    }
    stages = getStagesForPreset(preset, optSkills);
  } else {
    stages = getStagesForLevel(level, optSkills);
  }
  if (stages.length === 0) return res.status(400).json({ error: 'ESYS-PIP-003', message: 'No stages' });

  // 이미 실행 중인 파이프라인 체크
  const existing = db.prepare("SELECT id FROM pipelines WHERE project_id = ? AND status IN ('running','pending')").get(project_id);
  if (existing) {
    return res.status(409).json({ error: 'ESYS-PIP-004', message: 'Pipeline already running', pipeline_id: existing.id });
  }

  const runPrompt = (typeof prompt === 'string' && prompt.trim().length > 0) ? prompt.trim() : null;
  const result = db.prepare(
    "INSERT INTO pipelines (project_id, status, current_phase, started_at, prompt) VALUES (?, 'running', ?, datetime('now'), ?)"
  ).run(project_id, stages[0].phase, runPrompt);
  const pipelineId = result.lastInsertRowid;

  // v25: pipeline_steps.user_id — 분산 워커가 본인 작업만 claim 하도록 필터
  //   요청한 사용자(req.user.id)를 모든 step 에 주입. admin 이 다른 사람 프로젝트를 실행해도
  //   그 step 은 admin 의 워커가 처리하게 됨 (admin role 워커는 모든 작업 claim 가능 — worker.js 의 admin 분기)
  const insertStep = db.prepare(`
    INSERT INTO pipeline_steps (pipeline_id, phase, step, step_order, skill_name, status, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stages.forEach((s, idx) => {
    insertStep.run(pipelineId, s.phase, s.step, idx, s.skill, idx === 0 ? 'pending' : 'pending', req.user.id);
  });

  logActivity('pipeline', pipelineId, 'started', `${project.name} (Level ${level}, ${stages.length} steps)`, req.user.id);
  res.status(201).json({ id: pipelineId, project_id, status: 'running', total_steps: stages.length });
});

// GET /api/pipelines — 프로젝트별 파이프라인 목록 (최신순) — member 격리
router.get('/', (req, res) => {
  const { project_id } = req.query;

  // project_id 명시 시 격리 가드 — 타인 소유면 즉시 403
  if (project_id) {
    const g = assertProjectAccess(req, project_id);
    if (!g.ok) return res.status(g.status).json(g.body);
  }

  let where = 'WHERE 1=1';
  const args = [];
  if (project_id) { where += ' AND pi.project_id = ?'; args.push(project_id); }
  const scope = projectScopeFilter(req, 'p');
  where += scope.sql;
  args.push(...scope.params);
  const rows = db.prepare(`
    SELECT pi.id, pi.project_id, pi.status, pi.current_phase, pi.current_step, pi.progress,
           pi.error_message, pi.started_at, pi.completed_at, pi.created_at
    FROM pipelines pi
    JOIN projects p ON p.id = pi.project_id
    ${where} ORDER BY pi.id DESC LIMIT 20
  `).all(...args);
  res.json({ data: rows });
});

// 이하 모든 /:id 라우트에 격리 가드 적용
router.use('/:id', guardPipelineById);

// GET /api/pipelines/:id (FN-20) — 진행 상태 + 전체 단계
router.get('/:id', (req, res) => {
  const pipeline = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'ESYS-PIP-005', message: 'Pipeline not found' });

  const steps = db.prepare(`
    SELECT id, phase, step, step_order, skill_name, status, self_check_result,
           retry_count, duration_ms, error_message, started_at, completed_at, approved_at
    FROM pipeline_steps WHERE pipeline_id = ? ORDER BY step_order
  `).all(req.params.id);

  const total = steps.length;
  const approved = steps.filter(s => s.status === 'approved').length;
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0;

  res.json({ ...pipeline, progress, total_steps: total, approved_steps: approved, steps });
});

// GET /api/pipelines/:id/steps/:sid — 단일 step (산출물 내용 포함)
router.get('/:id/steps/:sid', (req, res) => {
  const step = db.prepare(`
    SELECT * FROM pipeline_steps WHERE id = ? AND pipeline_id = ?
  `).get(req.params.sid, req.params.id);
  if (!step) return res.status(404).json({ error: 'ESYS-PIP-006', message: 'Step not found' });
  res.json(step);
});

// POST /api/pipelines/:id/steps/:sid/approve (FN-18)
router.post('/:id/steps/:sid/approve', requireRole('admin', 'member'), (req, res) => {
  const r = worker.approveStep(+req.params.sid, req.user.id);
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

// POST /api/pipelines/:id/steps/:sid/reject (FN-19)
router.post('/:id/steps/:sid/reject', requireRole('admin', 'member'), (req, res) => {
  const r = worker.rejectStep(+req.params.sid, req.user.id, req.body.prompt || '');
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

// POST /api/pipelines/:id/steps/:sid/retry (FN-22)
router.post('/:id/steps/:sid/retry', requireRole('admin', 'member'), (req, res) => {
  const r = worker.retryStep(+req.params.sid, req.user.id);
  res.json(r);
});

// POST /api/pipelines/:id/steps/:sid/skip — 건너뛰기
router.post('/:id/steps/:sid/skip', requireRole('admin', 'member'), (req, res) => {
  db.prepare("UPDATE pipeline_steps SET status = 'skipped' WHERE id = ?").run(req.params.sid);
  worker.updatePipelineStatus(+req.params.id);
  logActivity('pipeline_step', req.params.sid, 'skipped', null, req.user.id);
  res.json({ ok: true });
});

// POST /api/pipelines/:id/pause — 파이프라인 일시정지
router.post('/:id/pause', requireRole('admin', 'member'), (req, res) => {
  const r = worker.pausePipeline(+req.params.id, req.user.id);
  if (!r.ok) return res.status(400).json({ error: 'ESYS-PIP-007', ...r });
  res.json(r);
});

// POST /api/pipelines/:id/resume — 파이프라인 재개
router.post('/:id/resume', requireRole('admin', 'member'), (req, res) => {
  const r = worker.resumePipeline(+req.params.id, req.user.id);
  if (!r.ok) return res.status(400).json({ error: 'ESYS-PIP-008', ...r });
  res.json(r);
});

// POST /api/pipelines/:id/cancel — 파이프라인 취소 (불가역)
router.post('/:id/cancel', requireRole('admin', 'member'), (req, res) => {
  const r = worker.cancelPipeline(+req.params.id, req.user.id);
  if (!r.ok) return res.status(400).json({ error: 'ESYS-PIP-009', ...r });
  res.json(r);
});

// POST /api/pipelines/:id/retry-all — 실패 step 일괄 재시도 (B1)
router.post('/:id/retry-all', requireRole('admin', 'member'), (req, res) => {
  const r = worker.retryFailedSteps(+req.params.id, req.user.id);
  if (!r.ok) return res.status(400).json({ error: 'ESYS-PIP-010', ...r });
  res.json(r);
});

module.exports = router;
