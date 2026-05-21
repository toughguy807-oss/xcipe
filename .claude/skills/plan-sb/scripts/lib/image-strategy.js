const path = require('path');
const { getImageSize } = require('./image-size');

// 정책 (2026-05-12 최종):
//   wrapper = 380×900 고정 (모바일 폰 프레임)
//   이미지 width는 항상 380 → naturalH = 380 * ratio
//   naturalH <= 900 → 1 슬라이드 (wrapper height는 naturalH 만큼만, 빈 공간 없이 fit)
//   naturalH >  900 → split (각 슬라이드 wrapper 380×900, 이미지를 transform:translateY로 잘라 노출)
//   마커가 segment 경계에 걸치지 않도록 buildSegments에서 조정
const WRAPPER_W = 380;
const WRAPPER_MAX_H = 900;

function decide(imgPath, options = {}) {
  const size = getImageSize(imgPath);
  if (!size) {
    return {
      strategy: 'unknown',
      segments: [{ offset: 0, height: WRAPPER_MAX_H }],
      naturalH: WRAPPER_MAX_H,
      wrapperW: WRAPPER_W,
      wrapperH: WRAPPER_MAX_H,
      reason: 'no-size'
    };
  }

  const ratio = size.height / size.width;
  const wrapperW = options.wrapperW || WRAPPER_W;
  const maxH = options.maxH || WRAPPER_MAX_H;
  const naturalH = wrapperW * ratio;

  // Case 1: 이미지가 wrapper height 이하 — 1 슬라이드, wrapper height = naturalH (빈 공간 X)
  if (naturalH <= maxH) {
    return {
      strategy: 'fit',
      ratio,
      naturalH,
      wrapperW,
      wrapperH: Math.round(naturalH),
      segments: [{ offset: 0, height: Math.round(naturalH) }],
      reason: `wrapper 한 장에 fit(ratio ${ratio.toFixed(2)}) → ${wrapperW}×${Math.round(naturalH)}`
    };
  }

  // Case 2: 이미지가 wrapper height 초과 — split (각 슬라이드 wrapper 고정 380×900)
  const segments = buildSegments(naturalH, maxH, options.markers || []);
  return {
    strategy: 'split',
    ratio,
    naturalH,
    wrapperW,
    wrapperH: maxH,
    segments,
    reason: `긴 이미지(ratio ${ratio.toFixed(2)}) → ${segments.length}페이지 분할 (각 ${wrapperW}×${maxH})`
  };
}

function buildSegments(naturalH, maxH, markers) {
  const markersPx = (markers || []).map(m => {
    if (!m.overlay) return null;
    const top = parseFloat(String(m.overlay.top || '0').replace('%', ''));
    const height = parseFloat(String(m.overlay.height || '0').replace('%', ''));
    return {
      marker: m.marker,
      topPx: naturalH * top / 100,
      bottomPx: naturalH * (top + height) / 100
    };
  }).filter(Boolean);

  const segments = [];
  let offset = 0;
  const MIN_SEG_H = 200;

  while (offset < naturalH) {
    let pageEnd = Math.min(offset + maxH, naturalH);
    for (const m of markersPx) {
      if (m.topPx >= offset && m.topPx < pageEnd && m.bottomPx > pageEnd) {
        const adjustedEnd = m.topPx;
        if (adjustedEnd - offset >= MIN_SEG_H) pageEnd = adjustedEnd;
      }
    }
    if (pageEnd - offset < MIN_SEG_H && pageEnd < naturalH) pageEnd = Math.min(offset + maxH, naturalH);
    segments.push({
      offset,
      height: pageEnd - offset,
      markers: markersPx.filter(m => m.topPx >= offset && m.bottomPx <= pageEnd).map(m => m.marker)
    });
    offset = pageEnd;
  }
  return segments;
}

module.exports = { decide, buildSegments, WRAPPER_W, WRAPPER_MAX_H };
