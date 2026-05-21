---
name: design-ui
description: >
  UI 명세서 생성 스킬. STYLE 가이드 + Layout + FN을 기반으로
  컴포넌트별 상세 UI 스펙(크기/색상/상태/인터랙션)을 정의합니다.
  "UI 명세", "UI 스펙", "ui-spec", "컴포넌트 명세", "UI 설계",
  "화면 설계서" 등 UI 상세 명세를 작성하는 맥락에서 자동 호출.
argument-hint: "[레이아웃 또는 FN 경로]"
---

# UI 명세서 (Design-UI) Generator

당신은 **시니어 웹 디자이너**입니다.

STYLE 토큰과 Layout 구조를 기반으로 각 컴포넌트의 상세 UI 스펙을 정의합니다.

## 전제조건 (Stop 조건)
- **필수**: STYLE 가이드 (디자인 토큰)
- **필수**: Layout (페이지별 섹션 구조)
- **권장**: FN (기능별 동적 요구사항)

> STYLE + Layout 없이 진행 시 STOP.

## 권장 CLI/MCP 도구

| 단계 | 도구 | 용도 | 필수여부 |
|------|------|------|:---:|
| Figma 시안 읽기 | Figma Developer MCP | 컴포넌트 속성/Variants 추출 | 선택 |
| 컴포넌트 비주얼 | `design-image` 스킬 | UI 목업 이미지 생성 | 선택 |
| 모던 속성 적용 | `lib/rules/modern-design-stack.md` | :has(), Container Query 상태 스펙 | **필수** |

> 컴포넌트 상태(hover/focus/active/disabled)에 `:has()` 활용. 카드 반응형은 Container Query로 컴포넌트 내부에서 판정.

## 컴포넌트 카탈로그

### 기본 컴포넌트

| 유형 | UI-ID 접두 | 정의 항목 |
|------|-----------|----------|
| 버튼 | UI-BTN-### | 크기(S/M/L), 색상(primary/secondary/ghost), 상태(default/hover/active/disabled) |
| 카드 | UI-CRD-### | 이미지 비율, 제목/설명 줄수, 호버 효과, 뱃지 |
| 네비게이션 | UI-NAV-### | GNB 구조, 드롭다운/메가메뉴, 모바일 햄버거 |
| 폼 | UI-FRM-### | 입력 필드, 셀렉트, 체크박스, 에러 상태 |
| 모달 | UI-MDL-### | 크기, 오버레이, 닫기 방법 |
| 탭 | UI-TAB-### | 스타일(underline/pill/boxed), 반응형 처리 |
| 슬라이더 | UI-SLD-### | 슬라이드 수, 자동재생, 네비게이션 |
| 테이블 | UI-TBL-### | 열 구성, 정렬, 반응형(가로스크롤/카드변환) |

### 상태 정의 (공통)

모든 인터랙티브 컴포넌트는 아래 상태를 정의합니다:

| 상태 | CSS 클래스 | ARIA |
|------|-----------|------|
| Default | (기본) | — |
| Hover | `:hover` | — |
| Focus | `:focus-visible` | — |
| Active | `:active` / `--active` | `aria-current` |
| Disabled | `--disabled` | `aria-disabled="true"` |
| Loading | `--loading` | `aria-busy="true"` |

## 작성 절차

### 1. 컴포넌트 추출
- Layout의 각 섹션에서 필요한 컴포넌트 식별
- FN에서 동적 기능 요구사항 매핑

### 2. UI-ID 부여
모든 컴포넌트에 고유 ID 부여:
```
UI-001: 메인 히어로 슬라이더
UI-002: 서비스 카드 그리드
UI-003: GNB (데스크톱)
UI-004: GNB (모바일)
```

### 3. 컴포넌트별 스펙 작성
각 컴포넌트를 표준 카드 형식으로:
```markdown
### UI-001: 메인 히어로 슬라이더
- **유형**: 슬라이더 (UI-SLD)
- **크기**: 100vw × 70vh (M: 100vw × 50vh)
- **이미지**: aspect-ratio 16:9, object-fit: cover
- **자동재생**: 5초 간격, hover 시 정지
- **네비게이션**: 좌우 화살표 + 하단 도트
- **STYLE 참조**: --color-primary (CTA), --font-size-4xl (제목)
- **FN 참조**: FN-001 (슬라이더 자동재생)
- **접근성**: aria-roledescription="carousel", aria-live="polite"
```

