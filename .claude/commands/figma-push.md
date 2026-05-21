# Figma Push — HTML 산출물 Figma 전송 (자연어 지원, MCP 기반)

`$ARGUMENTS` 를 분석해 의도를 파악하고 적절한 파이프라인으로 라우팅합니다. **Figma 공식 Remote MCP**(`mcp.figma.com/mcp`) 사용. 별도 plugin import 불필요.

> ⚠️ **2026-04-27 변경**: 기존 `figma-bridge` 커스텀 plugin 방식 폐기. Figma 공식 Remote MCP + `figma-prep.js` + F2~F7 플레이북으로 통합.
>
> **사용자 사전 작업** (1회): `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp` → `/mcp` → figma → Authenticate (OAuth).

## 트리거 (이 커맨드가 자동 매칭되는 한국어/영어 표현)

다음 표현이 사용자 발화에 등장하면 (`/figma-push` 직접 입력 + 자연어 모두) 이 커맨드로 라우팅:

- **피그마로 보내** / **피그마로 푸시** / **Figma 로 보내** / **Figma 에 올려**
- **피그마로 산출물 보내** / **결과물 피그마로** / **방금 만든 거 피그마로**
- **figma push** / **push to figma** / **send to figma**
- **시안 피그마로** / **SB 피그마로** / **HTML 을 피그마로**
- **피그마 업데이트** + (산출물|시안|HTML|SB|결과물|화면설계서) 동시 등장

위 표현 + HTML 경로(or "산출물"·"방금"·"최근" 등 자동탐색 키워드) 조합 시, Step 1 의 자동 탐색 로직 발동.

---

## 자연어 라우팅 (가장 먼저 수행)

`$ARGUMENTS` 에서 다음을 추출:

1. **HTML 경로** — `.html` 로 끝나거나 절대/상대 경로 패턴
2. **레이아웃 키워드** — `가로|horizontal|옆으로` → horizontal · `세로|vertical|아래로` → vertical · `격자|grid` → grid
3. **모드 키워드** — `한 페이지|single page|단일` → single body capture · `슬라이드별|페이지별|per-slide|frame 분리` → split-html-by-slide.js fallback
4. **너비 키워드** — `1440|1920|2560` 등 숫자 → window-size 조정
5. **페이지 이름** — `"이름"` 인용부 또는 `--page-prefix` → Figma 페이지명
6. **토큰 push 의도** — `토큰|variables|KDS|baseline` → 하단 "토큰 Push" 섹션으로

키워드 둘 이상 충돌 시: HTML 경로가 있으면 **HTML push 우선**. 토큰 키워드만 있으면 토큰 push.

---

## HTML Push 자동 실행 (자연어 매칭 시)

### Step 1: 입력 정규화 + 산출물 자동 탐색

