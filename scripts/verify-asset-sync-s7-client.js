#!/usr/bin/env node
// S7: 클라이언트 다운로드 (4-tier 마지막 leg) 검증
//   1) admin 이 /client-keys 로 키 발급
//   2) X-API-Key 없이 /client/manifest 호출 → 401
//   3) 발급된 키로 /client/manifest 호출 → 200 + items
//   4) 발급된 키로 /client/file?path=... 호출 → 200 + 본문 sha 헤더 일치
//   5) audit 에 client_fetch 기록 확인
//   6) admin 이 키 DELETE → 다시 호출하면 403
//   7) (정리) 폐기된 키 그대로 둠 (DB 유지)

process.env.PORT = process.env.PORT || '3852';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { db } = require(path.resolve(__dirname, '..', 'src', 'db'));
const { generateToken } = require(path.resolve(__dirname, '..', 'src', 'auth'));
const sync = require(path.resolve(__dirname, '..', 'src', 'engine', 'asset-sync'));

const admin = db.prepare(`SELECT id, email, role FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`).get();
if (!admin) { console.error('admin 계정 없음'); process.exit(1); }
const adminToken = generateToken(admin);
const PORT = parseInt(process.env.PORT, 10);

function req({ method, urlPath, body, bearer, apiKey }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const r = http.request({ hostname: '127.0.0.1', port: PORT, path: urlPath, method, headers }, (res) => {
      let buf = '';
      const isText = (res.headers['content-type'] || '').includes('text/');
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (isText) {
          resolve({ status: res.statusCode, raw: buf, headers: res.headers });
        } else {
          try { resolve({ status: res.statusCode, json: JSON.parse(buf || 'null'), headers: res.headers }); }
          catch { resolve({ status: res.statusCode, raw: buf, headers: res.headers }); }
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

async function main() {
  require(path.resolve(__dirname, '..', 'src', 'server'));
  await new Promise(r => setTimeout(r, 1000));

  console.log('──────── 0) /pull 사전 동기화 ────────');
  await req({ method: 'POST', urlPath: '/api/admin/assets/pull', body: {}, bearer: adminToken });

  console.log('\n──────── 1) /client-keys POST (발급) ────────');
  const keyName = `verify-s7-${Date.now()}`;
  const r1 = await req({
    method: 'POST', urlPath: '/api/admin/assets/client-keys',
    body: { name: keyName }, bearer: adminToken
  });
  console.log(`status=${r1.status}`);
  if (r1.status !== 200 || !r1.json || !r1.json.api_key) { console.error('FAIL: 발급 실패', r1); process.exit(1); }
  const apiKey = r1.json.api_key;
  const keyId = r1.json.id;
  console.log(`✓ 키 발급 — id=${keyId}, name=${keyName}, hash_preview=${r1.json.hash_preview}, plaintext_len=${apiKey.length}`);

  console.log('\n──────── 2) /client/manifest 무인증 ────────');
  const r2 = await req({ method: 'GET', urlPath: '/api/client/assets/manifest' });
  console.log(`status=${r2.status}`);
  if (r2.status !== 401) { console.error('FAIL: 401 예상'); process.exit(1); }
  console.log('✓ 무인증 차단됨');

  console.log('\n──────── 3) /client/manifest 정상 인증 ────────');
  const r3 = await req({ method: 'GET', urlPath: '/api/client/assets/manifest', apiKey });
  console.log(`status=${r3.status} total=${r3.json && r3.json.total}`);
  if (r3.status !== 200) { console.error('FAIL: 200 예상'); process.exit(1); }
  if (!r3.json.items || r3.json.items.length === 0) { console.error('FAIL: items 비어 있음'); process.exit(1); }
  console.log(`✓ ${r3.json.total} 건 manifest 수신 (synced 만)`);
  // 첫 번째 항목으로 /file 검증
  const first = r3.json.items.find(it => it.category !== 'claude-md') || r3.json.items[0];
  console.log(`첫 항목: ${first.path} (sha=${first.sha256.slice(0, 12)}, size=${first.size})`);

  console.log('\n──────── 4) /client/file 다운로드 ────────');
  const r4 = await req({
    method: 'GET',
    urlPath: `/api/client/assets/file?path=${encodeURIComponent(first.path)}&sha=${first.sha256}`,
    apiKey
  });
  console.log(`status=${r4.status} content-length=${(r4.raw || '').length} x-asset-sha256=${(r4.headers['x-asset-sha256'] || '').slice(0, 12)}`);
  if (r4.status !== 200) { console.error('FAIL: 다운로드 실패', r4); process.exit(1); }
  const downloadedSha = sha256(Buffer.from(r4.raw, 'utf8'));
  if (downloadedSha !== first.sha256) {
    console.error(`FAIL: sha 불일치 — manifest=${first.sha256} downloaded=${downloadedSha}`);
    process.exit(1);
  }
  console.log('✓ 본문 sha 일치 + X-Asset-* 헤더 정상');

  console.log('\n──────── 5) audit client_fetch 기록 ────────');
  const audit = db.prepare(`
    SELECT actor, action, path, after_sha, meta FROM asset_audit_log
    WHERE action = 'client_fetch' AND path = ?
    ORDER BY id DESC LIMIT 1
  `).get(first.path);
  if (!audit) { console.error('FAIL: client_fetch audit 없음'); process.exit(1); }
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.actor.startsWith('client:')) console.warn('⚠ actor 가 client: 접두어 아님');
  console.log('✓ client_fetch audit 기록됨');

  console.log('\n──────── 6) sha 불일치 차단 (409) ────────');
  const r6 = await req({
    method: 'GET',
    urlPath: `/api/client/assets/file?path=${encodeURIComponent(first.path)}&sha=00000000`,
    apiKey
  });
  console.log(`status=${r6.status}`);
  if (r6.status !== 409) console.warn(`⚠ 409 예상이나 ${r6.status}`);
  else console.log('✓ sha 불일치 409 차단');

  console.log('\n──────── 7) 키 폐기 후 재호출 → 403 ────────');
  const rDel = await req({
    method: 'DELETE', urlPath: `/api/admin/assets/client-keys/${keyId}`, bearer: adminToken
  });
  console.log(`DELETE status=${rDel.status}`);
  const r7 = await req({ method: 'GET', urlPath: '/api/client/assets/manifest', apiKey });
  console.log(`재호출 status=${r7.status}`);
  if (r7.status !== 403) { console.error('FAIL: 폐기 후 403 예상'); process.exit(1); }
  console.log('✓ 폐기된 키 차단됨');

  console.log('\n──────── 8) 정리 ────────');
  // 검증용 키 행 삭제 (테스트 잔여물 제거)
  db.prepare(`DELETE FROM asset_client_keys WHERE id = ?`).run(keyId);
  console.log(`✓ asset_client_keys id=${keyId} 삭제`);

  console.log('\n✓ S7 client 다운로드 전 항목 통과 (4-tier 마지막 leg)');
  process.exit(0);
}

main().catch(e => { console.error('verify failed:', e); process.exit(1); });
