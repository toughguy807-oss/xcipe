# Figma 동기화 규칙

Figma 관련 요청("피그마에서 가져와줘", "싱크 맞춰줘", "Figma 변경사항 반영" 등) 시 아래 절차를 따른다.

## 도구 우선순위

| 순위 | 도구 | 용도 | 비고 |
|:---:|------|------|------|
| 1 | **Figma MCP** | 노드 CRUD, Variables, 컴포넌트 | 권장. 공식 API |
| 2 | figma-cli | Variables 대량 import, eval 고급 기능 | MCP 불가 시 fallback |
| 3 | baseline v2 | `output/{프로젝트명}/.figma-sync/kds-baseline-v2.json` | 비교 기준 |
| 4 | changelog | `output/{프로젝트명}/.figma-sync/changelog.json` | 변경 이력 |

**figma-cli 경로**: `d:/tmp/figma-cli-poc`

## 폰트 규칙

- **기본 폰트**: baseline의 `font_family` 필드 참조 (KDS = `Pretendard`)
- **디스플레이 폰트**: baseline의 `font_family_display` 참조 (KDS = `kt flow`)
- **Inter 사용 금지**: figma-cli 기본값이 Inter이므로, 텍스트 생성 시 반드시 폰트 지정
- figma-cli 사용 시: `eval "await figma.loadFontAsync({family:'Pretendard',style:'Regular'})"` 선행

## Pull 절차 ("가져와줘")

### 1. 연결 확인

**MCP**: Figma MCP 도구 호출로 확인
**CLI fallback**:
```bash
cd d:/tmp/figma-cli-poc && node src/index.js var list
```

### 2. 토큰 읽기 + diff

**MCP**: `use_figma`로 Variables 전수 읽기
**CLI**: `node src/index.js export css`

baseline의 tokens와 비교 → CHANGED/ADDED/DELETED 분류

### 3. 노드 전수 읽기

baseline의 nodes에 있는 **모든** 노드 ID의 **실제 속성**을 읽는다.
- **MCP**: 노드 ID로 직접 조회
- **CLI**: `node src/index.js get {nodeId}`

**핵심 규칙**:
- **추측 금지**. 모든 노드를 실제로 읽어서 확인
- "삭제된 것으로 추정" 절대 금지 — 전수 검색으로 존재 여부 확인
- fill 색상은 **실제 hex 값**을 읽는다. 개수(fills:1)만 보지 않는다

### 3-A. 디자인 충실도 — 노드 속성 전수 추출 (필수)

`rules/figma-fidelity.md` 참조. Figma → HTML 정확 변환을 위해 **아래 속성을 누락 없이** 추출:

