// /api/design-systems — 프로젝트 디자인 시스템(DS) CRUD
//   DS 한 건 = baseline.json (필수) + tokens.css (선택). KDS, Material3, custom 등.
//
//   admin: 등록/수정/삭제
//   인증된 사용자: 조회
//
//   에러 코드: ESYS-DS-XXX

const router = require('express').Router();
const { authMiddleware, requireRole } = require('../auth');
const { db } = require('../db');

router.use(authMiddleware);

// 슬러그 검증 — kebab-case, 영숫자/하이픈만
function validSlug(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-]{1,49}$/.test(s);
}

// baseline_json 파싱 시도 — 통계 추출용
function extractStats(baselineJson) {
  try {
    const b = JSON.parse(baselineJson);
    return JSON.stringify({
      total: b.stats && b.stats.total || null,
      version: b.version || null,
      source: b.source || null,
      font_family: b.font_family || null,
      breakpoints: b.breakpoints ? Object.keys(b.breakpoints) : null,
      keys: Object.keys(b.stats || {})
    });
  } catch { return null; }
}

// GET /api/design-systems — 목록
router.get('/', (req, res) => {
  // ISOLATION: shared-readonly — 모든 인증 사용자가 read 가능한 공유 디자인 시스템 카탈로그
  const rows = db.prepare(`
    SELECT id, name, slug, version, source, stats, created_by, created_at, updated_at,
           length(baseline_json) as baseline_size,
           CASE WHEN tokens_css IS NOT NULL THEN length(tokens_css) ELSE 0 END as css_size
    FROM project_design_systems
    ORDER BY id DESC
  `).all();
  res.json({ total: rows.length, items: rows });
});

// GET /api/design-systems/:id — 단건 (baseline_json + tokens_css 본문 포함)
router.get('/:id', (req, res) => {
  // ISOLATION: shared-readonly
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`SELECT * FROM project_design_systems WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'ESYS-DS-001', message: '없음' });
  // 사용 중인 프로젝트 카운트
  const usage = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE design_system_id = ? AND deleted_at IS NULL`).get(id);
  res.json({ ...row, usage_count: usage.c });
});

// POST /api/design-systems — 등록 (admin)
router.post('/', requireRole('admin'), (req, res) => {
  const {
    name, slug, version = null, source = null,
    baseline_json, tokens_css = null
  } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: 'ESYS-DS-010', message: 'name 필수' });
  if (!validSlug(slug)) return res.status(400).json({ error: 'ESYS-DS-011', message: 'slug 형식 오류 — kebab-case, 2-50자' });
  if (!baseline_json) return res.status(400).json({ error: 'ESYS-DS-012', message: 'baseline_json 필수' });
  // baseline_json JSON 유효성
  try { JSON.parse(baseline_json); }
  catch (e) { return res.status(400).json({ error: 'ESYS-DS-013', message: 'baseline_json 이 유효한 JSON 아님: ' + e.message }); }

  // 크기 가드 (5MB)
  if (baseline_json.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'ESYS-DS-014', message: 'baseline_json 5MB 초과' });
  if (tokens_css && tokens_css.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'ESYS-DS-015', message: 'tokens_css 2MB 초과' });

  const stats = extractStats(baseline_json);
  try {
    const r = db.prepare(`
      INSERT INTO project_design_systems (name, slug, version, source, baseline_json, tokens_css, stats, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), slug, version, source, baseline_json, tokens_css, stats, req.user.email);
    res.json({ ok: true, id: r.lastInsertRowid });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'ESYS-DS-016', message: 'slug 중복' });
    res.status(500).json({ error: 'ESYS-DS-017', message: e.message });
  }
});

// PUT /api/design-systems/:id — 수정 (admin)
router.put('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cur = db.prepare(`SELECT id FROM project_design_systems WHERE id = ?`).get(id);
  if (!cur) return res.status(404).json({ error: 'ESYS-DS-020', message: '없음' });

  const { name, version, source, baseline_json, tokens_css, figma_file_key, figma_node_id } = req.body || {};
  const fields = [];
  const args = [];

  if (name !== undefined) { fields.push('name = ?'); args.push(String(name).trim()); }
  if (version !== undefined) { fields.push('version = ?'); args.push(version); }
  if (source !== undefined) { fields.push('source = ?'); args.push(source); }
  if (baseline_json !== undefined) {
    try { JSON.parse(baseline_json); }
    catch (e) { return res.status(400).json({ error: 'ESYS-DS-021', message: 'baseline_json invalid JSON' }); }
    if (baseline_json.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'ESYS-DS-022', message: 'baseline 5MB 초과' });
    fields.push('baseline_json = ?'); args.push(baseline_json);
    fields.push('stats = ?'); args.push(extractStats(baseline_json));
  }
  if (tokens_css !== undefined) {
    if (tokens_css && tokens_css.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'ESYS-DS-023', message: 'css 2MB 초과' });
    fields.push('tokens_css = ?'); args.push(tokens_css);
  }
  if (figma_file_key !== undefined) { fields.push('figma_file_key = ?'); args.push(figma_file_key || null); }
  if (figma_node_id !== undefined)  { fields.push('figma_node_id = ?');  args.push(figma_node_id || null); }
  if (!fields.length) return res.status(400).json({ error: 'ESYS-DS-024', message: '수정 필드 없음' });

  fields.push("updated_at = datetime('now')");
  args.push(id);
  db.prepare(`UPDATE project_design_systems SET ${fields.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true, id });
});

