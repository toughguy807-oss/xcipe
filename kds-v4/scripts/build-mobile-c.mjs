// One-shot builder for ktmyr-postpaid-plan-list-mobile-c.figma.json
// Generates the JSON deterministically so all card patterns stay consistent.

import fs from 'node:fs';
import path from 'node:path';

const OUT_PATH = path.resolve(
  process.cwd(),
  'to-figma/ktmyr-postpaid-plan-list-mobile-c.figma.json'
);

const COLORS = {
  textPrimary: '#191a1b',
  textSecondary: '#55585d',
  textTertiary: '#6f737b',
  textInverse: '#ffffff',
  bgSurface: '#ffffff',
  bgSurfaceSoft: '#f8f9fa',
  fillSecondary: '#e9eaee',
  fillDisabled: '#f3f4f6',
  fillPrimary: '#191a1b',
  borderSubtle: '#d5d8dd',
  borderInactive: '#c7cad1',
  accent: '#007f7f',
  accentHover: '#005e66',
  accentPressed: '#00484e',
  accentSoft: '#e1f5f5',
  accentSoft2: '#cdeeee',
  red500: '#e0282f'
};

const SVG = {
  headset:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14 v-2 a9 9 0 0 1 18 0 v2"/><path d="M21 14 v3 a2 2 0 0 1-2 2 h-2 v-7 h2 a2 2 0 0 1 2 2 Z"/><path d="M3 14 v3 a2 2 0 0 0 2 2 h2 v-7 H5 a2 2 0 0 0-2 2 Z"/></svg>',
  search:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 L21 21"/></svg>',
  menu:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6 H21"/><path d="M3 12 H21"/><path d="M3 18 H21"/></svg>',
  chevronRight:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></svg>',
  check:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 L10 17 L19 7"/></svg>',
  plus:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5 V19"/><path d="M5 12 H19"/></svg>',
  ktMvnoLogo:
    '<svg width="108" height="38" viewBox="0 0 108 38" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.3809 15.9501H18.2173V17.7494C18.2173 18.2107 17.9944 18.4414 17.5485 18.4414H15.3809V27.9901C15.3809 28.4514 15.1657 28.6821 14.7352 28.6821H12.5907V9.14515C12.5907 8.6838 12.8136 8.45312 13.2594 8.45312H15.3809V15.9501Z" fill="#333333"/><path d="M35.9498 27.9901C35.9498 28.4514 35.7346 28.6821 35.3041 28.6821H33.1596V9.14515C33.1596 8.6838 33.3825 8.45312 33.8283 8.45312H35.9498V27.9901Z" fill="#333333"/><path fill-rule="evenodd" clip-rule="evenodd" d="M63.6969 6.84422C64.7555 8.34322 64.7555 10.3155 64.7555 14.2601V23.6488C64.7555 27.5934 64.7555 29.5657 63.6969 31.0647C62.6383 32.5637 60.7796 33.2233 57.0621 34.5426L55.5016 35.0964C48.4787 37.5887 44.9673 38.8348 42.5218 37.1077C40.0762 35.3805 40.0762 31.6546 40.0762 24.2026V13.7063C40.0762 6.25435 40.0762 2.52837 42.5218 0.801245C44.9673 -0.925876 48.4788 0.320264 55.5016 2.81254L57.0621 3.36634C60.7796 4.68559 62.6383 5.34522 63.6969 6.84422Z" fill="#499690"/></svg>',
  ktMvnoLogoBlack:
    '<svg width="108" height="38" viewBox="0 0 108 38" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.3809 15.9501H18.2173V17.7494C18.2173 18.2107 17.9944 18.4414 17.5485 18.4414H15.3809V27.9901C15.3809 28.4514 15.1657 28.6821 14.7352 28.6821H12.5907V9.14515C12.5907 8.6838 12.8136 8.45312 13.2594 8.45312H15.3809V15.9501Z" fill="#333333"/><path d="M35.9498 27.9901C35.9498 28.4514 35.7346 28.6821 35.3041 28.6821H33.1596V9.14515C33.1596 8.6838 33.3825 8.45312 33.8283 8.45312H35.9498V27.9901Z" fill="#333333"/><path fill-rule="evenodd" clip-rule="evenodd" d="M63.6969 6.84422C64.7555 8.34322 64.7555 10.3155 64.7555 14.2601V23.6488C64.7555 27.5934 64.7555 29.5657 63.6969 31.0647C62.6383 32.5637 60.7796 33.2233 57.0621 34.5426L55.5016 35.0964C48.4787 37.5887 44.9673 38.8348 42.5218 37.1077C40.0762 35.3805 40.0762 31.6546 40.0762 24.2026V13.7063C40.0762 6.25435 40.0762 2.52837 42.5218 0.801245C44.9673 -0.925876 48.4788 0.320264 55.5016 2.81254L57.0621 3.36634C60.7796 4.68559 62.6383 5.34522 63.6969 6.84422Z" fill="#333333"/></svg>'
};

