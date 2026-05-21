const router = require('express').Router({ mergeParams: true });
const { db, addMessage, logActivity } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { assertProjectAccess } = require('../middleware/project-access');
const worker = require('../engine/pipeline-worker');

router.use(authMiddleware);

// 모든 messages 라우트 공통 격리 — :id 는 부모 mergeParams 의 projects.id
router.use((req, res, next) => {
  const g = assertProjectAccess(req, req.params.id);
  if (!g.ok) return res.status(g.status).json(g.body);
  next();
});

// GET /api/projects/:id/messages
router.get('/', (req, res) => {
  const { id } = req.params;
  const limit = +req.query.limit || 200;
  const since = +req.query.since || 0;

  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!project) return res.status(404).json({ error: 'ESYS-MSG-001', message: 'Project not found' });

  const messages = db.prepare(`
    SELECT m.id, m.role, m.kind, m.content, m.artifact_id, m.step_id, m.user_id, m.created_at,
           u.email as user_email,
           a.type as artifact_type, a.file_name as artifact_file_name, a.version as artifact_version, a.meta_json,
           s.step as step_code, s.phase as step_phase, s.status as step_status, s.self_check_result
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN artifacts a ON m.artifact_id = a.id
    LEFT JOIN pipeline_steps s ON m.step_id = s.id
    WHERE m.project_id = ? AND m.id > ?
    ORDER BY m.id ASC LIMIT ?
  `).all(id, since, limit);

  res.json({ data: messages, last_id: messages.length ? messages[messages.length - 1].id : since });
});

