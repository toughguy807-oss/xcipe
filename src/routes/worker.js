// 분산 워커 API (v25) — 사용자 PC daemon 이 본인 OAuth 로 파이프라인 실행
//
//   /api/worker/me              GET  — 인증 확인 + 사용자 정보
//   /api/worker/jobs/claim      POST — 본인의 pending step 1건 atomic claim + 컨텍스트 반환
//   /api/worker/jobs/:id/heartbeat  POST — heartbeat (stale 회수 방지)
//   /api/worker/jobs/:id/result POST — 결과 업로드 + finalize (artifact 저장 + 다음 step enqueue)
//   /api/worker/jobs/:id/fail   POST — 실패 보고 (retry or 종료)
//
//   인증: X-Worker-Token 헤더 (admin 발급)
//   claim 검증: X-Claim-Token 헤더 (claim 시 발급된 unique 토큰 — 다른 워커의 위조 차단)

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { db, addMessage, logActivity, logError } = require('../db');
const { requireWorkerAuth } = require('../middleware/worker-auth');
const { finalizeWorkerStep, failWorkerStep } = require('../engine/worker-finalize');

const router = express.Router();
router.use(requireWorkerAuth);

// ── /me — 인증 확인 ────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  res.json({
    ok: true,
    user: req.workerUser,
    server_version: '4.0.0',
    server_time: new Date().toISOString()
  });
});

// ── /me/session — 워커가 claude auth status 결과를 서버에 보고 ─────────
//   대시보드 step1 게이트가 본인 워커의 claude CLI 인증 상태를 표시 가능.
//   본인 PC 의 OAuth 토큰은 절대 전송 X — loggedIn / email / plan / orgName 만.
router.post('/me/session', (req, res) => {
  const body = req.body || {};
  const sessionInfo = {
    loggedIn: !!body.loggedIn,
    email: body.email || null,
    plan: body.plan || null,
    orgName: body.orgName || null,
    authMethod: body.authMethod || null,
    workerId: body.workerId || null,
    checkedAt: new Date().toISOString()
  };
  try {
    db.prepare('UPDATE users SET claude_session_info = ? WHERE id = ?')
      .run(JSON.stringify(sessionInfo), req.workerUser.id);
    res.json({ ok: true, saved: sessionInfo });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-WRK-060', message: 'session 저장 실패', detail: e.message });
  }
});

