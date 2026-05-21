# KDS 디자인 시스템 화면 생성기

KT의 KDS(Korean Design System) 토큰을 사용해, 모바일 화면·플로우를 자동으로 만들고 Figma로 바로 가져갑니다.
화면을 수정하면 Figma ↔ Claude Code 사이에서 양방향으로 동기화됩니다.

---

## STEP 1. 설치하기 (최초 1회)

### 1-1. 필요한 것

| 항목 | 설명 | 필수 |
|------|------|------|
| **Claude Code** | Anthropic의 AI 코딩 도구 | 필수 |
| **Node.js** | 18 이상. 브릿지 서버 구동에 필요 | 필수 |
| **Figma 데스크톱 앱** | 플러그인 등록 시 필수 (웹 버전은 개발자 모드 플러그인 등록 불가) | 필수 |
| **Playwright MCP** | 외부 웹사이트 레퍼런스 크롤링 시 사용 | 선택 |

### 1-2. 프로젝트 폴더 복사

이 폴더를 다운받아 원하는 위치에 저장합니다.

### 1-3. 의존성 설치

프로젝트 폴더에서 터미널을 열고:

```
npm install
```

`chokidar`, `puppeteer` 가 설치됩니다.

### 1-4. Figma 플러그인 등록

이 프로젝트 전용 Figma 플러그인 `figma-change-tracker` 를 등록해야 Claude ↔ Figma 통신이 됩니다.

1. **Figma 데스크톱 앱** 열기
2. 우상단 메뉴 → `Plugins` → `Development` → `Import plugin from manifest...`
3. 프로젝트 폴더 안의 `figma-change-tracker/manifest.json` 선택
4. `Plugins` → `Development` → `KDS Design Bridge` 가 보이면 등록 완료

> **주의**: Figma 웹 버전에서는 개발자 모드 플러그인 등록이 안 됩니다. 반드시 데스크톱 앱을 사용하세요.

### 1-5. (선택) Playwright MCP 연결

외부 사이트(예: 토스, 쿠팡)를 분석해 디자인 레퍼런스로 활용하고 싶을 때만 필요합니다.
일반적인 화면 생성 작업에는 **불필요**합니다.

```
claude mcp add --transport stdio playwright npx -y @playwright/mcp@latest
```

---

## STEP 2. Claude Code에서 실행

프로젝트 폴더에서 `claude` 명령으로 Claude Code를 실행합니다.

세션 시작 시:
- 브릿지 서버가 **자동으로 기동**됩니다 (`http://localhost:3939`)
- 브라우저 프리뷰 페이지가 자동으로 열립니다 (`http://localhost:3939/preview`)
- 종료 시 브릿지 서버도 자동 종료됩니다

> 포트 3939가 이미 점유돼있으면 Claude가 먼저 알려주고 처리 방법을 묻습니다.

---

## STEP 3. 화면·플로우 만들기

자연어로 요청하면 됩니다.

### 단일 화면

```
"로그인 화면 만들어줘"
"마이페이지 화면 만들어줘"
"검색 결과 화면 만들어줘"
```

### 플로우 (여러 화면)

```
"회원가입 플로우 만들어줘 (이메일 입력 → 인증번호 → 비밀번호 설정 → 완료)"
"주문 결제 플로우 만들어줘"
```

### 컴포넌트 단위

```
"버튼 컴포넌트 정리해줘"
"바텀시트 디자인해줘"
```

생성되는 파일은 모두 **KDS 토큰**(컬러·간격·타이포·라운드)에서 유래한 값만 사용합니다.

---

## STEP 4. Figma로 가져오기

1. Figma 데스크톱 앱에서 빈 파일 또는 작업 중인 파일 열기
2. 메뉴 → `Plugins` → `Development` → `KDS Design Bridge` 실행
3. 플러그인 창에서 우상단 ● 표시가 **녹색**(연결됨)인지 확인
4. **`Claude에서 불러오기`** 버튼 클릭 → 최근 생성된 화면이 캔버스에 그려집니다

플로우(여러 화면)는 가로로 80px 간격을 두고 나란히 배치됩니다.

---

## STEP 5. Figma에서 수정 → Claude로 되돌리기 (선택)

Figma에서 컬러·텍스트·간격을 직접 손본 뒤 다시 Claude로 보낼 수 있습니다.

1. Figma에서 노드 수정
2. 플러그인의 **`Claude로 보내기`** 버튼 클릭
3. 변경 로그가 `from-figma/latest.json` 에 저장됨
4. Claude에 `"방금 Figma에서 수정한 거 반영해줘"` 라고 말하면:
   - 원본은 보존하고 `-v2` 파일로 새로 저장 (예: `login-v2.html`)
   - KDS 토큰 밖 값(직접 입력한 hex 등)은 가장 가까운 토큰으로 자동 치환
   - 치환 내역을 표 형식으로 보고

