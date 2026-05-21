# Figma → HTML 디자인 충실도 (Design Fidelity)

Figma 시안을 HTML로 변환할 때 **디자이너 의도를 100% 반영**하는 규칙. publish-markup, publish-style, publish-interaction 스킬 실행 시 반드시 참조.

> **Iron Law**: "픽셀 단위 일치"는 원천적으로 불가능하지만, **의도(layout·hierarchy·variant)는 누수 0이어야 한다**. 이미지·SVG·폰트·상태는 원본과 구조적으로 동일해야 한다.

## 언제 적용되나

| 상황 | 적용 |
|------|:---:|
| Figma 시안이 있는 프로젝트의 publish 단계 | ✅ 필수 |
| `/figma-pull` 후 HTML 생성 | ✅ 필수 |
| 기획 단계 와이어프레임 HTML (plan-sb) | ❌ (별도 테마) |
| Figma 시안 없이 만드는 HTML | ❌ (design-knowledge 참조) |

## 1. Figma 속성 → CSS 매핑 테이블

### 1-1. 레이아웃 (Auto-layout)

| Figma 속성 | CSS 매핑 |
|-----------|---------|
| `layoutMode: "HORIZONTAL"` | `display: flex; flex-direction: row;` |
| `layoutMode: "VERTICAL"` | `display: flex; flex-direction: column;` |
| `layoutMode: "NONE"` | `display: block;` (절대 위치면 `position: absolute`) |
| `itemSpacing: 16` | `gap: 16px;` |
| `paddingTop/Right/Bottom/Left: 24` | `padding: 24px;` (4방향 동일 시) / `padding: 8px 16px;` (차이 시) |
| `primaryAxisAlignItems: "MIN"` | `justify-content: flex-start;` |
| `primaryAxisAlignItems: "CENTER"` | `justify-content: center;` |
| `primaryAxisAlignItems: "MAX"` | `justify-content: flex-end;` |
| `primaryAxisAlignItems: "SPACE_BETWEEN"` | `justify-content: space-between;` |
| `counterAxisAlignItems: "CENTER"` | `align-items: center;` |
| `counterAxisAlignItems: "BASELINE"` | `align-items: baseline;` |
| `primaryAxisSizingMode: "AUTO"` | `width: fit-content;` (HUG) |
| `primaryAxisSizingMode: "FIXED"` | `width: {value}px;` |
| `layoutWrap: "WRAP"` | `flex-wrap: wrap;` |
| `counterAxisSpacing: 12` | `row-gap: 12px;` (WRAP 시) |
| `layoutGrids: [{pattern:"COLUMNS"...}]` | `display: grid; grid-template-columns: repeat(N, 1fr); gap: Xpx;` |

### 1-2. Constraints (반응형 힌트)

| Figma constraint | CSS 매핑 |
|-----------------|---------|
| `horizontal: "LEFT"` | `left: Xpx;` (fixed) |
| `horizontal: "RIGHT"` | `right: Xpx;` |
| `horizontal: "CENTER"` | `left: 50%; transform: translateX(-50%);` |
| `horizontal: "STRETCH"` | `left: Xpx; right: Xpx;` (양쪽 고정 마진) |
| `horizontal: "SCALE"` | 부모 기준 비율 — `width: Y%;` |
| `vertical: *` | 위와 대칭 |

### 1-3. 박스 (크기·위치)

| Figma | CSS |
|-------|-----|
| `absoluteBoundingBox.width/height` | `width / height` |
| `cornerRadius: 8` | `border-radius: 8px;` |
| `topLeft/TopRight/BottomLeft/BottomRight Radius` (mixed) | `border-radius: 4px 8px 4px 8px;` (TL TR BR BL 순) |
| `strokeWeight: 2` | `border-width: 2px;` |
| `strokeAlign: "CENTER"` | `box-sizing: border-box` + center 근사 |
| `strokeAlign: "INSIDE"` | `box-shadow: inset 0 0 0 {N}px {color};` |
| `strokeAlign: "OUTSIDE"` | `outline: {N}px solid {color};` |
| `strokes[].dashPattern: [5,3]` | `border-style: dashed;` 근사 |

