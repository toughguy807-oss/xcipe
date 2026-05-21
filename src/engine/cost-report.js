// G4: 토큰 비용 일일 리포트 — token_usage 24h 집계
//
// 출력 단위 (각 일별):
//   total: { calls, input_tokens, output_tokens, cost_usd }
//   by_project: [{ project_id, code, name, calls, input_tokens, output_tokens, cost_usd }]
//   by_model:   [{ model, calls, input_tokens, output_tokens, cost_usd }]
//   by_skill:   [{ skill_name, calls, input_tokens, output_tokens, cost_usd }]
//
// 스케줄러:
//   부팅 후 5분 + 24h 간격으로 어제 날짜 리포트 생성 → activity_log 'daily_cost_report'
//   비용 한도 임계 초과 시 critical 활동 추가 (cost-alert와 별개 채널)
//   디바운스: settings 'last_daily_cost_report_date' 와 비교, 같은 날짜 재실행 금지
const { db, logActivity, logError, getSetting, setSetting } = require('../db');

// date: 'YYYY-MM-DD' (생략 시 오늘 — localtime)
function generateDailyReport(date = null) {
  const day = date || db.prepare(`SELECT DATE('now', 'localtime') AS d`).get().d;

  const totalRow = db.prepare(`
    SELECT
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage
    WHERE DATE(created_at, 'localtime') = ?
  `).get(day);

  const byProject = db.prepare(`
    SELECT
      tu.project_id,
      p.code,
      p.name,
      COUNT(*) AS calls,
      COALESCE(SUM(tu.input_tokens), 0) AS input_tokens,
      COALESCE(SUM(tu.output_tokens), 0) AS output_tokens,
      COALESCE(SUM(tu.cost_usd), 0) AS cost_usd
    FROM token_usage tu
    LEFT JOIN projects p ON p.id = tu.project_id
    WHERE DATE(tu.created_at, 'localtime') = ?
    GROUP BY tu.project_id
    ORDER BY cost_usd DESC
  `).all(day);

  const byModel = db.prepare(`
    SELECT
      COALESCE(model, 'unknown') AS model,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage
    WHERE DATE(created_at, 'localtime') = ?
    GROUP BY model
    ORDER BY cost_usd DESC
  `).all(day);

  const bySkill = db.prepare(`
    SELECT
      COALESCE(skill_name, 'unknown') AS skill_name,
      COUNT(*) AS calls,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM token_usage
    WHERE DATE(created_at, 'localtime') = ?
    GROUP BY skill_name
    ORDER BY cost_usd DESC
  `).all(day);

  return {
    date: day,
    total: {
      calls: totalRow.calls,
      input_tokens: totalRow.input_tokens,
      output_tokens: totalRow.output_tokens,
      cost_usd: Number(totalRow.cost_usd.toFixed(6))
    },
    by_project: byProject.map(r => ({ ...r, cost_usd: Number(r.cost_usd.toFixed(6)) })),
    by_model: byModel.map(r => ({ ...r, cost_usd: Number(r.cost_usd.toFixed(6)) })),
    by_skill: bySkill.map(r => ({ ...r, cost_usd: Number(r.cost_usd.toFixed(6)) }))
  };
}

// 어제 날짜 (localtime, YYYY-MM-DD)
function yesterdayDate() {
  return db.prepare(`SELECT DATE('now', '-1 day', 'localtime') AS d`).get().d;
}

// 디바운스 + activity_log 기록
function runDailyReport(date = null) {
  const day = date || yesterdayDate();
  const last = getSetting('last_daily_cost_report_date');
  if (last === day) {
    return { skipped: 'already_reported', date: day };
  }
  const r = generateDailyReport(day);
  const summary = `${day} 비용 리포트: $${r.total.cost_usd.toFixed(4)} ` +
    `(호출 ${r.total.calls}건, in ${r.total.input_tokens.toLocaleString()} / out ${r.total.output_tokens.toLocaleString()} tokens) ` +
    `· 상위 프로젝트 ${r.by_project[0]?.code || '-'} · 상위 모델 ${r.by_model[0]?.model || '-'}`;
  try {
    // detail에는 사람이 읽을 한 줄 + JSON 메타데이터를 함께 (UI에서 prefix 분리 가능)
    const meta = JSON.stringify({
      date: r.date,
      total: r.total,
      top_project: r.by_project[0] || null,
      top_model: r.by_model[0] || null,
      top_skill: r.by_skill[0] || null
    });
    logActivity('system', null, 'daily_cost_report', `${summary} :: ${meta}`, null);
  } catch (e) {
    try { logError({ source: 'cost-report', code: 'ESYS-COST-RPT', message: e.message }); } catch {}
  }
  setSetting('last_daily_cost_report_date', day);
  return { ...r, summary };
}

let _interval = null;
function startScheduler() {
  if (_interval) return;
  const tick = () => {
    try {
      runDailyReport();
    } catch (e) {
      try { logError({ source: 'cost-report', code: 'ESYS-COST-SCH', message: e.message }); } catch {}
    }
  };
  setTimeout(tick, 5 * 60 * 1000);
  _interval = setInterval(tick, 24 * 3600 * 1000);
}

function stopScheduler() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = { generateDailyReport, runDailyReport, yesterdayDate, startScheduler, stopScheduler };
