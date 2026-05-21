#!/usr/bin/env node
/**
 * check-reference-coverage.js
 *
 * design-bench-scrape 산출물(레퍼런스 사이트 코드 분석)과
 * publish 산출물(CSS/HTML/JS)을 대조하여 "기술 복제율"을 측정.
 *
 * Usage:
 *   node check-reference-coverage.js \
 *     --bench output/design/bench-scrape/{site}.json \
 *     --publish output/publish/ \
 *     [--out report.json]
 *
 * 측정 카테고리:
 *   1. modernCss   — :has, container query, subgrid, color-mix, @layer 등
 *   2. layout      — bento grid, asymmetric, scroll-snap, aspect-ratio
 *   3. motion      — Lenis, GSAP, ScrollTrigger, Motion One
 *   4. fontStack   — Pretendard, Geist, Cabinet Grotesk, Satoshi 등
 *
 * 판정 (bench 존재 시):
 *   - 복제율 ≥ 50% = PASS
 *   - 30~49%      = WARN (참조 사이트 미충분 반영)
 *   - < 30%       = FAIL (벤치마킹 무시)
 *
 * 판정 (bench 부재 시 — publish 자체 다양성):
 *   - 모던 기법 ≥ 5종 = PASS
 *   - < 5종         = WARN
 */

const fs = require('node:fs');
const path = require('node:path');

