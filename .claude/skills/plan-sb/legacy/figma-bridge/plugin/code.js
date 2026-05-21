/**
 * FigCli Hardened Push (plan-sb figma-bridge · push-only trim)
 *
 * 단방향 export: HTML → Figma. pull/cleanup/export/eval 전부 제거.
 * - daemon /job 폴링으로 push 잡 수신
 * - 청크 ≤ 50, 50ms yield, clientStorage persist
 * - getNodeByIdAsync 실체 대조 + 재시도 1회
 * - fileKey 회수 → URL 자동 생성용
 */

const PLUGIN_BUILD = '2026-04-27-PLAN-SB-PUSH-ONLY';
try {
  figma.showUI(__html__, { width: 360, height: 480, themeColors: true });
  console.log('[plugin] UI shown · build', PLUGIN_BUILD);
} catch (e) {
  figma.notify('showUI fail: ' + (e && e.message ? e.message : e), { error: true, timeout: 8000 });
  throw e;
}

// ─────────────────────────────────────────────────────────────
// CSS → Figma 변환 유틸
// ─────────────────────────────────────────────────────────────

function splitTopLevelCommas(str) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { out.push(str.slice(start, i).trim()); start = i + 1; }
  }
  out.push(str.slice(start).trim());
  return out;
}

function oklchToRgb(L, C, h, a = 1) {
  const hRad = (h * Math.PI) / 180;
  const aa = C * Math.cos(hRad);
  const bb = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * aa + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * aa - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * aa - 1.2914855480 * bb;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const gamma = (x) => x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
  r = gamma(r); g = gamma(g); b = gamma(b);
  return { r: Math.max(0, Math.min(1, r)), g: Math.max(0, Math.min(1, g)), b: Math.max(0, Math.min(1, b)), a };
}

function parseColor(cssColor) {
  if (!cssColor) return null;
  const s = String(cssColor).trim();
  if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)' || s === 'none' || s === 'currentColor') return null;
  const m1 = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m1) return {
    r: parseFloat(m1[1]) / 255, g: parseFloat(m1[2]) / 255, b: parseFloat(m1[3]) / 255,
    a: m1[4] !== undefined ? parseFloat(m1[4]) : 1,
  };
  const m2 = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m2) {
    let hex = m2[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255, a };
  }
  const m3 = s.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.-]+)\s*(?:\/\s*([\d.]+%?))?\s*\)/i);
  if (m3) {
    const toNum = (v, max) => v.endsWith('%') ? parseFloat(v) / 100 * max : parseFloat(v);
    return oklchToRgb(toNum(m3[1], 1), toNum(m3[2], 0.4), parseFloat(m3[3]), m3[4] ? toNum(m3[4], 1) : 1);
  }
  const m4 = s.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (m4) {
    const h = parseFloat(m4[1]) / 360, ss = parseFloat(m4[2]) / 100, l = parseFloat(m4[3]) / 100;
    const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    let r, g, b;
    if (ss === 0) { r = g = b = l; }
    else { const q = l < 0.5 ? l * (1 + ss) : l + ss - l * ss; const p = 2 * l - q; r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3); }
    return { r, g, b, a: m4[4] !== undefined ? parseFloat(m4[4]) : 1 };
  }
  return null;
}

function parsePx(v) {
  if (!v || v === 'auto' || v === 'normal' || v === 'none') return null;
  const m = String(v).match(/^(-?[\d.]+)px$/);
  return m ? parseFloat(m[1]) : null;
}

function parseShadows(cssShadow) {
  if (!cssShadow || cssShadow === 'none') return [];
  const parts = splitTopLevelCommas(cssShadow);
  const out = [];
  for (const p of parts) {
    const inset = /\binset\b/.test(p);
    let s = p.replace(/\binset\b/gi, '').trim();
    const colorMatch = s.match(/(oklch\([^)]*\)|rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})/i);
    if (!colorMatch) continue;
    const color = parseColor(colorMatch[1]);
    if (!color) continue;
    s = s.replace(colorMatch[0], '').trim();
    const nums = s.match(/-?[\d.]+px/g) || [];
    if (nums.length < 2) continue;
    out.push({
      type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color,
      xOff: parseFloat(nums[0]),
      yOff: parseFloat(nums[1]),
      blur: nums[2] ? parseFloat(nums[2]) : 0,
      spread: nums[3] ? parseFloat(nums[3]) : 0,
    });
  }
  return out;
}