// ===== helpers =====
const solid = (color) => ({ type: 'SOLID', color, opacity: 1 });

const text = (kdsId, name, characters, opts = {}) => ({
  type: 'TEXT',
  name,
  kdsId,
  characters,
  fontSize: opts.fontSize || 14,
  fontName: { family: 'Pretendard', style: opts.style || 'Medium' },
  fills: [solid(opts.color || COLORS.textPrimary)],
  width: opts.width || 200,
  textAlignHorizontal: opts.align || 'LEFT',
  textAutoResize: 'HEIGHT',
  lineHeight: { unit: 'PERCENT', value: opts.lineHeight || 140 },
  ...(opts.letterSpacing != null
    ? { letterSpacing: { unit: 'PIXELS', value: opts.letterSpacing } }
    : {})
});

const frame = (kdsId, name, opts = {}) => {
  const node = {
    type: 'FRAME',
    name,
    kdsId,
    fills: opts.fills !== undefined ? opts.fills : [solid(COLORS.bgSurface)],
    layout: {
      mode: opts.mode || 'VERTICAL',
      paddingTop: opts.pt ?? 0,
      paddingBottom: opts.pb ?? 0,
      paddingLeft: opts.pl ?? 0,
      paddingRight: opts.pr ?? 0,
      itemSpacing: opts.gap ?? 0,
      primaryAxisAlign: opts.pAlign || 'MIN',
      counterAxisAlign: opts.cAlign || 'MIN',
      primaryAxisSizing: opts.pSize || 'AUTO',
      counterAxisSizing: opts.cSize || 'AUTO'
    },
    children: opts.children || []
  };
  if (opts.width != null) node.width = opts.width;
  if (opts.height != null) node.height = opts.height;
  if (opts.cornerRadius != null) node.cornerRadius = opts.cornerRadius;
  if (opts.strokes) {
    node.strokes = opts.strokes;
    node.strokeWeight = opts.strokeWeight ?? 1;
    node.strokeAlign = opts.strokeAlign || 'INSIDE';
  }
  if (opts.clipsContent != null) node.clipsContent = opts.clipsContent;
  if (opts.layoutGrow != null) node.layoutGrow = opts.layoutGrow;
  if (opts.layoutAlign != null) node.layoutAlign = opts.layoutAlign;
  return node;
};

const svg = (kdsId, name, svgStr, width, height) => ({
  type: 'SVG',
  name,
  kdsId,
  width,
  height,
  svg: svgStr
});

// ===== Top-Nav (52) =====
const iconBtn = (kdsId, iconName, svgStr) =>
  frame(kdsId, `Icon Btn — ${iconName}`, {
    width: 40,
    height: 40,
    cornerRadius: 8,
    fills: [],
    mode: 'HORIZONTAL',
    pAlign: 'CENTER',
    cAlign: 'CENTER',
    pSize: 'FIXED',
    cSize: 'FIXED',
    children: [
      frame(`${kdsId}-icon-box`, 'Icon Box', {
        width: 24,
        height: 24,
        fills: [],
        mode: 'HORIZONTAL',
        pAlign: 'CENTER',
        cAlign: 'CENTER',
        pSize: 'FIXED',
        cSize: 'FIXED',
        children: [svg(`${kdsId}-icon-svg`, 'Icon', svgStr, 24, 24)]
      })
    ]
  });

const topNav = frame('top-nav', 'Top Navigation (52)', {
  width: 375,
  height: 52,
  strokes: [solid(COLORS.fillDisabled)],
  strokeWeight: 1,
  mode: 'HORIZONTAL',
  pl: 16,
  pr: 16,
  pAlign: 'SPACE_BETWEEN',
  cAlign: 'CENTER',
  pSize: 'FIXED',
  cSize: 'FIXED',
  children: [
    frame('top-nav-logo', 'Logo (kt-mvno)', {
      width: 89,
      height: 32,
      fills: [],
      mode: 'HORIZONTAL',
      pAlign: 'CENTER',
      cAlign: 'CENTER',
      pSize: 'FIXED',
      cSize: 'FIXED',
      children: [svg('top-nav-logo-svg', 'kt-mvno logo', SVG.ktMvnoLogo, 89, 32)]
    }),
    frame('top-nav-actions', 'Top Nav Actions', {
      fills: [],
      mode: 'HORIZONTAL',
      gap: 8,
      cAlign: 'CENTER',
      pSize: 'AUTO',
      cSize: 'AUTO',
      children: [
        iconBtn('top-nav-headset', 'headset', SVG.headset),
        iconBtn('top-nav-search', 'search', SVG.search),
        iconBtn('top-nav-menu', 'menu', SVG.menu)
      ]
    })
  ]
});