#### 1-A. 사용자가 HTML 경로를 명시한 경우
- HTML 경로가 디렉토리면 `Glob {dir}/**/*.html` 로 가장 최근 수정 파일 선택 (사용자에게 알림)
- 경로가 `Desktop\` 등 한글/공백 포함이면 절대경로로 정규화

#### 1-B. "산출물" / "최근" / "방금" / 인자 없음 → 자동 탐색

```
"피그마로 산출물 보내줘"
"방금 만든 거 피그마로"
"최근 SB 피그마로"
/figma-push  (인자 없음)
```

**자동 탐색 우선순위** (Glob 으로 최신 mtime 순):
1. `output/**/*.html` — 현재 작업 디렉토리(cwd) 기준
2. `**/output/*/SB*.html` — SB(plan-sb) 산출물 우선
3. `output/**/screen-blueprint*.html`
4. `**/*.html` (cwd 직속, output 폴더 없을 때)

탐색 결과:
- **1건**: 자동 선택 → 사용자에게 "최근 산출물 `<파일명>` 을 푸시합니다" 안내 후 진행
- **2~3건**: 후보 나열 + 가장 최근 1건 선택 ("3건 후보 중 가장 최근 `<파일명>` 자동 선택")
- **4건 이상**: 후보 5건만 나열하고 "어느 파일을 푸시할까요?" 질문 (사용자 선택 대기)
- **0건**: "푸시할 HTML 산출물을 찾지 못했습니다. 경로를 명시해주세요" 안내

### Step 2: 환경 자동 점검

```bash
# 1) Figma MCP 등록 확인
claude mcp list | grep figma
# 등록 없으면: claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp

# 2) Figma OAuth 인증 확인
# /mcp → figma → Authenticate (인증 안 됐으면 사용자에게 OAuth 진행 안내)

# 3) Chrome 설치 확인 (figma-prep.js 캡처용)
which chrome || which "C:/Program Files/Google/Chrome/Application/chrome.exe"
```

- 별도 daemon 기동 불필요 (figma-bridge 폐기)
- Plugin import 불필요 (공식 Remote MCP 사용)

### Step 3: 표준 절차 — figma-prep.js + F2~F7 플레이북

> 상세 플레이북: `~/.claude/skills/plan-sb/references/figma-export.md`

```bash
# 3-1: Figma 캡처용 HTML 변환 (가로 flex + pseudo-element DOM화 + capture.js 주입)
node ~/.claude/skills/plan-sb/scripts/figma-prep.js <HTML 경로>
# → 같은 폴더에 *-figma.html 생성
```

**F2 — Output Mode 결정** (AskUserQuestion):
- `newFile` — 새 Figma 파일 생성
- `existingFile` — 기존 파일에 페이지 추가 (URL 필요)

**F3 — captureId 발급**:
```
mcp__figma__generate_figma_design({ html_path, mode, ... })
→ captureId 반환
```

**F4 — body 전체 1회 캡처**:
- 로컬서버 + Chrome `--window-size=1920,1080` 단일 윈도우
- 슬라이드별 N회 캡처 ❌ (Chrome throttling 5분 이상)
- body 전체 1회 캡처 ✅ (~30초)

**F5 — 폴링**: 5초 간격 → status `completed`

**F6 — `use_figma` 로 자식 detach + 가로 정렬**:
```
mcp__figma__use_figma({
  action: 'detach-children',
  selector: '.slide',
  layout: 'horizontal',
  rename: '{slide-type}-{N:02}'
})
```

**F7 — 정확도 7항목 검증**:
1. 슬라이드 N개 모두 별도 frame 으로 분리됐는지
2. 각 frame 너비 1920px 인지
3. 텍스트가 캡처 이미지가 아닌 native 텍스트로 detach 됐는지
4. 폰트 누락 없는지
5. 색상이 RGB 정확한지
6. 그림자·radius 보존됐는지
7. 페이지명/frame명 컨벤션 일치하는지

### Step 4: Fallback — split-html-by-slide.js (use_figma detach 실패 시)

`use_figma` 가 .slide 자식 detach 에 실패하거나, 사용자가 명시적으로 "슬라이드별로 별도 frame" 요청 시:

```bash
# 4-1: SB HTML을 슬라이드별 partial HTML로 분리
node ~/.claude/skills/plan-sb/scripts/split-html-by-slide.js <HTML 경로>
# → {basename}-slide001.html ~ slide011.html + manifest.json

# 4-2: 각 partial을 generate_figma_design 에 1회씩 push
for f in *-slide*.html; do
  mcp__figma__generate_figma_design({ html_path: f, ... })
done
# → 슬라이드 수만큼 별도 frame 생성
```

**금지 패턴** (사용자가 본 비효율 차단):
- ❌ 슬라이드별 N회 풀 HTML 캡처 — Chrome 백그라운드 탭 throttling 으로 5분 이상 소요
- ❌ 같은 풀 HTML을 frame 마다 다시 열기 — Read·MCP 호출 N배 낭비
- ✅ split-html-by-slide.js로 사전 분리 후 partial 단위 push

### Step 5: 실행 + 결과 포매팅

완료 시 다음 형식으로 채팅 출력:

```
═══════════════════════════════════════
[Figma Push] 완료
═══════════════════════════════════════
HTML       : {파일명} ({슬라이드수}장)
Figma 페이지: "{pageName}"
배치       : {layout} (single body / per-slide split)
성공률     : {avg}%  ({okCount}/{total} 슬라이드)
링크       : {figUrl}  ← 클릭 시 Figma 데스크탑으로 이동
{실패 시:}
실패       : N건 — {slide-id}: {error}
폰트 누락  : {fontName...}
═══════════════════════════════════════
```

`figUrl` 회수 실패 시 "Figma 데스크탑에서 해당 페이지 확인" 안내.

---

## 자연어 예시 → 실제 처리

| 사용자 입력 | 실제 실행 |
|------------|----------|
| `/figma-push C:\foo\slides.html` | figma-prep + use_figma detach (단일 캡처 → 슬라이드별 frame) |
| `/figma-push slides.html 슬라이드별로` | split-html-by-slide.js + per-partial push |
| `/figma-push slides.html 한 페이지에` | figma-prep + 단일 frame 으로 push (detach 안 함) |
| `/figma-push slides.html 1440 너비로` | window-size 1440 으로 figma-prep 캡처 |
| `/figma-push` (인자 없음) | 가장 최근 작업 디렉토리에서 `output/**/*.html` 검색, 후보 ≤ 3개면 1번 자동선택 |
| **`피그마로 산출물 보내줘`** | output 폴더 최신 HTML 자동 탐색 → 표준 절차 |
| **`방금 만든 SB 피그마로`** | 최신 `*SB*.html` / `*screen-blueprint*.html` 자동 탐색 |
| **`최근 시안 피그마로 보내`** | 최신 `output/**/*.html` 자동 탐색 |

---

## 휴먼 터치 최소화 — 자동 처리 vs 수동

| 항목 | 자동? | 비고 |
|------|------|------|
| MCP 등록 | **수동 1회성** | `claude mcp add` 명령 1회 |
| OAuth 인증 | **수동 1회성** | `/mcp` → figma → Authenticate |
| HTML 캡처용 변환 | **자동** | `figma-prep.js` 실행 |
| Figma 캡처 | **자동** | `mcp__figma__generate_figma_design` |
| 슬라이드별 frame 분리 | **자동** | `mcp__figma__use_figma` detach (또는 split-html fallback) |
| 결과 URL 출력 | **자동** | MCP 응답 파싱 → 채팅 |
| Figma 데스크탑 plugin import | **❌ 불필요** | Remote MCP 사용 (2026-04-27 폐기) |
| daemon 기동 | **❌ 불필요** | figma-bridge 폐기 (2026-04-27) |

---

## 토큰 Push (구버전 — `토큰` 키워드 매칭 시)

> HTML 가 아닌 KDS/STYLE JSON 을 Figma Variables 로 push.

### 전제

1. Figma MCP 인증 완료 (`/mcp` → figma → Authenticate)
2. 토큰 소스 중 하나:
   - `kds-baseline-v2.json`
   - `STYLE_*.json` (design-knowledge 출력)
   - 임의 토큰 JSON

### 절차 요약

1. **Step 0**: 토큰 소스 탐색 (`output/{프로젝트}/.figma-sync/kds-baseline-v2.json` → `STYLE_*.json` → 사용자 지정)
2. **Step 1**: 카테고리 분류 (color/spacing/radius/typo)
3. **Step 2**: Figma MCP `use_figma` 로 Variable Collection "KDS" 생성, 각 토큰을 Variable 로 (type 별)
4. **Step 3**: baseline 저장 (`output/{프로젝트}/.figma-sync/kds-baseline-v2.json`)
5. **Step 4**: changelog 기록 (`SYNC-{n}`)
6. **Step 5: Git PR 자동 훅 (2026-05-04 신설 · figma-pull Step 9 대칭)**

   토큰 push 완료 후 baseline JSON에 변경이 있고, 프로젝트가 Git repo면 자동 PR 생성 옵션 제시.

   **트리거 조건** (3 모두 만족):
   - `output/{프로젝트}/` 또는 cwd가 Git repo (`.git/` 존재)
   - baseline 변경률 ≥ 1% (token diff 비율)
   - baseline 변경률 < 60% (대량 덮어쓰기 방지)

   **3 옵션 제시 (AskUserQuestion)**:
   ```
   토큰 변경 감지: {변경률}% (color {n} / spacing {n} / typo {n})
   A) 자동 브랜치 + 커밋 + PR 생성 (`figma-sync/{YYYYMMDD-HHmm}-{변경률}pct-push`)
   B) 자동 브랜치 + 커밋만 (PR 수동)
   C) 변경만 적용 (Git 작업 없음)
   ```

   **A/B 선택 시 절차**:
   ```bash
   BRANCH="figma-sync/$(date +%Y%m%d-%H%M)-$(printf '%.0f' $RATE)pct-push"
   git checkout -b "$BRANCH"
   git add output/{프로젝트}/.figma-sync/kds-baseline-v2.json output/{프로젝트}/.figma-sync/changelog.md
   git commit -m "figma-push: KDS Variables 동기화 ({변경률}%)

   - color: {변경 토큰 N개}
   - spacing: {N개}
   - typo: {N개}

   SYNC-{n}"

   # A 옵션만:
   gh pr create --title "Figma Sync — KDS Variables ({변경률}%)" --body "..."
   ```

   **금지**:
   - main/master 브랜치에 직접 커밋 금지
   - `--force` push 금지
   - 변경률 60% 초과 시 자동 PR 차단 (대량 덮어쓰기 위험 — 사용자 명시 컨펌만)
   - figma-pull과 동일 브랜치 prefix 충돌 방지: `-push` 접미 필수

   **figma-pull Step 9 대칭성**: 양방향 sync에서 어느 쪽이 트리거됐는지 PR 제목·브랜치명으로 식별 가능. `-pull`/`-push` 접미로 구분.

### figma-cli fallback

```bash
cd d:/tmp/figma-cli-poc
# 토큰 키 dot(.) → slash(/) 변환 필수
node src/index.js tokens import <변환_JSON> -c "KDS"
```

> 주의: figma-cli 는 키에 `.` 이 있으면 import 실패. 반드시 `/` 로 변환.

### 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | dot(.) 키 그대로 import | figma-cli 파싱 오류 (SYNC-008 사건) |
| 2 | 기존 Variables 무확인 삭제 | 디자이너 작업 손실 가능 |
| 3 | changelog 없이 Push | 이력 추적 불가 |
| 4 | 폰트를 Inter 로 고정 | baseline.font_family 참조 |

---

## 참조

- `~/.claude/skills/plan-sb/scripts/figma-prep.js` — HTML 캡처용 변환기
- `~/.claude/skills/plan-sb/scripts/split-html-by-slide.js` — 슬라이드별 partial 분리 (fallback)
- `~/.claude/skills/plan-sb/references/figma-export.md` — F2~F7 플레이북 상세
- `lib/rules/figma-fidelity.md` — CSS↔Figma 매핑 (HTML push 변환 근거)
- `lib/rules/figma-sync.md` — Variable 이름 제약, API 호환 fallback
- `commands/figma-pull` — Pull 절차 (반대 방향)

$ARGUMENTS
