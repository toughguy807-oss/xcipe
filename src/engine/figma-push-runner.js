// figma-push-runner — claude CLI subprocess 로 /figma-push 슬래시 명령 실행
//   claude-code-provider 는 --disable-slash-commands 로 슬래시 차단 상태라 별도 실행 경로 필요.
//   여기는 슬래시 활성 모드로 호출 → captureId / figmaendpoint / outputMode 추출.
//
// 입력: { htmlPath, page='', mode='single' }
// 출력: { ok, captureId, figmaendpoint, chromeUrl, raw }
//   chromeUrl = `file://...?#figmacapture=<id>&figmaendpoint=<encoded>&figmadelay=4000`
//   클라이언트가 window.open(chromeUrl) 로 새 탭 열면 Chrome 캡처 + Figma 데스크탑 핸드셰이크

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// claude CLI 실행 — 슬래시 활성, mcp__figma__generate_figma_design 허용
function _execClaude(prompt, { timeout = 120000, command = 'claude' } = {}) {
  return new Promise((resolve) => {
    const tmp = path.join(os.tmpdir(), `figmapush-${crypto.randomBytes(6).toString('hex')}.txt`);
    fs.writeFileSync(tmp, prompt, 'utf8');
    // 슬래시 명령 활성 (--disable-slash-commands 빼고), mcp__figma__generate_figma_design 만 허용
    const flags = '-p --effort high --allowedTools "mcp__figma__generate_figma_design mcp__figma__whoami WebFetch Read" --exclude-dynamic-system-prompt-sections --output-format json';
    const cmd = process.platform === 'win32' ? `${command} ${flags} < "${tmp}"` : `cat "${tmp}" | ${command} ${flags}`;
    exec(cmd, { timeout, maxBuffer: 50 * 1024 * 1024, windowsHide: true, encoding: 'utf8' }, (err, stdout, stderr) => {
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

// LLM 응답에서 captureId / endpoint 추출 — figma-push-prepare SKILL.md 출력 규격 기반
function _parseCaptureInfo(content) {
  // 1) JSON 블록 우선
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"captureId"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const txt = jsonMatch[1] || jsonMatch[0];
      const data = JSON.parse(txt.replace(/^.*\{/s, '{').replace(/\}.*$/s, '}'));
      if (data.captureId) return data;
    } catch {}
  }
  // 2) raw 패턴
  const cid = (content.match(/capture[_ ]?id\s*[:=]\s*["']?([\w-]+)["']?/i) || [])[1];
  const ep  = (content.match(/figma\s*endpoint\s*[:=]\s*["']?([^\s"'\n]+)["']?/i) || [])[1]
           || (content.match(/(https:\/\/mcp\.figma\.com\/mcp\/capture\/[\w-]+\/submit)/) || [])[1];
  if (cid) return { captureId: cid, figmaendpoint: ep || null, raw_excerpt: content.slice(0, 500) };
  return null;
}

async function preparePush({ htmlPath, page = '', outputMode = 'newFile' }) {
  if (!htmlPath || !fs.existsSync(htmlPath)) {
    return { ok: false, error: `HTML 파일 없음: ${htmlPath}` };
  }
  const prompt = `다음 HTML 산출물을 Figma 로 push 하기 위해 captureId 를 발급해주세요. 단일 호출.

HTML 경로: ${htmlPath}
출력 모드: ${outputMode}  (newFile / existingFile / clipboard)
Figma 페이지명: ${page || '(자동)'}

수행:
1) \`mcp__figma__generate_figma_design\` 를 1회 호출해 captureId 와 figmaendpoint 를 발급
2) 결과를 JSON 코드 블록으로 반환:
\`\`\`json
{ "captureId": "...", "figmaendpoint": "https://mcp.figma.com/mcp/capture/.../submit", "outputMode": "newFile" }
\`\`\`

도구는 \`mcp__figma__generate_figma_design\` 1회만 사용. Chrome 캡처/폴링은 호출자 영역.`;

  const r = await _execClaude(prompt);
  if (!r.ok) return r;
  const info = _parseCaptureInfo(r.content || '');
  if (!info || !info.captureId) {
    return { ok: false, error: 'captureId 추출 실패', raw: (r.content || '').slice(0, 500) };
  }
  // chrome 캡처 URL — figma-export.md F4 패턴
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const ep = info.figmaendpoint || `https://mcp.figma.com/mcp/capture/${info.captureId}/submit`;
  const chromeUrl = `${fileUrl}#figmacapture=${encodeURIComponent(info.captureId)}&figmaendpoint=${encodeURIComponent(ep)}&figmadelay=4000`;
  return {
    ok: true,
    captureId: info.captureId,
    figmaendpoint: ep,
    chromeUrl,
    htmlPath,
    outputMode
  };
}

module.exports = { preparePush };
