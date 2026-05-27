// Bridge server — Figma 플러그인과 이 프로젝트 폴더를 잇는 로컬 서버
// 실행: node bridge-server.js
// 포트: 3939
//
// 라우트:
//   GET  /health                      상태 확인
//   GET  /design[?name=foo]           to-figma/*.figma.json 반환. name 없으면 active preview → latest-modified 순
//   GET  /designs                     디자인 파일 목록
//   POST /export                      플러그인 → 변경 로그 저장 (from-figma/)
//   GET  /preview                     to-figma/ HTML 목록 (브라우저 프리뷰 인덱스)
//   GET  /preview/<path>              to-figma/ 하위 HTML/정적 파일 서빙 + 라이브리로드/리모컨 주입
//   GET  /preview-list                프리뷰 HTML 목록 JSON (리모컨이 이전/다음 탐색에 사용)
//   POST /preview-active              브라우저가 "지금 보는 파일" 보고 → 플러그인 가져오기가 이걸 우선 사용
//   GET  /preview-active              현재 active preview 상태 조회
//   GET  /live                        SSE — to-figma/ 변경 감지 시 reload 이벤트 푸시
//   GET  /proxy?url=<encoded URL>     외부 이미지/리소스 프록시 (CORS 회피, manifest 단일 도메인 통과)

