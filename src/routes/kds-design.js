// /api/kds-design — xcipe 의 KDS 디자인 정식 메뉴 백엔드.
//   파이프라인(Planning→Design→...) 무관 독립 기능. KDS v4 워크플로우로 화면을 자동 생성하고
//   KDS to-figma/ 에 저장 → 디자이너가 KDS Design Bridge 플러그인 으로 import.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { generateDesign, getKdsRoot } = require('../engine/kds-design-runner');

// ── 채팅 세션 (대화형 요구사항 명확화) — 디스크 저장 + 작업 단위 분리 ────────────────────────
// 각 session 은 한 작업 단위. 디스크 (data/kds-design-sessions/<id>.json) 영구 저장.
// 사용자가 [새 대화] 또는 [READY] 후 자동 분리 시 새 session 생성.
const SESSIONS_DIR = path.join(__dirname, '..', '..', 'data', 'kds-design-sessions');
function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}
function persistSession(sess) {
  try {
    ensureSessionsDir();
    fs.writeFileSync(path.join(SESSIONS_DIR, sess.id + '.json'), JSON.stringify(sess, null, 2), 'utf8');
  } catch {}
}
function loadSessionFromDisk(id) {
  try {
    const f = path.join(SESSIONS_DIR, id + '.json');
    if (!fs.existsSync(f)) return null;
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    migrateSessionShape(s);
    return s;
  } catch { return null; }
}

// 구버전 세션 호환 — generationJobId 만 있고 jobHistory 가 없으면 1건 배열로 자동 변환.
// 변환은 in-place. 디스크 재기록은 다음 persistSession 호출 시 자연스럽게 반영.
function migrateSessionShape(sess) {
  if (!sess) return;
  if (!Array.isArray(sess.jobHistory)) {
    sess.jobHistory = sess.generationJobId
      ? [{ jobId: sess.generationJobId, startedAt: sess.created_at || Date.now() }]
      : [];
  }
}

// 신/구 코드 모두에서 호출 — generationJobId 는 deprecated 지만 호환 유지 (최신 jobId 미러).
// migrateSessionShape 를 먼저 호출하므로, 구버전 세션의 이전 generationJobId 도 jobHistory 에 1건으로 보존됨.
function attachJob(sess, jobId) {
  if (!sess || !jobId) return;
  migrateSessionShape(sess);
  sess.jobHistory.push({ jobId, startedAt: Date.now() });
  sess.generationJobId = jobId;
}
function deriveSessionTitle(sess) {
  // 첫 사용자 메시지 30자 + [READY] requirement (있으면) 우선
  const firstUser = sess.messages.find(m => m.role === 'user');
  const ready = sess.messages.find(m => m.role === 'assistant' && /\[READY\]/.test(m.content || ''));
  if (ready) {
    const req = (ready.content.match(/requirement="([^"]+)"/) || [])[1];
    if (req) return req.slice(0, 50);
  }
  return firstUser ? firstUser.content.slice(0, 50) : '(빈 대화)';
}
const sessions = new Map();

// ── from-figma/ watcher ─────────────────────────────────────────
// 디자이너가 Figma 에서 "Claude로 보내기" 누르면 KDS bridge 가 from-figma/change-log-*.json 저장.
// xcipe 가 그것을 5초마다 폴링 → 새 변경 감지 시 가장 최근 session 에 "반영할까요?" 메시지 자동 추가.
// 사용자가 채팅에서 "응 반영해줘" 같이 동의하면 자동으로 claude 호출해 to-figma/ 갱신.
let _fromFigmaSnapshot = new Map(); // filename → mtimeMs
let _fromFigmaPending = null;       // 마지막 도착 change-log (사용자 동의 대기)
function startFromFigmaWatcher() {
  const dir = path.join(getKdsRoot(), 'from-figma');
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith('change-log-')) continue;
      _fromFigmaSnapshot.set(f, fs.statSync(path.join(dir, f)).mtimeMs);
    }
  } catch {}
  setInterval(() => {
    try {
      const now = new Map();
      for (const f of fs.readdirSync(dir)) {
        if (!f.startsWith('change-log-')) continue;
        now.set(f, fs.statSync(path.join(dir, f)).mtimeMs);
      }
      for (const [f, mt] of now.entries()) {
        if (!_fromFigmaSnapshot.has(f)) {
          handleFromFigmaArrival(path.join(dir, f));
        }
      }
      _fromFigmaSnapshot = now;
    } catch {}
  }, 5000);
}
function handleFromFigmaArrival(filePath) {
  let j;
  try { j = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return; }
  _fromFigmaPending = { file: filePath, data: j, at: Date.now() };
  const screen = j.filteredFor || {};
  const summary = (j.changes || []).slice(0, 5).map(c =>
    `  • ${c.nodeName || '?'}: ${c.detail || c.type || ''}`).join('\n');
  const msg = `🎨 디자이너 Figma 수정 도착\n\n화면: ${screen.name || '?'} (kdsId=${screen.kdsId || '?'})\n변경 ${j.totalChanges || 0}건:\n${summary}\n\n이 변경을 to-figma/ 파일에 반영하시겠어요? 채팅에 "응 반영해줘" 또는 "아니" 라고 답해주세요.`;
  // 가장 최근 session 들에 broadcast (메시지 추가)
  for (const sess of sessions.values()) {
    sess.messages.push({ role: 'assistant', kind: 'figma_pending', content: msg, at: Date.now() });
  }
}
async function applyFromFigmaPending() {
  if (!_fromFigmaPending) return { ok: false, error: '대기 중 변경 없음' };
  const pending = _fromFigmaPending;
  _fromFigmaPending = null;
  // filteredFor 가 null 이면 changes 안에서 screenName/screenKdsId 가 있는 첫 항목 fallback.
  // (KDS Change Tracker 가 일부 export 에서 filteredFor 누락 — 22:00, 22:06 케이스)
  let screen = pending.data.filteredFor || null;
  if (!screen || (!screen.kdsId && !screen.name)) {
    for (const c of (pending.data.changes || [])) {
      if (c.screenKdsId || c.screenName) {
        screen = { kdsId: c.screenKdsId, name: c.screenName, nodeId: c.screenNodeId };
        break;
      }
    }
    if (!screen) screen = {};
  }
  const screenKdsId = screen.kdsId || '';
  const screenName = screen.name || '';
  // Figma 화면명에서 변형/뷰포트 추출 — 예: "Screen — Self-open Main (C, mobile)" → variant=C, vp=mobile
  const m = screenName.match(/\(([A-Z]),\s*(mobile|desktop|tablet)\)/i);
  const variant = m ? m[1].toLowerCase() : '';
  const vp = m ? m[2].toLowerCase() : '';
  const slug = variant && vp ? `-${variant}-${vp}` : '';

  const toFigmaDir = path.join(getKdsRoot(), 'to-figma');
  let targetFile = null;
  let matchedBy = '';
  try {
    const files = fs.readdirSync(toFigmaDir).filter(f => f.endsWith('.figma.json'));
    // 1. kdsId 정확 매칭
    targetFile = files.find(f => {
      try {
        const c = JSON.parse(fs.readFileSync(path.join(toFigmaDir, f), 'utf8'));
        return (c.root && c.root.kdsId === screenKdsId);
      } catch { return false; }
    });
    if (targetFile) matchedBy = 'kdsId';
    // 2. screenName 매칭 (figma.json.name 또는 root.name)
    if (!targetFile && screenName) {
      targetFile = files.find(f => {
        try {
          const c = JSON.parse(fs.readFileSync(path.join(toFigmaDir, f), 'utf8'));
          return (c.name === screenName) || (c.root && c.root.name === screenName);
        } catch { return false; }
      });
      if (targetFile) matchedBy = 'name';
    }
    // 3. 파일명 slug 매칭 (-c-mobile.figma.json 같이 끝나는 파일)
    if (!targetFile && slug) {
      targetFile = files.find(f => f.toLowerCase().endsWith(slug + '.figma.json'));
      if (targetFile) matchedBy = 'slug';
    }
  } catch {}
  if (!targetFile) {
    return { ok: false,
      error: `to-figma/ 에서 디자이너 화면 매칭 실패 (kdsId=${screenKdsId} · name="${screenName}" · slug=${slug || '(없음)'})\n` +
             `→ 디자이너에게 Figma 화면 이름을 to-figma 파일명과 같은 형식 (예: "(C, mobile)") 으로 맞추시거나, ` +
             `이 채팅에 "ktmyr-usim-self-main-c-mobile 에 반영해줘" 같이 파일명 명시해주세요.` };
  }

  const prompt = `KDS v4 **수정** 작업입니다. 화면을 새로 생성하지 마세요 — 기존 파일을 그대로 두고 디자이너 변경만 정확히 반영.

[디자이너 변경사항 (Figma 에서 직접 수정 후 KDS Change Tracker 로 보낸 것)]
${JSON.stringify(pending.data, null, 2)}

[대상 파일]
to-figma/${targetFile}  (kdsId=${screenKdsId})

[수정 작업 흐름 — 새로 만들기와 다른 흐름]
1. 디자이너 변경 의도 해석 — 각 change 항목의 nodeName/properties/values 를 KDS 의도로 번역 (예: stroke 0 = underline 형태로 의도).
2. .claude/agents/kds-reviewer.md 가이드 Read — 변경이 KDS 가이드 위반인지 검증.
3. to-figma/${targetFile} 의 figma.json 을 Read.
4. **Edit 도구로 부분 수정만** (전체 Write 금지) — 변경되는 노드만 정확히 패치.
5. 페어 to-figma/${targetFile.replace('.figma.json','.html')} 도 동일 부분만 Edit.
6. 변경 후 npm run lint:kds 한 번 실행해 위반 없는지 확인.

[검증 (KDS 가이드)]
- KDS 토큰 위반 발견 시 (예: button-size 토큰 외 height) → 디자이너 변경 의도가 의미 있는지 판단:
  · 의도된 디자인 (예: 2px underline 라인) 이면 그대로 유지 + 이유 보고
  · 단순 실수면 가까운 KDS 토큰으로 보정 + 보정 사실 보고

[최종 출력 — 사용자에게 명확히 보고]
\`\`\`json
{
  "applied": ["${targetFile}", "${targetFile.replace('.figma.json','.html')}"],
  "changes": [
    { "node": "<nodeName>", "kdsId": "<kdsId>", "before": "<속성:값>", "after": "<속성:값>", "rationale": "<왜 이렇게 적용>" }
  ],
  "lint": { "passed": true/false, "violations": <count> },
  "summary": "<한국어 한 줄 — 어떤 화면의 어떤 부분이 어떻게 바뀌었는지>"
}
\`\`\`
`;
  const { _execClaude: execClaude } = require('../engine/kds-design-runner');
  // _execClaude 는 export 안 함 — 별도 inline 호출
  const tmp = path.join(os.tmpdir(), `kdsapply-${crypto.randomBytes(6).toString('hex')}.txt`);
  fs.writeFileSync(tmp, prompt, 'utf8');
  const flags = '-p --effort high --allowedTools "Read Write Edit Glob Grep" --exclude-dynamic-system-prompt-sections --output-format json';
  const cmd = process.platform === 'win32' ? `claude ${flags} < "${tmp}"` : `cat "${tmp}" | claude ${flags}`;
  return new Promise((resolve) => {
    exec(cmd, { cwd: getKdsRoot(), timeout: 600000, maxBuffer: 30*1024*1024, windowsHide: true, encoding: 'utf8' },
      (err, stdout, stderr) => {
        try { fs.unlinkSync(tmp); } catch {}
        if (err) return resolve({ ok: false, error: err.killed ? 'timeout' : (stderr || err.message) });
        try {
          const env = JSON.parse(stdout.trim());
          if (env.is_error) return resolve({ ok: false, error: env.result });
          return resolve({ ok: true, content: (env.result || '').trim(), target: targetFile });
        } catch {
          return resolve({ ok: true, content: stdout, target: targetFile });
        }
      });
  });
}
startFromFigmaWatcher();
const SESS_MAX = 64;
function newSession() {
  if (sessions.size >= SESS_MAX) {
    const firstKey = sessions.keys().next().value;
    sessions.delete(firstKey);
  }
  const id = 'sess_' + crypto.randomBytes(6).toString('hex');
  const sess = { id, messages: [], created_at: Date.now(), generationJobId: null, jobHistory: [] };
  sessions.set(id, sess);
  persistSession(sess);
  return sess;
}