// ===== Top Tab (48) =====
const topTabItem = (kdsId, label, active, labelW) => {
  if (!active) {
    return frame(kdsId, `Tab — ${label}`, {
      fills: [],
      layoutGrow: 1,
      layoutAlign: 'STRETCH',
      mode: 'HORIZONTAL',
      pAlign: 'CENTER',
      cAlign: 'CENTER',
      pSize: 'FIXED',
      cSize: 'FIXED',
      pl: 4,
      pr: 4,
      children: [
        text(`${kdsId}-label`, 'Label', label, {
          width: labelW,
          fontSize: 14,
          style: 'Medium',
          color: COLORS.textTertiary,
          align: 'CENTER'
        })
      ]
    });
  }
  // active: vertical layout (spacer + label + indicator bar pinned to bottom)
  return frame(kdsId, `Tab — ${label} (active)`, {
    fills: [],
    layoutGrow: 1,
    layoutAlign: 'STRETCH',
    mode: 'VERTICAL',
    pAlign: 'SPACE_BETWEEN',
    cAlign: 'CENTER',
    pSize: 'FIXED',
    cSize: 'FIXED',
    children: [
      frame(`${kdsId}-spacer-top`, 'Spacer Top', {
        width: labelW,
        height: 14,
        fills: [],
        mode: 'HORIZONTAL',
        pSize: 'FIXED',
        cSize: 'FIXED'
      }),
      text(`${kdsId}-label`, 'Label', label, {
        width: labelW,
        fontSize: 14,
        style: 'Bold',
        color: COLORS.textPrimary,
        align: 'CENTER'
      }),
      frame(`${kdsId}-indicator`, 'Active Indicator (KT red)', {
        width: 60,
        height: 4,
        cornerRadius: 2,
        fills: [solid(COLORS.red500)],
        mode: 'HORIZONTAL',
        pSize: 'FIXED',
        cSize: 'FIXED'
      })
    ]
  });
};

const topTab = frame('top-tab', 'Top Tab (48)', {
  width: 375,
  height: 48,
  strokes: [solid(COLORS.fillDisabled)],
  strokeWeight: 1,
  mode: 'HORIZONTAL',
  pAlign: 'MIN',
  cAlign: 'CENTER',
  pSize: 'FIXED',
  cSize: 'FIXED',
  children: [
    topTabItem('top-tab-home', '홈', false, 40),
    topTabItem('top-tab-product', '상품', true, 50),
    topTabItem('top-tab-event', '이벤트', false, 60),
    topTabItem('top-tab-support', '고객지원', false, 70)
  ]
});

// ===== Sub Tab (chips 36) =====
const subChip = (kdsId, label, active, labelW) =>
  frame(kdsId, `Chip — ${label}${active ? ' (active)' : ''}`, {
    height: 36,
    cornerRadius: 999,
    fills: [solid(active ? COLORS.fillPrimary : COLORS.bgSurface)],
    strokes: [solid(active ? COLORS.fillPrimary : COLORS.borderSubtle)],
    strokeWeight: 1,
    mode: 'HORIZONTAL',
    pl: 16,
    pr: 16,
    pAlign: 'CENTER',
    cAlign: 'CENTER',
    pSize: 'AUTO',
    cSize: 'FIXED',
    children: [
      text(`${kdsId}-label`, 'Label', label, {
        width: labelW,
        fontSize: 14,
        style: active ? 'Bold' : 'Medium',
        color: active ? COLORS.textInverse : COLORS.textSecondary,
        align: 'CENTER'
      })
    ]
  });

const subTab = frame('sub-tab', 'Sub Tab (chips 36)', {
  width: 375,
  fills: [solid(COLORS.bgSurface)],
  clipsContent: true,
  mode: 'HORIZONTAL',
  pt: 16,
  pb: 12,
  pl: 16,
  pr: 16,
  gap: 8,
  cAlign: 'CENTER',
  pSize: 'FIXED',
  cSize: 'AUTO',
  children: [
    subChip('sub-chip-postpaid', '후불요금제', true, 76),
    subChip('sub-chip-prepaid', '선불요금제', false, 72),
    subChip('sub-chip-usim', '유심·eSIM', false, 72),
    subChip('sub-chip-extra', '부가서비스', false, 72)
  ]
});

