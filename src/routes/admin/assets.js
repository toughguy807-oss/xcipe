// /api/admin/assets — 자산 동기화 (asset-sync) 관리 API
//   S1: read-only 매니페스트 조회 + 재스캔 트리거 + 단건 상세 + 감사로그
//   S2 예정: pull, sync, approve, reject, rollback, lock release
//
//   에러 코드: ESYS-ASS-XXX

const router = require('express').Router();
const { authMiddleware, requireRole } = require('../../auth');
const { db } = require('../../db');
const sync = require('../../engine/asset-sync');
const fs = require('fs');
const path = require('path');

router.use(authMiddleware);
router.use(requireRole('admin'));

// GET /api/admin/assets/summary — 카테고리/상태 카운트 + 정책 헬스
router.get('/summary', (req, res) => {
  const s = sync.summary({ db });
  let category_health = [];
  try {
    category_health = sync.getCategoryHealth({ db });
  } catch (e) {
    // MASTER 스캔 실패 (MASTER_ROOT 미존재 등) — health 비워도 summary 자체는 제공
    category_health = [];
  }
  res.json({ ...s, category_health });
});

// GET /api/admin/assets/category-health — 카테고리별 MASTER 추적 정책 상태
router.get('/category-health', (req, res) => {
  res.json({ ok: true, items: sync.getCategoryHealth({ db }) });
});

// GET /api/admin/assets/manifest?category=skills&status=synced&q=plan&limit=500
router.get('/manifest', (req, res) => {
  const category = (req.query.category || '').trim() || null;
  const status = (req.query.status || '').trim() || null;
  const q = (req.query.q || '').trim() || null;
  const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit, 10) || 500));

  const rows = sync.listManifest({ db, category, status, q, limit });
  res.json({
    total: rows.length,
    filter: { category, status, q, limit },
    items: rows
  });
});

// POST /api/admin/assets/rebuild — 매니페스트 재스캔 (RUNTIME 변경 캡처)
router.post('/rebuild', (req, res) => {
  try {
    const r = sync.rebuildManifest({ db, actor: req.user.email });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-001', message: e.message });
  }
});

// POST /api/admin/assets/pull — RUNTIME 재스캔 + MASTER 합집합 비교 + status 갱신
router.post('/pull', (req, res) => {
  try {
    const r = sync.diffWithMaster({ db, actor: req.user.email });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-010', message: e.message });
  }
});

// POST /api/admin/assets/sync — auto-eligible (behind/patch+minor) 일괄 sync, 또는 path 단건
//   body: { path?: string }   // 없으면 전체 auto-eligible
router.post('/sync', (req, res) => {
  const { path: assetPath = null } = req.body || {};
  const lock = sync.acquireLock({ db, scope: 'global', holder: req.user.email });
  if (!lock.ok) return res.status(409).json({ error: 'ESYS-ASS-011', message: 'lock 획득 실패', held_by: lock.held_by, expires_at: lock.expires_at });

  try {
    let targets;
    if (assetPath) {
      const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
      if (!row) return res.status(404).json({ error: 'ESYS-ASS-012', message: 'not found' });
      if (row.status !== 'behind' && row.pending_action !== 'promote') {
        return res.status(400).json({ error: 'ESYS-ASS-013', message: `auto-sync 불가 — status=${row.status}, action=${row.pending_action || '-'}` });
      }
      targets = [row];
    } else {
      targets = db.prepare(`SELECT * FROM asset_manifest WHERE status = 'behind' AND pending_action = 'promote'`).all();
    }

    const results = [];
    for (const t of targets) {
      try {
        const r = sync.applySync({ db, path: t.path, actor: req.user.email });
        results.push({ ...r, ok: true });
      } catch (e) {
        results.push({ path: t.path, ok: false, error: e.message });
      }
    }
    res.json({ ok: true, total: targets.length, results });
  } finally {
    sync.releaseLock({ db, scope: 'global', holder: req.user.email });
  }
});

