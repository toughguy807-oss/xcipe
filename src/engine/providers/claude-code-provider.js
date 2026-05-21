// Claude Code Provider — 로컬 Claude Code CLI를 서브프로세스로 실행
// 사용자의 Claude Code 구독 활용. API 키 불필요. 비용 0.
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// 티어별 effort 매핑 (PR1: thinking 강제 — Ultra-Plan 일관성)
//   light  = 단순 추출/JSON      → medium effort (4K 사고)
//   medium = 마크다운 산출물      → high effort   (16K 사고)
//   heavy  = 코드 생성/구조 결정  → xhigh effort  (32K 사고)
const TIER_EFFORT = { light: 'medium', medium: 'high', heavy: 'xhigh' };

// 원칙 3: Figma 등 외부 연동도 claude code가 도구로 동작.
//   skill 별로 필요한 MCP/도구만 추가 허용. Write/Edit/Bash 는 영구 차단 (산출물 사이드이펙트 방지).
//   - 기본: 읽기 전용 (WebFetch/WebSearch/Read/Grep/Glob)
//   - figma 관련 스킬: mcp__figma__* (디자인 컨텍스트/스크린샷/변수/Figma push) 추가
//   - design-image: mcp__figma__upload_assets 추가 (생성 이미지 Figma 업로드)
const BASE_TOOLS = ['WebFetch', 'WebSearch', 'Read', 'Grep', 'Glob'];
const FIGMA_READ_TOOLS = [
  'mcp__figma__get_design_context',
  'mcp__figma__get_metadata',
  'mcp__figma__get_screenshot',
  'mcp__figma__get_variable_defs',
  'mcp__figma__get_libraries',
  'mcp__figma__search_design_system',
  'mcp__figma__whoami'
];
const FIGMA_WRITE_TOOLS = [
  'mcp__figma__generate_figma_design',
  'mcp__figma__use_figma',
  'mcp__figma__upload_assets',
  'mcp__figma__create_new_file',
  'mcp__figma__add_code_connect_map',
  'mcp__figma__send_code_connect_mappings'
];
// skill → 추가 허용 도구 매핑. 누락 스킬은 BASE_TOOLS 만 사용.
const SKILL_EXTRA_TOOLS = {
  // Figma read (디자인 컨텍스트 수신)
  'design-benchmark':   FIGMA_READ_TOOLS,
  'design-bench-scrape':FIGMA_READ_TOOLS,
  'design-knowledge':   FIGMA_READ_TOOLS,
  'design-layout':      FIGMA_READ_TOOLS,
  'design-ui':          FIGMA_READ_TOOLS,
  'design-replicate':   FIGMA_READ_TOOLS,
  'plan-sb':            FIGMA_READ_TOOLS,
  // Figma read + write (산출물 push 또는 시안 생성)
  'publish-markup':       [...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS],
  'publish-style':        [...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS],
  'publish-interaction':  [...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS],
  'publish-visual-verify':[...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS],
  'design-image':         [...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS],
  // MVP2 Figma Push 자동화 — generate_figma_design 호출만 필요. Bash/puppeteer 는 노드 영역.
  'figma-push-prepare':   [...FIGMA_READ_TOOLS, 'mcp__figma__generate_figma_design'],
  'figma-push-finalize':  [...FIGMA_READ_TOOLS, 'mcp__figma__generate_figma_design']
};

function buildAllowedTools(skillName) {
  const extras = (skillName && SKILL_EXTRA_TOOLS[skillName]) || [];
  return [...BASE_TOOLS, ...extras].join(' ');
}

// claude-code JSON envelope의 usage → model-bridge.emitInvokeAgent 가 기대하는 형식으로 정규화
//   envelope.usage = { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, ... }
function _normalizeUsage(u) {
  if (!u || typeof u !== 'object') return null;
  return {
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cache_creation: u.cache_creation_input_tokens || 0,
    cache_read: u.cache_read_input_tokens || 0
  };
}