function execClaudeShort(prompt, { cwd, timeout = 180000, userId = null, kind = 'kds-chat' } = {}) {
  return new Promise(async (resolve) => {
    // v28: queue-only + userId → 사용자 PC 워커에 위임 (분산 워커 KDS 지원)
    //   v26 까지: 에러 반환. v28 부터: invokeViaWorker.
    const { getEffectiveWorkerMode } = require('../engine/model-bridge');
    if (getEffectiveWorkerMode() === 'queue-only') {
      if (!userId) {
        return resolve({
          ok: false,
          error: '[KDS 채팅] 워커 위임에 userId 필요 — 호출자가 req.user.id 를 전달해야 합니다.'
        });
      }
      try {
        const { invokeViaWorker } = require('../engine/worker-invocation');
        // v30: Railway HTTP proxy timeout(~60s) 회피 — KDS chat 은 보통 5~25초.
        //   180초까지 기다리면 Railway 가 먼저 502 끊음. 45초로 제한.
        //   더 긴 작업(kds-design)은 별도 비동기 패턴 (다음 commit).
        const effectiveTimeout = kind === 'kds-design' ? 7_200_000 : 45_000;
        const inv = await invokeViaWorker({
          userId,
          kind,
          payload: { userPrompt: prompt },
          timeoutMs: effectiveTimeout
        });
        if (!inv.ok) return resolve({ ok: false, error: inv.error });
        return resolve({ ok: true, content: (inv.content || '').trim() });
      } catch (e) {
        return resolve({ ok: false, error: `워커 위임 실패: ${e.message}` });
      }
    }
    const tmp = path.join(os.tmpdir(), `kdschat-${crypto.randomBytes(6).toString('hex')}.txt`);
    fs.writeFileSync(tmp, prompt, 'utf8');
    const flags = '-p --effort high --allowedTools "Read Glob Grep" --exclude-dynamic-system-prompt-sections --output-format json';
    const cmd = process.platform === 'win32'
      ? `claude ${flags} < "${tmp}"`
      : `cat "${tmp}" | claude ${flags}`;
    exec(cmd, { cwd, timeout, maxBuffer: 20 * 1024 * 1024, windowsHide: true, encoding: 'utf8' },
      (err, stdout, stderr) => {
        try { fs.unlinkSync(tmp); } catch {}
        if (err) return resolve({ ok: false, error: err.killed ? 'timeout' : (stderr || err.message) });
        try {
          const env = JSON.parse(stdout.trim());
          if (env.is_error) return resolve({ ok: false, error: env.result || 'claude is_error' });
          return resolve({ ok: true, content: (env.result || '').trim() });
        } catch {
          return resolve({ ok: true, content: (stdout || '').trim() });
        }
      });
  });
}

