// 분산 워커 daemon (v25) — 사용자 PC에서 본인 ~/.claude OAuth 로 파이프라인 실행
//
// 사용:
//   node bin/xcipe-worker.js
//
// 환경변수:
//   XCIPE_SERVER         (필수)  예: https://xcipe-production.up.railway.app
//   XCIPE_WORKER_TOKEN   (필수)  admin → POST /api/admin/users/:id/worker-token 로 발급
//   XCIPE_WORKER_ID      (선택)  hostname:pid 기본. 사용자 식별용 명칭.
//   XCIPE_POLL_INTERVAL  (선택)  기본 5000ms
//   XCIPE_HEARTBEAT_INT  (선택)  기본 15000ms
//   XCIPE_CLAUDE_CMD     (선택)  기본 'claude'. CLI 경로 override.
//
// 동작:
//   1. /api/worker/me 로 인증 확인
//   2. /api/worker/jobs/claim 로 작업 polling
//   3. 작업 받으면:
//      - heartbeat 인터벌 시작
//      - prompt 빌드 (skill_content + project + previous_artifacts + replan_context)
//      - claude CLI spawn → stdout 받음
//      - /api/worker/jobs/:id/result 업로드 OR /api/worker/jobs/:id/fail 보고
//   4. 다시 polling

const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// v30: 비동기 예외로 워커가 silently 죽지 않도록 catch.
//   .cmd wrapper 가 죽으면 재시작하니까 본 프로세스가 죽어도 회복되지만, 가능한 한 본 프로세스가 살아있게.
process.on('uncaughtException', (e, origin) => {
  console.error(`[xcipe-worker ${new Date().toISOString()}] FATAL uncaughtException origin=${origin}`, e && e.stack || e);
});
process.on('unhandledRejection', (reason) => {
  console.error(`[xcipe-worker ${new Date().toISOString()}] FATAL unhandledRejection`, reason && reason.stack || reason);
});

const SERVER         = (process.env.XCIPE_SERVER || '').replace(/\/+$/, '');
const WORKER_TOKEN   = process.env.XCIPE_WORKER_TOKEN || '';
const WORKER_ID      = process.env.XCIPE_WORKER_ID || `${os.hostname()}:${process.pid}`;
const POLL_INTERVAL  = parseInt(process.env.XCIPE_POLL_INTERVAL || '5000', 10);
const HEARTBEAT_INT  = parseInt(process.env.XCIPE_HEARTBEAT_INT || '15000', 10);
const CLAUDE_CMD     = process.env.XCIPE_CLAUDE_CMD || 'claude';
const CLAUDE_TIMEOUT = parseInt(process.env.XCIPE_CLAUDE_TIMEOUT || '900000', 10); // 15분

let _stop = false;
let _activeStep = null;
let _heartbeatTimer = null;

function log(...args) {
  console.log(`[xcipe-worker ${new Date().toISOString()}]`, ...args);
}
function warn(...args) {
  console.warn(`[xcipe-worker ${new Date().toISOString()}] WARN`, ...args);
}
function err(...args) {
  console.error(`[xcipe-worker ${new Date().toISOString()}] ERR`, ...args);
}

async function httpJson(method, urlPath, { body = null, claimToken = null } = {}) {
  const url = SERVER + urlPath;
  const headers = {
    'Content-Type': 'application/json',
    'X-Worker-Token': WORKER_TOKEN
  };
  if (claimToken) headers['X-Claim-Token'] = claimToken;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return { ok: true, empty: true };
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    return { ok: false, status: res.status, body: json };
  }
  return { ok: true, status: res.status, body: json };
}

async function verifyAuth() {
  const r = await httpJson('GET', '/api/worker/me');
  if (!r.ok) throw new Error(`인증 실패 (status=${r.status}): ${JSON.stringify(r.body)}`);
  log(`인증 OK — user=${r.body.user.email} (role=${r.body.user.role})`);
  return r.body.user;
}

async function claimNextJob() {
  const r = await httpJson('POST', '/api/worker/jobs/claim', { body: { worker_id: WORKER_ID } });
  if (r.empty) return null;
  if (!r.ok) {
    warn(`claim 실패 status=${r.status}`, r.body);
    return null;
  }
  return r.body;
}

