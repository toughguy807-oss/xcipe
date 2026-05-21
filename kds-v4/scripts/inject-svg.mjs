#!/usr/bin/env node
// HTML→figma.json SVG 인젝션 스크립트
//
// 동작:
//   1) to-figma/*.html 의 모든 <svg>...</svg>를 추출
//   2) 각 SVG의 가장 가까운 ancestor(data-kds-id 가진) 를 부모로 매칭
//   3) 같은 베이스명의 figma.json을 열어, 부모 kdsId로 노드를 찾아 children에 SVG spec 주입
//      (이미 SVG 자식이 있으면 갱신, 없으면 추가)
//   4) chip-* 으로 시작하는 노드는 width 하드코딩 제거 (콘텐츠 자연폭으로)
//   5) 변경 사항을 콘솔에 표 형태로 보고
//
// 실행: node scripts/inject-svg.mjs [target-base-name | --all]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TO_FIGMA = path.join(ROOT, 'to-figma');
const ICONS_DIR = path.join(ROOT, 'kds/data/icons');
const LOGOS_DIR = path.join(ROOT, 'kds/data/logos');

/* ───── KDS 아이콘 라이브러리 로드 (data-kds-icon ref 치환용) ───── */

function loadKdsIcon(iconName) {
  if (!iconName || !/^[a-zA-Z0-9_-]+$/.test(iconName)) return null;
  const iconPath = path.join(ICONS_DIR, `${iconName}.svg`);
  if (!fs.existsSync(iconPath)) return null;
  return fs.readFileSync(iconPath, 'utf8').trim();
}

/* ───── KDS 로고 라이브러리 로드 (data-kds-logo ref 치환용) ───── */
//
// 로고는 아이콘과 달리 **원본 브랜드 컬러 고정** (사용자 결정 정책).
// - currentColor 미사용
// - inject-svg 가 fills override 미적용 (어떤 surface 위에서도 원본 fill 유지)
// - 자세한 차이는 kds/data/logos/README.md 참고

function loadKdsLogo(logoName) {
  if (!logoName || !/^[a-zA-Z0-9_-]+$/.test(logoName)) return null;
  const logoPath = path.join(LOGOS_DIR, `${logoName}.svg`);
  if (!fs.existsSync(logoPath)) return null;
  return fs.readFileSync(logoPath, 'utf8').trim();
}

/* ───── HTML 파싱: <svg> + 가장 가까운 data-kds-id ancestor ───── */

