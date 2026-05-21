// KDS Figma Plugin Bridge — figma-change-tracker 플러그인의 호환 endpoint
//
// KDS 플러그인은 BRIDGE 상수(http://localhost:3939 또는 사본 수정 시 :3747/bridge)로
//   GET  /health           — 연결 확인
//   GET  /design           — Claude(xcipe)에서 가져갈 디자인 JSON
//   POST /export           — 디자이너 변경 로그 수신 (changeLog 배열)
//   GET  /preview-assets/* — 디자이너가 이미지 fill 적용 시 사용할 자산
//
// 인증: X-Plugin-Token 헤더 (settings.figma_plugin_token 또는 ENV FIGMA_PLUGIN_TOKEN)
//   /health 는 인증 면제 (플러그인 polling 용)

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { db, addMessage, logActivity, logError, getSetting } = require('../db');
const { OUTPUT_ROOT } = require('../engine/pipeline/artifact-saver');
const { convertHtmlToFigmaSpec } = require('../engine/figma/html-to-figma-spec');

// /bridge/design 변환 결과 인메모리 캐시 — artifact 의 mtime 이 동일하면 재사용
//   key: artifact.id, value: { mtime, viewport, payload }
const designCache = new Map();
const DESIGN_CACHE_MAX = 32;
function cacheGet(aid, mtime, viewport) {
  const v = designCache.get(aid);
  if (!v) return null;
  if (v.mtime !== mtime || v.viewport !== viewport) return null;
  return v.payload;
}
function cacheSet(aid, mtime, viewport, payload) {
  if (designCache.size >= DESIGN_CACHE_MAX) {
    const firstKey = designCache.keys().next().value;
    designCache.delete(firstKey);
  }
  designCache.set(aid, { mtime, viewport, payload });
}

// 모든 응답에 CORS 허용 — Figma 플러그인은 file:// 또는 figma.com origin
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Plugin-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function checkPluginToken(req) {
  const expected = getSetting('figma_plugin_token') || process.env.FIGMA_PLUGIN_TOKEN;
  if (!expected) return { ok: true, devOpen: true }; // 토큰 미설정이면 dev 모드로 개방
  const got = req.headers['x-plugin-token'];
  if (got !== expected) return { ok: false };
  return { ok: true };
}

// GET /bridge/health — 연결 확인 (인증 면제)
router.get('/health', (req, res) => {
  res.json({ ok: true, bridge: 'xcipe', version: 'v1', time: new Date().toISOString() });
});

