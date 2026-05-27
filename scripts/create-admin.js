#!/usr/bin/env node
// Admin 계정 upsert — 있으면 비밀번호 갱신, 없으면 신규 생성
//
// 사용:
//   node scripts/create-admin.js                              # 기본 2개 (admin@eluocnc.com, dg.an@eluocnc.com)
//   node scripts/create-admin.js <email> <password> [name]    # 단일 계정 지정
//
// Railway 실행:
//   railway run node scripts/create-admin.js
//   (또는 컨테이너 shell에서 동일 명령)

const { db } = require('../src/db');
const { hashPassword } = require('../src/auth');

const DEFAULT_ACCOUNTS = [
  { email: 'admin@eluocnc.com', password: 'admin1234', name: 'Admin', role: 'admin' },
  { email: 'dg.an@eluocnc.com', password: 'admin1234', name: 'dg.an',  role: 'admin' },
];

function upsertAdmin({ email, password, name, role }) {
  const hash = hashPassword(password);
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, name = COALESCE(?, name) WHERE email = ?')
      .run(hash, role, name, email);
    return { action: 'updated', id: existing.id, email, prevRole: existing.role, role };
  }
  const result = db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(email, name, hash, role);
  return { action: 'created', id: result.lastInsertRowid, email, role };
}

const argv = process.argv.slice(2);
const accounts = argv.length >= 2
  ? [{ email: argv[0], password: argv[1], name: argv[2] || argv[0].split('@')[0], role: 'admin' }]
  : DEFAULT_ACCOUNTS;

console.log(`[create-admin] DB: ${process.env.DB_PATH || 'data/eluo.db'}`);
for (const acc of accounts) {
  try {
    const r = upsertAdmin(acc);
    console.log(`  ${r.action === 'created' ? '✓ 신규' : '↻ 갱신'}  ${r.email}  (id=${r.id}, role=${r.role})`);
  } catch (err) {
    console.error(`  ✗ 실패  ${acc.email}: ${err.message}`);
    process.exitCode = 1;
  }
}
