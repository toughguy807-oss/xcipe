---
name: qa-accessibility
description: >
  접근성 테스트 스킬. WCAG 2.1 AA 4원칙(인식/운용/이해/견고) 기준으로
  웹 접근성을 검증하고, 위반 항목별 수정 가이드를 제공합니다.
  "접근성", "accessibility", "a11y", "WCAG", "웹 접근성",
  "접근성 검사", "접근성 테스트", "스크린리더", "키보드 접근성" 등
  웹 접근성을 검증하거나 WCAG 준수를 확인하는 맥락에서 자동 호출.
argument-hint: "[HTML 파일경로 또는 URL]"
---

# 접근성 테스트 (QA-Accessibility) Generator

당신은 **시니어 QA 엔지니어**입니다.

WCAG 2.1 AA 기준으로 웹 접근성을 검증합니다.

## 전제조건 (Stop 조건)
- **필수**: 테스트 대상 HTML 파일 또는 접근 가능한 URL
- **권장**: 퍼블리싱 산출물 (CSS — 색상 대비 확인용)
- **선택**: UI 명세 (의도된 디자인과의 비교)

> HTML 파일이 없으면 접근성 검증이 불가합니다.

## 실행 모드

| 모드 | 방법 | 검증 범위 | 사용 시점 |
|------|------|----------|----------|
| **정적 분석** (기본) | HTML/CSS 코드 직접 읽기 | 구조적 접근성 (alt, lang, ARIA, heading) | 항상 가능 |
| **브라우저 검증** | Playwright로 실제 브라우저 실행 | 런타임 접근성 (키보드 내비, 포커스, 동적 ARIA) | 인터랙티브 요소 검증 |

### 브라우저 모드 검증 절차
1. `ToolSearch("playwright")` → Playwright 도구 로딩
2. `browser_navigate("file:///{절대경로}/output/publish/index.html")`
3. **접근성 트리 확인**: `browser_snapshot` → 스크린리더가 읽는 구조 확인
4. **키보드 내비게이션 테스트**:
   - `browser_press_key("Tab")` 반복 → 포커스 순서 기록
   - 각 포커스 요소에서 `browser_snapshot` → 포커스 표시 + ARIA 상태 확인
   - `browser_press_key("Escape")` → 모달/드롭다운 탈출 확인 (키보드 트랩 검증)
   - `browser_press_key("Enter")` → 버튼/링크 활성화 확인
5. **색상 대비 실측**: `browser_evaluate("getComputedStyle(el).color / backgroundColor")` → 대비비 계산
6. **동적 ARIA 확인**: `browser_evaluate("el.getAttribute('aria-expanded')")` → 상태 변화 확인
7. **반응형 접근성**: `browser_resize({width: 375})` → 모바일에서 건너뛰기 링크/포커스 유지 확인

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수여부 |
|------|------|------|------|:---:|
| 자동 검사 | npx | `npx @axe-core/cli http://localhost:8080` | WCAG 2.1 AA 자동 스캔 | 권장 |
| Lighthouse 연동 | `qa-lighthouse` | Accessibility 카테고리 점수 | 실측 점수 공급 | 권장 |
| 키보드 내비게이션 | Playwright MCP | `browser_press_key("Tab")` | Tab 순서 실측 | 선택 |
| 색상 대비 | Playwright MCP | `browser_evaluate` + getComputedStyle | 대비비 계산 | 선택 |
| 로컬 서버 | npx | `npx http-server output/publish` | axe-core 대상 | 권장 |

## 검증 절차

### 1. 자동 검증 (코드 스캔)
HTML/CSS 파일을 직접 분석하여 위반 사항 검출:

| 항목 | 검증 방법 | 판정 기준 |
|------|----------|----------|
| `<img>` alt | `alt` 속성 존재 여부 | 100% 필수 |
| 제목 계층 | h1~h6 순서 | 건너뜀 0건 |
| lang 속성 | `<html lang="">` | 존재 필수 |
| 색상 대비 | CSS 색상값 추출 → 대비비 계산 | 본문 4.5:1, 대형 3:1 |
| 포커스 스타일 | `:focus-visible` 정의 여부 | 존재 필수 |
| ARIA 사용 | `role`, `aria-*` 올바른 사용 | 잘못된 ARIA 0건 |
| 건너뛰기 링크 | `.skip-link` 존재 | 존재 필수 |
| 폼 레이블 | `<label>` + `for` 연결 | 100% 필수 |

### 2. WCAG 4원칙 검증

#### 인식 가능 (Perceivable)
- [ ] 모든 이미지에 대체 텍스트 (`alt`, 장식은 `alt=""`)
- [ ] 색상만으로 정보 전달하지 않음 (아이콘/텍스트 보충)
- [ ] 텍스트 색상 대비 4.5:1 이상 (대형 텍스트 3:1)
- [ ] 미디어에 자막/대체 텍스트 제공
- [ ] 텍스트 200% 확대 시 콘텐츠 손실 없음

