// 분산 워커 인증 — 사용자 PC daemon 이 본인 OAuth 로 파이프라인 실행 (v25)
//
//   헤더: X-Worker-Token: <users.worker_token> (admin 발급, 32바이트 hex)
//   매치 시 req.workerUser = { id, email, name, role } 세팅
//   미매치/누락/비활성 사용자 → 401
//
// 사용 패턴:
//   const { requireWorkerAuth } = require('../middleware/worker-auth');
//   router.post('/jobs/claim', requireWorkerAuth, (req, res) => {
//     // req.workerUser.id 로 본인 작업만 claim
//   });

const { db } = require('../db');

// worker_token 형식 검증 — 32바이트 hex (64 chars), admin 발급 시 동일 포맷 강제
//   UUID v4 (36 chars)보다 엔트로피 큼. crypto.randomBytes(32).toString('hex')
const TOKEN_RE = /^[a-f0-9]{64}$/i;

function requireWorkerAuth(req, res, next) {
  const token = req.headers['x-worker-token'] || req.get && req.get('X-Worker-Token');
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ error: 'ESYS-WRK-001', message: 'X-Worker-Token 헤더 필요' });
  }
  if (!TOKEN_RE.test(token)) {
    return res.status(401).json({ error: 'ESYS-WRK-002', message: '워커 토큰 형식 오류 (32바이트 hex 필요)' });
  }

  try {
    const row = db.prepare(`
      SELECT id, email, name, role
      FROM users
      WHERE worker_token = ? AND deleted_at IS NULL
    `).get(token);

    if (!row) {
      return res.status(401).json({ error: 'ESYS-WRK-003', message: '유효하지 않은 워커 토큰' });
    }

    req.workerUser = row;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'ESYS-WRK-500', message: '인증 처리 실패', detail: err.message });
  }
}

module.exports = { requireWorkerAuth, TOKEN_RE };
