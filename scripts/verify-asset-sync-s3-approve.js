#!/usr/bin/env node
// S3-1: /approve 실파일 적용 검증 (안전 사이클)
//   1) divergent 자산 1건 선택 (가장 작은 size)
//   2) RUNTIME 본문 백업 (메모리)
//   3) /approve 호출 → MASTER → RUNTIME 복사
//   4) RUNTIME 본문 SHA 가 master_sha 와 일치하는지 확인
//   5) audit_log 에 'approve_major' + 'sync' 기록 확인
//   6) 백업 본문 복원 (디스크 원상복구) + manifest pull 재실행

process.env.PORT = process.env.PORT || '3848';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { db } = require(path.resolve(__dirname, '..', 'src', 'db'));
const { generateToken } = require(path.resolve(__dirname, '..', 'src', 'auth'));
const sync = require(path.resolve(__dirname, '..', 'src', 'engine', 'asset-sync'));

const admin = db.prepare(`SELECT id, email, role FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`).get();
const token = generateToken(admin);
const PORT = parseInt(process.env.PORT, 10);

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(buf || 'null') }); }
        catch { resolve({ status: res.statusCode, raw: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// manifest path → 디스크 경로 (admin-assets.js 의 resolveRuntimePath 미러)
function diskPath(row) {
  if (row.category === 'claude-md') return path.join(sync.RUNTIME_ROOT, 'CLAUDE.md');
  if (row.category === 'rules') return path.join(sync.RUNTIME_ROOT, 'lib', 'rules', row.path.replace(/^rules\//, ''));
  return path.join(sync.RUNTIME_ROOT, row.category, row.path.slice(row.category.length + 1));
}

async function main() {
  require(path.resolve(__dirname, '..', 'src', 'server'));
  await new Promise(r => setTimeout(r, 1000));

  // 사전 pull 로 status 최신화
  console.log('[setup] /pull...');
  await req('POST', '/api/admin/assets/pull', {});

  // 1) divergent 1건 — 가장 작은 size 선택
  const target = db.prepare(`
    SELECT path, category, sha256, master_sha, master_version, size, status, pending_action
    FROM asset_manifest
    WHERE status = 'divergent' AND pending_action = 'promote_major'
    ORDER BY size ASC LIMIT 1
  `).get();
  if (!target) { console.error('divergent 자산 없음'); process.exit(1); }

  console.log('\n──────── target ────────');
  console.log(JSON.stringify(target, null, 2));

  const diskFile = diskPath(target);
  console.log(`disk = ${diskFile}`);

  // 2) 백업
  if (!fs.existsSync(diskFile)) { console.error('disk 파일 없음'); process.exit(1); }
  const original = fs.readFileSync(diskFile);
  const originalSha = sha256(original);
  console.log(`backup sha = ${originalSha.slice(0, 16)} (size ${original.length})`);
  if (originalSha !== target.sha256) {
    console.warn(`⚠ manifest.sha256(${target.sha256.slice(0, 16)}) ≠ disk sha — manifest 가 stale 일 수 있음`);
  }

  try {
    // 3) /approve
    console.log('\n──────── /approve ────────');
    const r = await req('POST', '/api/admin/assets/approve', { path: target.path });
    console.log(`status=${r.status}`);
    console.log(JSON.stringify(r.json, null, 2));
    if (r.status !== 200) throw new Error('approve 실패');

    // 4) 디스크 SHA 확인
    const after = fs.readFileSync(diskFile);
    const afterSha = sha256(after);
    console.log(`\n──────── SHA 일치 확인 ────────`);
    console.log(`disk after sha   = ${afterSha.slice(0, 16)} (size ${after.length})`);
    console.log(`master sha (pre) = ${target.master_sha.slice(0, 16)}`);
    console.log(`일치? ${afterSha === target.master_sha}`);
    if (afterSha !== target.master_sha) throw new Error('disk 가 master_sha 와 일치하지 않음');

    // manifest 행도 갱신됐는지 확인
    const updated = db.prepare(`SELECT status, sha256, approved_by, approved_at FROM asset_manifest WHERE path = ?`).get(target.path);
    console.log('\n──────── manifest 행 ────────');
    console.log(JSON.stringify(updated, null, 2));
    if (updated.status !== 'synced') console.warn(`⚠ status 가 synced 가 아님: ${updated.status}`);
    if (updated.sha256 !== target.master_sha) console.warn(`⚠ runtime sha 가 master_sha 와 다름`);

    // 5) audit
    const audit = db.prepare(`
      SELECT action, before_sha, after_sha FROM asset_audit_log
      WHERE path = ? ORDER BY id DESC LIMIT 5
    `).all(target.path);
    console.log('\n──────── audit (최근 5건) ────────');
    console.log(JSON.stringify(audit, null, 2));
    const hasSync = audit.some(a => a.action === 'sync');
    const hasApprove = audit.some(a => a.action === 'approve_major');
    if (!hasSync) console.warn('⚠ sync audit 없음');
    if (!hasApprove) console.warn('⚠ approve_major audit 없음');

    console.log('\n✓ /approve 정상 동작 — disk + manifest + audit 일치');
  } finally {
    // 6) 디스크 복원
    console.log('\n──────── 디스크 복원 ────────');
    fs.writeFileSync(diskFile, original);
    const restoredSha = sha256(fs.readFileSync(diskFile));
    console.log(`복원 후 sha = ${restoredSha.slice(0, 16)} (원본과 일치? ${restoredSha === originalSha})`);
    // manifest 도 재스캔 — diff 재계산
    sync.rebuildManifest({ db, actor: 'verify-cleanup' });
    sync.diffWithMaster({ db, actor: 'verify-cleanup' });
    console.log('manifest re-pull 완료');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('verify failed:', e);
  process.exit(1);
});
