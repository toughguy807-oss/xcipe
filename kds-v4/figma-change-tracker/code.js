// Change Tracker - Figma Plugin
// 디자이너의 피그마 수정사항을 실시간으로 감지하여 변경 로그를 생성

const changeLog = [];
const PROP_MERGE_INTERVAL = 2000; // 2초 이내 같은 노드의 속성변경은 병합
const BURST_WINDOW = 500;          // 500ms 이내 CREATE/DELETE는 한 덩어리로

// 속성 변경 병합 버퍼: nodeId+type -> { change, properties, ... , timer }
const pendingChanges = {};

// CREATE/DELETE burst 버퍼
let burstBuffer = [];
let burstTimer = null;

// import 중 발생하는 변경은 무시 (import 끝난 뒤 사용자 편집만 추적)
let suppressUntil = 0;

// 각 importDesign 호출마다 리셋. SVG 파싱·이미지 fetch 실패 등 진단 정보 누적.
// 완료 시 figma.notify + 콘솔로 보고.
let importDiagnostics = [];

figma.showUI(__html__, { width: 480, height: 600 });

figma.on('documentchange', (event) => {
  if (Date.now() < suppressUntil) return;
  for (const change of event.documentChanges) {
    handleChange(change);
  }
});

// 페이지 변경 시 UI 의 시안 셀렉트 갱신
figma.on('currentpagechange', () => { sendScreensList(); sendSelectionScreen(); });
// 선택 노드가 바뀔 때마다 UI 에 "현재 선택 시안" 통지
figma.on('selectionchange', () => sendSelectionScreen());
// 초기 진입 시 한 번 알림 (UI 가 onmessage 핸들러 붙기 전 호출 방지용 약간 지연)
setTimeout(() => { sendScreensList(); sendSelectionScreen(); }, 150);

function handleChange(change) {
  if (change.type === 'CREATE' || change.type === 'DELETE') {
    addToBurst(change);
    return;
  }
  if (change.type === 'STYLE_CREATE' || change.type === 'STYLE_DELETE') {
    const entry = buildStyleEntry(change);
    if (entry) pushEntry(entry);
    return;
  }
  // PROPERTY_CHANGE, STYLE_PROPERTY_CHANGE
  mergeProperty(change);
}

/* ---------- BURST (대량 CREATE/DELETE) ---------- */

function addToBurst(change) {
  // DELETE는 나중에 getNodeById가 안 되므로 지금 이름/부모 스냅샷
  const snapshot = { change: change, capturedAt: Date.now() };
  if (change.type === 'CREATE') {
    const node = figma.getNodeById(change.id);
    if (node) {
      snapshot.nodeName = node.name;
      snapshot.nodeType = node.type;
      snapshot.parent = node.parent;
      snapshot.parentPath = getNodePath(node.parent);
      snapshot.childCount = ('children' in node) ? node.children.length : 0;
    }
  } else {
    snapshot.nodeName = change.name || '(unknown)';
  }
  burstBuffer.push(snapshot);

  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = setTimeout(flushBurst, BURST_WINDOW);
}

function flushBurst() {
  if (burstBuffer.length === 0) return;
  const buffer = burstBuffer;
  burstBuffer = [];
  burstTimer = null;

  const creates = buffer.filter(b => b.change.type === 'CREATE');
  const deletes = buffer.filter(b => b.change.type === 'DELETE');

  if (creates.length > 0) emitCreates(creates);
  if (deletes.length > 0) emitDeletes(deletes);
}

function emitCreates(items) {
  // 부모별로 그룹핑
  const groups = {};
  for (const it of items) {
    const parentKey = it.parent ? it.parent.id : 'root';
    if (!groups[parentKey]) {
      groups[parentKey] = {
        parentName: it.parent ? it.parent.name : '(root)',
        parentPath: it.parentPath || '',
        items: []
      };
    }
    groups[parentKey].items.push({
      id: it.change.id,
      name: it.nodeName || '(unknown)',
      type: it.nodeType || '(unknown)',
      childCount: it.childCount || 0
    });
  }

  for (const key of Object.keys(groups)) {
    const g = groups[key];
    if (g.items.length === 1) {
      const it = g.items[0];
      const entry = {
        timestamp: nowStamp(),
        type: 'CREATE',
        nodeId: it.id,
        nodeName: it.name,
        nodeType: it.type,
        parentPath: g.parentPath,
        detail: '새 요소 추가됨'
          + (g.parentPath ? ' · 위치: ' + g.parentPath : '')
          + (it.childCount ? ' · 자식 ' + it.childCount + '개 포함' : '')
      };
      attachScreenInfo(entry, figma.getNodeById(it.id));
      pushEntry(entry);
    } else {
      const preview = g.items.slice(0, 3).map(i => i.name).join(', ');
      const more = g.items.length > 3 ? ' 외 ' + (g.items.length - 3) + '개' : '';
      const entry = {
        timestamp: nowStamp(),
        type: 'BULK_CREATE',
        count: g.items.length,
        parentPath: g.parentPath,
        parentName: g.parentName,
        items: g.items,
        nodeName: '(' + g.items.length + '개 요소)',
        detail: g.items.length + "개 요소가 '" + g.parentName + "'에 추가됨 · "
          + preview + more
      };
      attachScreenInfo(entry, figma.getNodeById(g.items[0].id));
      pushEntry(entry);
    }
  }
}

