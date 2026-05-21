#!/usr/bin/env node
// kds/lint.js — KDS 토큰 준수 여부를 figma.json/HTML 대상으로 검증
//
// 사용:
//   node kds/lint.js to-figma/login.figma.json
//   node kds/lint.js to-figma/login.html
//   node kds/lint.js to-figma/login-flow/           (폴더 내 모든 html/figma.json)
//   node kds/lint.js --json to-figma/login.figma.json   (JSON 리포트만 stdout)
//
// 종료 코드:
//   0 = 위반 없음
//   1 = 위반 있음
//   2 = 실행 오류

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TOKENS_DIR = path.join(ROOT, 'tokens');

// ── 토큰 로드 ────────────────────────────────────────────────────────

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, name), 'utf8'));
}

const colorPrimitive = loadJson('color.primitive.json');
const colorSemanticLight = loadJson('color.semantic.light-default.json');
const colorSemanticDark = loadJson('color.semantic.dark-default.json');
const spacingTokens = loadJson('spacing.json');
const radiusTokens = loadJson('radius.json');

// 허용 hex 집합 (primitive 색상만)
const ALLOWED_HEX = new Map(); // hex(lower) -> token name
for (const [name, value] of Object.entries(colorPrimitive)) {
  if (typeof value === 'string' && value.startsWith('#')) {
    ALLOWED_HEX.set(value.toLowerCase(), name);
  }
}

// semantic → primitive 역참조 (역할 제안용)
function resolveSemantic(semanticMap) {
  const out = {};
  for (const [sem, ref] of Object.entries(semanticMap)) {
    const m = String(ref).match(/^\{(.+)\}$/);
    if (m && colorPrimitive[m[1]]) out[sem] = colorPrimitive[m[1]].toLowerCase();
  }
  return out;
}
const SEMANTIC_LIGHT = resolveSemantic(colorSemanticLight);
const SEMANTIC_DARK = resolveSemantic(colorSemanticDark);

// 허용 spacing 값 (숫자 집합). 0은 항상 허용.
const ALLOWED_SPACING = new Set([0, ...Object.values(spacingTokens)]);
const ALLOWED_RADIUS = new Set([0, ...Object.values(radiusTokens).map(Number).filter(n => !isNaN(n))]);

