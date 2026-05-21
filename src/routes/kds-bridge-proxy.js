// KDS Bridge proxy (v25) — Railway 단일 PORT 환경에서 kds-v4/bridge-server.js (3939) 접근
//
//   외부에서 https://railway-domain/kds-bridge/* 요청
//        ↓ xcipe Express
//   /kds-bridge/* → http-proxy-middleware → http://localhost:3939/*
//        ↓
//   kds-v4/bridge-server.js (same container, port 3939)
//
//   Figma 플러그인 manifest devAllowedDomains 에 Railway 도메인 등록 시
//   플러그인이 https://railway-domain/kds-bridge/design 같은 형태로 호출 가능.
//
//   SSE(/live) · WebSocket · POST body · path rewrite 모두 자동 처리.

const { createProxyMiddleware } = require('http-proxy-middleware');

const KDS_BRIDGE_PORT = parseInt(process.env.KDS_BRIDGE_PORT || '3939', 10);
const KDS_BRIDGE_HOST = process.env.KDS_BRIDGE_HOST || 'localhost';

const proxy = createProxyMiddleware({
  target: `http://${KDS_BRIDGE_HOST}:${KDS_BRIDGE_PORT}`,
  changeOrigin: true,
  ws: false,                                   // SSE만, WebSocket 미사용
  pathRewrite: { '^/kds-bridge': '' },         // /kds-bridge/design → /design
  // SSE 호환 — http-proxy-middleware v3 기본 selfHandleResponse=false 라 streaming OK
  proxyTimeout: 60_000,
  timeout: 60_000,
  on: {
    error: (err, req, res) => {
      // kds-bridge 미실행 시 사용자 친화적 응답
      if (res && !res.headersSent) {
        res.status(502).json({
          error: 'KDS-BRIDGE-DOWN',
          message: 'KDS bridge 서버(localhost:' + KDS_BRIDGE_PORT + ')가 응답하지 않습니다. 컨테이너 내 두 번째 프로세스가 시작됐는지 확인하세요.',
          hint: 'npm run start:with-kds 또는 별도 터미널에서 npm run kds-bridge 실행'
        });
      }
    }
  }
});

module.exports = proxy;
