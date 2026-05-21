#!/usr/bin/env node
// one-shot 복구 — 과거 코드 버그로 sess.generationJobId 가 덮어쓰기되어 매핑이 끊긴
// 디스크 job 들을 세션의 [READY] requirement 와 매칭해 sess.jobHistory[] 로 재연결.
//
// 매칭 규칙 (엄격 — 오매칭 회피 우선):
//   1. session.messages 안의 [READY] 라인에서 requirement="..." 추출
//   2. job.requirement 와 정확히 동일 문자열인 job 만 후보
//   3. job.created_at 이 session.created_at ~ (last_message.at + 60min 여유) 범위 내
//   4. 같은 jobId 가 이미 sess.jobHistory 에 있으면 skip (중복 push 방지)
//
// 사용법:
//   node scripts/recover-kds-job-history.js          # dry-run (변경 없이 보고만)
//   node scripts/recover-kds-job-history.js --apply  # 디스크 sess 파일 갱신
//
// 매칭 안 되는 케이스 (그대로 둠):
//   - [READY] 메시지가 없는 세션 (작업 트리거 전에 대화만 한 케이스)
//   - 해당 시점에 세션이 없는 고아 job (세션 파일 삭제됨)
//   - requirement 문자열이 정확히 같지 않은 job

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'kds-design-sessions');
const JOBS_DIR     = path.join(__dirname, '..', 'data', 'kds-design-jobs');
const APPLY = process.argv.includes('--apply');
const TIME_TOLERANCE_MS = 60 * 60 * 1000;  // 세션 last_activity 이후 1시간까지는 같은 세션의 job 으로 인정

function loadJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    try { return { _file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }; }
    catch { return null; }
  }).filter(Boolean);
}

const sessions = loadJsonDir(SESSIONS_DIR);
const jobs     = loadJsonDir(JOBS_DIR);

console.log(`세션 ${sessions.length}건, job ${jobs.length}건 로드.`);
console.log(`모드: ${APPLY ? 'APPLY (디스크 쓰기)' : 'DRY-RUN (변경 없음)'}`);
console.log();

let totalAdded = 0;
const report = [];

for (const sess of sessions) {
  if (!Array.isArray(sess.jobHistory)) sess.jobHistory = [];
  if (sess.generationJobId && !sess.jobHistory.find(h => h.jobId === sess.generationJobId)) {
    // 기존 generationJobId 도 jobHistory 에 1건으로 (migrateSessionShape 와 동일 로직)
    sess.jobHistory.unshift({ jobId: sess.generationJobId, startedAt: sess.created_at || Date.now(), source: 'legacy-generationJobId' });
  }
  const existingIds = new Set(sess.jobHistory.map(h => h.jobId));

  const msgs = sess.messages || [];
  const readys = msgs
    .filter(m => m.role === 'assistant' && /\[READY\]/.test(m.content || ''))
    .map(m => {
      const req = (m.content.match(/requirement="([^"]+)"/) || [])[1];
      return req ? { req, at: m.at } : null;
    })
    .filter(Boolean);

  if (!readys.length) continue;

  const sessStart = sess.created_at;
  const lastAt = msgs.length ? msgs[msgs.length - 1].at : sess.created_at;
  const sessEnd = lastAt + TIME_TOLERANCE_MS;

  const sessAdded = [];

  for (const ready of readys) {
    // job.requirement 가 ready.req 와 완전 일치 + 시간 범위 내 + 아직 매핑 안 된 job
    const candidates = jobs.filter(j =>
      (j.requirement || '') === ready.req &&
      j.created_at >= sessStart &&
      j.created_at <= sessEnd &&
      !existingIds.has(j.id)
    );
    for (const j of candidates) {
      sess.jobHistory.push({ jobId: j.id, startedAt: j.created_at, source: 'recovered:requirement-match' });
      existingIds.add(j.id);
      sessAdded.push({ jobId: j.id, status: j.status, req: ready.req.slice(0, 60) });
      totalAdded++;
    }
  }

  if (sessAdded.length) {
    sess.jobHistory.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    // generationJobId 도 최신 jobId 로 미러
    sess.generationJobId = sess.jobHistory[sess.jobHistory.length - 1].jobId;
    report.push({ sessId: sess.id, added: sessAdded });

    if (APPLY) {
      const out = path.join(SESSIONS_DIR, sess._file);
      const { _file, ...persist } = sess;
      fs.writeFileSync(out, JSON.stringify(persist, null, 2), 'utf8');
    }
  }
}

console.log(`매핑 추가 ${totalAdded}건 (세션 ${report.length}개 갱신):`);
console.log();
for (const r of report) {
  console.log(`  ${r.sessId}`);
  for (const a of r.added) {
    console.log(`    + ${a.jobId} (${a.status})  ← "${a.req}..."`);
  }
}
console.log();

// 매핑 안 된 고아 job 보고
const allMapped = new Set();
for (const sess of sessions) {
  for (const h of (sess.jobHistory || [])) allMapped.add(h.jobId);
}
const orphaned = jobs.filter(j => !allMapped.has(j.id));
console.log(`매핑 실패 (고아) job ${orphaned.length}건:`);
for (const j of orphaned) {
  const created = new Date(j.created_at).toLocaleString('ko-KR');
  console.log(`  · ${j.id} (${j.status})  ${created}`);
  console.log(`    req: ${(j.requirement || '').slice(0, 80)}`);
}

if (!APPLY) {
  console.log();
  console.log('※ DRY-RUN — 디스크 변경 없음. --apply 옵션으로 실제 적용.');
}
