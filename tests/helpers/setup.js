// 테스트 헬퍼 — 임시 DB로 격리된 환경 구성
//   require('./helpers/setup')()를 테스트 파일 최상단에서 호출하면
//   process.env.DB_PATH가 임시 파일로 지정된 후 db 모듈이 로드된다.
const fs = require('fs');
const os = require('os');
const path = require('path');

let _dbPath = null;

function setupTestDb() {
  if (_dbPath) return _dbPath;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eluo-test-'));
  _dbPath = path.join(dir, 'eluo-test.db');
  process.env.DB_PATH = _dbPath;
  process.env.NODE_ENV = 'test';
  return _dbPath;
}

function cleanupTestDb() {
  if (!_dbPath) return;
  try {
    const dir = path.dirname(_dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
  _dbPath = null;
}

module.exports = { setupTestDb, cleanupTestDb };
