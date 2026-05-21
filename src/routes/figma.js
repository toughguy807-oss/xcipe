// Figma 인커밍 webhook + 플러그인 수신 라우트
//   POST /api/figma/webhook         — Figma 공식 webhook (FILE_UPDATE 등). HMAC 시그니처 검증.
//   POST /api/figma/incoming        — 사용자 자체 Figma 플러그인이 변경 알림을 보낼 때.
//                                     X-Plugin-Token (settings.figma_plugin_token) 인증.
//
// 동작: 페이로드 파싱 → projects 테이블에서 figma_file_key 가 매칭되는 프로젝트 찾음 → 알림 메시지 추가 +
//      design_system_id 가 있으면 figma-sync.pullFromFigma 자동 트리거 (fire-and-forget).

const router = require('express').Router();
const crypto = require('crypto');
const { db, addMessage, getSetting, logActivity, logError } = require('../db');

// Figma 공식 webhook 시그니처: X-Figma-Webhook-Signature: <hex hmac-sha256(passcode, body)>
function verifyFigmaSignature(req) {
  const passcode = getSetting('figma_webhook_passcode') || process.env.FIGMA_WEBHOOK_PASSCODE;
  if (!passcode) return false;
  const sig = req.headers['x-figma-webhook-signature'];
  if (!sig) return false;
  const expected = crypto.createHmac('sha256', passcode).update(JSON.stringify(req.body)).digest('hex');
  // timing-safe 비교
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

function findProjectsByFigmaKey(fileKey) {
  if (!fileKey) return [];
  return db.prepare(`
    SELECT p.id, p.code, p.name, p.design_system_id
    FROM projects p
    LEFT JOIN project_design_systems ds ON ds.id = p.design_system_id
    WHERE (p.figma_file_key = ? OR ds.figma_file_key = ?) AND p.deleted_at IS NULL
  `).all(fileKey, fileKey);
}

function triggerPull(projectIds, fileKey, actor) {
  // fire-and-forget. design_system_id 있는 프로젝트만 pullFromFigma 트리거.
  try {
    const { pullFromFigma } = require('../engine/figma-sync');
    for (const p of projectIds) {
      if (!p.design_system_id) {
        addMessage({ projectId: p.id, role: 'system', kind: 'status',
          content: `Figma 변경 알림 수신 (file=${fileKey}). design_system 미연결로 자동 pull 건너뜀.` });
        continue;
      }
      addMessage({ projectId: p.id, role: 'assistant', kind: 'status',
        content: `Figma 측 변경 감지. 자동 pull 시작합니다 (file=${fileKey}).` });
      pullFromFigma({ designSystemId: p.design_system_id, actor: actor || 'figma-webhook' })
        .then(r => addMessage({ projectId: p.id, role: 'assistant', kind: 'status',
          content: r.ok ? `Figma pull 완료: ${r.summary || '변경 반영됨'}` : `Figma pull 실패: ${r.error}` }))
        .catch(e => addMessage({ projectId: p.id, role: 'system', kind: 'error', content: `Figma pull 예외: ${e.message}` }));
    }
  } catch (e) {
    console.warn('[figma webhook] triggerPull 실패:', e.message);
  }
}

// 공식 Figma webhook (Enterprise 플랜 한정)
router.post('/webhook', (req, res) => {
  if (!verifyFigmaSignature(req)) {
    logError({ source: 'figma-webhook', code: 'INVALID_SIGNATURE', message: 'X-Figma-Webhook-Signature 검증 실패' });
    return res.status(401).json({ error: 'invalid signature' });
  }
  const body = req.body || {};
  const eventType = body.event_type;
  const fileKey = body.file_key || (body.file && body.file.key);
  if (!['FILE_UPDATE', 'FILE_VERSION_UPDATE', 'LIBRARY_PUBLISH'].includes(eventType)) {
    return res.json({ ok: true, ignored: eventType });
  }
  const targets = findProjectsByFigmaKey(fileKey);
  if (targets.length === 0) {
    return res.json({ ok: true, matched: 0 });
  }
  logActivity('figma', null, 'webhook_received', `event=${eventType} file=${fileKey} projects=${targets.length}`, null);
  triggerPull(targets, fileKey, 'figma-webhook');
  res.json({ ok: true, matched: targets.length });
});

// 자체 Figma 플러그인 incoming — Enterprise 미사용 시 대안
router.post('/incoming', (req, res) => {
  const tokenHeader = req.headers['x-plugin-token'];
  const expectedToken = getSetting('figma_plugin_token') || process.env.FIGMA_PLUGIN_TOKEN;
  if (!expectedToken || tokenHeader !== expectedToken) {
    return res.status(401).json({ error: 'invalid plugin token' });
  }
  const { file_key, event = 'plugin_change', node_id, actor, summary } = req.body || {};
  if (!file_key) return res.status(400).json({ error: 'file_key required' });
  const targets = findProjectsByFigmaKey(file_key);
  if (targets.length === 0) {
    return res.json({ ok: true, matched: 0, hint: '해당 file_key 에 연결된 프로젝트 없음' });
  }
  for (const p of targets) {
    addMessage({ projectId: p.id, role: 'assistant', kind: 'status',
      content: `Figma 플러그인 알림 수신 (event=${event}${node_id ? `, node=${node_id}` : ''}${summary ? `, ${summary}` : ''}). 자동 pull 시도.` });
  }
  logActivity('figma', null, 'incoming_received', `event=${event} file=${file_key} projects=${targets.length}`, null);
  triggerPull(targets, file_key, actor || 'figma-plugin');
  res.json({ ok: true, matched: targets.length });
});

module.exports = router;
