# figma.json 작성 시 자주 빠지는 함정 (반드시 회피)

이 22가지는 실제로 발생한 실수입니다. 매 작업 시 관련 항목을 체크리스트로 점검하세요. 이 파일은 CLAUDE.md 에서 참조 — 작업 중 의심되는 영역만 lookup 하면 됩니다.

#### 1. CSS `margin` 을 figma.json `padding` 으로 옮기지 말 것

CSS의 `margin-top: 32px` 처럼 **요소 사이 간격**을 figma.json 자식 frame의 `paddingTop` 으로 박으면 **그 frame 내부 콘텐츠가 아래로 쏠림**. paddingTop은 frame 안쪽 패딩이지, 형제 사이 간격이 아니다.

**잘못된 예** (버튼 라벨이 아래로 쏠림):
```json
{
  "kdsId": "btn-login",
  "height": 56,
  "layout": { "paddingTop": 32, "primaryAxisAlign": "CENTER", "counterAxisAlign": "CENTER" }
}
```

**올바른 매핑**:
- 부모 layout이 `itemSpacing` 균일 → `itemSpacing` 사용
- 비균일 간격 → **명시적 Spacer FRAME** 추가:
```json
{
  "type": "FRAME",
  "name": "Spacer 32",
  "kdsId": "spacer-before-login-btn",
  "width": 335, "height": 32,
  "fills": [],
  "layout": {
    "mode": "HORIZONTAL",
    "paddingTop": 0, "paddingBottom": 0, "paddingLeft": 0, "paddingRight": 0,
    "primaryAxisSizing": "FIXED", "counterAxisSizing": "FIXED"
  }
}
```

매핑 표:
| CSS | figma.json |
|---|---|
| `margin-top: N` (형제 간격) | 부모 `itemSpacing: N` 또는 Spacer FRAME(height:N) |
| `padding-top: N` (자기 안쪽) | 자식 `layout.paddingTop: N` |
| `gap: N` | 부모 `layout.itemSpacing: N` |

