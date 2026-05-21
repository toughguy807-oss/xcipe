// 기존 artifacts 의 sub_files / role / mime / artifact_dir 메타를 일괄 채움
//   대상: project_id (env PROJECT_ID 또는 인자) 또는 전체
//   동작:
//     - 각 artifact 의 file_path 디렉터리를 스캔
//     - 자기 자신 + 다른 artifact 의 메인 파일은 제외
//     - 나머지 파일을 sub_files 로 등록 (role/mime/size)
//
// 사용:
//   node scripts/backfill-sub-files.js                 # 전체
//   node scripts/backfill-sub-files.js 17              # project_id=17 만
//   node scripts/backfill-sub-files.js 17 --dry        # 변경 안 함, 출력만

const path = require('path');
const fs = require('fs');
const { db } = require('../src/db');
const { collectSubFilesFromDir, OUTPUT_ROOT } = require('../src/engine/pipeline/artifact-saver');

const args = process.argv.slice(2);
const projectId = args.find(a => /^\d+$/.test(a));
const DRY = args.includes('--dry');

// type 별 sub_files 디렉터리/파일 매칭 룰 — 같은 출력 폴더 안에서 각 artifact 가 자기 영역의 부속만 가짐.
// null = sub 없음 (단일 산출물)
const SUB_FILES_RULES = {
  QST: null, REQ: null, FN: null, IA: null, WBS: null,
  DEV_SPEC: null,
  MARKUP: null, STYLE: null, INTERACTION: null,
  FUNCTIONAL: null, ACCESSIBILITY: null, PERFORMANCE: null, SECURITY: null,
  DEBUG: null,
  // 시안/시각 산출물 — 자기 영역 하위 트리 포함
  BENCHMARK: { dirs: ['benchmark/'] },
  KNOWLEDGE: { dirs: ['knowledge/'] },
  LAYOUT:    { dirs: ['layout/'] },
  UI:        { dirs: ['ui/'] },
  SB:        { dirs: ['sb/', 'input/'], filePatterns: [/_SB_.*\.(html|pdf)$/i] }
};

function matchesRule(rule, relPath) {
  if (!rule) return false;
  if (rule.dirs && rule.dirs.some(d => relPath.startsWith(d))) return true;
  if (rule.filePatterns && rule.filePatterns.some(p => p.test(relPath))) return true;
  return false;
}

const whereClause = projectId ? 'WHERE project_id = ?' : '';
const params = projectId ? [projectId] : [];
const arts = db.prepare(`SELECT id, project_id, type, file_path, meta_json FROM artifacts ${whereClause} ORDER BY id`).all(...params);

console.log(`[backfill] artifacts=${arts.length} (projectId=${projectId || 'all'}, dry=${DRY})`);

// 1단계: artifact 디렉터리별로 자신의 메인 파일 목록 수집 — 다른 artifact 메인은 sub 에서 제외
const dirMains = new Map(); // dir → Set<absMainPath>
for (const a of arts) {
  const dir = path.dirname(a.file_path);
  if (!dirMains.has(dir)) dirMains.set(dir, new Set());
  dirMains.get(dir).add(path.resolve(a.file_path));
}

let updated = 0;
for (const a of arts) {
  const dir = path.dirname(a.file_path);
  if (!fs.existsSync(dir)) {
    console.warn(`  [skip] ${a.id} (${a.type}) — dir 없음: ${dir}`);
    continue;
  }
  const rule = SUB_FILES_RULES.hasOwnProperty(a.type) ? SUB_FILES_RULES[a.type] : null;
  let subFiles = [];
  if (rule) {
    const excludes = [...dirMains.get(dir)];
    const allFiles = collectSubFilesFromDir(dir, excludes);
    subFiles = allFiles.filter(f => matchesRule(rule, f.path));
  }
  // 모든 artifact 가 동일 dir 의 모든 sub 를 받는 옛 동작을 방지.

  let meta = {};
  try { meta = JSON.parse(a.meta_json || '{}'); } catch {}
  const newMeta = Object.assign({}, meta, {
    sub_files: subFiles,
    artifact_dir: path.relative(OUTPUT_ROOT, dir).replace(/\\/g, '/')
  });

  console.log(`  [${DRY ? 'dry' : 'upd'}] art=${a.id} type=${(a.type || '').padEnd(14)} sub=${String(subFiles.length).padStart(2)} dir=${newMeta.artifact_dir}`);
  if (!DRY) {
    db.prepare('UPDATE artifacts SET meta_json = ? WHERE id = ?').run(JSON.stringify(newMeta), a.id);
    updated++;
  }
}
console.log(`[done] updated=${updated}`);
