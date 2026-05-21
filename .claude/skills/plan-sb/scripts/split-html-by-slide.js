#!/usr/bin/env node
/**
 * split-html-by-slide.js — SB HTML을 슬라이드별 partial HTML로 분리
 *
 * 목적: Figma MCP `generate_figma_design` 호출 시 슬라이드별 별도 frame 생성을 위해
 *       풀 HTML 11회 호출 → 슬라이드별 partial(작은 단위) 11회 호출로 효율화 +
 *       각 슬라이드를 Figma 별도 frame으로 분리.
 *
 * Usage:
 *   node split-html-by-slide.js <input.html> [output-dir]
 *
 * 출력:
 *   {output-dir}/{basename}-slide001.html
 *   {output-dir}/{basename}-slide002.html
 *   ...
 *   {output-dir}/{basename}-manifest.json (인덱스·type·title·size)
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputDir = process.argv[3] || path.dirname(inputPath || '.');

if (!inputPath) {
  console.error('Usage: node split-html-by-slide.js <input.html> [output-dir]');
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const html = fs.readFileSync(inputPath, 'utf8');
const baseName = path.basename(inputPath, '.html');

// 1) <head> 추출 (CSS·meta 공통 적용)
const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
const headContent = headMatch ? headMatch[1] : '';

// 2) <body> 안 .slide 분리 — 깊이 추적으로 div 중첩 안전
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
  console.error('No <body> found in HTML');
  process.exit(1);
}
const body = bodyMatch[1];

const slideStartRe = /<div\s+class="slide(?:\s+[^"]*)?"[^>]*>/g;
const starts = [];
let m;
while ((m = slideStartRe.exec(body)) !== null) {
  starts.push({ idx: m.index });
}

const slides = [];
for (let i = 0; i < starts.length; i++) {
  const startIdx = starts[i].idx;
  const nextIdx = i + 1 < starts.length ? starts[i + 1].idx : body.length;
  let segment = body.slice(startIdx, nextIdx);
  // 깊이 추적으로 정확한 닫는 </div> 위치
  let depth = 0;
  let endIdx = -1;
  const tagRe = /<(\/?)div\b[^>]*>/g;
  let t;
  while ((t = tagRe.exec(segment)) !== null) {
    if (t[1] === '/') {
      depth--;
      if (depth === 0) { endIdx = t.index + t[0].length; break; }
    } else {
      depth++;
    }
  }
  if (endIdx > 0) segment = segment.slice(0, endIdx);
  slides.push(segment);
}

if (slides.length === 0) {
  console.error('No <div class="slide"> found');
  process.exit(1);
}

// 3) 자체완결 partial HTML 생성
fs.mkdirSync(outputDir, { recursive: true });
const manifest = { source: inputPath, total: slides.length, slides: [] };

slides.forEach((slideHtml, i) => {
  const slideNum = String(i + 1).padStart(3, '0');
  const outFile = path.join(outputDir, `${baseName}-slide${slideNum}.html`);
  const typeMatch = slideHtml.match(/data-slide-type="([^"]+)"/);
  const slideType = typeMatch ? typeMatch[1] : 'unknown';
  const titleMatch = slideHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/) ||
                     slideHtml.match(/class="hd-name"[^>]*>([^<]+)</) ||
                     slideHtml.match(/class="cover-title"[^>]*>([^<]+)</);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 50) : `Slide ${i + 1}`;

  const partial = `<!DOCTYPE html>
<html lang="ko">
<head>
${headContent}
</head>
<body>
${slideHtml}
</body>
</html>`;

  fs.writeFileSync(outFile, partial, 'utf8');
  manifest.slides.push({
    index: i + 1,
    file: path.basename(outFile),
    type: slideType,
    title,
    size: partial.length,
  });
  console.log(`[OK] slide${slideNum} (${slideType}, ${partial.length}b): ${title}`);
});

const manifestPath = path.join(outputDir, `${baseName}-manifest.json`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\n[DONE] ${slides.length}개 슬라이드 분리 완료`);
console.log(`  manifest: ${manifestPath}`);
console.log(`  사용: 각 partial을 generate_figma_design에 1회씩 push → 별도 frame 생성`);