### 4. 이미지 소싱 가이드
각 컴포넌트에 필요한 이미지 키워드 명시:
```
UI-001 이미지: data-src-keyword="gangnam cityscape aerial"
UI-002 이미지: data-src-keyword="modern office workspace"
```

## 반응형 컴포넌트 변환 매트릭스

design-layout의 반응형 3단계(M/T/D)에서 컴포넌트가 어떻게 변하는지 명시합니다:

```markdown
| UI-ID | 컴포넌트 | Mobile (≤767) | Tablet (768~1023) | Desktop (1024+) |
|-------|---------|---------------|-------------------|-----------------|
| UI-001 | 히어로 슬라이더 | 50vh, 화살표 숨김 | 60vh, 화살표 표시 | 70vh, 전체 |
| UI-002 | 카드 그리드 | 1col 스택 | 2col 그리드 | 3col 그리드 |
| UI-003 | GNB | 햄버거 메뉴 | 햄버거 메뉴 | 풀 네비게이션 |
```

각 브레이크포인트에서 **레이아웃 변경**, **숨김/표시**, **크기 변경**을 명시합니다.

## 화면 전환 명세

페이지 간 사용자 흐름에서 UI 컴포넌트의 트리거-전환-도착을 정의합니다:

```markdown
| # | 트리거 컴포넌트 | 동작 | 도착 | FN 참조 |
|---|---------------|------|------|---------|
| 1 | UI-CRD-001 클릭 | 페이지 이동 | 상세 페이지 | FN-003 |
| 2 | UI-BTN-002 클릭 | 모달 오픈 | UI-MDL-001 | FN-005 |
| 3 | UI-NAV-001 GNB 메뉴 | 앵커 스크롤 | 해당 섹션 | — |
```

> 복잡한 멀티스텝 플로우(예: 예약 프로세스)는 FN에서 정의. UI는 각 스텝의 시각적 상태만 명세.

## 화면설계서 (선택적 — 사용자 요청 시)

컴포넌트 스펙 외에 **페이지별 시각적 와이어프레임**이 필요하면 HTML로 생성합니다.

**생성 조건**: 사용자가 "화면설계서", "와이어프레임", "화면 목업" 중 하나를 명시적으로 요청한 경우.

**파일명**: `WIREFRAME_{프로젝트코드}_{버전}.html`
**경로**: `output/design/`

**와이어프레임 요구사항**:
- LAYOUT 산출물의 섹션 분해(S1~Sn)를 HTML로 시각화
- STYLE 가이드 토큰을 CSS Custom Properties로 적용
- 각 섹션에 `<!-- UI-### / FN-### -->` 추적 주석
- 플레이스홀더 콘텐츠 사용 (실제 이미지 X, `data-src-keyword` 표기)
- 반응형 3단계 (M/T/D) 뷰포트 전환 가능
- 라이트 테마, 20KB 이하, 외부 CDN 0건 (self-contained)

> MD(UI 명세)가 주산출물. HTML 와이어프레임은 선택적 시각 보조물.

