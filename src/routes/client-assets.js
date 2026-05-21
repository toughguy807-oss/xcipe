// /api/client/assets — 외부 클라이언트(~/.claude 워크스테이션) 다운로드 API
//   인증: X-API-Key 헤더 (admin 이 발급한 asset_client_keys 의 평문)
//   엔드포인트:
//     GET  /manifest                 — synced 자산 목록 (path, sha256, version, size, category)
//     GET  /file?path=...&sha=...    — RUNTIME 디스크 본문 스트리밍 (sha 검증 옵션)
//
//   에러 코드: ESYS-CLI-XXX

const router = require('express').Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const sync = require('../engine/asset-sync');

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// 클라이언트 인증 미들웨어 — X-API-Key 헤더 sha256 매칭
function clientAuth(req, res, next) {
  const key = req.header('X-API-Key') || req.query.api_key || '';
  if (!key) return res.status(401).json({ error: 'ESYS-CLI-001', message: 'X-API-Key 누락' });

  const keyHash = sha256(Buffer.from(key, 'utf8'));
  const row = db.prepare(`
    SELECT id, name, revoked_at FROM asset_client_keys WHERE key_hash = ?
  `).get(keyHash);

  if (!row) return res.status(401).json({ error: 'ESYS-CLI-002', message: '유효하지 않은 키' });
  if (row.revoked_at) return res.status(403).json({ error: 'ESYS-CLI-003', message: '폐기된 키' });

  // last_used 기록
  db.prepare(`
    UPDATE asset_client_keys SET last_used_at = datetime('now'), last_used_ip = ? WHERE id = ?
  `).run(req.ip || '', row.id);

  req.client = { id: row.id, name: row.name };
  next();
}

router.use(clientAuth);

// manifest path → 디스크 경로 (admin-assets.js 의 resolveRuntimePath 미러)
function resolveRuntimePath(row) {
  const cat = row.category;
  if (cat === 'claude-md') return path.join(sync.RUNTIME_ROOT, 'CLAUDE.md');
  if (cat === 'rules') return path.join(sync.RUNTIME_ROOT, 'lib', 'rules', row.path.replace(/^rules\//, ''));
  return path.join(sync.RUNTIME_ROOT, cat, row.path.slice(cat.length + 1));
}

// GET /manifest — 클라이언트가 받아갈 자산 목록
//   기본은 status='synced' (서버가 master 와 일치하는 안정 상태)
//   ?include_pending=1 옵션으로 'behind'/'pending_approval' 도 포함 (디버깅용)
router.get('/manifest', (req, res) => {
  const includePending = req.query.include_pending === '1';
  const statuses = includePending
    ? ['synced', 'behind', 'pending_approval', 'divergent']
    : ['synced'];
  const placeholders = statuses.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT path, category, version, sha256, size, status
    FROM asset_manifest
    WHERE status IN (${placeholders})
    ORDER BY category, path
  `).all(...statuses);

  res.json({
    server_version: 'v4',
    generated_at: new Date().toISOString(),
    total: rows.length,
    items: rows
  });
});

// GET /file?path=...&sha=optional — 본문 스트리밍
router.get('/file', (req, res) => {
  const assetPath = (req.query.path || '').trim();
  const expectedSha = (req.query.sha || '').trim() || null;
  if (!assetPath) return res.status(400).json({ error: 'ESYS-CLI-010', message: 'path 필수' });

  const row = db.prepare('SELECT path, category, sha256, size, status FROM asset_manifest WHERE path = ?').get(assetPath);
  if (!row) return res.status(404).json({ error: 'ESYS-CLI-011', message: 'manifest 에 없음' });

  // 클라이언트는 synced 만 받게 — 불안정 상태는 차단
  if (row.status !== 'synced') {
    return res.status(409).json({ error: 'ESYS-CLI-012', message: `안정 상태 아님 — status=${row.status}` });
  }

  const diskFile = resolveRuntimePath(row);
  if (!fs.existsSync(diskFile)) {
    return res.status(404).json({ error: 'ESYS-CLI-013', message: '디스크 파일 없음' });
  }

  const buf = fs.readFileSync(diskFile);
  const actualSha = sha256(buf);

  // manifest sha 와 디스크 sha 가 다르면 stale — 재pull 권고
  if (actualSha !== row.sha256) {
    return res.status(409).json({
      error: 'ESYS-CLI-014',
      message: 'manifest sha != disk sha (stale) — 서버에서 /pull 후 재시도',
      manifest_sha: row.sha256,
      disk_sha: actualSha
    });
  }

  // 클라이언트가 기대하는 sha 가 있으면 일치 확인
  if (expectedSha && expectedSha !== actualSha) {
    return res.status(409).json({
      error: 'ESYS-CLI-015',
      message: '요청 sha 불일치',
      expected: expectedSha,
      actual: actualSha
    });
  }

  // audit — client_fetch 기록
  try {
    db.prepare(`
      INSERT INTO asset_audit_log (actor, action, path, after_sha, meta)
      VALUES (?, 'client_fetch', ?, ?, ?)
    `).run(`client:${req.client.name}`, assetPath, actualSha, JSON.stringify({
      ip: req.ip || '',
      size: buf.length
    }));
  } catch (e) { /* audit 실패는 다운로드 차단하지 않음 */ }

  res.set('Content-Type', 'text/plain; charset=UTF-8');
  res.set('X-Asset-SHA256', actualSha);
  res.set('X-Asset-Size', String(buf.length));
  res.set('X-Asset-Category', row.category);
  if (row.version) res.set('X-Asset-Version', row.version);
  res.send(buf);
});

module.exports = router;