function buildChatPrompt(history, ctx) {
  // 작업 단위 분리 — 마지막 [READY] 직전부터 최대 12개 메시지만 사용. 그 이전 작업 컨텍스트 자동 배제.
  let scoped = history || [];
  const lastReadyIdx = scoped.findLastIndex(m => m.role === 'assistant' && /\[READY\]/.test(m.content || ''));
  if (lastReadyIdx >= 0 && lastReadyIdx < scoped.length - 1) {
    // [READY] 이후 메시지가 있으면 그 시점부터 = 새 작업
    scoped = scoped.slice(lastReadyIdx + 1);
  } else if (scoped.length > 12) {
    scoped = scoped.slice(-12);
  }
  const transcript = scoped.map(m =>
    (m.role === 'user' ? '사용자' : '어시스턴트') + ': ' + m.content
  ).join('\n\n');

  // ── 컨텍스트 보강: 현재 to-figma/ 상태 + 직전 generation job 정보 + 디자이너 from-figma 변경사항 ──
  let situationBlock = '';
  try {
    const toFigmaDir = path.join(getKdsRoot(), 'to-figma');
    const recent = fs.readdirSync(toFigmaDir)
      .filter(f => f.endsWith('.figma.json'))
      .map(f => { try { return { name: f, mtime: fs.statSync(path.join(toFigmaDir, f)).mtimeMs }; } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 8)
      .map(x => `  · ${x.name.replace(/\.figma\.json$/, '')}  (${new Date(x.mtime).toLocaleString('ko-KR')})`)
      .join('\n');
    if (recent) {
      situationBlock += `\n[KDS to-figma/ 현재 콘텐츠 — 최근 8개, mtime 내림차순]\n${recent}\n`;
    }
  } catch {}

  // 디자이너 → Figma → KDS bridge "Claude로 보내기" 결과 (from-figma/) 자동 인지.
  // change-log-*.json 가운데 최근 3개의 요약을 prompt 에 주입 → claude 가 디자이너 의도 파악.
  try {
    const fromFigmaDir = path.join(getKdsRoot(), 'from-figma');
    if (fs.existsSync(fromFigmaDir)) {
      const logs = fs.readdirSync(fromFigmaDir)
        .filter(f => f.startsWith('change-log-') && f.endsWith('.json'))
        .map(f => { try { return { name: f, mtime: fs.statSync(path.join(fromFigmaDir, f)).mtimeMs, path: path.join(fromFigmaDir, f) }; } catch { return null; } })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 3);
      if (logs.length) {
        const summaries = logs.map(l => {
          try {
            const j = JSON.parse(fs.readFileSync(l.path, 'utf8'));
            const screen = j.filteredFor || {};
            const head = `  · ${new Date(l.mtime).toLocaleString('ko-KR')} — 화면 "${screen.name || '?'}" (kdsId=${screen.kdsId || '?'}), ${j.totalChanges || 0}개 변경`;
            const items = (j.changes || []).slice(0, 5).map(c => `    - ${c.parentPath ? c.parentPath.split(' > ').slice(-1)[0] + ' / ' : ''}${c.nodeName || '?'}: ${c.detail || c.type || ''}`).join('\n');
            return head + (items ? '\n' + items : '');
          } catch { return null; }
        }).filter(Boolean).join('\n');
        if (summaries) {
          situationBlock += `\n[디자이너 Figma 변경사항 (from-figma/ 최근 3건) — 사용자가 "디자이너가 수정했어" 같은 표현 시 이 내용 반영]\n${summaries}\n`;
        }
      }
    }
  } catch {}
  if (ctx && ctx.lastJob) {
    const lj = ctx.lastJob;
    situationBlock += `\n[직전 생성 작업 (현재 세션)]\n` +
      `  요구사항: ${lj.requirement || '(없음)'}\n` +
      `  viewports: ${(lj.viewports || []).join(', ') || '(미지정)'}\n` +
      `  상태: ${lj.status || '(미상)'}\n` +
      `  생성된 파일: ${(lj.generated || []).length}개${(lj.generated || []).length ? ' — ' + lj.generated.slice(0, 6).join(', ') : ''}\n`;
  }

  return `당신은 KDS v4 디자인 시스템(KT Korean Design System)으로 화면을 생성하는 어시스턴트입니다. 사용자와 짧은 대화로 요구사항을 명확화한 뒤, 충분히 정보가 모이면 화면 생성을 트리거합니다.
${situationBlock}
[현재까지 대화]
${transcript}

[직전 작업 이어가기 안내]
사용자가 "이어서", "마저", "남은 거", "재시작", "다시 시작", "다시 해줘", "OO시 OO분에 작업한 거" 같이 직전 작업의 연속/재개를 요청하면:
- [직전 생성 작업] 정보를 참조해 어떤 화면이었는지 추정.
- 부족하면 추정 결과를 사용자에게 확인 (예: "직전에 ktmyr-login-c-mobile 작업 중이었는데 같은 요구사항으로 다시 생성하면 될까요?").
- 사용자 확인되면 [READY] 시그널 출력 — requirement 는 직전 작업의 것을 그대로 사용 가능.

[xcipe 자동 디자이너 변경 반영 기능 — 매우 중요]
xcipe 는 KDS 원본과 달리 **디자이너 변경(from-figma/)을 자동 적용**할 수 있습니다.
- from-figma/ 에 변경이 도착하면 xcipe 가 watcher 로 자동 감지 → 사용자에게 "반영할까요?" 묻습니다.
- 사용자가 "응 반영해줘", "네 적용해줘", "응", "네", "ok" 같이 **동의 표현** 하면 xcipe 가 자동으로:
  · KDS 가이드(.claude/agents/kds-reviewer.md) 검증
  · to-figma/ 해당 figma.json 을 Edit 도구로 부분 수정
  · npm run lint:kds 검증
  · 결과를 채팅에 자동 보고 (어디가 어떻게 바뀌었는지)

**절대 사용자에게 "/figma-pull 을 실행해주세요" 라고 안내하지 마세요. 그건 KDS 원본 워크플로우입니다.**

xcipe 에서는 사용자가 다음 표현 중 하나를 쓰면 자동 적용됩니다:
- "응 반영해줘" / "네 적용해줘" / "응" / "네" / "ok" / "진행해줘"

사용자가 "수정 완료됐어?", "반영됐어?" 처럼 진행 상황을 물어보면:
- 현재 진행 중 작업이 있으면: "1~5분 안에 결과 메시지가 도착할 예정입니다"
- 아직 동의 안 받았으면: "'응 반영해줘' 라고 답해주시면 자동으로 반영합니다"
- 작업 완료됐으면 채팅에 결과 메시지가 이미 표시됩니다 (✅ 마크 포함).

[당신의 작업 — KDS .claude/agents/kds-designer.md 워크플로우 그대로 따라야 합니다]

KDS designer 는 두 워크플로우를 명확히 구분합니다:

**워크플로우 B (URL/도메인 기반 시안 A/B/C 작업)** — 사용자 메시지에 https?:// URL 이 있으면:
- 필수 정보: \`domain\` (URL 의 도메인 부분, 예: shop.kt.com) + \`screen_area\` (어떤 화면 영역, 예: 메인/상품상세/장바구니/로그인/마이페이지) + 시안 개수 (기본 3 — A/B/C) + viewport
- KDS designer 의 강제 체크: \`research/brands/<domain>/brand.md\` 존재 여부 확인. 없으면 메인 세션에 "kds-researcher 를 brand_mode: extend 로 먼저 호출해서 brand.md 만들어 달라"고 알리고 작업 시작 보류해야 합니다.
- brand.md 가 있으면 6가지 결론 + 포지셔닝 + 2-b 표의 \`screen_area\` 행 영역별 톤까지 모두 머리에 박은 뒤 시안 후보 그립니다.
- 시안 A/B/C 는 brand 의 영역별 톤 안에서 변형 (Voice / Tone / UX 모티프 / 컬러 시그니처 / 비주얼 모티프 / 타이포 위계 / 포지셔닝 반영).
- 질문 항목 (3개):
  1. **시안 개수** — A/B/C 같은 변형 몇 개? (기본 3개)
  2. **viewport** — mobile / desktop / 둘 다
  3. **screen_area** — URL 의 어떤 화면 영역?

**워크플로우 A (URL 없이 화면/컴포넌트만 요청)** — brand.md 호출 안 함:
- 질문 항목 (3개):
  1. **어떤 화면** — 메인 / 상품 상세 / 장바구니 / 주문 결제 / 로그인 등
  2. **viewport** — mobile / desktop / 둘 다
  3. **핵심 요소** — 히어로 배너 / 추천 카드 / 카테고리 탭 / 입력 필드 등

(공통) 분위기/톤은 KDS 자체 토큰 사용으로 고정 — 따로 묻지 마세요. KDS 토큰 외 색상 직접 박지 마세요. Accent Primary 대체는 Red/Teal 만 허용.

[응답 규칙]
- 정보 부족하면 → 한국어로 자연스럽게 추가 질문 1~3개. 한 번에 너무 많이 묻지 마세요.
- 충분히 모였다고 판단되면 → 사용자에게 "지금까지 정리한 내용은 다음과 같습니다: ... 이대로 화면을 생성할까요?" 라고 확인 질문만 하고 시그널은 **출력하지 마세요**.
- **[READY] 시그널은 사용자가 명시적으로 '생성 시작', '만들어줘', '진행', '네 좋아요', '진행해주세요' 등 화면 생성을 직접 트리거하는 발화를 한 직후에만** 마지막 줄에 정확히 다음 형태로 출력:
  [READY] requirement="<최종 요구사항 한 문장>" viewports=<mobile|desktop|mobile+desktop> name=<영문-슬러그>
- 사용자가 "정해지면 알려줌", "잠시만요", "생각해볼게요", "나중에" 같이 보류/지연/유보 표현을 쓰면 절대 시그널 출력 금지. 추가 정보를 요청하거나 그냥 알겠다고 응답.
- 화면 생성은 트리거 후 별도 단계가 처리 — 당신은 시그널만 출력하면 됩니다. 출력 시 시그널 외 다른 텍스트는 그 줄에 쓰지 마세요.

지금 응답해주세요.`;
}

