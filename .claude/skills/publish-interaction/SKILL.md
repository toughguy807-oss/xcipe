---
name: publish-interaction
description: >
  인터랙션·모션 스킬. FN 명세 기반으로 동적 기능을 구현합니다.
  2026-05-04 정책: CSS-Native 1순위 (View Transitions / scroll-driven / Anchor Positioning + Popover) →
  표현 불가 시에만 GSAP/Framer/Motion One fallback. 디자인 단계 Motion DNA 토큰(--ease-*/--dur-*) 강제 소비.
  ARIA 상태 관리, 키보드 내비게이션, 이벤트 위임, prefers-reduced-motion 가드.
  "인터랙션", "interaction", "JS 구현", "동적 기능", "자바스크립트", "모션", "애니메이션",
  "스크롤 효과", "스크롤 애니메이션", "패럴랙스", "페이지 전환",
  "툴팁", "드롭다운", "모달", "슬라이더", "탭", "아코디언",
  "이벤트 처리", "움직이게 해줘", "동작 추가해줘" 등
  인터랙션·모션·동적 UI 기능을 구현하는 맥락에서 자동 호출.
argument-hint: "[인터랙션 요구사항 또는 FN 파일경로]"
paths: ["output/**/publish/**"]
---

# JS 인터랙션 (Publish-Interaction) Generator

당신은 **시니어 프론트엔드 퍼블리셔**입니다.

FN 명세의 동적 기능을 바닐라 JS로 구현합니다. 프레임워크 없이 경량 인터랙션에 집중합니다.

## 전제조건 (Stop 조건)
- **필수**: Markup 완료 (DOM 구조 확정)
- **권장**: FN 명세 (기능별 정상/예외/에러 시나리오)
- **선택**: Style 완료 (상태 클래스 확인)

> Markup 미완료 시 DOM 셀렉터가 불일치할 수 있어 반드시 HTML 확정 후 진행합니다.

## CSS-Native Motion 1순위 정책 (2026-05-04 신설 · 의무)

> 출처: `lib/rules/modern-design-stack.md` §8 게임 체인저 5선 + §9 CSS-Native Self-Check + `lib/rules/publish-patterns.md` §3-4 Motion

JS 라이브러리(GSAP/Framer/Motion One) 도입은 **CSS-Native 시도 이후**로 강제. 디폴트가 라이브러리가 아니라 **네이티브**.

### 패턴별 우선순위

| 패턴 | 1순위 (CSS-Native 시도 의무) | Fallback (CSS 표현 불가능 시만) |
|------|--------------------------|-----------------------------|
| 페이지 전환 (≥ 2페이지) | `@view-transition { navigation: auto; }` (CG-1) | barba.js 등 |
| 스크롤 reveal/parallax | `animation-timeline: view()` + `animation-range` (CG-3) | GSAP ScrollTrigger |
| 스크롤 트리거 (Chrome 145+) | `animation-trigger: view 50%;` (CG-3) | GSAP ScrollTrigger |
| 툴팁/드롭다운/메뉴 | `popover` + `anchor-name` + `position-anchor` (CG-2) | Floating UI |
| 진입/종료 애니메이션 | `@starting-style` | Motion One |

### Motion DNA 토큰 강제 소비

design-knowledge가 산출한 Motion DNA YAML(_handoff.md)을 publish-style이 `:root`의 CSS 변수로 전사. publish-interaction은 **모든 transition/animation을 변수로 호출**한다.

```css
/* ✓ 올바름 — Motion DNA 토큰 변수 사용 */
.card { transition: transform var(--dur-micro) var(--ease-primary); }
.section-reveal {
  animation: reveal var(--dur-macro) var(--ease-primary) both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

/* ✗ 금지 — 하드코딩 */
.card { transition: transform 150ms ease-out; }
.section-reveal { animation: reveal 320ms cubic-bezier(0.16,1,0.3,1) both; }
```

### Self-Check Grep (자동 실행)

