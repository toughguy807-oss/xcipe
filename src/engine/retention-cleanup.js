// G1: 운영 로그 보존 정리 — activity_log + error_log 자동 삭제
//
// 정책:
//   - activity_log: 기본 90일 (settings.activity_log_retention_days)
//   - error_log:    기본 30일 (settings.error_log_retention_days)
//   - 0 또는 음수면 비활성 (영구 보존)
//   - 부팅 후 60s + 24h 간격으로 실행. 실삭제는 항상 수행 (alarm은 별도)
//
// 안전 기본값: archive-cleanup과 달리 항상 active. 운영 로그는 사이즈 폭주가
// 가장 흔한 실패 모드이며, 보존 의무는 별도 백업(F3 zip)으로 충족된다.
const { db, getSetting } = require('../db');

function _intSetting(key, defaultDays) {
  const v = parseInt(getSetting(key) || String(defaultDays), 10);
  if (Number.isNaN(v) || v < 0) return defaultDays;
  return v;
}

function getRetentionPolicy() {
  return {
    activity_days: _intSetting('activity_log_retention_days', 90),
    error_days:    _intSetting('error_log_retention_days', 30)
  };
}

// 즉시 실행 — 결과: { activity_deleted, error_deleted, duration_ms }
function runRetentionCleanup() {
  const t0 = Date.now();
  const { activity_days, error_days } = getRetentionPolicy();

  let activityDel = 0, errorDel = 0;
  if (activity_days > 0) {
    const r = db.prepare(`DELETE FROM activity_log WHERE created_at < datetime('now', '-${activity_days} days')`).run();
    activityDel = r.changes || 0;
  }
  if (error_days > 0) {
    const r = db.prepare(`DELETE FROM error_log WHERE created_at < datetime('now', '-${error_days} days')`).run();
    errorDel = r.changes || 0;
  }

  return {
    activity_deleted: activityDel,
    error_deleted: errorDel,
    activity_retention_days: activity_days,
    error_retention_days: error_days,
    duration_ms: Date.now() - t0
  };
}

// 일일 잡 — 부팅 60s 후 + 24h 간격
let _interval = null;
function startScheduler() {
  if (_interval) return;
  const tick = () => {
    try {
      const r = runRetentionCleanup();
      if (r.activity_deleted > 0 || r.error_deleted > 0) {
        console.log(`[RETENTION] cleanup: activity=${r.activity_deleted}, errors=${r.error_deleted}, ${r.duration_ms}ms`);
      }
    } catch (e) {
      console.warn('[RETENTION] cleanup error:', e.message);
    }
  };
  setTimeout(tick, 60_000);
  _interval = setInterval(tick, 24 * 3600 * 1000);
}

function stopScheduler() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = { runRetentionCleanup, getRetentionPolicy, startScheduler, stopScheduler };
