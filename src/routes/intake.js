// U-G23: 통합 채팅 UX — intake 세션 라우트
//   POST /api/intake/start                    → { session_id }
//   POST /api/intake/:id/turn { message }     → AI 응답 (ask | confirm)
//   GET  /api/intake/:id                      → 세션 + 누적 메시지
//   POST /api/intake/:id/commit { optional_skills } → project 생성, pipeline 자동 시작 옵션
//   POST /api/intake/:id/abandon              → 세션 폐기

const router = require('express').Router();
const { authMiddleware } = require('../auth');
const { db, addMessage, logActivity } = require('../db');
const intake = require('../engine/intake-agent');
const { getStagesForLevel } = require('../engine/pipeline-stages');

// intake 메시지는 project_id=NULL이라 messages.addMessage 시그니처로는 CHECK 위반.
// 단일 INSERT로 intake_session_id를 함께 채워 atomic하게 처리.
const insertIntakeMsg = db.prepare(`
  INSERT INTO messages (intake_session_id, role, kind, content, user_id)
  VALUES (?, ?, ?, ?, ?)
`);

router.use(authMiddleware);

router.post('/start', (req, res) => {
  const id = intake.start(req.user.id);
  res.json({ session_id: id });
});

router.get('/:id', (req, res) => {
  const session = intake.getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) {
    return res.status(404).json({ error: 'ESYS-INTAKE-001', message: 'Session not found' });
  }
  const messages = db.prepare(`
    SELECT id, role, kind, content, created_at FROM messages
    WHERE intake_session_id = ? ORDER BY id ASC
  `).all(req.params.id);
  res.json({
    session: {
      id: session.id,
      status: session.status,
      slots: session.slots,
      committed_project_id: session.committed_project_id,
      created_at: session.created_at
    },
    messages
  });
});

router.post('/:id/turn', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'ESYS-INTAKE-002', message: 'message is required' });
  }
  const session = intake.getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) {
    return res.status(404).json({ error: 'ESYS-INTAKE-001', message: 'Session not found' });
  }
  if (session.status !== 'active') {
    return res.status(409).json({ error: 'ESYS-INTAKE-003', message: 'Session is not active' });
  }

  // 사용자 메시지 기록 (project_id NULL이지만 intake_session_id로 CHECK 충족)
  insertIntakeMsg.run(req.params.id, 'user', 'text', message.trim(), req.user.id);

  try {
    const result = await intake.turn({ sessionId: req.params.id, userMessage: message.trim() });
    if (!result.ok) {
      return res.status(502).json({ error: 'ESYS-INTAKE-004', message: result.error || 'AI failed', raw: result.raw });
    }

    // 어시스턴트 응답 기록 (사람이 읽을 텍스트만)
    // 2026-05-13: plan 모드도 plan_markdown 을 DB에 저장 (이전엔 question 만 저장 → plan 모드 응답 손실)
    //   결과: 다음 턴의 history 에 LLM 이전 응답이 포함되어 누적 대화 유지
    //   page reload 시에도 plan-card 텍스트가 message stream 으로 복원됨
    let assistantText;
    if (result.mode === 'confirm') {
      assistantText = `${result.summary || ''}\n\n[확인 후 시작 ▶]`;
    } else if (result.mode === 'plan') {
      assistantText = result.plan_markdown || result.rationale || '';
    } else {
      assistantText = result.question || '';
    }
    if (assistantText) {
      insertIntakeMsg.run(req.params.id, 'assistant', 'text', assistantText, null);
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'ESYS-INTAKE-005', message: e.message });
  }
});

router.post('/:id/commit', (req, res) => {
  const session = intake.getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) {
    return res.status(404).json({ error: 'ESYS-INTAKE-001', message: 'Session not found' });
  }
  const { optional_skills = [], start_pipeline = true, design_system_id = null, team_id = null, preset = null } = req.body || {};
  try {
    const projectId = intake.commit({ sessionId: req.params.id, optionalSkills: optional_skills });
    // intake 후 design_system_id / team_id 가 지정되었으면 즉시 적용
    if (design_system_id || team_id) {
      const updates = [];
      const args = [];
      if (design_system_id) {
        const ds = db.prepare('SELECT id FROM project_design_systems WHERE id = ?').get(parseInt(design_system_id, 10));
        if (ds) { updates.push('design_system_id = ?'); args.push(ds.id); }
      }
      if (team_id) {
        const tid = parseInt(team_id, 10);
        // 본인이 속한 팀인지 확인 (admin은 우회)
        const tm = req.user.role === 'admin'
          ? db.prepare('SELECT 1 AS ok FROM teams WHERE id = ?').get(tid)
          : db.prepare('SELECT 1 AS ok FROM team_members WHERE team_id = ? AND user_id = ?').get(tid, req.user.id);
        if (tm) { updates.push('team_id = ?'); args.push(tid); }
      }
      if (updates.length > 0) {
        args.push(projectId);
        db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...args);
      }
    }
    let pipelineId = null;
    if (start_pipeline) {
      // 파이프라인 즉시 생성 + steps 생성 (워커 픽업 가능 상태)
      const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      let optSkills = [];
      try { if (proj.optional_skills) optSkills = JSON.parse(proj.optional_skills); } catch {}
      // preset 명시 시 phase 조합, 미명시 시 completion_level
      let stages;
      if (preset) {
        const { getStagesForPreset, PRESETS } = require('../engine/pipeline-stages');
        if (!PRESETS[preset]) return res.status(400).json({ error: 'ESYS-INTAKE-007', message: `Unknown preset: ${preset}` });
        stages = getStagesForPreset(preset, optSkills);
      } else {
        stages = getStagesForLevel(proj.completion_level || 1, optSkills);
      }
      const r = db.prepare(
        "INSERT INTO pipelines (project_id, status, current_phase, started_at, prompt) VALUES (?, 'running', ?, datetime('now'), ?)"
      ).run(projectId, stages[0].phase, proj.prompt || '');
      pipelineId = r.lastInsertRowid;
      const insertStep = db.prepare(`
        INSERT INTO pipeline_steps (pipeline_id, phase, step, step_order, skill_name, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `);
      stages.forEach((s, idx) => insertStep.run(pipelineId, s.phase, s.step, idx, s.skill));
      logActivity('pipeline', pipelineId, 'started', `${proj.name} (Level ${proj.completion_level}, ${stages.length} steps, intake)`, req.user.id);
      // 파이프라인 시작 알림 메시지
      addMessage({
        projectId, role: 'assistant', kind: 'status',
        content: `프로젝트 "${proj.name}" 생성 완료. 파이프라인을 시작합니다.`
      });
    }
    res.json({ ok: true, project_id: projectId, pipeline_id: pipelineId });
  } catch (e) {
    // 에러 유형별 코드 분리 — 클라이언트가 슬롯 보강/코드 변경 등 분기 가능
    let code = 'ESYS-INTAKE-006';
    if (/필수 슬롯/.test(e.message)) code = 'ESYS-INTAKE-007';
    else if (/코드 충돌/.test(e.message)) code = 'ESYS-INTAKE-008';
    else if (/session_not_active|session_not_found/.test(e.message)) code = 'ESYS-INTAKE-009';
    res.status(400).json({ error: code, message: e.message });
  }
});

router.post('/:id/abandon', (req, res) => {
  const session = intake.getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) {
    return res.status(404).json({ error: 'ESYS-INTAKE-001', message: 'Session not found' });
  }
  db.prepare(`UPDATE intake_sessions SET status = 'abandoned', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