function startHeartbeat(stepId, claimToken) {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  _heartbeatTimer = setInterval(async () => {
    try {
      const r = await httpJson('POST', `/api/worker/jobs/${stepId}/heartbeat`, { claimToken });
      if (!r.ok) warn(`heartbeat 실패 step=${stepId}`, r.body);
    } catch (e) {
      warn(`heartbeat 예외 step=${stepId}: ${e.message}`);
    }
  }, HEARTBEAT_INT);
}

function stopHeartbeat() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
}

// MVP prompt 빌드 — server 의 model-bridge.executeSkill 와 동일한 형식으로 생성
//   복잡한 케이스(design-system context, lessons, MANDATE 토큰 등)는 추후 보완.
function buildPrompt({ skill_name, skill_content, project, previous_artifacts, replan_context }) {
  const sections = [];

  sections.push(`# 스킬 실행: ${skill_name}`);
  sections.push('');
  sections.push('당신은 ELUO XCIPE 디지털 에이전시 자동화 파이프라인의 ' + skill_name + ' 스킬을 실행합니다.');
  sections.push('아래 SKILL.md 명세를 정확히 따르고, Self-Check 결과를 META 블록에 포함해 응답하세요.');
  sections.push('');

  if (skill_content) {
    sections.push('## SKILL.md');
    sections.push('```markdown');
    // 너무 크면 앞뒤 발췌 (40KB 한도)
    const MAX = 40 * 1024;
    if (skill_content.length > MAX) {
      const half = Math.floor(MAX / 2);
      sections.push(skill_content.slice(0, half) + '\n\n... [중략] ...\n\n' + skill_content.slice(-half));
    } else {
      sections.push(skill_content);
    }
    sections.push('```');
    sections.push('');
  }

  sections.push('## 프로젝트 정보');
  sections.push(`- 이름: ${project.name}`);
  sections.push(`- 코드: ${project.code}`);
  sections.push(`- 유형: ${project.type || 'web'}`);
  if (project.description) sections.push(`- 설명: ${project.description}`);
  if (project.prompt) sections.push(`- 요구사항: ${project.prompt}`);
  if (project.tech_stack) sections.push(`- 기술 스택: ${project.tech_stack}`);
  if (project.framework) sections.push(`- 프레임워크: ${project.framework}`);
  if (project.reference_url) sections.push(`- 레퍼런스 URL: ${project.reference_url}`);
  if (project.reference_content) {
    sections.push('');
    sections.push('### 레퍼런스 콘텐츠');
    sections.push(project.reference_content.slice(0, 8000));
  }
  sections.push('');

  if (Array.isArray(previous_artifacts) && previous_artifacts.length > 0) {
    sections.push('## 이전 단계 산출물 (컨텍스트)');
    for (const a of previous_artifacts) {
      sections.push(`### ${a.step} (${a.skill_name || ''})`);
      sections.push((a.content || '').slice(0, 8000));
      sections.push('');
    }
  }

  if (replan_context) {
    sections.push('## 재시도 컨텍스트');
    sections.push(`- 시도 횟수: ${replan_context.attempt}`);
    sections.push(`- 이전 실패 사유: ${replan_context.reason}`);
    if (replan_context.previousContent) {
      sections.push('### 이전 시도 콘텐츠 (개선 대상)');
      sections.push(replan_context.previousContent.slice(0, 4000));
    }
    sections.push('');
  }

  sections.push('## 출력 형식');
  sections.push('- 마크다운 (`.md`) 산출물.');
  sections.push('- 응답 마지막에 META 블록 (HTML 주석) 포함:');
  sections.push('```');
  sections.push('<!--META');
  sections.push('self_check: PASS | WARN | FAIL');
  sections.push('self_check_reason: (간단한 사유)');
  sections.push('-->');
  sections.push('```');

  return sections.join('\n');
}