// ===== Page Heading =====
const pageHeading = frame('page-heading', 'Page Heading', {
  width: 375,
  fills: [solid(COLORS.bgSurface)],
  mode: 'VERTICAL',
  pt: 20,
  pb: 12,
  pl: 16,
  pr: 16,
  gap: 4,
  pAlign: 'MIN',
  cAlign: 'MIN',
  pSize: 'AUTO',
  cSize: 'FIXED',
  children: [
    text('page-heading-title', 'h1', '후불요금제', {
      width: 343,
      fontSize: 22,
      style: 'Bold',
      color: COLORS.textPrimary,
      letterSpacing: -0.3
    }),
    text(
      'page-heading-sub',
      'Sub',
      '관심사별로 둘러보고 비교해보세요',
      {
        width: 343,
        fontSize: 13,
        style: 'Medium',
        color: COLORS.textTertiary,
        lineHeight: 150
      }
    )
  ]
});

// ===== Search =====
const searchWrap = frame('search-wrap', 'Search Wrap', {
  width: 375,
  fills: [solid(COLORS.bgSurface)],
  mode: 'VERTICAL',
  pt: 0,
  pb: 16,
  pl: 16,
  pr: 16,
  gap: 0,
  pSize: 'AUTO',
  cSize: 'FIXED',
  children: [
    frame('search-field', 'Search Field (text-field 52)', {
      height: 52,
      cornerRadius: 8,
      fills: [solid(COLORS.fillDisabled)],
      layoutAlign: 'STRETCH',
      mode: 'HORIZONTAL',
      pl: 16,
      pr: 16,
      gap: 8,
      pAlign: 'MIN',
      cAlign: 'CENTER',
      pSize: 'FIXED',
      cSize: 'FIXED',
      children: [
        frame('search-field-icon-box', 'Icon Box', {
          width: 20,
          height: 20,
          fills: [],
          mode: 'HORIZONTAL',
          pAlign: 'CENTER',
          cAlign: 'CENTER',
          pSize: 'FIXED',
          cSize: 'FIXED',
          children: [svg('search-field-icon-svg', 'search icon', SVG.search, 20, 20)]
        }),
        text(
          'search-field-placeholder',
          'placeholder',
          '요금제 또는 사업자명 검색',
          { width: 275, fontSize: 15, style: 'Medium', color: COLORS.textTertiary }
        )
      ]
    })
  ]
});

