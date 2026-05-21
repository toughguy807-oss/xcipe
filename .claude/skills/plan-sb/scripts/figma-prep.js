#!/usr/bin/env node
/**
 * Figma Export Preparation
 * Usage: node figma-prep.js <sb-html-path>
 *
 * SB HTML → Figma 캡처용 HTML 변환
 *  - @media screen body 가로 flex
 *  - ::before/::after pseudo-element → 실제 DOM 변환 스크립트
 *  - Figma capture.js 로드
 *
 * 출력: {dir}/_figma/{name}-figma.html
 */

const fs = require('fs');
const path = require('path');

const PSEUDO_CONVERTER = `
<script>
// Pseudo-element → Real DOM 변환 (Figma 캡처용)
window.addEventListener('DOMContentLoaded', function() {
  // ::before 이미지 placeholder 아이콘
  var iconClasses = [
    { sel: '.wf-el--image', size: 16, marginRight: 5 },
    { sel: '.wf-grp-image', size: 24, marginRight: 5 },
    { sel: '.wf-popup-image', size: 24, marginRight: 6 },
    { sel: '.wf-card-thumb', size: 16, marginRight: 4 }
  ];
  iconClasses.forEach(function(cfg) {
    document.querySelectorAll(cfg.sel).forEach(function(el) {
      var span = document.createElement('span');
      span.textContent = '🖼';
      span.style.fontSize = cfg.size + 'px';
      span.style.marginRight = cfg.marginRight + 'px';
      el.insertBefore(span, el.firstChild);
    });
  });
  // ::after 푸터 하단 강조선 (.slide-footer-bottom)
  document.querySelectorAll('.slide-footer-bottom').forEach(function(el) {
    if (el.querySelector('.fa-figma-accent')) return;
    var accent = document.createElement('div');
    accent.className = 'fa-figma-accent';
    accent.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:4px;background:#3366CC;';
    el.appendChild(accent);
  });
});
</script>
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
`;

const HORIZONTAL_LAYOUT_OVERRIDE = `
<style id="figma-export-override">
  @media screen {
    html, body { width: max-content !important; }
    body {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-start !important;
      gap: 40px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
    }
    .slide { flex-shrink: 0 !important; }
  }
</style>
`;

function prep(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    console.error(`[ERR] File not found: ${htmlPath}`);
    process.exit(1);
  }
  const html = fs.readFileSync(htmlPath, 'utf-8');

  if (!/<head[^>]*>/i.test(html)) {
    console.error('[ERR] <head> tag not found in input HTML');
    process.exit(1);
  }

  let modified = html.replace(
    /<head([^>]*)>/i,
    (m, attrs) => `<head${attrs}>${PSEUDO_CONVERTER}${HORIZONTAL_LAYOUT_OVERRIDE}`
  );

  const dir = path.dirname(htmlPath);
  const base = path.basename(htmlPath, '.html');
  const outDir = path.join(dir, '_figma');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${base}-figma.html`);
  fs.writeFileSync(outPath, modified, 'utf-8');

  // 슬라이드 수 추정 (capture 시 detach 검증용)
  const slideCount = (html.match(/class="slide(?!-)[^"]*"/g) || []).length;

  const meta = {
    sourceHtml: htmlPath,
    figmaHtml: outPath,
    slideCount,
    width: 1920,
    height: 1080,
    gap: 40,
    captureSelector: 'body',
    chromeFlags: [
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
    note: '단일 캡처(selector=body) → use_figma로 .slide 자식 detach + rescale + position + rename',
  };
  const metaPath = path.join(outDir, 'figma-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`[OK] Figma HTML: ${outPath}`);
  console.log(`[OK] Meta: ${metaPath}`);
  console.log(`[INFO] Slides: ${slideCount}`);
  return meta;
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node figma-prep.js <sb-html-path>');
  process.exit(1);
}
prep(path.resolve(arg));
