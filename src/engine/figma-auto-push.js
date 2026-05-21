// figma-auto-push.js — design/SB step 완료 시 Figma Push 준비 자동화 (MVP1, 2026-05-15)
//
// MVP1 범위:
//   - project_design_systems 의 figma_file_key 존재 시 발동
//   - skillName 이 design-knowledge / design-layout / design-ui / plan-sb 일 때만
//   - FIGMA_AUTO_PUSH=0 환경변수로 비활성 가능
//   - 산출물 본문(.html) + sub_files HTML 들을 figma-prep.js 로 사전 변환
//   - artifact.meta_json.figma_push_ready = { fileKey, capturePath, generatedAt } 기록
//   - UI 가 메타를 보고 "Figma로 Push" 1-click 버튼 활성화
//
// MVP2 (후속): 새 figma-push step 을 동적 큐잉해 provider 가 mcp__figma__generate_figma_design 호출
//
// 인터페이스:
//   await prepareFigmaPush({ skillName, project, outputDir, artifactPath, subFiles }) → meta or null

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);

const ELIGIBLE_SKILLS = new Set([
  'design-knowledge',
  'design-layout',
  'design-ui',
  'plan-sb'
]);

// ~/.claude/skills/plan-sb/scripts/figma-prep.js 위치 (원칙 1: BUNDLE 모드 우선)
function resolveFigmaPrepScript() {
  const candidates = [
    path.join(__dirname, '..', '..', '.claude', 'skills', 'plan-sb', 'scripts', 'figma-prep.js'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'skills', 'plan-sb', 'scripts', 'figma-prep.js')
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

// project_design_systems 에서 figma_file_key 조회 (project.design_system_id 경유)
function lookupFigmaConfig(project) {
  try {
    const { db } = require('../db');
    if (!project || !project.design_system_id) return null;
    const ds = db.prepare(`
      SELECT id, name, figma_file_key, figma_node_id, last_synced_at, last_sync_direction
        FROM project_design_systems
       WHERE id = ?
    `).get(project.design_system_id);
    if (!ds || !ds.figma_file_key) return null;
    return ds;
  } catch (e) {
    console.warn('[figma-auto-push] design system 조회 실패:', e.message);
    return null;
  }
}

// 단일 HTML 파일을 figma-prep.js 로 변환 (가로 flex / pseudo DOM / capture.js)
async function runFigmaPrep(scriptPath, htmlPath) {
  try {
    const { stdout, stderr } = await execFileP('node', [scriptPath, htmlPath], {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024
    });
    return { ok: true, stdout: stdout || '', stderr: stderr || '' };
  } catch (err) {
    return { ok: false, error: err.killed ? 'figma-prep timeout' : (err.stderr || err.message) };
  }
}

async function prepareFigmaPush({ skillName, project, outputDir, artifactPath, subFiles }) {
  if (process.env.FIGMA_AUTO_PUSH === '0') {
    return { skipped: true, reason: 'FIGMA_AUTO_PUSH=0' };
  }
  if (!ELIGIBLE_SKILLS.has(skillName)) {
    return { skipped: true, reason: `skill ${skillName} not eligible` };
  }
  if (!artifactPath || !fs.existsSync(artifactPath)) {
    return { skipped: true, reason: 'artifact 미존재' };
  }

  const ds = lookupFigmaConfig(project);
  if (!ds) {
    return { skipped: true, reason: 'figma_file_key 미설정 (project_design_systems)' };
  }

  const ext = path.extname(artifactPath).toLowerCase();
  if (ext !== '.html') {
    return { skipped: true, reason: `본문 확장자 .html 아님 (${ext}) — 안 A 매트릭스 적용 후 가능` };
  }

  const scriptPath = resolveFigmaPrepScript();
  if (!scriptPath) {
    return { skipped: true, reason: 'figma-prep.js 미발견 (.claude/skills/plan-sb/scripts/)' };
  }

  // 본문 + sub_files 중 .html 만 변환 대상으로 수집
  const targets = [artifactPath];
  if (Array.isArray(subFiles)) {
    for (const sf of subFiles) {
      const p = path.isAbsolute(sf.path) ? sf.path : path.join(outputDir, sf.path);
      if (p.toLowerCase().endsWith('.html') && fs.existsSync(p) && !targets.includes(p)) {
        targets.push(p);
      }
    }
  }

  const results = [];
  for (const t of targets) {
    const r = await runFigmaPrep(scriptPath, t);
    results.push({ source: path.relative(outputDir, t).replace(/\\/g, '/'), ok: r.ok, error: r.error || null });
  }

  // figma-prep.js 는 _figma/{basename}-figma.html 을 생성
  const figmaDir = path.join(outputDir, '_figma');
  let preparedFiles = [];
  if (fs.existsSync(figmaDir)) {
    try {
      const list = fs.readdirSync(figmaDir).filter(n => n.endsWith('-figma.html'));
      preparedFiles = list.map(n => `_figma/${n}`);
    } catch {}
  }

  const okCount = results.filter(r => r.ok).length;

  return {
    skipped: false,
    ok: okCount > 0,
    skill: skillName,
    figma: {
      file_key: ds.figma_file_key,
      node_id: ds.figma_node_id || null,
      design_system: ds.name
    },
    sources: results,
    prepared_files: preparedFiles,
    push_command: `/figma-push ${path.basename(artifactPath)}`,
    note: 'MVP1: 변환만 자동 — UI 의 "Figma로 Push" 버튼 또는 슬래시 커맨드로 MCP 트리거 필요',
    timestamp: new Date().toISOString()
  };
}

// MVP2 (2026-05-18): figma-push-prepare/finalize step 동적 큐잉
//   - prepare step: LLM 이 captureId 발급
//   - 노드 hook: puppeteer 로 capture 트리거
//   - finalize step: LLM 이 폴링 → figma_url
//
// 호출 시점: figma_push_ready 메타 생성 직후 (pipeline-worker H hook)
// 부작용: pipeline_steps 에 2개 step INSERT (status='pending')
function enqueueFigmaPushSteps({ parentStep, project, figmaPushReady, prepareSkillContent, finalizeSkillContent }) {
  if (process.env.FIGMA_AUTO_PUSH_AUTOTRIGGER === '0') {
    return { skipped: true, reason: 'FIGMA_AUTO_PUSH_AUTOTRIGGER=0' };
  }
  if (!figmaPushReady || !figmaPushReady.figma || !figmaPushReady.figma.file_key) {
    return { skipped: true, reason: 'figma_push_ready 메타 없음' };
  }
  if (!Array.isArray(figmaPushReady.prepared_files) || figmaPushReady.prepared_files.length === 0) {
    return { skipped: true, reason: '_figma/*-figma.html 미생성' };
  }

  const { db } = require('../db');

  // 중복 큐잉 방지 — 같은 parent step 에 이미 prepare 가 있으면 skip
  const existing = db.prepare(`
    SELECT id FROM pipeline_steps
     WHERE pipeline_id = ? AND skill_name = 'figma-push-prepare'
       AND meta_json LIKE ?
  `).get(parentStep.pipeline_id, `%"parent_step_id":${parentStep.id}%`);
  if (existing) {
    return { skipped: true, reason: `이미 큐잉됨 (step ${existing.id})` };
  }

  // parent step 직후 자리에 prepare/finalize 2개 삽입.
  //   후속 step (publish/qa 등) 의 step_order 를 +2 shift 해야 worker 의 _claimNextStep
  //   "prev.step_order < s.step_order AND prev NOT in (approved, skipped)" 조건이 의도대로 동작.
  const parentOrder = parentStep.step_order || 0;

  const prepareMeta = JSON.stringify({
    auto_pushed: true,
    parent_step_id: parentStep.id,
    parent_skill: figmaPushReady.skill,
    figma_push_ready: figmaPushReady
  });
  const finalizeMeta = JSON.stringify({
    auto_pushed: true,
    parent_step_id: parentStep.id,
    parent_skill: figmaPushReady.skill,
    // captureId 는 prepare 완료 후 노드 hook 가 채움
    pending_capture_trigger: true
  });

  const tx = db.transaction(() => {
    // 1) 후속 step 모두 +2 shift (parent 다음 자리에 끼워넣기 위함)
    db.prepare(`
      UPDATE pipeline_steps
         SET step_order = step_order + 2
       WHERE pipeline_id = ? AND step_order > ?
    `).run(parentStep.pipeline_id, parentOrder);

    const prepRes = db.prepare(`
      INSERT INTO pipeline_steps
        (pipeline_id, step, step_order, skill_name, status, meta_json, created_at)
      VALUES (?, 'figma_push_prepare', ?, 'figma-push-prepare', 'pending', ?, datetime('now'))
    `).run(parentStep.pipeline_id, parentOrder + 1, prepareMeta);

    const finRes = db.prepare(`
      INSERT INTO pipeline_steps
        (pipeline_id, step, step_order, skill_name, status, meta_json, created_at)
      VALUES (?, 'figma_push_finalize', ?, 'figma-push-finalize', 'pending', ?, datetime('now'))
    `).run(parentStep.pipeline_id, parentOrder + 2, finalizeMeta);

    return { prepareStepId: prepRes.lastInsertRowid, finalizeStepId: finRes.lastInsertRowid };
  });
  const ids = tx();
  return {
    skipped: false,
    ok: true,
    ...ids,
    note: 'figma-push-prepare/finalize step 2개 큐잉 — worker tick 에서 순차 실행'
  };
}

// prepare step 완료 직후 호출 — LLM 응답 META 에서 captureId 추출 후 puppeteer 트리거.
// 결과는 finalize step 의 meta_json 에 capture_trigger 로 주입 (LLM 이 폴링 시 참고).
async function triggerCaptureAndPropagate({ prepareStep, prepareArtifact, project }) {
  const { db } = require('../db');
  // 1) prepare META 파싱
  let pushMeta = null;
  try {
    const m = prepareArtifact && prepareArtifact.meta_json ? JSON.parse(prepareArtifact.meta_json) : null;
    pushMeta = m && m.figma_push ? m.figma_push : null;
  } catch {}
  if (!pushMeta || !pushMeta.captureId) {
    return { ok: false, reason: 'prepare META 에 figma_push.captureId 없음' };
  }

  // 2) parent step 의 figma_push_ready.prepared_files 에서 첫 _figma HTML 경로 복원
  let parentMeta = null;
  try {
    parentMeta = prepareStep.meta_json ? JSON.parse(prepareStep.meta_json) : null;
  } catch {}
  const ready = parentMeta && parentMeta.figma_push_ready;
  if (!ready || !ready.prepared_files || ready.prepared_files.length === 0) {
    return { ok: false, reason: 'parent meta 에 prepared_files 없음' };
  }
  // outputDir 복원: parent step 의 산출물 폴더
  const parentArtifact = db.prepare(`
    SELECT file_path FROM artifacts
     WHERE pipeline_step_id = ? AND parent_artifact_id IS NULL
     LIMIT 1
  `).get(parentMeta.parent_step_id);
  if (!parentArtifact) return { ok: false, reason: 'parent artifact 미존재' };
  const outputDir = path.dirname(parentArtifact.file_path);
  const capturePath = path.join(outputDir, ready.prepared_files[0]);

  // 3) puppeteer 캡처
  const { runCapture } = require('./figma-capture');
  const cap = await runCapture({
    capturePath,
    captureId: pushMeta.captureId,
    endpoint: pushMeta.endpoint
  });

  // 4) finalize step 의 meta_json 에 capture_trigger 주입
  try {
    const finalize = db.prepare(`
      SELECT id, meta_json FROM pipeline_steps
       WHERE pipeline_id = ? AND skill_name = 'figma-push-finalize'
         AND meta_json LIKE ?
       LIMIT 1
    `).get(prepareStep.pipeline_id, `%"parent_step_id":${parentMeta.parent_step_id}%`);
    if (finalize) {
      let fm = {};
      try { fm = JSON.parse(finalize.meta_json) || {}; } catch {}
      fm.capture_trigger = {
        ok: cap.ok,
        captureId: pushMeta.captureId,
        durationMs: cap.durationMs,
        error: cap.error || null,
        timestamp: new Date().toISOString()
      };
      fm.figma_push = pushMeta;  // captureId/endpoint/fileKey 전파
      fm.pending_capture_trigger = false;
      db.prepare(`UPDATE pipeline_steps SET meta_json = ? WHERE id = ?`)
        .run(JSON.stringify(fm), finalize.id);
    }
  } catch (e) {
    console.warn('[figma-auto-push] finalize 메타 갱신 실패:', e.message);
  }
  return cap;
}

module.exports = { prepareFigmaPush, enqueueFigmaPushSteps, triggerCaptureAndPropagate, ELIGIBLE_SKILLS };
