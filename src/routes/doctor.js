// /api/doctor — 시스템 자가진단 (B5)
// admin 전용. DB·디스크·워커·환경변수·에러율을 점검하고 PASS/WARN/FAIL 표기.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { db, getSetting } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { checkSession: bridgeCheckSession, getEffectiveWorkerMode } = require('../engine/model-bridge');
const sync = require('../engine/asset-sync');

router.use(authMiddleware);
router.use(requireRole('admin'));

// PRAGMA user_version 기대값 (db.js의 마이그레이션 로직과 일치)
//   v14 = artifacts.thinking_text + project_design_systems
//   v15 = intake_sessions.intent_json (PR3 의도 분류 결과 보존)
//   v16 = guest role 제거 (users/invitations CHECK 축소 + guest→member 변환)
//   v17 = 티켓 Asana baseline (assignee/priority/due/labels/parent/estimate + ticket_comments)
//   v18 = users.anthropic_api_key + anthropic_model (사용자별 AI Provider 키)
//   v19 = teams + team_members + projects.team_id (그룹 격리)
//   v20 = project_design_systems + figma_file_key/node_id/last_synced/direction/sync_meta (Figma 양방향)
//   v21-v23 = (intermediate migrations)
//   v24 = users.worker_token / worker_role 등 (migrateV25_distributedWorker — 함수명/pragma 값 1차이 주의)
//   v25 = users.claude_session_info (migrateV26_workerSession)
//   v26 = users.last_polled_at    (migrateV27_workerPolling)
const EXPECTED_USER_VERSION = 26;

// 출력 디렉터리 (pipeline/artifact-saver.js의 OUTPUT_ROOT와 동일 위치)
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function checkDb() {
  try {
    const t0 = Date.now();
    const row = db.prepare('SELECT 1 AS ok').get();
    const ms = Date.now() - t0;
    const journalMode = db.pragma('journal_mode', { simple: true });
    const userVersion = db.pragma('user_version', { simple: true });
    const fkOn = db.pragma('foreign_keys', { simple: true });
    const integrity = db.pragma('integrity_check', { simple: true });

    const checks = [];
    checks.push({ key: 'connect', label: 'DB 연결', status: row.ok === 1 ? 'PASS' : 'FAIL', detail: `${ms}ms` });
    checks.push({ key: 'journal_mode', label: 'WAL 모드', status: journalMode === 'wal' ? 'PASS' : 'WARN', detail: journalMode });
    checks.push({ key: 'foreign_keys', label: 'FK 활성', status: fkOn === 1 ? 'PASS' : 'WARN', detail: String(fkOn) });
    checks.push({
      key: 'user_version',
      label: '스키마 버전',
      status: userVersion === EXPECTED_USER_VERSION ? 'PASS' : 'WARN',
      detail: `actual=${userVersion}, expected=${EXPECTED_USER_VERSION}`
    });
    checks.push({ key: 'integrity', label: '무결성', status: integrity === 'ok' ? 'PASS' : 'FAIL', detail: integrity });
    return checks;
  } catch (err) {
    return [{ key: 'connect', label: 'DB 연결', status: 'FAIL', detail: err.message }];
  }
}

function checkFs() {
  const checks = [];
  // 1) data 디렉터리 존재 + 쓰기 가능
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, `.doctor-probe-${Date.now()}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    const dbStat = fs.existsSync(path.join(DATA_DIR, 'eluo.db')) ? fs.statSync(path.join(DATA_DIR, 'eluo.db')) : null;
    checks.push({
      key: 'data_dir',
      label: 'data 디렉터리 쓰기',
      status: 'PASS',
      detail: dbStat ? `eluo.db ${(dbStat.size / 1024 / 1024).toFixed(2)} MB` : '(eluo.db 없음 — 첫 실행)'
    });
  } catch (err) {
    checks.push({ key: 'data_dir', label: 'data 디렉터리 쓰기', status: 'FAIL', detail: err.message });
  }
  // 2) output 디렉터리 존재 + 쓰기
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const probe = path.join(OUTPUT_DIR, `.doctor-probe-${Date.now()}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    const projectDirs = fs.readdirSync(OUTPUT_DIR).filter(f => {
      try { return fs.statSync(path.join(OUTPUT_DIR, f)).isDirectory(); } catch { return false; }
    });
    checks.push({
      key: 'output_dir',
      label: 'output 디렉터리 쓰기',
      status: 'PASS',
      detail: `프로젝트 ${projectDirs.length}개`
    });
  } catch (err) {
    checks.push({ key: 'output_dir', label: 'output 디렉터리 쓰기', status: 'FAIL', detail: err.message });
  }
  return checks;
}

