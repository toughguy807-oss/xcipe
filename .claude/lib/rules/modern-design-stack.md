# 모던 디자인 스택 가이드

SYS v4 디자인·퍼블리싱 산출물의 **트렌드 lag** 문제(학습 컷오프 기반 보수적 패턴 반복)를 해결하기 위한 2024~2026 기술 스택 가이드. publish-style, publish-interaction, design-layout이 필수 참조한다.

## 모던 CSS (2024~2026)

| 기능 | 구문 | 용도 | 브라우저 지원 |
|------|------|------|:---:|
| **:has()** | `.card:has(img)` | 부모 셀렉터, 조건부 스타일링 | 전 브라우저(2024~) |
| **Container Query** | `@container (min-width: 400px)` | 컴포넌트 기반 반응형 | 전 브라우저(2023~) |
| **View Transitions API (SPA)** | `document.startViewTransition()` | 페이지/상태 전환 애니메이션 | Chrome/Edge, Safari 18+ |
| **View Transitions Cross-Document** ⭐ | `@view-transition { navigation: auto; }` | **MPA**도 zero-JS 페이지 모핑 (정적 사이트 포함) | Chrome 126+, Safari 18.2+ (2026 안정화) |
| **Subgrid** | `grid-template: subgrid` | 중첩 그리드 정렬 | 전 브라우저(2023~) |
| **Anchor Positioning** ⭐ | `anchor-name: --tip` + `position-anchor: --tip` + `@position-try` | 툴팁/드롭다운/팝오버 — Floating UI 90% 대체 | Chrome 125+, FF 132+, Safari 18.2+ (~91% 트래픽) |
| **Popover API** | `popover` 속성 + `popovertarget` | 모달/메뉴 top-layer (Anchor와 결합) | Chrome 114+, Safari 17+, FF 125+ |
| **color-mix()** | `color-mix(in oklch, #f00 30%, #fff)` | 동적 색상 혼합 | 전 브라우저(2023~) |
| **@layer** | `@layer base, components;` | CSS 캐스케이드 레이어 | 전 브라우저(2022~) |
| **@scope** | `@scope (.card) { ... }` | 스코프드 스타일링 | Chrome/Edge, Safari 17.4+ |
| **@starting-style** | `@starting-style { opacity: 0; }` | display: none → 가시화 진입 트랜지션 | Chrome 117+, Safari 17.5+ |
| **scroll-driven animation** ⭐ | `animation-timeline: scroll()` / `view()` | 스크롤 진행률 기반 네이티브 애니메이션 (GSAP 대체) | Chrome 115+, FF 145+ (2026 확장) |
| **scroll-triggered animation** | `animation-trigger: view 50%;` | 스크롤 오프셋 기반 트리거 (Chrome 145+) | Chrome 145+ (2026 신규) |

⭐ = **2026 게임 체인저 5선** (별도 §8 참조).

### 적용 원칙
- **Progressive Enhancement**: `@supports` 쿼리로 폴백 보장
- **CLS 영향 최소화**: `will-change` 남용 금지 (렌더링 최적화는 필요 시에만)
- **우선 사용**: Subgrid, Container Query, color-mix, :has, @layer는 **기본값**으로 채택

## 레이아웃 패턴 (트렌드)

| 패턴 | 특징 | 적합 업종 | CSS 구현 키 |
|------|------|----------|-----------|
| **Bento Grid** | 불균등 그리드, Apple 스타일 | SaaS, 제품 소개, 포트폴리오 | `grid-template-areas`, `span` |
| **Editorial** | 매거진형, 비대칭 텍스트+이미지 | 브랜드, 콘텐츠 중심 | Subgrid + `grid-column` |
| **Asymmetric** | 의도적 비대칭, 시선 유도 | 마케팅, 캠페인 | `offset`, `transform: translate` |
| **Scroll Snap** | 섹션 스냅 스크롤 | 원페이지, 스토리텔링 | `scroll-snap-type`, `scroll-snap-align` |
| **Overlap/Collage** | 콘텐츠 겹침, 깊이감 | 프리미엄, 패션 | `z-index` + `clip-path` |
| **Horizontal Scroll** | 가로 섹션 스크롤 | 포트폴리오, 전시 | `overflow-x`, ScrollTrigger |

