#!/usr/bin/env node
// 두 가지 수정:
// 1) 화면 자식 폭이 섞여있을 때 (375 풀폭 + 좁은 343 등),
//    screen 의 counterAxisAlign을 CENTER로 보정해 좁은 카드가 가운데로 가도록.
// 2) inject-svg가 부모 wrapper(예: <span class="cat-icon">)에 kdsId가 없어서
//    SVG가 형제로 들어간 케이스를 자동 보정 — 인접 RECTANGLE/FRAME을
//    FRAME으로 변환하고 그 안에 SVG를 자식으로 옮김 (아이콘 박스 안에 아이콘).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TO_FIGMA = path.join(ROOT, 'to-figma');

/* ───── 스크린 정렬 보정 ───── */

function fixScreenAlignment(figma) {
  const reports = [];
  const consider = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type !== 'FRAME') return;
    if (!Array.isArray(node.children) || node.children.length < 2) return;
    if (node.layout && node.layout.mode !== 'VERTICAL') return;
    // 자식 width 다양성 검사
    const widths = node.children
      .map(c => c.width)
      .filter(w => typeof w === 'number');
    if (widths.length < 2) return;
    const max = Math.max(...widths);
    const min = Math.min(...widths);
    if (max - min < 8) return; // 다양성 미미하면 skip
    // 주로 좌측 정렬(MIN)인 경우 CENTER로 변경
    if (node.layout && node.layout.counterAxisAlign === 'MIN') {
      node.layout.counterAxisAlign = 'CENTER';
      reports.push({ kdsId: node.kdsId || '(no-id)', from: 'MIN', to: 'CENTER', widths: [...new Set(widths)].sort((a,b) => a-b) });
    }
  };

  // root 또는 screens 배열 안의 최상위 화면 frame들을 검사
  if (figma.root) consider(figma.root);
  if (Array.isArray(figma.screens)) figma.screens.forEach(consider);

  return reports;
}

/* ───── 고아 SVG → 인접 박스 안으로 이동 ───── */