---

## 워크플로우

```
사용자 자연어 요청
  → Claude (KDS 토큰 + 컴포넌트 + UX 라이팅 참고)
  → to-figma/<name>.html + <name>.figma.json 생성
  → 자동 린트 (kds/lint.js, 토큰 위반 검사)
  → 자동 검수 (kds-reviewer, 시맨틱·접근성·UX)
  → Figma 플러그인으로 import (사용자 클릭)
  → Figma에서 수정
  → 플러그인으로 export
  → from-figma/latest.json
  → Claude가 -v2 로 반영
```

---

## 결과물 구조

```
프로젝트 폴더/
├── to-figma/                        ← Claude가 생성한 화면
│   ├── login.html                   ← 단일 화면
│   ├── login.figma.json
│   ├── login-flow/                  ← 플로우 (HTML은 화면별로 분리)
│   │   ├── 1-email.html
│   │   ├── 2-otp.html
│   │   └── 3-done.html
│   └── login-flow.figma.json        ← 플로우 figma.json (한 파일에 모든 화면)
│
├── from-figma/                      ← Figma에서 보낸 변경 로그
│   └── latest.json
│
├── research/                        ← (선택) 외부 사이트 리서치 결과
│   └── <slug>/
│       ├── brief.md
│       └── screenshots/
│
└── logs/
    └── bridge.log                   ← 브릿지 서버 로그
```

---

## 명령어

| 명령 | 설명 |
|------|------|
| `npm run bridge` | 브릿지 서버 수동 기동 (보통 자동 기동되므로 불필요) |
| `npm run lint:kds` | `to-figma/` 전체에 대해 KDS 토큰 위반 검사 |
| `node kds/lint.js to-figma/<파일>` | 단일 파일·폴더 린트 |

브라우저 프리뷰: <http://localhost:3939/preview>

---

## 참고

- **KDS 토큰만 사용합니다.** 임의의 hex·간격·타이포는 절대 들어가지 않습니다. 토큰에 딱 맞는 값이 없으면 Claude가 사용자에게 확인을 요청합니다.
- **원본은 항상 보존됩니다.** Figma에서 수정해 되돌아온 결과는 `-v2` 새 파일로 저장됩니다.
- **HTML 저장 시 자동 보정**: SVG 인젝션, 이미지 프록시화, 아이콘 위치 보정, Spacer 검증이 800ms 디바운스 후 자동 실행됩니다.
- **린트 결과는 투명하게 보고**됩니다. 어떤 값이 어떤 토큰으로 치환됐는지, 자동 치환이 불가한 값은 어떤 게 있는지 표로 알려줍니다.

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| 플러그인 우상단 ● 표시가 빨간색 | 브릿지 서버가 안 떠 있음. 터미널에서 `npm run bridge` 또는 Claude Code 재시작 |
| `Plugins → Development` 메뉴가 안 보임 | Figma 웹 버전 사용 중. **데스크톱 앱**으로 다시 시도 |
| 포트 3939가 이미 사용 중 | 다른 프로세스가 점유. Claude가 처리 방법을 안내 (기존 종료 vs 그대로 사용) |
| Figma에 import했더니 빈 박스만 보임 | Figma 플러그인 콘솔(`Plugins → Development → Open Console`) 확인. SVG/이미지 로드 실패 시 진단 메시지 출력 |
| 외부 이미지가 import 시 깨짐 | 정상. `inject-images.mjs` 가 외부 URL을 자동으로 `/proxy?url=...` 로 감싸므로 브릿지 서버가 떠있어야 합니다 |
| `npm install` 실패 | Node.js 18 이상인지 확인 (`node --version`) |
| 라이브 프리뷰가 새로고침 안 됨 | 브라우저 콘솔에서 SSE 연결 끊김 확인. 브릿지 서버 재기동 |

---

## 디렉토리 안내

| 폴더/파일 | 용도 |
|-----------|------|
| `bridge-server.js` | 로컬 HTTP 서버 (포트 3939) |
| `figma-change-tracker/` | Figma 플러그인 (`manifest.json`, `code.js`, `ui.html`) |
| `kds/tokens/` | KDS 토큰 정의 (color·spacing·radius·typography·elevation) |
| `kds/data/` | KDS 컴포넌트·패턴·UX 라이팅 자료 |
| `kds/lint.js` | KDS 토큰 위반 검증기 |
| `scripts/` | 자동 인젝션 파이프라인 (svg·image·icon-placement·spacer) |
| `.claude/agents/` | 에이전트 정의 (`kds-designer`, `kds-reviewer`, `kds-researcher`) |
| `to-figma/`, `from-figma/`, `logs/`, `research/` | 작업물·로그 (배포 시 비어있음) |
