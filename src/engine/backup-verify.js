// G3: 백업 무결성 검증 — backups/eluo-*.db.gz 가 복구 가능한 상태인지 확인
//
// 검증 단계 (각 백업 파일별):
//   1) 파일 존재 + 크기 > 0
//   2) gz magic byte (1f 8b) 확인
//   3) gunzip 으로 임시 파일에 펼침
//   4) better-sqlite3로 readonly open + PRAGMA integrity_check 실행
//   5) 결과 'ok' 여야 통과
//
// 정책:
//   - 부팅 60s + 24h 간격으로 가장 최근 백업 1개만 빠르게 검증 (대량 검증은 부하 큼)
//   - 실패 시 logError + activity_log 알람
//   - 수동 트리거(POST /api/settings/backup/verify)는 모든 파일 검증
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const Database = require('better-sqlite3');
const { logActivity, logError } = require('../db');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => /^eluo-\d{8}-\d{4}\.db\.gz$/.test(f))
    .map(f => {
      const full = path.join(BACKUP_DIR, f);
      const st = fs.statSync(full);
      return { name: f, full, size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

// 단일 백업 파일 검증 — 결과: { name, size, ok, error?, integrity?, duration_ms }
function verifyBackup(filePath) {
  const t0 = Date.now();
  const result = { name: path.basename(filePath), size: 0, ok: false };
  try {
    const st = fs.statSync(filePath);
    result.size = st.size;
    if (st.size === 0) {
      result.error = 'empty';
      return result;
    }

    // gz magic byte
    const fd = fs.openSync(filePath, 'r');
    try {
      const head = Buffer.alloc(2);
      fs.readSync(fd, head, 0, 2, 0);
      if (head[0] !== 0x1f || head[1] !== 0x8b) {
        result.error = 'invalid_gzip_header';
        return result;
      }
    } finally {
      fs.closeSync(fd);
    }

    // gunzip → temp file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eluo-verify-'));
    const tmpFile = path.join(tmpDir, 'verify.db');
    try {
      const gz = fs.readFileSync(filePath);
      const raw = zlib.gunzipSync(gz);
      fs.writeFileSync(tmpFile, raw);

      // sqlite open + integrity_check
      const db2 = new Database(tmpFile, { readonly: true, fileMustExist: true });
      try {
        const row = db2.prepare('PRAGMA integrity_check').get();
        const integrity = row && (row.integrity_check || Object.values(row)[0]);
        result.integrity = integrity;
        if (integrity === 'ok') {
          result.ok = true;
        } else {
          result.error = `integrity_failed: ${integrity}`;
        }
      } finally {
        db2.close();
      }
    } catch (e) {
      result.error = `decompress_or_open_failed: ${e.message}`;
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  } catch (e) {
    result.error = e.message;
  } finally {
    result.duration_ms = Date.now() - t0;
  }
  return result;
}

// 모든 백업 검증 — 결과: { count, ok, failed, results, duration_ms }
function verifyAll() {
  const t0 = Date.now();
  const files = module.exports.listBackups();
  const results = files.map(f => module.exports.verifyBackup(f.full));
  const failed = results.filter(r => !r.ok);
  return {
    count: results.length,
    ok: results.length - failed.length,
    failed: failed.length,
    results,
    duration_ms: Date.now() - t0
  };
}

// 가장 최근 백업 1개만 검증 (스케줄러용 — 부하 최소화)
function verifyLatest() {
  const files = module.exports.listBackups();
  if (files.length === 0) return { count: 0, skipped: 'no_backups' };
  const r = module.exports.verifyBackup(files[0].full);
  return { count: 1, latest: r };
}

let _interval = null;
function startScheduler() {
  if (_interval) return;
  const tick = () => {
    try {
      const r = verifyLatest();
      if (r.latest && !r.latest.ok) {
        const detail = `최근 백업 ${r.latest.name} 무결성 실패: ${r.latest.error}`;
        try { logError({ source: 'backup', code: 'ESYS-BAK-VERIFY', message: detail }); } catch {}
        try { logActivity('system', null, 'backup_verify_failed', detail, null); } catch {}
        console.warn(`[BACKUP-VERIFY] ${detail}`);
      } else if (r.latest && r.latest.ok) {
        // 정상 시 로그 한 줄만
        console.log(`[BACKUP-VERIFY] ok: ${r.latest.name} (${r.latest.duration_ms}ms)`);
      }
    } catch (e) {
      console.warn('[BACKUP-VERIFY] error:', e.message);
    }
  };
  setTimeout(tick, 60_000);
  _interval = setInterval(tick, 24 * 3600 * 1000);
}

function stopScheduler() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = { verifyBackup, verifyAll, verifyLatest, listBackups, startScheduler, stopScheduler, BACKUP_DIR };
