// Unit — F3: archive 자동 청소 + zip 백업
//
// 검증:
//  1) findCandidates: archived AND updated_at < now-N일 만 추출
//  2) cleanupProject({dryRun:true}): zip은 생성되지만 DB/파일 삭제 안 됨
//  3) cleanupProject({dryRun:false}): zip 생성 + DB soft-delete + 디스크 파일 삭제
//  4) zip에 manifest.json 포함, 산출물 파일 포함
//  5) auto_cleanup=false (기본): runArchiveCleanup이 자동으로 dry-run으로 동작
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db, setSetting } = require('../../src/db');
const { findCandidates, cleanupProject, runArchiveCleanup, BACKUP_ROOT } = require('../../src/engine/archive-cleanup');

// 테스트용 산출물 디렉터리
const TMP_OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'eluo-arc-out-'));

function insertProject({ code, name, status, agedDays = 0 }) {
  // updated_at을 직접 과거로 설정해 보존기간 초과 시뮬레이션
  const upd = `datetime('now', '-${agedDays} days')`;
  const info = db.prepare(`
    INSERT INTO projects (name, code, type, status, completion_level, created_at, updated_at)
    VALUES (?, ?, 'web', ?, 1, ${upd}, ${upd})
  `).run(name, code, status);
  return info.lastInsertRowid;
}

function insertArtifact(projectId, type, fileName, body) {
  const filePath = path.join(TMP_OUT, `${projectId}-${fileName}`);
  fs.writeFileSync(filePath, body);
  const info = db.prepare(`
    INSERT INTO artifacts (project_id, type, file_path, file_name) VALUES (?, ?, ?, ?)
  `).run(projectId, type, filePath, fileName);
  return { id: info.lastInsertRowid, filePath };
}

function clearAll() {
  db.prepare('DELETE FROM artifacts').run();
  db.prepare('DELETE FROM tickets').run();
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM pipeline_steps').run();
  db.prepare('DELETE FROM pipelines').run();
  db.prepare('DELETE FROM projects').run();
}

test('findCandidates: archived AND updated_at < now-N일 만 추출', () => {
  clearAll();
  setSetting('archive_retention_days', '180');

  // 케이스 1: archived + 200일 경과 → 후보
  const p1 = insertProject({ code: 'OLD-A', name: 'old archived', status: 'archived', agedDays: 200 });
  // 케이스 2: archived 하지만 50일 경과 → 후보 아님
  insertProject({ code: 'NEW-A', name: 'new archived', status: 'archived', agedDays: 50 });
  // 케이스 3: completed 상태 → archived 아니므로 제외
  insertProject({ code: 'OLD-C', name: 'old completed', status: 'completed', agedDays: 365 });
  // 케이스 4: archived + 200일 + soft-deleted → 제외
  const p4 = insertProject({ code: 'OLD-DEL', name: 'soft deleted', status: 'archived', agedDays: 300 });
  db.prepare("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?").run(p4);

  const cands = findCandidates();
  const ids = cands.map(c => c.id);
  assert.deepEqual(ids, [p1], `OLD-A 만 후보여야 함 (실제: ${JSON.stringify(cands)})`);
});

test('cleanupProject(dryRun=true): zip은 생성되지만 DB/파일은 그대로', async () => {
  clearAll();
  const pid = insertProject({ code: 'DRY-1', name: 'dryrun proj', status: 'archived', agedDays: 200 });
  const { id: aid, filePath } = insertArtifact(pid, 'planning', 'qst.md', '# 기획서\n예시 내용');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  const result = await cleanupProject(project, { dryRun: true });

  assert.equal(result.deleted, false);
  assert.ok(result.zip_path && fs.existsSync(result.zip_path), 'zip 파일이 생성되어야 함');
  assert.ok(result.size_bytes > 0, 'zip 크기 > 0');
  assert.equal(result.artifact_count, 1);
  assert.equal(result.artifacts_included, 1);

  // DB 행 + 디스크 파일이 그대로 있어야 함
  const artStill = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(aid);
  assert.ok(artStill, 'dry-run에서는 DB 행이 유지되어야 함');
  assert.ok(fs.existsSync(filePath), 'dry-run에서는 산출물 파일이 유지되어야 함');
  const projStill = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  assert.equal(projStill.deleted_at, null, 'dry-run에서는 soft-delete 안 됨');
});