// POST /api/kds-design/chat — 사용자 메시지 1개 처리 → assistant 응답
router.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message 필수' });
  }
  let sess = sessionId ? sessions.get(sessionId) : null;
  if (!sess) sess = newSession();
  sess.messages.push({ role: 'user', content: String(message), at: Date.now() });

  // 디자이너 변경 반영 의도 명시 키워드 감지 — 너무 광범위한 "진행" 같은 단어는 제외
  // (새 디자인 작업 시작 의도와 구분).
  const trimmed = String(message).trim();
  const isFigmaApplyIntent = /(디자이너|figma|피그마).{0,30}(변경|수정|change).{0,30}(반영|적용|apply)|(변경|수정).{0,10}(반영|적용)/i.test(trimmed)
                          || /(figma|피그마).{0,10}(반영|적용)/i.test(trimmed);
  if (!_fromFigmaPending && isFigmaApplyIntent) {
    try {
      const dir = path.join(getKdsRoot(), 'from-figma');
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith('change-log-'))
        .map(f => ({ f, mt: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mt - a.mt);
      if (files.length) {
        const latest = path.join(dir, files[0].f);
        _fromFigmaPending = { file: latest, data: JSON.parse(fs.readFileSync(latest, 'utf8')), at: Date.now() };
      }
    } catch {}
  }
  // pending 이 set 된 상태에서만 동의 키워드 인식 (일반 단어 제거 — "응/네/좋아/ok/yes" 같은 단순 동의만)
  if (_fromFigmaPending && /^\s*(응|네|예|좋아|ok|yes|반영해|적용해)/i.test(trimmed)) {
    // 작업 중 가드 — designer job 이 running/pending 이면 figma 적용 거부. 동시 claude.exe 폭증 + to-figma/ 동시 쓰기 충돌 방지.
    const activeJob = sess.generationJobId ? jobs.get(sess.generationJobId) : null;
    if (activeJob && (activeJob.status === 'running' || activeJob.status === 'pending')) {
      const busyMsg = `⏳ 현재 시안 생성 작업이 진행 중입니다 (job ${activeJob.id}, status: ${activeJob.status}). 작업이 끝난 뒤 다시 "반영해" 라고 말씀해 주세요. from-figma/ pending 은 그대로 유지됩니다.`;
      sess.messages.push({ role: 'assistant', content: busyMsg, at: Date.now() });
      persistSession(sess);
      return res.json({ sessionId: sess.id, assistant: busyMsg, ready: false, busy: true });
    }
    const startMsg = '▶ 디자이너 변경을 KDS 가이드 검증 + 반영 중입니다.\n약 1~5분 소요. 완료되면 자동으로 결과를 알려드릴게요. 다른 페이지로 이동해도 진행됩니다.';
    sess.messages.push({ role: 'assistant', content: startMsg, at: Date.now() });
    res.json({ sessionId: sess.id, assistant: startMsg, ready: false });
    // fire-and-forget
    (async () => {
      const r = await applyFromFigmaPending();
      if (r.ok) {
        // claude 보고에서 JSON 블록 추출 → 사용자 친화 메시지 구성
        let parsed = null;
        try {
          const m = (r.content || '').match(/```json\s*([\s\S]*?)\s*```/);
          if (m) parsed = JSON.parse(m[1]);
        } catch {}
        let msg;
        if (parsed) {
          const changesTxt = (parsed.changes || []).map(c =>
            `  • ${c.node} (${c.kdsId})\n    ${c.before} → ${c.after}\n    ↳ ${c.rationale}`
          ).join('\n');
          const lintTxt = parsed.lint
            ? `lint ${parsed.lint.passed ? '✓ 통과' : `✘ ${parsed.lint.violations}건 위반`}`
            : '';
          msg = `✅ 디자이너 변경 반영 완료\n\n` +
                `📋 ${parsed.summary || ''}\n\n` +
                `🔧 적용 내역:\n${changesTxt}\n\n` +
                `📁 갱신 파일: ${(parsed.applied || []).join(', ')}\n` +
                `🔍 ${lintTxt}\n\n` +
                `디자이너가 Figma 에서 "Claude에서 불러오기" 누르면 갱신본 import 됩니다.`;
        } else {
          msg = `✅ 디자이너 변경 반영 완료 (대상: ${r.target}).\n${(r.content || '').slice(0, 600)}\n\n디자이너가 Figma 에서 "Claude에서 불러오기" 누르면 갱신본 import 됩니다.`;
        }
        sess.messages.push({ role: 'assistant', content: msg, at: Date.now() });
      } else {
        sess.messages.push({ role: 'assistant', content: `❌ 반영 실패: ${r.error}`, at: Date.now() });
      }
    })();
    return;
  }
  if (_fromFigmaPending && /(아니|싫|취소|no|nope)/i.test(trimmed)) {
    _fromFigmaPending = null;
    sess.messages.push({ role: 'assistant', content: '디자이너 변경 반영을 취소했습니다. from-figma/ 로그는 보존됩니다.', at: Date.now() });
    return res.json({ sessionId: sess.id, assistant: '취소', ready: false });
  }

  // 직전 generation job 컨텍스트 — 같은 세션의 마지막 jobId 활용 (메모리 → 디스크 순)
  let lastJob = null;
  if (sess.generationJobId) {
    lastJob = jobs.get(sess.generationJobId) || loadJobFromDisk(sess.generationJobId);
  }

  // v30: 비동기 패턴 — Railway HTTP proxy timeout(60s) 회피.
  //   queue-only 모드에서는 invocation 등록 후 즉시 응답. 클라이언트가 /chat/poll/:invocationId 로 결과 polling.
  //   chaining(researcher 자동 호출 등)은 poll endpoint 에서 done 시점에 처리.
  const { getEffectiveWorkerMode } = require('../engine/model-bridge');
  if (getEffectiveWorkerMode() === 'queue-only') {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'userId 필요 — 로그인 상태 확인' });
    }
    const { enqueueInvocation } = require('../engine/worker-invocation');
    const enq = enqueueInvocation({
      userId: req.user.id,
      kind: 'kds-chat',
      payload: { userPrompt: buildChatPrompt(sess.messages, { lastJob }) }
    });
    if (!enq.ok) {
      sess.messages.push({ role: 'assistant', content: `[오류] ${enq.error}`, at: Date.now() });
      return res.json({ sessionId: sess.id, assistant: `[오류] ${enq.error}`, error: enq.error });
    }
    // 세션에 pending invocation 기록 — poll 에서 sess 갱신 시 사용
    sess.pendingInvocation = { id: enq.invocationId, kind: 'kds-chat', startedAt: Date.now() };
    persistSession(sess);
    return res.json({
      sessionId: sess.id,
      invocationId: enq.invocationId,
      status: 'pending',
      hint: '워커가 처리 중입니다. /api/kds-design/chat/poll/{id} 로 결과 polling.'
    });
  }

  // local 모드 (npm start) — 기존 동기 경로 유지
  const r = await execClaudeShort(buildChatPrompt(sess.messages, { lastJob }), {
    userId: req.user && req.user.id,
    kind: 'kds-chat'
  });
  if (!r.ok) {
    sess.messages.push({ role: 'assistant', content: `[오류] ${r.error}`, at: Date.now() });
    return res.json({ sessionId: sess.id, assistant: `[오류] ${r.error}`, error: r.error });
  }

  const content = r.content || '';
  sess.messages.push({ role: 'assistant', content, at: Date.now() });
  persistSession(sess);

  // 자동 chaining — designer 가 "지금 researcher 를 호출하겠습니다" 처럼 본인 commitment 표현일 때만 트리거.
  // ❌ "brand.md 가 없다면 먼저 만들어야 합니다" 같은 조건부/안내 문장은 트리거 금지.
  // ❌ 어시스턴트가 사용자에게 질문 중이면 (? / "주세요" / "확인이 필요" / "답변 주시면") 트리거 금지.
  const isAskingUser = /[?？]\s*$|확인이 필요|답변 주시면|어떻게 갈|원하시나|어느.{0,5}로|어떤.{0,10}(영역|화면|시안)|몇.{0,5}(개|종)/m.test(content);
  const isAdvisory = /(있다면|없다면|있으면|없으면|존재하지 않으면|필요(시|할 때)|아직 없|만약)/.test(content);
  const isCommitting = /(kds-researcher.{0,20}(호출하겠|호출합니다|진행하겠|진행합니다|시작합)|(brand\.md|brand-md).{0,20}(생성하겠|만들겠|생성합니다|만듭니다)|자동.{0,30}(researcher|brand\.md|chaining).{0,15}(시작|진행|호출))/i.test(content);
  // URL fast-path — 사용자 메시지에 https?:// URL 이 있고 brand.md 가 아직 없으면 어시스턴트 commitment 표현과 무관하게 researcher chaining 강제 발동.
  //   배경: 어시스턴트가 [READY] 만 내고 commitment 키워드를 안 쓰는 짧은 흐름에서, designer 가 brand.md/brief.md 없이 호출되어 추측 시안 (예: ktshop-main-abc-mobile-* 의 "베스트 단말/추천 요금제" 류) 이 만들어지던 회귀를 차단.
  const userHasUrl = sess.messages.some(m => m.role === 'user' && /https?:\/\//.test(m.content || ''));
  let urlPathBrandMissing = false;
  if (userHasUrl) {
    const um = sess.messages.map(m => m.content || '').join(' ').match(/https?:\/\/([^\/\s]+)/);
    const d = um ? um[1] : null;
    if (d) {
      try { urlPathBrandMissing = !fs.existsSync(path.join(getKdsRoot(), 'research', 'brands', d, 'brand.md')); } catch { urlPathBrandMissing = true; }
    }
  }
  // 2026-05-22 로컬 fast-path — local 모드는 v27 동작(commitment 표현 있을 때만 chaining)으로 복원.
  //   urlPathBrandMissing 강제는 클라우드(queue-only)에서만 — Railway 환경에서 designer 가 brand.md 없이 추측 시안 만드는 회귀 방지용.
  //   로컬(원본 KDS 디렉토리)은 research/brands/* 자산이 이미 완비되어 있어 강제 발동이 오히려 매 응답마다 Playwright 크롤 추가 호출을 트리거하는 부작용만 일으킴.
  const isLocal = getEffectiveWorkerMode() === 'local';
  const needsResearcher = (isCommitting || (!isLocal && urlPathBrandMissing)) && !isAskingUser && !isAdvisory;
  if (needsResearcher) {
    // 도메인 추출 — 현재 세션 메시지에서 https?:// URL 1개
    const allText = sess.messages.map(m => m.content || '').join(' ');
    const urlMatch = allText.match(/https?:\/\/([^\/\s]+)/);
    const domain = urlMatch ? urlMatch[1] : null;
    if (domain) {
      // researcher.md 케이스 (C) 적용 — brand.md 가 이미 있으면 researcher 호출 skip 후 즉시 designer 로 진행.
      // 영역 매칭은 brand.md 내용 파싱이 필요해 비싸므로, 일단 brand.md 존재만 봐도 80% 케이스 단축.
      const brandMdPath = path.join(getKdsRoot(), 'research', 'brands', domain, 'brand.md');
      const screenshotsDir = path.join(getKdsRoot(), 'research', 'brands', domain, 'screenshots');
      const brandExists = fs.existsSync(brandMdPath);
      const screenshotsExists = fs.existsSync(screenshotsDir);
      if (brandExists) {
        const reuseMsg = `✅ brand.md 재사용 (${domain}, ${screenshotsExists ? 'screenshots 도 보유' : 'screenshots 없음'}) — researcher 단계 skip, 즉시 시안 작업 시작합니다.`;
        sess.messages.push({ role: 'assistant', content: reuseMsg, at: Date.now() });
        persistSession(sess);
        res.json({ sessionId: sess.id, assistant: reuseMsg, ready: false, chaining: 'designer', brandReused: true });
        // designer 즉시 시작
        (async () => {
          const job = newJob();
          job.requirement = `${domain} 메인 화면 리뉴얼 시안 A/B/C 3종 — brand.md 의 영역별 톤 반영`;
          job.viewports = ['mobile', 'desktop'];
          job.status = 'running';
          attachJob(sess, job.id);
          persistSession(sess);
          startJobWatcher(job);
          try {
            const dr = await generateDesign({ requirement: job.requirement, viewports: job.viewports, conversationHistory: sess.messages, userId: req.user && req.user.id });
            job.finished_at = Date.now();
            if (!dr.ok) {
              job.status = 'failed'; job.error = dr.error;
              sess.messages.push({ role: 'assistant', content: `❌ 시안 작업 실패: ${dr.error}`, at: Date.now() });
            } else {
              job.status = 'done'; job.generated = dr.generated;
              sess.messages.push({ role: 'assistant', content: `✅ 시안 ${dr.generated.length}개 파일 생성 완료. Figma 에서 import 가능합니다.`, at: Date.now() });
            }
            persistSession(sess);
          } catch (e) {
            job.status = 'failed'; job.error = e.message; job.finished_at = Date.now();
            sess.messages.push({ role: 'assistant', content: `❌ 시안 작업 예외: ${e.message}`, at: Date.now() });
            persistSession(sess);
          } finally { stopJobWatcher(job); }
        })();
        return;
      }
      sess.messages.push({ role: 'assistant', content: `▶ ${domain} brand.md 자동 생성 시작 (kds-researcher, brand_mode: extend) — 1~5분 소요. 끝나면 시안 작업 자동으로 이어집니다.`, at: Date.now() });
      persistSession(sess);
      res.json({ sessionId: sess.id, assistant: '자동 chaining 시작', ready: false, chaining: 'researcher' });
      // fire-and-forget — researcher → 자동 designer
      (async () => {
        try {
          // 화면 단위 slug — URL 의 path / 사용자 메시지에서 화면 키워드 추출
          //   ex: shop.kt.com 의 메인 → slug="shop.kt.com-main", login.kt.com 의 로그인 → "login.kt.com-login"
          const screenSlugSeed = (sess.messages.filter(m => m.role === 'user').map(m => m.content || '').join(' ').match(/(메인|홈|로그인|회원가입|장바구니|상품상세|마이페이지|주문|결제|검색|이벤트|혜택|상품목록)/) || [])[0] || 'main';
          const screenSlug = `${domain}-${screenSlugSeed}`;
          const brandMdRel = `research/brands/${domain}/brand.md`;
          const brandShotsRel = `research/brands/${domain}/screenshots/`;
          const briefMdRel = `research/${screenSlug}/brief.md`;
          const screenShotsRel = `research/${screenSlug}/screenshots/`;
          const tokensRel = `research/${screenSlug}/tokens-observed.md`;

          const researcherPrompt = `KDS v4 kds-researcher 단계 — 실제 사이트를 Playwright 로 크롤한 뒤 brand.md (도메인) + brief.md (화면) 둘 다 생성합니다. 추측 금지, 라이브 페이지 관찰 결과만 기록.

[입력]
- URL: 첫 https?:// 출현 URL — 세션 메시지에서 직접 추출 (대화 흐름 그대로 보존)
- 도메인 (eTLD+1): ${domain}
- 화면 slug: ${screenSlug}
- brand_mode: extend (브랜드 자료 점진적 누적 — 이미 있으면 보강·없으면 신규)

[Phase 0 — Playwright 크롤 (의무, 추측 우회 금지)]
Bash 도구로 Playwright headless Chromium 을 직접 호출해 라이브 페이지를 가져옵니다. 가이드만 읽고 끝내지 마세요 — 아래 명령을 **실제로 실행**해야 합니다.

\`\`\`bash
mkdir -p ${brandShotsRel} ${screenShotsRel}
\`\`\`

그리고 Node 인라인 스크립트로 모바일·데스크탑 두 viewport 캡쳐 + 본문 텍스트/구조 추출. 예시 (필요 시 조정):

\`\`\`bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const url = process.env.TARGET_URL;
  const browser = await chromium.launch({ headless: true });
  for (const vp of [{ name: 'mobile', width: 375, height: 812, isMobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
                    { name: 'desktop', width: 1440, height: 900, isMobile: false }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, userAgent: vp.ua });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '${screenShotsRel}' + vp.name + '.png', fullPage: true });
    // 본문 텍스트 (메뉴/카피/상품명) + 컬러·폰트 관찰
    const dom = await page.evaluate(() => {
      const pick = sel => Array.from(document.querySelectorAll(sel)).map(e => (e.innerText || '').trim()).filter(Boolean).slice(0, 50);
      return {
        title: document.title,
        h: pick('h1,h2,h3'),
        nav: pick('nav a, header a, [role=navigation] a'),
        cta: pick('button, a.btn, [class*=btn], [class*=button]'),
        prod: pick('[class*=product], [class*=goods], [class*=item] [class*=name], [class*=card] h3, [class*=card] strong'),
        banner: pick('[class*=banner] strong, [class*=banner] em, [class*=hero] h1, [class*=hero] h2, [class*=promo]'),
        body: (document.body.innerText || '').slice(0, 5000)
      };
    });
    require('fs').writeFileSync('${screenShotsRel}' + vp.name + '.dom.json', JSON.stringify(dom, null, 2));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
" TARGET_URL=<여기에 세션에서 추출한 실제 URL 박기>
\`\`\`

크롤 실패 시: 모바일 전용 URL (\`m.${domain}\` 등) 으로 재시도. 그래도 실패면 사용자에게 보고 후 중단 (추측으로 진행 금지).

[Phase 1 — brand.md (도메인 단위, 영구 자산)]
${brandMdRel} 작성 또는 보강.

- 이미 있으면: 헤더의 "관찰된 영역" 에 이번 영역(${screenSlugSeed}) 추가, 2-b 영역별 톤표에 행 추가. 기존 6가지 결론 보존 (충돌 시 메모 추가)
- 없으면 신규 생성. 6가지 결론 + 포지셔닝 + 영역별 톤표 — **모두 Phase 0 의 캡쳐·DOM 관찰 근거**로 작성:
  · Voice / Tone — 카피 톤 (격식/친근/혜택강조 등)
  · UX 모티프 — 일체형/단계형/큐레이션형 등
  · 컬러 시그니처 — 헤더·CTA·강조 색 hex 관찰 결과 (KDS 토큰 매핑은 designer 단계에서)
  · 비주얼 모티프 — 사진 강도·일러스트·그리드 성향
  · 타이포 위계 — heading vs body 대비
  · 포지셔닝 — 한 줄
- 헤더에 "관찰된 영역: ${screenSlugSeed}" / "마지막 관찰: $(date +%Y-%m-%d)" 명시
- 도메인 단위 메인·About·press 같은 추가 캡쳐가 있으면 ${brandShotsRel} 로도 복사

[Phase 2 — brief.md (화면 단위)]
${briefMdRel} 작성. Phase 0 의 dom.json + screenshot 직접 분석한 결과를 그대로 정리.

필수 섹션:
- 화면 식별: URL + 화면명 + viewport 패턴 (반응형/적응형/PC전용 판정)
- 정보 위계: GNB 메뉴 라벨 전부 (관찰 그대로, 추측 금지) / hero 영역 카피 / 노출 상품·카테고리명 / 배너 문구
- 컴포넌트 구성: 검색·캐러셀·탭·카드 등 어떤 컴포넌트가 어디에
- 인터랙션 흐름: 가입·구매·검색 같은 주요 flow
- UX 라이팅 톤: 실제 카피 인용 3~5개
- 추가로 ${tokensRel} 에 관찰된 색·간격·타이포 패턴 기록 (KDS 치환 대상, 참고용)

[금지]
- 본인 추측·일반론 작성. "통신사면 보통 단말/요금제겠지" 류 0건. 모든 라벨/카피는 ${screenShotsRel} 의 dom.json 에서 인용
- Phase 0 크롤 실패한 상태에서 brand.md/brief.md 작성

[최종 출력]
\`\`\`json
{ "brandMd": "${brandMdRel}", "briefMd": "${briefMdRel}", "screenshots": ["${screenShotsRel}mobile.png", "${screenShotsRel}desktop.png"], "areas": ["${screenSlugSeed}"], "crawlOk": true }
\`\`\`
`;
          const r2 = await execClaudeShort(researcherPrompt, {
            cwd: getKdsRoot(),
            timeout: 600000,
            userId: req.user && req.user.id,
            kind: 'kds-chat'
          });
          if (!r2.ok) {
            sess.messages.push({ role: 'assistant', content: `❌ researcher 실패: ${r2.error}. 시안 작업 중단됨. 채팅에 다시 요청해주세요.`, at: Date.now() });
            persistSession(sess);
            return;
          }
          sess.messages.push({ role: 'assistant', content: `✅ brand.md 생성 완료. 이제 시안 A/B/C × mobile+desktop 작업 자동 시작합니다 (10~30분 소요).`, at: Date.now() });
          persistSession(sess);
          // 자동 designer 호출 — generateDesign 직접 호출
          const job = newJob();
          job.requirement = `${domain} 메인 화면 리뉴얼 시안 A/B/C 3종 — brand.md 의 영역별 톤 반영`;
          job.viewports = ['mobile', 'desktop'];
          job.status = 'running';
          attachJob(sess, job.id);
          persistSession(sess);
          startJobWatcher(job);
          (async () => {
            try {
              const dr = await generateDesign({ requirement: job.requirement, viewports: job.viewports, conversationHistory: sess.messages, userId: req.user && req.user.id });
              job.finished_at = Date.now();
              if (!dr.ok) {
                job.status = 'failed'; job.error = dr.error;
                sess.messages.push({ role: 'assistant', content: `❌ 시안 작업 실패: ${dr.error}`, at: Date.now() });
              } else {
                job.status = 'done'; job.generated = dr.generated;
                sess.messages.push({ role: 'assistant', content: `✅ 시안 A/B/C × mobile+desktop 생성 완료 — ${dr.generated.length}개 파일. Figma 에서 import 가능합니다.`, at: Date.now() });
              }
              persistSession(sess);
            } catch (e) {
              job.status = 'failed'; job.error = e.message; job.finished_at = Date.now();
              sess.messages.push({ role: 'assistant', content: `❌ 시안 작업 예외: ${e.message}`, at: Date.now() });
              persistSession(sess);
            } finally { stopJobWatcher(job); }
          })();
        } catch (e) {
          sess.messages.push({ role: 'assistant', content: `❌ chaining 예외: ${e.message}`, at: Date.now() });
          persistSession(sess);
        }
      })();
      return;
    }
  }

  // [READY] 시그널 추출
  const readyLine = content.split('\n').reverse().find(l => l.trim().startsWith('[READY]'));
  if (readyLine) {
    // 안전망 — needsResearcher 매칭이 false positive 로 우회된 경우 (예: isAdvisory 가 "없다면" 같은 키워드를 잘못 잡음) 에도
    //   URL 있고 brand.md 부재면 designer 호출 직전에 차단. 사용자에게 한 번 더 입력을 요청해 chaining 으로 재진입시킨다.
    //   회귀 케이스: ktshop-main-abc-mobile-* 처럼 brand.md/brief.md 없이 designer 가 추측 시안 생성.
    //   2026-05-22: 클라우드(queue-only)에서만 차단. 로컬은 원본 KDS 자산 완비라 차단 시 사용자가 불필요한 재입력 강요받음.
    if (!isLocal && userHasUrl && urlPathBrandMissing) {
      const um = sess.messages.map(m => m.content || '').join(' ').match(/https?:\/\/([^\/\s]+)/);
      const blockedDomain = um ? um[1] : '(unknown)';
      const msg = `⏸ [READY] 받았으나 ${blockedDomain} 의 brand.md / brief.md 가 아직 없습니다 — 시안 추측 회귀를 막기 위해 designer 호출을 보류합니다.\n\n다음 메시지에 "kds-researcher 로 ${blockedDomain} brand.md 와 brief.md 를 먼저 생성하겠습니다" 라고 한 번 더 입력해 주세요. Playwright 크롤 → 시안 작업이 자동 chaining 됩니다.`;
      sess.messages.push({ role: 'assistant', content: msg, at: Date.now() });
      persistSession(sess);
      return res.json({ sessionId: sess.id, assistant: msg, ready: false, blocked: 'brand-md-missing' });
    }
    const req2 = (readyLine.match(/requirement="([^"]+)"/) || [])[1] || sess.messages.filter(m => m.role==='user').map(m=>m.content).join(' / ');
    const vpStr = (readyLine.match(/viewports=([\w+]+)/) || [])[1] || 'mobile';
    const name = (readyLine.match(/name=([a-zA-Z0-9_-]+)/) || [])[1];
    const viewports = vpStr.split('+').filter(Boolean);
    const job = newJob();
    job.requirement = req2;
    job.viewports = viewports;
    job.status = 'running';
    attachJob(sess, job.id);
    persistSession(sess);
    startJobWatcher(job);
    (async () => {
      try {
        const r2 = await generateDesign({ requirement: req2, viewports, name, conversationHistory: sess.messages, userId: req.user && req.user.id });
        job.finished_at = Date.now();
        if (!r2.ok) {
          job.status = 'failed'; job.error = r2.error; job.raw_excerpt = (r2.raw || '').slice(0, 800);
          job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `실패: ${r2.error}` });
        } else {
          job.status = 'done'; job.generated = r2.generated; job.raw_excerpt = r2.raw_excerpt;
          // post-process 결과를 사용자 친화 라벨로 phaseEvents 에 추가
          if (Array.isArray(r2.postProcess)) {
            const label = { 'inject-svg': 'SVG 아이콘 자동 치환', 'inject-images': '이미지 자동 삽입', 'lint:kds': '검증' };
            r2.postProcess.forEach(p => {
              const txt = (label[p.label] || p.label) + (p.ok ? ' 완료' : ' 일부 위반');
              job.phaseEvents.push({ ts: Date.now(), kind: p.ok ? 'post_ok' : 'post_fail', text: txt });
            });
            job.postProcess = r2.postProcess;
          }
          job.phaseEvents.push({ ts: Date.now(), kind: 'done', text: `완료: ${r2.generated.length}개 파일` });
        }
      } catch (e) {
        job.status = 'failed'; job.error = e.message; job.finished_at = Date.now();
        job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `예외: ${e.message}` });
      } finally {
        stopJobWatcher(job);
      }
    })();
    return res.json({ sessionId: sess.id, assistant: content, ready: true, jobId: job.id, requirement: req2, viewports });
  }

  return res.json({ sessionId: sess.id, assistant: content, ready: false });
});

