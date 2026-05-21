/**
 * 화면설계서 HTML 템플릿 생성기 v2 (16:9 슬라이드 덱)
 *
 * v2 변경사항:
 * - .frame → .slide (1920×1080px, overflow:hidden)
 * - @page { size: 1920px 1080px landscape; margin: 0; }
 * - Design 레이아웃: 좌 60% 와이어프레임 / 우 40% Description
 * - fnRef 렌더링: Description 패널 하단 [FN 참조] 섹션
 * - msgCases 자동 별도 슬라이드 분리 (인라인 혼재 금지)
 * - 메타 테이블 → 슬라이드 헤더 바로 통합
 *
 * CSS는 lib/styles.js로 분리 (v2.1)
 */

const { css } = require('./lib/styles');

/**
 * 슬라이드 헤더 바 (좌: ID/Name, 우: Company/Writer/Date)
 */
function renderSlideHeader(screen, data, title) {
  const p = data.project;
  const companyName = p.company?.name || '';

  if (title) {
    // 커버/History/Overview 등 특수 슬라이드용
    return `<div class="slide-header">
  <div class="hd-left"><span class="hd-id">${title}</span></div>
  <div class="hd-right">${companyName}${p.writer && p.writer !== companyName ? ' | ' + p.writer : ''}${p.date ? ' | ' + p.date : ''}</div>
</div>`;
  }

  const id = screen.interfaceId || '';
  const name = screen.interfaceName || '';
  const page = screen.pageName || '';
  const location = screen.location || '';
  const rightHtml = `${companyName}${p.writer && p.writer !== companyName ? ' | ' + p.writer : ''}${p.date ? ' | ' + p.date : ''}`;

  if (location) {
    return `<div class="slide-header slide-header--2row">
  <div class="hd-row1">
    <div class="hd-left">
      ${id ? `<span class="hd-id">${id}</span>` : ''}
      ${name ? `<span class="hd-sep">|</span><span class="hd-name">${name}</span>` : ''}
      ${page ? `<span class="hd-sep">|</span><span>${page}</span>` : ''}
    </div>
    <div class="hd-right">${rightHtml}</div>
  </div>
  <div class="hd-row2">${location}</div>
</div>`;
  }

  return `<div class="slide-header">
  <div class="hd-left">
    ${id ? `<span class="hd-id">${id}</span>` : ''}
    ${name ? `<span class="hd-sep">|</span><span class="hd-name">${name}</span>` : ''}
    ${page ? `<span class="hd-sep">|</span><span>${page}</span>` : ''}
  </div>
  <div class="hd-right">${rightHtml}</div>
</div>`;
}

/**
 * 화면 메타 테이블 (참조 PDF 포맷 — Design 슬라이드 헤더 아래)
 * Assignment | 과제명 | Interface Type | (Mobile) Page | Interface ID | (None) | Writer | ELUO
 * Location   | 경로   | Interface Name | 화면명         |             |        | Date   | 날짜
 */
function renderScreenMeta(screen, data) {
  const p = data.project;
  const iface = (data.overview && data.overview.interfaces || []).find(i =>
    (i.channel || '').toLowerCase().includes(screen.viewportType === 'Mobile' ? 'mo' : 'pc') ||
    (i.channel || '').toLowerCase() === 'pc/mo'
  ) || (data.overview && data.overview.interfaces || [])[0] || {};

  const assignment = p.title || '';
  const ifType = `(${screen.viewportType}) ${iface.interfaceType || 'Page'}`;
  const ifId = screen.interfaceId || iface.pageId || '(None)';
  const writer = p.writer || '';
  const location = screen.location || [iface.depth1, iface.depth2, iface.depth3].filter(d => d && d !== '-').join(' → ') || '';
  const ifName = (screen.interfaceName || '').replace(/\s*\(\d+\/\d+\)/, '');
  const date = p.date || '';

  return `<table class="screen-meta">
  <tr>
    <th>Assignment</th><td>${assignment}</td>
    <th>Interface Type</th><td>${ifType}</td>
    <th>Interface ID</th><td>${ifId}</td>
    <th>Writer</th><td>${writer}</td>
  </tr>
  <tr>
    <th>Location</th><td>${location}</td>
    <th>Interface Name</th><td>${ifName}</td>
    <th colspan="2"></th>
    <th>Date</th><td>${date}</td>
  </tr>
</table>`;
}

/**
 * 슬라이드 푸터 (테마 기반 — 프로젝트별 자동 적용)
 */
function renderSlideFooter(screen, data) {
  const p = data.project;
  const theme = data._theme || {};
  const footerLeft = theme.footerLeft || p.writer || '';
  const footerRight = theme.footerRight || p.company?.name || p.serviceName || '';
  const logoHtml = theme.logo?.type === 'text' ? theme.logo.html : '';
  return `<div class="slide-footer-wrap">
  <div class="slide-footer">
    <span class="footer-left">${footerLeft}</span>
    <span class="footer-right">${logoHtml ? logoHtml + '&nbsp;&nbsp;' : ''}${footerRight ? `<span class="footer-writer">${footerRight}</span>` : ''}<span class="slide-num" data-num=""></span></span>
  </div>
  <div class="slide-footer-bottom"></div>
</div>`;
}

/**
 * 커버 슬라이드 (테마 기반 — 프로젝트별 자동 적용)
 */
