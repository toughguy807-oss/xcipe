#!/usr/bin/env node
/**
 * html-to-tree.js (plan-sb edition)
 *
 * HTML → Figma tree JSON 변환 스크립트.
 *
 * 핵심 처리:
 *   ① 컨테이너 스타일 보존: 배경/테두리/radius/padding/shadow 가 있는 텍스트 leaf 는
 *      Frame{...container styles} + Text{characters} 로 분리
 *   ② ::before / ::after 가상 요소 → 별도 자식 노드 (background/text 캡처)
 *   ③ 텍스트 단편(span fragment) 스타일 상속: 부모의 color/fontSize/fontWeight/fontFamily/lineHeight 복사
 *   ④ <img src="file://..."> → base64 임베드 (imageData)
 *   ⑤ table/th/td 의 padding/border 보존 (table 자체는 컨테이너로 처리)
 *
 * Playwright 로드: push-html.js 가 NODE_PATH 를 npm global root 로 설정한 후 호출하므로
 * 여기서는 단순 require('playwright') 만 시도. 실패 시 명확한 에러 표시.
 *
 * Usage:
 *   node scripts/html-to-tree.js <input.html> <output.json> [--width 1920] [--height 1080] [--per-slide]
 */
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { argv, exit } from 'process';
import { resolve as pathResolve, dirname } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    console.error('[html-to-tree] playwright not found in NODE_PATH.');
    console.error('[html-to-tree] Install: npm i -g playwright && npx playwright install chromium');
    console.error('[html-to-tree] (push-html.js auto-sets NODE_PATH to `npm root -g` — check that npm is on PATH)');
    throw e;
  }
}

