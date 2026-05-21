# Figma Pull — Figma 변경사항을 코드로 가져오기

Figma에서 현재 Variables + 노드 구조를 읽어 baseline과 비교하고, 변경 리포트를 생성합니다.

## 전제조건

1. Figma MCP 인증 완료 (`/mcp` → figma → Authenticate)
2. baseline 존재: `output/{프로젝트명}/.figma-sync/kds-baseline-v2.json` 또는 `baseline.json`
3. 프로젝트 Figma 파일 URL 또는 fileKey

## 실행 절차

### Step 0: baseline 로드

```
output/{프로젝트명}/.figma-sync/kds-baseline-v2.json
```

v2가 없으면 `baseline.json` (v1) fallback.
둘 다 없으면 에러: "Push를 먼저 실행하세요."

### Step 1: Figma 현재 상태 읽기

> `lib/rules/figma-sync.md` 3단계(토큰·노드·속성·자산·스크린샷) + `lib/rules/figma-fidelity.md` 충실도 게이트 준수.

#### 1-1. 토큰 + 노드 트리 읽기

**방법 1 — Figma MCP (권장)**
```
use_figma: 파일의 모든 Variables 읽기
use_figma: 페이지별 노드 트리 읽기
```

**방법 2 — figma-cli (MCP 미연결 시 fallback)**
```bash
cd d:/tmp/figma-cli-poc
node src/index.js var list
node src/index.js find "*"
```

#### 1-2. 노드 속성 전수 추출 (3-A · 필수)

`lib/rules/figma-sync.md` 섹션 3-A 참조. 아래 7개 카테고리를 **누락 없이** 추출:

| 카테고리 | 필수 속성 |
|---------|----------|
| 박스 | `absoluteBoundingBox`, `relativeTransform`, `size` |
| 레이아웃 | `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, `paddingL/R/T/B`, `layoutGrids`, `constraints` |
| 스타일 | `fills[]`, `strokes[]`, `strokeWeight`, `strokeAlign`, `effects[]`, `blendMode`, `opacity` |
| 라운드 | `cornerRadius` (mixed 시 각 corner 개별) |
| 텍스트 | `characters`, `fontName`, `fontSize`, `fontWeight`, `lineHeightPx/Percent`, `letterSpacing`, `textCase`, `textDecoration`, `textAutoResize` |
| 컴포넌트 | `componentPropertyDefinitions` (Component Set), `componentPropertyReferences`, `overrides[]` |
| 바인딩 | `boundVariables` (모든 속성의 Variable 참조) |

**저장 위치**: `output/{프로젝트}/.figma-sync/nodes-full.json` — diff 계산 + publish 단계 입력으로 사용.

**누락 시 충실도 게이트 실패** (`publish-visual-verify` Phase 3.6 에서 F2 판정).

#### 1-3. 이미지·SVG 자산 자동 export (3-B · 필수)

`lib/rules/figma-sync.md` 섹션 3-B 참조.

| 노드 타입 | 포맷 | 저장 위치 |
|---------|-----|----------|
| `IMAGE` fill (래스터) | PNG @2x | `output/{프로젝트}/assets/images/{nodeId-or-name}.png` |
| `VECTOR`, `BOOLEAN_OPERATION` (단색) | SVG | `output/{프로젝트}/assets/icons/{name}.svg` |
| 복잡 마스크·클리핑 조합 | PNG flatten | `output/{프로젝트}/assets/images/` |
| 아이콘 컴포넌트 인스턴스 | SVG | `output/{프로젝트}/assets/icons/` |

**MCP 호출** (권장):
```
mcp__figma__get_screenshot(nodeId: "...", format: "png", scale: 2)
mcp__figma__get_screenshot(nodeId: "...", format: "svg")
```

**CLI fallback**:
```bash
node src/index.js export {nodeId} --format=png --scale=2 -o output/{프로젝트}/assets/images/
node src/index.js export {nodeId} --format=svg -o output/{프로젝트}/assets/icons/
```

**실패 시**: 경고 출력 후 계속 진행. `errors[]`에 nodeId 기록. `publish-markup` 시점에 placeholder 처리 + 사용자 안내.

#### 1-4. 섹션별 스크린샷 export (3-C · 필수)

`lib/rules/figma-sync.md` 섹션 3-C 참조. `publish-visual-verify` Phase 3.6 의 reference 이미지.

**의무 export**:
```
output/{프로젝트}/assets/reference/
├── {pageName}-full.png          # 페이지 전체 1장
├── {sectionName}.png             # 주요 섹션별 (Hero/Nav/Cards/Footer 등)
└── {pageName}-{device}.png       # Mobile/Tablet/Desktop (반응형 디자인 시)
```

**용도**: Phase 3.6에서 Playwright 캡처와 1:1 Vision diff. 미존재 시 Phase 3.6 SKIP 경고.

#### 1-5. export 결과 집계

```
═══════════════════════════════════
[Step 1 Export 결과]
═══════════════════════════════════
노드 속성 (3-A)        | {n}개 노드 × 7 카테고리 저장 → nodes-full.json
이미지 자산 (3-B)      | PNG {n}건, SVG {m}건  (errors {e}건)
Reference 스크린샷 (3-C) | {n}/{m} 목표 달성
───────────────────────────────────
충실도 게이트          | {PASS/WARN — 누락 상세}
═══════════════════════════════════
```

### Step 2: 토큰 diff 계산

baseline.tokens vs 현재 Figma Variables 비교:

| 비교 결과 | 의미 | 분류 |
|----------|------|------|
| 값 다름 | 디자이너가 변경 | CHANGED |
| baseline에만 존재 | 디자이너가 삭제 | DELETED |
| current에만 존재 | 디자이너가 추가 | ADDED |
| 값 동일 | 변경 없음 | 스킵 |

**중요**: 삭제 판정 전 반드시 전수 검색 재확인. 추측 금지.

### Step 3: 노드 구조 diff (있는 경우)

baseline.nodes vs 현재 노드 트리 비교:
- 노드 위치(x/y), 크기(w/h), 색상(fill), 폰트, cornerRadius 등

**각 노드의 실제 속성값을 읽어서 비교한다. 개수만 보지 않는다.**

### Step 4: 변경률 계산 + 자동 판단

```
변경률 = (CHANGED + ADDED + DELETED) / baseline.stats.total × 100
```

| 변경률 | 판단 | 처리 |
|--------|------|------|
| 0% | 변경 없음 | "Figma와 동기화 상태입니다." 출력 후 종료 |
| 1-30% | 소규모 변경 | diff 리포트 → 자동 반영 |
| 30-60% | 중규모 변경 | diff 리포트 → 부분 자동 + 사용자 확인 |
| 60%+ | 대규모 변경 | "구조가 크게 바뀌었습니다. 재생성을 권장합니다." |

### Step 5: 변경 리포트 출력

```
═══════════════════════════════════════
 Figma 변경 감지 리포트