// ===== Plan Card =====
function planCard(kdsBase, mvno, planName, priceNum, priceMeta, data, call, msg, checked) {
  const compareSvg = checked ? SVG.check : SVG.plus;
  return frame(kdsBase, `Plan Card — ${planName}`, {
    cornerRadius: 12,
    fills: [solid(COLORS.bgSurface)],
    strokes: [solid(COLORS.fillDisabled)],
    strokeWeight: 1,
    layoutAlign: 'STRETCH',
    mode: 'VERTICAL',
    pt: 16,
    pb: 16,
    pl: 20,
    pr: 20,
    gap: 12,
    pSize: 'AUTO',
    cSize: 'FIXED',
    children: [
      // Head row
      frame(`${kdsBase}-head`, 'Head', {
        fills: [],
        layoutAlign: 'STRETCH',
        mode: 'HORIZONTAL',
        gap: 12,
        pAlign: 'SPACE_BETWEEN',
        cAlign: 'MIN',
        pSize: 'FIXED',
        cSize: 'AUTO',
        children: [
          frame(`${kdsBase}-id`, 'Id', {
            fills: [],
            layoutGrow: 1,
            mode: 'VERTICAL',
            gap: 4,
            pSize: 'AUTO',
            cSize: 'AUTO',
            children: [
              text(`${kdsBase}-mvno`, 'MVNO', mvno, {
                width: 220,
                fontSize: 12,
                style: 'SemiBold',
                color: COLORS.textTertiary,
                letterSpacing: 0.2
              }),
              text(`${kdsBase}-name`, 'Plan Name', planName, {
                width: 220,
                fontSize: 15,
                style: 'Bold',
                color: COLORS.textPrimary
              })
            ]
          }),
          frame(`${kdsBase}-compare`, `Compare ${checked ? '(checked)' : ''}`, {
            width: 24,
            height: 24,
            cornerRadius: 4,
            fills: [solid(checked ? COLORS.accent : COLORS.bgSurface)],
            strokes: [solid(checked ? COLORS.accent : COLORS.borderSubtle)],
            strokeWeight: 1.5,
            mode: 'HORIZONTAL',
            pAlign: 'CENTER',
            cAlign: 'CENTER',
            pSize: 'FIXED',
            cSize: 'FIXED',
            children: [
              frame(`${kdsBase}-compare-icon-box`, 'Icon Box', {
                width: 16,
                height: 16,
                fills: [],
                mode: 'HORIZONTAL',
                pAlign: 'CENTER',
                cAlign: 'CENTER',
                pSize: 'FIXED',
                cSize: 'FIXED',
                children: [
                  svg(`${kdsBase}-compare-icon-svg`, 'icon', compareSvg, 16, 16)
                ]
              })
            ]
          })
        ]
      }),
      // Price row
      frame(`${kdsBase}-price-row`, 'Price Row', {
        fills: [],
        layoutAlign: 'STRETCH',
        mode: 'HORIZONTAL',
        gap: 8,
        pAlign: 'SPACE_BETWEEN',
        cAlign: 'CENTER',
        pSize: 'FIXED',
        cSize: 'AUTO',
        children: [
          frame(`${kdsBase}-price`, 'Price', {
            fills: [],
            mode: 'HORIZONTAL',
            gap: 2,
            pAlign: 'MIN',
            cAlign: 'CENTER',
            pSize: 'AUTO',
            cSize: 'AUTO',
            children: [
              text(`${kdsBase}-price-num`, 'Price Num', priceNum, {
                width: 110,
                fontSize: 22,
                style: 'Bold',
                color: COLORS.accent,
                letterSpacing: -0.5,
                lineHeight: 120
              }),
              text(`${kdsBase}-price-suffix`, 'Price Suffix', '/월', {
                width: 22,
                fontSize: 13,
                style: 'Bold',
                color: COLORS.textPrimary
              })
            ]
          }),
          text(`${kdsBase}-price-meta`, 'Price Meta', priceMeta, {
            width: 140,
            fontSize: 12,
            style: 'Medium',
            color: COLORS.textTertiary,
            align: 'RIGHT'
          })
        ]
      }),
      // Specs row (3 cells, top divider)
      frame(`${kdsBase}-specs`, 'Specs', {
        fills: [],
        layoutAlign: 'STRETCH',
        strokes: [solid(COLORS.fillDisabled)],
        strokeWeight: 1,
        strokeAlign: 'INSIDE',
        mode: 'HORIZONTAL',
        pt: 12,
        gap: 12,
        pAlign: 'MIN',
        cAlign: 'CENTER',
        pSize: 'FIXED',
        cSize: 'AUTO',
        children: [
          specCell(`${kdsBase}-spec-data`, '데이터', data),
          specCell(`${kdsBase}-spec-call`, '통화', call),
          specCell(`${kdsBase}-spec-msg`, '메세지', msg)
        ]
      })
    ]
  });
}

function specCell(kdsBase, label, value) {
  return frame(kdsBase, `Spec — ${label}`, {
    fills: [],
    layoutGrow: 1,
    mode: 'VERTICAL',
    gap: 2,
    pAlign: 'MIN',
    cAlign: 'MIN',
    pSize: 'AUTO',
    cSize: 'AUTO',
    children: [
      text(`${kdsBase}-label`, 'Label', label, {
        width: 90,
        fontSize: 11,
        style: 'Medium',
        color: COLORS.textTertiary
      }),
      text(`${kdsBase}-value`, 'Value', value, {
        width: 90,
        fontSize: 13,
        style: 'Bold',
        color: COLORS.textPrimary
      })
    ]
  });
}

