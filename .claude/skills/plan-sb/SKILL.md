---
name: plan-sb
description: >
  화면설계서(Screen Blueprint, SB) 자동 생성. JSON → HTML/PDF.
  트리거: "화면설계서 만들어줘", "SB 생성", "와이어프레임 설계서", "화면 명세서 작성",
  "스크린 설계", "UI 명세서", "화면 설계 해줘", "SB 파일 만들어줘".
  FN 연계/독립 모드 + 테마 + v1/v2 정규화 + 다중 프레임(Design/Description/MSG Case/Component Guide).
argument-hint: "[JSON 데이터 파일경로 또는 프로젝트 요구사항]"
---

## 응답 제약

- **MUST**: 출력은 이 SKILL.md에 정의된 섹션 구조와 순서를 따를 것
- **MUST**: 출력 마지막에 `[Self-Check] PASS / 미충족: {항목}` 마커 포함
- **MUST NOT**: 이 스킬의 산출물 범위 외 파일·코드·타 도메인 수정 금지
  - 허용 범위: 화면설계서(SB) JSON 데이터 생성·수정 + generate.js 실행
  - 예시 위반: plan-sb가 CSS 파일 직접 편집 / FN 명세서 수정 / REQ 내용 변경
- **MUST NOT**: 산출물 외 설명·추천·코멘트 추가 금지
- **MUST NOT**: 선행 산출물 미존재 시 추측 금지 → 사용자에게 확인
- **MUST**: 판단이 불확실할 때 즉시 사용자에게 질문. 추측 후 진행하면 전체 재작업 유발. "모르면 물어본다"가 "알아서 한다"보다 항상 낫다

**범위 이탈 감지 시 즉시 중단 후 아래 형식으로 리포트**:
```
[범위 이탈 감지] 요청 작업: {작업 내용}
→ 이 스킬(plan-sb) 허용 범위 외 작업입니다.
→ 해당 작업은 {적합한 스킬명} 스킬에서 수행하십시오.
```

---

## 페르소나

시니어 웹 기획자. JSON 데이터를 입력받아 화면 와이어프레임·Description·MSG Case·컴포넌트 가이드를 포함한 HTML/PDF 화면설계서를 생성한다.

## 실행 흐름 요약

| 단계 | 담당 | 설명 |
|------|------|------|
| Step 0 | plan-sb | 입력 감지 (JSON/이미지/FN 스캔) + 참조 사이트 방문(선택) |
| **Step 0.5** | **plan-sb** | **기획 확정 게이트 — 변경 범위·화면 표현 방식을 사용자 확인 후 진행** |
| Step 1 | plan-sb | JSON 구성 (자동/대화형) |
| **Step 1.3 (선택)** | **plan-sb** | **5종 옵션 탐색 — Mode A + `--explore` 플래그 시. ux-philosophies.md 22종 카탈로그 참조 (claude-wireframe 흡수, 2026-05-12)** |
| **Step 1.5** | **sb-wf-design** | **wireframe[] UX 강화 (generate.js 실행 전 필수)** |
| **Step 1.7** | **plan-sb** | **화면 표현 방식 결정 — Mode A(HTML 목업) 기본 / wireframe[] 단독은 한정** |
| Step 2 | plan-sb | generate.js → HTML/PDF 생성 |
| Step 3 | plan-sb | Self-Check + PM DA |
| **Step 4 (선택)** | **plan-sb** | **Figma Export — 사용자 요청 시 push (§ Figma Export 섹션 참조). figma-bridge(권장) / MCP 캡처 두 경로 지원** |

> `sb-wf-design` 에이전트는 planning-orchestrator가 자동 호출합니다. SKILL.md 단독 실행 시에도 Step 1 완료 후 수행합니다.

### 단독 패키지 환경의 Step 1.5 우회 경로 (2026-04-27 추가)

dist 단독 배포 환경(planning-orchestrator 미경유) 또는 sb-wf-design.md 미동봉 환경에서는 LLM이 직접 아래 체크리스트를 수행한다:

| # | 체크 항목 | 통과 기준 |
|---|----------|----------|
| 1 | header 위치 | wireframe[0]이 header인지 |
| 2 | group 자식 | 모든 group이 children 1개 이상 (빈 group 금지) |
| 3 | label 비어있음 | 모든 element에 label 존재 (빈 label 0건) |
| 4 | marker 일치 | descriptions[].marker 수 ≡ wireframe[].marker 수 |
| 5 | height 합계 | 990px ±50px 범위, 모든 영역 height 명시 |
| 6 | label 콘텐츠 분리 | label에 상품명·가격·브랜드명 등 실 콘텐츠 없음 (구조만) |
| 7 | 영역 다양성 | text 나열만으로 UI 표현 금지 — button/input/card/nav 적절히 |
| 8 | role/layout 정의 | popup/modal은 group.layout=popup + role 명시 |

**출력 마커**: `[Step 1.5 단독] wireframe 검토 완료 — Pass {n}/8`
8건 중 1건이라도 Fail 시 wireframe[] 보강 후 재검토.

## 실행 모드

| 모드 | 조건 | 동작 |
|------|------|------|
| **연계 모드** | `output/{serviceName}/*/FN_*.md` 존재 | FN 기반 screens 자동 구성, fnRef 매핑, 추적성 유지 |
| **독립 모드** | FN 미존재, 프롬프트/이미지/URL 입력 | 프롬프트 기반 직접 구성, fnRef 생략, ID 역참조 없음 |

**연계 모드 권장**: 파이프라인(QST→REQ→FN→SB)을 거친 연계 실행이 독립 실행보다 **더 정확하고 완결성 높은 산출물**을 생성합니다.
- 연계: FN의 검증기준·AC가 Description에 자동 반영, ID 추적 체인 유지, 누락 화면 0건
- 독립: 프롬프트 해석에 의존하여 기능 누락·범위 불일치 위험. 빠른 프로토타이핑에 적합

**모드 판정 출력**: `[실행 모드] 연계 (FN {n}건) / 독립 (프롬프트 기반)`

## Step 0-Init: 첫 실행 자동 안내 (단독 패키지 환경, 2026-04-27 추가)

dist 단독 패키지로 첫 실행 시(input/ + output/ + 기존 JSON 모두 비어있을 때), 사용자에게 자동 안내한다.

```
[plan-sb 단독 패키지에 오신 것을 환영합니다]
어떤 작업을 도와드릴까요?

A) 신규 화면 설계 (Mode A: HTML 목업 → SB)
   → 화면 콘셉트 알려주세요. 마커 영역 표시한 mockup HTML을 만들어드립니다.

B) 운영 수정 (Mode B: 현행 사이트 캡쳐 + 변경 마커)
   → 현행 사이트 URL과 변경 범위 알려주세요. visit.js로 자동 캡쳐합니다.

C) 기존 SB JSON 수정 (input/*.json 발견)
   → 어느 화면을 어떻게 수정할지 알려주세요.

D) PDF/PPT 포맷 참고로 새로 작성
   → input/에 PDF 넣고 알려주세요. 포맷 분석 → 테마 자동 생성.
```

선택 직후 Step 0.5 기획 확정 게이트로 진행. 사용자가 안내 없이 바로 JSON 던지면 자동 모드.

## Mode 자동 추천 가이드 (2026-04-27 추가, 2026-04-27 자동 분류 강화)

사용자 발화·입력 자원에서 자동 분류 → 사용자 확인 생략 (조건 명확 시):

### 자동 결정 규칙 (우선순위 순)