```bash
# CSS-Native 사용량 (목표 ≥1)
grep -rEc "@view-transition|animation-timeline|animation-range|animation-trigger|anchor-name|position-anchor|@starting-style" output/{프로젝트}/publish*/css/

# Motion DNA 변수 사용 (목표 ≥6)
grep -rEc "var\(--ease-|var\(--dur-" output/{프로젝트}/publish*/

# GSAP/Framer 사용 시 사유 명시 검증 (1+ 시 PROMPT-NOTE.md에 사유 필수)
grep -rEc "gsap|framer-motion" output/{프로젝트}/publish*/

# prefers-reduced-motion 가드 (전수 필수)
grep -rEc "prefers-reduced-motion" output/{프로젝트}/publish*/css/
```

### handoff META 산출 의무 (handoff-schema 참조)

publish-interaction 종료 시 META에 다음 필드 의무 기록:
- `view_transition_count` / `scroll_driven_count` / `anchor_positioning_count` / `popover_count`
- `css_native_motion_count` (위 4개 합산)
- `gsap_framer_count`
- `motion_dna_var_uses` (목표 ≥ 6)

판정:
- `css_native_motion_count ≥ 1` AND `motion_dna_var_uses ≥ 6` → **PM-OK**
- `gsap_framer_count ≥ 1` AND PROMPT-NOTE.md 사유 부재 → **PM-WARN**
- `motion_dna_var_uses < 6` → **PM-BLOCK** (Ralph Loop, design-knowledge 재호출 권고)

---

## 인터랙션 원칙 (목적 있는 모션만)

모든 인터랙션은 **목적**이 있어야 한다. 장식적 모션은 금지.

> 참조: `~/.claude/skills/designer-skills-collection/interaction-design/skills/animation-principles/SKILL.md`
> 참조: `~/.claude/skills/designer-skills-collection/interaction-design/skills/micro-interaction-spec/SKILL.md`

### 모션 목적 분류

| 목적 | 예시 | 허용 |
|------|------|------|
| **피드백** | 버튼 클릭 시 scale(0.98), 호버 시 배경 변화 | 필수 |
| **안내** | 스크롤 방향 표시, 로딩 상태, 진행률 | 필수 |
| **위계** | 섹션 진입 시 fade-in (정보 우선순위 표현) | 허용 (아래 조건 충족 시) |
| **장식** | 배경 파티클, 무한 회전, 의미 없는 바운스 | 금지 |

### 모션 수치 기준 (design-taste.md)

| 유형 | 지속시간 | 이징 |
|------|---------|------|
| 호버 상태 | 150ms | ease-out |
| 레이아웃 변경 | 200ms | ease-out |
| 진입 애니메이션 | 300~500ms | ease-out |
| 형제 요소 스태거 | 50ms 간격 | - |

### Above-the-fold 진입 애니메이션 금지

히어로, GNB, 첫 번째 CTA는 **즉시 보여야** 한다. opacity:0으로 시작하면 안 된다.
- Below-the-fold (두 번째 섹션 이하)에만 scroll reveal 적용
- `prefers-reduced-motion: reduce` 시 모든 애니메이션 비활성화
- file:// 프로토콜 fallback: 3초 후 강제 visible

## 구현 대상 (컴포넌트 카탈로그)

