#!/usr/bin/env node
// S2 종합 검증 — 별도 포트 부팅 + admin 토큰으로 endpoint 호출
//   1) /summary — 카운트 확인
//   2) /pull    — RUNTIME vs MASTER 비교 → status 갱신
//   3) divergent 1건 골라 /diff (RUNTIME != MASTER 본문 확인)
//   4) /lock    — 비어있음 확인
//   5) /sync (전체 auto-eligible) — behind=0 이라 0건이거나, divergent 1건 /approve 시도
//   6) audit_log 끝 5건 출력

process.env.PORT = process.env.PORT || '3848';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';

const path = require('path');
const http = require('http');
const { db } = require(path.resolve(__dirname, '..', 'src', 'db'));
const { generateToken } = require(path.resolve(__dirname, '..', 'src', 'auth'));

// ──────────── 토큰 발급 ────────────
const admin = db.prepare(`SELECT id, email, role FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`).get();
if (!admin) { console.error('admin user not found'); process.exit(1); }
const token = generateToken(admin);
console.log(`[verify] admin = ${admin.email}, token = ${token.slice(0, 20)}...`);

// ──────────── HTTP 클라이언트 ────────────
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
        try {
          resolve({ status: res.statusCode, json: JSON.parse(buf || 'null') });
        } catch {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ──────────── 서버 부팅 ────────────
async function boot() {
  // src/server.js 는 require 시점에 자체 app.listen(PORT) 호출 (PORT 환경변수 사용)
  require(path.resolve(__dirname, '..', 'src', 'server'));
  // listen 콜백이 비동기적이라 1초 대기
  await new Promise(r => setTimeout(r, 1000));
}

async function close() {
  // server.js 가 직접 listen 하므로 process.exit 으로 종료
}

// ──────────── 검증 시퀀스 ────────────
async function main() {
  await boot();

  console.log('\n──────── 1) /summary ────────');
  let r = await req('GET', '/api/admin/assets/summary');
  console.log(JSON.stringify(r.json, null, 2));

  console.log('\n──────── 2) /pull ────────');
  r = await req('POST', '/api/admin/assets/pull', {});
  console.log(JSON.stringify(r.json, null, 2));

  console.log('\n──────── 3) /summary (after pull) ────────');
  r = await req('GET', '/api/admin/assets/summary');
  console.log(JSON.stringify(r.json, null, 2));

  // divergent 한 건 찾기
  console.log('\n──────── 4) divergent 1건 ────────');
  r = await req('GET', '/api/admin/assets/manifest?status=divergent&limit=3');
  console.log(JSON.stringify(r.json, null, 2));
  const divPath = r.json.items && r.json.items[0] && r.json.items[0].path;

  if (divPath) {
    console.log(`\n──────── 5) /diff path=${divPath} ────────`);
    r = await req('GET', `/api/admin/assets/diff?path=${encodeURIComponent(divPath)}`);
    if (r.json.runtimeText && r.json.masterText) {
      console.log(`runtimeText length = ${r.json.runtimeText.length}, masterText length = ${r.json.masterText.length}`);
      console.log(`동일? ${r.json.runtimeText === r.json.masterText}`);
      console.log(`master src pkg = ${r.json.masterSourcePkg}`);
    } else {
      console.log('runtime/master 한쪽 없음');
      console.log(JSON.stringify({ runtimeText_null: r.json.runtimeText == null, masterText_null: r.json.masterText == null }));
    }
  } else {
    console.log('divergent 자산 없음');
  }

  console.log('\n──────── 6) /lock ────────');
  r = await req('GET', '/api/admin/assets/lock');
  console.log(JSON.stringify(r.json, null, 2));

  console.log('\n──────── 7) /sync (전체 auto-eligible) ────────');
  r = await req('POST', '/api/admin/assets/sync', {});
  console.log(`status=${r.status}, total=${r.json && r.json.total}, results 수=${r.json && r.json.results && r.json.results.length}`);
  if (r.json && r.json.results && r.json.results.length) {
    console.log('첫 3건:', JSON.stringify(r.json.results.slice(0, 3), null, 2));
  }

  console.log('\n──────── 8) /lock (sync 후) ────────');
  r = await req('GET', '/api/admin/assets/lock');
  console.log(JSON.stringify(r.json, null, 2));

  console.log('\n──────── 9) audit_log 최신 8건 ────────');
  r = await req('GET', '/api/admin/assets/audit?limit=8');
  console.log(JSON.stringify(r.json, null, 2));

  await close();
  console.log('\n✓ S2 검증 완료');
  process.exit(0);
}

main().catch(e => {
  console.error('verify failed:', e);
  close().finally(() => process.exit(1));
});
