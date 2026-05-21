#!/usr/bin/env node
// HTML→figma.json 이미지 인젝션 스크립트
//
// 동작:
//   1) to-figma/*.html 의 모든 <img src="..."> 를 추출
//   2) 각 <img>의 매칭 대상 노드 결정:
//      - <img> 자체에 data-kds-id 가 있으면 그 노드
//      - 없으면 가장 가까운 ancestor 의 data-kds-id
//   3) 같은 베이스명의 figma.json 을 열어 매칭 노드에 imageUrl 자동 주입
//      (외부 URL 이면 자동으로 /proxy?url=... 로 감싸서 manifest 단일 도메인 통과)
//   4) 변경 사항을 콘솔에 표 형태로 보고
//
// 실행:
//   node scripts/inject-images.mjs [target-base-name | --all]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TO_FIGMA = path.join(ROOT, 'to-figma');

/* ───── HTML 파싱: <img> + (자신 또는 ancestor) data-kds-id ───── */

function extractImages(html) {
  const results = []; // { kdsId, src, alt, width, height }
  const stack = []; // [{ tag, kdsId }]
  const tagOpen = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/g;
  const VOID = new Set([
    'area','base','br','col','embed','hr','img','input','link','meta',
    'param','source','track','wbr',
  ]);

  let m;
  while ((m = tagOpen.exec(html)) !== null) {
    if (m[1]) {
      const tagName = m[1].toLowerCase();
      const attrStr = m[2] || '';
      const isSelfClosing = /\/\s*$/.test(attrStr) || VOID.has(tagName);

      if (tagName === 'img') {
        const src = parseAttr(attrStr, 'src');
        if (src) {
          const ownKdsId = parseAttr(attrStr, 'data-kds-id');
          let kdsId = ownKdsId;
          if (!kdsId) {
            for (let s = stack.length - 1; s >= 0; s--) {
              if (stack[s].kdsId) { kdsId = stack[s].kdsId; break; }
            }
          }
          const widthAttr = parseAttr(attrStr, 'width');
          const heightAttr = parseAttr(attrStr, 'height');
          const alt = parseAttr(attrStr, 'alt');
          results.push({
            kdsId,
            src,
            alt: alt || '',
            width: widthAttr ? parseFloat(widthAttr) : null,
            height: heightAttr ? parseFloat(heightAttr) : null,
            ownKdsId: !!ownKdsId,
          });
        }
        // <img>는 void라 stack push 안 함
        continue;
      }

      const kdsId = parseAttr(attrStr, 'data-kds-id');
      if (!isSelfClosing) stack.push({ tag: tagName, kdsId });
    } else if (m[3]) {
      const closeName = m[3].toLowerCase();
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === closeName) {
          stack.length = s;
          break;
        }
      }
    }
  }
  return results;
}

function parseAttr(attrStr, name) {
  const re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i');
  const m = attrStr.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
}

/* ───── figma.json 트리 순회 ───── */

function walkNodes(node, fn, parent = null, key = null) {
  if (!node || typeof node !== 'object') return;
  fn(node, parent, key);
  if (Array.isArray(node.children)) {
    for (const c of node.children) walkNodes(c, fn, node, 'children');
  }
  if (Array.isArray(node.screens)) {
    for (const s of node.screens) walkNodes(s, fn, node, 'screens');
  }
  if (node.root) walkNodes(node.root, fn, node, 'root');
}

function findNodeByKdsId(figma, kdsId) {
  let found = null;
  walkNodes(figma, (n) => {
    if (!found && n.kdsId === kdsId) found = n;
  });
  return found;
}

/* ───── URL 정규화 (외부 URL은 프록시 경유) ───── */

function normalizeImageUrl(src) {
  if (!src) return null;
  // 이미 상대 경로면 그대로 (브릿지가 직접 서빙)
  if (src.startsWith('/')) return src;
  // data: URI, blob: URI 는 그대로 (인라인 base64 이미지 등)
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  // 외부 http(s) URL은 프록시로 감싸기 — manifest devAllowedDomains 회피
  if (/^https?:\/\//i.test(src)) {
    return '/proxy?url=' + encodeURIComponent(src);
  }
  return src;
}

/* ───── 이미지 spec을 부모 노드에 주입 ───── */

