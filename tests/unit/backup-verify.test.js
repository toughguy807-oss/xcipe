// Unit — G3: 백업 무결성 검증 (gz + sqlite integrity_check)
//
// 검증:
//  1) 정상 gz 백업 → ok=true, integrity='ok'
//  2) 잘못된 magic byte 파일 → invalid_gzip_header
//  3) 빈 파일 → empty
//  4) gz는 valid 이지만 내용물이 sqlite가 아닌 경우 → decompress_or_open_failed
//  5) verifyAll: 정상 1개 + 손상 1개 → count=2, ok=1, failed=1
//  6) verifyLatest: mtime 기준 가장 최근 1개만 검증
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

const TMP_BACKUP = fs.mkdtempSync(path.join(os.tmpdir(), 'eluo-bak-test-'));

// backup-verify.js는 BACKUP_DIR을 절대 경로로 고정하므로
// 모듈 캐시를 우회하고 require.cache에서 BACKUP_DIR을 패치한다.
let backupVerify;
function loadModule() {
  delete require.cache[require.resolve('../../src/engine/backup-verify')];
  // db 모듈도 필요 시점에 setupTestDb 후 로드되도록
  backupVerify = require('../../src/engine/backup-verify');
  // BACKUP_DIR 재할당이 불가능하므로, listBackups을 임시 디렉터리로 패치
  const orig = backupVerify.listBackups;
  backupVerify.listBackups = () => {
    if (!fs.existsSync(TMP_BACKUP)) return [];
    return fs.readdirSync(TMP_BACKUP)
      .filter(f => /^eluo-\d{8}-\d{4}\.db\.gz$/.test(f))
      .map(f => {
        const full = path.join(TMP_BACKUP, f);
        const st = fs.statSync(full);
        return { name: f, full, size: st.size, mtime: st.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  };
}

const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();
loadModule();

// 정상 sqlite 백업 1개 생성
function makeGoodBackup(name) {
  const tmpDb = path.join(TMP_BACKUP, `${name}.db`);
  const db2 = new Database(tmpDb);
  db2.exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO t (v) VALUES ('hello');`);
  db2.close();
  const raw = fs.readFileSync(tmpDb);
  const gz = zlib.gzipSync(raw);
  const finalName = `${name}.db.gz`;
  const finalPath = path.join(TMP_BACKUP, finalName);
  fs.writeFileSync(finalPath, gz);
  fs.unlinkSync(tmpDb);
  return finalPath;
}

// 잘못된 magic 파일
function makeBadMagic(name) {
  const p = path.join(TMP_BACKUP, name);
  fs.writeFileSync(p, Buffer.from('not a gzip file'));
  return p;
}

// 빈 파일
function makeEmpty(name) {
  const p = path.join(TMP_BACKUP, name);
  fs.writeFileSync(p, Buffer.alloc(0));
  return p;
}

// gz는 valid이지만 내용물이 sqlite가 아닌 경우
function makeFakeSqliteGz(name) {
  const p = path.join(TMP_BACKUP, name);
  const fake = Buffer.from('this is not a sqlite database');
  fs.writeFileSync(p, zlib.gzipSync(fake));
  return p;
}

test('정상 gz 백업 → ok=true, integrity=ok', () => {
  const p = makeGoodBackup('eluo-20260101-1200');
  const r = backupVerify.verifyBackup(p);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.integrity, 'ok');
  assert.ok(r.size > 0);
  assert.ok(r.duration_ms >= 0);
});

test('잘못된 magic byte → invalid_gzip_header', () => {
  const p = makeBadMagic('eluo-20260102-1200.db.gz');
  const r = backupVerify.verifyBackup(p);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'invalid_gzip_header');
});

test('빈 파일 → empty', () => {
  const p = makeEmpty('eluo-20260103-1200.db.gz');
  const r = backupVerify.verifyBackup(p);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'empty');
});

test('gz는 valid이지만 sqlite가 아님 → decompress_or_open_failed', () => {
  const p = makeFakeSqliteGz('eluo-20260104-1200.db.gz');
  const r = backupVerify.verifyBackup(p);
  assert.equal(r.ok, false);
  assert.match(r.error || '', /decompress_or_open_failed/);
});

test('verifyAll: 정상+손상 혼합 통계', () => {
  // listBackups 패치는 TMP_BACKUP을 본다 — 위 4개 파일이 모두 인식됨
  const r = backupVerify.verifyAll();
  assert.ok(r.count >= 4, `count >= 4 (실제: ${r.count})`);
  assert.ok(r.failed >= 3, `손상된 파일 ≥ 3 (실제: ${r.failed})`);
  assert.ok(r.ok >= 1, `정상 ≥ 1 (실제: ${r.ok})`);
});

test('verifyLatest: 가장 최근 mtime 1개만 검증', () => {
  // 새 정상 백업을 mtime을 더 늦게
  const newer = makeGoodBackup('eluo-20260201-1200');
  // 파일시스템 mtime 갱신 (1초 후로 setMtime)
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(newer, future, future);

  const r = backupVerify.verifyLatest();
  assert.equal(r.count, 1);
  assert.equal(r.latest.ok, true);
  assert.match(r.latest.name, /20260201-1200\.db\.gz$/);
});

test.after(() => {
  try { fs.rmSync(TMP_BACKUP, { recursive: true, force: true }); } catch {}
  cleanupTestDb();
});