// ── /jobs/claim — atomic claim ────────────────────────────────────────
//   본인(user_id = req.workerUser.id) 또는 user_id IS NULL 인 pending step 가장 오래된 것
//   동시에 여러 워커가 호출해도 SQLite immediate 트랜잭션으로 1건만 claim
router.post('/jobs/claim', (req, res) => {
  const workerId = String(req.body && req.body.worker_id || '').slice(0, 200);
  if (!workerId) {
    return res.status(400).json({ error: 'ESYS-WRK-010', message: 'worker_id 필요 (예: hostname:pid)' });
  }

  const userId = req.workerUser.id;
  const claimToken = crypto.randomBytes(16).toString('hex');
  const nowIso = new Date().toISOString();

  // v27: 워커 polling 활성 추적 — step claim 없어도 polling 자체로 활성 판정 가능
  //   매 /jobs/claim 호출마다 users.last_polled_at 갱신
  try {
    db.prepare(`UPDATE users SET last_polled_at = datetime('now') WHERE id = ?`).run(userId);
  } catch {}

  // atomic claim — better-sqlite3 는 동기라 db.transaction() 으로 묶기만 하면 race 없음
  const claim = db.transaction(() => {
    // admin 은 모든 작업 claim 가능. member 는 본인 작업 + 미배정 작업.
    const where = req.workerUser.role === 'admin'
      ? "status = 'pending'"
      : "status = 'pending' AND (user_id = @uid OR user_id IS NULL)";

    const candidate = db.prepare(`
      SELECT id, pipeline_id, phase, step, skill_name, retry_count
      FROM pipeline_steps
      WHERE ${where}
      ORDER BY id ASC
      LIMIT 1
    `).get({ uid: userId });

    if (!candidate) return null;

    // 같은 트랜잭션에서 UPDATE — 다른 워커가 동시 claim 시도해도 1건만 성공
    const upd = db.prepare(`
      UPDATE pipeline_steps
      SET status = 'running',
          worker_id = @worker_id,
          claim_token = @claim_token,
          claimed_at = @now,
          heartbeat_at = @now,
          started_at = COALESCE(started_at, @now),
          user_id = COALESCE(user_id, @uid)
      WHERE id = @id AND status = 'pending'
    `).run({
      worker_id: workerId, claim_token: claimToken, now: nowIso,
      id: candidate.id, uid: userId
    });

    return upd.changes > 0 ? candidate : null;
  })();

  if (!claim) {
    return res.status(204).end();  // no work available
  }

  // 컨텍스트 빌드 — project, skill, previous artifacts
  try {
    const pipeline = db.prepare(`
      SELECT id, project_id, prompt, current_phase, current_step
      FROM pipelines WHERE id = ?
    `).get(claim.pipeline_id);
    if (!pipeline) throw new Error(`pipeline ${claim.pipeline_id} not found`);

    const project = db.prepare(`
      SELECT id, code, name, type, description, prompt, tech_stack, framework,
             reference_url, reference_content, optional_skills, completion_level,
             design_system_id
      FROM projects WHERE id = ?
    `).get(pipeline.project_id);
    if (!project) throw new Error(`project ${pipeline.project_id} not found`);

    // pipeline.prompt override
    if (pipeline.prompt && pipeline.prompt.trim()) project.prompt = pipeline.prompt;

    // skill content — server side bundled .claude 에서 로드
    let skillContent = null;
    try {
      const { loadSkill } = require('../engine/skill-loader');
      skillContent = loadSkill(claim.skill_name);
    } catch (e) {
      // mock provider 면 skill content 불필요
    }

    // previous artifacts — 같은 pipeline 의 완료된 step output_content
    const prevRows = db.prepare(`
      SELECT step, phase, skill_name, output_content
      FROM pipeline_steps
      WHERE pipeline_id = ? AND status IN ('approved','completed') AND id < ?
      ORDER BY id ASC
    `).all(claim.pipeline_id, claim.id);

    const previousArtifacts = prevRows.map(r => ({
      step: r.step, phase: r.phase, skill_name: r.skill_name,
      content: r.output_content || ''
    }));

    // replan context — retry 시 이전 실패 사유 전달
    const stepDetail = db.prepare(`
      SELECT retry_count, error_message, output_content
      FROM pipeline_steps WHERE id = ?
    `).get(claim.id);

    const replanContext = (stepDetail && stepDetail.retry_count > 0) ? {
      attempt: stepDetail.retry_count + 1,
      reason: stepDetail.error_message || '이전 시도 실패',
      previousContent: stepDetail.output_content || null
    } : null;

    res.json({
      ok: true,
      step_id: claim.id,
      claim_token: claimToken,
      pipeline_id: claim.pipeline_id,
      project: project,
      skill_name: claim.skill_name,
      skill_content: skillContent,
      phase: claim.phase,
      step: claim.step,
      retry_count: claim.retry_count || 0,
      previous_artifacts: previousArtifacts,
      replan_context: replanContext,
      heartbeat_interval_sec: 15,  // 워커는 15초마다 heartbeat
      stale_timeout_sec: 60        // 60초 무응답 시 서버가 stale 처리
    });
  } catch (err) {
    // 컨텍스트 빌드 실패 — claim 롤백 (status 되돌리기)
    try {
      db.prepare(`
        UPDATE pipeline_steps
        SET status='pending', worker_id=NULL, claim_token=NULL, claimed_at=NULL, heartbeat_at=NULL
        WHERE id = ? AND claim_token = ?
      `).run(claim.id, claimToken);
    } catch {}
    logError && logError({ source: 'worker-claim', code: 'WRK-CTX-FAIL', message: err.message, context: { step_id: claim.id } });
    return res.status(500).json({ error: 'ESYS-WRK-020', message: '컨텍스트 빌드 실패', detail: err.message });
  }
});

