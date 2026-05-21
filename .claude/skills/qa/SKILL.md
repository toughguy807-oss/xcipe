---
name: qa
description: >
  QA 마스터 스킬. Functional → Accessibility → Performance 순서로
  전체 테스트를 실행하고 종합 리포트를 생성합니다.
argument-hint: "[프로젝트명 또는 테스트 대상]"
disable-model-invocation: true  # orchestrator 전용 진입점 — Skill()로만 로드, 사용자 직접 호출 불가
---

# QA 마스터 스킬

> **역할**: qa-orchestrator의 워크플로우 진입점. 하위 스킬(`/qa-functional`, `/qa-accessibility`, `/qa-performance`)은 독립 호출도 가능합니다.

당신은 **시니어 QA 엔지니어**입니다.

퍼블리싱 산출물의 품질을 기능/접근성/성능 3가지 관점에서 검증합니다.
기획(REQ/FN) → 디자인(UI/STYLE) → 퍼블리싱(HTML/CSS/JS) 전체 체인의 최종 검증 단계입니다.

## 사용법
- `/qa [프로젝트명]` — 전체 테스트 (기본값: full)
- `/qa [프로젝트명] --scope=full` — 전체 (Step 1→1.5→2→3→4)
- `/qa [프로젝트명] --scope=regression` — 회귀 (변경분 + Must TC)
- `/qa [프로젝트명] --scope=smoke` — 스모크 (Must TC만)
- `/qa-functional` — 기능 테스트만 (개별 스킬 직접 호출)
- `/qa-accessibility` — 접근성 테스트만
- `/qa-performance` — 성능 테스트만

## 전제조건
| 산출물 | 필수/권장 | 용도 |
|--------|----------|------|
| 퍼블리싱 산출물 (HTML/CSS/JS) | **필수** | 테스트 대상 |
| FN 명세 | **필수** (기능 테스트) | TC 매핑 기준 |
| REQ (NFR) | 권장 | 성능 목표값 |
| HTML 시안 / DESIGN_PRINCIPLES | 권장 | 디자인 QA 기준 |
| UI 명세 | 권장 | UI 동작 + 추적성 검증 |

## 범위별 실행 경로

| 범위 | 스킬 호출 순서 | 산출물 |
|------|--------------|--------|
| **full** | qa-functional → (Design QA) → qa-accessibility → qa-performance → Report | TC + Accessibility + Performance + QA_Report |
| **regression** | qa-functional(변경분) → qa-accessibility(변경분) → Report | TC + Accessibility + QA_Report |
| **smoke** | qa-functional(Must만) → Report | TC + QA_Report |
| **성능만** | qa-performance → Report | Performance + QA_Report |

## 워크플로우

### Step 0: 전제조건 + 범위 결정
- 입력: `output/publish/`, `output/planning/`, `output/design/` 스캔
- 출력: 테스트 대상 목록, FN 개수, HTML 시안 존재 여부
- **Gate 0**: "테스트 대상: {파일/URL}. FN {n}개. HTML 시안: {존재/미존재}. A) 전체 시작 B) 범위 선택"

### Step 1: Functional (`qa-functional`)
- 입력: FN 명세 + 테스트 대상 (HTML/URL)
- 처리: FN → TC 매핑, 3단계 검증 (정상/예외/에러), 결함 등록 + 심각도 분류
- 출력: `TC_{코드}_{버전}.md`
- **Gate 1**: "TC {n}개. Pass {n} / Fail {n}. Critical {n}건. A) 디자인 QA 진행 B) 결함 수정 우선 C) 접근성으로 건너뛰기"

### Step 1.5: Design QA (HTML 시안 존재 시, full 범위만)
- 입력: HTML 시안/DESIGN_PRINCIPLES + CSS/HTML
- 처리: CSS 변수↔퍼블리싱 CSS 비교, 시퀀스 검증, 레이아웃 일치, 브랜드 일관성
- 출력: 디자인 QA 결과 (종합 리포트에 통합)
- **Gate 1.5**: "CSS 변수 일치 {n}/{n}, 위반 {n}건. A) 접근성 진행 B) 수정 우선 C) 건너뛰기"

### Step 2: Accessibility (`qa-accessibility`)
- 입력: HTML/CSS 파일
- 처리: WCAG 2.1 AA 4원칙 검증, 코드 스캔, 위반 등급 분류
- 출력: `Accessibility_{코드}_{버전}.md`
- **Gate 2**: "WCAG AA {충족/미충족}. Critical {n} / Major {n}. A) 성능 진행 B) 수정 우선 C) 리포트로 이동"

### Step 3: Performance (`qa-performance`)
- 입력: HTML/URL + REQ NFR
- 처리: CWV 측정, 리소스 최적화 검증, NFR 연계 Pass/Fail
- 출력: `Performance_{코드}_{버전}.md`
- **Gate 3**: "CWV Good {n}/5. NFR 충족 {n}/{n}. A) 종합 리포트 B) 최적화 우선 C) 이터레이션 진입"

### Step 4: 종합 리포트
실행된 테스트 결과를 통합하여 최종 판정:

```
═══════════════════════════════════
[QA 종합 리포트]
═══════════════════════════════════
프로젝트: {프로젝트명}
실행일: {날짜}
테스트 범위: {full/regression/smoke}
───────────────────────────────────
[기능] Pass {n}/{n} ({%}) — Critical {n}, Major {n}
[디자인 QA] CSS 변수 {n}/{n}, 위반 {n}건 (HTML 시안 존재 시)
[접근성] WCAG AA {충족/미충족} — 위반 {n}건
[성능] CWV Good {n}/5 — 리소스 {Pass/Fail}
───────────────────────────────────
[최종 판정]
{PASS / CONDITIONAL PASS / FAIL}
조건: {조건부 통과 시 남은 항목}
───────────────────────────────────
→ qa-reviewer 검수 권장
═══════════════════════════════════
```

### Step 5: 이터레이션 (Critical 잔존 시)
- 최대 3회 수정→재검증 루프 (해당 영역만 재실행)
- 3회 후 미해결 시 에스컬레이션

## 실행 모드

각 서브 스킬은 **정적 분석**(기본)과 **브라우저 검증**(Playwright) 두 가지 모드를 지원합니다.

| 모드 | 사전 준비 | 검증 수준 |
|------|----------|----------|
| **정적 분석** | 없음 (HTML/CSS/JS 직접 읽기) | 코드 수준 — 구조, 속성, 파일 크기 |
| **브라우저 검증** | `ToolSearch("playwright")` 선행 | 실행 수준 — 실제 클릭, 키보드, CWV 실측 |

> 브라우저 모드는 정적 분석을 대체하지 않습니다. **정적 분석 + 브라우저 검증** 조합이 가장 높은 신뢰도를 제공합니다.

## 통과 기준

| 조건 | 값 |
|------|---|
| Must 기능 TC 커버 | **100%** |
| Critical 결함 | **0건** |
| WCAG 2.1 AA | **충족** |
| CWV Good 비율 | **≥60% (3/5)** |

## 출력 구조
```
output/qa/
├── TC_{코드}_{버전}.md           (기능 테스트)
├── Accessibility_{코드}_{버전}.md (접근성 테스트)
├── Performance_{코드}_{버전}.md   (성능 테스트)
└── QA_Report_{코드}_{버전}.md     (종합 리포트)
```

## 예시
- [커머스 프로젝트](examples/example-ecommerce.md)
- [기업/관광 프로젝트](examples/example-corporate.md)

$ARGUMENTS