> 3-col 동일 카드 반복은 **포화 패턴**. 최소 1개 섹션은 위 패턴 적용.

## 모션·인터랙션 스택

| 도구 | 설치/CDN | 용도 | 크기 |
|------|---------|------|:---:|
| **View Transitions API** | 네이티브 | 페이지 전환, 상태 애니메이션 | 0KB |
| **CSS scroll-driven animation** | 네이티브 | 스크롤 진행률 기반 애니메이션 | 0KB |
| **GSAP ScrollTrigger** | `<script src="cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js">` | 복잡 스크롤 애니메이션 | 30KB |
| **Lenis** | `<script src="unpkg.com/lenis@1/dist/lenis.min.js">` | 부드러운 스크롤 | 8KB |
| **Motion One** | `<script type="module">` import | 웹 애니메이션 API 래퍼 | 3.8KB |
| **Framer Motion** | npm (React 전용) | React 컴포넌트 애니메이션 | — |

### 선택 우선순위 (2026-05 강화 — CSS-Native 1순위 의무화)

> **원칙**: "JS 라이브러리 추가는 네이티브로 표현 불가능할 때만". 디폴트가 GSAP/Framer가 아니라 **네이티브**.

1. **CSS-Native 1순위** (필수 시도) — `animation-timeline: scroll()` / `view()`, `@view-transition`, Anchor Positioning, `@starting-style`. 0KB·가속·SEO 친화·접근성 친화.
2. **네이티브 미지원 시 fallback** (브라우저 < 임계값일 때만) — Motion One (3.8KB)
3. **복잡 스크롤 합성** (3D/패럴랙스 시나리오) — GSAP ScrollTrigger (CSS scroll-timeline으로 표현 불가능할 때만)
4. **부드러운 스크롤** — Lenis (브라우저 native smooth가 부족할 때만)
5. **React 프로젝트** — Framer Motion (단, View Transitions API 우선 검토)

**publish-interaction 진입 시 검증 의무 (2026-05 추가)**:
- [ ] `animation-timeline` 또는 `@view-transition` 또는 `anchor-name` 중 **1개 이상** 사용
- [ ] GSAP/Framer Motion 도입 시 PROMPT-NOTE.md에 "왜 CSS-Native로 안 되는가" 1문장 명시
- [ ] `aesthetic-contract.yaml`의 `motion_dna` 토큰 (§8 참조) 적용 여부 Grep 검증

## 타이포그래피 트렌드

| 요소 | 2026 트렌드 | 회피 |
|------|------------|------|
| 본문 폰트 | Pretendard, Geist, Inter Tight, Manrope | Inter (포화) |
| 디스플레이 | Serif 믹스(Fraunces, Instrument Serif), Variable Font | Sans-only 일색 |
| Variable Font 활용 | `font-variation-settings` 애니메이션 | 정적 weight만 사용 |
| 크기 스케일 | fluid typography (`clamp()`) | 고정 px |

## 포화 패턴 금지 목록

