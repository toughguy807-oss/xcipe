#!/usr/bin/env node
// A9: SQLite DB 안전 백업 (WAL 호환)
// 사용:
//   node scripts/backup-db.js                 → backups/eluo-YYYYMMDD-HHmm.db.gz 생성
//   node scripts/backup-db.js --dest <path>   → 지정 경로에 저장
//   node scripts/backup-db.js --keep 14       → 14개 초과 백업 자동 삭제 (기본 30)
//   node scripts/backup-db.js --no-gzip       → 압축하지 않고 .db로 저장
//
// 동작 원리:
//   - better-sqlite3의 db.backup()은 SQLite Online Backup API 사용 → 쓰기 락 없이 페이지 단위 복사
//   - WAL 모드에서도 일관된 스냅샷이 보장되며, 진행 중 트랜잭션을 차단하지 않음
//   - 백업 파일은 그 자체로 완결된 SQLite DB (별도 -wal/-shm 불필요)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const Database = require('better-sqlite3');

function parseArgs(argv) {
  const args = { dest: null, keep: 30, gzip: true };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--dest') args.dest = argv[++i];
    else if (k === '--keep') args.keep = parseInt(argv[++i], 10) || 30;
    else if (k === '--no-gzip') args.gzip = false;
    else if (k === '--help' || k === '-h') {
      console.log('Usage: node scripts/backup-db.js [--dest <path>] [--keep N] [--no-gzip]');
      process.exit(0);
    }
  }
  return args;
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'eluo.db');
  const BACKUP_DIR = path.join(__dirname, '..', 'backups');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[backup] DB not found: ${DB_PATH}`);
    process.exit(1);
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const baseName = `eluo-${ts()}.db`;
  const tempPath = path.join(BACKUP_DIR, `.${baseName}.tmp`);
  const finalRaw = args.dest || path.join(BACKUP_DIR, baseName);
  const finalPath = args.gzip ? finalRaw + '.gz' : finalRaw;

  console.log(`[backup] source : ${DB_PATH}`);
  console.log(`[backup] target : ${finalPath}`);

  // 1. SQLite Online Backup → 임시 파일
  const t0 = Date.now();
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    await db.backup(tempPath);
  } finally {
    db.close();
  }
  const rawSize = fs.statSync(tempPath).size;
  console.log(`[backup] snapshot OK (${(rawSize / 1024 / 1024).toFixed(2)} MB, ${Date.now() - t0}ms)`);

  // 2. 압축 (옵션)
  if (args.gzip) {
    await pipeline(
      fs.createReadStream(tempPath),
      zlib.createGzip({ level: 6 }),
      fs.createWriteStream(finalPath)
    );
    fs.unlinkSync(tempPath);
    const finalSize = fs.statSync(finalPath).size;
    console.log(`[backup] gzip OK (${(finalSize / 1024 / 1024).toFixed(2)} MB, ratio ${(finalSize / rawSize * 100).toFixed(1)}%)`);
  } else {
    fs.renameSync(tempPath, finalPath);
  }

  // 3. 보존 정책 — backups/ 디렉터리 안의 eluo-*.db(.gz)만 대상
  if (!args.dest) {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => /^eluo-\d{8}-\d{4}\.db(\.gz)?$/.test(f))
      .map(f => ({ f, full: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(args.keep);
    for (const { full } of toDelete) {
      fs.unlinkSync(full);
      console.log(`[backup] pruned: ${path.basename(full)}`);
    }
    console.log(`[backup] retained ${Math.min(files.length, args.keep)} backup(s)`);
  }

  console.log('[backup] done');
}

main().catch(err => {
  console.error('[backup] FAILED:', err.message);
  console.error(err.stack);
  // best-effort: try to log via db (서버가 띄워져 있지 않아도 안전)
  try {
    const { logError } = require('../src/db');
    logError({ source: 'backup-db', code: 'BACKUP_FAILED', message: err.message, stack: err.stack });
  } catch {}
  process.exit(1);
});