// POST /api/admin/assets/approve — major/new/orphan/divergent 승인 후 적용
//   body: { path: string }
router.post('/approve', (req, res) => {
  const { path: assetPath } = req.body || {};
  if (!assetPath) return res.status(400).json({ error: 'ESYS-ASS-020', message: 'path 필수' });
  const lock = sync.acquireLock({ db, scope: 'global', holder: req.user.email });
  if (!lock.ok) return res.status(409).json({ error: 'ESYS-ASS-021', message: 'lock 획득 실패', held_by: lock.held_by, expires_at: lock.expires_at });

  try {
    const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
    if (!row) return res.status(404).json({ error: 'ESYS-ASS-022', message: 'not found' });

    let result;
    if (row.status === 'orphan' || row.pending_action === 'delete') {
      result = sync.applyOrphanDelete({ db, path: assetPath, actor: req.user.email });
    } else if (['new', 'pending_approval', 'divergent'].includes(row.status) || ['add', 'promote', 'promote_major'].includes(row.pending_action)) {
      result = sync.applySync({ db, path: assetPath, actor: req.user.email });
    } else {
      return res.status(400).json({ error: 'ESYS-ASS-023', message: `승인 대상 아님 — status=${row.status}` });
    }

    db.prepare(`UPDATE asset_manifest SET approved_by = ?, approved_at = datetime('now') WHERE path = ?`)
      .run(req.user.email, assetPath);
    db.prepare(`INSERT INTO asset_audit_log (actor, action, path, meta) VALUES (?, 'approve_major', ?, ?)`)
      .run(req.user.email, assetPath, JSON.stringify({ prev_status: row.status, prev_action: row.pending_action }));

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-024', message: e.message });
  } finally {
    sync.releaseLock({ db, scope: 'global', holder: req.user.email });
  }
});

// POST /api/admin/assets/reject — 승인 거부 (pending_* 해제만, 디스크 미변경)
//   body: { path: string, reason?: string }
router.post('/reject', (req, res) => {
  const { path: assetPath, reason = '' } = req.body || {};
  if (!assetPath) return res.status(400).json({ error: 'ESYS-ASS-030', message: 'path 필수' });

  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
  if (!row) return res.status(404).json({ error: 'ESYS-ASS-031', message: 'not found' });

  // pending 해제 — status 는 그대로 두되 (다음 pull 시 재계산), pending_action/diff 제거
  db.prepare(`UPDATE asset_manifest SET pending_action = NULL, pending_diff = NULL, updated_at = datetime('now') WHERE path = ?`)
    .run(assetPath);
  db.prepare(`INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
              VALUES (?, 'reject', ?, ?, ?, ?, ?, ?)`)
    .run(req.user.email, assetPath, row.sha256, row.master_sha, row.version, row.master_version,
      JSON.stringify({ reason, prev_action: row.pending_action }));
  res.json({ ok: true });
});

// POST /api/admin/assets/rollback — audit/manifest 의 과거 SHA 본문(snapshot)으로 디스크 복원
//   body: { path: string, target_sha: string }
router.post('/rollback', (req, res) => {
  const { path: assetPath, target_sha } = req.body || {};
  if (!assetPath) return res.status(400).json({ error: 'ESYS-ASS-050', message: 'path 필수' });
  if (!target_sha) return res.status(400).json({ error: 'ESYS-ASS-051', message: 'target_sha 필수' });
  if (!sync.hasSnapshot(target_sha)) {
    return res.status(404).json({ error: 'ESYS-ASS-052', message: '스냅샷 없음 — 이 시점 이전 자산은 rollback 불가' });
  }
  const lock = sync.acquireLock({ db, scope: 'global', holder: req.user.email });
  if (!lock.ok) return res.status(409).json({ error: 'ESYS-ASS-053', message: 'lock 획득 실패', held_by: lock.held_by, expires_at: lock.expires_at });
  try {
    const r = sync.rollback({ db, path: assetPath, target_sha, actor: req.user.email });
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-054', message: e.message });
  } finally {
    sync.releaseLock({ db, scope: 'global', holder: req.user.email });
  }
});

// GET /api/admin/assets/snapshot-status?path=<x> — audit 의 각 SHA 별 스냅샷 보유 여부
router.get('/snapshot-status', (req, res) => {
  const p = (req.query.path || '').trim();
  if (!p) return res.status(400).json({ error: 'ESYS-ASS-055', message: 'path 필수' });
  const audit = db.prepare(`
    SELECT id, ts, action, before_sha, after_sha, before_ver, after_ver
    FROM asset_audit_log WHERE path = ? ORDER BY id DESC LIMIT 50
  `).all(p);
  const items = audit.map(a => ({
    ...a,
    before_snapshot: sync.hasSnapshot(a.before_sha),
    after_snapshot: sync.hasSnapshot(a.after_sha)
  }));
  res.json({ total: items.length, items });
});