// v29: KDS root 자동 탐색 + 서버 자동 sync — multi-device 워커풀 지원
//   1. env XCIPE_KDS_ROOT (사용자 명시)
//   2. 본인 PC 의 흔한 경로 (d:/SYS_v4/kds-v4 등) — 이미 자원 있는 PC
//   3. 캐시 폴더 (~/.xcipe/kds-v4) — 서버에서 자동 다운로드된 위치
//   4. 없으면 서버에서 다운로드해서 캐시 폴더에 풀고 사용
let _cachedKdsRoot = undefined;
function detectKdsRootLocal() {
  if (process.env.XCIPE_KDS_ROOT) return process.env.XCIPE_KDS_ROOT;
  const home = os.homedir();
  const candidates = [
    'd:/SYS_v4/kds-v4',
    'D:/SYS_v4/kds-v4',
    path.join(home, 'SYS_v4', 'kds-v4'),
    path.join(home, 'Documents', 'SYS_v4', 'kds-v4'),
    path.join(home, 'Downloads', 'SYS_v4', 'kds-v4'),
    path.join(process.cwd(), '..', 'kds-v4'),
    path.join(process.cwd(), 'kds-v4')
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, 'kds-rules')) || fs.existsSync(path.join(c, 'kds', 'data'))) {
        return c;
      }
    } catch {}
  }
  return null;
}

function ensureKdsSubdirs(root) {
  // KDS 작업에 필요한 빈 폴더 미리 생성 — claude Write tool 이 부모 디렉토리 누락 시
  // 실패할 가능성 차단. to-figma/from-figma 둘 다 영구.
  for (const sub of ['to-figma', 'from-figma']) {
    try {
      const p = path.join(root, sub);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
        log(`KDS subdir 생성: ${p}`);
      }
    } catch (e) {
      warn(`KDS subdir 생성 실패 ${sub}: ${e.message}`);
    }
  }
}

async function ensureKdsRoot() {
  if (_cachedKdsRoot) return _cachedKdsRoot;
  // 1차: 본인 PC 에 이미 있으면 그대로
  const local = detectKdsRootLocal();
  if (local) {
    _cachedKdsRoot = local;
    log(`KDS_V4_ROOT 로컬 감지: ${local}`);
    ensureKdsSubdirs(local);
    return local;
  }
  // 2차: 캐시 폴더 확인 (이전에 서버에서 받아둔 적 있음)
  const cacheRoot = path.join(os.homedir(), '.xcipe', 'kds-v4');
  if (fs.existsSync(path.join(cacheRoot, 'kds-rules'))) {
    _cachedKdsRoot = cacheRoot;
    log(`KDS_V4_ROOT 캐시 사용: ${cacheRoot}`);
    ensureKdsSubdirs(cacheRoot);
    return cacheRoot;
  }
  // 3차: 서버에서 자동 다운로드
  log('KDS 자원 못 찾음 — 서버에서 다운로드 중…');
  try {
    const res = await fetch(`${SERVER}/api/worker/kds-snapshot`, {
      headers: { 'X-Worker-Token': WORKER_TOKEN }
    });
    if (!res.ok) {
      err(`KDS snapshot 다운로드 실패: HTTP ${res.status}`);
      _cachedKdsRoot = null;
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(cacheRoot, { recursive: true });
    const zipPath = path.join(os.homedir(), '.xcipe', 'kds-v4-snapshot.zip');
    fs.writeFileSync(zipPath, buf);
    log(`KDS snapshot 받음 (${(buf.length / 1024 / 1024).toFixed(1)} MB) — 압축 푸는 중…`);
    // unzip — adm-zip 또는 node-stream-zip 사용. 없으면 PowerShell Expand-Archive 우회.
    let unzipped = false;
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(cacheRoot, true);
      unzipped = true;
    } catch (e) {
      // adm-zip 없으면 PowerShell 우회 (Windows)
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        try {
          execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${cacheRoot}' -Force"`,
            { stdio: 'pipe' });
          unzipped = true;
        } catch (pe) {
          err(`PowerShell Expand-Archive 실패: ${pe.message}`);
        }
      } else {
        // unix: unzip 명령
        const { execSync } = require('child_process');
        try {
          execSync(`unzip -o "${zipPath}" -d "${cacheRoot}"`, { stdio: 'pipe' });
          unzipped = true;
        } catch (ue) {
          err(`unzip 실패: ${ue.message}`);
        }
      }
    }
    if (!unzipped) {
      _cachedKdsRoot = null;
      return null;
    }
    try { fs.unlinkSync(zipPath); } catch {}
    log(`KDS 자원 캐시 완료: ${cacheRoot}`);
    ensureKdsSubdirs(cacheRoot);
    _cachedKdsRoot = cacheRoot;
    return cacheRoot;
  } catch (e) {
    err(`KDS snapshot 다운로드 예외: ${e.message}`);
    _cachedKdsRoot = null;
    return null;
  }
}

