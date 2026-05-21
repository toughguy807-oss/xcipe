# 프로젝트 규칙

이 프로젝트는 두 가지 작업을 다룬다:
- **워크플로우 A — 단일 시안 + Figma 양방향 루프**: 단순 화면·컴포넌트 단위 작업. 사용자가 화면/컴포넌트만 요청하면 이 루프.
- **워크플로우 B — 타겟 사이트 분석 → KDS 재디자인 시안 3개**: 사용자가 `<URL> + <만들고 싶은 화면>` 형태로 요청하면 이 루프. URL은 만들고 싶은 화면이 실제로 존재하는 사이트(예: KT 사이트의 로그인 페이지). kds-researcher가 그 화면을 크롤링·분석한 뒤, **그 사이트의 화면을 KDS로 재디자인한 시안 3개**를 생성.

## 세션 시작 자동 점검 (사용자 첫 메시지 응답 직전, 모든 작업보다 먼저)

사용자의 **첫 메시지**를 받으면, 어떤 작업 토론·계획도 하기 전에 bridge-server 상태부터 확인한다. 그동안 사용자가 작업 다 끝낸 뒤에야 "서버 안 열려있다" 를 발견해 당황한 일이 반복돼 의무화.

순서:

1. **SessionStart hook 의 `additionalContext` 메시지 먼저 본다.**
   - "포트 3939에 브릿지 서버(또는 다른 프로세스)가 이미 떠 있습니다 (PID=…)" 알림이면 → 사용자에게 짧게 한 줄: "기존 서버(PID=…) 그대로 쓸까요?" 확인 후 작업 진행. 보통 직전 세션의 살아남은 프로세스라 그대로 쓰면 됨.
   - 메시지 없음(= hook 이 새로 기동 시도) → 다음 단계로.
2. **health check**: `curl -s http://localhost:3939/health` (timeout 2초). 200 응답이면 통과 — 응답에 굳이 언급하지 않고 본 작업 진행.
3. **응답 없으면** 사용자에게 한 줄: "서버가 꺼져 있는 것 같습니다. 다시 열까요?" → OK 면 의존성 점검(`node_modules/chokidar` 부재 시 `npm install`) 후 `node bridge-server.js > logs/bridge.log 2>&1 &` 백그라운드 기동, `logs/bridge.log` 첫 줄로 정상 기동 확인.

원칙:
- 서버 살아있을 땐 응답에 언급 안 함 (살아있는 게 디폴트). 죽었을 때만 한 줄 알린다.
- 점검만으로 응답 시간 절반을 잡아먹지 말 것 — 2초 timeout, 길어지면 그 시점 결과로 판단.
- SessionStart hook 은 이미 의존성 누락 시 자동 `npm install` 후 기동하도록 설정돼 있으므로, 위 수동 기동은 hook 자체가 실패한 경우(드물게)에만 발동.
- **서버가 켜져있는데 `/preview` 가 느리거나 무한 로딩에 빠지면** → `curl http://localhost:3939/diag` 로 `sseClients` 확인 (2 초과면 좀비 SSE 누적). 진단 도구 영구화돼 있음 → `kds-rules/bridge-debugging.md` 참고. **추측 fix 는 최대 2회**, 그 후 통하지 않으면 즉시 `BRIDGE_TRACE=1` 로 재기동 후 사용자 재현 요청.

## 필수: KDS 디자인 시스템 사용

**화면·컴포넌트·UI를 만들거나 수정할 때는 반드시 KDS(Korean Design System)를 사용**해야 한다. 임의의 색상/스페이싱/타이포/라운드를 쓰지 말 것.

### 생성 전 체크리스트 (모든 UI 작업 시작 전에 확인)
1. 필요한 역할의 토큰을 `kds/tokens/` 파일에서 확인했는가? **그리고 작업 영역의 `kds/data/foundations/` 가이드를 lookup 했는가?**
   - **lint 0 error ≠ KDS 완전 준수.** lint 는 색·spacing·radius·button 사이즈·kdsId 중복 같은 결정론적 검사만 한다. **도메인 가이드 (stroke 두께·터치 영역·모션 곡선 등) 는 lint 가 못 잡는다** — 작성자와 reviewer 의 책임. ktmyr 작업과 icon-library 작업에서 같은 실수 (iconography 가이드 미검토로 stroke 1.5/1.6 작성) 가 반복된 사례 있음. 작업 시작 전 가이드 lookup 의무
   - **영역별 가이드 파일**:
     - 아이콘 / SVG 작업 → `kds/data/foundations/iconography.txt` (24×24 그리드 · stroke 2px (1.2~4 범위) · 20×20 작업 영역 · end point round · Line/Fill 스타일)
     - 접근성 (대비·터치 영역·텍스트 사이즈) → `accessibility.txt`
     - 모션 (transition·easing) → `motion.txt`
     - 색·radius·typography·breakpoint·elevation → 각자 `*.txt`
     - visual communication (전체 톤) → `visual-communication.txt`
2. 유사 컴포넌트가 `kds/data/components/` 에 있는가? 있다면 그 스펙을 따랐는가?
   - **우선 `kds/data/components/<name>.spec.json` 을 먼저 확인할 것.** 이 파일에는 anatomy / variants / sizes / colorMatrix / rules / lintHints 가 JSON 으로 정리되어 있어 이미지·텍스트를 매번 다 안 열어도 토큰을 정확히 알 수 있다. spec.json 이 있으면 우선 이걸 따른다
   - spec.json **미존재** 시에만 fallback: `<name>.txt` + `<name>-spec-*.jpg` 또는 `<name>/NN.jpg` (사이즈 표가 이미지 안에 들어있으므로 사이즈 페이지를 반드시 열어볼 것)
   - 토큰 밖 값(예: button height 52) 임의 사용 금지 — 그 사이 값이 필요해 보이면 사용자 확인 요청
   - **알려진 컴포넌트 사이즈 토큰** (`<name>.spec.json` 의 `sizes.tokens` 기준, lint 가 button 자동 검증):
     - **button** — XLarge 56 / Large 48 / Medium 44 / Small 32 / XSmall 24
     - **text-field** — TextField 52 / TextFieldTwoLine 68 / TextArea 100 (min-height)
     - **chip** — 36
     - **checkbox** — 46
     - **radio-button** — 46
     - **switch** — Medium 28 / Small 24 / XSmall 20
     - **dropdown** — 52
     - **tab** — 48
     - **search** — 48
     - **tag** — Large 24 / Medium 20 / Small 18
     - **loading** — Small 28 / Medium 40 / Large 56
     - **bottom-navigation** — 56
     - **top-navigation** — 52
     - **data-table** — Compact 40 / Default 56 / Wide 72 (row height)
     - **tooltip** — max-width 272
     - **popup** — Center 184min/320w / PC 400w / Expanded 610w×800h max
     - **bottom-sheet** — max-height 90% / 702px
3. 산출물(HTML/figma.json)의 모든 값이 토큰에서 유래했는가?
4. **아이콘은 `kds/data/icons/` 라이브러리 우선 참조.** HTML 에 `<svg data-kds-icon="home" width="24" height="24"></svg>` 같이 빈 ref 만 작성하면 `scripts/inject-svg.mjs` 가 자동으로 검증된 SVG (24×24 viewBox + currentColor + stroke 2px) 로 치환 → figma.json 의 `spec.svg` 에 박힘. 라이브러리에 없는 임의 아이콘만 직접 인라인 SVG 작성 (KDS 표준: 24×24 viewBox / 20×20 작업 영역 / stroke 2px (1.2~4 범위) / end point round / currentColor 권장). lint 가 `svg-empty-string` / `svg-no-viewbox` / `svg-zero-viewbox` / `svg-no-graphic` / `svg-empty-path` 자동 검사
   - **라이브러리 47개**: home / menu / chevron-(left|right|down|up) / close / search / bell / settings / user / plus / minus / check / heart / heart-fill / share / pencil / trash / attachment / refresh / eye / eye-slash / info / warning / phone / headset / chat / calendar / external-link / cart / smartphone / wifi / map-pin / gift / truck / credit-card / document / qr-code / star / star-fill / filter / bookmark / dots-horizontal / dots-vertical / clock / percent
   - 라이브러리에 없는 아이콘이 자주 필요해지면 → `kds/data/icons/` 에 새 SVG 추가 (KDS 표준 준수). KDS iconography 가이드: `kds/data/foundations/iconography.txt`