function parseGradient(cssBg) {
  if (!cssBg || cssBg === 'none') return null;
  if (cssBg.startsWith('url(')) return null;
  const lm = cssBg.match(/^linear-gradient\(\s*([^]*)\)\s*$/i);
  if (!lm) return null;
  const inner = lm[1];
  const segs = splitTopLevelCommas(inner);
  let angle = 180;
  let idx = 0;
  const first = segs[0].trim();
  const angleM = first.match(/^(-?[\d.]+)deg$/);
  const toM = first.match(/^to\s+(.+)$/i);
  if (angleM) { angle = parseFloat(angleM[1]); idx = 1; }
  else if (toM) {
    const dir = toM[1].toLowerCase();
    if (dir === 'top') angle = 0;
    else if (dir === 'right') angle = 90;
    else if (dir === 'bottom') angle = 180;
    else if (dir === 'left') angle = 270;
    else if (dir.includes('top right')) angle = 45;
    else if (dir.includes('bottom right')) angle = 135;
    else if (dir.includes('bottom left')) angle = 225;
    else if (dir.includes('top left')) angle = 315;
    idx = 1;
  }
  const stops = [];
  for (let i = idx; i < segs.length; i++) {
    const s = segs[i].trim();
    const cm = s.match(/(oklch\([^)]*\)|rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}|transparent)/i);
    if (!cm) continue;
    const color = parseColor(cm[1]);
    if (!color) continue;
    const rest = s.replace(cm[0], '').trim();
    const pm = rest.match(/([\d.]+)%/);
    stops.push({ color, pos: pm ? parseFloat(pm[1]) / 100 : null });
  }
  if (stops.length < 2) return null;
  stops.forEach((st, i) => { if (st.pos === null) st.pos = i / (stops.length - 1); });
  const rad = (angle - 90) * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [cos, sin, (1 - cos - sin) / 2],
      [-sin, cos, (1 + sin - cos) / 2],
    ],
    gradientStops: stops.map(st => ({
      position: Math.max(0, Math.min(1, st.pos)),
      color: { r: st.color.r, g: st.color.g, b: st.color.b, a: st.color.a },
    })),
  };
}

function flatten(tree) {
  const out = [];
  let nextId = 0;
  function walk(node, parentId, depth) {
    const id = `n${nextId++}`;
    out.push({ id, parentId, depth, node });
    (node.children || []).forEach(ch => walk(ch, id, depth + 1));
  }
  walk(tree, null, 0);
  return out;
}

// 한글 시스템 폰트 → Pretendard 자동 매핑
const KO_FONT_MAP = {
  'Malgun Gothic': 'Pretendard',
  '맑은 고딕': 'Pretendard',
  'Apple SD Gothic Neo': 'Pretendard',
  'Noto Sans KR': 'Pretendard',
  'Noto Sans CJK KR': 'Pretendard',
  'Nanum Gothic': 'Pretendard',
  '나눔고딕': 'Pretendard',
  'Spoqa Han Sans': 'Pretendard',
  'Spoqa Han Sans Neo': 'Pretendard',
  'Dotum': 'Pretendard',
  'Gulim': 'Pretendard',
  'Batang': 'Pretendard',
};