// ===== Section =====
function section(kdsBase, emoji, title, count, cards, withTopDivider) {
  return frame(kdsBase, `Section — ${title}`, {
    width: 375,
    fills: [solid(COLORS.bgSurface)],
    ...(withTopDivider
      ? {
          strokes: [solid(COLORS.bgSurfaceSoft)],
          strokeWeight: 8,
          strokeAlign: 'INSIDE'
        }
      : {}),
    mode: 'VERTICAL',
    pt: withTopDivider ? 24 : 20,
    pb: 12,
    gap: 12,
    pSize: 'AUTO',
    cSize: 'FIXED',
    children: [
      // Head
      frame(`${kdsBase}-head`, 'Section Head', {
        fills: [],
        layoutAlign: 'STRETCH',
        mode: 'HORIZONTAL',
        pl: 16,
        pr: 16,
        gap: 12,
        pAlign: 'SPACE_BETWEEN',
        cAlign: 'CENTER',
        pSize: 'FIXED',
        cSize: 'AUTO',
        children: [
          frame(`${kdsBase}-title-row`, 'Title Row', {
            fills: [],
            layoutGrow: 1,
            mode: 'HORIZONTAL',
            gap: 8,
            pAlign: 'MIN',
            cAlign: 'CENTER',
            pSize: 'AUTO',
            cSize: 'AUTO',
            children: [
              text(`${kdsBase}-emoji`, 'Emoji', emoji, {
                width: 26,
                fontSize: 22,
                style: 'Regular',
                color: COLORS.textPrimary,
                lineHeight: 100
              }),
              text(`${kdsBase}-title`, 'Title', title, {
                width: 110,
                fontSize: 17,
                style: 'Bold',
                color: COLORS.textPrimary,
                letterSpacing: -0.2
              }),
              frame(`${kdsBase}-count`, 'Count Badge', {
                height: 22,
                cornerRadius: 999,
                fills: [solid(COLORS.accentSoft)],
                mode: 'HORIZONTAL',
                pl: 8,
                pr: 8,
                pAlign: 'CENTER',
                cAlign: 'CENTER',
                pSize: 'AUTO',
                cSize: 'FIXED',
                children: [
                  text(`${kdsBase}-count-label`, 'Count', String(count), {
                    width: 20,
                    fontSize: 12,
                    style: 'Bold',
                    color: COLORS.accentPressed,
                    align: 'CENTER'
                  })
                ]
              })
            ]
          }),
          frame(`${kdsBase}-more`, 'More', {
            fills: [],
            mode: 'HORIZONTAL',
            gap: 2,
            pAlign: 'MIN',
            cAlign: 'CENTER',
            pSize: 'AUTO',
            cSize: 'AUTO',
            children: [
              text(`${kdsBase}-more-label`, 'Label', '전체 보기', {
                width: 56,
                fontSize: 13,
                style: 'SemiBold',
                color: COLORS.textSecondary
              }),
              frame(`${kdsBase}-more-icon-box`, 'Icon Box', {
                width: 14,
                height: 14,
                fills: [],
                mode: 'HORIZONTAL',
                pAlign: 'CENTER',
                cAlign: 'CENTER',
                pSize: 'FIXED',
                cSize: 'FIXED',
                children: [
                  svg(
                    `${kdsBase}-more-icon-svg`,
                    'chevron-right',
                    SVG.chevronRight,
                    14,
                    14
                  )
                ]
              })
            ]
          })
        ]
      }),
      // List
      frame(`${kdsBase}-list`, 'Plan Cards (3)', {
        fills: [],
        layoutAlign: 'STRETCH',
        mode: 'VERTICAL',
        pl: 16,
        pr: 16,
        gap: 12,
        pAlign: 'MIN',
        cAlign: 'MIN',
        pSize: 'AUTO',
        cSize: 'FIXED',
        children: cards
      }),
      // Section CTA (Medium 44)
      frame(`${kdsBase}-cta`, 'Section CTA', {
        height: 44,
        cornerRadius: 8,
        fills: [solid(COLORS.bgSurface)],
        strokes: [solid(COLORS.borderSubtle)],
        strokeWeight: 1,
        layoutAlign: 'STRETCH',
        mode: 'HORIZONTAL',
        pl: 16,
        pr: 16,
        gap: 4,
        pAlign: 'CENTER',
        cAlign: 'CENTER',
        pSize: 'FIXED',
        cSize: 'FIXED',
        // 좌우 16 외곽 여백을 만들기 위해 별도 wrapper 사용 (아래)
        children: [
          text(`${kdsBase}-cta-label`, 'Label', `${title} ${count}개 모두 보기`, {
            width: 220,
            fontSize: 13,
            style: 'Bold',
            color: COLORS.textPrimary,
            align: 'CENTER'
          }),
          frame(`${kdsBase}-cta-icon-box`, 'Icon Box', {
            width: 14,
            height: 14,
            fills: [],
            mode: 'HORIZONTAL',
            pAlign: 'CENTER',
            cAlign: 'CENTER',
            pSize: 'FIXED',
            cSize: 'FIXED',
            children: [
              svg(
                `${kdsBase}-cta-icon-svg`,
                'chevron-right',
                SVG.chevronRight,
                14,
                14
              )
            ]
          })
        ]
      })
    ]
  });
}

