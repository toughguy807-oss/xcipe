# Figma Export Playbook

SB HTML을 Figma 디자인 파일로 자동 변환하는 절차. **선택 단계** (Step 4) — 사용자가 Figma 변환 요청 시에만 수행.

## 트리거

다음 발화 감지 시 실행:
- "Figma로 보내줘 / 만들어줘 / export"
- "피그마 파일 / 디자인 파일 만들어"
- "/figma-push"

## 사전 조건

- Step 2(generate.js) 완료 — `output/{name}/{date}/{outputPrefix}.html` 존재
- Figma MCP 활성화 (mcp__figma__generate_figma_design, mcp__figma__use_figma)

## 실행 절차

### Step F1: HTML 변환

```bash
node .claude/skills/plan-sb/scripts/figma-prep.js output/{name}/{date}/{outputPrefix}.html
```

생성:
- `output/{name}/{date}/_figma/{outputPrefix}-figma.html` — Figma 캡처용 HTML
- `output/{name}/{date}/_figma/figma-meta.json` — 슬라이드 수·플래그·설정

변환 내용:
- 가로 flex 레이아웃 강제 (figma-export-override 스타일)
- pseudo-element(`::before`/`::after`) → 실제 DOM 변환 스크립트
- Figma capture.js 로드

### Step F2: 사용자 확인 — Figma 출력 위치

`AskUserQuestion`으로 한 번에 묻기:

1. **Output Mode**: newFile / existingFile / clipboard
2. (newFile일 때) **Plan**: ELUO / DC / 내부 / 외부공유

### Step F3: Figma 캡처 ID 발급

```
mcp__figma__generate_figma_design(outputMode, fileKey 또는 planKey, fileName)
→ captureId
```

### Step F4: 로컬 서버 + Chrome 캡처

서버 (프로젝트 루트, input/ 이미지 상대경로 해상):
```bash
cd <projectRoot>
python -m http.server <port>   # 또는 node -e "require('http').createServer(...)..."
```

Chrome 1920×1080 단일 윈도우 (Throttling 회피 + DPI 1 고정):
```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$id = "<captureId>"
$base = "http://localhost:<port>/output/<urlEncodedName>/<date>/_figma/<outputPrefix>-figma.html"
$endpoint = [System.Uri]::EscapeDataString("https://mcp.figma.com/mcp/capture/$id/submit")
& $chrome --window-size=1920,1080 --force-device-scale-factor=1 `
  --disable-background-timer-throttling `
  --disable-backgrounding-occluded-windows `
  --disable-renderer-backgrounding `
  --user-data-dir="$env:TEMP\figma-capture-profile" `
  "$base#figmacapture=$id&figmaendpoint=$endpoint&figmadelay=4000"
```

**중요**:
- `figmaselector` 미지정 → body 전체 1회 캡처 (8개 슬라이드가 자식 트리로 들어감)
- 슬라이드별 N회 캡처는 **금지** — Chrome 백그라운드 탭 throttling으로 5분 이상 소요됨
- `figmadelay=4000` — 이미지 로드 + DOMContentLoaded 변환 스크립트 완료 대기

### Step F5: 폴링 (5초 간격)

```
mcp__figma__generate_figma_design(captureId)
→ status: pending → completed
```

완료 응답에 fileKey 또는 nodeId 포함.

### Step F6: 후처리 (use_figma)

마스터 frame 안 8개 .slide 자식을 페이지 루트로 detach + 가로 정렬 + 리네임 + orphan 정리.

```javascript
// 1. 마스터 inspect (capture 응답의 nodeId 사용, 예: "32:2")
const master = await figma.getNodeByIdAsync(MASTER_ID);
// body 컨테이너 찾기 (master 또는 그 안의 첫 자식)
const body = master.children[0]; // "Body" 라는 이름의 wrapper
const slides = body.children.slice();

// 2. 슬라이드 타입 자동 추정 (data-slide-type 기반)
// figma-meta.json 또는 SB JSON의 frameType과 1:1 매칭
const slideTypes = ["Cover", "History", "Overview", ...]; // SB JSON 순서 그대로

const TARGET_W = 1920, GAP = 40;
const page = body.parent.parent; // 또는 figma.currentPage

for (let i = 0; i < slides.length; i++) {
  const s = slides[i];
  page.appendChild(s);
  if (s.width > 0 && Math.abs(s.width - TARGET_W) > 1) {
    s.rescale(TARGET_W / s.width);
  }
  s.x = i * (TARGET_W + GAP);
  s.y = 0;
  s.name = `Slide ${i + 1} - ${slideTypes[i] || ""}`;
}

// 3. 빈 마스터/Body 껍데기 제거
if (body.children.length === 0) body.remove();
if (master.children.length === 0) master.remove();

// 4. 페이지 루트 orphan 정리 (정상 슬라이드 ID와 일치하지 않는 frame 제거)
const validIds = new Set(slides.map(s => s.id));
for (const c of [...page.children]) {
  if (c.type === "FRAME" && !validIds.has(c.id) && c.children.length === 0) c.remove();
}
```

### Step F7: 검증

각 슬라이드:
- width = 1920, height = 1080 정확
- textCount > 0
- 이미지 슬라이드(design 등)는 imageCount > 0

미달 시 사용자에게 재캡처 안내.

## 출력 마커

```
[Figma Export]
  HTML: output/{name}/{date}/_figma/{outputPrefix}-figma.html
  Figma: https://www.figma.com/design/{fileKey}
  Slides: {n} (1920×1080)
  Detach + Position + Rename: 완료
```

## 정확도 체크리스트

| # | 항목 | 검증 |
|---|------|------|
| 1 | 슬라이드 크기 | 1920×1080 정확 (rescale 불필요) |
| 2 | 이미지 보존 | imageFills 보존 (data-slide-type=design) |
| 3 | Pseudo-element | ::after 강조선 / ::before 아이콘 변환됨 |
| 4 | 텍스트 트리 | 깊이 4+ 보존 |
| 5 | 가로 정렬 | x = i × 1960 |
| 6 | 명명 | "Slide N - {type}" |
| 7 | Orphan | 페이지 루트에 슬라이드 외 frame 0건 |

## 한계 및 알려진 이슈

- 폰트: Malgun Gothic 등 OS 폰트 의존. Figma 데스크톱(Win)에서는 자동 매핑되나 웹/Mac에서는 폴백 발생. Pretendard/Noto Sans KR 등 웹폰트 적용 시 더 안정적
- auto-layout: 캡처가 VERTICAL을 기본 적용. 헤더/푸터 등 가로 영역의 auto-layout 변환은 use_figma 추가 후처리로 가능 (선택)
- Figma 데스크톱이 실행 중이어야 capture.js가 정상 동작 (브라우저-Figma MCP 핸드셰이크 필요)
