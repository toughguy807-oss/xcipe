#!/usr/bin/env node
// KDS 디자인 페이지 시연용 데모 시드.
//   ktmyr.com 마이페이지 메인 시안 작업 흐름 4단계(1컷~4컷) 캡처용.
//
// 사용:
//   node scripts/kds-demo-seed.js setup        - 데모 자산 일괄 생성 (세션 3개 + job 2개 + to-figma 16개)
//   node scripts/kds-demo-seed.js mark-done    - step4 job 을 done 으로 patch (4컷 ✓ 카드 트리거)
//   node scripts/kds-demo-seed.js mark-running - step4 job 을 다시 running 으로 복귀 (재캡처용)
//   node scripts/kds-demo-seed.js refresh-ts   - step3 9초 / step4 154분 29초 elapsed 재설정
//   node scripts/kds-demo-seed.js teardown     - 모든 데모 자산 제거 + to-figma 백업 복원
//
// 캡처 순서 (가이드):
//   1컷: SYS_v4 npm start → /kds-design "새 대화" → URL 입력 후 캡처 (시드 불필요)
//   2컷: 사이드바 "대화 목록" → sess_demo_step2 선택 → 캡처
//   3컷: 사이드바 → sess_demo_step3 선택 → "▶ 작업 중 9초 경과" 카드 확인 후 캡처
//   4컷: 사이드바 → sess_demo_step4 선택 → "▶ 작업 중 154분 경과" 카드 표시됨
//        → 다른 터미널에서 `node scripts/kds-demo-seed.js mark-done` 실행
//        → 2초 내 polling 이 done 잡고 "✓ 생성 완료 154분 29초 · 16개 파일" 카드로 전환
//        → 캡처

const fs = require('fs');
const path = require('path');

const { getKdsRoot } = require('../src/engine/kds-design-runner');

const ROOT = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(ROOT, 'data', 'kds-design-sessions');
const JOBS_DIR = path.join(ROOT, 'data', 'kds-design-jobs');
const TO_FIGMA = path.join(getKdsRoot(), 'to-figma');
const BACKUP_DIR = path.join(TO_FIGMA, '.demo-backup');

const SESS_STEP2 = 'sess_demo_step2';
const SESS_STEP3 = 'sess_demo_step3';
const SESS_STEP4 = 'sess_demo_step4';
const JOB_STEP3 = 'job_demo_step3';
const JOB_STEP4 = 'job_demo_step4';

const ELAPSED_STEP3_MS = 9 * 1000;
const ELAPSED_STEP4_MS = (154 * 60 + 29) * 1000;

const VARIANTS = ['a', 'b', 'c', 'compare'];
const VIEWPORTS = ['mobile', 'desktop'];

function generatedFileList() {
  const out = [];
  for (const v of VARIANTS) {
    for (const vp of VIEWPORTS) {
      out.push(`ktmyr-mypage-main-${v}-${vp}.html`);
      out.push(`ktmyr-mypage-main-${v}-${vp}.figma.json`);
    }
  }
  return out;
}

