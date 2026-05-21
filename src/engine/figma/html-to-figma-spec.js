// HTML → KDS createNodeFromSpec spec 변환기
//
// 용도: xcipe FINAL artifact (HTML) 을 Playwright 로 렌더한 뒤
//       각 DOM element 의 BoundingClientRect + computedStyle 을 추출해
//       KDS figma-change-tracker 플러그인의 importDesign() 이 그대로
//       Figma 노드로 그릴 수 있는 spec 트리 (FRAME/TEXT/RECTANGLE) 로 변환.
//
// 1차 버전 (A안): RGB 그대로. 토큰 매핑 없음.
//   designSystemId 파라미터는 시그니처에만 두고 미사용 (B안 후속 확장 자리)
//
// 반환: { screens: [<rootSpec>] }
//   rootSpec.type = 'FRAME', children = [recursive specs]
//
// 제약:
//   - inline element 는 부모 FRAME 의 children TEXT 로 변환되지 않음 — 부모가
//     leaf (자식 Element 0개) 이고 textContent 가 있으면 그 자체를 TEXT 로 변환
//   - max depth 12, max nodes 3000 cap
//   - display:none / visibility:hidden / 0px 사이즈 → skip
//   - position: fixed/absolute 도 일반 absolute 로 취급 (Figma 에선 parent 상대 좌표)

const path = require('path');
const fs = require('fs');

const MAX_DEPTH = 12;
const MAX_NODES = 3000;

const VIEWPORTS = {
  PC: { width: 1440, height: 900 },
  MO: { width: 375, height: 812 },
  TABLET: { width: 768, height: 1024 }
};

/**
 * HTML 파일 1건을 KDS spec 으로 변환.
 *
 * @param {Object} opts
 * @param {string} opts.htmlPath          — 절대 경로
 * @param {string} [opts.viewport='PC']   — 'PC' | 'MO' | 'TABLET'
 * @param {string} [opts.name]            — root frame 이름 (기본: 파일명)
 * @param {number} [opts.designSystemId]  — B안 후속 확장 자리 (미사용)
 * @param {string} [opts.outputRoot]      — img src 를 /bridge/preview-assets/<rel> 로 재작성하는 기준 root
 * @param {string} [opts.assetUrlBase='/bridge/preview-assets'] — img src 재작성 prefix
 * @returns {Promise<{screens: Object[], stats: {nodeCount,maxDepth,truncated,viewport}}>}
 */
function rewriteImageUrls(spec, outputRoot, assetUrlBase) {
  if (!outputRoot) return;
  if (spec.imageUrl && typeof spec.imageUrl === 'string') {
    const u = spec.imageUrl;
    if (u.startsWith('file://')) {
      let absPath;
      try {
        const fileUrl = new URL(u);
        absPath = decodeURIComponent(fileUrl.pathname);
        if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(absPath)) absPath = absPath.slice(1);
      } catch (_) { absPath = null; }
      if (absPath) {
        const normOut = path.resolve(outputRoot);
        const normAbs = path.resolve(absPath);
        if (normAbs.startsWith(normOut)) {
          const rel = path.relative(normOut, normAbs).replace(/\\/g, '/');
          spec.imageUrl = (assetUrlBase || '/bridge/preview-assets') + '/' + rel;
        } else {
          // output 밖의 파일 — KDS 가 fetch 할 수 없음. 제거.
          delete spec.imageUrl;
        }
      } else {
        delete spec.imageUrl;
      }
    } else if (u.startsWith('data:')) {
      // data URI — Figma 가 직접 fetch 못 함. base64 이미지는 별도 처리 필요. 일단 제거.
      delete spec.imageUrl;
    }
    // 외부 http(s) URL 은 그대로 (KDS 가 fetch 시도 — manifest devAllowedDomains 에 의존)
  }
  if (Array.isArray(spec.children)) {
    for (const c of spec.children) rewriteImageUrls(c, outputRoot, assetUrlBase);
  }
}