// GET /api/kds-design/chat/poll/:invocationId — 비동기 chat 결과 polling (v30)
//   클라이언트가 2초 간격으로 호출. status=pending|running|done|failed|cancelled.
//   done 시 sess.messages 에 assistant 응답 append + chaining(researcher 자동 호출 등) 처리.
router.get('/chat/poll/:invocationId', async (req, res) => {
  const id = parseInt(req.params.invocationId, 10);
  if (!id) return res.status(400).json({ error: 'invalid invocation id' });
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'login required' });

  const { getInvocationStatus } = require('../engine/worker-invocation');
  const inv = getInvocationStatus({ id, userId: req.user.id });
  if (!inv.ok) return res.status(404).json({ error: inv.error });

  // 진행 중 — 그대로 반환
  if (inv.status === 'pending' || inv.status === 'running') {
    return res.json({ invocationId: id, status: inv.status });
  }
  if (inv.status === 'failed' || inv.status === 'cancelled') {
    return res.json({
      invocationId: id,
      status: inv.status,
      error: inv.error || 'cancelled'
    });
  }

  // done — sess 에 응답 반영 (중복 방지: invocationId 처리됐는지 확인)
  const content = (inv.result && inv.result.content) || '';
  // 어떤 session 의 결과인지 찾기 — pendingInvocation.id 기준 매칭
  let matchedSess = null;
  for (const s of sessions.values()) {
    if (s.pendingInvocation && s.pendingInvocation.id === id) {
      matchedSess = s;
      break;
    }
  }
  let chainingResult = null;  // [READY] 감지 시 generateDesign trigger 결과
  if (matchedSess) {
    // 이미 처리됐으면 (예: 이전 poll 응답에서 메시지 추가됨) skip
    const alreadyAppended = matchedSess.messages.some(m =>
      m.role === 'assistant' && m._invocationId === id
    );
    if (!alreadyAppended) {
      matchedSess.messages.push({
        role: 'assistant',
        content,
        at: Date.now(),
        _invocationId: id
      });
      delete matchedSess.pendingInvocation;
      persistSession(matchedSess);

      // v30: researcher 자동 chaining — designer 가 commit 표현 또는 "사용자에게 요청" 떠넘기는 경우 둘 다 감지.
      //   동기 경로와 동일하지만 사용자 의도 정합성을 위해 "kds-researcher" + "extend" + 도메인 키워드도 감지.
      const isAskingUser = /[?？]\s*$|확인이 필요|답변 주시면|어떻게 갈|원하시나|어느.{0,5}로|어떤.{0,10}(영역|화면|시안)|몇.{0,5}(개|종)/m.test(content);
      const isAdvisory = /(있다면|없다면|있으면|없으면|존재하지 않으면|필요(시|할 때)|아직 없|만약)/.test(content);
      const isCommitting = /(kds-researcher.{0,20}(호출하겠|호출합니다|진행하겠|진행합니다|시작합)|(brand\.md|brand-md).{0,20}(생성하겠|만들겠|생성합니다|만듭니다)|자동.{0,30}(researcher|brand\.md|chaining).{0,15}(시작|진행|호출))/i.test(content);
      // 비동기 모드 보강: designer 가 "kds-researcher 를 ... 호출해주세요" 형식으로 사용자에게 떠넘긴 경우도 자동 trigger
      const isDelegatingResearcher = /kds-researcher.{0,40}(호출해|실행해|만들어|생성해).{0,5}(주세요|줘)/i.test(content)
                                  && /brand_mode\s*:\s*extend/i.test(content);
      const needsResearcher = (isCommitting || isDelegatingResearcher) && !isAskingUser && !isAdvisory;
      if (needsResearcher) {
        // 도메인 추출 — 세션 내 URL 1개
        const allText = matchedSess.messages.map(m => m.content || '').join(' ');
        const urlMatch = allText.match(/https?:\/\/([^\/\s]+)/);
        const domain = urlMatch ? urlMatch[1].replace(/^www\./, '') : null;
        if (domain) {
          const brandMdPath = path.join(getKdsRoot(), 'research', 'brands', domain, 'brand.md');
          if (fs.existsSync(brandMdPath)) {
            matchedSess.messages.push({
              role: 'assistant',
              content: `✅ brand.md 이미 있음 (${domain}) — researcher skip, 즉시 시안 작업 진행해주세요.`,
              at: Date.now()
            });
            persistSession(matchedSess);
          } else {
            const startMsg = `▶ ${domain} brand.md 자동 생성 시작 (kds-researcher, brand_mode: extend) — 1~5분 소요.`;
            matchedSess.messages.push({ role: 'assistant', content: startMsg, at: Date.now() });
            persistSession(matchedSess);
            // researcher fire-and-forget — invocation 큐로 위임
            (async () => {
              try {
                const researcherPrompt = `KDS v4 kds-researcher 에이전트로 brand.md 생성 작업입니다.

[작업 모드] brand_mode: extend
[도메인] ${domain}

[작업]
1. .claude/agents/kds-researcher.md 가이드 따름
2. ${domain} 사이트 분석 → 6가지 결론 + 포지셔닝 + 영역별 톤표
3. research/brands/${domain}/brand.md 작성

[최종 출력]
\`\`\`json
{ "brandMd": "research/brands/${domain}/brand.md", "areas": ["..."] }
\`\`\`
`;
                const r2 = await execClaudeShort(researcherPrompt, {
                  cwd: getKdsRoot(),
                  timeout: 600000,
                  userId: req.user && req.user.id,
                  kind: 'kds-chat'
                });
                if (!r2.ok) {
                  matchedSess.messages.push({ role: 'assistant', content: `❌ researcher 실패: ${r2.error}`, at: Date.now() });
                } else {
                  matchedSess.messages.push({ role: 'assistant', content: `✅ brand.md 생성 완료 (${domain}). 이제 시안 작업을 명시적으로 트리거해주세요 ("시안 만들어줘" 등).`, at: Date.now() });
                }
                persistSession(matchedSess);
              } catch (e) {
                matchedSess.messages.push({ role: 'assistant', content: `❌ researcher 예외: ${e.message}`, at: Date.now() });
                persistSession(matchedSess);
              }
            })();
          }
        }
      }

      // v30: [READY] 시그널 감지 → generateDesign 자동 trigger (동기 경로와 동일)
      //   응답에 ready=true + jobId 포함 → 클라이언트가 _startGenerationPolling 시작
      const readyLine = content.split('\n').reverse().find(l => l.trim().startsWith('[READY]'));
      if (readyLine) {
        const req2 = (readyLine.match(/requirement="([^"]+)"/) || [])[1]
          || matchedSess.messages.filter(m => m.role === 'user').map(m => m.content).join(' / ');
        const vpStr = (readyLine.match(/viewports=([\w+]+)/) || [])[1] || 'mobile';
        const name = (readyLine.match(/name=([a-zA-Z0-9_-]+)/) || [])[1];
        const viewports = vpStr.split('+').filter(Boolean);
        const job = newJob();
        job.requirement = req2;
        job.viewports = viewports;
        job.status = 'running';
        attachJob(matchedSess, job.id);
        persistSession(matchedSess);
        startJobWatcher(job);
        chainingResult = { ready: true, jobId: job.id, requirement: req2, viewports };
        // fire-and-forget — generateDesign 처리 (비동기 워커로 위임됨)
        (async () => {
          try {
            const r2 = await generateDesign({
              requirement: req2,
              viewports,
              name,
              conversationHistory: matchedSess.messages,
              userId: req.user.id
            });
            job.finished_at = Date.now();
            if (!r2.ok) {
              job.status = 'failed';
              job.error = r2.error;
              job.raw_excerpt = (r2.raw || '').slice(0, 800);
              job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `실패: ${r2.error}` });
              matchedSess.messages.push({ role: 'assistant', content: `❌ 시안 작업 실패: ${r2.error}`, at: Date.now() });
            } else {
              job.status = 'done';
              job.generated = r2.generated;
              job.raw_excerpt = r2.raw_excerpt;
              if (Array.isArray(r2.postProcess)) {
                const label = { 'inject-svg': 'SVG 아이콘 자동 치환', 'inject-images': '이미지 자동 삽입', 'lint:kds': '검증' };
                r2.postProcess.forEach(p => {
                  const txt = (label[p.label] || p.label) + (p.ok ? ' 완료' : ' 일부 위반');
                  job.phaseEvents.push({ ts: Date.now(), kind: p.ok ? 'post_ok' : 'post_fail', text: txt });
                });
                job.postProcess = r2.postProcess;
              }
              job.phaseEvents.push({ ts: Date.now(), kind: 'done', text: `완료: ${r2.generated.length}개 파일` });
              matchedSess.messages.push({ role: 'assistant', content: `✅ 시안 ${r2.generated.length}개 파일 생성 완료. Figma 에서 import 가능합니다.`, at: Date.now() });
            }
            persistSession(matchedSess);
          } catch (e) {
            job.status = 'failed';
            job.error = e.message;
            job.finished_at = Date.now();
            job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `예외: ${e.message}` });
            matchedSess.messages.push({ role: 'assistant', content: `❌ 시안 작업 예외: ${e.message}`, at: Date.now() });
            persistSession(matchedSess);
          } finally {
            stopJobWatcher(job);
          }
        })();
      }
    }
  }

  res.json({
    invocationId: id,
    status: 'done',
    sessionId: matchedSess && matchedSess.id,
    assistant: content,
    ready: !!(chainingResult && chainingResult.ready),
    jobId: chainingResult && chainingResult.jobId,
    requirement: chainingResult && chainingResult.requirement,
    viewports: chainingResult && chainingResult.viewports
  });
});

