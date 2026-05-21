#!/usr/bin/env node
/**
 * visual-rubric-eval.js
 *
 * 목적: 캡처된 스크린샷을 Claude Sonnet(vision) 에 전송해 9-Axis 루브릭으로 채점.
 *
 * 배경:
 *   - Opus가 생성한 퍼블리싱 결과를 Opus가 다시 검증하면 편향(Red Flag #1).
 *   - Sonnet 4.6 vision 독립 호출 → 9-Axis 각 축 0~10 + 한 줄 코멘트.
 *   - Phase 1 Grep PASS 이후에만 호출(비용 절감).
 *
 * 환경변수: ANTHROPIC_API_KEY (필수)
 *
 * 사용:
 *   node visual-rubric-eval.js \
 *     --manifest screenshots/manifest.json \
 *     --rubric templates/9-axis-rubric.json \
 *     --out screenshots/rubric-v5.json \
 *     [--model claude-sonnet-4-6] \
 *     [--dry-run]
 *
 * 종료코드: 0 = 평균 ≥7.5, 1 = 평균 <7.5, 2 = 오류
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function parseArgs(argv) {
  const out = { manifest: null, rubric: null, out: null, model: 'claude-sonnet-4-6', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--manifest') out.manifest = v, !argv[i].includes('=') && i++;
    else if (k === '--rubric') out.rubric = v, !argv[i].includes('=') && i++;
    else if (k === '--out') out.out = v, !argv[i].includes('=') && i++;
    else if (k === '--model') out.model = v, !argv[i].includes('=') && i++;
    else if (k === '--dry-run') out.dryRun = true;
  }
  return out;
}

function callClaude({ apiKey, model, system, messages }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      messages,
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (res.statusCode !== 200) return reject(new Error(`API ${res.statusCode}: ${body.slice(0, 500)}`));
          resolve(j);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function extractJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`no JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(m[1]);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.manifest || !args.rubric || !args.out) {
    console.error('USAGE: node visual-rubric-eval.js --manifest <path> --rubric <path> --out <path> [--model ...] [--dry-run]');
    process.exit(2);
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !args.dryRun) {
    console.error('ANTHROPIC_API_KEY 환경변수 필요. --dry-run 옵션으로 프롬프트만 생성 가능.');
    process.exit(2);
  }

  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf-8'));
  const rubric = JSON.parse(fs.readFileSync(args.rubric, 'utf-8'));
  const manifestDir = path.dirname(path.resolve(args.manifest));

  const rubricText = rubric.axes.map((a, i) =>
    `${i + 1}. ${a.name} — ${a.description}\n   0점: ${a.scale[0]}\n   5점: ${a.scale[5]}\n   10점: ${a.scale[10]}`
  ).join('\n\n');

  const system = [
    'You are a senior frontend design reviewer evaluating web UI screenshots on a 9-axis rubric.',
    'You have strong taste calibrated on Anthropic design system, Linear, Vercel, Stripe, Aesop.',
    'Be strict. Do not inflate scores. If you see placeholder copy, generic marketing speak, #6366F1 purple, Inter font, or 3-col card grids, score low.',
    'Return JSON only.',
  ].join('\n');

  const out = { model: args.model, captured_at: new Date().toISOString(), evaluations: [] };

  // fold 캡처만 대상 (fullPage는 크기 과다 + 평가 왜곡)
  const targets = manifest.captures.filter((c) => c.fold && !c.error);

  for (const cap of targets) {
    const imagePath = path.join(manifestDir, cap.fold);
    if (!fs.existsSync(imagePath)) {
      out.evaluations.push({ ...cap, error: 'screenshot not found: ' + imagePath });
      continue;
    }
    const imageB64 = fs.readFileSync(imagePath).toString('base64');

    const userText = [
      `Page: ${cap.page} | Breakpoint: ${cap.breakpoint}px`,
      '',
      'Evaluate the screenshot below on this 9-axis rubric. For each axis return:',
      '  - score: integer 0-10',
      '  - comment: one concise sentence (≤25 words)',
      '',
      'Rubric:',
      rubricText,
      '',
      'Return strict JSON only:',
      '```json',
      '{',
      '  "scores": {',
      '    "typography": { "score": 0, "comment": "" },',
      '    "color": { "score": 0, "comment": "" },',
      '    "layout": { "score": 0, "comment": "" },',
      '    "interactivity": { "score": 0, "comment": "" },',
      '    "content": { "score": 0, "comment": "" },',
      '    "components": { "score": 0, "comment": "" },',
      '    "iconography": { "score": 0, "comment": "" },',
      '    "code_quality": { "score": 0, "comment": "" },',
      '    "strategic_omissions": { "score": 0, "comment": "" }',
      '  },',
      '  "average": 0.0,',
      '  "top_issues": ["...", "...", "..."]',
      '}',
      '```',
    ].join('\n');

    if (args.dryRun) {
      out.evaluations.push({ ...cap, prompt_preview: userText.slice(0, 500), dryRun: true });
      continue;
    }

    try {
      const resp = await callClaude({
        apiKey,
        model: args.model,
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
            { type: 'text', text: userText },
          ],
        }],
      });
      const text = (resp.content && resp.content[0] && resp.content[0].text) || '';
      const parsed = extractJson(text);
      out.evaluations.push({ ...cap, rubric: parsed, usage: resp.usage });
      console.error(`✓ ${cap.page} ${cap.breakpoint}px — avg ${parsed.average || 'n/a'}`);
    } catch (e) {
      out.evaluations.push({ ...cap, error: e.message });
      console.error(`✗ ${cap.page} ${cap.breakpoint}px — ${e.message}`);
    }
  }

  const validScores = out.evaluations
    .filter((e) => e.rubric && typeof e.rubric.average === 'number')
    .map((e) => e.rubric.average);
  const overall = validScores.length
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
    : null;
  out.overall_average = overall;
  out.verdict = overall === null ? 'UNKNOWN' : (overall >= 7.5 ? 'PASS' : (overall >= 6.0 ? 'CONDITIONAL' : 'FAIL'));

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    model: args.model,
    evaluated: validScores.length,
    failed: out.evaluations.length - validScores.length,
    overall_average: overall,
    verdict: out.verdict,
    output: args.out,
  }, null, 2));
  process.exit(out.verdict === 'PASS' ? 0 : (out.verdict === 'UNKNOWN' ? 2 : 1));
}

main().catch((e) => { console.error(e); process.exit(2); });
