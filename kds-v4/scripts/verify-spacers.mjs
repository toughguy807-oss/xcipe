#!/usr/bin/env node
// Spacer FRAME ↔ HTML CSS margin 매칭 검증 스크립트
//
// 동작:
//   1) to-figma/<name>.figma.json 에서 Spacer FRAME 추출
//      (kdsId 가 "spacer-" 시작 또는 name 이 "Spacer N" 패턴)
//   2) 각 Spacer 의 형제(prev/next) kdsId 로 HTML 의 class 조회
//   3) HTML <style> 블록에서 해당 class 의 margin-top/bottom 값 파싱
//   4) Spacer height 와 margin 값이 일치하는지 검증
//   5) 누락/불일치 시 콘솔에 보고 (exit code 1)
//
// 실행:
//   node scripts/verify-spacers.mjs [target | --all]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TO_FIGMA = path.join(ROOT, 'to-figma');

/* ───── figma.json 에서 Spacer 추출 ───── */

function isSpacerNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.kdsId === 'string' && node.kdsId.startsWith('spacer-')) return true;
  if (typeof node.name === 'string' && /^Spacer\s+\d+$/.test(node.name)) return true;
  return false;
}

function findSpacers(figmaJson) {
  const spacers = []; // { kdsId, height, prevKdsId, nextKdsId, parentKdsId }

  function visitChildren(children, parentKdsId) {
    if (!Array.isArray(children)) return;
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (isSpacerNode(node)) {
        const prev = children[i - 1];
        const next = children[i + 1];
        spacers.push({
          kdsId: node.kdsId || node.name,
          height: typeof node.height === 'number' ? node.height : null,
          prevKdsId: prev && prev.kdsId ? prev.kdsId : null,
          nextKdsId: next && next.kdsId ? next.kdsId : null,
          parentKdsId,
        });
      }
      // 재귀
      if (Array.isArray(node && node.children)) {
        visitChildren(node.children, node.kdsId);
      }
    }
  }

  // root 또는 screens[]
  if (figmaJson.root) {
    visitChildren(figmaJson.root.children, figmaJson.root.kdsId);
  }
  if (Array.isArray(figmaJson.screens)) {
    for (const screen of figmaJson.screens) {
      visitChildren(screen.children, screen.kdsId);
    }
  }
  return spacers;
}

/* ───── HTML 에서 kdsId → class 매핑 ───── */