function extractSvgs(html) {
  const results = []; // { parentKdsId, svg, color, size }
  const stack = []; // [{ tag, kdsId, openIdx }]
  const tagOpen = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/g;
  // self-closing void elements (don't push to stack)
  const VOID = new Set([
    'area','base','br','col','embed','hr','img','input','link','meta',
    'param','source','track','wbr',
  ]);

  let m;
  let i = 0;
  while ((m = tagOpen.exec(html)) !== null) {
    if (m[1]) {
      // start tag
      const tagName = m[1].toLowerCase();
      const attrStr = m[2] || '';
      const isSelfClosing = /\/\s*$/.test(attrStr) || VOID.has(tagName);

      if (tagName === 'svg') {
        // SVG 시작 → 닫는 </svg> 찾기 (중첩 svg 거의 없음)
        const startIdx = m.index;
        const endRe = /<\/svg\s*>/gi;
        endRe.lastIndex = tagOpen.lastIndex;
        const em = endRe.exec(html);
        if (!em) break;
        const endIdx = em.index + em[0].length;
        const svgStr = html.slice(startIdx, endIdx);

        // === KDS 라이브러리 ref 치환 (data-kds-icon / data-kds-logo) ===
        // HTML 의 <svg data-kds-icon="home" /> 또는 <svg data-kds-logo="kt" /> 같은 ref 가 있으면
        // kds/data/icons/<name>.svg 또는 kds/data/logos/<name>.svg 의 검증된 SVG 로 치환.
        // 라이브러리 미존재 시 경고 + 원본 svg 그대로 (보통 빈 svg 일 것).
        // 아이콘과 로고의 차이:
        //   - 아이콘: currentColor 가능, fills override 적용 (KDS 토큰으로 색 자유 변경)
        //   - 로고:   원본 브랜드 컬러 고정, fills override 미적용 (브랜드 자산 보존)
        const iconRef = parseAttr(attrStr, 'data-kds-icon');
        const logoRef = parseAttr(attrStr, 'data-kds-logo');
        let resolvedSvg = svgStr;
        let usedKdsIconRef = null;
        let usedKdsLogoRef = null;
        if (iconRef) {
          const libContent = loadKdsIcon(iconRef);
          if (libContent) {
            resolvedSvg = libContent;
            usedKdsIconRef = iconRef;
          } else {
            console.warn(`⚠️  KDS icon not found: kds/data/icons/${iconRef}.svg (HTML 의 svg 그대로 사용)`);
          }
        } else if (logoRef) {
          const libContent = loadKdsLogo(logoRef);
          if (libContent) {
            resolvedSvg = libContent;
            usedKdsLogoRef = logoRef;
          } else {
            console.warn(`⚠️  KDS logo not found: kds/data/logos/${logoRef}.svg (HTML 의 svg 그대로 사용)`);
          }
        }

        // ancestor에서 가장 가까운 kdsId
        let parentKdsId = null;
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s].kdsId) { parentKdsId = stack[s].kdsId; break; }
        }

        // size 추출 (width/height 속성 우선, 없으면 viewBox — HTML attrStr 우선, 다음 resolvedSvg viewBox)
        const widthAttr = parseAttr(attrStr, 'width');
        const heightAttr = parseAttr(attrStr, 'height');
        const viewBoxAttr = parseAttr(attrStr, 'viewBox');
        let w = widthAttr ? parseFloat(widthAttr) : null;
        let h = heightAttr ? parseFloat(heightAttr) : null;
        if ((!w || !h) && viewBoxAttr) {
          const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
          if (parts.length === 4) {
            if (!w) w = parts[2];
            if (!h) h = parts[3];
          }
        }
        // 라이브러리에서 치환된 SVG 사용 시, 자체 viewBox 도 fallback
        if ((!w || !h) && (usedKdsIconRef || usedKdsLogoRef)) {
          const libViewBox = resolvedSvg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
          if (libViewBox) {
            const parts = libViewBox[1].trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4) {
              if (!w) w = parts[2];
              if (!h) h = parts[3];
            }
          }
        }
        if (!w || !h) { w = 24; h = 24; } // 안전 기본값

        // 색상 힌트: stroke="#xxx" 또는 fill="#xxx" (currentColor면 null)
        const strokeAttr = parseAttr(attrStr, 'stroke');
        const fillAttr = parseAttr(attrStr, 'fill');
        const colorHint = (strokeAttr && strokeAttr !== 'none' && strokeAttr !== 'currentColor')
          ? strokeAttr
          : (fillAttr && fillAttr !== 'none' && fillAttr !== 'currentColor')
            ? fillAttr
            : null;

        results.push({
          parentKdsId,
          svg: resolvedSvg,
          width: w,
          height: h,
          colorHint,
          kdsIconRef: usedKdsIconRef, // 보고용
          kdsLogoRef: usedKdsLogoRef, // 보고용 + fills override 스킵 flag
        });

        tagOpen.lastIndex = endIdx;
        continue;
      }

      const kdsId = parseAttr(attrStr, 'data-kds-id');
      if (!isSelfClosing) stack.push({ tag: tagName, kdsId });
    } else if (m[3]) {
      // end tag
      const closeName = m[3].toLowerCase();
      // 가장 가까운 같은 태그까지 pop
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
  // name="value" or name='value' — 반드시 공백 또는 문자열 시작 직후에 와야 함
  // (\b는 stroke-width 같은 하이픈 케이스에서 width와 매칭돼버려서 사용 X)
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

/* ───── 부모 ancestor 의 첫 SOLID fill 추적 (currentColor SVG fallback 결정용) ───── */

function buildParentMap(figma) {
  // node -> parent node (객체 참조 키)
  const parentByObj = new WeakMap();
  walkNodes(figma, (n, parent) => {
    if (parent) parentByObj.set(n, parent);
  });
  return parentByObj;
}

function firstSolidFillHex(node) {
  if (!node || !Array.isArray(node.fills)) return null;
  for (const f of node.fills) {
    if (f && f.type === 'SOLID' && typeof f.color === 'string') {
      // 반투명 fill (예: white 15% 오버레이) 은 실제 표면색에 영향 적음 — 다음 ancestor 로 위임
      const op = (typeof f.opacity === 'number') ? f.opacity : 1;
      if (op < 0.5) continue;
      const m = f.color.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
      if (m) return f.color;
    }
  }
  return null;
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  // perceived luminance (sRGB approximation)
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * SVG 가 들어갈 부모 노드의 ancestor chain 을 따라 올라가며 첫 SOLID fill 의 hex 를 반환.
 * 그 색이 dark (luminance < 128) 이면 SVG 가 white text 위에 그려져야 함.
 * 어떤 ancestor 도 SOLID fill 을 안 가지면 null 반환 (= 기본 black 유지).
 */
function inheritedSurfaceColor(parentNode, parentByObj) {
  let cur = parentNode;
  let safety = 12; // 무한 루프 방어
  while (cur && safety-- > 0) {
    const hex = firstSolidFillHex(cur);
    if (hex) return hex;
    cur = parentByObj.get(cur) || null;
  }
  return null;
}

/* ───── 변환: SVG 그룹을 부모 노드에 주입 ───── */

function injectSvgsIntoFigma(figmaJson, svgs) {
  const report = []; // { parentKdsId, action, count, missing }

  // ancestor fill 추적을 위한 parent 맵 (currentColor SVG 의 fallback 결정용)
  const parentMap = buildParentMap(figmaJson);

  // parentKdsId 별로 그룹핑
  const grouped = new Map();
  for (const s of svgs) {
    const key = s.parentKdsId || '__root__';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(s);
  }

  for (const [parentKdsId, list] of grouped) {
    if (parentKdsId === '__root__') {
      report.push({ parentKdsId: '(no parent)', action: 'skipped', count: list.length, reason: 'no ancestor kdsId' });
      continue;
    }
    const parentNode = findNodeByKdsId(figmaJson, parentKdsId);
    if (!parentNode) {
      report.push({ parentKdsId, action: 'missing', count: list.length, reason: 'kdsId not found in figma.json' });
      continue;
    }

    // children 배열이 없으면 만들기
    if (!Array.isArray(parentNode.children)) parentNode.children = [];

    // 기존에 같은 kdsId-icon 자식이 있으면 제거 후 새 SVG들로 교체
    parentNode.children = parentNode.children.filter(c => {
      if (typeof c.kdsId !== 'string') return true;
      return !c.kdsId.startsWith(parentKdsId + '-icon');
    });

    // ancestor 의 surface 색 — dark 면 currentColor SVG 는 white 로 fallback
    const surfaceHex = inheritedSurfaceColor(parentNode, parentMap);
    const surfaceIsDark = surfaceHex ? relativeLuminance(surfaceHex) < 128 : false;

    list.forEach((s, idx) => {
      const childKdsId = list.length === 1 ? `${parentKdsId}-icon` : `${parentKdsId}-icon-${idx + 1}`;
      const spec = {
        type: 'SVG',
        name: list.length === 1 ? 'Icon' : `Icon ${idx + 1}`,
        kdsId: childKdsId,
        width: Math.round(s.width),
        height: Math.round(s.height),
        svg: s.svg,
      };
      // 색상 힌트가 있고 #으로 시작하면 fills override 추가
      // 단 KDS 로고 ref 로 치환된 SVG 는 원본 브랜드 컬러 고정 정책상 fills override 스킵
      if (s.kdsLogoRef) {
        // 로고: 원본 SVG 의 fill attribute 들이 plugin 에서 그대로 그려지도록 spec.fills 미설정
      } else if (s.colorHint && /^#[0-9a-fA-F]{3,8}$/.test(s.colorHint)) {
        spec.fills = [{ type: 'SOLID', color: s.colorHint, opacity: 1 }];
      } else if (surfaceIsDark) {
        // currentColor SVG + dark surface 위 → CSS color cascade 흉내내서 white 로
        spec.fills = [{ type: 'SOLID', color: '#ffffff', opacity: 1 }];
      }
      parentNode.children.push(spec);
    });

    report.push({ parentKdsId, action: 'injected', count: list.length, surface: surfaceHex || '(none)', whiteOverride: surfaceIsDark });
  }

  return report;
}

/* ───── chip-* width 하드코딩 제거 ───── */

function fixChipWidths(figmaJson) {
  const removed = [];
  walkNodes(figmaJson, (n) => {
    if (typeof n.kdsId !== 'string') return;
    if (!n.kdsId.startsWith('chip-')) return;
    // 최상위 chip 프레임만 대상: "chip-" 뒤에 한 세그먼트만 있는 경우
    // (chip-coat ✓ / chip-coat-label, chip-coat-x-icon-box ✗ — 자식은 자기 width 유지)
    const rest = n.kdsId.slice('chip-'.length);
    if (rest.includes('-')) return;
    if (n.width !== undefined) {
      removed.push({ kdsId: n.kdsId, width: n.width });
      delete n.width;
    }
  });
  return removed;
}

/* ───── 단일 파일 처리 ───── */

function processOne(htmlPath) {
  const baseName = path.basename(htmlPath, '.html');
  const jsonPath = path.join(TO_FIGMA, `${baseName}.figma.json`);

  // 플로우 폴더 패턴(`<name>/1-*.html`)도 처리
  const isFlowChild = path.dirname(htmlPath) !== TO_FIGMA;

  if (!fs.existsSync(jsonPath)) {
    if (isFlowChild) return null; // 플로우 자식은 부모 단일 jsonPath에서 처리됨
    return { baseName, status: 'skipped', reason: 'no matching .figma.json' };
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const figma = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const svgs = extractSvgs(html);
  const injectionReport = injectSvgsIntoFigma(figma, svgs);
  const chipFixReport = fixChipWidths(figma);

  fs.writeFileSync(jsonPath, JSON.stringify(figma, null, 2) + '\n', 'utf8');

  return {
    baseName,
    svgsFound: svgs.length,
    injected: injectionReport.filter(r => r.action === 'injected').reduce((s, r) => s + r.count, 0),
    missing: injectionReport.filter(r => r.action === 'missing'),
    skipped: injectionReport.filter(r => r.action === 'skipped'),
    chipFixed: chipFixReport,
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
console.log(`SVG 인젝션 + 칩 width 수정 (${targets.length}개 파일)`);
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

// 요약 출력
console.log('\n파일별 결과:');
console.log('-'.repeat(70));
console.log(
  ['파일'.padEnd(38), 'svg추출'.padEnd(8), '주입'.padEnd(6), '미매칭'.padEnd(8), '칩수정'].join(' | ')
);
console.log('-'.repeat(70));
for (const r of allReports) {
  console.log(
    [
      r.baseName.padEnd(38).slice(0, 38),
      String(r.svgsFound || 0).padEnd(8),
      String(r.injected || 0).padEnd(6),
      String((r.missing || []).reduce((s, m) => s + m.count, 0)).padEnd(8),
      String((r.chipFixed || []).length),
    ].join(' | ')
  );
}

// 미매칭 상세
const missingTotal = allReports.flatMap(r =>
  (r.missing || []).map(m => ({ file: r.baseName, ...m }))
);
if (missingTotal.length > 0) {
  console.log('\n미매칭 (figma.json에 해당 kdsId 없음):');
  for (const m of missingTotal) {
    console.log(`  · ${m.file}: ${m.parentKdsId} (svg ${m.count}개)`);
  }
}

console.log('\n완료.');