(Spacer FRAME 사용 시 HTML CSS 도 동시 반영해야 함 — 아래 #### 6 참고)

#### 2. `<img>` 태그에 `data-kds-id` 직접 부여 (wrapper만 박는 것 금지)

```html
<!-- ✗ 잘못: img 자체에 kdsId 없어 inject-images가 wrapper(335×64)에 imageUrl 박음 -->
<div class="logo-wrap" data-kds-id="login-logo-box">
  <img src="..." alt="...">
</div>

<!-- ✓ 올바름: img 에 직접 kdsId → 80×80 노드에 imageUrl 박힘 -->
<div class="logo-wrap" data-kds-id="login-logo-box">
  <img src="..." alt="..." data-kds-id="login-logo-image">
</div>
```

그리고 figma.json에는 이미지가 들어갈 **실제 사이즈의 RECTANGLE/FRAME 노드**(예: 80×80)를 만들어 그 kdsId 와 매칭. wrapper FRAME(예: 335×64)에 imageUrl 박히면 이미지가 잘못된 비율로 stretched.

#### 3. CSS `flex: 1` 자식은 figma.json `layoutGrow: 1` 명시

CSS에서 `.field-input { flex: 1 }` 처럼 **남는 공간을 채우는 자식**을 figma.json에 그냥 두면 해당 자식이 콘텐츠 폭만 차지해서, 트레일링 요소(예: 비밀번호 토글 아이콘)가 오른쪽 끝이 아니라 입력 텍스트 바로 옆에 붙어 나온다.

```html
<!-- HTML: input 이 flex: 1 이라 남는 공간 채워서 toggle 이 우측 끝 -->
<div class="field">
  <span class="field-icon-box"><svg/></span>
  <input class="field-input">     <!-- flex: 1 -->
  <button class="field-trailing-btn"><svg/></button>
</div>
```

```json
// figma.json: 가운데 input TEXT/FRAME 에 layoutGrow: 1 명시
{
  "kdsId": "field-password",
  "layout": { "mode": "HORIZONTAL", "primaryAxisAlign": "MIN", "itemSpacing": 12, ... },
  "children": [
    { "type": "FRAME", "kdsId": "icon-box", "width": 24, "height": 24, ... },
    { "type": "TEXT",  "kdsId": "input", "characters": "비밀번호", "layoutGrow": 1, ... },
    { "type": "FRAME", "kdsId": "toggle", "width": 24, "height": 24, ... }
  ]
}
```

매핑 표:
| CSS | figma.json 자식 |
|---|---|
| `flex: 1` / `flex-grow: 1` | `layoutGrow: 1` |
| `align-self: stretch` (counter axis) | `layoutAlign: "STRETCH"` |

#### 4. CSS `flex-wrap: wrap` 은 figma.json `layoutWrap: "WRAP"` 명시

Figma 오토레이아웃은 **기본적으로 줄바꿈을 안 한다**. HORIZONTAL 모드에서 자식이 컨테이너 width 를 넘어도 한 줄에 강제로 들어감. CSS의 `flex-wrap: wrap` 처럼 다음 줄로 넘기려면 부모 layout 에 `layoutWrap: "WRAP"` 명시. 줄 간 간격은 `counterAxisSpacing`.

**전제**: 컨테이너 width 가 고정돼있어야 작동 (`counterAxisSizing: "FIXED"` 또는 부모로부터 강제). 자식이 그 width 넘으면 다음 줄로 떨어짐.

```html
<!-- HTML: 칩이 많으면 다음 줄로 -->
<div class="chips" style="display:flex; flex-wrap:wrap; gap:8px;">
  <span class="chip">A</span> <span class="chip">B</span> ...
</div>
```

```json
// figma.json: 부모 FRAME 에 layoutWrap + counterAxisSpacing
{
  "kdsId": "chips-wrap",
  "width": 335,
  "layout": {
    "mode": "HORIZONTAL",
    "itemSpacing": 8,                  // 가로 칸 간격 (CSS gap의 column-gap)
    "layoutWrap": "WRAP",              // ← 줄바꿈 활성화
    "counterAxisSpacing": 8,           // 세로 줄 간격 (CSS gap의 row-gap)
    "primaryAxisSizing": "FIXED",
    "counterAxisSizing": "AUTO"
  }
}
```

매핑 표:
| CSS | figma.json |
|---|---|
| `flex-wrap: wrap` | 부모 `layout.layoutWrap: "WRAP"` |
| `gap: N` (column) | 부모 `layout.itemSpacing: N` |
| `gap: N` (row, 줄 간) | 부모 `layout.counterAxisSpacing: N` |

#### 5. 그림자/블러 부모의 `clipsContent` — plugin 이 기본 false 박음 (명시는 권장)

**규칙 요약**: plugin 이 spec 미명시 시 자동 `false` 박으므로 안 적어도 그림자/블러 잘리지 않음. 디자이너 의무는 아니지만 의도 명확화 차원에서 명시 권장.

Figma FRAME 의 `clipsContent` 의 Figma 자체 기본값은 `true` (자식이 부모 경계 밖으로 못 튀어나옴). 자식에 drop-shadow / inner-shadow / blur 같은 effects 가 있으면 그 효과가 부모 경계에서 잘려 보임. 그림자가 잘려 안 보이는 가장 흔한 원인이었음.

**plugin 의 새 기본 동작 (code.js:757–765)**: `spec.clipsContent` 미명시 시 plugin 이 자동으로 `false` 를 박는다. 즉 figma.json 에 `clipsContent` 안 써도 import 결과는 "콘텐츠 자르기 OFF" 가 기본. 그림자/블러가 잘리는 문제가 기본 동작에서 사라짐. **자르기 ON 이 필요한 경우만** spec 에 `"clipsContent": true` 명시.

**여전히 권장하는 규칙**: 의도 명확화 차원에서 그림자/블러를 살릴 의도가 있는 부모에는 여전히 `"clipsContent": false` 를 명시해두는 게 좋다 (자기문서화). 안 적어도 plugin 이 기본 false 박아주지만, 표시되어 있으면 다른 사람이 spec 만 보고 의도를 즉시 파악 가능.

```json
// 화면 최상위 — 내부 카드/바텀바 그림자 모두 살림
{
  "type": "FRAME",
  "kdsId": "screen-product-detail",
  "clipsContent": false,
  ...
}

// 카드 wrap — 카드 자체 그림자가 wrap 밖으로 튀어나오도록
{
  "type": "FRAME",
  "kdsId": "price-card-wrap",
  "clipsContent": false,
  ...
}
```

**HTML 대응**: HTML 의 `overflow: hidden` 과 같은 개념. CSS 에서 부모에 `overflow: hidden` 박혀있으면 자식 box-shadow 가 잘리듯이, Figma 는 기본이 hidden 상태라고 보면 됨.

#### 6. figma.json Spacer FRAME 은 HTML CSS 에 동시 반영

Spacer FRAME 은 Figma 에서만 보이는 구조물이라 HTML 브라우저 프리뷰는 그 간격을 모른다. figma.json 에 `Spacer 32` 박았으면 HTML 에도 해당 위치 다음 요소에 `margin-top: 32px` (또는 부모에 `gap: 32px`) 명시. 안 그러면 Figma는 정상인데 브라우저 프리뷰만 답답해 보임.

```css
/* HTML CSS — figma.json Spacer 와 동일한 값으로 박아야 함 */
.profile-card { margin: 8px 20px 0; }   /* spacer-after-appbar h:8 ↔ figma.json */
.quick-actions { margin: 32px 20px 0; } /* spacer-after-profile h:32 ↔ figma.json */
```

**주의 — CSS shorthand 우선순위 함정**: `.profile-card { margin-top: 8px }` 위에 박고 그 다음에 `.profile-card { margin: 0 20px }` 가 나오면 후자의 shorthand 가 `margin-top` 까지 0 으로 덮어씀. shorthand 사용 시 `margin: 8px 20px 0` 처럼 top/right/bottom/left 값을 직접 넣을 것.

**더 중요 — 빠짐없이 양방향 매칭**: figma.json 의 모든 Spacer FRAME 을 한 줄씩 짚어가며 HTML CSS 에 같은 값을 박는다. **위쪽뿐 아니라 아래쪽도** 마찬가지. 예: `spacer-before-bottom (h:32)` 가 있으면 그 직전 요소(`.description` 등)에 `margin-bottom: 32px` 명시. 한 위치라도 누락하면 브라우저 프리뷰만 답답해 보임.

#### 7. 그라디언트 `angle` 은 CSS `linear-gradient` 와 동일하게 작성

`angle` 값은 **CSS 의 `linear-gradient(<deg>, …)` 그대로** 박으면 된다. 플러그인이 CSS deg → Figma transform 매트릭스 변환을 내부에서 처리한다.

| CSS `angle` | 그려지는 방향 |
|---|---|
| `0` | 아래 → 위 (↑) |
| `90` | 왼쪽 → 오른쪽 (→) |
| `180` | 위 → 아래 (↓) |
| `270` | 오른쪽 → 왼쪽 (←) |

```json
// 위에서 아래로 (CSS: linear-gradient(180deg, red, dark-red))
{
  "type": "GRADIENT_LINEAR",
  "angle": 180,
  "gradientStops": [
    { "position": 0, "color": "#e0282f" },
    { "position": 1, "color": "#8a1418" }
  ]
}
```

**과거 함정 (이미 수정됨)**: 한때 플러그인의 `angleToGradientTransform` 공식이 `(deg - 180)` 로 작성돼 있어서 모든 CSS angle 이 90도 빗나갔다 (예: `angle: 180` 박으면 좌→우로 그려짐). 현재는 `(deg - 90)` 으로 수정돼 CSS 와 일치하지만, **plugin code 를 손대게 되면 이 공식 다시 깨지지 않게 검증할 것**. 검증법: figma.json 에 LINEAR `angle: 180` 박은 박스를 import 해서 위→아래 방향으로 그려지는지 확인.

`GRADIENT_RADIAL` / `ANGULAR` / `DIAMOND` 는 `angle` 값에 따라 회전이 적용되긴 하지만 **회전 의미가 LINEAR 와 다르다** (RADIAL 은 타원 회전, ANGULAR 는 시작각 회전 등). 단순한 원형/대칭 형태가 필요하면 `angle` 생략하고 identity transform 그대로 두는 것이 안전. 정밀 조정이 필요하면 `gradientTransform: [[a,b,c],[d,e,f]]` 로 직접 매트릭스 박을 것.

#### 8. TEXT 노드 폭 결정 — **모든** TEXT 노드에 `width` 명시 + `textAutoResize: "HEIGHT"` 박기

`figma.createText()` 직후 width 가 매우 작은 값으로 잡힌 채 `characters` 가 들어가면 다음 세 가지 증상 중 하나가 발생한다. 셋 다 같은 원인 (width 미명시) 의 다른 발현:

1. **한 글자씩 세로로 떨어짐** — 긴 텍스트가 부모 안에서 줄바꿈되어야 할 때 width 가 없으면 한 글자마다 줄이 떨어짐
2. **박스 높이 부풀림** — `"4"`, `"12"` 같은 짧은 카운트 TEXT 라도 width 없으면 height 가 비정상적으로 커져 부모 frame 의 minHeight 를 무시하고 박스가 늘어남 (이번 세션 시안 A `menu-cart-meta`, `menu-wishlist-meta` 사례)
3. **옆 요소 정렬 깨짐** — 부모 HORIZONTAL auto-layout 안에서 width 자유 TEXT 가 짜부라들거나 부풀어서 chevron·trailing 요소 위치가 어긋남 (이번 세션 시안 C 메뉴 리스트 11개 TEXT 사례)

**필수 패턴**: 부모의 가용 폭 만큼 자식 TEXT 의 `width` 를 명시 + `textAutoResize: "HEIGHT"` 박기. `layoutAlign: "STRETCH"` 는 부모 폭이 변경될 때 자동 따라가는 이중 안전용.

**`textAutoResize: "WIDTH_AND_HEIGHT"` 는 신뢰하지 말 것** — 부모가 단순 FRAME 이고 자식 TEXT 가 한 개뿐일 때만 안전. 부모가 HORIZONTAL auto-layout + `layoutGrow: 1` 자식이 섞여있으면 Figma API 가 자식 TEXT 폭을 0 으로 짜부라뜨릴 수 있음. 짧은 카운트(`"3"`, `"외부 페이지"`)·chip 라벨·badge 라벨 모두 명시 width 권장.

자유 폭이 진짜 필요한 경우 (예: 동적 길이 chip 라벨) 는 부모 frame 자체에 `primaryAxisSizing: "AUTO"` 박고 자식 TEXT 도 `WIDTH_AND_HEIGHT` 유지. 단 부모와 자식 모두 명시적이어야 함.

```json
{
  "type": "TEXT",
  "kdsId": "card-1-label",
  "characters": "이 라벨은 카드 폭 안에서 자동으로 줄바꿈됩니다",
  "width": 311,                    // 카드 width 335 - paddingLeft/Right 12 = 311
  "textAutoResize": "HEIGHT",      // width 고정 + height 자동
  "layoutAlign": "STRETCH",        // 부모 폭 변경 대응 (이중 안전)
  "fontSize": 13, "lineHeight": 18,
  "fontName": { "family": "Inter", "style": "Regular" },
  "fills": [{ "type": "SOLID", "color": "#191a1b" }]
}
```

자주 쓰는 환산표:
| 컨테이너 | width | padding | 자식 TEXT width |
|---|---|---|---|
| 카드 | 335 | 12 | 311 |
| 카드 | 335 | 16 | 303 |
| 카드 | 335 | 24 | 287 |
| 화면 헤더 | 375 | 20 | 335 |
| List item (icon 24 + spacing 12 + chev 20) | 335 (외부) | 16 | label width = 335 − 16·2 − 24 − 12 − 12 − 20 = **219** (count meta 있으면 더 좁게) |
| Count meta (badge 옆 숫자) | — | — | **40** 정도 (짧은 숫자 자유 폭은 위험) |
| Section header (시안 C `menu-group-*-title`) | 375 | 24 | **287** |

**자식 TEXT 만 고쳐도 height 가 또 늘어나면 — 부모 frame 도 같이 점검**:

자식 TEXT 에 `width` + `textAutoResize: "HEIGHT"` 까지 박았는데도 부모 행의 FIXED-height 가 늘어나서 들어오면, 부모 frame 의 sizing mode 와 `spec.height` 누락이 원인이다. 이번 세션 시안 A 의 `menu-cart` / `menu-wishlist` 등 메뉴 리스트 8행이 자식 TEXT 는 모두 가이드대로였는데도 다시 늘어나서 발견된 사례.

- **부모 `primaryAxisSizing: "AUTO"` + 자식 `layoutGrow: 1` 충돌.** Figma API 명세상 부모 primary 가 AUTO 면 자식의 `layoutGrow` 는 무시되고 자식이 hug-width 로 줄어든다. plugin code.js:759 의 `node.layoutGrow = spec.layoutGrow` 는 자식이 부모에 appendChild 되기 전 시점이라 부모가 없는 상태에서 set 시도 → silently fail. 부모에 붙는 순간엔 부모 AUTO 라 grow 가 아예 안 켜져 자식 TEXT width 가 명시 198 / hug 60 사이에서 흔들리고, 좁게 결정되면 TEXT 가 줄바꿈된다. **부모 primary 가 FIXED 여야 자식 grow 가 의도대로 작동.**

- **부모 `counterAxisSizing: "FIXED"` + `minHeight: N` 만 박고 `spec.height` 미명시 → plugin 의 resize 처리에서 자동 결정 height 가 그대로 fix.** plugin code.js:836–838:
  ```js
  const h = spec.height !== undefined ? spec.height : node.height;
  node.resize(w, h);
  ```
  `spec.height` 가 없으면 `h = node.height` 가 박혀서, 자식 추가 도중 일시적으로 잘못 결정된 height (위 grow 충돌로 TEXT 가 줄바꿈된 값) 이 그대로 fix 된다. `minHeight` 는 lower bound 만 잡지 upper bound 를 끌어내리지 않아 무력. **height 보장이 중요한 행은 `spec.height` 도 명시할 것** — plugin resize 가 `h = spec.height` 로 명시값을 정확히 박아 자동 결정값 의존이 사라진다.

- **자식 행이 외부 컨테이너의 width 를 정확히 받아야 하면 `layoutAlign: "STRETCH"` 추가.** 부모 컨테이너가 `counterAxisSizing: FIXED` + `width: N` 이어도 자식 행에 STRETCH 가 없으면 자식 width 가 자기 spec 으로 결정되어 부모 width 와 어긋날 수 있다.

**필수 패턴 (메뉴 리스트 행·세로 카드 등 height 가 정해진 horizontal row)**:
```json
{
  "kdsId": "menu-cart",
  "width": 335,
  "height": 56,                       // ← spec.height 명시
  "layoutAlign": "STRETCH",           // ← 부모 width 강제 수용
  "layout": {
    "mode": "HORIZONTAL",
    "primaryAxisSizing": "FIXED",     // ← grow 자식이 작동하도록 FIXED
    "counterAxisSizing": "FIXED",
    "minHeight": 56                    // ← 보조 안전망
  },
  "children": [
    { "kdsId": "label", "layoutGrow": 1, "width": 219, "textAutoResize": "HEIGHT", ... },
    { "kdsId": "meta",  "width": 40, "textAutoResize": "HEIGHT", ... }
  ]
}
```

요약: **자식 TEXT 의 width/textAutoResize 만으로 부족**. 부모 frame 의 `primaryAxisSizing: FIXED` + `spec.height` 명시 + `layoutAlign: STRETCH` 세 가지를 같이 박아야 plugin 의 자동 결정 의존이 사라지고 web 과 동일한 height 가 들어온다.

**한글 어절 줄바꿈 — HTML 측 안전망 (의무)**:

위는 figma.json 의 width/sizing 함정이고, HTML 미리보기 측에는 다른 함정이 하나 더 있다. **CSS 기본값 `word-break: normal` 은 한글을 글자 단위로 끊는다** (영문은 단어 사이에서만 끊지만 한글은 어절 중간이라도 끊김). 결과적으로 "사용 가능 한", "확인 해 주세요" 처럼 어색하게 떨어진다. spec-and-bridge.md 의 HTML 규칙대로 모든 페이지의 글로벌 셀렉터에 다음 CSS 의무 적용:

```css
body, p, h1, h2, h3, h4, h5, h6, span, div, button, a, li, label, dt, dd {
  word-break: keep-all;       /* 한글은 어절(공백) 단위로만 줄바꿈 */
  overflow-wrap: break-word;  /* 한 어절이 컨테이너보다 길면 강제 줄바꿈 (안전망) */
}
```

- `word-break: keep-all` 만으로는 한 어절(예: 긴 영문 URL, 한자 묶음) 이 컨테이너보다 길 때 overflow 위험 → `overflow-wrap: break-word` 동시 적용
- 위 두 줄을 안 박으면 figma.json 의 TEXT width 가 정확해도 **HTML 미리보기에서만 글자 단위로 끊겨 보임** → 사용자 검수 시 figma 결과와 어긋남
- 모바일 좁은 폭일수록 빈도 높음. KT 같은 한국어 위주 사이트 작업에서는 사실상 의무

#### 9. `paragraphSpacing` 단락 분리는 `\n` 한 개

`\n\n` 으로 단락을 나누면 빈 단락 한 줄이 사이에 끼어들어 결과 간격이 의도보다 훨씬 크게 벌어진다 (`lineHeight + paragraphSpacing×2` 만큼).

```json
// ✓ \n 한 개로 단락 분리
"characters": "첫 번째 단락\n두 번째 단락\n세 번째 단락",
"paragraphSpacing": 16,
"lineHeight": 20
// 결과: 단락 사이 lineHeight(20) + paragraphSpacing(16) = 36px
```

HTML 측도 같은 36px 로 맞춰야 두 환경이 일치한다 (예: `p + p { margin-top: 36px }`).

#### 10. 자식 폭 < 부모 inner 폭이면 `counterAxisAlign: "CENTER"` 명시

VERTICAL auto-layout 부모 안에서 자식 박스의 `width` 가 부모 inner 폭(= 부모 width − padding)보다 작으면 **기본 좌측 정렬**된다. 중앙 정렬이 의도라면 부모 layout 에 `counterAxisAlign: "CENTER"` 박을 것. (자식 폭이 inner 폭과 같으면 차이가 보이지 않아 누락하기 쉬움 — 같은 파일 내 다른 카드들을 보고 통일성 차원에서 박아둘 것)

```json
{
  "kdsId": "card-corner-asymmetric",
  "width": 335,
  "layout": {
    "mode": "VERTICAL",
    "paddingTop": 16, "paddingBottom": 16, "paddingLeft": 16, "paddingRight": 16,
    "counterAxisAlign": "CENTER"   // ← 자식 width 240 (작음) 이라 명시 필요
  },
  "children": [
    { "type": "FRAME", "width": 240, "height": 56, ... }
  ]
}
```

#### 11. SVG `viewBox` ≠ 컨테이너 크기일 때 HTML stroke 두께 보정

SVG `viewBox="0 0 24 24"` 인 아이콘을 48×48 컨테이너에 넣으면 **HTML 은 stroke 두께를 viewBox 좌표계 기준으로 함께 스케일링**해 굵게 그린다 (예: `stroke-width="2"` → 화면상 4px). 반면 Figma `createNodeFromSvg` 는 vector path 의 stroke 두께를 좌표 그대로 유지 (= 2px 그대로). 결과적으로 같은 SVG 인데 HTML 만 굵어 보인다.

HTML 결과를 Figma 와 일치시키려면 CSS 에 `vector-effect: non-scaling-stroke` 박기:

```css
.icon-box svg * { vector-effect: non-scaling-stroke; }
```

이 속성은 stroke 두께를 변환행렬과 무관하게 일정 px 로 유지시켜준다.

#### 12. CSS gradient 와 Figma gradient 의 시작점·형태 차이

같은 그라디언트라도 CSS 와 Figma 의 기본 시작점/표현이 다르다. 두 환경을 맞추려면 CSS 측을 보정한다.

| 종류 | CSS 기본 | Figma identity (gradientTransform 미지정) | 일치시키는 방법 |
|---|---|---|---|
| LINEAR | `linear-gradient(180deg, ...)` 위→아래 | `angle: 180` 위→아래 | 동일 (#7 angle 표 참고) |
| RADIAL | `radial-gradient(circle, ...)` 중앙→가장자리 | 중앙→가장자리 | 동일 |
| ANGULAR | `conic-gradient(from 0deg, ...)` **12시 시작** | **3시 시작** (90° 차이) | CSS 에 `from 90deg` 박기 |
| DIAMOND | CSS 직접 표현 불가 | 마름모 (중앙→네 모서리 삼각 분할) | CSS 는 `radial-gradient` 근사 + 라벨에 "Figma 가 정답" 명시 |

```css
/* Figma ANGULAR 와 일치시키기 */
.demo-angular {
  background: conic-gradient(from 90deg, #e0282f, #fe9d38 33%, #007f7f 66%, #e0282f);
}

/* DIAMOND 는 CSS 한계로 근사 — Figma 결과가 정답 */
.demo-diamond {
  background: radial-gradient(circle at center, #fe9d38 0%, #663300 100%);
}
```

#### 13. Dark surface 위 `currentColor` SVG 는 Figma 에서 black 으로 들어옴

HTML 에 `<svg stroke="currentColor">` 만 박은 SVG 가 accent/dark 배경 위에 놓이면 브라우저는 CSS `color: #fff` cascade 로 white 로 그려주지만 **Figma `createNodeFromSvg` 는 CSS color cascade 를 모르고 currentColor 를 기본 black 으로 처리**해서 안 보이게 들어온다. 시안 B 의 hero(accent 빨강) 위 화이트 아이콘이 검정으로 들어오던 사례.

**현재 자동 처리**: `scripts/inject-svg.mjs` 가 figma.json 트리를 따라 SVG 부모의 ancestor chain 의 첫 SOLID fill (opacity ≥ 0.5) 의 luminance 를 계산해 < 128 (dark) 이면 자동으로 `fills: [{SOLID, #ffffff}]` 박는다. opacity < 0.5 인 반투명 fill (예: white 15% 오버레이) 은 표면 결정에 영향 적어 다음 ancestor 로 위임.

```js
// inject-svg.mjs 의 휴리스틱
ancestor 의 첫 SOLID fill (opacity >= 0.5) hex 의 luminance
  = 0.299 * R + 0.587 * G + 0.114 * B
luminance < 128 → SVG 에 fills: [SOLID, #ffffff] 자동 박음
```

**디자이너가 알아야 할 사항**:
- HTML SVG 에 명시적 hex (`stroke="#ffffff"`) 박으면 inject-svg 가 그 값을 colorHint 로 잡아 fills override. 자동 휴리스틱보다 우선.
- figma.json 에 SVG 노드를 직접 만들 때 `fills` 를 KDS 토큰 (예: `text.inverse` = `#ffffff`) 명시하면 그게 최우선.
- "왜 어두운 배경 위 아이콘이 검정으로 보이지?" 는 currentColor 함정. CSS color cascade 가 Figma 에 안 따라간다는 사실 기억.

#### 14. 가로 flex 카드 그룹의 균일 높이 — `layoutAlign: "STRETCH"` 박기

HTML `.task-row { display: flex }` 의 기본 `align-items: stretch` 는 자식 카드들을 가장 긴 카드 높이로 cross-axis stretch 시킨다. Figma 의 HORIZONTAL auto-layout 에서 같은 효과를 내려면 **각 자식 카드에 `layoutAlign: "STRETCH"`** 를 박아야 한다. 안 박으면 짧은 콘텐츠 카드는 짧고 긴 콘텐츠 카드는 길어 카드 높이가 제각각.

이번 세션 시안 C 의 task 캐러셀(`task-shipping` 짧은 desc 1줄 vs `task-coupon-expire` 긴 desc 2줄)에서 figma 측만 카드 높이 불일치가 발생.

```json
// task 카드 4개 모두 동일하게
{ "kdsId": "task-shipping", "type": "FRAME", "width": 240,
  "layoutAlign": "STRETCH",                    // ← 부모 cross axis 따라 stretch
  "layout": { "mode": "VERTICAL", "primaryAxisSizing": "AUTO", ... },
  "children": [ ... ]
}
```

부모 HORIZONTAL row 의 `counterAxisSizing` 은 그대로 `"AUTO"` 둬도 됨. row 의 cross 사이즈가 가장 큰 자식 따라 결정되고, STRETCH 자식들이 그 사이즈로 맞춰진다.

매핑 표:
| CSS | figma.json |
|---|---|
| `align-items: stretch` (기본) | 자식들 `layoutAlign: "STRETCH"` |
| `align-items: flex-start` | 자식 layoutAlign 없음 (기본) + 부모 `counterAxisAlign: "MIN"` |
| `align-items: center` | 부모 `counterAxisAlign: "CENTER"` |
| `align-items: flex-end` | 부모 `counterAxisAlign: "MAX"` |

#### 15. 모든 시안 HTML 은 `html { scrollbar-gutter: stable }` 필수 — Mac overlay scrollbar 함정

워크플로우 B 의 compare 비교 페이지처럼 시안 HTML 을 iframe 안에 띄울 때, **Mac 기본의 overlay scrollbar** (트랙패드 사용 시 스크롤바가 공간을 점유하지 않고 떠 있다 사라짐) 환경에서 좌우 정렬이 어긋나 보임. 시안 본문의 `.screen { margin: 0 auto }` 가 iframe 안 콘텐츠 영역(스크롤바 공간이 비어 392px 그대로)에서 중앙정렬되어 양 옆에 약 8.5px 씩 여백이 생기고, compare wrapper(width:375 overflow:hidden) 가 그 왼쪽 여백만 노출해 결과적으로 왼쪽이 비어 보이는 증상.

Windows · "스크롤바 항상 표시" 모드의 Mac 에서는 스크롤바가 17px 공간을 차지해 콘텐츠 영역이 정확히 375px 가 되므로 문제 없음. 환경 차이를 없애려면 시안 HTML 에서 스크롤바 공간을 항상 확보하면 됨.

**필수 규칙**: 시안 HTML 의 `html` 에 `scrollbar-gutter: stable` 박기.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scrollbar-gutter: stable; }   /* Mac overlay scrollbar 보정 */
html, body { ... }
```

이 한 줄로 OS·브라우저 무관하게 스크롤바 영역(17px)이 늘 확보돼서, iframe 안에서든 직접 열어서든 콘텐츠 가로 위치가 일관됨. compare.html 측의 `iframe { width: 392px }` + `.frame-wrap { width: 375px; overflow: hidden }` 트릭과 결합하면 모든 환경에서 좌우 정렬이 정확히 맞아떨어짐.

직접 열어볼 때 가시적 스크롤바가 거슬리면 시안 HTML 자체는 보통 콘텐츠가 viewport 안에 다 들어가므로 스크롤바가 안 보임. `scrollbar-gutter: stable` 은 "필요할 때만 보이되 공간은 늘 확보" 동작이라 시각적 부작용 없음.

#### 16. plugin `createNodeFromSpec` 처리 순서 함정 (이미 회피 코드 들어있음 — 손대지 말 것)

함정 #8 (TEXT width 미명시) 와 함정 #8 보강(부모 frame primaryAxisSizing AUTO + spec.height 누락) 가이드를 figma.json 측에서 모두 따랐는데도 import 시 row height 가 100·120 등으로 늘어 들어오는 사례가 있었다. 근본 원인은 figma.json 스펙이 아니라 plugin 의 노드 생성 순서. 두 가지를 회피하지 않으면 figma.json 가이드만으로는 깨진다.

**(a) TEXT 노드: `characters` 박기 전에 `spec.width` 로 미리 resize 해야 한다**

`figma.createText()` 직후 `textAutoResize` 기본값은 `'WIDTH_AND_HEIGHT'` 이고 노드 width 는 ≈0. plugin 이 spec 의 `textAutoResize: 'HEIGHT'` 를 적용하면 그 시점 width(≈0) 가 그대로 고정 width 로 잡힌다. 이후 `characters = "장바구니"` 가 들어가면 width 0 안에 한 글자도 못 들어가서 **한 글자씩 줄바꿈 → height 가 22×4=88 등으로 부풀어** 부모 frame 의 자동 결정 height 까지 그 값으로 fix 된다.

회피 코드 (code.js TEXT 처리 블록):
```js
if (spec.textAutoResize) {
  try { node.textAutoResize = spec.textAutoResize; } catch (e) {}
}
// characters 박기 전에 spec.width 로 미리 resize — 한 글자씩 줄바꿈 + 부모 height 부풀림 방지
if (spec.width !== undefined && spec.textAutoResize === 'HEIGHT') {
  try { node.resize(spec.width, Math.max(1, node.height)); } catch (e) {}
}
// ... 이후 node.characters = spec.characters
```

순서가 핵심: **textAutoResize → resize(width) → characters**. resize 가 textAutoResize 보다 먼저 오면 WIDTH_AND_HEIGHT 모드라 width 가 다시 자동으로 튕긴다. characters 보다 늦으면 이미 줄바꿈된 height 가 고정돼 의미 없다.

**(b) 자식의 `layoutGrow` / `layoutAlign` 은 `appendChild` 직후 set 해야 figma 가 받는다**

Figma API 에서 `layoutGrow` 와 `layoutAlign` 은 "이 노드가 auto-layout 부모 안에 있을 때만" 의미를 가진다. 그래서 자식 노드를 만들고 있는 시점 (createNodeFromSpec 안, 부모에 appendChild 되기 전) 에 `child.layoutGrow = 1` 을 시도하면 **silently fail** — try/catch 가 에러를 삼키고 진행하지만 실제로는 set 되지 않는다. 그 결과 figma.json 에 `layoutGrow: 1`, `layoutAlign: "STRETCH"` 박아도 적용 안 되어 자식 width 가 흔들리거나 부모 width 강제를 못 받는다.

회피 코드 (code.js 자식 처리 루프):
```js
for (const childSpec of spec.children) {
  const child = await createNodeFromSpec(childSpec, fontSet, imageRequests);
  if (child) {
    node.appendChild(child);
    // appendChild 된 직후, 부모 context 안에서 다시 set — 이 시점에야 figma 가 받아들임
    if (childSpec.layoutGrow !== undefined && 'layoutGrow' in child) {
      try { child.layoutGrow = childSpec.layoutGrow; } catch (e) {}
    }
    if (childSpec.layoutAlign && 'layoutAlign' in child) {
      try { child.layoutAlign = childSpec.layoutAlign; } catch (e) {}
    }
  }
}
```

createNodeFromSpec 안에서도 `layoutGrow` / `layoutAlign` 를 set 시도하는 코드(code.js:759, 765)는 그대로 두지만 부모 없는 상태라 무용. **실제 적용은 appendChild 직후 재set 에서 일어남.**

**검증법**: shop-kt-mypage-a 같은 메뉴 리스트 figma.json (`height: 56`, `primaryAxisSizing: FIXED`, `layoutAlign: STRETCH`, label TEXT 에 `layoutGrow: 1` + `width` + `textAutoResize: HEIGHT`) 을 import 해서 모든 메뉴 행이 정확히 56px 로 들어오는지 + label 이 grow 로 남는 공간 채우는지 확인. plugin code 를 손대게 될 때 이 두 회피 블록이 깨지지 않게 검증.

#### 17. compare 합본이 stale 이면 plugin "불러오기" 가 옛 spec 으로 import — 워크플로우 B 함정

워크플로우 B 의 시안 A/B/C 가 있을 때, 브라우저에서 보고 있는 active preview 가 **compare 비교 페이지** (`<base>-compare.html`) 이면 plugin 의 "Claude에서 불러오기" 가 합본 **`<base>-compare.figma.json`** 을 받아간다 (단독 `<base>-a.figma.json` 이 아님). 합본은 단독 figma.json 들의 root 스냅샷이라 별도로 재빌드되지 않으면 stale.

**증상**: 단독 figma.json 에 박은 새 spec(예: `height: 56`, `layoutAlign: "STRETCH"`, `primaryAxisSizing: "FIXED"`) 이 plugin import 결과에 반영 안 됨. 노드 height/sizing 이 옛 값 그대로. **figma.json 가이드를 다 따랐는데도 결과가 옛 값으로 들어오면 가장 먼저 의심해야 할 함정**. 이번 세션에서 시안 A 메뉴 행 8개에 새 spec 박았는데 plugin 으로는 height 100 으로 들어와서 plugin code 처리 순서 문제로 두 번이나 헛다리짚었던 실제 사례.

**진단법** (3분 안에 확정 가능):
```bash
# 1. bridge 에 어떤 파일이 active preview 인지 확인
curl -s http://localhost:3939/preview-active

# 2. compare 합본의 노드 spec 직접 확인 (단독과 비교)
curl -s "http://localhost:3939/design?name=<base>-compare" > /tmp/c.json
python3 -c "
import json
d=json.load(open('/tmp/c.json'))
for scr in d['design']['screens']:
  def walk(n):
    if n.get('kdsId') == '<찾을 kdsId>':
      print(scr.get('name'), 'h=', n.get('height'), 'la=', n.get('layoutAlign'), 'layout=', n.get('layout'))
    for c in n.get('children',[]) or []: walk(c)
  walk(scr)
"
```
compare 결과가 단독 figma.json 과 다르면 stale. 같으면 stale 아님 → 다른 함정 의심 (plugin code, 자식 spec 등).

또 다른 진단 — plugin code 의 `createNodeFromSpec` 에 단계별 `console.log` 박아서 import 시 어느 단계에서 spec 이 깨지는지 추적. 특정 `kdsId` 에만 찍도록 한 줄 추가하면 됨:
```js
const __TRACE = spec.kdsId === '<디버그할 kdsId>';
const __t = (label) => { if (__TRACE) console.log(`[KDS TRACE] ${label}`, { w: node.width, h: node.height, p: node.primaryAxisSizingMode, c: node.counterAxisSizingMode, la: node.layoutAlign }); };
__t('1. createNode');
// ... 각 단계마다 __t('N. ...')
```
콘솔 로그에서 spec 의 `primaryAxisSizing`/`height` 등이 의도와 다르게 들어와 있으면 plugin 이 받은 design 자체가 stale 인 것 → compare 의심.

**수동 해결**: `node scripts/build-compare.mjs <base>` 한 번 돌리면 compare 가 단독 3개의 root 로 재빌드.

**자동 회피 (이미 들어있음)**: bridge watcher 가 `to-figma/<base>-{a,b,c}.figma.json` 변경을 감지하면 500ms 디바운스 후 자동으로 `build-compare.mjs <base>` 호출 (bridge-server.js 의 `scheduleBuildCompareDirect`). HTML 변경 시의 inject 체인과는 별개 경로. `<base>-compare.figma.json` 자기 자신 변경은 무한 루프 방지를 위해 제외.

**bridge 서버 재시작 필요**: 위 자동 회피는 bridge-server.js 의 코드라, bridge 서버를 재시작해야 처음 적용된다. `lsof -ti:3939 | xargs kill` 로 죽이면 SessionStart 훅이 자동 재기동. 재시작 안 한 상태에서 figma.json 수정하면 옛 watcher 가 돌고 있어 compare 가 stale 그대로 — **그래서 figma.json 수정 후 plugin 결과가 이상하면 진단법 1번부터 다시 확인.**


#### 18. figma.json layout 속성을 flat 키로 박지 말 것 — plugin 이 못 읽고 무시 (실제 사례)

`spec-and-bridge.md` line 29-40 의 스키마대로 **layout 관련 속성은 반드시 `layout: {...}` 객체 안에** 넣어야 한다. plugin 의 `createNodeFromSpec` (figma-change-tracker/code.js line 779-781) 가 `spec.layout` 객체를 받지 못하면 `L = null` 로 결정해서 layoutMode 적용 라인 전체 skip — frame 이 그냥 절대좌표 모드 (FREE) 가 되어버린다.

**증상**: 자식들이 모두 (0, 0) 좌표에 stacking 되어 마지막에 추가된 자식만 위에 보임. wrap·gap·padding·정렬 전부 무시됨. lint 는 통과 (lint 가 이 스키마 형식까지는 검증 안 함).

**잘못된 패턴 (flat 키)**:
```json
{
  "type": "FRAME",
  "layoutMode": "HORIZONTAL",          // ← plugin 이 못 읽음
  "itemSpacing": 8,                    // ← plugin 이 못 읽음
  "paddingLeft": 16, "paddingRight": 16, // ← plugin 이 못 읽음
  "primaryAxisSizingMode": "FIXED",    // ← plugin 이 못 읽음
  "counterAxisAlignItems": "CENTER",   // ← plugin 이 못 읽음
  "layoutWrap": "WRAP"                 // ← plugin 이 못 읽음
}
```

**정답 패턴 (layout 객체)**:
```json
{
  "type": "FRAME",
  "layout": {
    "mode": "HORIZONTAL",
    "itemSpacing": 8,
    "paddingLeft": 16, "paddingRight": 16,
    "primaryAxisSizing": "FIXED",
    "counterAxisAlign": "CENTER",
    "layoutWrap": "WRAP"
  }
}
```

**키 이름도 다르다** (`-Mode` / `-Items` suffix 없음):
| flat 키 (잘못) | layout 객체 키 (정답) |
|---|---|
| `layoutMode` | `layout.mode` |
| `primaryAxisSizingMode` | `layout.primaryAxisSizing` |
| `counterAxisSizingMode` | `layout.counterAxisSizing` |
| `primaryAxisAlignItems` | `layout.primaryAxisAlign` |
| `counterAxisAlignItems` | `layout.counterAxisAlign` |
| `paddingTop`/`Bottom`/`Left`/`Right` | `layout.paddingTop`/`Bottom`/`Left`/`Right` |
| `itemSpacing` | `layout.itemSpacing` |
| `layoutWrap` | `layout.layoutWrap` |
| `counterAxisSpacing` | `layout.counterAxisSpacing` |

**진단법**: figma 에 import 했을 때 자식들이 한 곳에 겹쳐 보이면 즉시 figma.json 의 부모 노드에 `layout` 객체가 있는지 확인. flat 키가 보이면 이 함정. 일괄 변환 스크립트:
```python
KEY_MAP = {
  'layoutMode': 'mode', 'itemSpacing': 'itemSpacing',
  'paddingTop': 'paddingTop', 'paddingBottom': 'paddingBottom',
  'paddingLeft': 'paddingLeft', 'paddingRight': 'paddingRight',
  'primaryAxisAlignItems': 'primaryAxisAlign',
  'counterAxisAlignItems': 'counterAxisAlign',
  'primaryAxisSizingMode': 'primaryAxisSizing',
  'counterAxisSizingMode': 'counterAxisSizing',
  'layoutWrap': 'layoutWrap', 'counterAxisSpacing': 'counterAxisSpacing',
}
def transform(node):
  if not isinstance(node, dict): return
  layout = node.get('layout', {})
  for src, dst in KEY_MAP.items():
    if src in node: layout[dst] = node.pop(src)
  if layout: node['layout'] = layout
  for key in ('children', 'screens'):
    if isinstance(node.get(key), list):
      for c in node[key]: transform(c)
```

**예방**: figma.json 작성 전 반드시 `kds-rules/spec-and-bridge.md` line 29-40 의 정식 스키마를 lookup. flat 키 직관으로 박지 말 것. 이번 세션 icon-library 작업에서 30개 cell 이 (0,0) 에 stacking 되어 external-link 1개만 보였던 실제 사례.


#### 19. compare.figma.json 빈 스켈레톤 누락 → plugin "불러오기" 가 시안 1개만 받아감 (워크플로우 B 함정)

워크플로우 B 의 시안 3개 (A/B/C) 작업 끝에 `compare.html` 만 만들고 짝이 되는 `compare.figma.json` 을 안 만든 경우, 사용자가 compare 페이지 active preview 로 plugin "Claude에서 불러오기" 누르면 **시안 1개만** Figma 에 import 됨.

**원인 체인**:
1. `scripts/build-compare.mjs` 가 안전 가드로 **"compare.figma.json 이 이미 존재할 때만 동작"** (line 30~33). 빈 스켈레톤이 없으면 자동 생성하지 않음 (예기치 않은 파일 생성 방지).
2. bridge watcher 가 단독 시안 `<name>-a/b/c.figma.json` 변경을 감지해도 빌드 안 됨 → compare.figma.json 부재 그대로
3. plugin 의 "불러오기" 는 `/design` 호출 → bridge 가 active preview (`<name>-compare.html`) 의 짝 figma.json 을 찾으려다 없으니 fallback → **마지막 수정된 시안 1개** (`<name>-c.figma.json` 등) 로 응답
4. plugin code (`figma-change-tracker/code.js` L957~961) 는 `design.screens[]` 배열 순회 로직이라, **compare.figma.json 만 제대로 빌드되면 3개 모두 import 정상 동작**

**증상**: compare.html 은 잘 보임 (iframe 3개) 인데 plugin import 결과는 1개 뿐. "시안 3개 비교가 의도였는데 왜 1개만?" 하는 혼란.

**회피 (필수)**: 시안 3개 작업 끝에 **반드시 빈 스켈레톤** 생성 (CLAUDE.md 워크플로우 B-2 의무):
```json
{ "version": 1, "name": "<name> 비교 (A/B/C)", "screens": [] }
```
이 한 파일만 있으면 bridge watcher 가 자동 빌드 → screens[] 가 3개 시안 root 로 채워짐.

**사후 보정**: 이미 빠진 상태면 빈 스켈레톤 작성 후 `node scripts/build-compare.mjs <name>` 수동 실행. ktmyr-mypage 작업에서 실제 발생한 사례.


#### 20. PowerShell `-Encoding UTF8` 가 BOM 박음 → JSON.parse 실패

Windows PowerShell 5.1 의 `Set-Content -Encoding UTF8` 또는 `Out-File -Encoding UTF8` 은 **기본적으로 UTF-8 BOM (`EF BB BF`) 포함**. JSON spec (RFC 8259) 은 BOM 미허용. Node 의 `JSON.parse` 가 첫 바이트 `0xEF` 에서 즉시 실패하고 lint 가 깨진다.

**증상**:
```
✘ <file>.figma.json — 1 error
  Unexpected token '﻿', "﻿{ "vers"... is not valid JSON
```
PowerShell 로 일괄 치환 (예: 브랜드명·토큰 색깔 정정) 수행한 직후 흔히 발생.

**원인**: Windows PowerShell 5.1 의 `-Encoding UTF8` 디폴트 동작. PowerShell 7+ (`pwsh`) 부터는 `-Encoding utf8NoBOM` 옵션 사용 가능.

**회피 (의무)**: **JSON / HTML / md 일괄 치환은 PowerShell 금지, Node 스크립트로 통일**:
```js
// node 한 줄로 안전:
const fs = require('fs');
const files = ['a.figma.json', 'b.figma.json'];
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/old-text/g, 'new-text');
  fs.writeFileSync(f, c, 'utf8'); // BOM 안 박힘
}
```
또는 PowerShell 사용해야 하면:
- PowerShell 7+ (`pwsh`) + `-Encoding utf8NoBOM`
- 또는 `[IO.File]::WriteAllText($f, $c, (New-Object Text.UTF8Encoding $false))` (.NET 직접)

**진단**: lint 가 `Unexpected token '﻿'` 로 실패하면 즉시 BOM 의심. node 한 줄로 진단·치료:
```js
const fs = require('fs');
const path = 'to-figma/<file>.figma.json';
const buf = fs.readFileSync(path);
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
  fs.writeFileSync(path, buf.slice(3));
  console.log('BOM removed:', path);
}
```


#### 21. HORIZONTAL FRAME 의 `primaryAxisSizing: AUTO` + `counterAxisSizing: FIXED` + height 누락 → 카드가 0 높이로 렌더

**Figma 오토레이아웃의 축 정의** (자주 헷갈리는 부분):
- `mode: "HORIZONTAL"` 에서 **primary 축 = 가로 (X)**, **counter 축 = 세로 (Y)**
- `mode: "VERTICAL"` 에서 **primary 축 = 세로 (Y)**, **counter 축 = 가로 (X)**

즉 `primaryAxisSizing` 은 자식이 늘어서는 축의 sizing, `counterAxisSizing` 은 그 반대 축의 sizing. mode 에 따라 어느 게 가로/세로인지 바뀐다.

**잘못된 패턴** (카드가 0 으로 렌더):
```json
{
  "type": "FRAME",
  "kdsId": "promo-hero",
  "width": 335,
  "layout": {
    "mode": "HORIZONTAL",          ← 자식이 가로로 배치 (body | icon)
    "paddingTop": 24, "paddingBottom": 24,
    "paddingLeft": 20, "paddingRight": 20,
    "primaryAxisAlign": "MIN",
    "counterAxisAlign": "CENTER",
    "primaryAxisSizing": "AUTO",   ← 가로 = 자식 콘텐츠로 자동 (width: 335 가 무시됨)
    "counterAxisSizing": "FIXED"   ← 세로 = FIXED 인데 height 없음 → Figma 가 0 또는 unpredictable
  }
  // height 없음!
}
```

**증상**: Figma 에 import 하면 카드가 0 높이로 그려져 안 보이거나, 비정상적으로 얇은 막대로만 보임. HTML 미리보기는 정상 (CSS 가 padding 으로 자연 결정하니까) — 사용자 검수에서 figma 와 HTML 결과가 어긋남.

**올바른 매핑** (HTML CSS 가 `height` 없이 `padding` 으로 자연 결정되는 카드 패턴과 일치):
```json
"layout": {
  "mode": "HORIZONTAL",
  "paddingTop": 24, "paddingBottom": 24,
  "paddingLeft": 20, "paddingRight": 20,
  "primaryAxisAlign": "MIN",
  "counterAxisAlign": "CENTER",
  "primaryAxisSizing": "FIXED",    ← 가로 고정 (width: 335 작용)
  "counterAxisSizing": "AUTO"      ← 세로 = 자식 max height + padding 으로 자동
}
```

**원칙** (카드의 가로 고정 / 세로 자동 패턴):
- HORIZONTAL mode → `primaryAxisSizing: FIXED` (가로 고정) + `counterAxisSizing: AUTO` (세로 자동)
- VERTICAL mode → `primaryAxisSizing: AUTO` (세로 자동) + `counterAxisSizing: FIXED` (가로 고정)
- 어느 mode 든 "AUTO 측은 sizing 값 안 박음, FIXED 측은 width 또는 height 명시" 가 짝

**감지 스크립트** (저장 후 자체 검증):
```js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('to-figma/<file>.figma.json', 'utf8'));
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.layout?.mode === 'HORIZONTAL' &&
      node.layout.primaryAxisSizing === 'AUTO' &&
      node.layout.counterAxisSizing === 'FIXED' &&
      node.height == null) {
    console.log('PROBLEM:', node.kdsId, '(no height)');
  }
  if (Array.isArray(node.children)) for (const c of node.children) walk(c);
  if (Array.isArray(node.screens)) for (const s of node.screens) walk(s);
  if (node.root) walk(node.root);
}
walk(data);
```

**ktmyr-mypage-b 작업에서 실제 발생**: 시안 B 의 7개 카드 (`promo-hero`, `event-hero`, `step-card-1~4`, `helper-card`) 가 모두 이 패턴으로 박혀 Figma import 시 카드 영역이 0 으로 렌더된 사례. HTML 미리보기는 정상이라 디자이너·사용자 모두 figma import 단계에 가서야 발견.

**자매 패턴**: VERTICAL mode 의 거꾸로 케이스 — `primaryAxisSizing: "FIXED"` + `counterAxisSizing: "AUTO"` + width 없음. 이건 가로가 사라짐. 같은 원리로 회피.

lint 가 검증하기엔 의도 (카드인지 분리자인지) 파악 필요해서 결정론적 검사 어려움. **reviewer 의 정량 점검 영역에서 자동 스캔** (kds-reviewer 검사 영역 6번).

ktmyr 작업에서 10 파일 한꺼번에 BOM 박혀서 lint 모두 실패한 실제 사례.


#### 22. FIXED height 카드 + textAutoResize: HEIGHT 자식 가변 라인 → 텍스트 카드 밖 overflow

**증상**:
- HTML 미리보기에서 카드 안의 텍스트가 카드 경계를 넘어 흐름. 또는 가로 row 안 형제 카드 두 개의 height 가 다른데 짧은 쪽이 늘어나지 않고 빈 공간이 생기거나, 긴 텍스트 카드 안에서 마지막 라인만 잘려 보임. 사용자 검수에서 "이 텍스트가 카드 탭을 넘어갔어" 식 지적.

**원인** (3가지 패턴):

1. **FIXED height + 자식 두 줄 풀림**: 카드의 `primaryAxisSizing: "FIXED"` + height 명시 + 자식 TEXT 가 `textAutoResize: "HEIGHT"` 인데 width 가 좁아 한글 어절 두 줄로 풀림 → 자식 stack 합 > 카드 height → overflow. `clipsContent: false` 면 텍스트가 카드 밖으로 빠짐, `true` 면 잘림.

2. **HORIZONTAL row + counterAxisSizing AUTO + 형제 카드 stack 합 불균형**: row 의 height 가 자식 max 로 자동 결정. 자식 A 는 stack 합 240, 자식 B 는 200 이면 row height = 240. B 카드는 `layoutAlign: "STRETCH"` 없으면 자기 200 만 채우고 위에 빈 공간 생김. 또는 STRETCH 박혔어도 B 카드 안의 자식들이 `primaryAxisAlign: "MIN"` 이면 위쪽에 몰리고 아래 비어 보임.

3. **VERTICAL 부모 안 카드의 width 가 좁아 한글 어절 풀림**: dashboard mini 카드처럼 가로 폭이 ~160px 인 카드 안에 "가정의달 선물찬스" 같은 9자 한글이 들어가면 `word-break: keep-all` 적용해도 어절 단위로 풀려서 두 줄. 카드 height 가 한 줄 기준 계산이면 overflow.

**잘못된 패턴 (실제 사례 — `m-shop-kt-main-a` 시안 A dashboard `dash-mini-promo`)**:
```json
{
  "kdsId": "dash-mini-promo",
  "width": 160,
  "height": 88,                    ← FIXED 카드 높이 88 (한 줄 기준)
  "layout": {
    "mode": "VERTICAL",
    "primaryAxisSizing": "FIXED",   ← 세로 고정 → 자식이 더 풀려도 안 늘어남
    "counterAxisSizing": "FIXED"
  },
  "children": [
    {
      "kdsId": "dash-mini-promo-title",
      "width": 128,                  ← 좁은 폭
      "characters": "가정의달 선물찬스",  ← 두 줄로 풀림 ("가정의달 / 선물찬스")
      "textAutoResize": "HEIGHT"     ← 텍스트 자체는 두 줄로 자동
    }
    // 다른 자식 stack 합치면 88 초과 → overflow
  ]
}
```

**올바른 패턴 (회피 방법 3가지)**:

A. **부모 sizing 을 AUTO 로 변경** (가장 안전):
```json
"layout": {
  "mode": "VERTICAL",
  "primaryAxisSizing": "AUTO",      ← 자식 stack 합 + padding 으로 자동 결정
  "counterAxisSizing": "FIXED"
}
// height 키 자체 제거
```

B. **height 를 자식 stack 최대 예상 합 + padding 으로 충분히 확보** (디자인 의도상 카드 사이즈를 통일하고 싶을 때):
```json
"height": 124,  ← 88 → 124 (두 줄 텍스트 + 다른 자식 + padding 합)
"layout": { "primaryAxisSizing": "FIXED", ... }
```

C. **자식 TEXT width 확대 + 한 줄 강제** (텍스트가 짧으면): width 를 카드 inner 폭에 맞춰 144 로 확대 + 문구 자체 짧게 다듬어 한 줄 유지. 단 한글 카피는 디자이너 의도와 충돌 가능 — 카피 다듬기는 사용자 합의 필요.

**가로 row 형제 카드 불균형 회피**:
```json
"dashboard-row": {
  "layout": {
    "mode": "HORIZONTAL",
    "counterAxisSizing": "AUTO"    ← row 의 height = 자식 max
  },
  "children": [
    {
      "kdsId": "dash-feature",
      "layoutAlign": "STRETCH",     ← 자식 모두 STRETCH 박아서 짧은 쪽도 row max 에 맞춰 늘어남
      "layoutGrow": 1,
      "layout": { "primaryAxisSizing": "AUTO" }
    },
    {
      "kdsId": "dash-mini-col",
      "layoutAlign": "STRETCH",     ← 위와 동일
      "layout": { "primaryAxisSizing": "AUTO" }
    }
  ]
}
```

**감지 스크립트** (자체 검증):
```js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('to-figma/<file>.figma.json', 'utf8'));
function walk(node, ancestors = []) {
  if (!node || typeof node !== 'object') return;

  // FIXED height + textAutoResize HEIGHT 자식
  if (node.height != null &&
      node.layout?.primaryAxisSizing === 'FIXED' &&
      Array.isArray(node.children)) {
    const hasFlexText = node.children.some(c =>
      c?.type === 'TEXT' && c.textAutoResize === 'HEIGHT');
    if (hasFlexText) {
      // 카드의 inner 폭이 좁으면서 한글 5자+ 텍스트가 들어가면 의심
      const innerWidth = (node.width || 0)
        - (node.layout.paddingLeft || 0)
        - (node.layout.paddingRight || 0);
      const longTextChild = node.children.find(c =>
        c?.type === 'TEXT' &&
        (c.characters || '').length >= 5 &&
        innerWidth > 0 && (c.width || innerWidth) <= 160);
      if (longTextChild && innerWidth <= 200) {
        console.log('WARN:', node.kdsId,
          `(FIXED height ${node.height}, narrow inner ${innerWidth}, has flex text "${longTextChild.characters}")`);
      }
    }
  }

  // 가로 row 안 layoutAlign STRETCH 없는 자식 카드들
  if (node.layout?.mode === 'HORIZONTAL' &&
      Array.isArray(node.children) &&
      node.children.length >= 2) {
    const cards = node.children.filter(c => c?.type === 'FRAME' && c.cornerRadius);
    if (cards.length >= 2) {
      const noStretch = cards.filter(c => c.layoutAlign !== 'STRETCH');
      if (noStretch.length > 0) {
        console.log('WARN: HORIZONTAL row', node.kdsId,
          'has sibling cards without layoutAlign:STRETCH —',
          noStretch.map(c => c.kdsId).join(', '));
      }
    }
  }

  if (Array.isArray(node.children)) for (const c of node.children) walk(c, [...ancestors, node]);
  if (Array.isArray(node.screens)) for (const s of node.screens) walk(s, ancestors);
  if (node.root) walk(node.root, ancestors);
}
walk(data);
```

**핵심 원칙**:
- **카드 height 는 가능하면 AUTO 로 두고 자식 stack 합 + padding 으로 자동 결정**. FIXED height 는 height 가 디자인 상 정해진 값일 때만 (예: 단일 라인 chip, fixed-size button)
- 한글 텍스트 4자+ 가 들어가는 카드는 width 가 좁으면 두 줄로 풀릴 가능성 항상 고려. word-break: keep-all 은 어절 보존만 도와줌, 텍스트가 짧아지진 않음
- 가로 row 안 형제 카드는 모두 `layoutAlign: "STRETCH"` 박아서 row max height 에 맞춰 늘어나도록 — 빈 공간 생기지 않음
- HTML 미리보기에서 카드 안 텍스트가 잘 들어가도, **Figma import 시 카드 sizing 이 다른 동작** 할 수 있음. figma.json 의 layout sizing 키와 카드 height 명시 여부를 명시적으로 점검

**실제 사례**: `m-shop-kt-main-a` (m.shop.kt.com 메인 시안 A) 의 dashboard 영역 우측 mini 카드 `dash-mini-promo` 에서 "가정의달 선물찬스" 텍스트가 카드 밖으로 overflow. 사용자 검수에서 "이거 탭이 넘어갔어" 지적. 좌측 큰 카드 `dash-feature` (인기 핸드폰) 의 카드 높이도 stack 불균형 영향. 회피 방법 A (부모 sizing AUTO + height 제거) + 가로 row 형제 STRETCH 강제 적용으로 해결.
