// Metrics endpoint — Prometheus text exposition format (E4)
//
// admin only. 외부 모니터링(Prometheus/Grafana)이 스크레이프 가능하도록
// 표준 포맷으로 노출. 의존성 없이 직접 작성.
const router = require('express').Router();
const fs = require('fs');
const os = require('os');
const { db } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

function safeCount(sql, ...args) {
  try { return db.prepare(sql).get(...args).c; } catch { return 0; }
}

router.get('/', (req, res) => {
  const lines = [];

  function emit(name, type, help, value, labels) {
    if (!emit._seen) emit._seen = new Set();
    if (!emit._seen.has(name)) {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      emit._seen.add(name);
    }
    const lbl = labels ? '{' + Object.entries(labels).map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`).join(',') + '}' : '';
    lines.push(`${name}${lbl} ${value}`);
  }

  // 프로젝트
  emit('esys_projects_total', 'gauge', '전체 프로젝트 수 (deleted 제외)',
    safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL"));
  for (const status of ['draft', 'in_progress', 'completed', 'archived']) {
    emit('esys_projects_by_status', 'gauge', '상태별 프로젝트 수',
      safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL AND status = ?", status),
      { status });
  }

  // 파이프라인
  for (const status of ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']) {
    emit('esys_pipelines_by_status', 'gauge', '상태별 파이프라인 수',
      safeCount("SELECT COUNT(*) as c FROM pipelines WHERE status = ?", status),
      { status });
  }

  // 티켓
  for (const status of ['open', 'in_progress', 'resolved', 'closed']) {
    emit('esys_tickets_by_status', 'gauge', '상태별 티켓 수',
      safeCount("SELECT COUNT(*) as c FROM tickets WHERE status = ?", status),
      { status });
  }

  // 사용자
  emit('esys_users_total', 'gauge', '활성 사용자 수',
    safeCount("SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL"));

  // 산출물 (24h)
  emit('esys_artifacts_created_24h', 'gauge', '최근 24시간 생성 산출물',
    safeCount("SELECT COUNT(*) as c FROM artifacts WHERE created_at >= datetime('now', '-1 day')"));
  emit('esys_artifacts_total', 'gauge', '전체 산출물 수',
    safeCount("SELECT COUNT(*) as c FROM artifacts"));

  // 활동 로그 (1h)
  emit('esys_activity_recent_1h', 'gauge', '최근 1시간 활동 로그',
    safeCount("SELECT COUNT(*) as c FROM activity_log WHERE created_at >= datetime('now', '-1 hour')"));

  // 에러 로그 (24h)
  emit('esys_errors_24h', 'gauge', '최근 24시간 에러 로그',
    safeCount("SELECT COUNT(*) as c FROM error_log WHERE created_at >= datetime('now', '-1 day')"));
  emit('esys_errors_1h', 'gauge', '최근 1시간 에러 로그',
    safeCount("SELECT COUNT(*) as c FROM error_log WHERE created_at >= datetime('now', '-1 hour')"));

  // G2: source/code 라벨별 24h 에러 카운트 — 카디널리티 폭주 방지를 위해 상위 30개로 제한
  try {
    const rows = db.prepare(`
      SELECT COALESCE(source, 'unknown') as source, COALESCE(code, '') as code, COUNT(*) as c
      FROM error_log WHERE created_at >= datetime('now', '-1 day')
      GROUP BY source, code ORDER BY c DESC LIMIT 30
    `).all();
    for (const r of rows) {
      emit('esys_errors_total', 'gauge', '24h 에러 누적 (source/code 라벨)',
        r.c, { source: r.source, code: r.code });
    }
  } catch { /* 무시 */ }

  // G2: 에러 예산 메트릭 — Grafana 알람 직접 연결 가능
  try {
    const { getErrorBudget } = require('../db');
    const eb = getErrorBudget();
    emit('esys_error_budget_limit', 'gauge', '에러 예산 한도', eb.day.limit, { window: '24h' });
    emit('esys_error_budget_limit', 'gauge', '에러 예산 한도', eb.hour.limit, { window: '1h' });
    emit('esys_error_budget_pct', 'gauge', '에러 예산 사용률 (0~1)',
      Math.round((eb.day.pct || 0) * 1000) / 1000, { window: '24h' });
    emit('esys_error_budget_pct', 'gauge', '에러 예산 사용률 (0~1)',
      Math.round((eb.hour.pct || 0) * 1000) / 1000, { window: '1h' });
    emit('esys_error_budget_exceeded', 'gauge', '에러 예산 초과 여부 (0/1)',
      eb.day.exceeded ? 1 : 0, { window: '24h' });
    emit('esys_error_budget_exceeded', 'gauge', '에러 예산 초과 여부 (0/1)',
      eb.hour.exceeded ? 1 : 0, { window: '1h' });
  } catch { /* 무시 */ }

  // O1: 파이프라인 단계 평균 소요시간 (ms) — 최근 7일, phase별
  try {
    const rows = db.prepare(`
      SELECT phase, AVG(duration_ms) as avg_ms, COUNT(*) as c
      FROM pipeline_steps
      WHERE duration_ms IS NOT NULL
        AND completed_at >= datetime('now', '-7 days')
      GROUP BY phase
    `).all();
    for (const r of rows) {
      if (r.phase && typeof r.avg_ms === 'number') {
        emit('esys_pipeline_step_avg_ms', 'gauge', '파이프라인 단계 평균 소요(ms, 7일)',
          Math.round(r.avg_ms), { phase: r.phase });
        emit('esys_pipeline_step_runs', 'gauge', '파이프라인 단계 실행 횟수(7일)',
          r.c, { phase: r.phase });
      }
    }
  } catch { /* 무시 */ }

  // DB 파일 크기
  const dbPath = process.env.DB_PATH || './data/eluo-sys.db';
  try {
    const st = fs.statSync(dbPath);
    emit('esys_db_size_bytes', 'gauge', 'SQLite 파일 크기 (바이트)', st.size);
  } catch { /* 무시 */ }

  // Node 프로세스 메트릭
  const mem = process.memoryUsage();
  emit('esys_process_heap_used_bytes', 'gauge', 'Node 힙 사용량', mem.heapUsed);
  emit('esys_process_heap_total_bytes', 'gauge', 'Node 힙 전체', mem.heapTotal);
  emit('esys_process_rss_bytes', 'gauge', 'RSS 메모리', mem.rss);
  emit('esys_process_uptime_seconds', 'counter', '프로세스 가동 시간', Math.round(process.uptime()));

  // OS 메트릭
  emit('esys_system_loadavg_1m', 'gauge', '1분 로드 평균', os.loadavg()[0]);
  emit('esys_system_freemem_bytes', 'gauge', '시스템 여유 메모리', os.freemem());

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

// JSON 형태도 함께 제공 (대시보드용)
router.get('/json', (req, res) => {
  const dbPath = process.env.DB_PATH || './data/eluo-sys.db';
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch {}
  const mem = process.memoryUsage();
  res.json({
    projects: {
      total: safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL"),
      draft: safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL AND status = 'draft'"),
      in_progress: safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL AND status = 'in_progress'"),
      completed: safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL AND status = 'completed'"),
      archived: safeCount("SELECT COUNT(*) as c FROM projects WHERE deleted_at IS NULL AND status = 'archived'")
    },
    pipelines: {
      running: safeCount("SELECT COUNT(*) as c FROM pipelines WHERE status = 'running'"),
      paused:  safeCount("SELECT COUNT(*) as c FROM pipelines WHERE status = 'paused'"),
      failed:  safeCount("SELECT COUNT(*) as c FROM pipelines WHERE status = 'failed'")
    },
    artifacts: {
      total: safeCount("SELECT COUNT(*) as c FROM artifacts"),
      last_24h: safeCount("SELECT COUNT(*) as c FROM artifacts WHERE created_at >= datetime('now', '-1 day')")
    },
    activity: {
      last_1h: safeCount("SELECT COUNT(*) as c FROM activity_log WHERE created_at >= datetime('now', '-1 hour')"),
      last_24h: safeCount("SELECT COUNT(*) as c FROM activity_log WHERE created_at >= datetime('now', '-1 day')")
    },
    errors: {
      last_24h: safeCount("SELECT COUNT(*) as c FROM error_log WHERE created_at >= datetime('now', '-1 day')")
    },
    process: {
      heap_used: mem.heapUsed,
      heap_total: mem.heapTotal,
      rss: mem.rss,
      uptime_sec: Math.round(process.uptime())
    },
    db: { size_bytes: dbSize, path: dbPath },
    system: {
      loadavg_1m: os.loadavg()[0],
      freemem: os.freemem(),
      totalmem: os.totalmem()
    },
    generated_at: new Date().toISOString()
  });
});

module.exports = router;
