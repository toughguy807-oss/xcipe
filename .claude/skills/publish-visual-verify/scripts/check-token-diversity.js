#!/usr/bin/env node
/**
 * check-token-diversity.js
 *
 * publish 산출물의 CSS Custom Properties 다양성을 측정.
 * 토큰 종류·양이 임계 미만이면 "디자인 시스템 빈약" 신호로 판정.
 *
 * Usage:
 *   node check-token-diversity.js --css output/publish/css/ [--out report.json]
 *
 * 임계 (기본):
 *   color       >= 8   (primary/secondary/text/bg/surface/border 등)
 *   fontWeight  >= 3   (300/500/700)
 *   fontSize    >= 5   (caption/body/h3/h2/h1)
 *   spacing     >= 5   (xs/sm/md/lg/xl)
 *   radius      >= 3
 *   shadow      >= 3
 *
 * 판정:
 *   - 미달 0종 = PASS
 *   - 1~2종    = WARN
 *   - 3종 이상 = FAIL (디자인 시스템 빈약)
 */

const fs = require('node:fs');
const path = require('node:path');

const THRESHOLDS = {
  color: 8,
  fontWeight: 3,
  fontSize: 5,
  spacing: 5,
  radius: 3,
  shadow: 3,
  motion: 3,
  lineHeight: 3,
  letterSpacing: 3,
  iconSize: 3,
  zIndex: 3,
  breakpoint: 3,
  container: 3,
  fontFamily: 2,
};

function parseArgs() {
  const args = { css: null, out: null, debug: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--css') args.css = argv[++i];
    else if (k === '--out') args.out = argv[++i];
    else if (k === '--debug') args.debug = true;
  }
  return args;
}

function readCss(target) {
  if (!fs.existsSync(target)) return '';
  const stat = fs.statSync(target);
  if (stat.isFile()) return fs.readFileSync(target, 'utf8');
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let st;
      try { st = fs.statSync(p); } catch (e) { continue; }
      if (st.isDirectory()) walk(p);
      else if (/\.css$/i.test(name)) files.push(p);
    }
  }
  walk(target);
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

function extractTokens(css) {
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  const tokens = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    tokens.push({ name: m[1].toLowerCase(), value: m[2].trim() });
  }
  return tokens;
}

function classify(tokens) {
  const buckets = {
    color: new Set(),
    fontWeight: new Set(),
    fontSize: new Set(),
    spacing: new Set(),
    radius: new Set(),
    shadow: new Set(),
    motion: new Set(),
    lineHeight: new Set(),
    letterSpacing: new Set(),
    iconSize: new Set(),
    zIndex: new Set(),
    breakpoint: new Set(),
    container: new Set(),
    fontFamily: new Set(),
    other: new Set(),
  };
  for (const { name } of tokens) {
    if (/--icon-/.test(name)) buckets.iconSize.add(name);
    else if (/(--z-|z-index)/.test(name)) buckets.zIndex.add(name);
    else if (/(--bp-|breakpoint)/.test(name)) buckets.breakpoint.add(name);
    else if (/(--container-(narrow|default|wide|ultra|max)|--grid-columns)/.test(name)) buckets.container.add(name);
    else if (/(--duration-|--ease-|--transition-)/.test(name)) buckets.motion.add(name);
    else if (/(--ls-|letter-spacing|tracking)/.test(name)) buckets.letterSpacing.add(name);
    else if (/(--lh-|line-height)/.test(name)) buckets.lineHeight.add(name);
    else if (/(--font-(sans|mono|display|serif)|--font-family)/.test(name)) buckets.fontFamily.add(name);
    else if (/(weight|--fw\b)/.test(name)) buckets.fontWeight.add(name);
    else if (/(font-size|text-size|--fs\b|size-text|--text-(display|h\d|body|caption|micro|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl)|--type-|--heading-|--font-(size|scale))/.test(name)) buckets.fontSize.add(name);
    else if (/(color|--bg-|background|surface|fill|border|stroke|brand|accent|--text-(primary|secondary|tertiary|muted|inverse|disabled)|--c-|--clr-|--blue-|--cyan-|--gray-|--navy-|--red-|--green-|--yellow-|--primary\b|--secondary\b|--ghost\b|--accent\b|--(error|success|warning|info)-(bg|fg|icon|border))/.test(name)) buckets.color.add(name);
    else if (/(spacing|gap|space-|--sp-|--space|--section-py|--container-px|--grid-gap)/.test(name)) buckets.spacing.add(name);
    else if (/(radius|rounded|round-|--r-)/.test(name)) buckets.radius.add(name);
    else if (/(shadow|elevation|depth|--shadow-)/.test(name)) buckets.shadow.add(name);
    else buckets.other.add(name);
  }
  const sizes = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.size]));
  sizes._otherList = Array.from(buckets.other).sort();
  return sizes;
}

function main() {
  const args = parseArgs();
  if (!args.css) {
    console.error('Usage: --css <cssDir or file> [--out <out.json>]');
    process.exit(2);
  }
  const css = readCss(args.css);
  const tokens = extractTokens(css);
  const counts = classify(tokens);
  const otherList = counts._otherList || [];
  delete counts._otherList;
  const verdicts = {};
  for (const k of Object.keys(THRESHOLDS)) {
    verdicts[k] = counts[k] >= THRESHOLDS[k] ? 'PASS' : 'WARN';
  }
  const failCount = Object.values(verdicts).filter((v) => v === 'WARN').length;
  const overall = failCount === 0 ? 'PASS' : failCount >= 3 ? 'FAIL' : 'WARN';
  const result = {
    cssPath: args.css,
    tokenCount: tokens.length,
    counts,
    thresholds: THRESHOLDS,
    verdicts,
    overall,
    note: overall === 'FAIL'
      ? '3종 이상 토큰 카테고리가 임계 미달. 디자인 시스템 빈약 — design-knowledge 재실행 권장'
      : overall === 'WARN'
      ? '일부 토큰 카테고리 임계 미달. 보강 권장'
      : '토큰 다양성 충분',
  };
  if (args.debug) result.otherList = otherList;
  const json = JSON.stringify(result, null, 2);
  if (args.out) fs.writeFileSync(args.out, json, 'utf8');
  console.log(json);
  process.exit(overall === 'FAIL' ? 1 : 0);
}

main();