// Wrap section CTA with 16px horizontal margin
function ctaMargin(kdsBase, sectionNode) {
  // find the cta child and wrap it
  const children = sectionNode.children;
  const ctaIdx = children.findIndex((c) => c.kdsId === `${kdsBase}-cta`);
  if (ctaIdx === -1) return sectionNode;
  const ctaNode = children[ctaIdx];
  // place it inside a horizontal wrapper that adds 16/16 padding
  const wrapper = frame(`${kdsBase}-cta-wrap`, 'CTA Wrap', {
    fills: [],
    layoutAlign: 'STRETCH',
    mode: 'HORIZONTAL',
    pl: 16,
    pr: 16,
    pAlign: 'MIN',
    cAlign: 'CENTER',
    pSize: 'FIXED',
    cSize: 'AUTO',
    children: [ctaNode]
  });
  // make the cta itself layoutGrow inside wrapper
  ctaNode.layoutGrow = 1;
  ctaNode.layoutAlign = 'STRETCH';
  children[ctaIdx] = wrapper;
  return sectionNode;
}

// ===== Sections data =====
const sec1 = ctaMargin(
  'section-popular',
  section(
    'section-popular',
    '👍',
    '인기 요금제',
    62,
    [
      planCard(
        'card-popular-1',
        'toss mobile',
        '토스 모바일 8GB',
        '8,800원',
        '평생 할인',
        '8GB',
        '100분',
        '100건',
        false
      ),
      planCard(
        'card-popular-2',
        'M mobile',
        'M 무제한 100GB',
        '33,000원',
        '평생 할인',
        '100GB+',
        '무제한',
        '무제한',
        true
      ),
      planCard(
        'card-popular-3',
        '스카이라이프',
        '스카이라이프 4GB+',
        '4,800원',
        '7개월 이후 12,800원',
        '4GB',
        '무제한',
        '무제한',
        false
      )
    ],
    false
  )
);

const sec2 = ctaMargin(
  'section-bonus',
  section(
    'section-bonus',
    '🎁',
    '제휴혜택',
    34,
    [
      planCard(
        'card-bonus-1',
        'EG',
        'EG 알뜰 11GB + 컴포즈',
        '11,000원',
        '컴포즈 음료 1잔/월',
        '11GB',
        '100분',
        '50건',
        false
      ),
      planCard(
        'card-bonus-2',
        '쉐이크',
        '쉐이크 7GB + 멜론',
        '13,200원',
        '멜론 30일 무료',
        '7GB',
        '100분',
        '100건',
        true
      ),
      planCard(
        'card-bonus-3',
        'toss mobile',
        '토스 100GB + 토스카드',
        '35,000원',
        '토스카드 캐시백',
        '100GB',
        '무제한',
        '무제한',
        false
      )
    ],
    true
  )
);

const sec3 = ctaMargin(
  'section-parent',
  section(
    'section-parent',
    '👵',
    '부모님',
    28,
    [
      planCard(
        'card-parent-1',
        '이지모바일',
        '이지 시니어 2.5GB',
        '1,900원',
        '평생 할인',
        '2.5GB',
        '100분',
        '100건',
        false
      ),
      planCard(
        'card-parent-2',
        '스카이라이프',
        '스카이라이프 효도 4GB',
        '4,800원',
        '평생 할인',
        '4GB',
        '무제한',
        '무제한',
        false
      ),
      planCard(
        'card-parent-3',
        '헬로모바일',
        '효도폰 5GB',
        '9,900원',
        '평생 할인',
        '5GB',
        '200분',
        '100건',
        false
      )
    ],
    true
  )
);

const sec4 = ctaMargin(
  'section-teen',
  section(
    'section-teen',
    '🧑',
    '청소년',
    19,
    [
      planCard(
        'card-teen-1',
        'KT 마이알뜰폰',
        '안심 청소년 3GB',
        '3,300원',
        '평생 할인',
        '3GB',
        '50분',
        '50건',
        false
      ),
      planCard(
        'card-teen-2',
        'toss mobile',
        '토스 청소년 5GB',
        '4,400원',
        '평생 할인',
        '5GB',
        '100분',
        '100건',
        false
      ),
      planCard(
        'card-teen-3',
        'M mobile',
        'M Kid 4GB',
        '5,500원',
        '평생 할인',
        '4GB',
        '100분',
        '100건',
        false
      )
    ],
    true
  )
);

