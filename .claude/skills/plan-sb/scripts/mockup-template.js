#!/usr/bin/env node
/**
 * mockup-template.js — Mode A용 mockup HTML 스켈레톤 자동 생성 (Phase 2.3)
 *
 * Usage:
 *   node mockup-template.js [--name=화면코드] [--mobile-only] [--pc-only]
 *
 * 출력:
 *   input/mockup-pc.html (또는 mockup-mo.html)
 *   마커+점선 CSS 기본 포함, 사용자가 콘텐츠만 채우면 캡쳐 가능
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, a) => {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    acc[k] = v === undefined ? true : v;
  }
  return acc;
}, {});

const name = args.name || 'mockup';
const mobileOnly = !!args['mobile-only'];
const pcOnly = !!args['pc-only'];

function template(viewport) {
  const isPc = viewport === 'pc';
  const containerWidth = isPc ? '1200px' : '375px';
  const fontSize = isPc ? '16px' : '14px';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} ${viewport.toUpperCase()} 목업</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #fafafa; color: #333; font-size: ${fontSize}; padding: 24px; }
  .container { max-width: ${containerWidth}; margin: 0 auto; background: #fff;
    border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; }
  /* 변경 영역 마커 + 점선 (SKILL.md L207) */
  .marker { position: absolute; width: ${isPc ? 28 : 24}px; height: ${isPc ? 28 : 24}px;
    border-radius: 50%; background: #e4002b; color: #fff; font-size: ${isPc ? 13 : 11}px;
    font-weight: 700; display: flex; align-items: center; justify-content: center;
    z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  .mark-area { border: 2px dashed #e4002b; border-radius: 6px;
    position: relative; padding: 12px; margin: 16px 0; }
  /* 일반 요소 */
  h1 { font-size: ${isPc ? 24 : 20}px; margin-bottom: 16px; color: #111; }
  p { line-height: 1.6; color: #666; margin-bottom: 12px; }
  .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: #fff;
    border: none; border-radius: 4px; cursor: pointer; }
  .img-placeholder { background: #e0e0e0; color: #999; height: 200px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; margin: 12px 0; }
</style>
</head>
<body>
  <div class="container">
    <h1>화면 제목</h1>
    <p>여기에 ${viewport.toUpperCase()} 콘텐츠를 작성하세요.</p>

    <!-- 변경 영역 1 -->
    <div class="mark-area">
      <div class="marker" style="top:-12px; left:-12px;">1</div>
      <p>이 영역이 변경됩니다.</p>
    </div>

    <div class="img-placeholder">[이미지]</div>

    <!-- 변경 영역 2 -->
    <div class="mark-area">
      <div class="marker" style="top:-12px; left:-12px;">2</div>
      <button class="btn">CTA 버튼</button>
    </div>
  </div>
</body>
</html>
`;
}

const inputDir = path.join(process.cwd(), 'input');
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

if (!mobileOnly) {
  const pcPath = path.join(inputDir, `mockup-pc.html`);
  fs.writeFileSync(pcPath, template('pc'), 'utf8');
  console.log(`[OK] ${pcPath}`);
}
if (!pcOnly) {
  const moPath = path.join(inputDir, `mockup-mo.html`);
  fs.writeFileSync(moPath, template('mo'), 'utf8');
  console.log(`[OK] ${moPath}`);
}

console.log('\n다음 단계:');
console.log('1. input/mockup-pc.html (또는 mockup-mo.html) 편집');
console.log('2. node .claude/skills/plan-sb/scripts/mockup-capture.js input/mockup-pc.html input/ --name=' + name);