4-1. **로고는 `kds/data/logos/` 라이브러리 사용 (아이콘과 별개).** HTML 에 `<svg data-kds-logo="kt" width="47" height="38"></svg>` ref 작성 → inject-svg 가 라이브러리 SVG 로 치환. 아이콘과의 핵심 차이: **로고는 원본 브랜드 컬러 고정** (사용자 결정 정책 — `kds/data/logos/README.md` 참고). currentColor 미사용, inject-svg 가 fills override 안 함, KDS 토큰으로 자동 매핑 안 함 → 어떤 surface 위에서도 원본 fill 그대로 렌더.
   - **라이브러리 항목** (`kds/data/logos/README.md` 의 표가 정본):
     - `kt` — KT 본사이트 (www.kt.com) + KT 샵 (shop.kt.com 공유) — 검정 + 빨강 `#E20613`, viewBox `0 0 46.95 38.31`
     - `kt-mvno` — KT 마이알뜰폰 (ktmyr.com) 헤더 컬러 버전 — 검정 + teal `#499690`, viewBox `0 0 108 38`
     - `kt-mvno-black` — KT 마이알뜰폰 footer 흑백 버전 — 단색 검정, viewBox `0 0 108 38`
   - 새 도메인 로고가 자주 필요해지면 → `kds-researcher` 를 호출해 `research/brands/<domain>/logos/` 에 1차 추출 후 메인 세션이 `kds/data/logos/` 로 이관. README 표 업데이트
   - **금지**: 로고 SVG 의 `fill` 컬러 임의 변경, currentColor 로 바꾸기, viewBox 변경, wordmark 변형. 브랜드 자산 보존 정책 (사용자 결정)
5. **figma.json 작성 전 `kds-rules/spec-and-bridge.md` line 29-40 의 `layout` 객체 스키마를 lookup 의무.** 직관으로 flat 키 (`layoutMode`, `itemSpacing`, `paddingLeft` 등) 박지 말 것 — plugin (`figma-change-tracker/code.js` line 779-781) 이 `spec.layout` 객체만 인식. flat 키로 박으면 layoutMode 가 통째로 무시되어 자식들이 (0,0) 좌표에 stacking 됨. 함정 #18 참고. lint 는 이 스키마 형식까지 검증 안 함 — 작성자가 직접 책임
6. **HTML 작성 시 한글 어절 줄바꿈 안전망 CSS 의무.** 글로벌 셀렉터에 `word-break: keep-all; overflow-wrap: break-word;` 적용. 안 박으면 CSS 기본값 `word-break: normal` 이 한글을 글자 단위로 끊어서 "사용 가능 한"·"확인 해 주세요" 같이 어색하게 떨어짐. figma.json 의 TEXT width 가 정확해도 HTML 미리보기에서만 끊겨 사용자 검수 시 figma 결과와 어긋남. 함정 #8 후반부 참고 (spec-and-bridge.md "HTML 규칙" 의 의무 CSS 도 동일)

### 참고할 토큰 파일
- `kds/tokens/color.primitive.json` — 원시 컬러 (gray.xx, red.xx 등)
- `kds/tokens/color.semantic.light-default.json` — 시맨틱 매핑 (text.primary, fill.accent-primary 등)
- `kds/tokens/color.semantic.dark-default.json` — 다크모드
- `kds/tokens/spacing.json` — space-4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 …
- `kds/tokens/radius.json` — 4 / 8 / 12 / 16 / circle(999)
- `kds/tokens/typography.typescale.json` — heading-1~3, title-1~2, body-1~3, label-1~4, caption
- `kds/tokens/typography.semantic.json` — 시맨틱 타이포 매핑
- `kds/tokens/elevation.json` — 그림자

### Accent Primary 대체 규칙 (KDS 명시 — brand override 영역)

`fill.accent-primary` 시맨틱은 **4모드 (light-default / light-agent / dark-default / dark-agent) 모두 red 계열로만 매핑**돼 있지만, KDS `color.txt` line 204-205 가 brand override 자체를 명시 허용:

> "브랜드 강조 시 미리 정의된 컬러 비율에 맞춰 **Accent Primary, KT Red를 대체 할 수 있습니다**.
> 일부 서비스에서는 KT Teal을 Accent Primary로 사용합니다."

**KDS 공식 Brand Color 페이지의 Case 1/2 시각화** (캡쳐: `to-figma/_attachments/20260515-1726-1-kds-brand-color-case12.png`) 가 다음 두 케이스를 명시 예시:

| Case | 컬러 비율 |
|---|---|
| **Case 1** | Primary (white) + 회색 위계 5단계 + 검정 + **Accent1 = Purple** + Accent2 = Teal |
| **Case 2** | Primary (white) + 회색 위계 5단계 + 검정 + **Accent1 = Blue** + Accent2 = Teal |

**해석 (사용자 결정 2026-05-15, KDS Brand Color 페이지 Case 1/2 로 근거 확정)**: 첫 문장이 "대체 가능 자체를 허용" 한 규정이고, "KT Teal" 은 둘째 문장의 **예시**일 뿐 후보 제한이 아님. Case 1/2 가 Purple·Blue 도 KDS 공식 허용 예시로 박혀 있음. 따라서 brand 시그니처 컬러에 따라 KDS primitive 토큰 안에서 적절한 컬러 (red, teal, blue, purple 등) 를 Accent Primary 자리에 자유롭게 사용 가능.

**플로우 (사용자 결정 2026-05-15)**:
- brand 의 시그니처 컬러가 명확히 식별되면 (`research/brands/<domain>/brand.md` 의 컬러 빈도·강도 관찰로 확정 가능) **디자이너가 사용자에게 묻지 않고 바로 진행**. Red/Teal/Blue/Purple 등 KDS primitive 안에서 brand 시그니처에 정합한 컬러 자동 채택
- brand 시그니처가 blue/purple/teal/red 등 KDS primitive 토큰 안의 어떤 컬러든 자동 채택 가능 (KDS Brand Color 페이지 Case 1 = Purple, Case 2 = Blue 명시)
- 단 **임의 hex 절대 금지** — brand 의 실제 시그니처 hex (예: m.shop.kt.com 의 `#5DDFDE`) 가 KDS primitive 토큰과 다르면 가장 가까운 primitive 값 (예: `teal.300 #4cc8c3` 또는 `teal.500 #007f7f`) 으로 매핑
- brand.md 의 시그니처 관찰 결과가 디자이너의 자동 정당화 근거. KDS primitive 안의 어떤 컬러든 brand 시그니처와 정합하면 OK — 별도 사용자 결정 흔적 없어도 PASS. 단 brand.md 가 명시한 시그니처와 명백히 어긋나는 컬러를 채택하려면 (예: brand 가 보라인데 굳이 파랑으로 가려는 경우) 사용자 명시 요청이 있을 때만 진행

**금지 사항** (정책 변경 후에도 유지):
- KDS primitive 토큰 외 임의 hex 사용
- 시맨틱 역할 정합성 위반 (예: 텍스트 위계가 헷갈리도록 link 컬러를 강조 자리에 박는 등 의미 충돌)
- 같은 시안 안에서 **Accent Primary** 자리에 컬러가 일관되지 않게 흔들리는 것 (예: A 카드는 purple, B 카드는 blue 식으로 Accent Primary 가 흔들림 금지 — Accent Primary 는 한 시안 안에 1개). 단 **Accent Secondary** 는 별개로 허용 — `kds/data/foundations/color.txt` line 169-173 가 Accent Primary (브랜드/서비스 강조) + Accent Secondary (보조 컬러) 두 자리를 명시 정의. KDS Brand Color 페이지 Case 1/2 도 Accent1 + Accent2 두 자리 시각화. 예: m.shop.kt.com 시안 B 의 "KT Teal (Accent Primary 메인 인터랙티브) + KT Red (Accent Secondary 가격 강조)" 양축 패턴은 정당

