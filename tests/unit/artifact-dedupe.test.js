// Unit — G6: artifact 중복 저장 방지 (content_sha256 기반)
//
// 검증:
//  1) 동일 콘텐츠 재저장 → 새 row지만 file_path 재사용 + meta_json.dedupe_of 채워짐
//  2) 다른 콘텐츠 → 별도 파일
//  3) 다른 프로젝트의 동일 콘텐츠 → 별도 파일 (project별 격리)
//  4) 다른 type의 동일 콘텐츠 → 별도 파일
//  5) getDedupeStats: total/deduped/saved_bytes 일치
//  6) 멀티파일 케이스(### FILE:)는 dedupe 미적용
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db } = require('../../src/db');
const saver = require('../../src/engine/pipeline/artifact-saver');

// 테스트용 콘텐츠 생성기 — validateArtifactContent 통과를 위해 H1/H2 + 300자 이상
function makeMd(title, body) {
  return `# ${title}\n\n## 개요\n\n${body}\n\n## 상세\n\n${'a'.repeat(300)}`;
}

function mkProject(code) {
  return db.prepare(`INSERT INTO projects (code, name, status) VALUES (?, ?, 'active')`).run(code, code).lastInsertRowid;
}

function mkPipelineStep(projectId, stepName) {
  const pid = db.prepare(`INSERT INTO pipelines (project_id, status) VALUES (?, 'running')`).run(projectId).lastInsertRowid;
  const sid = db.prepare(`
    INSERT INTO pipeline_steps (pipeline_id, phase, step, status) VALUES (?, 'planning', ?, 'running')
  `).run(pid, stepName).lastInsertRowid;
  return { pipeline_id: pid, id: sid, step: stepName };
}

function resetState() {
  db.prepare(`DELETE FROM artifacts`).run();
  db.prepare(`DELETE FROM pipeline_steps`).run();
  db.prepare(`DELETE FROM pipelines`).run();
  db.prepare(`DELETE FROM projects`).run();
}

test('단일 파일 저장 시 content_sha256 기록 + 첫 row는 dedupe_of 없음', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-1');
  const project = { id: pid, code: 'PRJ-DEDUP-1' };
  const content = makeMd('Title-A', '본문 A');

  const step1 = mkPipelineStep(pid, 'qst');
  const r1 = saver.saveArtifact(project, step1, content, { version: 'v1.0' });
  assert.ok(r1.id);
  assert.ok(fs.existsSync(r1.file_path), '첫 저장 파일 존재');

  const row = db.prepare(`SELECT meta_json, content_sha256 FROM artifacts WHERE id=?`).get(r1.id);
  assert.ok(row.content_sha256, 'sha256 저장됨');
  assert.equal(row.content_sha256.length, 64);
  const meta = JSON.parse(row.meta_json);
  assert.equal(meta.dedupe_of, undefined, '원본은 dedupe_of 없음');
});

test('서로 다른 type → dedupe 미발생 (각자 별도 파일)', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-2');
  const project = { id: pid, code: 'PRJ-DEDUP-2' };
  const content = makeMd('Title-B', '동일 본문');

  const stepQ = mkPipelineStep(pid, 'qst');
  const r1 = saver.saveArtifact(project, stepQ, content, { version: 'v1.0' });

  const stepR = mkPipelineStep(pid, 'req');
  const r2 = saver.saveArtifact(project, stepR, content, { version: 'v1.0' });

  // type 다르므로 dedupe X — file_path 다름
  assert.notEqual(r1.file_path, r2.file_path);
  const meta2 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r2.id).meta_json);
  assert.equal(meta2.dedupe_of, undefined);
});

test('같은 project + 같은 type + 같은 콘텐츠 → dedupe 적용', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-3');
  const project = { id: pid, code: 'PRJ-DEDUP-3' };
  const content = makeMd('Title-C', '본문 C');

  const step1 = mkPipelineStep(pid, 'qst');
  const r1 = saver.saveArtifact(project, step1, content, {});

  const step2 = mkPipelineStep(pid, 'qst');
  const r2 = saver.saveArtifact(project, step2, content, {});

  assert.equal(r2.file_path, r1.file_path, '같은 type+콘텐츠는 dedupe');
  const meta2 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r2.id).meta_json);
  assert.equal(meta2.dedupe_of, r1.id);
});

