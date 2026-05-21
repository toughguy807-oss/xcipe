#!/usr/bin/env node
/**
 * qa-lighthouse post-process 어댑터
 * Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>
 *
 * targets.json(### FILE 블록)에서 URL 읽어 npx lighthouse 자동 실행.
 * 결과: outputDir/lighthouse/{name}.json + summary.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readTargets(outputDir, artifactPath) {
  const candidates = [
    path.join(outputDir, 'LIGHTHOUSE', 'targets.json'),
    path.join(outputDir, 'lighthouse', 'targets.json'),
    path.join(outputDir, 'targets.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
    }
  }
  // fallback: artifact md에서 ```json 블록
  const content = fs.readFileSync(artifactPath, 'utf8');
  const m = content.match(/```json\s*\n([\s\S]*?targets[\s\S]*?)\n```/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }
  return null;
}

function runLighthouse(url, outputJsonPath) {
  // npx lighthouse <url> --output=json --output-path=... --chrome-flags="--headless --no-sandbox" --quiet
  const cmd = `npx --yes lighthouse "${url}" --output=json --output-path="${outputJsonPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet --only-categories=performance,accessibility,best-practices,seo`;
  console.log(`[qa-lighthouse pp] ${url}`);
  try {
    execSync(cmd, { timeout: 180000, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function summarize(resultPath) {
  try {
    const report = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    const cats = report.categories || {};
    const audits = report.audits || {};
    return {
      performance: cats.performance ? Math.round(cats.performance.score * 100) : null,
      accessibility: cats.accessibility ? Math.round(cats.accessibility.score * 100) : null,
      best_practices: cats['best-practices'] ? Math.round(cats['best-practices'].score * 100) : null,
      seo: cats.seo ? Math.round(cats.seo.score * 100) : null,
      lcp: audits['largest-contentful-paint']?.displayValue || null,
      fcp: audits['first-contentful-paint']?.displayValue || null,
      cls: audits['cumulative-layout-shift']?.displayValue || null,
      tbt: audits['total-blocking-time']?.displayValue || null
    };
  } catch { return null; }
}

async function main() {
  const artifactPath = process.argv[2];
  const outputDir = process.argv[3];
  if (!artifactPath || !outputDir) {
    console.error('Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>');
    process.exit(1);
  }

  const targets = readTargets(outputDir, artifactPath);
  if (!targets || !Array.isArray(targets.targets) || targets.targets.length === 0) {
    console.log('[qa-lighthouse pp] targets.json 미검출 또는 빈 배열. skip.');
    process.exit(0);
  }

  const reportDir = path.join(outputDir, 'lighthouse');
  fs.mkdirSync(reportDir, { recursive: true });

  const summary = [];
  for (const t of targets.targets) {
    if (!t.url) continue;
    const safeName = (t.name || t.url).replace(/[<>:"/\\|?*]/g, '_').slice(0, 40);
    const jsonPath = path.join(reportDir, `${safeName}.json`);
    const r = runLighthouse(t.url, jsonPath);
    if (r.ok) {
      const s = summarize(jsonPath);
      summary.push({ name: t.name, url: t.url, ...(s || {}) });
    } else {
      summary.push({ name: t.name, url: t.url, error: r.error });
    }
  }

  // summary.md 생성
  const lines = [
    '# Lighthouse 측정 요약',
    '',
    '| 대상 | URL | Perf | A11y | BP | SEO | LCP | CLS |',
    '|------|-----|:---:|:---:|:---:|:---:|:---:|:---:|'
  ];
  for (const s of summary) {
    if (s.error) {
      lines.push(`| ${s.name} | ${s.url} | ERROR | — | — | — | ${s.error.slice(0, 40)} | — |`);
    } else {
      lines.push(`| ${s.name} | ${s.url} | ${s.performance ?? '—'} | ${s.accessibility ?? '—'} | ${s.best_practices ?? '—'} | ${s.seo ?? '—'} | ${s.lcp || '—'} | ${s.cls || '—'} |`);
    }
  }
  fs.writeFileSync(path.join(reportDir, 'summary.md'), lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`[qa-lighthouse pp] ${summary.length}개 URL 측정 완료 → lighthouse/summary.md`);
}

main().catch(err => {
  console.error('[qa-lighthouse pp] error:', err.message);
  process.exit(1);
});