const PATTERNS = {
  modernCss: [
    { key: 'has', re: /:has\(/g },
    { key: 'containerQuery', re: /@container\b/g },
    { key: 'subgrid', re: /grid-template[^;]+subgrid/g },
    { key: 'colorMix', re: /color-mix\(/g },
    { key: 'cssLayer', re: /@layer\b/g },
    { key: 'cssScope', re: /@scope\b/g },
    { key: 'anchorPos', re: /anchor-name\s*:/g },
    { key: 'scrollDriven', re: /animation-timeline\s*:\s*scroll/g },
    { key: 'viewTransition', re: /view-transition/g },
    { key: 'oklch', re: /oklch\(/g },
  ],
  layout: [
    { key: 'bentoGrid', re: /grid-template-areas/g },
    { key: 'asymmetric', re: /grid-column\s*:\s*[^;]*span/g },
    { key: 'scrollSnap', re: /scroll-snap-type/g },
    { key: 'aspectRatio', re: /aspect-ratio\s*:/g },
    { key: 'clamp', re: /clamp\(/g },
    { key: 'dvh', re: /\bdvh\b/g },
  ],
  motion: [
    { key: 'lenis', re: /(?:Lenis|lenis@|lenis\.min)/g },
    { key: 'gsap', re: /(?:GSAP|gsap@|gsap\.min)/g },
    { key: 'scrollTrigger', re: /ScrollTrigger/g },
    { key: 'motionOne', re: /motion(?:\.dev|one@)/g },
    { key: 'framerMotion', re: /framer-motion/g },
  ],
  fontStack: [
    { key: 'pretendard', re: /Pretendard/gi },
    { key: 'geist', re: /Geist(?!\s*Mono)/gi },
    { key: 'cabinetGrotesk', re: /Cabinet\s*Grotesk/gi },
    { key: 'satoshi', re: /Satoshi/gi },
    { key: 'instrumentSerif', re: /Instrument\s*Serif/gi },
    { key: 'fraunces', re: /Fraunces/gi },
    { key: 'jetBrainsMono', re: /JetBrains\s*Mono/gi },
    { key: 'geistMono', re: /Geist\s*Mono/gi },
  ],
};

function parseArgs() {
  const args = { bench: null, publish: null, out: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--bench') args.bench = argv[++i];
    else if (k === '--publish') args.publish = argv[++i];
    else if (k === '--out') args.out = argv[++i];
  }
  return args;
}

function readAllText(dir) {
  if (!fs.existsSync(dir)) return '';
  const stat = fs.statSync(dir);
  if (stat.isFile()) return fs.readFileSync(dir, 'utf8');
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let st;
      try { st = fs.statSync(p); } catch (e) { continue; }
      if (st.isDirectory()) walk(p);
      else if (/\.(html?|css|js|mjs)$/i.test(name)) files.push(p);
    }
  }
  walk(dir);
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

function countMatches(text, patterns) {
  const result = {};
  let total = patterns.length;
  let matched = 0;
  for (const { key, re } of patterns) {
    re.lastIndex = 0;
    const m = text.match(re);
    const count = m ? m.length : 0;
    result[key] = count;
    if (count > 0) matched += 1;
  }
  return { result, total, matched, ratio: total ? matched / total : 0 };
}

function diff(benchKeys, publishKeys, category) {
  const bm = (benchKeys[category] && benchKeys[category].result) || {};
  const pm = (publishKeys[category] && publishKeys[category].result) || {};
  const benchSet = Object.keys(bm).filter((k) => bm[k] > 0);
  const publishSet = new Set(Object.keys(pm).filter((k) => pm[k] > 0));
  const missing = benchSet.filter((k) => !publishSet.has(k));
  const adopted = benchSet.filter((k) => publishSet.has(k));
  const ratio = benchSet.length ? adopted.length / benchSet.length : 1;
  return { benchTotal: benchSet.length, adopted: adopted.length, missing, ratio };
}

function main() {
  const args = parseArgs();
  if (!args.publish) {
    console.error('Usage: --publish <publishDir> [--bench <bench.json>] [--out <out.json>]');
    process.exit(2);
  }

  const publishText = readAllText(args.publish);
  const publishMeasure = {};
  for (const [cat, patterns] of Object.entries(PATTERNS)) {
    publishMeasure[cat] = countMatches(publishText, patterns);
  }

  let benchMeasure = null;
  let benchSource = 'absent';
  if (args.bench && fs.existsSync(args.bench)) {
    let benchText = '';
    try {
      const data = JSON.parse(fs.readFileSync(args.bench, 'utf8'));
      // bench JSON 구조 다양성 대응: 전체 직렬화하여 패턴 grep
      benchText = JSON.stringify(data);
    } catch (e) {
      benchText = fs.readFileSync(args.bench, 'utf8'); // raw text fallback
    }
    benchMeasure = {};
    for (const [cat, patterns] of Object.entries(PATTERNS)) {
      benchMeasure[cat] = countMatches(benchText, patterns);
    }
    benchSource = args.bench;
  }

  const result = {
    benchSource,
    publishDir: args.publish,
    publish: publishMeasure,
    bench: benchMeasure,
    coverage: {},
    verdict: 'PASS',
    note: '',
  };

  if (benchMeasure) {
    const ratios = [];
    for (const cat of Object.keys(PATTERNS)) {
      const d = diff(benchMeasure, publishMeasure, cat);
      result.coverage[cat] = d;
      if (d.benchTotal > 0) ratios.push(d.ratio);
    }
    const overall = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
    result.coverage.overall = overall;
    if (overall < 0.3) result.verdict = 'FAIL';
    else if (overall < 0.5) result.verdict = 'WARN';
    else result.verdict = 'PASS';
    result.note = `Benchmarked ${ratios.length} categories. Overall coverage ${(overall * 100).toFixed(1)}%`;
  } else {
    let modernUsed = 0;
    for (const cat of Object.keys(PATTERNS)) {
      modernUsed += publishMeasure[cat].matched;
    }
    result.coverage.modernUsed = modernUsed;
    result.coverage.note = 'bench 산출물 부재 — diff 측정 불가, publish 자체 다양성으로 평가';
    if (modernUsed < 5) result.verdict = 'WARN';
    result.note = `bench absent. Modern technique count = ${modernUsed} (target ≥ 5)`;
  }

  const json = JSON.stringify(result, null, 2);
  if (args.out) fs.writeFileSync(args.out, json, 'utf8');
  console.log(json);
  process.exit(result.verdict === 'FAIL' ? 1 : 0);
}

main();