async function convertHtmlToFigmaSpec(opts) {
  if (!opts || !opts.htmlPath) throw new Error('htmlPath 필수');
  if (!fs.existsSync(opts.htmlPath)) throw new Error('htmlPath 존재하지 않음: ' + opts.htmlPath);

  const viewport = VIEWPORTS[opts.viewport] || VIEWPORTS.PC;
  const name = opts.name || path.basename(opts.htmlPath, path.extname(opts.htmlPath));

  let playwright;
  try { playwright = require('playwright'); }
  catch (e) {
    try { playwright = require('playwright-core'); }
    catch (e2) { throw new Error('playwright 미설치 — npm i playwright'); }
  }

  // file:// URL 로 로드. Windows 경로는 정규화.
  const fileUrl = 'file:///' + path.resolve(opts.htmlPath).replace(/\\/g, '/');

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  let result;
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      // 일부 산출물은 폰트/이미지 외부 fetch 실패해 networkidle 타임아웃 — 그래도 DOM 은 살아있음
    });
    // 추가 안정화 — 트랜지션/애니메이션이 끝나도록 짧게 대기
    await page.waitForTimeout(300);

    result = await page.evaluate((cfg) => {
      const MAX_DEPTH = cfg.maxDepth;
      const MAX_NODES = cfg.maxNodes;

      const stats = { nodeCount: 0, maxDepth: 0, truncated: false };

      function rgbaToFigmaColor(rgbaStr) {
        // 'rgb(0, 113, 227)' / 'rgba(0, 113, 227, 0.5)'
        if (!rgbaStr || rgbaStr === 'transparent' || rgbaStr === 'none') return null;
        const m = rgbaStr.match(/rgba?\(([^)]+)\)/i);
        if (!m) return null;
        const parts = m[1].split(',').map(s => parseFloat(s.trim()));
        if (parts.length < 3 || parts.some(isNaN)) return null;
        const a = parts[3] !== undefined ? parts[3] : 1;
        if (a === 0) return null;
        return {
          color: { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 },
          opacity: a
        };
      }

      function isVisible(el, cs, rect) {
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (parseFloat(cs.opacity || '1') === 0) return false;
        // 0px 박스라도 자식이 떠 있을 수 있어 width/height 만으로는 skip 안 함.
        // 단 width+height 둘 다 0 이고 자식도 없으면 skip 은 호출측에서.
        return true;
      }

      function pickFont(cs) {
        // 'Pretendard, sans-serif' → 'Pretendard'
        const family = (cs.fontFamily || 'Inter')
          .split(',')[0].trim().replace(/^["']|["']$/g, '');
        // CSS font-weight 100~900 → Figma style 명칭 매핑 (Pretendard 기준)
        const w = parseInt(cs.fontWeight, 10) || 400;
        const isItalic = cs.fontStyle === 'italic';
        const weightMap = {
          100: 'Thin', 200: 'ExtraLight', 300: 'Light',
          400: 'Regular', 500: 'Medium', 600: 'SemiBold',
          700: 'Bold', 800: 'ExtraBold', 900: 'Black'
        };
        // 가장 가까운 100 단위로 라운드
        const bucket = Math.round(w / 100) * 100;
        let style = weightMap[bucket] || 'Regular';
        if (isItalic) style = style === 'Regular' ? 'Italic' : (style + ' Italic');
        return { family, style };
      }

      function parseBorderRadius(cs) {
        // border-radius 'shorthand' → cornerRadius 단일값.
        // 모서리별 다를 경우 (예: '8px 0 0 8px') 는 평균값.
        const tl = parseFloat(cs.borderTopLeftRadius) || 0;
        const tr = parseFloat(cs.borderTopRightRadius) || 0;
        const bl = parseFloat(cs.borderBottomLeftRadius) || 0;
        const br = parseFloat(cs.borderBottomRightRadius) || 0;
        if (tl === tr && tr === bl && bl === br) {
          return { uniform: tl };
        }
        return { tl, tr, bl, br };
      }

      function buildSpec(el, parentRect, depth) {
        if (depth > MAX_DEPTH) { stats.truncated = true; return null; }
        if (stats.nodeCount >= MAX_NODES) { stats.truncated = true; return null; }

        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (!isVisible(el, cs, rect)) return null;
        // pseudo body — 항상 가시
        const isRoot = !parentRect;
        if (!isRoot && rect.width === 0 && rect.height === 0 && el.children.length === 0) return null;

        stats.nodeCount++;
        stats.maxDepth = Math.max(stats.maxDepth, depth);

        const tag = el.tagName.toLowerCase();
        const isImg = tag === 'img';
        const isSvg = tag === 'svg';

        // 자식 element 수집 (text node 는 무시 — leaf 면 textContent 합쳐 TEXT 로 변환)
        const childEls = Array.from(el.children).filter(c => {
          return c.nodeType === 1 && c.tagName.toLowerCase() !== 'script' && c.tagName.toLowerCase() !== 'style';
        });

        // leaf with text → TEXT 변환
        const text = (el.textContent || '').trim();
        const isLeafText = childEls.length === 0 && text.length > 0 && !isImg && !isSvg;

        // 위치 — 부모 기준 상대 좌표
        const x = isRoot ? 0 : Math.round(rect.left - parentRect.left);
        const y = isRoot ? 0 : Math.round(rect.top - parentRect.top);
        const w = Math.max(Math.round(rect.width), 1);
        const h = Math.max(Math.round(rect.height), 1);

        const spec = {
          name: (isRoot ? (cfg.rootName || tag) : (el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : tag))),
          x, y, width: w, height: h,
          kdsId: el.id || undefined
        };

        // 공통 비주얼
        const bg = rgbaToFigmaColor(cs.backgroundColor);
        const fills = [];
        if (bg) fills.push({ type: 'SOLID', color: bg.color, opacity: bg.opacity });

        // border — 4면 균일이면 strokes (Figma 의 strokes 는 4면 균일).
        // 단방향(예: 헤더 border-bottom) 은 별도 1px LINE 노드(RECTANGLE) 자식으로 후처리.
        const bwT = parseFloat(cs.borderTopWidth) || 0;
        const bwR = parseFloat(cs.borderRightWidth) || 0;
        const bwB = parseFloat(cs.borderBottomWidth) || 0;
        const bwL = parseFloat(cs.borderLeftWidth) || 0;
        const bwSame = bwT > 0 && bwR === bwT && bwB === bwT && bwL === bwT;
        if (bwSame) {
          const bc = rgbaToFigmaColor(cs.borderTopColor);
          if (bc) {
            spec.strokes = [{ type: 'SOLID', color: bc.color, opacity: bc.opacity }];
            spec.strokeWeight = bwT;
            spec.strokeAlign = 'INSIDE';
          }
        } else {
          // 단방향 또는 비균일 border → 각 면별 LINE 자식 노드 큐잉.
          // 실제 자식 추가는 FRAME 분기(L335 부근)에서 children 배열에 unshift.
          const sides = [];
          const mkLine = (color, w, x, y, lw, lh) => ({
            name: '__border_' + ({0:'top',1:'right',2:'bottom',3:'left'}[w]),
            x, y, width: Math.max(lw,1), height: Math.max(lh,1),
            type: 'RECTANGLE',
            fills: [{ type: 'SOLID', color: color.color, opacity: color.opacity }]
          });
          if (bwT > 0) { const c = rgbaToFigmaColor(cs.borderTopColor); if (c) sides.push(mkLine(c, 0, 0, 0, w, bwT)); }
          if (bwR > 0) { const c = rgbaToFigmaColor(cs.borderRightColor); if (c) sides.push(mkLine(c, 1, w - bwR, 0, bwR, h)); }
          if (bwB > 0) { const c = rgbaToFigmaColor(cs.borderBottomColor); if (c) sides.push(mkLine(c, 2, 0, h - bwB, w, bwB)); }
          if (bwL > 0) { const c = rgbaToFigmaColor(cs.borderLeftColor); if (c) sides.push(mkLine(c, 3, 0, 0, bwL, h)); }
          if (sides.length) spec.__borderLines = sides;
        }

        // border-radius
        const br = parseBorderRadius(cs);
        if (br.uniform !== undefined) {
          if (br.uniform > 0) spec.cornerRadius = br.uniform;
        } else {
          spec.topLeftRadius = br.tl;
          spec.topRightRadius = br.tr;
          spec.bottomLeftRadius = br.bl;
          spec.bottomRightRadius = br.br;
        }

        // opacity (이미 0 은 isVisible 에서 거름. 1 미만만 기록)
        const op = parseFloat(cs.opacity || '1');
        if (op < 1) spec.opacity = op;

        // box-shadow → effects DROP_SHADOW (가장 단순한 케이스만)
        if (cs.boxShadow && cs.boxShadow !== 'none') {
          const m = cs.boxShadow.match(/rgba?\([^)]+\)\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?/);
          if (m) {
            const colorMatch = cs.boxShadow.match(/rgba?\([^)]+\)/);
            const c = colorMatch ? rgbaToFigmaColor(colorMatch[0]) : null;
            if (c) {
              spec.effects = [{
                type: 'DROP_SHADOW',
                color: { r: c.color.r, g: c.color.g, b: c.color.b, a: c.opacity },
                offset: { x: parseFloat(m[1]), y: parseFloat(m[2]) },
                radius: parseFloat(m[3]),
                spread: m[4] ? parseFloat(m[4]) : 0
              }];
            }
          }
        }

        if (isImg) {
          // RECTANGLE + imageUrl (KDS 가 fetch 후 createImage 처리)
          spec.type = 'RECTANGLE';
          spec.fills = fills.length ? fills : []; // 없으면 빈 배열로 (이후 imageUrl로 덮어쓰임)
          const src = el.getAttribute('src') || '';
          if (src) spec.imageUrl = src; // 절대 URL or 상대 (bridge 가 /preview-assets/* 로 서빙해야 함)
          return spec;
        }

        if (isSvg) {
          // SVG outerHTML 그대로 → KDS 가 createNodeFromSvg
          spec.type = 'SVG';
          try { spec.svg = el.outerHTML; } catch (_) {}
          return spec;
        }

        if (isLeafText) {
          // 박스 비주얼 (배경/cornerRadius/strokes/effects) 이 있는 leaf text 는
          // FRAME + 자식 TEXT 로 분리. Figma TEXT 노드의 fills 는 글자색이라
          // 배경을 표현 못 함 — KT 로고-mark 같은 빨간 박스+글자 케이스가 손실되는 버그.
          const hasBoxVisual = fills.length > 0
            || (spec.cornerRadius && spec.cornerRadius > 0)
            || spec.topLeftRadius || spec.topRightRadius || spec.bottomLeftRadius || spec.bottomRightRadius
            || spec.strokes
            || spec.effects;
          if (hasBoxVisual) {
            spec.type = 'FRAME';
            if (fills.length) spec.fills = fills;
            const fontSize = parseFloat(cs.fontSize) || 14;
            const childText = {
              name: spec.name + '__text',
              x: 0, y: 0, width: w, height: h,
              type: 'TEXT',
              characters: text.slice(0, 5000),
              fontSize,
              fontName: pickFont(cs),
              textAutoResize: 'NONE'
            };
            // line-height / letter-spacing / transform / decoration
            const lh0 = cs.lineHeight;
            if (lh0 && lh0 !== 'normal') {
              const lhNum = parseFloat(lh0);
              if (!isNaN(lhNum)) childText.lineHeight = lhNum;
            }
            const ls0 = parseFloat(cs.letterSpacing);
            if (!isNaN(ls0) && ls0 !== 0) childText.letterSpacing = ls0;
            const tt0 = (cs.textTransform || 'none').toUpperCase();
            if (tt0 === 'UPPERCASE') childText.textCase = 'UPPER';
            else if (tt0 === 'LOWERCASE') childText.textCase = 'LOWER';
            else if (tt0 === 'CAPITALIZE') childText.textCase = 'TITLE';
            if (cs.textDecorationLine === 'underline') childText.textDecoration = 'UNDERLINE';
            else if (cs.textDecorationLine === 'line-through') childText.textDecoration = 'STRIKETHROUGH';
            // 정렬 — CSS text-align 우선, flex 컨테이너면 justify/align-items 로 보강
            let alignH = (cs.textAlign || 'left').toUpperCase();
            let alignV = 'TOP';
            if (cs.display === 'flex' || cs.display === 'inline-flex') {
              if (cs.justifyContent === 'center') alignH = 'CENTER';
              else if (cs.justifyContent === 'flex-end' || cs.justifyContent === 'end' || cs.justifyContent === 'right') alignH = 'RIGHT';
              if (cs.alignItems === 'center') alignV = 'CENTER';
              else if (cs.alignItems === 'flex-end' || cs.alignItems === 'end') alignV = 'BOTTOM';
            }
            childText.textAlignHorizontal = ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'].includes(alignH) ? alignH : 'LEFT';
            childText.textAlignVertical = alignV;
            // 글자 색
            const txc0 = rgbaToFigmaColor(cs.color);
            if (txc0) childText.fills = [{ type: 'SOLID', color: txc0.color, opacity: txc0.opacity }];
            spec.children = [childText];
            stats.nodeCount++;
            return spec;
          }

          spec.type = 'TEXT';
          spec.characters = text.slice(0, 5000); // 너무 긴 텍스트 cap
          const fontSize = parseFloat(cs.fontSize) || 14;
          spec.fontSize = fontSize;
          spec.fontName = pickFont(cs);

          // line-height — CSS 'normal' / px / 비율(unitless) 처리
          const lh = cs.lineHeight;
          let lineHeightPx = fontSize * 1.2; // 기본 추정 — multiline 판별용
          if (lh && lh !== 'normal') {
            const lhNum = parseFloat(lh);
            if (!isNaN(lhNum)) {
              spec.lineHeight = lhNum;
              lineHeightPx = lhNum;
            }
          }
          // letter-spacing
          const ls = parseFloat(cs.letterSpacing);
          if (!isNaN(ls) && ls !== 0) spec.letterSpacing = ls;
          // text-align
          const ta = (cs.textAlign || 'left').toUpperCase();
          if (['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'].includes(ta)) spec.textAlignHorizontal = ta;
          // text-transform
          const tt = (cs.textTransform || 'none').toUpperCase();
          if (tt === 'UPPERCASE') spec.textCase = 'UPPER';
          else if (tt === 'LOWERCASE') spec.textCase = 'LOWER';
          else if (tt === 'CAPITALIZE') spec.textCase = 'TITLE';
          // text-decoration
          if (cs.textDecorationLine === 'underline') spec.textDecoration = 'UNDERLINE';
          else if (cs.textDecorationLine === 'line-through') spec.textDecoration = 'STRIKETHROUGH';

          // 색상 (TEXT 의 fills 는 글자 색)
          const txc = rgbaToFigmaColor(cs.color);
          if (txc) spec.fills = [{ type: 'SOLID', color: txc.color, opacity: txc.opacity }];

          // text 폭/높이 정책 — 폰트 fallback 시 마지막 글자 줄바꿈 방지
          //   - single-line (rect.height < lineHeightPx * 1.5): WIDTH_AND_HEIGHT (자연 폭). width/height 미설정
          //     → Figma 가 실제 폰트 metric 으로 폭 계산. 부모 layout 에 영향 없음 (absolute 자식이라)
          //   - multi-line: HEIGHT (폭 고정 + wrap). 안전 마진 +12px 로 폰트 fallback 폭 차이 흡수
          const isSingleLine = h < lineHeightPx * 1.5;
          if (isSingleLine) {
            spec.textAutoResize = 'WIDTH_AND_HEIGHT';
            delete spec.width;
            delete spec.height;
          } else {
            spec.textAutoResize = 'HEIGHT';
            spec.width = w + 12; // 폰트 fallback safety margin
          }
          return spec;
        }

        // FRAME — 자식 element 재귀
        spec.type = 'FRAME';
        if (fills.length) spec.fills = fills;

        // Figma Auto Layout — CSS flex 컨테이너만 매핑 (block 은 자유 배치 유지).
        // 핵심 KDS 결과 격차의 진범: 우리 변환기가 절대좌표 자식만 두면 디자인 시스템처럼 정돈 안 됨.
        // grid 는 Figma 가 지원 안 함 — flex 만.
        const dsp = cs.display;
        if (dsp === 'flex' || dsp === 'inline-flex') {
          const fd = cs.flexDirection || 'row';
          const isVert = (fd === 'column' || fd === 'column-reverse');
          const gap = parseFloat(cs.gap || cs.columnGap || cs.rowGap || '0') || 0;
          const pt = parseFloat(cs.paddingTop) || 0;
          const pb = parseFloat(cs.paddingBottom) || 0;
          const pl = parseFloat(cs.paddingLeft) || 0;
          const pr = parseFloat(cs.paddingRight) || 0;
          const jaMap = { 'flex-start': 'MIN', 'start': 'MIN', 'center': 'CENTER', 'flex-end': 'MAX', 'end': 'MAX', 'space-between': 'SPACE_BETWEEN' };
          const alMap = { 'flex-start': 'MIN', 'start': 'MIN', 'center': 'CENTER', 'flex-end': 'MAX', 'end': 'MAX', 'stretch': 'MIN', 'baseline': 'MIN', 'normal': 'MIN' };
          spec.layout = {
            mode: isVert ? 'VERTICAL' : 'HORIZONTAL',
            itemSpacing: gap,
            paddingTop: pt, paddingBottom: pb, paddingLeft: pl, paddingRight: pr,
            primaryAxisAlign: jaMap[cs.justifyContent] || 'MIN',
            counterAxisAlign: alMap[cs.alignItems] || 'MIN'
          };
          if (cs.flexWrap === 'wrap' || cs.flexWrap === 'wrap-reverse') {
            spec.layout.layoutWrap = 'WRAP';
          }
        }

        const children = [];
        // 단방향 border LINE 노드 먼저 (자식보다 뒤에 그려도 무방 — Figma 는 z-index 순서).
        if (spec.__borderLines) {
          for (const ln of spec.__borderLines) children.push(ln);
          delete spec.__borderLines;
        }
        for (const c of childEls) {
          if (stats.nodeCount >= MAX_NODES) { stats.truncated = true; break; }
          const childSpec = buildSpec(c, rect, depth + 1);
          if (childSpec) children.push(childSpec);
        }
        if (children.length) spec.children = children;

        return spec;
      }

      const body = document.body;
      const root = buildSpec(body, null, 0);
      return { root, stats };
    }, { maxDepth: MAX_DEPTH, maxNodes: MAX_NODES, rootName: name });

    await context.close();
  } finally {
    await browser.close();
  }

  if (!result || !result.root) throw new Error('변환 결과 비어있음');

  // 이미지 URL 재작성 — file:// → /bridge/preview-assets/<rel>
  if (opts.outputRoot) {
    rewriteImageUrls(result.root, opts.outputRoot, opts.assetUrlBase);
  }

  return {
    screens: [result.root],
    stats: {
      ...result.stats,
      viewport: opts.viewport || 'PC'
    }
  };
}

module.exports = { convertHtmlToFigmaSpec, VIEWPORTS };