| 카테고리 | 필수 속성 |
|---------|----------|
| 박스 | `absoluteBoundingBox`, `relativeTransform`, `size` |
| 레이아웃 | `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, `paddingL/R/T/B`, `layoutGrids`, `constraints` |
| 스타일 | `fills[]`, `strokes[]`, `strokeWeight`, `strokeAlign`, `effects[]`, `blendMode`, `opacity` |
| 라운드 | `cornerRadius` (mixed 시 각 corner 개별) |
| 텍스트 | `characters`, `fontName`, `fontSize`, `fontWeight`, `lineHeightPx` 또는 `lineHeightPercent`, `letterSpacing`, `textCase`, `textDecoration`, `textAutoResize` |
| 컴포넌트 | `componentPropertyDefinitions` (Component Set), `componentPropertyReferences`, `overrides[]` |
| 바인딩 | `boundVariables` (모든 속성의 Variable 참조) |

**누락 시 품질 보증 불가**. 위 속성 중 하나라도 미추출이면 충실도 게이트 실패 처리.

### 3-B. 이미지·SVG 자산 자동 export (필수)

**모든 이미지·벡터 노드**는 자산 파일로 export해야 HTML에서 참조 가능.

| 노드 타입 | export 포맷 | 저장 위치 |
|---------|-----------|----------|
| `IMAGE` fill (래스터) | PNG 또는 JPG (@2x 권장) | `output/{프로젝트}/assets/images/{nodeId}.png` |
| `VECTOR`, `BOOLEAN_OPERATION` (단색) | **SVG** | `output/{프로젝트}/assets/icons/{name}.svg` |
| 복잡한 마스크·클리핑 조합 | PNG flatten | `assets/images/` |
| 아이콘 컴포넌트 인스턴스 | SVG | `assets/icons/` |

**MCP 기반 export** (권장):
```
mcp__figma__get_screenshot(nodeId: "...", format: "png", scale: 2)
mcp__figma__get_screenshot(nodeId: "...", format: "svg")
```

**CLI fallback**:
```bash
node src/index.js export {nodeId} --format=png --scale=2 -o assets/images/
```

HTML 생성 시 이 export된 파일 경로를 `<img src>` / `<use href>` / inline `<svg>`로 참조.

### 3-C. 섹션별 스크린샷 export (검증용 reference)

`publish-visual-verify` 스킬이 Vision LLM으로 "Figma 의도 vs HTML 결과"를 비교하려면 Figma 시안의 스크린샷이 필요.

**의무 export**:
- 페이지 전체 스크린샷 1장 — `assets/reference/{pageName}-full.png`
- 주요 섹션별 1장씩 (Hero, Nav, Cards, Footer 등) — `assets/reference/{sectionName}.png`
- 반응형 디자인이면 Mobile/Tablet/Desktop 각 1장 — `assets/reference/{pageName}-{device}.png`

**용도**: Phase 3 visual-verify 단계에서 Playwright 캡처와 픽셀 수준 비교는 안 되더라도 Vision LLM 채점의 reference 이미지로 사용.

### 4. 변경 리포트 + 변경률

```
변경률 = (CHANGED + ADDED + DELETED) / baseline.stats.total × 100
```

| 변경률 | 판단 | 처리 |
|--------|------|------|
| 0% | 변경 없음 | 종료 |
| 1-30% | 소규모 | 자동 반영 |
| 30-60% | 중규모 | 부분 자동 + 확인 |
| 60%+ | 대규모 | 재생성 권장 |

```
═══════════════════════════════════════
 Figma 변경 감지 리포트
═══════════════════════════════════════
 변경률: {n}% ({category})

 [토큰 변경] n건
   token-name: old → new

 [노드 변경] n건
   node-name (id): property: old → new

 [노드 추가] n건
   + node-name: type, size, color

 [노드 삭제] n건 (전수 검색 확인 완료)
   - node-name

═══════════════════════════════════════
 A) 전체 반영  B) 토큰만 반영  C) 리포트만