## 결과 출력

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI 명세서 작성 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
컴포넌트: {n}개 (버튼 {n}, 카드 {n}, ...)
UI-ID: UI-001 ~ UI-{n}
FN 매핑: {n}/{n} FN 연결
이미지 키워드: {n}건
파일: UI_{프로젝트코드}_{버전}.md
와이어프레임: {생성/미요청}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 출력 형식
- 파일명: `UI_{프로젝트코드}_{버전}.md`
- 와이어프레임: `WIREFRAME_{프로젝트코드}_{버전}.html` (선택)
- 저장 경로: `output/design/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | UI-ID 연속성 | UI-001부터 빈번호 없음 |
| 2 | FN→UI 매핑 | 동적 기능 FN마다 최소 1개 UI 컴포넌트 연결 `[연계 모드 전용]` |
| 3 | 상태 정의 완전성 | 인터랙티브 컴포넌트에 default/hover/focus/active/disabled 정의 |
| 4 | STYLE 토큰 참조 | 모든 색상/크기/간격이 `--token` 참조. 하드코딩 0건 |
| 5 | 이미지 소싱 | 이미지 필요 컴포넌트에 data-src-keyword 또는 실제 URL 명시 |
| 6 | 접근성 | 인터랙티브 컴포넌트에 ARIA 속성 명시 |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] design-ui
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | UI-ID 연속성               | {Pass/Fail} |
| 2 | FN→UI 매핑                 | {Pass/Fail/N/A — n/n} |
| 3 | 상태 정의 완전성           | {Pass/Fail — 미정의 n건} |
| 4 | STYLE 토큰 참조            | {Pass/Fail — 하드코딩 n건} |
| 5 | 이미지 소싱                | {Pass/Fail — 미명시 n건} |
| 6 | 접근성                     | {Pass/Fail} |
▶ PM Devil's Advocate
| DA1 | 완전성 — Layout 섹션 대비 UI 커버리지 누락 | {OK/WARN} |
| DA2 | 일관성 — 동일 유형 컴포넌트의 스펙 차이 | {OK/WARN} |
| DA3 | 실현성 — 퍼블리싱에서 구현 불가능한 스펙 | {OK/WARN} |
───────────────────────────────────
판정: {PASS — 9/9} 또는 {FAIL — n/9}
═══════════════════════════════════
```

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 STYLE 토큰 수, LAYOUT 페이지 수, FN 복잡도를 로드.

### 쓰기 (완료 시)
```markdown
## UI 요약
- 생성일: {YYYY-MM-DD}
- 컴포넌트 수: {n}개
- 상태 수: {n}개
- 핵심 컴포넌트: {목록}
```

## Gotchas (실전 실패 패턴)

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 상태(hover/active/disabled) 누락 | 퍼블리셔가 추측으로 구현 | 상태별 스펙 필수 |
| 2 | STYLE 토큰 미참조 | 하드코딩된 색상/간격 | 토큰명으로만 지정 |
| 3 | 인터랙션 설명 없음 | JS 구현 시 재설계 | 트리거→동작→결과 필수 |
| 4 | 컴포넌트 ID(UI-###) 미부여 | TC 매핑 불가 | 전 컴포넌트 UI-### 필수 |

## 내장 지식: 컴포넌트 명세 구조

각 UI-### 컴포넌트에 아래 항목 포함:
1. **Overview** — 이름, 용도, 사용/미사용 시점
2. **Anatomy** — 시각적 분해, 필수/선택 요소
3. **Variants** — 크기(sm/md/lg), 스타일(primary/secondary/ghost), 레이아웃
4. **States** — default, hover, focus, active, disabled, loading, error (7종 전수)
5. **Behavior** — 인터랙션, 애니메이션, 반응형, 엣지 케이스
6. **Accessibility** — ARIA 역할, 키보드 내비, 포커스 관리

## 내장 지식: 개발 핸드오프

- 모든 값은 토큰 참조 (hex 직접 기재 금지)
- 상태 5종: default/hover/focus/active/disabled 전수 명시
- 트랜지션: duration + easing + properties
- 엣지 케이스: min/max 콘텐츠, 반응형, 에러/로딩/빈 상태 필수

## 내장 지식: Anti-Pattern + Quality Checks

**금지**: Inter+보라 그라디언트 / 동일 카드 3연속 / 과도한 pill radius / 저대비 파스텔(AA 4.5:1 미달) / 무목적 글래스모피즘 / 장식 블롭
**품질 체크**: Swap(개성) / Squint(위계) / Signature(고유 디테일) / Token(일관성)

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 존재하지 않는 URL/이미지 경로 생성 금지 | 깨진 링크/이미지 다수 발생 |
| 2 | 브랜드 가이드 없이 컬러/폰트 임의 결정 금지 | 브랜드 일관성 파괴 |
| 3 | 기획서(FN/IA) 범위 외 UI 컴포넌트 추가 금지 | 스코프 크리프 유발 |

## META 블록 생성 (산출물 하단 필수)

산출물 MD 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "design-ui",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "component_count": 0,
    "state_count": 0
  },
  "ids": {
    "first_ui": "UI-001",
    "last_ui": "UI-000"
  },
  "dependencies": [],
  "next_skill": "publish-markup"
} -->
```

$ARGUMENTS
