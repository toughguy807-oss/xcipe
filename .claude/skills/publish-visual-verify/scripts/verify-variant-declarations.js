#!/usr/bin/env node
/**
 * verify-variant-declarations.js
 *
 * 목적: component-manifest.json에 선언된 BEM variant가 CSS에 실제로
 *       "베이스 선언"(.block--variant { ... }) 되어 있는지 검증.
 *
 * 배경: 실측 사고 케이스 — HTML에 BEM variant 86건이 붙어있었으나
 *       CSS 직접 선언은 0건이었다. 자식 요소 스타일만 있고 variant 자체는
 *       display:block 기본값으로 렌더링되어 이전 회차와 시각 동일.
 *
 * 사용:
 *   node verify-variant-declarations.js \
 *     --manifest output/.../publish/component-manifest.json \
 *     --css output/.../publish/css/ \
 *     --threshold 0.86
 *
 * 종료코드: 0 = PASS (≥threshold), 1 = FAIL (<threshold), 2 = 오류
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { manifest: null, css: null, threshold: 0.86 };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].includes('=') ? argv[i].split('=') : [argv[i], argv[i + 1]];
    if (k === '--manifest') out.manifest = v, !argv[i].includes('=') && i++;
    else if (k === '--css') out.css = v, !argv[i].includes('=') && i++;
    else if (k === '--threshold') out.threshold = parseFloat(v), !argv[i].includes('=') && i++;
  }
  return out;
}

function collectCssFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectCssFiles(p));
    else if (entry.isFile() && /\.css$/.test(entry.name)) results.push(p);
  }
  return results;
}

function extractManifestVariants(manifestPath) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const variants = new Set();

  // 1) 직접 'block--variant' 문자열이 박혀있는 경우 (일반형)
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'variant' && typeof v === 'string' && v.includes('--')) variants.add(v);
      if (k === 'class' && typeof v === 'string') v.split(/\s+/).filter((c) => c.includes('--')).forEach((c) => variants.add(c));
      if (typeof v === 'object') walk(v);
    }
  };
  walk(raw);

  // 2) { name: "Hero", variants: ["asymmetric-split", ...] } 패턴 자동 조합
  const components = raw.components;
  if (components) {
    const list = Array.isArray(components) ? components : Object.values(components);
    for (const c of list) {
      if (!c || typeof c !== 'object') continue;
      const block = typeof c.name === 'string' ? c.name.toLowerCase().replace(/\s+/g, '-') : null;
      if (!block) continue;
      if (Array.isArray(c.variants)) {
        c.variants.forEach((suffix) => {
          if (typeof suffix !== 'string') return;
          if (suffix.includes('--')) { variants.add(suffix); return; }
          variants.add(`${block}--${suffix}`);
          // 일부 프로젝트는 section 래퍼를 쓰므로 section 변형도 병기
          variants.add(`section--${suffix}`);
        });
      }
    }
  }

  return [...variants];
}

function extractDeclaredSelectors(cssContent) {
  // `.block--variant` 단독 선언 + 조합 선언 모두 포함 (시작부에 존재)
  const declared = new Set();
  const re = /(?:^|[\s,}])\.([a-z][a-z0-9_-]*--[a-z0-9_-]+)(?=\s*[{,.:\s>+~\[])/gmi;
  let m;
  while ((m = re.exec(cssContent)) !== null) declared.add(m[1]);
  return declared;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.manifest || !args.css) {
    console.error('USAGE: node verify-variant-declarations.js --manifest <path> --css <dir> [--threshold 0.86]');
    process.exit(2);
  }
  if (!fs.existsSync(args.manifest)) {
    console.error(`manifest not found: ${args.manifest}`);
    process.exit(2);
  }

  const cssFiles = collectCssFiles(args.css);
  if (cssFiles.length === 0) {
    console.error(`no CSS files in: ${args.css}`);
    process.exit(2);
  }

  const manifestVariants = extractManifestVariants(args.manifest);
  if (manifestVariants.length === 0) {
    console.error('manifest에서 variant 0건 추출. manifest 형식 확인 필요.');
    process.exit(2);
  }

  const declared = new Set();
  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const v of extractDeclaredSelectors(content)) declared.add(v);
  }

  const matched = manifestVariants.filter((v) => declared.has(v));
  const missing = manifestVariants.filter((v) => !declared.has(v));
  const ratio = matched.length / manifestVariants.length;
  const pass = ratio >= args.threshold;

  const report = {
    manifest_variants: manifestVariants.length,
    css_declared: declared.size,
    matched: matched.length,
    missing: missing.length,
    ratio: Math.round(ratio * 10000) / 100,
    threshold: Math.round(args.threshold * 10000) / 100,
    verdict: pass ? 'PASS' : 'FAIL',
    missing_sample: missing.slice(0, 20),
    css_files: cssFiles.map((p) => path.basename(p)),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