function renderCover(data, theme) {
  const p = data.project;
  const logo = theme.logo || { type: 'none' };
  const outputPrefix = p.outputPrefix || p.title || '';
  const companyTag = p.company?.name ? `[${p.company.name}]` : '';

  // 참조 라인: [회사명][과제번호]_[SR]_타이틀
  const jiraPart = p.jiraNo ? `[${p.jiraNo}]` : '';
  const srPart = p.srNo && p.srNo !== '-' ? `_[${p.srNo}]` : '';
  const refLine = `${companyTag}${jiraPart}${srPart} ${p.title || ''}`;

  // 버전 라인
  const dateCompact = (p.date || '').replace(/-/g, '');
  const versionLine = `${jiraPart}${srPart}_Ver ${p.version || '1.0'}_${dateCompact}`;

  // 로고 (테마 기반)
  let logoHtml;
  if (logo.type === 'image' && logo.imagePath) {
    logoHtml = `<img src="${logo.imagePath}" alt="Logo" style="max-height:180px;">`;
  } else if (logo.type === 'text' && logo.html) {
    logoHtml = `<div class="cover-logo-large">${logo.html}</div>`;
  } else {
    logoHtml = `<div class="cover-logo-large">${p.company?.name || p.serviceName || ''}</div>`;
  }

  return `
<div class="slide" data-slide-type="cover">
  ${renderSlideHeader(null, data, '화면설계서')}
  <div class="cover-layout">
    <div class="cover-logo-area">${logoHtml}</div>
    <div class="cover-text-area">
      <div class="cover-service-name">${p.serviceName || p.title || ''}</div>
      <div class="cover-version-line">Ver ${p.version || '1.0'}  |  ${p.date || ''}</div>
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

/**
 * 커버 메타 테이블 (작성/검토/승인)
 */
function renderCoverMetaTable(p) {
  const hasReviewers = p.reviewers && p.reviewers.length > 0;
  const hasApprovers = p.approvers && p.approvers.length > 0;
  if (!hasReviewers && !hasApprovers) return '';

  return `
  <table class="cover-meta">
    <thead><tr><th></th><th>작성</th><th>검토</th><th>승인</th></tr></thead>
    <tbody>
      <tr>
        <th>일자</th>
        <td>${p.date || ''}</td>
        <td>${p.reviewDate || ''}</td>
        <td>${p.approveDate || ''}</td>
      </tr>
      <tr>
        <th>담당</th>
        <td>${p.writer || ''}</td>
        <td>${(p.reviewers || []).join(', ')}</td>
        <td>${(p.approvers || []).join(', ')}</td>
      </tr>
      <tr><th>서명</th><td></td><td></td><td></td></tr>
    </tbody>
  </table>`;
}

/**
 * History 슬라이드 (참조 PDF 포맷)
 */
function renderHistory(data) {
  const p = data.project;
  if (!data.history || data.history.length === 0) return '';

  const rows = data.history.map(h => `
    <tr>
      <td style="text-align:center">${h.version}</td>
      <td style="text-align:center">${h.date}</td>
      <td>${h.detail}</td>
      <td style="text-align:center">${h.page || '-'}</td>
      <td style="text-align:center">${h.writer}</td>
      <td>${h.remarkers || ''}</td>
    </tr>`).join('');

  return `
<div class="slide" data-slide-type="history">
  ${renderSlideHeader(null, data, 'History')}
  <div class="slide-body" style="display:flex;flex-direction:column;overflow:hidden;">
    <div class="history-title">History</div>
    <div class="slide-content" style="flex:1;padding:0 30px;">
      <table>
        <thead>
          <tr>
            <th style="width:80px">Version</th>
            <th style="width:110px">Update Date</th>
            <th>Update Detail</th>
            <th style="width:50px">page</th>
            <th style="width:70px">Writer</th>
            <th>Remarkers</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

/**
 * Overview 슬라이드 — type별 분기
 */
function renderOverview(data) {
  const ov = data.overview;
  if (!ov) return '';

  switch (ov.type) {
    case 'assignment': return renderAssignmentOverview(data);
    case 'sitemap': return renderSitemapOverview(data);
    case 'summary': default: return renderSummaryOverview(data);
  }
}

function renderAssignmentOverview(data) {
  const p = data.project;
  const ov = data.overview;

  // 01. Assignment Properties 띠(divider) 슬라이드 — 가운데 정렬
  const divBullets = (ov.divider?.bullets || []).map(b =>
    `<li style="list-style:disc; margin-left:18px; margin-bottom:10px; font-size:16px; color:#ccc;">${b}</li>`).join('');
  const dividerSlide = `
<div class="slide" data-slide-type="divider" style="background:linear-gradient(135deg, #1a1a1a 0%, #111 100%); color:#fff;">
  <div class="slide-body" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px 120px;">
    <div style="font-size:14px; color:#aaa; margin-bottom:12px;">${ov.divider?.sub || 'Assignment Definition for Operational'}</div>
    <div style="font-size:30px; font-weight:700; margin-bottom:24px;">${ov.divider?.main || '01. Assignment Properties'}</div>
    <ul style="text-align:left; display:inline-block;">${divBullets}</ul>
  </div>
</div>`;

  // Assignment Detail 슬라이드 (참조 PDF: 세로 accent 바 + 타이틀 + 테이블)
  const detailSlide = `
<div class="slide" data-slide-type="overview">
  ${renderSlideHeader(null, data, 'Operational Assignment Detail')}
  <div class="slide-body" style="display:flex;flex-direction:column;overflow:hidden;">
    <div style="flex:1;padding:0 30px;overflow:auto;">
      <div style="border-top:2px solid #333;margin-bottom:16px;"></div>
      <table>
        <thead><tr>
          <th>Assignment title</th>
          <th>Assignment Detail</th>
          <th style="width:120px">Requestor</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="font-weight:600;">${p.title || ''}</td>
            <td>${ov.content?.detail || ''}</td>
            <td>${p.requestor || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;

  const interfaceSlide = renderInterfaceList(data);
  return dividerSlide + '\n' + detailSlide + '\n' + interfaceSlide;
}

function renderSitemapOverview(data) {
  const p = data.project;
  const ov = data.overview;
  const interfaces = ov.interfaces || [];

  const rows = interfaces.map(i => `
    <tr>
      <td style="text-align:center">${i.depth1 || ''}</td>
      <td style="text-align:center">${i.depth2 || ''}</td>
      <td style="text-align:center">${i.depth3 || ''}</td>
      <td style="text-align:center">${i.depth4 || '-'}</td>
      <td style="text-align:center">${i.workType || ''}</td>
    </tr>`).join('');

  return `
<div class="slide" data-slide-type="overview">
  ${renderSlideHeader(null, data, ov.title || 'Site Map')}
  <div class="slide-body slide-content">
    <table>
      <thead><tr>
        <th>1 Depth</th><th>2 Depth</th><th>3 Depth</th><th>4 Depth</th><th style="width:70px">Work Type</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

function renderSummaryOverview(data) {
  const p = data.project;
  const ov = data.overview;
  const overviewText = ov.content?.detail || ov.content?.summary || '';

  const infoRows = [
    ['프로젝트명', p.serviceName || p.title || ''],
    ['버전', `Ver ${p.version || '1.0'}`],
    ['작성일', p.date || ''],
    ['작성자', p.writer || ''],
  ].filter(r => r[1]).map(r =>
    `<tr><td style="width:100px; padding:6px 10px; font-weight:600; color:#555; background:#f8f9fa; border:1px solid #e0e0e0; font-size:11px;">${r[0]}</td><td style="padding:6px 10px; border:1px solid #e0e0e0; font-size:11px; color:#333;">${r[1]}</td></tr>`
  ).join('');

  return `
<div class="slide" data-slide-type="overview">
  ${renderSlideHeader(null, data, ov.title || 'Overview')}
  <div class="slide-body slide-content">
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">${infoRows}</table>
    <div style="font-size:12px; line-height:1.8; color:#333; padding:10px 14px; background:#f8f9fa; border-left:3px solid #1a1a1a;">
      ${overviewText}
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

function renderInterfaceList(data) {
  const p = data.project;
  const interfaces = data.overview?.interfaces || [];
  if (interfaces.length === 0) return '';

  const rows = interfaces.map(i => `
    <tr>
      <td style="text-align:center">${i.office || ''}</td>
      <td style="text-align:center">${i.channel || ''}</td>
      <td style="text-align:center">${i.depth1 || ''}</td>
      <td style="text-align:center">${i.depth2 || ''}</td>
      <td style="text-align:center">${i.depth3 || ''}</td>
      <td style="text-align:center">${i.depth4 || '-'}</td>
      <td style="text-align:center">${i.interfaceType || ''}</td>
      <td style="text-align:center">${i.workType || ''}</td>
      <td style="text-align:center">${i.pageId || '(None)'}</td>
    </tr>`).join('');

  return `
<div class="slide" data-slide-type="overview">
  ${renderSlideHeader(null, data, 'Task Target InterFace List')}
  <div class="slide-body" style="display:flex;flex-direction:column;overflow:hidden;">
    <div style="flex:1;padding:0 30px;overflow:auto;">
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width:80px">Office</th>
            <th rowspan="2" style="width:65px">Channel</th>
            <th colspan="4">Target Interface</th>
            <th rowspan="2" style="width:90px">Interface Type</th>
            <th rowspan="2" style="width:65px">Work Type</th>
            <th rowspan="2" style="width:65px">Page ID</th>
          </tr>
          <tr><th>1 Depth</th><th>2 Depth</th><th>3 Depth</th><th>4 Depth</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

/**
 * 와이어프레임 엘리먼트 렌더
 */
function renderAppearanceStyle(appearance) {
  if (!appearance || typeof appearance !== 'object') return '';
  const map = {
    align: 'align-self', maxWidth: 'max-width', minWidth: 'min-width',
    background: 'background', borderRadius: 'border-radius', padding: 'padding',
    margin: 'margin', border: 'border', gap: 'gap', color: 'color',
    fontSize: 'font-size', fontWeight: 'font-weight', textAlign: 'text-align',
    display: 'display', flexDirection: 'flex-direction', justifyContent: 'justify-content',
    alignItems: 'align-items', flexWrap: 'flex-wrap', opacity: 'opacity',
    boxShadow: 'box-shadow', width: 'width', height: 'height',
    position: 'position', top: 'top', right: 'right', bottom: 'bottom', left: 'left',
    overflow: 'overflow', zIndex: 'z-index'
  };
  return Object.entries(appearance)
    .filter(([k]) => map[k])
    .map(([k, v]) => `${map[k]}:${v}`)
    .join(';');
}

/**
 * containerType !== 'page' 전용 렌더러.
 * .wf-el CSS 클래스를 사용하지 않고 appearance 인라인 스타일만으로 렌더링.
 */
function renderCleanElement(el) {
  const markerHtml = el.marker ? `<span style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:#CC3333;color:#fff;border-radius:50%;text-align:center;line-height:18px;font-size:9px;font-weight:700;z-index:2;">${el.marker}</span>` : '';
  const ap = renderAppearanceStyle(el.appearance);
  const h = el.height ? `min-height:${el.height}px;` : '';
  const markedBorder = el.marker ? 'border:1px dashed #CC3333;' : '';
  const pos = el.marker ? 'position:relative;' : '';

  const baseStyle = `${pos}${markedBorder}${h}${ap}`;

  switch (el.type) {
    case 'header': {
      const defaultStyle = 'display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:#333;color:#fff;border-radius:12px 12px 0 0;font-size:13px;';
      const kids = (el.children || []).map(c => renderCleanElement(c)).join('');
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${kids || el.label || 'Header'}</div>`;
    }
    case 'text': {
      const defaultStyle = 'font-size:13px;line-height:1.5;';
      const text = (el.label || '').replace(/\\n/g, '<br>');
      return `<span style="${defaultStyle}${ap}">${text}</span>`;
    }
    case 'input': {
      const defaultStyle = 'flex:1;background:#fff;border:1px solid #ddd;border-radius:20px;padding:8px 14px;font-size:12px;color:#999;';
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${el.label || el.placeholder || 'Input'}</div>`;
    }
    case 'button': {
      const isPrimary = el.variant === 'primary';
      const defaultStyle = isPrimary
        ? 'display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;background:#333;color:#fff;border:none;cursor:default;'
        : 'display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:500;background:#fff;color:#555;border:1px solid #ccc;cursor:default;';
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${el.label || 'Button'}</div>`;
    }
    case 'image': {
      const isAvatar = el.variant === 'avatar' || el.variant === 'circle';
      const radius = isAvatar ? 'border-radius:50%;' : 'border-radius:4px;';
      const defaultStyle = `display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#e0e0e0,#e0e0e0 4px,#f0f0f0 4px,#f0f0f0 12px);border:1px solid #ccc;${radius}font-size:11px;color:#999;`;
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${el.label || 'Image'}</div>`;
    }
    case 'card': {
      const defaultStyle = 'background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden;';
      const kids = (el.children || []).map(c => renderCleanElement(c)).join('');
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${kids}</div>`;
    }
    case 'divider':
      return `<div style="border-top:1px solid #eee;margin:4px 0;"></div>`;
    case 'table': {
      const headers = (el.headers || []).map(h => `<th style="background:#f5f5f5;padding:4px 6px;border:1px solid #ddd;font-size:10px;">${h}</th>`).join('');
      const rows = (el.rows || []).map(r => `<tr>${r.map(c => `<td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;">${c}</td>`).join('')}</tr>`).join('');
      return `<div style="${pos}${markedBorder}">${markerHtml}<table style="width:100%;border-collapse:collapse;"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'group':
    default: {
      const defaultStyle = el.type === 'group' ? '' : 'padding:4px;';
      const kids = (el.children || []).map(c => renderCleanElement(c)).join('');
      const fallback = (!kids && el.label) ? `<span style="font-size:11px;color:#999;">${el.label}</span>` : '';
      return `<div style="${defaultStyle}${baseStyle}">${markerHtml}${fallback}${kids}</div>`;
    }
  }
}

function renderWfElement(el) {
  const markerHtml = el.marker ? `<span class="wf-marker">${el.marker}</span>` : '';
  const markedCls = el.marker ? ' wf-el--marked' : '';
  const labelHtml = el.label ? `<span class="wf-label">${el.label}</span>` : '';
  const h = el.height ? `min-height:${el.height};` : '';
  const appearanceStyle = renderAppearanceStyle(el.appearance);

  switch (el.type) {
    case 'header': {
      const kids = el.children || [];
      if (kids.length > 0) {
        // children이 있으면 구조화 레이아웃: 좌(로고) / 중앙(nav) / 우(input/버튼)
        const logoKid = kids.find(c => c.role === 'logo' || (c.type === 'text' && !c.role));
        const navKid  = kids.find(c => c.type === 'nav' || c.type === 'gnb');
        const searchKid = kids.find(c => c.type === 'input');
        const otherKids = kids.filter(c => c !== logoKid && c !== navKid && c !== searchKid);

        const leftHtml = logoKid
          ? `<div class="wf-header-logo">${logoKid.label || '로고'}</div>`
          : `<div class="wf-header-logo">${el.label || 'LOGO'}</div>`;

        const centerHtml = navKid
          ? (navKid.items || []).map(i => `<span class="wf-nav-tab">${i}</span>`).join('')
          : '';

        const rightHtml = [
          searchKid ? `<div class="wf-header-search">${searchKid.label || '검색'}</div>` : '',
          ...otherKids.map(c => renderWfElement(c))
        ].filter(Boolean).join('');

        return `<div class="wf-el wf-el--header-structured${markedCls}" style="${h}">
          ${markerHtml}
          <div class="wf-header-left">${leftHtml}</div>
          <div class="wf-header-center">${centerHtml}</div>
          <div class="wf-header-right">${rightHtml}</div>
        </div>`;
      }
      // children 없는 경우: label을 | 구분자로 파싱해 구조화 시도
      // 형식: "로고명 | 메뉴1/메뉴2/메뉴3 | 우측아이템1 | 우측아이템2"
      const parts = (el.label || '').split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const logoText = parts[0];
        // parts[1]을 /로 split → 메뉴 탭들
        const menuItems = parts[1].split('/').map(m => m.trim()).filter(Boolean);
        // parts[2..] → 우측 아이템 (검색, 언어 버튼 등)
        const rightItems = parts.slice(2);
        const menuTabsHtml = menuItems.map(m => `<span class="wf-nav-tab">${m}</span>`).join('');
        const rightHtml = rightItems.length > 0
          ? rightItems.map(r => `<div class="wf-header-search">${r}</div>`).join('')
          : '';
        return `<div class="wf-el wf-el--header-structured${markedCls}" style="${h}">
          ${markerHtml}
          <div class="wf-header-left"><div class="wf-header-logo">${logoText}</div></div>
          <div class="wf-header-center">${menuTabsHtml}</div>
          <div class="wf-header-right">${rightHtml}</div>
        </div>`;
      }
      return `<div class="wf-el wf-el--header${markedCls}" style="${h}">${markerHtml}${el.label || 'Header'}</div>`;
    }
    case 'gnb': {
      const gnbItems = (el.items || ['메뉴1', '메뉴2', '메뉴3']);
      const tabsHtml = gnbItems.map(i => `<span class="wf-gnb-tab">${i}</span>`).join('');
      return `<div class="wf-el wf-el--gnb-tabs${markedCls}" style="${h}">${markerHtml}${tabsHtml}</div>`;
    }
    case 'nav': {
      // LNB 탭 — GNB와 분리하여 별도 스타일 적용
      const lnbItems = (el.items || el.label ? (el.items || el.label.split('|').map(s => s.trim()).filter(Boolean)) : ['탭1', '탭2', '탭3']);
      const lnbTabsHtml = lnbItems.map(i => `<span class="wf-lnb-tab">${i}</span>`).join('');
      return `<div class="wf-el wf-el--nav-lnb${markedCls}" style="${h}">${markerHtml}${lnbTabsHtml}</div>`;
    }
    case 'text': {
      // label 키워드 기반 자동 role 감지
      const lbl = (el.label || '').toLowerCase();
      const isTitleKw = /타이틀|제목|title|heading|h1|h2|h3|섹션명|페이지명/.test(lbl);
      const isSubKw   = /소제목|subtitle|소타이틀/.test(lbl);
      const isBreadKw = /breadcrumb|경로|위치|home|홈|네비게이션|위치경로/.test(lbl);
      const isCountKw = /건|개|count|total|총|결과수|항목수/.test(lbl);

      if (isTitleKw) {
        const text = el.content || el.label || '타이틀';
        return `<div class="wf-el wf-el--text-title${markedCls}" style="${h}">${markerHtml}<span class="wf-text-title">${text}</span></div>`;
      }
      if (isSubKw) {
        const text = el.content || el.label || '소제목';
        return `<div class="wf-el wf-el--text-subtitle${markedCls}" style="${h}">${markerHtml}<span class="wf-text-subtitle">${text}</span></div>`;
      }
      if (isBreadKw) {
        const text = el.content || el.label || '홈 > 페이지';
        return `<div class="wf-el wf-el--text-breadcrumb${markedCls}" style="${h}">${markerHtml}<span class="wf-breadcrumb">${text}</span></div>`;
      }
      if (isCountKw) {
        const text = el.content || el.label || '총 0건';
        return `<div class="wf-el wf-el--text-count${markedCls}" style="${h}">${markerHtml}<span class="wf-count-text">${text}</span></div>`;
      }
      const content = el.content ? `<div class="wf-content">${el.content}</div>` : '';
      const textStyle = [h, appearanceStyle].filter(Boolean).join(';');
      return `<div class="wf-el wf-el--text${markedCls}" style="${textStyle}">${markerHtml}${labelHtml}${content}</div>`;
    }
    case 'input':
      return `<div class="wf-el wf-el--input${markedCls}" style="${h}">${markerHtml}${el.label || el.placeholder || 'Input'}</div>`;
    case 'button': {
      const variant = el.variant === 'primary' ? ' wf-el--button-primary'
        : el.variant === 'outline' ? ' wf-el--button-outline' : '';
      return `<div class="wf-el wf-el--button${variant}${markedCls}" style="${h}">${markerHtml}${el.label || 'Button'}</div>`;
    }
    case 'card': {
      const kids = el.children || [];
      const imgKids = kids.filter(c => c.type === 'image');
      const btnKids = kids.filter(c => c.type === 'button');
      const restKids = kids.filter(c => c.type !== 'image' && c.type !== 'button');

      // 썸네일 영역 — 이미지 children이 있을 때만 렌더. 텍스트/KPI 카드에 빈 플레이스홀더 삽입 금지.
      const thumbHtml = imgKids.length > 0
        ? `<div class="wf-card-thumb">${imgKids[0].label || 'Thumbnail'}</div>`
        : '';

      // 본문 (badge + 타이틀 + 설명) — text children 키워드 기반 스마트 분기
      const BADGE_KW  = /카테고리|태그|유형|분류|지역|지구|타입|badge|category|tag|type/i;
      const TITLE_KW  = /명칭|제목|타이틀|title|name|장소명|관광지명|이름|행사명/i;
      let bodyContent = '';
      let titleAssigned = false;
      const badgeParts = [];
      const descParts  = [];
      for (const c of restKids) {
        if (c.type !== 'text') { descParts.push(renderWfElement(c)); continue; }
        const cLbl = (c.label || '').toLowerCase();
        if (BADGE_KW.test(cLbl)) {
          badgeParts.push(`<span class="wf-card-badge">${c.content || c.label}</span>`);
        } else if (!titleAssigned && TITLE_KW.test(cLbl)) {
          descParts.unshift(`<div class="wf-card-title">${c.content || c.label}</div>`);
          titleAssigned = true;
        } else {
          descParts.push(`<div class="wf-card-desc">${c.content || c.label || ''}</div>`);
        }
      }
      if (el.label && !titleAssigned) bodyContent += `<div class="wf-card-title">${el.label}</div>`;
      if (badgeParts.length) bodyContent = badgeParts.join('') + bodyContent;
      bodyContent += descParts.join('');
      const bodyHtml = bodyContent ? `<div class="wf-card-body">${bodyContent}</div>` : '';

      // 액션 버튼
      const actionHtml = btnKids.length > 0
        ? `<div class="wf-card-action">${btnKids.map(c => renderWfElement(c)).join('')}</div>`
        : '';

      return `<div class="wf-el wf-el--card${markedCls}" style="${h}">${markerHtml}${thumbHtml}${bodyHtml}${actionHtml}</div>`;
    }
    case 'image':
      return `<div class="wf-el wf-el--image${markedCls}" style="${h}">${markerHtml}${el.label || 'Image'}</div>`;
    case 'gallery': {
      const count = el.count || (el.images && el.images.length) || 4;
      const thumbH = el.thumbHeight || '90px';
      const imgs = el.images && el.images.length > 0
        ? el.images.map(img => `<div class="wf-el wf-el--image" style="min-height:${thumbH}">${img.label || ''}</div>`).join('')
        : Array.from({length: count}, (_, i) => `<div class="wf-el wf-el--image" style="min-height:${thumbH}">이미지 ${i+1}</div>`).join('');
      return `<div class="wf-el wf-el--gallery${markedCls}" style="${h}">${markerHtml}${imgs}</div>`;
    }
    case 'map':
      return `<div class="wf-el wf-el--map${markedCls}" style="${h}">${markerHtml}${el.label || '지도 (카카오맵 API)'}</div>`;
    case 'list': {
      const items = (el.items || []).map(i => `<li>${i}</li>`).join('');
      return `<div class="wf-el wf-el--list${markedCls}" style="${h}">${markerHtml}${labelHtml}<ul>${items}</ul></div>`;
    }
    case 'banner':
      return `<div class="wf-el wf-el--banner${markedCls}" style="${h}">${markerHtml}${el.label || 'Banner'}</div>`;
    case 'divider':
      return `<div class="wf-el wf-el--divider"></div>`;
    case 'table': {
      const headers = (el.headers || []).map(h => `<th>${h}</th>`).join('');
      const rows = (el.rows || []).map(r =>
        `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
      return `<div class="wf-el wf-el--table${markedCls}" style="${h}">${markerHtml}${labelHtml}<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'popup': {
      const hasClose = el.close !== false;
      const hasNav = el.nav !== false && el.navDots !== false;
      const isBottom = el.variant === 'bottom';
      const imageLabel = el.imageLabel || el.label || '팝업 이미지';
      const closeHtml = hasClose ? `<div class="wf-popup-close">✕</div>` : '';
      const handleHtml = isBottom ? `<div class="wf-popup-handle"></div>` : '';
      const navHtml = hasNav ? `<div class="wf-popup-nav">
        <div class="wf-popup-nav-btn">◀</div>
        <div class="wf-popup-dots"><span class="active"></span><span></span><span></span></div>
        <div class="wf-popup-nav-btn">▶</div>
      </div>` : '';
      const rawActions = el.actions || ['오늘 하루 보지 않기', '닫기'];
      const actionsHtml = rawActions.map(a => {
        const lbl = typeof a === 'string' ? a : (a.label || 'Button');
        return `<span style="font-size:12px;color:#666;cursor:default;">${lbl}</span>`;
      }).join('<span style="color:#ddd;margin:0 4px;">|</span>');
      const wrapCls = isBottom ? 'wf-popup-wrap wf-popup-wrap--bottom' : 'wf-popup-wrap';
      const popupCls = isBottom ? `wf-el--popup wf-el--popup--bottom${markedCls}` : `wf-el--popup${markedCls}`;
      const actionsCls = isBottom ? 'wf-popup-actions wf-popup-actions--bottom' : 'wf-popup-actions';
      return `<div class="${wrapCls}" style="position:relative;min-height:${el.height || 500}px;">
        <div class="${popupCls}">
          ${markerHtml}${closeHtml}${handleHtml}
          <div class="wf-popup-image" style="min-height:${Math.max((el.height || 500) * 0.6, 150)}px;">${imageLabel}</div>
          ${navHtml}
          <div class="${actionsCls}">${actionsHtml}</div>
        </div>
      </div>`;
    }
    case 'group': {
      const layout = el.layout || 'default';

      if (layout === 'tags') {
        const kids = el.children || [];
        const tagsHtml = kids.map(c => {
          const txt = c.content || c.label || '';
          return `<span class="wf-el--tag">#${txt}</span>`;
        }).join('');
        return `<div class="wf-el wf-el--group--tags${markedCls}" style="${h}">${markerHtml}${tagsHtml}</div>`;
      }

      if (layout === 'popup') {
        const kids = el.children || [];
        const closeKid = kids.find(c => c.role === 'close');
        const imageKid = kids.find(c => c.role === 'image' || (c.type === 'image' && !c.role));
        const navKid   = kids.find(c => c.role === 'nav');
        const footerKid = kids.find(c => c.role === 'footer');

        // Close button — absolute top-right
        let closePart = '';
        if (closeKid) {
          const mInline = closeKid.marker ? `<span class="wf-marker-inline">${closeKid.marker}</span>` : '';
          closePart = `<div class="wf-grp-close">${mInline}<div class="wf-grp-close-btn">✕</div></div>`;
        } else {
          closePart = `<div class="wf-grp-close"><div class="wf-grp-close-btn">✕</div></div>`;
        }

        // Image area
        let imagePart = '';
        if (imageKid) {
          const im = imageKid.marker ? `<span class="wf-marker">${imageKid.marker}</span>` : '';
          const markedI = imageKid.marker ? ' wf-el--marked' : '';
          imagePart = `<div class="wf-grp-image${markedI}">${im}${imageKid.label || '이미지'}</div>`;
        } else {
          imagePart = `<div class="wf-grp-image">이미지</div>`;
        }

        // Nav area (좌우 버튼 + 인디케이터)
        let navPart = '';
        if (navKid) {
          const nm = navKid.marker ? `<span class="wf-marker">${navKid.marker}</span>` : '';
          const navContent = (navKid.children || []).map(c => renderWfElement(c)).join('');
          navPart = `<div class="wf-grp-nav">${nm}${navContent}</div>`;
        }

        // Footer area (액션 버튼)
        let footerPart = '';
        if (footerKid) {
          const fm = footerKid.marker ? `<span class="wf-marker">${footerKid.marker}</span>` : '';
          const markedF = footerKid.marker ? ' wf-el--marked' : '';
          const footerContent = (footerKid.children || []).map(c => renderWfElement(c)).join('');
          footerPart = `<div class="wf-grp-footer${markedF}">${fm}${footerContent}</div>`;
        }

        return `<div class="wf-el wf-el--group wf-el--group--popup${markedCls}" style="${h}">
          ${markerHtml}${closePart}${imagePart}${navPart}${footerPart}
        </div>`;
      }

      // default layout — children 타입 자동 감지로 레이아웃 결정
      const kids = el.children || [];
      const allCards   = kids.length > 0 && kids.every(c => c.type === 'card');
      const allButtons = kids.length > 0 && kids.every(c => c.type === 'button');

      if (allCards) {
        // 카드 그리드: children 수로 열 수 결정
        const cols = kids.length <= 2 ? 'cols-2' : kids.length >= 4 ? 'cols-4' : '';
        const childrenHtml = kids.map(c => renderWfElement(c)).join('');
        return `<div class="wf-el wf-el--group--card-grid ${cols}${markedCls}" style="${h}">${markerHtml}${childrenHtml}</div>`;
      }

      if (allButtons) {
        // 버튼 필터 행: 가로 나열
        const childrenHtml = kids.map(c => renderWfElement(c)).join('');
        return `<div class="wf-el wf-el--group--btn-row${markedCls}" style="${h}">${markerHtml}${childrenHtml}</div>`;
      }

      // layout 또는 direction으로 가로 배치 판단
      const isHorizontal = layout === 'horizontal' || el.direction === 'horizontal';
      const dirCls = isHorizontal ? ' wf-el--group--horizontal' : '';
      const children = kids.map(c => renderWfElement(c)).join('');
      const groupFallback = (!children && el.label) ? `<span class="wf-label">${el.label}</span>` : '';
      const groupStyle = [h, appearanceStyle].filter(Boolean).join(';');
      return `<div class="wf-el wf-el--group${dirCls}${markedCls}" style="${groupStyle}">${markerHtml}${groupFallback}${children}</div>`;
    }
    default:
      return `<div class="wf-el${markedCls}" style="${h}">${markerHtml}${labelHtml}${el.content || el.type}</div>`;
  }
}

/**
 * wireframe[] → wfHtml 자동 생성 (Option A)
 * renderWfElement를 사용하되 tight-layout을 위한 wf-auto 마커 HTML 반환.
 * 반환값은 renderDesignLayout 내부에서 wf-auto 클래스 viewport에 삽입됨.
 */
function autoWfHtml(wireframe) {
  if (!wireframe || wireframe.length === 0) return '';
  return wireframe.map(el => renderWfElement(el)).join('');
}

/**
 * PM 코멘트 블록
 */
function renderPmComments(pmComments) {
  if (!pmComments || pmComments.length === 0) return '';
  const typeLabels = { risk: '위험', question: '질문', suggestion: '제안', reject: '반대' };
  const items = pmComments.map(c => {
    const badgeClass = `pm-badge pm-badge--${c.type || 'question'}`;
    const label = typeLabels[c.type] || c.type;
    return `<div class="pm-comment">
      <span class="${badgeClass}">${label}</span><span class="pm-author">${c.author || 'PM'}</span>
      <div style="margin-top:3px;">${c.comment}</div>
    </div>`;
  }).join('');
  return `<div class="pm-comment-section"><h5>PM Comments</h5>${items}</div>`;
}

/**
 * 변경 유형 태그
 */
function renderChangeTag(changeType) {
  if (!changeType) return '';
  const map = {
    '변경': 'modify', 'modify': 'modify', 'changed': 'modify',
    '추가': 'add', 'add': 'add', 'added': 'add', 'new': 'add',
    '삭제': 'delete', 'delete': 'delete', 'removed': 'delete', 'remove': 'delete'
  };
  const cls = map[changeType.toLowerCase()] || 'modify';
  return `<span class="desc-change-tag desc-change-tag--${cls}">${changeType}</span>`;
}

/**
 * fnRef 섹션 렌더 (Description 패널 하단)
 * - fnRef 배열이 비어있으면 렌더하지 않음
 */
function renderFnRef(descriptions) {
  if (!descriptions || descriptions.length === 0) return '';
  const allFnRefs = [];
  for (const d of descriptions) {
    if (d.fnRef && d.fnRef.length > 0) {
      allFnRefs.push(...d.fnRef);
    }
  }
  if (allFnRefs.length === 0) return '';
  const uniqueFnRefs = [...new Set(allFnRefs)];
  return `<div class="fn-ref-section">
  <div class="fn-ref-title">FN 참조</div>
  <div class="fn-ref-list">${uniqueFnRefs.join(', ')}</div>
</div>`;
}

/**
 * Description 테이블 v2 — 번호 | 상세설명
 * pmComments는 이 테이블 안에 포함하지 않음 (2026-05-18 분리 — renderPmCommentsSlide로 별도 슬라이드 처리)
 */
function renderDescriptionTableV2(descriptions) {
  if (!descriptions || descriptions.length === 0) return '';

  let rows = '';
  const commonNote = descriptions.find(d => d.commonNote)?.commonNote;
  if (commonNote) {
    rows += `<tr class="desc-common-row">
      <td class="desc-num-cell" style="font-weight:600;">공통</td>
      <td class="desc-content-cell">- ${commonNote}</td>
    </tr>`;
  }

  for (const d of descriptions) {
    // section 타입: 전체 colspan 소제목 행
    if (d.type === 'section') {
      rows += `<tr class="desc-section-row"><td colspan="2">${d.label || ''}</td></tr>`;
      continue;
    }

    // standalone continuation: marker/label/items 없고 continuation만 있음
    if (!d.marker && !d.label && !(d.items && d.items.length) && d.continuation) {
      const contText = d.continuation === 'next' ? '▶ 다음 슬라이드에 계속됨' : '◀ 이전 슬라이드에서 이어짐';
      rows += `<tr class="desc-cont-row"><td colspan="2">${contText}</td></tr>`;
      continue;
    }

    let content = '';
    if (d.label) {
      content += `<div style="font-weight:700; margin-bottom:3px;">${d.label}</div>`;
    }
    if (d.items && d.items.length > 0) {
      let subIndex = 1;
      for (const item of d.items) {
        const level = item.level || 1;
        const indentClass = `desc-indent-${Math.min(level, 4)}`;
        const numPrefix = item.num ? `${item.num}) ` : '';

        // 텍스트 선두의 수기 서브 넘버링(①②③... / 1. 1) / (1)) 자동 제거 → 자동 넘버링으로 대체
        let itemText = (item.text || '').replace(/^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|\(\d+\)|\d+[\.\)])\s*/, '');

        // 자동 서브 넘버링 — level 1 items + marker 존재 시 "1-1", "1-2" 형식
        let autoNumHtml = '';
        if (level === 1 && !item.num && d.marker) {
          autoNumHtml = `<span class="desc-sub-num">${d.marker}-${subIndex}.</span> `;
          subIndex++;
        }

        let textEl;
        if (item.highlight === 'important') {
          textEl = `<span class="desc-important">■ ${itemText}</span>`;
        } else if (item.highlight === 'variable') {
          textEl = `<span class="desc-var">■ ${itemText}</span>`;
        } else {
          const prefix = level === 1
            ? (autoNumHtml ? '' : '- ')
            : level === 3 ? '> '
            : level === 4 ? '└ '
            : '';
          textEl = `${prefix}${autoNumHtml}${numPrefix}${itemText}`;
        }
        content += `<div class="${indentClass}">${textEl}</div>`;
      }
    } else if (d.details && d.details.length > 0) {
      for (const detail of d.details) {
        content += `<div class="desc-indent-1">- ${detail}</div>`;
      }
    }
    if (d.before || d.after) {
      let baHtml = '<div style="margin-top:5px;">';
      if (d.before) {
        baHtml += `<div class="desc-label">수정 전</div><div class="desc-before">${d.before}</div>`;
      }
      if (d.after) {
        baHtml += `<div class="desc-label">수정 후</div><div class="desc-after">${d.after}</div>`;
      }
      baHtml += '</div>';
      content += baHtml;
    }
    if (d.continuation) {
      const contText = d.continuation === 'next' ? '▶ 다음 슬라이드에 계속됨' : '◀ 이전 슬라이드에서 이어짐';
      content += `<div class="desc-continuation">${contText}</div>`;
    }

    // issue 타입: ISSUE 레이블 행
    if (d.type === 'issue') {
      rows += `<tr class="desc-issue-row">
      <td class="desc-num-cell desc-issue-label">ISSUE</td>
      <td class="desc-content-cell">${content}</td>
    </tr>`;
      continue;
    }

    rows += `<tr>
      <td class="desc-num-cell">${d.marker}${renderChangeTag(d.changeType)}</td>
      <td class="desc-content-cell">${content}</td>
    </tr>`;
  }

  return `
  <table class="desc-table">
    <thead><tr><th colspan="2">Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Persistent 영역 — Header/GNB/Breadcrumb/LNB/Footer
 */
function renderPersistentHeader(persistent) {
  if (!persistent || !persistent.header) return '';
  const h = persistent.header;
  const logo = h.label || h.logo || 'Site Logo';
  const gnbItems = (h.items || []).map(i => `<span>${i}</span>`).join('');
  return `<div class="wf-persistent-header">
  <div class="site-logo">${logo}</div>
  <div class="wf-persistent-gnb">${gnbItems}</div>