| 컴포넌트 | 트리거 | ARIA | 키보드 |
|---------|--------|------|--------|
| GNB 스크롤 축소 | `scroll` | — | — |
| 햄버거 메뉴 | `click` | `aria-expanded` | `Escape`=닫기 |
| 드롭다운 | `click`/`hover` | `aria-expanded`, `aria-haspopup` | `↑↓`=이동, `Escape`=닫기 |
| 탭 | `click` | `role=tablist/tab/tabpanel`, `aria-selected` | `←→`=전환 |
| 아코디언 | `click` | `aria-expanded`, `aria-controls` | `Enter/Space`=토글 |
| 슬라이더 | `click`+`touch` | `aria-live=polite`, `aria-roledescription` | `←→`=이동 |
| 모달 | `click` | `role=dialog`, `aria-modal`, 포커스 트랩 | `Escape`=닫기, `Tab`=순환 |
| 스크롤 애니메이션 | `IntersectionObserver` | — | `prefers-reduced-motion` 존중 |
| 폼 유효성 | `submit`/`blur` | `aria-invalid`, `aria-describedby` | — |
| 칩 필터 | `click` | `aria-pressed` | `Enter/Space`=토글 |

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수여부 |
|------|------|------|------|:---:|
| JS 문법 검증 | node | `node --check output/publish/**/*.js` | 구문 오류 사전 검출 | 권장 |
| 모던 모션 참조 | Read | `lib/rules/modern-design-stack.md` | View Transitions, scroll-driven, GSAP/Lenis | **필수** |
| GSAP ScrollTrigger | CDN | `<script src="cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js">` | 복잡 스크롤 애니메이션 | 선택 |
| Lenis | CDN | `<script src="unpkg.com/lenis@1/dist/lenis.min.js">` | 부드러운 스크롤 | 선택 |
| Motion One | CDN | `motion.dev` | 경량 애니메이션 API | 선택 |

> **우선순위**: 네이티브(View Transitions, `animation-timeline: scroll()`) > Motion One(경량) > GSAP(복잡). `prefers-reduced-motion` 쿼리 필수.

## 작성 절차

### 1. 기능 목록 추출
- FN 명세에서 프론트엔드 인터랙션 항목 추출
- Markup의 인터랙티브 요소 (`[data-*]`, `role`, `aria-*`) 스캔
- 구현 우선순위: 필수(GNB, 메뉴) → 핵심(탭, 슬라이더) → 부가(애니메이션)

### 2. 코드 구조 설계
```javascript
// IIFE로 전역 오염 방지
(function() {
  'use strict';

  // 1. 유틸리티
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // 2. 컴포넌트별 init 함수
  function initGNB() { /* ... */ }
  function initTabs() { /* ... */ }

  // 3. DOMContentLoaded에서 일괄 초기화
  document.addEventListener('DOMContentLoaded', () => {
    initGNB();
    initTabs();
  });
})();
```

### 3. 구현 규칙
- **바닐라 JS 전용**: jQuery, 프레임워크 금지 (정적 사이트 기준)
- **이벤트 위임**: 동적 요소는 부모에 리스너 등록
- **ARIA 동기화**: 상태 변경 시 `aria-*` 속성 즉시 업데이트
- **키보드 지원**: 모든 인터랙티브 요소에 키보드 핸들러
- **모션 존중**: `prefers-reduced-motion: reduce` 시 애니메이션 비활성화
- **에러 방어**: 요소 미존재 시 `if (!el) return;` 가드

### 4. 테스트 시나리오
각 컴포넌트별 최소 확인 사항:
- 정상: 클릭/키보드로 동작
- 예외: 빠른 연타, 리사이즈 중 동작
- 접근성: 스크린리더 호환, 포커스 이동

## 결과 출력

```
═══════════════════════════════════
[Interaction 작성 결과]
═══════════════════════════════════
파일: main.js
───────────────────────────────────
[컴포넌트]
구현: {n}개 — {목록}
미구현: {n}개 — {사유}
───────────────────────────────────
[접근성]
ARIA 상태 관리: {n}개 컴포넌트
키보드 내비: {n}개 컴포넌트
모션 존중: {지원 여부}
───────────────────────────────────
[의존성]
외부 라이브러리: 없음 (바닐라 JS)
번들 크기: ~{n}KB (minified 추정)
═══════════════════════════════════
```

## 금지 규칙 (Hard Rules)

아래 규칙 위반 시 reviewer에서 **Critical** 판정됩니다. 예외 없이 준수하십시오.

