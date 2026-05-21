# figma.json 스키마 + HTML 규칙 + 브릿지 파이프라인

플러그인 `createNodeFromSpec` 기준의 figma.json 스키마, HTML 작성 규칙(아이콘·이미지·elevation·텍스트 케이스), 화면 크기 토큰, 브릿지 서버 엔드포인트, 자동 인젝션 파이프라인 — 작업 중 디테일이 필요할 때 lookup 하는 참고 자료입니다. CLAUDE.md 가 워크플로우 핵심을 다루고, 이 파일이 스키마/도구 디테일을 다룹니다.


**단일 화면**:
```json
{
  "version": 1,
  "name": "…",
  "root": {
    "type": "FRAME | TEXT | RECTANGLE | ELLIPSE | LINE | SVG",
    "name": "…",
    "kdsId": "…",           // HTML과 매칭되는 식별자 (필수)
    "width": 0, "height": 0, "x": 0, "y": 0,
    "fills":   [{ "type": "SOLID", "color": "#hex", "opacity": 1 }],
    "strokes": [{ "type": "SOLID", "color": "#hex" }],
    "strokeWeight": 1,
    "strokeAlign": "INSIDE | OUTSIDE | CENTER",
    "cornerRadius": 8,
    "topLeftRadius": 8, "topRightRadius": 8, "bottomLeftRadius": 0, "bottomRightRadius": 0,
    "opacity": 1,
    "blendMode": "NORMAL | MULTIPLY | SCREEN | OVERLAY | …",
    "effects": [
      { "type": "DROP_SHADOW", "color": "#14141419", "offset": { "x": 0, "y": 4 }, "radius": 8, "spread": 0 },
      { "type": "INNER_SHADOW", "color": "#0000001A", "offset": { "x": 0, "y": 1 }, "radius": 2 },
      { "type": "LAYER_BLUR", "radius": 8 }
    ],
    "layout": {
      "mode": "VERTICAL | HORIZONTAL",
      "padding": 16,
      "paddingTop": 0, "paddingBottom": 0, "paddingLeft": 0, "paddingRight": 0,
      "itemSpacing": 12,
      "layoutWrap": "NO_WRAP | WRAP",         // HORIZONTAL 에서만, CSS flex-wrap: wrap 매핑
      "counterAxisSpacing": 8,                 // WRAP 시 줄 간 간격 (CSS row-gap)
      "primaryAxisAlign": "MIN | CENTER | MAX | SPACE_BETWEEN",
      "counterAxisAlign": "MIN | CENTER | MAX",
      "primaryAxisSizing": "AUTO | FIXED",
      "counterAxisSizing": "AUTO | FIXED"
    },
    "layoutGrow": 1,         // 자식이 부모 primary axis 남는 공간 채움 (CSS flex: 1 매핑)
    "layoutAlign": "STRETCH",// 자식이 부모 counter axis 꽉 채움 (선택)
    "characters": "…",       // TEXT만
    "fontSize": 15,           // TEXT만
    "fontName": { "family": "Inter", "style": "Regular" },
    "lineHeight": 22,         // TEXT만 (px) — 또는 { unit:"PIXELS"|"PERCENT"|"AUTO", value:0 }
    "letterSpacing": -0.3,    // TEXT만 (px) — 또는 { unit:"PIXELS"|"PERCENT", value:0 }
    "textCase": "UPPER",      // TEXT만 — 'ORIGINAL'|'UPPER'|'LOWER'|'TITLE' (CSS text-transform)
    "textDecoration": "UNDERLINE", // TEXT만 — 'NONE'|'UNDERLINE'|'STRIKETHROUGH'
    "paragraphSpacing": 8,    // TEXT만 (px)
    "paragraphIndent": 0,     // TEXT만 (px)
    "children": [ /* 자식 spec 배열 */ ]
  }
}
```

### Paint 타입 확장 (fills / strokes)

플러그인이 지원하는 paint 종류:

```json
// SOLID
{ "type": "SOLID", "color": "#191a1b", "opacity": 1 }

// GRADIENT_LINEAR — angle은 CSS linear-gradient 와 동일
//   0deg = 아래→위(↑) / 90deg = 좌→우(→) / 180deg = 위→아래(↓) / 270deg = 우→좌(←)
{
  "type": "GRADIENT_LINEAR",
  "angle": 180,
  "gradientStops": [
    { "position": 0, "color": "#ffffff" },
    { "position": 1, "color": "#e0e0e0" }
  ]
}

// GRADIENT_RADIAL / GRADIENT_ANGULAR / GRADIENT_DIAMOND — 동일 stops 구조
// 정밀 조정 필요하면 angle 대신 gradientTransform: [[a,b,c],[d,e,f]] 직접 지정

// IMAGE — imageUrl로 지정하면 플러그인이 fetch 후 image fill 적용
{ "imageUrl": "/preview-assets/<slug>/<file>", "scaleMode": "FILL" }
```

색상 값은 `#hex` / `#hex8`(알파 포함) / `rgba(r,g,b,a)` / `{r,g,b,a}` 모두 허용.

**플로우 (여러 화면)** — 플러그인이 가로 80px 간격으로 나란히 배치:
```json
{
  "version": 1,
  "name": "Login Flow",
  "screens": [
    { "type": "FRAME", "name": "1. Login",   "kdsId": "screen-login",   "width": 375, ... },
    { "type": "FRAME", "name": "2. OTP",     "kdsId": "screen-otp",     "width": 375, ... },
    { "type": "FRAME", "name": "3. Welcome", "kdsId": "screen-welcome", "width": 375, ... }
  ]
}
```

### 플로우 요청 시 파일 구조 규칙
```
to-figma/
  login-flow.figma.json           ← 화면 전체가 한 파일에
  login-flow/                     ← HTML은 화면별로 따로
    1-login.html
    2-otp.html
    3-welcome.html
```
- figma.json: `screens[]` 배열로 여러 화면 담기. 이름은 `1. Login`, `2. OTP` 식으로 **번호 prefix** 붙여 순서 명확히
- HTML: 화면별 독립 파일 (각자 375px 고정폭, 브라우저에서 실제 모바일 뷰로 확인 가능)
- 각 화면 내부 kdsId는 해당 HTML의 `data-kds-id`와 1:1 매칭

### HTML 규칙
- 의미있는 모든 요소에 `data-kds-id="…"` 심기 (figma.json의 `kdsId`와 1:1 매칭)
- 별도 요청 없으면 **모바일 375px 고정폭**이 기본
- CSS는 `<style>` 인라인. **`:root` 변수로 KDS 토큰을 선언**하고 주석에 시맨틱 이름 남기기
- **한글 어절 줄바꿈 안전망 (의무)** — `body` 또는 글로벌 셀렉터에 다음 CSS 의무 적용:
  ```css
  body, p, h1, h2, h3, h4, h5, h6, span, div, button, a, li, label, dt, dd {
    word-break: keep-all;       /* 한글은 어절(공백) 단위로만 줄바꿈, 글자 단위 X */
    overflow-wrap: break-word;  /* 한 어절이 컨테이너보다 길면 강제 줄바꿈 (안전망) */
  }
  ```
  미적용 시 한글이 글자 단위로 끊겨 "사용 가능 한"·"확인 해 주세요" 같이 어색하게 떨어짐. CSS 기본값 `word-break: normal` 의 한글 처리 버그성 동작 회피용. 함정 #8 참고

### 아이콘(SVG) 규칙

HTML에 `<svg>...</svg>` 인라인 아이콘을 쓰면, figma.json에서도 **SVG type 노드로 박아야 Figma에 진짜 벡터로 들어간다**. 빈 FRAME만 두면 import 시 빈 박스가 떠서 아이콘이 안 보인다.

**figma.json SVG 노드 스펙**:
```json
{
  "type": "SVG",
  "name": "Search Icon",
  "kdsId": "<parent>-icon",
  "width": 24, "height": 24,
  "svg": "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='11' cy='11' r='7'/></svg>",
  "fills": [{ "type": "SOLID", "color": "#191a1b" }]
}
```