// GET /api/kds-design/session/:id — 메시지 history (새로고침 복원용)
//   메모리 → 디스크 순으로 조회. 과거 세션도 디스크에서 복원.
//   응답에 jobHistory 기반 jobStats + latestJobStatus 동봉 → 프론트가 polling 없이도 즉시 완료 뱃지 렌더.
router.get('/session/:id', (req, res) => {
  let s = sessions.get(req.params.id);
  if (!s) {
    s = loadSessionFromDisk(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    sessions.set(s.id, s);  // 메모리로 다시 올림
  }
  migrateSessionShape(s);
  // jobHistory 의 각 jobId 상태 조회 (메모리 → 디스크). 작업 이력 보통 1~5건이라 N read 허용.
  const hist = s.jobHistory || [];
  function lookupJobStatus(jobId) {
    if (!jobId) return null;
    const m = jobs.get(jobId);
    if (m) return m.status || null;
    const d = loadJobFromDisk(jobId);
    return d ? (d.status || null) : null;
  }
  let doneCount = 0, runningCount = 0, failedCount = 0, otherCount = 0;
  const enriched = hist.map(h => {
    const st = lookupJobStatus(h.jobId);
    if (st === 'done') doneCount++;
    else if (st === 'running' || st === 'pending') runningCount++;
    else if (st === 'failed') failedCount++;
    else otherCount++;
    return { ...h, status: st };
  });
  const latestJobId = hist.length ? hist[hist.length - 1].jobId : null;
  const latestJobStatus = lookupJobStatus(latestJobId);
  return res.json({
    ...s,
    jobHistoryEnriched: enriched,
    jobCount: hist.length,
    latestJobId,
    latestJobStatus,
    jobStats: { done: doneCount, running: runningCount, failed: failedCount, other: otherCount }
  });
});

// GET /api/kds-design/sessions — 작업 목록 (디스크의 모든 세션 + 메모리 통합)
//   각 세션의 jobHistory 를 순회해 jobCount/latestJobStatus 를 함께 노출.
//   구버전 세션(generationJobId 만 있는 케이스)은 migrateSessionShape 가 자동 변환.
router.get('/sessions', (req, res) => {
  ensureSessionsDir();
  const seen = new Map();
  // 디스크
  try {
    for (const f of fs.readdirSync(SESSIONS_DIR)) {
      if (!f.endsWith('.json')) continue;
      try {
        const s = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
        migrateSessionShape(s);
        seen.set(s.id, s);
      } catch {}
    }
  } catch {}
  // 메모리 우선 (최신)
  for (const s of sessions.values()) { migrateSessionShape(s); seen.set(s.id, s); }

  // job status 조회 — 메모리 → 디스크 순. 자주 호출되는 API 가 아니라 N 회 read 허용.
  function lookupJobStatus(jobId) {
    if (!jobId) return null;
    const m = jobs.get(jobId);
    if (m) return m.status || null;
    const d = loadJobFromDisk(jobId);
    return d ? (d.status || null) : null;
  }

  const items = Array.from(seen.values()).map(s => {
    const hist = Array.isArray(s.jobHistory) ? s.jobHistory : [];
    const latestJobId = hist.length ? hist[hist.length - 1].jobId : null;
    const latestStatus = lookupJobStatus(latestJobId);
    // 집계 라벨 — done 1건 이상이면 "완료 N건" 식으로 표시 가능하도록 카운트 제공
    let doneCount = 0, runningCount = 0, failedCount = 0, otherCount = 0;
    for (const h of hist) {
      const st = lookupJobStatus(h.jobId);
      if (st === 'done') doneCount++;
      else if (st === 'running' || st === 'pending') runningCount++;
      else if (st === 'failed') failedCount++;
      else otherCount++;  // orphaned / cancelled / null
    }
    return {
      id: s.id,
      title: deriveSessionTitle(s),
      messageCount: (s.messages || []).length,
      created_at: s.created_at,
      last_activity: (s.messages && s.messages.length) ? s.messages[s.messages.length-1].at : s.created_at,
      has_ready: (s.messages || []).some(m => /\[READY\]/.test(m.content || '')),
      generationJobId: s.generationJobId,  // 호환
      jobCount: hist.length,
      latestJobId,
      latestJobStatus: latestStatus,
      jobStats: { done: doneCount, running: runningCount, failed: failedCount, other: otherCount }
    };
  }).sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0));
  return res.json({ ok: true, items });
});