### 1-4. Fills

| Figma Paint type | CSS |
|-----------------|-----|
| `SOLID` + `color: {r,g,b,a}` | `background-color: rgba(...);` 또는 `background-color: var(--token)` (boundVariables 있으면) |
| `GRADIENT_LINEAR` | `background: linear-gradient(angle, stop1, stop2, ...);` |
| `GRADIENT_RADIAL` | `background: radial-gradient(center, stop1, stop2);` |
| `IMAGE` + `scaleMode: "FILL"` | `background-image: url(...); background-size: cover;` |
| `IMAGE` + `scaleMode: "FIT"` | `... background-size: contain;` |
| `IMAGE` + `scaleMode: "CROP"` | `... background-position: X Y; background-size: width height;` (imageTransform 반영) |
| `IMAGE` + `scaleMode: "TILE"` | `... background-repeat: repeat;` |

**Bound Variable 우선**: `boundVariables.fills[0].color` 존재 시 hex 대신 `var(--kds-fill-*)` 사용.

### 1-5. Strokes (border)

- `strokes: [{type:'SOLID', color}]` → `border: {weight}px solid {color};`
- 방향별 차이: `strokeTopWeight`, `strokeBottomWeight` 등 (2024+) → `border-top-width` 등 개별 설정

### 1-6. Effects (shadow, blur)

| Figma effect | CSS |
|-------------|-----|
| `DROP_SHADOW` | `box-shadow: {offset.x}px {offset.y}px {radius}px {spread}px {color};` |
| `INNER_SHADOW` | `box-shadow: inset {offset.x}px {offset.y}px {radius}px {spread}px {color};` |
| `LAYER_BLUR` | `filter: blur({radius}px);` |
| `BACKGROUND_BLUR` | `backdrop-filter: blur({radius}px);` |
| 다중 effect | 콤마로 연결: `box-shadow: e1, e2, e3;` (visible:true만) |

### 1-7. 타이포그래피

| Figma | CSS |
|-------|-----|
| `fontName.family: "Pretendard"` | `font-family: 'Pretendard', sans-serif;` |
| `fontName.style: "Regular"/"Bold"` | `font-weight: 400/700;` |
| `fontSize: 16` | `font-size: 16px;` |
| `letterSpacing: {value, unit:"PIXELS"}` | `letter-spacing: Xpx;` |
| `letterSpacing: {value, unit:"PERCENT"}` | `letter-spacing: X%;` (보통 `em` 변환) |
| `lineHeight.unit: "PIXELS"` | `line-height: Xpx;` |
| `lineHeight.unit: "PERCENT"` | `line-height: X%;` 또는 `1.5` 같은 소수점 |
| `lineHeight.unit: "AUTO"` | `line-height: normal;` |
| `textCase: "UPPER"` | `text-transform: uppercase;` |
| `textCase: "LOWER"` | `text-transform: lowercase;` |
| `textCase: "TITLE"` | `text-transform: capitalize;` |
| `textDecoration: "UNDERLINE"` | `text-decoration: underline;` |
| `textDecoration: "STRIKETHROUGH"` | `text-decoration: line-through;` |
| `textAutoResize: "NONE"` | width/height 고정 + `overflow: hidden;` |
| `textAutoResize: "HEIGHT"` | width 고정, height auto |
| `textAutoResize: "WIDTH_AND_HEIGHT"` | width/height 모두 auto (`display: inline-block`) |
| `textAlignHorizontal: "CENTER"` | `text-align: center;` |
| `textAlignVertical: "CENTER"` | `display: flex; align-items: center;` (또는 line-height 맞추기) |

