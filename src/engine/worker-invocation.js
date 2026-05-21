// worker-invocation.js — ad-hoc LLM 호출을 분산 워커로 위임
//
// 사용:
//   const { invokeViaWorker } = require('./worker-invocation');
//   const result = await invokeViaWorker({
//     userId: 1,
//     kind: 'analyze-prompt',
//     payload: { prompt: '...', systemPrompt: '...' },
//     timeoutMs: 90_000
//   });
//   // result: { ok: true, content: '...', usage: {...} }
//   //      or { ok: false, error: '...' }
//
// 흐름:
//   1. worker_invocations 테이블에 pending 행 insert
//   2. 워커가 /api/worker/invocations/claim 으로 가져감 → running
//   3. 워커가 /api/worker/invocations/:id/result 로 done/failed 보고
//   4. 본 helper 는 100ms 간격 폴링으로 row.status 확인 → 완료 시 반환
//   5. timeoutMs 초과 시 cancelled 처리 + ok:false 반환

const { db } = require('../db');

const DEFAULT_TIMEOUT_MS = 120_000; // 2분 — claude CLI 호출은 보통 5~60초
const POLL_INTERVAL_MS   = 200;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function invokeViaWorker({ userId, kind, payload, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!userId) return { ok: false, error: 'userId 필수' };
  if (!kind) return { ok: false, error: 'kind 필수' };

  const ALLOWED_KINDS = ['analyze-prompt', 'intake-turn', 'kds-chat', 'kds-design'];
  if (!ALLOWED_KINDS.includes(kind)) {
    return { ok: false, error: `unknown kind: ${kind}` };
  }

  // 1. invocation 등록
  const insert = db.prepare(`
    INSERT INTO worker_invocations (user_id, kind, payload_json, status)
    VALUES (?, ?, ?, 'pending')
  `).run(userId, kind, JSON.stringify(payload || {}));
  const id = insert.lastInsertRowid;

  // 2. 폴링 대기
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = db.prepare(`
      SELECT status, result_json, error FROM worker_invocations WHERE id = ?
    `).get(id);

    if (!row) return { ok: false, error: 'invocation 행 사라짐' };

    if (row.status === 'done') {
      try {
        const result = row.result_json ? JSON.parse(row.result_json) : {};
        return { ok: true, ...result, invocationId: id };
      } catch (e) {
        return { ok: false, error: `result JSON 파싱 실패: ${e.message}`, raw: row.result_json };
      }
    }
    if (row.status === 'failed') {
      return { ok: false, error: row.error || 'worker reported failure', invocationId: id };
    }
    if (row.status === 'cancelled') {
      return { ok: false, error: 'cancelled', invocationId: id };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // 3. 타임아웃 → cancelled
  db.prepare(`
    UPDATE worker_invocations
    SET status = 'cancelled', error = ?, completed_at = datetime('now')
    WHERE id = ? AND status IN ('pending','running')
  `).run(`timeout after ${timeoutMs}ms (no worker response)`, id);

  return { ok: false, error: `워커 응답 타임아웃 (${timeoutMs}ms) — 워커가 실행 중인지 확인하세요`, invocationId: id };
}

// 워커에서 사용 — 다음 pending invocation 하나를 claim
function claimNextInvocation({ userId, workerId, kinds = null }) {
  const kindFilter = kinds && kinds.length
    ? ` AND kind IN (${kinds.map(() => '?').join(',')})`
    : '';
  const args = [userId, ...(kinds || [])];

  const row = db.prepare(`
    SELECT id, kind, payload_json
    FROM worker_invocations
    WHERE user_id = ? AND status = 'pending'${kindFilter}
    ORDER BY created_at ASC LIMIT 1
  `).get(...args);

  if (!row) return null;

  const updated = db.prepare(`
    UPDATE worker_invocations
    SET status = 'running', worker_id = ?, claimed_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).run(workerId, row.id);

  if (updated.changes === 0) return null;  // race condition — 다른 워커가 가져감

  return {
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payload_json)
  };
}

function completeInvocation({ id, userId, workerId, ok, result, error }) {
  if (ok) {
    return db.prepare(`
      UPDATE worker_invocations
      SET status = 'done', result_json = ?, completed_at = datetime('now')
      WHERE id = ? AND user_id = ? AND worker_id = ? AND status = 'running'
    `).run(JSON.stringify(result || {}), id, userId, workerId).changes > 0;
  }
  return db.prepare(`
    UPDATE worker_invocations
    SET status = 'failed', error = ?, completed_at = datetime('now')
    WHERE id = ? AND user_id = ? AND worker_id = ? AND status = 'running'
  `).run(String(error || 'unknown error').slice(0, 4000), id, userId, workerId).changes > 0;
}

// v30: 비동기 패턴 — invocation 등록 후 즉시 ID 반환. 클라이언트가 status polling.
//   Railway HTTP proxy timeout(60s) 회피. 긴 작업(KDS design 등)에 필수.
function enqueueInvocation({ userId, kind, payload }) {
  if (!userId) return { ok: false, error: 'userId 필수' };
  if (!kind) return { ok: false, error: 'kind 필수' };
  const ALLOWED_KINDS = ['analyze-prompt', 'intake-turn', 'kds-chat', 'kds-design'];
  if (!ALLOWED_KINDS.includes(kind)) return { ok: false, error: `unknown kind: ${kind}` };
  const insert = db.prepare(`
    INSERT INTO worker_invocations (user_id, kind, payload_json, status)
    VALUES (?, ?, ?, 'pending')
  `).run(userId, kind, JSON.stringify(payload || {}));
  return { ok: true, invocationId: insert.lastInsertRowid };
}

function getInvocationStatus({ id, userId }) {
  const row = db.prepare(`
    SELECT id, kind, status, result_json, error, created_at, claimed_at, completed_at
    FROM worker_invocations
    WHERE id = ? AND user_id = ?
  `).get(id, userId);
  if (!row) return { ok: false, error: 'not found' };
  let result = null;
  if (row.status === 'done' && row.result_json) {
    try { result = JSON.parse(row.result_json); } catch {}
  }
  return {
    ok: true,
    invocationId: row.id,
    kind: row.kind,
    status: row.status,
    result,
    error: row.error,
    timeline: {
      created_at: row.created_at,
      claimed_at: row.claimed_at,
      completed_at: row.completed_at
    }
  };
}

module.exports = { invokeViaWorker, enqueueInvocation, getInvocationStatus, claimNextInvocation, completeInvocation };
