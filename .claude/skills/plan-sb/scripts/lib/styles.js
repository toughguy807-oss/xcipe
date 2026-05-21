/**
 * 화면설계서 CSS 스타일 생성기
 *
 * template.js에서 분리. theme 객체를 받아 동적 CSS 문자열을 반환한다.
 * wireframe 관련 하드코딩 색상은 theme.wireframe.* 변수로 대체.
 */

function css(theme) {
  const wf = theme.wireframe || {};
  const headerBg = wf.headerBg || '#e8e8e8';
  const navBg = wf.navBg || '#f0f0f0';
  const elementBg = wf.elementBg || '#fafafa';
  const groupBg = wf.groupBg || '#fcfcfc';
  const placeholderBg = wf.placeholderBg || '#e0e0e0';
  const borderLight = wf.borderLight || '#ddd';
  const borderMedium = wf.borderMedium || '#ccc';
  const borderDark = wf.borderDark || '#bbb';

  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${theme.fonts.primary}; background: #fff; }

  /* 화면용: 세로 나열 (수직 스크롤) */
  @media screen {
    body { background: #4a4a4a; display: flex; flex-direction: column; align-items: center; gap: 40px; padding: 40px; overflow-y: auto; }
  }

  /* 인쇄/PDF용: 16:9 landscape */
  @page {
    size: 1920px 1080px landscape;
    margin: 0;
  }
  @media print {
    body { display: block; padding: 0; background: #fff; margin: 0; }
    .slide { page-break-after: always; border: none !important; }
    .slide:last-child { page-break-after: auto; }
  }

  /* 슬라이드 컨테이너: 1920×1080 고정 */
  .slide {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    position: relative;
    background: #fff;
    border: none;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .slide-topbar { display: none; height: 0; min-height: 0; }
  .slide-accent { display: none; height: 0; min-height: 0; }

  /* 슬라이드 헤더 */
  .slide-header {
    background: ${theme.primaryColor};
    color: #fff;
    padding: 0 24px;
    height: 54px;
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    font-size: 16px;
  }
  .slide-header .hd-left { display: flex; align-items: center; gap: 14px; }
  .slide-header .hd-id { font-weight: 700; font-size: 18px; letter-spacing: 0.5px; }
  .slide-header .hd-sep { opacity: 0.5; }
  .slide-header .hd-name { opacity: 0.9; }
  .slide-header .hd-right { opacity: 0.8; font-size: 14px; }

  /* 슬라이드 본문 */
  .slide-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* 슬라이드 푸터 */
  .slide-footer-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }
  .slide-footer {
    background: #fff;
    border-top: none;
    padding: 0 24px;
    height: 32px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    font-size: 12px;
    color: #999;
    flex-shrink: 0;
  }
  .slide-footer .footer-eluo { font-weight: 600; font-size: 12px; color: #888; letter-spacing: 1px; font-style: italic; }
  .slide-footer .footer-right { font-size: 12px; color: #555; font-weight: 700; }
  .slide-footer-bottom {
    height: 20px;
    min-height: 20px;
    background: #333;
    flex-shrink: 0;
    position: relative;
  }
  .slide-footer-bottom::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${theme.primaryColor};
  }

  /* Screen Meta Table */
  .screen-meta { width:100%; border-collapse:collapse; font-size:12px; flex-shrink:0; }
  .screen-meta th { background:#f5f5f5; font-weight:600; padding:5px 10px; border:1px solid ${borderLight}; text-align:center; white-space:nowrap; width:100px; }
  .screen-meta td { padding:5px 10px; border:1px solid ${borderLight}; font-size:12px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 16px; }
  th { background: #f5f5f5; font-weight: 600; padding: 10px 14px; border: 1px solid ${borderLight}; text-align: center; }
  td { padding: 10px 14px; border: 1px solid ${borderLight}; vertical-align: top; }
  .section-title { font-size: 22px; font-weight: 700; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #333; }

  /* Cover */
  .cover-body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 12px; }
  .cover-tab { display: none; }
  .cover-layout { display: flex; align-items: center; flex: 1; padding: 0 120px; gap: 60px; }
  .cover-logo-area { flex-shrink: 0; }
  .cover-logo-large { font-size: 140px; font-weight: 700; color: ${theme.primaryColor}; line-height: 1; font-family: Arial, Helvetica, sans-serif; }
  .cover-text-area { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .cover-ref-line { font-size: 14px; color: #333; }
  .cover-separator { border: none; border-top: 1px solid #333; margin: 4px 0; }
  .cover-service-name { font-size: 36px; font-weight: 700; color: #1a1a1a; }
  .cover-version-line { font-size: 13px; color: #888; }
  .cover-logo { font-size: 26px; font-weight: 700; color: #666; letter-spacing: 3px; margin-bottom: 24px; }
  .cover-logo-img { max-height: 96px; margin-bottom: 24px; }
  .cover-title { font-size: 40px; font-weight: 700; color: #1a1a2e; text-align: center; }
  .cover-version { font-size: 18px; color: #888; }
  .cover-meta { width: 60%; max-width: 780px; border-collapse: collapse; margin-top: 36px; font-size: 16px; }
  .cover-meta th { background: ${navBg}; font-weight: 600; padding: 8px 12px; border: 1px solid ${borderLight}; text-align: center; width: 120px; }
  .cover-meta td { padding: 8px 12px; border: 1px solid ${borderLight}; text-align: center; }

  /* Design 레이아웃: 좌 60% / 우 40% */
  .design-layout { display: flex; flex: 1; overflow: hidden; min-height: 0; }
  .wireframe-area { flex: 0 0 60%; overflow: visible; border-right: 1px solid ${borderLight}; position: relative; }

  /* containerType: chatbot-panel */
  .container-chatbot { flex: 0 0 42%; display: flex; align-items: flex-end; justify-content: flex-end; background: ${headerBg}; border-right: 1px solid ${borderLight}; padding: 16px 20px; position: relative; }
  .chatbot-panel-frame { width: 340px; max-height: 92%; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; border: 1px solid ${borderLight}; }

  /* containerType: modal */
  .container-modal { flex: 0 0 60%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); border-right: 1px solid ${borderLight}; padding: 30px; }
  .modal-frame { width: 520px; max-height: 90%; background: #fff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; }
  .modal-frame .wf-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; }

  /* containerType: floating-panel */
  .container-floating { flex: 0 0 60%; display: flex; align-items: flex-end; justify-content: flex-end; background: ${headerBg}; border-right: 1px solid ${borderLight}; padding: 20px; }
  .floating-frame { width: 360px; max-height: 85%; background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); display: flex; flex-direction: column; overflow: hidden; border: 1px solid ${borderMedium}; }
  .floating-frame .wf-scroll { flex: 1; overflow-y: auto; padding: 12px; }
  .description-panel { flex: 0 0 40%; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; }

  /* Description */
  .desc-table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6; }
  .desc-table th { background: #f5f5f5; font-weight: 600; padding: 7px 10px; border: 1px solid ${borderLight}; text-align: center; font-size: 14px; }
  .desc-table td { padding: 7px 10px; border: 1px solid ${borderLight}; vertical-align: top; font-size: 14px; }
  .desc-table .desc-num-cell { width: 56px; text-align: center; font-weight: 700; color: #333; }
  .desc-table .desc-content-cell { color: #333; }
  .desc-table .desc-common-row td { background: ${elementBg}; }
  .desc-indent-1 { padding-left: 2px; }
  .desc-sub-num { display: inline-block; min-width: 32px; font-weight: 700; color: #555; margin-right: 4px; }
  .desc-indent-2 { padding-left: 14px; }
  .desc-indent-3 { padding-left: 28px; }
  .desc-indent-4 { padding-left: 42px; }
  .desc-var { color: #e67700; font-weight: 600; }
  .desc-important { color: #c00000; font-weight: 600; }
  .desc-continuation { font-size: 10px; color: #999; font-style: italic; text-align: center; padding: 5px 0; border-top: 1px dashed ${borderLight}; }
  .desc-change-tag { display: inline-block; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 2px; margin-left: 3px; vertical-align: middle; }
  .desc-change-tag--modify { background: #fff3f3; color: #c00; border: 1px solid #c00; }
  .desc-change-tag--add { background: #f0f7ff; color: #0070c0; border: 1px solid #0070c0; }
  .desc-change-tag--delete { background: #f5f5f5; color: #666; border: 1px solid #999; text-decoration: line-through; }
  .desc-label { font-size: 9px; font-weight: 700; color: #888; margin: 2px 0; }
  .desc-before { background: #fff3f3; padding: 5px 7px; margin: 3px 0; border-left: 2px solid ${theme.accentColor}; font-size: 10px; }
  .desc-after { background: #f0fff0; padding: 5px 7px; margin: 3px 0; border-left: 2px solid #2e8b57; font-size: 10px; }

  /* fnRef 섹션 */
  .fn-ref-section { margin-top: auto; padding-top: 8px; border-top: 1px dashed ${borderLight}; }
  .fn-ref-title { font-size: 10px; font-weight: 700; color: #888; margin-bottom: 4px; }
  .fn-ref-list { font-size: 10px; color: ${theme.primaryColor}; font-family: monospace; line-height: 1.6; }

  /* Wireframe 영역 */
  .wf-container { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .wf-scroll { flex: 1; overflow-y: auto; padding: 12px 15px; }
  .wf-el { border: 1px dashed ${borderMedium}; background: ${elementBg}; padding: 10px 14px; margin: 0 0 7px 0; font-size: 13px; color: #666; position: relative; display: flex; flex-direction: column; }
  .wf-el:last-child { margin-bottom: 0; }
  .wf-el--header { background: ${headerBg}; border: 1px solid ${borderDark}; min-height: 48px; display: flex; flex-direction: row; align-items: center; justify-content: center; font-weight: 600; color: #555; font-size: 14px; }
  .wf-el--nav { background: ${navBg}; border: 1px solid ${borderMedium}; min-height: 40px; display: flex; flex-direction: row; align-items: center; gap: 16px; padding: 0 16px; }
  .wf-el--nav span { font-size: 13px; color: #888; }
  .wf-el--text { background: #fff; border: 1px dashed ${borderLight}; padding: 8px 10px; }
  .wf-el--text .wf-content { color: #333; font-size: 11px; margin-top: 3px; }
  .wf-el--input { background: #fff; border: 1px solid ${borderMedium}; border-radius: 3px; min-height: 30px; display: flex; flex-direction: row; align-items: center; padding: 0 8px; color: #aaa; font-size: 11px; }
  .wf-el--button { display: inline-flex; align-items: center; justify-content: center; min-height: 30px; padding: 0 16px; border-radius: 3px; font-size: 11px; font-weight: 600; border: 1px solid #999; background: #f5f5f5; color: #333; cursor: default; }
  .wf-el--button-primary { background: #333; color: #fff; border-color: #333; }
  .wf-el--button-outline { background: transparent; border: 1px solid #999; color: #666; }
  .wf-el--card { background: #fff; border: 1px solid ${borderLight}; border-radius: 5px; padding: 10px; }
  .wf-el--image { background: repeating-linear-gradient(45deg, ${placeholderBg}, ${placeholderBg} 4px, ${navBg} 4px, ${navBg} 12px); border: 1px solid ${borderMedium}; display: flex; flex-direction: row; align-items: center; justify-content: center; color: #999; min-height: 80px; }
  .wf-el--image::before { content: '\\1F5BC'; font-size: 16px; margin-right: 5px; }
  .wf-el--list { background: #fff; border: 1px dashed ${borderLight}; padding: 6px 10px 6px 24px; }
  .wf-el--list li { font-size: 10px; color: #555; margin-bottom: 3px; list-style: disc; }
  .wf-el--banner { background: linear-gradient(135deg, ${headerBg}, #f5f5f5); border: 1px solid ${borderMedium}; min-height: 80px; display: flex; flex-direction: row; align-items: center; justify-content: center; font-size: 15px; color: #888; font-weight: 600; }
  .wf-el--divider { border: none; border-top: 1px solid ${borderLight}; margin: 6px 0; padding: 0; min-height: 0; background: transparent; }
  .wf-el--group { border: 1px dashed ${borderDark}; background: ${groupBg}; padding: 6px; gap: 5px; }
  .wf-el--group--horizontal { flex-direction: row; flex-wrap: wrap; align-items: flex-start; }
  .wf-el--group--horizontal > .wf-el { flex: 1; min-width: 0; margin: 0 3px 3px 0; }

  /* group layout: popup */
  .wf-el--group--popup { position: relative; background: #fff; border: 2px solid #aaa !important; border-radius: 12px; padding: 0; gap: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.2); overflow: hidden; }
  .wf-grp-close { position: absolute; top: 8px; right: 10px; display: flex; align-items: center; gap: 3px; z-index: 3; }
  .wf-grp-close-btn { width: 28px; height: 28px; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; font-weight: 700; flex-shrink: 0; cursor: default; }
  .wf-grp-image { min-height: 200px; background: ${placeholderBg}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999; position: relative; flex: 1; }
  .wf-grp-image::before { content: '\\1F5BC'; font-size: 24px; margin-right: 5px; }
  .wf-grp-nav { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-top: 1px solid #eee; position: relative; }
  .wf-grp-footer { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; border-top: 1px solid #eee; background: ${elementBg}; position: relative; }
  .wf-grp-footer > .wf-el { flex: none; }
  .wf-marker-inline { display: inline-flex; width: 16px; height: 16px; background: ${theme.accentColor}; color: #fff; border-radius: 50%; font-size: 8px; font-weight: 700; align-items: center; justify-content: center; flex-shrink: 0; }

  /* popup — 센터 모달 */
  .wf-popup-wrap { display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
  .wf-el--popup { background: #fff; border: none; border-radius: 12px; padding: 0; overflow: hidden; position: relative; min-height: 200px; gap: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.25); max-width: 320px; width: 80%; }
  .wf-popup-close { position: absolute; top: 8px; right: 10px; width: 28px; height: 28px; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; z-index: 2; font-weight: 700; cursor: default; }
  .wf-popup-image { background: ${placeholderBg}; min-height: 200px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #aaa; }
  .wf-popup-image::before { content: '\\1F5BC'; font-size: 24px; margin-right: 6px; }
  .wf-popup-nav { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; }
  .wf-popup-nav-btn { width: 24px; height: 24px; border: 1px solid ${borderMedium}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; background: #fff; }
  .wf-popup-dots { display: flex; gap: 5px; align-items: center; }
  .wf-popup-dots span { width: 7px; height: 7px; border-radius: 50%; background: ${borderMedium}; display: inline-block; }
  .wf-popup-dots span.active { background: #555; }
  .wf-popup-actions { display: flex; gap: 12px; padding: 12px 16px; border-top: 1px solid #eee; background: ${elementBg}; justify-content: center; border-radius: 0 0 12px 12px; }
  .wf-popup-actions > * { flex: none; font-size: 11px; }

  /* popup variant: 바텀시트 */
  .wf-popup-wrap--bottom { align-items: flex-end; justify-content: center; }
  .wf-el--popup--bottom { border-radius: 16px 16px 0 0; max-width: 375px; width: 90%; }
  .wf-popup-handle { width: 40px; height: 4px; background: ${borderLight}; border-radius: 2px; margin: 10px auto; }
  .wf-popup-actions--bottom { border-radius: 0; }

  /* card with thumbnail */
  .wf-el--card { background: #fff; border: 1px solid ${borderLight}; border-radius: 5px; padding: 0; overflow: hidden; }
  .wf-card-thumb { background: ${headerBg}; min-height: 70px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; border-bottom: 1px solid ${borderLight}; }
  .wf-card-thumb::before { content: '\\1F5BC'; font-size: 16px; margin-right: 4px; }
  .wf-card-body { padding: 8px 10px; }
  .wf-el--table { background: #fff; }
  .wf-el--table table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .wf-el--table th { background: ${navBg}; padding: 3px 5px; border: 1px solid ${borderLight}; font-size: 9px; }
  .wf-el--table td { padding: 3px 5px; border: 1px solid ${borderLight}; font-size: 9px; }
  .wf-label { font-size: 12px; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 3px; }
  .wf-marker { position: absolute; top: 50%; left: -28px; transform: translateY(-50%); width: 24px; height: 24px; background: ${theme.accentColor}; color: #fff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; z-index: 2; }
  .wf-el--marked { border: 2px dashed ${theme.accentColor} !important; background: rgba(204, 51, 51, 0.03); }
  .wf-viewport { padding: 0 0 0 34px; }

  /* Auto-generated wireframe tight layout */
  .wf-auto > .wf-el { margin-bottom: 0; width: 100%; box-sizing: border-box; }
  .wf-auto > .wf-el--divider { margin: 0; }
  .wf-auto > .wf-el--group--card-grid { margin-bottom: 0; }
  .wf-auto > .wf-el--text-title,
  .wf-auto > .wf-el--text-subtitle,
  .wf-auto > .wf-el--text-breadcrumb,
  .wf-auto > .wf-el--text-count { margin-bottom: 0; }

  /* Header 구조 레이아웃 */
  .wf-el--header-structured { display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 0 20px; gap: 12px; background: ${headerBg}; border: 1px solid ${borderDark}; min-height: 56px; }
  .wf-header-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .wf-header-logo { font-size: 15px; font-weight: 700; color: #333; white-space: nowrap; }
  .wf-header-center { display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center; }
  .wf-header-center .wf-nav-tab { font-size: 13px; color: #777; padding: 6px 14px; cursor: default; border-bottom: 2px solid transparent; white-space: nowrap; }
  .wf-header-center .wf-nav-tab:first-child { color: #222; font-weight: 600; border-bottom-color: #333; }
  .wf-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .wf-header-search { background: #fff; border: 1px solid ${borderMedium}; border-radius: 14px; padding: 5px 14px; font-size: 11px; color: #aaa; min-width: 140px; }
  .wf-header-icon { width: 28px; height: 28px; background: #d0d0d0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666; }

  /* GNB 탭 바 */
  .wf-el--gnb-tabs { background: #f7f7f7; border-bottom: 2px solid ${borderLight}; padding: 0 20px; display: flex; flex-direction: row; align-items: flex-end; gap: 0; min-height: 44px; overflow: hidden; }
  .wf-gnb-tab { padding: 8px 18px; font-size: 13px; color: #999; cursor: default; border-bottom: 3px solid transparent; margin-bottom: -2px; white-space: nowrap; }
  .wf-gnb-tab:first-child { color: #222; font-weight: 700; border-bottom-color: #333; }

  /* 버튼 필터 행 */
  .wf-el--group--btn-row { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; padding: 10px 16px; align-items: center; background: ${elementBg}; border: 1px solid #e0e0e0; }
  .wf-el--group--btn-row .wf-el--button { margin: 0; flex: none; font-size: 12px; padding: 0 14px; height: 28px; border-radius: 14px; }
  .wf-el--group--btn-row .wf-el--button:first-child { background: #333; color: #fff; border-color: #333; }

  /* 카드 그리드 */
  .wf-el--group--card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px; background: ${groupBg}; border: 1px dashed ${borderMedium}; align-items: start; }
  .wf-el--group--card-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
  .wf-el--group--card-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .wf-el--group--card-grid .wf-el--card { margin: 0; }

  /* 카드 개선 */
  .wf-card-meta { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px 8px; font-size: 10px; color: #aaa; }
  .wf-card-title { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 3px; }
  .wf-card-desc { font-size: 10px; color: #888; line-height: 1.4; }
  .wf-card-action { margin-top: 8px; }
  .wf-card-action .wf-el--button { width: 100%; justify-content: center; font-size: 11px; height: 26px; background: ${navBg}; border-color: ${borderMedium}; }

  /* 이미지 UI 캡처 */
  .ui-capture { flex: 1; background: #f9f9f9; border-right: 1px solid ${borderLight}; display: flex; align-items: flex-start; justify-content: center; color: #999; font-size: 13px; overflow: visible; padding: 8px; }
  /* PC/Tablet 전용 — width 100% contain */
  .ui-capture[data-viewport="PC"] .ui-capture-inner, .ui-capture[data-viewport="Tablet"] .ui-capture-inner { position: relative; display: inline-block; width: 100%; }
  .ui-capture[data-viewport="PC"] .ui-capture-inner img, .ui-capture[data-viewport="Tablet"] .ui-capture-inner img { display: block; width: 100%; height: auto; }
  /* Mobile 전용 — wrapper는 inline style의 폭/높이 고정, img는 wrapper에 가득 채움 */
  .ui-capture[data-viewport="Mobile"] .ui-capture-inner { position: relative; display: inline-block; max-width: 100%; }
  .ui-capture[data-viewport="Mobile"] .ui-capture-inner img { display: block; max-width: 100%; height: auto; }
  .marker-overlay { position: absolute; border: 2px dashed ${theme.accentColor}; background: rgba(204,51,51,0.06); pointer-events: none; z-index: 1; border-radius: 4px; }
  /* 마커 위치 — 좌상단 외부 -12/-12 는 인접 마커가 서로 겹치는 원인. 내부 4/4 로 이동 + 그림자 약화. */
  .marker-number { position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; background: ${theme.accentColor}; color: #fff; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-weight: 700; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }

  /* Persistent */
  .wf-persistent-header { background: ${placeholderBg}; border-bottom: 2px solid ${borderDark}; padding: 8px 18px; min-height: 48px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .wf-persistent-header .site-logo { font-weight: 700; font-size: 15px; color: #333; }
  .wf-persistent-gnb { display: flex; gap: 14px; }
  .wf-persistent-gnb span { font-size: 10px; color: #666; }
  .wf-persistent-breadcrumb { font-size: 9px; color: #999; padding: 4px 12px; background: ${elementBg}; border-bottom: 1px solid #eee; flex-shrink: 0; }
  .wf-persistent-lnb { width: 130px; background: #f7f7f7; border-right: 1px solid ${borderLight}; padding: 8px 0; font-size: 10px; flex-shrink: 0; }
  .wf-persistent-lnb ul { list-style: none; padding: 0; margin: 0; }
  .wf-persistent-lnb li { padding: 6px 12px; color: #666; }
  .wf-persistent-lnb li.active { color: #333; font-weight: 700; background: ${headerBg}; }
  .wf-persistent-footer { background: ${placeholderBg}; border-top: 2px solid ${borderDark}; padding: 8px 12px; min-height: 36px; font-size: 9px; color: #888; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .wf-with-lnb { display: flex; flex: 1; overflow: hidden; min-height: 0; }
  .wf-main-content { flex: 1; overflow-y: auto; }

  /* 섹션 타이틀 */
  .section-title-bar { display: flex; align-items: center; gap: 14px; padding: 24px 30px 16px; }
  .section-title-bar .accent-bar { width: 6px; height: 34px; background: #333; flex-shrink: 0; border-radius: 1px; }
  .section-title-bar .title-text { font-size: 22px; font-weight: 700; color: #1a1a1a; }

  /* History 타이틀 */
  .history-title { font-size: 22px; font-weight: 700; padding-bottom: 10px; border-bottom: 2px solid #333; margin: 24px 30px 16px; }

  /* End 슬라이드 */
  .end-layout { display: flex; flex: 1; overflow: hidden; }
  .end-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .end-content-text { font-size: 28px; color: #999; font-weight: 300; letter-spacing: 2px; }

  /* Divider 슬라이드 */
  .divider-section-no { font-size: 56px; font-weight: 900; color: rgba(255,255,255,0.15); margin-bottom: 8px; }
  .divider-toc { list-style: none; padding: 0; margin-top: 20px; text-align: left; display: inline-block; }
  .divider-toc li { font-size: 12px; color: #bbb; margin-bottom: 6px; display: flex; gap: 10px; align-items: baseline; }
  .divider-toc .toc-id { color: #777; font-size: 10px; min-width: 80px; font-family: monospace; }
  .divider-toc .toc-name { color: #ddd; }

  /* MSG Case table */
  .msg-case-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  .msg-case-table th { background: #f5f5f5; font-weight: 600; padding: 5px 7px; border: 1px solid ${borderLight}; text-align: center; font-size: 11px; }
  .msg-case-table td { padding: 5px 7px; border: 1px solid ${borderLight}; vertical-align: top; font-size: 11px; }
  .msg-type-error { color: #c00000; font-weight: 600; }
  .msg-type-process { color: #0070c0; font-weight: 600; }

  /* text 역할별 스타일 */
  .wf-el--text-title { background: transparent; border: none; padding: 2px 0; flex-direction: row; align-items: center; }
  .wf-text-title { font-size: 16px; font-weight: 700; color: #1a1a1a; line-height: 1.3; }
  .wf-el--text-subtitle { background: transparent; border: none; padding: 2px 0; flex-direction: row; align-items: center; }
  .wf-text-subtitle { font-size: 13px; font-weight: 600; color: #444; }
  .wf-el--text-breadcrumb { background: transparent; border: none; padding: 2px 0; flex-direction: row; align-items: center; }
  .wf-breadcrumb { font-size: 10px; color: #aaa; letter-spacing: 0.02em; }
  .wf-el--text-count { background: transparent; border: none; padding: 2px 0; flex-direction: row; align-items: center; }
  .wf-count-text { font-size: 12px; color: #666; font-weight: 500; }

  /* 카드 뱃지 */
  .wf-card-badge { display: inline-block; font-size: 9px; padding: 2px 7px; border-radius: 10px; background: #e8f0fe; color: #3b5998; font-weight: 600; margin-bottom: 4px; }

  /* LNB 탭 (nav) */
  .wf-el--nav-lnb { background: #fff; border-bottom: 1px solid #eee; padding: 0 16px; display: flex; flex-direction: row; align-items: flex-end; gap: 0; min-height: 40px; overflow: hidden; }
  .wf-lnb-tab { padding: 8px 14px; font-size: 12px; color: #aaa; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; cursor: default; }
  .wf-lnb-tab:first-child { color: #555; font-weight: 600; border-bottom-color: #555; }
  .msg-type-positive { color: #2e8b57; font-weight: 600; }
  .msg-type-negative { color: #e67700; font-weight: 600; }

  /* 이미지 갤러리 */
  .wf-el--gallery { display: flex; flex-direction: row; gap: 5px; padding: 5px 0; background: transparent; border: none; overflow: hidden; }
  .wf-el--gallery .wf-el--image { flex: 1; min-width: 0; margin: 0; border-radius: 3px; }

  /* 지도 */
  .wf-el--map { background: repeating-linear-gradient(0deg,#e4ede4,#e4ede4 20px,#dce8dc 20px,#dce8dc 21px), repeating-linear-gradient(90deg,#e4ede4,#e4ede4 20px,#dce8dc 20px,#dce8dc 21px); border: 1px solid ${borderDark}; display: flex; flex-direction: row; align-items: center; justify-content: center; color: #555; min-height: 140px; gap: 6px; font-size: 12px; font-weight: 500; }

  /* 키워드 태그 그룹 */
  .wf-el--group--tags { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; padding: 5px 0; background: transparent; border: none; }
  .wf-el--group--tags .wf-el { flex: none; margin: 0; }
  .wf-el--tag { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; border-radius: 12px; font-size: 10px; font-weight: 500; background: #f0f4ff; border: 1px solid #c0d0f0; color: #3a5a99; cursor: default; }

  /* Component guide */
  .comp-guide-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
  .comp-guide-table th { background: #f5f5f5; font-weight: 600; padding: 5px 7px; border: 1px solid ${borderLight}; text-align: center; font-size: 11px; }
  .comp-guide-table td { padding: 5px 7px; border: 1px solid ${borderLight}; vertical-align: top; font-size: 11px; }
  .comp-state-label { display: inline-block; font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 600; margin-right: 3px; }
  .comp-state-default { background: #e8f5e9; color: #2e7d32; }
  .comp-state-focus { background: #e3f2fd; color: #1565c0; }
  .comp-state-error { background: #ffebee; color: #c62828; }
  .comp-state-disabled { background: #f5f5f5; color: #9e9e9e; }

  /* Modified marker + Version stamp */
  .modified-marker { position: absolute; top: 8px; right: 10px; background: #fff3f3; color: #c00; font-size: 8px; font-weight: 700; padding: 2px 6px; border: 1px solid #c00; border-radius: 2px; z-index: 3; }
  .version-stamp { font-size: 9px; color: #999; }

  /* PM Comments — 페이지 break 시 잘림 방지: 섹션과 각 코멘트가 가능한 한 같은 페이지에 머물도록 */
  .pm-comment-section { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e0a030; page-break-inside: avoid; break-inside: avoid; }
  .pm-comment-section h5 { font-size: 10px; font-weight: 700; color: #b07800; margin-bottom: 6px; page-break-after: avoid; break-after: avoid; }
  .pm-comment { background: #fffbf0; border-left: 3px solid #e0a030; padding: 6px 8px; margin-bottom: 6px; font-size: 10px; line-height: 1.5; page-break-inside: avoid; break-inside: avoid; }
  /* description-cell 안에서 PM 섹션이 잘리지 않도록 row 단위 break 회피도 보강 */
  .desc-table tr, .desc-table tbody { page-break-inside: avoid; break-inside: avoid; }
  .pm-badge { display: inline-block; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
  .pm-badge--risk { background: #ffdddd; color: #c00; }
  .pm-badge--question { background: #fff3cd; color: #856404; }
  .pm-badge--suggestion { background: #d4edda; color: #155724; }
  .pm-badge--reject { background: #e0e0e0; color: #333; }
  .pm-author { font-size: 9px; color: #999; margin-left: 3px; }

  /* 일반 콘텐츠 패딩 */
  .slide-content { padding: 24px 30px; overflow-y: auto; flex: 1; }

  /* Description: section 소제목 행 */
  .desc-section-row td { background: #efefef; font-weight: 700; font-size: 13px; color: #333; border-top: 2px solid ${borderMedium}; text-align: left; padding: 5px 10px; letter-spacing: 0.3px; }

  /* Description: ISSUE 행 */
  .desc-issue-row td { background: #fff8f8; }
  .desc-issue-label { color: #c00000 !important; font-weight: 700 !important; font-size: 11px !important; text-align: center; }

  /* Description: standalone continuation 행 */
  .desc-cont-row td { background: #f8f8ff; text-align: center; font-size: 11px; color: #666; font-style: italic; padding: 4px 10px; border-top: 1px dashed ${borderDark}; }

  /* 슬라이드 우측 변경이력 메모 */
  .slide-changelog { position: absolute; right: 10px; top: 64px; width: 210px; background: #fffdf0; border: 1px solid #d4aa00; border-radius: 4px; padding: 8px 10px; font-size: 10px; z-index: 100; box-shadow: 2px 2px 6px rgba(0,0,0,0.12); }
  .slide-changelog-title { font-weight: 700; color: #8a6800; margin-bottom: 6px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  .slide-changelog-item { margin-bottom: 5px; border-left: 2px solid #d4aa00; padding-left: 6px; }
  .slide-changelog-ver { font-weight: 700; color: #555; margin-bottom: 1px; }
  .slide-changelog-date { color: #999; font-size: 9px; margin-left: 3px; }
  .slide-changelog-desc { color: #333; line-height: 1.5; }

  /* 헤더 2행 (location 존재 시) */
  .slide-header--2row { height: auto; min-height: 54px; flex-direction: column; padding: 0; align-items: stretch; }
  .slide-header--2row .hd-row1 { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 54px; width: 100%; box-sizing: border-box; }
  .slide-header--2row .hd-row2 { display: flex; align-items: center; padding: 0 24px; height: 26px; min-height: 26px; width: 100%; background: rgba(0,0,0,0.18); font-size: 12px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.15); box-sizing: border-box; }
  `;
}

module.exports = { css };
