/**
 * 화면설계서 스키마 v2 정의 + 정규화
 *
 * v1 (KMVNO 전용) → v2 (범용) 자동 변환
 * v2 데이터는 통과, 미인식 포맷은 최소 스키마 생성
 */

const SCHEMA_VERSION = 'screen-design-schema-v2';

/**
 * v1 KMVNO 데이터를 v2 범용 스키마로 변환한다.
 * - raw.assignment 존재 → v1 KMVNO 판별
 * - raw.$schema === v2 → 통과
 * - 그 외 → 최소 필수 필드만 채운 v2 생성
 */
function normalizeSchema(raw, defaults = {}) {
  let result;

  if (raw.$schema === SCHEMA_VERSION) {
    result = { ...raw, screens: (raw.screens || []).map(normalizeScreen) };
    // v2 직접 통과 시에도 serviceName/viewportType 정규화 적용
    if (result.project) {
      result.project.serviceName = sanitizeServiceName(result.project.serviceName || '');
    }
  } else if (raw.assignment) {
    result = normalizeV1(raw);
  } else {
    result = buildMinimalSchema(raw);
  }

  // config.json defaults 병합 (빈 필드만 채움)
  if (defaults.project) {
    const dp = defaults.project;
    const p = result.project;
    if (!p.writer && dp.writer) p.writer = dp.writer;
    if ((!p.company || !p.company.name) && dp.company) {
      p.company = { ...p.company, ...dp.company };
    }
  }
  if (defaults.theme && !raw.theme) {
    result.theme = defaults.theme;
  }

  return result;
}

/**
 * v1 KMVNO → v2 변환
 */
function normalizeV1(raw) {
  const p = raw.project || {};
  const a = raw.assignment || {};

  return {
    $schema: SCHEMA_VERSION,
    project: {
      id: p.jiraNo || 'UNNAMED',
      title: p.title || '',
      serviceName: sanitizeServiceName(p.serviceName || ''),
      version: p.version || '0.1',
      date: p.date || '',
      writer: p.writer || '',
      company: { name: p.companyName || '' },
      requestor: p.requestor || '',
      outputPrefix: p.outputPrefix || p.jiraNo || 'output',
      // P1-1: 커버 메타 테이블
      reviewers: p.reviewers || [],
      approvers: p.approvers || [],
      reviewDate: p.reviewDate || '',
      approveDate: p.approveDate || '',
      // v1 원본 필드 보존
      jiraNo: p.jiraNo || '',
      srNo: p.srNo || ''
    },
    theme: raw.theme || { preset: 'default' },
    history: (raw.history || []).map(h => ({
      version: h.version || '',
      date: h.date || '',
      detail: h.detail || '',
      page: h.page || '-',
      writer: h.writer || '',
      remarkers: h.remarkers || ''
    })),
    overview: {
      type: 'assignment',
      title: a.dividerMain || '',
      divider: {
        sub: a.dividerSub || '',
        main: a.dividerMain || '',
        bullets: a.dividerBullets || []
      },
      content: { detail: a.detail || '' },
      interfaces: (raw.interfaces || []).map(i => ({
        office: i.office || '',
        channel: i.channel || '',
        depth1: i.depth1 || '',
        depth2: i.depth2 || '',
        depth3: i.depth3 || '',
        depth4: i.depth4 || '-',
        interfaceType: i.interfaceType || '',
        workType: i.workType || '',
        pageId: i.pageId || '(None)'
      }))
    },
    screens: (raw.screens || []).map(normalizeScreen)
  };
}

/**
 * 미인식 포맷 → 최소 v2 스키마
 */
function buildMinimalSchema(raw) {
  const p = raw.project || {};
  return {
    $schema: SCHEMA_VERSION,
    project: {
      id: p.id || p.jiraNo || p.title || 'UNNAMED',
      title: p.title || '',
      serviceName: sanitizeServiceName(p.serviceName || ''),
      version: p.version || '0.1',
      date: p.date || new Date().toISOString().slice(0, 10),
      writer: p.writer || '',
      company: { name: p.company?.name || p.companyName || '' },
      requestor: p.requestor || '',
      outputPrefix: p.outputPrefix || p.id || 'output',
      // P1-1: 커버 메타 테이블
      reviewers: p.reviewers || [],
      approvers: p.approvers || [],
      reviewDate: p.reviewDate || '',
      approveDate: p.approveDate || ''
    },
    theme: raw.theme || { preset: 'default' },
    history: raw.history || [],
    overview: raw.overview || { type: 'summary', title: '', content: {} },
    screens: (raw.screens || []).map(normalizeScreen)
  };
}