═══════════════════════════════════════
 변경률: {n}% ({category})
 ──────────────────────────────────────

 [토큰 변경 {n}건]
   {token-name}: {old} → {new}

 [토큰 추가 {n}건]
   + {token-name}: {value}

 [토큰 삭제 {n}건]
   - {token-name}: {old-value}

 [노드 변경 {n}건]
   ~ {node-name} ({id}): {property}: {old} → {new}

 [노드 추가 {n}건]
   + {node-name}: {type}, {size}, {color}

 [노드 삭제 {n}건] (전수 검색 확인 완료)
   - {node-name} ({id})

═══════════════════════════════════════
 반영 옵션:
 A) 전체 반영 (토큰 + 구조)
 B) 토큰만 CSS Variables에 반영
 C) 리포트만 확인 (반영 안 함)
═══════════════════════════════════════
```

### Step 6: 코드 반영 (사용자 선택 시)

**토큰 변경 반영:**
- `tokens.css` (KDS CSS Variables) 업데이트
- HTML 내 인라인 스타일 중 토큰값 치환
- STYLE_*.json 갱신

**노드 변경 반영:**
- 추가된 노드 → HTML 요소 추가
- 삭제된 노드 → HTML 요소 제거
- 속성 변경 → CSS 속성 업데이트

### Step 7: changelog 자동 기록

`output/{프로젝트}/.figma-sync/scripts/sync-utils.js`의 `appendChangelog()`를 호출하여 자동 기록:

```bash
node -e "
import('./sync-utils.js').then(({appendChangelog}) => {
  appendChangelog({
    type: 'pull',
    summary: 'Figma Pull — N% (M건 변경)',
    change_rate: N,
    changes: [/* ... */],
    applied_to: ['kds-login.html'],
    errors: []
  });
});"
```

또는 Claude Code가 직접 JSON append:

```json
{
  "id": "SYNC-{다음 순번}",
  "timestamp": "{ISO-8601}",
  "type": "pull",
  "summary": "Figma Pull — {변경률}% ({CHANGED}건 변경, {ADDED}건 추가, {DELETED}건 삭제)",
  "change_rate": {변경률},
  "changes": [
    { "target": "{token|node}", "name": "{이름}", "action": "{changed|added|deleted}", "property": "{속성}", "from": "{이전값}", "to": "{새값}" }
  ],
  "applied_to": ["{반영된 파일 목록}"],
  "errors": []
}
```

### Step 8: baseline 갱신

반영 완료된 토큰/노드를 baseline에 업데이트:
- `last_synced_at` 갱신
- 변경된 토큰값 반영
- 추가/삭제된 토큰 반영
- 노드 정보 갱신

### Step 9: [선택] Git PR 자동 생성 (2026-05-04 신설)

**조건**: 프로젝트 디렉토리가 Git repo이고 (`git rev-parse --is-inside-work-tree` 성공) 변경률 ≥ 1%인 경우 사용자에게 옵션 제시.

```
═══════════════════════════════════
[Git PR 옵션]
═══════════════════════════════════
Git repo: {detected/none}
변경 파일: {n}건 ({파일 목록 미리보기})
브랜치 기준: {기본 브랜치 — main/master/develop 자동 감지}

