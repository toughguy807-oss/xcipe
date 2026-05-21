// KDS row(id=1) stub → 실 데이터 마이그레이션
// 입력: d:/tmp/kds-tokens/kds-baseline-v2.json (110KB) + tokens.css (51KB)
// 동작: 백업 → UPDATE → 검증

const fs = require('fs');
const path = require('path');
const { db } = require('../src/db');

const BASELINE_PATH = 'd:/tmp/kds-tokens/kds-baseline-v2.json';
const CSS_PATH = 'd:/tmp/kds-tokens/kds-tokens/tokens.css';
const DS_ID = 1;
const BACKUP_DIR = path.join(__dirname, '..', '.migration-backups');

function extractStats(baselineJson) {
  try {
    const b = JSON.parse(baselineJson);
    return JSON.stringify({
      total: (b.stats && b.stats.total) || null,
      version: b.version || null,
      source: b.source || null,
      font_family: b.font_family || null,
      breakpoints: b.breakpoints ? Object.keys(b.breakpoints) : null,
      keys: Object.keys(b.stats || {})
    });
  } catch { return null; }
}

const before = db.prepare('SELECT * FROM project_design_systems WHERE id = ?').get(DS_ID);
if (!before) { console.error(`[FAIL] id=${DS_ID} row 없음`); process.exit(1); }

fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `ds-${DS_ID}-${ts}.json`);
fs.writeFileSync(backupFile, JSON.stringify(before, null, 2), 'utf-8');
console.log(`[1/4] 백업 완료 → ${backupFile} (${fs.statSync(backupFile).size} byte)`);
console.log(`     before: baseline=${(before.baseline_json || '').length} byte, css=${(before.tokens_css || '').length} byte`);

const baseline = fs.readFileSync(BASELINE_PATH, 'utf-8');
const css = fs.readFileSync(CSS_PATH, 'utf-8');
try { JSON.parse(baseline); } catch (e) { console.error('[FAIL] baseline JSON 파싱 실패:', e.message); process.exit(1); }
console.log(`[2/4] 입력 로드: baseline=${baseline.length} byte, css=${css.length} byte`);

const stats = extractStats(baseline);
const tx = db.transaction(() => {
  db.prepare(`
    UPDATE project_design_systems
    SET baseline_json = ?, tokens_css = ?, version = ?, source = ?, stats = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(baseline, css, '1.2', 'https://uxdesign.kt.com', stats, DS_ID);
});
tx();
console.log(`[3/4] UPDATE 실행 완료`);

const after = db.prepare('SELECT id, name, slug, version, source, length(baseline_json) as bjs, length(tokens_css) as cjs, stats FROM project_design_systems WHERE id = ?').get(DS_ID);
console.log(`[4/4] 검증:`);
console.log(`     id=${after.id} name="${after.name}" slug="${after.slug}" version=${after.version}`);
console.log(`     source=${after.source}`);
console.log(`     baseline_json: ${after.bjs} byte (${(after.bjs / 1024).toFixed(1)} KB)`);
console.log(`     tokens_css:    ${after.cjs} byte (${(after.cjs / 1024).toFixed(1)} KB)`);
console.log(`     stats: ${after.stats}`);

const usage = db.prepare(`SELECT COUNT(*) as c FROM projects WHERE design_system_id = ? AND deleted_at IS NULL`).get(DS_ID);
console.log(`     사용 중 프로젝트: ${usage.c}건`);
console.log(`\n복구하려면: node scripts/migrate-kds-stub-to-real.js --restore ${backupFile}`);