// 호환성 — 기존 detectKdsRoot 동기 호출 유지 (자원 자동 다운로드는 안 함, 빠른 체크용)
function detectKdsRoot() {
  if (_cachedKdsRoot !== undefined) return _cachedKdsRoot;
  return detectKdsRootLocal();
}

function spawnClaude(fullPrompt, opts = {}) {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `xcipe-worker-prompt-${crypto.randomBytes(8).toString('hex')}.txt`);
    try {
      fs.writeFileSync(tmpFile, fullPrompt, 'utf8');
    } catch (e) {
      return resolve({ ok: false, error: `prompt 파일 쓰기 실패: ${e.message}` });
    }

    // v30: allowedTools 명시 — kind 에 따라 Write 권한 분기
    //   kds-design: Read Write Edit Glob Grep Bash Skill (시안 생성에 Write 필수)
    //   kds-chat   : Read Glob Grep (분석/대화만)
    //   기본       : 모두 허용 (analyzePrompt/intake — 텍스트 응답만이라 무관)
    const allowedTools = opts.allowedTools || 'Read Write Edit Glob Grep Bash Skill';
    const flags = `-p --effort high --allowedTools "${allowedTools}" --exclude-dynamic-system-prompt-sections --output-format json --disable-slash-commands`;
    const cmd = process.platform === 'win32'
      ? `${CLAUDE_CMD} ${flags} < "${tmpFile}"`
      : `cat "${tmpFile}" | ${CLAUDE_CMD} ${flags}`;

    const execOptions = {
      timeout: opts.timeout || CLAUDE_TIMEOUT,
      maxBuffer: 100 * 1024 * 1024,
      encoding: 'utf8',
      windowsHide: true
    };
    if (opts.cwd) {
      execOptions.cwd = opts.cwd;
      log(`claude cwd=${opts.cwd}`);
    }
    exec(cmd, execOptions, (e, stdout, stderr) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (e) {
        if (e.killed) return resolve({ ok: false, error: `claude timeout (${CLAUDE_TIMEOUT}ms)`, killed: true });
        return resolve({ ok: false, error: stderr || e.message });
      }
      if (!stdout || !stdout.trim()) {
        return resolve({ ok: false, error: stderr || 'empty response' });
      }

      // claude --output-format json 응답 파싱
      try {
        const envelope = JSON.parse(stdout);
        const content = envelope.result || envelope.content || envelope.text || '';
        const usage = envelope.usage || null;
        return resolve({ ok: true, content, usage, raw: envelope });
      } catch (parseErr) {
        // JSON 파싱 실패 — content 가 직접 stdout인 경우 (legacy)
        return resolve({ ok: true, content: stdout.trim(), usage: null });
      }
    });
  });
}