function ensureDirs() {
  for (const d of [SESSIONS_DIR, JOBS_DIR, TO_FIGMA, BACKUP_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ── 메시지 빌더 ────────────────────────────────────────────────────────
function msgIntro(at) {
  return {
    role: 'assistant',
    content: '안녕하세요. 어떤 KDS 화면을 만들어 드릴까요? 화면 목적과 핵심 콘텐츠를 알려주시면 추가로 명확화 질문을 드린 뒤 생성하겠습니다.',
    at
  };
}
function msgUserUrl(at) {
  return { role: 'user', content: 'https://ktmyr.com/fe/mypage/main.do', at };
}
function msgAssistantClarify(at) {
  return {
    role: 'assistant',
    content:
'`https://ktmyr.com/fe/mypage/main.do` — KT 마이페이지 메인 화면이네요.\n\n' +
'**먼저 알려드릴 사항** — `research/brands/ktmyr.com/brand.md` 가 아직 없습니다. KDS designer 워크플로우 B 규칙상, URL 기반 시안 작업은 brand.md 가 선행되어야 합니다. **kds-researcher 를 `brand_mode: extend` 로 먼저 호출해서 ktmyr.com brand.md 를 만들어 주세요.** (메인 세션에서 실행해주시면 됩니다.)\n\n' +
'그 사이에 시안 방향을 확정해 두면 brand.md 도착 직후 바로 작업 들어갈 수 있습니다. 세 가지만 확인해 주세요:\n\n' +
'1. **화면 영역(screen_area)** — `마이페이지 메인` 전체 화면 맞나요? (요금/사용량 위젯 + 빠른 메뉴 + 혜택/이벤트 영역까지 포함하는 랜딩)\n' +
'2. **viewport** — mobile / desktop / 둘 다 중 어느 쪽?\n' +
'3. **시안 개수** — 기본 3개(A/B/C 변형) 로 갈까요, 아니면 다르게?',
    at
  };
}
function msgUserAnswer(at) {
  return {
    role: 'user',
    content: '시안 3개, PC/MO 둘 다, brand.md 파일 생성 후 진행해줘',
    at
  };
}
function msgAssistantReady(at) {
  return {
    role: 'assistant',
    content:
'좋습니다. 정리하면:\n\n' +
'- **domain**: ktmyr.com\n' +
'- **screen_area**: 마이페이지 메인\n' +
'- **viewport**: mobile + desktop\n' +
'- **시안 개수**: 3개 (A/B/C)\n\n' +
'brand.md 는 메인 세션에서 kds-researcher 가 `brand_mode: extend` 로 생성한 결과를 참조해 작업 진행합니다.\n\n' +
'[READY] requirement="ktmyr.com 마이페이지 메인 시안 A/B/C 3종 — brand.md 의 영역별 톤 반영" viewports=mobile+desktop name=ktmyr-mypage-main',
    at
  };
}
function msgAssistantDone(at, fileCount) {
  return {
    role: 'assistant',
    content: `✅ 시안 ${fileCount}개 파일 생성 완료. Figma 에서 import 가능합니다.`,
    at
  };
}

// ── 세션 빌더 ──────────────────────────────────────────────────────────
function buildSessionStep2(now) {
  const t0 = now - 4 * 60 * 1000;
  return {
    id: SESS_STEP2,
    messages: [
      msgIntro(t0),
      msgUserUrl(t0 + 30 * 1000),
      msgAssistantClarify(t0 + 60 * 1000)
    ],
    created_at: t0,
    generationJobId: null,
    jobHistory: []
  };
}

function buildSessionStep3(now) {
  const t0 = now - 4 * 60 * 1000 - ELAPSED_STEP3_MS;
  const tJobStart = now - ELAPSED_STEP3_MS;
  return {
    id: SESS_STEP3,
    messages: [
      msgIntro(t0),
      msgUserUrl(t0 + 30 * 1000),
      msgAssistantClarify(t0 + 60 * 1000),
      msgUserAnswer(tJobStart - 5 * 1000),
      msgAssistantReady(tJobStart - 2 * 1000)
    ],
    created_at: t0,
    generationJobId: JOB_STEP3,
    jobHistory: [{ jobId: JOB_STEP3, startedAt: tJobStart }]
  };
}

function buildSessionStep4(now, generatedFiles) {
  const t0 = now - 4 * 60 * 1000 - ELAPSED_STEP4_MS;
  const tJobStart = now - ELAPSED_STEP4_MS;
  return {
    id: SESS_STEP4,
    messages: [
      msgIntro(t0),
      msgUserUrl(t0 + 30 * 1000),
      msgAssistantClarify(t0 + 60 * 1000),
      msgUserAnswer(tJobStart - 5 * 1000),
      msgAssistantReady(tJobStart - 2 * 1000),
      msgAssistantDone(now, generatedFiles.length)
    ],
    created_at: t0,
    generationJobId: JOB_STEP4,
    jobHistory: [{ jobId: JOB_STEP4, startedAt: tJobStart }]
  };
}

// ── job 빌더 ───────────────────────────────────────────────────────────
function buildJobStep3(now) {
  const created = now - ELAPSED_STEP3_MS;
  return {
    id: JOB_STEP3,
    status: 'running',
    requirement: 'ktmyr.com 마이페이지 메인 시안 A/B/C 3종 — brand.md 의 영역별 톤 반영',
    viewports: ['mobile', 'desktop'],
    generated: [],
    error: null,
    created_at: created,
    finished_at: null,
    raw_excerpt: null,
    phaseEvents: [
      { ts: created, kind: 'started', text: '작업 시작' }
    ]
  };
}

function buildJobStep4(now, generatedFiles, { done }) {
  const created = now - ELAPSED_STEP4_MS;
  const tNewFile = now - 67 * 1000;
  const tEdit = now - 65 * 1000;
  const tPost = now;
  const phaseEvents = [
    { ts: created, kind: 'started', text: '작업 시작' },
    { ts: tNewFile, kind: 'new_file', file: 'to-figma/' + generatedFiles[0], fileKind: 'html', text: '파일 생성됨' },
    { ts: tEdit, kind: 'edit_file', file: 'to-figma/' + generatedFiles[0], text: '파일 검토·수정' },
    { ts: tPost, kind: 'post_ok', text: 'SVG 아이콘 자동 치환 완료' },
    { ts: tPost, kind: 'post_ok', text: '이미지 자동 삽입 완료' }
  ];
  if (done) {
    phaseEvents.push({ ts: tPost, kind: 'done', text: `완료: ${generatedFiles.length}개 파일` });
  }
  return {
    id: JOB_STEP4,
    status: done ? 'done' : 'running',
    requirement: 'ktmyr.com 마이페이지 메인 시안 A/B/C 3종 — brand.md 의 영역별 톤 반영',
    viewports: ['mobile', 'desktop'],
    generated: done ? generatedFiles : [],
    error: null,
    created_at: created,
    finished_at: done ? now : null,
    raw_excerpt: null,
    phaseEvents,
    postProcess: done ? [
      { label: 'inject-svg', ok: true },
      { label: 'inject-images', ok: true }
    ] : undefined
  };
}

// ── to-figma 백업 / 복원 / placeholder ─────────────────────────────────
function placeholderHtml(name) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>body{font-family:system-ui;padding:40px;color:#191A1B}h1{font-size:20px}p{color:#666;font-size:14px}</style>
</head>
<body>
<h1>${name}</h1>
<p>KDS 디자인 페이지 시연용 placeholder. 실제 시안 HTML 이 아닙니다.</p>
<p>scripts/kds-demo-seed.js setup 으로 생성됨.</p>
</body>
</html>`;
}

function placeholderFigmaJson(name) {
  return {
    name,
    _demo: true,
    _note: 'KDS 디자인 페이지 시연용 placeholder. scripts/kds-demo-seed.js setup 으로 생성됨.',
    root: { name, kdsId: `demo-${name}` }
  };
}

function backupExistingToFigma() {
  if (!fs.existsSync(TO_FIGMA)) return [];
  const items = fs.readdirSync(TO_FIGMA, { withFileTypes: true })
    .filter(d => d.isFile())
    .filter(d => d.name.endsWith('.html') || d.name.endsWith('.figma.json'))
    .filter(d => !d.name.startsWith('ktmyr-mypage-main-'));
  const moved = [];
  for (const it of items) {
    const src = path.join(TO_FIGMA, it.name);
    const dst = path.join(BACKUP_DIR, it.name);
    fs.renameSync(src, dst);
    moved.push(it.name);
  }
  return moved;
}

function restoreBackup() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const items = fs.readdirSync(BACKUP_DIR).filter(n => !n.startsWith('.'));
  const restored = [];
  for (const name of items) {
    const src = path.join(BACKUP_DIR, name);
    const dst = path.join(TO_FIGMA, name);
    fs.renameSync(src, dst);
    restored.push(name);
  }
  try { fs.rmdirSync(BACKUP_DIR); } catch {}
  return restored;
}

function writePlaceholders() {
  const written = [];
  for (const name of generatedFileList()) {
    const full = path.join(TO_FIGMA, name);
    if (name.endsWith('.html')) {
      fs.writeFileSync(full, placeholderHtml(name.replace(/\.html$/, '')), 'utf8');
    } else {
      fs.writeFileSync(full, JSON.stringify(placeholderFigmaJson(name.replace(/\.figma\.json$/, '')), null, 2), 'utf8');
    }
    written.push(name);
  }
  return written;
}

function removePlaceholders() {
  if (!fs.existsSync(TO_FIGMA)) return [];
  const removed = [];
  for (const name of generatedFileList()) {
    const full = path.join(TO_FIGMA, name);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      removed.push(name);
    }
  }
  return removed;
}

// ── commands ──────────────────────────────────────────────────────────
function cmdSetup() {
  ensureDirs();
  const now = Date.now();
  const files = generatedFileList();

  writeJson(path.join(SESSIONS_DIR, SESS_STEP2 + '.json'), buildSessionStep2(now));
  writeJson(path.join(SESSIONS_DIR, SESS_STEP3 + '.json'), buildSessionStep3(now));
  writeJson(path.join(SESSIONS_DIR, SESS_STEP4 + '.json'), buildSessionStep4(now, files));

  writeJson(path.join(JOBS_DIR, JOB_STEP3 + '.json'), buildJobStep3(now));
  writeJson(path.join(JOBS_DIR, JOB_STEP4 + '.json'), buildJobStep4(now, files, { done: false }));

  const movedAway = backupExistingToFigma();

  console.log('[setup] sessions: %s, %s, %s', SESS_STEP2, SESS_STEP3, SESS_STEP4);
  console.log('[setup] jobs    : %s (running), %s (running)', JOB_STEP3, JOB_STEP4);
  console.log('[setup] to-figma백업 이동: %d개 (우측 패널 빈 상태)', movedAway.length);
  if (movedAway.length) console.log('         %s', movedAway.join(', '));
  console.log('[setup] placeholder 생성: 0개 (mark-done 시점에 생성됨 — 4컷 의도 보존)');
  console.log();
  console.log('  npm start → 사이드바 "대화 목록" → 단계별 캡처.');
  console.log('  4컷 캡처 직전: node scripts/kds-demo-seed.js mark-done (16개 파일 + done 카드 동시 트리거)');
}

function cmdMarkDone() {
  const f = path.join(JOBS_DIR, JOB_STEP4 + '.json');
  if (!fs.existsSync(f)) { console.error('[mark-done] %s 없음. 먼저 setup 실행.', JOB_STEP4); process.exit(1); }
  const now = Date.now();
  const files = generatedFileList();
  // created_at 을 now-154m29s 로 다시 박아 elapsed 표시값을 고정.
  // setup 후 캡처까지 흐른 시간이 154분에 합산되지 않도록.
  const j = buildJobStep4(now, files, { done: true });
  writeJson(f, j);
  // 세션 jobHistory.startedAt 도 같이 보정 — _renderJobHistoryBadge 정확도 유지.
  const sessPath = path.join(SESSIONS_DIR, SESS_STEP4 + '.json');
  if (fs.existsSync(sessPath)) writeJson(sessPath, buildSessionStep4(now, files));
  // 우측 패널 16개 등장 — done 카드와 동시 트리거. loadList 가 자동 새로고침.
  const wrote = writePlaceholders();
  const min = Math.floor(ELAPSED_STEP4_MS / 60000);
  const sec = Math.floor((ELAPSED_STEP4_MS % 60000) / 1000);
  console.log('[mark-done] %s → done (elapsed: %d분 %d초, generated: %d개)', JOB_STEP4, min, sec, j.generated.length);
  console.log('[mark-done] to-figma placeholder %d개 생성 — 우측 패널 자동 새로고침됨', wrote.length);
  console.log('  client 가 2초 내 polling 으로 잡고 "✓ 생성 완료" 카드 + 우측 16개 표시. 화면 확인 후 캡처.');
}

function cmdMarkRunning() {
  const f = path.join(JOBS_DIR, JOB_STEP4 + '.json');
  if (!fs.existsSync(f)) { console.error('[mark-running] %s 없음.', JOB_STEP4); process.exit(1); }
  const j = readJson(f);
  j.status = 'running';
  j.finished_at = null;
  j.generated = [];
  j.phaseEvents = j.phaseEvents.filter(e => e.kind !== 'done');
  delete j.postProcess;
  writeJson(f, j);
  // 우측 패널 placeholder 도 같이 제거 — 다시 빈 상태로
  const removed = removePlaceholders();
  console.log('[mark-running] %s → running (재캡처용) + placeholder %d개 제거', JOB_STEP4, removed.length);
}

function cmdRefreshTs() {
  const now = Date.now();
  const files = generatedFileList();
  for (const [sessId, builder] of [
    [SESS_STEP2, () => buildSessionStep2(now)],
    [SESS_STEP3, () => buildSessionStep3(now)],
    [SESS_STEP4, () => buildSessionStep4(now, files)]
  ]) {
    const f = path.join(SESSIONS_DIR, sessId + '.json');
    if (!fs.existsSync(f)) continue;
    writeJson(f, builder());
  }
  const step3Path = path.join(JOBS_DIR, JOB_STEP3 + '.json');
  if (fs.existsSync(step3Path)) writeJson(step3Path, buildJobStep3(now));
  const step4Path = path.join(JOBS_DIR, JOB_STEP4 + '.json');
  if (fs.existsSync(step4Path)) {
    const wasDone = readJson(step4Path).status === 'done';
    writeJson(step4Path, buildJobStep4(now, files, { done: wasDone }));
  }
  console.log('[refresh-ts] 모든 세션/job timestamp 를 현재 시각 기준으로 재설정.');
}

function cmdTeardown() {
  const removed = [];
  for (const sessId of [SESS_STEP2, SESS_STEP3, SESS_STEP4]) {
    const f = path.join(SESSIONS_DIR, sessId + '.json');
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed.push('sessions/' + sessId); }
  }
  for (const jobId of [JOB_STEP3, JOB_STEP4]) {
    const f = path.join(JOBS_DIR, jobId + '.json');
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed.push('jobs/' + jobId); }
  }
  const removedFiles = removePlaceholders();
  const restored = restoreBackup();
  console.log('[teardown] 제거: %d개 세션/job, %d개 placeholder', removed.length, removedFiles.length);
  console.log('[teardown] to-figma 복원: %d개', restored.length);
  if (restored.length) console.log('           %s', restored.join(', '));
}

const cmd = (process.argv[2] || '').trim();
const COMMANDS = {
  setup: cmdSetup,
  'mark-done': cmdMarkDone,
  'mark-running': cmdMarkRunning,
  'refresh-ts': cmdRefreshTs,
  teardown: cmdTeardown
};

if (!COMMANDS[cmd]) {
  console.log('사용: node scripts/kds-demo-seed.js <setup|mark-done|mark-running|refresh-ts|teardown>');
  console.log();
  console.log('  setup        - 데모 자산 일괄 생성 (sessions 3 + jobs 2 + to-figma 16)');
  console.log('  mark-done    - step4 job 을 done 으로 patch (4컷 ✓ 카드 트리거)');
  console.log('  mark-running - step4 job 을 다시 running 으로 복귀 (재캡처용)');
  console.log('  refresh-ts   - elapsed 표시 9초 / 154분 29초 재설정');
  console.log('  teardown     - 모든 데모 자산 제거 + 백업 복원');
  process.exit(cmd ? 1 : 0);
}

COMMANDS[cmd]();
