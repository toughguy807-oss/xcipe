// Unit — PR1-C2: artifacts.thinking_text + thinking_budget 마이그레이션 (v15)
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('../helpers/setup');

setupTestDb();
const { db } = require('../../src/db');

test('artifacts.thinking_text 컬럼 존재 (v15 migration)', () => {
  const cols = db.pragma('table_info(artifacts)');
  const hasThinking = cols.some(c => c.name === 'thinking_text');
  const hasBudget = cols.some(c => c.name === 'thinking_budget');
  assert.ok(hasThinking, 'artifacts.thinking_text 컬럼이 있어야 함');
  assert.ok(hasBudget, 'artifacts.thinking_budget 컬럼이 있어야 함');
});

test('user_version >= 14 (v15 migration 적용 후)', () => {
  const v = db.pragma('user_version', { simple: true });
  assert.ok(v >= 14, `user_version=${v} (expected >=14)`);
});

test('artifacts.thinking_text 에 INSERT/SELECT 가능', () => {
  // 외래키 우회 위해 임시 project 1건 생성
  const projectId = db.prepare(`
    INSERT INTO projects (name, code, type, completion_level)
    VALUES ('thinking-test', 'TEST_THINK', 'web', 1)
  `).run().lastInsertRowid;
  const artifactId = db.prepare(`
    INSERT INTO artifacts (project_id, type, version, file_path, file_name, thinking_text, thinking_budget)
    VALUES (?, 'plan-sb', 'v1.0', '/tmp/x.md', 'x.md', '추론 단계 1...추론 단계 2...', 32000)
  `).run(projectId).lastInsertRowid;
  const row = db.prepare('SELECT thinking_text, thinking_budget FROM artifacts WHERE id = ?').get(artifactId);
  assert.ok(row.thinking_text.includes('추론 단계'));
  assert.equal(row.thinking_budget, 32000);
});