function emitDeletes(items) {
  if (items.length === 1) {
    const it = items[0];
    pushEntry({
      timestamp: nowStamp(),
      type: 'DELETE',
      nodeId: it.change.id,
      nodeName: it.nodeName,
      nodeType: '(deleted)',
      detail: '요소 삭제됨'
    });
  } else {
    const names = items.map(it => it.nodeName);
    const preview = names.slice(0, 3).join(', ');
    const more = names.length > 3 ? ' 외 ' + (names.length - 3) + '개' : '';
    pushEntry({
      timestamp: nowStamp(),
      type: 'BULK_DELETE',
      count: items.length,
      items: items.map(it => ({ id: it.change.id, name: it.nodeName })),
      nodeName: '(' + items.length + '개 요소)',
      detail: items.length + '개 요소 삭제됨 · ' + preview + more
    });
  }
}

/* ---------- PROPERTY_CHANGE 병합 + 실제 값 캡처 ---------- */

function mergeProperty(change) {
  const key = change.id + ':' + change.type;
  const properties = change.properties || [];

  if (pendingChanges[key]) {
    clearTimeout(pendingChanges[key].timer);
    for (const prop of properties) {
      if (!pendingChanges[key].properties.includes(prop)) {
        pendingChanges[key].properties.push(prop);
      }
    }
    const node = figma.getNodeById(change.id);
    if (node) pendingChanges[key].nodeName = node.name;
  } else {
    const node = figma.getNodeById(change.id);
    pendingChanges[key] = {
      change: change,
      properties: [...properties],
      nodeName: node ? node.name : '(unknown)',
      nodeType: node ? node.type : '(unknown)',
      startTime: new Date()
    };
  }

  pendingChanges[key].timer = setTimeout(() => flushProperty(key), PROP_MERGE_INTERVAL);
}

function flushProperty(key) {
  const pending = pendingChanges[key];
  if (!pending) return;

  const timestamp = pending.startTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const isStyle = pending.change.type === 'STYLE_PROPERTY_CHANGE';
  const node = !isStyle ? figma.getNodeById(pending.change.id) : null;

  // 현재 값 스냅샷 (before는 플러그인 API로 접근 불가 → 변경 후 값만)
  const values = {};
  if (node) {
    for (const prop of pending.properties) {
      const v = serializeValue(node, prop);
      if (v !== undefined) values[prop] = v;
    }
  }

  const parts = pending.properties.map(p =>
    values[p] !== undefined ? (p + ': ' + values[p]) : p
  );

  const entry = {
    timestamp: timestamp,
    type: pending.change.type,
    properties: pending.properties,
    values: values,
    detail: (isStyle ? '스타일 속성 변경 · ' : '속성 변경 · ') + parts.join(', ')
  };

  if (isStyle) {
    entry.styleId = pending.change.id;
  } else {
    entry.nodeId = pending.change.id;
    entry.nodeName = pending.nodeName;
    entry.nodeType = pending.nodeType;
    if (node) {
      entry.parentPath = getNodePath(node.parent);
      attachScreenInfo(entry, node);
      // parent 속성이 바뀌었다면 "이동됨"으로 강조
      if (pending.properties.indexOf('parent') !== -1) {
        entry.detail = '위치 이동 · ' + (entry.parentPath || '(root)') + ' 로 이동'
          + (parts.length > 1 ? ' · 추가 변경: ' + parts.filter(p => p.indexOf('parent') !== 0).join(', ') : '');
      }
    }
  }

  pushEntry(entry);
  delete pendingChanges[key];
}

/* ---------- 값 직렬화 ---------- */

function serializeValue(node, prop) {
  try {
    const val = node[prop];
    if (val === undefined || val === null) return undefined;
    if (val === figma.mixed) return '(mixed)';

    if (prop === 'fills' || prop === 'strokes' || prop === 'backgrounds') {
      return serializePaints(val);
    }
    if (prop === 'characters') {
      return typeof val === 'string'
        ? (val.length > 60 ? '"' + val.slice(0, 60) + '…"' : '"' + val + '"')
        : '(mixed)';
    }
    if (prop === 'fontName' && typeof val === 'object') {
      return val.family + ' ' + val.style;
    }
    if (prop === 'effects') return serializeEffects(val);
    if (prop === 'parent') {
      return val && val.name ? val.name : undefined;
    }
    if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height' || prop === 'rotation') {
      return Math.round(val * 100) / 100;
    }
    if (typeof val === 'number') return Math.round(val * 1000) / 1000;
    if (typeof val === 'string' || typeof val === 'boolean') return val;
    if (typeof val === 'object') {
      try { return JSON.stringify(val); } catch (e) { return '(object)'; }
    }
    return String(val);
  } catch (e) {
    return undefined;
  }
}

function serializePaints(paints) {
  if (paints === figma.mixed) return '(mixed)';
  if (!Array.isArray(paints)) return undefined;
  if (paints.length === 0) return '(none)';
  return paints.map(p => {
    if (p.visible === false) return '(hidden)';
    if (p.type === 'SOLID' && p.color) {
      const r = Math.round(p.color.r * 255);
      const g = Math.round(p.color.g * 255);
      const b = Math.round(p.color.b * 255);
      const toHex = (n) => {
        var s = n.toString(16);
        return s.length < 2 ? '0' + s : s;
      };
      const hex = '#' + toHex(r) + toHex(g) + toHex(b);
      const op = (p.opacity !== undefined && p.opacity < 1)
        ? ' @' + Math.round(p.opacity * 100) + '%'
        : '';
      return hex + op;
    }
    return p.type;
  }).join(', ');
}