═══════════════════════════════════════
```

### 5. HTML 반영
사용자 확인 후 HTML/CSS 수정. 각 변경 건별로 정확하게 반영.
CSS 값은 **--kds-* CSS 변수**를 우선 사용. 하드코딩 최소화.

### 6. changelog 자동 기록
`.figma-sync/changelog.json`에 **자동** append:
```json
{
  "id": "SYNC-{다음 순번}",
  "timestamp": "{ISO-8601}",
  "type": "pull",
  "summary": "Pull — {변경률}% ({n}건 변경)",
  "change_rate": {변경률},
  "changes": [ { "target": "", "name": "", "action": "", "property": "", "from": "", "to": "" } ],
  "applied_to": ["{파일명}"],
  "errors": []
}
```

### 7. baseline 갱신
반영 완료된 토큰/노드 속성을 baseline에 업데이트. `last_synced_at` 갱신.

## Push 절차 ("피그마에 넣어줘")

### 1. 토큰 소스 탐색
`kds-baseline-v2.json` > `STYLE_*.json` > 사용자 지정 JSON

### 2. Variables 생성
**MCP 우선**. CLI는 dot(.)→slash(/) 변환 필수.

#### Variable 이름 제약 (Figma Plugin API 검증)
`figma.variables.createVariable()` 호출 시 **invalid variable name** 에러 예방:

| 규칙 | 변환 |
|------|------|
| `.` (점) | → `-` 로 치환 (일부 API 버전에서 reserved) |
| 공백·특수문자 | → `-` 또는 제거 |
| 숫자로 시작하는 segment | → `n` 접두 (예: `2xl` → `n2xl`, `0` → `n0`) |
| `/` (슬래시) | 그룹 구분자로 보존 |
| 빈 segment | → `unnamed` |

예시: `color/static.black` → `color/static-black`, `typography/body.Pretendard.16/fontSize` → `typography/body-Pretendard-n16/fontSize`

#### API 버전 호환 (setBoundVariableForPaint)
일부 Figma Desktop 버전에서 `figma.variables.setBoundVariableForPaint` 미존재. 아래 fallback 필수:

```js
if (typeof figma.variables.setBoundVariableForPaint === 'function') {
  paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
} else {
  // 수동 바인딩
  paint.boundVariables = { color: { type: 'VARIABLE_ALIAS', id: variable.id } };
}
```

`node.setBoundVariable(field, variable)` 도 동일. 존재 체크 + try/catch + fallback 대입 3중 방어.

#### dynamic-page 모드 제약
`manifest.documentAccess: "dynamic-page"` 일 때 **documentchange 이벤트 구독 전** `figma.loadAllPagesAsync()` 필수. 순서 위반 시 바인딩 throw.

```js
await figma.loadAllPagesAsync();
figma.on('documentchange', handler);
```

#### Variables 미지원 타입
- Shadow: Figma Variables는 COLOR/FLOAT/STRING/BOOLEAN만. Shadow·gradient 등 composite 불가
- Typography: composite 타입 미지원 → fontSize(FLOAT) · fontFamily(STRING) · fontWeight(FLOAT) 로 분리 생성
- 미지원 타입 노드는 `node.setPluginData('eluo_intentional', '1')` 로 마크하여 향후 검수에서 제외

### 3. baseline 갱신 + changelog 기록

## Push Transport 한계 (SYNC-009, 2026-04-20)

### 실패 사건 요약

실측 사고 케이스 (493 노드) push 시도에서 **35.1% 노드(173/493), 31.5% Fill(96/305) 만 생성** 후 실패. Push report는 `total:493, success:75, fail:0` 으로 보고됐으나 실제로는 418개 노드가 **silent drop**. 사용자가 "그림 그려진게 하나도 없다"고 지적하여 실체 확인.

### 근본 원인 (transport level)

1. **WebSocket 응답 버퍼 한계** — figma-cli-poc의 daemon ↔ plugin(ui.html) WebSocket은 수 KB 수준에서만 안정. 172KB PNG b64 전송 시 "fetch failed".
2. **청크 silent drop** — 25노드×20청크 전송 중 WebSocket 단절 발생. 단절된 청크의 자식 노드는 `globalThis.__htmlPushIdMap`에서 부모 ID를 찾지 못해 plugin 내부 try/catch로 에러가 삼켜짐. `fail:0` 은 "실패 0건"이 아니라 **"보고 자체 누락"**.
3. **설계 가정 오류** — figma-cli-poc는 소규모 eval/Variables용 PoC. 500노드급 대규모 push는 설계 범위 밖.

### 경로 선택 가이드 (노드 수 기준)

| 노드 수 | 권장 경로 | 비고 |
|---------|----------|------|
| ≤ 100 | figma-cli WebSocket (현행 PoC) | PoC 안정 범위. silent drop 탐지 필수 |
| 101 ~ 1000 | **Plugin 단독 + file input 경로 (Hardened Push)** | 아래 8조건 전수 준수 의무 |
| > 1000 | Plugin 단독 + 페이지 분할 + 배치 | 페이지당 ≤1000 으로 쪼갠 후 세션별 push |

### Hardened Push 설계 (100% 달성 조건)

사용자 요구 "100% 옮기고 100% 가지고온다"를 만족하려면 아래 8조건을 **전수** 충족해야 한다. 1건이라도 미달이면 100% 주장 금지.

| # | 조건 | 구현 |
|---|------|------|
| 1 | **Plugin 단독 실행** — daemon WebSocket을 입력 통로에서 제거 | ui.html에 `<input type="file">` + FileReader로 JSON 로드 |
| 2 | **청크 크기 ≤ 10** | 단순 frame은 20까지 허용 (효과·이미지 없는 경우) |
| 3 | **idMap clientStorage persist** | `figma.clientStorage.setAsync('pushIdMap_{sessionId}', idMap)` 청크마다 저장 |
| 4 | **청크 간 이벤트 루프 반환** | `await new Promise(r => setTimeout(r, 50))` |
| 5 | **에러 집계 명시화** | `{created, failed, skipped}` 분리 수집. `total = created + failed + skipped` 등식 검증 |
| 6 | **push 직후 실체 대조** | `getNodeByIdAsync` 전수 호출. 불일치 노드는 재시도 큐로 |
| 7 | **roundtrip pull 검증** | push 완료 후 Figma에서 재 pull → 속성 전수 대조 (`rules/figma-fidelity.md` 기준) |
| 8 | **시각 검증** | 섹션별 export + Vision LLM 비교. export 실패 시 완료 주장 금지 |

### Roundtrip 100% 검증 공식

```
push_success_rate  = (Figma에 실제 생성된 노드) / (입력 JSON 노드)
pull_fidelity_rate = (속성 전수 일치 노드)     / (Figma에 생성된 노드)
roundtrip_rate     = push_success_rate × pull_fidelity_rate