| # | 포화 패턴 | 대안 |
|---|----------|------|
| 1 | Inter + 보라 그라디언트 (#6366F1 계열) | 업종별 고유 컬러 + Serif 믹스 |
| 2 | 3-col 동일 카드 반복 | Bento Grid / Editorial |
| 3 | 파티클 배경(tsParticles) | scroll-driven animation / GSAP |
| 4 | hover: scale(1.05) 일괄 적용 | 컴포넌트별 고유 미세 인터랙션 |
| 5 | 히어로 중앙정렬 + CTA 단일 | Asymmetric + 다중 CTA 위계 |
| 6 | `box-shadow: 0 4px 12px` 일괄 | 색상 기반 shadow(`color-mix`) |
| 7 | 섹션 간 80px 고정 padding | fluid spacing(`clamp`) |

## 적용 체크리스트 (publish-style, publish-interaction용)

- [ ] 모던 CSS 중 **최소 3개** 활용 (예: :has, Container Query, Subgrid)
- [ ] 레이아웃 패턴 중 **최소 1개** 채택 (기본 3-col 회피)
- [ ] 모션 스택 **1개 이상** 통합 (View Transitions 또는 GSAP/Lenis 등)
- [ ] 포화 패턴 **0건** (위 표 전수 대조)
- [ ] `@supports` 폴백 포함 (미지원 브라우저 대응)

## 8. 2026 게임 체인저 5선 (motionsites.ai 리서치 + Codrops 2026 + Interop 2026 기반)

> **도입일**: 2026-05-04. design-orchestrator Step 2B-2.5 / publish-orchestrator Step 2/3 에서 자동 적용.

### CG-1. View Transitions Cross-Document (★★★★★ · publish-interaction 자동 도입)

**한 줄 요약**: MPA(정적 사이트 포함)에서 `@view-transition { navigation: auto; }` 한 줄로 페이지 전환 모핑. zero-JS.

**적용 트리거**: publish-interaction Step 진입 시 페이지 ≥ 2개이면 의무 시도.

```css
@view-transition { navigation: auto; }

::view-transition-old(root) { animation: fade 200ms both; }
::view-transition-new(root) { animation: fade 300ms both reverse; }

/* 특정 요소 morph */
.hero-image { view-transition-name: hero; }
```

**Self-Check**: `grep "@view-transition" output/.../css/` ≥ 1건. 미존재 시 PROMPT-NOTE.md 사유 명시.

### CG-2. CSS Anchor Positioning + Popover API (★★★★☆ · publish-markup 자동 도입)

**한 줄 요약**: 툴팁/드롭다운/컨텍스트메뉴/모달 — Floating UI·@floating-ui/dom 의존성 90% 제거.

**적용 트리거**: publish-markup에서 툴팁/드롭다운/모달 컴포넌트 식별 시 의무 시도.

```html
<button popovertarget="menu" id="trigger">메뉴</button>
<div popover id="menu" anchor="trigger" style="
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(left);
  position-try-fallbacks: flip-block, flip-inline;
">...</div>
```

**Self-Check**: `grep -E "popover|anchor-name|position-anchor" output/.../` ≥ 1건 (드롭다운/모달 식별 시).

### CG-3. Scroll-Driven & Scroll-Triggered Animations (★★★★★ · publish-interaction 자동 도입)

**한 줄 요약**: GSAP ScrollTrigger 90% 대체. `animation-timeline: scroll()` / `view()` + `animation-trigger` (Chrome 145+).

**적용 트리거**: publish-interaction에서 scroll/parallax/reveal 패턴 식별 시 GSAP 도입 **이전에 의무 시도**.

```css
@keyframes reveal { from { opacity: 0; translate: 0 30px; } }

.reveal {
  animation: reveal both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

/* Chrome 145+ 트리거 (scroll-timeline 대체 — 한 번만 발동) */
.section-pin {
  animation-trigger: view 50%;
  animation: pin 600ms both;
}
```

**Self-Check**: `grep -E "animation-timeline|animation-range|animation-trigger" output/.../css/` ≥ 1건.

### CG-4. Motion DNA — 8번째 디자인 토큰 카테고리 (★★★★☆ · design-knowledge 자동 산출)

**한 줄 요약**: 컬러·타이포처럼 **모션 자체가 BI 자산**. 시그니처 이징·시그니처 지속·시그니처 시퀀스를 토큰화.

**design-knowledge 의무 산출** (8번째 카테고리):

```yaml
motion_dna:
  signature_easing:
    primary: "cubic-bezier(0.16, 1, 0.3, 1)"   # spring-like
    sharp:   "cubic-bezier(0.4, 0, 0.2, 1)"
    bounce:  "linear(0, 0.2, 0.8 40%, 1)"        # CSS linear() easing
  signature_duration:
    micro: 120ms       # hover, focus
    macro: 320ms       # reveal, page transition
    epic:  720ms       # hero entrance
  signature_sequence:
    hero_entrance:
      - { selector: ".hero-eyebrow",  delay: 0,    duration: 320 }
      - { selector: ".hero-headline", delay: 80,   duration: 480, split: "word" }
      - { selector: ".hero-cta",      delay: 280,  duration: 320 }
  prefers_reduced_motion:
    fallback: "opacity-only"
```

**소비처**: publish-interaction이 자동 참조 → CSS 변수(`--ease-primary`, `--dur-macro`)로 전사.
**handoff**: META(STYLE).motion_dna_count = 3 (easing/duration/sequence) 필수.

### CG-5. Designer-Facing WebGL (Unicorn Studio류 · ★★★☆☆ · 선택)

**한 줄 요약**: 디자이너가 레이어 기반 UI로 셰이더를 직접. R3F·Three.js 코드 없이 WebGL 자산 export.

**적용 트리거**: design-image 스킬과 결합. 키비주얼/배경 셰이더 필요 시 사용자 명시 옵션. Codrops 2026-03 [WebGL for Designers](https://tympanus.net/codrops/2026/03/04/webgl-for-designers-creating-interactive-shader-driven-graphics-directly-in-the-browser/) 참조.

---

## 9. CSS-Native Motion Self-Check (publish-interaction 의무)

publish-interaction Step 종료 시 다음 항목을 Grep 자동 검증한다:

| # | 항목 | PASS 기준 | FAIL 시 |
|---|------|----------|---------|
| 1 | View Transitions 사용 | 페이지 ≥ 2개일 때 `@view-transition` ≥ 1건 또는 사유 명시 | PM-WARN |
| 2 | CSS scroll-driven 사용 | scroll/reveal/parallax 패턴 식별 시 `animation-timeline` ≥ 1건 또는 사유 명시 | PM-WARN |
| 3 | Anchor Positioning 사용 | 툴팁/드롭다운 식별 시 `position-anchor` 또는 `anchor-name` ≥ 1건 또는 사유 명시 | PM-WARN |
| 4 | Motion DNA 토큰 적용 | `--ease-` 와 `--dur-` 변수 ≥ 6건 사용 | PM-BLOCK |
| 5 | GSAP/Framer 도입 시 사유 | PROMPT-NOTE.md 또는 _handoff.md에 "CSS-Native 불가능 사유" 1문장 | PM-WARN |
| 6 | `prefers-reduced-motion` 가드 | 모든 motion 룰에 `@media (prefers-reduced-motion: reduce)` 폴백 | PM-WARN |

**Grep 명령**:
```bash
grep -rEc "@view-transition|animation-timeline|animation-range|animation-trigger|anchor-name|position-anchor|@starting-style" output/.../css/
grep -rEc "var\(--ease-|var\(--dur-" output/.../
grep -rEc "prefers-reduced-motion" output/.../css/
```

---

## 참조

- `rules/figma-sync.md` — KDS 토큰 통합 패턴
- `rules/dkb-policy.md` — Section Packs (페이지 단위와 직교 차원의 hero/feature/pricing/footer 단위 references)
- `rules/handoff-schema.md` — design-knowledge `motion_dna_count` / publish-interaction `css_native_motion_count` 필드
- `skills/dkb-analyze/` — 실제 레퍼런스 사이트의 기술 스택 자동 분석 (2026-05-18 bench-scrape 흡수, Step 1 부수효과로 자동 실행)
- `skills/design-knowledge/` — 본 룰 참조하여 8대 토큰 산출 (Motion DNA 포함)
- `skills/publish-interaction/` — 본 룰 §8·§9 자동 적용
- `memory/feedback_motion_dna_pipeline.md` — 도입 배경 + 자동화 진입점