function serializeEffects(effects) {
  if (!Array.isArray(effects)) return undefined;
  const parts = effects.filter(e => e.visible !== false).map(e => {
    if ((e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.offset) {
      return e.type + ' ' + e.offset.x + ',' + e.offset.y + ' r' + e.radius;
    }
    return e.type;
  });
  return parts.length ? parts.join(' | ') : '(none)';
}

function getNodePath(node, maxDepth) {
  maxDepth = maxDepth || 4;
  if (!node) return '';
  const parts = [];
  let cur = node;
  let depth = 0;
  while (cur && cur.type !== 'DOCUMENT' && depth < maxDepth) {
    parts.unshift(cur.name);
    cur = cur.parent;
    depth++;
  }
  return parts.join(' > ');
}

/* ---------- 시안 식별: 노드가 속한 최상위 frame(currentPage 직속) 추출 ---------- */
function getScreenInfo(node) {
  if (!node) return null;
  let cur = node;
  while (cur && cur.parent && cur.parent.type !== 'PAGE') {
    cur = cur.parent;
  }
  if (!cur || cur.type === 'PAGE' || cur.type === 'DOCUMENT') return null;
  if (!cur.parent || cur.parent.type !== 'PAGE') return null;
  const kdsId = ('getPluginData' in cur) ? (cur.getPluginData('kdsId') || '') : '';
  return { screenNodeId: cur.id, screenName: cur.name, screenKdsId: kdsId };
}

function attachScreenInfo(entry, node) {
  const info = getScreenInfo(node);
  if (info) {
    entry.screenNodeId = info.screenNodeId;
    entry.screenName = info.screenName;
    if (info.screenKdsId) entry.screenKdsId = info.screenKdsId;
  }
}

function getScreensList() {
  const screens = [];
  const page = figma.currentPage;
  if (!page) return screens;
  for (const child of page.children) {
    const t = child.type;
    if (t === 'FRAME' || t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'SECTION' || t === 'GROUP') {
      const kdsId = ('getPluginData' in child) ? (child.getPluginData('kdsId') || '') : '';
      screens.push({ nodeId: child.id, name: child.name, kdsId: kdsId, type: t });
    }
  }
  return screens;
}

function sendScreensList() {
  try {
    figma.ui.postMessage({ type: 'screens-list', screens: getScreensList() });
  } catch (e) { /* UI 아직 미준비 */ }
}

/* ---------- 현재 selection 의 시안 추적 ---------- */
function getSelectionScreen() {
  const sel = figma.currentPage.selection;
  if (!sel || sel.length === 0) return null;
  // 여러 노드 선택 시 첫 노드 기준. 첫 노드가 이미 페이지 직속 frame 이면 그 자체가 시안.
  const info = getScreenInfo(sel[0]);
  if (!info) {
    // 첫 노드가 페이지 직속 frame 자체일 때 getScreenInfo 가 null 반환할 수 있음 — 직접 처리
    const n = sel[0];
    if (n && n.parent && n.parent.type === 'PAGE') {
      const kdsId = ('getPluginData' in n) ? (n.getPluginData('kdsId') || '') : '';
      return { screenNodeId: n.id, screenName: n.name, screenKdsId: kdsId };
    }
  }
  return info;
}

function sendSelectionScreen() {
  try {
    figma.ui.postMessage({ type: 'selection-screen', screen: getSelectionScreen() });
  } catch (e) { /* UI 아직 미준비 */ }
}

function nowStamp() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function buildStyleEntry(change) {
  const timestamp = nowStamp();
  if (change.type === 'STYLE_CREATE') {
    return { timestamp, type: 'STYLE_CREATE', styleId: change.id, detail: '새 스타일 추가됨' };
  }
  if (change.type === 'STYLE_DELETE') {
    return { timestamp, type: 'STYLE_DELETE', styleId: change.id, detail: '스타일 삭제됨' };
  }
  return null;
}

function pushEntry(entry) {
  changeLog.push(entry);
  figma.ui.postMessage({ type: 'new-change', entry });
}

/* ---------- Figma 레이어 생성 (Send to Figma 수신측) ---------- */

function hexToRgb(hex) {
  if (typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const m = hex.replace('#', '');
  const s = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255
  };
}

function normalizePaint(p) {
  if (!p) return null;
  if (p.type === 'SOLID') {
    // parseRgbaColor 가 #hex / #hex8 / rgba(...) / {r,g,b,a} 를 모두 파싱.
    // alpha 우선순위: paint level opacity 명시 > color 의 a > 1
    const color = parseRgbaColor(p.color);
    return {
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b },
      opacity: p.opacity !== undefined ? p.opacity : color.a
    };
  }
  if (p.type === 'GRADIENT_LINEAR' || p.type === 'GRADIENT_RADIAL' ||
      p.type === 'GRADIENT_ANGULAR' || p.type === 'GRADIENT_DIAMOND') {
    return normalizeGradient(p);
  }
  return p;
}