async function processJob(job) {
  const { step_id, claim_token, skill_name } = job;
  log(`작업 받음 step=${step_id} skill=${skill_name}`);
  _activeStep = { step_id, claim_token };

  startHeartbeat(step_id, claim_token);
  const t0 = Date.now();

  try {
    const fullPrompt = buildPrompt(job);
    const r = await spawnClaude(fullPrompt);
    const duration = Date.now() - t0;

    if (!r.ok) {
      log(`claude 실패 step=${step_id}: ${r.error}`);
      await httpJson('POST', `/api/worker/jobs/${step_id}/fail`, {
        claimToken: claim_token,
        body: { error_message: r.error, retry: true }
      });
      return;
    }

    log(`claude 완료 step=${step_id} duration=${Math.round(duration / 1000)}s`);
    const upload = await httpJson('POST', `/api/worker/jobs/${step_id}/result`, {
      claimToken: claim_token,
      body: {
        content: r.content,
        duration_ms: duration,
        usage: r.usage,
        generated_files: []
      }
    });
    if (!upload.ok) {
      warn(`result 업로드 실패 step=${step_id} status=${upload.status}`, upload.body);
    } else {
      log(`result 업로드 OK step=${step_id}`);
    }
  } catch (e) {
    err(`processJob 예외 step=${step_id}: ${e.message}`);
    try {
      await httpJson('POST', `/api/worker/jobs/${step_id}/fail`, {
        claimToken: claim_token,
        body: { error_message: `워커 예외: ${e.message}`, retry: true }
      });
    } catch {}
  } finally {
    stopHeartbeat();
    _activeStep = null;
  }
}

async function pollLoop() {
  while (!_stop) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
        // 작업 끝났으면 즉시 다음 claim 시도 (대기 없이)
        continue;
      }
    } catch (e) {
      err(`poll 예외: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

// v28: ad-hoc invocation polling — analyzePrompt/intake/KDS chat·design
//   pipeline job 과 별개 큐. payload 에 prompt/systemPrompt 받아 claude 1회 호출.
async function claimNextInvocation() {
  const r = await httpJson('POST', '/api/worker/invocations/claim', {
    body: { worker_id: WORKER_ID }
  });
  if (!r.ok) {
    warn(`invocation claim 실패 status=${r.status}`, r.body && r.body.message);
    return null;
  }
  return r.body && r.body.invocation;
}

async function reportInvocationResult(id, ok, payload) {
  const body = ok
    ? { worker_id: WORKER_ID, ok: true, result: payload }
    : { worker_id: WORKER_ID, ok: false, error: payload };
  const r = await httpJson('POST', `/api/worker/invocations/${id}/result`, { body });
  if (!r.ok) warn(`invocation result 업로드 실패 id=${id} status=${r.status}`, r.body);
}

// 짧은 호출용 claude 실행 — spawnClaude 와 동일하지만 systemPrompt 합쳐서 전송
async function spawnClaudeShort({ systemPrompt, userPrompt }, opts = {}) {
  const combined = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${userPrompt}`
    : userPrompt;
  return spawnClaude(combined, opts);
}

async function processInvocation(inv) {
  const { id, kind, payload } = inv;
  log(`invocation 시작 id=${id} kind=${kind}`);
  const t0 = Date.now();
  try {
    let r;
    let kdsRoot = null;
    let beforeFiles = null;  // KDS 작업 전 to-figma/ 파일 set — diff 로 새 산출물 추출
    if (kind === 'analyze-prompt' || kind === 'intake-turn' || kind === 'kds-chat' || kind === 'kds-design') {
      const opts = {};
      if (kind === 'kds-chat' || kind === 'kds-design') {
        kdsRoot = await ensureKdsRoot();  // 자동 다운로드 포함
        if (kdsRoot) {
          opts.cwd = kdsRoot;
          // 작업 전 to-figma/ 스냅샷 — 끝나면 새 파일만 서버로 업로드
          const toFigmaDir = path.join(kdsRoot, 'to-figma');
          try {
            if (fs.existsSync(toFigmaDir)) {
              beforeFiles = new Set(fs.readdirSync(toFigmaDir));
            } else {
              fs.mkdirSync(toFigmaDir, { recursive: true });
              beforeFiles = new Set();
            }
          } catch {}
        } else {
          warn(`KDS invocation ${id} — kds-v4 자원 확보 실패. 작업 진행은 하나 산출물 위치 부정확 가능.`);
        }
        if (kind === 'kds-design') opts.timeout = 7_200_000;
      }
      r = await spawnClaudeShort({
        systemPrompt: payload.systemPrompt || '',
        userPrompt: payload.userPrompt || payload.prompt || ''
      }, opts);

      // KDS 산출물 자동 회수 — claude 가 to-figma/ 에 만든 새 파일을 서버로 업로드
      if (r && r.ok && kdsRoot && beforeFiles) {
        try {
          const toFigmaDir = path.join(kdsRoot, 'to-figma');
          const afterFiles = fs.existsSync(toFigmaDir) ? fs.readdirSync(toFigmaDir) : [];
          const newFiles = afterFiles.filter(f => !beforeFiles.has(f));
          if (newFiles.length > 0) {
            log(`KDS 산출물 ${newFiles.length}개 감지 — 서버로 업로드`);
            const filesPayload = newFiles.map(name => {
              try {
                const abs = path.join(toFigmaDir, name);
                const stat = fs.statSync(abs);
                if (stat.size > 10 * 1024 * 1024) {
                  warn(`${name} ${stat.size} bytes — 10MB 초과 skip`);
                  return null;
                }
                return {
                  name,
                  content_base64: fs.readFileSync(abs).toString('base64')
                };
              } catch (e) {
                warn(`산출물 읽기 실패 ${name}: ${e.message}`);
                return null;
              }
            }).filter(Boolean);

            if (filesPayload.length) {
              const up = await httpJson('POST', '/api/worker/kds-artifacts', {
                body: { files: filesPayload }
              });
              if (up.ok) {
                log(`KDS 산출물 ${filesPayload.length}개 서버 업로드 OK`);
              } else {
                warn(`KDS 산출물 업로드 실패 status=${up.status}`, up.body);
              }
            }
          }
        } catch (e) {
          warn(`KDS 산출물 회수 예외: ${e.message}`);
        }
      }
    } else {
      await reportInvocationResult(id, false, `unknown kind: ${kind}`);
      return;
    }

    const duration = Date.now() - t0;
    if (!r.ok) {
      log(`invocation 실패 id=${id} ${r.error}`);
      await reportInvocationResult(id, false, r.error || 'unknown error');
      return;
    }

    log(`invocation 완료 id=${id} duration=${Math.round(duration / 1000)}s`);
    await reportInvocationResult(id, true, {
      content: r.content,
      usage: r.usage,
      duration_ms: duration
    });
  } catch (e) {
    err(`invocation 예외 id=${id}: ${e.message}`);
    try { await reportInvocationResult(id, false, `워커 예외: ${e.message}`); } catch {}
  }
}

async function invocationLoop() {
  while (!_stop) {
    try {
      const inv = await claimNextInvocation();
      if (inv) {
        await processInvocation(inv);
        continue;
      }
    } catch (e) {
      err(`invocation poll 예외: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

async function checkClaudeCli() {
  return new Promise((resolve) => {
    exec(`${CLAUDE_CMD} auth status`, { timeout: 10000, windowsHide: true }, (e, stdout) => {
      if (e) {
        return resolve({ ok: false, error: `claude CLI 인증 안 됨 — \`${CLAUDE_CMD} /login\` 실행 후 재시도. 상세: ${e.message}` });
      }
      let info = {};
      try { info = JSON.parse(stdout); } catch {}
      resolve({
        ok: true,
        loggedIn: info.loggedIn !== false,
        email: info.email || null,
        plan: info.subscriptionType || null,
        orgName: info.orgName || null,
        authMethod: info.authMethod || null
      });
    });
  });
}