// GET /api/admin/assets/diff?path=<x> — RUNTIME vs MASTER 본문 동시 반환 (front diff viewer 입력)
router.get('/diff', (req, res) => {
  const p = (req.query.path || '').trim();
  if (!p) return res.status(400).json({ error: 'ESYS-ASS-040', message: 'path 필수' });
  try {
    const r = sync.readBothSides({ db, path: p });
    res.json({ ok: true, path: p, ...r });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-041', message: e.message });
  }
});

// GET /api/admin/assets/scheduler-status — auto-pull 스케줄러 현황
router.get('/scheduler-status', (req, res) => {
  res.json({ ok: true, status: sync.getSchedulerStatus() });
});

// GET /api/admin/assets/alerts?only_unread=1&limit=50 — auto_pull_alert 목록
//   meta.acked = true 인 항목은 read, 아니면 unread
router.get('/alerts', (req, res) => {
  const onlyUnread = req.query.only_unread === '1';
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const where = onlyUnread
    ? `WHERE action = 'auto_pull_alert' AND (json_extract(meta, '$.acked') IS NULL OR json_extract(meta, '$.acked') = 0)`
    : `WHERE action = 'auto_pull_alert'`;
  const rows = db.prepare(`
    SELECT id, ts, meta FROM asset_audit_log ${where}
    ORDER BY id DESC LIMIT ?
  `).all(limit);
  const items = rows.map(r => {
    let m = {};
    try { m = JSON.parse(r.meta || '{}'); } catch { /* swallow */ }
    return {
      id: r.id, ts: r.ts,
      counts: m.counts || null,
      changed: m.changed || [],
      acked: m.acked === true,
      acked_by: m.acked_by || null,
      acked_at: m.acked_at || null
    };
  });
  const unreadCount = db.prepare(`
    SELECT COUNT(*) as c FROM asset_audit_log
    WHERE action = 'auto_pull_alert' AND (json_extract(meta, '$.acked') IS NULL OR json_extract(meta, '$.acked') = 0)
  `).get().c;
  res.json({ total: items.length, unread: unreadCount, items });
});

// POST /api/admin/assets/alerts/ack — body: { id?, all?: true } 알림 확인 처리
router.post('/alerts/ack', (req, res) => {
  const { id = null, all = false } = req.body || {};
  if (!id && !all) return res.status(400).json({ error: 'ESYS-ASS-070', message: 'id 또는 all 필수' });

  const ackedAt = new Date().toISOString();
  const ackedBy = req.user.email;

  const targets = all
    ? db.prepare(`SELECT id, meta FROM asset_audit_log WHERE action = 'auto_pull_alert' AND (json_extract(meta, '$.acked') IS NULL OR json_extract(meta, '$.acked') = 0)`).all()
    : db.prepare(`SELECT id, meta FROM asset_audit_log WHERE id = ? AND action = 'auto_pull_alert'`).all(id);

  if (!targets.length) return res.status(404).json({ error: 'ESYS-ASS-071', message: '대상 없음' });

  let updated = 0;
  for (const t of targets) {
    let m = {};
    try { m = JSON.parse(t.meta || '{}'); } catch { /* swallow */ }
    m.acked = true;
    m.acked_by = ackedBy;
    m.acked_at = ackedAt;
    db.prepare(`UPDATE asset_audit_log SET meta = ? WHERE id = ?`).run(JSON.stringify(m), t.id);
    updated++;
  }
  res.json({ ok: true, acked: updated });
});

// GET /api/admin/assets/lock — 현재 lock 상태
router.get('/lock', (req, res) => {
  res.json({ lock: sync.getLock({ db, scope: 'global' }) || null });
});

// POST /api/admin/assets/lock/release — 강제 해제
router.post('/lock/release', (req, res) => {
  const r = sync.releaseLock({ db, scope: 'global', holder: req.user.email, force: true });
  res.json(r);
});

