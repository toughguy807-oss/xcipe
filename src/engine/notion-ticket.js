// S6: Notion 티켓 자동 생성 — asset-sync 의 divergent/major-bump 감지 시
//
// 환경/설정:
//   NOTION_API_KEY (env)                  — Notion Integration secret (필수)
//   notion_asset_database_id (settings)   — 티켓이 들어갈 Notion DB id
//   notion_asset_ticket_enabled (settings, default '1')
//   notion_asset_ticket_dedup_min (settings, default 60) — 중복 방지 윈도우 (분)
//
// Notion DB 가 가져야 할 속성 (이름 기준):
//   - Name (title)            : 티켓 제목
//   - Status (status)         : 'New' (없어도 동작)
//   - Source (rich_text)      : 'asset-sync'
//   - AlertHash (rich_text)   : 중복 dedup 용 sha 8자
//
// 모든 호출은 fire-and-forget — 실패는 error_log 에만 적재, 자산 동기화 흐름 차단 X

const crypto = require('crypto');
const { getSetting, db } = require('../db');

const TIMEOUT_MS = 8000;
const NOTION_VERSION = '2022-06-28';

function isEnabled() {
  const v = getSetting('notion_asset_ticket_enabled');
  if (v === null || v === undefined) return true;
  return v === '1' || v === 'true';
}

function logFailure(scope, err) {
  try {
    db.prepare(`
      INSERT INTO error_log (category, message, stack, created_at)
      VALUES ('notion-ticket', ?, ?, datetime('now'))
    `).run(`${scope}: ${err && err.message || String(err)}`, err && err.stack || '');
  } catch { /* swallow */ }
}

async function postNotion(urlPath, body) {
  const apiKey = (process.env.NOTION_API_KEY || '').trim();
  if (!apiKey) throw new Error('NOTION_API_KEY 미설정');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.notion.com/v1${urlPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`Notion ${res.status}: ${txt.slice(0, 300)}`);
    return JSON.parse(txt);
  } finally {
    clearTimeout(t);
  }
}

function alertHash({ counts, changed }) {
  // 같은 변화량이면 같은 해시 — dedup 키로 사용
  const payload = JSON.stringify({ counts, changed: [...(changed || [])].sort() });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function isDuplicate(hash, dedupMin) {
  // 최근 dedupMin 분 내 같은 alert hash 의 ticket 발급 여부 — meta.notion_alert_hash 로 추적
  const cutoff = new Date(Date.now() - dedupMin * 60_000).toISOString();
  const row = db.prepare(`
    SELECT id FROM asset_audit_log
    WHERE action = 'auto_pull_alert' AND ts >= ?
      AND json_extract(meta, '$.notion_ticket_id') IS NOT NULL
      AND json_extract(meta, '$.notion_alert_hash') = ?
    LIMIT 1
  `).get(cutoff, hash);
  return !!row;
}

function buildTicketBody({ databaseId, counts, changed, hash }) {
  const title = `🔔 자산 동기화 알림 — ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ` 외 ${changed.length - 3}건` : ''}`;
  const props = {
    'Name': {
      title: [{ type: 'text', text: { content: title.slice(0, 200) } }]
    },
    'Source': {
      rich_text: [{ type: 'text', text: { content: 'asset-sync' } }]
    },
    'AlertHash': {
      rich_text: [{ type: 'text', text: { content: hash } }]
    }
  };

  // 본문 children — 변화 요약 + counts 상세
  const children = [
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '변화 요약' } }] }
    },
    {
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: changed.length
          ? changed.map(c => ({ type: 'text', text: { content: c } }))
          : [{ type: 'text', text: { content: '(변화 없음)' } }]
      }
    },
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '현재 카운트' } }] }
    },
    {
      object: 'block', type: 'code',
      code: {
        language: 'json',
        rich_text: [{ type: 'text', text: { content: JSON.stringify(counts, null, 2).slice(0, 1900) } }]
      }
    },
    {
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'AlertHash: ' } },
          { type: 'text', text: { content: hash }, annotations: { code: true } }
        ]
      }
    }
  ];

  return {
    parent: { database_id: databaseId },
    properties: props,
    children
  };
}

// 핵심 — 자산 동기화 alert 발생 시 호출됨
//   { counts: {...}, changed: ['divergent: 0→3', ...] }
async function createAssetTicket({ counts, changed }) {
  if (!isEnabled()) return { ok: false, skipped: 'disabled' };
  const databaseId = (getSetting('notion_asset_database_id') || '').trim();
  if (!databaseId) return { ok: false, skipped: 'no_database_id' };
  if (!process.env.NOTION_API_KEY) return { ok: false, skipped: 'no_api_key' };

  const dedupMin = Math.max(1, parseInt(getSetting('notion_asset_ticket_dedup_min') || '60', 10));
  const hash = alertHash({ counts, changed });
  if (isDuplicate(hash, dedupMin)) {
    return { ok: false, skipped: 'duplicate', hash };
  }

  const body = buildTicketBody({ databaseId, counts, changed, hash });
  const created = await postNotion('/pages', body);

  // audit 메타에 notion_ticket_id + alert_hash 기록 — dedup 키
  try {
    const lastAlert = db.prepare(`
      SELECT id, meta FROM asset_audit_log
      WHERE action = 'auto_pull_alert'
      ORDER BY id DESC LIMIT 1
    `).get();
    if (lastAlert) {
      const meta = JSON.parse(lastAlert.meta || '{}');
      meta.notion_ticket_id = created.id;
      meta.notion_alert_hash = hash;
      meta.notion_url = created.url;
      db.prepare(`UPDATE asset_audit_log SET meta = ? WHERE id = ?`).run(JSON.stringify(meta), lastAlert.id);
    }
  } catch (e) { /* swallow */ }

  return { ok: true, ticket_id: created.id, url: created.url, hash };
}

// fire-and-forget 래퍼 — scheduler tick 에서 사용
function fireCreateAssetTicket(payload) {
  createAssetTicket(payload).then(r => {
    if (r.ok) console.log(`[NOTION] asset ticket created — ${r.ticket_id}`);
    else if (r.skipped !== 'no_api_key' && r.skipped !== 'no_database_id' && r.skipped !== 'duplicate') {
      console.log(`[NOTION] skipped: ${r.skipped}`);
    }
  }).catch(e => logFailure('createAssetTicket', e));
}

// 관리자 테스트용 — 단발 호출
async function testNotionConnection() {
  const apiKey = (process.env.NOTION_API_KEY || '').trim();
  const databaseId = (getSetting('notion_asset_database_id') || '').trim();
  if (!apiKey) return { ok: false, error: 'NOTION_API_KEY 미설정' };
  if (!databaseId) return { ok: false, error: 'notion_asset_database_id 미설정' };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_VERSION
      },
      signal: ctrl.signal
    });
    const txt = await res.text();
    if (!res.ok) return { ok: false, error: `Notion ${res.status}: ${txt.slice(0, 200)}` };
    const data = JSON.parse(txt);
    return {
      ok: true,
      database_title: (data.title && data.title[0] && data.title[0].plain_text) || '(제목 없음)',
      properties: Object.keys(data.properties || {})
    };
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  createAssetTicket,
  fireCreateAssetTicket,
  testNotionConnection,
  alertHash // 테스트 노출
};
