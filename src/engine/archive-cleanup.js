// F3: archive 자동 청소 — N일 경과한 archived 프로젝트의 산출물을 zip 백업 후 hard-delete
//
// 정책:
//   - status='archived' AND updated_at < (now - retention days)
//   - 산출물 파일 + DB 행을 backups/archive/{code}-{date}.zip 로 이관
//   - zip에는 manifest.json 포함 (프로젝트/티켓/메시지 메타까지 덤프)
//   - 실제 삭제는 archive_auto_cleanup=true 또는 dry-run=false 일 때만
//
// 안전 기본값: archive_auto_cleanup=false → 부팅 시 잡 비활성. admin이 수동으로 켜야 동작.
const fs = require('fs');
const path = require('path');
const { db, getSetting, logActivity } = require('../db');
const { ZipStream } = require('./zip-stream');

const BACKUP_ROOT = path.join(__dirname, '..', '..', 'backups', 'archive');

function _retentionDays() {
  const v = parseInt(getSetting('archive_retention_days') || '180', 10);
  return Math.max(7, Math.min(3650, isNaN(v) ? 180 : v));
}

function _isAutoEnabled() {
  return (getSetting('archive_auto_cleanup') || 'false') === 'true';
}

function findCandidates() {
  const days = _retentionDays();
  return db.prepare(`
    SELECT id, code, name, status, updated_at, created_at
    FROM projects
    WHERE status = 'archived'
      AND deleted_at IS NULL
      AND updated_at < datetime('now', '-${days} days')
    ORDER BY updated_at ASC
  `).all();
}

