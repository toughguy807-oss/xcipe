// Figma 양방향 sync — project_design_systems ↔ Figma Variables
//
// ⚠️ 사용 범위 (원칙 3 — Figma 연동도 claude code 가 도구):
//   - ✅ admin 콘솔 직접 동기화 한정 (admin 이 토큰 일괄 pull/push 트리거)
//        /api/design-systems/:id/pull-from-figma, push-to-figma, figma-status
//        /api/admin/settings/figma/test (토큰 유효성)
//   - ❌ 파이프라인 워커 안에서 직접 호출 금지
//        파이프라인에서 Figma 작업이 필요하면 claude CLI subprocess 에 위임
//        (allowedTools 에 mcp__figma__* 노출, LLM 이 MCP 도구로 처리 후 결과 반환)
//   이 모듈은 운영자 편의 기능이며 LLM 경유를 우회하는 **보조 도구**이다.
//
// 외부 의존: Figma REST API (https://api.figma.com)
// 인증: env FIGMA_ACCESS_TOKEN 또는 settings.figma_access_token
//
// pull (Figma → DB): GET /v1/files/{key}/variables/local → baseline.json 형식으로 변환
// push (DB → Figma): POST /v1/files/{key}/variables (Enterprise/Beta API)
//                    실패 시 메타데이터에 'push_unavailable' 기록 (DS는 source of truth로 유지)
//                    HTML→Figma push 는 본 모듈이 아닌
//                    claude CLI + mcp__figma__generate_figma_design 로 처리한다.
//
// 충돌 정책: last-write-wins (sync_meta.figma_modified_at vs last_synced_at)
//   Figma 측 변경이 last_synced 이후면 pull 우선
//   DB 측 변경이 last_synced 이후면 push 시도

const crypto = require('crypto');
const { db, getSetting } = require('../db');

const FIGMA_API = 'https://api.figma.com';

function getAccessToken() {
  // Figma 공식 환경변수 이름 우선순위:
  //   FIGMA_PERSONAL_ACCESS_TOKEN  (Figma 공식, MCP 표준)
  //   FIGMA_ACCESS_TOKEN
  //   FIGMA_TOKEN
  //   DB settings.figma_access_token (admin UI에서 입력 가능)
  return (
    process.env.FIGMA_PERSONAL_ACCESS_TOKEN ||
    process.env.FIGMA_ACCESS_TOKEN ||
    process.env.FIGMA_TOKEN ||
    getSetting('figma_access_token') ||
    null
  );
}

async function figmaFetch(pathSuffix, opts = {}) {
  const token = getAccessToken();
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN 미설정 (env 또는 admin settings)');
  const url = FIGMA_API + pathSuffix;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'X-Figma-Token': token,
        'content-type': 'application/json',
        ...(opts.headers || {})
      },
      signal: ac.signal
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) {
      throw new Error(`Figma API ${res.status}: ${body.err || body.message || text.slice(0, 200)}`);
    }
    return body;
  } finally {
    clearTimeout(t);
  }
}

// Figma Variables 응답 → baseline.json 정규화
// Figma 응답 구조:
//   { meta: { variables: { [id]: { name, resolvedType, valuesByMode } }, variableCollections: { [id]: { name, modes } } } }
function variablesToBaseline(figmaVars) {
  const out = { color: {}, typography: {}, spacing: {}, radius: {}, shadow: {}, transition: {}, icon: {} };
  const vars = figmaVars?.meta?.variables || {};

  for (const [vid, v] of Object.entries(vars)) {
    const name = v.name || vid;
    const type = v.resolvedType; // COLOR | FLOAT | STRING | BOOLEAN
    // valuesByMode: { [modeId]: {r,g,b,a} or number or string }
    const firstVal = Object.values(v.valuesByMode || {})[0];
    if (firstVal === undefined) continue;

    // 카테고리 판정 — name 패턴 우선
    let category = 'color';
    let key = name;
    if (/^(color|colour|fill|bg|background|border|text)[.\-/]/i.test(name)) {
      category = 'color';
    } else if (/font|typography|text\.size|text\.family/i.test(name)) {
      category = 'typography';
    } else if (/space|spacing|gap|padding|margin/i.test(name)) {
      category = 'spacing';
    } else if (/radius|rounded|corner/i.test(name)) {
      category = 'radius';
    } else if (/shadow|elevation/i.test(name)) {
      category = 'shadow';
    } else if (/transition|duration|easing/i.test(name)) {
      category = 'transition';
    } else if (/icon/i.test(name)) {
      category = 'icon';
    } else if (type === 'COLOR') {
      category = 'color';
    }

    // 값 변환
    let value;
    if (type === 'COLOR' && firstVal && typeof firstVal === 'object' && 'r' in firstVal) {
      value = rgbaToHex(firstVal);
    } else if (type === 'FLOAT' && typeof firstVal === 'number') {
      value = (category === 'spacing' || category === 'radius') ? `${firstVal}px` : firstVal;
    } else {
      value = firstVal;
    }

    // 중첩 path 보존 — name의 첫 segment가 category와 동일하면 중복 제거
    //   "color/primary/500" + category="color" → ["primary","500"]
    //   "primary/500"       + category="color" → ["primary","500"]
    const parts = key.split(/[./]/);
    if (parts[0] && parts[0].toLowerCase() === category) parts.shift();
    if (parts.length === 0) parts.push('value');
    setDeep(out[category], parts, value);
  }
  // 빈 카테고리 제거
  for (const k of Object.keys(out)) {
    if (Object.keys(out[k]).length === 0) delete out[k];
  }
  return out;
}

