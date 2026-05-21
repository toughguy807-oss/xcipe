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

    // 더블클릭 가능한 .cmd (Windows) — 같은 폴더의 xcipe-worker.js 실행
    const cmdContent = [
      '@echo off',
      'REM xcipe-worker auto-start (' + row.email + ')',
      'REM 이 파일을 더블클릭하면 워커가 가동됩니다.',
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
      'node "%~dp0xcipe-worker.js"',
      'pause'
    ].join('\r\n');

    // 부팅 시 자동 실행 등록 (Windows startup 폴더 + 즉시 실행)
    //   admin 권한 불필요 — 사용자 본인 startup 폴더만 사용
    const installContent = [
      '@echo off',
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