// rgba/{r,g,b,a}/#hex/#hex8 → {r,g,b,a} (0~1)
function parseRgbaColor(c) {
  if (!c) return { r: 0, g: 0, b: 0, a: 1 };
  if (typeof c === 'string') {
    if (c.startsWith('#')) {
      const m = c.replace('#', '');
      const expanded = m.length === 3 ? m.split('').map(ch => ch + ch).join('') : m;
      const r = parseInt(expanded.slice(0, 2), 16) / 255;
      const g = parseInt(expanded.slice(2, 4), 16) / 255;
      const b = parseInt(expanded.slice(4, 6), 16) / 255;
      const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
      return { r: r || 0, g: g || 0, b: b || 0, a };
    }
    const m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      return {
        r: (parts[0] || 0) / 255,
        g: (parts[1] || 0) / 255,
        b: (parts[2] || 0) / 255,
        a: parts[3] !== undefined ? parts[3] : 1
      };
    }
  }
  if (typeof c === 'object') {
    return {
      r: c.r !== undefined ? c.r : 0,
      g: c.g !== undefined ? c.g : 0,
      b: c.b !== undefined ? c.b : 0,
      a: c.a !== undefined ? c.a : 1
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

// CSS angle(deg) → Figma 2x3 transform matrix (linear gradient)
// CSS 0deg = 위로(↑), 90deg = 오른쪽(→), 180deg = 아래(↓), 270deg = 왼쪽(←)
// Figma identity transform 의 LINEAR 는 좌→우(=CSS 90deg) 이므로 (deg - 90)으로 보정
// 결과적으로 CSS deg 와 동일한 방향으로 그려짐 (180 = 위→아래, 90 = 좌→우)
function angleToGradientTransform(deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
    [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos]
  ];
}

function normalizeGradient(p) {
  const stops = Array.isArray(p.gradientStops) ? p.gradientStops.map(s => ({
    position: s.position !== undefined ? s.position : 0,
    color: parseRgbaColor(s.color)
  })) : [];
  let transform = p.gradientTransform;
  if (!transform && typeof p.angle === 'number') {
    transform = angleToGradientTransform(p.angle);
  }
  if (!transform) {
    // 기본: 위 → 아래 (CSS 180deg)
    transform = [[1, 0, 0], [0, 1, 0]];
  }
  return {
    type: p.type,
    gradientStops: stops,
    gradientTransform: transform,
    opacity: p.opacity !== undefined ? p.opacity : 1
  };
}

// effects: DROP_SHADOW / INNER_SHADOW / LAYER_BLUR / BACKGROUND_BLUR
function normalizeEffect(e) {
  if (!e || !e.type) return null;
  const t = String(e.type).toUpperCase();
  if (t === 'DROP_SHADOW' || t === 'INNER_SHADOW') {
    return {
      type: t,
      color: parseRgbaColor(e.color),
      offset: {
        x: (e.offset && typeof e.offset.x === 'number') ? e.offset.x : 0,
        y: (e.offset && typeof e.offset.y === 'number') ? e.offset.y : 0
      },
      radius: typeof e.radius === 'number' ? e.radius : 0,
      spread: typeof e.spread === 'number' ? e.spread : 0,
      visible: e.visible !== false,
      blendMode: e.blendMode || 'NORMAL'
    };
  }
  if (t === 'LAYER_BLUR' || t === 'BACKGROUND_BLUR') {
    return {
      type: t,
      radius: typeof e.radius === 'number' ? e.radius : 0,
      visible: e.visible !== false
    };
  }
  return null;
}

async function createNodeFromSpec(spec, fontSet, imageRequests) {
  let node;
  const type = (spec.type || 'FRAME').toUpperCase();

  // SVG: figma.createNodeFromSvg로 진짜 벡터 노드 생성. 자식 vector들은 SCALE 제약 자동 적용
  if (type === 'SVG') {
    let frame;
    const label = spec.kdsId || spec.name || '(unnamed)';
    if (typeof spec.svg !== 'string' || spec.svg.indexOf('<svg') === -1) {
      importDiagnostics.push({
        kind: 'svg-missing',
        node: label,
        reason: 'spec.svg 가 비어있거나 <svg> 태그 없음 — inject-svg.mjs 미실행 가능성'
      });
    } else {
      try {
        frame = figma.createNodeFromSvg(spec.svg);
      } catch (e) {
        importDiagnostics.push({
          kind: 'svg-parse-failed',
          node: label,
          reason: String(e && e.message || e),
          svgPreview: spec.svg.slice(0, 80)
        });
        console.warn('SVG parse failed for', label, e);
      }
    }
    if (!frame) {
      // fallback — 잘못된 svg면 빈 frame으로 대체 (이전 동작과 호환)
      frame = figma.createFrame();
      frame.fills = [];
      importDiagnostics.push({
        kind: 'svg-fallback',
        node: label,
        reason: '빈 FRAME으로 대체됨 — Figma에서 빈 박스로 보임'
      });
    }

    // figma.createNodeFromSvg 가 반환한 frame 은 기본 흰색 배경이 박혀 있음.
    // SVG 의 frame 자체는 투명해야 정상 (HTML <svg> 도 기본 transparent).
    // spec.fills 는 SVG 내부 vector 색상 치환용이라 frame fill 과 무관.
    if ('fills' in frame) {
      try { frame.fills = []; } catch (e) {}
    }

    if (spec.name) frame.name = spec.name;
    if (spec.kdsId && 'setPluginData' in frame) frame.setPluginData('kdsId', String(spec.kdsId));

    // 크기: spec.width/height가 있으면 resize. 자식 벡터들은 SCALE 제약이라 함께 비례 스케일
    if (spec.width !== undefined || spec.height !== undefined) {
      const w = spec.width !== undefined ? spec.width : frame.width;
      const h = spec.height !== undefined ? spec.height : frame.height;
      try { frame.resize(w, h); } catch (e) {}
    }

    // recolor: spec.fills가 있으면 내부 SOLID 채우기/스트로크를 KDS 토큰 컬러로 일괄 교체
    // (그라데이션·이미지·복잡 paint는 보존)
    if (spec.fills && Array.isArray(spec.fills) && spec.fills.length > 0) {
      const newPaints = spec.fills.map(normalizePaint).filter(Boolean);
      const recolor = (n) => {
        if ('fills' in n && Array.isArray(n.fills) && n.fills.length > 0) {
          if (n.fills.every(f => f.type === 'SOLID')) {
            try { n.fills = newPaints; } catch (e) {}
          }
        }
        if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0) {
          if (n.strokes.every(s => s.type === 'SOLID')) {
            try { n.strokes = newPaints; } catch (e) {}
          }
        }
        if ('children' in n) {
          for (const c of n.children) recolor(c);
        }
      };
      recolor(frame);
    }

    if (spec.opacity !== undefined && 'opacity' in frame) frame.opacity = spec.opacity;
    if (spec.x !== undefined) frame.x = spec.x;
    if (spec.y !== undefined) frame.y = spec.y;

    return frame;
  }

  if (type === 'TEXT') {
    node = figma.createText();
    const family = (spec.fontName && spec.fontName.family) || 'Inter';
    const style = (spec.fontName && spec.fontName.style) || 'Regular';
    const key = family + '|' + style;
    if (!fontSet.has(key)) {
      try { await figma.loadFontAsync({ family, style }); fontSet.add(key); }
      catch (e) {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        fontSet.add('Inter|Regular');
      }
    }
    try { node.fontName = { family, style }; } catch (e) {}
    if (spec.fontSize) node.fontSize = spec.fontSize;

    // lineHeight: spec에서 숫자(px) 또는 객체 {unit,value} 지원 — CSS line-height와 높이 일치
    if (spec.lineHeight !== undefined) {
      try {
        if (typeof spec.lineHeight === 'number') {
          node.lineHeight = { unit: 'PIXELS', value: spec.lineHeight };
        } else if (typeof spec.lineHeight === 'object' && spec.lineHeight !== null) {
          node.lineHeight = spec.lineHeight;
        }
      } catch (e) {}
    }
    // letterSpacing: 숫자(px) 또는 객체 지원
    if (spec.letterSpacing !== undefined) {
      try {
        if (typeof spec.letterSpacing === 'number') {
          node.letterSpacing = { unit: 'PIXELS', value: spec.letterSpacing };
        } else if (typeof spec.letterSpacing === 'object' && spec.letterSpacing !== null) {
          node.letterSpacing = spec.letterSpacing;
        }
      } catch (e) {}
    }
    // textAutoResize: 기본 'HEIGHT'(너비 고정, 높이 자동) — 컨테이너 폭에 맞춰 줄바꿈
    if (spec.textAutoResize) {
      try { node.textAutoResize = spec.textAutoResize; } catch (e) {}
    }
    // 함정 #8/#16 회피: textAutoResize 'HEIGHT' 적용 직후엔 createText 의 기본 width(≈0)가 fix 되므로,
    // characters 박기 전에 spec.width 로 미리 resize 해야 한 글자씩 줄바꿈 + 부모 height 부풀림이 안 생긴다.
    if (spec.width !== undefined && spec.textAutoResize === 'HEIGHT') {
      try { node.resize(spec.width, Math.max(1, node.height)); } catch (e) {}
    }
    // textAlignHorizontal / textAlignVertical
    if (spec.textAlignHorizontal) {
      try { node.textAlignHorizontal = spec.textAlignHorizontal; } catch (e) {}
    }
    if (spec.textAlignVertical) {
      try { node.textAlignVertical = spec.textAlignVertical; } catch (e) {}
    }
    // textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' (CSS text-transform 매핑)
    if (spec.textCase) {
      try { node.textCase = spec.textCase; } catch (e) {}
    }
    // textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
    if (spec.textDecoration) {
      try { node.textDecoration = spec.textDecoration; } catch (e) {}
    }
    // paragraphSpacing: 단락 사이 px 간격
    if (typeof spec.paragraphSpacing === 'number') {
      try { node.paragraphSpacing = spec.paragraphSpacing; } catch (e) {}
    }
    // paragraphIndent: 단락 첫 줄 들여쓰기 px
    if (typeof spec.paragraphIndent === 'number') {
      try { node.paragraphIndent = spec.paragraphIndent; } catch (e) {}
    }

    node.characters = spec.characters || '';
  } else if (type === 'RECTANGLE') {
    node = figma.createRectangle();
  } else if (type === 'ELLIPSE') {
    node = figma.createEllipse();
  } else if (type === 'LINE') {
    node = figma.createLine();
  } else {
    node = figma.createFrame();
  }

  if (spec.name) node.name = spec.name;
  if (spec.kdsId && 'setPluginData' in node) node.setPluginData('kdsId', String(spec.kdsId));

  // --- 1. 비주얼 프로퍼티 먼저 (크기·레이아웃 전) ---
  if (spec.fills && 'fills' in node) {
    node.fills = spec.fills.map(normalizePaint).filter(Boolean);
  }
  if (spec.strokes && 'strokes' in node) {
    node.strokes = spec.strokes.map(normalizePaint).filter(Boolean);
    // strokeAlign 기본값을 INSIDE로 강제 (CSS border와 동일 — 카드 외곽 드리프트 방지)
    // Figma 기본값 CENTER는 1px 스트로크가 양쪽으로 0.5px씩 튀어나와 중첩 카드마다 누적 오차 발생
    if ('strokeAlign' in node) node.strokeAlign = spec.strokeAlign || 'INSIDE';
  }
  if (spec.strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = spec.strokeWeight;
  }
  if (spec.cornerRadius !== undefined && 'cornerRadius' in node) {
    node.cornerRadius = spec.cornerRadius;
  }
  // 모서리별 반경 (좌상/우상/좌하/우하 개별 지정 시)
  if ('topLeftRadius' in node) {
    if (spec.topLeftRadius !== undefined) node.topLeftRadius = spec.topLeftRadius;
    if (spec.topRightRadius !== undefined) node.topRightRadius = spec.topRightRadius;
    if (spec.bottomLeftRadius !== undefined) node.bottomLeftRadius = spec.bottomLeftRadius;
    if (spec.bottomRightRadius !== undefined) node.bottomRightRadius = spec.bottomRightRadius;
  }
  if (spec.opacity !== undefined && 'opacity' in node) node.opacity = spec.opacity;
  // effects: 그림자 / 블러 (CSS box-shadow / backdrop-filter 대응)
  if (Array.isArray(spec.effects) && 'effects' in node) {
    try {
      const eff = spec.effects.map(normalizeEffect).filter(Boolean);
      if (eff.length > 0) node.effects = eff;
    } catch (e) {}
  }
  // blendMode: 'NORMAL' | 'MULTIPLY' | 'SCREEN' | 'OVERLAY' 등
  if (spec.blendMode && 'blendMode' in node) {
    try { node.blendMode = spec.blendMode; } catch (e) {}
  }
  // clipsContent: 자식이 프레임 경계 밖으로 튀어나오는 것을 자르는지 여부.
  // Figma 기본값은 true(자르기 ON)지만, 자식 그림자/블러가 잘려 보이는 문제(함정 #5)를
  // 기본 동작에서 막기 위해 이 plugin 은 spec 미명시 시 false 를 박는다.
  // spec.clipsContent 가 명시되면 그 값을 우선 (true 박은 케이스는 자르기 의도).
  if ('clipsContent' in node) {
    try {
      node.clipsContent = (spec.clipsContent !== undefined) ? spec.clipsContent : false;
    } catch (e) {}
  }
  // layoutGrow: 자식이 부모 primary axis 의 남는 공간을 채움 (CSS flex-grow 와 동일)
  // CSS의 `flex: 1` 또는 `flex-grow: 1` 매핑. 부모가 HORIZONTAL/VERTICAL auto-layout 일 때만 의미.
  if (spec.layoutGrow !== undefined && 'layoutGrow' in node) {
    try { node.layoutGrow = spec.layoutGrow; } catch (e) {}
  }
  // layoutAlign: 자식의 counter axis 정렬 ('STRETCH' | 'INHERIT' | 'MIN' | 'CENTER' | 'MAX')
  // 'STRETCH' = 부모 counter axis 꽉 채우기
  if (spec.layoutAlign && 'layoutAlign' in node) {
    try { node.layoutAlign = spec.layoutAlign; } catch (e) {}
  }

  // --- 2. 오토레이아웃 먼저 설정 (children 추가 전) ---
  // Figma 권장 순서: layoutMode → padding/spacing/alignment → children → sizing modes
  const L = (spec.layout && node.type === 'FRAME' &&
             (spec.layout.mode === 'HORIZONTAL' || spec.layout.mode === 'VERTICAL'))
           ? spec.layout : null;
  if (L) {
    node.layoutMode = L.mode;
    if (L.padding !== undefined) {
      node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = L.padding;
    }
    if (L.paddingTop !== undefined) node.paddingTop = L.paddingTop;
    if (L.paddingBottom !== undefined) node.paddingBottom = L.paddingBottom;
    if (L.paddingLeft !== undefined) node.paddingLeft = L.paddingLeft;
    if (L.paddingRight !== undefined) node.paddingRight = L.paddingRight;
    if (L.itemSpacing !== undefined) node.itemSpacing = L.itemSpacing;
    if (L.primaryAxisAlign) node.primaryAxisAlignItems = L.primaryAxisAlign;
    if (L.counterAxisAlign) node.counterAxisAlignItems = L.counterAxisAlign;
    // layoutWrap: 'NO_WRAP' | 'WRAP' — HORIZONTAL 모드에서 자식이 넘치면 다음 줄로 (CSS flex-wrap: wrap)
    // 컨테이너 width 가 고정돼있어야 의미 있음 (counterAxisSizing FIXED + width 명시)
    if (L.layoutWrap && 'layoutWrap' in node) {
      try { node.layoutWrap = L.layoutWrap; } catch (e) {}
    }
    // counterAxisSpacing: WRAP 시 줄 간 간격 (CSS row-gap)
    if (L.counterAxisSpacing !== undefined && 'counterAxisSpacing' in node) {
      try { node.counterAxisSpacing = L.counterAxisSpacing; } catch (e) {}
    }
    // sizing modes는 children 추가 후에 설정 (AUTO 축 크기 계산 기회 부여)
  }

  // --- 3. 자식 추가 (layout 규칙 아래에서) ---
  if (spec.children && Array.isArray(spec.children) && 'appendChild' in node) {
    for (const childSpec of spec.children) {
      const child = await createNodeFromSpec(childSpec, fontSet, imageRequests);
      if (child) {
        node.appendChild(child);
        // 함정 #16: layoutGrow / layoutAlign 는 자식 createNodeFromSpec 안에서 set 시도되지만
        // 그 시점엔 부모가 없어 silently fail. 부모에 appendChild 된 직후 다시 박아야 figma 가 받음.
        if (childSpec.layoutGrow !== undefined && 'layoutGrow' in child) {
          try { child.layoutGrow = childSpec.layoutGrow; } catch (e) {}
        }
        if (childSpec.layoutAlign && 'layoutAlign' in child) {
          try { child.layoutAlign = childSpec.layoutAlign; } catch (e) {}
        }
      }
    }
  }

  // --- 4. sizing modes + 크기 제약 (children 배치 후) ---
  if (L) {
    if (L.primaryAxisSizing) node.primaryAxisSizingMode = L.primaryAxisSizing;
    if (L.counterAxisSizing) node.counterAxisSizingMode = L.counterAxisSizing;
    if (L.minWidth !== undefined && 'minWidth' in node) node.minWidth = L.minWidth;
    if (L.maxWidth !== undefined && 'maxWidth' in node) node.maxWidth = L.maxWidth;
    if (L.minHeight !== undefined && 'minHeight' in node) node.minHeight = L.minHeight;
    if (L.maxHeight !== undefined && 'maxHeight' in node) node.maxHeight = L.maxHeight;

    // width/height가 명시됐지만 해당 축이 AUTO인 경우 → 자동으로 min으로 승격
    // (버튼 height 44 + AUTO가 내용에 맞춰 쪼그라들어 40px 되는 문제 방지 — CSS min-height와 동일 의미)
    const isHorizontal = L.mode === 'HORIZONTAL';
    // HORIZONTAL: primary = width, counter = height
    // VERTICAL: primary = height, counter = width
    if (spec.width !== undefined && 'minWidth' in node) {
      const widthAxisSizing = isHorizontal ? L.primaryAxisSizing : L.counterAxisSizing;
      if (widthAxisSizing === 'AUTO' && L.minWidth === undefined) {
        try { node.minWidth = spec.width; } catch (e) {}
      }
    }
    if (spec.height !== undefined && 'minHeight' in node) {
      const heightAxisSizing = isHorizontal ? L.counterAxisSizing : L.primaryAxisSizing;
      if (heightAxisSizing === 'AUTO' && L.minHeight === undefined) {
        try { node.minHeight = spec.height; } catch (e) {}
      }
    }
  }

  // --- 5. resize (마지막) — FIXED 축이거나 auto-layout이 없는 경우만 의미 있음 ---
  // auto-layout의 AUTO 축은 Figma가 자동 계산하므로 resize 값이 즉시 덮어쓰여짐
  if ((spec.width !== undefined || spec.height !== undefined) && 'resize' in node) {
    const w = spec.width !== undefined ? spec.width : node.width;
    const h = spec.height !== undefined ? spec.height : node.height;
    try { node.resize(w, h); } catch (e) {}
  }

  // --- 6. 위치 (최상위 프레임에만 의미, auto-layout 자식은 무시됨) ---
  if (spec.x !== undefined) node.x = spec.x;
  if (spec.y !== undefined) node.y = spec.y;

  // imageUrl: 이미지 fill을 나중에 배치 적용하기 위해 수집 (UI에서 fetch 후 createImage)
  if (spec.imageUrl && typeof spec.imageUrl === 'string' && imageRequests) {
    imageRequests.push({ nodeId: node.id, url: spec.imageUrl });
  }

  return node;
}

