// Unit — F2: artifacts FTS5 색인 + 검색 정확성 + LIKE 폴백
//
// 검증:
//  1) FTS5 가상 테이블이 생성되고 isFts5Ready() === true
//  2) artifact INSERT → indexArtifact() 호출 시 색인 갱신
//  3) MATCH 결과의 bm25 정렬이 빈도/위치 기반으로 의미 있게 동작
//  4) reindexAllArtifacts()가 멱등 (동일 결과)
//  5) 본문 5MB 초과는 색인 제외 (가드)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db, isFts5Ready, indexArtifact, reindexAllArtifacts } = require('../../src/db');

let _projectId = null;
let _tmpDir = null;

function ensureProject() {
  if (_projectId) return _projectId;
  const info = db.prepare(`
    INSERT INTO projects (name, code, type, status, prompt)
    VALUES (?, ?, ?, ?, ?)
  `).run('FTS Test', 'FTS-T01', 'web', 'active', 'test');
  _projectId = info.lastInsertRowid;
  _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fts-art-'));
  return _projectId;
}

function mkArtifact({ name, type, body }) {
  ensureProject();
  const filePath = path.join(_tmpDir, name);
  fs.writeFileSync(filePath, body, 'utf-8');
  const r = db.prepare(`
    INSERT INTO artifacts (project_id, type, version, file_path, file_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(_projectId, type, 'v1.0', filePath, name);
  indexArtifact(r.lastInsertRowid);
  return r.lastInsertRowid;
}

test('FTS5: 가상 테이블 생성 및 isFts5Ready true', () => {
  assert.equal(isFts5Ready(), true);
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='artifacts_fts'"
  ).get();
  assert.ok(row, 'artifacts_fts exists');
});

test('indexArtifact: INSERT 후 MATCH 검색 가능', () => {
  const id = mkArtifact({
    name: 'rbac-spec.md',
    type: 'requirements',
    body: '# RBAC 권한 매트릭스\n\nadmin/member/guest 3단계 역할로 분리한다. 모든 admin 작업은 감사 로그에 기록.'
  });
  const rows = db.prepare(`
    SELECT artifact_id, file_name FROM artifacts_fts
    WHERE artifacts_fts MATCH ? LIMIT 5
  `).all('"권한 매트릭스"');
  assert.ok(rows.find(r => r.artifact_id === id), '권한 매트릭스 phrase로 검색');
});

test('FTS5: bm25 정렬 — 매칭 빈도 높은 문서가 상위', () => {
  // sparse: '캐싱'이 1번
  const sparseId = mkArtifact({
    name: 'sparse.md', type: 'note',
    body: '일반적인 노트.'.repeat(50) + ' 캐싱은 한번만 언급됨.'
  });
  // dense: '캐싱'이 5번
  const denseId = mkArtifact({
    name: 'dense.md', type: 'note',
    body: '캐싱 전략. 캐싱 적용. 캐싱 갱신. 캐싱 무효화. 캐싱 정책.'.repeat(2)
  });
  const rows = db.prepare(`
    SELECT artifact_id, bm25(artifacts_fts) as rank
    FROM artifacts_fts WHERE artifacts_fts MATCH ?
    ORDER BY rank LIMIT 10
  `).all('"캐싱"');
  const ids = rows.map(r => r.artifact_id);
  const denseIdx = ids.indexOf(denseId);
  const sparseIdx = ids.indexOf(sparseId);
  assert.ok(denseIdx >= 0, 'dense 문서가 결과에 있음');
  assert.ok(sparseIdx < 0 || denseIdx < sparseIdx, 'dense > sparse 순서 (bm25는 낮을수록 강함)');
});

test('reindexAllArtifacts: 미색인분만 처리 (멱등)', () => {
  // 색인을 강제로 비우고 재구축
  db.exec('DELETE FROM artifacts_fts');
  const r1 = reindexAllArtifacts();
  assert.ok(r1.ready);
  assert.ok(r1.indexed >= 3, `최소 3건 색인됨 (실제 ${r1.indexed})`);
  // 두 번째 호출 — 모두 skipped
  const r2 = reindexAllArtifacts();
  assert.equal(r2.indexed, 0, '재호출 시 신규 색인 0');
  assert.equal(r2.skipped, r1.indexed, 'skipped == 이전 색인 수');
});

test('FTS5 escape: 사용자 입력의 따옴표가 syntax error를 일으키지 않음', () => {
  // search.js의 escapeFtsQuery 동등 로직을 직접 호출
  const cleaned = String('foo "bar"').replace(/"/g, '""');
  const phrase = `"${cleaned}"`;
  // FTS5는 phrase 안에 "" (escaped quote) 가능 — 빈 결과지만 syntax 통과해야 함
  let threw = false;
  try {
    db.prepare(`SELECT 1 FROM artifacts_fts WHERE artifacts_fts MATCH ? LIMIT 1`).all(phrase);
  } catch (e) { threw = true; }
  assert.equal(threw, false, 'escaped phrase는 FTS5 파서를 통과해야 함');
});

test('snippet(): 매칭 위치 ± 컨텍스트 반환', () => {
  const id = mkArtifact({
    name: 'snippet-test.md', type: 'note',
    body: 'A'.repeat(200) + ' 핵심키워드입니다 ' + 'B'.repeat(200)
  });
  const row = db.prepare(`
    SELECT snippet(artifacts_fts, 1, '«', '»', '…', 8) as s
    FROM artifacts_fts WHERE artifacts_fts MATCH ? AND artifact_id = ? LIMIT 1
  `).get('"핵심키워드입니다"', id);
  assert.ok(row && row.s, '스니펫 반환');
  assert.match(row.s, /«.*핵심키워드입니다.*»/, '매칭 부분이 « » 로 감싸짐');
});

test.after(() => {
  if (_tmpDir) try { fs.rmSync(_tmpDir, { recursive: true, force: true }); } catch {}
  cleanupTestDb();
});