function fixOrphanIcons(figma) {
  const reports = [];

  function walkAndFix(node) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.children) && node.children.length > 0) {
      const children = node.children;

      // SVG 노드 찾기
      for (let i = children.length - 1; i >= 0; i--) {
        const c = children[i];
        if (c.type !== 'SVG') continue;
        // kdsId가 -icon, -icon-1 등으로 끝나는 인젝션된 SVG만 대상
        if (!c.kdsId || !/-icon(-\d+)?$/.test(c.kdsId)) continue;

        // 인접한 익명 RECTANGLE/FRAME 찾기 (앞 형제 우선)
        // 두 가지 케이스:
        //   A) 박스 ≥ SVG → 박스를 FRAME으로 변환 + SVG를 자식으로 이동 (아이콘 박스 안에 아이콘)
        //   B) 박스 < SVG (placeholder 사이즈) → 박스 제거 + SVG가 그 자리 차지 (SVG가 진짜 아이콘)
        let targetIdx = -1;
        let mode = null; // 'wrap' | 'replace'
        for (let j = 0; j < i; j++) {
          const sib = children[j];
          const noChildren = !Array.isArray(sib.children) || sib.children.length === 0;
          if ((sib.type === 'RECTANGLE' || sib.type === 'FRAME' || sib.type === 'ELLIPSE') &&
              !sib.kdsId &&
              typeof sib.width === 'number' && typeof sib.height === 'number' &&
              sib.width <= 64 && sib.height <= 64 &&
              noChildren) {
            if (sib.width >= c.width && sib.height >= c.height) {
              targetIdx = j; mode = 'wrap'; break;
            }
            // placeholder: SVG보다 작은 단색 박스. SVG로 교체.
            if (Array.isArray(sib.fills) && sib.fills.length > 0 && sib.fills[0].type === 'SOLID') {
              targetIdx = j; mode = 'replace'; break;
            }
          }
        }

        if (targetIdx === -1) continue;

        const target = children[targetIdx];

        if (mode === 'wrap') {
          // ELLIPSE는 cornerRadius 999로 FRAME 변환 (원형 유지)
          const cornerRadius = target.type === 'ELLIPSE'
            ? 999
            : target.cornerRadius;
          const newFrame = {
            type: 'FRAME',
            name: target.name || (target.type === 'ELLIPSE' ? 'Icon Circle' : 'Icon Box'),
            kdsId: (node.kdsId || 'icon') + '-icon-box',
            width: target.width,
            height: target.height,
            fills: target.fills || [],
            strokes: target.strokes,
            strokeWeight: target.strokeWeight,
            cornerRadius,
            opacity: target.opacity,
            layout: {
              mode: 'HORIZONTAL',
              primaryAxisAlign: 'CENTER',
              counterAxisAlign: 'CENTER',
              primaryAxisSizing: 'FIXED',
              counterAxisSizing: 'FIXED',
            },
            children: [c],
          };
          Object.keys(newFrame).forEach(k => newFrame[k] === undefined && delete newFrame[k]);
          children[targetIdx] = newFrame;
          children.splice(i, 1);
          reports.push({
            parentKdsId: node.kdsId || '(no-id)', svgKdsId: c.kdsId, action: 'wrap',
            boxSize: `${target.width}×${target.height}`, svgSize: `${c.width}×${c.height}`,
          });
        } else if (mode === 'replace') {
          // placeholder 제거 + SVG를 그 자리로 이동
          children.splice(i, 1);          // SVG 원래 자리 제거 (아래쪽)
          children[targetIdx] = c;        // placeholder 자리에 SVG
          reports.push({
            parentKdsId: node.kdsId || '(no-id)', svgKdsId: c.kdsId, action: 'replace',
            boxSize: `${target.width}×${target.height}`, svgSize: `${c.width}×${c.height}`,
          });
        }
      }

      // 재귀
      for (const ch of children) walkAndFix(ch);
    }

    if (node.root) walkAndFix(node.root);
    if (Array.isArray(node.screens)) node.screens.forEach(walkAndFix);
  }

  walkAndFix(figma);
  return reports;
}

/* ───── 실행 ───── */

const arg = process.argv[2];
const allJson = fs.readdirSync(TO_FIGMA, { withFileTypes: true })
  .filter(d => d.isFile() && d.name.endsWith('.figma.json'))
  .map(d => path.join(TO_FIGMA, d.name));

let targets;
if (!arg || arg === '--all') {
  targets = allJson;
} else {
  const f = path.join(TO_FIGMA, arg.endsWith('.figma.json') ? arg : `${arg}.figma.json`);
  if (!fs.existsSync(f)) { console.error(`없음: ${f}`); process.exit(1); }
  targets = [f];
}

console.log('━'.repeat(70));
console.log(`아이콘 배치 + 화면 정렬 보정 (${targets.length}개 파일)`);
console.log('━'.repeat(70));

for (const t of targets) {
  const baseName = path.basename(t, '.figma.json');
  const figma = JSON.parse(fs.readFileSync(t, 'utf8'));

  const alignReports = fixScreenAlignment(figma);
  const iconReports = fixOrphanIcons(figma);

  if (alignReports.length === 0 && iconReports.length === 0) {
    console.log(`· ${baseName}: 변경 없음`);
    continue;
  }

  fs.writeFileSync(t, JSON.stringify(figma, null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${baseName}:`);
  for (const r of alignReports) {
    console.log(`  · 화면 정렬 ${r.kdsId}: counterAxisAlign ${r.from} → ${r.to} (자식 폭: ${r.widths.join(', ')})`);
  }
  for (const r of iconReports) {
    const verb = r.action === 'wrap' ? '박스화' : 'placeholder 교체';
    console.log(`  · 아이콘 ${verb} ${r.parentKdsId}: ${r.boxSize} ← ${r.svgKdsId}(${r.svgSize})`);
  }
}

console.log('\n완료.');