// GET /bridge/design — KDS 플러그인 "Claude에서 불러오기" 가 호출
//   xcipe FINAL/MARKUP HTML 을 Playwright 로 렌더 → KDS createNodeFromSpec spec 트리로 변환.
//   디자이너가 Figma 안에 그대로 노드 트리를 import 받음.
//
//   query:
//     projectCode | projectId  — 미지정 시 최근 업데이트 프로젝트 1개
//     artifactId               — 특정 artifact 지정 (없으면 FINAL → MARKUP 우선)
//     viewport=PC|MO|TABLET    — 기본 PC
//
//   응답: {
//     design: { screens: [<KDS spec>] },   ← KDS importDesign() 이 그대로 사용
//     project: { id, code, name },
//     source_artifact: { id, type, file_name },
//     stats: { nodeCount, maxDepth, viewport, truncated },
//     generated_at
//   }
router.get('/design', async (req, res) => {
  const auth = checkPluginToken(req);
  if (!auth.ok) return res.status(401).json({ error: 'invalid plugin token' });

  const projectCode = req.query.projectCode;
  const projectId = req.query.projectId;
  const artifactIdParam = req.query.artifactId ? parseInt(req.query.artifactId, 10) : null;
  const viewport = ['PC', 'MO', 'TABLET'].includes(req.query.viewport) ? req.query.viewport : 'PC';

  let project;
  if (projectId) {
    project = db.prepare('SELECT id, code, name, design_system_id FROM projects WHERE id = ? AND deleted_at IS NULL').get(parseInt(projectId, 10));
  } else if (projectCode) {
    project = db.prepare('SELECT id, code, name, design_system_id FROM projects WHERE code = ? AND deleted_at IS NULL').get(projectCode);
  } else {
    project = db.prepare('SELECT id, code, name, design_system_id FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1').get();
  }
  if (!project) return res.status(404).json({ error: 'project not found' });

  // 원본 artifact 선택 — artifactId 명시 시 우선, 아니면 FINAL → MARKUP 자식 HTML → MARKUP 메인 순
  let art;
  if (artifactIdParam) {
    art = db.prepare(`
      SELECT id, type, file_name, file_path, mime_type FROM artifacts
      WHERE id = ? AND project_id = ?
    `).get(artifactIdParam, project.id);
  } else {
    // 1) FINAL 메인 (final-builder 가 만든 index.html)
    art = db.prepare(`
      SELECT id, type, file_name, file_path, mime_type FROM artifacts
      WHERE project_id = ? AND type = 'FINAL' AND parent_artifact_id IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(project.id);
    // 2) MARKUP 의 .html 자식 또는 메인
    if (!art) {
      art = db.prepare(`
        SELECT id, type, file_name, file_path, mime_type FROM artifacts
        WHERE project_id = ? AND type = 'MARKUP' AND file_name LIKE '%.html'
        ORDER BY parent_artifact_id IS NULL DESC, id DESC LIMIT 1
      `).get(project.id);
    }
  }

  if (!art) return res.status(404).json({ error: 'no html artifact (FINAL/MARKUP) found for project' });
  if (!fs.existsSync(art.file_path)) {
    return res.status(404).json({ error: 'artifact file missing on disk', file_path: art.file_path });
  }

  // 캐시 확인 — file mtime 기준
  let mtime;
  try { mtime = fs.statSync(art.file_path).mtimeMs; } catch (_) { mtime = 0; }
  const cached = cacheGet(art.id, mtime, viewport);
  if (cached) {
    res.setHeader('X-Bridge-Cache', 'HIT');
    return res.json(cached);
  }

  // 변환 (Playwright 렌더 — 1~5초 소요)
  let convResult;
  try {
    convResult = await convertHtmlToFigmaSpec({
      htmlPath: art.file_path,
      viewport,
      name: `${project.code} (${art.type})`,
      designSystemId: project.design_system_id || null,
      outputRoot: OUTPUT_ROOT,
      assetUrlBase: '/bridge/preview-assets'
    });
  } catch (e) {
    console.warn('[bridge/design] 변환 실패:', e.message);
    try { logError({ source: 'bridge', code: 'BRIDGE-DESIGN-001', message: e.message, stack: e.stack, context: { artifactId: art.id, projectId: project.id } }); } catch (_) {}
    return res.status(500).json({ error: 'html→spec conversion failed', detail: e.message });
  }

  const payload = {
    design: { screens: convResult.screens },
    project: { id: project.id, code: project.code, name: project.name },
    source_artifact: { id: art.id, type: art.type, file_name: art.file_name },
    stats: convResult.stats,
    generated_at: new Date().toISOString()
  };

  cacheSet(art.id, mtime, viewport, payload);
  try { logActivity('figma', null, 'bridge_design', `project=${project.code} artifact=${art.id} nodes=${convResult.stats.nodeCount}${convResult.stats.truncated ? ' (truncated)' : ''}`, null); } catch (_) {}
  res.setHeader('X-Bridge-Cache', 'MISS');
  res.json(payload);
});

// POST /bridge/export — 디자이너 변경 로그 수신 + 프로젝트 채팅에 기록
//   body: { exportedAt, fileKey, fileName, totalChanges, changes }  (KDS 플러그인 buildExportData 형식)
router.post('/export', (req, res) => {
  const auth = checkPluginToken(req);
  if (!auth.ok) return res.status(401).json({ error: 'invalid plugin token' });

  const payload = req.body || {};
  const { fileKey, fileName, totalChanges, changes, exportedAt } = payload;
  if (!Array.isArray(changes)) {
    return res.status(400).json({ error: 'changes[] required' });
  }

  // file_key 매칭 프로젝트 찾기 — projects.figma_file_key 또는 project_design_systems.figma_file_key
  let projects = [];
  if (fileKey) {
    try {
      projects = db.prepare(`
        SELECT p.id, p.code, p.name FROM projects p
        LEFT JOIN project_design_systems ds ON ds.id = p.design_system_id
        WHERE (p.figma_file_key = ? OR ds.figma_file_key = ?) AND p.deleted_at IS NULL
      `).all(fileKey, fileKey);
    } catch { /* column 없으면 무시 */ }
  }
  // 매칭 없으면 query.projectId fallback
  if (projects.length === 0 && req.query.projectId) {
    const p = db.prepare('SELECT id, code, name FROM projects WHERE id = ? AND deleted_at IS NULL').get(parseInt(req.query.projectId, 10));
    if (p) projects = [p];
  }

  // export.json 으로 저장 — output/{code}/figma-exports/{timestamp}.json
  const savedPaths = [];
  for (const p of projects) {
    try {
      const dir = path.join(OUTPUT_ROOT, p.code, 'figma-exports');
      fs.mkdirSync(dir, { recursive: true });
      const fname = `export-${(exportedAt || new Date().toISOString()).replace(/[:.]/g, '-')}.json`;
      const fpath = path.join(dir, fname);
      fs.writeFileSync(fpath, JSON.stringify(payload, null, 2), 'utf-8');
      savedPaths.push(fpath);
      // 채팅에 알림 — 변경 N건 수신
      addMessage({
        projectId: p.id, role: 'assistant', kind: 'status',
        content: `Figma 측 변경 수신 (file=${fileName || fileKey}, ${totalChanges || changes.length}건). 저장: figma-exports/${fname}`
      });
    } catch (e) {
      console.warn('[bridge/export] 저장 실패:', e.message);
    }
  }

  logActivity('figma', null, 'bridge_export', `file=${fileKey} changes=${changes.length} projects=${projects.length}`, null);
  res.json({ ok: true, saved: savedPaths.length, matched_projects: projects.map(p => p.code), saved_paths: savedPaths });
});

// GET /bridge/preview-assets/* — 디자이너가 이미지 fill 적용할 자산 서빙
//   xcipe output/ 폴더 안 이미지를 KDS 플러그인이 fetch 할 수 있게 노출
router.get('/preview-assets/*', (req, res) => {
  const auth = checkPluginToken(req);
  if (!auth.ok) return res.status(401).json({ error: 'invalid plugin token' });

  const requested = (req.params[0] || '').replace(/\\/g, '/');
  const safe = path.resolve(OUTPUT_ROOT, requested);
  if (!safe.startsWith(path.resolve(OUTPUT_ROOT) + path.sep)) {
    return res.status(403).json({ error: 'path traversal blocked' });
  }
  if (!fs.existsSync(safe)) return res.status(404).json({ error: 'not found' });

  const ext = path.extname(safe).toLowerCase();
  const mimes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  res.setHeader('Content-Type', mimes[ext] || 'application/octet-stream');
  res.sendFile(safe);
});

// POST /bridge/kds-demo — KDS v4 원본 시스템과 100% 호환되는 시연 화면을
//   사용자가 다운받은 KDS 폴더의 to-figma/ 에 떨궈서, KDS 원본 플러그인(3939)
//   이 그대로 fetch 하게 한다. chokidar 가 자동 감지 → /designs 응답에 즉시 추가.
//
//   body: { name?: string }                — seed/kds-demo/<name>.{html,figma.json} 파일 묶음.
//                                            기본 'button-catalog'
//   설정:
//     KDS_TO_FIGMA_DIR (env or settings)   — 대상 to-figma/ 경로. 기본값:
//                                            C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/.../to-figma
router.post('/kds-demo', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || 'button-catalog').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!name) return res.status(400).json({ error: 'invalid demo name' });

    const seedDir = path.join(__dirname, '..', '..', 'seed', 'kds-demo');
    const htmlSrc = path.join(seedDir, name + '.html');
    const specSrc = path.join(seedDir, name + '.figma.json');
    if (!fs.existsSync(htmlSrc) || !fs.existsSync(specSrc)) {
      return res.status(404).json({ error: 'seed not found', tried: [htmlSrc, specSrc] });
    }

    const target = getSetting('kds_to_figma_dir')
      || process.env.KDS_TO_FIGMA_DIR
      || 'C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/AX_KDS_design system-v4/to-figma';
    if (!fs.existsSync(target)) {
      return res.status(404).json({ error: 'KDS to-figma directory not found', target,
        hint: 'KDS v4 패키지가 다운받은 경로에 없거나 환경변수 KDS_TO_FIGMA_DIR 미설정' });
    }

    const htmlDst = path.join(target, name + '.html');
    const specDst = path.join(target, name + '.figma.json');
    fs.copyFileSync(htmlSrc, htmlDst);
    fs.copyFileSync(specSrc, specDst);

    return res.json({
      ok: true,
      deployed: [name + '.html', name + '.figma.json'],
      target,
      next: '디자이너가 Figma 에서 KDS 원본 플러그인(KDS Design Bridge) → "Claude에서 불러오기" 누르면 즉시 import 됩니다.'
    });
  } catch (e) {
    console.warn('[bridge/kds-demo] failed:', e.message);
    return res.status(500).json({ error: 'kds-demo deploy failed', detail: e.message });
  }
});

// GET /bridge/manifest — UI 임베드용 메타 (이 bridge 의 capability)
router.get('/manifest', (req, res) => {
  res.json({
    bridge: 'xcipe',
    version: 'v1',
    endpoints: [
      { method: 'GET',  path: '/bridge/health' },
      { method: 'GET',  path: '/bridge/design', params: ['projectCode|projectId'] },
      { method: 'POST', path: '/bridge/export' },
      { method: 'GET',  path: '/bridge/preview-assets/*' }
    ],
    auth: getSetting('figma_plugin_token') ? 'X-Plugin-Token' : 'open (dev)',
    kds_plugin_path: 'D:/SYS_v4/.claude/integrations/figma-change-tracker/'
  });
});

module.exports = router;
