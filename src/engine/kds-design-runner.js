// kds-design-runner — KDS v4 워크플로우(kds-designer 에이전트)를 xcipe 백엔드에서 호출.
//   claude CLI subprocess 를 CWD = KDS v4 폴더로 실행해 KDS .claude/agents/kds-designer.md 가
//   자동 로드되도록 한다. KDS spec-and-bridge.md / traps.md 가이드도 동일 cwd 에서 접근 가능.
//
// 입력: { requirement: string, name?: string, viewports?: string[] }
// 출력: { ok, generated: ['<name>.html', '<name>.figma.json'], raw }
//   KDS to-figma/ 에 직접 저장됨 — chokidar 가 즉시 감지 → KDS /designs 응답에 반영.
//   디자이너가 KDS Design Bridge 플러그인 → 'Claude에서 불러오기' 누르면 import.

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function getKdsRoot() {
  // 우선순위: env > settings > 컨테이너 내 통합 경로 > 레거시 Windows 경로 (로컬 fallback)
  try {
    const { getSetting } = require('../db/settings');
    const s = getSetting && getSetting('kds_v4_root');
    if (s) return s;
  } catch {}
  if (process.env.KDS_V4_ROOT) return process.env.KDS_V4_ROOT;
  // v25: xcipe repo 안에 통합된 경로 우선 (Railway 컨테이너 + 로컬 동일)
  const fs = require('fs');
  const bundledKds = path.resolve(__dirname, '..', '..', 'kds-v4');
  if (fs.existsSync(bundledKds)) return bundledKds;
  // legacy: 사용자 PC 외부 경로 (분리 운영 환경)
  return 'C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/AX_KDS_design system-v4';
}

function _execClaude(prompt, { cwd, timeout = 300000, command = 'claude' } = {}) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `kdsdesign-${crypto.randomBytes(6).toString('hex')}.txt`);
    fs.writeFileSync(tmp, prompt, 'utf8');
    const flags = '-p --effort high --allowedTools "Read Write Edit Glob Grep Bash Skill" --exclude-dynamic-system-prompt-sections --output-format json';
    const cmd = process.platform === 'win32'
      ? `${command} ${flags} < "${tmp}"`
      : `cat "${tmp}" | ${command} ${flags}`;
    exec(cmd, { cwd, timeout, maxBuffer: 50 * 1024 * 1024, windowsHide: true, encoding: 'utf8' },
      (err, stdout, stderr) => {
        try { fs.unlinkSync(tmp); } catch {}
        if (err) return resolve({ ok: false, error: err.killed ? 'timeout' : (stderr || err.message), raw: stdout });
        try {
          const env = JSON.parse(stdout.trim());
          if (env.is_error) return resolve({ ok: false, error: env.result || 'claude returned is_error', raw: stdout });
          return resolve({ ok: true, content: (env.result || '').trim(), raw: stdout });
        } catch {
          return resolve({ ok: true, content: (stdout || '').trim(), raw: stdout });
        }
      });
  });
}

function _slug(s) {
  return String(s || 'screen')
    .toLowerCase().trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'screen';
}

