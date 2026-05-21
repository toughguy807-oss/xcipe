const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureInitialAdmin, authMiddleware } = require('./auth');
const { assertProjectAccess } = require('./middleware/project-access');
const { securityHeaders, rateLimit } = require('./middleware/security');

// 프로세스 안전망 — 비동기 에러 1건에 서버가 죽지 않도록 차단.
//   uncaughtException: throw 미잡힌 동기 에러 / EventEmitter 'error' 누락 등
//   unhandledRejection: async fn 안에서 await 안 한 promise 의 reject
//   둘 다 콘솔/파일에 흔적만 남기고 process.exit() 안 함. 단, OOM/EBADF 같은
//   복구 불가 오류는 Node 가 자체 종료시키므로 여기서 막을 수 없음 (정상).
process.on('uncaughtException', (err, origin) => {
  console.error(`[ESYS:uncaughtException] origin=${origin}`, err && err.stack || err);
  try { require('./db').logError && require('./db').logError('uncaughtException', String(err && err.stack || err)); } catch {}
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ESYS:unhandledRejection]', reason && reason.stack || reason);
  try { require('./db').logError && require('./db').logError('unhandledRejection', String(reason && reason.stack || reason)); } catch {}
});

const app = express();
const PORT = process.env.PORT || 3747;

// Reverse proxy 대응 — Railway/Vercel 등은 X-Forwarded-* 헤더 사용.
// TRUST_PROXY=1 (단일 프록시) 또는 hop 수. 미설정 시 0 (로컬 개발).
app.set('trust proxy', process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : 0);

// Middleware
app.use(securityHeaders());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Rate limiters — 인증·일반 API 분리
//   /api/auth/login: brute-force 방지 (10회/분/IP)
//   /api/*: 일반 API (300회/분/IP) — 대시보드 폴링·SSE 고려
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 10, message: '로그인 시도 횟수 초과 — 1분 후 다시 시도하세요' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));

// Static files (SPA)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 산출물 정적 노출 — 인증 + 프로젝트 격리 (Critical #2)
//   기존: express.static 만 사용 → 누구나 코드 추측으로 타인 산출물 열람 가능
//   변경: authMiddleware → URL path 첫 segment 가 프로젝트 code 가정 → assertProjectAccess
//   브라우저 정적 요청은 cookie 가 아닌 ?access_token= 으로 인증 (auth.js 가 query 토큰 지원)
const OUTPUT_DIR_ABS = path.resolve(__dirname, '..', 'output');
app.use('/static/output', authMiddleware, (req, res, next) => {
  // path traversal 방어 — 절대경로 정규화 후 OUTPUT_DIR_ABS 안인지 확인
  const decoded = decodeURIComponent(req.path || '');
  const resolved = path.resolve(OUTPUT_DIR_ABS, '.' + decoded);
  if (!resolved.startsWith(OUTPUT_DIR_ABS + path.sep) && resolved !== OUTPUT_DIR_ABS) {
    return res.status(403).json({ error: 'ESYS-OUT-001', message: 'Invalid path' });
  }
  // 첫 segment = 프로젝트 코드 (대문자/숫자/언더바)
  const m = decoded.match(/^\/([A-Z][A-Z0-9_]{1,19})(\/|$)/);
  if (!m) {
    return res.status(403).json({ error: 'ESYS-OUT-002', message: 'Project code required in path' });
  }
  const code = m[1];
  const access = assertProjectAccess(req, code);
  if (!access.ok) return res.status(access.status).json(access.body);
  next();
}, express.static(OUTPUT_DIR_ABS, {
  index: false,
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.md')) res.setHeader('Content-Type', 'text/markdown; charset=UTF-8');
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  }
}));