test('다른 프로젝트의 동일 콘텐츠 → dedupe 미발생 (격리)', () => {
  resetState();
  const p1 = mkProject('PRJ-DEDUP-4A');
  const p2 = mkProject('PRJ-DEDUP-4B');
  const proj1 = { id: p1, code: 'PRJ-DEDUP-4A' };
  const proj2 = { id: p2, code: 'PRJ-DEDUP-4B' };
  const content = makeMd('Title-D', '공유 본문');

  const s1 = mkPipelineStep(p1, 'qst');
  const r1 = saver.saveArtifact(proj1, s1, content, {});
  const s2 = mkPipelineStep(p2, 'qst');
  const r2 = saver.saveArtifact(proj2, s2, content, {});

  assert.notEqual(r1.file_path, r2.file_path, '프로젝트가 다르면 별도 파일');
  const meta2 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r2.id).meta_json);
  assert.equal(meta2.dedupe_of, undefined);
});

test('다른 콘텐츠 → sha 다름 + dedupe_of 없음', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-5');
  const project = { id: pid, code: 'PRJ-DEDUP-5' };

  const s1 = mkPipelineStep(pid, 'qst');
  const r1 = saver.saveArtifact(project, s1, makeMd('A', 'aaa'), {});
  const s2 = mkPipelineStep(pid, 'qst');
  const r2 = saver.saveArtifact(project, s2, makeMd('B', 'bbb'), {});

  // 같은 file_path를 공유하더라도 sha가 다르므로 dedupe 안 됨 (덮어쓰기 동작)
  const sha1 = db.prepare(`SELECT content_sha256 FROM artifacts WHERE id=?`).get(r1.id).content_sha256;
  const sha2 = db.prepare(`SELECT content_sha256 FROM artifacts WHERE id=?`).get(r2.id).content_sha256;
  assert.notEqual(sha1, sha2, 'sha 다름');
  const m2 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r2.id).meta_json);
  assert.equal(m2.dedupe_of, undefined, 'dedupe_of 없음');
});

test('getDedupeStats: total/deduped/saved_bytes 정합', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-6');
  const project = { id: pid, code: 'PRJ-DEDUP-6' };
  const c1 = makeMd('S', 'stats 본문 X');
  // 같은 type+콘텐츠 3번 → 1 원본 + 2 dedupe
  const s1 = mkPipelineStep(pid, 'qst');
  saver.saveArtifact(project, s1, c1, {});
  const s2 = mkPipelineStep(pid, 'qst');
  saver.saveArtifact(project, s2, c1, {});
  const s3 = mkPipelineStep(pid, 'qst');
  saver.saveArtifact(project, s3, c1, {});

  const stats = saver.getDedupeStats();
  assert.equal(stats.total, 3);
  assert.equal(stats.deduped, 2, 'dedupe된 행 = 2');
  assert.ok(stats.saved_bytes > 0, 'saved_bytes > 0');
});

test('멀티파일 케이스(### FILE:)는 dedupe 미적용', () => {
  resetState();
  const pid = mkProject('PRJ-DEDUP-7');
  const project = { id: pid, code: 'PRJ-DEDUP-7' };
  const multi = `# Multi\n\n## Files\n\n${'b'.repeat(300)}\n\n### FILE: a.html\n\`\`\`html\n<p>A</p>\n\`\`\`\n\n### FILE: b.html\n\`\`\`html\n<p>B</p>\n\`\`\``;

  const s1 = mkPipelineStep(pid, 'markup');
  const r1 = saver.saveArtifact(project, s1, multi, {});
  const s2 = mkPipelineStep(pid, 'markup');
  const r2 = saver.saveArtifact(project, s2, multi, {});

  // 멀티파일은 dedupe 안 함 — 두 row 모두 dedupe_of 없음, sha도 NULL
  const m1 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r1.id).meta_json);
  const m2 = JSON.parse(db.prepare(`SELECT meta_json FROM artifacts WHERE id=?`).get(r2.id).meta_json);
  assert.equal(m1.dedupe_of, undefined);
  assert.equal(m2.dedupe_of, undefined);
  const shaRow = db.prepare(`SELECT content_sha256 FROM artifacts WHERE id=?`).get(r1.id);
  assert.equal(shaRow.content_sha256, null);
});

test.after(() => {
  // OUTPUT_ROOT 잔여 파일 정리
  try {
    const out = saver.OUTPUT_ROOT;
    for (const code of ['PRJ-DEDUP-1', 'PRJ-DEDUP-2', 'PRJ-DEDUP-3', 'PRJ-DEDUP-4A', 'PRJ-DEDUP-4B', 'PRJ-DEDUP-5', 'PRJ-DEDUP-6', 'PRJ-DEDUP-7']) {
      const p = path.join(out, code);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    }
  } catch {}
  cleanupTestDb();
});