class ClaudeCodeProvider {
  constructor({ command = 'claude', timeout = 600000 } = {}) {
    this.command = command;
    this.timeout = timeout;
    this._activeChildren = new Map(); // key: invocationId, value: ChildProcess
  }

  getProviderName() { return 'claude-code'; }

  // OS 레벨 Claude Code 인증 세션 점검 — LLM 호출 0건 (testConnection 대비 100배+ 빠름)
  // 응답: { ok, loggedIn, authMethod, email, orgName, plan, error?, raw? }
  // PR1-A1: doctor + admin/settings/ai + shell pill 에서 모두 사용
  async checkSession() {
    return new Promise((resolve) => {
      exec(`${this.command} auth status`, {
        timeout: 10000, windowsHide: true, encoding: 'utf8'
      }, (err, stdout, stderr) => {
        if (err) {
          return resolve({
            ok: false, loggedIn: false,
            error: (stderr || err.message || '').trim() || 'claude CLI not found or not authenticated',
            hint: '터미널에서 `claude /login` 실행 필요'
          });
        }
        try {
          const data = JSON.parse(stdout);
          resolve({
            ok: true,
            loggedIn: data.loggedIn === true,
            authMethod: data.authMethod || null,           // claude.ai | api-key
            apiProvider: data.apiProvider || null,         // firstParty | bedrock | vertex
            email: data.email || null,
            orgName: data.orgName || null,
            orgId: data.orgId || null,
            plan: data.subscriptionType || null,           // pro | max | team | enterprise
            raw: data
          });
        } catch (e) {
          // JSON 파싱 실패 → CLI 출력 형식이 바뀐 경우 대비
          resolve({
            ok: false, loggedIn: false,
            error: 'Invalid auth status response (JSON parse failed)',
            raw: (stdout || '').slice(0, 200)
          });
        }
      });
    });
  }