function checkWorker() {
  const checks = [];
  // 가장 최근 활동 시간 — 워커가 살아있는지 간접 추정
  // 실행 중인 파이프라인이 있으면 최근 1분 내 변화가 있어야 정상
  // pipelines 테이블에 updated_at 컬럼이 없으므로 started_at/completed_at 으로 마지막 활동 추정.
  // (PR 도입 당시 누락 — 좀비 회복은 recoverZombies가 started_at 기준으로 별도 처리)
  const running = db.prepare(`
    SELECT id, started_at, COALESCE(completed_at, started_at) AS updated_at
    FROM pipelines WHERE status = 'running'
    ORDER BY started_at DESC LIMIT 1
  `).get();

  if (!running) {
    checks.push({ key: 'worker_active', label: '워커 활동', status: 'PASS', detail: '실행 중 파이프라인 없음 (idle)' });
  } else {
    const lastUpdate = running.updated_at || running.started_at;
    if (lastUpdate) {
      const ageSec = Math.floor((Date.now() - new Date(lastUpdate + 'Z').getTime()) / 1000);
      // running 상태인데 60초 이상 변화 없음 → 좀비 의심 (recoverZombies 임계 5분)
      const status = ageSec < 60 ? 'PASS' : ageSec < 300 ? 'WARN' : 'FAIL';
      checks.push({ key: 'worker_active', label: '워커 활동', status, detail: `pipeline #${running.id} ${ageSec}초 전 갱신` });
    } else {
      checks.push({ key: 'worker_active', label: '워커 활동', status: 'WARN', detail: 'updated_at 없음' });
    }
  }

  // pending step 적체 — pipeline_steps 에 created_at 컬럼이 없으므로 started_at fallback.
  // pending 상태에서는 started_at 이 null 인 경우가 많아, pipelines.created_at 으로 한번 더 조인.
  const pendingCount = db.prepare(`
    SELECT COUNT(*) AS c
    FROM pipeline_steps s
    JOIN pipelines p ON p.id = s.pipeline_id
    WHERE s.status = 'pending'
      AND COALESCE(s.started_at, p.created_at) < datetime('now', '-10 minutes')
  `).get().c;
  checks.push({
    key: 'pending_steps',
    label: '적체된 pending step',
    status: pendingCount === 0 ? 'PASS' : pendingCount < 5 ? 'WARN' : 'FAIL',
    detail: `${pendingCount}개 (10분+ 대기)`
  });

  return checks;
}