- 플러그인이 `figma.createNodeFromSvg(svg)`로 진짜 벡터 변환 (편집 가능)
- `fills` 지정 시 SVG 내부 SOLID stroke/fill을 KDS 토큰 컬러로 일괄 치환 (CSS의 `currentColor` 처리)
- HTML의 `<svg>` 부모 컨테이너는 FRAME으로 두고, 그 자식으로 SVG 노드 추가 (parent kdsId + `-icon` 패턴)

**자동화 도구**:
HTML이 저장되면 **브릿지 서버가 자동으로** 다음 스크립트를 순차 실행한다 (수동 실행 불필요):
1. `scripts/inject-svg.mjs` — HTML의 `<svg>` 추출 + figma.json 자동 주입, 칩·태그류 width 하드코딩 자동 제거
2. `scripts/inject-images.mjs` — HTML의 `<img>` 추출 + figma.json 부모 노드에 `imageUrl` 자동 주입 (외부 URL은 `/proxy?url=...` 로 자동 변환)
3. `scripts/fix-icon-placement.mjs` — SVG 형제 자식을 박스 안으로 이동, 화면 정렬 보정

수동 실행이 필요하면: `node scripts/inject-svg.mjs <name>`, `node scripts/inject-images.mjs <name>` 등.

미매칭 보고가 있으면 figma.json에 부모 frame이 누락된 것이니 추가 후 재실행.

**아이콘 wrapper에 data-kds-id 필수**:
HTML에서 `<svg>`를 감싸는 모든 wrapper(`<span class="cat-icon">` 등)에 반드시 `data-kds-id`를 부여한다. 안 그러면 inject-svg가 wrapper를 못 찾고 한 단계 위 부모에 SVG를 직접 자식으로 추가해 Figma에서 아이콘이 박스 밖에 떠 보임. 이름은 보통 `<parent>-icon-box` 패턴.

이미 누락된 채로 만들어진 파일은 `node scripts/fix-icon-placement.mjs <name>` 으로 사후 보정. 이 스크립트는 SVG 옆 인접 RECTANGLE을 FRAME으로 변환하고 SVG를 그 안으로 이동시킨다.

### Elevation / 그림자 사용 규칙

`kds/tokens/elevation.json` 의 shadow-1/2/3 토큰만 사용. 임의 그림자 금지.

**CSS와 figma.json 동시 표기 (의무)**:
```css
/* shadow-1 — 카드 기본 */
.card { box-shadow: 0 2px 4px rgba(20,20,20,0.1), 0 0 2px rgba(20,20,20,0.05); }
```

```json
"effects": [
  { "type": "DROP_SHADOW", "color": "#1414141A", "offset": { "x": 0, "y": 2 }, "radius": 4 },
  { "type": "DROP_SHADOW", "color": "#1414140D", "offset": { "x": 0, "y": 0 }, "radius": 2 }
]
```

토큰별 매핑:
- **shadow-1** — 카드·일반 컨테이너 (offset y:2, radius:4 + offset y:0, radius:2)
- **shadow-2** — 떠 있는 패널·드롭다운 (offset y:4, radius:8 + offset y:0, radius:4)
- **shadow-3** — 모달·바텀시트 (offset y:8, radius:12 + offset y:0, radius:8)

색상은 모두 `rgba(20,20,20,0.1)` (= `#1414141A`) 와 `rgba(20,20,20,0.05)` (= `#1414140D`) 조합.

### 텍스트 케이스 / 데코레이션

CSS의 `text-transform`, `text-decoration` 사용 시 figma.json에도 동시 표기:

| CSS | figma.json |
|---|---|
| `text-transform: uppercase` | `"textCase": "UPPER"` |
| `text-transform: lowercase` | `"textCase": "LOWER"` |
| `text-transform: capitalize` | `"textCase": "TITLE"` |
| `text-decoration: underline` | `"textDecoration": "UNDERLINE"` |
| `text-decoration: line-through` | `"textDecoration": "STRIKETHROUGH"` |

### 이미지 사용 규칙

`<img>` 태그는 HTML에만 쓰면 된다 — 브릿지 서버가 저장 시 자동으로 `inject-images.mjs` 를 돌려 figma.json 부모 노드에 `imageUrl` 을 주입한다.

#### ❌ 절대 금지 사항 (2026-05-19 incident 기반)

figma.json 의 **`fills` 배열 안에 IMAGE 타입 paint 를 직접 박지 마라**:

```json
// ❌ 금지 — Figma 플러그인 set_fills validation 실패 ("imageHash required, imageRef unrecognized")
{ "type": "FRAME", "fills": [{ "type": "IMAGE", "imageRef": "product.png", "scaleMode": "FIT" }] }

// ❌ 금지 — imageHash 도 직접 박지 마라 (32자 hex hash 는 Figma 런타임이 createImage() 호출 결과)
{ "fills": [{ "type": "IMAGE", "imageHash": "...", "scaleMode": "FILL" }] }
```

**올바른 방법 단 하나** — HTML 의 `<img src="...">` 를 사용하고 figma.json 에는 노드 자체의 `imageUrl` 필드를 쓰거나 inject-images.mjs 가 자동 주입하게 두라:

```json
// ✅ 정답 — 노드 자체의 imageUrl (inject-images.mjs 가 HTML <img> 에서 자동 채움)
{ "type": "FRAME", "name": "product-thumb", "kdsId": "product-row-a-img",
  "fills": [],
  "imageUrl": "/preview-assets/<slug>/product.png", "scaleMode": "FIT" }

// ✅ HTML 측 — 매칭용 data-kds-id 필수
<img data-kds-id="product-row-a-img" src="/preview-assets/<slug>/product.png" alt="..." />
```

**이유**: Figma plugin API 의 `set_fills` 는 IMAGE paint 에 `imageHash` 필수. `imageRef`/`imageRefHash` 같은 가짜 키는 validation 실패. `imageHash` 는 런타임에 `figma.createImage(bytes).hash` 호출로만 얻을 수 있는 32자 hex 값이라 spec 에 미리 박을 수 없다. **노드 레벨 `imageUrl` 만이 유일한 경로**.

#### 필수 사항
- `<img>` 자체에 `data-kds-id` 부여하거나, 가장 가까운 ancestor 에 `data-kds-id` 가 있어야 매칭됨
- 부모 노드는 figma.json 에서 **FRAME / RECTANGLE / ELLIPSE** 만 허용 (TEXT/SVG/LINE 등은 image fill 미지원)
- 컨테이너 wrapper에 명시적 크기 또는 `aspect-ratio` 부여 — 안 그러면 원본 크기로 펼쳐져 레이아웃 깨짐

**이미지 CSS 기본 (의무)**:
```css
img { max-width: 100%; height: auto; display: block; }
.product-thumb { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; }
.product-thumb img { width: 100%; height: 100%; object-fit: cover; }
.brand-logo { width: 48px; height: 48px; }
.brand-logo img { width: 100%; height: 100%; object-fit: contain; }
```

`object-fit`:
- 상품 썸네일·히어로 배너 → `cover` (꽉 채우기, 잘림 허용)
- 로고·아이콘 → `contain` (비율 유지, 잘림 없음)

**외부 URL은 자동 프록시**:
`<img src="https://cdn.example.com/...">` 같은 외부 URL은 inject-images.mjs 가 자동으로 `/proxy?url=https%3A...` 로 감싸서 figma.json 에 박는다. manifest의 devAllowedDomains 가 `localhost:3939` 만 허용해도 모든 외부 이미지 접근 가능.

**진단**: Figma 플러그인이 import 시 SVG 파싱 실패·이미지 로드 실패가 생기면 `figma.notify` 로 진단 요약을 띄우고, 콘솔(`Plugins → Development → Open Console`)에 자세한 내역을 출력한다. 빈 박스가 보이면 가장 먼저 콘솔 확인.

### 콘텐츠 자연폭 컴포넌트 (chip·tag·badge·pill)

칩/태그/뱃지/필 모양 버튼처럼 텍스트 길이에 따라 폭이 결정되는 요소는 **figma.json에 `width`를 박지 않는다**. 박으면 폰트 fallback이나 텍스트 변경 시 텍스트 좌우 쏠림·overflow 발생.

대신:
- `height`만 명시 + `counterAxisSizing: "FIXED"` → 높이 일정
- `primaryAxisSizing: "AUTO"` → 콘텐츠+패딩으로 폭 자연 결정
- `paddingLeft/Right` 균등 → 텍스트 중앙 정렬