#### 운용 가능 (Operable)
- [ ] 모든 기능에 키보드 접근 가능
- [ ] 키보드 트랩 없음 (Escape로 탈출 가능)
- [ ] 포커스 표시 명확 (outline 2px+)
- [ ] 건너뛰기 링크로 본문 바로가기 가능
- [ ] 자동 재생 콘텐츠에 중지 가능
- [ ] 충분한 시간 제공 (타이머에 연장/중지 기능)

#### 이해 가능 (Understandable)
- [ ] `<html lang="ko">` (또는 해당 언어) 선언
- [ ] 폼 입력 필드에 레이블 연결
- [ ] 에러 메시지가 구체적 (무엇이 잘못되었고, 어떻게 수정)
- [ ] 일관된 내비게이션 패턴
- [ ] 예측 가능한 동작 (focus 시 컨텍스트 변경 없음)

#### 견고성 (Robust)
- [ ] HTML 유효성 (중복 ID 없음, 닫히지 않은 태그 없음)
- [ ] ARIA 올바른 사용 (`role` + 필수 `aria-*` 쌍 일치)
- [ ] 보조 기술 호환 (스크린리더로 콘텐츠 접근 가능)

### 3. 위반 등급 분류

| 등급 | WCAG 레벨 | 예시 |
|------|----------|------|
| **Critical** | A 위반 | alt 누락, 키보드 접근 불가, lang 미선언 |
| **Major** | AA 위반 | 색상 대비 미달, 포커스 미표시, 건너뛰기 링크 없음 |
| **Minor** | AA 권장 미달 | 링크 목적 불명확, ARIA 미사용 (사용 가능한 곳) |
| **Info** | AAA 권장 | 색상 대비 7:1 미달, 텍스트 간격 최적화 |

## 결과 출력

```
═══════════════════════════════════
[접근성 테스트 결과]
═══════════════════════════════════
테스트 대상: {파일/URL}
기준: WCAG 2.1 AA
실행일: {날짜}
───────────────────────────────────
[4원칙 결과]
인식 가능: {Pass/Fail} — 위반 {n}건
운용 가능: {Pass/Fail} — 위반 {n}건
이해 가능: {Pass/Fail} — 위반 {n}건
견고성:    {Pass/Fail} — 위반 {n}건
───────────────────────────────────
[위반 현황]
Critical: {n} | Major: {n} | Minor: {n} | Info: {n}
───────────────────────────────────
[주요 위반 상세]
{위반 항목별: 위치, WCAG 기준, 수정 가이드}
───────────────────────────────────
[판정]
WCAG 2.1 AA: {충족 / 미충족}
═══════════════════════════════════
```

## 출력 형식
- 파일명: `Accessibility_{프로젝트코드}_{버전}.md`
- 저장 경로: `output/qa/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 4원칙 커버리지 | 인식/운용/이해/견고 4원칙 모두 검증 수행 (0원칙 스킵 없음) |
| 2 | 위반 분류 완전성 | 모든 위반에 등급(Critical/Major/Minor/Info) + WCAG 기준번호 부여 |
| 3 | 수정 가이드 | 모든 Critical/Major 위반에 구체적 수정 코드/방법 제시 |
| 4 | alt 전수 검사 | 모든 `<img>` 태그에 대해 alt 존재 여부 확인 (100%) |
| 5 | 제목 계층 | h1~h6 순서 검증 + 건너뜀 건수 명시 |
| 6 | 색상 대비 | 본문(4.5:1), 대형 텍스트(3:1) 대비비 실제 계산 또는 추정 |
| 7 | 키보드 접근 | 인터랙티브 요소(링크/버튼/폼/탭/모달) 키보드 도달 가능 여부 검증 |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] qa-accessibility
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | 4원칙 커버리지              | {Pass/Fail — 스킵 원칙: xxx} |
| 2 | 위반 분류 완전성            | {Pass/Fail — 미분류 n건} |
| 3 | 수정 가이드                 | {Pass/Fail — 미제시 n건} |
| 4 | alt 전수 검사               | {Pass/Fail — n/n} |
| 5 | 제목 계층                   | {Pass/Fail — 건너뜀 n건} |
| 6 | 색상 대비                   | {Pass/Fail — 미달 n건} |
| 7 | 키보드 접근                 | {Pass/Fail — 미도달 n건} |
▶ PM Devil's Advocate
| DA1 | 런타임 — 정적 분석으로 잡을 수 없는 동적 접근성 이슈 식별 | {OK/WARN — 사유} |
| DA2 | 대비 — 색상 대비를 실제 계산했는가 vs 추정에 그쳤는가     | {OK/WARN — 사유} |
| DA3 | 트랩 — 모달/드롭다운에서 키보드 트랩 가능성 검증 여부     | {OK/WARN — 사유} |
───────────────────────────────────
판정: {PASS — 10/10} 또는 {FAIL — n/10}
═══════════════════════════════════
```

### 상세 체크리스트
전체 항목: [checklist.md](checklist.md) 참조 (reviewer 검수 시 사용)

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 MARKUP ARIA 속성 수, UI 컴포넌트 수를 로드.

### 쓰기 (완료 시)
```markdown
## QA-A 요약
- 생성일: {YYYY-MM-DD}
- 위반 수: {n}건
- Critical/Major/Minor: {n}/{n}/{n}
```