function checkEnv() {
  const checks = [];
  const provider = (process.env.PROVIDER || 'mock').toLowerCase();

  if (provider === 'anthropic') {
    checks.push({
      key: 'anthropic_key',
      label: 'ANTHROPIC_API_KEY',
      status: process.env.ANTHROPIC_API_KEY ? 'PASS' : 'FAIL',
      detail: process.env.ANTHROPIC_API_KEY ? '설정됨' : '누락 — provider=anthropic 인데 키 없음'
    });
  } else if (provider === 'openai') {
    checks.push({
      key: 'openai_key',
      label: 'OPENAI_API_KEY',
      status: process.env.OPENAI_API_KEY ? 'PASS' : 'FAIL',
      detail: process.env.OPENAI_API_KEY ? '설정됨' : '누락'
    });
  } else {
    // process.env.PROVIDER 미설정 또는 mock — 실제 사용 provider는 DB 설정(getSetting)이 결정
    // checkAiProvider 항목과 라벨 충돌해 모순처럼 보이던 문제를 라벨 명확화로 해소
    const dbProvider = (getSetting('ai_provider') || 'mock').toLowerCase();
    if (dbProvider === 'mock') {
      checks.push({ key: 'provider', label: 'AI Provider (env)', status: 'WARN', detail: `env 미설정 + DB=mock (실제 LLM 호출 없음)` });
    } else {
      checks.push({ key: 'provider', label: 'AI Provider (env)', status: 'PASS', detail: `env 미설정 — DB 설정 사용 중 (${dbProvider})` });
    }
  }

  checks.push({
    key: 'jwt_secret',
    label: 'JWT_SECRET',
    status: process.env.JWT_SECRET ? 'PASS' : 'WARN',
    detail: process.env.JWT_SECRET ? '설정됨' : '기본값 사용 중 (운영 환경에서는 반드시 설정)'
  });

  checks.push({
    key: 'node_version',
    label: 'Node.js 버전',
    status: parseInt(process.versions.node.split('.')[0], 10) >= 20 ? 'PASS' : 'WARN',
    detail: `v${process.versions.node}`
  });

  return checks;
}

// PR1-B5: AI Provider 세션 점검 — provider 설정 + checkSession 결과
//   mock         → WARN (실제 LLM 미사용)
//   claude-code  → claude auth status JSON (loggedIn/email/plan)
//   claude-api   → API 키 보유 여부 (LLM 호출 X)
//
// v27: 분산 워커 모드(queue-only + claude-code) 분기.
//   서버 컨테이너엔 OAuth 가 없어 bridgeCheckSession 이 mock fallback 되고
//   loggedIn=false 가 반환되면서 FAIL 로 잘못 표기됨. 대신 본인(admin) 워커가
//   보고한 users.claude_session_info + last_polled_at 기반으로 점검한다.
async function checkAiProvider(userId) {
  const checks = [];
  const provider = (getSetting('ai_provider') || 'mock').toLowerCase();

  checks.push({
    key: 'ai_provider',
    label: 'AI Provider',
    status: provider === 'mock' ? 'WARN' : 'PASS',
    detail: provider === 'mock' ? 'mock 모드 (실제 LLM 호출 없음)' : provider
  });

  if (provider === 'mock') {
    return checks;
  }

  // claude-code + queue-only: 서버측 spawn 회피, 워커 보고 데이터 사용
  if (provider === 'claude-code' && getEffectiveWorkerMode() === 'queue-only') {
    let sessionInfo = null;
    let lastPolledAt = null;
    try {
      const row = db.prepare(`SELECT claude_session_info, last_polled_at FROM users WHERE id = ?`).get(userId);
      if (row) {
        if (row.claude_session_info) {
          try { sessionInfo = JSON.parse(row.claude_session_info); } catch {}
        }
        lastPolledAt = row.last_polled_at || null;
      }
    } catch {}

    const hasRecentPoll = !!(lastPolledAt && new Date(lastPolledAt).getTime() > Date.now() - 2 * 60 * 1000);
    checks.push({
      key: 'worker_polling',
      label: '본인 PC 워커 polling',
      status: hasRecentPoll ? 'PASS' : 'FAIL',
      detail: hasRecentPoll
        ? `최근 polling: ${lastPolledAt}`
        : (lastPolledAt ? `2분+ 미응답 (마지막: ${lastPolledAt}) — xcipe-worker 재시작 필요`
                        : '워커가 아직 polling 한 적 없음 — 다운로드 후 실행 필요')
    });

    const loggedIn = !!(sessionInfo && sessionInfo.loggedIn);
    checks.push({
      key: 'claude_code_login',
      label: 'Claude Code 로그인 (워커 PC)',
      status: loggedIn ? 'PASS' : 'FAIL',
      detail: loggedIn
        ? `${sessionInfo.email || '(email unknown)'} · ${sessionInfo.plan || 'plan unknown'}`
        : (sessionInfo ? `워커 보고: loggedIn=false` : '워커가 session 정보를 보고하지 않음 (가동 후 수초 대기 필요)')
    });
    if (loggedIn && sessionInfo.orgName) {
      checks.push({
        key: 'claude_code_org',
        label: '조직 (워커 PC)',
        status: 'PASS',
        detail: sessionInfo.orgName
      });
    }
    return checks;
  }

  let session;
  try {
    session = await bridgeCheckSession();
  } catch (err) {
    session = { ok: false, loggedIn: false, error: err.message };
  }

  if (provider === 'claude-code') {
    checks.push({
      key: 'claude_code_login',
      label: 'Claude Code 로그인',
      status: session.loggedIn ? 'PASS' : 'FAIL',
      detail: session.loggedIn
        ? `${session.email || '(email unknown)'} · ${session.plan || 'plan unknown'}`
        : (session.hint || session.error || 'claude /login 필요')
    });
    if (session.loggedIn && session.orgName) {
      checks.push({
        key: 'claude_code_org',
        label: '조직',
        status: 'PASS',
        detail: session.orgName
      });
    }
  } else if (provider === 'claude-api') {
    const hasKey = !!(getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY);
    checks.push({
      key: 'claude_api_key',
      label: 'ANTHROPIC_API_KEY',
      status: hasKey ? 'PASS' : 'FAIL',
      detail: hasKey ? '설정됨' : '키 없음 — admin/settings/ai 에서 등록 필요'
    });
    const model = getSetting('anthropic_model') || 'claude-opus-4-7';
    checks.push({
      key: 'claude_api_model',
      label: '기본 모델',
      status: 'PASS',
      detail: model
    });
  }

  return checks;
}