/* ---------- 이미지 배치 로드 ---------- */

const pendingImageFetches = {}; // requestId -> resolve

function fetchImagesFromUi(requests) {
  return new Promise((resolve, reject) => {
    const requestId = 'img-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
    pendingImageFetches[requestId] = resolve;
    figma.ui.postMessage({ type: 'fetch-images', requestId, requests });
    setTimeout(() => {
      if (pendingImageFetches[requestId]) {
        delete pendingImageFetches[requestId];
        reject(new Error('image fetch timeout (30s)'));
      }
    }, 30000);
  });
}

async function applyImageFills(results) {
  let applied = 0;
  let failed = 0;
  const failures = [];
  for (const item of results) {
    if (!item || item.error || !item.bytes || !Array.isArray(item.bytes)) {
      failed++;
      failures.push({
        nodeId: item && item.nodeId,
        reason: item && item.error ? item.error : 'no bytes returned (fetch 실패)'
      });
      continue;
    }
    try {
      const node = figma.getNodeById(item.nodeId);
      if (!node) {
        failed++;
        failures.push({ nodeId: item.nodeId, reason: '노드를 찾을 수 없음 (이미 삭제됨?)' });
        continue;
      }
      if (!('fills' in node)) {
        failed++;
        failures.push({
          nodeId: item.nodeId,
          nodeName: node.name,
          nodeType: node.type,
          reason: `노드 type=${node.type} 은 image fill 미지원 (FRAME/RECTANGLE/ELLIPSE 만 가능)`
        });
        continue;
      }
      const uint8 = new Uint8Array(item.bytes);
      const image = figma.createImage(uint8);
      // 기존 fills를 image fill로 교체. scaleMode FILL로 기본 (꽉 채우기).
      node.fills = [{
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash: image.hash
      }];
      applied++;
    } catch (e) {
      console.warn('applyImageFills failed for node', item.nodeId, e);
      failed++;
      failures.push({ nodeId: item.nodeId, reason: String(e && e.message || e) });
    }
  }
  return { applied, failed, failures };
}