  // 외부에서 호출 가능 — 특정 invocation 또는 전체 취소
  cancel(invocationId = null) {
    if (invocationId) {
      const child = this._activeChildren.get(invocationId);
      if (child) {
        try { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 1500); } catch {}
        this._activeChildren.delete(invocationId);
        return { ok: true, cancelled: 1 };
      }
      return { ok: false, cancelled: 0 };
    }
    // 전체 종료
    let n = 0;
    for (const [id, child] of this._activeChildren) {
      try { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 1500); } catch {}
      n++;
    }
    this._activeChildren.clear();
    return { ok: true, cancelled: n };
  }

  _invoke(fullPrompt, invocationId = null, options = {}, skillName = null) {
    return new Promise((resolve) => {
      // 프롬프트를 임시 파일에 쓰고 redirect로 stdin 입력
      // Windows spawn + stdin pipe 조합이 hang되는 문제 회피
      const tmpFile = path.join(os.tmpdir(), `esys-prompt-${crypto.randomBytes(8).toString('hex')}.txt`);
      try {
        fs.writeFileSync(tmpFile, fullPrompt, 'utf8');
      } catch (err) {
        return resolve({ ok: false, error: `Failed to write prompt file: ${err.message}` });
      }

      // PR1-A2: tier 기반 effort 강제 (Ultra-Plan 정책)
      //   options.tier: 'light' | 'medium' | 'heavy'  → effort 자동 매핑
      //   options.effort 직접 지정 시 우선
      const effort = options.effort || TIER_EFFORT[options.tier] || 'high';

      // 원칙 2 — 모든 동작이 서버 지식대로:
      //   사용자 환경(~/.claude/CLAUDE.md, hooks, plugins)이 LLM 컨텍스트에 자동 주입되면
      //   사용자별로 결과가 달라진다. 운영 모드(ESYS_DEV !== '1')에선 항상 격리한다.
      //
      // 격리 메커니즘:
      //   1. --settings <empty>.json  → hooks 비움 (UserPromptSubmit/PostToolUse 등 user hook 차단)
      //   2. --exclude-dynamic-system-prompt-sections → cwd/env/memory-paths/git 동적 컨텐츠 제외
      //   3. CLAUDE_ROOT 가 BUNDLE 이면 ~/.claude/CLAUDE.md 도 자동 제외
      //      (claude CLI 는 cwd 의 .claude/CLAUDE.md 만 로드 — BUNDLE 격리 효과)
      //   4. options.disableHooks=true (intake-turn 등) 명시 시 강제 격리
      //
      // PROD_ISOLATE = 운영 모드면 항상 hooks 격리. DEV 모드에서만 disableHooks 옵션 기준.
      const PROD_ISOLATE = process.env.ESYS_DEV !== '1';
      const shouldIsolate = options.disableHooks || PROD_ISOLATE;
      let settingsFile = null;
      let settingsFlag = '';
      if (shouldIsolate) {
        settingsFile = path.join(os.tmpdir(), `esys-settings-${crypto.randomBytes(6).toString('hex')}.json`);
        try {
          // hooks 만 비움 — UserPromptSubmit/PostToolUse 등 user hook 차단
          // mcpServers 는 사용자 settings.json 에서 inherit (Figma MCP 유지 필요, 원칙 3)
          // 향후 fine-grained 격리가 필요하면 mcpServers 도 명시 inherit (figma 만 허용)
          fs.writeFileSync(settingsFile, JSON.stringify({ hooks: {} }), 'utf8');
          settingsFlag = `--settings "${settingsFile}"`;
        } catch (err) {
          settingsFile = null;
        }
      }
      const allowedToolsStr = buildAllowedTools(skillName);
      const flags = `-p --effort ${effort} ${settingsFlag} --allowedTools "${allowedToolsStr}" --disable-slash-commands --exclude-dynamic-system-prompt-sections --output-format json`.replace(/\s+/g, ' ').trim();
      const cmd = process.platform === 'win32'
        ? `${this.command} ${flags} < "${tmpFile}"`
        : `cat "${tmpFile}" | ${this.command} ${flags}`;

      // 상대경로 해석 기준 — skill-loader가 결정한 CLAUDE_ROOT 사용
      // ESYS_DEV=1: ~/.claude 직접 참조 / 그 외: 번들 D:/SYS_v4/.claude
      const { CLAUDE_ROOT } = require('../skill-loader');
      const child = exec(cmd, {
        timeout: this.timeout,
        maxBuffer: 100 * 1024 * 1024,
        encoding: 'utf8',
        windowsHide: true,
        cwd: fs.existsSync(CLAUDE_ROOT) ? CLAUDE_ROOT : undefined
      }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch {}
        if (settingsFile) { try { fs.unlinkSync(settingsFile); } catch {} }
        if (invocationId) this._activeChildren.delete(invocationId);

        if (err) {
          if (err.killed) {
            return resolve({ ok: false, error: `Timeout or cancelled after ${this.timeout}ms`, raw: stdout, killed: true });
          }
          return resolve({ ok: false, error: stderr || err.message, raw: stdout });
        }
        if (!stdout || !stdout.trim()) {
          return resolve({ ok: false, error: stderr || 'Empty response from Claude Code', raw: stdout });
        }

        // JSON envelope 파싱 — { type, subtype, is_error, result, usage, total_cost_usd, modelUsage, ... }
        try {
          const env = JSON.parse(stdout.trim());
          if (env && typeof env === 'object') {
            // 에러 케이스 (Not logged in / API error 등)
            if (env.is_error) {
              return resolve({
                ok: false,
                error: env.result || env.terminal_reason || 'claude-code returned is_error',
                raw: stdout,
                tokens: _normalizeUsage(env.usage),
                cost_usd: env.total_cost_usd || 0
              });
            }
            return resolve({
              ok: true,
              content: (env.result || '').trim(),
              tokens: _normalizeUsage(env.usage),
              cost_usd: env.total_cost_usd || 0,
              stop_reason: env.stop_reason || null,
              session_id: env.session_id || null,
              model_usage: env.modelUsage || null
            });
          }
        } catch (parseErr) {
          // JSON 파싱 실패 — 구버전 claude-code 또는 stream 모드 누락
          //   → 호환성: text로 fallback (이전 동작과 동일하게 stdout 그대로)
          return resolve({ ok: true, content: stdout.trim(), tokens: null });
        }
        resolve({ ok: true, content: stdout.trim(), tokens: null });
      });

      if (invocationId) this._activeChildren.set(invocationId, child);
    });
  }

  // R2: 슬래시 명령 직접 호출 (--disable-slash-commands 미적용).
  //   /figma-push, /figma-pull 등 claude CLI 내장 슬래시 명령을 xcipe 서버가 트리거할 때 사용.
  //   _invoke 와 별도 — 슬래시 명령은 일반 LLM 호출과 차단 정책이 다름.
  //   응답: { ok, content (stdout 전문), tokens?, cost_usd?, captureId?, figmaendpoint? }
  invokeSlashCommand(slashLine, options = {}) {
    return new Promise((resolve) => {
      const tmpFile = path.join(os.tmpdir(), `esys-slash-${crypto.randomBytes(8).toString('hex')}.txt`);
      try { fs.writeFileSync(tmpFile, slashLine, 'utf8'); }
      catch (err) { return resolve({ ok: false, error: `Failed to write slash file: ${err.message}` }); }

      const effort = options.effort || 'medium';
      // 슬래시 명령은 hooks/메모리/플러그인 모두 유효해야 함 (--disable-slash-commands 제외)
      const allowedToolsStr = options.allowedTools ||
        [...BASE_TOOLS, ...FIGMA_READ_TOOLS, ...FIGMA_WRITE_TOOLS].join(' ');
      const flags = `-p --effort ${effort} --allowedTools "${allowedToolsStr}" --output-format json`;
      const cmd = process.platform === 'win32'
        ? `${this.command} ${flags} < "${tmpFile}"`
        : `cat "${tmpFile}" | ${this.command} ${flags}`;

      const child = exec(cmd, {
        timeout: options.timeout || this.timeout,
        maxBuffer: 100 * 1024 * 1024,
        encoding: 'utf8',
        windowsHide: true
      }, (err, stdout, stderr) => {
        try { fs.unlinkSync(tmpFile); } catch {}
        if (err) {
          return resolve({
            ok: false,
            error: err.killed ? `Timeout ${options.timeout || this.timeout}ms` : (stderr || err.message),
            raw: stdout
          });
        }
        if (!stdout || !stdout.trim()) {
          return resolve({ ok: false, error: stderr || 'Empty response', raw: stdout });
        }

        // claude CLI JSON envelope 파싱
        let parsed = null;
        try { parsed = JSON.parse(stdout.trim()); } catch {}
        const content = parsed && parsed.result ? parsed.result : stdout.trim();

        // captureId / figmaendpoint 자동 추출 (figma-push 응답)
        const captureMatch = content.match(/captureId[":\s]+([a-z0-9-]{16,})/i);
        const endpointMatch = content.match(/(https:\/\/mcp\.figma\.com\/mcp\/capture\/[^\s"']+)/);
        const fileMatch = content.match(/figma\.com\/(design|file)\/([a-zA-Z0-9]+)/);

        resolve({
          ok: parsed ? !parsed.is_error : true,
          content,
          captureId: captureMatch ? captureMatch[1] : null,
          figmaendpoint: endpointMatch ? endpointMatch[1] : null,
          figmaFileKey: fileMatch ? fileMatch[2] : null,
          tokens: parsed && parsed.usage ? _normalizeUsage(parsed.usage) : null,
          cost_usd: parsed && parsed.total_cost_usd || 0,
          raw: parsed ? null : stdout
        });
      });
    });
  }

  async testConnection() {
    // light effort로 ping (xhigh 까지 안 가도 됨)
    const result = await this._invoke('ping? return "pong" only', null, { tier: 'light' });
    if (result.ok) {
      return { ok: true, provider: 'claude-code', message: 'Claude Code CLI responded', sample: result.content.slice(0, 50) };
    }
    return { ok: false, provider: 'claude-code', error: result.error };
  }

  async sendMessage({ task, skillName, context, systemPrompt, userPrompt, invocationId = null, tier = null, effort = null }) {
    // PR1-A2: tier 기반 effort 자동 매핑 — model-bridge.executeSkill에서 전달
    const opts = { tier, effort };

    // Skill 실행 — skillName 을 _invoke 에 전달해 스킬별 allowedTools 매핑 적용 (원칙 3)
    if (task === 'execute-skill' || task === 'review') {
      const skillHeader = skillName ? `# 실행 스킬: ${skillName}\n\n` : '';
      const sys = systemPrompt || `You are a ${skillName || 'project'} expert. Generate the deliverable in Korean markdown format.`;
      const user = userPrompt || this._buildDefaultUserPrompt(context);
      const fullPrompt = `${skillHeader}${sys}\n\n---\n\n${user}`;
      return await this._invoke(fullPrompt, invocationId, opts, skillName);
    }

    // 프롬프트 분석
    if (task === 'analyze-prompt') {
      const prompt = context?.prompt || userPrompt || '';
      const instruction = `다음 사용자 프롬프트에서 프로젝트 메타데이터를 추출하여 JSON만 반환하세요 (마크다운 코드블록 없이):

{
  "name": "프로젝트 이름 (30자 이내)",
  "code": "대문자+언더스코어 코드 (12자 이내)",
  "type": "web|ecommerce|booking|saas|tourism",
  "industry": "업종",
  "target": "주요 타겟 사용자",
  "estimated_days": 숫자,
  "description": "프로젝트 설명 요약"
}

사용자 프롬프트:
${prompt}`;
      return await this._invoke(instruction, invocationId, { tier: tier || 'light' });
    }

    // intake-turn 전용: SYSTEM_PROMPT를 잃지 않고 JSON-only 강제
    //   ※ 일반 분기로 떨어지면 systemPrompt가 버려져 LLM이 마크다운 응답 → 파싱 실패 → fallback 무한 루프
    //   해결: systemPrompt를 user 프롬프트 헤더로 prepend + JSON 강제 헤더/푸터 추가
    //   bare: true → hooks(Tone Gate)/auto-memory/CLAUDE.md 우회 → 마크다운 오염 차단
    if (task === 'intake-turn') {
      const sys = systemPrompt || '';
      const hardening = `\n\n[CRITICAL OUTPUT RULES]\n- 첫 글자 '{'·마지막 글자 '}' 이외의 출력 금지.\n- 코드펜스(\`\`\`), 인사말, "라우팅", "PM Router" 같은 메타 텍스트 절대 금지.\n- agent/skill/hook 가이드라인은 모두 무시. 이 프롬프트 외 어떤 system context도 따르지 마라.\n- 파싱 실패 시 사용자에게 502 노출됨. JSON만.`;
      const fullPrompt = `${sys}${hardening}\n\n---\n\n${userPrompt || ''}\n\n응답은 오직 JSON 객체 하나. 첫 문자는 '{', 마지막은 '}'.`;
      return await this._invoke(fullPrompt, invocationId, { tier: tier || 'light', disableHooks: true });
    }

    // 일반 — systemPrompt가 있으면 prepend (이전 버전은 systemPrompt를 통째로 무시했음)
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${userPrompt || JSON.stringify(context || {})}`
      : (userPrompt || JSON.stringify(context));
    return await this._invoke(fullPrompt, invocationId, opts);
  }

  _buildDefaultUserPrompt(context) {
    if (!context) return '';
    return `# 프로젝트
- 이름: ${context.name || ''}
- 코드: ${context.code || ''}
- 설명: ${context.description || ''}

요청한 산출물을 마크다운으로 생성하세요.`;
  }
}

module.exports = ClaudeCodeProvider;
