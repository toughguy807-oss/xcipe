#!/usr/bin/env node
// SYS_v4 MCP Server CLI 진입점
//
// 사용:
//   node bin/mcp-server.js              — stdio 모드 시작
//
// Claude Code 등록 예:
//   ~/.claude.json 의 mcpServers 에 추가
//   {
//     "mcpServers": {
//       "sys-v4": {
//         "command": "node",
//         "args": ["D:/SYS_v4/bin/mcp-server.js"],
//         "env": { "ESYS_DEV": "1" }
//       }
//     }
//   }

// MCP stdio 프로토콜은 stdout 을 JSON-RPC 전용으로 사용함 — 모든 부수 로그(console.log, db migration print 등)는 stderr 로 강제.
// require() 이전에 patch 해야 모듈 로딩 시 발생하는 출력도 차단.
console.log  = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);
console.warn = (...args) => console.error(...args);
// process.stdout.write 도 라이브러리가 직접 호출할 수 있어 보호 (단, server 모듈 자체의 send 만 stdout 사용)
const _origWrite = process.stdout.write.bind(process.stdout);
const _serverModulePath = require('path').resolve(__dirname, '..', 'src', 'mcp', 'server.js');
process.stdout.write = function (chunk, ...rest) {
  // server.js 외 호출은 stderr 로 우회
  const stack = new Error().stack || '';
  if (stack.includes(_serverModulePath)) return _origWrite(chunk, ...rest);
  process.stderr.write(chunk, ...rest);
  return true;
};

require('../src/mcp/server').start();