// ── /jobs/:id/heartbeat ───────────────────────────────────────────────
router.post('/jobs/:id/heartbeat', (req, res) => {
  const stepId = parseInt(req.params.id, 10);
  const claimToken = req.headers['x-claim-token'];
  if (!stepId || !claimToken) {
    return res.status(400).json({ error: 'ESYS-WRK-030', message: 'step_id 또는 X-Claim-Token 누락' });
  }

  const upd = db.prepare(`
    UPDATE pipeline_steps
    SET heartbeat_at = @now
    WHERE id = @id AND claim_token = @token AND status = 'running'
  `).run({ now: new Date().toISOString(), id: stepId, token: claimToken });

  if (upd.changes === 0) {
    return res.status(409).json({ error: 'ESYS-WRK-031', message: 'claim 토큰 불일치 또는 step 이미 종료됨' });
  }
  res.json({ ok: true });
});

// ── /jobs/:id/result — 성공 결과 + finalize ────────────────────────────
router.post('/jobs/:id/result', async (req, res) => {
  const stepId = parseInt(req.params.id, 10);
  const claimToken = req.headers['x-claim-token'];
  if (!stepId || !claimToken) {
    return res.status(400).json({ error: 'ESYS-WRK-040', message: 'step_id 또는 X-Claim-Token 누락' });
  }

  const body = req.body || {};
  if (typeof body.content !== 'string' || body.content.length === 0) {
    return res.status(400).json({ error: 'ESYS-WRK-041', message: 'content 필요' });
  }

  // claim 검증 — worker_id, claim_token 일치 + status='running'
  const step = db.prepare(`
    SELECT s.*, p.project_id
    FROM pipeline_steps s JOIN pipelines p ON p.id = s.pipeline_id
    WHERE s.id = ? AND s.claim_token = ? AND s.status = 'running'
  `).get(stepId, claimToken);
  if (!step) {
    return res.status(409).json({ error: 'ESYS-WRK-042', message: 'claim 토큰 불일치 또는 step 이미 종료됨' });
  }

  try {
    const result = await finalizeWorkerStep({
      step,
      content: body.content,
      meta_json: body.meta_json || null,
      duration_ms: body.duration_ms || null,
      usage: body.usage || null,
      generated_files: body.generated_files || [],
      worker_user_id: req.workerUser.id
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    logError && logError({
      source: 'worker-finalize', code: 'WRK-FIN-FAIL',
      message: err.message, context: { step_id: stepId }
    });
    res.status(500).json({ error: 'ESYS-WRK-043', message: 'finalize 실패', detail: err.message });
  }
});

// ── /jobs/:id/fail — 실패 보고 ────────────────────────────────────────
router.post('/jobs/:id/fail', (req, res) => {
  const stepId = parseInt(req.params.id, 10);
  const claimToken = req.headers['x-claim-token'];
  if (!stepId || !claimToken) {
    return res.status(400).json({ error: 'ESYS-WRK-050', message: 'step_id 또는 X-Claim-Token 누락' });
  }

  const body = req.body || {};
  const errorMessage = String(body.error_message || '워커 보고: 사유 미기재').slice(0, 2000);
  const requestRetry = body.retry === true || body.retry === 'true';

  const step = db.prepare(`
    SELECT * FROM pipeline_steps
    WHERE id = ? AND claim_token = ? AND status = 'running'
  `).get(stepId, claimToken);
  if (!step) {
    return res.status(409).json({ error: 'ESYS-WRK-051', message: 'claim 토큰 불일치 또는 step 이미 종료됨' });
  }

  try {
    const result = failWorkerStep({ step, errorMessage, requestRetry });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'ESYS-WRK-052', message: 'fail 처리 실패', detail: err.message });
  }
});