A) 새 브랜치 생성 + 커밋 + PR 생성 (gh pr create)
B) 현재 브랜치에 커밋만 (PR 미생성)
C) 스킵 (사용자가 수동 처리)
═══════════════════════════════════
```

**A) 자동 PR 생성 절차**:

1. 브랜치 생성: `figma-sync/{YYYYMMDD-HHmm}-{변경률}pct`
   ```bash
   git checkout -b figma-sync/20260504-1430-12pct
   ```
2. 변경 파일 staging:
   ```bash
   git add output/{프로젝트}/.figma-sync/baseline.json
   git add output/{프로젝트}/.figma-sync/changelog.json
   git add {Step 6에서 반영된 파일 목록}
   ```
3. 커밋 (message는 changelog의 요약 사용):
   ```bash
   git commit -m "chore(figma-sync): {변경률}% — {CHANGED}건 변경, {ADDED}건 추가, {DELETED}건 삭제

   Source: Figma file {fileKey}
   SYNC ID: SYNC-{순번}
   Changes: {topN 변경 항목}

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   "
   ```
4. Push: `git push -u origin figma-sync/...`
5. PR 생성:
   ```bash
   gh pr create --title "Figma Sync: {변경률}% — {topN 변경 요약}" --body "$(cat <<'EOF'
   ## Figma Pull 동기화 결과

   - **변경률**: {n}%
   - **SYNC ID**: SYNC-{순번}
   - **소스**: Figma {fileName} ({fileKey})

   ### 변경 요약
   - 토큰 변경: {n}건
   - 토큰 추가: {n}건
   - 토큰 삭제: {n}건
   - 노드 변경: {n}건

   ### 반영 파일
   {파일 목록}

   ### 검토 포인트
   - [ ] 시각 회귀 (publish-visual-verify Phase 3.6)
   - [ ] 토큰 의도 정합 (의료/공공 등 도메인 특수성)
   - [ ] 모바일/태블릿 반응형

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

**금지**:
- 변경률 ≥ 60% 시 자동 PR 금지 → 사용자에게 "구조 재생성 권장" 안내 우선
- main/master 브랜치 직접 커밋 금지 (반드시 figma-sync/* 브랜치 생성)
- `--no-verify` 플래그 사용 금지 (pre-commit 훅 통과 의무)
- gh CLI 미설치 시 푸시까지만 실행 + 사용자에게 PR URL 수동 생성 안내

**B) 커밋만**:
- 위 1~3 단계만 실행 (push/PR 생략)

**Gate 9**: "Git PR: {생성됨/스킵}. URL: {PR_URL or N/A}. 마지막 변경 요약: {요약}"

## 금지 사항

| # | 금지 | 사유 |
|---|------|------|
| 1 | 노드 삭제를 추측으로 판단 | 회원가입 오판 사건 (SYNC-003) |
| 2 | fill 색상을 개수만으로 판단 | 실제 hex 값을 읽어서 비교 |
| 3 | changelog 없이 코드 수정 | 이력 추적 불가 |
| 4 | baseline 갱신 없이 완료 | 다음 Pull에서 동일 변경 재감지 |
| 5 | **3-A 속성 추출 생략** | publish-visual-verify Phase 3.6 F2 실패 유발 |
| 6 | **3-B 자산 export 생략** | HTML에서 이미지/아이콘 참조 불가 (F1) |
| 7 | **3-C reference 스크린샷 생략** | Phase 3.6 Vision diff 불가 → SKIP 경고 |

## figma-cli 경로

```
d:/tmp/figma-cli-poc
```

## 참조

- `lib/rules/figma-sync.md` — Pull 절차 3-A/3-B/3-C 정의
- `lib/rules/figma-fidelity.md` — Figma → HTML 속성·CSS 매핑
- `skills/publish-visual-verify` — Phase 3.6 충실도 게이트 (Pull 산출물 소비자)
- `skills/qa-debug` — Phase 5 충실도 실패 원인 추적 (F1/F2/F3/F4/F5)

$ARGUMENTS
