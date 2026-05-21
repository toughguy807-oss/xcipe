#!/usr/bin/env node
/**
 * check-server-port.js
 *
 * 목적: Playwright 캡처 전, 기존 서버가 다른 디렉토리를 서빙하고 있어
 *       "v5를 캡처한다 생각했으나 v4를 캡처"하는 결함을 예방.
 *
 * 동작:
 *  1) 요청 포트(기본 8080)에 응답하는지 확인
 *  2) 응답한다면 `curl -s {port}/` 로 HTML 받아 프로젝트 마커(경로 키워드 등)
 *     가 포함되는지 검사
 *  3) 불일치면 next 가용 포트(8081~8099) 자동 탐색
 *  4) 결과 JSON — { port, match: bool, suggested: number, note: string }
 *
 * 종료코드: 0 = 사용 가능한 포트 확보, 1 = 모든 포트 점유.
 *
 * 사용:
 *   node check-server-port.js --port 8080 --marker "publish-v5"
 */

const http = require('http');
const net = require('net');

function parseArgs(argv) {
  const out = { port: 8080, marker: null, range: 20 };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--port') out.port = parseInt(v, 10), !argv[i].includes('=') && i++;
    else if (k === '--marker') out.marker = v, !argv[i].includes('=') && i++;
    else if (k === '--range') out.range = parseInt(v, 10), !argv[i].includes('=') && i++;
  }
  return out;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function fetchHtml(port, timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/', timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; if (body.length > 40000) { req.destroy(); resolve(body); } });
      res.on('end', () => resolve(body));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const primaryFree = await isPortFree(args.port);

  if (primaryFree) {
    console.log(JSON.stringify({
      port: args.port,
      occupied: false,
      match: null,
      suggested: args.port,
      note: `port ${args.port} 가용. 서버 기동 가능.`,
    }, null, 2));
    process.exit(0);
  }

  // 점유 중 → HTML 받아 마커 확인
  const body = await fetchHtml(args.port);
  let match = null;
  if (args.marker && body) match = body.includes(args.marker);

  if (match === true) {
    console.log(JSON.stringify({
      port: args.port,
      occupied: true,
      match: true,
      suggested: args.port,
      note: `port ${args.port} 점유 중이나 marker "${args.marker}" 일치 — 기존 서버 재사용.`,
    }, null, 2));
    process.exit(0);
  }

  // 다른 대상 서빙 중이거나 마커 불일치 → 다음 가용 포트 탐색
  for (let p = args.port + 1; p < args.port + 1 + args.range; p++) {
    if (await isPortFree(p)) {
      console.log(JSON.stringify({
        port: args.port,
        occupied: true,
        match: match,
        suggested: p,
        note: `port ${args.port} 점유 중 + marker 불일치 → 가용 포트 ${p} 권장.`,
      }, null, 2));
      process.exit(0);
    }
  }

  console.log(JSON.stringify({
    port: args.port,
    occupied: true,
    match: match,
    suggested: null,
    note: `port ${args.port}~${args.port + args.range} 모두 점유. 수동 정리 필요.`,
  }, null, 2));
  process.exit(1);
}

main();