function checkErrorRate() {
  const checks = [];
  // 최근 1시간 에러율
  const lastHour = db.prepare(`
    SELECT COUNT(*) AS c FROM error_log WHERE created_at >= datetime('now', '-1 hour')
  `).get().c;
  const lastDay = db.prepare(`
    SELECT COUNT(*) AS c FROM error_log WHERE created_at >= datetime('now', '-1 day')
  `).get().c;

  checks.push({
    key: 'errors_1h',
    label: '최근 1시간 에러',
    status: lastHour === 0 ? 'PASS' : lastHour < 10 ? 'WARN' : 'FAIL',
    detail: `${lastHour}건`
  });
  checks.push({
    key: 'errors_24h',
    label: '최근 24시간 에러',
    status: lastDay < 20 ? 'PASS' : lastDay < 100 ? 'WARN' : 'FAIL',
    detail: `${lastDay}건`
  });
  return checks;
}

// RAG 코퍼스 drift 점검 — 디스크 vs DB 카운트 불일치 시 WARN (재인덱싱 권고)
function checkRagDrift() {
  const checks = [];
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  try {
    const root = path.join(os.homedir(), '.claude');
    if (!fs.existsSync(root)) return [{ key: 'rag_drift', label: 'RAG 코퍼스 drift', status: 'WARN', detail: '~/.claude 디렉토리 미존재' }];

    // 디스크 카운트
    function countSkills() {
      const d = path.join(root, 'skills');
      if (!fs.existsSync(d)) return 0;
      return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(d, e.name, 'SKILL.md'))).length;
    }
    function countMd(rel) {
      const d = path.join(root, rel);
      if (!fs.existsSync(d)) return 0;
      return fs.readdirSync(d).filter(f => f.endsWith('.md')).length;
    }

    const diskSkill = countSkills();
    const diskRule = countMd('lib/rules');
    const diskRef = countMd('ref');
    const diskAgent = countMd('agents');

    let dbCounts = {};
    try {
      const rows = db.prepare("SELECT source, COUNT(*) c FROM rag_corpus GROUP BY source").all();
      for (const r of rows) dbCounts[r.source] = r.c;
    } catch {
      return [{ key: 'rag_drift', label: 'RAG 코퍼스 drift', status: 'WARN', detail: 'rag_corpus 테이블 없음 (재인덱싱 필요)' }];
    }

    const drifts = [];
    if ((dbCounts.skill || 0) !== diskSkill) drifts.push(`skill ${dbCounts.skill || 0}/${diskSkill}`);
    if ((dbCounts.rule || 0) !== diskRule) drifts.push(`rule ${dbCounts.rule || 0}/${diskRule}`);
    if ((dbCounts.ref || 0) !== diskRef) drifts.push(`ref ${dbCounts.ref || 0}/${diskRef}`);
    if ((dbCounts.agent || 0) !== diskAgent) drifts.push(`agent ${dbCounts.agent || 0}/${diskAgent}`);

    if (drifts.length === 0) {
      checks.push({ key: 'rag_drift', label: 'RAG 코퍼스 drift', status: 'PASS', detail: `동기화 OK (skill ${diskSkill}, rule ${diskRule}, ref ${diskRef}, agent ${diskAgent})` });
    } else {
      checks.push({
        key: 'rag_drift',
        label: 'RAG 코퍼스 drift',
        status: 'WARN',
        detail: `DB/디스크 불일치 (${drifts.join(', ')}) — POST /api/rag/reindex 권고`
      });
    }
  } catch (err) {
    checks.push({ key: 'rag_drift', label: 'RAG 코퍼스 drift', status: 'WARN', detail: `진단 불가: ${err.message}` });
  }
  return checks;
}