function pickFontFamily(cssFontFamily) {
  if (!cssFontFamily) return 'Inter';
  const first = String(cssFontFamily).split(',')[0].trim().replace(/^["']|["']$/g, '');
  if (KO_FONT_MAP[first]) return KO_FONT_MAP[first];
  const known = ['Pretendard Variable', 'Pretendard', 'Inter', 'Fraunces', 'JetBrains Mono', 'Geist', 'Manrope', 'Instrument Serif'];
  if (known.includes(first)) return first;
  const generics = ['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-monospace', 'ui-serif', '-apple-system', 'BlinkMacSystemFont'];
  if (generics.includes(first)) return 'Inter';
  return first || 'Inter';
}

function weightToStyle(w, italic) {
  const n = parseInt(w, 10) || 400;
  let style;
  if (n <= 200) style = 'ExtraLight';
  else if (n <= 300) style = 'Light';
  else if (n <= 400) style = 'Regular';
  else if (n <= 500) style = 'Medium';
  else if (n <= 600) style = 'SemiBold';
  else if (n <= 700) style = 'Bold';
  else if (n <= 800) style = 'ExtraBold';
  else style = 'Black';
  if (italic) style = (style === 'Regular') ? 'Italic' : style + ' Italic';
  return style;
}

function toFill(color) {
  return { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a };
}

function toEffects(shadows) {
  return shadows.map(e => ({
    type: e.type,
    color: { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a },
    offset: { x: e.xOff, y: e.yOff },
    radius: Math.max(0, e.blur),
    spread: e.spread,
    visible: true,
    blendMode: 'NORMAL',
  }));
}

// ─────────────────────────────────────────────────────────────
// 노드 생성
// ─────────────────────────────────────────────────────────────

async function createNode(entry, idMap, rootFrame) {
  const { id, parentId, node } = entry;
  const s = node.style || {};
  const box = node.box || {};
  const tag = node.tag;
  const isText = !!node.text;
  const isImage = tag === 'img';

  const x = Math.round(box.x || 0);
  const y = Math.round(box.y || 0);
  const w = Math.max(1, Math.round(box.w || 1));
  const h = Math.max(1, Math.round(box.h || 1));
  const opacity = s.opacity !== undefined && s.opacity !== '' ? parseFloat(s.opacity) : 1;

  let figmaNode;

  // SVG: createNodeFromSvg
  if (tag === 'svg') {
    let markup = node.svgMarkup || null;
    if (!markup && node.svgBlobRef) {
      try {
        const r = await fetch(DAEMON_URL + '/blob/' + encodeURIComponent(node.svgBlobRef));
        if (r.ok) { const j = await r.json(); markup = j.data || null; }
      } catch (e) {}
    }
    if (markup) {
      try {
        figmaNode = figma.createNodeFromSvg(markup);
        figmaNode.x = x; figmaNode.y = y;
        try { figmaNode.resize(w, h); } catch (e) {}
        figmaNode.name = `svg:${(node.class || '').split(' ')[0] || 'icon'}`;
        if (opacity < 1) figmaNode.opacity = opacity;
      } catch (e) {
        figmaNode = null;
      }
    }
  }

  if (!figmaNode && isText) {
    figmaNode = figma.createText();
    figmaNode.x = x; figmaNode.y = y;

    const fontSize = parsePx(s.fontSize) || 14;
    const fontWeight = parseInt(s.fontWeight, 10) || 400;
    const fontItalic = s.fontStyle === 'italic';
    const fontFamily = pickFontFamily(s.fontFamily);
    const fontStyle = weightToStyle(fontWeight, fontItalic);

    try {
      figmaNode.fontName = { family: fontFamily, style: fontStyle };
    } catch (e) {
      try {
        figmaNode.fontName = { family: 'Inter', style: fontWeight >= 700 ? 'Bold' : 'Regular' };
      } catch (e2) {}
    }
    figmaNode.fontSize = fontSize;
    figmaNode.characters = String(node.text || '');

    const color = parseColor(s.color);
    if (color) figmaNode.fills = [toFill(color)];

    const letterSpacing = parsePx(s.letterSpacing);
    if (letterSpacing !== null) {
      try { figmaNode.letterSpacing = { value: letterSpacing, unit: 'PIXELS' }; } catch (e) {}
    }
    const lineHeight = parsePx(s.lineHeight);
    if (lineHeight !== null) {
      try { figmaNode.lineHeight = { value: lineHeight, unit: 'PIXELS' }; } catch (e) {}
    }
    const textCase = s.textTransform === 'uppercase' ? 'UPPER'
      : s.textTransform === 'lowercase' ? 'LOWER'
      : s.textTransform === 'capitalize' ? 'TITLE' : null;
    if (textCase) { try { figmaNode.textCase = textCase; } catch (e) {} }
    const textDecoration = /underline/i.test(s.textDecorationLine || '') ? 'UNDERLINE'
      : /line-through/i.test(s.textDecorationLine || '') ? 'STRIKETHROUGH' : null;
    if (textDecoration) { try { figmaNode.textDecoration = textDecoration; } catch (e) {} }
    const textAlign = s.textAlign && ['left','center','right','justify'].includes(s.textAlign) ? s.textAlign.toUpperCase() : null;
    if (textAlign) { try { figmaNode.textAlignHorizontal = textAlign; } catch (e) {} }

    if (opacity < 1) figmaNode.opacity = opacity;
    try { figmaNode.textAlignVertical = 'TOP'; } catch (e) {}

    // 스마트 리사이즈
    try { figmaNode.textAutoResize = 'WIDTH_AND_HEIGHT'; } catch (e) {}
    const naturalW = figmaNode.width;
    const naturalH = figmaNode.height;
    const wrapTolerance = w * 1.20 + 4;
    if (naturalW <= wrapTolerance && naturalH <= h * 1.6) {
      if (textAlign === 'CENTER') {
        figmaNode.x = x + Math.round((w - naturalW) / 2);
      } else if (textAlign === 'RIGHT') {
        figmaNode.x = x + (w - Math.round(naturalW));
      }
    } else {
      try { figmaNode.textAutoResize = 'HEIGHT'; } catch (e) {}
      try { figmaNode.resize(w, h); } catch (e) {}
    }
  } else if (!figmaNode) {
    figmaNode = figma.createFrame();
    figmaNode.x = x; figmaNode.y = y;
    figmaNode.resize(w, h);
    figmaNode.name = `${tag}${node.class ? '.' + String(node.class).split(' ')[0] : ''}`;
    figmaNode.clipsContent = s.overflow === 'hidden' || s.overflow === 'clip';
    figmaNode.layoutMode = 'NONE';

    const bg = parseColor(s.backgroundColor);
    const gradient = parseGradient(s.backgroundImage);
    const fills = [];
    if (bg && bg.a > 0) fills.push(toFill(bg));
    if (gradient) fills.push(gradient);
    figmaNode.fills = fills;

    const bTop = parsePx(s.borderTopWidth) || 0;
    const bRight = parsePx(s.borderRightWidth) || 0;
    const bBottom = parsePx(s.borderBottomWidth) || 0;
    const bLeft = parsePx(s.borderLeftWidth) || 0;
    const borderColor = parseColor(s.borderTopColor) || parseColor(s.borderRightColor) || parseColor(s.borderBottomColor) || parseColor(s.borderLeftColor);
    const borderUniform = bTop === bRight && bTop === bBottom && bTop === bLeft;
    if (borderColor && (bTop || bRight || bBottom || bLeft)) {
      figmaNode.strokes = [toFill(borderColor)];
      if (borderUniform) {
        figmaNode.strokeWeight = bTop;
      } else {
        try {
          figmaNode.strokeTopWeight = bTop;
          figmaNode.strokeRightWeight = bRight;
          figmaNode.strokeBottomWeight = bBottom;
          figmaNode.strokeLeftWeight = bLeft;
        } catch (e) {
          figmaNode.strokeWeight = Math.max(bTop, bRight, bBottom, bLeft);
        }
      }
    }

    const rTL = parsePx(s.borderTopLeftRadius) || 0;
    const rTR = parsePx(s.borderTopRightRadius) || 0;
    const rBR = parsePx(s.borderBottomRightRadius) || 0;
    const rBL = parsePx(s.borderBottomLeftRadius) || 0;
    const radiusUniform = rTL === rTR && rTL === rBR && rTL === rBL;
    if (radiusUniform && rTL > 0) {
      figmaNode.cornerRadius = rTL;
    } else if (!radiusUniform) {
      try {
        figmaNode.topLeftRadius = rTL;
        figmaNode.topRightRadius = rTR;
        figmaNode.bottomRightRadius = rBR;
        figmaNode.bottomLeftRadius = rBL;
      } catch (e) {
        figmaNode.cornerRadius = Math.round((rTL + rTR + rBR + rBL) / 4);
      }
    }

    const shadows = parseShadows(s.boxShadow);
    if (shadows.length) {
      try { figmaNode.effects = toEffects(shadows); } catch (e) {}
    }

    if (opacity < 1) figmaNode.opacity = opacity;

    if (isImage) {
      const label = node.attrs && node.attrs.src ? String(node.attrs.src).split('/').pop() : 'unknown';
      figmaNode.name = `img:${label || 'unknown'}`;
      let b64 = node.imageData || null;
      if (!b64 && node.blobRef) {
        try {
          const r = await fetch(DAEMON_URL + '/blob/' + encodeURIComponent(node.blobRef));
          if (r.ok) { const j = await r.json(); b64 = j.data || null; }
        } catch (e) {}
      }
      if (b64) {
        try {
          const bytes = figma.base64Decode(b64);
          const image = figma.createImage(bytes);
          figmaNode.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
        } catch (e) {}
      }
    }
  }

  // 부모에 appendChild
  let actualParent = rootFrame;
  if (parentId) {
    const parentFigmaId = idMap[parentId];
    if (parentFigmaId) {
      const parent = await figma.getNodeByIdAsync(parentFigmaId);
      if (parent && 'appendChild' in parent) {
        actualParent = parent;
      }
    }
  }
  actualParent.appendChild(figmaNode);

  // 부모가 auto-layout이면 자식 sizing FIXED
  if (actualParent && actualParent.layoutMode && actualParent.layoutMode !== 'NONE') {
    try {
      if ('layoutSizingHorizontal' in figmaNode) figmaNode.layoutSizingHorizontal = 'FIXED';
      if ('layoutSizingVertical' in figmaNode) figmaNode.layoutSizingVertical = 'FIXED';
    } catch (e) {}
  }

  idMap[id] = figmaNode.id;
  return figmaNode;
}

// ─────────────────────────────────────────────────────────────
// Hardened Push
// ─────────────────────────────────────────────────────────────

async function handlePushJson(msg, ctx) {
  const t0 = Date.now();
  const { tree, sessionId, pageName, chunkSize } = msg;
  const jobId = ctx && ctx.jobId ? ctx.jobId : null;
  const SESSION = sessionId || `push_${Date.now()}`;
  const PAGE = pageName || 'html-push';
  const CHUNK = Math.max(1, Math.min(50, chunkSize || 10));

  const report = {
    sessionId: SESSION,
    page: PAGE,
    chunkSize: CHUNK,
    startedAt: new Date().toISOString(),
    stats: { total: 0, created: 0, failed: 0, skipped: 0, retried: 0, verified: 0 },
    rootFigmaId: null,
    chunks: [],
    errors: [],
    retryQueue: [],
    verifyMismatch: [],
  };

  function emit(phase, done, total, extra) {
    const payload = {
      type: 'push-progress',
      phase, done, total,
      stats: Object.assign({}, report.stats),
      extra: extra || null,
    };
    figma.ui.postMessage(payload);
    if (jobId) daemonFetch(`/job/${jobId}/progress`, { method: 'POST', body: JSON.stringify({ phase, done, total, stats: payload.stats }) }).catch(() => {});
  }

  try {
    emit('load-pages', 0, 0);
    await figma.loadAllPagesAsync();

    // 페이지 reuse — 같은 이름 있으면 기존 페이지에 root frame 추가, 없으면 신규 생성
    emit('find-page', 0, 0);
    let pageName = PAGE;
    let page = figma.root.children.find(p => p.name === pageName);
    if (!page) {
      page = figma.createPage();
      page.name = pageName;
    }
    report.page = pageName;
    await figma.setCurrentPageAsync(page);

    // 루트 프레임
    emit('create-root', 0, 0);
    const rootW = Math.round((tree.box && tree.box.w) || 1440);
    const rootH = Math.round((tree.box && tree.box.h) || 900);
    const rootName = `html-root-${SESSION}`;
    const rootFrame = figma.createFrame();
    rootFrame.name = rootName;
    rootFrame.x = Math.round((tree.box && tree.box.x) || 0);
    rootFrame.y = Math.round((tree.box && tree.box.y) || 0);
    rootFrame.resize(rootW, rootH);
    // tree.style 의 background 를 root frame 에 적용 (없으면 흰색 fallback)
    const rootStyle = tree.style || {};
    const rootBg = parseColor(rootStyle.backgroundColor);
    const rootGradient = parseGradient(rootStyle.backgroundImage);
    const rootFills = [];
    if (rootBg && rootBg.a > 0) rootFills.push(toFill(rootBg));
    if (rootGradient) rootFills.push(rootGradient);
    rootFrame.fills = rootFills.length ? rootFills : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    rootFrame.clipsContent = false;
    page.appendChild(rootFrame);
    report.rootFigmaId = rootFrame.id;

    // 평탄화
    const flat = flatten(tree);
    report.stats.total = flat.length;
    emit('flatten', 0, flat.length);

    // 폰트 선로드
    const fontPairs = new Set();
    for (const e of flat) {
      if (e.node.text) {
        const ss = e.node.style || {};
        const fw = parseInt(ss.fontWeight, 10) || 400;
        const fam = pickFontFamily(ss.fontFamily);
        const sty = weightToStyle(fw, ss.fontStyle === 'italic');
        fontPairs.add(JSON.stringify({ family: fam, style: sty }));
      }
    }
    fontPairs.add(JSON.stringify({ family: 'Inter', style: 'Regular' }));
    fontPairs.add(JSON.stringify({ family: 'Inter', style: 'Bold' }));
    const fontsArr = Array.from(fontPairs).map(s => JSON.parse(s));
    emit('load-fonts', 0, fontsArr.length);
    const fontResults = await Promise.all(
      fontsArr.map(f =>
        figma.loadFontAsync({ family: f.family, style: f.style })
          .then(() => ({ ok: true, f }))
          .catch(err => ({ ok: false, f, error: err.message }))
      )
    );
    const fontsLoaded = fontResults.filter(r => r.ok).length;
    const fontsFailed = fontResults.filter(r => !r.ok);
    emit('load-fonts', fontsLoaded, fontsArr.length);

    if (fontsFailed.length) {
      const missing = fontsFailed.map(r => `${r.f.family}/${r.f.style}`);
      report.fontWarnings = missing;
      const koMissing = fontsFailed.filter(r => /Pretendard|Noto|Malgun|Apple SD|Nanum/i.test(r.f.family));
      if (koMissing.length) {
        const list = koMissing.slice(0, 3).map(r => r.f.family).join(', ');
        figma.notify(`한글 폰트 누락 (Inter 폴백): ${list}${koMissing.length > 3 ? ' …' : ''}`, { error: true, timeout: 6000 });
      }
      console.warn('[plugin] font load failed:', missing);
    }

    // idMap 초기화 (첫 엔트리 = body → rootFrame)
    const idMap = { [flat[0].id]: rootFrame.id };
    const remaining = flat.slice(1);

    // 청크 실행
    let done = 1;
    for (let i = 0; i < remaining.length; i += CHUNK) {
      const chunk = remaining.slice(i, i + CHUNK);
      const chunkIdx = Math.floor(i / CHUNK) + 1;
      const chunkTotal = Math.ceil(remaining.length / CHUNK);
      const chunkReport = { idx: chunkIdx, size: chunk.length, created: 0, failed: 0 };

      for (const entry of chunk) {
        try {
          await createNode(entry, idMap, rootFrame);
          report.stats.created++;
          chunkReport.created++;
          done++;
        } catch (err) {
          report.stats.failed++;
          chunkReport.failed++;
          report.errors.push({
            chunk: chunkIdx,
            nodeId: entry.id,
            tag: entry.node.tag,
            parentId: entry.parentId,
            error: String(err.message || err).slice(0, 300),
          });
          report.retryQueue.push(entry);
        }
      }

      report.chunks.push(chunkReport);

      try {
        await figma.clientStorage.setAsync(`pushIdMap_${SESSION}`, idMap);
      } catch (e) {
        report.errors.push({ chunk: chunkIdx, error: `clientStorage 저장 실패: ${e.message}` });
      }

      emit('chunk', done, flat.length, { chunkIdx, chunkTotal, created: chunkReport.created, failed: chunkReport.failed });
      await new Promise(r => setTimeout(r, 50));
    }

    // 재시도 큐 1회
    if (report.retryQueue.length) {
      emit('retry', 0, report.retryQueue.length);
      const retryList = report.retryQueue.slice();
      report.retryQueue = [];
      for (const entry of retryList) {
        try {
          await createNode(entry, idMap, rootFrame);
          report.stats.retried++;
          report.stats.created++;
          report.stats.failed = Math.max(0, report.stats.failed - 1);
        } catch (err) {
          report.retryQueue.push({ id: entry.id, tag: entry.node.tag, error: String(err.message || err).slice(0, 200) });
        }
      }
      try { await figma.clientStorage.setAsync(`pushIdMap_${SESSION}`, idMap); } catch (e) {}
    }

    // 실체 대조
    emit('verify', 0, Object.keys(idMap).length);
    let verifyDone = 0;
    for (const [localId, figmaId] of Object.entries(idMap)) {
      const actual = await figma.getNodeByIdAsync(figmaId);
      if (actual) {
        report.stats.verified++;
      } else {
        report.verifyMismatch.push({ localId, figmaId });
      }
      verifyDone++;
      if (verifyDone % 50 === 0) emit('verify', verifyDone, Object.keys(idMap).length);
    }
    emit('verify', verifyDone, Object.keys(idMap).length);

    // 집계
    const sumCheck = report.stats.created + report.stats.failed + report.stats.skipped;
    const equation = `${report.stats.created} + ${report.stats.failed} + ${report.stats.skipped} = ${sumCheck} / total ${report.stats.total - 1}`;
    const equationValid = sumCheck === report.stats.total - 1;

    report.durationMs = Date.now() - t0;
    report.equation = equation;
    report.equationValid = equationValid;
    const verifiedExBody = Math.max(0, report.stats.verified - 1);
    const totalExBody = Math.max(1, report.stats.total - 1);
    report.successRate = verifiedExBody / totalExBody;
    report.finishedAt = new Date().toISOString();

    // fileKey 회수
    try { report.fileKey = (typeof figma.fileKey === 'string' && figma.fileKey) || null; } catch (e) { report.fileKey = null; }
    try { report.fileName = (figma.root && figma.root.name) || null; } catch (e) { report.fileName = null; }

    figma.notify(`Push: ${verifiedExBody}/${totalExBody} verified · ${report.retryQueue.length} unrecovered`, { timeout: 4000 });
    figma.ui.postMessage({ type: 'push-done', ok: true, report });
    return { ok: true, report };
  } catch (err) {
    report.durationMs = Date.now() - t0;
    report.fatal = String(err.message || err);
    figma.notify(`Push FATAL: ${report.fatal}`, { error: true, timeout: 5000 });
    figma.ui.postMessage({ type: 'push-done', ok: false, report, error: report.fatal });
    return { ok: false, report, error: report.fatal };
  }
}

// ─────────────────────────────────────────────────────────────
// UI 메시지 라우팅 (push-only)
// ─────────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'push-json') { await handlePushJson(msg); return; }
  if (msg.type === 'notify') {
    figma.notify(String(msg.message || ''), { timeout: msg.timeout || 2000, error: !!msg.error });
    return;
  }
  if (msg.type === 'close') { figma.closePlugin(); return; }
};

console.log('[FigCli plan-sb push-only] plugin loaded');

// ─────────────────────────────────────────────────────────────
// Daemon bridge — polling loop
// ─────────────────────────────────────────────────────────────

const DAEMON_URL = 'http://localhost:3457';
let pollBusy = false;
let lastPollOk = false;

function postToUi(type, extra) {
  try { figma.ui.postMessage(Object.assign({ type }, extra || {})); } catch (_) {}
}

async function daemonFetch(path, opts) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
  const r = await fetch(DAEMON_URL + path, Object.assign({ headers }, opts || {}));
  return r;
}