function reportImportDiagnostics() {
  if (!importDiagnostics.length) return;
  const byKind = {};
  for (const d of importDiagnostics) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  const summary = Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join(' / ');
  console.warn('[KDS import diagnostics]', importDiagnostics);
  // UI 패널에도 표시 (사용자가 모달 열어 확인 가능)
  figma.ui.postMessage({ type: 'import-diagnostics', items: importDiagnostics.slice() });
  figma.notify(`⚠ 진단 ${importDiagnostics.length}건 (${summary}) — 콘솔 또는 플러그인 패널 확인`, { timeout: 6000 });
}

async function importDesign(design) {
  importDiagnostics = []; // 리셋
  const fontSet = new Set();
  const imageRequests = [];
  const viewport = figma.viewport.center;
  const SCREEN_GAP = 80;

  // 여러 화면(flow)인 경우
  if (Array.isArray(design.screens) && design.screens.length > 0) {
    const nodes = [];
    let cursorX = 0;
    let maxH = 0;
    for (const screenSpec of design.screens) {
      const n = await createNodeFromSpec(screenSpec, fontSet, imageRequests);
      figma.currentPage.appendChild(n);
      n.x = cursorX;
      n.y = 0;
      cursorX += (n.width || 375) + SCREEN_GAP;
      maxH = Math.max(maxH, n.height || 0);
      nodes.push(n);
    }
    // 전체를 뷰포트 중앙 근처로 이동
    const groupWidth = cursorX - SCREEN_GAP;
    const offsetX = Math.round(viewport.x - groupWidth / 2);
    const offsetY = Math.round(viewport.y - maxH / 2);
    for (const n of nodes) {
      n.x += offsetX;
      n.y += offsetY;
    }
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
    // 이미지 배치 로드 (실패해도 트리는 살아있음)
    await loadImagesSafely(imageRequests);
    return nodes[0];
  }

  // 단일 화면 (기존 호환)
  const root = design.root || design;
  const node = await createNodeFromSpec(root, fontSet, imageRequests);
  if ('x' in node && node.x === 0) node.x = Math.round(viewport.x - (node.width || 0) / 2);
  if ('y' in node && node.y === 0) node.y = Math.round(viewport.y - (node.height || 0) / 2);
  figma.currentPage.appendChild(node);
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  await loadImagesSafely(imageRequests);
  return node;
}