function findClassesForKdsId(html, kdsId) {
  // 정규식 escape
  const esc = kdsId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 태그 안에서 data-kds-id="kdsId" 와 같은 태그의 class 속성 추출
  // class 가 data-kds-id 앞에 올 수도, 뒤에 올 수도 있음 → 양방향 매치
  const re = new RegExp(
    `<[a-zA-Z][a-zA-Z0-9-]*\\b[^>]*?data-kds-id\\s*=\\s*["']${esc}["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  if (!m) return [];
  const tag = m[0];
  const classMatch = tag.match(/\bclass\s*=\s*["']([^"']+)["']/);
  if (!classMatch) return [];
  return classMatch[1].trim().split(/\s+/);
}

/* ───── HTML <style> 에서 CSS 추출 ───── */

function extractCss(html) {
  const m = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return m ? m[1] : '';
}

// 같은 클래스에 대한 모든 룰 본문을 합쳐서 반환 (cascade 순서대로)
// 주의: `\b` 는 `-` 를 word boundary 로 인식해서 `.foo` 가 `.foo-bar` 까지 매치돼버림.
// 클래스명 끝을 알파벳/숫자/언더스코어/하이픈 이 아닌 문자(스페이스, `:`, `,`, `.`, `+`, `>`, `{` 등) 로 강제.
function getRuleBodiesForClass(css, className) {
  const esc = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`([^{}]*\\.${esc}(?![a-zA-Z0-9_-])[^{}]*)\\{([^{}]*)\\}`, 'g');
  const bodies = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    bodies.push({ selector: m[1].trim(), body: m[2] });
  }
  return bodies;
}

// margin shorthand + longhand 파싱
// 반환: { top, right, bottom, left } in px (number) 또는 undefined
function parseMargins(ruleBody) {
  const result = { top: undefined, right: undefined, bottom: undefined, left: undefined };
  if (!ruleBody) return result;

  // shorthand: margin: <values>;
  const shortRe = /(?:^|[;\n{])\s*margin\s*:\s*([^;]+?)\s*(?:;|$)/g;
  let sm;
  while ((sm = shortRe.exec(ruleBody)) !== null) {
    const parts = sm[1].split(/\s+/).map(p => {
      const num = parseFloat(p);
      return isNaN(num) ? 0 : num;
    });
    if (parts.length === 1) {
      result.top = result.right = result.bottom = result.left = parts[0];
    } else if (parts.length === 2) {
      result.top = result.bottom = parts[0];
      result.right = result.left = parts[1];
    } else if (parts.length === 3) {
      result.top = parts[0];
      result.right = result.left = parts[1];
      result.bottom = parts[2];
    } else if (parts.length === 4) {
      [result.top, result.right, result.bottom, result.left] = parts;
    }
  }

  // longhand 가 shorthand 뒤에 있으면 덮어쓰기 (cascade 순서)
  const topM = /(?:^|[;\n{])\s*margin-top\s*:\s*(-?[\d.]+)\s*px?\s*;?/i.exec(ruleBody);
  if (topM) result.top = parseFloat(topM[1]);
  const bottomM = /(?:^|[;\n{])\s*margin-bottom\s*:\s*(-?[\d.]+)\s*px?\s*;?/i.exec(ruleBody);
  if (bottomM) result.bottom = parseFloat(bottomM[1]);
  const rightM = /(?:^|[;\n{])\s*margin-right\s*:\s*(-?[\d.]+)\s*px?\s*;?/i.exec(ruleBody);
  if (rightM) result.right = parseFloat(rightM[1]);
  const leftM = /(?:^|[;\n{])\s*margin-left\s*:\s*(-?[\d.]+)\s*px?\s*;?/i.exec(ruleBody);
  if (leftM) result.left = parseFloat(leftM[1]);

  return result;
}

// kdsId 의 cascade 결과 margin (모든 매치 룰 합산 후 마지막 값 우선)
function getEffectiveMargin(html, css, kdsId) {
  const classes = findClassesForKdsId(html, kdsId);
  if (classes.length === 0) {
    return { found: false, margin: null, classes: [] };
  }
  // 첫 클래스 기준 (보통 메인 클래스)
  const primary = classes[0];
  const bodies = getRuleBodiesForClass(css, primary);
  // 마지막에 정의된 룰의 margin 이 cascade 우선
  let margin = { top: undefined, right: undefined, bottom: undefined, left: undefined };
  for (const { body } of bodies) {
    const m = parseMargins(body);
    for (const k of ['top', 'right', 'bottom', 'left']) {
      if (m[k] !== undefined) margin[k] = m[k];
    }
  }
  return { found: bodies.length > 0, margin, classes, primary };
}

// figma.json 트리에서 kdsId 로 노드 찾기
function findNodeByKdsId(figmaJson, targetKdsId) {
  function walk(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.kdsId === targetKdsId) return node;
    if (Array.isArray(node.children)) {
      for (const c of node.children) {
        const r = walk(c);
        if (r) return r;
      }
    }
    if (Array.isArray(node.screens)) {
      for (const s of node.screens) {
        const r = walk(s);
        if (r) return r;
      }
    }
    if (node.root) return walk(node.root);
    return null;
  }
  return walk(figmaJson);
}

// kdsId 가 HTML 에 없으면 wrapper FRAME 으로 간주 — 첫 자식으로 재귀해서 실제 시각 요소 찾기
function getEffectiveMarginRecursive(html, css, kdsId, figmaJson, depth = 0) {
  if (depth > 3) return { found: false, margin: null, classes: [], wrapperChain: [] };
  const direct = getEffectiveMargin(html, css, kdsId);
  if (direct.found) {
    return { ...direct, wrapperChain: [] };
  }
  // HTML 에 클래스 매핑 없음 → figma.json 의 자식으로 한 단계 들어감
  const node = findNodeByKdsId(figmaJson, kdsId);
  if (node && Array.isArray(node.children) && node.children.length > 0) {
    for (const child of node.children) {
      if (child.kdsId) {
        const r = getEffectiveMarginRecursive(html, css, child.kdsId, figmaJson, depth + 1);
        if (r.found) {
          return { ...r, wrapperChain: [kdsId, ...r.wrapperChain] };
        }
      }
    }
  }
  return { found: false, margin: null, classes: [], wrapperChain: [kdsId] };
}

/* ───── 검증 ───── */

function verifyOne(htmlPath, jsonPath, baseName) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const figmaJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const css = extractCss(html);

  const spacers = findSpacers(figmaJson);
  const issues = [];
  const checks = [];

  for (const sp of spacers) {
    const expected = sp.height;
    if (typeof expected !== 'number' || expected <= 0) continue;

    // prev sibling 의 margin-bottom + next sibling 의 margin-top = spacer height 면 통과
    let prevBottom = 0, nextTop = 0;
    let prevFound = false, nextFound = false;
    let prevInfo = null, nextInfo = null;

    if (sp.prevKdsId) {
      const eff = getEffectiveMarginRecursive(html, css, sp.prevKdsId, figmaJson);
      if (eff.found) {
        prevFound = true;
        prevBottom = (eff.margin && typeof eff.margin.bottom === 'number') ? eff.margin.bottom : 0;
        prevInfo = { kdsId: sp.prevKdsId, resolvedClass: eff.primary, wrapperChain: eff.wrapperChain };
      }
    }
    if (sp.nextKdsId) {
      const eff = getEffectiveMarginRecursive(html, css, sp.nextKdsId, figmaJson);
      if (eff.found) {
        nextFound = true;
        nextTop = (eff.margin && typeof eff.margin.top === 'number') ? eff.margin.top : 0;
        nextInfo = { kdsId: sp.nextKdsId, resolvedClass: eff.primary, wrapperChain: eff.wrapperChain };
      }
    }

    // prev/next 둘 다 HTML 매칭 안 되면 skip (wrapper-only 구조 등)
    if (!prevFound && !nextFound) continue;

    const totalGap = prevBottom + nextTop;
    const ok = totalGap === expected;
    checks.push({ spacer: sp.kdsId, expected, totalGap, ok });
    if (!ok) {
      issues.push({
        spacer: sp.kdsId, height: expected,
        prevInfo, nextInfo,
        prevBottom, nextTop,
        totalGap,
      });
    }
  }

  return { baseName, spacerCount: spacers.length, checks, issues };
}

/* ───── 실행 ───── */

const arg = process.argv[2];
const allHtml = fs.readdirSync(TO_FIGMA, { withFileTypes: true })
  .filter(d => d.isFile() && d.name.endsWith('.html'))
  .map(d => path.join(TO_FIGMA, d.name));

let targets;
if (!arg || arg === '--all') {
  targets = allHtml;
} else {
  const f = path.join(TO_FIGMA, arg.endsWith('.html') ? arg : `${arg}.html`);
  if (!fs.existsSync(f)) {
    console.error(`HTML 파일 없음: ${f}`);
    process.exit(2);
  }
  targets = [f];
}

console.log('━'.repeat(76));
console.log(`Spacer FRAME ↔ HTML CSS margin 검증 (${targets.length}개 파일)`);
console.log('━'.repeat(76));

let totalIssues = 0;
const results = [];
for (const t of targets) {
  const baseName = path.basename(t, '.html');
  const jsonPath = path.join(TO_FIGMA, `${baseName}.figma.json`);
  if (!fs.existsSync(jsonPath)) continue;
  try {
    const r = verifyOne(t, jsonPath, baseName);
    results.push(r);
    totalIssues += r.issues.length;
  } catch (e) {
    console.error(`✗ ${baseName}: ${e.message}`);
  }
}

// 파일별 요약
console.log('\n파일별 결과:');
console.log('-'.repeat(76));
console.log(['파일'.padEnd(30), 'Spacer'.padEnd(8), '체크'.padEnd(6), '불일치'].join(' | '));
console.log('-'.repeat(76));
for (const r of results) {
  console.log([
    r.baseName.padEnd(30).slice(0, 30),
    String(r.spacerCount).padEnd(8),
    String(r.checks.length).padEnd(6),
    String(r.issues.length)
  ].join(' | '));
}

// 불일치 상세
if (totalIssues > 0) {
  console.log('\n불일치 상세:');
  console.log('-'.repeat(76));
  for (const r of results) {
    if (r.issues.length === 0) continue;
    console.log(`\n[${r.baseName}]`);
    for (const iss of r.issues) {
      const fmt = (info, side) => {
        if (!info) return '(none)';
        const wrap = info.wrapperChain && info.wrapperChain.length
          ? ` via wrapper ${info.wrapperChain.join(' > ')}`
          : '';
        return `.${info.resolvedClass}${wrap}`;
      };
      console.log(`  · ${iss.spacer} (h:${iss.height}px) — total gap ${iss.totalGap}px ≠ ${iss.height}px`);
      console.log(`      prev → ${fmt(iss.prevInfo)} margin-bottom: ${iss.prevBottom}px`);
      console.log(`      next → ${fmt(iss.nextInfo)} margin-top: ${iss.nextTop}px`);
    }
  }
}

console.log('\n' + '━'.repeat(76));
if (totalIssues === 0) {
  console.log('✓ 모든 Spacer ↔ margin 매칭 통과');
  process.exit(0);
} else {
  console.log(`✗ ${totalIssues}개 불일치 — HTML CSS 또는 figma.json 한쪽 수정 필요`);
  process.exit(1);
}