| 우선순위 | 조건 | 자동 결정 | 사용자 확인 |
|---------|------|----------|-----------|
| 1 | URL 또는 도메인 포함 | **Mode B 자동** + visit.js 자동 트리거 | 생략 (마커 출력만) |
| 2 | input/*.png 등 현행 캡쳐 존재 | **Mode B 자동** | 생략 (마커 출력만) |
| 3 | 키워드 "수정/변경/운영/현행/추가/as-is/to-be" + 캡쳐 없음 | **Mode B 강제** + visit.js 트리거 또는 URL 1회 질의 | URL 미제공 시만 |
| 4 | 키워드 "신규/새로/만들어/구축" + 캡쳐 없음 | **Mode A 자동** (HTML 목업 신규 작성) | 생략 (마커 출력만) |
| 5 | **모호 — 키워드 충돌, 리뉴얼/개편/혼합 의미, 신규+운영 키워드 동시 등장** | **추정 모드 자동 진행** + 진행 중 변경 가이드 안내 | **묻되 자동 진행** (응답 없으면 추정 모드 그대로) |

### 분류 로직 (의사 코드)

```
hasUrl = 사용자 발화에 http/https/도메인 패턴 발견
hasCapture = input/*.{png,jpg,jpeg} 또는 input/screenshot.png 존재
isOps = "수정|변경|운영|현행|추가|as-is|to-be" 매칭
isNew = "신규|새로|만들어|구축" 매칭
isMixed = "리뉴얼|개편|참고하되 새로|일부 변경" 매칭 또는 (isOps && isNew)

if (hasUrl) → Mode B 자동, visit.js 실행
elif (hasCapture) → Mode B 자동
elif (isOps && !hasCapture) → Mode B 강제 + URL 1회 질의
elif (isNew && !hasCapture) → Mode A 자동
elif (isMixed) → Mode C 추정 자동 진행 + 변경 가이드 출력
else → Mode A 추정 자동 진행 + 변경 가이드 출력 (가장 보수적 기본값)
```

**자동 결정 시 출력 마커 (명확 케이스)**:
```
[모드 자동 결정] Mode {A/B} ({근거: URL제공 / 캡쳐존재 / 키워드+캡쳐없음}) — 사용자 확인 생략
```

**모호 케이스 — 묻되 자동 진행**:
```
[모드 자동 추정 — 모호] Mode {A/B/C} 추정 ({근거})
> 자동 진행합니다. 다른 모드를 원하시면 아래 한 줄을 입력하세요:
>   - "Mode A로" → HTML 목업 신규 작성
>   - "Mode B로" → 현행 캡쳐 + 마커 오버레이
>   - "Mode C로" → 혼합 (현행 일부 + 신규 일부)
> (응답 없으면 추정 모드 그대로 진행)
```

**중요**: 모호 케이스에서도 **사용자 응답을 기다리지 않고 즉시 다음 Step 진행**한다. 사용자가 도중에 "Mode X로"를 입력하면 그 즉시 모드 전환 후 영향받는 산출물 재생성 (이미 완료된 비영향 산출물은 재사용).

**사용자 거부 시**: 위 마커 출력 후 사용자가 "다른 모드로" 또는 "Mode X로"라고 말하면 해당 모드로 전환.

## Step 0-Init: 사전 환경 점검 (전체 진입 게이트, 2초 이내)

SB 스킬 트리거 즉시 — 사용자 첫 메시지 또는 SB 작성 시작 직전 — `preflight.js`를 1회 실행하여 환경을 빠르게 진단한다.

```bash
node .claude/skills/plan-sb/scripts/preflight.js --json
```

### 검사 항목 (5개, 각 1.5초 timeout)

| # | 항목 | 통과 조건 | 실패 시 영향 |
|---|------|---------|-----------|
| 1 | node-version | Node 18+ | 전체 실행 불가 |
| 2 | skill-md | SKILL.md 존재 + ≥1KB | 플러그인 미설치 / 잘못된 폴더 |
| 3 | playwright-pkg | node_modules/playwright 존재 또는 글로벌 require 가능 | Mode B(visit.js) 불가 |
| 4 | chromium-binary | ms-playwright 캐시에 chromium 폴더 존재 | Mode B 캡쳐 불가 |
| 5 | visit-js | scripts/visit.js syntax OK | 자동 캡쳐 불가 |

### 처리 정책

- **exit 0** → 모든 체크 통과 → 정상 진입
- **exit 2** → 1건 이상 FAIL → JSON 결과의 `guide`를 사용자에게 즉시 표시하고 사용자 응답 대기
- **응답 시간 5초 초과** → 환경 자체가 비정상 → "플러그인 정상 로드 안 된 가능성. 배포 폴더 안에서 claude를 실행했는지 확인" 안내

### 사용자에게 보여줄 출력 형식

```
[plan-sb 환경 점검 — N ms]
  ✓ node-version       node v20.x
  ✗ chromium-binary    Chromium 바이너리 없음
     → 해결: cd .claude/skills/plan-sb && npx playwright install chromium
  ...

다음 중 선택해 주세요:
  A) 위 가이드대로 설치 후 재시작
  B) 신규 SB(HTML 목업)만 만든다 — Mode A로 진행 (Chromium 불필요)
  C) 캡쳐 이미지를 input/screenshot.png 로 직접 제공
```

이 출력을 보내고 사용자 응답을 받기 전까지 추가 작업 진행 금지.

## 실행 실패 vs 설치 진행 — 응답 정책

| 상황 | 신호 (visit.js exit code) | AI 응답 |
|------|------|---------|
| **설치 진행 중 (정상)** | "Chromium 자동 설치 중...", "playwright npm 패키지 자동 설치 중..." 로그 | "설치 진행 중입니다. 1~2분 소요 예상" 안내 후 대기 |
| **설치 실패** | exit code **2** (`[SETUP_FAIL]`) | preflight guide 출력 + 사용자 응답 대기 |
| **실행 실패 (LAUNCH/NAVIGATE)** | exit code **3** (`[LAUNCH_FAIL]` / `[NAVIGATE_FAIL]`) | **즉시 해결책 출력** (아래 형식) — 사용자 선택지 3개 안에 |

### 실행 실패 시 응답 (10초 이내)

```
[현행 분석 실패 — {원인}]
빠른 해결 (선택):
  A) {1번 해결책 — 가장 빠름}
  B) {2번 해결책 — 차선}
  C) Mode A로 전환 (HTML 목업) → "Mode A로" 입력

→ 응답이 없어도 30초 후 C로 자동 전환 (대기시간 최소화)
```

### 핵심 원칙

- **설치 진행 중**: 자동 진행. 사용자 대기 안내만.
- **설치 실패 + 실행 실패**: 묻고 추정 진행 금지. 단, **30초 응답 없으면 Mode A 자동 전환**으로 막힘 방지.
- **타임아웃 정책**: chromium 기동 10s / 페이지 로드 15s / 전체 60s.

## Step 0-Pre: visit.js 셋업 게이트 (Mode B 필수)

Mode B/C로 진입 + URL 제공 시 **visit.js 실행 결과를 반드시 검증**하고, 실패 시 추정 진행을 차단한다.

### 게이트 절차

| 단계 | 동작 | 통과 조건 |
|-----|------|---------|
| 1 | `node scripts/visit.js {URL}` 실행 (스킬 내부에서 Bash 호출) | exit code = 0 |
| 2 | exit code 2(`SETUP_FAIL`) → 셋업 실패 | playwright/chromium 미설치 또는 사내망 차단 |
| 3 | `input/screenshot.png` 존재 + 크기 > 10KB | 정상 캡쳐 |
| 4 | `input/structure.json` 존재 + parseable | 구조 추출 성공 |

### 실패 시 출력 (사용자 안내) — 추정 SB 작성 절대 금지

```
[현행 분석 실패] visit.js {원인} — Mode B 진행 차단
사용 가능한 옵션:
  1) Playwright 설치 환경 보강:
     cd .claude/skills/plan-sb
     npm install playwright
     npx playwright install chromium
  2) 사내망 차단 시 IT팀 요청:
     - npm registry 접근
     - storage.googleapis.com 도메인 허용
  3) 자동 분석 우회 — 현행 사이트 캡쳐를 직접 input/screenshot.png 로 제공
     (Mode B 자동 트리거됨)
  4) Mode A 전환 — "Mode A로" 입력하면 HTML 목업 신규 작성으로 진행

→ 위 4개 중 하나가 충족될 때까지 SB JSON 생성·작성 대기 (추정 진행 금지)
```

### 금지 사항

- visit.js 실패 후 "사이트 구조를 추정해서 SB 작성" 절대 금지
- exit code 0이 아니면 후속 Step 진입 차단
- screenshot.png가 0byte/누락이면 "현행 캡쳐 누락" ERROR로 판정 (verify.js 8건 결함 #1과 동일 게이트)

## Step 0: 입력 감지

### 현행 사이트 분석 (운영 모드 필수)

운영 수정 요청 시 현행 사이트를 **반드시 먼저 분석**한다.

```bash
node .claude/skills/plan-sb/scripts/visit.js {URL}
```
- 결과: `input/screenshot.png` + `input/structure.json` → AI가 uiImagePath로 바로 참조 가능
- Chromium 미설치 시 자동 설치
- **반드시 프로젝트 루트에서 실행** (scripts 폴더에서 실행 금지)

### output 폴더 구조

```
output/{serviceName}/{YYYYMMDD}/
├── {outputPrefix}.html          ← 전달용
├── {outputPrefix}.pdf           ← 전달용
└── _ref/                        ← 참조 추적 (전달 불필요)
    └── sources.json             ← 어떤 input을 참조했는지 자동 기록
```

`sources.json`은 generate.js가 자동 생성. input/ 폴더의 모든 파일과 각 screen의 uiImagePath 매핑을 기록.

**분석 절차**:
1. visit.js로 스크린샷 + 구조 추출
2. screenshot.png를 Read(Vision)로 열어 **현행 레이아웃 파악** (섹션 구분, 배너 위치, GNB 구조, 카드 배치)
3. structure.json에서 GNB 메뉴명, 헤딩 구조, CTA 위치 확인
4. 수정 대상 영역을 **현행 기준으로 특정** → wireframe에 반영

**출력 마커**: `[현행 분석] {URL} → GNB {n}개 / 섹션 {n}개 / 수정 대상: {영역}`

### PDF/PPT 포맷 참고 (포맷 파일 제공 시)

사용자가 기존 화면설계서 PDF/PPT를 포맷 참고용으로 제공하면 아래를 분석한다.

**PDF 읽기 방법** (2단계 검증):

**Step A: 구조 파악** — Read(pdf, pages)로 텍스트 추출
```
Read(file_path, pages: "1-5")   ← 최대 20페이지/요청
```
- 슬라이드 수, 테이블 헤더, 마커 번호, 필드명 등 **구조 정보** 추출
- 체크리스트 항목 중 텍스트로 확인 가능한 것을 먼저 대조

**Step B: 시각 검증** — 구조만으로 불확실한 부분을 Vision으로 확인
```bash
node scripts/pdf-capture.js "{PDF절대경로}" input/
```
- 색상 바, 마커 스타일, 레이아웃 배치, 폰트 크기 등 **시각 요소**는 이미지로 확인
- Step A에서 확인된 페이지만 선택적으로 Vision 분석 (전 페이지 불필요)

**정확성 판정 기준**: Step A 텍스트와 Step B 시각이 **모두 체크리스트와 일치**해야 "분석 완료". 텍스트만 읽고 "분석 완료"는 허용 안 됨 — 시각 요소(색상, 배치)를 최소 1페이지 이상 Vision으로 교차 확인해야 함.

> **금지**: `node -e` 인라인 원라이너로 PDF를 열지 않는다.

**분석 대상** (체크리스트 — 전 항목 1:1 대조 필수):
- [ ] 표지 구성 (로고, 프로젝트명, 버전, 일자)
- [ ] 변경이력 테이블 형식
- [ ] 디바이더 스타일 (배경색, 타이틀 형식)
- [ ] Assignment Detail 테이블 형식
- [ ] Interface List 테이블 형식
- [ ] Design 슬라이드 헤더 (컬러 바 유무, 메타 테이블 유무)
- [ ] Description 영역 형식 (마커 스타일, before/after 배치)
- [ ] 푸터 형식
- [ ] End of Document 형식

**적용 규칙**:
- 분석 결과를 `theme`, `project` 필드에 반영 (로고 경로, 색상, 회사명 등)
- 장표 순서가 다르면 screens[] 순서를 포맷에 맞춤
- Description 넘버링이 다르면 marker 형식 조정
- **포맷 파일의 콘텐츠(텍스트/이미지)는 참고하지 않음** — 구조·스타일만 추출
- **체크리스트 전 항목을 현재 template.js와 대조** → 불일치 항목을 **한 번에 전부 수정** 후 생성
- 생성 후 참조 PDF와 1:1 비교 확인

**금지**: "포맷 분석 완료"라고 말하면서 실제로는 대충 본 것. 분석했으면 위 체크리스트를 출력해야 한다.

**출력 마커**: `[포맷 참고] {파일명} → 장표 {n}종 / 헤더: {스타일} / Description: {형식}`

### 입력 감지

스킬 실행 시 아래 순서로 입력을 감지한다.

| 검색 대상 | 경로 패턴 | 발견 시 | 미발견 시 |
|-----------|----------|---------|----------|
| JSON 데이터 | `data/*.json`, `input/*.json` | 자동 모드 | 대화형 수집 모드 |
| FN 산출물 | `output/{serviceName}/*/FN_*.md` | screens 자동 구성 | — |
| 이미지 | `input/*.{png,jpg,jpeg,gif,webp}` | uiImagePath 자동 매핑 + 선택적 Vision 분석 | wireframe 표시 |
| **PDF/PPT 포맷** | `input/*.{pdf,ppt,pptx}` | 포맷 분석 → 테마 JSON 자동 생성 (§ PDF/PPT 포맷 참고 절차) | default.json 테마 사용 |

**PDF/PPT 제공 방식별 처리**:
| 제공 방식 | 처리 |
|----------|------|
| 로컬 파일 (`input/` 내 존재) | Read 도구로 직접 분석 |
| URL 링크 | WebFetch로 다운로드 → `input/`에 저장 → Read로 분석 |

분석 완료 후 → `themes/{프로젝트코드}.json` 자동 생성 → generate.js에 적용

**모드 판정 출력**: `[입력 감지] JSON: {n건/없음} | 이미지: {n건/없음} | FN: {n건/없음} | 포맷: {n건/없음} → {자동/대화형} 모드`

### 사용자 진입 게이트 — Mode 자동 추정 + visit.js 자동 트리거 (2026-04-27 자동 분류 강화)

**운영 SB 작성 요청 키워드 감지 시 (수정/변경/추가/리뉴얼/운영) — 아래 절차 강제 실행**:

| Step | 조건 | 자동 동작 | 사용자 확인 |
|------|------|----------|------------|
| 1 | 사용자가 URL 제공 | **즉시 visit.js 자동 실행** — `node scripts/visit.js {URL}`. Mode B 자동 결정 | 생략 |
| 2 | 캡쳐 이미지(input/*.png) 발견 (URL 없음) | **Mode B 자동 결정** (이미 자료 있음) | 생략 |
| 3 | 운영 키워드 + URL/캡쳐 모두 없음 | 사용자에게 1회 질의: "현행 사이트 URL 또는 캡쳐 이미지 주세요" | 필수 |
| 4 | 신규 키워드 + 캡쳐 없음 | **Mode A 자동 결정** (HTML 목업 신규 작성) | 생략 |
| 5 | 키워드 충돌·모호 (리뉴얼/개편/신규+운영 동시 등) | **추정 모드 자동 진행** (Mode C 우선, 단서 부족 시 Mode A) + 변경 가이드 안내 | **묻되 자동 진행** |

**자동 결정 시 출력 (명확)**:
```
[모드 자동 결정] Mode {A/B} — {근거: URL제공 / 캡쳐존재 / 신규키워드}
→ 다른 모드 원하시면 "Mode {A/B/C}로" 라고 알려주세요. (없으면 자동 진행)
```

**모호 케이스 출력 (Step 5 — 묻되 자동 진행)**:
```
[모드 자동 추정 — 모호] Mode {A/B/C} 추정 — {근거: 키워드 충돌 / 리뉴얼 의미}
→ 자동 진행합니다. 변경 원하시면:
   "Mode A로" (목업) / "Mode B로" (현행 마커) / "Mode C로" (혼합)
   (응답 없으면 추정 모드 유지)
```

→ Step 0.5 진입 (자동 결정 시는 모드 칸 채워진 상태로). **사용자 응답 대기 금지** — 즉시 다음 Step 진행.

### Step 0.5: 기획 확정 게이트 (JSON 생성 전 필수)

리서치·분석 완료 후, **JSON 구성(Step 1)에 진입하기 전** 아래 항목을 사용자에게 확인받는다.

| 사용자 확인 | 설명 | 예시 |
|------------|------|------|
| **변경 범위** | 어떤 화면의 어떤 영역을 어떻게 바꿀 것인지 | "추천 요금제 영역을 카드형에서 캐러셀로 변경하고 필터 추가" |
| **화면 표현 방식** | HTML 목업 / 현행 이미지 + 마커 / 혼합 중 선택 | "변경 후 모습을 보여주세요" / "지금 화면에 표시만 해주세요" |

| 스킬 자체 판단 (묻지 않음) | 판단 기준 |
|---------------------------|----------|
| 마커(설명 포인트) 수 | 변경 범위에 따라 필요한 만큼 자동 결정 |
| MSG Case 포함 여부 | 기능 특성상 빈 상태·에러·로딩이 필요하면 자동 포함 |
| 파일 구성 방식 | 기존 데이터 유무에 따라 자동 판단 (추가 / 신규) |

**금지**: 이 확인 없이 바로 JSON을 생성하면 범위 초과·기능 임의 추가가 발생한다. 기술 구현 수준의 질문(JSON 구조, 배열 수, 파일 분리 여부 등)을 사용자에게 묻지 않는다(pm-direction.md 참조).

**출력 마커**: `[기획 확정] 범위: {요약} | 모드: {A/B/C}`

### 화면 표현 모드 분기

기획의도를 확인한 후 아래 3가지 모드 중 하나를 결정한다.

| 모드 | 조건 | 좌측 패널 (60%) | 설명 |
|------|------|-----------------|------|
| **Mode A: HTML 목업** | 신규 구축 / 변경 후 모습을 보여줘야 할 때 | AI가 HTML 목업 생성 → Playwright 스크린샷 → uiImagePath | 변경 후 UI를 실제처럼 보여줌. PC/MO 동일 방식 |
| **Mode B: 현행 이미지 + 마커** | 운영 수정 / 현행 이미지 위에 변경 지점만 표시할 때 | 현행 캡쳐 이미지 + 빨간 마커 번호 오버레이 | 변경 전 이미지 기준으로 "여기가 바뀝니다" 표시. Description에 수정 전/후 기재 |
| **Mode C: 현행 이미지 참고 + HTML 목업** | 현행 구조를 참고하되 변경 후를 보여줘야 할 때 | 현행 캡쳐를 분석하여 레이아웃 구조 파악 → 변경 후 HTML 목업 생성 | 현행 이미지는 input/ 참고용, 산출물에는 변경 후 목업 |

### 변경 케이스별 모드 선택 매트릭스 (2026-05-12 신설 — Critical, 2026-05-12 정정)

**LLM은 사용자 변경 요청 발화에서 케이스를 자동 분류하고 권장 모드를 즉시 적용해야 한다.** **모든 시각 표현은 Mode A(HTML 목업+스크린샷)로 통일**. wireframe[]은 사실상 deprecated.

| 변경 케이스 | 발화 키워드 예시 | Slide 구성 | 권장 모드 |
|---|---|---|---|
| **신규 영역만 추가** | "○○ 영역 추가", "○○ 배너 추가" | **2 slide** (영역 표시 + 상세 화면설계) | S1: Mode B (캡쳐+overlay 위치만) + S2: **Mode A (HTML 목업+스크린샷)** |
| **요소/문구만 변경** | "문구 수정", "텍스트 변경", "라벨 수정" | **1 slide** (영역 표시 + before/after) | Mode B (캡쳐 + overlay + items[].before/after) |
| **단순 컴포넌트 신규** (팝업/바텀시트/모달/토스트 등) | "팝업 추가", "토스트 추가", "바텀시트" | **1 slide** | **Mode A (HTML 목업+스크린샷)** (overlay 없이 단독 캡쳐) |
| **신규 화면 전체 구축** | "회원가입 화면", "예약 페이지", "신규 페이지" | **다수 slide** | **Mode A (HTML 목업+스크린샷)** 화면당 1 slide |
| **레이아웃 변경 (구조 재배치)** | "재배치", "그리드 변경", "순서 변경" | **2 slide** (before/after) | S1: Mode B (현행+마킹) + S2: **Mode A (변경 후 목업)** |
| **현행 일부 + 신규 일부 (리뉴얼)** | "리뉴얼", "개편", "일부 변경" | **2 slide** | Mode C (현행 참고 + 변경 후 Mode A 목업) |

**Mode A 단일 표준 원칙 (2026-05-12 정정)**:
- **모든 시각 표현은 Mode A**가 기본값. 단순 컴포넌트(팝업/모달/바텀시트)도 wireframe[]이 아닌 HTML 목업 + 스크린샷으로 표현
- wireframe[] JSON 직접 작성이 빨라 보여도 그 결과는 고객 전달 불가 품질 → 효율 추구로 wireframe[] 선택 금지 (anti-rationalization R5)
- **wireframe[] 한정 사용** (deprecated 수준): 시연용 단기 프로토타이핑(고객 전달 X) + 시간 압박 케이스만. 정식 산출물은 Mode A로 전환 의무

**자동 출력 마커 (Critical)**:
```
[케이스 분류] {변경 케이스} → Slide 구성: {N slide} / 권장 모드: Mode {A/B/C}
[모드 선택 근거] {요소 수}/{컨테이너 타입}/{변경 범위} → Mode A (단일 표준)
```

**위반 시 자동 게이트**:
- Self-Check #39가 Slide의 mode 선택을 검증하여 룰 위반 시 FAIL
- 정식 산출물에서 wireframe[] 사용 시 무조건 ERROR (단기 프로토타이핑 명시 선언 없을 시)

**중요 규칙**:
- **Mode A가 기본값** — wireframe[] 박스 렌더링은 구조만 전달하고 실제 UI 형태를 보여주지 못한다. **HTML 목업을 직접 퍼블리싱 → 스크린샷이 기본 방식**이다. wireframe[]은 매우 단순한 구조(팝업, 바텀시트 등)에만 한정 사용
- **현행 캡쳐 = 참고 자료(input/)** — 산출물의 uiImagePath에 현행 캡쳐를 그대로 넣지 않는다 (Mode B 제외)
- Mode A/C에서 HTML 목업 생성 시: 마커 번호를 HTML 내에 CSS absolute로 직접 배치 → overlay 좌표 추정 불필요
- Mode B에서만 uiImagePath에 현행 이미지 사용 + overlay 좌표 지정
- **PC와 MO는 동일 모드를 사용** — PC는 목업이고 MO는 wireframe[] 같은 혼재 금지

### HTML 목업 작성 7대 룰 (2026-04-27 추가 — 격리 테스트 결함 학습)

mockup HTML 작성 시 아래 7대 룰 위반 0건 필수:

| # | 룰 | 위반 시 결과 |
|---|---|------|
| 1 | **mark-area는 변경 영역만 정확히 감싼다** | 히어로~신제품 끝까지 통째로 감싸지 말고 "신제품 출시" 카드만 감싸기. 통째 감싸면 어디가 변경인지 알 수 없음 |
| 2 | **각 마커는 자기 영역 좌상단 -12px 절대 위치** | 카드 상단 작게 배치 → 식별 어려움. `position:absolute; top:-12px; left:-12px` 통일 |
| 3 | **모바일 가로 스크롤 영역에 마커 배치 금지** | overflow에 의해 잘림 (마커 3, 5 가려짐 사례). 세로 스택으로 변경 또는 마커를 스크롤 영역 외부에 배치 |
| 4 | **mark-area는 콘텐츠 width를 정확히 따라간다** | wrapper 폭(380px)을 넘는 콘텐츠를 mark-area로 감싸지 말 것 → 점선이 카드 절반에서 끊어짐 |
| 5 | **마커 번호는 변경 영역 시각 순서 (위→아래, 좌→우)** | 임의 번호 부여 금지. wireframe과 description marker 1:1 일치 |
| 6 | **mark-area 중첩 금지** | 부모 mark-area 안에 자식 mark-area 두지 말 것 — 점선 이중으로 보임. 분리하여 형제 관계로 |
| 7 | **마커는 zindex:10 이상 + box-shadow 필수** | 콘텐츠에 가려지지 않도록. 카드 배경색이 흰색이면 마커가 묻힘 → shadow로 분리 |

### HTML 목업 마커+점선 스타일 (Mode A/C 필수)

HTML 목업에 마커를 배치할 때 아래 CSS를 반드시 포함한다. 넘버링(빨간 원)과 점선 테두리를 함께 표시해야 변경 영역이 명확히 구분된다.

```css
/* 마커 넘버링 (빨간 원) */
.marker { position:absolute; width:28px; height:28px; border-radius:50%;
  background:#e4002b; color:#fff; font-size:13px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.3); }

/* 변경 영역 점선 테두리 */
.mark-area { border:2px dashed #e4002b; border-radius:6px;
  position:relative; padding:4px; }
```

**적용 규칙**:
- 변경 대상 요소를 `mark-area` 클래스로 감싼다
- `.marker`는 `mark-area` 안에 CSS absolute로 좌상단(-12px, -12px)에 배치
- MO는 마커 크기를 24px로 축소 (`.marker { width:24px; height:24px; font-size:11px; }`)

**목업 캡쳐 명령**:
```bash
node scripts/mockup-capture.js input/mockup-pc.html input/ --name=recommend-new
node scripts/mockup-capture.js input/mockup-mo.html input/ --mobile-only --name=recommend-new --full-page
```

### 캡쳐 출처 분류 (이미지 입력 시 필수)

이미지 입력 감지 시 아래 기준으로 출처를 분류한다.

| 출처 | 판별 기준 | 콘텐츠 처리 |
|------|----------|------------|
| **타겟 사이트 캡쳐** (운영 수정) | 타겟 URL 도메인과 일치 / 사용자 "현행 사이트" 언급 | 콘텐츠 보존 — 텍스트·상품명·가격 그대로 유지, 수정 지시만 반영 |
| **레퍼런스 사이트 캡쳐** (리뉴얼) | 타겟과 다른 도메인 / 사용자 "참고", "레퍼런스" 언급 | 레이아웃·패턴만 참조 — 텍스트·상품명·가격은 타겟에서 별도 수집 |
| **판별 불가** | 도메인 불명·사용자 언급 없음 | 사용자에게 1회 확인: "이 이미지는 수정 대상 사이트인가요, 참고 사이트인가요?" |

**출력 마커**: `[캡쳐 출처] 타겟/레퍼런스/미분류 → {처리 방식}`

**MUST NOT**: 레퍼런스 캡쳐의 텍스트(상품명, 가격, 카피)를 타겟 산출물에 그대로 사용 금지

### 기존 SB JSON 재사용 분기

`input/*.json`이 기존 SB 산출물인 경우 아래 분기를 따른다.

| 판별 기준 | 처리 방식 |
|-----------|----------|
| `"$schema"` 필드 존재 | v2 → 직접 사용 |
| `"assignment"` 필드 존재 | v1 → `lib/schema.js normalizeV1()` 자동 정규화 |
| 미인식 포맷 | 필수 필드(`project`, `screens[]`)만 추출해 최소 스키마 생성 |

**기존 JSON 수정 모드 (MUST)**:
1. 기존 JSON 발견 시 **전체 재생성 금지** — wireframe[], descriptions[], msgCases[]만 수정·보강
2. 사용자 지시가 "N번 스크린 수정"이면 해당 스크린만 수정, 나머지 screens[] 보존
3. project, history, overview, theme 등 메타데이터는 사용자가 명시적으로 요청한 경우만 수정
4. 수정 전 기존 JSON을 `input/{원본파일명}.backup.json`으로 백업

### 삽입 위치 맥락 자동화

사용자가 "이 부분에 추가", "배너 아래에" 등 위치를 지시할 때 자동으로 맥락을 파악한다.

| 사용자 표현 | 삽입 위치 판단 | JSON 반영 |
|------------|--------------|----------|
| "맨 위에 추가" | header 바로 아래 | wireframe[1] (header 다음) |
| "배너 아래에" | banner 타입 요소 다음 | banner 요소 인덱스 + 1 |
| "푸터 위에" | 마지막 요소 앞 | wireframe[length-1] 앞 |
| "N번 마커 영역에" | descriptions[N] 위치 | marker N에 해당하는 wireframe 요소 |
| "이미지에서 보라색 배너 부분" | Vision 분석으로 pixel 위치 특정 | 해당 영역의 wireframe 요소 |

**출력 마커**: `[삽입 위치] {위치 설명} → wireframe[{인덱스}] 뒤`

## Step 1.3 (선택): 5종 옵션 탐색 — claude-wireframe 흡수

**기본 OFF.** 사용자가 `--explore` 플래그 또는 "옵션 N개 보여줘 / UX 옵션 / 와이어 옵션 / 5종 탐색" 등 명시 요청 시에만 동작.

### 트리거 조건

- Mode A (HTML 목업 신규 작성) **AND**
- 사용자 명시 요청: `--explore`, "옵션 5개", "옵션 탐색", "UX 옵션", "wireframe options"
- 기본 호출(플래그 없음) → 본 Step 건너뛰기

### 입력

- 화면 콘셉트 (1~3줄)
- (선택) optimization goal: conversions / drop-off / time-on-page / discoverability
- (선택) DKB references 매칭 결과 (dkb-search 통과 시)

### 처리

`references/ux-philosophies.md`의 22종 UX 철학 카탈로그에서 4개 선택:

1. **Option 1 (Safe)**: design-context 또는 기존 사이트 패턴 확장
2. **Option 2~5**: 22종 중 서로 다른 철학 4개 (Option 1과 동일 계열 금지)
3. optimization goal이 명시되면 §2 Optimization Goal Lens로 후보 축소

각 옵션을 **Mode A HTML 목업**으로 출력 (`input/mockups/opt-N-{view}.html`). wireframe[] JSON은 더 이상 사용하지 않는다 (Line 420 deprecated 정책 일관).

### 출력

```
[Step 1.3 옵션 탐색] 5종 Mode A 목업 생성 완료
  Option 1: Safe (기존 패턴 확장)              → mockups/opt-1-{view}.html
  Option 2: {UX 철학명}                        → mockups/opt-2-{view}.html
  Option 3: {UX 철학명}                        → mockups/opt-3-{view}.html
  Option 4: {UX 철학명}                        → mockups/opt-4-{view}.html
  Option 5: {UX 철학명}                        → mockups/opt-5-{view}.html

추천: Option {N} — {1줄 근거}

→ 1개 선택해주세요 (응답: "Option N으로", 또는 미응답 시 30초 후 추천 자동 선택)
```

### 다음 단계

- 사용자가 1개 선택 → 해당 HTML 목업을 Step 1.7 Mode A 입력(`uiImagePath` 캡처 원본)으로 사용 → Step 1.5(sb-wf-design)로 진입
- 30초 미응답 → 추천 옵션 자동 선택 → Step 1.5 진입
- 사용자가 "다 별로" → Option 2~5 다른 철학 조합으로 재생성 (1회)

### 산출물 정책 무영향 보장

- 본 Step은 **Mode A 목업 옵션 탐색 1단계**로, schema.json / generate.js / scripts 무변경
- 선택된 목업은 mockup-capture로 PNG화 후 `uiImagePath` 자동 주입 — 기존 Mode A 흐름 그대로
- Step 1.3 건너뛴 호출은 기존 흐름과 100% 동일 (사용자가 직접 mockup HTML 작성하는 경로)

## Step 1.7: 화면 표현 방식 결정

화면 표현 모드(Mode A/B/C)에 따라 좌측 60% 패널의 렌더링 방식을 결정한다.

**Mode A (기본) — HTML 목업 퍼블리싱**

변경 후 UI를 실제처럼 보여줘야 할 때. 구체 절차:

1. **HTML 작성**: `input/mockup-pc.html` (PC), `input/mockup-mo.html` (MO)에 변경 후 UI를 직접 퍼블리싱
   - 마커+점선 CSS 포함 (§ HTML 목업 마커+점선 스타일 참조)
   - 현행 사이트 구조를 참고하되 변경 부분만 구현. 전체 페이지 불필요 — 해당 영역만
2. **스크린샷 캡쳐**: mockup-capture.js로 PNG 생성
   ```bash
   node scripts/mockup-capture.js input/mockup-pc.html input/ --name={화면코드}
   node scripts/mockup-capture.js input/mockup-mo.html input/ --mobile-only --name={화면코드} --full-page
   ```
3. **JSON 반영**: 생성된 `input/{화면코드}-pc.png`를 해당 screen의 `uiImagePath`에 설정
4. **wireframe[]**: 구조 제안 + Description 마커 매핑용으로만 유지. 최종 렌더링은 HTML 목업 이미지가 담당

- wireframe[] 박스 렌더링은 고객에게 보여줄 수 없는 품질. **기본값이 아님**
- mockup-capture.js 없는 환경: HTML을 직접 브라우저에서 열어 스크린샷 후 input/에 저장해도 됨

**Mode B — 현행 이미지 + 마커 오버레이**

현행 캡쳐 위에 변경 지점만 표시할 때. uiImagePath에 현행 이미지 + overlay 좌표.

**wireframe[] 단독 렌더링 — 한정 사용**

아래 조건에서**만** wireframe[]을 최종 렌더링으로 사용:
- 매우 단순한 구조 (팝업, 바텀시트, 모달 등 요소 5개 이하)
- 초기 프로토타이핑 단계 (고객 전달 목적이 아닐 때)

이 경우에도 group/card/button 타입 조합을 정교하게 구성하고, label은 구조만 표현한다.

> **패턴 1~10, CSS 클래스 목록**: `references/wireframe-patterns.md` 참조

**wireframe[] 허용 타입** (진실의 원천: `scripts/lib/element-types.js`):
`header` / `gnb` / `nav` / `text` / `input` / `button` / `card` / `image` / `gallery` / `map` / `list` / `banner` / `divider` / `table` / `popup` / `group` / `tag`

**wireframe[] 구성 원칙**:
1. header는 반드시 첫 번째 요소
2. group은 반드시 children 1개 이상 (빈 group 금지)
3. descriptions marker 수와 wireframe marker 수 일치 필수
4. 모든 요소에 label 필수 (빈 label 금지)
5. height 비율은 아래 **「와이어프레임 UI 비율 원칙」** 섹션의 테이블을 따른다. 합계 ≈ 990px (±50px), 초과 시 overflow.
6. **label은 UI 구조만 표현** — 실제 콘텐츠(상품명, 가격, 통신사명 등)를 label에 넣지 않는다
   - (O) card label: "요금제 카드" / button label: "가입하기"
   - (X) card label: "토스 마이알뜰 CU15GB+ 월 18,000원 가입하기 비교담기"
   - 실제 콘텐츠 상세는 **Description(수정 전/후)**에만 기재

### 와이어프레임 UI 비율 원칙

**wireframe은 좌측 60% 영역에서 독립적으로 "화면처럼 보여야" 한다.** Description(우측 40%)의 텍스트 양에 따라 와이어프레임 비율이 달라지면 안 된다.

**비율 산정 기준**: 실제 화면의 viewport 비율을 990px 높이에 축소 적용

| 실제 화면 영역 | 실제 비율 | 990px 환산 | height 범위 |
|--------------|----------|-----------|------------|
| Header + GNB | 8~10% | 80~100px | 60~100px |
| 히어로/메인배너 | 30~40% | 300~400px | 250~350px |
| 콘텐츠 영역 (카드/리스트) | 35~45% | 350~450px | 300~450px |
| 필터/탭/검색 바 | 4~6% | 40~60px | 40~60px |
| 페이지네이션/CTA | 5~7% | 50~70px | 40~60px |
| 푸터 | 8~10% | 80~100px | 60~100px |

**MUST**: wireframe의 height 비율은 **실제 화면의 시각적 비중**으로 결정한다. Description 항목이 많아도 wireframe의 height를 줄이거나 늘리지 않는다.

**MUST NOT**:
- Description 항목 수에 맞춰 wireframe 요소 수를 조정 (wireframe은 화면 구조, description은 설명)
- height 없이 모든 요소를 auto로 두기 (주요 영역 최소 3개 이상 height 명시)
- 한 요소에 height 500px 이상 (배너라도 350px 이하, 나머지 영역이 눌림)

### 레이아웃 구성 규칙 (화면설계서다운 와이어프레임)

wireframe[]은 **실제 화면 레이아웃을 시각적으로 표현**해야 한다. 텍스트 라벨을 세로로 나열하는 것은 와이어프레임이 아니다.

**핵심 원칙: group으로 구조를 잡아라**

| 하고 싶은 것 | 잘못된 구성 | 올바른 구성 |
|-------------|-----------|-----------|
| 가로 2열 배치 | text 2개 나열 | `group { layout:"horizontal", children: [A, B] }` |
| 카드 그리드 | card 4개 나열 | `group { children: [card, card, card, card] }` (자동 그리드) |
| 헤더 + 본문 + 푸터 | text 3개 나열 | `header` + `group(본문)` + `group(푸터)` |
| 좌우 분할 | text 2개 나열 | `group { layout:"horizontal", children: [좌측group, 우측group] }` |

**group.layout 속성값**:
- `"default"` — 세로 쌓기 (기본)
- `"horizontal"` — 가로 배치, children 균등 분할
- `"card-grid"` — 카드 그리드 (children이 전부 card면 자동 적용)
- `"btn-row"` — 버튼 가로 정렬 (children이 전부 button이면 자동 적용)
- `"popup"` — 팝업 구조 (close/image/nav/footer role 기반)
- `"tags"` — 태그 가로 나열

### 팝업/모달/바텀시트 구성 패턴

**센터 모달 팝업** — `type:"popup"` 사용:
```json
{
  "type": "popup",
  "label": "이벤트 팝업",
  "marker": 1,
  "height": 400,
  "imageLabel": "이벤트 배너 이미지 (480×640px)",
  "actions": ["오늘 하루 안 보기", "닫기"],
  "close": true,
  "nav": false
}
```
렌더러가 자동으로: 어두운 배경 + 가운데 팝업 프레임 + 닫기(✕) 버튼 + 이미지 영역 + 하단 액션 바 생성.

**커스텀 팝업** — `group { layout:"popup" }` + children role 사용:
```json
{
  "type": "group",
  "layout": "popup",
  "marker": 1,
  "height": 450,
  "children": [
    { "type": "button", "role": "close", "label": "✕", "marker": 2 },
    { "type": "image", "role": "image", "label": "프로모션 배너", "marker": 3, "height": 300 },
    { "type": "group", "role": "footer", "marker": 4, "children": [
      { "type": "text", "label": "오늘 하루 안 보기" },
      { "type": "text", "label": "|" },
      { "type": "text", "label": "닫기" }
    ]}
  ]
}
```
role 종류: `close`(절대위치 우상단), `image`(이미지 영역), `nav`(좌우 네비), `footer`(하단 액션)

**바텀시트** — `containerType:"floating-panel"` 또는 group 조합:
```json
{
  "screenType": "design",
  "containerType": "floating-panel",
  "containerSize": { "width": 375, "height": 600 },
  "wireframe": [
    { "type": "text", "label": "━━━ 드래그 핸들", "height": 30, "marker": 1 },
    { "type": "image", "label": "배너 이미지", "height": 400, "marker": 2 },
    { "type": "group", "layout": "horizontal", "height": 48, "marker": 3, "children": [
      { "type": "text", "label": "오늘 하루 안 보기" },
      { "type": "text", "label": "닫기" }
    ]}
  ]
}
```

### 일반 페이지 레이아웃 구성 예시

**상품 목록 페이지**:
```json
[
  { "type": "header", "label": "로고 | GNB 메뉴", "height": 60, "marker": 1 },
  { "type": "banner", "label": "프로모션 배너", "height": 200, "marker": 2 },
  { "type": "group", "layout": "horizontal", "height": 45, "marker": 3, "children": [
    { "type": "nav", "label": "카테고리 필터" },
    { "type": "input", "label": "검색", "placeholder": "상품 검색" }
  ]},
  { "type": "group", "height": 400, "marker": 4, "children": [
    { "type": "card", "label": "상품 카드", "height": 180 },
    { "type": "card", "label": "상품 카드", "height": 180 },
    { "type": "card", "label": "상품 카드", "height": 180 },
    { "type": "card", "label": "상품 카드", "height": 180 }
  ]},
  { "type": "group", "layout": "horizontal", "height": 40, "marker": 5, "children": [
    { "type": "button", "label": "이전" },
    { "type": "text", "label": "1 2 3 4 5" },
    { "type": "button", "label": "다음" }
  ]}
]
```

**MUST NOT — 레이아웃 안티패턴**:
- 모든 요소를 같은 depth에 flat하게 나열 → group으로 논리 영역을 묶어야 함
- text를 나열해서 UI를 표현 → button, input, card, nav 등 적절한 타입 사용
- group 없이 children 속성을 가진 요소가 없음 → 최소 1~2개 group 필수
- height를 지정하지 않고 전부 자동 → 주요 영역에 반드시 height 명시

### 오버레이 좌표 지정 가이드 (uiImagePath + overlay 사용 시)

캡쳐 이미지 위에 마커 오버레이를 배치할 때, **추정 금지 — pixel 측정 필수**.

**좌표계 기준**: overlay의 top/left/width/height는 wireframe-area 컨테이너(슬라이드 좌측 60%, 990px 높이) 내부의 **% 단위**. 이미지가 컨테이너 내에 object-fit:contain으로 축소/배치되므로, 이미지 원본 pixel과 컨테이너 %는 다르다.

**올바른 절차**:
1. 캡쳐 이미지를 Read(Vision)로 열어 **대상 영역의 pixel 좌표**(x, y, width, height) 측정
2. 이미지 전체 크기(예: 1920×3000) 대비 **비율 환산**: `top% = y / 이미지높이 × 100`
3. 이미지가 컨테이너에 축소 배치되는 비율 감안: 컨테이너 가용 높이 990px, 이미지 세로가 컨테이너보다 길면 스크롤/축소됨
4. **넉넉하게 잡고 줄이는 방식** 적용 — 부족→확대 반복은 비효율적
5. 패딩, border-radius, 상하 여백 포함한 **전체 영역**을 감싸야 함 (텍스트만 X)

**금지 패턴**:
- "대충 55% 쯤" 감으로 좌표 지정
- 3~5%씩 조금씩 조정하며 반복 시행착오
- 텍스트 줄 높이만 감싸기 (패딩/여백 누락)
- "오버레이가 보인다" = "맞다"로 판단 (정확히 감쌌는지 실측 필수)

```json
{
  "marker": 1,
  "overlay": { "top": "12%", "left": "5%", "width": "90%", "height": "18%" }
}
```

### 강제 게이트 — overlay-helper.js 사용 의무 (2026-05-11 추가)

**overlay 필드가 있는 슬라이드는 overlay-helper.js 실행 후 그 출력값을 그대로 사용**해야 한다. 추정 좌표 입력은 금지.

**필수 절차** (overlay 1건당 1회):
```bash
# 1) 캡쳐 이미지 픽셀 좌표 측정 (Read Vision으로 캡쳐를 확인하며 측정)
# 2) overlay-helper.js 실행 — 픽셀을 % 단위로 자동 환산
node .claude/skills/plan-sb/scripts/overlay-helper.js \
  input/screenshot.png \
  --region=top:120,left:50,width:600,height:200
# 출력: { "top": "4.0%", "left": "2.6%", "width": "31.3%", "height": "20.0%" }
# 3) 출력값을 JSON의 overlay 필드에 그대로 복사
```

**게이트 통과 조건**: overlay 필드가 있는 SB JSON 생성 시, 산출물에 다음 마커가 1개 이상 존재해야 한다.
```
[overlay-helper] screen={si} marker={mi} pixel=(top:N, left:N, w:N, h:N) → {top%, left%, w%, h%}
```

**미수행 시**: verify.js의 ⑧ overlay 좌표 정합성 검증에서 WARN 다수 발생 → 작성자가 overlay-helper.js로 재측정 의무.

### Step 3.5 — Claude Vision 위치 정합성 후처리 (2026-05-11 추가, Claude-only)

verify.js 캡처 완료 직후 (verify/ 디렉토리에 슬라이드별 PNG가 생성된 시점), **Claude가 직접 PNG를 Read로 분석**하여 위치 정합성을 시각적으로 평가한다.

**필수 절차** (overlay/marker 사용 슬라이드 전수):
1. `verify/{baseName}-slide{N}.png` 를 Read 도구로 열기
2. 각 marker 번호 박스가 wireframe-area 내 의도한 영역(label에 명시된 UI 영역)을 정확히 감쌌는지 시각적으로 평가
3. 어긋남 발견 시 즉시 JSON의 해당 overlay 좌표 수정 → generate.js 재실행

**위치 정합성 기준 (4 체크)**:
| # | 항목 | PASS 기준 |
|---|------|----------|
| V1 | 영역 일치 | marker 박스가 label 텍스트가 가리키는 UI 요소(버튼/카드/섹션)를 정확히 감쌌는가 |
| V2 | 여백 적정 | UI 요소 경계로부터 외부로 1~10px 여유 (꽉 끼거나 멀어지지 않음) |
| V3 | 번호 위치 | marker-number 텍스트가 박스 좌상단에서 가독 가능한 위치 |
| V4 | 중복 회피 | 인접 marker와 50%+ 겹치지 않음 (verify.js ⑧-4와 직교) |

**Vision 후처리 출력 마커** (산출물에 첨부):
```
[Vision Verify] slide={N}
  marker 1 (label: "검색바") — V1:PASS V2:PASS V3:PASS V4:PASS
  marker 2 (label: "필터 그룹") — V1:FAIL (배경 흰 영역만 감쌈, 필터 칩 X) → 좌표 수정 필요
```

**금지 패턴**:
- verify.js만 통과시키고 Vision 후처리 생략 ("수치 PASS = 시각 PASS" 오판)
- Vision 평가 없이 "한눈에 봐도 맞다"로 종료
- V1 FAIL인데 "거의 맞다"로 통과시키기

**근거**: verify.js는 좌표 수치(오버플로우/크기/겹침)만 검증한다. 의미 정합성(이 marker가 이 UI 요소를 의도대로 가리키는가)은 Vision 평가만 가능.

### Description 오버플로우 → 슬라이드 분할

Description 항목이 많아 한 슬라이드에 담기지 않을 때, **자동으로 다음 슬라이드에 이어서 작성**한다.

**분할 판단 기준**:
- Description 테이블의 렌더링 높이가 슬라이드 body 영역(≈950px)을 초과할 때
- marker 개수가 아닌 **항목별 설명 텍스트 양**이 기준. 3개라도 설명이 길면 넘치고, 10개라도 한 줄이면 안 넘침
- 각 description 항목의 예상 높이: label 1줄(30px) + items 줄당 20px + 여백 15px. 합산 > 900px이면 분할

**분할 방법**:
1. 동일 화면을 2개 screen으로 분할 (interfaceName 동일 + "(1/2)", "(2/2)" 표기)
2. 첫 번째 screen의 마지막 description에 `"continuation": "next"` 추가
3. 두 번째 screen의 첫 번째 description에 `"continuation": "prev"` 추가
4. **넘버링 연속**: 첫 슬라이드 marker 1~5이면 → 두 번째 슬라이드 marker 6~부터 이어감

**JSON 예시**:
```json
// 슬라이드 1/2 — 마지막 description
{ "marker": 5, "label": "요금제 카드", "items": [...], "continuation": "next" }

// 슬라이드 2/2 — 첫 번째 description  
{ "continuation": "prev" }
{ "marker": 6, "label": "필터 영역", "items": [...] }
```

**렌더링 결과**:
- `"next"` → 슬라이드 하단에 "▶ 다음 슬라이드에 계속됨" 표시
- `"prev"` → 슬라이드 상단에 "◀ 이전 슬라이드에서 이어짐" 표시

**wireframe 분할 규칙**:
- 첫 슬라이드: 상단 영역 wireframe (header + 분할 지점까지)
- 두 번째 슬라이드: 나머지 영역 wireframe (분할 지점부터 footer)
- 양쪽 모두 marker 수와 descriptions marker 수 일치 필수

**MUST NOT**: Description이 넘치는데 분할 안 하고 잘리게 두는 것. overflow:hidden으로 잘리면 개발자가 명세를 못 봄.

### 비정상 상태(MSG Case) 정의 기준

design 스크린에 대해 아래 조건 해당 시 msgCase 슬라이드를 별도 생성한다.

| 상태 | 정의 조건 | 예시 |
|------|----------|------|
| Empty | 데이터 0건 가능 영역 | 검색 결과 없음, 장바구니 비어있음, 게시글 없음 |
| Error | 서버/네트워크 오류 가능 | API 타임아웃, 결제 실패, 인증 만료 |
| Loading | 비동기 로딩 영역 | 리스트 로딩 중, 이미지 로딩, 무한스크롤 |
| Permission | 권한 부족 시 | 비로그인 접근, 권한 없는 페이지 |

**적용 규칙**:
- 검색·필터·목록이 있는 화면 → Empty 필수
- 폼 제출이 있는 화면 → Error 필수
- 외부 데이터 의존 영역 → Loading 권장
- 해당 없으면 msgCases: [] (빈 배열)으로 명시적 스킵

**msgCases 필드 스키마** (template.js 렌더러와 일치해야 함):

| 필드 | 필수 | 설명 | 예시 |
|------|------|------|------|
| type | O | 상태 유형 | `Empty` / `Error` / `Loading` / `Process` |
| subType | | 세부 유형 | `긍정` / `부정` |
| no | O | 순번 | `1`, `2`, `3` |
| situation | O | 발생 조건 | `검색 결과가 0건일 때` |
| message | O | 표시 메시지/UI | `조건에 맞는 결과가 없습니다` |
| title | | 팝업 제목 (확장형) | `알림` |
| confirmAction | | 확인 버튼 동작 (확장형) | `목록으로 이동` |
| cancelAction | | 취소 버튼 동작 (확장형) | `닫기` |

> **금지**: `state`, `label`, `description` 필드명 사용 금지. template.js가 인식하지 못해 빈 테이블 렌더링됨.

---

## 정보 소유 경계 (파이프라인 단계별 역할 분리)

SB는 **기획 단계 최종 산출물**입니다. SB가 디자인 결정을 내리면 뒤에 이어지는 design 스킬이 SB를 복제하게 되어 디자인 품질이 저하됩니다.

| 영역 | 담당 스킬 | SB 포함 여부 |
|------|---------|:---:|
| 화면 구조·영역 분할·요소 배치 | **plan-sb** | ✅ 소유 |
| 각 요소 기능·클릭 동작·이동 경로 | **plan-sb** | ✅ 소유 |
| 사용자 플로우·상태별 메시지(MSG Case) | **plan-sb** | ✅ 소유 |
| PM 의사결정 질문·리스크 | **plan-sb** | ✅ 소유 |
| FN-### 기능명 매핑 | plan-fn | 🔗 참조만 |
| IA 페이지 경로 | plan-ia | 🔗 참조만 |
| 브랜드 컬러·팔레트 (theme) | **design-knowledge** | ❌ 금지 |
| 타이포그래피 (폰트·크기) | **design-knowledge** | ❌ 금지 |
| 그라디언트·shadow·전환 토큰 | **design-knowledge** | ❌ 금지 |
| 레이아웃 반응형 breakpoint 수치 | **design-layout** | ❌ 금지 |
| 컴포넌트 hex·px·hover 스펙 | **design-ui** | ❌ 금지 |
| API 엔드포인트·요청·응답 스키마 | **dev-spec** | ❌ 금지 |
| 상태 관리·검증 규칙 구현 | **dev-spec** | ❌ 금지 |

**data.json 금지 필드**:
- `theme` 객체 전체 — design-knowledge 전담
- `screens[].divider.color`, `screens[].divider.background` — 중립 다크 톤 사용
- `overview.techStack` — dev-spec 전담

**Description items[].text 금지 패턴**:
- (X) "배경색 #F5EFE6, 폰트 Noto Serif KR, padding 48px" — UI 스펙 금지
- (X) "clamp(28px, 4vw, 56px)" — 반응형 수치 금지
- (X) "IntersectionObserver, aria-current, backdrop-filter" — 구현 기술 금지
- (X) "좌측에 로고, 가운데 메뉴, 우측 버튼이 있습니다" — 목업 캡션 수준, 명세 아님
- (O) "① 로고 — 클릭 시 홈 최상단으로 이동"
- (O) "② 메뉴 링크 — 클릭 시 메뉴 섹션으로 스크롤 이동"
- (O) "예약 링크가 동작하지 않을 때는 매장 전화번호로 대체 연결"

**Mockup HTML (좌측 60% 참조 이미지)**:
- 목적은 영역·요소 위치 식별. **시각 디자인 자유도는 후속 design-* 단계에 양보**
- **권장 팔레트** (기본): 중립 무채색 + 시스템 폰트
  - 배경 #ffffff / #fafafa / #f0f0f0
  - 테두리 #e0e0e0 / #cccccc
  - 텍스트 #333 / #666 / #999
  - 이미지 플레이스홀더 #e0e0e0 + "[이미지]"
  - 마커 식별색 #e4002b (브랜드와 무관)
  - 폰트 `system-ui, -apple-system, "Segoe UI", sans-serif`
- **허용**: 중립 톤 와이어프레임 또는 매우 연한 브랜드 힌트 (과도한 그라디언트·shadow·세리프 폰트 제외)
- **금지**: 실 브랜드 컬러 hex 박기, 최종 디자인처럼 보이는 폴리시 (design-knowledge 결정 복제 방지)

**마커 배치 규칙** (서로 겹치지 않게):
- 직사각형 pill (`border-radius: 2~4px`), 높이 18~22px, 폰트 11~12px
- `top:-22px, left:-2px`로 객체 **바깥 상단**에 배치 (객체 가림 금지)
- 요소 간격 확보: nav·버튼 그룹은 `gap: 48px` 이상
- 마커 공간 확보를 위해 각 영역 `margin-top: 32px` 이상

**스크러빙**: post-process.js가 data.json의 theme과 divider.color를 자동 제거합니다. LLM이 실수로 넣어도 복구됩니다.

JSON 작성 전 반드시 읽을 것: `scripts/template.js`, `scripts/lib/schema.js`, `~/.claude/lib/rules/artifact-scope.md` (전역 산출물 범위 경계)

## JSON 데이터 구조 (v2 스키마)

**project 필수 필드**: `id`, `title`, `serviceName`, `version`, `date`, `writer`, `company.name`, `requestor`

**screens[] 주요 필드**:

| 필드 | 필수 | 설명 |
|------|------|------|
| screenType | O | `design` / `description` / `msgCase` / `component` |
| viewportType | O | Mobile / PC / Tablet |
| interfaceName | O | 인터페이스명 |
| location | O | 메뉴 경로 |
| descriptions[] | O* | design/description 타입 필수 (marker + label + items[]) |
| msgCases[] | O* | msgCase 타입 필수 |
| components[] | O* | component 타입 필수 |
| uiImagePath | - | UI 캡처 이미지 경로. 설정 시 wireframe 렌더링 비활성화 |
| hasDivider | - | `true` + `divider` 객체 **둘 다** 설정 시 Divider 프레임 자동 삽입 |
| wireframe[] | - | 와이어프레임 요소 배열 (Option A 권장) |
| wfHtml | - | 직접 작성 HTML (Option B, 복잡 레이아웃 한정). 존재 시 wireframe[] 보다 우선 |
| pmComments[] | - | PM 코멘트 배열 (marker + type + author + comment). 제안 필요 시에만 생성 |
| containerType | - | `page`(기본) / `chatbot-panel` / `modal` / `floating-panel`. 와이어프레임 렌더링 컨텍스트 변경 |
| containerSize | - | `{ "width": 380, "height": 600 }`. containerType이 page가 아닐 때 패널 크기 지정 |

## containerType (v2.1)

비표준 UI 패러다임을 위한 렌더링 컨텍스트 전환. 기존 element type을 유지하면서 시각 표현만 변경.

| containerType | 렌더링 | 기본 크기 |
|---------------|--------|----------|
| `page` (기본) | 기존 60/40 분할 | 전체 폭 |
| `chatbot-panel` | 좁은 채팅 패널 (둥근 모서리, 그림자) | 380×600px |
| `modal` | 중앙 오버레이 (어두운 배경) | 520×auto |
| `floating-panel` | 우하단 플로팅 패널 | 360×auto |

```json
{
  "screenType": "design",
  "containerType": "chatbot-panel",
  "containerSize": { "width": 380, "height": 600 },
  "wireframe": [...]
}
```

## appearance 속성 (v2.1)

모든 wireframe element에 `appearance` 객체를 추가하여 CSS 속성 직접 지정 가능. **새 element type 추가 없이** 비표준 컴포넌트 표현.

```json
{
  "type": "group",
  "label": "봇 말풍선",
  "appearance": {
    "align": "flex-start",
    "maxWidth": "70%",
    "background": "#F2F3F5",
    "borderRadius": "16px",
    "padding": "12px"
  },
  "children": [
    { "type": "text", "label": "안녕하세요!" }
  ]
}
```

**허용 속성**: align, maxWidth, minWidth, background, borderRadius, padding, margin, border, gap, color, fontSize, fontWeight, textAlign, display, flexDirection, justifyContent, alignItems, flexWrap, opacity, boxShadow, width, height, position, top, right, bottom, left, overflow, zIndex

**v1 → v2 자동 정규화**: `assignment`, `interfaces`, `jiraNo`/`srNo` 필드 → `lib/schema.js normalizeV1()` 자동 처리

## 프레임 타입별 생성 로직

| 프레임 | 생성 조건 |
|--------|----------|
| Cover | 항상 생성 |
| History | `history[]` 1건 이상 |
| Overview | `overview` 데이터 존재 |
| Divider | `hasDivider: true` **+** `divider` 객체 모두 설정된 screen 앞 자동 삽입 |
| Screen | `screens[]` 전수 (screenType별 분기) |
| End of Document | 항상 생성 (마지막) |

## 출력 명세

- HTML: `{outputPrefix}.html` (미설정 시: `{프로젝트명}_SB_{YYYYMMDD}_{버전}.html`)
- 저장: `output/{serviceName}/{YYYYMMDD}/`
- 커맨드: `node .claude/skills/plan-sb/scripts/generate.js <data-file.json>`

## Figma Export (2026-04-29 재작성 — Figma 공식 Remote MCP 기반)

생성된 HTML SB 를 Figma 파일에 **슬라이드별 별도 frame**으로 push 한다.

### 권장 절차 (1회 split + 슬라이드별 push)

```
1) split-html-by-slide.js 1회 실행 → output/.../split/{basename}-slide{NNN}.html × N개 생성
2) 각 partial을 Figma MCP `generate_figma_design` 으로 1회씩 push → N개 별도 frame
3) manifest.json의 메타(type/title)를 frame 이름·페이지로 활용
```

### 절대 금지 패턴 (효율 저하)

- ❌ **풀 HTML을 슬라이드 수만큼 반복 호출** — Read 1회면 충분한데 N회 반복 = 토큰·시간 N배 낭비
- ❌ **Single-page 통째 push** — 모든 슬라이드가 1개 frame에 들어가 분리 안 됨
- ❌ **figma-bridge 커스텀 plugin import** — Figma 공식 MCP로 plugin 없이 처리 가능 (2026-04-28 검증 완료)

### 호출 패턴 (정답)

```bash
# 1단계 — 1회만
node .claude/skills/plan-sb/scripts/split-html-by-slide.js \
  output/{프로젝트}/{날짜}/SB.html \
  output/{프로젝트}/{날짜}/split

# 2단계 — 각 partial을 generate_figma_design에 push
# Claude가 자연어로 처리: "split/SB-slide001.html 부터 SB-slide011.html 까지 figma로 send해줘"
# MCP가 각 partial → 별도 frame 생성
```

### 사용자 셋업 (1회)

| 시점 | 작업 | 빈도 |
|------|------|------|
| 최초 1회 | `claude mcp add --transport http figma https://mcp.figma.com/mcp` + OAuth 인증 | PC당 1회 |
| Claude Code 재시작 | MCP 도구 로드 | 1회 |
| 매 push | 자연어 1줄 ("이 SB를 Figma로 send 해줘") | 자동 |

**Figma 데스크탑 plugin import 불필요** — Remote MCP가 직접 처리.

### 표준 절차 — figma-prep.js + F2~F7 플레이북

```bash
# 1. Figma 캡처용 HTML 변환 (1회 — 가로 flex + pseudo-element DOM화 + capture.js)
node .claude/skills/plan-sb/scripts/figma-prep.js output/{name}/{date}/{outputPrefix}.html
# → output/{name}/{date}/_figma/{outputPrefix}-figma.html
# → output/{name}/{date}/_figma/figma-meta.json
```

이후 `references/figma-export.md` 플레이북의 Step F2~F7 절차로 Claude가 자연어로 처리:
- F2: AskUserQuestion → Output Mode (newFile/existingFile) + Plan
- F3: `mcp__figma__generate_figma_design` → captureId 발급
- F4: 로컬 서버 + Chrome `--window-size=1920,1080` 단일 윈도우 + body 전체 **1회** 캡처
- F5: 5초 간격 폴링 → completed
- F6: `mcp__figma__use_figma`로 `.slide` 자식 **detach + rescale + 가로 정렬 + 리네임**
- F7: 정확도 7항목 검증

**핵심 원칙 (사용자가 본 비효율 차단)**:
- ❌ **슬라이드별 N회 캡처 금지** — Chrome 백그라운드 탭 throttling으로 5분 이상 소요
- ❌ **같은 풀 HTML을 프레임마다 다시 열기 금지** — Read·MCP 호출 N배 낭비
- ✅ **body 전체 1회 캡처 → use_figma로 자식 detach** (~30초, 11슬라이드 기준)
- ✅ Chrome `--window-size=1920,1080 --force-device-scale-factor=1` (캡처 스케일 손실 회피)
- ✅ pseudo-element는 `figma-prep.js`가 사전 DOM화 (::after 강조선, ::before 아이콘)

상세 절차는 [`references/figma-export.md`](references/figma-export.md) 참조.

### Fallback — split-html-by-slide.js (use_figma detach 실패 시)

`mcp__figma__use_figma` detach가 동작하지 않는 환경(API 변경·권한 제한)에서:

```bash
# 슬라이드별 partial HTML 분리 (1회) → 각 partial을 generate_figma_design에 push
node .claude/skills/plan-sb/scripts/split-html-by-slide.js \
  output/{name}/{date}/{outputPrefix}.html \
  output/{name}/{date}/split
# → split/{basename}-slide001.html ~ slideNNN.html
# → split/{basename}-manifest.json (인덱스·type·title)
```

각 partial을 순차 push (각각 가벼운 단위라 20KB 제한 회피).

### 한계

- Pretendard Italic 등 일부 폰트 누락 가능 (FONT 누락 경고 출력)
- 캡처 시 로컬 서버 필요 (file:// 직접은 Figma MCP가 거부할 수 있음)

## 16:9 슬라이드 명세 (v2)

- 화면 규격: 1920×1080px 고정 (overflow:hidden)
- 슬라이드 구조: slide-header(54px) + slide-body(flex:1) + slide-footer(36px)
- Design 레이아웃: 좌 60% wireframe-area + 우 40% description-panel
- MSG Case 자동 분리: `screenType:'design'` + `msgCases` 동시 존재 시 별도 슬라이드 자동 생성 (인라인 혼재 금지)

## pmComments 필드 명세

`screens[].pmComments: object[]` — Description 패널 하단에 PM 코멘트 블록 렌더링

| 필드 | 필수 | 설명 |
|------|------|------|
| marker | O | 연결할 Description marker 번호 |
| type | O | `question` / `suggestion` / `risk` / `reject` |
| author | - | 작성자 (기본값: "PM") |
| comment | O | 코멘트 내용 |

**생성 기준** — 모든 design 슬라이드에 최소 1건 이상 생성한다 (디폴트):

| 조건 | type | 예시 |
|------|------|------|
| 레이아웃 대안이 있을 때 | `suggestion` | "카드 4열 → 3열 변경 시 모바일 대응 유리" |
| 콘텐츠 확인이 필요할 때 | `question` | "배너 슬라이드 자동 롤링 속도 확인 필요" |
| UX 리스크 감지 시 | `risk` | "GNB 메뉴 8개 초과 — 인지 부하 우려" |
| 변경 의도가 불명확할 때 | `question` | "현행 대비 변경 범위 확인 필요" |
| 구현 난이도가 높을 때 | `risk` | "캐러셀 무한 루프 구현 시 접근성 이슈 예상" |

> **필수**: design 슬라이드에 pmComments가 빈 배열이면 Self-Check WARN. 기획자로서 수정 방향에 대한 의견·질문·리스크를 반드시 1건 이상 기재한다.

## fnRef 필드 명세

`descriptions[].fnRef: string[]` — FN 코드 배열

```json
{ "marker": 2, "label": "쿠폰 입력 영역", "fnRef": ["FN-042", "FN-043"], "items": [{ "text": "쿠폰 코드 입력 필드 + [적용] 버튼" }] }
```

- 렌더링: Description 패널 하단 `[FN 참조]` 섹션 — 기능명만 표시. 처리 로직·AC 복사 금지

## 동적 콘텐츠 영역 Description 필수 항목 (2026-04-27 / 2026-05-11 5종 확장)

카드 그리드, 리스트, 큐레이션, 추천 영역, 검색 결과, **캐러셀/슬라이더/탭 등 컴포넌트 동작이 데이터 수량·상태에 의존하는 영역**의 Description에는 아래 5종이 기본 포함되어야 한다. 빠지면 개발팀이 임의 구현 → 운영 불일치 발생.

| # | 필수 항목 | 작성 예시 |
|---|----------|----------|
| 1 | **데이터 출처** | "GET /api/curation/recommend?userId={id}" 또는 "BO 직접 입력 (큐레이션 영역 슬롯)" 또는 "정적 데이터 (assets/popular.json)" |
| 2 | **정렬 우선순위** | "① 추천 가중치 → ② 매칭 점수 → ③ 인기 점수" — 1~3순위까지 명시 |
| 3 | **노출 개수/조건** | "PC 4종 / Mobile 3종" + "단종/재고 0/자격 미달 요금제 제외" |
| 4 | **Fallback 동작** | "API 실패 시 인기 요금제 노출" 또는 "Loading 중 스켈레톤 N초 후 ERROR 메시지" |
| 5 | **컴포넌트 조건부 UI 분기** (2026-05-11 추가) | "슬라이드 1개 → arrow/indicator 미노출 + autoplay off / 2개+ → arrow + indicator 노출 + autoplay 5s" |

**선택 항목**: 캐시 정책(TTL), 사용자 분기(로그인/비로그인), 이벤트 트래킹 코드 — 영역 특성에 따라 추가.

> 위 5종은 **운영 SB의 최소 정의**. 별도 BO 관리 화면 component 슬라이드는 필요할 때만 추가(강제 X).

### #5 컴포넌트 조건부 UI 분기 — 표준 표현 패턴

**적용 대상**: 데이터 수량·상태·디바이스·권한에 따라 UI 요소가 노출/숨김/변형되는 모든 컴포넌트.

**필수 작성 차원** (해당하는 것만):

| 차원 | 트리거 | 작성 예시 |
|---|---|---|
| **수량 분기** | 데이터 개수 | "배너 1개 → 화살표/인디케이터 미노출 / 2개+ → 노출" |
| **상태 분기** | 로딩/에러/빈/완료 | msgCases로 위임 (Empty/Error/Loading) — 본 항목 X |
| **권한 분기** | 로그인/비로그인/등급 | "비로그인 → CTA '로그인 후 이용' / 일반 → '구매' / VIP → '특가' 뱃지" |
| **디바이스 분기** | PC/Tablet/Mobile | "PC: 4열 가로 / Tablet: 2열 / Mobile: 세로 스택 + 더보기 버튼" |
| **인터랙션 분기** | 클릭/호버/포커스/스와이프 | "Hover → 미리보기 툴팁 / Click → 상세 모달 / Long-press(mobile) → 컨텍스트 메뉴" |
| **시간 분기** | 자동 롤링/딜레이 | "autoplay: 5초 / 사용자 인터랙션 후 10초 일시정지 후 재개" |

**작성 형식 — items[] 예시**:
```json
{
  "marker": 3,
  "label": "메인 배너 슬라이드",
  "items": [
    { "text": "데이터 출처 — GET /api/main/banner (BO 큐레이션 슬롯, 캐시 60s)" },
    { "text": "노출 개수 — 최대 5개, 종료일 경과/비공개 제외" },
    { "text": "수량 분기 — 1개 단일: 화살표·인디케이터 미노출 + autoplay off / 2개+: 좌우 화살표 + 하단 인디케이터 + autoplay 5s" },
    { "text": "디바이스 분기 — PC/Tablet: 가로 1920×480 / Mobile: 세로 16:9 비율, 인디케이터 dot only(번호 숨김)" },
    { "text": "인터랙션 — Click → 배너 link 이동(새 탭 옵션 BO 토글) / Hover(PC) → autoplay 일시정지 / Swipe(mobile) → 다음 슬라이드" },
    { "text": "Fallback — API 실패 시 정적 fallback.jpg 1개 표시 (인디케이터/화살표 모두 미노출)" }
  ]
}
```

**금지 패턴**:
- (X) "메인 배너 슬라이드 — 좌우 화살표로 이동" — 1개일 때 동작 누락
- (X) "캐러셀 영역" — autoplay 여부/속도/사용자 인터랙션 시 동작 누락
- (X) 수량 분기를 msgCase로 작성 — msgCase는 비정상 상태(Empty/Error/Loading/Permission) 전용
- (O) "1개 단일: 화살표·인디케이터·autoplay 모두 off / 2개+: 표준 동작" + 디바이스별 차이 명시

**컴포넌트별 #5 적용 체크리스트** (해당 컴포넌트 사용 시):
- [ ] 캐러셀/슬라이더 — 1개일 때 컨트롤 동작 명시
- [ ] 탭 — 1개 탭일 때 탭바 미노출 여부
- [ ] 필터 칩 — 0개 선택 / N개 선택 시 초기화 버튼 동작
- [ ] 검색 결과 정렬 드롭다운 — 결과 0건 시 미노출 여부
- [ ] 페이지네이션 — 1페이지일 때 미노출 / N페이지일 때 prev/next 비활성
- [ ] 무한 스크롤 — 더 가져올 데이터 없을 때 sentinel/스켈레톤 미노출

> **재사용 컴포넌트**: 캐러셀/모달/탭 등 다회 사용되는 인터랙션 패턴은 별도 `screenType: "component"` 슬라이드로 명세 + design 슬라이드에서 reference. example v2.1 → Slide 09 Component-Guide 참조.

**금지 패턴 (기존)**:
- (X) 카드 영역 Description에 "추천 요금제 4개를 보여준다"만 작성 — 어디서 가져오는지/어떻게 정렬하는지 누락
- (X) "리스트 영역" — 데이터 출처 없으면 개발팀이 어떤 API 만들어야 할지 모름
- (O) "GET /api/curation/recommend로 4종 조회 → 추천 가중치 순 정렬 → API 실패 시 popular.json fallback"

## Description 역할 재정의

| 항목 | 연계 모드 (context/fn.md 존재) | 독립 모드 (fn.md 없음) |
|------|-------------------------------|----------------------|
| UI 배치/레이아웃 설명 | 허용 | 허용 |
| 기능 동작 의도 | **금지** (fnRef로 위임) | **허용** |
| 처리 로직·AC 수치 기준 | 금지 | 금지 |

연계 모드: fnRef 빈 배열이면 verify.js WARN 발생 / 독립 모드: fnRef:[] → fnRef 섹션 생략

## items[] category 필드 — 기능 동작 의미 분류 (2026-05-11 신설)

`descriptions[].items[]` 항목은 기존 자유 텍스트(`text`)에 더해 **`category` 키** 7종으로 의미 분류한다. CTA/액션 요소/조건 분기의 작성 누락을 자동 감지 가능.

### 7종 enum

| # | category | 용도 | 작성 예시 |
|---|---|---|---|
| 1 | `trigger` | 발동 조건 (디바이스별 트리거 차이 포함) | "Click (PC) / Tap (Mobile) / Enter 키" |
| 2 | `enable_cond` | 활성/비활성 조건 | "필수 필드 입력 + 약관 동의 시 활성, 그 외 disabled" |
| 3 | `action` | 실행 동작 (API 호출/이동/모달) | "POST /api/order/checkout 호출 → 응답 대기" |
| 4 | `success` | 성공 처리 | "/order/complete 이동 + 토스트 '결제 완료'" |
| 5 | `failure` | 실패 처리 (4xx/5xx/network) | "4xx → 인라인 에러 / 5xx → 재시도 모달 / 401 → /login?return_url= 이동" |
| 6 | `state` | 수량/조건 상태 분기 | "1개일 때 화살표 미노출 / 2개+ 노출 + autoplay 5s" |
| 7 | `permission` | 권한 분기 | "비로그인 → 로그인 페이지 / 일반 → 구매 / VIP → 특가 뱃지" |

> 픽셀값/그리드/spacing/색상 등 **시각 표현은 plan-sb 책임 X** — design-layout / publish-style 영역.

### 책임 경계 (영역 매트릭스)

| 표현 | plan-sb (description) | design-layout | publish-style |
|---|---|---|---|
| 기능 동작/조건/분기 | ✅ items[].category | — | — |
| 데이터 출처 + Fallback | ✅ items[].text | — | — |
| 레이아웃 (M/T/D 그리드, 컬럼) | ❌ | ✅ | — |
| 픽셀 값 (1920×600, padding 24px) | ❌ | ❌ | ✅ CSS 토큰 |
| 색상/폰트 토큰 | ❌ | — | ✅ design-knowledge |
| 컴포넌트 시각 스펙 (반응형 크기) | ❌ | — | ✅ design-ui |

### 작성 형식

기존 items[] 구조에 `category` 키 추가. `text`는 그대로 유지.

```json
{
  "marker": 3,
  "label": "결제하기 CTA 버튼",
  "items": [
    { "category": "trigger",     "text": "Click (PC) / Tap (Mobile) / Enter 키" },
    { "category": "enable_cond", "text": "필수 필드 전체 입력 + 약관 동의 시 활성, 그 외 disabled" },
    { "category": "action",      "text": "POST /api/order/checkout (cart_id, payment_method) — 응답 대기 중 spinner + 버튼 disabled (2회 클릭 방지)" },
    { "category": "success",     "text": "200 OK → /order/complete?id={orderId} 이동 + 토스트 '결제가 완료되었습니다'" },
    { "category": "failure",     "text": "4xx → 인라인 에러 메시지 (필드별) / 5xx → 재시도 모달 / 401 비로그인 → /login?return_url=/cart" },
    { "category": "permission",  "text": "VIP 등급 → 5% 즉시 할인 적용 후 결제 / 일반 → 표준 결제" }
  ]
}
```

### category 필수 적용 영역

다음 영역은 `category` 키 작성 **의무**. 미작성 시 verify.js WARN:

- CTA 버튼 (구매/결제/가입/문의/예약 등 동작 의도가 분명한 버튼)
- 폼 제출 버튼
- 네비게이션 링크 (특히 이동 후 권한 체크 필요한 것)
- 외부 링크 (새 탭/같은 탭 행위 명시 필요)
- 토글/스위치 (즉시 적용 vs 저장 필요)
- 조건부 표시 UI (수량/권한/상태에 따라 노출 변동)

### 금지 패턴

- (X) "결제하기 버튼" — category 없이 라벨만 작성 → 동작 미상
- (X) `category: action` 만 작성 + success/failure 누락 → 에러 처리 불명확
- (X) `category: device_behavior` 또는 `device` — **시각 영역**, plan-sb 책임 아님 (해당 enum 부재)
- (X) `text`에 "padding 24px", "1920×600", "#FFB800" 같은 토큰값 작성 → publish-style 영역
- (O) trigger + action + success + failure 최소 4종 묶음 작성 (CTA의 경우)

### 호환성

- `category` 키 없는 기존 items[] 항목은 **그대로 호환** (자유 텍스트로 처리)
- 점진적 도입: 신규 작성 SB부터 적용. 기존 산출물 마이그레이션 불필요.

## 품질 기준

| 항목 | 기준 |
|------|------|
| 슬라이드 수 | screens[] 수와 일치 |
| 마커 일치 | wireframe[].marker ↔ descriptions[].marker 매핑 |
| 정보 소유 경계 | FN 로직·REQ AC 직접 복사 0건 |
| overflow | verify.js WARN 0건 |
| MSG 인라인 | verify.js ERROR 0건 |

## 금지 패턴

- `*_FN_*.md` 패턴으로 FN 스캔 금지 → `output/{serviceName}/*/FN_*.md` 사용
- FN 처리 로직·알고리즘·AC 수치 기준을 Description에 복사 금지
- `[미확인]`, `[미정]` 항목 잔존 금지
- design 슬라이드 내 msgCases 인라인 혼재 금지
- 레퍼런스 캡쳐의 텍스트·상품명·가격을 타겟 산출물에 복사 금지
- 레퍼런스에서 추출 허용: 섹션 구조, 카드 배치, GNB 패턴, 컬러 톤, CTA 배치
- 레퍼런스에서 추출 금지: 브랜드명, 제품명, 가격, 마케팅 카피, 이벤트명
- 타겟 콘텐츠 미확보 시: `[타겟 콘텐츠 필요: {영역}]` 플레이스홀더 사용 (임의 생성 금지)

## Self-Check

산출물 생성 완료 후 자동 수행합니다.

| ID | 항목 | 판정 기준 |
|----|------|----------|
| V1 | JSON 파일 존재 + 파싱 가능 | Fail 시 생성 중단 |
| V2 | 스키마 필수 필드 완전성 | `project` + `screens[]` 존재 |
| 1 | Cover 슬라이드 | 로고·과제명·버전 표시 |
| 2 | History 슬라이드 | history[] 1건 이상 시 |
| 3 | Overview 슬라이드 | overview 데이터 존재 시 |
| 4 | Screen 슬라이드 수 = screens[] 수 | 불일치 시 Fail |
| 5 | Divider 슬라이드 수 | hasDivider+divider 수와 일치 |
| 6 | End of Document | 마지막 슬라이드 확인 |
| 7 | 메타 테이블 완전성 | Viewport·Interface·Location 표시 |
| 8 | Description 완전성 | marker + label 존재 |
| 9 | 와이어프레임 마커 일치 | wireframe[].marker ↔ descriptions[].marker |
| 10 | 이미지 참조 유효성 | uiImagePath 지정 시 파일 존재·5KB 이상·확장자 확인 |
| 11 | PDF 출력 정상 | 1920×1080, 페이지 구분 |
| 12 | 정보 소유 경계 준수 | FN 처리 로직·REQ AC 복사 0건 |
| 13 | MSG Case 분리 | verify.js ERROR 0건 |
| 14 | Description 오버플로우 | 단일 슬라이드 descriptions 7개 이상이면 continuation 분할 필수. splitDescriptions() 자동 적용 확인 |
| 15 | 포맷 참고 반영 | PDF/PPT 포맷 제공 시 테마 JSON 생성 여부. 미생성 시 Fail |
| 16 | 기획 확정 게이트 | Step 0.5 출력 마커(`[기획 확정]`) 존재 여부. 미존재 시 Fail — 범위 미확정 상태에서 JSON 생성 금지. 기술 구현 수준 질문(JSON 구조, 마커 수, 파일 분리)을 사용자에게 묻지 않았는지 확인 |
| 17 | 화면 표현 모드 일관성 | PC/MO가 동일 모드(A/B/C)인지 확인. 혼재 시 Fail |
| 18 | 현행 이미지 활용 | Mode A/C에서 현행 캡쳐가 uiImagePath에 직접 사용되면 Fail. Mode B만 허용 |
| 19 | pmComments 필수 | design 슬라이드에 pmComments 1건 이상. 빈 배열이면 WARN |
| 20 | 시각적 완결성 검증 | generate.js 후 Design 슬라이드를 Read(Vision)으로 열어 확인. wireframe/목업 없이 텍스트 description만 있으면 Fail. 오버레이 마커가 정확한 영역을 덮고 있는지 확인. "고객에게 보여줄 수 있는가" 판단 |
| 21 | Description 기능 중심 | Description items[]가 UI 스펙(색상, px, margin 등)이 아닌 **기능 구현 내용**(동작, 조건 분기, 상태 변화)을 기술하는지 확인. UI 스펙은 목업이 전달, Description은 기능 명세 |
| 22 | Mode B overlay 필수 | uiImagePath 사용(Mode B) 시 descriptions[].overlay 좌표가 1건 이상 존재해야 함. overlay 없으면 마커가 이미지에 표시되지 않아 "어디가 변경인지" 전달 불가. WARN |
| 23 | overlay 헤더 겹침 방지 | overlay.top이 5% 미만이면 메타 테이블/헤더와 겹칠 가능성. top < 5%인 마커는 위치 재조정 WARN |
| 24 | 이미지 비율 적합성 | uiImagePath 이미지가 와이어프레임 영역(60%, 약 1152×990px)에 비해 지나치게 작거나 세로가 짧으면 하단 빈 공간 발생. PC 이미지는 최소 높이 600px 이상 권장. 빈 공간 350px 이상이면 WARN |
| 25 | Description 카운트 정확성 | verify.js description 카운트에 pmComments를 포함하지 않는지 확인. 실제 description 수와 WARN 기준(7개) 비교 시 pmComments 제외 |
| 26 | **시각 증거 첨부** (2026-04-27 신규) | Self-Check PASS 출력 전 verify/{slide}.png를 Read(Vision)로 1건 이상 직접 열어본 증거 필수. 시각 미확인 PASS는 Red Flag #1 — 자동 FAIL 처리 |
| 27 | **현행 캡쳐 존재성** (Mode B/C) | Mode B/C 선언 시 input/screenshot.png 또는 input/*-pc.png 같은 현행 이미지 1건 이상 존재해야 함. 없으면 visit.js 자동 실행 후 진행. 없는데 Mode B/C 선언했으면 FAIL |
| 28 | **모드-산출물 정합성** | sb.md / context에 기록된 모드와 실제 uiImagePath 사용 패턴 일치. Mode A 기록인데 mockup-*.png만 있으면 OK / Mode B 기록인데 screenshot.png 없으면 FAIL / Mode C 기록인데 mockup만 있으면 FAIL (현행 참조 누락) |
| 29 | **overlay 좌표 검증** (Mode B/C) | descriptions[].overlay 사용 시 overlay-helper.js 실행 결과 또는 픽셀 측정 근거가 sources.json/주석에 기록되어야 함. 추정 좌표(top:N% 식의 감) 금지 |
| 30 | **mark-area 범위 정확성** (Mode A/C, mockup HTML 작성 시) | mockup HTML의 .mark-area가 변경 영역만 정확히 감싸는지 확인. 부모 요소 통째로 감싸 어디가 변경인지 알 수 없는 패턴 금지 |
| 31 | **모바일 마커 가시성** | MO 슬라이드의 마커가 가로 스크롤·overflow:hidden·다른 요소에 가려지지 않는지 verify 캡쳐 시각 확인. 가려진 마커 1건이라도 발견 시 FAIL |
| 32 | **Description 잘림 방지** (2026-04-27 강화) | verify.js의 `.description-panel scrollHeight > clientHeight + 30px` ERROR 0건 필수. 30px 초과 잘림은 고객 전달 불가 — DESC_MAX_HEIGHT 보강 또는 splitDescriptions 적용 필수 |
| 33 | **슬라이드 넘버링 정상 표시** (2026-04-27 ERROR 격상) | 모든 슬라이드 우측 하단 `slide-num` 영역이 (1) 텍스트 비어있지 않고 (2) 슬라이드 경계 4px 안쪽에 위치 (3) `.slide-num` 요소 자체 존재 (cover/divider/end 제외). 잘림·빈값·요소 누락 시 ERROR — 고객 전달 직접 영향 |
| 34 | **모바일 폰 프레임 크기 + 잘림** | MO 슬라이드의 폰 프레임 width ≥ 380px, height ≥ 700px 필수. 안에 들어간 UI 이미지가 폰 프레임 bottom 4px 초과로 잘리면 ERROR (verify.js 자동 검출) |
| 35 | **빈 영역 추가 — 인접 UI 명시** (2026-04-27 강화 — KT MVNO 결함 #3 재발 방지) | `changeType: "added"` description은 `label`에 **위·아래 인접 UI 명시 필수**. 예: "기존 메인 배너(위) ↔ 카테고리 아이콘(아래) 사이 공백에 추가". 인접 UI 명시 없으면 ERROR — AI가 "어디 빈 공간인지" 모르는 상태로 작성 차단 |
| 36 | **overlay 좌표 — 추정 절대 금지** (2026-04-27 강화) | Mode B/C에서 overlay 좌표는 다음 중 1개 근거 필수: (a) `overlay-helper.js` 실행 결과 / (b) 픽셀 직접 측정 후 캡쳐 폭 대비 % 계산식 주석 / (c) structure.json 의 element bbox 인용. "감으로 top:N%" 작성 시 ERROR — verify.js의 overlay 위치 시각 검증과 함께 이중 차단 |
| 37 | **변경 영역 ≠ 인접 UI 영역 시각 검증** (2026-04-27 강화) | overlay 영역이 인접 UI를 침범(겹침)하면 ERROR. AI는 SB 생성 직후 verify/{slide}.png를 Read(Vision)으로 열어 "overlay 빨간 박스가 의도한 빈 공간을 정확히 덮는가 / 다른 카드·배너를 침범하지 않는가" 직접 판정. 침범 시 좌표 재계산 후 재생성 |
| 38 | **캡쳐 부재 시 표시·작성 절대 금지** (2026-04-27 강화 — KT MVNO 결함 #1 재발 방지) | Mode B/C 선언 + `uiImagePath` 필드 사용 시 다음 모두 충족 필수: (a) 파일 실제 존재 (b) 크기 ≥ 30KB (빈 페이지·로딩 실패 차단) (c) Vision으로 직접 열어 "URL 상의 실 페이지 캡쳐인지" 확인. 1건이라도 미충족 시 ERROR + SB 생성 중단. 캡쳐 없는 상태에서 마커·overlay·mark-area 표시 절대 금지 — "있다고 가정하고 작성" 패턴 차단 |
| **39** | **시각 표현 슬라이드 모드 선택 검증 — Mode A 단일 표준** (2026-05-12 신설 — Critical / 2026-05-12 정정) | 모든 시각 표현 slide(영역 추가·신규 화면·팝업·모달·바텀시트 등)는 Mode A(HTML 목업+스크린샷+uiImagePath) 사용 필수. wireframe[] 사용 시 다음 명시 선언이 없으면 ERROR: `[프로토타이핑 선언] wireframe[] — 고객 전달 X, 시연 한정`. 변경 케이스별 모드 선택 매트릭스 (§ "화면 표현 모드 분기" 직후 표) 참조. "wireframe[]이 빨라서/팝업은 가능해서" 효율 추구로 룰 우회는 anti-rationalization R5 위반 |
| X1 | 프로젝트명 일관성 | context/project.md 존재 시 Cover 과제명 일치 |
| X2 | FN↔Screen 수량 정합성 | context/fn.md 존재 시 |
| X3 | IA 경로 일관성 | context/ia.md 존재 시 |
| DA1 | 범위 — 누락된 화면/프레임 | PM-OK/WARN/BLOCK |
| DA2 | 우선순위 — 핵심 화면 누락 | PM-OK/WARN/BLOCK |
| DA3 | 가정 — 미확인 UI 패턴 | PM-OK/WARN/BLOCK |

```
═══════════════════════════════════
[Self-Check] plan-sb
═══════════════════════════════════
▶ 입력 검증    V1:{Pass/Fail} V2:{Pass/Fail}
▶ 내부 구조    1~25:{각 Pass/Fail/N/A}
▶ 교차 검증    X1~X3:{각 Pass/Fail/N/A}
▶ PM DA       DA1~DA3:{각 PM-OK/WARN/BLOCK}
───────────────────────────────────
판정: {PASS — n/n} 또는 {FAIL — n/n, 미충족: {항목}}
═══════════════════════════════════
```

## 합리화 방지 (Rationalizations + Red Flags)

> 전역 anti-rationalization.md의 스킬별 구체화. 생성 중 아래 패턴 감지 시 즉시 재검토.

### Rationalizations (변명 vs 반박)

| # | 변명 | 반박 | 대응 |
|---|------|------|------|
| R1 | "wireframe은 대충 그리면 된다" | 와이어프레임 부정확 → 디자인/퍼블 전체 재작업. 화면설계서는 구현의 기준선 | wireframe[] 구성 원칙 5가지 준수 + verify.js 검증 |
| R2 | "Description은 간단히 적으면 된다" | 기능 명세 부족 → 개발자가 임의 구현. 특히 상태 변화/조건 분기 누락 | marker별 items[] 상세 기재. **UI 스펙이 아닌 기능 구현 내용** 중심. 조건/상태/예외 포함 |
| R3 | "MSG Case는 나중에 정의한다" | 비정상 상태(Empty/Error/Loading) 미정의 = 사용자 경험 구멍 | 검색/폼/외부 데이터 화면 → MSG Case 필수 |
| R4 | "기존 JSON을 전체 재생성하는 게 빠르다" | 전체 재생성 = 이전 수정 내용 유실. 기존 JSON 수정 모드 적용 필수 | 해당 screen만 수정, 나머지 보존 |
| R5 | "사용자 의도는 이럴 것이다 (추측)" | 추측이 맞을 확률보다 틀릴 확률이 높다. 틀리면 전체 재작업 | 판단 불확실 시 즉시 질문. "모르면 물어본다" |
| R6 | "포맷 분석 완료 — 대충 봤다" | 메타 테이블 누락, 헤더 불일치를 사용자가 하나씩 지적하는 상황 발생 | 참조 PDF 체크리스트 전 항목 1:1 대조 후 출력 필수 |
| R7 | "default 테마로 충분하다" | 프로젝트 전용 테마가 없으면 default로 먼저 진행하되, 완성 후 수정 제안 | 테마 세팅에 시간 쓰지 말고 산출물 먼저 |

### Red Flags (즉시 중단 신호)

| # | 징후 | 의미 | 조치 |
|---|------|------|------|
| RF1 | wireframe[] 빈 요소 또는 빈 label 존재 | 렌더링 시 빈 블록. 구현 불가 | 모든 요소에 label 필수 |
| RF2 | descriptions marker 수 ≠ wireframe marker 수 | Self-Check #9 Fail. 마커 불일치 | marker 수 1:1 대조 |
| RF3 | 모든 화면에 msgCases: [] | 비정상 상태 전수 스킵 | 검색/폼/목록 화면 최소 1개 MSG Case |
| RF4 | Option B(wfHtml) 남용 | deprecated 방향. flex-direction 상속 버그 위험 | Option A(wireframe[]) 우선 |
| RF5 | Description 테이블 높이 > 900px 예상인데 continuation 없음 | Description 잘림. PDF에서 명세 누락 | 슬라이드 분할 + continuation 필수 |
| RF6 | PDF/PPT 포맷 제공했는데 테마 미생성 | 입력 감지에서 포맷 파일 스킵. 스타일 미반영 | 입력 감지 → 포맷 분석 → 테마 생성 |
| RF7 | Self-Check 형식적 PASS (시각 미확인) | verify.js PASS만으로 끝내고 실제 슬라이드를 열어보지 않음 | generate.js 후 Design 슬라이드를 Read(Vision)으로 열어 "고객에게 보여줄 수 있는가" 판단 |
| RF8 | 영상/이미지 톤을 사이트 테마로 착각 | 히어로 영상이 어두우면 "다크 테마"로 단정. 실제는 라이트 | 영상/이미지 톤 ≠ 사이트 배경 테마. 불확실하면 사용자에게 확인 |
| **RF9** | **시각 표현 슬라이드를 wireframe[]로 작성** (2026-05-12 신설 — Critical, 2026-05-12 정정) | 영역/화면/팝업 추가 모든 케이스에서 "효율 추구"로 Mode A 회피. wireframe[] 결과는 고객 전달 불가 품질 (팝업/모달/바텀시트도 미흡) → 사용자 정정 발생 | **모든 시각 표현은 Mode A로 통일**. HTML 목업 작성 + mockup-capture.js + uiImagePath. wireframe[]는 단기 프로토타이핑(고객 전달 X) + 시간 압박 케이스만 한정 허용 |

## Gotchas (실전 반복 실패 메모)

- **레퍼런스 없이 코드 패치 금지**: 비짓강남에서 template.js 1700줄을 인라인 패치 5차례 → 폐기 수준. **코드 수정 전 레퍼런스/벤치마킹 먼저**.
- **page 전용 엔진에 비표준 UI 강제 금지**: containerType(chatbot-panel) 같은 비표준 타입을 page 엔진에 억지로 끼우면 렌더링 깨짐. 엔진 한계 확인 후 대안 경로(직접 HTML 생성) 검토.
- **렌더링 결과 브라우저 실측 필수**: verify 축소판과 실제 브라우저 출력 괴리. 브라우저에서 실측.
- **ref PDF 레이아웃 추측 금지**: PDF 슬라이싱이 부정확하면 2슬라이드가 합쳐져 보일 수 있다. 불확실하면 코드 수정 전에 사용자에게 확인. "일치합니다"라고 단정 전에 실제 시각 결과물을 열어서 확인.
- **기획 방향 먼저, 도구 나중**: JSON/overlay/렌더링 반복 수정 전에 변경 범위·항목·UI 컨셉을 먼저 확정. 기획 없이 도구를 돌리면 범위 초과·UI 불일치·구조 오류가 연쇄 발생.
- **임의 기능 추가 금지**: 요청에 없는 기능(비교담기 등)을 임의로 추가하지 않는다.
- **Mode B(현행 이미지)에서 overlay 빠뜨리지 않기**: uiImagePath만 넣고 overlay 좌표를 안 넣으면 마커 없는 이미지만 나온다. "어디가 바뀌는지" 표시가 안 되면 화면설계서가 아니라 스크린샷.
- **이미지 하단 빈 공간**: 캡쳐 이미지가 와이어프레임 영역보다 짧으면 회색 빈 공간이 생긴다. 캡쳐 시 해당 영역만 크롭하거나, full-page 캡쳐 시 dim 배경까지 포함됐는지 확인.

## 참조

- wireframe 패턴 1~10 + CSS 클래스 + Option B HTML 예시: `references/wireframe-patterns.md`
- 예시 데이터: `example/v2-1-e2e-test.json`
- element 타입 단일 소스: `scripts/lib/element-types.js`
