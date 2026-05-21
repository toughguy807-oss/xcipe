// 기존 산출물 폴더의 부속 파일을 artifacts 1급 레코드로 일괄 등록 (L4)
//   - 이미 등록된 메인 .md/.html/.css/.js 행은 그대로
//   - 그 외 모든 파일을 가장 가까운 메인 artifact 의 자식으로 INSERT
//   - 매핑: 폴더 prefix(knowledge/layout/ui/sb 등) → 같은 이름의 UPPERCASE type
//
// 사용: node scripts/backfill-sub-artifacts.js [projectCode]   (기본 KT_MVNO_LOGIN)

const fs = require('fs');
const path = require('path');
const { db } = require('../src/db');
const { OUTPUT_ROOT } = require('../src/engine/pipeline/artifact-saver');

const PROJECT_CODE = process.argv[2] || 'KT_MVNO_LOGIN';

function mimeOf(p) {
  const ext = (path.extname(p) || '').toLowerCase().replace(/^\./, '');
  const m = {
    html: 'text/html', htm: 'text/html', css: 'text/css',
    js: 'application/javascript', mjs: 'application/javascript',
    json: 'application/json', yaml: 'application/yaml', yml: 'application/yaml',
    md: 'text/markdown', txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif',
    pdf: 'application/pdf'
  };
  return m[ext] || 'application/octet-stream';
}

function roleOf(relPath) {
  const p = relPath.replace(/\\/g, '/').toLowerCase();
  if (/(^|\/)mockups?\//.test(p)) return 'mockup';
  if (/wireframes?\//.test(p)) return 'wireframe';
  if (/components?\//.test(p)) return 'component';
  if (/preview\.html?$/.test(p) || /\/preview\//.test(p)) return 'preview';
  if (/tokens?\.(json|css)$/.test(p)) return 'tokens';
  if (/aesthetic-contract\.ya?ml$/.test(p)) return 'aesthetic';
  if (/(^|\/)sb\/data\.json$|^data\.json$/.test(p)) return 'sb-data';
  if (/_sb_.*\.html?$/i.test(p) || /screen-blueprint.*\.html?$/i.test(p)) return 'sb-html';
  if (/_sb_.*\.pdf$/i.test(p) || /screen-blueprint.*\.pdf$/i.test(p)) return 'sb-pdf';
  if (/capture\.json$|targets\.json$|urls\.txt$/.test(p)) return 'config';
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(p)) return 'image';
  if (/index\.html?$/.test(p)) return 'gallery';
  if (/\.html?$/.test(p)) return 'html';
  if (/\.css$/.test(p)) return 'css';
  if (/\.js$/.test(p)) return 'js';
  if (/\.json$/.test(p)) return 'data';
  if (/\.md$/.test(p)) return 'spec';
  return 'asset';
}

// 폴더 prefix → 메인 artifact type 매핑
function parentTypeOf(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p.startsWith('knowledge/')) return 'KNOWLEDGE';
  if (p.startsWith('layout/')) return 'LAYOUT';
  if (p.startsWith('ui/')) return 'UI';
  if (p.startsWith('sb/')) return 'SB';
  if (p.startsWith('benchmark/')) return 'BENCHMARK';
  if (p.startsWith('input/')) return 'SB';                      // plan-sb mockup PNG
  if (/^[A-Z_]+_SB_.*\.(html|pdf)$/i.test(p)) return 'SB';      // plan-sb generate.js 산출물
  if (p === 'data.json') return 'SB';
  return null;
}

const project = db.prepare('SELECT id, code FROM projects WHERE code = ?').get(PROJECT_CODE);
if (!project) { console.error('NO_PROJECT', PROJECT_CODE); process.exit(1); }

// 가장 최신 날짜 폴더 (예: 20260515)
const projectDir = path.join(OUTPUT_ROOT, PROJECT_CODE);
const dateDirs = fs.readdirSync(projectDir).filter(d => /^\d{8}$/.test(d)).sort().reverse();
if (dateDirs.length === 0) { console.error('NO_DATE_DIR'); process.exit(1); }
const dateDir = path.join(projectDir, dateDirs[0]);
console.log(`[scan] ${dateDir}`);

// 메인 artifact id 매핑 (type → id)
const mains = db.prepare(`
  SELECT id, type, file_path FROM artifacts
  WHERE project_id = ? AND parent_artifact_id IS NULL
  ORDER BY id
`).all(project.id);
const mainByType = {};
for (const a of mains) mainByType[a.type] = a;
console.log(`[mains] ${mains.length}건: ${mains.map(a => a.type).join(', ')}`);

// 모든 파일 재귀 스캔
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
const allFiles = walk(dateDir);
console.log(`[files] ${allFiles.length}건`);

// 메인 파일 경로 집합 (스킵)
const mainPaths = new Set(mains.map(a => a.file_path.replace(/\\/g, '/')));

// 이미 등록된 자식 파일 경로 (멱등)
const existingChildren = db.prepare(`
  SELECT file_path FROM artifacts WHERE project_id = ? AND parent_artifact_id IS NOT NULL
`).all(project.id);
const existingChildPaths = new Set(existingChildren.map(r => r.file_path.replace(/\\/g, '/')));

const insertSub = db.prepare(`
  INSERT INTO artifacts (project_id, type, version, file_path, file_name, meta_json, pipeline_step_id, parent_artifact_id, role, mime_type)
  VALUES (?, ?, 'v1.0', ?, ?, ?, NULL, ?, ?, ?)
`);

let inserted = 0;
let skipped = 0;
const unmapped = [];

for (const fp of allFiles) {
  const normalized = fp.replace(/\\/g, '/');
  if (mainPaths.has(normalized)) { skipped++; continue; }
  if (existingChildPaths.has(normalized)) { skipped++; continue; }
  const rel = path.relative(dateDir, fp).replace(/\\/g, '/');
  const parentType = parentTypeOf(rel);
  if (!parentType) { unmapped.push(rel); continue; }
  const parent = mainByType[parentType];
  if (!parent) { unmapped.push(`${rel} (no parent ${parentType})`); continue; }
  const role = roleOf(rel);
  const mime = mimeOf(rel);
  const fileName = path.basename(rel);
  insertSub.run(
    project.id, parentType, fp, fileName,
    JSON.stringify({ parent_type: parentType, sub_rel_path: rel, backfilled: '2026-05-15' }),
    parent.id, role, mime
  );
  inserted++;
}

console.log(`\n[result] inserted=${inserted} skipped=${skipped} unmapped=${unmapped.length}`);
if (unmapped.length) {
  console.log('[unmapped sample]');
  unmapped.slice(0, 10).forEach(u => console.log('  ', u));
}

// 최종 검증
const summary = db.prepare(`
  SELECT type, role, COUNT(*) as c FROM artifacts WHERE project_id = ? GROUP BY type, role ORDER BY type, role
`).all(project.id);
console.log('\n[final artifacts]');
for (const r of summary) console.log(' ', (r.type||'').padEnd(15), (r.role||'').padEnd(12), r.c);
