#!/usr/bin/env node
// S6: 관리자 alerts 엔드포인트 검증
//   1) auto_pull_alert audit 2건 시뮬 삽입
//   2) GET /alerts → 미확인 카운트 + 항목 정상
//   3) GET /alerts?only_unread=1 → 미확인만
//   4) POST /alerts/ack {id} → 1건 ack 후 unread -1
//   5) POST /alerts/ack {all:true} → 전체 ack
//   6) 다시 GET /alerts?only_unread=1 → 0건
//   7) 정리 — 시뮬 audit 행 삭제

process.env.PORT = process.env.PORT || '3853';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'esys-dev-secret-change-in-production';

const path = require('path');
const http = require('http');
const { db } = require(path.resolve(__dirname, '..', 'src', 'db'));
const { generateToken } = require(path.resolve(__dirname, '..', 'src', 'auth'));

const admin = db.prepare(`SELECT id, email, role FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`).get();
if (!admin) { console.error('admin 계정 없음'); process.exit(1); }
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

async function main() {
  require(path.resolve(__dirname, '..', 'src', 'server'));
  await new Promise(r => setTimeout(r, 1000));

  console.log('──────── 1) 시뮬 auto_pull_alert 2건 삽입 ────────');
  const sim1 = db.prepare(`
    INSERT INTO asset_audit_log (actor, action, meta) VALUES (?, 'auto_pull_alert', ?)
  `).run('auto_pull', JSON.stringify({ counts: { divergent: 1, behind: 0 }, changed: ['divergent: 0→1', '__sim_s6'] }));
  const sim2 = db.prepare(`
    INSERT INTO asset_audit_log (actor, action, meta) VALUES (?, 'auto_pull_alert', ?)
  `).run('auto_pull', JSON.stringify({ counts: { divergent: 2 }, changed: ['divergent: 1→2', '__sim_s6'] }));
  console.log(`✓ 시뮬 id=${sim1.lastInsertRowid}, ${sim2.lastInsertRowid}`);

  console.log('\n──────── 2) GET /alerts ────────');
  const r2 = await req('GET', '/api/admin/assets/alerts?limit=20');
  console.log(`status=${r2.status} total=${r2.json.total} unread=${r2.json.unread}`);
  if (r2.status !== 200) { console.error('FAIL: 200 예상'); process.exit(1); }
  const simItems = r2.json.items.filter(it => (it.changed || []).includes('__sim_s6'));
  if (simItems.length !== 2) { console.error(`FAIL: 시뮬 항목 2건 예상, 실제 ${simItems.length}`); process.exit(1); }
  console.log('✓ 시뮬 2건 반환됨');

  console.log('\n──────── 3) GET /alerts?only_unread=1 ────────');
  const r3 = await req('GET', '/api/admin/assets/alerts?only_unread=1&limit=20');
  console.log(`unread items=${r3.json.items.length}`);
  if (r3.json.items.filter(it => (it.changed || []).includes('__sim_s6')).length !== 2) {
    console.error('FAIL: only_unread 결과에 시뮬 2건 없음'); process.exit(1);
  }
  console.log('✓ only_unread 정상');

  console.log('\n──────── 4) ack 단건 ────────');
  const beforeUnread = r2.json.unread;
  const r4 = await req('POST', '/api/admin/assets/alerts/ack', { id: sim1.lastInsertRowid });
  console.log(`status=${r4.status} acked=${r4.json && r4.json.acked}`);
  if (r4.status !== 200) { console.error('FAIL: ack 실패'); process.exit(1); }
  const r4b = await req('GET', '/api/admin/assets/alerts?limit=20');
  if (r4b.json.unread !== beforeUnread - 1) console.warn(`⚠ unread 카운트 ${beforeUnread} → ${r4b.json.unread} (예상 -1)`);
  const ackedItem = r4b.json.items.find(it => it.id === sim1.lastInsertRowid);
  if (!ackedItem || !ackedItem.acked) { console.error('FAIL: acked=true 아님'); process.exit(1); }
  if (ackedItem.acked_by !== admin.email) console.warn(`⚠ acked_by=${ackedItem.acked_by} (admin 예상)`);
  console.log(`✓ id=${sim1.lastInsertRowid} acked, acked_by=${ackedItem.acked_by}`);

  console.log('\n──────── 5) ack {all:true} ────────');
  const r5 = await req('POST', '/api/admin/assets/alerts/ack', { all: true });
  console.log(`status=${r5.status} acked=${r5.json.acked}`);
  if (r5.status !== 200) { console.error('FAIL'); process.exit(1); }

  console.log('\n──────── 6) only_unread=1 다시 0건 ────────');
  const r6 = await req('GET', '/api/admin/assets/alerts?only_unread=1');
  console.log(`unread items=${r6.json.items.length}, unread total=${r6.json.unread}`);
  if (r6.json.unread !== 0) { console.error('FAIL: 전체 ack 후 unread !== 0'); process.exit(1); }
  console.log('✓ 전체 ack 후 unread = 0');

  console.log('\n──────── 7) 정리 ────────');
  const del = db.prepare(`
    DELETE FROM asset_audit_log
    WHERE action = 'auto_pull_alert' AND json_extract(meta, '$.changed') LIKE '%__sim_s6%'
  `).run();
  console.log(`✓ 시뮬 행 ${del.changes} 삭제`);

  console.log('\n✓ S6 alerts 엔드포인트 전 항목 통과');
  process.exit(0);
}

main().catch(e => { console.error('verify failed:', e); process.exit(1); });