`scripts/inject-svg.mjs`가 chip-* 으로 시작하는 노드의 `width`를 자동으로 제거한다.

### 화면 크기 규칙 (중요)

타겟 viewport 에 따라 가로 사이즈가 결정된다. 사용자 요청 / viewport 패턴 판별 결과에서 정해진 viewport 를 따른다.

| Viewport | 가로 width | 최소 세로 minHeight |
|---|---|---|
| **모바일** (기본) | 375 | 812 |
| **태블릿** | 1024 | 768 |
| **PC** | 1920 | 1080 |

공통 규칙:
- 가로는 `width: <fixed>` + `layout.counterAxisSizing: "FIXED"` 로 고정
- 세로는 `layout.primaryAxisSizing: "AUTO"` + `layout.minHeight: <min>` — 내용이 적어도 min 높이 유지, 많으면 자연스럽게 늘어남
- `height` 속성은 **쓰지 말 것** (minHeight + AUTO 가 알아서 처리)
- 예외: 사용자가 명시적으로 다른 높이 요청했을 때만 FIXED 사용

**Viewport 판별 우선순위**:
1. 워크플로우 B 의 "Viewport 패턴 판별" 단계에서 사용자가 명시한 대상
2. 사용자 메시지에 "PC", "데스크탑", "태블릿" 등 키워드 있음
3. 둘 다 없으면 → 모바일 (375) 기본

**figma.json 예시 (모바일)**:
```json
{
  "type": "FRAME",
  "name": "1. Login",
  "kdsId": "screen-login",
  "width": 375,
  "layout": {
    "mode": "VERTICAL",
    "paddingTop": 24, "paddingBottom": 32, "paddingLeft": 20, "paddingRight": 20,
    "primaryAxisSizing": "AUTO",
    "counterAxisSizing": "FIXED",
    "minHeight": 812
  },
  "children": [ ... ]
}
```

**figma.json 예시 (PC)**:
```json
{
  "type": "FRAME",
  "name": "1. Dashboard",
  "kdsId": "screen-dashboard",
  "width": 1920,
  "layout": {
    "mode": "VERTICAL",
    "paddingTop": 32, "paddingBottom": 48, "paddingLeft": 80, "paddingRight": 80,
    "primaryAxisSizing": "AUTO",
    "counterAxisSizing": "FIXED",
    "minHeight": 1080
  },
  "children": [ ... ]
}
```

이 규칙 덕분에:
- 플로우의 모든 화면이 최소 같은 높이로 정렬돼 보기 좋음
- 내용이 많은 화면(긴 폼 등)만 아래로 자연스럽게 연장
- Figma에서 수동으로 크기 조정할 필요 없음