목표: roundtrip_rate ≥ 0.99   (실측 사고 케이스: 0.351 × ? = FAIL)
```

### 보고 규칙 (silent drop 차단)

| # | 규칙 |
|---|------|
| 1 | 보고서에 `created + failed + skipped = total` 등식 검증 필드 포함 |
| 2 | `fail:0` 단독 보고 금지 — 반드시 `getNodeByIdAsync` 실체 카운트 병기 |
| 3 | 시각 export 실패 시 "미검증" 표기 의무. "완료" 주장 금지 |

### 잘못된 대안 (쓰지 말 것)

| 오판 | 정정 |
|------|------|
| "Figma REST API로 노드 생성하면 된다" | **불가능**. REST는 읽기 전용. 노드 생성/수정은 Plugin API 한정 |
| "청크 크기만 줄이면 해결" | 부분 개선. idMap persist · 에러 집계 · transport 안정화가 선결 |
| "fail:0 이니 성공" | misleading. 반드시 `getNodeByIdAsync` 실체 대조 |
| "daemon WebSocket을 유지한 채 대규모 push" | transport 버퍼 한계로 172KB+ 구간 불안정. Plugin 단독 경로 필수 |

## CSS 토큰 표준화 규칙

KDS 프로젝트의 HTML에서 CSS 변수를 사용할 때:

1. **tokens.css 임포트 우선**: `d:/tmp/kds-tokens/kds-tokens/tokens.css`를 `<link>`로 임포트
2. **KDS 네이밍 사용**: `--kds-*` 변수명 사용 (예: `--kds-red-500`, `--kds-gray-900`)
3. **자체 변수 정의 최소화**: 프로젝트 고유 변수만 `:root`에 추가
4. **Dark 모드**: `[data-theme="dark"]` 블록이 tokens.css에 이미 포함
5. **Semantic 변수 사용**: primitive(`--kds-gray-900`) 대신 semantic(`--kds-text-primary`) 우선

```html
<!-- 권장 -->
<link rel="stylesheet" href="tokens.css">
<style>
  .btn-primary { background: var(--kds-fill-accent-primary); }
</style>