| # | 규칙 | 사유 | 위반 시 증상 |
|---|------|------|-------------|
| 1 | **mouseenter ↔ mouseleave 쌍 필수** | 상태 변경 후 복원 로직 없으면 상태 고착 | 헤더 색상 고정, 메뉴 열린 채 유지 |
| 2 | **Swiper 마크업 = 초기화 1:1** | HTML에 `.swiper-container` 있으면 JS에서 반드시 `new Swiper()` 호출 | 슬라이더 미동작, 슬라이드 수직 나열 |
| 3 | **scroll 이벤트 최적화 필수** | `requestAnimationFrame` + `{ passive: true }` | 스크롤 버벅임, 성능 저하 |
| 4 | **IntersectionObserver unobserve** | 1회성 애니메이션은 트리거 후 `unobserve()` 호출 | 메모리 누수, 불필요한 콜백 |
| 5 | **이벤트 리스너 정리 가능 구조** | `addEventListener` 수 ≈ `removeEventListener` 수 | SPA 전환 시 메모리 누수 |
| 6 | **hover 클래스 3자 일치** | UI 명세 클래스 = HTML 마크업 = CSS 정의 | hover 효과 미작동 |

**mouseenter/mouseleave 패턴**:
```javascript
// GOOD — 쌍으로 상태 관리
nav.addEventListener('mouseenter', function() {
  header.dataset.wasTransparent = 'true';
  header.classList.remove('header--transparent');
  header.classList.add('header--blur');
});
nav.addEventListener('mouseleave', function() {
  if (header.dataset.wasTransparent === 'true') {
    delete header.dataset.wasTransparent;
    updateHeader(); // scroll 위치 기반 원상 복원
  }
});
```

**Swiper 초기화 체크리스트**:
```
HTML .swiper-container 수 = new Swiper() 호출 수
각 Swiper에 고유 셀렉터 사용 (클래스 충돌 방지)
Swiper 라이브러리 로드 확인: if (typeof Swiper !== 'undefined')
```

## 출력 형식
- 파일명: `main.js`
- 저장 경로: `output/publish/js/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 입력 검증

| ID | 검증 항목 | 판정 기준 |
|----|----------|----------|
| V1 | Markup 완료 | DOM 구조 확정된 HTML 존재. 미존재 시 STOP |

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 이벤트 쌍 완전성 | mouseenter마다 mouseleave 존재. addEventListener마다 정리 가능 구조 |
| 2 | ARIA 동기화 | 상태 변경(열기/닫기/활성화) 시 `aria-expanded`/`aria-selected` 등 즉시 업데이트 |
| 3 | 키보드 지원 | 모든 인터랙티브 컴포넌트에 키보드 핸들러 (Escape/Enter/Arrow) 존재 |
| 4 | 에러 방어 | 모든 `querySelector` 결과에 `if (!el) return` 가드 |
| 5 | Swiper 1:1 | HTML `.swiper-container` 수 = `new Swiper()` 호출 수 |
| 6 | 스크롤 최적화 | scroll 이벤트에 `requestAnimationFrame` + `{ passive: true }` |
| 7 | Observer 정리 | 1회성 IntersectionObserver 트리거 후 `unobserve()` 호출 |
| 8 | 모션 존중 | `prefers-reduced-motion: reduce` 시 애니메이션 비활성화 분기 |
| 9 | focus trap | 모달/드로어 열림 시 Tab 키가 모달 내부에서만 순환. 외부 요소 도달 0건 |
| 10 | 이벤트 위임 | 동적 생성 요소의 이벤트는 상위 요소에 위임. 직접 바인딩 후 DOM 추가 패턴 0건 |

### Vercel WIG 검증 (필수 · `lib/rules/vercel-wig.md` 참조)

> 본 스킬 진입 시 **`Read lib/rules/vercel-wig.md`** 의무. §1 Interactions + §2 Animations + §6 Performance 적용.

| # | 검증 항목 | Grep 명령 | 판정 |
|---|----------|----------|------|
| V1 | `transition: all` 금지 | `grep -rEn "transition:\s*all" output/*/publish*/css/` | 0건 = PASS, ≥1건 = **CRITICAL** |
| V2 | `:focus-visible` 사용 | `grep -rEn ":focus-visible" output/*/publish*/css/` | ≥1건 = PASS, 0건 = CRITICAL |
| V3 | `touch-action: manipulation` | `grep -rEn "touch-action:\s*manipulation" output/*/publish*/css/` | 인터랙티브 요소 시 ≥1 |
| V4 | `prefers-reduced-motion` 가드 | `grep -rEnc "@media \(prefers-reduced-motion" output/*/publish*/css/` | ≥1건 = PASS |
| V5 | scroll passive 옵션 | `grep -rEn "addEventListener\(['\"]\s*scroll['\"]" output/*/publish*/js/ \| grep -v "passive"` | 0건 = PASS (모두 passive 적용) |

추가 Self-Check (§4 Content / §5 Forms / §7 Design)는 `lib/rules/vercel-wig.md §Self-Check Grep` 의 17 명령 중 publish-markup/style 단계가 분담 실행.

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] publish-interaction
═══════════════════════════════════
▶ 입력 검증
| V1 | Markup 완료                | {Pass/STOP} |
▶ 내부 구조 검증
| 1 | 이벤트 쌍 완전성            | {Pass/Fail — 미쌍 n건} |
| 2 | ARIA 동기화                 | {Pass/Fail} |
| 3 | 키보드 지원                 | {Pass/Fail — 미지원 n건} |
| 4 | 에러 방어                   | {Pass/Fail — 미가드 n건} |
| 5 | Swiper 1:1                  | {Pass/Fail/N/A} |
| 6 | 스크롤 최적화               | {Pass/Fail/N/A} |
| 7 | Observer 정리               | {Pass/Fail/N/A} |
| 8 | 모션 존중                   | {Pass/Fail} |
▶ PM Devil's Advocate
| DA1 | 이벤트 — mouseenter/leave 쌍 누락으로 상태 고착 가능성 | {OK/WARN — 사유} |
| DA2 | 접근성 — 키보드만으로 모든 인터랙션 도달 가능한가       | {OK/WARN — 사유} |
| DA3 | 방어 — el 미존재 시 JS 에러로 후속 기능 중단 가능성     | {OK/WARN — 사유} |
───────────────────────────────────
판정: {PASS — 11/11} 또는 {FAIL — n/11}
═══════════════════════════════════
```

