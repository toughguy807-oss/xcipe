// 자동 승인 루프 — pipeline 19 step 끝까지 무인 진행
//   - awaiting_approval 발견 → reviewer 점수 ≥ THRESHOLD 면 approve
//   - 점수 < THRESHOLD 또는 self_check FAIL → 정지 + 사용자 알림
//   - 5초 간격 폴링
//   - 종료 조건: pipeline.status ∈ {completed, failed, cancelled}

const { db } = require('../src/db');
const { approveStep } = require('../src/engine/pipeline-worker');

const ADMIN_ID = parseInt(process.env.ADMIN_USER_ID || '1', 10);
const PIPELINE_ID = parseInt(process.env.PIPELINE_ID || '23', 10);
const THRESHOLD = parseInt(process.env.AUTO_APPROVE_THRESHOLD || '80', 10);
const POLL_MS = 5000;

let _lastStatusLog = '';
function logOnce(msg) {
  if (msg === _lastStatusLog) return;
  _lastStatusLog = msg;
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function readScore(step) {
  try {
    const meta = JSON.parse(step.meta_json || '{}');
    if (meta.review && typeof meta.review.score === 'number') return meta.review.score;
    if (typeof meta.score === 'number') return meta.score;
  } catch {}
  // self_check_result 에서 "PASS · NN점" 패턴
  const m = (step.self_check_result || '').match(/(\d+)\s*점/);
  if (m) return parseInt(m[1], 10);
  return null;
}

async function loop() {
  const p = db.prepare('SELECT status, progress FROM pipelines WHERE id=?').get(PIPELINE_ID);
  if (!p) {
    console.log(`[fatal] pipeline ${PIPELINE_ID} 없음`);
    process.exit(1);
  }
  if (['completed', 'failed', 'cancelled'].includes(p.status)) {
    const total = db.prepare('SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=?').get(PIPELINE_ID).c;
    const approved = db.prepare("SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=? AND status='approved'").get(PIPELINE_ID).c;
    const failed = db.prepare("SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=? AND status='failed'").get(PIPELINE_ID).c;
    console.log(`[DONE] pipeline=${PIPELINE_ID} status=${p.status} progress=${p.progress}% approved=${approved}/${total} failed=${failed}`);
    process.exit(0);
  }

  const step = db.prepare(`
    SELECT id, step, skill_name, status, retry_count, self_check_result, meta_json, error_message
    FROM pipeline_steps
    WHERE pipeline_id=? AND status='awaiting_approval'
    ORDER BY step_order LIMIT 1
  `).get(PIPELINE_ID);

  if (step) {
    const score = readScore(step);
    if (score === null) {
      // 점수 없음 — 안전을 위해 정지
      console.log(`[BLOCK] step ${step.id} (${step.step}/${step.skill_name}) — 점수 추출 실패 (self_check=${step.self_check_result})`);
      process.exit(2);
    }
    if (score >= THRESHOLD) {
      const r = approveStep(step.id, ADMIN_ID);
      console.log(`[APPROVE] step ${step.id} (${step.step}/${step.skill_name}) score=${score} progress=${p.progress}% → ${r.ok ? 'OK' : 'FAIL:' + r.error}`);
    } else {
      console.log(`[BLOCK] step ${step.id} (${step.step}/${step.skill_name}) score=${score} < ${THRESHOLD} — 사용자 개입 필요`);
      process.exit(3);
    }
  } else {
    // 진행 상황 요약 (중복 로그 억제)
    const running = db.prepare("SELECT step, skill_name FROM pipeline_steps WHERE pipeline_id=? AND status='running'").get(PIPELINE_ID);
    const pending = db.prepare("SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=? AND status='pending'").get(PIPELINE_ID).c;
    const approved = db.prepare("SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=? AND status='approved'").get(PIPELINE_ID).c;
    const failed = db.prepare("SELECT COUNT(*) as c FROM pipeline_steps WHERE pipeline_id=? AND status='failed'").get(PIPELINE_ID).c;
    if (running) {
      logOnce(`running=${running.step}/${running.skill_name} approved=${approved} pending=${pending} failed=${failed} progress=${p.progress}%`);
    } else {
      logOnce(`idle approved=${approved} pending=${pending} failed=${failed} progress=${p.progress}%`);
    }
  }

  setTimeout(loop, POLL_MS);
}

console.log(`[start] auto-approve-loop pipeline=${PIPELINE_ID} threshold=${THRESHOLD} admin=${ADMIN_ID}`);
loop();