<!-- 비권장 -->
<style>
  :root { --color-primary: #E0282F; }  /* 하드코딩 */
</style>
```

## W3C DTCG 2025.10 토큰 스펙

외부 디자인 토큰 파일(Tokens Studio, Style Dictionary, Penpot 등)을 import할 때 준수 규칙. 2025-10-28 첫 안정 버전 (`Design Tokens Format Module 2025.10`) 기준.

### 파일 관용

| 확장자 | 의미 |
|--------|------|
| `.tokens` | DTCG 공식 권장 확장자 |
| `.tokens.json` | DTCG 공식 권장 확장자 (JSON 명시) |
| `.json` | 내용이 DTCG 구조이면 허용 |

미디어 타입: `application/design-tokens+json`

### 공식 토큰 타입 (13종)

| 타입 | 지원 |
|------|:---:|
| `color` | ✅ (string hex + object `{colorSpace, components, alpha}`) |
| `dimension` | ✅ |
| `fontFamily` | ✅ |
| `fontWeight` | ✅ (named alias: bold→700 등) |
| `typography` | ✅ (composite) |
| `shadow`, `gradient`, `border`, `transition` | ⚠️ 경고 후 스킵 |
| `duration`, `cubicBezier`, `number`, `strokeStyle` | ⚠️ 경고 후 스킵 |

### Color Object 포맷 (2025.10 신규)

`srgb`, `srgb-linear`만 자동 변환. 그 외(display-p3, oklch 등)는 경고 후 스킵 — 소스에서 srgb로 변환된 값 병기 권장.

```json
{
  "$value": { "colorSpace": "srgb", "components": [0.878, 0.157, 0.184], "alpha": 1 },
  "$type": "color"
}
```

### Alias 참조

`{path.to.token}` 형태. 2-hop 이상도 자동 해결 (최대 깊이 10). Unresolved alias는 경고 출력.

```json
{ "$value": "{color.base}", "$type": "color" }
```

### Resolver 모듈 대응

`{ sets: [...], modifiers: [...] }` 구조 감지 시:
- 기본 동작: 첫 번째 `set`만 로드 + 경고 출력
- 특정 세트 선택: `resolverSet: "dark"` 옵션 전달
- multi-dimensional theming은 아직 미지원 (향후 과제)

### 금지

| # | 금지 | 대안 |
|---|------|------|
| 1 | hex만 지원한다고 가정하고 color object 포맷 거부 | dtcgColorToHex() 경로 |
| 2 | alias를 그대로 문자열로 저장 | 2-pass resolver |
| 3 | 비-srgb 색공간을 strict error로 처리 | 경고 + 스킵 |

## 양방향 머지 전략 (2026-05-04 신설)

`/figma-pull` 과 `/figma-push` 가 동일 토큰/노드에 대해 **충돌**할 때의 결정 규칙. figma-pull Step 9 + figma-push Step 5 PR 훅으로 자동 PR이 양쪽에서 생성되면 머지 단계에서 반드시 본 절차를 따른다.

### 충돌 시나리오 매트릭스

| # | 시나리오 | 감지 방법 | 기본 결정 |
|---|----------|----------|----------|
| 1 | Pull 브랜치(`figma-sync/{TS}-pull`)와 Push 브랜치(`figma-sync/{TS}-push`)가 동일 토큰 변경 | 양 브랜치 diff에 동일 `--kds-*` 변수 등장 | **Figma 우선 (pull 채택)** — Figma는 디자이너 의도 source-of-truth |
| 2 | Pull 브랜치와 Push 브랜치가 동일 노드 속성 변경 | baseline.json 동일 nodeId 수정 | **수동 머지** — 디자이너 + 개발자 동기 컨펌 |
| 3 | Pull은 토큰만, Push는 코드만 (서로 다른 파일) | 변경 파일 집합 disjoint | **양쪽 자동 머지** (충돌 없음) |
| 4 | Pull 후 baseline 갱신 전에 Push가 같은 baseline 기준 실행 | `last_synced_at` 비교 | **Push 차단 → Pull 머지 후 재실행** (lost-update 방지) |
| 5 | 양쪽 모두 변경률 ≥60% (대규모) | 각 PR 본문 변경률 메타 | **둘 다 차단 → 디자이너+개발자 합의 후 단방향만 진행** |

### Source-of-Truth 원칙

| 자산 종류 | SoT | 충돌 시 |
|---------|-----|--------|
| 디자인 토큰 (color/spacing/typography/shadow) | **Figma** (디자이너 결정권) | pull 우선 |
| 컴포넌트 인스턴스 속성 (instance overrides) | **Figma** | pull 우선 |
| HTML/CSS 구현 코드 | **Repo** (개발자 결정권) | push 차단 (Figma는 시안만 보유) |
| Variables 메타데이터 (이름·그룹) | **Figma** | pull 우선, push는 신규만 |
| baseline.json | **Repo** (자동 생성) | 머지 후 재계산 |

### 머지 절차

1. **충돌 감지**: 양 브랜치 PR이 open 상태에서 GitHub `mergeable=false` 또는 `last_synced_at` 역전 감지
2. **시나리오 분류**: 위 매트릭스로 1~5 판정
3. **자동 결정 가능 (시나리오 1·3·4)**:
   - 시나리오 1: pull PR 먼저 머지 → push PR rebase + 충돌 토큰 제외 후 재 push
   - 시나리오 3: 둘 다 머지 (순서 무관)
   - 시나리오 4: push PR close + 사용자에게 "pull 머지 후 figma-push 재실행" 안내
4. **수동 머지 필요 (시나리오 2·5)**:
   - 두 PR 본문에 `⚠️ 충돌 머지 필요` 라벨 코멘트 자동 추가
   - 디자이너(Figma) + 개발자(Repo) 양측 컨펌 후 사람이 머지 결정
5. **머지 후 baseline 재계산**: 둘 다 머지된 경우 `kds-baseline-v2.json` 재생성 + changelog에 `merge` 타입 항목 추가

### changelog 머지 항목 포맷

```json
{
  "id": "MERGE-{다음 순번}",
  "timestamp": "{ISO-8601}",
  "type": "merge",
  "summary": "Pull(SYNC-XXX) + Push(SYNC-YYY) 머지 — 시나리오 {1-5}",
  "scenario": 1,
  "pull_id": "SYNC-XXX",
  "push_id": "SYNC-YYY",
  "resolution": "pull-priority|manual|both-applied|push-blocked",
  "resolved_by": "auto|{user-handle}",
  "conflicts": [ { "target": "token|node", "name": "...", "decision": "..." } ]
}
```

### 금지

| # | 금지 | 사유 |
|---|------|------|
| 1 | 충돌 무시하고 양쪽 force-merge | last-update 손실 (lost-update anti-pattern) |
| 2 | push가 pull baseline보다 오래된 버전 기준이면 그대로 진행 | baseline 시점 역전 → 실제 Figma 상태와 다른 토큰을 push |
| 3 | 시나리오 5(양쪽 ≥60%)에서 자동 머지 시도 | 대규모 충돌은 사람 판단 필수 |
| 4 | 머지 후 baseline 재생성 생략 | 다음 sync에서 동일 충돌 무한 반복 |
| 5 | merge 타입 changelog 누락 | 충돌 이력 추적 불가 |

## 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | 노드 삭제/변경을 추측으로 판단 | 회원가입 오판 사건 (SYNC-003) |
| 2 | fill 색상을 개수만으로 확인 | 실제 hex 값을 읽어야 (SYNC-003) |
| 3 | changelog 없이 HTML 수정 | 이력 추적 불가 |
| 4 | baseline 갱신 없이 완료 | 다음 Pull에서 동일 변경 반복 감지 |
| 5 | 폰트를 Inter로 생성 | baseline.font_family 참조 (SYNC-008) |
| 6 | dot(.) 키 그대로 figma-cli import | 파싱 오류 (SYNC-008) |
| 7 | CSS에 색상 하드코딩 | --kds-* 변수 사용 |