### 1-8. 투명도·혼합

- `opacity: 0.8` → `opacity: 0.8;`
- `blendMode: "MULTIPLY"` → `mix-blend-mode: multiply;`
- `blendMode: "NORMAL"` → 생략

### 1-9. 클리핑·마스크

- `clipsContent: true` on frame → `overflow: hidden;`
- 마스크 노드 (BOOLEAN_OPERATION 등) → `mask-image` 또는 SVG fragment로 처리. 복잡하면 PNG flatten

## 2. Component Set → BEM 매핑

Figma Component Set (variants 매트릭스)은 반드시 **BEM modifier 조합**으로 변환해야 한다.

### 예시

Figma:
```
Component Set: Button
├── Variant: type=primary, size=sm, state=default
├── Variant: type=primary, size=md, state=default
├── Variant: type=primary, size=lg, state=default
├── Variant: type=primary, size=md, state=disabled
├── Variant: type=secondary, size=md, state=default
└── ...
```

HTML:
```html
<button class="btn btn--primary btn--md">Click</button>
<button class="btn btn--primary btn--lg">Click</button>
<button class="btn btn--secondary btn--md" disabled>Click</button>
```

CSS:
```css
.btn { /* base — 공통 값 */ }
.btn--primary { /* color variant */ }
.btn--secondary { /* color variant */ }
.btn--sm { /* size variant */ }
.btn--md { /* size variant */ }
.btn--lg { /* size variant */ }
.btn:disabled, .btn[disabled] { /* state */ }
.btn:hover:not(:disabled) { /* state */ }
```

### 자동화 규칙

1. Component Set 감지 시 `componentPropertyDefinitions` 추출
2. 각 property key → BEM modifier prefix (예: `type` → `btn--`)
3. 각 property value → modifier value
4. `state` 속성은 pseudo-class로 변환 (`hover`, `active`, `disabled`, `focus`)
5. **중복 HTML 생성 금지** — 대표 variant 1개만 HTML에 넣고, CSS로 modifier 표현

## 3. Constraint → 반응형 규칙

Figma는 단일 프레임 기준이지만 `constraints`가 반응형 힌트를 준다.

| Constraint 조합 | 반응형 해석 |
|---------------|-----------|
| horizontal: STRETCH + vertical: TOP | 상단 고정, 좌우 풀 너비 → nav·header |
| horizontal: CENTER + vertical: CENTER | 중앙 유지 → 모달·hero title |
| horizontal: SCALE | 부모 비율 따라 크기 조정 → media |
| horizontal: LEFT + vertical: STRETCH | 좌측 사이드바 |
| horizontal: RIGHT + vertical: BOTTOM | 플로팅 버튼 |

### M/T/D breakpoint 생성 규칙

디자이너가 1개 프레임만 줬을 때 추정 변환:

```css
/* Base: Mobile (< 768px) */
.hero { padding: 16px; font-size: clamp(20px, 5vw, 28px); }

/* Tablet: 768px ~ 1919px */
@media (min-width: 768px) {
  .hero { padding: 32px; }
}

/* Desktop: >= 1920px */
@media (min-width: 1920px) {
  .hero { padding: 48px; max-width: 1440px; margin: 0 auto; }
}
```

디자이너가 M/T/D 3 프레임을 준 경우: **각 프레임 값을 각 breakpoint에 그대로 매핑**.

## 4. 자산 참조 규칙

Pull 단계에서 export한 자산 파일을 HTML에서 올바르게 참조:

### 이미지
```html
<!-- 일반 이미지 (사진, 스크린샷) -->
<img src="./assets/images/hero-banner.png" alt="설명" width="1920" height="1080">

<!-- 배경 이미지 -->
<div class="section" style="background-image: url('./assets/images/bg.png');"></div>
```

### SVG 아이콘 (3가지 패턴 중 선택)