function parseArgs() {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: html-to-tree.js <input.html> <output.json> [--width 1920] [--height 1080] [--per-slide]');
    exit(1);
  }
  const out = { input: args[0], output: args[1], width: 1920, height: 1080, perSlide: false };
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--width') out.width = parseInt(args[++i], 10) || 1920;
    else if (args[i] === '--height') out.height = parseInt(args[++i], 10) || 1080;
    else if (args[i] === '--per-slide') out.perSlide = true;
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const inputPath = pathResolve(opts.input);
  if (!existsSync(inputPath)) { console.error('[html-to-tree] input not found:', inputPath); exit(1); }

  const { chromium } = loadPlaywright();
  console.log('[html-to-tree] launching chromium...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const url = pathToFileURL(inputPath).href;
  console.log('[html-to-tree] goto', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);

  console.log('[html-to-tree] extracting tree (perSlide=' + opts.perSlide + ')...');

  const result = await page.evaluate(({ perSlide }) => {
    const STYLE_KEYS = [
      'display','position','overflow','opacity','visibility',
      'color','backgroundColor','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat',
      'fontSize','fontWeight','fontFamily','fontStyle','letterSpacing','lineHeight',
      'textAlign','textDecorationLine','textTransform','whiteSpace',
      'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
      'borderTopColor','borderRightColor','borderBottomColor','borderLeftColor',
      'borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle',
      'borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius',
      'paddingTop','paddingRight','paddingBottom','paddingLeft',
      'boxShadow','filter','backdropFilter','transform',
      'flexDirection','justifyContent','alignItems','gap',
    ];

    const TEXT_ONLY_KEYS = ['color','fontSize','fontWeight','fontFamily','fontStyle','letterSpacing','lineHeight','textAlign','textDecorationLine','textTransform','whiteSpace'];

    function computedStyle(el, pseudo) {
      const cs = window.getComputedStyle(el, pseudo || null);
      const out = {};
      for (const k of STYLE_KEYS) {
        const v = cs[k];
        if (v === undefined || v === '' || v === 'none' || v === 'normal' || v === 'rgba(0, 0, 0, 0)' || v === 'auto' || v === 'visible') continue;
        if ((k.startsWith('padding') || k.startsWith('borderTopWidth') || k.startsWith('borderRightWidth') ||
             k.startsWith('borderBottomWidth') || k.startsWith('borderLeftWidth') ||
             k.startsWith('borderTopLeftRadius') || k.startsWith('borderTopRightRadius') ||
             k.startsWith('borderBottomRightRadius') || k.startsWith('borderBottomLeftRadius')) && v === '0px') continue;
        out[k] = v;
      }
      return out;
    }

    function inheritedTextStyle(el) {
      const cs = window.getComputedStyle(el);
      const out = {};
      for (const k of TEXT_ONLY_KEYS) {
        const v = cs[k];
        if (v && v !== '' && v !== 'normal') out[k] = v;
      }
      return out;
    }

    function autoLayoutHint(style) {
      if (style.display !== 'flex' && style.display !== 'inline-flex') return null;
      const dir = (style.flexDirection || 'row').includes('column') ? 'VERTICAL' : 'HORIZONTAL';
      const gap = parseFloat(style.gap || '0') || 0;
      return {
        direction: dir, gap,
        paddingTop: parseFloat(style.paddingTop || '0') || 0,
        paddingRight: parseFloat(style.paddingRight || '0') || 0,
        paddingBottom: parseFloat(style.paddingBottom || '0') || 0,
        paddingLeft: parseFloat(style.paddingLeft || '0') || 0,
        justifyContent: style.justifyContent || 'flex-start',
        alignItems: style.alignItems || 'stretch',
      };
    }

    function shouldSkip(el, rect) {
      if (!rect) return true;
      if (rect.width < 0.5 || rect.height < 0.5) return true;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'br' || tag === 'head') return true;
      return false;
    }

    function svgMarkup(el) {
      try { return new XMLSerializer().serializeToString(el); } catch (_) { return null; }
    }

    function hasContainerStyles(s) {
      if (!s) return false;
      if (s.backgroundColor) return true;
      if (s.backgroundImage) return true;
      if (s.borderTopWidth || s.borderRightWidth || s.borderBottomWidth || s.borderLeftWidth) return true;
      if (s.borderTopLeftRadius || s.borderTopRightRadius || s.borderBottomRightRadius || s.borderBottomLeftRadius) return true;
      if (s.boxShadow) return true;
      if (s.paddingTop || s.paddingRight || s.paddingBottom || s.paddingLeft) return true;
      return false;
    }

    function buildChildEntries(el) {
      const entries = [];
      for (const pseudo of ['::before', '::after']) {
        const cs = window.getComputedStyle(el, pseudo);
        const content = cs.content;
        if (content && content !== 'none' && content !== 'normal') {
          const ps = computedStyle(el, pseudo);
          if (hasContainerStyles(ps) || (content && content !== '""' && content !== "''")) {
            entries.push({ kind: 'pseudo', pseudo, style: ps, content: content.replace(/^["']|["']$/g, '') });
          }
        }
      }
      for (const ch of el.childNodes) {
        if (ch.nodeType === Node.TEXT_NODE) {
          const text = ch.textContent;
          if (!text || !text.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(ch);
          const rects = range.getClientRects();
          if (rects.length === 0) continue;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const r of rects) {
            if (r.width < 0.5 || r.height < 0.5) continue;
            minX = Math.min(minX, r.left); minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom);
          }
          if (!isFinite(minX)) continue;
          entries.push({ kind: 'text', text: text.trim(), rect: { left: minX, top: minY, width: maxX - minX, height: maxY - minY } });
        } else if (ch.nodeType === Node.ELEMENT_NODE) {
          entries.push({ kind: 'element', el: ch });
        }
      }
      return entries;
    }

    function isPureTextLeaf(el) {
      if (!el.childNodes || el.childNodes.length === 0) return false;
      for (const ch of el.childNodes) {
        if (ch.nodeType === Node.ELEMENT_NODE) return false;
      }
      return (el.innerText || el.textContent || '').trim().length > 0;
    }

    function pseudoBoxFromParent(parentRect, ps, content) {
      const pos = ps.position;
      const result = { x: 0, y: 0, w: parentRect.width, h: parentRect.height };
      if (pos === 'absolute') {
        const top = ps.top ? parseFloat(ps.top) : null;
        const bottom = ps.bottom ? parseFloat(ps.bottom) : null;
        const left = ps.left ? parseFloat(ps.left) : null;
        const right = ps.right ? parseFloat(ps.right) : null;
        const width = ps.width ? parseFloat(ps.width) : null;
        const height = ps.height ? parseFloat(ps.height) : null;
        if (left !== null && right !== null) {
          result.x = left;
          result.w = parentRect.width - left - right;
        } else if (left !== null && width !== null) {
          result.x = left; result.w = width;
        } else if (width !== null) {
          result.w = width;
        }
        if (top !== null && bottom !== null) {
          result.y = top;
          result.h = parentRect.height - top - bottom;
        } else if (top !== null && height !== null) {
          result.y = top; result.h = height;
        } else if (bottom !== null && height !== null) {
          result.y = parentRect.height - bottom - height; result.h = height;
        } else if (height !== null) {
          result.h = height;
        }
      }
      result.x = Math.round(result.x);
      result.y = Math.round(result.y);
      result.w = Math.max(1, Math.round(result.w));
      result.h = Math.max(1, Math.round(result.h));
      return result;
    }

    function nodeFor(el, parentRect) {
      const rect = el.getBoundingClientRect();
      if (shouldSkip(el, rect)) return null;

      const tag = el.tagName.toLowerCase();
      const style = computedStyle(el);
      const className = (el.className && typeof el.className === 'string') ? el.className : '';
      const baseBox = {
        x: Math.round(rect.left - parentRect.left),
        y: Math.round(rect.top - parentRect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      };

      if (tag === 'svg') {
        const m = svgMarkup(el);
        const node = { tag, class: className, style, box: baseBox, children: [] };
        if (m) node.svgMarkup = m;
        return node;
      }
      if (tag === 'img') {
        const attrs = {};
        if (el.src) attrs.src = el.src;
        if (el.alt) attrs.alt = el.alt;
        return { tag, class: className, style, box: baseBox, children: [], attrs };
      }

      if (isPureTextLeaf(el)) {
        const text = (el.innerText || el.textContent || '').trim();
        const inh = inheritedTextStyle(el);

        if (hasContainerStyles(style)) {
          const frame = { tag, class: className, style, box: baseBox, children: [] };
          const padTop = parseFloat(style.paddingTop || '0') || 0;
          const padLeft = parseFloat(style.paddingLeft || '0') || 0;
          const padRight = parseFloat(style.paddingRight || '0') || 0;
          const padBottom = parseFloat(style.paddingBottom || '0') || 0;
          frame.children.push({
            tag: 'span',
            class: '__text_in_box',
            text,
            style: inh,
            box: {
              x: Math.round(padLeft),
              y: Math.round(padTop),
              w: Math.max(1, Math.round(baseBox.w - padLeft - padRight)),
              h: Math.max(1, Math.round(baseBox.h - padTop - padBottom)),
            },
            children: [],
          });
          return frame;
        } else {
          return { tag, class: className, text, style: Object.assign({}, style, inh), box: baseBox, children: [] };
        }
      }

      const node = { tag, class: className, style, box: baseBox, children: [] };
      const al = autoLayoutHint(style);
      if (al) node.autoLayout = al;

      const inh = inheritedTextStyle(el);

      const childEntries = buildChildEntries(el);
      for (const e of childEntries) {
        if (e.kind === 'pseudo') {
          const box = pseudoBoxFromParent(rect, e.style, e.content);
          const pseudoNode = {
            tag: 'div',
            class: '__pseudo_' + e.pseudo.replace('::', ''),
            style: e.style,
            box,
            children: [],
          };
          if (e.content && e.content.trim() && e.content !== '""' && e.content !== "''") {
            pseudoNode.text = e.content;
            Object.assign(pseudoNode.style, inh);
          }
          node.children.push(pseudoNode);
        } else if (e.kind === 'element') {
          const sub = nodeFor(e.el, rect);
          if (sub) node.children.push(sub);
        } else {
          node.children.push({
            tag: 'span',
            class: '__text_fragment',
            text: e.text,
            style: inh,
            box: {
              x: Math.round(e.rect.left - rect.left),
              y: Math.round(e.rect.top - rect.top),
              w: Math.round(e.rect.width),
              h: Math.round(e.rect.height),
            },
            children: [],
          });
        }
      }
      return node;
    }

    if (perSlide) {
      const slides = Array.from(document.querySelectorAll('body > .slide'));
      if (slides.length === 0) {
        const rect = document.body.getBoundingClientRect();
        const t = nodeFor(document.body, rect);
        if (t) { t.box.x = 0; t.box.y = 0; }
        return { mode: 'single', tree: t };
      }
      const trees = slides.map((s, i) => {
        const r = s.getBoundingClientRect();
        const t = nodeFor(s, r);
        if (t) { t.box.x = 0; t.box.y = 0; t.slideIdx = i + 1; }
        return t;
      }).filter(Boolean);
      return { mode: 'per-slide', count: trees.length, trees };
    } else {
      const rect = document.body.getBoundingClientRect();
      const tree = nodeFor(document.body, rect);
      if (tree) { tree.box.x = 0; tree.box.y = 0; }
      return { mode: 'single', tree };
    }
  }, { perSlide: opts.perSlide });

  await browser.close();

  function embedImages(node, htmlDir) {
    if (!node || typeof node !== 'object') return;
    if (node.tag === 'img' && node.attrs && node.attrs.src) {
      const src = node.attrs.src;
      let fp = null;
      if (src.startsWith('file:///')) {
        fp = decodeURIComponent(src.replace('file:///', '').replace(/\//g, '\\'));
      } else if (!/^https?:|^data:/.test(src)) {
        fp = pathResolve(htmlDir, src);
      }
      if (fp && existsSync(fp)) {
        try {
          const buf = readFileSync(fp);
          const ext = (fp.split('.').pop() || '').toLowerCase();
          const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream';
          node.imageData = buf.toString('base64');
          node.imageMimeType = mime;
        } catch (_) {}
      }
    }
    if (Array.isArray(node.children)) for (const c of node.children) embedImages(c, htmlDir);
  }

  const htmlDir = dirname(inputPath);
  if (result.mode === 'per-slide') {
    for (const t of result.trees) embedImages(t, htmlDir);
  } else {
    embedImages(result.tree, htmlDir);
  }

  const json = JSON.stringify(result, null, 0);
  writeFileSync(opts.output, json, 'utf8');
  const bytes = Buffer.byteLength(json, 'utf8');
  console.log('[html-to-tree] wrote ' + opts.output + ' (' + (bytes / 1024).toFixed(1) + ' KB, mode=' + result.mode + (result.count ? ', slides=' + result.count : '') + ')');
}

main().catch(e => { console.error('[html-to-tree] fatal:', e.stack || e.message); exit(1); });
