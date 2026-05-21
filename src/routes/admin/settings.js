// /api/admin/settings — 시스템 설정 (admin only)
//   AI provider · reviewer · backup · cost · retention · archive · error-budget · notify
const router = require('express').Router();
const { getSetting, setSetting } = require('../../db');
const { authMiddleware, requireRole } = require('../../auth');
const { resetProvider, testConnection, checkSession } = require('../../engine/model-bridge');

router.use(authMiddleware);
router.use(requireRole('admin'));

// GET /api/admin/settings/ai
//   PR1-B6: claudeCodeSession (loggedIn / email / plan / orgName) 포함
//           — shell.js AI pill 과 doctor 가 동일 데이터 공유
router.get('/ai', async (req, res) => {
  const provider = getSetting('ai_provider') || 'claude-code';
  const workerMode = (process.env.WORKER_MODE || 'local').toLowerCase();

  // v25: 분산 워커 모드 — 서버에서 직접 claude 호출 안 함. active worker token 보유 사용자가 있으면 ready.
  const { db } = require('../../db');
  const activeWorkers = workerMode === 'queue-only'
    ? db.prepare(`
        SELECT COUNT(DISTINCT user_id) AS n
        FROM pipeline_steps
        WHERE worker_id IS NOT NULL
          AND heartbeat_at > datetime('now', '-2 minutes')
      `).get().n
    : 0;
  const tokenIssued = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE worker_token IS NOT NULL AND deleted_at IS NULL`).get().n;

  // v26: 본인 워커가 claude CLI 인증 OK 여부 — users.claude_session_info 조회
  let myClaudeSession = null;
  if (req.user && req.user.id) {
    try {
      const row = db.prepare('SELECT claude_session_info FROM users WHERE id = ? AND deleted_at IS NULL').get(req.user.id);
      if (row && row.claude_session_info) {
        try { myClaudeSession = JSON.parse(row.claude_session_info); } catch {}
      }
    } catch {}
  }

  const payload = {
    provider,
    has_api_key: !!(getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY),
    model: getSetting('anthropic_model') || 'claude-opus-4-7',
    worker_mode: workerMode,                            // 'local' | 'queue-only'
    // v26: 본인 워커 polling + claude session 둘 다 OK 일 때 ready
    distributed_worker_ready: workerMode === 'queue-only' && activeWorkers > 0
      && !!(myClaudeSession && myClaudeSession.loggedIn),
    active_worker_count: activeWorkers,                  // 최근 2분 heartbeat 받은 워커 수
    worker_token_issued_count: tokenIssued,
    my_claude_session: myClaudeSession,                  // 본인 워커 보고한 claude CLI 상태
    my_worker_polling: !!(req.user && db.prepare(`
      SELECT COUNT(*) AS n FROM pipeline_steps
      WHERE worker_id IS NOT NULL
        AND user_id = ?
        AND heartbeat_at > datetime('now', '-2 minutes')
    `).get(req.user.id).n) || false
  };

  // 서버사이드 session check 는 local 모드에서만 의미. queue-only 면 OAuth 토큰 없어서 항상 실패하므로 skip.
  if (provider !== 'mock' && workerMode !== 'queue-only') {
    try {
      const session = await checkSession();
      payload.session = {
        ok: !!session.ok,
        loggedIn: !!session.loggedIn,
        authMethod: session.authMethod || null,
        email: session.email || null,
        orgName: session.orgName || null,
        plan: session.plan || null,
        hint: session.hint || null,
        error: session.error || null
      };
    } catch (err) {
      payload.session = { ok: false, loggedIn: false, error: err.message };
    }
  } else if (workerMode === 'queue-only') {
    // queue-only: 워커 1개 이상이 polling 중이면 loggedIn 처리. UI 가 step1 통과시키도록.
    let hintMsg;
    if (tokenIssued === 0) {
      hintMsg = '/admin/users 에서 본인 워커 토큰 발급 후 본인 PC 에서 npm run worker 실행';
    } else if (activeWorkers > 0) {
      hintMsg = '워커 토큰 ' + tokenIssued + '개 발급됨, 활성 ' + activeWorkers + '명 polling 중';
    } else {
      hintMsg = '워커 토큰 ' + tokenIssued + '개 발급됨, 폴링 워커 없음 (각자 PC 에서 npm run worker 실행)';
    }
    payload.session = {
      ok: tokenIssued > 0,
      loggedIn: tokenIssued > 0,
      authMethod: 'distributed-worker',
      email: null,
      hint: hintMsg,
      error: null
    };
  }

  res.json(payload);
});

// PUT /api/admin/settings/ai
//   PR2-D6: provider 전환 시 사전 검증 — claude-api/code 로 바꾸면서 키 없거나 미로그인이면
//           거부. body.force=true 시에만 무시하고 저장 (운영 비상 상황).
//   에러 코드: claude-api 키 없음=ESYS-SET-010, claude-code 미로그인=ESYS-SET-011
//   (006/007 은 error-budget 가 선점하고 있어 충돌 방지 목적으로 010/011 사용)
router.put('/ai', async (req, res) => {
  const { provider, api_key, model, force } = req.body;
  if (provider && !['mock', 'claude-api', 'claude-code'].includes(provider)) {
    return res.status(400).json({ error: 'ESYS-SET-001', message: 'Invalid provider' });
  }

  // 키는 우선 저장 (검증이 새 키 기반으로 동작하도록)
  if (api_key !== undefined) setSetting('anthropic_api_key', api_key);
  if (model) setSetting('anthropic_model', model);

  if (provider && provider !== 'mock' && !force) {
    if (provider === 'claude-api') {
      const hasKey = !!(getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY);
      if (!hasKey) {
        return res.status(400).json({
          error: 'ESYS-SET-010',
          message: 'claude-api 활성화 전에 ANTHROPIC_API_KEY 가 필요합니다. force:true 로 강제 저장 가능.'
        });
      }
    } else if (provider === 'claude-code') {
      // v26: claude-code 활성화 검증 — "어느 PC 의 로그인" 인지에 따라 분기.
      //   local 모드(서버가 직접 호출): 서버 컨테이너 OAuth 확인
      //   queue-only 모드(분산 워커): 요청한 admin 본인 PC 워커가 보고한 claude session 확인
      const workerMode = (process.env.WORKER_MODE || 'local').toLowerCase();
      if (workerMode === 'queue-only') {
        // 본인 워커가 polling 중이고 claude CLI 로그인 OK 여부 확인
        const { db } = require('../../db');
        const row = db.prepare('SELECT claude_session_info FROM users WHERE id = ?').get(req.user.id);
        let myClaudeOk = false;
        let sessionInfo = null;
        if (row && row.claude_session_info) {
          try {
            sessionInfo = JSON.parse(row.claude_session_info);
            myClaudeOk = !!sessionInfo.loggedIn;
          } catch {}
        }
        // v27: polling 활성 판정 — last_polled_at (워커 polling 자체) 또는 heartbeat_at (step 처리)
        const lastPolledRow = db.prepare(`SELECT last_polled_at FROM users WHERE id = ?`).get(req.user.id);
        const hasRecentPoll = !!(lastPolledRow && lastPolledRow.last_polled_at &&
          new Date(lastPolledRow.last_polled_at).getTime() > Date.now() - 2 * 60 * 1000);
        const hasActiveStep = !!db.prepare(`
          SELECT COUNT(*) AS n FROM pipeline_steps
          WHERE worker_id IS NOT NULL AND user_id = ?
            AND heartbeat_at > datetime('now', '-2 minutes')
        `).get(req.user.id).n;
        const myWorkerActive = hasRecentPoll || hasActiveStep;

        if (!myWorkerActive) {
          return res.status(400).json({
            error: 'ESYS-SET-011',
            message: '본인 PC 워커가 polling 중이 아닙니다. xcipe-worker 실행 확인 후 다시 시도하세요. force:true 로 강제 저장 가능.',
            hint: '대시보드 → 워커 설정 가이드 참고'
          });
        }
        if (!myClaudeOk) {
          return res.status(400).json({
            error: 'ESYS-SET-011',
            message: `본인 PC 의 claude CLI 로그인이 확인되지 않았습니다. 터미널에서 'claude /login' 실행 후 워커 재시작 필요. force:true 로 강제 저장 가능.`,
            hint: sessionInfo ? `최근 보고: ${JSON.stringify(sessionInfo)}` : '워커가 아직 session 정보를 보고하지 않았습니다 (가동 후 수초 대기 필요)'
          });
        }
      } else {
        // local 모드: 서버가 직접 처리하므로 컨테이너 OAuth 필요
        try {
          const ClaudeCodeProvider = require('../../engine/providers/claude-code-provider');
          const tmp = new ClaudeCodeProvider({ command: 'claude', timeout: 8000 });
          const session = await tmp.checkSession();
          if (!session.ok || !session.loggedIn) {
            return res.status(400).json({
              error: 'ESYS-SET-011',
              message: `claude-code 활성화 전에 OS 로그인 필요: ${session.hint || session.error || 'claude /login 실행'}. force:true 로 강제 저장 가능.`
            });
          }
        } catch (err) {
          return res.status(400).json({
            error: 'ESYS-SET-011',
            message: `claude-code 세션 점검 실패: ${err.message}. force:true 로 강제 저장 가능.`
          });
        }
      }
    }
  }

  if (provider) setSetting('ai_provider', provider);
  resetProvider();
  res.json({ ok: true });
});

// POST /api/admin/settings/ai/test
router.post('/ai/test', async (req, res) => {
  const { provider } = req.body;
  const result = await testConnection(provider);
  res.json(result);
});

// P3-3: GET /api/admin/settings/reviewer — reviewer 자동 게이트 임계값 + 실측 분포
//   retry: 미만이면 자동 재생성 (기본 60)
//   required: 미만이면 HITL 필수 (기본 70)
//   recommended: 미만이면 HITL 권고 (기본 90, 이상이면 자동 진행)
//   distribution: 최근 30일 pipeline_steps.review_score 분포 + tier별 통과율 + 추천 임계값
router.get('/reviewer', (req, res) => {
  const { db } = require('../../db');
  const retry = parseInt(getSetting('reviewer_threshold_retry') || '60', 10);
  const required = parseInt(getSetting('reviewer_threshold_required') || '70', 10);
  const recommended = parseInt(getSetting('reviewer_threshold_recommended') || '90', 10);

  let distribution = null;
  try {
    // review_score 전용 컬럼 미보유 → self_check_result 의 "N점" 패턴 추출 후 정렬
    //   예: "PASS · 78점" → 78
    const rows = db.prepare(`
      SELECT self_check_result AS s, completed_at
      FROM pipeline_steps
      WHERE self_check_result IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at >= datetime('now', '-30 days')
    `).all();
    const scores = rows
      .map(r => {
        const m = (r.s || '').match(/(\d+)\s*점/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter(n => n !== null && n >= 0 && n <= 100)
      .sort((a, b) => a - b);

    if (scores.length > 0) {
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = sum / scores.length;
      const median = scores[Math.floor(scores.length / 2)];
      const min = scores[0];
      const max = scores[scores.length - 1];
      const p25 = scores[Math.floor(scores.length * 0.25)];
      const p75 = scores[Math.floor(scores.length * 0.75)];

      // tier별 비율
      const tierCounts = {
        below_retry:    scores.filter(s => s < retry).length,
        below_required: scores.filter(s => s >= retry && s < required).length,
        below_recommended: scores.filter(s => s >= required && s < recommended).length,
        passed_recommended: scores.filter(s => s >= recommended).length
      };

      // 추천 임계값 — 분포 기반 자동 제안 (0~100 범위 강제 클램프)
      //   retry: max(40, p25-5)
      //   required: retry보다 최소 5 위, median-5
      //   recommended: required 보다 최소 5 위, p75
      const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
      const recRetry = clamp(Math.round(p25 - 5), 40, 80);
      const recRequired = clamp(Math.max(recRetry + 5, Math.round(median - 5)), recRetry + 1, 90);
      const recRecommended = clamp(Math.max(recRequired + 5, Math.round(p75)), recRequired + 1, 99);

      distribution = {
        sample_size: scores.length,
        period_days: 30,
        min, max, avg: Math.round(avg * 10) / 10, median, p25, p75,
        tier_counts: tierCounts,
        tier_percent: {
          below_retry:    Math.round(tierCounts.below_retry / scores.length * 100),
          below_required: Math.round(tierCounts.below_required / scores.length * 100),
          below_recommended: Math.round(tierCounts.below_recommended / scores.length * 100),
          passed_recommended: Math.round(tierCounts.passed_recommended / scores.length * 100)
        },
        recommended_thresholds: { retry: recRetry, required: recRequired, recommended: recRecommended }
      };
    }
  } catch (e) {
    distribution = { error: e.message };
  }

  res.json({ retry, required, recommended, distribution });
});

// PUT /api/admin/settings/reviewer
router.put('/reviewer', (req, res) => {
  const { retry, required, recommended } = req.body;
  const r = parseInt(retry, 10);
  const q = parseInt(required, 10);
  const c = parseInt(recommended, 10);
  if ([r, q, c].some(v => Number.isNaN(v) || v < 0 || v > 100)) {
    return res.status(400).json({ error: 'ESYS-SET-002', message: '임계값은 0~100 사이여야 합니다' });
  }
  if (!(r < q && q < c)) {
    return res.status(400).json({ error: 'ESYS-SET-003', message: 'retry < required < recommended 순서를 지켜야 합니다' });
  }
  // (line 위 reviewer 처리 계속)
  setSetting('reviewer_threshold_retry', String(r));
  setSetting('reviewer_threshold_required', String(q));
  setSetting('reviewer_threshold_recommended', String(c));
  res.json({ ok: true, retry: r, required: q, recommended: c });
});

// GET /api/admin/settings/figma — Figma sync 토큰 + 환경변수 우선순위 표시
router.get('/figma', (req, res) => {
  const dbToken = getSetting('figma_access_token') || null;
  const envToken =
    process.env.FIGMA_PERSONAL_ACCESS_TOKEN ||
    process.env.FIGMA_ACCESS_TOKEN ||
    process.env.FIGMA_TOKEN ||
    null;
  const envSource = process.env.FIGMA_PERSONAL_ACCESS_TOKEN ? 'FIGMA_PERSONAL_ACCESS_TOKEN'
                  : process.env.FIGMA_ACCESS_TOKEN          ? 'FIGMA_ACCESS_TOKEN'
                  : process.env.FIGMA_TOKEN                 ? 'FIGMA_TOKEN'
                  : null;
  // 마스킹 — 앞 8자 + 뒤 4자
  const mask = (t) => t ? (t.slice(0, 8) + '...' + t.slice(-4)) : null;
  res.json({
    env_token: mask(envToken),
    env_source: envSource,
    db_token: mask(dbToken),
    effective_source: envToken ? 'env' : (dbToken ? 'db' : null),
    hint: 'env 값이 있으면 우선. 로컬 개발 환경에서는 env, 운영에서는 DB 사용 권장 (env 변경 시 서버 재시작 필요)'
  });
});

// PUT /api/admin/settings/figma — DB 토큰 등록/갱신/제거
router.put('/figma', (req, res) => {
  const { figma_access_token } = req.body || {};
  if (figma_access_token === undefined) {
    return res.status(400).json({ error: 'ESYS-SET-010', message: 'figma_access_token 필수' });
  }
  if (figma_access_token && (typeof figma_access_token !== 'string' || !/^figd_[A-Za-z0-9_-]{20,}$/.test(figma_access_token))) {
    return res.status(400).json({ error: 'ESYS-SET-011', message: 'figd_ 로 시작하는 유효한 토큰이어야 합니다' });
  }
  if (figma_access_token) {
    setSetting('figma_access_token', figma_access_token);
  } else {
    // 빈 문자열 → 제거
    setSetting('figma_access_token', '');
  }
  res.json({ ok: true });
});

// POST /api/admin/settings/figma/test — 토큰 유효성 즉시 검증 (Figma /v1/me 호출)
router.post('/figma/test', async (req, res) => {
  const { getAccessToken } = require('../../engine/figma-sync');
  const token = getAccessToken();
  if (!token) return res.status(400).json({ ok: false, error: 'no_token', message: '토큰 미설정' });
  try {
    const r = await fetch('https://api.figma.com/v1/me', { headers: { 'X-Figma-Token': token } });
    if (!r.ok) {
      const text = await r.text();
      return res.json({ ok: false, status: r.status, error: text.slice(0, 200) });
    }
    const me = await r.json();
    res.json({ ok: true, email: me.email, handle: me.handle, img_url: me.img_url });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// A9: POST /api/admin/settings/backup — DB 백업 즉시 실행 (admin only)
//   응답: { ok, file, size_mb, duration_ms, retained_count }
//   백업은 backups/ 디렉터리에 저장되며 기본 30개 보존
router.post('/backup', async (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const zlib = require('zlib');
  const { pipeline } = require('stream/promises');
  const Database = require('better-sqlite3');

  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'data', 'eluo.db');
  const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'backups');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = (() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  })();
  const baseName = `eluo-${ts}.db`;
  const tempPath = path.join(BACKUP_DIR, `.${baseName}.tmp`);
  const finalPath = path.join(BACKUP_DIR, `${baseName}.gz`);

  const t0 = Date.now();
  try {
    const db2 = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    try { await db2.backup(tempPath); } finally { db2.close(); }

    await pipeline(
      fs.createReadStream(tempPath),
      zlib.createGzip({ level: 6 }),
      fs.createWriteStream(finalPath)
    );
    fs.unlinkSync(tempPath);

    // 30개 보존
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => /^eluo-\d{8}-\d{4}\.db\.gz$/.test(f))
      .map(f => ({ f, full: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const { full } of files.slice(30)) fs.unlinkSync(full);

    const sizeMb = fs.statSync(finalPath).size / 1024 / 1024;
    res.json({
      ok: true,
      file: path.basename(finalPath),
      size_mb: +sizeMb.toFixed(2),
      duration_ms: Date.now() - t0,
      retained_count: Math.min(files.length, 30)
    });
  } catch (err) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    res.status(500).json({ error: 'ESYS-BAK-001', message: err.message });
  }
});

// G3: POST /api/admin/settings/backup/verify — 백업 무결성 검증
//   body.all=true 면 전체 파일 검증, 기본은 최신 1개만
router.post('/backup/verify', (req, res) => {
  try {
    const { verifyAll, verifyLatest } = require('../../engine/backup-verify');
    const all = req.body && req.body.all === true;
    res.json(all ? verifyAll() : verifyLatest());
  } catch (err) {
    res.status(500).json({ error: 'ESYS-BAK-002', message: err.message });
  }
});

router.get('/backup/list', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'backups');
  if (!fs.existsSync(BACKUP_DIR)) return res.json({ files: [] });
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^eluo-\d{8}-\d{4}\.db\.gz$/.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size_mb: +(stat.size / 1024 / 1024).toFixed(2), mtime: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  res.json({ files });
});

// A7: GET /api/admin/settings/cost-limits — 일/월 비용 한도 + 경고 임계
//   0 또는 빈 값이면 제한 없음 (기본). alert_pct는 1~100 (기본 80)
router.get('/cost-limits', (req, res) => {
  res.json({
    daily_usd: parseFloat(getSetting('cost_limit_daily_usd') || '0'),
    monthly_usd: parseFloat(getSetting('cost_limit_monthly_usd') || '0'),
    alert_at_pct: parseFloat(getSetting('cost_alert_at_pct') || '80')
  });
});

router.put('/cost-limits', (req, res) => {
  const { daily_usd, monthly_usd, alert_at_pct } = req.body;
  const d = Number(daily_usd);
  const m = Number(monthly_usd);
  const p = Number(alert_at_pct);
  if ([d, m].some(v => Number.isNaN(v) || v < 0)) {
    return res.status(400).json({ error: 'ESYS-SET-004', message: '한도는 0 이상의 USD 금액이어야 합니다' });
  }
  if (Number.isNaN(p) || p < 1 || p > 100) {
    return res.status(400).json({ error: 'ESYS-SET-005', message: '경고 임계는 1~100 사이여야 합니다' });
  }
  setSetting('cost_limit_daily_usd', String(d));
  setSetting('cost_limit_monthly_usd', String(m));
  setSetting('cost_alert_at_pct', String(p));
  res.json({ ok: true, daily_usd: d, monthly_usd: m, alert_at_pct: p });
});

// G1: GET/PUT /api/admin/settings/retention — 운영 로그 보존기간 (admin only)
//   activity_log_retention_days: activity_log 보존일수 (기본 90, 0=영구)
//   error_log_retention_days:    error_log 보존일수 (기본 30, 0=영구)
router.get('/retention', (req, res) => {
  res.json({
    activity_days: parseInt(getSetting('activity_log_retention_days') || '90', 10) || 0,
    error_days:    parseInt(getSetting('error_log_retention_days') || '30', 10) || 0
  });
});

router.put('/retention', (req, res) => {
  const { activity_days, error_days } = req.body;
  const a = parseInt(activity_days, 10);
  const e = parseInt(error_days, 10);
  if ([a, e].some(v => Number.isNaN(v) || v < 0 || v > 3650)) {
    return res.status(400).json({ error: 'ESYS-SET-009', message: '보존일수는 0~3650 사이여야 합니다 (0=영구)' });
  }
  setSetting('activity_log_retention_days', String(a));
  setSetting('error_log_retention_days', String(e));
  res.json({ ok: true, activity_days: a, error_days: e });
});

// POST /api/admin/settings/retention/run — 즉시 실행 (수동 트리거)
router.post('/retention/run', (req, res) => {
  try {
    const { runRetentionCleanup } = require('../../engine/retention-cleanup');
    res.json(runRetentionCleanup());
  } catch (err) {
    res.status(500).json({ error: 'ESYS-RET-001', message: err.message });
  }
});

// G6: GET /api/admin/settings/dedupe-stats — artifact dedupe 통계 (admin only)
router.get('/dedupe-stats', (req, res) => {
  try {
    const { getDedupeStats } = require('../../engine/pipeline/artifact-saver');
    res.json(getDedupeStats());
  } catch (err) {
    res.status(500).json({ error: 'ESYS-DEDUP-001', message: err.message });
  }
});

// G4: GET /api/admin/settings/cost-report?date=YYYY-MM-DD — 일일 토큰 비용 집계 (admin only)
//   date 생략 시 오늘. by_project / by_model / by_skill 그룹화
router.get('/cost-report', (req, res) => {
  try {
    const { generateDailyReport } = require('../../engine/cost-report');
    const date = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : null;
    res.json(generateDailyReport(date));
  } catch (err) {
    res.status(500).json({ error: 'ESYS-COST-001', message: err.message });
  }
});

// POST /api/admin/settings/cost-report/run — 어제 날짜 리포트를 강제 실행 (디바운스 우회 X)
//   body.date 지정 시 해당 일자 강제 실행 (디바운스 무시 — 단, last_daily_cost_report_date 갱신은 스케줄러용)
router.post('/cost-report/run', (req, res) => {
  try {
    const { runDailyReport, generateDailyReport } = require('../../engine/cost-report');
    const date = req.body && req.body.date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : null;
    // 강제 실행은 generateDailyReport (디바운스 우회), 스케줄용은 runDailyReport
    if (req.body && req.body.force === true) {
      res.json(generateDailyReport(date));
    } else {
      res.json(runDailyReport(date));
    }
  } catch (err) {
    res.status(500).json({ error: 'ESYS-COST-002', message: err.message });
  }
});

// F3: GET/PUT /api/admin/settings/archive — archive 자동 청소 정책 (admin only)
//   archive_retention_days: archive 후 N일 경과한 프로젝트 청소 (기본 180, 최소 7, 최대 3650)
//   archive_auto_cleanup:   true일 때만 실제 삭제 수행 (기본 false → dry-run)
router.get('/archive', (req, res) => {
  res.json({
    retention_days: parseInt(getSetting('archive_retention_days') || '180', 10) || 180,
    auto_cleanup: (getSetting('archive_auto_cleanup') || 'false') === 'true'
  });
});

router.put('/archive', (req, res) => {
  const { retention_days, auto_cleanup } = req.body;
  const d = parseInt(retention_days, 10);
  if (Number.isNaN(d) || d < 7 || d > 3650) {
    return res.status(400).json({ error: 'ESYS-SET-008', message: '보존기간은 7~3650일 사이여야 합니다' });
  }
  setSetting('archive_retention_days', String(d));
  setSetting('archive_auto_cleanup', auto_cleanup ? 'true' : 'false');
  res.json({ ok: true, retention_days: d, auto_cleanup: !!auto_cleanup });
});

// POST /api/admin/settings/archive/run — 즉시 실행 (수동 트리거)
//   body.dry_run=true이면 zip만 생성, 삭제 안 함
router.post('/archive/run', async (req, res) => {
  try {
    const { runArchiveCleanup } = require('../../engine/archive-cleanup');
    const dryRun = req.body && req.body.dry_run === true;
    const result = await runArchiveCleanup({ dryRun });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'ESYS-ARC-001', message: err.message });
  }
});

// F1: GET/PUT /api/admin/settings/error-budget — 에러 예산 임계 (admin only)
//   error_budget_24h: 24h 누적 한도 (기본 50, 0이면 비활성)
//   error_budget_1h:  1h 누적 한도 (기본 20)
//   error_alert_at_pct: 경고 임계 % (기본 80)
router.get('/error-budget', (req, res) => {
  res.json({
    budget_24h: parseInt(getSetting('error_budget_24h') || '50', 10) || 0,
    budget_1h:  parseInt(getSetting('error_budget_1h') || '20', 10) || 0,
    alert_at_pct: parseFloat(getSetting('error_alert_at_pct') || '80')
  });
});

router.put('/error-budget', (req, res) => {
  const { budget_24h, budget_1h, alert_at_pct } = req.body;
  const b24 = parseInt(budget_24h, 10);
  const b1  = parseInt(budget_1h, 10);
  const p   = Number(alert_at_pct);
  if ([b24, b1].some(v => Number.isNaN(v) || v < 0)) {
    return res.status(400).json({ error: 'ESYS-SET-006', message: '한도는 0 이상의 정수여야 합니다 (0=비활성)' });
  }
  if (Number.isNaN(p) || p < 1 || p > 100) {
    return res.status(400).json({ error: 'ESYS-SET-007', message: '경고 임계는 1~100 사이여야 합니다' });
  }
  setSetting('error_budget_24h', String(b24));
  setSetting('error_budget_1h', String(b1));
  setSetting('error_alert_at_pct', String(p));
  res.json({ ok: true, budget_24h: b24, budget_1h: b1, alert_at_pct: p });
});

// U-G10: GET/PUT /api/admin/settings/notify — 외부 알림 (슬랙 webhook + SMTP)
//   slack_webhook_url, smtp_url, email_to, email_from, on_hitl, on_done, on_failed
router.get('/notify', (req, res) => {
  res.json({
    slack_webhook_url: getSetting('notify_slack_webhook_url') || '',
    smtp_url: getSetting('notify_smtp_url') || '',
    email_to: getSetting('notify_email_to') || '',
    email_from: getSetting('notify_email_from') || '',
    on_hitl: (getSetting('notify_on_hitl') ?? '1') === '1',
    on_pipeline_done: (getSetting('notify_on_pipeline_done') ?? '1') === '1',
    on_pipeline_failed: (getSetting('notify_on_pipeline_failed') ?? '1') === '1'
  });
});

router.put('/notify', (req, res) => {
  const b = req.body || {};
  if (b.slack_webhook_url !== undefined) {
    const url = String(b.slack_webhook_url).trim();
    if (url && !/^https?:\/\//.test(url)) {
      return res.status(400).json({ error: 'ESYS-NOTIFY-001', message: 'webhook URL은 http(s)://로 시작해야 합니다' });
    }
    setSetting('notify_slack_webhook_url', url);
  }
  if (b.smtp_url !== undefined) setSetting('notify_smtp_url', String(b.smtp_url).trim());
  if (b.email_to !== undefined) setSetting('notify_email_to', String(b.email_to).trim());
  if (b.email_from !== undefined) setSetting('notify_email_from', String(b.email_from).trim());
  if (b.on_hitl !== undefined) setSetting('notify_on_hitl', b.on_hitl ? '1' : '0');
  if (b.on_pipeline_done !== undefined) setSetting('notify_on_pipeline_done', b.on_pipeline_done ? '1' : '0');
  if (b.on_pipeline_failed !== undefined) setSetting('notify_on_pipeline_failed', b.on_pipeline_failed ? '1' : '0');
  res.json({ ok: true });
});

router.post('/notify/test', async (req, res) => {
  try {
    const { testNotify } = require('../../engine/external-notify');
    const result = await testNotify();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'ESYS-NOTIFY-002', message: err.message });
  }
});

module.exports = router;
