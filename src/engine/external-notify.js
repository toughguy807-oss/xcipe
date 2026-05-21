// U-G10: 외부 알림 — 슬랙 webhook + (옵션) SMTP
//   HITL 게이트 도달, 파이프라인 완료/실패 시 외부로 푸시
//   설정 키:
//     notify_slack_webhook_url   — 빈값이면 비활성
//     notify_smtp_url            — nodemailer URL (smtp://user:pass@host:port). 빈값=비활성
//     notify_email_to            — 수신 주소 (콤마 구분). 빈값=비활성
//     notify_email_from          — 발신 주소
//     notify_on_hitl             — '1' 기본 — HITL_REQUIRED/RECOMMENDED 시 발송
//     notify_on_pipeline_done    — '1' 기본 — 파이프라인 완료 시 발송
//     notify_on_pipeline_failed  — '1' 기본 — 파이프라인 실패 시 발송
//
//   알림 호출은 fire-and-forget (await 안 함). 발송 실패는 error_log에만 기록.

const { getSetting } = require('../db');

const TIMEOUT_MS = 5000;

function isEnabled(key, defaultOn = true) {
  const v = getSetting(key);
  if (v === null || v === undefined) return defaultOn;
  return v === '1' || v === 'true';
}

async function postJson(url, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    return { ok: true };
  } finally {
    clearTimeout(t);
  }
}

async function notifySlack(text) {
  const url = (getSetting('notify_slack_webhook_url') || '').trim();
  if (!url) return { ok: false, skipped: 'no_webhook' };
  return postJson(url, { text });
}

async function notifyEmail(subject, text) {
  const smtpUrl = (getSetting('notify_smtp_url') || '').trim();
  const to = (getSetting('notify_email_to') || '').trim();
  const from = (getSetting('notify_email_from') || '').trim();
  if (!smtpUrl || !to || !from) return { ok: false, skipped: 'incomplete_smtp' };
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    return { ok: false, skipped: 'nodemailer_not_installed' };
  }
  const transporter = nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({
    from,
    to: to.split(',').map(s => s.trim()).filter(Boolean),
    subject,
    text
  });
  return { ok: true };
}

function logFailure(scope, err) {
  try {
    const { db } = require('../db');
    db.prepare(`
      INSERT INTO error_log (category, message, stack, created_at)
      VALUES ('external-notify', ?, ?, datetime('now'))
    `).run(`${scope}: ${err && err.message || String(err)}`, err && err.stack || '');
  } catch { /* swallow */ }
}

// HITL 게이트 도달 시
async function notifyHitlGate({ project, step, gate, score, reason, baseUrl }) {
  if (!isEnabled('notify_on_hitl', true)) return;
  if (!gate || (gate !== 'HITL_REQUIRED' && gate !== 'HITL_RECOMMENDED')) return;
  const urgency = gate === 'HITL_REQUIRED' ? '🛑 검토 필수' : '⚠ 검토 권고';
  const link = baseUrl ? `${baseUrl}/#/projects/${project.id}` : `(/projects/${project.id})`;
  const text =
    `${urgency} — *${project.name}* (${project.code})\n` +
    `단계: \`${step.step}\` · 점수 ${score ?? '?'}점\n` +
    (reason ? `사유: ${reason.slice(0, 300)}\n` : '') +
    `링크: ${link}`;
  // fire-and-forget
  Promise.allSettled([
    notifySlack(text).catch(e => logFailure('slack/hitl', e)),
    notifyEmail(`[ELUO] ${urgency} ${project.code} ${step.step}`, text).catch(e => logFailure('email/hitl', e))
  ]);
}

async function notifyPipelineFinal({ project, status, summary, baseUrl }) {
  const success = status === 'completed';
  if (success && !isEnabled('notify_on_pipeline_done', true)) return;
  if (!success && !isEnabled('notify_on_pipeline_failed', true)) return;
  const icon = success ? '✅ 파이프라인 완료' : '❌ 파이프라인 실패';
  const link = baseUrl ? `${baseUrl}/#/projects/${project.id}` : `(/projects/${project.id})`;
  const text =
    `${icon} — *${project.name}* (${project.code})\n` +
    (summary ? `${summary}\n` : '') +
    `링크: ${link}`;
  Promise.allSettled([
    notifySlack(text).catch(e => logFailure('slack/final', e)),
    notifyEmail(`[ELUO] ${icon} ${project.code}`, text).catch(e => logFailure('email/final', e))
  ]);
}

// admin 헬스체크용
async function testNotify() {
  const text = `[ELUO XCIPE v4] 외부 알림 테스트 — ${new Date().toISOString()}`;
  const slackUrl = (getSetting('notify_slack_webhook_url') || '').trim();
  const smtpUrl = (getSetting('notify_smtp_url') || '').trim();
  const emailTo = (getSetting('notify_email_to') || '').trim();
  const result = { slack: null, email: null };
  if (slackUrl) {
    try { await notifySlack(text); result.slack = { ok: true }; }
    catch (e) { result.slack = { ok: false, error: e.message }; }
  } else {
    result.slack = { ok: false, skipped: '미설정' };
  }
  if (smtpUrl && emailTo) {
    try { await notifyEmail('[ELUO] 외부 알림 테스트', text); result.email = { ok: true }; }
    catch (e) { result.email = { ok: false, error: e.message }; }
  } else {
    result.email = { ok: false, skipped: '미설정' };
  }
  return result;
}

module.exports = {
  notifyHitlGate,
  notifyPipelineFinal,
  testNotify,
  notifySlack,
  notifyEmail
};