async function loadImagesSafely(imageRequests) {
  if (!imageRequests || imageRequests.length === 0) return;
  try {
    const results = await fetchImagesFromUi(imageRequests);
    const { applied, failed, failures } = await applyImageFills(results);
    if (failures && failures.length) {
      console.warn('[image fail]', failures);
      // 첫 5개만 진단 누적 (너무 많으면 잘림)
      for (const f of failures.slice(0, 5)) {
        importDiagnostics.push({
          kind: 'image-fail',
          node: f.nodeName || f.nodeId,
          nodeType: f.nodeType,
          reason: f.reason
        });
      }
      if (failures.length > 5) {
        importDiagnostics.push({
          kind: 'image-fail',
          node: '(more)',
          reason: `+${failures.length - 5}개 추가 실패 — 콘솔 참고`
        });
      }
    }
    if (applied > 0) {
      figma.notify(`이미지 ${applied}개 적용 완료${failed > 0 ? ' (' + failed + '개 실패)' : ''}`);
    } else if (failed > 0) {
      figma.notify(`이미지 로드 실패: ${failed}개 — 콘솔/진단 확인`);
    }
  } catch (e) {
    console.warn('loadImagesSafely error:', e);
    importDiagnostics.push({
      kind: 'image-fetch-error',
      reason: String(e && e.message || e)
    });
    figma.notify('이미지 로드 실패 — 콘솔 확인', { error: false });
  }
}

