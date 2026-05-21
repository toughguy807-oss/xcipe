# KDS 워크플로우 B Compare HTML 디폴트 템플릿

**원본**: `C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/AX_KDS_design system-v4/CLAUDE.md` 워크플로우 B 섹션 + `.claude/agents/kds-designer.md` "출력 구조" 섹션. 본 룰은 SYS_v4 mirror.

**트리거**: KDS 워크플로우 B (A/B/C 시안 비교) 작업 시점에 `<name>-compare.html` 생성 직전 Read.

## 배경

KDS designer agent 가 워크플로우 B 의 비교 페이지를 매번 새로 작성하면서 외곽 레이아웃 (grid 배치 / col-head 디자인 / 비교 표 행 구성) 이 매번 달라지는 문제가 있었음. 핵심 패턴 (iframe 392px / frame-wrap 375px / scrollbar-gutter / 비교표 6행) 은 KDS CLAUDE.md 에 fixed 되어 있었지만, **외곽 컨테이너 디테일이 비결정적**이었음. 본 룰은 그 외곽을 디폴트 템플릿으로 박는 정책.

## 기존 KDS 자산에서 보존되는 부분 (수정 금지)

- `iframe { width: 392px }` + `.frame-wrap { width: 375px; overflow: hidden }` + `scrollbar-gutter: stable` (KDS CLAUDE.md 라인 327, 함정 #15)
- 비교 표 행 6개 fixed — 우선 축 / 컨셉 라벨 / 레이아웃 / 톤 / UX 흐름 / 사용한 KDS 컴포넌트 (KDS CLAUDE.md 라인 377-387)
- `compare.figma.json` 빈 스켈레톤 패턴 (함정 #19)

## 외곽 디폴트 템플릿 (신규 박힘)

### 페이지 전체

```css
body {
  padding: 24px;
  background: #f8f9fa;
  color: #191a1b;
  font-family: 'Pretendard', -apple-system, sans-serif;
  min-height: 100vh;
}
```

### 상단 헤더

- `h1` — 22px, weight 700, `letter-spacing: -0.3px`, margin-bottom 8. 내용: 도메인 + 화면 명 + viewport
- `.meta` — 13px, color #55585d, margin-bottom 24. 1줄로 "3 시안 모두 KDS 토큰 사용 / 차별화 원칙 한 줄" 명시

### `.grid` (시안 컨테이너)

**mobile compare** (viewport=mobile):
```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 392px);
  gap: 24px;
  align-items: start;
  justify-content: center;
}
```

**desktop compare** (viewport=desktop):
```css
.grid {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
```
(1920 시안 3개는 가로로 못 넣음 — A → B → C 세로 적층)

### `.col` (각 시안 컬럼)

```css
.col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

### `.col-head` (시안 헤더)

mobile 은 세로 (gap 4, padding `0 8px`), desktop 은 가로 (`display: flex; align-items: center; gap: 12px;`)

| 요소 | mobile | desktop |
|------|--------|---------|
| `.col-letter` (동그라미) | 28×28, font 13 | 32×32, font 15 |
| `.col-title` | 15, weight 700 | 17, weight 700 |
| `.col-sub` | 12, color #6f737b | 13, color #6f737b |

```css
.col-letter {
  border-radius: 999px;
  background: #191a1b;
  color: #ffffff;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.col-title {
  letter-spacing: -0.3px;
  font-weight: 700;
}
.col-sub {
  font-weight: 500;
  line-height: 1.5;
}
```

- `.col-letter` 내용: "A" / "B" / "C"
- `.col-title` 내용: figma.json `root.name` 의 컨셉 라벨 (예: "한팩 hero + 3×2 압축 그리드")
- `.col-sub` 내용: 첫 줄 **`우선 축: 레이아웃` (또는 `톤` / `UX·구조`)** 명시 + 베이스 대비 변형 포인트 2~3줄

### `.frame-wrap` (iframe 바깥 래퍼)

**mobile**:
```css
.frame-wrap {
  width: 375px;
  height: 800px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(20,20,20,0.08);
  overflow: hidden;
  background: #ffffff;
}
```

**desktop**:
```css
.frame-wrap {
  width: 100%;
  max-width: 1920px;
  height: 720px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(20,20,20,0.08);
  overflow: hidden;
  background: #ffffff;
}
```

### `iframe`

**mobile**:
```css
iframe {
  width: 392px;       /* 375 + 17 scrollbar gutter */
  height: 800px;
  border: 0;
  display: block;
  margin-left: -8px;  /* 중앙 정렬 */
}
```

**desktop**:
```css
iframe {
  width: 100%;
  height: 720px;
  border: 0;
  display: block;
}
```

**함정 #15**: `scrollbar-gutter: stable` 은 iframe srcdoc 내부 html 에 박음 (`html { scrollbar-gutter: stable; }`). 외곽 frame-wrap 에는 박지 않음.

### `.row-axis` (하단 비교 표 카드)

**누락 시 작업 미완** (함정 #19 와 별개로 비교표 누락도 미완으로 간주)

```css
.row-axis {
  margin-top: 32px;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 1224px;        /* desktop 은 1920 */
  margin-left: auto;
  margin-right: auto;
}
```

표는 KDS CLAUDE.md B-4 의 시안 비교표 행 6개 그대로:

| | A | B | C |
|---|---|---|---|
| 우선 축 | 레이아웃 | 톤 | UX·구조 |
| 컨셉 라벨 | … | … | … |
| 레이아웃 | **변형 ↑** | (A·C 와 유사) | (A·B 와 유사) |
| 톤 | (B·C 와 유사) | **변형 ↑** | (A·B 와 유사) |
| UX 흐름 | (B·C 와 유사) | (A·C 와 유사) | **변형 ↑** |
| 사용한 KDS 컴포넌트 | … | … | … |

- **`컨셉 라벨` 행 누락 금지** (디자이너가 가장 자주 누락하는 행)
- 변형 축은 `<strong>변형 ↑ ...</strong>` 강조 (color #e0282f, weight 700)
- 표 헤더: `th` color #55585d, weight 600, 13px, background #f8f9fa, padding 10px 12px
- 행 헤더: `.axis-head` 120px 너비, color #55585d, weight 600

## 컨테이너 픽셀값 vs KDS 토큰

위 외곽 픽셀값 (#f8f9fa, #191a1b, #55585d, #6f737b, #e0282f) 은 **compare.html 컨테이너 전용**. iframe srcdoc 내부의 KDS 화면은 **KDS 토큰만** 사용 (color.semantic.*, spacing.*, radius.* 등).

이유: compare.html 은 KDS preview/프레임 페이지지 KDS 화면이 아님. 디자이너 검토를 위한 메타 페이지이므로 KDS 토큰 강제 룰의 적용 대상이 아님.

## 변동 허용 범위

본 룰은 **soft 가이드** (KDS designer agent 의 자율적 carry-over 가능):

- 색상 픽셀값 (#f8f9fa, #191a1b 등) 은 ±10% 범위 내 변동 OK
- 그림자 강도 (4~8px / 16~24px) 는 viewport 기반 범위 안에서 자유
- `.col-sub` 의 줄 수 (2~3줄) 는 시안 컨셉 복잡도에 따라 자유
- **변경 금지 항목**: grid 컬럼 수 (3개) / 비교 표 행 6개 / 컨셉 라벨 행 / 함정 #15 (scrollbar-gutter)

## 호출 시점

KDS designer agent 가 워크플로우 B 작업 후반 `<name>-compare.html` 생성 단계에서 본 룰을 자동 적용. 사용자가 명시적으로 "다른 레이아웃으로" 라고 요청한 경우만 예외.

## 참조

- KDS CLAUDE.md: 라인 327 (iframe/frame-wrap), 라인 377-387 (비교 표 6행)
- KDS `.claude/agents/kds-designer.md`: "출력 구조" 섹션
- 함정 #15 (scrollbar-gutter), 함정 #19 (compare.figma.json 빈 스켈레톤)
