# wireframe[] 패턴 레퍼런스

> **단일 소스 원칙**: element 타입 목록의 진실의 원천은 `scripts/lib/element-types.js`
> 타입 추가 시 이 파일이 아닌 element-types.js를 수정할 것

---

## 목차
1. [허용 타입 목록](#1-허용-타입-목록)
2. [CSS 클래스 목록](#2-css-클래스-목록)
3. [레이아웃 판단 기준 (Option B)](#3-레이아웃-판단-기준-option-b)
4. [패턴 1–10 예시](#4-패턴-1-10-예시)
5. [wireframe[] 구성 원칙](#5-wireframe-구성-원칙)
6. [wfHtml 예시 (Option B)](#6-wfhtml-예시-option-b)

---

## 1. 허용 타입 목록

| type | 설명 |
|------|------|
| `header` | 상단 헤더 |
| `gnb` | 글로벌 네비게이션 바 |
| `nav` | 로컬 네비게이션 (LNB) |
| `text` | 텍스트 영역 (variant: title/subtitle/body/breadcrumb/count) |
| `input` | 입력 필드 |
| `button` | 버튼 (variant: primary/outline) |
| `card` | 카드 컴포넌트 (썸네일+본문+액션) |
| `image` | 이미지 영역 |
| `gallery` | 이미지 갤러리 (flex row, N개 나열) |
| `map` | 지도 API 영역 (격자 배경 + 📍 아이콘) |
| `list` | 목록 (불릿) |
| `banner` | 배너 (그라디언트 배경) |
| `divider` | 수평 구분선 |
| `table` | 테이블 |
| `popup` | 팝업 오버레이 |
| `group` | 레이아웃 그룹 (layout: tags/card-grid/btn-row/popup/default) |
| `tag` | 태그 칩 (group layout="tags" 하위) |

---

## 2. CSS 클래스 목록

```
레이아웃:
  .wf-el--header-structured  .wf-header-left  .wf-header-center  .wf-header-right
  .wf-header-logo  .wf-nav-tab  .wf-header-search  .wf-header-icon
  .wf-el--gnb-tabs  .wf-gnb-tab
  .wf-el--nav-lnb  .wf-lnb-tab
  .wf-el--group--btn-row
  .wf-el--group--card-grid  .cols-2  .cols-4
  .wf-el--group--tags

컴포넌트:
  .wf-el  .wf-el--button  .wf-el--button-primary  .wf-el--button-outline
  .wf-el--card  .wf-card-thumb  .wf-card-body  .wf-card-title  .wf-card-desc  .wf-card-badge
  .wf-el--image  .wf-el--input  .wf-el--text  .wf-el--list  .wf-el--banner  .wf-el--divider
  .wf-el--gallery  .wf-el--map  .wf-el--tag
  .wf-el--text-title  .wf-text-title  .wf-el--text-breadcrumb  .wf-breadcrumb  .wf-count-text
  .wf-label  .wf-marker  .wf-el--marked
```

| 클래스 | 설명 |
|--------|------|
| `.wf-el--gallery` | 이미지 갤러리 — flex row, gap:5px |
| `.wf-el--map` | 지도 API 영역 — 격자 배경 + 📍 아이콘, min-height:140px |
| `.wf-el--group--tags` | 키워드 태그 컨테이너 — flex wrap, gap:6px |
| `.wf-el--tag` | 개별 태그 칩 — inline-flex, height:24px, border-radius:12px |

목록에 없는 레이아웃은 `style="display:flex; ..."` 인라인으로 처리한다.

---

## 3. 레이아웃 판단 기준 (Option B)

| wireframe 패턴 | HTML 구조 |
|---------------|----------|
| type:header + children(text/nav/input) | `wf-el--header-structured` 3-zone |
| type:header, label에 `\|` 구분자 | 파이프 기준 좌/중/우 분리 |
| type:gnb | `wf-el--gnb-tabs` + `wf-gnb-tab` |
| type:nav | `wf-el--nav-lnb` + `wf-lnb-tab` |
| group + children 모두 button | `display:flex; flex-wrap:wrap; gap:8px` (가로 필터 행) |
| group + children 모두 card | `display:grid; grid-template-columns:repeat(N,1fr); gap:12px` |
| group + 혼합 children | 요소 특성 보고 flex-row 또는 flex-col 판단 |
| input + button 나란히 있으면 | `display:flex; gap:8px` 가로 배치 |
| type:card + children | thumb(image) → body(text들) → action(button) 순 |
| type:banner | `wf-el--banner` min-height 반영 |
| type:image | `wf-el--image` (diagonal stripe) |
| type:text, label에 타이틀/제목 | `wf-el--text-title` + `wf-text-title` |
| type:text, label에 경로/breadcrumb | `wf-el--text-breadcrumb` + `wf-breadcrumb` |

---

## 4. 패턴 1–10 예시

### 패턴 1 — GNB (글로벌 네비게이션)

```json
{
  "type": "header", "label": "GNB", "marker": 1, "height": 60,
  "children": [
    { "type": "text", "label": "서비스 로고" },
    { "type": "nav", "label": "메인 메뉴", "items": ["메뉴1", "메뉴2", "메뉴3", "마이페이지"] },
    { "type": "input", "label": "통합 검색창" }
  ]
}
```
- text → 좌측 로고, nav → 중앙 메뉴, input → 우측 검색창 자동 배치
- nav.items[]는 탭 형태 렌더링 (첫 번째 항목 활성)

### 패턴 2 — 카테고리 탭 / 필터 버튼 행

```json
{
  "type": "group", "label": "카테고리 탭", "marker": 2, "height": 50,
  "children": [
    { "type": "button", "label": "전체", "variant": "primary" },
    { "type": "button", "label": "기획", "variant": "outline" },
    { "type": "button", "label": "디자인", "variant": "outline" }
  ]
}
```
- children 모두 button → 자동 가로 flex 배치

### 패턴 3 — 카드 그리드

```json
{
  "type": "group", "label": "콘텐츠 카드 그리드", "marker": 3, "height": 400,
  "children": [
    {
      "type": "card", "label": "카드 제목",
      "children": [
        { "type": "image", "label": "썸네일" },
        { "type": "text", "label": "카드 설명" },
        { "type": "button", "label": "자세히 보기", "variant": "outline" }
      ]
    },
    { "type": "card", "label": "카드 제목" },
    { "type": "card", "label": "카드 제목" }
  ]
}
```
- children 모두 card → CSS grid (3열 기본, 2개=2열, 4개이상=4열)

### 패턴 4 — 입력 폼

```json
{
  "type": "group", "label": "로그인 폼", "marker": 2, "height": 200,
  "children": [
    { "type": "input", "label": "이메일 입력" },
    { "type": "input", "label": "비밀번호 입력" },
    { "type": "button", "label": "로그인", "variant": "primary" },
    { "type": "text", "label": "비밀번호 찾기 | 회원가입" }
  ]
}
```

### 패턴 5 — 히어로 배너

```json
{ "type": "banner", "label": "메인 히어로 배너", "marker": 2, "height": 300 }
```

### 패턴 6 — 리스트형 목록

```json
{
  "type": "list", "label": "공지사항 목록", "marker": 3,
  "items": ["공지사항 제목 1", "공지사항 제목 2", "공지사항 제목 3"]
}
```

### 패턴 7 — 테이블

```json
{
  "type": "table", "label": "주문 목록", "marker": 4,
  "headers": ["주문번호", "상품명", "금액", "상태"],
  "rows": [["#001", "상품명", "50,000원", "배송중"]]
}
```

### 패턴 8 — 이미지 갤러리

```json
{ "type": "gallery", "label": "관광지 갤러리", "marker": 5, "count": 4, "thumbHeight": "90px" }
```
- `count`: 이미지 개수 (기본 4), `thumbHeight`: 이미지 높이 (기본 90px)

### 패턴 9 — 지도

```json
{ "type": "map", "label": "지도 (카카오맵 API)", "marker": 6, "height": 180 }
```
- 격자 배경 + 📍 아이콘으로 지도 API 영역 표시

### 패턴 10 — 키워드 태그 그룹

```json
{
  "type": "group", "layout": "tags", "label": "키워드 태그", "marker": 7,
  "children": [
    { "type": "tag", "content": "수족관" },
    { "type": "tag", "content": "COEX" },
    { "type": "tag", "content": "가족여행" }
  ]
}
```
- `layout: "tags"` → children 태그 칩으로 가로 나열, `#` prefix 자동 추가

### 패턴 11 — 챗봇 패널 (containerType + appearance)

**screen 레벨에서 `containerType: "chatbot-panel"` 설정 필수.**

```json
{
  "screenType": "design",
  "containerType": "chatbot-panel",
  "containerSize": { "width": 380, "height": 600 },
  "wireframe": [
    {
      "type": "header", "label": "챗봇", "marker": 1, "height": 48,
      "children": [
        { "type": "text", "label": "브랜드 챗봇" },
        { "type": "button", "label": "✕", "variant": "outline" }
      ]
    },
    {
      "type": "group", "label": "봇 말풍선", "marker": 2,
      "appearance": {
        "align": "flex-start", "maxWidth": "75%",
        "background": "#F2F3F5", "borderRadius": "4px 16px 16px 16px", "padding": "10px 14px"
      },
      "children": [
        { "type": "text", "label": "안녕하세요! 무엇을 도와드릴까요?" }
      ]
    },
    {
      "type": "group", "label": "퀵리플라이 버튼", "marker": 3,
      "appearance": { "display": "flex", "gap": "8px", "flexWrap": "wrap", "padding": "8px 0" },
      "children": [
        { "type": "button", "label": "프로그램 안내", "variant": "outline",
          "appearance": { "borderRadius": "20px", "fontSize": "12px", "padding": "6px 14px" } },
        { "type": "button", "label": "도입 문의", "variant": "outline",
          "appearance": { "borderRadius": "20px", "fontSize": "12px", "padding": "6px 14px" } }
      ]
    },
    {
      "type": "group", "label": "사용자 말풍선", "marker": 4,
      "appearance": {
        "align": "flex-end", "maxWidth": "75%",
        "background": "#3366CC", "borderRadius": "16px 4px 16px 16px", "padding": "10px 14px", "color": "#fff"
      },
      "children": [
        { "type": "text", "label": "프로그램 안내해주세요" }
      ]
    },
    { "type": "divider", "label": "" },
    {
      "type": "group", "label": "입력 영역", "marker": 5,
      "appearance": { "display": "flex", "gap": "8px", "padding": "8px 12px", "border": "1px solid #ddd", "borderRadius": "24px" },
      "children": [
        { "type": "input", "label": "메시지 입력..." },
        { "type": "button", "label": "전송", "variant": "primary",
          "appearance": { "borderRadius": "50%", "width": "32px", "height": "32px", "padding": "0" } }
      ]
    }
  ]
}
```

**핵심**: 기존 `group` + `text` + `button` 타입에 `appearance`만 추가하여 챗봇 UI를 표현. 새 element type 추가 불필요.

### 패턴 12 — 모달/다이얼로그 (containerType: modal)

```json
{
  "screenType": "design",
  "containerType": "modal",
  "containerSize": { "width": 480 },
  "wireframe": [
    { "type": "header", "label": "확인", "marker": 1, "height": 48 },
    { "type": "text", "label": "정말 삭제하시겠습니까?", "marker": 2 },
    {
      "type": "group", "label": "액션 버튼", "marker": 3,
      "appearance": { "display": "flex", "gap": "12px", "justifyContent": "flex-end", "padding": "16px" },
      "children": [
        { "type": "button", "label": "취소", "variant": "outline" },
        { "type": "button", "label": "삭제", "variant": "primary",
          "appearance": { "background": "#dc3545", "border": "none" } }
      ]
    }
  ]
}
```

---

## 5. wireframe[] 구성 원칙

1. **header는 반드시 첫 번째 요소**로 배치
2. **group은 반드시 children 1개 이상** 포함 (빈 group 금지)
3. **descriptions marker 수와 wireframe marker 수 일치** 필수
4. **모든 요소에 label 필수** (빈 label 금지)
5. **height는 실제 UI 비율을 반영**: header 50~70px, 필터 바 45~60px, 카드 그리드 300~500px

---

## 6. wfHtml 예시 (Option B)

```html
<div class="wf-el wf-el--header-structured">
  <div class="wf-header-left"><div class="wf-header-logo">비짓강남</div></div>
  <div class="wf-header-center">
    <span class="wf-nav-tab">관광지</span><span class="wf-nav-tab">먹거리</span>
    <span class="wf-nav-tab">축제·행사</span><span class="wf-nav-tab">숙박·교통</span>
  </div>
  <div class="wf-header-right">
    <div class="wf-header-search">검색</div>
    <div class="wf-header-icon">KO</div>
  </div>
</div>

<div class="wf-el wf-el--nav-lnb">
  <span class="wf-lnb-tab">전체</span><span class="wf-lnb-tab">자연</span>
  <span class="wf-lnb-tab">역사·문화</span><span class="wf-lnb-tab">체험</span>
</div>

<div style="display:flex; flex-wrap:wrap; gap:8px; padding:10px 16px;">
  <div class="wf-el wf-el--button wf-el--button-primary" style="border-radius:14px;">전체</div>
  <div class="wf-el wf-el--button wf-el--button-outline" style="border-radius:14px;">자연</div>
</div>

<div class="wf-el--group--card-grid">
  <div class="wf-el wf-el--card">
    <div class="wf-card-thumb"></div>
    <div class="wf-card-body">
      <span class="wf-card-badge">자연</span>
      <div class="wf-card-title">관광지명</div>
      <div class="wf-card-desc">위치 · 운영시간</div>
    </div>
  </div>
</div>
```