/* ---------- UI 메시지 ---------- */

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'minimize') figma.ui.resize(200, 40);
  if (msg.type === 'expand') figma.ui.resize(480, 600);

  if (msg.type === 'export-json') {
    flushAllPending();
    const exportData = buildExportData(resolveScreenFilter(msg.screenFilter));
    figma.ui.postMessage({ type: 'export-result', data: exportData });
  }

  if (msg.type === 'send-to-bridge') {
    flushAllPending();
    const exportData = buildExportData(resolveScreenFilter(msg.screenFilter));
    figma.ui.postMessage({ type: 'send-payload', data: exportData });
  }

  if (msg.type === 'request-screens-list') {
    sendScreensList();
    sendSelectionScreen();
  }

  if (msg.type === 'import-design') {
    // import 중 발생할 변경 이벤트 500ms 동안 무시
    suppressUntil = Date.now() + 99999999; // 잠시 무한 무시
    try {
      const design = msg.design;
      const node = await importDesign(design);

      // 혹시 suppress 전/후 끼어든 이벤트들 모두 비우기
      await new Promise(r => setTimeout(r, 400));
      changeLog.length = 0;
      for (const key of Object.keys(pendingChanges)) {
        clearTimeout(pendingChanges[key].timer);
        delete pendingChanges[key];
      }
      burstBuffer = [];
      if (burstTimer) { clearTimeout(burstTimer); burstTimer = null; }
      figma.ui.postMessage({ type: 'log-cleared' });

      figma.ui.postMessage({
        type: 'import-result',
        ok: true,
        nodeId: node.id,
        nodeName: node.name
      });
      figma.notify('✓ 디자인을 가져왔습니다: ' + node.name + ' (이후 편집만 추적)');
      // import 후 시안 셀렉트 갱신
      sendScreensList();
      // 진단 보고 (SVG 파싱 실패·이미지 로드 실패 등)
      reportImportDiagnostics();
    } catch (e) {
      figma.ui.postMessage({ type: 'import-result', ok: false, error: String(e.message || e) });
      figma.notify('불러오기 실패: ' + (e.message || e), { error: true });
    } finally {
      suppressUntil = 0; // 추적 재개
    }
  }

  if (msg.type === 'clear-log') {
    changeLog.length = 0;
    for (const key of Object.keys(pendingChanges)) {
      clearTimeout(pendingChanges[key].timer);
      delete pendingChanges[key];
    }
    burstBuffer = [];
    if (burstTimer) { clearTimeout(burstTimer); burstTimer = null; }
    figma.ui.postMessage({ type: 'log-cleared' });
  }

  if (msg.type === 'images-loaded') {
    const resolver = pendingImageFetches[msg.requestId];
    if (resolver) {
      delete pendingImageFetches[msg.requestId];
      resolver(msg.results || []);
    }
  }
};

function flushAllPending() {
  for (const key of Object.keys(pendingChanges)) {
    clearTimeout(pendingChanges[key].timer);
    flushProperty(key);
  }
  if (burstTimer) {
    clearTimeout(burstTimer);
    burstTimer = null;
    flushBurst();
  }
}

function resolveScreenFilter(screenFilter) {
  if (screenFilter === 'auto') {
    const sel = getSelectionScreen();
    return sel ? sel.screenNodeId : 'all'; // selection 없으면 전체로 폴백
  }
  return screenFilter;
}

function buildExportData(screenFilter) {
  let changes = changeLog;
  let filteredFor = null;
  if (screenFilter && screenFilter !== 'all') {
    changes = changeLog.filter(e => e.screenNodeId === screenFilter);
    const screens = getScreensList();
    const matched = screens.find(s => s.nodeId === screenFilter);
    filteredFor = matched
      ? { nodeId: matched.nodeId, name: matched.name, kdsId: matched.kdsId }
      : { nodeId: screenFilter };
  }
  return {
    exportedAt: new Date().toISOString(),
    fileKey: figma.fileKey,
    fileName: figma.root.name,
    filteredFor: filteredFor,
    totalChanges: changes.length,
    changes: changes
  };
}