/**
 * 개별 screen 정규화 (v1/v2 공통)
 */
function normalizeScreen(s) {
  return {
    // P2: screenType으로 프레임 유형 분기 (design|description|component|msgCase)
    screenType: s.screenType || 'design',
    viewportType: normalizeViewportType(s.viewportType),
    interfaceName: s.interfaceName || '',
    interfaceId: s.interfaceId || '(None)',
    location: s.location || '',
    pageName: s.pageName || '',
    // msgCase 그룹 컨텍스트 (선택)
    groupDescription: s.groupDescription || '',
    groupFlow: s.groupFlow || '',
    uiImagePath: s.uiImagePath || '',
    hasDivider: !!s.hasDivider,
    divider: s.divider || null,
    wfHtml: s.wfHtml || null,
    wireframe: s.wireframe || null,
    // P0-3: Header/Footer/LNB 맥락
    persistent: s.persistent || null,
    // P0-1: 강화된 Description (notes 필드도 허용: text → label 자동 매핑)
    descriptions: (s.descriptions || s.notes || []).map(d => ({
      marker: d.marker || 0,
      label: d.label || d.text || '',
      // section|issue|'' 타입 분기
      type: d.type || '',
      overlay: d.overlay || null,
      details: d.details || [],
      commonNote: d.commonNote || '',
      items: d.items || null,
      continuation: d.continuation || null,
      before: d.before || '',
      after: d.after || '',
      // 변경 유형 마크업: 변경|추가|삭제 (운영 모드 수정 영역 표기)
      changeType: d.changeType || '',
      // FN 참조: 연계 모드 시 FN 코드 배열, 독립 모드 시 빈 배열
      fnRef: d.fnRef || []
    })),
    // P1-2: MSG/Dialog Case (각 항목 필드 정규화)
    msgCases: s.msgCases && s.msgCases.length > 0
      ? s.msgCases.map(c => {
          if (c.state) console.warn(`[WARN] msgCases: "state" → "type" 자동 변환 (screen: ${s.interfaceName || ''})`);
          if (c.label && !c.situation) console.warn(`[WARN] msgCases: "label" → "situation" 자동 변환 (screen: ${s.interfaceName || ''})`);
          if (c.description && !c.message) console.warn(`[WARN] msgCases: "description" → "message" 자동 변환 (screen: ${s.interfaceName || ''})`);
          return {
            type: c.type || c.state || '',
            subType: c.subType || '',
            no: c.no || '',
            situation: c.situation || c.label || '',
            title: c.title !== undefined ? c.title : undefined,
            message: c.message || c.description || '',
            confirmAction: c.confirmAction || '',
            cancelAction: c.cancelAction || ''
          };
        })
      : null,
    // P2-1: 컴포넌트 가이드
    components: s.components || null,
    // P1-3: 수정일/버전
    modifiedDate: s.modifiedDate || '',
    version: s.version || '',
    // v2.1: containerType + containerSize (비표준 UI 렌더링)
    containerType: s.containerType || 'page',
    containerSize: s.containerSize || null,
    // 슬라이드 변경이력 메모 (우측 절대위치 노트)
    changeLog: s.changeLog || [],
    pmComments: (s.pmComments || []).map(c => ({
      marker: c.marker || null,
      type: c.type || 'question',
      author: c.author || 'PM',
      comment: c.comment || ''
    }))
  };
}

/**
 * viewportType 정규화: 대소문자·약어·한글 → 표준값
 */
function normalizeViewportType(v) {
  if (!v) return 'PC';
  const key = v.trim().toLowerCase();
  const map = {
    'pc': 'PC', 'desktop': 'PC', 'web': 'PC', '웹': 'PC',
    'mobile': 'Mobile', 'mo': 'Mobile', 'm': 'Mobile', '모바일': 'Mobile',
    'tablet': 'Tablet', 'tab': 'Tablet', 't': 'Tablet', '태블릿': 'Tablet'
  };
  return map[key] || v;
}

/**
 * serviceName에서 도메인/URL 패턴 제거
 */
function sanitizeServiceName(name) {
  if (!name) return '';
  let s = name.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  s = s.replace(/^www\./i, '');
  s = s.replace(/:\d+$/, '');
  if (/\.[a-z]{2,}$/i.test(s) && s !== name) {
    console.warn(`[WARN] serviceName에 도메인 감지: "${name}" → "${s}" (프로젝트명을 확인하세요)`);
  }
  return s;
}

module.exports = { normalizeSchema, SCHEMA_VERSION, normalizeViewportType, sanitizeServiceName };
