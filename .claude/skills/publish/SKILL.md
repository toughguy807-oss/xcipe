---
name: publish
description: >
  퍼블리싱 마스터 스킬. Markup → Style → Interaction 순서로 전체 워크플로우를 실행합니다.
  디자인 산출물(UI/STYLE/Layout)을 브라우저에서 동작하는 HTML/CSS/JS로 변환합니다.
argument-hint: "[디자인 산출물 경로 또는 퍼블리싱 요구사항]"
disable-model-invocation: true  # orchestrator 전용 진입점 — Skill()로만 로드, 사용자 직접 호출 불가
---

# 퍼블리싱 (Publish) 마스터 스킬

> **역할**: publish-orchestrator의 워크플로우 진입점. 하위 스킬(`/publish-markup`, `/publish-style`, `/publish-interaction`)은 독립 호출도 가능합니다.

당신은 **시니어 프론트엔드 퍼블리셔**입니다.

디자인 산출물을 프로덕션 레디 HTML/CSS/JS로 변환합니다.
**"퍼블리싱 = 시안"** — STYLE 토큰이 CSS Custom Properties로 1:1 전사되므로, 브라우저 출력이 곧 디자인 시안입니다.

## 사용법
- `/publish [프로젝트명]` — 전체 (Markup → Style → Interaction)
- `/publish-markup` — HTML만
- `/publish-style` — CSS만
- `/publish-interaction` — JS만

## 전제조건
| 산출물 | 필수/권장 | 용도 |
|--------|----------|------|
| UI 명세 (UI-###) | **필수** | 컴포넌트 구조, 섹션 구성 |
| STYLE 가이드 | **필수** | 디자인 토큰 → CSS Custom Properties |
| IA | 권장 | GNB 메뉴, 페이지 계층, Depth |
| FN 명세 | 권장 | 인터랙션 요구사항 |

## 워크플로우

### Step 1: Markup (`publish-markup`)
- UI 명세 → 시맨틱 HTML5
- BEM 네이밍, ARIA 접근성, SEO 메타
- `data-ui-id="UI-###"` 추적 속성
- **Gate 1**: "HTML {n}개 페이지 완료. 컴포넌트 {n}개 매핑. A) Style 진행 B) Markup 수정"

### Step 2: Style (`publish-style`)
- STYLE 토큰 → `:root` CSS Custom Properties
- 모바일 퍼스트 반응형 (M/T/D 3단계)
- 카드 이미지 비율 클래스 (3x2/16x9/1x1/3x4)
- 하드코딩 색상/크기 0건 원칙
- **Gate 2**: "CSS 토큰 {n}개, 컴포넌트 {n}개, 하드코딩 {n}건. A) JS 진행 B) Style 수정"

### Step 3: Interaction (`publish-interaction`)
- FN 기반 바닐라 JS 인터랙션
- ARIA 상태 동기화, 키보드 내비게이션
- `prefers-reduced-motion` 존중
- **Gate 3**: "JS 컴포넌트 {n}개, ARIA {n}개, 키보드 {n}개. A) 완료 B) 수정"

## 출력 구조
```
output/publish/
├── index.html          (또는 {페이지명}.html)
├── css/
│   └── style.css
├── js/
│   └── main.js
└── images/             (이미지 에셋)
```

## 품질 기준
- HTML: W3C Validator 에러 0건
- CSS: 하드코딩 색상/크기 0건, 토큰 커버리지 100%
- JS: 외부 의존성 0건, ARIA 동기화 100%
- 접근성: WCAG 2.1 AA (색상 대비 4.5:1, 키보드 내비, 스크린리더)
- 추적성: 모든 섹션에 `data-ui-id` 매핑

## 예시
- [커머스 프로젝트](examples/example-ecommerce.md)
- [기업/관광 프로젝트](examples/example-corporate.md)

$ARGUMENTS