// DELETE /api/kds-design/session/:id — 세션 삭제 (디스크 + 메모리)
router.delete('/session/:id', (req, res) => {
  const id = req.params.id;
  sessions.delete(id);
  try {
    const f = path.join(SESSIONS_DIR, id + '.json');
    if (fs.existsSync(f)) fs.unlinkSync(f);
  } catch {}
  return res.json({ ok: true });
});


// 인메모리 job store (단순) + 디스크 영구 저장 — 서버 재시작 후에도 jobId 로 복원 가능.
const jobs = new Map();
const JOB_MAX = 64;
const JOBS_DIR = path.join(__dirname, '..', '..', 'data', 'kds-design-jobs');
function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
}
function persistJob(job) {
  try {
    ensureJobsDir();
    const { _watcher, _snapshot, ...persisted } = job;
    fs.writeFileSync(path.join(JOBS_DIR, job.id + '.json'), JSON.stringify(persisted, null, 2), 'utf8');
  } catch (e) { /* 디스크 실패는 무시 — 메모리 진행은 계속 */ }
}
function loadJobFromDisk(id) {
  try {
    const f = path.join(JOBS_DIR, id + '.json');
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return null; }
}
function newJob() {
  if (jobs.size >= JOB_MAX) {
    const firstKey = jobs.keys().next().value;
    jobs.delete(firstKey);
  }
  const id = 'job_' + crypto.randomBytes(6).toString('hex');
  const job = { id, status: 'pending', requirement: '', viewports: [], generated: [], error: null,
                created_at: Date.now(), finished_at: null, raw_excerpt: null,
                phaseEvents: [], _watcher: null, _snapshot: null };
  jobs.set(id, job);
  persistJob(job);
  return job;
}

// KDS workdir watcher — researcher chaining(543ccac) 이후 산출물 경로 확장:
//   to-figma/         → Figma 스펙(.figma.json) + 최종 HTML
//   output/           → designer 1차 HTML (research 단계 직후)
//   research/<name>/  → researcher 단계 산출물 (screenshots/pages/brief.md/tokens-observed.md)
// _snapshot 을 Map('<dir>/<rel>' → mtimeMs) 단일 Map 으로 평탄화. recursive walk.
function snapshotDir(dir, snap = new Map(), prefix = '') {
  try {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('_') || f.startsWith('.')) continue;
      const abs = path.join(dir, f);
      const rel = prefix ? `${prefix}/${f}` : f;
      try {
        const st = fs.statSync(abs);
        if (st.isDirectory()) snapshotDir(abs, snap, rel);
        else snap.set(rel, st.mtimeMs);
      } catch {}
    }
  } catch {}
  return snap;
}
// 산출물 경로 패턴 → 한국어 단계 라벨
function labelFor(rel) {
  if (rel.startsWith('research/') && rel.includes('/screenshots/')) return { kind: 'research_capture', text: '리서치 캡처' };
  if (rel.startsWith('research/') && rel.includes('/pages/')) return { kind: 'research_page', text: '페이지 분석' };
  if (rel.startsWith('research/') && rel.endsWith('brief.md')) return { kind: 'research_brief', text: '리서치 brief 작성' };
  if (rel.startsWith('research/') && rel.endsWith('tokens-observed.md')) return { kind: 'research_tokens', text: '토큰 추출' };
  if (rel.startsWith('output/') && rel.endsWith('.html')) return { kind: 'design_html', text: '시안 HTML 생성' };
  if (rel.startsWith('to-figma/') && rel.endsWith('.figma.json')) return { kind: 'figma_spec', text: 'Figma 스펙 생성' };
  if (rel.startsWith('to-figma/') && rel.endsWith('.html')) return { kind: 'figma_html', text: 'to-figma HTML 이관' };
  return { kind: 'new_file', text: '파일 생성됨' };
}
function startJobWatcher(job) {
  const root = getKdsRoot();
  const watchedDirs = ['to-figma', 'output', 'research'].map(d => ({ name: d, abs: path.join(root, d) }));
  const buildSnap = () => {
    const snap = new Map();
    for (const d of watchedDirs) snapshotDir(d.abs, snap, d.name);
    return snap;
  };
  job._snapshot = buildSnap();
  job.phaseEvents.push({ ts: Date.now(), kind: 'started', text: '작업 시작' });
  persistJob(job);
  job._watcher = setInterval(() => {
    try {
      const now = buildSnap();
      let changed = false;
      for (const [rel, mtime] of now.entries()) {
        const prev = job._snapshot.get(rel);
        if (prev === undefined) {
          const lbl = labelFor(rel);
          job.phaseEvents.push({ ts: Date.now(), kind: lbl.kind, file: rel, text: `${lbl.text}: ${path.basename(rel)}` });
          changed = true;
        } else if (mtime > prev + 100) {
          job.phaseEvents.push({ ts: Date.now(), kind: 'edit_file', file: rel, text: `파일 검토·수정: ${path.basename(rel)}` });
          changed = true;
        }
      }
      job._snapshot = now;
      if (changed) persistJob(job);
    } catch {}
  }, 2000);
}
function stopJobWatcher(job) {
  if (job._watcher) { clearInterval(job._watcher); job._watcher = null; }
  persistJob(job);
}