async function generateDesign({ requirement, name, viewports, conversationHistory }) {
  if (!requirement || !String(requirement).trim()) {
    return { ok: false, error: '요구사항(requirement) 입력 필요' };
  }
  const kdsRoot = getKdsRoot();
  if (!fs.existsSync(kdsRoot)) {
    return { ok: false, error: `KDS v4 폴더 없음: ${kdsRoot}` };
  }
  const toFigmaDir = path.join(kdsRoot, 'to-figma');
  if (!fs.existsSync(toFigmaDir)) {
    return { ok: false, error: `KDS to-figma/ 없음: ${toFigmaDir}` };
  }

  const baseName = name ? _slug(name) : _slug(requirement);
  const vps = (Array.isArray(viewports) && viewports.length) ? viewports : ['mobile'];

  // 생성 전 to-figma/ 스냅샷 — 이후 새 파일만 추출
  const beforeFiles = new Set(fs.readdirSync(toFigmaDir));

  // 컴포넌트 카탈로그 — kds/data/components/*.spec.json 18개 요약을 prompt 에 미리 주입.
  // claude 가 매번 Read 하지 않아도 어떤 컴포넌트가 있는지 즉시 파악 가능.
  let componentCatalog = '';
  try {
    const compDir = path.join(kdsRoot, 'kds', 'data', 'components');
    const specs = fs.readdirSync(compDir).filter(f => f.endsWith('.spec.json'));
    const summaries = specs.map(f => {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(compDir, f), 'utf8'));
        return `- ${j.name}: ${(j.description || '').slice(0, 80)}`;
      } catch { return `- ${f.replace('.spec.json', '')}`; }
    });
    componentCatalog = summaries.join('\n');
  } catch {}

  // 채팅 history 를 prompt 에 첨부 — [READY] 단일 줄 requirement 가 압축하지 못하는 디테일 보존.
  //   C 패치: 최근 메시지 N개만 (직전 다른 작업 컨텍스트가 새 작업에 섞이는 부작용 방지).
  let conversationBlock = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length) {
    // [READY] 시그널이 포함된 마지막 어시스턴트 메시지 이후 + 그 직전 사용자 메시지부터 추적.
    // 그래서 새 요청 합의 컨텍스트만 들어가고 옛 작업 흔적은 배제.
    const lastReadyIdx = conversationHistory.findLastIndex(m =>
      m.role === 'assistant' && /\[READY\]/.test(m.content || ''));
    let start = 0;
    if (lastReadyIdx > 0) {
      // [READY] 직전의 사용자 "응 진행해줘" 같은 동의 → 그 이전의 합의 단계까지만 포함.
      // 합의 단계 = 마지막 8개 메시지로 한정.
      start = Math.max(0, lastReadyIdx - 8);
    } else if (conversationHistory.length > 10) {
      start = conversationHistory.length - 10;
    }
    const slice = conversationHistory.slice(start);
    const transcript = slice
      .map(m => (m.role === 'user' ? '사용자' : '어시스턴트') + ': ' + (m.content || ''))
      .join('\n\n');
    conversationBlock = `\n[현재 작업의 합의 사항 — 직전 다른 작업과는 무관]\n${transcript}\n\n  ⚠ 위 합의에 명시된 디테일(시안 변형 수, 특정 컴포넌트, 톤, 제외 사항 등)만 반영. **직전 다른 작업(예: 다른 화면)의 결과 파일을 수정하지 마세요. 이번 작업은 새 화면을 to-figma/ 에 신규 생성**합니다.\n`;
  }

  const prompt = `KDS v4 디자인 시스템으로 화면을 생성합니다. 단순한 "구현"이 아니라 KDS 의 명시적 워크플로우(research → design → review)를 따르세요.

[요구사항 (요약)]
${requirement}
${conversationBlock}

[사용 가능 KDS 컴포넌트 카탈로그]
${componentCatalog || '(컴포넌트 디렉토리 읽기 실패 — kds/data/components/ 직접 조회)'}

[작업 흐름 — 3 Phase 워크플로우 의무]

## Phase 1: RESEARCH (.claude/agents/kds-researcher.md 가이드 적용)
- 요구사항의 도메인/사용 맥락 정리.
- research/brands/ 에 유사 도메인 자료 있으면 참고. 없으면 일반 패턴.
- kds/data/foundations/ (spacing/grid/breakpoint/typography) 및 kds/data/patterns/ 검토.
- 출력: "이번 화면은 X 컴포넌트 + Y 패턴 + Z 토큰 조합. layout 은 ..." 같은 plan 한 단락.

## Phase 2: DESIGN (.claude/agents/kds-designer.md 가이드 적용)
- Phase 1 plan 에 따라 to-figma/<name>-<vp>.html + to-figma/<name>-<vp>.figma.json 페어 생성.
- viewport: ${vps.join(', ')} — 각 viewport 당 1세트.
- 파일명 베이스: ${baseName}-{viewport}
- KDS 토큰만 (kds/tokens/*.json). primitive 색상 직접 박지 마세요.
- figma.json 스키마 엄수 (kds-rules/spec-and-bridge.md): spec.layout **객체**, kdsId unique, TEXT width.
- 함정 회피 (kds-rules/traps.md): #1 Auto Layout + 절대좌표 금지, #8 TEXT width 누락 금지, #18 layout flat key 금지 — 전체 검토.
- 한글 텍스트에 word-break: keep-all; overflow-wrap: break-word 의무.

## Phase 3: REVIEW (.claude/agents/kds-reviewer.md 가이드 적용)
- 생성한 figma.json 직접 점검:
  · 토큰 위반 (primitive 색상 hex 직접 사용) 자동 검출 + 수정
  · kdsId duplicate 검출 + 수정
  · 함정 trap 항목 self-check
- **npm run lint:kds 실행 → 결과 분석 → 위반 시 수정 후 재실행**. 통과까지 반복.

[최종 출력]
생성한 파일 경로 목록만 JSON 으로 보고:
\`\`\`json
{ "generated": ["<name>-<vp>.html", "<name>-<vp>.figma.json", ...] }
\`\`\`
`;

  const r = await _execClaude(prompt, { cwd: kdsRoot, timeout: 7200000 }); // 2시간 — KDS 가이드 100% 준수 + lint 통과까지 재시도 시 필요
  if (!r.ok) {
    // timeout 등 실패해도 to-figma/ 에 부분 결과가 남아있으면 살린다.
    try {
      const afterFiles = fs.readdirSync(toFigmaDir);
      const newFiles = afterFiles.filter(f => !beforeFiles.has(f));
      if (newFiles.length) {
        return { ok: true, generated: newFiles, target: toFigmaDir, partial: true,
                 raw_excerpt: `[부분 완료] ${r.error}` };
      }
    } catch {}
    return { ok: false, error: r.error, raw: (r.raw || '').slice(0, 1000) };
  }

  // 새로 생긴 파일 검출 (claude 보고 파싱 실패 보완)
  const afterFiles = fs.readdirSync(toFigmaDir);
  const newFiles = afterFiles.filter(f => !beforeFiles.has(f));

  // claude 보고 우선
  let reported = [];
  try {
    const m = (r.content || '').match(/```json\s*([\s\S]*?)\s*```/);
    if (m) {
      const data = JSON.parse(m[1]);
      if (Array.isArray(data.generated)) reported = data.generated;
    }
  } catch {}

  const generated = reported.length ? reported : newFiles;
  if (!generated.length) {
    return { ok: false, error: 'claude 실행은 끝났으나 새 파일 생성 안 됨', raw: (r.content || '').slice(0, 1500) };
  }

  // Post-process — KDS scripts 자동 실행 (SVG 라이브러리 치환, 이미지 자동 삽입, lint 결과 캡처).
  // 실패는 본체 결과 손실 없도록 try/catch — postProcessLog 에 누적.
  const postProcessLog = [];
  const tryExec = (label, cmd, timeoutMs = 120000) => {
    try {
      require('child_process').execSync(cmd, { cwd: kdsRoot, timeout: timeoutMs,
        windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      postProcessLog.push({ label, ok: true });
    } catch (e) {
      postProcessLog.push({ label, ok: false, error: (e.stderr || e.stdout || e.message || '').slice(0, 400) });
    }
  };
  tryExec('inject-svg', 'node scripts/inject-svg.mjs');
  tryExec('inject-images', 'node scripts/inject-images.mjs');

  // lint 결과 캡처 — exec 실패해도 stdout/stderr 본문에 위반 목록 포함되므로 분리 처리
  let lintResult = { ok: true, output: '' };
  try {
    const out = require('child_process').execSync('npm run lint:kds', { cwd: kdsRoot, timeout: 180000,
      windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    lintResult = { ok: true, output: (out || '').slice(-2000) };
  } catch (e) {
    lintResult = { ok: false, output: ((e.stdout || '') + '\n' + (e.stderr || '')).slice(-2000) };
  }
  postProcessLog.push({ label: 'lint:kds', ok: lintResult.ok, output: lintResult.output });

  return { ok: true, generated, target: toFigmaDir,
           raw_excerpt: (r.content || '').slice(0, 800),
           postProcess: postProcessLog };
}

module.exports = { generateDesign, getKdsRoot };