</div>`;
}

function renderPersistentBreadcrumb(persistent) {
  if (!persistent || !persistent.breadcrumb) return '';
  return `<div class="wf-persistent-breadcrumb">${persistent.breadcrumb}</div>`;
}

function renderPersistentLnb(persistent) {
  if (!persistent || !persistent.lnb) return '';
  const items = (persistent.lnb.items || []).map((item, i) => {
    const isActive = i === (persistent.lnb.activeIndex || 0);
    return `<li${isActive ? ' class="active"' : ''}>${item}</li>`;
  }).join('');
  return `<div class="wf-persistent-lnb"><ul>${items}</ul></div>`;
}

function renderPersistentFooter(persistent) {
  if (!persistent || !persistent.footer) return '';
  const text = typeof persistent.footer === 'string' ? persistent.footer : 'Footer';
  return `<div class="wf-persistent-footer">${text}</div>`;
}

/**
 * Design 레이아웃: 좌 60% 와이어프레임 / 우 40% Description
 * v2: msgCases 인라인 금지 (별도 슬라이드로 자동 분리)
 */
function renderDesignLayout(screen) {
  let wireframeHtml;

  if (!screen.uiImagePath && (screen.wfHtml || screen.wireframe)) {
    // 와이어프레임 모드
    // wfHtml: Claude가 직접 생성한 레이아웃 HTML → 수동 우선 사용
    // wireframe: autoWfHtml()로 자동 생성 (Option A — tight layout, width 100%)
    const isAutoMode = !screen.wfHtml && screen.wireframe;
    const wfElements = screen.wfHtml
      ? screen.wfHtml
      : autoWfHtml(screen.wireframe);
    const maxWidth = screen.viewportType === 'Mobile' ? '375px' : '100%';
    const viewportCls = isAutoMode ? 'wf-viewport wf-auto' : 'wf-viewport';
    const persistent = screen.persistent;

    const headerHtml = renderPersistentHeader(persistent);
    const breadcrumbHtml = renderPersistentBreadcrumb(persistent);
    const lnbHtml = renderPersistentLnb(persistent);
    const footerHtml = renderPersistentFooter(persistent);

    let bodyHtml;
    if (lnbHtml) {
      bodyHtml = `<div class="wf-with-lnb">
        ${lnbHtml}
        <div class="wf-main-content">
          <div class="${viewportCls}" style="max-width:${maxWidth};">${wfElements}</div>
        </div>
      </div>`;
    } else {
      bodyHtml = `<div class="wf-scroll"><div class="${viewportCls}" style="max-width:${maxWidth};">${wfElements}</div></div>`;
    }

    wireframeHtml = `<div class="wf-container">
      ${headerHtml}${breadcrumbHtml}${bodyHtml}${footerHtml}
    </div>`;
  } else {
    // 이미지/플레이스홀더 모드
    const markers = (screen.descriptions || []).map(d => {
      if (!d.overlay) return '';
      return `<div class="marker-overlay" style="top:${d.overlay.top}; left:${d.overlay.left}; width:${d.overlay.width}; height:${d.overlay.height};">
        <span class="marker-number">${d.marker}</span>
      </div>`;
    }).join('');

    let uiContent;
    if (screen.uiImagePath) {
      // wrapper-이미지 1:1 매칭 정합화 (2026-05-18) — 좌표계 오차 차단
      // PC/Tablet/Mobile 공통: wrapper 비우면 styles.js의 셀렉터가 자동 적용 (inline-block + max-width:100%)
      // → wrapper 크기 = 이미지 실제 표시 크기 → overlay % = 이미지 % 정확 일치
      // 예외: 모바일 segments 분할(긴 이미지) 케이스만 wrapper 크기 px 고정 + translateY로 잘라봄
      const isMobile = screen.viewportType === 'Mobile';
      const strategy = screen.imageStrategy;
      const segIdx = screen._segmentIdx || 0;
      const seg = strategy && strategy.segments && strategy.segments[segIdx];
      const isSegmented = isMobile && seg && strategy.segments.length > 1;

      let wrapperStyle = '';
      let imgStyle = '';
      if (isSegmented) {
        // 분할 segment 케이스만 wrapper 크기 고정 (이미지를 translateY로 잘라 보여줌)
        const wrapperW = strategy && strategy.wrapperW ? Math.round(strategy.wrapperW) : 380;
        wrapperStyle = `width:${wrapperW}px!important;height:${Math.round(seg.height)}px!important;border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,0.15);overflow:hidden;background:#fff;position:relative;flex:0 0 auto;align-self:flex-start;`;
        imgStyle = `width:${wrapperW}px!important;height:auto!important;display:block;transform:translateY(-${Math.round(seg.offset)}px);max-width:none!important;`;
      }
      // 그 외(PC/Tablet/Mobile 단일): styles.js의 셀렉터 위임 — wrapper/img 인라인 비움
      // marker overlay: 분할 segment의 경우 해당 segment 영역의 마커만 표시 + 좌표 재계산
      let segMarkers = markers;
      if (isMobile && seg && strategy.segments.length > 1) {
        const naturalH = strategy.naturalH;
        const segH = seg.height;
        segMarkers = (screen.descriptions || []).map(d => {
          if (!d.overlay) return '';
          const top = parseFloat(String(d.overlay.top || '0').replace('%', ''));
          const height = parseFloat(String(d.overlay.height || '0').replace('%', ''));
          const topPx = naturalH * top / 100;
          const bottomPx = topPx + naturalH * height / 100;
          if (topPx < seg.offset || bottomPx > seg.offset + segH) return '';
          const adjTop = ((topPx - seg.offset) / segH * 100).toFixed(2);
          const adjHeight = (naturalH * height / 100 / segH * 100).toFixed(2);
          return `<div class="marker-overlay" style="top:${adjTop}%; left:${d.overlay.left}; width:${d.overlay.width}; height:${adjHeight}%;">
            <span class="marker-number">${d.marker}</span>
          </div>`;
        }).join('');
      }
      uiContent = `<div class="ui-capture-inner" style="${wrapperStyle}"><img src="${screen.uiImagePath}" alt="${screen.viewportType} UI" style="${imgStyle}">${segMarkers}</div>`;
    } else {
      uiContent = `[${screen.viewportType} UI 캡처 이미지 영역]`;
    }
    // 모바일 컨테이너는 flex로 wrapper를 중앙 상단 정렬 → 테두리가 이미지에 정확히 맞춰짐
    const captureStyle = (screen.uiImagePath && screen.viewportType === 'Mobile')
      ? 'display:flex;align-items:flex-start;justify-content:center;height:100%;padding:16px 0;'
      : '';
    wireframeHtml = `<div class="ui-capture" data-viewport="${screen.viewportType}" style="${captureStyle}">${uiContent}</div>`;
  }

  // Description 패널 (fnRef 포함) — pmComments는 별도 슬라이드로 분리 (2026-05-18)
  const descContent = renderDescriptionTableV2(screen.descriptions);
  const fnRefHtml = renderFnRef(screen.descriptions);

  // descriptions가 없으면 wireframe-area 100% (가로형 전체 와이어프레임)
  // pmComments만 있는 케이스는 별도 슬라이드로 처리되므로 hasDesc 판정에서 제외
  const hasDesc = (screen.descriptions && screen.descriptions.length > 0);

  // containerType 분기: 비표준 UI (챗봇 패널, 모달, 플로팅 패널 등)
  const ct = screen.containerType;
  if (ct && ct !== 'page') {
    const containerMap = {
      'chatbot-panel': { containerCls: 'container-chatbot', frameCls: 'chatbot-panel-frame' },
      'modal': { containerCls: 'container-modal', frameCls: 'modal-frame' },
      'floating-panel': { containerCls: 'container-floating', frameCls: 'floating-frame' }
    };
    const cfg = containerMap[ct] || containerMap['floating-panel'];
    const containerSize = screen.containerSize || {};
    const frameStyle = [
      containerSize.width ? `width:${containerSize.width}px` : '',
      containerSize.height ? `max-height:${containerSize.height}px` : ''
    ].filter(Boolean).join(';');

    // 전용 렌더러로 재생성 (.wf-el CSS 미적용)
    const cleanElements = (screen.wireframe || []).map(el => renderCleanElement(el)).join('');

    const descPanel = hasDesc ? `<div class="description-panel" style="flex:1;">${descContent}${fnRefHtml}</div>` : '';

    return `<div class="design-layout">
  <div class="${cfg.containerCls}">
    <div class="${cfg.frameCls}" style="${frameStyle}">
      <div style="flex:1;overflow-y:auto;padding:0;display:flex;flex-direction:column;">${cleanElements}</div>
    </div>
  </div>
  ${descPanel}
</div>`;
  }

  if (!hasDesc) {
    return `<div class="design-layout">
  <div class="wireframe-area" style="flex:1; border-right:none;">${wireframeHtml}</div>
</div>`;
  }

  return `<div class="design-layout">
  <div class="wireframe-area">${wireframeHtml}</div>
  <div class="description-panel">
    ${descContent}
    ${fnRefHtml}
  </div>
</div>`;
}

