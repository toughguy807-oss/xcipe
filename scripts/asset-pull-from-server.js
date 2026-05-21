#!/usr/bin/env node
// 클라이언트(외부 ~/.claude 머신)용 자산 다운로드 CLI
//
// 사용:
//   ESYS_SERVER=http://server:3747 ESYS_API_KEY=xxx node scripts/asset-pull-from-server.js [options]
//
// 옵션:
//   --dry-run        : 변경사항만 출력, 실제 쓰기 X
//   --root <path>    : 대상 ~/.claude 경로 (기본: process.env.CLAUDE_RUNTIME_ROOT 또는 os.homedir()/.claude)
//   --category <c>   : 특정 카테고리만 (skills|agents|rules|commands|ref|claude-md)
//   --include-pending: synced 외에 behind/pending_approval 도 포함 (디버깅용)
//   --quiet          : 변경사항만 출력 (skip 라인 숨김)
//
// 동작:
//   1) GET /api/client/assets/manifest 호출
//   2) 각 항목에 대해 로컬 파일 sha256 계산 → 일치하면 skip
//   3) 다르거나 없으면 GET /api/client/assets/file?path=&sha= 로 다운로드 → atomic 쓰기
//   4) 종료 시 요약 출력 (synced/updated/created/skipped/failed)
//
// 환경:
//   ESYS_SERVER  (필수)  http://host:port
//   ESYS_API_KEY (필수)  admin 발급 X-API-Key
//   CLAUDE_RUNTIME_ROOT  (옵션) 대상 경로 — 미지정 시 ~/.claude

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function parseArgs(argv) {
  const out = { dryRun: false, root: null, category: null, includePending: false, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--root') out.root = argv[++i];
    else if (a === '--category') out.category = argv[++i];
    else if (a === '--include-pending') out.includePending = true;
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--help' || a === '-h') {
      console.log('usage: ESYS_SERVER=... ESYS_API_KEY=... node asset-pull-from-server.js [--dry-run] [--root PATH] [--category CAT] [--include-pending] [--quiet]');
      process.exit(0);
    } else {
      console.error(`알 수 없는 옵션: ${a}`); process.exit(1);
    }
  }
  return out;
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function httpReq({ url, headers = {}, method = 'GET' }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

function resolveLocalPath(root, item) {
  const cat = item.category;
  if (cat === 'claude-md') return path.join(root, 'CLAUDE.md');
  if (cat === 'rules') {
    const sub = item.path.replace(/^rules\//, '');
    return path.join(root, 'lib', 'rules', sub);
  }
  const prefix = cat + '/';
  if (!item.path.startsWith(prefix)) return null;
  return path.join(root, cat, item.path.slice(prefix.length));
}

function atomicWrite(filePath, buf) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, filePath);
}

async function main() {
  const opts = parseArgs(process.argv);
  const server = (process.env.ESYS_SERVER || '').replace(/\/$/, '');
  const apiKey = process.env.ESYS_API_KEY || '';
  if (!server) { console.error('ESYS_SERVER 환경변수 필수'); process.exit(2); }
  if (!apiKey) { console.error('ESYS_API_KEY 환경변수 필수'); process.exit(2); }

  const root = opts.root || process.env.CLAUDE_RUNTIME_ROOT || path.join(os.homedir(), '.claude');
  console.log(`[asset-pull] server=${server}`);
  console.log(`[asset-pull] root=${root}`);
  console.log(`[asset-pull] mode=${opts.dryRun ? 'DRY-RUN' : 'WRITE'}${opts.category ? ' category=' + opts.category : ''}`);

  const headers = { 'X-API-Key': apiKey, 'Accept': 'application/json' };

  // 1) manifest
  const mPath = `/api/client/assets/manifest${opts.includePending ? '?include_pending=1' : ''}`;
  const mRes = await httpReq({ url: server + mPath, headers });
  if (mRes.status !== 200) {
    console.error(`manifest 실패: ${mRes.status} ${mRes.body.toString().slice(0, 300)}`);
    process.exit(3);
  }
  const manifest = JSON.parse(mRes.body.toString('utf8'));
  let items = manifest.items || [];
  if (opts.category) items = items.filter(it => it.category === opts.category);
  console.log(`[asset-pull] manifest = ${items.length} items`);

  const stats = { synced: 0, updated: 0, created: 0, skipped: 0, failed: 0 };
  const failures = [];

  for (const item of items) {
    const local = resolveLocalPath(root, item);
    if (!local) { stats.skipped++; continue; }

    const exists = fs.existsSync(local);
    let localSha = null;
    if (exists) {
      try { localSha = sha256(fs.readFileSync(local)); }
      catch (e) { stats.failed++; failures.push({ path: item.path, error: 'read_local: ' + e.message }); continue; }
    }

    if (localSha === item.sha256) {
      stats.synced++;
      if (!opts.quiet) console.log(`  =  ${item.path}`);
      continue;
    }

    // 다운로드
    const dlUrl = `${server}/api/client/assets/file?path=${encodeURIComponent(item.path)}&sha=${item.sha256}`;
    const dRes = await httpReq({ url: dlUrl, headers });
    if (dRes.status !== 200) {
      stats.failed++;
      failures.push({ path: item.path, error: `${dRes.status} ${dRes.body.toString().slice(0, 200)}` });
      console.log(`  ✗  ${item.path} — ${dRes.status}`);
      continue;
    }
    const downloadedSha = sha256(dRes.body);
    if (downloadedSha !== item.sha256) {
      stats.failed++;
      failures.push({ path: item.path, error: `sha 불일치 — manifest=${item.sha256.slice(0, 8)} download=${downloadedSha.slice(0, 8)}` });
      console.log(`  ✗  ${item.path} — sha 불일치`);
      continue;
    }

    if (opts.dryRun) {
      console.log(`  ${exists ? '~' : '+'}  ${item.path} (would ${exists ? 'update' : 'create'}, ${dRes.body.length} bytes)`);
      if (exists) stats.updated++; else stats.created++;
      continue;
    }

    try {
      atomicWrite(local, dRes.body);
      if (exists) {
        stats.updated++;
        console.log(`  ~  ${item.path} (updated, ${dRes.body.length} bytes)`);
      } else {
        stats.created++;
        console.log(`  +  ${item.path} (created, ${dRes.body.length} bytes)`);
      }
    } catch (e) {
      stats.failed++;
      failures.push({ path: item.path, error: 'write_local: ' + e.message });
      console.log(`  ✗  ${item.path} — write 실패: ${e.message}`);
    }
  }

  console.log('\n──────── 요약 ────────');
  console.log(`synced  : ${stats.synced}`);
  console.log(`updated : ${stats.updated}`);
  console.log(`created : ${stats.created}`);
  console.log(`skipped : ${stats.skipped}`);
  console.log(`failed  : ${stats.failed}`);
  if (failures.length) {
    console.log('\nfailures:');
    for (const f of failures.slice(0, 20)) console.log(`  - ${f.path}: ${f.error}`);
    if (failures.length > 20) console.log(`  ... 외 ${failures.length - 20}건`);
  }
  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('fatal:', e); process.exit(99); });