async function pollOnce() {
  if (pollBusy) return;
  pollBusy = true;
  try {
    const r = await daemonFetch('/job/next', { method: 'GET' });
    if (r.status === 204) { lastPollOk = true; postToUi('daemon-status', { ok: true, listening: true }); return; }
    if (!r.ok) { lastPollOk = false; postToUi('daemon-status', { ok: false, error: 'HTTP ' + r.status }); return; }
    lastPollOk = true;
    const job = await r.json();
    postToUi('job-received', { jobId: job.id });
    figma.notify('Job received: ' + job.id, { timeout: 2000 });

    const payload = job.payload || {};
    const kind = payload.kind || 'push';
    let result;
    try {
      if (kind === 'push') {
        result = await handlePushJson(payload, { jobId: job.id });
        result = result || { ok: true };
      } else {
        result = { error: 'unsupported kind: ' + kind + ' (push-only build)' };
      }
    } catch (e) {
      result = { error: String((e && e.message) || e) };
    }
    await daemonFetch(`/job/${job.id}/result`, { method: 'POST', body: JSON.stringify(result || {}) }).catch(() => {});
    postToUi('job-done', { jobId: job.id, result });
  } catch (e) {
    lastPollOk = false;
    postToUi('daemon-status', { ok: false, error: String((e && e.message) || e) });
  } finally {
    pollBusy = false;
  }
}

const POLL_INTERVAL = 2000;
setInterval(() => { pollOnce(); }, POLL_INTERVAL);
setTimeout(() => { pollOnce(); }, 300);