/**
 * 간지(Divider) 슬라이드
 */
function renderDivider(divider, data) {
  const d = divider;
  const p = data?.project || {};
  const companyName = p.company?.name || '';

  // 배경: divider.background > divider.color > 기본 다크 그라디언트
  // divider.color 단색이면 테두리 없는 솔리드 배경으로 사용
  const bgCss = d.background
    ? d.background
    : d.color
      ? `linear-gradient(135deg, ${d.color} 0%, ${shadeColor(d.color, -15)} 100%)`
      : 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)';

  const sectionNoHtml = d.sectionNo
    ? `<div class="divider-section-no">${String(d.sectionNo).padStart(2, '0')}</div>` : '';
  const subHtml = d.sub ? `<div style="font-size:14px; color:rgba(255,255,255,0.75); margin-bottom:12px; letter-spacing:0.08em; text-transform:uppercase;">${d.sub}</div>` : '';

  // main 또는 title — 둘 중 존재하는 것을 크게 표시 (title 필드 지원 추가)
  const mainText = d.main || d.title || '';
  const mainHtml = mainText
    ? `<div style="font-size:44px; font-weight:700; margin-bottom:20px; line-height:1.25; max-width:1200px; text-align:center;">${mainText}</div>` : '';

  let tocHtml = '';
  if (d.toc && d.toc.length > 0) {
    const tocItems = d.toc.map(t =>
      `<li><span class="toc-id">${t.pageId || ''}</span><span class="toc-name">${t.pageName || ''}</span></li>`
    ).join('');
    tocHtml = `<ul class="divider-toc">${tocItems}</ul>`;
  }

  let bulletsHtml = '';
  if (d.bullets && d.bullets.length > 0) {
    bulletsHtml = `<ul style="font-size:15px; color:rgba(255,255,255,0.85); text-align:left; display:inline-block;">
      ${d.bullets.map(b => `<li style="list-style:disc; margin-left:18px; margin-bottom:10px;">${b}</li>`).join('')}
    </ul>`;
  }

  return `
<div class="slide" data-slide-type="divider" style="background:${bgCss}; color:#fff;">
  <div class="slide-body" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px 120px;">
    ${sectionNoHtml}${subHtml}${mainHtml}${bulletsHtml}${tocHtml}
  </div>
</div>`;
}