function injectImagesIntoFigma(figmaJson, images) {
  const report = []; // { kdsId, action, src, reason }

  for (const img of images) {
    if (!img.kdsId) {
      report.push({ kdsId: '(no parent)', action: 'skipped', src: img.src, reason: 'no kdsId on img or ancestor' });
      continue;
    }
    const node = findNodeByKdsId(figmaJson, img.kdsId);
    if (!node) {
      report.push({ kdsId: img.kdsId, action: 'missing', src: img.src, reason: 'kdsId not found in figma.json' });
      continue;
    }

    // image fill을 받을 수 있는 노드 type 인지 확인
    // FRAME / RECTANGLE / ELLIPSE 만 허용 (TEXT/SVG/LINE 등은 image fill 불가)
    const acceptable = !node.type || node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'ELLIPSE';
    if (!acceptable) {
      report.push({ kdsId: img.kdsId, action: 'unsupported', src: img.src, reason: `node type ${node.type} cannot hold image fill` });
      continue;
    }

    node.imageUrl = normalizeImageUrl(img.src);
    if (img.alt) node.imageAlt = img.alt;
    report.push({ kdsId: img.kdsId, action: 'injected', src: img.src });
  }

  return report;
}

/* ───── 단일 파일 처리 ───── */

function processOne(htmlPath) {
  const baseName = path.basename(htmlPath, '.html');
  const jsonPath = path.join(TO_FIGMA, `${baseName}.figma.json`);

  const isFlowChild = path.dirname(htmlPath) !== TO_FIGMA;
  if (!fs.existsSync(jsonPath)) {
    if (isFlowChild) return null;
    return { baseName, status: 'skipped', reason: 'no matching .figma.json' };
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const figma = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const images = extractImages(html);
  const report = injectImagesIntoFigma(figma, images);

  fs.writeFileSync(jsonPath, JSON.stringify(figma, null, 2) + '\n', 'utf8');

  return {
    baseName,
    imagesFound: images.length,
    injected: report.filter(r => r.action === 'injected').length,
    missing: report.filter(r => r.action === 'missing'),
    skipped: report.filter(r => r.action === 'skipped'),
    unsupported: report.filter(r => r.action === 'unsupported'),
  };
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
    process.exit(1);
  }
  targets = [f];
}

console.log('━'.repeat(70));
console.log(`이미지 인젝션 (${targets.length}개 파일)`);
console.log('━'.repeat(70));

const allReports = [];
for (const t of targets) {
  try {
    const r = processOne(t);
    if (r) allReports.push(r);
  } catch (e) {
    console.error(`✗ ${path.basename(t)}: ${e.message}`);
  }
}

console.log('\n파일별 결과:');
console.log('-'.repeat(70));
console.log(
  ['파일'.padEnd(38), 'img추출'.padEnd(8), '주입'.padEnd(6), '미매칭'.padEnd(8), '미지원'].join(' | ')
);
console.log('-'.repeat(70));
for (const r of allReports) {
  console.log(
    [
      r.baseName.padEnd(38).slice(0, 38),
      String(r.imagesFound || 0).padEnd(8),
      String(r.injected || 0).padEnd(6),
      String((r.missing || []).length).padEnd(8),
      String((r.unsupported || []).length),
    ].join(' | ')
  );
}

const missingTotal = allReports.flatMap(r =>
  (r.missing || []).map(m => ({ file: r.baseName, ...m }))
);
if (missingTotal.length > 0) {
  console.log('\n미매칭 (figma.json에 해당 kdsId 없음):');
  for (const m of missingTotal) {
    console.log(`  · ${m.file}: ${m.kdsId} (src: ${m.src})`);
  }
}

const unsupportedTotal = allReports.flatMap(r =>
  (r.unsupported || []).map(u => ({ file: r.baseName, ...u }))
);
if (unsupportedTotal.length > 0) {
  console.log('\n미지원 노드 type (image fill 불가):');
  for (const u of unsupportedTotal) {
    console.log(`  · ${u.file}: ${u.kdsId} — ${u.reason}`);
  }
}

const skippedTotal = allReports.flatMap(r =>
  (r.skipped || []).map(s => ({ file: r.baseName, ...s }))
);
if (skippedTotal.length > 0) {
  console.log('\n스킵 (kdsId 없음):');
  for (const s of skippedTotal) {
    console.log(`  · ${s.file}: ${s.src} — ${s.reason}`);
  }
}

console.log('\n완료.');
