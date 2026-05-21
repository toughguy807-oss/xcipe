#!/usr/bin/env node
// S3-2/3: rollback 사이클 검증
//   1) divergent 1건 선택, 디스크 백업
//   2) /approve → applySync → 디스크 본문이 master 와 일치, snapshot 자동 생성 확인
//   3) audit 에서 before_sha 추출 → /rollback 호출
//   4) 디스크 SHA 가 before_sha 와 일치하는지 확인
//   5) audit 'rollback' 엔트리 확인
//   6) 디스크 복원 + manifest re-pull

process.env.PORT = process.env.PORT || '3850';
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

function diskPath(row) {
  if (row.category === 'claude-md') return path.join(sync.RUNTIME_ROOT, 'CLAUDE.md');
  if (row.category === 'rules') return path.join(sync.RUNTIME_ROOT, 'lib', 'rules', row.path.replace(/^rules\//, ''));
  return path.join(sync.RUNTIME_ROOT, row.category, row.path.slice(row.category.length + 1));
}

async function main() {
  require(path.resolve(__dirname, '..', 'src', 'server'));
  await new Promise(r => setTimeout(r, 1000));

  console.log('[setup] /pull...');
  await req('POST', '/api/admin/assets/pull', {});

  // 1) divergent 1건
  const target = db.prepare(`
    SELECT path, category, sha256, master_sha, master_version, version, size, status, pending_action
    FROM asset_manifest
    WHERE status = 'divergent' AND pending_action = 'promote_major'
    ORDER BY size ASC LIMIT 1
  `).get();
  if (!target) { console.error('divergent 자산 없음'); process.exit(1); }

  console.log('\n──────── target ────────');
  console.log(JSON.stringify(target, null, 2));

  const diskFile = diskPath(target);
  const original = fs.readFileSync(diskFile);
  const originalSha = sha256(original);
  console.log(`disk file = ${diskFile}`);
  console.log(`original sha = ${originalSha.slice(0, 16)} (size ${original.length})`);

  try {
    // 2) approve → sync 적용
    console.log('\n──────── /approve ────────');
    let r = await req('POST', '/api/admin/assets/approve', { path: target.path });
    if (r.status !== 200) { console.error('approve 실패', r); throw new Error('approve fail'); }
    console.log(`status=${r.status}, after_sha=${r.json.after_sha && r.json.after_sha.slice(0, 16)}`);

    const afterSync = sha256(fs.readFileSync(diskFile));
    console.log(`disk after sync = ${afterSync.slice(0, 16)}`);
    console.log(`master_sha 와 일치? ${afterSync === target.master_sha}`);

    // snapshot 자동 생성 확인 (originalSha 가 SNAPSHOT_ROOT 에 저장되어야 함)
    const snapDir = sync.SNAPSHOT_ROOT;
    const snapFile = path.join(snapDir, originalSha.slice(0, 2), originalSha);
    console.log(`snapshot 자동 저장? ${fs.existsSync(snapFile)} (${snapFile})`);
    if (!fs.existsSync(snapFile)) throw new Error('applySync 가 스냅샷을 만들지 않음');

    // 3) audit 에서 sync 의 before_sha 추출
    const audit = db.prepare(`
      SELECT id, action, before_sha, after_sha FROM asset_audit_log
      WHERE path = ? AND action = 'sync' ORDER BY id DESC LIMIT 1
    `).get(target.path);
    console.log(`\n──────── audit (sync 가장 최근) ────────`);
    console.log(JSON.stringify(audit, null, 2));
    if (audit.before_sha !== originalSha) console.warn(`⚠ audit.before_sha(${audit.before_sha.slice(0,16)}) ≠ originalSha`);

    // 4) /rollback target_sha = before_sha
    console.log('\n──────── /rollback ────────');
    r = await req('POST', '/api/admin/assets/rollback', { path: target.path, target_sha: audit.before_sha });
    console.log(`status=${r.status}`);
    console.log(JSON.stringify(r.json, null, 2));
    if (r.status !== 200) throw new Error('rollback 실패');

    const afterRb = sha256(fs.readFileSync(diskFile));
    console.log(`\ndisk after rollback = ${afterRb.slice(0, 16)}`);
    console.log(`originalSha 와 일치? ${afterRb === originalSha}`);
    if (afterRb !== originalSha) throw new Error('rollback 후 disk 가 원본과 다름');

    // 5) audit 확인
    const rbAudit = db.prepare(`SELECT action, before_sha, after_sha FROM asset_audit_log WHERE path = ? ORDER BY id DESC LIMIT 3`).all(target.path);
    console.log('\n──────── audit (최근 3) ────────');
    console.log(JSON.stringify(rbAudit, null, 2));
    if (!rbAudit.some(a => a.action === 'rollback')) throw new Error('rollback audit 없음');

    // manifest 상태
    const updated = db.prepare(`SELECT status, sha256, pending_action FROM asset_manifest WHERE path = ?`).get(target.path);
    console.log('\n──────── manifest 행 (rollback 후) ────────');
    console.log(JSON.stringify(updated, null, 2));
    if (updated.sha256 !== originalSha) console.warn('⚠ manifest.sha256 ≠ originalSha');

    console.log('\n✓ rollback 사이클 정상 — sync → snapshot → rollback → 원본 복귀 검증 완료');

    // 6) snapshot-status 엔드포인트
    console.log('\n──────── /snapshot-status ────────');
    r = await req('GET', `/api/admin/assets/snapshot-status?path=${encodeURIComponent(target.path)}`);
    console.log(`총 ${r.json.total} 엔트리`);
    console.log('첫 5건:', JSON.stringify(r.json.items.slice(0, 5), null, 2));
  } finally {
    // 디스크는 이미 rollback 으로 원복된 상태 — manifest 만 재정렬
    console.log('\n──────── manifest re-pull ────────');
    sync.rebuildManifest({ db, actor: 'verify-cleanup' });
    sync.diffWithMaster({ db, actor: 'verify-cleanup' });
    console.log('완료');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('verify failed:', e);
  process.exit(1);
});
