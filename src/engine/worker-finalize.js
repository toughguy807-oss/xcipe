// 분산 워커 finalize (v25) — 워커가 보낸 결과를 서버 사이드에서 마무리
//
//   포함: saveArtifact + post-process(서버 .claude) + figma-push prepare + status='awaiting_approval'
//   제외(MVP): reviewer(서버가 LLM 호출 못함) · mockup-gen · visual-verify (워커 차후 위임)
//
//   tick 폴링(pipeline-worker.js)이 다음 pending step 을 자동으로 잡아 진행하므로
//   "다음 step enqueue" 는 별도 호출 불필요. enqueue 가 필요한 경우(figma-push)만 명시.

const path = require('path');
const { db, addMessage, logActivity, logError, notify } = require('../db');
const { saveArtifact, validateArtifactContent } = require('./pipeline/artifact-saver');
const { parseMeta } = require('./pipeline/reviewer');

async function finalizeWorkerStep({ step, content, meta_json, duration_ms, usage, generated_files, worker_user_id }) {
  // sanity check — 부실 응답이면 자동 실패 처리
  const validation = validateArtifactContent(content, step.step);
  if (!validation.ok) {
    throw new Error(`[품질 검증 실패] ${validation.reason}`);
  }

  const meta = parseMeta(content) || (meta_json ? safeJSON(meta_json) : null);
  let selfCheck = meta && meta.self_check ? meta.self_check : 'UNKNOWN';
  if (selfCheck === 'FAIL') {
    throw new Error(`[self-check] 워커 보고: ${meta.self_check_reason || '사유 미기재'}`);
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(step.project_id);
  if (!project) throw new Error('Project not found');

  // ── 1) saveArtifact ────────────────────────────────────────────────
  const artifact = saveArtifact(project, step, content, meta);

  // ── 2) post-process (서버 사이드 .claude/skills/{skill}/scripts/post-process.js) ─
  let postProcessMeta = null;
  try {
    const outputDir = path.dirname(artifact.file_path);
    const pp = await runServerPostProcess(step.skill_name, project, artifact.file_path, outputDir);
    if (!pp.skipped) {
      postProcessMeta = {
        ok: pp.ok,
        generated_files: pp.generatedFiles || [],
        error: pp.error || null
      };
    }
  } catch (ppErr) {
    postProcessMeta = { ok: false, error: ppErr.message };
  }

  // ── 3) 워커가 직접 생성한 추가 파일들 (generated_files: [{name, content_base64}]) ─
  //   워커 PC 에서 만들어진 파일을 서버 outputDir 에 복사 (sub_files 메타에 합산)
  const workerSubFiles = [];
  if (Array.isArray(generated_files) && generated_files.length > 0) {
    const fs = require('fs');
    const outputDir = path.dirname(artifact.file_path);
    for (const f of generated_files) {
      if (!f || typeof f.name !== 'string' || typeof f.content_base64 !== 'string') continue;
      // path traversal 방어
      const safe = f.name.replace(/^[\\/]+/, '').replace(/\.\.[\\/]/g, '');
      const abs = path.resolve(outputDir, safe);
      if (!abs.startsWith(path.resolve(outputDir) + path.sep) && abs !== path.resolve(outputDir)) continue;
      try {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, Buffer.from(f.content_base64, 'base64'));
        workerSubFiles.push({ path: safe, sizeBytes: fs.statSync(abs).size });
      } catch (e) {
        // 파일 1개 실패는 전체 실패 아님
      }
    }
  }

  // ── 4) figma-push 자동 prepare + step enqueue (서버 사이드 — Railway 도 OK) ─
  let figmaPushMeta = null;
  if (process.env.FIGMA_AUTO_PUSH !== '0') {
    try {
      const { prepareFigmaPush, enqueueFigmaPushSteps } = require('./figma-auto-push');
      const outputDir = path.dirname(artifact.file_path);
      const subFiles = (meta && meta.sub_files) || [];
      const fp = await prepareFigmaPush({
        skillName: step.skill_name, project, outputDir,
        artifactPath: artifact.file_path, subFiles
      });
      if (fp && !fp.skipped) {
        figmaPushMeta = fp;
        try {
          const enq = enqueueFigmaPushSteps({ parentStep: step, project, figmaPushReady: fp });
          if (enq && !enq.skipped) {
            figmaPushMeta.queued_steps = { prepare: enq.prepareStepId, finalize: enq.finalizeStepId };
          }
        } catch (qErr) {
          figmaPushMeta.queue_error = qErr.message;
        }
      }
    } catch (fErr) {
      figmaPushMeta = { ok: false, error: fErr.message };
    }
  }

  // ── 5) 최종 meta 통합 ─────────────────────────────────────────────────
  const finalMeta = Object.assign({}, meta || {},
    postProcessMeta ? { post_process: postProcessMeta } : {},
    figmaPushMeta ? { figma_push_ready: figmaPushMeta } : {},
    workerSubFiles.length > 0 ? {
      sub_files: [...((meta && meta.sub_files) || []), ...workerSubFiles]
    } : {}
  );

  // ── 6) DB 갱신 ────────────────────────────────────────────────────────
  db.prepare(`
    UPDATE pipeline_steps
    SET status = 'awaiting_approval',
        output_file = @file_path,
        output_content = @content,
        meta_json = @meta,
        self_check_result = @self_check,
        duration_ms = @duration,
        completed_at = datetime('now'),
        error_message = NULL
    WHERE id = @id
  `).run({
    file_path: artifact.file_path,
    content,
    meta: finalMeta ? JSON.stringify(finalMeta) : null,
    self_check: selfCheck,
    duration: duration_ms || null,
    id: step.id
  });

  // ── 7) token usage 기록 (워커 보고 기반) ──────────────────────────────
  if (usage && (usage.input_tokens || usage.output_tokens)) {
    try {
      const { recordTokenUsage } = require('../db');
      recordTokenUsage && recordTokenUsage({
        user_id: worker_user_id,
        project_id: project.id,
        step_id: step.id,
        provider: 'claude-code-worker',
        model: usage.model || null,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_creation_tokens: usage.cache_creation_input_tokens || 0,
        cache_read_tokens: usage.cache_read_input_tokens || 0,
        cost_usd: usage.cost_usd || 0
      });
    } catch (e) { /* token usage 기록 실패는 흡수 */ }
  }

  logActivity && logActivity('pipeline_step', step.id, 'completed', `${step.step} (worker) → ${selfCheck}`, worker_user_id);

  // 알림 + 사용자 메시지
  if (project.created_by) {
    notify && notify(project.created_by, 'approval_needed', 'pipeline_step', step.id,
      `${project.name}의 "${step.step}" 단계가 승인 대기 중입니다`);
  }
  try {
    addMessage && addMessage({
      projectId: project.id, role: 'assistant', kind: 'artifact',
      content: `${step.step} 생성 완료 (워커, ${Math.round((duration_ms || 0) / 1000)}초)`,
      artifactId: artifact.id, stepId: step.id
    });
    addMessage && addMessage({
      projectId: project.id, role: 'assistant', kind: 'approval_request',
      content: `내용을 확인하고 "승인" 또는 수정 지시를 입력해주세요.`,
      stepId: step.id
    });
  } catch {}

  return {
    artifact_id: artifact.id,
    artifact_path: artifact.file_path,
    figma_push_queued: !!(figmaPushMeta && figmaPushMeta.queued_steps)
  };
}