// 자산 매니페스트 카테고리 헬스 — MASTER 추적 정책 위반 감지
function checkAssetCategoryHealth() {
  const checks = [];
  let health;
  try {
    health = sync.getCategoryHealth({ db });
  } catch (err) {
    return [{ key: 'asset_category_health', label: '자산 카테고리 헬스', status: 'WARN', detail: `진단 불가: ${err.message}` }];
  }
  for (const h of health) {
    if (h.policy === 'runtime_only') continue; // claude-md 등 비교 제외
    const status = h.status === 'master_missing' ? 'WARN'
                 : h.status === 'empty' ? 'WARN'
                 : 'PASS';
    const detail = h.status === 'master_missing'
      ? `MASTER에 ${h.category} 0건 / RUNTIME ${h.runtime_count}건 (unmanaged 분류됨)`
      : `RUNTIME ${h.runtime_count} / MASTER ${h.master_count}`;
    checks.push({
      key: `asset_${h.category}`,
      label: `자산 카테고리: ${h.category}`,
      status,
      detail
    });
  }
  return checks;
}

function checkSystem() {
  const checks = [];
  const uptimeSec = process.uptime();
  const mem = process.memoryUsage();
  const memUsedMb = (mem.rss / 1024 / 1024).toFixed(1);

  checks.push({
    key: 'uptime',
    label: '서버 가동 시간',
    status: 'PASS',
    detail: formatUptime(uptimeSec)
  });
  checks.push({
    key: 'memory',
    label: '메모리 사용 (RSS)',
    status: mem.rss < 1024 * 1024 * 1024 ? 'PASS' : 'WARN',
    detail: `${memUsedMb} MB`
  });
  checks.push({
    key: 'platform',
    label: '플랫폼',
    status: 'PASS',
    detail: `${os.platform()} ${os.release()} (${os.arch()})`
  });
  return checks;
}

function formatUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

router.get('/', async (req, res) => {
  const sections = {
    database: checkDb(),
    filesystem: checkFs(),
    worker: checkWorker(),
    ai_provider: await checkAiProvider(req.user && req.user.id),
    environment: checkEnv(),
    errors: checkErrorRate(),
    assets: checkAssetCategoryHealth(),
    rag: checkRagDrift(),
    system: checkSystem()
  };

  // 전체 요약
  let pass = 0, warn = 0, fail = 0;
  for (const s of Object.values(sections)) {
    for (const c of s) {
      if (c.status === 'PASS') pass++;
      else if (c.status === 'WARN') warn++;
      else fail++;
    }
  }
  const overall = fail > 0 ? 'FAIL' : warn > 0 ? 'WARN' : 'PASS';

  res.json({
    overall,
    summary: { pass, warn, fail, total: pass + warn + fail },
    sections,
    checked_at: new Date().toISOString()
  });
});

module.exports = router;