// 프로세스 안전망 — 비동기 에러 1건에 서버가 죽지 않도록 차단.
//   SYS_v4 server.js 와 동일 패턴. console 흔적만 남기고 process.exit() 안 함.
process.on('uncaughtException', (err, origin) => {
  console.error(`[bridge:uncaughtException] origin=${origin}`, err && err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[bridge:unhandledRejection]', reason && reason.stack || reason);
});

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

const PORT = 3939;
const ROOT = __dirname;
const DESIGNS_DIR = path.join(ROOT, 'to-figma');
const EXPORTS_DIR = path.join(ROOT, 'from-figma');
const RESEARCH_DIR = path.join(ROOT, 'research');
const ICONS_DIR = path.join(ROOT, 'kds', 'data', 'icons');
const LOGOS_DIR = path.join(ROOT, 'kds', 'data', 'logos');

// HTML 미리보기 응답 시 ref SVG 를 라이브러리의 검증된 SVG content 로 치환.
// HTML 원본은 변경 안 함 (응답만 변환). HTML 의 width/height/class 속성은 보존.
// - <svg data-kds-icon="X" /> → kds/data/icons/X.svg
// - <svg data-kds-logo="X" /> → kds/data/logos/X.svg
function inlineFromLib(match, name, dir) {
  const filePath = path.join(dir, `${name}.svg`);
  if (!fs.existsSync(filePath)) return match; // 라이브러리 없으면 원본 그대로
  const libContent = fs.readFileSync(filePath, 'utf8').trim();
  // HTML 의 width/height/class 추출 → 라이브러리 svg 에 병합
  const extraAttrs = [];
  const widthMatch = match.match(/\bwidth\s*=\s*["']([^"']*)["']/i);
  const heightMatch = match.match(/\bheight\s*=\s*["']([^"']*)["']/i);
  const classMatch = match.match(/\bclass\s*=\s*["']([^"']*)["']/i);
  if (widthMatch) extraAttrs.push(`width="${widthMatch[1]}"`);
  if (heightMatch) extraAttrs.push(`height="${heightMatch[1]}"`);
  if (classMatch) extraAttrs.push(`class="${classMatch[1]}"`);
  return libContent.replace(/<svg\b/, `<svg ${extraAttrs.join(' ')}`);
}

function inlineKdsIcons(html) {
  // 아이콘 ref 치환
  html = html.replace(
    /<svg\b[^>]*\bdata-kds-icon\s*=\s*["']([a-zA-Z0-9_-]+)["'][^>]*>[\s\S]*?<\/svg>/gi,
    (match, iconName) => inlineFromLib(match, iconName, ICONS_DIR)
  );
  // 로고 ref 치환 (원본 브랜드 컬러 보존 — currentColor 처리 안 함)
  html = html.replace(
    /<svg\b[^>]*\bdata-kds-logo\s*=\s*["']([a-zA-Z0-9_-]+)["'][^>]*>[\s\S]*?<\/svg>/gi,
    (match, logoName) => inlineFromLib(match, logoName, LOGOS_DIR)
  );
  return html;
}

for (const dir of [DESIGNS_DIR, EXPORTS_DIR, RESEARCH_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 이미지 에셋 라우트에서만 허용할 확장자
const ASSET_EXT_WHITELIST = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.avif']);

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 20_000_000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function latestDesignFile() {
  const files = fs.readdirSync(DESIGNS_DIR)
    .filter(f => f.endsWith('.figma.json'))
    .map(f => ({ f, t: fs.statSync(path.join(DESIGNS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files[0] ? path.join(DESIGNS_DIR, files[0].f) : null;
}

// HTML 프리뷰 경로 → 매칭되는 .figma.json 파일 경로
// 단일 화면:  'ktshop-home-v2.html'          → to-figma/ktshop-home-v2.figma.json
// 플로우 하위: 'login-flow/1-login.html'     → to-figma/login-flow.figma.json (플로우 전체 파일)
function htmlToFigmaPath(htmlRel) {
  if (!htmlRel) return null;
  const parts = htmlRel.split('/').filter(Boolean);
  const base = parts.length > 1 ? parts[0] : parts[0].replace(/\.html?$/i, '');
  const p = path.join(DESIGNS_DIR, base + '.figma.json');
  return fs.existsSync(p) ? p : null;
}

// 브라우저가 "지금 프리뷰 중인 파일"을 보고 → 플러그인 가져오기가 이걸 우선 사용
let activePreview = null; // { htmlRel, figmaPath, at }

// ── 프리뷰/라이브리로드 ───────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf'
};

const LIVE_RELOAD_SNIPPET = `
<script>
(function(){
  try {
    var es = new EventSource('/live');
    es.addEventListener('reload', function(){ location.reload(); });
    es.onerror = function(){ /* 연결 끊김 — 브라우저가 자동 재연결 */ };
  } catch(e) { console.warn('live-reload unavailable', e); }
})();
</script>`;

// 리모컨: 목록으로 가기 / 이전·다음 파일 탐색 / 현재 위치 표시
// 각 프리뷰 HTML 하단에 오버레이로 주입됨. iframe 안에서는 뜨지 않음(중복 방지)
// 브라우저 호환 이슈(all:unset) 피하려고 버튼 스타일은 개별 속성으로 명시
const REMOTE_BTN_STYLE = 'background:transparent;border:0;color:#fff;padding:8px 12px;cursor:pointer;border-radius:999px;font:inherit;line-height:1;text-decoration:none;display:inline-flex;align-items:center;';
const REMOTE_CONTROL_SNIPPET = `
<div id="__kds_remote" data-kds-injected="1" style="position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:4px 6px;background:rgba(25,26,27,0.88);color:#fff;border-radius:999px;font:13px/1 -apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:2147483647;opacity:0.4;transition:opacity 0.15s;-webkit-font-smoothing:antialiased;">
  <a data-act="home" href="/preview" title="목록으로 (Esc)" style="${REMOTE_BTN_STYLE}">☰ 목록</a>
  <span style="width:1px;height:16px;background:rgba(255,255,255,0.2);margin:0 2px;"></span>
  <button type="button" data-act="prev" title="이전 화면 ([)" style="${REMOTE_BTN_STYLE}font-size:14px;">←</button>
  <span id="__kds_remote_label" style="padding:0 6px;max-width:320px;overflow:hidden;white-space:nowrap;opacity:0.95;display:inline-flex;align-items:center;gap:6px;">
    <span id="__kds_remote_fig" title="Figma 플러그인 '가져오기' 대상 상태" style="display:inline-flex;width:8px;height:8px;border-radius:999px;background:#888;flex-shrink:0;"></span>
    <span id="__kds_remote_name" style="overflow:hidden;text-overflow:ellipsis;max-width:240px;"></span>
    <span id="__kds_remote_pos" style="opacity:0.65;font-variant-numeric:tabular-nums;"></span>
  </span>
  <button type="button" data-act="next" title="다음 화면 (])" style="${REMOTE_BTN_STYLE}font-size:14px;">→</button>
</div>
<script>
(function(){
  if (window.top !== window.self) { var el0 = document.getElementById('__kds_remote'); if (el0) el0.remove(); return; }
  var el = document.getElementById('__kds_remote');
  if (!el) return;
  el.addEventListener('mouseenter', function(){ el.style.opacity = '1'; });
  el.addEventListener('mouseleave', function(){ el.style.opacity = '0.4'; });
  var current = decodeURIComponent(location.pathname.replace(/^\\/preview\\//, ''));
  document.getElementById('__kds_remote_name').textContent = current;
  var btnPrev = el.querySelector('[data-act="prev"]');
  var btnNext = el.querySelector('[data-act="next"]');
  var posEl = document.getElementById('__kds_remote_pos');
  var figDot = document.getElementById('__kds_remote_fig');

  // 현재 파일을 서버에 "active preview"로 보고 → 플러그인 가져오기가 이걸 우선 사용
  function reportActive(){
    fetch('/preview-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: current })
    }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
      if (!data) return;
      if (data.hasFigma) {
        figDot.style.background = '#22c55e';
        figDot.title = 'Figma 플러그인 "가져오기"가 이 파일(' + data.figmaName + ')을 불러옵니다';
      } else {
        figDot.style.background = '#f59e0b';
        figDot.title = '매칭되는 .figma.json 파일이 없습니다 — 플러그인 가져오기는 최신 수정본으로 폴백';
      }
    }).catch(function(){
      figDot.style.background = '#ef4444';
      figDot.title = '서버 연결 실패';
    });
  }
  reportActive();
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') reportActive();
  });

  function go(delta, siblings){
    var i = siblings.indexOf(current);
    if (i < 0) return;
    var j = i + delta;
    if (j < 0 || j >= siblings.length) return;
    location.href = '/preview/' + siblings[j].split('/').map(encodeURIComponent).join('/');
  }
  // 현재 파일이 속한 "플로우 폴더" (탑레벨이면 빈 문자열)
  var slash = current.lastIndexOf('/');
  var currentFolder = slash >= 0 ? current.slice(0, slash) : '';
  fetch('/preview-list').then(function(r){ return r.json(); }).then(function(list){
    // 형제 그룹: 같은 폴더 안에 있는 파일들만. 탑레벨이면 형제 없음 → 독립 파일로 간주
    var siblings = currentFolder
      ? list.filter(function(p){ return p.indexOf(currentFolder + '/') === 0 && p.indexOf('/', currentFolder.length + 1) < 0; })
      : [];
    if (siblings.length <= 1) {
      // 독립 파일 — 이전/다음 불필요
      btnPrev.style.display = 'none';
      btnNext.style.display = 'none';
      posEl.style.display = 'none';
      return;
    }
    var i = siblings.indexOf(current);
    if (i >= 0) posEl.textContent = (i + 1) + ' / ' + siblings.length;
    if (i <= 0) { btnPrev.style.opacity = '0.3'; btnPrev.style.cursor = 'not-allowed'; }
    if (i < 0 || i >= siblings.length - 1) { btnNext.style.opacity = '0.3'; btnNext.style.cursor = 'not-allowed'; }
    btnPrev.addEventListener('click', function(){ go(-1, siblings); });
    btnNext.addEventListener('click', function(){ go(+1, siblings); });
    document.addEventListener('keydown', function(e){
      if (e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '[') { go(-1, siblings); }
      else if (e.key === ']') { go(+1, siblings); }
    });
  }).catch(function(){ btnPrev.style.opacity = '0.3'; btnNext.style.opacity = '0.3'; });
  // Esc(목록으로)는 독립/플로우 상관없이 항상 작동
  document.addEventListener('keydown', function(e){
    if (e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { location.href = '/preview'; }
  });
})();
</script>`;

// ── 외부 이미지 프록시 (CORS 회피 + manifest 단일 도메인 통과) ──────
const PROXY_TIMEOUT_MS = 15000;
const PROXY_MAX_BYTES = 20 * 1024 * 1024;
const PROXY_MAX_REDIRECTS = 5;

function proxyFetch(targetUrl, clientRes, depth) {
  depth = depth || 0;
  if (depth > PROXY_MAX_REDIRECTS) {
    return send(clientRes, 502, { error: 'too many redirects' });
  }
  let parsed;
  try { parsed = new URL(targetUrl); }
  catch (e) { return send(clientRes, 400, { error: 'invalid url at hop ' + depth }); }

  const lib = parsed.protocol === 'https:' ? https : http;
  const upstream = lib.get(parsed, {
    headers: {
      // 일부 CDN은 User-Agent 없으면 거부
      'User-Agent': 'Mozilla/5.0 (KDS-Bridge-Proxy)',
      'Accept': '*/*'
    }
  }, (upRes) => {
    const status = upRes.statusCode || 502;
    // 리다이렉트
    if ([301, 302, 303, 307, 308].includes(status) && upRes.headers.location) {
      const next = new URL(upRes.headers.location, parsed).toString();
      upRes.resume(); // drain
      return proxyFetch(next, clientRes, depth + 1);
    }
    // 정상/에러 모두 그대로 통과
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    };
    if (upRes.headers['content-type']) headers['Content-Type'] = upRes.headers['content-type'];
    if (upRes.headers['content-length']) headers['Content-Length'] = upRes.headers['content-length'];
    clientRes.writeHead(status, headers);
    let bytes = 0;
    upRes.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > PROXY_MAX_BYTES) {
        upstream.destroy();
        try { clientRes.end(); } catch {}
      }
    });
    upRes.pipe(clientRes);
  });
  upstream.on('error', (err) => {
    if (!clientRes.headersSent) {
      send(clientRes, 502, { error: 'proxy fetch failed', detail: String(err.message || err) });
    }
  });
  upstream.setTimeout(PROXY_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!clientRes.headersSent) {
      send(clientRes, 504, { error: 'proxy timeout' });
    }
  });
}

// to-figma/ 내부의 모든 .html 목록 (재귀)
function listHtmlFiles() {
  const out = [];
  function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, r);
      else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        let mtime = 0;
        try { mtime = fs.statSync(abs).mtimeMs; } catch {}
        out.push({ rel: r, mtime });
      }
    }
  }
  if (fs.existsSync(DESIGNS_DIR)) walk(DESIGNS_DIR, '');
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function renderPreviewIndex() {
  const files = listHtmlFiles();
  const items = files.length
    ? files.map(f => {
        const d = new Date(f.mtime);
        const pad = n => String(n).padStart(2, '0');
        const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return `<li data-name="${f.rel}" data-mtime="${f.mtime}">`
          + `<a href="/preview/${f.rel}">${f.rel}</a>`
          + `<time>${ts}</time></li>`;
      }).join('\n')
    : '<li style="color:#888">to-figma/ 폴더가 비어 있습니다</li>';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>KDS Preview</title>
<style>
  body { font:14px/1.6 -apple-system,Segoe UI,sans-serif; padding:24px; color:#191a1b; background:#fff; }
  h1 { font-size:18px; margin:0 0 16px; }
  .toolbar { display:flex; gap:8px; margin:0 0 12px; align-items:center; font-size:12px; }
  .toolbar .label { color:#6f737b; }
  .toolbar button {
    font:inherit; padding:4px 10px; border:1px solid #d5d8dd; background:#fff;
    border-radius:6px; cursor:pointer; color:#191a1b;
  }
  .toolbar button.active { background:#191a1b; color:#fff; border-color:#191a1b; }
  .toolbar button:hover:not(.active) { background:#f3f4f6; }
  ul { list-style:none; padding:0; margin:0; }
  li {
    padding:6px 0; border-bottom:1px solid #eee;
    display:flex; align-items:baseline; justify-content:space-between; gap:12px;
  }
  li time { color:#9fa4ad; font-size:11px; font-variant-numeric:tabular-nums; flex:0 0 auto; }
  a { color:#0f6cde; text-decoration:none; }
  a:hover { text-decoration:underline; }
  code { background:#f4f4f5; padding:2px 6px; border-radius:4px; }
</style></head>
<body>
<h1>KDS Preview — <code>to-figma/</code></h1>
<div class="toolbar">
  <span class="label">정렬</span>
  <button data-sort="name">이름순</button>
  <button data-sort="mtime">최신순</button>
</div>
<ul id="preview-list">
${items}
</ul>
<p style="color:#888;font-size:12px;margin-top:24px">파일 수정 시 브라우저가 자동 새로고침됩니다.</p>
<script>
(function() {
  var KEY = 'kds-preview-sort';
  var ul = document.getElementById('preview-list');
  if (!ul) return;
  var items = Array.prototype.slice.call(ul.querySelectorAll('li[data-name]'));
  var buttons = document.querySelectorAll('.toolbar button[data-sort]');

  function apply(mode) {
    var sorted = items.slice();
    if (mode === 'mtime') {
      sorted.sort(function(a, b) {
        return Number(b.dataset.mtime) - Number(a.dataset.mtime);
      });
    } else {
      sorted.sort(function(a, b) {
        return a.dataset.name.localeCompare(b.dataset.name);
      });
    }
    sorted.forEach(function(li) { ul.appendChild(li); });
    buttons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.sort === mode);
    });
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() { apply(btn.dataset.sort); });
  });

  var saved = 'name';
  try { saved = localStorage.getItem(KEY) || 'name'; } catch (e) {}
  apply(saved);
})();
</script>
${LIVE_RELOAD_SNIPPET}
</body></html>`;
}

// to-figma/ 내부로 안전하게 경로 해석 (탈출 방지)
function safeResolveUnder(base, rel) {
  const resolved = path.resolve(base, rel);
  const baseResolved = path.resolve(base);
  if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) return null;
  return resolved;
}

// HTML에 라이브리로드 + 리모컨 스니펫 주입 (</body> 앞, 없으면 맨 뒤)
function injectPreviewHelpers(html) {
  const payload = LIVE_RELOAD_SNIPPET + REMOTE_CONTROL_SNIPPET;
  const lower = html.toLowerCase();
  const idx = lower.lastIndexOf('</body>');
  if (idx >= 0) return html.slice(0, idx) + payload + html.slice(idx);
  return html + payload;
}

// ── SSE (라이브리로드 채널) ─────────────────────────────────────────

const sseClients = new Set();

function sseBroadcast(event, data) {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch {}
  }
}

// to-figma/ 재귀 감시. 디바운스로 연속 이벤트 묶음.
let reloadTimer = null;
function scheduleReload(reason) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    console.log(`[live] reload (${reason})`);
    sseBroadcast('reload', String(Date.now()));
  }, 120);
}

// chokidar — fs.watch 보다 cross-platform 안정 (특히 Windows 에서 fs.watch 가
// filename 누락하거나 이벤트 안 오는 케이스 회피).
try {
  const watcher = chokidar.watch(DESIGNS_DIR, {
    ignored: [
      /\.figma\.json\.tmp/,              // 원자적 쓰기용 임시 파일
      /\.tmp(\.\d+)*$/,                  // 기타 임시 파일
      /(^|[\/\\])\../                    // dot-files
    ],
    ignoreInitial: true,                 // 시작 시 기존 파일에는 이벤트 안 쏨
    awaitWriteFinish: {                  // 큰 파일 저장 중간에 이벤트 안 쏨
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  const onFileEvent = (eventType) => (filename) => {
    if (!filename) return;
    const rel = path.relative(DESIGNS_DIR, filename);
    if (!rel || rel.startsWith('..')) return;
    scheduleReload(`${eventType} ${rel}`);
    // HTML 변경 시 자동 인젝션 트리거 (svg + images + icon-placement)
    if (/\.html?$/i.test(rel)) {
      scheduleAutoInject(rel);
    } else if (/\.figma\.json$/.test(rel) && !/-compare\.figma\.json$/.test(rel)) {
      // 시안 단독 figma.json 직접 편집 시 compare 도 같이 재빌드 (stale 방지).
      // compare 자기 자신 변경은 제외 — 안 그러면 build-compare 가 compare 쓰면서 무한 루프.
      const baseName = rel.replace(/\.figma\.json$/, '');
      const m = baseName.match(/^(.+)-([abc])$/);
      if (m) scheduleBuildCompareDirect(m[1]);
    }
  };

  watcher.on('add', onFileEvent('add'));
  watcher.on('change', onFileEvent('change'));
  watcher.on('unlink', onFileEvent('unlink'));
  watcher.on('error', (err) => console.warn('[live] chokidar error:', err.message));
} catch (e) {
  console.warn('[live] chokidar 초기화 실패:', e.message);
}

// ── HTML 저장 시 자동 인젝션 (svg + images + icon-placement) ──────────
// HTML이 저장되면 inject-svg → inject-images → fix-icon-placement를 순서대로 실행.
// 이 스크립트들은 figma.json 만 수정하므로 watch 루프와 충돌 없음.
// 디바운스 800ms로 연속 저장 묶음.

const injectQueue = new Set();
let injectTimer = null;
const injectInProgress = new Set();

function scheduleAutoInject(filename) {
  // 플로우 자식(폴더/파일.html)이면 부모 폴더 이름이 타겟 base name
  const parts = filename.split(/[\\/]/);
  const target = parts.length > 1
    ? parts[0]
    : parts[0].replace(/\.html?$/i, '');
  injectQueue.add(target);

  if (injectTimer) clearTimeout(injectTimer);
  injectTimer = setTimeout(runAutoInject, 800);
}

function runAutoInject() {
  injectTimer = null;
  const targets = Array.from(injectQueue);
  injectQueue.clear();
  for (const target of targets) {
    if (injectInProgress.has(target)) continue;
    injectInProgress.add(target);
    runInjectChain(target);
  }
}

function runInjectChain(target) {
  runScript('scripts/inject-svg.mjs', target, () => {
    runScript('scripts/inject-images.mjs', target, () => {
      runScript('scripts/fix-icon-placement.mjs', target, () => {
        // 마지막 단계: Spacer FRAME ↔ HTML margin 매칭 검증
        // (실패해도 파일은 그대로 둠 — 콘솔 로그로 알림만)
        runScript('scripts/verify-spacers.mjs', target, () => {
          // 시안 단독 파일(<base>-a/b/c)이면 <base>-compare.figma.json 도 같이 재빌드
          // build-compare 는 compare 파일이 존재할 때만 실제 작업, 없으면 즉시 스킵
          const m = target.match(/^(.+)-([abc])$/);
          const finishInject = () => {
            injectInProgress.delete(target);
            // 인젝션 끝나면 한 번 더 reload 신호 — figma.json 갱신 반영
            scheduleReload('auto-inject ' + target);
          };
          if (m) {
            runScript('scripts/build-compare.mjs', m[1], finishInject);
          } else {
            finishInject();
          }
        });
      });
    });
  });
}

// figma.json 단독 시안 직접 편집 → compare 재빌드 (500ms 디바운스)
// 자동 인젝션과 별개 경로: HTML 안 건드리고 figma.json 만 수정한 경우(예: Edit 도구로 spec 수정) 대응
const buildCompareQueue = new Set();
let buildCompareTimer = null;
function scheduleBuildCompareDirect(base) {
  buildCompareQueue.add(base);
  if (buildCompareTimer) clearTimeout(buildCompareTimer);
  buildCompareTimer = setTimeout(() => {
    buildCompareTimer = null;
    const targets = Array.from(buildCompareQueue);
    buildCompareQueue.clear();
    for (const t of targets) {
      runScript('scripts/build-compare.mjs', t, () => {
        scheduleReload('build-compare(direct) ' + t);
      });
    }
  }, 500);
}

function runScript(script, target, done) {
  const args = [script, target];
  // windowsHide: Windows 에서 child process 마다 별도 콘솔 창이 떠 작업 흐름을 방해하는 문제 회피
  const proc = spawn('node', args, { cwd: ROOT, windowsHide: true });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d; });
  proc.on('error', (err) => {
    console.warn(`[auto-inject] spawn error ${script}:`, err.message);
    if (done) done();
  });
  proc.on('close', (code) => {
    if (code !== 0) {
      console.warn(`[auto-inject] ${script} ${target} exited ${code}${stderr ? '\n' + stderr : ''}`);
    } else {
      console.log(`[auto-inject] ${script} ${target} ✓`);
    }
    if (done) done();
  });
}

// ── 서버 ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // 상태 확인
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, root: ROOT });
    }

    // 최신 디자인 JSON 반환 (플러그인이 "Claude에서 불러오기" 시 호출)
    // 이름 지정이 없으면 1순위: active preview (브라우저가 지금 보고 있는 것), 2순위: latest-modified
    if (req.method === 'GET' && url.pathname === '/design') {
      const target = url.searchParams.get('name');
      let file;
      let source;
      if (target) {
        file = path.join(DESIGNS_DIR, target.endsWith('.figma.json') ? target : target + '.figma.json');
        if (!fs.existsSync(file)) return send(res, 404, { error: 'not found', name: target });
        source = 'named';
      } else if (activePreview && activePreview.figmaPath && fs.existsSync(activePreview.figmaPath)) {
        file = activePreview.figmaPath;
        source = 'active';
      } else {
        file = latestDesignFile();
        if (!file) return send(res, 404, { error: 'no design files in to-figma/' });
        source = 'latest';
      }
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`[design] → ${path.basename(file)} (source=${source})`);
      return send(res, 200, { name: path.basename(file), design: json, source });
    }

    // 사용 가능한 디자인 목록
    if (req.method === 'GET' && url.pathname === '/designs') {
      const list = fs.readdirSync(DESIGNS_DIR)
        .filter(f => f.endsWith('.figma.json'))
        .map(f => {
          const st = fs.statSync(path.join(DESIGNS_DIR, f));
          return { name: f, mtime: st.mtime };
        })
        .sort((a, b) => b.mtime - a.mtime);
      return send(res, 200, list);
    }

    // 플러그인 → 서버: 변경 로그 저장
    if (req.method === 'POST' && url.pathname === '/export') {
      const raw = await readBody(req);
      let payload;
      try { payload = JSON.parse(raw); }
      catch (e) { return send(res, 400, { error: 'invalid JSON' }); }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(EXPORTS_DIR, `change-log-${stamp}.json`);
      fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
      fs.writeFileSync(path.join(EXPORTS_DIR, 'latest.json'), JSON.stringify(payload, null, 2), 'utf8');

      console.log(`[export] ${file}  (${payload.totalChanges ?? '?'} changes)`);
      return send(res, 200, { ok: true, saved: path.basename(file) });
    }

    // SSE 라이브리로드 채널
    if (req.method === 'GET' && url.pathname === '/live') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
      });
      res.write(`retry: 1000\n\n`);
      res.write(`event: ready\ndata: ${Date.now()}\n\n`);
      sseClients.add(res);
      const ping = setInterval(() => { try { res.write(`: ping\n\n`); } catch {} }, 15000);
      req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
      return;
    }

    // 프리뷰 인덱스
    if (req.method === 'GET' && (url.pathname === '/preview' || url.pathname === '/preview/')) {
      return send(res, 200, renderPreviewIndex(), 'text/html; charset=utf-8');
    }

    // 리모컨이 탐색용으로 쓰는 프리뷰 파일 목록 (JSON, string[])
    if (req.method === 'GET' && url.pathname === '/preview-list') {
      return send(res, 200, listHtmlFiles().map(f => f.rel));
    }

    // 브라우저 → 서버: "지금 이 파일을 보고 있어요" 알림
    // 이 상태는 플러그인 "가져오기"가 우선적으로 참조함
    if (req.method === 'POST' && url.pathname === '/preview-active') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid JSON' }); }
      const htmlRel = body && body.name;
      if (!htmlRel || typeof htmlRel !== 'string') return send(res, 400, { error: 'missing name' });
      const figmaPath = htmlToFigmaPath(htmlRel);
      activePreview = { htmlRel, figmaPath, at: Date.now() };
      console.log(`[active] ${htmlRel} → ${figmaPath ? path.basename(figmaPath) : '(no .figma.json)'}`);
      return send(res, 200, {
        ok: true,
        htmlRel,
        figmaName: figmaPath ? path.basename(figmaPath) : null,
        hasFigma: !!figmaPath
      });
    }

    // 현재 active preview 상태 조회 (리모컨 인디케이터·디버깅용)
    if (req.method === 'GET' && url.pathname === '/preview-active') {
      if (!activePreview) return send(res, 200, { active: null });
      return send(res, 200, {
        active: {
          htmlRel: activePreview.htmlRel,
          figmaName: activePreview.figmaPath ? path.basename(activePreview.figmaPath) : null,
          hasFigma: !!activePreview.figmaPath,
          at: activePreview.at
        }
      });
    }

    // 프리뷰: to-figma/ 하위 파일 서빙
    if (req.method === 'GET' && url.pathname.startsWith('/preview/')) {
      const rel = decodeURIComponent(url.pathname.slice('/preview/'.length));
      const abs = safeResolveUnder(DESIGNS_DIR, rel);
      if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return send(res, 404, { error: 'not found', path: rel });
      }
      const ext = path.extname(abs).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      if (ext === '.html' || ext === '.htm') {
        let html = fs.readFileSync(abs, 'utf8');
        html = inlineKdsIcons(html); // <svg data-kds-icon="X" /> → 라이브러리 SVG content
        return send(res, 200, injectPreviewHelpers(html), type);
      }
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(abs).pipe(res);
      return;
    }

    // 외부 이미지 프록시: /proxy?url=<encoded URL>
    // 목적: 외부 CDN 이미지를 localhost:3939 통해 서빙 → manifest devAllowedDomains 단일 등록만으로 모든 이미지 접근
    // CORS 자동 처리, 5단계 리다이렉트 추적, 15초 타임아웃, 20MB 상한
    if (req.method === 'GET' && url.pathname === '/proxy') {
      const target = url.searchParams.get('url');
      if (!target) return send(res, 400, { error: 'missing url param' });
      try {
        const parsed = new URL(target);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return send(res, 400, { error: 'only http/https allowed' });
        }
      } catch (e) {
        return send(res, 400, { error: 'invalid url' });
      }
      proxyFetch(target, res);
      return;
    }

    // 리서치 에셋 서빙: /preview-assets/<slug>/<file> → research/<slug>/assets/<file>
    // 이미지 확장자만 허용, 다른 파일로는 못 새어나감
    if (req.method === 'GET' && url.pathname.startsWith('/preview-assets/')) {
      const rel = decodeURIComponent(url.pathname.slice('/preview-assets/'.length));
      // slug/file 형태 보장
      const parts = rel.split('/').filter(Boolean);
      if (parts.length < 2) return send(res, 404, { error: 'invalid path', hint: 'use /preview-assets/<slug>/<file>' });
      const slug = parts[0];
      const fileRel = parts.slice(1).join('/');
      const slugAssetsDir = path.join(RESEARCH_DIR, slug, 'assets');
      const abs = safeResolveUnder(slugAssetsDir, fileRel);
      if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return send(res, 404, { error: 'asset not found', slug, path: fileRel });
      }
      const ext = path.extname(abs).toLowerCase();
      if (!ASSET_EXT_WHITELIST.has(ext)) {
        return send(res, 403, { error: 'extension not allowed for assets', ext });
      }
      const type = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(abs).pipe(res);
      return;
    }

    return send(res, 404, { error: 'unknown route', path: url.pathname });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: String(err.message || err) });
  }
});

// '::' = IPv4 + IPv6 dual stack. Windows 일부 환경 + 최신 Chrome 에서 localhost 가 ::1 로 우선 resolve 되는데
// 127.0.0.1 만 LISTEN 하면 fallback 안 되어 "접근 불가". '::' 로 바꾸면 [::1] / 127.0.0.1 모두 수신.
server.listen(PORT, '::', () => {
  console.log(`Bridge server listening on http://localhost:${PORT} (dual-stack ipv4+ipv6)`);
  console.log(`  designs dir:  ${DESIGNS_DIR}`);
  console.log(`  exports dir:  ${EXPORTS_DIR}`);
  console.log(`  research dir: ${RESEARCH_DIR}`);
  console.log(`  preview:      http://localhost:${PORT}/preview`);
  console.log(`  assets:       http://localhost:${PORT}/preview-assets/<slug>/<file>`);
});