// POST /api/projects/:id/messages — 사용자 입력 처리
router.post('/', requireRole('admin', 'member'), async (req, res) => {
  const { id } = req.params;
  const { content, kind = 'text', context } = req.body;

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!project) return res.status(404).json({ error: 'ESYS-MSG-001', message: 'Project not found' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'ESYS-MSG-002', message: 'Content required' });

  const trimmed = content.trim();

  // 슬래시 명령어 우선 해석
  if (trimmed.startsWith('/approve ') || trimmed === '/approve' || /^승인$/.test(trimmed) || /^승인\s/.test(trimmed)) {
    // 현재 awaiting_approval 단계 찾기
    const step = db.prepare(`
      SELECT s.* FROM pipeline_steps s
      JOIN pipelines p ON p.id = s.pipeline_id
      WHERE p.project_id = ? AND s.status = 'awaiting_approval'
      ORDER BY s.step_order ASC LIMIT 1
    `).get(id);

    if (!step) {
      addMessage({ projectId: +id, role: 'user', content: trimmed, userId: req.user.id });
      addMessage({ projectId: +id, role: 'system', kind: 'error', content: '승인 대기 중인 단계가 없습니다.' });
      return res.json({ ok: false, message: '승인 대기 단계 없음' });
    }

    // 2026-05-14: 채팅 메시지에 "/approve" 슬래시 명령 대신 한국어 라벨 저장 — UX 가독성
    const approveLabel = trimmed === '/approve' ? '승인' : trimmed.replace(/^\/approve\s+/, '승인: ');
    addMessage({ projectId: +id, role: 'user', kind: 'approval_response', content: approveLabel, userId: req.user.id, stepId: step.id });
    worker.approveStep(step.id, req.user.id);
    addMessage({ projectId: +id, role: 'system', kind: 'status', content: `${step.step} 단계 승인됨. 다음 단계 시작합니다.`, stepId: step.id });
    return res.json({ ok: true });
  }

  // /kds-design — KDS v4 워크플로우로 화면 자동 생성. xcipe 채팅이 KDS designer 에이전트 호출.
  //   본격 통합: KDS .claude/agents/kds-designer.md 가이드로 figma.json + html 페어 to-figma/ 직접 저장.
  //   long-running — fire-and-forget. 결과는 별도 메시지로 broadcast.
  if (/^\/?kds[- ]?(디자인|design)\b/i.test(trimmed)) {
    const requirement = trimmed.replace(/^\/?kds[- ]?(디자인|design)\s*/i, '').trim();
    if (!requirement) {
      addMessage({ projectId: +id, role: 'system', kind: 'error',
        content: '사용법: `/kds-design <화면 요구사항>` 또는 `kds 디자인 <요구사항>`.\n예: `/kds-design 통신비 요금제 비교 카드 3개, mobile + desktop`' });
      return res.json({ ok: false, message: 'requirement 누락' });
    }
    addMessage({ projectId: +id, role: 'user', kind: 'text', content: trimmed, userId: req.user.id });
    addMessage({ projectId: +id, role: 'assistant', kind: 'status',
      content: `KDS designer 에이전트 호출 중… (claude CLI subprocess, 1~5분 소요)\n요구사항: "${requirement}"` });

    // fire-and-forget
    (async () => {
      try {
        const { generateDesign } = require('../engine/kds-design-runner');
        const r = await generateDesign({ requirement, viewports: ['mobile', 'desktop'] });
        if (!r.ok) {
          addMessage({ projectId: +id, role: 'system', kind: 'error',
            content: `KDS 디자인 생성 실패: ${r.error}\n${(r.raw || '').slice(0, 400)}` });
          return;
        }
        addMessage({ projectId: +id, role: 'assistant', kind: 'status',
          content: `KDS 디자인 생성 완료 — to-figma/ 에 ${r.generated.length}개 파일:\n${r.generated.map(f => '  • ' + f).join('\n')}\n\nFigma 에서 KDS Design Bridge 플러그인 → 'Claude에서 불러오기' 누르면 import 됩니다.` });
      } catch (e) {
        addMessage({ projectId: +id, role: 'system', kind: 'error',
          content: `KDS 디자인 runner 예외: ${e.message}` });
      }
    })();

    return res.json({ ok: true, message: 'KDS designer 에이전트 호출 시작 — 결과는 별도 메시지로' });
  }

  // /kds-demo — KDS v4 원본 시스템(3939)으로 시연용 화면을 떨궈, 디자이너가
  //   KDS 원본 플러그인(KDS Design Bridge) 로 그대로 import 하게 한다.
  //   "동작도 완벽하게 동일" 보장 — xcipe 자체 변환기는 우회.
  if (trimmed === '/kds-demo' || /^kds\s*(시연|demo|데모)/i.test(trimmed) || /^kds\s*시연/i.test(trimmed)) {
    addMessage({ projectId: +id, role: 'user', kind: 'text', content: trimmed, userId: req.user.id });
    try {
      const fs = require('fs'); const path = require('path');
      const name = 'button-catalog';
      const seedDir = path.join(__dirname, '..', '..', 'seed', 'kds-demo');
      const htmlSrc = path.join(seedDir, name + '.html');
      const specSrc = path.join(seedDir, name + '.figma.json');
      const target = process.env.KDS_TO_FIGMA_DIR
        || 'C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/AX_KDS_design system-v4/to-figma';
      if (!fs.existsSync(target)) {
        addMessage({ projectId: +id, role: 'system', kind: 'error',
          content: `KDS to-figma 디렉토리 없음: ${target}. KDS v4 패키지 다운로드 확인 또는 환경변수 KDS_TO_FIGMA_DIR 설정.` });
        return res.json({ ok: false, message: 'KDS to-figma 디렉토리 없음' });
      }
      fs.copyFileSync(htmlSrc, path.join(target, name + '.html'));
      fs.copyFileSync(specSrc, path.join(target, name + '.figma.json'));
      addMessage({ projectId: +id, role: 'assistant', kind: 'status',
        content: `KDS 시연 콘텐츠 배포 완료:\n  - ${name}.html\n  - ${name}.figma.json\n\nFigma 에서 KDS 원본 플러그인 (KDS Design Bridge, BRIDGE=3939) → 'Claude에서 불러오기' 누르면 Button 카탈로그 화면이 import 됩니다.` });
      return res.json({ ok: true, deployed: [name + '.html', name + '.figma.json'], target });
    } catch (e) {
      addMessage({ projectId: +id, role: 'system', kind: 'error', content: `KDS 시연 배포 실패: ${e.message}` });
      return res.json({ ok: false, message: e.message });
    }
  }

  // /figma-push — 현재 FINAL artifact 를 Figma 로 전송하기 위한 captureId 준비.
  //   xcipe 가 직접 데스크탑 앱을 못 부르므로, captureId 만 발급하고 사용자가 새 탭으로 Chrome 캡처 URL 열도록 안내.
  if (trimmed === '/figma-push' || /^피그마(로)?\s*(보내|푸시|push)/i.test(trimmed) || /^figma\s*push/i.test(trimmed)) {
    addMessage({ projectId: +id, role: 'user', kind: 'text', content: trimmed, userId: req.user.id });
    const final = db.prepare(`
      SELECT id, file_path, file_name FROM artifacts
      WHERE project_id = ? AND type = 'FINAL' AND parent_artifact_id IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(id);
    if (!final) {
      addMessage({ projectId: +id, role: 'system', kind: 'error',
        content: 'Figma 전송 대상 FINAL artifact 가 없습니다. publish-interaction 단계가 끝나야 합니다.' });
      return res.json({ ok: false, message: 'FINAL artifact 없음' });
    }
    addMessage({ projectId: +id, role: 'assistant', kind: 'status',
      content: `Figma push 준비: 대상 = ${final.file_name}.\n다음 단계: Chrome 으로 \`${final.file_path}\` 를 열어 figma capture URL 핸드셰이크 (figma-push-prepare 스킬). Figma 데스크탑 앱이 실행 중이어야 합니다. (현재 captureId 자동 발급은 다음 PR — 사용자가 \`/mcp\` → figma → Authenticate 1회 완료 시 자동화)` });
    return res.json({ ok: true });
  }

  // /figma-pull — Figma 측 변경 사항을 끌어와 design-knowledge baseline 갱신.
  if (trimmed === '/figma-pull' || /^피그마(에서)?\s*(가져|pull)/i.test(trimmed) || /^figma\s*pull/i.test(trimmed)) {
    addMessage({ projectId: +id, role: 'user', kind: 'text', content: trimmed, userId: req.user.id });
    const ds = db.prepare('SELECT design_system_id FROM projects WHERE id = ?').get(id);
    if (!ds || !ds.design_system_id) {
      addMessage({ projectId: +id, role: 'system', kind: 'error',
        content: 'Figma pull 대상 design_system 이 프로젝트에 연결되어 있지 않습니다. admin → design-systems 에서 figma_file_key 설정 후 다시 시도하세요.' });
      return res.json({ ok: false, message: 'design_system 미연결' });
    }
    // fire-and-forget — figma-sync.pullFromFigma 호출
    try {
      const { pullFromFigma } = require('../engine/figma-sync');
      pullFromFigma({ designSystemId: ds.design_system_id, actor: req.user.email })
        .then(r => addMessage({ projectId: +id, role: 'assistant', kind: 'status',
          content: r.ok ? `Figma pull 완료: ${r.summary || '변경 반영됨'}` : `Figma pull 실패: ${r.error}` }))
        .catch(e => addMessage({ projectId: +id, role: 'system', kind: 'error', content: `Figma pull 예외: ${e.message}` }));
    } catch (e) {
      addMessage({ projectId: +id, role: 'system', kind: 'error', content: `Figma pull 모듈 로딩 실패: ${e.message}` });
    }
    addMessage({ projectId: +id, role: 'assistant', kind: 'status',
      content: 'Figma pull 시작했습니다. 완료되면 알림 메시지가 갱신됩니다.' });
    return res.json({ ok: true });
  }

  if (trimmed.startsWith('/retry')) {
    const step = db.prepare(`
      SELECT s.* FROM pipeline_steps s
      JOIN pipelines p ON p.id = s.pipeline_id
      WHERE p.project_id = ? AND s.status = 'failed'
      ORDER BY s.step_order ASC LIMIT 1
    `).get(id);
    if (!step) return res.json({ ok: false, message: '실패 상태 단계 없음' });
    const retryLabel = trimmed === '/retry' ? '다시 시도' : trimmed.replace(/^\/retry\s+/, '다시 시도: ');
    addMessage({ projectId: +id, role: 'user', content: retryLabel, userId: req.user.id, stepId: step.id });
    worker.retryStep(step.id, req.user.id);
    addMessage({ projectId: +id, role: 'system', kind: 'status', content: `${step.step} 단계 재시도`, stepId: step.id });
    return res.json({ ok: true });
  }

  if (trimmed.startsWith('/skip')) {
    const step = db.prepare(`
      SELECT s.* FROM pipeline_steps s
      JOIN pipelines p ON p.id = s.pipeline_id
      WHERE p.project_id = ? AND s.status IN ('failed','awaiting_approval')
      ORDER BY s.step_order ASC LIMIT 1
    `).get(id);
    if (!step) return res.json({ ok: false });
    db.prepare("UPDATE pipeline_steps SET status='skipped' WHERE id = ?").run(step.id);
    worker.updatePipelineStatus(step.pipeline_id);
    const skipLabel = trimmed === '/skip' ? '건너뛰기' : trimmed.replace(/^\/skip\s+/, '건너뛰기: ');
    addMessage({ projectId: +id, role: 'user', content: skipLabel, userId: req.user.id, stepId: step.id });
    addMessage({ projectId: +id, role: 'system', kind: 'status', content: `${step.step} 단계 건너뜀`, stepId: step.id });
    return res.json({ ok: true });
  }

  // 일반 사용자 메시지 — awaiting_approval 단계에 대한 수정 지시로 해석
  const awaitingStep = db.prepare(`
    SELECT s.* FROM pipeline_steps s
    JOIN pipelines p ON p.id = s.pipeline_id
    WHERE p.project_id = ? AND s.status = 'awaiting_approval'
    ORDER BY s.step_order ASC LIMIT 1
  `).get(id);

  const userMsgId = addMessage({
    projectId: +id, role: 'user', kind: awaitingStep ? 'approval_response' : 'text',
    content: trimmed, userId: req.user.id, stepId: awaitingStep ? awaitingStep.id : null
  });

  if (awaitingStep) {
    // 재작성 요청으로 해석
    worker.rejectStep(awaitingStep.id, req.user.id, trimmed);
    addMessage({ projectId: +id, role: 'system', kind: 'status',
      content: `${awaitingStep.step} 단계 다시 생성합니다. 지시사항: "${trimmed.slice(0, 80)}"`,
      stepId: awaitingStep.id });
  } else {
    // U-G23: 파이프라인이 running/pending 이면 user_feedback 으로 기록 → 다음 step 직전에 자동 주입
    const activePipeline = db.prepare(`
      SELECT id FROM pipelines WHERE project_id = ? AND status IN ('running','pending','paused') LIMIT 1
    `).get(id);
    if (activePipeline) {
      // 방금 기록한 메시지를 user_feedback 으로 변경
      db.prepare("UPDATE messages SET kind = 'user_feedback' WHERE id = ?").run(userMsgId);
      addMessage({ projectId: +id, role: 'system', kind: 'status',
        content: '피드백을 다음 단계 입력에 반영합니다.' });
    } else {
      // 파이프라인 비활성 → 대화형 LLM 응답. 사용자가 "대화형"으로 요청.
      //   설계: 진행 중인 작업이 없으면 메시지 자체가 새 요청. LLM 이 의도 분류 + 답변/제안.
      //   응답 가능: (a) 단순 질문 → 텍스트 답  (b) 수정 지시 → 어떤 step 재실행 제안
      //             (c) 새 작업 요청 → 새 파이프라인 시작 안내
      try {
        await _conversationalReply({ project, userMsg: trimmed, userId: req.user.id });
      } catch (cErr) {
        console.warn('[chat] conversational reply 실패:', cErr.message);
        addMessage({ projectId: +id, role: 'system', kind: 'error',
          content: `응답 생성 실패: ${cErr.message}` });
      }
    }
  }

  logActivity('message', userMsgId, 'posted', trimmed.slice(0, 50), req.user.id);
  res.json({ ok: true, message_id: userMsgId });
});

