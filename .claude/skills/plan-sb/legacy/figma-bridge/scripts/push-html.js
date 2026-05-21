#!/usr/bin/env node
/**
 * push-html.js (plan-sb figma-bridge · push-only)
 *
 * HTML → tree JSON → Figma push (1:1 노드 트리).
 *
 * 자동 처리:
 *   - daemon 미실행 시 백그라운드 자동 기동 (이 파일과 함께 묶인 src/daemon.js)
 *   - tree JSON 임시 디렉토리 (OS temp)
 *   - NODE_PATH 자동 탐색 (npm global root)
 *
 * Usage:
 *   node push-html.js <input.html> [--width 1920] [--single]
 *                                  [--single-page] [--layout horizontal|vertical|grid]
 *                                  [--cols N] [--gap N] [--page-prefix NAME] [--chunk N]
 *                                  [--watch] [--no-wait-plugin] [--plugin-timeout 120]
 *
 * --watch              : 입력 파일 변경 감지 시 자동 재푸시
 * --no-wait-plugin     : Figma plugin 미기동이어도 그대로 진행 (큐에 적재만)
 * --plugin-timeout N   : plugin 부팅 대기 타임아웃(초). 기본 120
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { argv, exit, env } from 'process';
import { resolve as pathResolve, dirname, basename, join } from 'path';
import { spawn, execSync } from 'child_process';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_ROOT = pathResolve(__dirname, '..');
const DAEMON_SCRIPT = pathResolve(BRIDGE_ROOT, 'src/daemon.js');
const HTML_TO_TREE = pathResolve(BRIDGE_ROOT, 'scripts/html-to-tree.js');
const DAEMON = env.DAEMON_URL || 'http://127.0.0.1:3457';

function parseArgs() {
  const args = argv.slice(2);
  if (!args.length) {
    console.error('Usage: push-html.js <input.html> [--width 1920] [--single] [--single-page] [--layout horizontal|vertical|grid] [--cols N] [--gap N] [--page-prefix NAME] [--chunk N]');
    exit(1);
  }
  const out = {
    input: args[0], width: 1920, perSlide: true, chunk: 10,
    singlePage: false, layout: 'vertical', cols: 4, gap: 100,
    watch: false, waitPlugin: true, pluginTimeoutSec: 120,
  };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--width') out.width = parseInt(args[++i], 10) || 1920;
    else if (args[i] === '--single') out.perSlide = false;
    else if (args[i] === '--single-page') out.singlePage = true;
    else if (args[i] === '--layout') out.layout = args[++i];
    else if (args[i] === '--cols') out.cols = parseInt(args[++i], 10) || 4;
    else if (args[i] === '--gap') out.gap = parseInt(args[++i], 10) || 100;
    else if (args[i] === '--page-prefix') out.pagePrefix = args[++i];
    else if (args[i] === '--chunk') out.chunk = parseInt(args[++i], 10) || 10;
    else if (args[i] === '--watch') out.watch = true;
    else if (args[i] === '--no-wait-plugin') out.waitPlugin = false;
    else if (args[i] === '--plugin-timeout') out.pluginTimeoutSec = parseInt(args[++i], 10) || 120;
  }
  return out;
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, Object.assign({ stdio: 'inherit', shell: false, env: process.env }, opts || {}));
    p.on('close', code => code === 0 ? resolve() : reject(new Error(cmd + ' exited ' + code)));
  });
}

function getNpmGlobalRoot() {
  try {
    const out = execSync('npm root -g', { encoding: 'utf8' }).trim();
    if (out && existsSync(out)) return out;
  } catch (_) {}
  return null;
}

async function ensureDaemon() {
  // health check
  try {
    const r = await fetch(DAEMON + '/health');
    if (r.ok) {
      const j = await r.json();
      console.log(`[push-html] daemon ok (mode=${j.mode}, pending=${j.pendingJobs || 0})`);
      return j;
    }
  } catch (_) {
    // not running → 백그라운드 기동
  }
  console.log('[push-html] daemon not running — starting in background…');
  const detached = spawn('node', [DAEMON_SCRIPT], {
    detached: true, stdio: 'ignore', env: process.env,
  });
  detached.unref();
  // 부팅 대기 (최대 10초)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const r = await fetch(DAEMON + '/health');
      if (r.ok) {
        const j = await r.json();
        console.log(`[push-html] daemon started (mode=${j.mode})`);
        return j;
      }
    } catch (_) {}
  }
  throw new Error('daemon failed to start within 10s');
}

async function checkHealth() {
  try {
    const r = await fetch(DAEMON + '/health');
    if (r.ok) return r.json();
  } catch (_) {}
  return null;
}

function tryLaunchFigmaDesktop() {
  // Windows: protocol handler 로 Figma 데스크탑 열기 (이미 떠있으면 무시됨)
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      // Windows: figma:// URI scheme — Figma 가 떠있지 않으면 실행, 떠있으면 foreground
      spawn('cmd', ['/c', 'start', '', 'figma://'], { detached: true, stdio: 'ignore', shell: false }).unref();
    } else if (platform === 'darwin') {
      spawn('open', ['figma://'], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', ['figma://'], { detached: true, stdio: 'ignore' }).unref();
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function ensurePlugin(timeoutSec) {
  // 이미 plugin 떠있으면 즉시 반환
  const h0 = await checkHealth();
  if (h0 && h0.pluginAlive) {
    console.log('[push-html] figma plugin alive — proceeding');
    return true;
  }

  // Figma 데스크탑 자동 실행 시도
  console.log('[push-html] figma plugin not detected — attempting to launch Figma desktop…');
  tryLaunchFigmaDesktop();

  // 폴링 대기 (사용자가 plugin 클릭하기를 기다림)
  console.log('[push-html] ─────────────────────────────────────────────');
  console.log('[push-html]  Figma 데스크탑에서 plugin 을 띄워주세요:');
  console.log('[push-html]    Plugins → Development → "plan-sb Figma Push"');
  console.log('[push-html]  (한 번 띄워두면 이후 push 는 자동 처리됩니다)');
  console.log(`[push-html]  대기 중… (최대 ${timeoutSec}s)`);
  console.log('[push-html] ─────────────────────────────────────────────');

  const start = Date.now();
  let dotCount = 0;
  while (Date.now() - start < timeoutSec * 1000) {
    await new Promise(r => setTimeout(r, 1500));
    const h = await checkHealth();
    if (h && h.pluginAlive) {
      console.log('\n[push-html] figma plugin detected — proceeding');
      return true;
    }
    process.stdout.write('.');
    dotCount++;
    if (dotCount % 40 === 0) process.stdout.write('\n');
  }
  console.log('\n[push-html] plugin 감지 실패 — 큐에만 적재합니다 (plugin 띄우면 자동 처리됨)');
  return false;
}

async function uploadBlob(id, data, mime) {
  const r = await fetch(`${DAEMON}/blob/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, mime: mime || 'application/octet-stream' }),
  });
  if (!r.ok) throw new Error(`blob upload failed ${r.status}: ${await r.text()}`);
  return r.json();
}

async function extractBlobs(tree, sessionId) {
  let imgCount = 0, svgCount = 0;
  async function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.tag === 'img' && node.imageData) {
      imgCount++;
      const id = `${sessionId}_img_${imgCount}`;
      await uploadBlob(id, node.imageData, node.imageMimeType);
      node.blobRef = id;
      delete node.imageData; delete node.imageMimeType;
    }
    if (node.tag === 'svg' && node.svgMarkup) {
      svgCount++;
      const id = `${sessionId}_svg_${svgCount}`;
      await uploadBlob(id, node.svgMarkup, 'image/svg+xml');
      node.svgBlobRef = id;
      delete node.svgMarkup;
    }
    if (Array.isArray(node.children)) for (const ch of node.children) await walk(ch);
  }
  await walk(tree);
  return { imgCount, svgCount };
}

async function submitTree(tree, pageName, sessionId, chunkSize) {
  const origBytes = Buffer.byteLength(JSON.stringify(tree), 'utf8');
  console.log(`[push-html]   tree=${(origBytes / 1024).toFixed(1)} KB · session=${sessionId}`);

  const bs = await extractBlobs(tree, sessionId);
  if (bs.imgCount || bs.svgCount) {
    console.log(`[push-html]   blobs uploaded: img=${bs.imgCount} svg=${bs.svgCount}`);
  }

  const payload = { kind: 'push', tree, sessionId, pageName, chunkSize };
  const submit = await fetch(DAEMON + '/job', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!submit.ok) throw new Error(`submit failed ${submit.status}: ${await submit.text()}`);
  const { id } = await submit.json();
  console.log(`[push-html]   job ${id} submitted, polling...`);

  const t0 = Date.now();
  const TIMEOUT = 30 * 60 * 1000;
  let lastPhase = '', lastDone = -1;
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    if (Date.now() - t0 > TIMEOUT) throw new Error('timeout');
    const r = await fetch(`${DAEMON}/job/${id}`);
    if (!r.ok) continue;
    const s = await r.json();
    if (s.progress && (s.progress.phase !== lastPhase || s.progress.done !== lastDone)) {
      lastPhase = s.progress.phase; lastDone = s.progress.done;
      const p = s.progress, st = p.stats || {};
      const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
      console.log(`[push-html]   ${p.phase.padEnd(14)} ${p.done}/${p.total} (${pct}%) · C=${st.created || 0} F=${st.failed || 0}`);
    }
    if (s.status === 'done') {
      const r2 = s.result || {};
      if (r2.error) throw new Error(r2.error);
      const rep = r2.report || {};
      const stats = rep.stats;
      const rate = (typeof rep.successRate === 'number') ? rep.successRate
        : (stats && stats.total ? (stats.created / stats.total) : 0);
      const rootId = rep.rootFigmaId;
      const fileKey = rep.fileKey || null;
      const figUrl = fileKey && rootId
        ? `https://www.figma.com/design/${fileKey}/${encodeURIComponent(rep.fileName || 'Untitled')}?node-id=${String(rootId).replace(':','-')}`
        : null;
      console.log(`[push-html]   DONE rate=${(rate * 100).toFixed(1)}% root=${rootId} page="${rep.page}"`);
      if (figUrl) console.log(`[push-html]   URL  ${figUrl}`);
      else console.log(`[push-html]   URL  (fileKey 회수 실패 — Figma 데스크탑에서 직접 확인 필요)`);

      if (rep.errors && rep.errors.length) {
        const cap = Math.min(10, rep.errors.length);
        console.log(`[push-html]   FAIL ${rep.errors.length}건 (상위 ${cap}건):`);
        for (let k = 0; k < cap; k++) {
          const e = rep.errors[k];
          console.log(`     · chunk ${e.chunk} node ${e.nodeId} <${e.tag}> parent ${e.parentId}: ${e.error}`);
        }
      }
      if (rep.fontWarnings && rep.fontWarnings.length) {
        console.log(`[push-html]   FONT 누락: ${rep.fontWarnings.join(', ')}`);
      }
      if (rep.retryQueue && rep.retryQueue.length) {
        console.log(`[push-html]   UNRECOVERED ${rep.retryQueue.length}건`);
      }
      return { ok: true, stats, rootId, rate, fileKey, figUrl, page: rep.page };
    }
  }
}

async function pushOnce(opts, inputPath) {
  // 2. HTML → tree JSON (OS temp 사용)
  const baseName = basename(inputPath, '.html');
  const outDir = join(tmpdir(), 'plan-sb-figma-bridge');
  try { mkdirSync(outDir, { recursive: true }); } catch (_) {}
  const treeJsonPath = join(outDir, `${baseName}_tree.json`);

  console.log(`[push-html] step 1: html-to-tree → ${treeJsonPath}`);
  const npmGlobal = getNpmGlobalRoot();
  const childEnv = npmGlobal ? Object.assign({}, process.env, { NODE_PATH: npmGlobal }) : process.env;
  const h2tArgs = [HTML_TO_TREE, inputPath, treeJsonPath, '--width', String(opts.width)];
  if (opts.perSlide) h2tArgs.push('--per-slide');
  await run('node', h2tArgs, { env: childEnv });

  // 3. tree JSON 읽기
  const data = JSON.parse(readFileSync(treeJsonPath, 'utf8'));
  const pagePrefix = opts.pagePrefix || baseName;

  if (data.mode === 'single') {
    console.log(`[push-html] step 2: pushing single tree → page "${pagePrefix}"`);
    const sessionId = `push_${Date.now()}`;
    const r = await submitTree(data.tree, pagePrefix, sessionId, opts.chunk);
    console.log(`[push-html] FINAL: rate=${(r.rate * 100).toFixed(1)}% · root=${r.rootId}${r.figUrl ? ' · ' + r.figUrl : ''}`);
    return;
  }

  // single-page 모드: 여러 슬라이드를 한 Figma 페이지에 별도 root frame 으로 배치
  if (opts.singlePage && data.trees && data.trees.length) {
    const trees = data.trees;
    const slideW = trees[0].box.w;
    const slideH = trees[0].box.h;
    const gap = opts.gap;
    console.log(`[push-html] step 2: pushing ${trees.length} slides as ${trees.length} root frames on ONE page "${pagePrefix}" (layout=${opts.layout}, gap=${gap})`);
    const summary = [];
    for (let i = 0; i < trees.length; i++) {
      let x = 0, y = 0;
      if (opts.layout === 'horizontal') { x = i * (slideW + gap); y = 0; }
      else if (opts.layout === 'grid') {
        const col = i % opts.cols;
        const row = Math.floor(i / opts.cols);
        x = col * (slideW + gap); y = row * (slideH + gap);
      } else {
        x = 0; y = i * (slideH + gap);
      }
      const t = JSON.parse(JSON.stringify(trees[i]));
      t.box.x = x; t.box.y = y;
      const idx = String(i + 1).padStart(2, '0');
      console.log(`\n[push-html] === slide ${i + 1}/${trees.length} → page "${pagePrefix}" @ (${x}, ${y}) ===`);
      const sessionId = `push_${Date.now()}_sp${idx}`;
      try {
        const r = await submitTree(t, pagePrefix, sessionId, opts.chunk);
        summary.push({ slide: i + 1, ok: true, rate: r.rate, rootId: r.rootId, figUrl: r.figUrl });
      } catch (e) {
        console.error(`[push-html] slide ${i + 1} FAIL:`, e.message);
        summary.push({ slide: i + 1, ok: false, error: e.message });
      }
    }
    console.log('\n[push-html] === SUMMARY ===');
    for (const s of summary) {
      const tag = s.ok ? `OK rate=${(s.rate * 100).toFixed(1)}% root=${s.rootId}${s.figUrl ? ' ' + s.figUrl : ''}` : `FAIL ${s.error}`;
      console.log(`  · slide ${s.slide}: ${tag}`);
    }
    const okCount = summary.filter(s => s.ok).length;
    const avgRate = summary.filter(s => s.ok).reduce((a, s) => a + s.rate, 0) / Math.max(1, okCount);
    console.log(`[push-html] ${okCount}/${summary.length} slides ok · avg rate=${(avgRate * 100).toFixed(1)}%`);
    return;
  }

  // per-slide
  console.log(`[push-html] step 2: pushing ${data.count} slides as separate pages`);
  const summary = [];
  for (let i = 0; i < data.trees.length; i++) {
    const t = data.trees[i];
    const idx = String(i + 1).padStart(2, '0');
    const pageName = `${pagePrefix}-S${idx}`;
    console.log(`\n[push-html] === slide ${i + 1}/${data.count} → "${pageName}" ===`);
    const sessionId = `push_${Date.now()}_s${idx}`;
    try {
      const r = await submitTree(t, pageName, sessionId, opts.chunk);
      summary.push({ slide: i + 1, page: pageName, ok: true, rate: r.rate, rootId: r.rootId, figUrl: r.figUrl });
    } catch (e) {
      console.error(`[push-html] slide ${i + 1} FAIL:`, e.message);
      summary.push({ slide: i + 1, page: pageName, ok: false, error: e.message });
    }
  }
  console.log('\n[push-html] === SUMMARY ===');
  for (const s of summary) {
    const tag = s.ok ? `OK rate=${(s.rate * 100).toFixed(1)}%${s.figUrl ? ' ' + s.figUrl : ''}` : `FAIL ${s.error}`;
    console.log(`  · slide ${s.slide} (${s.page}): ${tag}`);
  }
  const okCount = summary.filter(s => s.ok).length;
  const avgRate = summary.filter(s => s.ok).reduce((a, s) => a + s.rate, 0) / Math.max(1, okCount);
  console.log(`[push-html] ${okCount}/${summary.length} slides ok · avg rate=${(avgRate * 100).toFixed(1)}%`);
}

async function main() {
  const opts = parseArgs();
  const inputPath = pathResolve(opts.input);
  if (!existsSync(inputPath)) { console.error('[push-html] input not found:', inputPath); exit(1); }

  // 1. daemon 보장 (없으면 백그라운드 기동)
  await ensureDaemon();

  // 1.5 figma plugin 보장 (자동 launch 시도 + 사용자 안내 + 폴링 대기)
  if (opts.waitPlugin) {
    await ensurePlugin(opts.pluginTimeoutSec);
  }

  // 2. 단일/감시 모드 분기
  if (opts.watch) {
    console.log(`[push-html] WATCH mode — ${inputPath} 변경 감지 시 자동 재푸시 (Ctrl+C 종료)`);
    let busy = false;
    let lastMtime = 0;
    let lastSize = -1;
    // 초기 1회 push
    busy = true;
    try { await pushOnce(opts, inputPath); } catch (e) { console.error('[push-html] initial push failed:', e.message); }
    busy = false;
    // 폴링 기반 변경 감지 (chokidar 의존성 회피)
    const { statSync } = await import('fs');
    setInterval(async () => {
      if (busy) return;
      try {
        const st = statSync(inputPath);
        const m = st.mtimeMs, s = st.size;
        if (lastMtime === 0) { lastMtime = m; lastSize = s; return; }
        if (m !== lastMtime || s !== lastSize) {
          lastMtime = m; lastSize = s;
          console.log(`\n[push-html] ⟳ change detected — re-pushing…`);
          busy = true;
          try { await pushOnce(opts, inputPath); }
          catch (e) { console.error('[push-html] watch push failed:', e.message); }
          busy = false;
        }
      } catch (_) {}
    }, 1500);
    return;
  }

  await pushOnce(opts, inputPath);
}

main().catch(e => { console.error('[push-html] fatal:', e.stack || e.message); exit(10); });