function failWorkerStep({ step, errorMessage, requestRetry }) {
  const retryCount = (step.retry_count || 0) + 1;
  const shouldRetry = requestRetry !== false && retryCount < 3;

  db.prepare(`
    UPDATE pipeline_steps
    SET status = ?,
        error_message = ?,
        retry_count = ?,
        worker_id = NULL,
        claim_token = NULL,
        claimed_at = NULL,
        heartbeat_at = NULL,
        completed_at = CASE WHEN ? = 'failed' THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `).run(
    shouldRetry ? 'pending' : 'failed',
    errorMessage,
    retryCount,
    shouldRetry ? 'pending' : 'failed',
    step.id
  );

  logActivity && logActivity('pipeline_step', step.id, 'failed', `${errorMessage} (worker, retry ${retryCount})`, null);

  if (!shouldRetry) {
    try {
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all();
      for (const a of admins) {
        notify && notify(a.id, 'step_failed', 'pipeline_step', step.id,
          `단계 실행이 3회 연속 실패했습니다 (워커): ${errorMessage}`);
      }
    } catch {}
  }

  return { retry_count: retryCount, will_retry: shouldRetry, status: shouldRetry ? 'pending' : 'failed' };
}

// ── helpers ─────────────────────────────────────────────────────────────
function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

function runServerPostProcess(skillName, project, artifactPath, outputDir) {
  return new Promise((resolve) => {
    const fs = require('fs');
    const os = require('os');
    const crypto = require('crypto');
    const { exec } = require('child_process');
    const { SKILLS_DIR: skillsRoot } = require('./skill-loader');
    const scriptPath = path.join(skillsRoot, skillName, 'scripts', 'post-process.js');
    if (!fs.existsSync(scriptPath)) return resolve({ ok: true, skipped: true });

    const projectInfo = {
      id: project.id, code: project.code, name: project.name,
      type: project.type, description: project.description || '',
      tech_stack: project.tech_stack || '', framework: project.framework || ''
    };
    const tmpProj = path.join(os.tmpdir(), `esys-proj-${crypto.randomBytes(6).toString('hex')}.json`);
    try { fs.writeFileSync(tmpProj, JSON.stringify(projectInfo, null, 2), 'utf8'); }
    catch (err) { return resolve({ ok: false, error: `tmp proj write fail: ${err.message}` }); }

    const beforeFiles = new Set(fs.readdirSync(outputDir));
    const cmd = `node "${scriptPath}" "${artifactPath}" "${outputDir}" "${tmpProj}"`;
    exec(cmd, {
      timeout: 120000, maxBuffer: 20 * 1024 * 1024,
      cwd: path.dirname(scriptPath), windowsHide: true
    }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpProj); } catch {}
      const afterFiles = new Set(fs.readdirSync(outputDir));
      const newFiles = [...afterFiles].filter(f => !beforeFiles.has(f)).map(name => {
        const fp = path.join(outputDir, name);
        let sizeBytes = 0;
        try { sizeBytes = fs.statSync(fp).size; } catch {}
        return { path: name, sizeBytes };
      });
      if (err) {
        return resolve({
          ok: false, error: err.killed ? 'post-process timeout' : (stderr || err.message),
          generatedFiles: newFiles
        });
      }
      resolve({ ok: true, generatedFiles: newFiles });
    });
  });
}

module.exports = { finalizeWorkerStep, failWorkerStep };