// 워커 → 서버 보고 — 본인 PC 의 claude CLI 인증 상태를 대시보드가 표시 가능하게.
// OAuth 토큰 자체는 절대 전송 X. loggedIn/email/plan 같은 메타데이터만.
async function reportClaudeSession(cli) {
  try {
    await httpJson('POST', '/api/worker/me/session', {
      body: {
        loggedIn: !!cli.loggedIn,
        email: cli.email,
        plan: cli.plan,
        orgName: cli.orgName,
        authMethod: cli.authMethod,
        workerId: WORKER_ID
      }
    });
  } catch (e) {
    warn(`session 보고 실패: ${e.message}`);
  }
}

async function start() {
  if (!SERVER) {
    err('XCIPE_SERVER 환경변수 필요 (예: https://xcipe-production.up.railway.app)');
    process.exit(1);
  }
  if (!WORKER_TOKEN) {
    err('XCIPE_WORKER_TOKEN 환경변수 필요 (admin → POST /api/admin/users/:id/worker-token)');
    process.exit(1);
  }

  log(`서버: ${SERVER}`);
  log(`워커 ID: ${WORKER_ID}`);

  // v28+: self-update — 시작 시 서버 최신 daemon.js 와 비교, 다르면 교체 후 자동 재시작
  //   매번 zip 새로 받지 않아도 됨. 환경변수 XCIPE_NO_UPDATE=1 로 비활성 가능.
  if (process.env.XCIPE_NO_UPDATE !== '1' && require.main === module) {
    try {
      const selfPath = __filename;
      const localBytes = fs.readFileSync(selfPath);
      // 헤더(env 주입) 제거 후 body 만 비교 — token 등 unique 부분 제외
      // CRLF/LF normalize — Windows zip 후 본문이 CRLF 로 들어와도 LF 인 remote 와 무한 mismatch 방지
      const normalize = (s) => String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const localBody = normalize(
        localBytes.toString('utf8').replace(/^[\s\S]*?\n\/\/ 분산 워커 daemon/, '// 분산 워커 daemon')
      );
      const res = await fetch(`${SERVER}/api/worker/download/xcipe-worker.js`);
      if (res.ok) {
        const remoteRaw = await res.text();
        const remote = normalize(remoteRaw);
        if (remote && remote.length > 1000 && remote !== localBody) {
          log('새 daemon 코드 감지 — 자동 업데이트 후 재시작');
          // 기존 헤더(env 주입) 보존 + body 만 교체 (remoteRaw 사용 — normalize 전 원본)
          const headerMatch = localBytes.toString('utf8').match(/^([\s\S]*?\n)\/\/ 분산 워커 daemon/);
          const header = headerMatch ? headerMatch[1] : '';
          fs.writeFileSync(selfPath, header + remoteRaw, 'utf8');
          log('업데이트 완료. 깨끗하게 종료 (wrapper 가 자동 재시작)');
          // Windows 에서 spawn detached + stdio:inherit 이 unreliable —
          // .cmd wrapper 가 어차피 재시작하므로 그냥 exit(0) 으로 위임.
          // exit code 0 = 정상 종료, wrapper 가 RESTART_COUNT 카운트 안 함.
          setTimeout(() => process.exit(0), 2000);
          return;
        }
      }
    } catch (e) {
      warn(`self-update 시도 실패 (무시하고 계속): ${e.message}`);
    }
  }

  // claude CLI 인증 확인
  const cli = await checkClaudeCli();
  if (!cli.ok) {
    err(cli.error);
    process.exit(1);
  }
  log(`claude CLI OK — ${cli.email || 'anonymous'} (${cli.plan || 'unknown plan'})`);

  // 서버 인증 확인
  try {
    await verifyAuth();
  } catch (e) {
    err(e.message);
    process.exit(1);
  }

  // 본인 claude session 정보를 서버에 보고 — 대시보드 step1 게이트 + 운영자 가시화
  await reportClaudeSession(cli);
  log('claude session 정보 서버 보고 완료');

  log(`polling 시작 (${POLL_INTERVAL}ms 간격, heartbeat ${HEARTBEAT_INT}ms)`);
  log(`invocation polling 시작 (analyze-prompt/intake/KDS chat·design)`);

  // 종료 처리
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // pipeline job + ad-hoc invocation 두 루프 병렬
  await Promise.all([pollLoop(), invocationLoop()]);
}

async function shutdown(signal) {
  log(`${signal} 수신 — 정리 중...`);
  _stop = true;
  stopHeartbeat();
  if (_activeStep) {
    log(`진행 중 작업 step=${_activeStep.step_id} 실패 보고 시도 (서버가 stale 회수 가능)`);
    try {
      await httpJson('POST', `/api/worker/jobs/${_activeStep.step_id}/fail`, {
        claimToken: _activeStep.claim_token,
        body: { error_message: `워커 종료 (${signal})`, retry: true }
      });
    } catch {}
  }
  process.exit(0);
}

if (require.main === module) {
  start().catch(e => { err(e.stack || e.message); process.exit(1); });
}

module.exports = { start, buildPrompt };