test('cleanupProject(dryRun=false): zip 생성 + DB soft-delete + 디스크 파일 삭제', async () => {
  clearAll();
  const pid = insertProject({ code: 'REAL-1', name: 'real cleanup', status: 'archived', agedDays: 200 });
  const { id: aid, filePath: fp } = insertArtifact(pid, 'design', 'index.html', '<h1>hello</h1>');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  const result = await cleanupProject(project, { dryRun: false });

  assert.equal(result.deleted, true);
  assert.ok(fs.existsSync(result.zip_path), 'zip 파일이 생성되어야 함');

  // DB: artifacts 삭제 + project soft-deleted
  const artGone = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(aid);
  assert.equal(artGone, undefined, 'artifact 행이 삭제되어야 함');
  const projGone = db.prepare('SELECT deleted_at FROM projects WHERE id = ?').get(pid);
  assert.ok(projGone && projGone.deleted_at, 'project가 soft-delete 되어야 함');

  // 디스크 파일 삭제
  assert.equal(fs.existsSync(fp), false, '산출물 파일이 디스크에서 삭제되어야 함');
});

test('zip 내부에 manifest.json + 산출물 파일 포함', async () => {
  clearAll();
  const pid = insertProject({ code: 'MAN-1', name: 'manifest test', status: 'archived', agedDays: 200 });
  insertArtifact(pid, 'planning', 'spec.md', '# spec body\n');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  const result = await cleanupProject(project, { dryRun: true });

  // zip 내용을 직접 파싱하지 않고 시그니처+manifest 문자열 존재만 확인 (의존성 0 zip-stream 검증)
  const buf = fs.readFileSync(result.zip_path);
  // EOCD 시그니처
  assert.ok(buf.indexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) >= 0, 'EOCD 시그니처 발견');
  // 파일명 entry — manifest.json, artifacts/.../spec.md
  assert.ok(buf.includes(Buffer.from('manifest.json')), 'manifest.json 항목 존재');
  assert.ok(buf.includes(Buffer.from('spec.md')), 'spec.md 항목 존재');
  assert.ok(buf.includes(Buffer.from('tickets.json')), 'tickets.json 항목 존재');
  assert.ok(buf.includes(Buffer.from('messages.json')), 'messages.json 항목 존재');
});

test('runArchiveCleanup: auto_cleanup=false 면 자동으로 dry-run', async () => {
  clearAll();
  setSetting('archive_auto_cleanup', 'false');
  const pid = insertProject({ code: 'AUTO-OFF', name: 'auto off', status: 'archived', agedDays: 200 });
  insertArtifact(pid, 'planning', 'x.md', '# x');

  const r = await runArchiveCleanup();
  assert.equal(r.dry_run, true);
  assert.equal(r.candidates, 1);
  // dry-run 결과는 deleted=false
  assert.equal(r.results[0].deleted, false);

  // DB는 그대로
  const projStill = db.prepare('SELECT deleted_at FROM projects WHERE id = ?').get(pid);
  assert.equal(projStill.deleted_at, null);
});

test('runArchiveCleanup: auto_cleanup=true 면 실제 삭제 수행', async () => {
  clearAll();
  setSetting('archive_auto_cleanup', 'true');
  const pid = insertProject({ code: 'AUTO-ON', name: 'auto on', status: 'archived', agedDays: 200 });
  insertArtifact(pid, 'design', 'h.html', '<p>h</p>');

  const r = await runArchiveCleanup();
  assert.equal(r.dry_run, false);
  assert.equal(r.candidates, 1);
  assert.equal(r.results[0].deleted, true);

  const projGone = db.prepare('SELECT deleted_at FROM projects WHERE id = ?').get(pid);
  assert.ok(projGone.deleted_at, 'auto_cleanup=true 시 soft-delete 적용');

  // 후속 호출은 후보 0건 (deleted_at 필터로 제외됨)
  const r2 = await runArchiveCleanup();
  assert.equal(r2.candidates, 0);

  // 정리
  setSetting('archive_auto_cleanup', 'false');
});

test('보존기간 settings 변경 반영 (90일로 단축)', () => {
  clearAll();
  setSetting('archive_retention_days', '90');
  // 100일 경과 → 후보
  const p = insertProject({ code: 'SHORT', name: 'short retention', status: 'archived', agedDays: 100 });
  // 30일 경과 → 후보 아님
  insertProject({ code: 'TOO-NEW', name: 'too new', status: 'archived', agedDays: 30 });

  const cands = findCandidates();
  assert.equal(cands.length, 1);
  assert.equal(cands[0].id, p);
  setSetting('archive_retention_days', '180'); // 복원
});

test.after(() => {
  // 백업 디렉터리 + 임시 산출물 정리
  try { fs.rmSync(BACKUP_ROOT, { recursive: true, force: true }); } catch {}
  try { fs.rmSync(TMP_OUT, { recursive: true, force: true }); } catch {}
  cleanupTestDb();
});
