// Unit — G4: 일일 토큰 비용 리포트
//
// 검증:
//  1) 데이터 없음 → total.cost_usd=0, by_*=[], date 정상
//  2) 다중 호출 적재 → total/by_project/by_model/by_skill 합계 일치
//  3) 다른 날짜 데이터는 제외 (DATE(created_at, 'localtime') 매칭)
//  4) runDailyReport: activity_log 'daily_cost_report' + last_daily_cost_report_date setting 갱신
//  5) runDailyReport: 같은 날짜 두 번째 호출 → skipped='already_reported'
const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');
setupTestDb();

const { db, recordTokenUsage, getSetting, setSetting } = require('../../src/db');
const cost = require('../../src/engine/cost-report');

// 테스트 격리: token_usage / activity_log / settings 초기화
function resetState() {
  db.prepare('DELETE FROM token_usage').run();
  db.prepare(`DELETE FROM activity_log WHERE action='daily_cost_report'`).run();
  db.prepare(`DELETE FROM settings WHERE key='last_daily_cost_report_date'`).run();
}

test('빈 데이터 — total=0, by_*=[]', () => {
  resetState();
  const r = cost.generateDailyReport();
  assert.equal(r.total.calls, 0);
  assert.equal(r.total.cost_usd, 0);
  assert.deepEqual(r.by_project, []);
  assert.deepEqual(r.by_model, []);
  assert.deepEqual(r.by_skill, []);
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('집계 — by_project/by_model/by_skill 합계 일치', () => {
  resetState();
  // 프로젝트 2개 생성
  const p1 = db.prepare(`INSERT INTO projects (code, name, status) VALUES ('PRJ-A', 'A', 'active')`).run().lastInsertRowid;
  const p2 = db.prepare(`INSERT INTO projects (code, name, status) VALUES ('PRJ-B', 'B', 'active')`).run().lastInsertRowid;

  recordTokenUsage({ projectId: p1, skillName: 'plan-qst', model: 'claude-opus-4-7', inputTokens: 1000, outputTokens: 500 });
  recordTokenUsage({ projectId: p1, skillName: 'plan-fn',  model: 'claude-sonnet-4-6', inputTokens: 2000, outputTokens: 800 });
  recordTokenUsage({ projectId: p2, skillName: 'plan-qst', model: 'claude-opus-4-7', inputTokens: 500, outputTokens: 200 });

  const r = cost.generateDailyReport();
  assert.equal(r.total.calls, 3);
  assert.equal(r.total.input_tokens, 3500);
  assert.equal(r.total.output_tokens, 1500);
  assert.ok(r.total.cost_usd > 0, `cost_usd > 0 (실제: ${r.total.cost_usd})`);

  // 그룹 합계 = 전체 합계
  const projSum = r.by_project.reduce((s, x) => s + x.cost_usd, 0);
  const modelSum = r.by_model.reduce((s, x) => s + x.cost_usd, 0);
  const skillSum = r.by_skill.reduce((s, x) => s + x.cost_usd, 0);
  assert.ok(Math.abs(projSum - r.total.cost_usd) < 1e-4);
  assert.ok(Math.abs(modelSum - r.total.cost_usd) < 1e-4);
  assert.ok(Math.abs(skillSum - r.total.cost_usd) < 1e-4);

  // by_project 항목 검증 — 코드/호출수
  const a = r.by_project.find(x => x.code === 'PRJ-A');
  const b = r.by_project.find(x => x.code === 'PRJ-B');
  assert.equal(a.calls, 2);
  assert.equal(b.calls, 1);
  assert.equal(a.input_tokens, 3000);

  // by_skill: plan-qst가 2건, plan-fn이 1건
  const qst = r.by_skill.find(x => x.skill_name === 'plan-qst');
  const fn = r.by_skill.find(x => x.skill_name === 'plan-fn');
  assert.equal(qst.calls, 2);
  assert.equal(fn.calls, 1);

  // by_model: 정렬 — cost_usd DESC
  for (let i = 1; i < r.by_model.length; i++) {
    assert.ok(r.by_model[i - 1].cost_usd >= r.by_model[i].cost_usd);
  }
});

test('다른 날짜 데이터는 제외', () => {
  resetState();
  const p1 = db.prepare(`INSERT INTO projects (code, name, status) VALUES ('PRJ-C', 'C', 'active')`).run().lastInsertRowid;
  // 어제 날짜로 직접 INSERT (recordTokenUsage는 datetime('now') 기본)
  db.prepare(`
    INSERT INTO token_usage (project_id, skill_name, model, input_tokens, output_tokens, cost_usd, created_at)
    VALUES (?, 'plan-qst', 'claude-opus-4-7', 100, 50, 0.01, datetime('now', '-2 days'))
  `).run(p1);
  // 오늘 1건
  recordTokenUsage({ projectId: p1, skillName: 'plan-qst', model: 'claude-opus-4-7', inputTokens: 200, outputTokens: 100 });

  const r = cost.generateDailyReport();
  assert.equal(r.total.calls, 1, '오늘만 카운트되어야 함');
  assert.equal(r.total.input_tokens, 200);
});

test('runDailyReport — activity_log + last_date setting 갱신', () => {
  resetState();
  const p1 = db.prepare(`INSERT INTO projects (code, name, status) VALUES ('PRJ-D', 'D', 'active')`).run().lastInsertRowid;
  // 어제 날짜 정오 (localtime 기준)로 INSERT — yesterdayDate()와 매칭되도록
  const ymd = cost.yesterdayDate(); // 'YYYY-MM-DD' (localtime 어제)
  db.prepare(`
    INSERT INTO token_usage (project_id, skill_name, model, input_tokens, output_tokens, cost_usd, created_at)
    VALUES (?, 'plan-qst', 'claude-opus-4-7', 1000, 500, 0.05, ?)
  `).run(p1, `${ymd} 12:00:00`);

  const r = cost.runDailyReport();
  assert.ok(r.summary, 'summary 있어야 함');
  assert.equal(r.total.calls, 1);

  // activity_log에 기록되었는지
  const row = db.prepare(`SELECT * FROM activity_log WHERE action='daily_cost_report' ORDER BY id DESC LIMIT 1`).get();
  assert.ok(row, 'activity_log에 daily_cost_report 기록 필요');
  assert.match(row.detail || '', /비용 리포트/);

  // setting 갱신
  const last = getSetting('last_daily_cost_report_date');
  assert.equal(last, r.date);
});

test('runDailyReport — 디바운스 (같은 날짜 두 번째 호출 → skipped)', () => {
  resetState();
  const yesterday = cost.yesterdayDate();
  setSetting('last_daily_cost_report_date', yesterday);

  const r = cost.runDailyReport();
  assert.equal(r.skipped, 'already_reported');
  assert.equal(r.date, yesterday);

  // activity_log에 기록 X
  const cnt = db.prepare(`SELECT COUNT(*) AS c FROM activity_log WHERE action='daily_cost_report'`).get().c;
  assert.equal(cnt, 0);
});

test.after(() => cleanupTestDb());
