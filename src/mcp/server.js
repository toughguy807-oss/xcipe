// MCP Server — stdio JSON-RPC 2.0 라우터 (외부 SDK 의존 0)
//
// 지원 메서드:
//   initialize                 — capabilities 협상
//   notifications/initialized  — 초기화 완료 (응답 없음)
//   tools/list                 — 7개 tool 정의 반환 (plan-sb 포함 — 2026-05-15)
//   tools/call                 — tool 호출 (project_code 필수)
//   ping                       — 헬스체크
//
// 프레이밍: Line-delimited JSON (stdin에서 한 줄 = 한 메시지)
//   MCP 표준은 stdio 변형으로 LDJSON 또는 LSP 헤더 둘 다 허용.
//   본 PoC는 LDJSON 단순 모드만 지원 — Claude Code/Desktop 기본 호환.
//
// 환경변수:
//   MCP_LOG_FILE  — 미설정 시 stderr (stdout은 JSON-RPC 전용이라 절대 사용 금지)
//   ESYS_DEV      — 1이면 ~/.claude global skills 직접 참조

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const tools = require('./tools');

const PROTOCOL_VERSION = '2025-06-18'; // MCP spec date
const SERVER_INFO = { name: 'sys-v4', version: '1.0.0' };

// MCP 인증 모델 (2026-05-11 추가):
//   - env MCP_AUTH_TOKEN 미설정 → 인증 비활성 (PoC/로컬 단독 사용 모드)
//   - env MCP_AUTH_TOKEN=xxx → initialize.clientInfo._meta.authToken 으로 검증
//                              또는 tools/call.arguments._authToken 으로 검증
//                              불일치 시 -32001 unauthorized
//   - tools/call 시점에 sys.user_id 컨텍스트로 격리 평가 (clientInfo 에서 user_email 수집)
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || null;
let _authed = !AUTH_TOKEN; // 토큰 미설정이면 처음부터 인증된 상태
let _clientInfo = null;

function checkAuth(token) {
  if (!AUTH_TOKEN) return true;
  return token === AUTH_TOKEN;
}

const logStream = process.env.MCP_LOG_FILE
  ? fs.createWriteStream(process.env.MCP_LOG_FILE, { flags: 'a' })
  : null;

function log(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  if (logStream) logStream.write(line);
  else process.stderr.write(line); // stdout 오염 금지
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function jsonRpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

async function handle(msg) {
  const { id, method, params } = msg;

  // notifications/* — id 없음, 응답 없음
  if (method && method.startsWith('notifications/')) {
    log('info', `notification: ${method}`);
    return null;
  }

  // 인증 필수 메서드 게이트 — initialize 이후, _authed=true 가 아니면 차단
  const PUBLIC_METHODS = new Set(['initialize', 'ping']);
  if (!_authed && !PUBLIC_METHODS.has(method)) {
    return jsonRpcError(id, -32001, 'Unauthorized: initialize first with valid MCP_AUTH_TOKEN');
  }

  switch (method) {
    case 'initialize': {
      // params: { protocolVersion, capabilities, clientInfo, _meta? }
      log('info', `initialize from client: ${params?.clientInfo?.name || 'unknown'}`);

      // 인증 토큰 검증 (env MCP_AUTH_TOKEN 설정 시)
      const token = params?._meta?.authToken || params?.clientInfo?._meta?.authToken || null;
      if (!checkAuth(token)) {
        log('warn', `initialize: invalid auth token from ${params?.clientInfo?.name || 'unknown'}`);
        return jsonRpcError(id, -32001, 'Unauthorized: MCP_AUTH_TOKEN required',
          { hint: 'pass token via params._meta.authToken or clientInfo._meta.authToken' });
      }
      _authed = true;
      _clientInfo = params?.clientInfo || null;

      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'SYS_v4 plan-* 스킬 7종 (QST/REQ/FN/IA/SB/WBS + ops-deploy) 호출. ' +
                     '각 도구는 project_code(필수)와 user_input(선택)을 받습니다. ' +
                     'plan-sb는 JSON v2 스키마(screens[]) 반환 — GUI 플랫폼이 페이지 트리/콘텐츠 편집 UI로 직접 렌더링 가능.'
      });
    }

    case 'ping':
      return jsonRpcResult(id, {});

    case 'tools/list':
      return jsonRpcResult(id, { tools: tools.listTools() });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      if (!toolName) return jsonRpcError(id, -32602, 'tool name 필수');
      try {
        const r = await tools.callTool(toolName, toolArgs);
        if (r.isError) {
          // MCP 'tools/call'은 tool 자체 에러를 result.isError=true로 표시 (JSON-RPC 에러 X)
          return jsonRpcResult(id, {
            isError: true,
            content: [{ type: 'text', text: r.message }]
          });
        }
        const result = { content: r.content };
        if (r.structuredContent) result.structuredContent = r.structuredContent;
        return jsonRpcResult(id, result);
      } catch (err) {
        log('error', `tools/call ${toolName} threw: ${err.stack}`);
        return jsonRpcResult(id, {
          isError: true,
          content: [{ type: 'text', text: `INTERNAL: ${err.message}` }]
        });
      }
    }

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

function start() {
  log('info', `mcp-server starting — ${SERVER_INFO.name} ${SERVER_INFO.version}`);
  log('info', `tools registered: ${tools.listTools().map(t => t.name).join(', ')}`);

  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch (err) {
      log('error', `parse error: ${err.message} — raw: ${trimmed.slice(0, 200)}`);
      send(jsonRpcError(null, -32700, 'Parse error'));
      return;
    }
    try {
      const resp = await handle(msg);
      if (resp !== null) send(resp);
    } catch (err) {
      log('error', `handler threw: ${err.stack}`);
      if (msg.id !== undefined) send(jsonRpcError(msg.id, -32603, `Internal error: ${err.message}`));
    }
  });

  rl.on('close', () => {
    log('info', 'stdin closed — exiting');
    process.exit(0);
  });

  // SIGTERM/SIGINT cleanup
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      log('info', `received ${sig} — shutting down`);
      process.exit(0);
    });
  }
}

if (require.main === module) {
  start();
}

module.exports = { start, handle, PROTOCOL_VERSION };