## 내장 지식: 접근성 검증 판단 기준

### 자동 vs 수동 검증 범위
| 자동 도구(axe/Lighthouse)가 잡는 것 | 수동으로만 잡히는 것 (30%+) |
|-----------------------------------|--------------------------|
| 색상 대비 수치 | 논리적 읽기 순서 |
| alt 속성 존재 여부 | alt 텍스트 품질 ("이미지" ← 무의미) |
| ARIA 속성 문법 | ARIA 의미적 정확성 |
| lang 속성 존재 | 다국어 콘텐츠 전환 UX |
| 폼 label 연결 | 에러 메시지 명확성 |

→ **자동 도구 Pass = 접근성 Pass가 아니다.** 반드시 수동 병행.

### 우선순위 판단
| 심각도 | 기준 | 예시 |
|--------|------|------|
| Critical | 콘텐츠 접근 불가 | 키보드로 네비 불가, 스크린리더에 빈 페이지 |
| Major | 기능 사용 어려움 | 포커스 트랩, 대비 3:1 미달, 터치 타겟 28px |
| Minor | 불편하지만 사용 가능 | 포커스 순서 비직관적, 장식 이미지에 불필요한 alt |

### WCAG 4원칙 체크 순서
1. **인식(Perceivable)**: 모든 정보가 텍스트 대안 있는가? 색상만으로 정보 전달하지 않는가?
2. **운용(Operable)**: 키보드만으로 모든 기능 사용 가능한가? 포커스 표시 보이는가?
3. **이해(Understandable)**: 에러 메시지가 구체적인가? 일관된 네비게이션인가?
4. **견고(Robust)**: 유효한 HTML인가? ARIA가 올바르게 사용되었는가?

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 자동 도구(axe)만 의존 | 수동 검증 필요 항목 30%+ 누락 | 자동 + 수동 병행 |
| 2 | 색상 대비만 검사 | 키보드/스크린리더 미검증 | 4원칙(인식/운용/이해/견고) 전수 |
| 3 | 모바일 접근성 미검증 | 터치 타겟 44px 미달 | 모바일 뷰포트에서 별도 검증 |
| 4 | alt 텍스트 "이미지" | 정보 전달 실패 | 이미지 내용을 설명하는 alt |

## 외부 참조 (검증 기준 보강)

| 레퍼런스 | 경로 | 활용 |
|---------|------|------|
| **accessibility-audit** | `~/.claude/skills/designer-skills-collection/design-systems/skills/accessibility-audit/SKILL.md` | WCAG 2.2 POUR 프레임워크, 심각도 등급 (Critical/Major/Minor), 수정 가이드 |
| **accessibility-test-plan** | `~/.claude/skills/designer-skills-collection/prototyping-testing/skills/accessibility-test-plan/SKILL.md` | 4계층 테스트 (자동/수동/보조기기/사용자), 테스트 매트릭스, WCAG 체크리스트 |
| **design-qa-checklist** | `~/.claude/skills/designer-skills-collection/design-ops/skills/design-qa-checklist/SKILL.md` | 접근성 QA 카테고리 (ARIA/대비/포커스/키보드/reduced-motion) |

### 4계층 접근성 테스트 (accessibility-test-plan 참조)
1. **자동화 검사**: axe-core, Lighthouse, WAVE 등 도구
2. **수동 검사**: 키보드 내비게이션, 포커스 순서, 시각적 점검
3. **보조기기 테스트**: 스크린리더(NVDA/VoiceOver), 화면 확대, 색각이상 시뮬
4. **사용자 테스트**: 장애 사용자 포함 유저빌리티 테스트

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 테스트 미실행 상태에서 Pass 판정 금지 | 품질 보증 무효화 |
| 2 | 존재하지 않는 파일/URL 참조 금지 | 검증 불가한 결과 |
| 3 | Critical 결함을 임의로 등급 하향 금지 | 출시 후 장애 위험 |

## META 블록 생성 (산출물 하단 필수)

산출물 MD 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "qa-accessibility",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "violation_count": 0,
    "critical": 0,
    "major": 0,
    "minor": 0
  },
  "dependencies": [],
  "next_skill": "qa-performance"
} -->
```

## 흔한 AI 실수 — 실전 사례

- **터치 타겟 44px 미달**: 비짓강남 닫기 버튼 26px (P1 Major). 모든 인터랙티브 요소의 터치 타겟 최소 44x44px 검증 필수.
- **`<html lang>` 미갱신**: 다국어 전환 시 lang 속성이 갱신되지 않는 패턴. 비짓강남 발견.
- **SVG `<title>` 누락**: 아이콘 버튼 내 SVG에 `<title>` 미부여 → 스크린리더 인식 불가. 카페예약 발견.
- **`aria-live` 영역 미존재**: 동적 콘텐츠 변경(검색 결과, 알림) 시 `aria-live="polite"` 영역 필수. 카페예약 발견.
- **검색 입력 시각적 경계**: 입력 필드의 시각적 경계 미표시는 1.4.11 위반. 카페예약 발견.

$ARGUMENTS