// POST /api/kds-design/generate
//   body: { requirement, viewports?, name? }
//   응답: { ok, jobId } — 결과는 GET /job/:id 로 폴링
router.post('/generate', async (req, res) => {
  const { requirement, viewports, name } = req.body || {};
  if (!requirement || !String(requirement).trim()) {
    return res.status(400).json({ error: 'requirement 필수' });
  }
  const job = newJob();
  job.requirement = String(requirement);
  job.viewports = Array.isArray(viewports) && viewports.length ? viewports : ['mobile'];
  job.status = 'running';
  startJobWatcher(job);

  // fire-and-forget
  (async () => {
    try {
      const r = await generateDesign({ requirement: job.requirement, viewports: job.viewports, name, userId: req.user && req.user.id });
      job.finished_at = Date.now();
      if (!r.ok) {
        job.status = 'failed';
        job.error = r.error;
        job.raw_excerpt = (r.raw || '').slice(0, 800);
        job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `실패: ${r.error}` });
        return;
      }
      job.status = 'done';
      job.generated = r.generated;
      job.raw_excerpt = r.raw_excerpt;
      if (Array.isArray(r.postProcess)) {
        const label = { 'inject-svg': 'SVG 아이콘 자동 치환', 'inject-images': '이미지 자동 삽입', 'lint:kds': '검증' };
        r.postProcess.forEach(p => {
          const txt = (label[p.label] || p.label) + (p.ok ? ' 완료' : ' 일부 위반');
          job.phaseEvents.push({ ts: Date.now(), kind: p.ok ? 'post_ok' : 'post_fail', text: txt });
        });
        job.postProcess = r.postProcess;
      }
      job.phaseEvents.push({ ts: Date.now(), kind: 'done', text: `완료: ${r.generated.length}개 파일` });
    } catch (e) {
      job.status = 'failed';
      job.error = e.message;
      job.finished_at = Date.now();
      job.phaseEvents.push({ ts: Date.now(), kind: 'failed', text: `예외: ${e.message}` });
    } finally {
      stopJobWatcher(job);
    }
  })();

  return res.json({ ok: true, jobId: job.id });
});

// GET /api/kds-design/job/:id — job 상태 (직렬화 시 _watcher/_snapshot 등 internal 필드 제외)
//   메모리 → 디스크 순으로 조회. 서버 재시작 후에도 디스크에서 복원.
router.get('/job/:id', (req, res) => {
  let job = jobs.get(req.params.id);
  if (!job) {
    const disk = loadJobFromDisk(req.params.id);
    if (disk) {
      // 진행 중이었는데 메모리에 없으면 = 서버 재시작으로 child 끊김. orphan 처리.
      if (disk.status === 'running' || disk.status === 'pending') {
        disk.status = 'orphaned';
        disk.error = '서버 재시작으로 작업이 중단되었습니다. 채팅에서 이어서 요청하세요.';
        disk.phaseEvents = (disk.phaseEvents || []).concat([{ ts: Date.now(), kind: 'orphaned', text: '서버 재시작으로 중단됨' }]);
      }
      return res.json(disk);
    }
    return res.status(404).json({ error: 'job not found' });
  }
  const { _watcher, _snapshot, ...safe } = job;
  return res.json(safe);
});

// GET /api/kds-design/list — KDS to-figma/ 에 등재된 figma.json 목록 (proxy of KDS /designs)
//   KDS bridge(3939) 가 떠있어야 함. 안 떠있으면 디스크 직접 스캔으로 fallback.
router.get('/list', async (req, res) => {
  const kdsRoot = getKdsRoot();
  const toFigmaDir = path.join(kdsRoot, 'to-figma');
  if (!fs.existsSync(toFigmaDir)) {
    return res.status(404).json({ error: 'KDS to-figma directory not found', dir: toFigmaDir });
  }
  const entries = fs.readdirSync(toFigmaDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.figma.json'))
    .map(d => {
      const full = path.join(toFigmaDir, d.name);
      const stat = fs.statSync(full);
      const htmlName = d.name.replace(/\.figma\.json$/, '.html');
      const htmlExists = fs.existsSync(path.join(toFigmaDir, htmlName));
      return {
        name: d.name.replace(/\.figma\.json$/, ''),
        figmaJson: d.name,
        html: htmlExists ? htmlName : null,
        mtime: stat.mtimeMs,
        size: stat.size,
        // v25: Railway 단일 PORT 호환 — 외부에서는 /kds-bridge/preview/* 로 접근.
        //   PUBLIC_BASE_URL 미설정 시 상대 경로 사용 → 브라우저가 현재 도메인 기준 자동 prefix.
        previewUrl: htmlExists ? `${process.env.PUBLIC_BASE_URL || ''}/kds-bridge/preview/${htmlName}` : null
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return res.json({ ok: true, kdsRoot, toFigmaDir, items: entries });
});

// DELETE /api/kds-design/item/:name — KDS to-figma/ 의 페어(html + figma.json) 삭제
router.delete('/item/:name', (req, res) => {
  const name = (req.params.name || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!name) return res.status(400).json({ error: 'invalid name' });
  const toFigmaDir = path.join(getKdsRoot(), 'to-figma');
  const html = path.join(toFigmaDir, name + '.html');
  const spec = path.join(toFigmaDir, name + '.figma.json');
  const removed = [];
  for (const f of [html, spec]) {
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed.push(path.basename(f)); }
  }
  return res.json({ ok: true, removed });
});

// GET /api/kds-design/figma-history — 디자이너 from-figma/ 변경 히스토리
//   응답: { items: [{ file, mtime, screen, totalChanges, summary }] }
router.get('/figma-history', (req, res) => {
  const dir = path.join(getKdsRoot(), 'from-figma');
  if (!fs.existsSync(dir)) return res.json({ ok: true, items: [] });
  try {
    const items = fs.readdirSync(dir)
      .filter(f => f.startsWith('change-log-') && f.endsWith('.json'))
      .map(f => {
        try {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          const j = JSON.parse(fs.readFileSync(full, 'utf8'));
          const screen = j.filteredFor || {};
          return {
            file: f,
            mtime: stat.mtimeMs,
            screen: screen.name || '?',
            screenKdsId: screen.kdsId || '?',
            totalChanges: j.totalChanges || 0,
            summary: (j.changes || []).slice(0, 3).map(c => c.detail || c.type).join('; ')
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);
    return res.json({ ok: true, pending: !!_fromFigmaPending, items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// v25: GET /api/kds-design/plugin/info — 플러그인 설치 정보 (UI 가이드 표시용)
//   응답에 zip 다운로드 URL, manifest 도메인 목록, 현재 Railway 도메인 포함
router.get('/plugin/info', (req, res) => {
  const kdsRoot = getKdsRoot();
  const pluginDir = path.join(kdsRoot, 'figma-change-tracker');
  if (!fs.existsSync(pluginDir)) {
    return res.status(404).json({ error: 'plugin directory not found', dir: pluginDir });
  }
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf8'));
  } catch {}
  res.json({
    ok: true,
    name: (manifest && manifest.name) || 'KDS Change Tracker',
    pluginId: (manifest && manifest.id) || 'unknown',
    devAllowedDomains: (manifest && manifest.networkAccess && manifest.networkAccess.devAllowedDomains) || [],
    downloadUrl: '/api/kds-design/plugin/download',
    currentOrigin: req.headers['x-forwarded-host']
      ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
      : `${req.protocol}://${req.get('host')}`,
    installSteps: [
      'Figma 데스크톱 앱 실행 (브라우저 불가)',
      '메뉴 → Plugins → Development → "Import plugin from manifest..."',
      '다운로드 받은 zip 압축 풀고 manifest.json 선택',
      '플러그인 목록에 "KDS Change Tracker" 등재 확인',
      'Figma 파일 열고 Plugins → Development → KDS Change Tracker 실행'
    ]
  });
});

// v25: GET /api/kds-design/plugin/download — figma-change-tracker/ 전체를 zip 으로 반환
//   manifest.json + code.js + ui.html (보통 ~50KB 미만)
router.get('/plugin/download', (req, res) => {
  const kdsRoot = getKdsRoot();
  const pluginDir = path.join(kdsRoot, 'figma-change-tracker');
  if (!fs.existsSync(pluginDir)) {
    return res.status(404).json({ error: 'plugin directory not found' });
  }
  let archiver;
  try { archiver = require('archiver'); }
  catch (e) {
    return res.status(500).json({ error: 'archiver 미설치 — Dockerfile rebuild 필요', detail: e.message });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="kds-figma-plugin.zip"`);
  const zip = archiver('zip', { zlib: { level: 9 } });
  zip.on('error', (err) => { try { res.status(500).end(err.message); } catch {} });
  zip.pipe(res);
  zip.directory(pluginDir, 'kds-figma-plugin');
  zip.finalize();
});

module.exports = router;