// 파이프라인 비활성 상태에서 사용자 메시지에 LLM 으로 대화형 응답.
//   - 프로젝트 메타 + 최근 메시지 10건 + 최근 산출물 메타 → 컨텍스트
//   - light tier (Haiku) — 비용/지연 최소
async function _conversationalReply({ project, userMsg, userId }) {
  const { getProvider, pickModel } = require('../engine/model-bridge');
  const provider = getProvider();
  // 최근 메시지 10건
  const recent = db.prepare(`
    SELECT role, kind, content FROM messages
    WHERE project_id = ? AND content IS NOT NULL
    ORDER BY id DESC LIMIT 10
  `).all(project.id).reverse();
  // 산출물 요약 — 메인 artifact 만
  const arts = db.prepare(`
    SELECT type, file_name FROM artifacts
    WHERE project_id = ? AND parent_artifact_id IS NULL
    ORDER BY id DESC LIMIT 30
  `).all(project.id);
  // 파이프라인 마지막 상태
  const lastPipe = db.prepare(`
    SELECT id, status, progress FROM pipelines WHERE project_id = ? ORDER BY id DESC LIMIT 1
  `).get(project.id);

  const systemPrompt = `당신은 SYS_v4 xcipe 의 프로젝트 보조 에이전트입니다.
프로젝트: ${project.name} (${project.code}, type=${project.type || 'web'}, level=${project.completion_level})
설명: ${(project.description || '').slice(0, 200)}
마지막 파이프라인: ${lastPipe ? `#${lastPipe.id} ${lastPipe.status} ${lastPipe.progress}%` : '없음'}
생성된 산출물 (${arts.length}건): ${arts.map(a => a.type).join(', ')}

[행동 원칙]
1. 사용자 메시지에 한국어로 짧고 명확하게 답하세요 (3~6문장).
2. 사용자가 산출물 수정/추가/배포/Figma 연동 같은 작업을 지시하면:
   - 어떤 작업을 어떻게 수행할지 1문단으로 설명
   - 가능하면 "다음 액션: A) 새 파이프라인 시작 B) 특정 step 재실행 C) Figma push" 형태로 선택지 제시
3. 단순 질문/확인이면 그냥 답하세요.
4. 마크다운 펜스(\`\`\`) 사용 금지. 일반 텍스트로 답.`;

  const historyText = recent.map(m =>
    `${m.role === 'user' ? '사용자' : (m.role === 'assistant' ? '에이전트' : '시스템')}: ${(m.content || '').slice(0, 400)}`
  ).join('\n');

  const userPrompt = `[최근 대화]
${historyText || '(없음)'}

[지금 사용자 메시지]
${userMsg}

위 메시지에 응답하세요. 작업 지시면 액션 선택지를 함께 제시.`;

  const model = pickModel({ task: 'analyze-prompt' }); // light tier
  const result = await provider.sendMessage({
    task: 'chat-reply',
    skillName: null,
    systemPrompt,
    userPrompt,
    model,
    tier: 'light'
  });
  if (!result.ok) {
    throw new Error(result.error || 'LLM provider 실패');
  }
  const replyText = (result.content || '').trim();
  if (!replyText) {
    addMessage({ projectId: project.id, role: 'system', kind: 'status',
      content: '응답이 비었습니다. 다시 시도해주세요.' });
    return;
  }
  addMessage({ projectId: project.id, role: 'assistant', kind: 'text', content: replyText });
}

module.exports = router;