**패턴 A — inline SVG** (색상 변경 필요한 경우):
```html
<svg class="icon icon--search" width="24" height="24" viewBox="0 0 24 24">
  <path d="..." fill="currentColor"/>
</svg>
```

**패턴 B — `<use>` 참조** (아이콘 많을 때):
```html
<svg class="icon"><use href="./assets/icons/sprite.svg#search"></use></svg>
```

**패턴 C — `<img>` 참조** (색상 고정):
```html
<img src="./assets/icons/search.svg" class="icon" alt="">
```

**선택 규칙**:
- 색상 토큰 바인딩 필요 → A
- 아이콘 20개 이상 + 동일 색상 → B
- 로고·illust 등 고정 자산 → C

## 5. 금지 사항

| # | 금지 | 대안 |
|---|------|------|
| 1 | Figma 색상을 hex로 하드코딩 | `boundVariables` 확인 후 `var(--kds-*)` 사용. 바인딩 없어도 CSS 변수 정의 후 참조 |
| 2 | 폰트 크기 하드코딩 | `font-size: var(--kds-font-{size});` |
| 3 | `padding: 16px` 같은 하드코딩 | spacing 토큰 사용 |
| 4 | Component Set을 개별 HTML로 전체 렌더링 | BEM modifier 조합으로 1개만 |
| 5 | 이미지 외부 URL 직접 참조 | `./assets/images/` 로 export 후 상대경로 |
| 6 | 아이콘을 `background-image`로 처리 | `<svg>` 또는 `<img>`로 DOM에 배치 (접근성) |
| 7 | Figma 단위 무시 (PERCENT vs PIXELS) | 단위 그대로 변환 (% → %, px → px) |
| 8 | `textAutoResize` 무시 | 해당 overflow 처리 필수 |
| 9 | constraint 무시하고 position: absolute 남발 | constraint 해석 후 flex/grid 우선 |
| 10 | 의도된 `primaryAxisAlignItems` 변경 | 원본 그대로 유지. 변경은 reviewer 승인 후만 |

## 6. 충실도 Self-Check (publish-markup 완료 시)

아래 체크리스트 전수 Pass 필요:

- [ ] 모든 텍스트 노드의 `characters` 가 HTML에 있음
- [ ] 모든 이미지 노드 → `<img>` 또는 `background-image`로 반영
- [ ] 모든 SVG 노드 → 자산 파일 export + HTML 참조
- [ ] 모든 Component Set → BEM modifier 조합으로 표현 (중복 HTML 0)
- [ ] 모든 fills → var() 또는 정확한 색상 변환
- [ ] 모든 effects → box-shadow/filter로 변환
- [ ] 모든 Auto-layout → flex/grid로 변환
- [ ] constraints → 반응형 규칙 적용
- [ ] cornerRadius mixed → 4값 border-radius
- [ ] textAutoResize → overflow 처리

**1건이라도 미달이면 충실도 게이트 실패 → 재작업**.

## 7. 충실도 검증 (publish-visual-verify 연계)

`publish-visual-verify` 스킬이 Vision LLM으로 채점할 때:

1. **Reference 이미지 입력**: Pull 단계에서 export한 `assets/reference/*.png`
2. **Comparison 이미지 입력**: Playwright로 캡처한 HTML 렌더링
3. **Vision LLM 비교 항목**:
   - 레이아웃 동일성 (각 요소 위치·크기 비율)
   - 색상 동일성 (Figma 값 vs 렌더링 값)
   - 타이포 동일성 (폰트·크기·간격)
   - 자산 존재 확인 (이미지·SVG 빠짐 없음)
4. **점수 70점 미만 → Ralph Loop 재수정**

## 참조

- `rules/figma-sync.md` — Pull/Push 절차, Variable 이름 제약
- `rules/traceability.md` — FR→FN→UI→TC 추적
- `skills/publish-markup` — 변환 주체
- `skills/publish-visual-verify` — 시각 검증