**lint 는 못 잡음**. lint 는 primitive 토큰 검사만 함. accent 자리의 컬러 선택 적정성은 reviewer 가 검수.

근거: `kds/data/foundations/color.txt` line 202-205, `visual-communication.txt` line 28, `kds/tokens/color.semantic.*.json` 4모드 모두 + 사용자 결정 (2026-05-15)

### 참고할 컴포넌트 스펙
- `kds/data/components/<name>/` — 컴포넌트 리소스 (button, bottom-sheet, bottom-navigation 등)
- `kds/data/components/<name>.txt` — 스펙 설명
- `kds/data/foundations/`, `kds/data/patterns/`, `kds/data/ux-writing/`, `kds/data/ai-agent/`

### 작성 규칙
- CSS 변수명/클래스명/주석에 **시맨틱 토큰 이름을 남긴다**. 예: `/* fill.accent-primary */`
- 하드코딩된 값 옆에 토큰 경로를 주석으로 남긴다
- 토큰에 딱 맞는 값이 없으면 **임의 지정하지 말고** 사용자에게 확인 요청
- 컬러는 hex로 resolve하되 `color.primitive.json` 의 값만 사용
- 버튼/입력/내비게이션 등은 먼저 `kds/data/components/` 에서 매칭되는 게 있는지 확인
- **`kdsId` 는 화면 안에서 unique 해야 함.** plugin 은 Figma node id + kdsId (plugin data) 로 매칭하므로 figma 캔버스에 같은 이름 프레임이 여러 개 있어도 kdsId 만 다르면 정확히 구분된다. 반대로 figma.json spec 안에서 같은 kdsId 가 두 번 박히면 plugin import / inject-svg / inject-images 매칭이 충돌. lint 가 `kind: kdsId-duplicate` 로 자동 검사
- **`name` 은 사람용 라벨** — plugin 매칭에 안 쓰이므로 같아도 무방하지만, Figma 캔버스에서 식별이 편하도록 가능하면 unique 한 게 좋다 (예: `Plan Card 1` / `Plan Card 2`)

---

## 사용자 첨부 이미지/스크린샷 자동 저장 규칙

사용자가 메시지에 이미지/스크린샷을 첨부하면 **즉시 적절한 폴더에 저장 후 경로를 한 줄로 보고**한다. 임시 경로에 그대로 두지 말 것 — 다음 세션에서 참조 불가능해진다.

저장 위치 우선순위 (휴리스틱):

| 맥락 | 저장 경로 | 파일명 패턴 |
|---|---|---|
| 워크플로우 B 진행 중 + 타겟 사이트의 화면 캡쳐로 추정 | `research/<slug>/screenshots/` | `user-attached-<YYYYMMDD>-<HHMM>-<n>.<ext>` |
| 작업 중인 `to-figma/<name>.*` 산출물에 대한 피드백·지적 (예: "이 버튼이 이상함" 첨부) | `to-figma/_user-feedback/` | `<base>-<YYYYMMDD>-<HHMM>-<n>.<ext>` |
| 맥락 불명 (단순 참고용 이미지) | `to-figma/_attachments/` | `<YYYYMMDD>-<HHMM>-<n>.<ext>` |

규칙:
- **추측 금지** — 맥락이 명백치 않으면 사용자에게 짧게 확인 ("이 이미지는 [현재 작업 화면 피드백] / [새 리서치 자료] 중 무엇인가요?")
- 저장 즉시 경로 보고 ("`research/coupang.com/screenshots/user-attached-20260513-1430-1.png` 저장했습니다")
- 같은 세션 후속 작업에서 이 이미지를 다시 참조할 일이 있으면 저장 경로로 접근
- `_user-feedback/` 와 `_attachments/` 는 `.gitignore` 에 포함되어 영구 산출물과 구분 (필요시 사용자가 직접 git tracking 결정)

## 워크플로우 A: 단일 시안 + Figma 양방향 루프

### 아키텍처
```
              ┌─ 브라우저 (프리뷰)
              │    http://localhost:3939/preview
              │    ← 파일 변경 시 SSE로 자동 리로드
              │
┌──────────┐  │HTTP ┌──────────────┐  파일   ┌─────────────┐
│ Figma    │◄─┴───►│ bridge-server│◄───────►│ to-figma/    │
│ plugin   │ :3939 │ (Node)       │         │ from-figma/  │
└──────────┘       └──────────────┘         └──────┬───────┘
                                                    │ 읽기/쓰기
                                                 ┌──▼───┐      린트
                                                 │Claude│────► kds/lint.js
                                                 └──────┘
```

### 구성 요소
- `bridge-server.js` — 로컬 HTTP 서버 (포트 3939). SessionStart 훅이 자동 기동, SessionEnd 훅이 종료.
  - 수동 실행이 필요하면: `npm run bridge`
  - 프리뷰: http://localhost:3939/preview (to-figma 하위 HTML 인덱스 + 라이브리로드)
  - 진단: `curl http://localhost:3939/diag` (`sseClients` / `totalRequests` / `activePreview` 등). `/preview` 가 느리거나 무한 로딩 시 → `kds-rules/bridge-debugging.md` (4 단계 원인 분석 + IPv4/IPv6 dual-bind, keepAlive 65s, SSE 좀비 차단 등 fix 영구 반영 기록).