### 상세 체크리스트
전체 항목: [checklist.md](checklist.md) 참조 (reviewer 검수 시 사용)

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 UI 컴포넌트 수, FN 기능 목록을 로드.

### 쓰기 (완료 시)
```markdown
## INTERACTION 요약
- 생성일: {YYYY-MM-DD}
- 컴포넌트: {n}개
- 이벤트 쌍: {n}건
```

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 키보드 네비게이션 미구현 | 접근성 실패 (WCAG 2.1.1) | Tab/Enter/Escape 핸들링 필수 |
| 2 | 이벤트 위임 미사용 | 동적 요소 클릭 안 됨 | document.addEventListener + closest() |
| 3 | ARIA 상태 미업데이트 | 스크린리더 상태 불일치 | aria-expanded/aria-selected 토글 |
| 4 | 에러 상태 UI 없음 | 네트워크 실패 시 빈 화면 | 로딩/에러/빈 상태 3종 필수 |

## 내장 지식: 애니메이션 원칙

**Easing**: ease-out(진입) / ease-in(퇴장) / ease-in-out(이동) / linear(진행률만)
**Duration**: Micro 50~100ms(토글) / Short 150~250ms(툴팁,페이드) / Medium 250~400ms(모달) / Long 400~700ms(복합)
**Stagger**: 관련 항목 30~50ms 간격, 가장 중요한 요소 먼저, 총 시퀀스 700ms 이내
**원칙**: 목적 있는 모션만 / 빠를수록 좋음 / 자연스러운 가감속 / 중단 가능

## 내장 지식: 에러 처리 UX

4단계: **Prevention**(인라인 검증, 스마트 기본값, 확인 다이얼로그, 자동저장) → **Detection**(실시간 필드 검증, 폼 제출 검증, 네트워크 에러) → **Communication**(명확한 언어, 원인+해결 방법, 소스 근처 배치, 적절한 심각도) → **Recovery**(입력 보존, 재시도, 대안 경로, 되돌리기)
메시지 포맷: 무엇이 발생 + 왜 + 어떻게 해결

