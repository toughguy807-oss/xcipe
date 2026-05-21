#!/usr/bin/env node
/**
 * parse-matched-references.js
 *
 * aesthetic-contract.yaml → dkb_sync.matched_references[] 추출 헬퍼
 * reviewer 서브에이전트가 BLOCK 판정 시 §B.4.1 자동 reject 호출 직전에 사용.
 * 의존성 0 (Node 표준 라이브러리만 — 미니 YAML 파서 자체 구현).
 *
 * 사용:
 *   node parse-matched-references.js <aesthetic-contract.yaml 경로> [--field matched_references|matched_section_packs|matched_patterns]
 *   → stdout으로 JSON 출력 (배열)
 *
 * 출력 예:
 *   {
 *     "matched_references": ["tier-1/anthropic.com", "tier-2/scale.com"],
 *     "matched_section_packs": [],
 *     "matched_patterns": ["hero/kpi-dark-monogrid"],
 *     "context": { "industry": "fintech", "target": "investor", "priority": "trust", "tone": "refined" },
 *     "ref_paths": [
 *       "~/.claude/dkb/references/tier-1/anthropic.com/DNA.md",
 *       "~/.claude/dkb/references/tier-2/scale.com/DNA.md",
 *       "~/.claude/dkb/section-packs/hero/kpi-dark-monogrid/PACK.md"
 *     ]
 *   }
 *
 * reviewer 사용 시:
 *   const { matched_references, context, ref_paths } = JSON.parse(stdout)
 *   for (ref of ref_paths) {
 *     // Skill: dkb-search --reject "{ref}" --reason {code} --source reviewer --context "{ctx}"
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_FIELDS = ['matched_references', 'matched_section_packs', 'matched_patterns'];
const CONTEXT_FIELDS = ['industry', 'target', 'priority', 'tone'];

function parseArgs() {
  const args = process.argv.slice(2);
  const inputPath = args.find((a) => !a.startsWith('--'));
  if (!inputPath) {
    console.error('Usage: node parse-matched-references.js <aesthetic-contract.yaml> [--field <name>]');
    process.exit(2);
  }
  const fieldFlag = args.indexOf('--field');
  const filterField = fieldFlag >= 0 ? args[fieldFlag + 1] : null;
  return { inputPath: path.resolve(inputPath), filterField };
}

/**
 * 미니 YAML 파서 — aesthetic-contract.yaml 구조에 한정.
 * - 인용된 인라인 배열: `["a", "b"]`
 * - 빈 배열: `[]`
 * - 스칼라: `key: value` (따옴표 선택)
 * - 2-depth 매핑(dkb_sync.matched_references) 만 처리
 *
 * 외부 yaml 라이브러리 의존성 회피 (의존성 0 원칙).
 */
function parseYaml(raw) {
  const lines = raw.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const current = stack[stack.length - 1].obj;

    const m = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, valueRaw] = m;
    const value = valueRaw.trim();

    if (value === '' || value === '|' || value === '>') {
      current[key] = {};
      stack.push({ indent, obj: current[key] });
      continue;
    }
    current[key] = parseScalar(value);
  }
  return root;
}

function parseScalar(s) {
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;

  // Inline array: ["a", "b"] or ['a', 'b']
  const arrMatch = s.match(/^\[(.*)\]$/);
  if (arrMatch) {
    const inner = arrMatch[1].trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  // Quoted scalar
  const qMatch = s.match(/^['"](.*)['"]$/);
  if (qMatch) return qMatch[1];

  // Number
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);

  return s;
}

function expandRefPath(short, kind) {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  const base = home.replace(/\\/g, '/') + '/.claude/dkb';
  if (kind === 'matched_references') return `${base}/references/${short}/DNA.md`;
  if (kind === 'matched_section_packs') return `${base}/section-packs/${short}/PACK.md`;
  if (kind === 'matched_patterns') return `${base}/section-packs/${short}/PACK.md`; // patterns는 section-packs 하위
  return short;
}

function extractContext(yaml) {
  const ctx = {};
  const candidates = [
    yaml.context,
    yaml.tone_engine && yaml.tone_engine.context,
    yaml.mandate,
  ].filter(Boolean);

  for (const src of candidates) {
    for (const f of CONTEXT_FIELDS) {
      if (src[f] != null && ctx[f] == null) ctx[f] = src[f];
    }
  }
  // mandate.domain은 industry로 alias
  if (!ctx.industry && yaml.mandate && yaml.mandate.domain) {
    ctx.industry = yaml.mandate.domain;
  }
  return ctx;
}

function main() {
  const { inputPath, filterField } = parseArgs();
  if (!fs.existsSync(inputPath)) {
    console.error(`[error] file not found: ${inputPath}`);
    process.exit(3);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  const yaml = parseYaml(raw);
  const dkbSync = yaml.dkb_sync || {};

  const result = {};
  const refPaths = [];
  for (const f of TARGET_FIELDS) {
    if (filterField && filterField !== f) continue;
    const arr = Array.isArray(dkbSync[f]) ? dkbSync[f] : [];
    result[f] = arr;
    for (const short of arr) refPaths.push(expandRefPath(short, f));
  }
  result.context = extractContext(yaml);
  result.ref_paths = refPaths;
  result.context_string = CONTEXT_FIELDS.map((f) => result.context[f] || '*').join('|');

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
