const router = require('express').Router();
const { db, MODEL_PRICING, getCostUsage, getErrorBudget } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// IA-A032: GET /api/dashboard/summary (FN-001)
router.get('/summary', (req, res) => {
  const projects = {
    total: db.prepare('SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL').get().c,
    active: db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'active' AND deleted_at IS NULL").get().c,
    completed: db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'completed' AND deleted_at IS NULL").get().c
  };
  const artifacts = {
    total: db.prepare('SELECT COUNT(*) as c FROM artifacts').get().c
  };
  const tickets = {
    open: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'open'").get().c,
    in_progress: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'in_progress'").get().c,
    resolved: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'resolved'").get().c
  };
  const pipelines = {
    running: db.prepare("SELECT COUNT(*) as c FROM pipelines WHERE status = 'running'").get().c,
    completed: db.prepare("SELECT COUNT(*) as c FROM pipelines WHERE status = 'completed'").get().c
  };
  const recent_activity = db.prepare(`
    SELECT a.*, u.email as actor_email
    FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  res.json({
    projects, artifacts, tickets, pipelines, recent_activity,
    error_budget: getErrorBudget()  // F1: 에러 예산 배지용
  });
});

// P2-2: Reflexion — 스킬별 누적 실패 패턴 조회
// 관리자가 어느 스킬이 어떤 패턴으로 자주 실패하는지 파악할 수 있도록 노출.
router.get('/lessons', requireRole('admin'), (req, res) => {
  const lessons = db.prepare(`
    SELECT skill_name, pattern, lesson, occurrences, last_seen_at
    FROM skill_lessons
    ORDER BY occurrences DESC, last_seen_at DESC
    LIMIT 50
  `).all();
  // 스킬별 그룹핑
  const grouped = {};
  for (const l of lessons) {
    if (!grouped[l.skill_name]) grouped[l.skill_name] = [];
    grouped[l.skill_name].push(l);
  }
  res.json({ lessons, grouped, total: lessons.length });
});

// P3-1: GET /api/dashboard/token-usage — 토큰/비용 모니터링
//   ?days=N : 최근 N일 (기본 7), ?project_id=X : 특정 프로젝트만
//   집계: 합계, 모델별, 스킬별, 일별 시계열
//   admin 한정 — 비용/모델 분포는 운영 정보
router.get('/token-usage', requireRole('admin'), (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  const projectId = req.query.project_id ? parseInt(req.query.project_id, 10) : null;
  const since = `datetime('now', '-${days} days')`;

  const where = projectId
    ? `WHERE created_at >= ${since} AND project_id = ?`
    : `WHERE created_at >= ${since}`;
  const params = projectId ? [projectId] : [];

  const total = db.prepare(`
    SELECT
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage ${where}
  `).get(...params);

  const byModel = db.prepare(`
    SELECT
      model,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage ${where}
    GROUP BY model
    ORDER BY cost_usd DESC
  `).all(...params);

  const bySkill = db.prepare(`
    SELECT
      COALESCE(skill_name, '(unknown)') AS skill_name,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage ${where}
    GROUP BY skill_name
    ORDER BY cost_usd DESC
    LIMIT 20
  `).all(...params);

  const byDay = db.prepare(`
    SELECT
      DATE(created_at) AS day,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage ${where}
    GROUP BY day
    ORDER BY day ASC
  `).all(...params);

  // recent는 JOIN으로 projects.created_at도 노출되어 ${where}의 created_at이 ambiguous → alias 명시
  const recentWhere = projectId
    ? `WHERE t.created_at >= ${since} AND t.project_id = ?`
    : `WHERE t.created_at >= ${since}`;
  const recent = db.prepare(`
    SELECT t.*, p.name AS project_name, p.code AS project_code
    FROM token_usage t LEFT JOIN projects p ON t.project_id = p.id
    ${recentWhere}
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all(...params);

  // 2026-05-13: provider별 분리 집계 — UI 분기 표시용
  //   claude-api  → 비용 중심 레이아웃 (cost_usd 신뢰 가능, 실제 청구)
  //   claude-code → 사용량 중심 레이아웃 (cost_usd 는 API 환산 참고가, 실제는 구독 max plan)
  //   mock        → 테스트 모드 (0 원)
  const byProvider = db.prepare(`
    SELECT
      COALESCE(provider, 'unknown') AS provider,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cache_creation_tokens), 0) AS cache_creation_tokens,
      COALESCE(SUM(cache_read_tokens), 0) AS cache_read_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd_estimated
    FROM token_usage ${where}
    GROUP BY provider
    ORDER BY calls DESC
  `).all(...params);

  // 운영 의도:
  //   - api_billing  : 실제 청구 대상 (claude-api 만) — 비용 한도 모니터링 핵심
  //   - subscription : claude-code (claude.ai 구독) — 토큰 사용량/캐시 효율만 의미 있음
  const apiSum = byProvider.filter(p => p.provider === 'claude-api').reduce((a, p) => ({
    calls: a.calls + p.calls,
    input_tokens: a.input_tokens + p.input_tokens,
    output_tokens: a.output_tokens + p.output_tokens,
    cache_creation_tokens: a.cache_creation_tokens + p.cache_creation_tokens,
    cache_read_tokens: a.cache_read_tokens + p.cache_read_tokens,
    cost_usd: a.cost_usd + p.cost_usd_estimated
  }), { calls: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, cost_usd: 0 });

  const subSum = byProvider.filter(p => p.provider === 'claude-code').reduce((a, p) => ({
    calls: a.calls + p.calls,
    input_tokens: a.input_tokens + p.input_tokens,
    output_tokens: a.output_tokens + p.output_tokens,
    cache_creation_tokens: a.cache_creation_tokens + p.cache_creation_tokens,
    cache_read_tokens: a.cache_read_tokens + p.cache_read_tokens,
    cost_usd_estimated: a.cost_usd_estimated + p.cost_usd_estimated
  }), { calls: 0, input_tokens: 0, output_tokens: 0, cache_creation_tokens: 0, cache_read_tokens: 0, cost_usd_estimated: 0 });

  // cache hit rate — claude-code 구독자에게 효율 지표
  subSum.cache_hit_rate = (subSum.input_tokens + subSum.cache_read_tokens) > 0
    ? subSum.cache_read_tokens / (subSum.input_tokens + subSum.cache_read_tokens)
    : 0;

  res.json({
    days, projectId,
    pricing: MODEL_PRICING,
    total, byModel, bySkill, byDay, byProvider, recent,
    api_billing: apiSum,            // claude-api: 실비용 + 토큰
    subscription_usage: subSum,     // claude-code: 토큰 + 캐시 hit rate
    cost_usage: getCostUsage()      // A7: 일/월 한도 + 사용률 (api 기준)
  });
});

// A10: GET /api/dashboard/errors — 운영 진단용 error_log 집계·최근 로그
//   ?days=N (기본 7, 최대 90), ?source=pipeline-worker|http, ?limit=N (recent, 최대 200)
//   admin 한정 — 시스템 내부 에러 stack/context 노출
router.get('/errors', requireRole('admin'), (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const source = req.query.source || null;

  const since = `datetime('now', '-${days} days')`;
  const baseWhere = `WHERE created_at >= ${since}`;
  const where = source ? `${baseWhere} AND source = ?` : baseWhere;
  const params = source ? [source] : [];

  const total = db.prepare(`SELECT COUNT(*) AS c FROM error_log ${where}`).get(...params).c;

  const byCode = db.prepare(`
    SELECT code, COUNT(*) AS occurrences, MAX(created_at) AS last_seen_at
    FROM error_log ${where}
    GROUP BY code
    ORDER BY occurrences DESC
    LIMIT 20
  `).all(...params);

  const bySource = db.prepare(`
    SELECT source, COUNT(*) AS occurrences
    FROM error_log ${where}
    GROUP BY source
    ORDER BY occurrences DESC
  `).all(...params);

  const byDay = db.prepare(`
    SELECT DATE(created_at) AS day, COUNT(*) AS c
    FROM error_log ${where}
    GROUP BY day
    ORDER BY day ASC
  `).all(...params);

  // recent는 JOIN으로 projects.created_at도 노출되어 ${where}의 created_at이 ambiguous → alias 명시
  const recentWhere = source
    ? `WHERE e.created_at >= ${since} AND e.source = ?`
    : `WHERE e.created_at >= ${since}`;
  const recent = db.prepare(`
    SELECT e.id, e.source, e.code, e.message, e.context_json,
           e.project_id, e.pipeline_id, e.step_id, e.created_at,
           p.name AS project_name, p.code AS project_code
    FROM error_log e
    LEFT JOIN projects p ON e.project_id = p.id
    ${recentWhere}
    ORDER BY e.created_at DESC
    LIMIT ?
  `).all(...params, limit);

  res.json({ days, source, total, byCode, bySource, byDay, recent, budget: getErrorBudget() });
});

module.exports = router;