// 단일 프로젝트를 zip 백업 + soft-delete
//   dryRun=true: zip만 생성, DB/디스크 삭제 안 함
//   결과: { project_id, code, zip_path, size_bytes, artifact_count, deleted }
async function cleanupProject(project, opts = {}) {
  const { dryRun = false } = opts;

  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  const safeName = String(project.code || `proj-${project.id}`).replace(/[^A-Za-z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const zipPath = path.join(BACKUP_ROOT, `${safeName}-${dateStr}.zip`);

  // 메타 덤프
  const artifacts = db.prepare('SELECT * FROM artifacts WHERE project_id = ?').all(project.id);
  const tickets = db.prepare('SELECT * FROM tickets WHERE project_id = ?').all(project.id);
  const messages = db.prepare('SELECT * FROM messages WHERE project_id = ?').all(project.id);
  const pipelines = db.prepare('SELECT * FROM pipelines WHERE project_id = ?').all(project.id);
  const steps = pipelines.length > 0
    ? db.prepare(`SELECT * FROM pipeline_steps WHERE pipeline_id IN (${pipelines.map(p => p.id).join(',')})`).all()
    : [];

  // zip 작성
  const out = fs.createWriteStream(zipPath);
  const zip = new ZipStream(out);

  const manifest = {
    schema: 'eluo-archive-v1',
    archived_at: new Date().toISOString(),
    project,
    counts: { artifacts: artifacts.length, tickets: tickets.length, messages: messages.length, pipelines: pipelines.length, steps: steps.length },
    artifacts: artifacts.map(a => ({ id: a.id, type: a.type, file_name: a.file_name, file_path: a.file_path, created_at: a.created_at }))
  };

  const usedNames = new Set();
  function uniqueName(base) {
    if (!usedNames.has(base)) { usedNames.add(base); return base; }
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    let i = 2;
    while (usedNames.has(`${stem}_${i}${ext}`)) i++;
    const n = `${stem}_${i}${ext}`;
    usedNames.add(n);
    return n;
  }

  let included = 0;
  for (const a of artifacts) {
    try {
      if (a.file_path && fs.existsSync(a.file_path)) {
        const buf = fs.readFileSync(a.file_path);
        const arcName = uniqueName(`artifacts/${(a.type || 'misc').replace(/[/\\]/g, '_')}/${a.file_name}`);
        zip.addFile(arcName, buf, new Date(a.created_at + 'Z'));
        included++;
      }
    } catch { /* skip individual file errors */ }
  }

  // 메타 JSON 추가
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));
  zip.addFile('tickets.json', Buffer.from(JSON.stringify(tickets, null, 2), 'utf-8'));
  zip.addFile('messages.json', Buffer.from(JSON.stringify(messages, null, 2), 'utf-8'));
  zip.addFile('pipelines.json', Buffer.from(JSON.stringify({ pipelines, steps }, null, 2), 'utf-8'));
  zip.finish();

  // close 이벤트 대기 — ZipStream.finish가 res.end()를 호출하므로 곧 닫힌다
  await new Promise((resolve, reject) => {
    if (out.closed) return resolve();
    out.on('close', resolve);
    out.on('error', reject);
  });

  let zipSize = 0;
  try { zipSize = fs.statSync(zipPath).size; } catch {}

  if (!dryRun) {
    // 산출물 디스크 파일 삭제
    for (const a of artifacts) {
      try { if (a.file_path && fs.existsSync(a.file_path)) fs.unlinkSync(a.file_path); } catch {}
    }
    // DB 정리 — FK 순서 유의
    db.transaction(() => {
      const stepIds = steps.map(s => s.id);
      const ticketIds = tickets.map(t => t.id);
      // 2026-05-13: messages.artifact_id FK(NO ACTION) 위반 회피 — artifacts 보다 messages 먼저 삭제
      db.prepare('DELETE FROM messages WHERE project_id = ?').run(project.id);
      if (stepIds.length > 0) db.prepare(`DELETE FROM artifacts WHERE pipeline_step_id IN (${stepIds.join(',')})`).run();
      db.prepare('DELETE FROM artifacts WHERE project_id = ?').run(project.id);
      // FTS 색인 정리
      try { db.prepare('DELETE FROM artifacts_fts WHERE artifact_id NOT IN (SELECT id FROM artifacts)').run(); } catch {}
      if (ticketIds.length > 0) db.prepare(`DELETE FROM ticket_history WHERE ticket_id IN (${ticketIds.join(',')})`).run();
      db.prepare('DELETE FROM tickets WHERE project_id = ?').run(project.id);
      if (stepIds.length > 0) db.prepare(`DELETE FROM pipeline_steps WHERE id IN (${stepIds.join(',')})`).run();
      db.prepare('DELETE FROM pipelines WHERE project_id = ?').run(project.id);
      db.prepare('DELETE FROM token_usage WHERE project_id = ?').run(project.id);
      db.prepare('DELETE FROM error_log WHERE project_id = ?').run(project.id);
      // soft-delete만 — 코드 충돌 방지를 위해 hard-delete 대신 deleted_at 기록
      db.prepare("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?").run(project.id);
    })();
    logActivity('project', project.id, 'archive_purged',
      `archive 보존기간 초과 → zip 백업 후 정리 (산출물 ${included}건, ${(zipSize/1024).toFixed(1)}KB)`, null);
  }

  return {
    project_id: project.id,
    code: project.code,
    zip_path: zipPath,
    size_bytes: zipSize,
    artifact_count: artifacts.length,
    artifacts_included: included,
    ticket_count: tickets.length,
    pipeline_count: pipelines.length,
    deleted: !dryRun
  };
}

async function runArchiveCleanup(opts = {}) {
  const { dryRun = !_isAutoEnabled() } = opts;
  const t0 = Date.now();
  const candidates = findCandidates();
  const results = [];
  for (const p of candidates) {
    try {
      results.push(await cleanupProject(p, { dryRun }));
    } catch (e) {
      results.push({ project_id: p.id, code: p.code, error: e.message });
    }
  }
  return {
    retention_days: _retentionDays(),
    dry_run: dryRun,
    auto_enabled: _isAutoEnabled(),
    candidates: candidates.length,
    results,
    duration_ms: Date.now() - t0
  };
}

// 일일 잡 — 부팅 + 24h 간격으로 실행. auto-cleanup 비활성 시 dry-run만.
let _interval = null;
function startScheduler() {
  if (_interval) return;
  const tick = async () => {
    try {
      const r = await runArchiveCleanup();
      if (r.candidates > 0) {
        console.log(`[ARCHIVE] cleanup: ${r.candidates} candidates, dry_run=${r.dry_run}, ${r.duration_ms}ms`);
      }
    } catch (e) {
      console.warn('[ARCHIVE] cleanup error:', e.message);
    }
  };
  // 부팅 후 60초 뒤 첫 실행 (다른 마이그레이션·백필 충돌 회피)
  setTimeout(tick, 60_000);
  _interval = setInterval(tick, 24 * 3600 * 1000);
}

function stopScheduler() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = { runArchiveCleanup, cleanupProject, findCandidates, startScheduler, stopScheduler, BACKUP_ROOT };