// 컴포넌트 사이즈 토큰 — kds/data/components/<name>.spec.json 에서 우선 로드
// spec.json 미존재 시 기존 하드코딩 fallback (button-spec-11.jpg 기준)
const COMPONENTS_DIR = path.join(ROOT, 'data', 'components');
function loadComponentSpec(name) {
  const p = path.join(COMPONENTS_DIR, `${name}.spec.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
const BUTTON_SPEC = loadComponentSpec('button');
const BUTTON_HEIGHT_TOKENS = (() => {
  if (BUTTON_SPEC && BUTTON_SPEC.sizes && BUTTON_SPEC.sizes.tokens) {
    const out = {};
    for (const [sizeName, t] of Object.entries(BUTTON_SPEC.sizes.tokens)) {
      if (t && typeof t.height === 'number') out[t.height] = sizeName;
    }
    if (Object.keys(out).length) return out;
  }
  return { 24: 'XSmall', 32: 'Small', 44: 'Medium', 48: 'Large', 56: 'XLarge' };
})();
const ALLOWED_BUTTON_HEIGHTS = new Set(Object.keys(BUTTON_HEIGHT_TOKENS).map(Number));
function buttonSizeName(h) { return BUTTON_HEIGHT_TOKENS[h] || null; }
// "btn/button/cta/tab" 키워드가 단어 단위로 포함되는지 (kdsId / name 매칭용)
// CTA·탭도 KDS button 사이즈 토큰을 따라야 하므로 같은 룰 적용
const BUTTON_NAME_RE = /(?:^|[^a-zA-Z])(?:btn|button|cta|tab)(?:[^a-zA-Z]|$)/i;
// 버튼 안의 아이콘 컨테이너 (예: "sticky-btn-icon-box", "cta-icon-wrap") — 진짜 버튼이 아니라 제외
const BUTTON_ICON_WRAPPER_RE = /(?:^|[-_\s])icon(?:[-_\s]?(?:box|wrap|container|frame))?\s*$/i;
// 버튼 그룹 컨테이너 (예: "cta-stack", "btn-group", "tab-bar/list/strip") — 자식이 버튼인 wrapper 이지 자기 자신은 버튼 아님
const BUTTON_GROUP_WRAPPER_RE = /(?:^|[-_\s])(?:stack|group|bar|list|strip|row)\s*$/i;

// ── 색상 유틸 ────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.length === 8 ? h.slice(0, 6) : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function nearestHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let best = null;
  let bestD = Infinity;
  for (const [candidateHex, name] of ALLOWED_HEX) {
    const c = hexToRgb(candidateHex);
    if (!c) continue;
    const d = (rgb.r - c.r) ** 2 + (rgb.g - c.g) ** 2 + (rgb.b - c.b) ** 2;
    if (d < bestD) { bestD = d; best = { name, hex: candidateHex }; }
  }
  return best ? { ...best, deltaSq: bestD } : null;
}

function suggestSemanticRoles(hex, context) {
  // context: 'fill' | 'stroke' | 'text' | 'background' | 'any'
  const target = hex.toLowerCase();
  const candidates = [];
  for (const [sem, refHex] of Object.entries(SEMANTIC_LIGHT)) {
    if (refHex === target) {
      if (context === 'any' || sem.startsWith(context + '.') || sem.startsWith('surface.')) {
        candidates.push(sem);
      }
    }
  }
  return candidates;
}

function nearestNumeric(value, allowedSet) {
  let best = null;
  let bestD = Infinity;
  for (const v of allowedSet) {
    const d = Math.abs(value - v);
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

// ── 위반 수집 ────────────────────────────────────────────────────────

function createViolationBag() {
  const items = [];
  return {
    add(v) { items.push(v); },
    all() { return items; }
  };
}

// ── figma.json 검증 ─────────────────────────────────────────────────

function lintFigmaSpec(spec, bag, pathStr = 'root') {
  if (!spec || typeof spec !== 'object') return;

  const nodeLabel = spec.kdsId || spec.name || pathStr;

  // fills / strokes
  for (const key of ['fills', 'strokes']) {
    if (Array.isArray(spec[key])) {
      spec[key].forEach((paint, i) => {
        if (paint && paint.type === 'SOLID' && typeof paint.color === 'string') {
          const hex = paint.color.toLowerCase();
          if (!ALLOWED_HEX.has(hex)) {
            const near = nearestHex(hex);
            const contextKey = key === 'fills' ? 'fill' : 'stroke';
            const roles = near ? suggestSemanticRoles(near.hex, contextKey) : [];
            bag.add({
              kind: 'color',
              severity: 'error',
              path: `${pathStr}.${key}[${i}].color`,
              node: nodeLabel,
              value: hex,
              message: `${key}[${i}] 색상 ${hex}이(가) KDS primitive 팔레트에 없습니다`,
              suggestion: near ? {
                hex: near.hex,
                primitive: near.name,
                semantic: roles.slice(0, 3),
                distance: Math.round(Math.sqrt(near.deltaSq))
              } : null
            });
          }
        }
      });
    }
  }

  // cornerRadius
  if (typeof spec.cornerRadius === 'number') {
    if (!ALLOWED_RADIUS.has(spec.cornerRadius)) {
      const near = nearestNumeric(spec.cornerRadius, ALLOWED_RADIUS);
      bag.add({
        kind: 'radius',
        severity: 'error',
        path: `${pathStr}.cornerRadius`,
        node: nodeLabel,
        value: spec.cornerRadius,
        message: `cornerRadius ${spec.cornerRadius}이(가) radius 토큰에 없습니다`,
        suggestion: near != null ? { value: near, token: radiusTokenName(near) } : null
      });
    }
  }

  // 버튼 height 검사 — kds/data/components/button-spec-11.jpg 의 사이즈 토큰만 허용
  // FRAME + kdsId/name 에 btn/button/cta/tab 키워드 + 자식에 label TEXT 또는 아이콘 SVG 존재
  // 단, "*-icon*" 아이콘 컨테이너와 "*-stack/group/bar/list/strip/row" 버튼 그룹 wrapper 는 제외
  if (spec.type === 'FRAME' && typeof spec.height === 'number') {
    const idStr = ((spec.kdsId || '') + ' ' + (spec.name || '')).trim();
    const isIconWrapper = BUTTON_ICON_WRAPPER_RE.test(spec.kdsId || '') || BUTTON_ICON_WRAPPER_RE.test(spec.name || '');
    const isGroupWrapper = BUTTON_GROUP_WRAPPER_RE.test(spec.kdsId || '') || BUTTON_GROUP_WRAPPER_RE.test(spec.name || '');
    if (BUTTON_NAME_RE.test(idStr) && !isIconWrapper && !isGroupWrapper) {
      const childList = Array.isArray(spec.children) ? spec.children : [];
      const hasLabelOrIcon = childList.some(c => c && (c.type === 'TEXT' || c.type === 'SVG'));
      if (hasLabelOrIcon && !ALLOWED_BUTTON_HEIGHTS.has(spec.height)) {
        const near = nearestNumeric(spec.height, ALLOWED_BUTTON_HEIGHTS);
        bag.add({
          kind: 'button-size',
          severity: 'error',
          path: `${pathStr}.height`,
          node: nodeLabel,
          value: spec.height,
          message: `버튼 height ${spec.height}이(가) KDS 사이즈 토큰에 없습니다 (XLarge:56 / Large:48 / Medium:44 / Small:32 / XSmall:24)`,
          suggestion: near != null ? { value: near, token: buttonSizeName(near) } : null
        });
      }
    }
  }

  // SVG 노드 검사 — "빈 박스로 들어감" 함정 + dasharray 함정 (D안 도넛 사례)
  if (spec.type === 'SVG' && typeof spec.svg === 'string') {
    const svg = spec.svg;

    // Rule: SVG 문자열 자체가 비어있거나 매우 짧음 (보통 type:SVG 인데 svg content 누락)
    if (svg.trim().length < 30 || !/<svg\b/i.test(svg)) {
      bag.add({
        kind: 'svg-empty-string',
        severity: 'error',
        path: pathStr,
        node: nodeLabel,
        value: svg.slice(0, 60),
        message: `SVG 노드의 svg 속성이 비어있거나 <svg> 태그 누락 — Figma 에서 빈 박스로 표시됨`,
        suggestion: { hint: 'HTML 의 <svg data-kds-icon="..."> 로 KDS 라이브러리 ref 사용 권장 (kds/data/icons/)' }
      });
    } else {
      // Rule: viewBox 누락 또는 0 0 0 0 — 그릴 영역 없음
      const vbMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
      if (!vbMatch) {
        bag.add({
          kind: 'svg-no-viewbox',
          severity: 'error',
          path: pathStr,
          node: nodeLabel,
          message: `SVG viewBox 누락 — Figma 가 그릴 영역을 모름. 빈 박스로 표시됨`,
          suggestion: { hint: 'viewBox="0 0 24 24" 명시 (KDS 표준)' }
        });
      } else {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && (parts[2] <= 0 || parts[3] <= 0)) {
          bag.add({
            kind: 'svg-zero-viewbox',
            severity: 'error',
            path: pathStr,
            node: nodeLabel,
            value: vbMatch[0],
            message: `SVG viewBox 의 width/height 가 0 또는 음수 — 빈 박스로 표시됨`,
            suggestion: { hint: 'viewBox="0 0 24 24" 같이 양수 width/height 사용' }
          });
        }
      }

      // Rule: SVG 안에 그래픽 요소가 하나도 없음 (path/circle/rect/line/polygon/ellipse/polyline)
      const hasGraphic = /<(path|circle|rect|line|polygon|ellipse|polyline)\b/i.test(svg);
      if (!hasGraphic) {
        bag.add({
          kind: 'svg-no-graphic',
          severity: 'error',
          path: pathStr,
          node: nodeLabel,
          message: `SVG 안에 그래픽 요소(path/circle/rect/line/polygon/ellipse/polyline) 가 하나도 없음 — 빈 박스`,
          suggestion: { hint: 'KDS 라이브러리 사용: <svg data-kds-icon="home" width="24" height="24"/>' }
        });
      } else {
        // Rule: path 가 있지만 d 가 비어있음
        const pathRe = /<path\b([^>]*)>/gi;
        let pm;
        while ((pm = pathRe.exec(svg)) !== null) {
          const dMatch = pm[1].match(/\bd\s*=\s*["']([^"']*)["']/i);
          if (dMatch && dMatch[1].trim().length === 0) {
            bag.add({
              kind: 'svg-empty-path',
              severity: 'error',
              path: pathStr,
              node: nodeLabel,
              value: pm[0],
              message: `SVG <path> 의 d 속성이 빈 문자열 — 빈 박스로 표시됨`,
              suggestion: { hint: '검증된 path d 값 사용 또는 KDS 라이브러리 ref 사용' }
            });
            break; // 같은 노드에서 여러 빈 path 가 있어도 한 번만 보고
          }
        }
      }
    }
    // Rule A: <circle>·<ellipse> 에 dasharray 박힌 progress arc 패턴 — Figma 호환 X
    const arcRe = /<(circle|ellipse)\b[^>]*stroke-dasharray\s*=/gi;
    let am;
    while ((am = arcRe.exec(svg)) !== null) {
      bag.add({
        kind: 'svg-dasharray-on-circle',
        severity: 'error',
        path: pathStr,
        node: nodeLabel,
        value: `<${am[1]}> + stroke-dasharray`,
        message: `<${am[1]}> + stroke-dasharray 조합은 Figma 파서가 progress arc로 그리지 못해 점선처럼 끊어집니다`,
        suggestion: { hint: '<path d="M ... A rx ry 0 large sweep x y"/> 로 호를 직접 그리세요 (dasharray 없이)' }
      });
    }
    // Rule B: 단일 값 dasharray (path 등 다른 태그여도 위험)
    const dashRe = /stroke-dasharray\s*=\s*["']([^"']+)["']/gi;
    let dm;
    while ((dm = dashRe.exec(svg)) !== null) {
      const parts = dm[1].trim().split(/[\s,]+/).filter(Boolean);
      if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
        bag.add({
          kind: 'svg-dasharray-single',
          severity: 'error',
          path: pathStr,
          node: nodeLabel,
          value: dm[0],
          message: `SVG stroke-dasharray가 단일 값 — Figma 파서가 dash 반복 패턴으로 그려 점선처럼 끊어집니다`,
          suggestion: { hint: '두 값으로 분리: stroke-dasharray="진행길이 빈길이" (예: 73%면 "385.2 142.6")' }
        });
      }
    }
  }

  // TEXT 노드 width 누락 검사 — figma.createText 직후 작은 width로 잡혀
  // 한 글자씩 세로로 떨어지는 함정 방지 (CLAUDE.md #### 8)
  if (spec.type === 'TEXT' && typeof spec.characters === 'string' && spec.characters.length > 0) {
    const hasWidth = typeof spec.width === 'number';
    const isWidthAuto = spec.textAutoResize === 'WIDTH_AND_HEIGHT';
    if (!hasWidth && !isWidthAuto) {
      const preview = spec.characters.slice(0, 24) + (spec.characters.length > 24 ? '…' : '');
      bag.add({
        kind: 'text-width',
        severity: 'error',
        path: pathStr,
        node: nodeLabel,
        value: preview,
        message: `TEXT 노드 width 미명시 — Figma createText 직후 작은 width로 잡혀 한 글자씩 세로로 떨어질 수 있음`,
        suggestion: { hint: '고정 폭 텍스트면 width 명시 + textAutoResize:"HEIGHT", 자연폭이면 textAutoResize:"WIDTH_AND_HEIGHT"' }
      });
    }
  }

  // layout spacing
  if (spec.layout && typeof spec.layout === 'object') {
    const L = spec.layout;
    const spacingFields = [
      'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
      'itemSpacing'
    ];
    for (const f of spacingFields) {
      const v = L[f];
      if (typeof v === 'number' && !ALLOWED_SPACING.has(v)) {
        const near = nearestNumeric(v, ALLOWED_SPACING);
        bag.add({
          kind: 'spacing',
          severity: 'error',
          path: `${pathStr}.layout.${f}`,
          node: nodeLabel,
          value: v,
          message: `${f} ${v}이(가) spacing 토큰에 없습니다`,
          suggestion: near != null ? { value: near, token: spacingTokenName(near) } : null
        });
      }
    }
  }

  // children
  if (Array.isArray(spec.children)) {
    const parentMode = spec.layout && spec.layout.mode;
    const parentAutoLayout = parentMode === 'VERTICAL' || parentMode === 'HORIZONTAL';
    spec.children.forEach((child, i) => {
      const childPath = `${pathStr}.children[${i}]`;
      // 오토레이아웃 부모 + 자식 절대좌표 = 좌표 무시 함정 (CLAUDE.md #### 1, D안 도넛 사례)
      if (parentAutoLayout && child && typeof child === 'object') {
        const cx = typeof child.x === 'number' ? child.x : 0;
        const cy = typeof child.y === 'number' ? child.y : 0;
        if (cx !== 0 || cy !== 0) {
          const cLabel = child.kdsId || child.name || childPath;
          bag.add({
            kind: 'autolayout-absolute',
            severity: 'error',
            path: childPath,
            node: cLabel,
            value: `x:${cx}, y:${cy}`,
            message: `오토레이아웃 부모(${nodeLabel}, mode=${parentMode}) 안에서 자식 절대좌표는 무시됩니다`,
            suggestion: { hint: '부모 layout.mode 제거(absolute 의도) 또는 자식 x/y 제거(오토레이아웃 의도) 중 택1' }
          });
        }
      }
      lintFigmaSpec(child, bag, childPath);
    });
  }
}

function radiusTokenName(value) {
  for (const [k, v] of Object.entries(radiusTokens)) {
    if (Number(v) === value) return k;
  }
  return null;
}
function spacingTokenName(value) {
  for (const [k, v] of Object.entries(spacingTokens)) {
    if (Number(v) === value) return k;
  }
  return null;
}

// kdsId duplicate 검사 — 같은 화면 안에서 kdsId 는 unique 해야 함 (plugin/inject 매칭 충돌 방지)
function collectKdsIdDuplicates(spec, bag, pathStr) {
  const map = new Map(); // kdsId -> [path, ...]
  function walk(node, p) {
    if (!node || typeof node !== 'object') return;
    if (node.kdsId) {
      if (!map.has(node.kdsId)) map.set(node.kdsId, []);
      map.get(node.kdsId).push(p);
    }
    if (Array.isArray(node.children)) {
      node.children.forEach((c, i) => walk(c, `${p}.children[${i}]`));
    }
  }
  walk(spec, pathStr);
  for (const [id, paths] of map) {
    if (paths.length > 1) {
      bag.add({
        kind: 'kdsId-duplicate',
        severity: 'error',
        path: paths.join(' | '),
        node: id,
        value: id,
        message: `kdsId "${id}" 가 같은 화면에서 ${paths.length}회 사용됨 — plugin/inject 매칭 충돌 위험`,
        suggestion: { hint: '각 노드에 unique kdsId 부여 (예: -1, -2 접미사)' }
      });
    }
  }
}

function lintFigmaJson(file) {
  const bag = createViolationBag();
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (json.root) {
    lintFigmaSpec(json.root, bag, 'root');
    collectKdsIdDuplicates(json.root, bag, 'root');
  } else if (Array.isArray(json.screens)) {
    json.screens.forEach((screen, i) => {
      lintFigmaSpec(screen, bag, `screens[${i}]`);
      collectKdsIdDuplicates(screen, bag, `screens[${i}]`);
    });
  } else {
    lintFigmaSpec(json, bag, 'root');
    collectKdsIdDuplicates(json, bag, 'root');
  }

  return { file, kind: 'figma.json', violations: bag.all() };
}

// ── HTML 검증 ────────────────────────────────────────────────────────

function lintHtml(file) {
  const bag = createViolationBag();
  const html = fs.readFileSync(file, 'utf8');

  // <style>...</style> 블록만 추출 (인라인 규칙 위주)
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
  // 인라인 style="..." 도 포함
  const inlineStyles = [...html.matchAll(/style\s*=\s*"([^"]*)"/gi)].map(m => m[1]);
  const css = [...styleBlocks, ...inlineStyles].join('\n');

  // hex 검출
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  let m;
  while ((m = hexRe.exec(css)) !== null) {
    const raw = m[0];
    const len = m[1].length;
    if (len !== 3 && len !== 6 && len !== 8) continue;
    const normalized = raw.length === 4
      ? '#' + raw.slice(1).split('').map(c => c + c).join('').toLowerCase()
      : raw.slice(0, 7).toLowerCase();
    if (!ALLOWED_HEX.has(normalized)) {
      const near = nearestHex(normalized);
      // 같은 위반은 한 번만
      if (bag.all().some(v => v.value === normalized && v.kind === 'color')) continue;
      bag.add({
        kind: 'color',
        severity: 'error',
        path: 'style',
        value: normalized,
        message: `CSS 색상 ${normalized}이(가) KDS primitive 팔레트에 없습니다`,
        suggestion: near ? {
          hex: near.hex,
          primitive: near.name,
          distance: Math.round(Math.sqrt(near.deltaSq))
        } : null
      });
    }
  }

  // rgba() — opacity 토큰 외의 임의 rgba
  const rgbaRe = /rgba?\(\s*([\d.\s,]+)\)/g;
  while ((m = rgbaRe.exec(css)) !== null) {
    const parts = m[1].split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    const r = parseInt(parts[0], 10), g = parseInt(parts[1], 10), b = parseInt(parts[2], 10);
    if (isNaN(r) || isNaN(g) || isNaN(b)) continue;
    const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toLowerCase();
    if (parts.length === 3 && !ALLOWED_HEX.has(hex)) {
      if (bag.all().some(v => v.value === m[0])) continue;
      const near = nearestHex(hex);
      bag.add({
        kind: 'color',
        severity: 'error',
        path: 'style',
        value: m[0],
        message: `CSS 색상 ${m[0]}이(가) KDS primitive 팔레트에 없습니다`,
        suggestion: near ? { hex: near.hex, primitive: near.name } : null
      });
    }
    // rgba(4-args)는 opacity 토큰에서 리터럴 매치로 허용 가정 — 세세한 검사는 생략
  }

  // 버튼/CTA/Tab 셀렉터의 height — KDS 사이즈 토큰만 허용
  // selector 에 btn|button|cta|tab 키워드가 단어 단위로 포함되고 height: Npx 선언이 있으면 검사
  // 단 "*-stack/group/bar/list/strip/row" 같은 그룹 wrapper 와 "*-icon*" 아이콘 wrapper 는 제외
  const ruleBlockRe = /([^{}]+?)\s*\{([^{}]*?)\}/g;
  let rb;
  while ((rb = ruleBlockRe.exec(css)) !== null) {
    const selector = rb[1].trim();
    const decls = rb[2];
    if (!/(?:^|[^a-zA-Z])(?:btn|button|cta|tab)(?:[^a-zA-Z]|$)/i.test(selector)) continue;
    if (/(?:^|[^a-zA-Z])(?:stack|group|bar|list|strip|row)(?:[^a-zA-Z]|$)/i.test(selector)) continue;
    if (/(?:^|[^a-zA-Z])icon(?:[-_](?:box|wrap|container|frame))?(?:[^a-zA-Z]|$)/i.test(selector)) continue;
    const hMatch = decls.match(/(?:^|;|\s)height\s*:\s*(-?\d+(?:\.\d+)?)px/i);
    if (!hMatch) continue;
    const n = parseFloat(hMatch[1]);
    if (ALLOWED_BUTTON_HEIGHTS.has(n)) continue;
    const sigKey = `btn-h:${selector}:${n}`;
    if (bag.all().some(v => v.kind === 'button-size' && v.path === `style { ${selector} }` && v.value === n)) continue;
    const near = nearestNumeric(n, ALLOWED_BUTTON_HEIGHTS);
    bag.add({
      kind: 'button-size',
      severity: 'error',
      path: `style { ${selector} }`,
      value: n,
      message: `버튼 height ${n}px이(가) KDS 사이즈 토큰에 없습니다 (XLarge:56 / Large:48 / Medium:44 / Small:32 / XSmall:24)`,
      suggestion: near != null ? { value: near, token: buttonSizeName(near) } : null
    });
  }

  // padding/margin/gap/border-radius 의 px 값 수집
  const propRe = /(padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap|border-radius)\s*:\s*([^;]+);/gi;
  while ((m = propRe.exec(css)) !== null) {
    const prop = m[1].toLowerCase();
    const values = m[2].trim();
    // "16px" / "16px 24px" / "12px 16px 8px 16px"
    const pxRe = /(-?\d+(?:\.\d+)?)px/g;
    let mm;
    while ((mm = pxRe.exec(values)) !== null) {
      const n = parseFloat(mm[1]);
      if (prop === 'border-radius') {
        if (!ALLOWED_RADIUS.has(n)) {
          const near = nearestNumeric(n, ALLOWED_RADIUS);
          if (bag.all().some(v => v.value === n && v.path === `style.${prop}`)) continue;
          bag.add({
            kind: 'radius',
            severity: 'error',
            path: `style.${prop}`,
            value: n,
            message: `border-radius ${n}px이(가) radius 토큰에 없습니다`,
            suggestion: near != null ? { value: near, token: radiusTokenName(near) } : null
          });
        }
      } else {
        if (!ALLOWED_SPACING.has(n)) {
          const near = nearestNumeric(n, ALLOWED_SPACING);
          if (bag.all().some(v => v.value === n && v.path === `style.${prop}`)) continue;
          bag.add({
            kind: 'spacing',
            severity: 'error',
            path: `style.${prop}`,
            value: n,
            message: `${prop} ${n}px이(가) spacing 토큰에 없습니다`,
            suggestion: near != null ? { value: near, token: spacingTokenName(near) } : null
          });
        }
      }
    }
  }

  // 인라인 SVG 의 dasharray 함정 검사 (figma.json 측과 동일 룰)
  const htmlArcRe = /<(circle|ellipse)\b[^>]*stroke-dasharray\s*=/gi;
  let am;
  while ((am = htmlArcRe.exec(html)) !== null) {
    if (bag.all().some(v => v.kind === 'svg-dasharray-on-circle' && v.value.includes(am[1]))) continue;
    bag.add({
      kind: 'svg-dasharray-on-circle',
      severity: 'error',
      path: 'html',
      value: `<${am[1]}> + stroke-dasharray`,
      message: `<${am[1]}> + stroke-dasharray 조합은 Figma 파서가 progress arc로 그리지 못해 점선처럼 끊어집니다`,
      suggestion: { hint: '<path d="M ... A rx ry 0 large sweep x y"/> 로 호를 직접 그리세요 (dasharray 없이)' }
    });
  }
  const htmlDashRe = /stroke-dasharray\s*=\s*["']([^"']+)["']/gi;
  let dm;
  while ((dm = htmlDashRe.exec(html)) !== null) {
    const parts = dm[1].trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
      if (bag.all().some(v => v.kind === 'svg-dasharray-single' && v.value === dm[0])) continue;
      bag.add({
        kind: 'svg-dasharray-single',
        severity: 'error',
        path: 'html',
        value: dm[0],
        message: `SVG stroke-dasharray가 단일 값 — Figma 파서가 dash 반복 패턴으로 그려 점선처럼 끊어집니다`,
        suggestion: { hint: '두 값으로 분리: stroke-dasharray="진행길이 빈길이" (예: 73%면 "385.2 142.6")' }
      });
    }
  }

  // data-kds-id 존재 여부 (경고 레벨)
  const hasKdsId = /data-kds-id\s*=/.test(html);
  if (!hasKdsId) {
    bag.add({
      kind: 'kdsId',
      severity: 'warn',
      path: 'html',
      message: 'data-kds-id 속성이 하나도 없습니다 — figma.json과 매칭이 불가능해집니다'
    });
  }

  return { file, kind: 'html', violations: bag.all() };
}

// ── 대상 수집 ────────────────────────────────────────────────────────

function collectTargets(arg) {
  const abs = path.resolve(arg);
  if (!fs.existsSync(abs)) return [];
  const st = fs.statSync(abs);
  if (st.isFile()) return [abs];
  if (st.isDirectory()) {
    const out = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(abs, entry.name);
      if (entry.isDirectory()) out.push(...collectTargets(p));
      else if (/\.(figma\.json|html?)$/i.test(entry.name)) out.push(p);
    }
    return out;
  }
  return [];
}

// ── 포매팅 ─────────────────────────────────────────────────────────

function formatHuman(reports) {
  const lines = [];
  let totalErr = 0, totalWarn = 0;
  for (const r of reports) {
    const rel = path.relative(ROOT, r.file).replace(/\\/g, '/');
    const errs = r.violations.filter(v => v.severity === 'error');
    const warns = r.violations.filter(v => v.severity === 'warn');
    totalErr += errs.length;
    totalWarn += warns.length;
    if (r.violations.length === 0) {
      lines.push(`✔ ${rel}  (통과)`);
      continue;
    }
    lines.push(`✘ ${rel}  — ${errs.length} error, ${warns.length} warn`);
    for (const v of r.violations) {
      const sev = v.severity === 'error' ? 'ERR ' : 'WARN';
      const head = `  [${sev}] ${v.kind}  ${v.path}${v.node ? ` (${v.node})` : ''}`;
      lines.push(head);
      lines.push(`         ${v.message}`);
      if (v.suggestion) {
        if (v.suggestion.hex) {
          const roles = v.suggestion.semantic?.length ? ` / ${v.suggestion.semantic.join(', ')}` : '';
          lines.push(`         → ${v.suggestion.hex}  (${v.suggestion.primitive}${roles})`);
        } else if (v.suggestion.value != null) {
          lines.push(`         → ${v.suggestion.value}  (${v.suggestion.token || '?'})`);
        } else if (v.suggestion.hint) {
          lines.push(`         → ${v.suggestion.hint}`);
        }
      }
    }
  }
  lines.push('');
  lines.push(`요약: ${reports.length}개 파일, 에러 ${totalErr} / 경고 ${totalWarn}`);
  return { text: lines.join('\n'), totalErr, totalWarn };
}

// ── 엔트리 ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');
  const targets = args.filter(a => !a.startsWith('--'));

  if (targets.length === 0) {
    console.error('사용: node kds/lint.js <file-or-dir> [<file-or-dir> ...] [--json]');
    process.exit(2);
  }

  const files = [];
  for (const t of targets) files.push(...collectTargets(t));
  if (files.length === 0) {
    // 경로는 있는데 그 안에 검사 대상이 없는 경우 (예: 빈 to-figma/) — 통과로 처리
    const anyExists = targets.some(t => fs.existsSync(t));
    if (anyExists) {
      console.log('검사 대상 파일 없음 — 통과');
      process.exit(0);
    }
    console.error('경로를 찾을 수 없습니다: ' + targets.join(', '));
    process.exit(2);
  }

  const reports = files.map(f => {
    try {
      if (/\.figma\.json$/i.test(f)) return lintFigmaJson(f);
      if (/\.html?$/i.test(f)) return lintHtml(f);
      return { file: f, kind: 'unknown', violations: [] };
    } catch (e) {
      return {
        file: f,
        kind: 'error',
        violations: [{ kind: 'parse', severity: 'error', path: '', message: String(e.message || e) }]
      };
    }
  });

  if (jsonOnly) {
    process.stdout.write(JSON.stringify({ reports }, null, 2));
    const totalErr = reports.reduce((a, r) => a + r.violations.filter(v => v.severity === 'error').length, 0);
    process.exit(totalErr > 0 ? 1 : 0);
  }

  const { text, totalErr } = formatHuman(reports);
  console.log(text);
  process.exit(totalErr > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { lintFigmaJson, lintHtml, ALLOWED_HEX, ALLOWED_SPACING, ALLOWED_RADIUS };