// DELETE /api/design-systems/:id — 삭제 (admin)
//   사용 중 프로젝트가 있으면 차단 — 먼저 unlink 필요
router.delete('/:id', requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const usage = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE design_system_id = ? AND deleted_at IS NULL`).get(id);
  if (usage.c > 0) return res.status(409).json({ error: 'ESYS-DS-030', message: `${usage.c}개 프로젝트가 사용 중 — 먼저 unlink` });

  const r = db.prepare(`DELETE FROM project_design_systems WHERE id = ?`).run(id);
  if (r.changes === 0) return res.status(404).json({ error: 'ESYS-DS-031', message: '없음' });
  res.json({ ok: true, deleted: id });
});

// GET /api/design-systems/:id/tokens.css — 다운로드
router.get('/:id/tokens.css', (req, res) => {
  // ISOLATION: shared-readonly
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`SELECT slug, tokens_css FROM project_design_systems WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'ESYS-DS-040', message: '없음' });
  if (!row.tokens_css) return res.status(404).json({ error: 'ESYS-DS-041', message: 'tokens_css 없음' });
  res.set('Content-Type', 'text/css; charset=UTF-8');
  res.set('Content-Disposition', `attachment; filename="${row.slug}-tokens.css"`);
  res.send(row.tokens_css);
});

// GET /api/design-systems/:id/baseline.json — 다운로드
router.get('/:id/baseline.json', (req, res) => {
  // ISOLATION: shared-readonly
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`SELECT slug, baseline_json FROM project_design_systems WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'ESYS-DS-050', message: '없음' });
  res.set('Content-Type', 'application/json; charset=UTF-8');
  res.set('Content-Disposition', `attachment; filename="${row.slug}-baseline.json"`);
  res.send(row.baseline_json);
});

// POST /api/design-systems/:id/sync/from-figma — Figma → DB pull (admin)
router.post('/:id/sync/from-figma', requireRole('admin'), async (req, res) => {
  try {
    const { pullFromFigma } = require('../engine/figma-sync');
    const r = await pullFromFigma({ designSystemId: parseInt(req.params.id, 10), actor: req.user.email });
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: 'ESYS-DS-060', message: err.message });
  }
});

// POST /api/design-systems/:id/sync/to-figma — DB → Figma push (admin, Enterprise+Beta 권한 필요)
router.post('/:id/sync/to-figma', requireRole('admin'), async (req, res) => {
  try {
    const { pushToFigma } = require('../engine/figma-sync');
    const r = await pushToFigma({ designSystemId: parseInt(req.params.id, 10), actor: req.user.email });
    // 권한 없어 실패한 경우도 200 + ok:false (의도된 graceful fail)
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: 'ESYS-DS-061', message: err.message });
  }
});

// GET /api/design-systems/:id/sync/status — 마지막 sync 상태 + 환경 점검
router.get('/:id/sync/status', requireRole('admin'), (req, res) => {
  const row = db.prepare(`
    SELECT id, name, figma_file_key, figma_node_id, last_synced_at, last_sync_direction, sync_meta
    FROM project_design_systems WHERE id = ?
  `).get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'ESYS-DS-062', message: '없음' });
  const { getAccessToken } = require('../engine/figma-sync');
  res.json({
    ...row,
    sync_meta: row.sync_meta ? JSON.parse(row.sync_meta) : null,
    figma_token_set: !!getAccessToken()
  });
});

module.exports = router;
