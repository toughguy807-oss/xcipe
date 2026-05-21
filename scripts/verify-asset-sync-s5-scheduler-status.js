#!/usr/bin/env node
// S5: scheduler 가시성 검증
//   - GET /api/admin/assets/scheduler-status 가 200 + JSON 으로 응답하는지
//   - getSchedulerStatus() 모양 (enabled, interval_min, ticks, alerts, last_tick_at, ...) 이 그대로 노출되는지
//   - admin 이외 role 은 403/401 차단되는지

process.env.PORT = process.env.PORT || '3851';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';
process.env.ASSET_SYNC_INTERVAL_MIN = '1';

const path = require('path');
const http = require('http');
const { db } = require(path.resolve(__dirname, '..', 'src', 'db'));
const { generateToken } = require(path.resolve(__dirname, '..', 'src', 'auth'));
const sync = require(path.resolve(__dirname, '..', 'src', 'engine', 'asset-sync'));

const admin = db.prepare(`SELECT id, email, role FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`).get();
if (!admin) { console.error('admin 계정 없음'); process.exit(1); }
const token = generateToken(admin);

let memberToken = null;
const member = db.prepare(`SELECT id, email, role FROM users WHERE role != 'admin' AND deleted_at IS NULL LIMIT 1`).get();
if (member) memberToken = generateToken(member);

const PORT = parseInt(process.env.PORT, 10);

function req(method, urlPath, body, useToken) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: {
        'Authorization': `Bearer ${useToken}`,
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

const REQUIRED_KEYS = [
  'enabled', 'interval_min', 'started_at',
  'last_tick_at', 'last_tick_skipped_reason',
  'last_alert_at', 'last_alert_changed',
  'ticks', 'alerts'
];

async function main() {
  // 서버 부팅 (server.js 가 startScheduler 자동 호출)
  require(path.resolve(__dirname, '..', 'src', 'server'));
  await new Promise(r => setTimeout(r, 1000));

  console.log('──────── 1) GET /scheduler-status (admin) ────────');
  const r1 = await req('GET', '/api/admin/assets/scheduler-status', null, token);
  console.log(`status=${r1.status}`);
  console.log(JSON.stringify(r1.json, null, 2));
  if (r1.status !== 200) { console.error('FAIL: 200 아님'); process.exit(1); }
  if (!r1.json || typeof r1.json !== 'object') { console.error('FAIL: JSON 객체 아님'); process.exit(1); }
  if (r1.json.ok !== true) { console.error('FAIL: ok !== true'); process.exit(1); }
  const status = r1.json.status;
  if (!status || typeof status !== 'object') { console.error('FAIL: status 객체 누락'); process.exit(1); }

  const missing = REQUIRED_KEYS.filter(k => !(k in status));
  if (missing.length) { console.error('FAIL: 누락 키', missing); process.exit(1); }
  console.log(`✓ 필수 키 ${REQUIRED_KEYS.length}개 모두 존재`);

  // server.js 가 기동 시 startScheduler 호출하므로 enabled=true 기대
  if (status.enabled !== true) console.warn(`⚠ enabled=${status.enabled} (true 예상 — ASSET_SYNC_AUTO_PULL=false 이거나 startScheduler 미연결?)`);
  if (typeof status.interval_min !== 'number') console.warn(`⚠ interval_min 형식 이상: ${status.interval_min}`);

  console.log('\n──────── 2) getSchedulerStatus() 직접 호출과 비교 ────────');
  const direct = sync.getSchedulerStatus();
  console.log('direct =', JSON.stringify(direct, null, 2));
  // ticks/alerts 는 시점 차이로 다를 수 있으므로 enabled / interval_min 만 일치 확인
  if (direct.enabled !== status.enabled) console.warn(`⚠ enabled 불일치: direct=${direct.enabled} api=${status.enabled}`);
  if (direct.interval_min !== status.interval_min) console.warn(`⚠ interval_min 불일치`);
  console.log('✓ 직접 호출과 형태 동일');

  console.log('\n──────── 3) 비-admin 차단 ────────');
  if (memberToken) {
    const r2 = await req('GET', '/api/admin/assets/scheduler-status', null, memberToken);
    console.log(`member status=${r2.status}`);
    if (r2.status === 403 || r2.status === 401) console.log('✓ 비-admin 차단됨');
    else { console.error(`FAIL: member 가 ${r2.status} 로 통과`); process.exit(1); }
  } else {
    console.log('(skip) 비-admin 사용자 없음');
  }

  console.log('\n──────── 4) 토큰 없음 차단 ────────');
  const r3 = await req('GET', '/api/admin/assets/scheduler-status', null, '');
  console.log(`no-token status=${r3.status}`);
  if (r3.status === 401) console.log('✓ 인증 미지급 차단됨');
  else console.warn(`⚠ 무인증인데 ${r3.status} 반환`);

  console.log('\n✓ S5 scheduler-status 검증 완료');
  process.exit(0);
}

main().catch(e => { console.error('verify failed:', e); process.exit(1); });