// 색상 밝기 조절 — 그라디언트 구성용
function shadeColor(hex, percent) {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const num = parseInt(h, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * percent / 100)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/**
 * MSG/Dialog Case 테이블
 */
function renderMsgCaseTable(msgCases) {
  if (!msgCases || msgCases.length === 0) return '';

  const isExtended = msgCases.some(c => c.confirmAction || c.cancelAction || c.title !== undefined);

  if (isExtended) {
    const rows = msgCases.map(c => {
      const typeClass = (c.type || '').toLowerCase().includes('error') ? 'msg-type-error'
        : (c.type || '').toLowerCase().includes('process') ? 'msg-type-process'
        : (c.type || '').includes('긍정') ? 'msg-type-positive'
        : (c.type || '').includes('부정') ? 'msg-type-negative' : '';
      return `<tr>
        <td class="${typeClass}">${c.type || ''}</td>
        <td style="text-align:center">${c.subType || ''}</td>
        <td style="text-align:center">${c.no || ''}</td>
        <td>${c.situation || ''}</td>
        <td>${c.title || '(None)'}</td>
        <td>${c.message || ''}</td>
        <td>${c.confirmAction || ''}</td>
        <td>${c.cancelAction || ''}</td>
      </tr>`;
    }).join('');
    return `<table class="msg-case-table" style="word-break:keep-all;table-layout:fixed;">
      <thead><tr>
        <th style="width:60px">Type</th><th style="width:45px">SubType</th><th style="width:50px">No</th>
        <th style="width:18%">Situation Case</th><th style="width:140px">Title</th><th>Message</th>
        <th style="width:80px">확인 Action</th><th style="width:80px">취소 Action</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const rows = msgCases.map(c => {
    const typeClass = (c.type || '').toLowerCase().includes('error') ? 'msg-type-error'
      : (c.type || '').toLowerCase().includes('process') ? 'msg-type-process'
      : (c.type || '').includes('긍정') ? 'msg-type-positive'
      : (c.type || '').includes('부정') ? 'msg-type-negative' : '';
    return `<tr>
      <td class="${typeClass}">${c.type || ''}</td>
      <td style="text-align:center">${c.no || ''}</td>
      <td>${c.situation || ''}</td>
      <td>${c.message || ''}</td>
    </tr>`;
  }).join('');
  return `<table class="msg-case-table">
    <thead><tr><th style="width:55px">Type</th><th style="width:36px">No</th><th>Situation Case</th><th>Message</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * 컴포넌트 가이드 테이블
 */
function renderComponentGuide(components) {
  if (!components || components.length === 0) return '';

  // Phase 기준으로 그룹화 (rowspan)
  const phaseGroups = [];
  let currentPhase = null;
  let currentGroup = null;
  for (const c of components) {
    if (c.phase !== currentPhase) {
      currentPhase = c.phase;
      currentGroup = { phase: c.phase, items: [c] };
      phaseGroups.push(currentGroup);
    } else {
      currentGroup.items.push(c);
    }
  }

  let rows = '';
  for (const group of phaseGroups) {
    group.items.forEach((c, idx) => {
      const stateLabels = (c.states || []).map(s => {
        const cls = s.toLowerCase() === 'default' ? 'comp-state-default'
          : s.toLowerCase().includes('focus') ? 'comp-state-focus'
          : s.toLowerCase() === 'error' ? 'comp-state-error'
          : s.toLowerCase() === 'disabled' ? 'comp-state-disabled' : 'comp-state-default';
        return `<span class="comp-state-label ${cls}">${s}</span>`;
      }).join('');
      const guideImg = c.guideImagePath
        ? `<img src="${c.guideImagePath}" alt="${c.phase} ${c.sub}" style="max-width:110px; max-height:55px;">`
        : '<span style="color:#bbb; font-size:10px;">[이미지]</span>';
      const phaseCell = idx === 0
        ? `<td rowspan="${group.items.length}" style="font-weight:600; vertical-align:middle; text-align:center;">${c.phase || ''}</td>`
        : '';
      rows += `<tr>
      ${phaseCell}
      <td>${c.sub || ''}</td>
      <td style="text-align:center">${guideImg}</td>
      <td>${c.description || ''}${stateLabels ? '<br>' + stateLabels : ''}</td>
    </tr>`;
    });
  }

  return `<table class="comp-guide-table">
    <thead><tr><th style="width:90px">Phase</th><th style="width:70px">Sub</th><th style="width:120px">Guide UI</th><th>Guide Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Description 높이 추정 (px 단위 — 콘텐츠 길이 반영 정밀 휴리스틱)
 * 우측 description 컬럼 폭 ≈ 730px → 한국어 기준 한 줄 약 28자(13px font)
 * 슬라이드 높이 1080px - 헤더 40px - 푸터 30px - 패딩 20px = ~990px 가용
 */
function estimateDescHeight(desc) {
  if (!desc) return 0;
  if (desc.type === 'section') return 36;
  if (!desc.marker && !desc.label && !(desc.items && desc.items.length) && desc.continuation) return 30;
  // 보수적 추정 — 잘림 절대 방지
  // CHARS_PER_LINE 28 → 22 (더 적은 글자/줄 가정 → 더 많은 줄 → 더 일찍 분할)
  // LINE_H 18 → 22 (한국어 line-height 여유)
  const CHARS_PER_LINE = 22;
  const LINE_H = 22;
  const wrap = (text, base = 1) => {
    const len = String(text || '').length;
    if (!len) return base * LINE_H;
    return Math.max(base, Math.ceil(len / CHARS_PER_LINE)) * LINE_H;
  };
  let h = 16; // 행 패딩 (12 → 16)
  h += wrap(desc.label, 1);
  if (desc.items && desc.items.length) {
    for (const it of desc.items) h += wrap(it, 1) + 6;
  } else if (desc.details && desc.details.length) {
    for (const d of desc.details) h += wrap(typeof d === 'string' ? d : (d.text || ''), 1) + 6;
  }
  if (desc.before || desc.after) {
    h += wrap(desc.before, 1) + wrap(desc.after, 1) + 40;  // 30 → 40 박스 padding 여유
  }
  if (desc.pmComment) h += wrap(desc.pmComment, 1) + 12;
  if (desc.continuation) h += 30;
  // 최종 안전 margin 15%
  return Math.ceil(h * 1.15);
}

/**
 * Descriptions를 슬라이드별로 분할
 * maxHeight를 초과하면 자동으로 다음 그룹으로 넘김
 */
function splitDescriptions(descriptions, maxHeight) {
  if (!descriptions || descriptions.length === 0) return [descriptions || []];
  const groups = [];
  let current = [];
  let currentHeight = 30; // 테이블 헤더 높이
  for (const d of descriptions) {
    const h = estimateDescHeight(d);
    if (currentHeight + h > maxHeight && current.length > 0) {
      groups.push(current);
      current = [];
      currentHeight = 30;
    }
    current.push(d);
    currentHeight += h;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * 화면 렌더 — screenType별 분기
 * design 타입: msgCases 자동 별도 슬라이드 분리 + Description 자동 분할
 */
function renderScreen(screen, data) {
  const slides = [];

  // 간지 슬라이드
  if (screen.hasDivider && screen.divider) {
    slides.push(renderDivider(screen.divider, data));
  }

  const modifiedHtml = screen.modifiedDate
    ? `<div class="modified-marker">수정일: ${screen.modifiedDate}</div>` : '';

  // changeLog 변경이력 메모 (우측 절대위치 노트)
  let changeLogHtml = '';
  if (screen.changeLog && screen.changeLog.length > 0) {
    const logItems = screen.changeLog.map(log => `<div class="slide-changelog-item">
      <div><span class="slide-changelog-ver">${log.version || ''}</span><span class="slide-changelog-date">${log.date || ''}</span></div>
      <div class="slide-changelog-desc">${log.detail || log.description || ''}</div>
    </div>`).join('');
    changeLogHtml = `<div class="slide-changelog">
      <div class="slide-changelog-title">변경이력</div>
      ${logItems}
    </div>`;
  }

  const screenType = screen.screenType || 'design';
  const header = renderSlideHeader(screen, data, null);
  const footer = renderSlideFooter(screen, data);

  // 공통 헤더 박스 헬퍼 (비-design 슬라이드용)
  const _escH = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function renderSlideHeaderBox(s, opts = {}) {
    const idChip = s.interfaceId ? `<span style="font-weight:400;color:#666;font-size:12px;">[${_escH(s.interfaceId)}]</span>` : '';
    const extras = [];
    if (s.location) extras.push(`<div style="color:#666;font-size:12px;margin-top:4px;">위치: ${_escH(s.location)}</div>`);
    if (opts.groupDesc) extras.push(`<div style="color:#444;margin-top:6px;">${_escH(opts.groupDesc)}</div>`);
    if (opts.groupFlow) extras.push(`<div style="color:#1e40af;margin-top:6px;font-size:12px;background:#fff;padding:6px 10px;border-radius:3px;border:1px solid #dbeafe;"><b>흐름:</b> ${_escH(opts.groupFlow)}</div>`);
    if (opts.metaLine) extras.push(`<div style="color:#666;font-size:12px;margin-top:6px;">${opts.metaLine}</div>`);
    return `<div class="slide-context-box" style="margin-bottom:12px;padding:14px 18px;background:#f4f7fb;border-left:4px solid #2563eb;border-radius:4px;font-size:13px;line-height:1.6;">
      <div style="font-weight:700;color:#1e40af;margin-bottom:4px;font-size:14px;">${_escH(s.interfaceName || opts.fallbackTitle || '')} ${idChip}${opts.countSuffix || ''}</div>
      <div style="color:#333;">${_escH(s.pageName || '')}</div>
      ${extras.join('')}
    </div>`;
  }

  let bodyHtml;
  switch (screenType) {
    case 'description': {
      // Description 전용 슬라이드 (와이어프레임 없음) + 상단 타이틀 박스
      // pmComments는 별도 슬라이드로 분리됨 (renderScreen 후미에서 push)
      const titleBox = renderSlideHeaderBox(screen, { fallbackTitle: 'Description' });
      bodyHtml = `<div class="slide-body slide-content">
        ${titleBox}
        ${renderDescriptionTableV2(screen.descriptions)}
        ${renderFnRef(screen.descriptions)}
      </div>`;
      break;
    }

    case 'component': {
      // 컴포넌트 가이드 슬라이드 + 상단 타이틀 박스
      const titleBox = renderSlideHeaderBox(screen, { fallbackTitle: 'Component Guide' });
      bodyHtml = `<div class="slide-body slide-content">
        ${titleBox}
        ${renderComponentGuide(screen.components)}
      </div>`;
      break;
    }

    case 'msgCase': {
      // MSG Case 전용 슬라이드 + 상단 그룹 컨텍스트 박스
      const caseCount = (screen.msgCases || []).length;
      const groupTypes = [...new Set((screen.msgCases || []).map(c => c.type).filter(Boolean))].join(' · ');
      const groupNos = (screen.msgCases || []).map(c => c.no).filter(Boolean).join(', ');
      const ctxBox = renderSlideHeaderBox(screen, {
        fallbackTitle: 'MSG Case',
        countSuffix: ` <span style="font-weight:400;color:#666;font-size:12px;">(${caseCount}건)</span>`,
        groupDesc: screen.groupDescription,
        groupFlow: screen.groupFlow,
        metaLine: `Type: ${_escH(groupTypes || '-')} | Code: ${_escH(groupNos || '-')}`,
      });
      bodyHtml = `<div class="slide-body slide-content">
        ${ctxBox}
        ${renderMsgCaseTable(screen.msgCases)}
      </div>`;
      break;
    }

    case 'design':
    default: {
      // Design 슬라이드: 메타 테이블 + 좌 60% 와이어프레임 / 우 40% Description
      const screenMetaHtml = renderScreenMeta(screen, data);
      // Description 자동 분할: 높이 초과 시 continuation 슬라이드 생성
      const DESC_MAX_HEIGHT = 760; // px (보수화: 850→760, 안전 margin 150px)
      const descGroups = splitDescriptions(screen.descriptions, DESC_MAX_HEIGHT);

      if (descGroups.length <= 1) {
        bodyHtml = `<div class="slide-body" style="display:flex;flex-direction:column;min-height:0;">
          ${screenMetaHtml}
          <div style="flex:1;min-height:0;overflow:visible;">${renderDesignLayout(screen)}</div>
        </div>`;
      } else {
        // 첫 슬라이드: 와이어프레임 + 첫 그룹 + continuation 마커
        const contMarker = { continuation: 'next', marker: 0, label: '', items: null, type: '', details: [], overlay: null, commonNote: '', before: '', after: '', changeType: '', fnRef: [] };
        const firstScreen = { ...screen, descriptions: [...descGroups[0], contMarker] };
        bodyHtml = `<div class="slide-body" style="display:flex;flex-direction:column;min-height:0;">
          ${screenMetaHtml}
          <div style="flex:1;min-height:0;overflow:visible;">${renderDesignLayout(firstScreen)}</div>
        </div>`;
      }
      break;
    }
  }

  // 메인 슬라이드 push (항상 첫 번째)
  // Design 슬라이드: 메타 테이블이 헤더 역할, 그 외는 slideHeader 사용
  slides.push(`
<div class="slide" data-slide-type="${screenType}" style="position:relative;">
  ${modifiedHtml}
  ${changeLogHtml}
  ${bodyHtml}
  ${footer}
</div>`);

  // design 타입: Description 분할 후속 슬라이드 (메인 슬라이드 뒤에 삽입)
  // 후속 슬라이드도 design layout 유지 (좌측 UI + 우측 Description 그룹) — 페이지 왕복 없이 영역 식별 가능
  if (screenType === 'design' || !screenType) {
    const DESC_MAX_HEIGHT = 760;
    const descGroups = splitDescriptions(screen.descriptions, DESC_MAX_HEIGHT);
    if (descGroups.length > 1) {
      const prevMarker = { continuation: 'prev', marker: 0, label: '', items: null, type: '', details: [], overlay: null, commonNote: '', before: '', after: '', changeType: '', fnRef: [] };
      const nextMarker = { continuation: 'next', marker: 0, label: '', items: null, type: '', details: [], overlay: null, commonNote: '', before: '', after: '', changeType: '', fnRef: [] };
      for (let gi = 1; gi < descGroups.length; gi++) {
        const isLast = gi === descGroups.length - 1;
        const contDescs = [prevMarker, ...descGroups[gi], ...(isLast ? [] : [nextMarker])];
        const contScreen = {
          ...screen,
          descriptions: contDescs,
          interfaceName: (screen.interfaceName || '') + ` (${gi + 1}/${descGroups.length})`
        };
        const contMetaHtml = renderScreenMeta(contScreen, data);
        slides.push(`
<div class="slide" data-slide-type="design" style="position:relative;">
  <div class="slide-body" style="display:flex;flex-direction:column;min-height:0;">
    ${contMetaHtml}
    <div style="flex:1;min-height:0;overflow:visible;">${renderDesignLayout(contScreen)}</div>
  </div>
  ${footer}
</div>`);
      }
    }
  }

  // design 타입: 이미지 분할 후속 segment 슬라이드 (모바일 긴 이미지 → 좌측 image-only)
  if ((screenType === 'design' || !screenType) && screen.imageStrategy && screen.imageStrategy.segments && screen.imageStrategy.segments.length > 1) {
    for (let si = 1; si < screen.imageStrategy.segments.length; si++) {
      const segScreen = {
        ...screen,
        _segmentIdx: si,
        interfaceName: (screen.interfaceName || '') + ` (이미지 ${si + 1}/${screen.imageStrategy.segments.length})`
      };
      const segMeta = renderScreenMeta(segScreen, data);
      slides.push(`
<div class="slide" data-slide-type="design" style="position:relative;">
  <div class="slide-body" style="display:flex;flex-direction:column;min-height:0;">
    ${segMeta}
    <div style="flex:1;min-height:0;overflow:visible;">${renderDesignLayout(segScreen)}</div>
  </div>
  ${footer}
</div>`);
    }
  }

  // design 타입 + msgCases 존재 → 별도 MSG Case 슬라이드 자동 생성
  if (screenType === 'design' && screen.msgCases && screen.msgCases.length > 0) {
    const msgHeader = renderSlideHeader(
      { ...screen, interfaceName: (screen.interfaceName || '') + ' - MSG Case' },
      data, null
    );
    slides.push(`
<div class="slide" data-slide-type="msgCase">
  ${msgHeader}
  <div class="slide-body slide-content">
    ${renderMsgCaseTable(screen.msgCases)}
  </div>
  ${footer}
</div>`);
  }

  // pmComments 존재 → 별도 PM 코멘트 슬라이드 (2026-05-18 분리)
  // description 테이블 하단 합산 시 영역 초과로 잘림 + continuation 슬라이드 중복 노출 문제 해소
  if (screen.pmComments && screen.pmComments.length > 0) {
    const pmHeaderCtx = renderSlideHeaderBox(screen, {
      fallbackTitle: 'PM Comments',
      countSuffix: ` <span style="font-weight:400;color:#666;font-size:12px;">(${screen.pmComments.length}건)</span>`,
    });
    slides.push(`
<div class="slide" data-slide-type="pmComment" style="position:relative;">
  <div class="slide-body slide-content">
    ${pmHeaderCtx}
    ${renderPmComments(screen.pmComments)}
  </div>
  ${footer}
</div>`);
  }

  return slides.join('\n');
}

/**
 * End 슬라이드 (참조 PDF 포맷: "End of Document" + 우측 차콜 패널)
 */
function renderEndOfDocument(data) {
  return `
<div class="slide" data-slide-type="end">
  ${renderSlideHeader(null, data, 'END')}
  <div class="end-layout">
    <div class="end-content">
      <div class="end-content-text">END</div>
      <div style="font-size:16px; color:#aaa; margin-top:12px;">감사합니다</div>
    </div>
  </div>
  ${renderSlideFooter(null, data)}
</div>`;
}

/**
 * HTML 최종 생성
 */
function generateHTML(data, theme) {
  // 테마 정보를 data에 전달 (renderSlideFooter, renderEndOfDocument에서 사용)
  data._theme = theme;
  // 전역/공통 컴포넌트 → 슬라이드 말미에 배치 (메인 화면 먼저)
  // UI-000, MSG-*, COMP-*, DESC-*, isGlobalComponent:true 모두 포함
  const globalPrefixes = ['MSG', 'COMP', 'DESC'];
  const isGlobal = (s) => {
    const id = (s.interfaceId || '').toUpperCase();
    return globalPrefixes.some(p => id.startsWith(p + '-')) ||
           id === 'UI-000' || s.isGlobalComponent === true;
  };
  const sortedScreens = [
    ...data.screens.filter(s => !isGlobal(s)),  // 메인 화면 먼저
    ...data.screens.filter(s => isGlobal(s)),   // 공통 컴포넌트 뒤
  ];
  const screens = sortedScreens.map(s => renderScreen(s, data)).join('\n');
  const title = data.project.serviceName || data.project.title || '화면설계서';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920">
<title>화면설계서 - ${title}</title>
<style>${css(theme)}</style>
</head>
<body>
${renderCover(data, theme)}
${renderHistory(data)}
${renderOverview(data)}
${screens}
${renderEndOfDocument(data)}
<script>
(function() {
  var SLIDE_W = 1920;
  function autoScale() {
    var avail = window.innerWidth - 80;
    var scale = Math.min(1, avail / SLIDE_W);
    document.querySelectorAll('.slide').forEach(function(s) {
      s.style.zoom = scale;
    });
  }
  document.addEventListener('DOMContentLoaded', autoScale);
  window.addEventListener('resize', autoScale);
  // 슬라이드 좌측 하단 자동 넘버링
  document.addEventListener('DOMContentLoaded', function() {
    var slides = document.querySelectorAll('.slide');
    var total = slides.length;
    slides.forEach(function(s, i) {
      var num = s.querySelector('.slide-num');
      if (num) num.textContent = (i + 1) + ' / ' + total;
    });
  });
})();
</script>
</body>
</html>`;
}

module.exports = { generateHTML };
