#!/usr/bin/env node
/**
 * build-compare.mjs <base>
 *
 * 시안 비교용 통합 figma.json 재빌드 (워크플로우 B).
 * 단독 시안 figma.json (`<base>-a.figma.json`, `-b`, `-c`) 를 읽어서
 * 그 root 들을 `<base>-compare.figma.json` 의 screens[] 배열에 합쳐 다시 쓴다.
 *
 * 동작 규칙:
 *  - `<base>-compare.figma.json` 이 이미 존재할 때만 동작. 없으면 스킵 (예기치 않은 파일 생성 방지)
 *  - 기존 compare 의 screens[].name (사용자 정의 컨셉 라벨) 은 같은 kdsId 기준으로 보존
 *  - root.kdsId 는 `screen-<base>-compare-<a|b|c>` 로 일관 부여 (단독 파일은 안 건드림)
 *  - 시안 파일이 없으면 그 시안만 스킵 (다른 시안은 갱신)
 *  - exit code: 0 정상(스킵 포함), 1 시안 모두 없음, 2 인자 오류
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DESIGNS_DIR = path.join(ROOT, 'to-figma');

const base = process.argv[2];
if (!base) {
  console.error('usage: build-compare.mjs <base>');
  process.exit(2);
}

const comparePath = path.join(DESIGNS_DIR, `${base}-compare.figma.json`);
const comparePathAlt = (() => {
  const m = base.match(/^(.+)-(desktop|mobile)$/);
  return m ? path.join(DESIGNS_DIR, `${m[1]}-compare-${m[2]}.figma.json`) : null;
})();

let actualComparePath = null;
if (fs.existsSync(comparePath)) {
  actualComparePath = comparePath;
} else if (comparePathAlt && fs.existsSync(comparePathAlt)) {
  actualComparePath = comparePathAlt;
} else {
  console.log(`[build-compare] ${base}-compare.figma.json 없음 — 스킵 (자동 생성 안 함)`);
  process.exit(0);
}

const VARIANTS = [
  { key: 'a', defaultLabel: 'A · 레이아웃' },
  { key: 'b', defaultLabel: 'B · 톤' },
  { key: 'c', defaultLabel: 'C · UX·구조' }
];

// 기존 compare 의 screens[].name 을 보존하기 위한 인덱스
let existing = null;
try { existing = JSON.parse(fs.readFileSync(actualComparePath, 'utf8')); } catch (_) {}
function findExistingName(kdsId) {
  if (!existing || !Array.isArray(existing.screens)) return null;
  const m = existing.screens.find(s => s && s.kdsId === kdsId);
  return m ? m.name : null;
}

// 시안 파일 후보 경로 생성 — 3가지 명명 패턴 지원
function candidatePaths(base, v) {
  // 패턴 ① <base>-<variant>.figma.json (원래 동작 — base에 plat 포함된 경우)
  //    ex: base=shop-kt-main-abc-desktop → shop-kt-main-abc-desktop-a.figma.json
  // 패턴 ② <prefix>-<variant>-<plat>.figma.json (variant 중간)
  //    ex: base=ktmyr-mypage-main → ktmyr-mypage-main-a-desktop.figma.json
  //    → compare 명이 `<prefix>-compare-<plat>` 일 때 base=`<prefix>` 로 호출되거나
  //       base=`<prefix>-<plat>` 로 호출돼도 prefix 추출해서 시도
  // 패턴 ③ <prefix>-<plat>-<variant>.figma.json (variant 끝, plat 중간)
  //    ex: base=shop-kt-main → shop-kt-main-desktop-a.figma.json
  const out = [];
  out.push({ p: path.join(DESIGNS_DIR, `${base}-${v.key}.figma.json`), pattern: '①' });
  const m = base.match(/^(.+)-(desktop|mobile)$/);
  if (m) {
    const prefix = m[1], plat = m[2];
    out.push({ p: path.join(DESIGNS_DIR, `${prefix}-${v.key}-${plat}.figma.json`), pattern: '②' });
  } else {
    // base 에 plat 이 없는 경우 — compare 명이 `<base>-compare-<plat>` 일 때
    for (const plat of ['desktop', 'mobile']) {
      out.push({ p: path.join(DESIGNS_DIR, `${base}-${v.key}-${plat}.figma.json`), pattern: '②plat=' + plat });
      out.push({ p: path.join(DESIGNS_DIR, `${base}-${plat}-${v.key}.figma.json`), pattern: '③plat=' + plat });
    }
  }
  // plat 가 있는 경우에도 ③ 시도
  if (m) {
    const prefix = m[1], plat = m[2];
    out.push({ p: path.join(DESIGNS_DIR, `${prefix}-${plat}-${v.key}.figma.json`), pattern: '③' });
  }
  return out;
}

const screens = [];
const skipped = [];
const patternsUsed = [];

for (const v of VARIANTS) {
  const candidates = candidatePaths(base, v);
  const hit = candidates.find(c => fs.existsSync(c.p));
  if (!hit) {
    skipped.push(`${v.key}(없음: ${candidates.map(c=>path.basename(c.p)).join(' | ')})`);
    continue;
  }
  patternsUsed.push(`${v.key}=${hit.pattern}`);
  let d;
  try {
    d = JSON.parse(fs.readFileSync(hit.p, 'utf8'));
  } catch (e) {
    skipped.push(`${v.key}(파싱실패: ${e.message})`);
    continue;
  }
  if (!d.root) {
    skipped.push(`${v.key}(root 없음)`);
    continue;
  }
  const targetKdsId = `screen-${base}-compare-${v.key}`;
  const r = d.root;
  r.kdsId = targetKdsId;
  r.name = findExistingName(targetKdsId) || v.defaultLabel;
  screens.push(r);
}

if (screens.length === 0) {
  console.error(`[build-compare] ${base}: 시안 파일이 모두 없음 — abort. (skipped: ${skipped.join(', ')})`);
  process.exit(1);
}

const outName = (existing && existing.name) ? existing.name : `${base} — 시안 비교 (A/B/C)`;
const out = { version: 1, name: outName, screens };
fs.writeFileSync(actualComparePath, JSON.stringify(out, null, 2), 'utf8');

function countSvg(spec) {
  let n = 0;
  function w(x) { if (!x) return; if (x.type === 'SVG') n++; (x.children || []).forEach(w); }
  w(spec);
  return n;
}
const svgSummary = screens.map(s => {
  const k = s.kdsId || '?';
  const m = k.match(/-([abc])$/);
  return `${m ? m[1].toUpperCase() : k}=${countSvg(s)}`;
}).join(' / ');

const tail = skipped.length ? ` · skipped: ${skipped.join(', ')}` : '';
const patInfo = patternsUsed.length ? ` · pattern ${patternsUsed.join(',')}` : '';
console.log(`[build-compare] ${path.basename(actualComparePath)} 재빌드: screens=${screens.length} · SVG ${svgSummary}${patInfo}${tail}`);