function rgbaToHex({ r, g, b, a = 1 }) {
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = '#' + to(r) + to(g) + to(b);
  return a < 1 ? hex + to(a) : hex;
}
function setDeep(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

// baseline.json → tokens.css 변환 (기존 admin UI 의 _genCss 와 동일 로직)
function baselineToCss(baseline) {
  const lines = [':root {'];
  function walk(node, prefix) {
    if (typeof node === 'string' || typeof node === 'number') {
      lines.push(`  --${prefix}: ${node};`);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        walk(v, prefix ? `${prefix}-${k}` : k);
      }
    }
  }
  walk(baseline, '');
  lines.push('}');
  return lines.join('\n');
}

function sha(text) { return crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 16); }

// ===========================================================
// Pull: Figma → DB
// ===========================================================
async function pullFromFigma({ designSystemId, actor = 'system' }) {
  const ds = db.prepare('SELECT * FROM project_design_systems WHERE id = ?').get(designSystemId);
  if (!ds) throw new Error('DS not found');
  if (!ds.figma_file_key) throw new Error('figma_file_key 미설정 — admin UI에서 등록 필요');

  const figmaVars = await figmaFetch(`/v1/files/${ds.figma_file_key}/variables/local`);
  const newBaseline = variablesToBaseline(figmaVars);
  const newBaselineStr = JSON.stringify(newBaseline, null, 2);
  const newCss = baselineToCss(newBaseline);

  const prevSha = sha(ds.baseline_json);
  const newSha = sha(newBaselineStr);
  const changed = prevSha !== newSha;

  if (changed) {
    db.prepare(`
      UPDATE project_design_systems
      SET baseline_json = ?, tokens_css = ?,
          last_synced_at = datetime('now'), last_sync_direction = 'pull',
          sync_meta = ?
      WHERE id = ?
    `).run(newBaselineStr, newCss, JSON.stringify({
      pulled_at: new Date().toISOString(), actor,
      prev_sha: prevSha, new_sha: newSha,
      figma_variables_count: Object.keys(figmaVars?.meta?.variables || {}).length
    }), designSystemId);
  } else {
    db.prepare(`UPDATE project_design_systems SET last_synced_at = datetime('now'), last_sync_direction = 'pull' WHERE id = ?`).run(designSystemId);
  }

  return {
    ok: true, changed,
    direction: 'pull',
    prev_sha: prevSha, new_sha: newSha,
    variables_count: Object.keys(figmaVars?.meta?.variables || {}).length
  };
}

// ===========================================================
// Push: DB → Figma (Enterprise/Beta API — 권한 없으면 graceful fail)
// ===========================================================
async function pushToFigma({ designSystemId, actor = 'system' }) {
  const ds = db.prepare('SELECT * FROM project_design_systems WHERE id = ?').get(designSystemId);
  if (!ds) throw new Error('DS not found');
  if (!ds.figma_file_key) throw new Error('figma_file_key 미설정');

  // Figma Variables write API (POST /v1/files/{key}/variables) — Enterprise + Beta 권한 필요
  // 시도 후 401/403 시 'push_unavailable' 로 기록
  let baseline;
  try { baseline = JSON.parse(ds.baseline_json || '{}'); }
  catch { throw new Error('baseline_json 파싱 실패'); }

  // 변환: baseline.json → Figma variables payload (간이)
  const payload = baselineToFigmaPayload(baseline);

  try {
    const r = await figmaFetch(`/v1/files/${ds.figma_file_key}/variables`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    db.prepare(`
      UPDATE project_design_systems
      SET last_synced_at = datetime('now'), last_sync_direction = 'push',
          sync_meta = ?
      WHERE id = ?
    `).run(JSON.stringify({
      pushed_at: new Date().toISOString(), actor,
      sha: sha(ds.baseline_json),
      figma_response: { ok: true, message: r?.meta?.tempIdToRealId ? 'created' : 'noop' }
    }), designSystemId);
    return { ok: true, direction: 'push', response: r };
  } catch (err) {
    const meta = JSON.stringify({
      pushed_at: new Date().toISOString(), actor,
      sha: sha(ds.baseline_json),
      push_unavailable: true,
      reason: err.message
    });
    db.prepare(`UPDATE project_design_systems SET sync_meta = ? WHERE id = ?`).run(meta, designSystemId);
    return { ok: false, direction: 'push', error: err.message, hint: 'Figma Variables write API는 Enterprise + Beta 권한 필요. 대신 figma-push 스킬로 수동 적용 가능.' };
  }
}

// baseline.json → Figma Variables payload 변환 (간이)
function baselineToFigmaPayload(baseline) {
  const variables = [];
  function walk(node, prefix, category) {
    if (typeof node === 'string' || typeof node === 'number') {
      let resolvedType = 'STRING';
      let value = node;
      if (typeof node === 'string' && /^#[0-9a-fA-F]{6}/.test(node)) {
        resolvedType = 'COLOR';
        value = hexToRgba(node);
      } else if (typeof node === 'number') {
        resolvedType = 'FLOAT';
      } else if (typeof node === 'string' && /^\d+(\.\d+)?(px|rem)$/.test(node)) {
        resolvedType = 'FLOAT';
        value = parseFloat(node);
      }
      variables.push({
        action: 'CREATE',
        id: `tempId_${prefix}`,
        name: prefix,
        resolvedType,
        valuesByMode: { default: value }
      });
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        walk(v, prefix ? `${prefix}/${k}` : `${category}/${k}`, category);
      }
    }
  }
  for (const [cat, val] of Object.entries(baseline)) {
    walk(val, '', cat);
  }
  return { variables, variableCollections: [], variableModes: [], variableModeValues: [] };
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

module.exports = {
  pullFromFigma,
  pushToFigma,
  variablesToBaseline,
  baselineToCss,
  baselineToFigmaPayload,
  getAccessToken
};