// Routes — 사용자 영역 (인증, 본인 정보, 프로젝트, 파이프라인 등)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/pipelines', require('./routes/pipelines'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/rag', require('./routes/rag'));
app.use('/api/intake', require('./routes/intake'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/client/assets', require('./routes/client-assets'));
app.use('/api/projects/:id/messages', require('./routes/messages'));

// Routes — 관리자 영역 (/api/admin/* — 모든 라우트가 admin role 필수)
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/invite', require('./routes/admin/invite'));
app.use('/api/admin/settings', require('./routes/admin/settings'));
app.use('/api/admin/assets', require('./routes/admin/assets'));
app.use('/api/admin/teams', require('./routes/admin/teams'));
app.use('/api/design-systems', require('./routes/design-systems'));
app.use('/api/figma', require('./routes/figma'));  // 인커밍 webhook + 플러그인 수신
// v25 분산 워커 — 사용자 PC daemon (X-Worker-Token 필요).
//   /download/xcipe-worker.js  : 인증 X, 기본 템플릿
//   /my-download (JWT 인증)    : 본인 토큰 + 서버 URL 자동 박힌 버전 — '한 번 다운로드 + 실행'
const workerRouter = require('./routes/worker');
app.get('/api/worker/download/xcipe-worker.js', workerRouter.downloadHandler);
app.get('/api/worker/my-download', authMiddleware, workerRouter.myDownloadHandler);
app.use('/api/worker', workerRouter);
app.use('/bridge', require('./routes/bridge'));    // KDS figma-change-tracker 플러그인 호환 endpoint (xcipe 내장)
app.use('/kds-bridge', require('./routes/kds-bridge-proxy')); // v25 KDS bridge-server(3939) proxy (Railway 단일 PORT 호환)

// v30: bridge-server 를 같은 프로세스로 통합 (Dockerfile concurrently 의존 제거).
//   require 시점에 listen(3939) 자동 호출됨. xcipe 프로세스 안 죽으면 bridge 도 살아있음.
//   Dockerfile CMD 에 bridge-server.js 별도 spawn 이 남아있으면 EADDRINUSE 발생 — Dockerfile 도 같이 정리.
try {
  require(path.resolve(__dirname, '..', 'kds-v4', 'bridge-server.js'));
  console.log('[xcipe] bridge-server 통합 로드 (port 3939)');
} catch (e) {
  console.error('[xcipe] bridge-server 로딩 실패:', e.message);
}
app.use('/api/kds-design', authMiddleware, require('./routes/kds-design'));    // KDS 디자인 정식 메뉴 (파이프라인 무관 독립 기능) — v28: 분산 워커 위임에 req.user.id 필요

// SPA fallback — non-API routes serve index.html (static/output 제외)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'ESYS-SRV-001', message: 'API endpoint not found' });
  }
  if (req.path.startsWith('/static/output')) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[ESYS-ERR] ${err.message}`);
  try {
    require('./db').logError({
      source: 'http',
      code: 'ESYS-SRV-500',
      message: err.message,
      stack: err.stack,
      context: { method: req.method, path: req.path, ip: req.ip }
    });
  } catch (e) { /* swallow */ }
  res.status(500).json({ error: 'ESYS-SRV-500', message: 'Internal server error' });
});

// Start
ensureInitialAdmin();

// F2: FTS5 색인 백필 — 미색인 artifact만 처리, 실패는 흡수
//   대량 (수천건) 환경에서도 1회성이며 색인 후엔 INSERT 시점에 실시간 갱신
try {
  const { reindexAllArtifacts } = require('./db');
  const r = reindexAllArtifacts();
  if (r.ready && r.indexed > 0) {
    console.log(`[ESYS] FTS5 backfill: ${r.indexed} indexed, ${r.skipped} already-indexed`);
  }
} catch (e) {
  console.warn('[ESYS] FTS5 backfill skipped:', e.message);
}

// U-G22: RAG 코퍼스 백필 — ~/.claude 자산 색인 (비어 있으면 1회)
try {
  const rag = require('./engine/rag-index');
  const stats = rag.getStats();
  if (stats.ready && stats.total === 0) {
    const r = rag.reindexAll();
    if (r.ready) {
      console.log(`[ESYS] RAG backfill: ${r.total} docs (skill=${r.sources.skill}, rule=${r.sources.rule}, ref=${r.sources.ref}, agent=${r.sources.agent}, catalog=${r.sources.catalog}) in ${r.ms}ms`);
    }
  }
} catch (e) {
  console.warn('[ESYS] RAG backfill skipped:', e.message);
}

const worker = require('./engine/pipeline-worker');
const archiveCleanup = require('./engine/archive-cleanup');
const retentionCleanup = require('./engine/retention-cleanup');
const backupVerify = require('./engine/backup-verify');
const costReport = require('./engine/cost-report');
const assetSync = require('./engine/asset-sync');
app.listen(PORT, () => {
  // 원칙 1·2 — 운영 모드 가시화. 사용자가 어느 모드인지 즉시 인지.
  const isDev = process.env.ESYS_DEV === '1';
  const mode = isDev ? 'DEV (~/.claude 직접 참조, hooks/플러그인 격리 OFF)' : 'BUNDLE (.claude 자기완결, hooks/플러그인 격리 ON)';
  console.log(`[ESYS] ELUO XCIPE v4.0 running on http://localhost:${PORT}`);
  console.log(`[ESYS] Mode: ${mode}`);
  if (isDev) {
    console.log(`[ESYS] ⚠️ DEV 모드 — 사용자별 ~/.claude 자산에 의존. 배포 시 npm start 로 BUNDLE 모드 사용 권장`);
  }
  worker.start();
  // F3: archive 자동 청소 — 기본 비활성 (settings.archive_auto_cleanup=true 시 실삭제)
  archiveCleanup.startScheduler();
  // G1: 운영 로그 보존 정리 — activity_log 90일 + error_log 30일 기본
  retentionCleanup.startScheduler();
  // G3: 백업 무결성 검증 — 최신 백업 1개를 24h마다 검증 (실패 시 logError + activity 알람)
  backupVerify.startScheduler();
  // G4: 일일 토큰 비용 리포트 — 어제 날짜 집계를 activity_log에 기록 (24h 디바운스)
  costReport.startScheduler();
  // S4: claude-assets auto-pull — RUNTIME vs MASTER 자동 비교 + status 갱신 (기본 30분)
  assetSync.startScheduler();
});