// ── /kds-snapshot — KDS 자원 zip 다운로드 (v29) ────────────────────────
//   워커가 시작 시 / KDS invocation 처리 시 호출. 본인 PC 에 kds-v4 가 없거나
//   서버 버전과 다르면 받아서 임시 폴더에 풀어 cwd 로 사용.
//   포함: kds-rules/, .claude/, kds/data/(components|foundations|tokens), scripts/,
//         CLAUDE.md, package.json
//   제외: to-figma/, from-figma/ (사용자 산출물 — Volume 영속, 별도 endpoint)
//         logs/, node_modules/, kds/data/ai-agent/ (이미지 무거움)
router.get('/kds-snapshot', (req, res) => {
  const fsLib = require('fs');
  const pathLib = require('path');
  const kdsRoot = process.env.KDS_V4_ROOT || pathLib.join(__dirname, '..', '..', 'kds-v4');
  if (!fsLib.existsSync(kdsRoot)) {
    return res.status(404).json({ error: 'ESYS-WRK-080', message: 'KDS_V4_ROOT 없음', path: kdsRoot });
  }
  let archiver;
  try { archiver = require('archiver'); }
  catch { return res.status(500).json({ error: 'ESYS-WRK-081', message: 'archiver 미설치' }); }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="kds-v4-snapshot.zip"');
  const zip = archiver('zip', { zlib: { level: 6 } });
  zip.on('error', (err) => { try { res.status(500).end(err.message); } catch {} });
  zip.pipe(res);

  // 핵심 텍스트 자원만 포함 (이미지 ai-agent/ 제외)
  const include = [
    'kds-rules', '.claude', 'scripts',
    'CLAUDE.md', 'README.md', 'package.json'
  ];
  for (const rel of include) {
    const abs = pathLib.join(kdsRoot, rel);
    if (!fsLib.existsSync(abs)) continue;
    const stat = fsLib.statSync(abs);
    if (stat.isDirectory()) {
      zip.directory(abs, rel);
    } else {
      zip.file(abs, { name: rel });
    }
  }
  // kds/data 의 components/foundations/tokens 만 (ai-agent/ 등 이미지 폴더 제외)
  const kdsDataDir = pathLib.join(kdsRoot, 'kds', 'data');
  if (fsLib.existsSync(kdsDataDir)) {
    for (const sub of ['components', 'foundations', 'tokens']) {
      const abs = pathLib.join(kdsDataDir, sub);
      if (fsLib.existsSync(abs)) zip.directory(abs, `kds/data/${sub}`);
    }
    // kds/ 직속 텍스트 파일 (CLAUDE.md 등)
    try {
      for (const f of fsLib.readdirSync(pathLib.join(kdsRoot, 'kds'))) {
        const abs = pathLib.join(kdsRoot, 'kds', f);
        if (fsLib.statSync(abs).isFile()) zip.file(abs, { name: `kds/${f}` });
      }
    } catch {}
  }
  zip.finalize();
});

