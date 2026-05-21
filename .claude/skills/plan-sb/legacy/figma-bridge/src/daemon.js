#!/usr/bin/env node
/**
 * plan-sb figma-bridge daemon (push-only trim)
 *
 * Push 잡 큐 + 블롭 저장소 + 플러그인 폴링 브로커.
 * 제거: CDP/Yolo, WebSocket, /exec, /pull-result.
 */

import { createServer } from 'http';

const PORT = parseInt(process.env.DAEMON_PORT) || 3457;
const IDLE_TIMEOUT_MS = parseInt(process.env.DAEMON_IDLE_TIMEOUT) || 30 * 60 * 1000;

// ============ IDLE TIMEOUT ============
let lastActivityTime = Date.now();
let idleTimer = null;

function resetIdleTimer() {
  lastActivityTime = Date.now();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const idleSecs = Math.round((Date.now() - lastActivityTime) / 1000);
    console.log(`[daemon] Idle for ${idleSecs}s — auto-shutting down`);
    shutdown();
  }, IDLE_TIMEOUT_MS);
}
resetIdleTimer();

// ============ JOB QUEUE ============
const jobQueue = new Map();
const blobStore = new Map();

// Plugin liveness tracking (push-html.js 가 Figma plugin 떠있는지 확인용)
let lastPluginPollAt = 0;
const PLUGIN_ALIVE_WINDOW_MS = 8000; // 마지막 polling 후 8초 이내면 alive

const _gcTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobQueue) {
    if (job.status === 'done' && now - (job.finishedAt || 0) > 10 * 60 * 1000) jobQueue.delete(id);
  }
  for (const [id, entry] of blobStore) {
    if (now - entry.createdAt > 30 * 60 * 1000) blobStore.delete(id);
  }
}, 60 * 1000);
if (_gcTimer && _gcTimer.unref) _gcTimer.unref();

// ============ HTTP SERVER ============

function validateRequest(req) {
  const host = req.headers.host || '';
  if (!host.match(/^(localhost|127\.0\.0\.1)(:\d+)?$/)) {
    return 'Invalid host header';
  }
  return null;
}

async function handleRequest(req, res) {
  resetIdleTimer();

  // Bridge endpoints (Figma plugin은 null-origin fetch → CORS 필요)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const authError = validateRequest(req);
  if (authError) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: ' + authError }));
    return;
  }

  // Health
  if (req.url === '/health') {
    const now = Date.now();
    const pluginAlive = lastPluginPollAt > 0 && (now - lastPluginPollAt) < PLUGIN_ALIVE_WINDOW_MS;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mode: 'push-only',
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      pendingJobs: Array.from(jobQueue.values()).filter(j => j.status === 'pending').length,
      blobs: blobStore.size,
      pluginAlive,
      pluginLastSeenMsAgo: lastPluginPollAt ? (now - lastPluginPollAt) : null,
    }));
    return;
  }

  // Claude → /job (push 잡 등록)
  if (req.url === '/job' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const id = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        jobQueue.set(id, {
          id, payload, status: 'pending',
          createdAt: Date.now(), progress: null, result: null,
        });
        console.log(`[daemon] job queued: ${id} (payload ${body.length}B)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, status: 'pending' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Plugin → /job/next (다음 대기 작업 가져가기)
  if (req.url === '/job/next' && req.method === 'GET') {
    lastPluginPollAt = Date.now(); // plugin liveness 갱신
    const pending = Array.from(jobQueue.values()).find(j => j.status === 'pending');
    if (!pending) { res.writeHead(204); res.end(); return; }
    pending.status = 'running';
    pending.startedAt = Date.now();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: pending.id, payload: pending.payload }));
    return;
  }

  // Plugin → /job/{id}/progress
  if (req.url.startsWith('/job/') && req.url.endsWith('/progress') && req.method === 'POST') {
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const job = jobQueue.get(id);
      if (job) { try { job.progress = JSON.parse(body); } catch (_) {} }
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  // Plugin → /job/{id}/result
  if (req.url.startsWith('/job/') && req.url.endsWith('/result') && req.method === 'POST') {
    const id = req.url.split('/')[2];
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const job = jobQueue.get(id);
      if (job) {
        try { job.result = JSON.parse(body); } catch (e) { job.result = { error: e.message }; }
        job.status = 'done';
        job.finishedAt = Date.now();
        console.log(`[daemon] job done: ${id}`);
      }
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  // Claude → /job/{id} (상태 조회)
  const jobMatch = req.url.match(/^\/job\/([^\/]+)$/);
  if (jobMatch && req.method === 'GET') {
    const job = jobQueue.get(jobMatch[1]);
    if (!job) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: job.id, status: job.status,
      progress: job.progress, result: job.result,
      createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt,
    }));
    return;
  }

  // Blob 저장 (push-html.js → daemon)
  if (req.url.startsWith('/blob/') && req.method === 'POST') {
    const id = decodeURIComponent(req.url.slice('/blob/'.length));
    if (!id) { res.writeHead(400); res.end('missing id'); return; }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        blobStore.set(id, { data: parsed.data || '', mime: parsed.mime || 'application/octet-stream', createdAt: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, size: (parsed.data || '').length }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Blob 조회 (plugin → daemon)
  if (req.url.startsWith('/blob/') && req.method === 'GET') {
    const id = decodeURIComponent(req.url.slice('/blob/'.length));
    const entry = blobStore.get(id);
    if (!entry) { res.writeHead(404); res.end('blob not found'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entry));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

const httpServer = createServer(handleRequest);

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[daemon] plan-sb figma-bridge daemon running on port ${PORT}`);
  console.log(`[daemon] mode: push-only · idle timeout: ${IDLE_TIMEOUT_MS / 1000}s`);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('[daemon] Shutting down...');
  if (idleTimer) clearTimeout(idleTimer);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}