- `kds/lint.js` — KDS 토큰 준수 검증기 (결정론적).
  - `npm run lint:kds` — to-figma 전체 검사
  - `node kds/lint.js <파일>` — 단일 파일/폴더
  - 에러: 0 (통과) / 1 (위반 있음) / 2 (실행 오류)
  - 검사 항목: 색·간격·라운드 토큰 준수, **kdsId duplicate**(`kind: kdsId-duplicate` — 같은 화면 안에서 kdsId 중복 시 매칭 충돌 위험), **버튼 height KDS 사이즈 토큰 준수**(`kind: button-size` — XLarge 56 / Large 48 / Medium 44 / Small 32 / XSmall 24 외 값은 위반. figma.json 의 `FRAME` + kdsId/name 에 `btn`/`button` 키워드 + label TEXT 또는 아이콘 SVG 자식이 있을 때 발화. `*-icon-box` 같은 아이콘 컨테이너는 제외), **TEXT 노드 width 누락**(함정 #8 · `kds-rules/traps.md` 참고), **오토레이아웃 부모 + 자식 절대좌표**(함정 #1 · 좌표 무시), **`<circle>`/`<ellipse>` + stroke-dasharray 조합**(Figma 파서가 progress arc 를 점선으로 그려 끊어짐 — `<path>` 의 arc 명령으로 직접 그리기), **stroke-dasharray 단일 값**(다른 태그여도 dash 반복 패턴으로 그려짐)
- **에이전트 2종** (`.claude/agents/`):
  - `kds-designer` — 화면·플로우 생성/수정. KDS 토큰·컴포넌트·UX 라이팅 전부 참고. Write 가능. 작업 끝에 kds/lint 통과 필수.
  - `kds-reviewer` — 의미·맥락 검수 (시맨틱 역할, 컴포넌트 선택, UX 라이팅, 접근성, 플로우 일관성). Write 금지, 리포트만 반환.
- `figma-change-tracker/` — Figma 플러그인
  - `manifest.json` — `devAllowedDomains`에 `http://localhost:3939` 등록
  - `code.js` — 변경 감지 + HTML→Figma 레이어 생성 (createNodeFromSpec)
  - `ui.html` — "Claude에서 불러오기" / "Claude로 보내기" 버튼
- `to-figma/` — 내가 만든 `*.html` + `*.figma.json` 쌍이 저장되는 폴더. 플러그인이 여기서 최신 파일을 fetch
- `from-figma/` — 플러그인이 변경 로그를 POST하면 `latest.json` + 타임스탬프 파일로 저장

### 루프 (4단계 공식 워크플로우)

**1. 사용자: 화면/컴포넌트 설계 요청**
- 예: "로그인 화면 만들어줘", "버튼 컴포넌트 정리해줘", "회원가입 플로우 만들어줘"

**2. 내가: 생성 → 린트 → 검수 → 자동 수정 → 최종본 보고**
- `to-figma/x.html` + `to-figma/x.figma.json` 생성 (**반드시 KDS 토큰 사용**, 사이즈 규칙 준수)
- 플로우면 `to-figma/x.figma.json` (screens[]) + `to-figma/x/1-*.html` 구조
- **저장 후 `node kds/lint.js to-figma/<파일>` 실행해 0 error 확인** (에러 있으면 제안 토큰으로 고쳐 재실행)
- **검수 에이전트 (`kds-reviewer`) 호출은 모든 산출물에 의무**. 단순 화면이라도 호출. 린트가 결정론적 검사(색·간격·라운드·버튼사이즈·kdsId중복)만 보장하지, 의미·맥락·컴포넌트 선택은 reviewer 만 본다. 이전에 "단순 화면 스킵 가능" 규칙이 있었지만, 실제로 단순 화면에서도 컴포넌트 type 선택 오용(예: pill 을 ELLIPSE 로 박음)이나 width 부족 줄바꿈 같은 사안이 자주 나와 의무화함
- **검수에서 나온 이슈는 사용자에게 묻지 말고 내가 끝까지 처리**한다:
  - **치명·권고 → 모두 자동 수정** (원본 덮어쓰기, 같은 작업 사이클 내 자체 수정이므로 -v2 안 만듦)
  - **제안(nice-to-have) → 자동 수정 안 하고 최종 보고에 한 줄로 언급만**
  - 자동 수정 후 다시 린트 → 0 error 확인
- 완료 후 **최종본만 보고**: 만든 파일 경로 + 사용 KDS 영역 + 린트 결과 + 검수에서 잡혀 **이미 수정된 항목 표** + 미처리한 제안 목록 (있다면)
- 사용자 승인이 필요한 예외: ① 토큰에 딱 맞는 값이 없어 임의 지정이 불가피한 경우, ② 검수가 의도 자체에 의문을 제기한 경우(예: "이 화면이 마이페이지가 맞나?"), ③ 수정 시 화면 구조를 크게 바꿔야 하는 경우. 이 외엔 사용자에게 결정을 떠넘기지 않는다.

**3. 사용자: Figma 플러그인으로 왕복**
- "Claude에서 불러오기" → 수정 → "Claude로 보내기"
- `from-figma/latest.json`에 변경 로그 자동 저장

**4. 내가: 수정 반영 (+ 린터/검수로 KDS 컴플라이언스 강제)**
- `from-figma/latest.json` 읽고 `kdsId`로 HTML 매핑
- **수정본은 `-v2` 파일로 저장** (원본 절대 덮어쓰지 말 것)
  - 단일: `to-figma/login-v2.html` / `to-figma/login-v2.figma.json`
  - 플로우: `to-figma/login-flow-v2/` + `to-figma/login-flow-v2.figma.json`
- **저장 직후 린터 실행:** `node kds/lint.js to-figma/<v2>`
- 린터가 잡은 위반은 **제안된 토큰으로 자동 치환** (예: `#000000` → `fill.primary` = `#191a1b`)
  - 치환 후 다시 저장 → 재린트해서 0 error까지 반복
- **검수 에이전트 자동 호출** (`kds-reviewer`): Figma에서 수정이 들어온 경우는 무조건 검수. Figma 편집은 토큰 밖 값·역할 오용이 섞여 들어오기 쉬움.
- **검수 이슈는 단계 2와 동일하게 자동 처리**: 치명·권고 모두 -v2 안에서 직접 수정 후 재린트. 사용자에게 묻지 않음. 제안은 보고에만 언급.
- **수정 완료 후 최종본 보고**:
  - 어떤 kdsId가 어떻게 바뀌었는지 목록
  - KDS 치환 내역은 **표 형식**으로 (원본값 / 치환값 / 사유)
  - 검수에서 잡혀 함께 수정한 항목도 같은 표에 포함
  - 린터가 제안 못 한 애매한 값만 "확인 필요"로 플래그 (이때만 사용자에게 질문)

이 루프의 핵심 원칙:
- **KDS 토큰에서 유래하지 않은 값은 절대 HTML에 넣지 않음.** 사용자가 Figma에서 토큰 밖 값을 썼다면 가장 가까운 토큰으로 치환하고 보고
- **원본 HTML은 늘 보존.** 수정본은 새 파일(-v2)로
- **변경 내역은 투명하게 보고.** 어떤 것이 어떻게 바뀌었는지, 치환이 있었으면 왜 그랬는지

---

## 워크플로우 B: 타겟 사이트 분석 → KDS 재디자인 시안 3개

### 입력 형태 (자동 발동 조건)

**URL이 메시지에 등장하면 무조건 페이지를 먼저 확인한다.** 워크플로우 B 발동 여부와 무관하게, 사용자 메시지에 URL 한 개라도 보이면 즉시 kds-researcher (또는 단순 조회면 WebFetch/Playwright) 로 페이지 내용·구조·스크린샷을 확인해서 무엇에 대한 URL인지부터 파악한다. 추측하거나 모른 채 답하지 않는다.

확인 결과에 따라 분기:

| 메시지 형태 | 동작 |
|---|---|
| `<URL> + 화면/페이지 요청` (예: "이 페이지 KDS로 만들어줘") | **워크플로우 B 자동 발동** → 시안 3개 |
| `<URL>` 만 (요청 의도 불분명) | 페이지 확인 후 **"이 페이지를 KDS로 재디자인할까요?"** 짧게 확인 |
| `<URL> + "한 개만"` 등 명시적 단일 요청 | 페이지 확인 후 **워크플로우 A** 로 진행 (시안 1개) |
| `<URL> + "그냥 이 사이트 어떤지 봐줘"` 등 분석만 요청 | 페이지 확인 후 brief 만 전달, 시안 생성 안 함 |

워크플로우 B 발동 예시:

```
"https://login.kt.com + KT 로그인 화면 만들어줘"
"https://www.coupang.com/ + 쿠팡 홈 화면을 KDS로 다시 만들어줘"
"<url> 이 페이지를 KDS 적용해서 시안 3개로 줘"
```

- URL = **만들고 싶은 화면이 실제로 존재하는 타겟 사이트** (영감 받을 외부 디자인이 아니라, 분석 대상)
- URL 없이 "로그인 화면 만들어줘" 만 오면 워크플로우 A (페이지 확인 단계 없이 바로 진행)

### Viewport 패턴 판별 (워크플로우 B 발동 시 필수)

**B-0 에서 재작업으로 판정되어 기존 `brief.md` 가 있으면 그쪽 viewport 따르고 이 단계 스킵.** 새 작업이면 URL 받은 즉시 kds-researcher 가 **모바일 (375×812) + 데스크탑 (1440×900) 두 viewport 로 페이지 캡쳐**해서 사이트 viewport 패턴을 판별하고 사용자에게 짧게 확인한다:

| 관찰 | 사이트 타입 | 사용자 확인 |
|---|---|---|
| 모바일 캡쳐 = 데스크탑 캡쳐의 단순 축소 (같은 레이아웃) | **반응형 미지원 (PC 전용)** | "이 사이트는 PC 전용입니다. 어느 viewport 기준으로 시안 만들까요? (모바일 / 태블릿 / PC)" |
| 모바일 캡쳐와 데스크탑 캡쳐가 명백히 다른 레이아웃 + 같은 URL | **반응형** | "반응형 사이트입니다. 어느 viewport 기준으로 시안 만들까요? (기본: 모바일 375)" |
| URL 이 `m.<도메인>` 이거나 모바일 전용 페이지로 redirect | **적응형 (별도 모바일 URL)** | "이 사이트는 모바일 전용 URL 이 따로 있습니다 (현재: `<m-url>`, 데스크탑 추정: `<pc-url>`). 어느 쪽으로 시안 만들까요? PC 도 같이 만들까요?" |
| URL 이 데스크탑인데 모바일 viewport 에서 모바일 페이지로 redirect | **적응형 (모바일 URL 분리)** | 모바일 URL 도 받음. 두 URL 의 정보 모두 `brief.md` 에 반영 |

판별 결과는 `research/<slug>/brief.md` 헤더의 **viewport 패턴** 항목에 기록 (반응형 / 적응형 / PC 전용 + 시안 대상 viewport). 시안 생성 단계는 이 정보를 따른다 — 모바일 대상이면 width 375, 태블릿이면 1024, PC 면 1920 (`kds-rules/spec-and-bridge.md` "화면 크기 규칙" 참고). 캡쳐용 viewport 픽셀과 시안 화면 사이즈는 별개로 관리 — 캡쳐는 표준 viewport (모바일 375×812 / 태블릿 1024×768 / 데스크탑 1440×900), 시안 화면은 위 토큰 (모바일 375 / 태블릿 1024 / PC 1920).

### 처리 순서

**B-0. 재작업 감지 + 이유 확인 (필수, 처음에 항상 점검)**

같은 도메인 + 같은 화면을 이미 작업한 적이 있는지 감지:
- 감지 신호: `research/<slug>/brief.md` 존재 + `to-figma/<name>-{a,b,c}.figma.json` 존재 (`<slug>` 와 `<name>` 매칭 휴리스틱: 사이트 도메인 + 화면 키워드)
- 감지되면 **사용자에게 즉시 짧게 확인**: "이 화면은 이미 작업한 적이 있습니다 (시안 3개 보관 중). 재작업 이유가 뭔가요?"

이유에 따라 분기:

| 이유 | 처리 |
|---|---|
| **레이아웃 문제** ("이 시안들이 별로다", "다른 방향으로") | **회피 모드** — 기존 시안 3개의 컨셉 라벨을 모두 읽어 그 방향과 **명백히 다른 후보 풀** 로 시안 3개 새로 생성. `to-figma/_rejected/` 의 시안도 후보에서 제외. 회피한 방향을 새 시안의 보고에 명시 ("기존 시안 A 가 '좌우 분할 hero' 였으므로 이번 A 는 '상단 풀폭 hero + 중앙 정렬' 로 회피"). brand.md 는 그대로 사용 |
| **리서치 문제** ("이 사이트 정보가 부족하다", "다른 화면 정보도 필요") | **재크롤 모드** — kds-researcher 를 더 꼼꼼하게 호출 (해당 화면의 모든 상태/모달/펼침 영역 다 캡쳐, brief.md 보강). brand.md 도 stale_check 후 필요시 갱신. 시안 3개는 기존 컨셉 라벨 방향성 유지하되 새 리서치 정보 반영 |
| **둘 다** | 사용자에게 우선순위 한 번 더 확인. 둘 다면 리서치 먼저 → 그 결과로 회피 모드 시안 생성 |
| **단순 디테일 수정** ("폰트 weight 만 통일", "이 버튼만 작게") | 워크플로우 B 가 아니라 **워크플로우 A 의 `-v2`** 사이클로 전환 (시안 3개 다시 만들 필요 없음) |

이 단계 결과를 **시안 작업 시작 전에 사용자와 합의**. 합의 없이 무작정 같은 컨셉으로 다시 만들지 않는다 (사용자 답답함의 큰 원인).

**B-1. kds-researcher 자동 호출 (Playwright 크롤링)**

이 단계는 **(a) 도메인 단위 브랜드 리서치** + **(b) 화면 단위 분석** 두 부분으로 나뉜다. 브랜드 리서치는 같은 도메인의 여러 화면 작업 사이에 일관성을 만들기 위함이고, 화면 단위 분석은 매 화면마다 다시 한다.

**(a) 브랜드 리서치 — 도메인 단위, 점진적 보강 방식**

URL에서 도메인을 추출한다 (예: `https://www.coupang.com/cart/...` → `coupang.com`, `https://login.kt.com/...` → `kt.com`). 서브도메인은 통합 (`login.kt.com` 과 `shop.kt.com` 은 모두 `kt.com` 으로 본다 — 같은 브랜드).

**핵심 원칙: `extend` 가 기본**. 화면 단위 분석을 하면서 그 영역에서 관찰되는 만큼만 brand.md 를 점진적으로 채워간다. 풀 리서치 모드는 운영상 거의 안 쓰이므로 이 시스템에서 제거. brand 가 오래되어 신뢰 못할 때는 brand.md 를 폐기하고 다시 `extend` 모드로 새로 만든다.

| 상황 | brand_mode | 처리 |
|---|---|---|
| `brand.md` **없음** (처음 만나는 도메인) | **`extend`** | brand.md 신규 생성. 이번 화면 영역에서 관찰 가능한 결론(Voice/Tone/UX 모티프/컬러·비주얼·타이포 성향)만 채움. 나머지는 "(미관찰)" 표시. 헤더에 **관찰된 영역** 명시 |
| `brand.md` **있고** 이번 화면 영역이 헤더의 "관찰된 영역" 에 **미포함** (예: 마이페이지 brand 있는데 이번엔 상품 상세) | **`extend`** | 사용자에게 "기존 brand.md 는 [관찰된 영역] 만 반영. 이번 [새 영역] 분석으로 brand.md 가 확장됩니다." 짧게 알림. brand.md 의 헤더 "관찰된 영역" 에 새 영역 추가 + 2-b 표(영역별 톤)에 행 추가. 6가지 결론은 보존 (기존과 충돌하는 신호 발견 시 메모 추가) |
| `brand.md` **있고** 이번 화면 영역이 "관찰된 영역" 에 **포함** | **`stale_check`** | 사용자에게 "이 brand 기록 그대로 쓸까요?" 짧게 확인 후 OK 면 사이트 메인 톤 변화 신호만 점검. NO 면 brand.md 폐기하고 `extend` 모드로 새로 만듦 |

**brand stale 점검** (`stale_check` 모드의 동작):
- 화면 단위 분석(b)에서 어차피 사이트를 크롤하니, 그 김에 사이트 메인의 비주얼 톤이 기존 `brand.md` 결론과 명백히 어긋나는 신호 (예: 사이트 리뉴얼) 가 있는지 가볍게 확인. 별도 추가 시간 거의 없음
- 어긋나는 신호 없음 → 기존 brand.md 그대로 사용. 시안 작업 진행
- 어긋나는 신호 있음 → 사용자에게 "사이트가 리뉴얼된 것 같습니다. brand.md 폐기하고 다시 만들까요?" 확인 → OK 면 brand.md 백업(`brand.md.bak`) 후 `extend` 모드로 새 brand.md 생성, NO 면 기존 그대로 + 시안 최종 보고에 "브랜드 변화 신호 발견, 사용자가 기존 brand 유지 결정함" 메모

**(b) 화면 단위 분석 — 기존 흐름**

- 결과물은 `research/<slug>/` 폴더에 **영구 보관**:
  - `brief.md` — 레이아웃·정보 위계·컴포넌트 구성·인터랙션 흐름·UX 라이팅 톤 정리
  - `screenshots/` — 데스크탑·모바일 캡처
  - `tokens-observed.md` — 타겟 사이트의 색·간격·타이포 패턴 기록 (참고용, KDS로 치환 대상)
- **타겟 사이트의 컬러·폰트는 따라가지 않는다** (KDS 토큰으로 모두 치환)
- 가져오는 것: 화면이 다루는 **정보·구성요소·UX 흐름** (예: ID/PW 필드, 자동로그인 체크, 비밀번호 찾기 링크, 소셜 로그인 옵션 등)

**B-2. KDS 시안 3개 생성 (kds-designer 3회 호출)**

**시안 명명 규칙**: 워크플로우 A 의 `-v2` (Figma 수정본) 과 충돌을 피하기 위해 시안은 `-a/-b/-c` 접미사를 쓴다. **시안 라벨도 A/B/C 로 통일**.
- 산출물 경로:
  - `to-figma/<name>-a.{html,figma.json}` — 시안 A (레이아웃 우선)
  - `to-figma/<name>-b.{html,figma.json}` — 시안 B (톤 우선)
  - `to-figma/<name>-c.{html,figma.json}` — 시안 C (UX·구조 우선)
  - **`to-figma/<name>-compare.html` + `to-figma/<name>-compare.figma.json` — 시안 A/B/C 비교 페이지·합본 (둘 다 필수, 디자이너가 직접 짝으로 생성).**
    - `compare.html`: 시안 3개를 iframe 으로 나란히 보여주기. 함정 #15 (`scrollbar-gutter: stable`) 와 `iframe { width: 392px }` + `.frame-wrap { width: 375px; overflow: hidden }` 패턴 적용
    - **`compare.html` 디폴트 외곽 템플릿** (위 iframe/frame-wrap 패턴 외에 매번 흔들리던 부분 — 이 디폴트를 기본형으로 박고, 디자이너 판단으로 carry-over 가능):
      - 페이지: `body { padding: 24px; background: #f8f9fa; color: #191a1b; font-family: 'Pretendard', -apple-system, sans-serif; }`. 상단에 `h1` (22px, weight 700, `letter-spacing: -0.3px`, margin-bottom 8) + `.meta` 한 줄 (13px, color #55585d, margin-bottom 24) — 도메인·viewport·차별화 원칙 요약
      - **mobile compare** (viewport=mobile): `.grid { display: grid; grid-template-columns: repeat(3, 392px); gap: 24px; align-items: start; justify-content: center; }` — 3 시안 가로 배치 (375 + 17 scrollbar gutter = 392)
      - **desktop compare** (viewport=desktop): `.grid { display: flex; flex-direction: column; gap: 32px; }` — 1920 시안 3 개는 가로로 못 넣으므로 A → B → C 세로 적층
      - `.col-head` (각 시안 위 헤더, 페이지당 3개):
        - `.col-letter` — 동그라미 (mobile 28×28 / desktop 32×32), `border-radius: 999px`, `background: #191a1b`, `color: #ffffff`, weight 700, 글자 "A"/"B"/"C"
        - `.col-title` — 시안 컨셉 한 줄 (mobile 15 / desktop 17, weight 700, `letter-spacing: -0.3px`). figma.json `root.name` 과 동일한 컨셉 라벨 사용
        - `.col-sub` — 우선 축 + 베이스 대비 변형 포인트 2~3줄 (12~13px, color #6f737b, line-height 1.5). 첫 줄에 `우선 축: 레이아웃/톤/UX·구조` 명시
      - `.frame-wrap` (iframe 바깥 래퍼): mobile `375×800` / desktop `1920w × 720h`, `border-radius` 12 (mobile) ~ 16 (desktop), `box-shadow: 0 4~8px 16~24px rgba(20,20,20,0.08)`, `overflow: hidden`, `background: #ffffff`
      - **하단 비교 표 (필수, 누락 시 작업 미완)** — 위 B-4 의 **시안 비교표 (행 구성 고정)** 를 `.row-axis` 카드 (`background: #ffffff`, `border-radius: 12`, padding 20~24, mobile `max-width: 1224px` margin auto / desktop `max-width: 1920px`) 안에 그대로 박는다. 행 6개 (우선 축 / 컨셉 라벨 / 레이아웃 / 톤 / UX 흐름 / 사용한 KDS 컴포넌트) 누락 금지. 변형 축은 `<strong>변형 ↑ ...</strong>` 로 강조 (red #e0282f)
      - 위 색상값(#f8f9fa, #191a1b, #55585d, #6f737b, #e0282f)은 compare.html **컨테이너 프레임 전용** — KDS 화면 내부(iframe srcdoc)는 KDS 토큰만 사용. compare.html 자체는 KDS preview 컨테이너지 KDS 화면이 아니므로 이 픽셀값 사용 OK
    - `compare.figma.json`: **빈 스켈레톤** `{ "version": 1, "name": "<name> 비교 (A/B/C)", "screens": [] }` 만 만들어두면, bridge watcher 가 단독 시안 (`<name>-a/b/c.figma.json`) 의 root 를 screens[] 에 자동 합쳐 채움. **빈 스켈레톤을 만들지 않으면 build-compare 가드 (`scripts/build-compare.mjs` line 30~33 — 파일 존재 시에만 빌드) 때문에 빌드 안 됨**. 그러면 사용자가 compare 페이지 보면서 plugin "Claude에서 불러오기" 누르면 bridge fallback 으로 마지막 수정 시안 **1개만** 응답하는 함정 발생. ktmyr 작업에서 실제 발생한 사례. 함정 #19 참고
    - 둘 중 하나라도 빠지면 작업 미완. 시안 3개 다 끝나면 **마지막 단계로 두 짝 모두 생성**
- 플로우 요청이면 `to-figma/<name>-a/1-*.html` 식 폴더 구조 (워크플로우 A 와 동일 규칙). 플로우 화면이 N 개면 시안당 N 개 HTML × 3 시안 = **3N 개 HTML** 생성. 작업량은 크지만 차별화 비교를 위해 모든 화면에 대해 세 시안 모두 그림

**모든 시안의 절대 전제: KDS 가 최우선이다.** 어떤 시안이든 KDS 토큰·컴포넌트·패턴을 벗어난 값(임의 색·임의 간격·임의 라운드·KDS 에 없는 컴포넌트)은 절대 쓰지 않는다. 변형은 모두 KDS 안에서만 일어난다 (예: 레이아웃 변형이라도 사용 컴포넌트는 모두 KDS 표준, 톤 변형이라도 색은 KDS 시맨틱 토큰 안에서 골라 씀). 이 원칙은 A/B/C 어느 시안에도 동일하게 적용되고, 차별화 욕심 때문에 KDS 를 깨는 것은 절대 금지.

**시안마다 우선시하는 축이 고정**되어 있다. 매번 같은 공식을 따라야 사용자가 시안 간 비교가 가능하다. 디자인 결과물 자체는 매번 달라도, **세 시안 사이의 차별화 축은 항상 같음**.

**기준점: "KDS 표준 베이스" (개념적, 구현 안 함)**

머릿속에 "KDS 컴포넌트·토큰·패턴을 가장 표준적으로 적용했을 때 이 화면이 어떻게 생겼을지" 라는 개념적 기준점을 잡는다. **베이스 파일은 따로 만들지 않는다** — 명시적 구현 없이 머릿속 기준점일 뿐. 세 시안은 모두 이 베이스에서 각자의 우선 축으로 적극 변형된 결과물이고, **변형 안 한 두 축은 베이스와 거의 동일**하게 둔다.

| 시안 | 우선 축 | 베이스 대비 적극 변형 | 베이스와 거의 같게 (= 다른 두 시안과 유사) |
|---|---|---|---|
| **A** | 레이아웃 | 필드/요소 **배치**·정보 밀도·시각 무게중심·hero 영역 유무 | 톤, UX 흐름 |
| **B** | 톤 | 색 강조도·타이포 위계·여백 처리·이미지 활용 | 레이아웃, UX 흐름 |
| **C** | UX·구조 | 사용 흐름·단계 구성·인터랙션 모델·필드 그룹핑 | 톤, 레이아웃 |

**`brand.md` 가 시안 변형 후보 선정의 근거가 된다**. B-1 의 브랜드 리서치 결과를 KDS 안에서 다음과 같이 해석해 시안 후보 풀을 만든다:

- **시안 B (톤) — 가장 직접적 영향**. brand 의 컬러 시그니처·타이포 성향·Voice 가 톤 변형 방향을 결정. 예: brand 가 "차분/신뢰" 톤이면 B 는 모노톤 강조 + 넓은 여백 방향, "역동/혁신" 이면 강한 accent + 큰 타이포 방향. **단 KDS 토큰 안에서만 매핑** — brand 의 실제 컬러·폰트 직접 사용 금지, KDS 시맨틱 토큰 중 가장 가까운 것을 골라 사용 강도·빈도로 표현
- **시안 A (레이아웃) · 시안 C (UX)** — brand 의 비주얼 모티프(사진 강도, 그리드 성향)·UX 모티프(단계형 / 일체형 / 큐레이션형 등)가 변형 후보 풀의 근거. 예: brand 가 "단계형 컨버전" 을 강조하면 C 의 단계형 흐름 후보가 자연스럽게 채택됨
- **결과**: 같은 도메인의 다른 화면 작업 시 같은 `brand.md` 가 적용돼 **시안 톤이 사이트 전체에 통일**된다. 매 화면마다 시안 톤이 흩어지지 않음. 단 같은 화면을 두 번 만드는 경우 비슷한 결과로 수렴하는 부작용이 있으므로, 사용자가 재작업 요청하면 위 **B-0 의 분기**(레이아웃 문제 → 회피 모드 / 리서치 문제 → brand stale_check 후 폐기·재생성)에 따라 처리

**원본 타겟 사이트의 역할**: 원본을 그대로 옮기지 **않는다**. **구조적 참고**로만 사용 — 어떤 정보가 들어가는지 (ID/PW/소셜/자동로그인/비번찾기 등), 어떤 컴포넌트가 필요한지, CTA·로고·헬프 링크의 통상적 위치 패턴. 원본의 컬러·타이포·여백·시각적 톤은 무시하고 KDS 베이스로부터 다시 출발한다.

구체 예시 (KT 로그인 화면 요청이라면):

- **베이스(개념적, 구현 안 함)**: KDS 표준 카드 + ID/PW 세로 나열 + accent-primary 컬러 1회 사용한 로그인 버튼 + 표준 typography + 충분한 여백
- **A (레이아웃 우선)**: 톤·UX 는 베이스 그대로, 레이아웃만 적극 변형 → 예: "필드를 카드 안에 그룹 vs 좌우 분할 hero 영역 추가 vs 헬프 정보 좌우 분리"
- **B (톤 우선)**: 레이아웃·UX 는 베이스 그대로, 톤만 적극 변형 → 예: "차분한 모노톤·넓은 여백 vs 표준 가독성 vs accent 컬러 + 큰 타이포 + 브랜드 이미지 강조"
- **C (UX·구조 우선)**: 톤·레이아웃은 베이스 그대로, UX 만 적극 변형 → 예: "ID+PW 일체형 vs 단계형(ID → PW 순차) vs 소셜 로그인 우선 + ID/PW 보조"

- 각 시안에 짧은 **컨셉 라벨**을 붙인다 (예: A="좌우 분할 hero", B="강조 컬러 + 큰 타이포", C="소셜 우선 단계형"). 컨셉 라벨은 figma.json `root.name` 에도 반영
- 모든 시안은 KDS 토큰·컴포넌트만 사용 (워크플로우 A 의 KDS 규칙 그대로 적용)
- 우선 축에서 충분히 차이 나지 않으면 (예: A 가 베이스와 레이아웃 차이가 미미하면) 다시 작업. 사용자가 비교하지 못하는 시안 3개는 의미 없음
- **반대로 변형 안 한 두 축까지 자기도 모르게 흔들면 안 됨** (예: A 가 레이아웃을 바꾸면서 톤까지 강한 accent 로 갈아치우면 B 와 구분이 흐려짐). 검수 단계에서 이걸 잡는다 (B-3 참고)

**B-3. 린트 + 검수 (각 시안마다)**
- 각 시안 저장 직후 `node kds/lint.js to-figma/<name>-<a|b|c>` 실행 → 0 error 까지 수정
- `kds-reviewer` 에이전트를 **세 시안 모두에 자동 호출**. 검수 요청 시 다음을 명시:
  - KDS 적용 적정성 (워크플로우 A 와 동일)
  - **차별화 축 분리 검증**: A 가 정말 레이아웃 차이만 가져왔는지(톤·UX 까지 바꿔놓진 않았는지), B/C 도 마찬가지로 자기 우선 축에만 변형이 집중됐는지
- 검수 이슈 처리는 **워크플로우 A 의 단계 2 규칙과 동일**: 치명·권고는 해당 시안 파일 안에서 자동 수정, 제안은 보고에만 언급. 사용자에게 묻지 않음
- 차별화 축이 흐릿하다고 검수가 지적하면 → 해당 시안 다시 작업 (재호출)

**B-4. 최종 보고**
- 만든 파일 3쌍 경로
- 타겟 분석 브리프 위치: `research/<slug>/brief.md`, 스크린샷 인덱스
- **시안 비교표** (필수, 행 구성 고정):

  | | A | B | C |
  |---|---|---|---|
  | 우선 축 | 레이아웃 | 톤 | UX·구조 |
  | 컨셉 라벨 | … | … | … |
  | 레이아웃 | **변형 ↑** | (A·C 와 유사) | (A·B 와 유사) |
  | 톤 | (B·C 와 유사) | **변형 ↑** | (A·B 와 유사) |
  | UX 흐름 | (B·C 와 유사) | (A·C 와 유사) | **변형 ↑** |
  | 사용한 KDS 컴포넌트 | … | … | … |

- 각 시안의 린트 결과 + 검수에서 자동 수정한 항목 + 미처리 제안
- **채택 질문은 하지 않음** (사용자 결정 2026-05-15). 보고만 마치고 사용자가 자율적으로 채택 결정. 채택 결정이 들어오면 그때 워크플로우 A 전환 처리. 미리 묻지 않음 — 보고가 길어지고 사용자가 답해야 하는 일감만 늘어남

**채택 후 워크플로우 A 전환 시 명명 처리**:
- 채택된 시안을 `<name>.html` / `<name>.figma.json` (또는 플로우면 `<name>/`) 로 **리네임 또는 복사**해서 워크플로우 A 의 원본으로 삼는다
- 채택되지 않은 두 시안은 `to-figma/_rejected/` 폴더로 이동 (보관용, 마음 바뀌면 복귀 가능)
- 그 이후 Figma 수정본은 워크플로우 A 규칙대로 `<name>-v2` 로 저장 → 명명 충돌 없음

### research/ 폴더 관리

**폴더 구조 — 도메인 단위 / 화면 단위 분리**:
```
research/
  brands/<domain>/                  ← 도메인 단위 브랜드 정보 (영구 보관, 같은 브랜드의 모든 화면 작업이 공유)
    brand.md                        — Voice/Tone, UX 모티프, 컬러 시그니처 의도, 비주얼·타이포 성향, 포지셔닝
    screenshots/                    — 메인·About·press kit 등 브랜드 리서치 시 캡처
  <slug>/                           ← 화면 단위 정보 (해당 화면 시안 작업 전용)
    brief.md                        — 레이아웃·정보 위계·컴포넌트·UX 흐름·UX 라이팅 톤
    screenshots/                    — 해당 화면 데스크탑·모바일 캡처
    tokens-observed.md              — 화면의 색·타이포 패턴 (KDS 치환 대상)
```

**원칙**:
- 시안 작업이 끝나도 `research/` 의 모든 항목은 **삭제하지 않는다**. 같은 브랜드의 다른 화면 작업이나 같은 화면 재요청 시 활용
- 도메인 판정은 **eTLD+1 단위 (서브도메인 통합)**. 예: `login.kt.com` 과 `shop.kt.com` 은 모두 `kt.com` 으로 묶임
- 같은 URL 재크롤은 사용자가 명시 요청 시에만 (예: "그 사이트 다시 분석해줘", "브랜드 리서치 다시"). brand stale 점검에서 신호 발견 시는 사용자에게 물어보고 진행

### 핵심 원칙
- **KDS 가 최우선이다.** 모든 시안은 KDS 토큰·컴포넌트·패턴 안에서만 디자인. 차별화 욕심으로 KDS 를 깨는 것은 어떤 경우에도 금지. 변형(레이아웃·톤·UX)도 KDS 안에서만 한다
- **URL의 컬러·타이포는 절대 그대로 쓰지 않는다.** 모두 KDS 토큰으로 치환. 가져오는 것은 화면의 정보 구조·UX 흐름과 브랜드 톤의 방향성뿐
- **같은 브랜드 = 통일된 톤.** `research/brands/<domain>/brand.md` 가 같은 도메인의 모든 화면 시안 후보의 근거가 된다. 화면마다 시안 톤이 흩어지지 않게 한다. 사용자가 명시적으로 "리서치 다시" / "다른 방향 시도" 라고 트리거하지 않는 한 brand 결론은 일관 유지
- **세 시안은 의미 있게 달라야 한다.** "테두리 두께만 다른 세 시안" 같은 차이로는 보고하지 않음. 사용자가 비교 후 선택할 수 있을 만큼 명확히 구분
- **차별화는 자기 우선 축에만.** A 가 레이아웃 변형하면서 톤까지 흔들거나, B 가 톤 바꾸면서 UX 까지 갈아치우면 안 됨. 우선 축 외 두 축은 베이스에 가깝게 유지
- **채택본 외 시안은 `to-figma/_rejected/` 에 보관.** 나중에 사용자가 다른 시안으로 마음 바뀌어도 즉시 복귀 가능

---


## 디테일 참고 — 분리된 sub-rule 파일

이 두 파일은 CLAUDE.md 에 풀로 두기엔 너무 길어 분리. 작업 중 의심/필요할 때만 lookup.

### `kds-rules/traps.md` — figma.json 함정 모음 (20개)

매 작업마다 다 읽지 말고, 작업 영역별로 관련 함정만 lookup. 함정 인덱스:

| # | 제목 | 발동 영역 |
|---|---|---|
| 1 | CSS margin 을 figma.json padding 으로 옮기지 말 것 | 형제 간격 |
| 2 | `<img>` 태그에 `data-kds-id` 직접 부여 (wrapper 만 박지 말 것) | 이미지 노드 |
| 3 | CSS `flex: 1` 자식은 figma.json `layoutGrow: 1` 명시 | 가로 정렬 |
| 4 | CSS `flex-wrap: wrap` 은 figma.json `layoutWrap: "WRAP"` 명시 | 줄바꿈 칩 |
| 5 | 그림자/블러 가진 자식 부모는 `clipsContent: false` | 그림자 잘림 (plugin 새 기본 false) |
| 6 | figma.json Spacer FRAME 은 HTML CSS 에 동시 반영 | spacer FRAME |
| 7 | 그라디언트 `angle` 은 CSS `linear-gradient` 와 동일 | LINEAR 그라디언트 |
| 8 | **TEXT 노드 width 명시 + `textAutoResize: "HEIGHT"` 박기** | **텍스트 줄바꿈 (자주 발생)** |
| 9 | `paragraphSpacing` 단락 분리는 `\n` 한 개 | 본문 텍스트 |
| 10 | 자식 폭 < 부모 inner 폭이면 `counterAxisAlign: "CENTER"` 명시 | 카드 중앙 |
| 11 | SVG `viewBox` ≠ 컨테이너 크기일 때 HTML stroke 두께 보정 | 아이콘 stroke |
| 12 | CSS gradient 와 Figma gradient 의 시작점·형태 차이 | RADIAL/ANGULAR/DIAMOND |
| 13 | Dark surface 위 `currentColor` SVG 는 Figma 에서 black 으로 들어옴 | 어두운 배경 아이콘 |
| 14 | 가로 flex 카드 그룹의 균일 높이 — `layoutAlign: "STRETCH"` | 카드 정렬 |
| 15 | 모든 시안 HTML 은 `html { scrollbar-gutter: stable }` 필수 | 스크롤바 보정 |
| 16 | plugin `createNodeFromSpec` 처리 순서 함정 (이미 회피 코드 들어있음) | plugin 손댈 때 |
| 17 | compare 합본 stale 이면 plugin "불러오기" 가 옛 spec 으로 import | 워크플로우 B |
| 18 | **figma.json layout 속성을 flat 키로 박지 말 것 — `layout: {}` 객체 의무** | **figma.json 작성 (자주 발생)** |
| 19 | **compare.figma.json 빈 스켈레톤 누락 → plugin "불러오기" 가 시안 1개만 받아감** | **워크플로우 B (자주 발생)** |
| 20 | **PowerShell `-Encoding UTF8` 가 BOM 박음 → JSON.parse 실패** | **Windows 일괄 치환** |
| 21 | **HORIZONTAL FRAME 의 `primaryAxisSizing: AUTO` + `counterAxisSizing: FIXED` + height 누락 → 카드가 0 높이로 렌더** | **카드·hero·이벤트 박스 (자주 발생)** |
| 22 | **FIXED height 카드 + 자식 TEXT `textAutoResize: HEIGHT` 가 가변 라인 수로 풀려서 카드 밖 overflow / 가로 row 안 형제 카드 stack 합 불균형 → 짧은 카드의 텍스트가 잘리거나 카드 밖으로 빠짐** | **카드 그리드·dashboard mini 카드·hero 영역 (자주 발생, 한글 두 줄 풀림 영향)** |

자세한 사례·예시 코드·회피 방법은 → **`kds-rules/traps.md`**

### `kds-rules/spec-and-bridge.md` — figma.json 스키마 + HTML 규칙 + 브릿지

이 sub-md 가 다루는 영역:
- figma.json 스키마 (Paint 타입 [SOLID/LINEAR/RADIAL/ANGULAR/DIAMOND/IMAGE], 단일 화면/플로우 구조)
- 플로우 요청 시 파일 구조 규칙
- HTML 작성 규칙 (인라인 `<svg>` 아이콘, `<img>` 이미지, elevation 그림자, 텍스트 케이스/데코레이션, chip 자연폭 컴포넌트)
- **화면 크기 규칙** (모바일 375 / 태블릿 1024 / PC 1920 + minHeight)
- 브릿지 서버 엔드포인트 (`/design`, `/export`, `/preview`, `/proxy` 등)
- 자동 인젝션 파이프라인 (`inject-svg`, `inject-images`, `fix-icon-placement`, `verify-spacers`, `build-compare`)

새 화면/컴포넌트 작성 시 figma.json 스펙·HTML 규칙·viewport 사이즈가 필요하면 → **`kds-rules/spec-and-bridge.md`**

### `kds-rules/bridge-debugging.md` — bridge-server 디버깅 노트

`http://localhost:3939/preview/` 가 느리거나 무한 로딩에 빠질 때만 lookup. 2026-05-15 세션 결과:
- 4 단계 원인 (IPv4-only listen / preview-list 동기 readdir / Node keepAlive 5s race / **SSE 좀비 누적 진짜 원인**) 분석표
- bridge-server.js 에 영구 반영된 fix 6 가지 (dual-bind, in-memory 캐시, keepAlive 65s, pagehide cleanup 등)
- 영구화된 진단 도구: `/diag` 엔드포인트 (`sseClients` 등), `BRIDGE_TRACE=1` 환경변수, `kill -USR1 <pid>` 토글, `netstat -ano | grep :3939` 신호 해석
- 핵심 교훈: **추측 fix 최대 2회 → 안 통하면 즉시 instrumentation 전환** (이 원칙은 메모리 [[feedback-two-hypothesis-fix-then-instrument]] 에도 저장)

서버가 정상 동작할 때는 lookup 불필요.