// ── /kds-artifacts — 워커가 만든 to-figma/ 산출물 업로드 (v29) ───────────
//   body: { files: [{ name, content_base64 }, ...] }
//   서버는 /app/kds-v4/to-figma/{name} 에 저장 (Volume 영속).
//   같은 이름은 덮어쓰기 (의도된 동작 — claude 가 기존 시안 보정 가능).
router.post('/kds-artifacts', express.json({ limit: '50mb' }), (req, res) => {
  const fsLib = require('fs');
  const pathLib = require('path');
  const files = Array.isArray(req.body && req.body.files) ? req.body.files : [];
  if (!files.length) {
    return res.status(400).json({ error: 'ESYS-WRK-090', message: 'files 배열 필요' });
  }
  const kdsRoot = process.env.KDS_V4_ROOT || pathLib.join(__dirname, '..', '..', 'kds-v4');
  const toFigmaDir = pathLib.join(kdsRoot, 'to-figma');
  fsLib.mkdirSync(toFigmaDir, { recursive: true });

  const saved = [];
  const skipped = [];
  for (const f of files) {
    if (!f.name || !f.content_base64) {
      skipped.push({ name: f.name || '(no name)', reason: 'name/content_base64 누락' });
      continue;
    }
    // 보안: 경로 traversal 차단 — 단순 파일명만 허용
    const safeName = pathLib.basename(String(f.name)).replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    if (!safeName || safeName === '.' || safeName === '..') {
      skipped.push({ name: f.name, reason: 'invalid filename' });
      continue;
    }
    try {
      const buf = Buffer.from(f.content_base64, 'base64');
      const target = pathLib.join(toFigmaDir, safeName);
      fsLib.writeFileSync(target, buf);
      saved.push({ name: safeName, size: buf.length });
    } catch (e) {
      skipped.push({ name: f.name, reason: e.message });
    }
  }

  // 산출물 메타 로그 (DB 의 activity 에 기록)
  try {
    logActivity('worker', req.workerUser.id, 'kds_artifacts_uploaded',
      `${saved.length}개 파일 (skipped ${skipped.length})`, req.workerUser.id);
  } catch {}

  res.json({ ok: true, saved, skipped, to_figma_dir: toFigmaDir });
});

// ── /invocations/claim — ad-hoc LLM 호출 큐 (v28) ────────────────────────
//   pipeline_steps 와 별개. analyzePrompt/intake/KDS chat 등 짧은 호출.
//   본인 user_id 의 pending invocation 1건 atomic claim.
router.post('/invocations/claim', (req, res) => {
  const workerId = String(req.body && req.body.worker_id || '').slice(0, 200);
  if (!workerId) {
    return res.status(400).json({ error: 'ESYS-WRK-070', message: 'worker_id 필요' });
  }
  const kinds = Array.isArray(req.body && req.body.kinds) ? req.body.kinds : null;
  const { claimNextInvocation } = require('../engine/worker-invocation');
  try {
    const claimed = claimNextInvocation({
      userId: req.workerUser.id,
      workerId,
      kinds
    });
    if (!claimed) return res.json({ ok: true, invocation: null });
    res.json({ ok: true, invocation: claimed });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-WRK-071', message: 'claim 실패', detail: e.message });
  }
});