const sec5 = ctaMargin(
  'section-unlimited',
  section(
    'section-unlimited',
    '♾️',
    '완전 무제한',
    41,
    [
      planCard(
        'card-unlimited-1',
        'M mobile',
        'M 풀무제한 200GB',
        '42,900원',
        '평생 할인',
        '200GB',
        '무제한',
        '무제한',
        false
      ),
      planCard(
        'card-unlimited-2',
        'toss mobile',
        '토스 풀 무제한',
        '39,000원',
        '평생 할인',
        '무제한',
        '무제한',
        '무제한',
        false
      ),
      planCard(
        'card-unlimited-3',
        '쉐이크',
        '쉐이크 풀무제한',
        '35,200원',
        '평생 할인',
        '무제한',
        '무제한',
        '무제한',
        false
      )
    ],
    true
  )
);

// ===== Compare Sticky =====
const compareBar = frame('compare-bar', 'Sticky Compare Bar', {
  width: 375,
  height: 88,
  fills: [solid(COLORS.bgSurface)],
  strokes: [solid(COLORS.fillDisabled)],
  strokeWeight: 1,
  mode: 'HORIZONTAL',
  pt: 16,
  pb: 16,
  pl: 16,
  pr: 16,
  gap: 12,
  pAlign: 'MIN',
  cAlign: 'CENTER',
  pSize: 'FIXED',
  cSize: 'FIXED',
  children: [
    frame('compare-count', 'Compare Count', {
      fills: [],
      layoutGrow: 1,
      mode: 'VERTICAL',
      gap: 2,
      pAlign: 'MIN',
      cAlign: 'MIN',
      pSize: 'AUTO',
      cSize: 'AUTO',
      children: [
        text(
          'compare-count-label',
          'Label',
          '비교 대상 요금제',
          { width: 180, fontSize: 12, style: 'Medium', color: COLORS.textTertiary }
        ),
        text(
          'compare-count-value',
          'Value',
          '2개 선택',
          {
            width: 180,
            fontSize: 14,
            style: 'Bold',
            color: COLORS.accent
          }
        )
      ]
    }),
    frame('compare-cta', 'CTA — 비교하기', {
      height: 48,
      cornerRadius: 8,
      fills: [solid(COLORS.accent)],
      mode: 'HORIZONTAL',
      pl: 24,
      pr: 24,
      pAlign: 'CENTER',
      cAlign: 'CENTER',
      pSize: 'AUTO',
      cSize: 'FIXED',
      children: [
        text('compare-cta-label', 'Label', '비교하기', {
          width: 56,
          fontSize: 15,
          style: 'Bold',
          color: COLORS.textInverse,
          align: 'CENTER'
        })
      ]
    })
  ]
});

// ===== Footer =====
const footer = frame('footer', 'Footer', {
  width: 375,
  fills: [solid(COLORS.bgSurfaceSoft)],
  mode: 'VERTICAL',
  pt: 20,
  pb: 32,
  pl: 16,
  pr: 16,
  gap: 8,
  pAlign: 'MIN',
  cAlign: 'MIN',
  pSize: 'AUTO',
  cSize: 'FIXED',
  children: [
    frame('footer-logo', 'Logo', {
      width: 89,
      height: 32,
      fills: [],
      mode: 'HORIZONTAL',
      pAlign: 'MIN',
      cAlign: 'CENTER',
      pSize: 'FIXED',
      cSize: 'FIXED',
      children: [
        svg('footer-logo-svg', 'kt-mvno-black logo', SVG.ktMvnoLogoBlack, 89, 32)
      ]
    }),
    text(
      'footer-copy',
      'Copy',
      '(주)케이티 · 사업자등록번호 102-81-42945',
      {
        width: 343,
        fontSize: 11,
        style: 'Medium',
        color: COLORS.textTertiary,
        lineHeight: 150
      }
    )
  ]
});

// ===== ROOT =====
const ROOT = {
  type: 'FRAME',
  name: 'Screen — Postpaid Plan List Mobile C (Category Sections)',
  kdsId: 'screen-root',
  width: 375,
  fills: [solid(COLORS.bgSurface)],
  layout: {
    mode: 'VERTICAL',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    itemSpacing: 0,
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    primaryAxisSizing: 'AUTO',
    counterAxisSizing: 'FIXED',
    minHeight: 2980
  },
  clipsContent: false,
  children: [topNav, topTab, subTab, pageHeading, searchWrap, sec1, sec2, sec3, sec4, sec5, compareBar, footer]
};

const DOC = {
  version: 1,
  name: 'KT 마이알뜰폰 후불요금제 — 시안 C: 카테고리별 섹션 분할 (Mobile)',
  root: ROOT
};

fs.writeFileSync(OUT_PATH, JSON.stringify(DOC, null, 2), 'utf8');
console.log(`Wrote ${OUT_PATH} (${fs.statSync(OUT_PATH).size} bytes)`);