**HTML 측 동기화**: HTML 도 같은 viewport 너비로. 모바일은 `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (표준) + `.screen { width: 375px }`. PC/태블릿은 `<meta viewport>` 생략하고 `.screen { width: 1920px; margin: 0 auto }` 또는 `body { width: 1024px }` 패턴. kds-designer 와 동일 표기 — 두 곳을 늘 동기화할 것.

### 브릿지 서버 엔드포인트
- `GET /health` — 연결 확인 (플러그인 UI의 ● 상태 표시용)
- `GET /design?name=foo` — `to-figma/foo.figma.json` 반환. name 생략 시 최근 파일
- `GET /designs` — 파일 목록
- `POST /export` — 변경 로그 수신하여 `from-figma/latest.json` + 타임스탬프 파일로 저장
- `GET /preview` — to-figma 하위 HTML 인덱스 (브라우저 프리뷰 시작점)
- `GET /preview/<path>` — to-figma 하위 HTML/정적 파일 서빙 (HTML엔 라이브리로드 스니펫 자동 주입)
- `GET /live` — SSE 라이브리로드 채널 (to-figma 파일 변경 감지 시 reload 이벤트 푸시)
- `GET /proxy?url=<encoded URL>` — 외부 이미지 프록시 (CORS 회피 + manifest 단일 도메인 통과). inject-images.mjs 가 외부 URL을 자동으로 이 형태로 감쌈

### 자동 인젝션 파이프라인

브릿지 서버는 **`to-figma/*.html`** 변경을 감지하면 **800ms 디바운스 후** 다음 스크립트를 자동 순차 실행한다:
1. `scripts/inject-svg.mjs <target>` — `<svg>` → figma.json 주입 + 칩 width 제거 + **ancestor surface 가 dark(luminance<128) 이면 currentColor SVG 에 `fills: white` 자동 박음** (함정 #13 · `kds-rules/traps.md` 참고)
2. `scripts/inject-images.mjs <target>` — `<img>` → figma.json `imageUrl` 주입 (외부 URL 자동 프록시화)
3. `scripts/fix-icon-placement.mjs <target>` — SVG 박스 보정 + 화면 정렬
4. `scripts/verify-spacers.mjs <target>` — Spacer FRAME ↔ HTML margin 매칭 검증 (불일치 콘솔 보고)
5. `scripts/build-compare.mjs <base>` — **시안 단독 파일(`<base>-a/b/c`) 변경 시만 호출**. `<base>-compare.figma.json` 이 존재하면 단독 figma.json 3개의 root 를 screens[] 로 합쳐 재빌드. 존재 안 하면 즉시 스킵 (자동 생성 X). 기존 compare 의 screens[].name (사용자 컨셉 라벨) 은 같은 kdsId 기준으로 보존

추가로 **`to-figma/<base>-{a,b,c}.figma.json`** 단독 시안 파일이 직접 편집된 경우 (HTML 안 건드리고 figma.json 만 Edit/Write 한 케이스) 도 watcher 가 감지해 500ms 디바운스 후 `scripts/build-compare.mjs <base>` 만 호출한다. inject 체인은 안 돌고 compare 재빌드만. `<base>-compare.figma.json` 자기 자신의 변경은 트리거 제외 (무한 루프 방지).

각 스크립트의 콘솔 로그는 `logs/bridge.log` 에서 확인 가능. 미매칭/실패가 있으면 거기에 출력됨.

**verify-spacers 검증 로직**: 각 Spacer FRAME 의 prev/next sibling 의 `margin-bottom + margin-top` 합이 spacer height 와 일치하는지 검사. wrapper FRAME (HTML 에 직접 매핑 안 되는 padding 컨테이너) 은 자식으로 한 단계 추적해 실제 시각 요소 검증. 한쪽에만 margin 박혀있어도 합산 통과되니 자유롭게 작성 가능.

**build-compare 자동 재빌드**: 워크플로우 B 의 시안 비교 파일(`<base>-compare.figma.json`)은 단독 `<base>-a/b/c.figma.json` 의 root 스냅샷이라 단독 파일이 갱신돼도 따라가지 않으면 stale 됨. bridge 가 시안 단독 파일 변경 시 자동으로 compare 도 재빌드해 stale 방지. HTML 변경뿐 아니라 **figma.json 직접 편집** 도 트리거됨 (위 5번 + 추가 watcher). 한 번 빌드한 뒤에 컨셉 라벨(예: `"A · 대시보드 위젯형 (레이아웃)"`)을 직접 수정하면 다음 자동 재빌드 시 그 라벨이 보존됨.

**함정 — compare 가 stale 일 때 plugin 이 옛 spec 으로 import**: 사용자가 브라우저에서 **compare 페이지**(`<base>-compare.html`)를 active preview 로 보고 있으면 plugin 의 "Claude에서 불러오기" 가 `<base>-compare.figma.json` 을 받아간다. compare 가 stale 이면 우리가 단독 figma.json 에 박은 새 spec(`height`, `layoutAlign`, `primaryAxisSizing` 등) 이 plugin 에는 옛 값으로 들어가 import 결과 height 가 100 으로 박히는 등 깨진다. **figma.json 만 편집했는데 plugin 결과가 의도와 다르면 가장 먼저 의심**: `curl http://localhost:3939/design?name=<base>-compare | jq '.design.screens[].children[]...'` 등으로 compare 의 해당 노드 spec 확인. stale 이면 `node scripts/build-compare.mjs <base>` 수동 실행 (위 추가 watcher 가 들어간 이후로는 자동 처리되지만, bridge 서버 재시작 전이라면 옛 watcher 가 돌고 있을 수 있음).
