#!/usr/bin/env node
/**
 * overlay-helper.js — overlay 좌표 자동 측정 보조 (Phase 2.2)
 *
 * Usage:
 *   node overlay-helper.js <image-path> [--region=top:N,left:N,width:N,height:N]
 *
 * 출력: image의 픽셀 크기 + region을 % 단위로 환산 (wireframe-area 60% 컨테이너 기준)
 * 사용자가 픽셀 좌표 측정 → 이 도구가 % 환산 → JSON에 그대로 입력
 */

const fs = require('fs');
const path = require('path');

function loadPngSize(filePath) {
  // PNG IHDR chunk에서 width/height 직접 읽기 (의존성 없음)
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error('Not a PNG');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { width: w, height: h };
}

function parseRegion(s) {
  if (!s) return null;
  const out = {};
  for (const kv of s.split(',')) {
    const [k, v] = kv.split(':');
    out[k.trim()] = parseInt(v, 10);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const imgPath = args.find(a => !a.startsWith('--'));
  const region = parseRegion((args.find(a => a.startsWith('--region=')) || '').split('=')[1]);

  if (!imgPath || !fs.existsSync(imgPath)) {
    console.error('Usage: node overlay-helper.js <image-path> [--region=top:N,left:N,width:N,height:N]');
    process.exit(1);
  }

  const size = loadPngSize(imgPath);
  console.log(`이미지: ${imgPath}`);
  console.log(`크기: ${size.width}×${size.height}px`);

  if (region) {
    const pct = {
      top: ((region.top / size.height) * 100).toFixed(1) + '%',
      left: ((region.left / size.width) * 100).toFixed(1) + '%',
      width: ((region.width / size.width) * 100).toFixed(1) + '%',
      height: ((region.height / size.height) * 100).toFixed(1) + '%'
    };
    console.log('\noverlay 좌표 (JSON에 그대로 사용):');
    console.log(JSON.stringify(pct, null, 2));
  } else {
    console.log('\n사용법: --region=top:120,left:50,width:600,height:200');
    console.log('  → 픽셀 좌표를 % 단위로 환산해줍니다.');
  }
}

main();