// GET /api/admin/assets/detail?path=<path> — 단일 자산 상세 + 본문 미리보기
router.get('/detail', (req, res) => {
  const p = (req.query.path || '').trim();
  if (!p) return res.status(400).json({ error: 'ESYS-ASS-002', message: 'path 필수' });

  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(p);
  if (!row) return res.status(404).json({ error: 'ESYS-ASS-003', message: 'not found' });

  // 디스크 본문 (안전 경로 검증)
  let preview = null;
  let preview_full = null;
  try {
    const full = resolveRuntimePath(row);
    if (full && fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      preview = content.slice(0, 2000);
      preview_full = content.length;
    }
  } catch (e) { /* swallow — preview는 부가정보 */ }

  // 최근 감사 로그 10건
  const audit = db.prepare(`
    SELECT id, ts, actor, action, before_sha, after_sha, before_ver, after_ver, meta
    FROM asset_audit_log WHERE path = ? ORDER BY id DESC LIMIT 10
  `).all(p);

  res.json({
    item: row,
    preview,
    preview_total_size: preview_full,
    audit_recent: audit
  });
});

// GET /api/admin/assets/audit?path=<x>&action=<y>&limit=50 — 감사 로그
router.get('/audit', (req, res) => {
  const p = (req.query.path || '').trim() || null;
  const action = (req.query.action || '').trim() || null;
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const conds = [];
  const args = [];
  if (p)      { conds.push('path = ?'); args.push(p); }
  if (action) { conds.push('action = ?'); args.push(action); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT id, ts, actor, action, path, before_sha, after_sha, before_ver, after_ver, meta
    FROM asset_audit_log
    ${where}
    ORDER BY id DESC LIMIT ?
  `).all(...args, limit);

  res.json({ total: rows.length, items: rows });
});

// ──────── 클라이언트 API 키 관리 (S7) ────────
// GET    /client-keys            — 발급된 키 목록 (key_hash 만, 평문 노출 X)
// POST   /client-keys            — body: { name } → 신규 키 발급 (평문은 응답 1회만 반환)
// DELETE /client-keys/:id        — 키 폐기 (revoked_at 설정)

const crypto = require('crypto');

router.get('/client-keys', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, created_by, created_at, last_used_at, last_used_ip, revoked_at,
           substr(key_hash, 1, 8) as hash_preview
    FROM asset_client_keys ORDER BY id DESC
  `).all();
  res.json({ total: rows.length, items: rows });
});

router.post('/client-keys', (req, res) => {
  const name = ((req.body && req.body.name) || '').trim();
  if (!name) return res.status(400).json({ error: 'ESYS-ASS-060', message: 'name 필수' });
  if (name.length > 100) return res.status(400).json({ error: 'ESYS-ASS-061', message: 'name 100자 이하' });

  // 평문 키 = 32 bytes hex (64 chars)
  const plaintext = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex');
  try {
    const r = db.prepare(`
      INSERT INTO asset_client_keys (key_hash, name, created_by) VALUES (?, ?, ?)
    `).run(keyHash, name, req.user.email);
    res.json({
      ok: true,
      id: r.lastInsertRowid,
      name,
      api_key: plaintext,            // ⚠ 1회만 노출 — 사용자에게 즉시 저장 권고
      hash_preview: keyHash.slice(0, 8),
      warning: '이 키는 다시 표시되지 않습니다. 즉시 안전한 곳에 저장하세요.'
    });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-ASS-062', message: e.message });
  }
});

router.delete('/client-keys/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ESYS-ASS-063', message: 'id 필수' });
  const r = db.prepare(`UPDATE asset_client_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL`).run(id);
  if (r.changes === 0) return res.status(404).json({ error: 'ESYS-ASS-064', message: '키 없음 또는 이미 폐기' });
  res.json({ ok: true, revoked_id: id });
});

// 안전한 RUNTIME 경로 해석 — manifest path → 실제 파일경로
//   ~/.claude 외부 접근 차단, .. 시퀀스 차단
function resolveRuntimePath(row) {
  if (row.category === 'claude-md') return path.join(sync.RUNTIME_ROOT, 'CLAUDE.md');
  if (row.category === 'rules') {
    const sub = row.path.replace(/^rules\//, '');
    if (sub.includes('..')) return null;
    return path.join(sync.RUNTIME_ROOT, 'lib', 'rules', sub);
  }
  const prefix = row.category + '/';
  if (!row.path.startsWith(prefix)) return null;
  const sub = row.path.slice(prefix.length);
  if (sub.includes('..')) return null;
  return path.join(sync.RUNTIME_ROOT, row.category, sub);
}

module.exports = router;