## 내장 지식: 피드백 패턴

유형: Immediate(클릭 상태) / Confirmation(성공 토스트, 체크 애니메이션) / Status(진행률, 뱃지) / Notification(인앱 알림)
채널 위계: 1.인라인(액션 근처) → 2.컴포넌트 → 3.페이지(배너/토스트) → 4.시스템(알림)
토스트: 3~5초 자동 닫힘 / 에러: 해결까지 유지 / 확인: undo 창 포함

## 내장 지식: 로딩 상태

- **100ms 미만**: 인디케이터 불필요
- **100ms~1초**: 미묘한 인디케이터 (opacity, skeleton)
- **1~10초**: 명확한 로딩 (진행률 표시 가능하면)
- **10초+**: 상세 진행률 + 시간 예측 + 백그라운드 옵션
패턴: Skeleton(구조 미리 보기) / Spinner / Progressive(중요 콘텐츠 먼저) / Optimistic(결과 먼저 표시)
콘텐츠 전환 시 fade-in, 리스트는 30~50ms stagger, 레이아웃 시프트 방지

## 내장 지식: 상태 머신

컴포넌트 = states + events + transitions + guards + actions
- 불가능한 상태 제거 (loading + error 동시 불가)
- 모든 상태에 탈출 경로 (dead end 금지)
- 공통 FSM: Form(idle→editing→validating→submitting→success/error), Fetch(idle→loading→success/error→retrying)

## 내장 지식: Interactive States 5종 (필수)

모든 클릭 가능 요소:
1. **default** — 기본
2. **hover** — 배경 변화 또는 그림자 증가 (150ms ease-out). 색상 변경 아님
3. **active** — `scale(0.98)` 또는 더 어두운 배경
4. **focus-visible** — 브랜드 2px offset outline (제거 금지)
5. **disabled** — opacity 40%, cursor: not-allowed, pointer-events: none

트랜지션: hover 150ms / 레이아웃 200ms / 진입 fade+translate(8~12px) stagger 50ms
`@media (prefers-reduced-motion: reduce)` 래핑 필수

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 외부 라이브러리(jQuery 등) 임의 도입 금지 | 번들 크기 + 의존성 관리 |
| 2 | ARIA 상태 동기화 없는 인터랙션 구현 금지 | 접근성 위반 |
| 3 | FN 명세 범위 외 기능 임의 추가 금지 | 스코프 크리프 |

## META 블록 생성 (산출물 하단 필수)

산출물 JS 파일 최상단 주석에 아래 JSON을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
/* META {
  "skill": "publish-interaction",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "component_count": 0,
    "event_pair_count": 0
  },
  "vercel_wig_grep": {
    "snapshot_sha": "4e799d4",
    "transition_all": "PASS|FAIL(n)",
    "focus_visible": "PASS|FAIL",
    "touch_action": "PASS|N/A",
    "reduced_motion": "PASS|FAIL",
    "scroll_passive": "PASS|FAIL(n)"
  },
  "dependencies": [],
  "next_skill": "qa-functional"
} */
```

## 흔한 AI 실수 — 실전 사례

- **FN 명세 요구사항 누락**: 비짓강남에서 UUID 세션 ID 미생성(TC-F-044 Fail), 500자 초과 안내 미구현(TC-F-019 Fail). **FN 검증기준을 JS 구현 전에 전수 대조**.
- **IIFE 패턴 유지**: 전역 오염 방지를 위해 IIFE 또는 모듈 패턴 필수. chatbot.js에서 성공 사례.
- **키보드 접근성 동기화**: ESC 닫기, 포커스 트랩, Tab 순서가 ARIA 상태와 동기화돼야 함. aria-expanded/aria-hidden 토글 누락 주의.
- **sessionStorage vs localStorage**: 세션 단위 데이터는 sessionStorage, 영구 데이터는 localStorage. 혼용 금지.

$ARGUMENTS
