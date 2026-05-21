/**
 * element-types.js — plan-sb 단일 소스
 * wireframe[] 허용 타입 정의의 유일한 진실의 원천
 *
 * 타입 추가 시:
 *   1. 이 파일에 항목 추가
 *   2. template.js renderWfElement() switch-case에 렌더 로직 추가
 *   그 외(SKILL.md, verify.js)는 자동 연동
 */

const ELEMENT_TYPES = [
  { type: 'header',  desc: '상단 헤더' },
  { type: 'gnb',     desc: '글로벌 네비게이션 바' },
  { type: 'nav',     desc: '로컬 네비게이션 (LNB)' },
  { type: 'text',    desc: '텍스트 영역 (variant: title/subtitle/body/breadcrumb/count)' },
  { type: 'input',   desc: '입력 필드' },
  { type: 'button',  desc: '버튼 (variant: primary/outline)' },
  { type: 'card',    desc: '카드 컴포넌트 (썸네일+본문+액션)' },
  { type: 'image',   desc: '이미지 영역' },
  { type: 'gallery', desc: '이미지 갤러리 (flex row, N개 나열)' },
  { type: 'map',     desc: '지도 API 영역 (격자 배경 + 📍 아이콘)' },
  { type: 'list',    desc: '목록 (불릿)' },
  { type: 'banner',  desc: '배너 (그라디언트 배경)' },
  { type: 'divider', desc: '수평 구분선' },
  { type: 'table',   desc: '테이블' },
  { type: 'popup',   desc: '팝업 오버레이' },
  { type: 'group',   desc: '레이아웃 그룹 (layout: tags/card-grid/btn-row/popup/default)' },
  { type: 'tag',     desc: '태그 칩 (group layout="tags" 하위)' },
];

module.exports = { ELEMENT_TYPES };