// ── /invocations/:id/result — 결과 보고 ───────────────────────────────────
router.post('/invocations/:id/result', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ESYS-WRK-072', message: 'invalid id' });
  const workerId = String(req.body && req.body.worker_id || '').slice(0, 200);
  if (!workerId) return res.status(400).json({ error: 'ESYS-WRK-073', message: 'worker_id 필요' });

  const body = req.body || {};
  const { completeInvocation } = require('../engine/worker-invocation');
  try {
    const ok = !!body.ok;
    const updated = completeInvocation({
      id,
      userId: req.workerUser.id,
      workerId,
      ok,
      result: ok ? (body.result || {}) : null,
      error: ok ? null : (body.error || 'unknown error')
    });
    if (!updated) {
      return res.status(409).json({ error: 'ESYS-WRK-074', message: 'invocation 상태 불일치 (이미 완료/타임아웃 가능성)' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-WRK-075', message: 'result 처리 실패', detail: e.message });
  }
});

module.exports = router;

// 워커 daemon 단일 파일 다운로드 (인증 X — 공개 endpoint, 토큰 미주입 baseline)
module.exports.downloadHandler = (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const daemonPath = path.resolve(__dirname, '..', 'worker', 'daemon.js');
    if (!fs.existsSync(daemonPath)) {
      return res.status(404).send('// worker daemon not found');
    }
    const content = fs.readFileSync(daemonPath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="xcipe-worker.js"');
    res.send(content);
  } catch (e) {
    res.status(500).send(`// download failed: ${e.message}`);
  }
};

// v26: 인증된 사용자 전용 — 본인 토큰 + 서버 URL 자동 박힌 워커 다운로드 (zip)
//   파일 2개 zip 으로 묶어 응답:
//     - xcipe-worker.js  : 토큰·URL 박힌 daemon
//     - xcipe-worker.cmd : 더블클릭만으로 가동되는 Windows 배치 파일
//   사용자는 압축 풀고 .cmd 더블클릭 → 끝.
module.exports.myDownloadHandler = (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const crypto = require('crypto');
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).send('// unauthorized');

    let row = db.prepare('SELECT worker_token, email FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);
    if (!row) return res.status(404).send('// user not found');
    let token = row.worker_token;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      db.prepare('UPDATE users SET worker_token = ? WHERE id = ?').run(token, userId);
    }

    const daemonPath = path.resolve(__dirname, '..', 'worker', 'daemon.js');
    const daemonContent = fs.readFileSync(daemonPath, 'utf8');
    const serverOrigin = req.headers['x-forwarded-host']
      ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
      : `${req.protocol}://${req.get('host')}`;

    const jsHeader = [
      '#!/usr/bin/env node',
      '// xcipe-worker (auto-configured for ' + row.email + ')',
      '// 생성 시각: ' + new Date().toISOString(),
      'process.env.XCIPE_SERVER = process.env.XCIPE_SERVER || ' + JSON.stringify(serverOrigin) + ';',
      'process.env.XCIPE_WORKER_TOKEN = process.env.XCIPE_WORKER_TOKEN || ' + JSON.stringify(token) + ';',
      '',
      ''
    ].join('\n');
    const finalJs = jsHeader + daemonContent;

    // 더블클릭 가능한 .cmd (Windows) — 무한 재시작 wrapper.
    //   워커 daemon 이 죽으면 (self-update spawn 실패, claude crash, 예외 등) 3초 후 자동 재시작.
    //   사용자는 .cmd 창 닫지만 않으면 됨. PowerShell 창 별도 띄울 필요 X.
    const cmdContent = [
      '@echo off',
      'chcp 65001 >nul',
      'REM xcipe-worker auto-restart wrapper (' + row.email + ')',
      'title xcipe-worker - ' + row.email,
      'cd /d "%~dp0"',
      'where node >nul 2>nul',
      'if errorlevel 1 (',
      '  echo [ERROR] Node.js 가 설치되지 않았습니다.',
      '  echo Node.js 를 먼저 설치하세요: https://nodejs.org',
      '  pause',
      '  exit /b 1',
      ')',
      'where claude >nul 2>nul',
      'if errorlevel 1 (',
      '  echo [INFO] claude CLI 자동 설치 중...',
      '  call npm install -g @anthropic-ai/claude-code',
      ')',
      'set RESTART_COUNT=0',
      'set RESTART_WINDOW_START=%time%',
      ':loop',
      'echo.',
      'echo [%date% %time%] xcipe-worker 시작 (재시작 %RESTART_COUNT% 회)',
      'node "%~dp0xcipe-worker.js"',
      'set EXIT_CODE=%errorlevel%',
      'set /a RESTART_COUNT+=1',
      'echo [%date% %time%] xcipe-worker 종료 (exit %EXIT_CODE%). 3초 후 재시작...',
      'if %RESTART_COUNT% geq 5 (',
      '  echo.',
      '  echo ===================================================',
      '  echo [FATAL] 5회 연속 워커 죽음. 무한 재시작 방지로 중단.',
      '  echo 원인 확인 후 수동 재실행 필요.',
      '  echo ===================================================',
      '  pause',
      '  exit /b 1',
      ')',
      'timeout /t 3 /nobreak >nul',
      'goto loop'
    ].join('\r\n');

    // 부팅 시 자동 실행 등록 (Windows startup 폴더 + 즉시 실행)
    //   admin 권한 불필요 — 사용자 본인 startup 폴더만 사용
    const installContent = [
      '@echo off',
      'chcp 65001 >nul',
      'REM xcipe-worker 부팅 시 자동 실행 등록 (1회 실행)',
      'title xcipe-worker install',
      'echo ===================================================',
      'echo  xcipe-worker 자동 시작 등록',
      'echo ===================================================',
      'echo.',
      'set "SRC=%~dp0xcipe-worker.cmd"',
      'set "DST=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\xcipe-worker.cmd"',
      'if not exist "%SRC%" (',
      '  echo [ERROR] xcipe-worker.cmd 가 같은 폴더에 없습니다.',
      '  pause',
      '  exit /b 1',
      ')',
      'copy /Y "%SRC%" "%DST%" >nul',
      'if errorlevel 1 (',
      '  echo [ERROR] startup 폴더 복사 실패.',
      '  pause',
      '  exit /b 1',
      ')',
      'echo [OK] Windows 부팅 시 자동 실행 등록 완료',
      'echo      등록 경로: %DST%',
      'echo.',
      'echo 워커를 지금 가동합니다...',
      'echo (이 창은 닫지 마세요. 닫으면 워커도 종료됩니다)',
      'echo.',
      'timeout /t 2 /nobreak >nul',
      'call "%SRC%"'
    ].join('\r\n');

    const uninstallContent = [
      '@echo off',
      'chcp 65001 >nul',
      'REM xcipe-worker 자동 실행 등록 해제',
      'set "DST=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\xcipe-worker.cmd"',
      'if exist "%DST%" (',
      '  del "%DST%"',
      '  echo [OK] 자동 실행 등록 해제 완료',
      ') else (',
      '  echo [INFO] 자동 실행 등록되어 있지 않습니다.',
      ')',
      'pause'
    ].join('\r\n');

    // 압축 (archiver 사용)
    let archiver;
    try { archiver = require('archiver'); }
    catch { return res.status(500).send('archiver 미설치 — Dockerfile rebuild 필요'); }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="xcipe-worker.zip"');
    const zip = archiver('zip', { zlib: { level: 9 } });
    zip.on('error', (err) => { try { res.status(500).end(err.message); } catch {} });
    zip.pipe(res);
    zip.append(finalJs, { name: 'xcipe-worker.js' });
    zip.append(cmdContent, { name: 'xcipe-worker.cmd' });
    zip.append(installContent, { name: 'install-autostart.cmd' });
    zip.append(uninstallContent, { name: 'uninstall-autostart.cmd' });
    zip.append([
      '# xcipe 워커 사용 가이드',
      '',
      '계정: ' + row.email,
      '서버: ' + serverOrigin,
      '',
      '## 권장 — 1회 설치 + 부팅 시 자동 실행 (Windows)',
      '',
      '1. 압축 풀기',
      '2. **install-autostart.cmd** 더블클릭 (1회만)',
      '   - Windows 부팅 시 자동 실행 등록',
      '   - 워커도 즉시 가동',
      '3. 끝 — 이후 PC 부팅 시 자동으로 워커 가동',
      '',
      '## 단순 실행 (자동 등록 안 함)',
      '',
      '**xcipe-worker.cmd** 더블클릭 → 그 세션만 가동. 창 닫으면 종료.',
      '',
      '## 자동 등록 해제',
      '',
      '**uninstall-autostart.cmd** 더블클릭',
      '',
      '## 처음 실행 시 자동 처리',
      '',
      '- Node.js 설치 확인 (없으면 https://nodejs.org 안내)',
      '- claude CLI 자동 설치',
      '- 첫 실행 후 `claude /login` 수동 한 번 (본인 Claude Max OAuth)',
      '',
      '## Mac / Linux',
      '',
      '```',
      'node xcipe-worker.js',
      '```',
      '',
      '자동 등록은 Mac launchd / Linux systemd 별도 설정 필요 (지원 예정).',
      '',
      '## 종료',
      '',
      '- 일시 종료: PowerShell 창 닫기 또는 Ctrl+C',
      '- 영구 종료: uninstall-autostart.cmd'
    ].join('\n'), { name: 'README.md' });
    zip.finalize();
  } catch (e) {
    res.status(500).send(`download failed: ${e.message}`);
  }
};
