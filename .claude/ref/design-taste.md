# Design Taste Reference

This document defines the aesthetic principles, style tokens, and quality standards for colorful UI variants (Clean, Polished). Read this alongside `design-context.md`.

> **2026-04-30 강화**: Anthropic 공식 frontend-design 스킬 흡수. 본 문서의 craft 원칙 + Anthropic의 4 Design Thinking + Tone 11종 + NEVER List를 통합 적용.
> 상세는 [`ref/anthropic-frontend-design.md`](anthropic-frontend-design.md) 참조.
>
> **2026-05-06 격상**: Vercel Labs `web-interface-guidelines` 풀버전(8 카테고리 119+ 룰 + Self-Check Grep 17종)은 **`lib/rules/vercel-wig.md`** 로 1급 격상. 본 문서는 디자인 시안 단계 멘탈 모델 + 자체 craft 토큰 유지. publish 단계 자동 검증은 vercel-wig.md가 담당.
> **충돌 시 우선순위**: 측정 가능 항목(APCA Lc, transition rules) → Vercel WIG. 미적 방향성(Tone, NEVER List, Warm Stone vs Cool Slate) → 자체 craft.

## 통합 매트릭스

| 본 문서 | Anthropic 원본 | Vercel WIG 매핑 |
|--------|--------------|----------------|
| Surface & Elevation | "atmosphere and depth" | Layered shadows (ambient + direct, ≥2 layers) |
| Color Intent | "Dominant + Sharp accents" | Hue consistency (tint borders/shadows/text on non-neutral bg) |
| Spacing System | "Generous negative space OR controlled density" | — |
| Borders & Dividers | — | Crisp borders (border + shadow combo, semi-transparent borders) |
| Border Radius | — | Nested radii (child ≤ parent, concentric) |
| Contrast | WCAG 2.1 AA | **APCA 우선**, WCAG2 fallback |
| Interactive States | — | Hover/focus/active **contrast 증가** rule |
| Animation & Transitions | — | `transition: all` **금지**, transform/opacity only |
| Browser Integration | — | `color-scheme: dark`, `<meta name="theme-color">` |
| (신규) Tone 11종 commit | brutally minimal / maximalist / editorial / luxury 등 1개 강제 선택 | — |
| (신규) NEVER List | Inter/Roboto/Arial 폰트 + 보라 그라디언트 + 3-col 카드 반복 명시 금지 | — |
| (신규) 다양화 의무 | Space Grotesk 등 단일 톤 수렴 금지 | — |

---

## Craft Foundations

### Surface & Elevation
- Use subtle layering to create depth — not drop shadows on everything, but intentional elevation where it communicates hierarchy
- Background surfaces should have barely-perceptible tonal differences (e.g., `#fafafa` vs `#ffffff`) to separate zones
- Cards and elevated elements: prefer soft shadows (`0 1px 3px rgba(0,0,0,0.08)`) over hard borders where possible
- Reserve strong elevation (larger shadows) for elements that genuinely float: modals, dropdowns, tooltips

### Borders & Dividers
- Borders are a last resort for separation — prefer spacing, background contrast, or subtle shadows first
- When borders are needed: 1px, low-contrast (e.g., `rgba(0,0,0,0.06)` not `#cccccc`)
- Never stack borders — if a card has a border, don't also put a border on its container
- Dividers between list items: use `border-bottom` on items, not `border-top` — avoids double-line at edges
- **Crisp borders (Vercel)**: border + shadow 조합 + **semi-transparent border**(`rgba(0,0,0,0.08)`) — edge clarity 향상.

### Border Radius / Shadows / Browser Integration

> 상세는 `lib/rules/vercel-wig.md` §7 Design 참조. 핵심만 인라인:
> - **Nested radii**: child ≤ parent, concentric. 공식 `child = parent - padding`
> - **Layered shadows**: 최소 2층 (ambient + direct), 단일 층 = automatic fail
> - **`color-scheme: dark`** + **`<meta name="theme-color">`**: 다크 테마 시 의무
> - **Text transform**: wrapper에 적용, 텍스트 노드 직접 scale 금지

### Spacing System
- Use a consistent scale: 4px base unit — 4, 8, 12, 16, 24, 32, 48, 64, 96
- Generous padding inside containers (min 16px, prefer 24px)
- Group related elements tightly (8px gap), separate unrelated groups with more space (24px+)
- Whitespace is a feature, not wasted space — let content breathe

### Color Intent
- Every color must have a job: primary action, success feedback, warning, error, or brand accent
- Avoid decorative color — if it doesn't communicate something, it shouldn't be colored
- Use color sparingly so it retains meaning. A page with 6 colors everywhere has zero color hierarchy
- Tint backgrounds with brand color at very low opacity (2-5%) for subtle warmth without distraction
- **Hue consistency (Vercel)**: On non-neutral backgrounds, tint borders/shadows/text toward the same hue — never pure neutral on warm bg.
- **Contrast minimum (Vercel)**: Prefer **APCA** ([apcacontrast.com](https://apcacontrast.com/)) over WCAG 2 — perceptually accurate. WCAG2 만 통과 ≠ 가독성 보장. Lc 60+ for body, Lc 75+ for fine text.
- **Redundant status cues**: 상태 표현은 색상 단독 금지 — 텍스트 레이블/아이콘 동반.

### Typography
- Limit to 2 font weights in most UIs: regular (400) for body, semibold (600) for headings/emphasis
- Size scale: 12px (captions) / 14px (body) / 16px (large body) / 20px (h3) / 24px (h2) / 32px (h1)
- Line-height: 1.5 for body text, 1.2-1.3 for headings
- Letter-spacing: slight positive tracking on all-caps labels (+0.5px), default elsewhere

### Animation & Transitions
- Default transition: `150ms ease-out` for hover states, `200ms ease-out` for layout changes
- Entrance animations: fade + slight translate (8-12px), staggered by 50ms between siblings
- Never animate purely for decoration — motion should communicate state change or guide attention
- Respect `prefers-reduced-motion`: wrap animations in `@media (prefers-reduced-motion: no-preference)`
- **Never `transition: all` (Vercel)**: 명시 속성만 (`opacity, transform`). `all`은 layout-affecting 속성을 의도치 않게 애니메이션 → jank.
- **Compositor-friendly only**: GPU 가속 속성(`transform`, `opacity`)만. `width/height/top/left` 애니메이션 금지 (reflow/repaint 유발).
- **Correct transform-origin**: 모션은 "물리적으로 시작하는 곳"에 anchor.
- **SVG transform**: `<g>` wrapper에 적용 + `transform-box: fill-box; transform-origin: center;` (Safari 호환).

### Interactive States
- Every clickable element needs: default, hover, active (pressed), focus-visible, disabled
- Hover: subtle background shift or shadow increase — not color change
- Active/pressed: slight scale-down (`transform: scale(0.98)`) or darker background
- Focus-visible: 2px offset outline in brand color — never remove focus indicators
- Disabled: 40% opacity, `cursor: not-allowed`, `pointer-events: none`
- **Contrast 증가 (Vercel)**: `:hover`, `:active`, `:focus`는 rest 상태보다 **반드시 더 높은 대비**. 같거나 낮으면 affordance 실패.
- **`:focus-visible` 우선**: pointer 사용자에게 focus ring 노출 방지. `:focus-within`은 grouped controls.

---

## Style Tokens: Warmth & Approachability (Consumer Apps)

Use these tokens for consumer-facing features — things end-users interact with directly.

| Token | Value |
|-------|-------|
| **Palette** | Warm stone: `#1a1a1a` (text), `#6b5b4f` (secondary), `#d4a574` (accent), `#f5f0eb` (surface), `#faf8f5` (background) |
| **Spacing** | Generous — 24px container padding, 16px element gaps, 48px section gaps |
| **Border radius** | Soft — 8px for cards, 6px for buttons, 12px for modals |
| **Shadows** | Soft and warm — `0 2px 8px rgba(107,91,79,0.08)` |
| **Typography** | Inter or system sans-serif, 16px base, generous line-height (1.6) |
| **Buttons** | Filled primary with rounded corners, ghost secondary, subtle hover lift |
| **Icons** | Rounded stroke style, 20px default size |

---

## Style Tokens: Precision & Density (Admin / Dashboard)

Use these tokens for admin panels, dashboards, settings pages, and internal tools.

| Token | Value |
|-------|-------|
| **Palette** | Cool slate: `#0f172a` (text), `#475569` (secondary), `#3b82f6` (accent), `#f1f5f9` (surface), `#f8fafc` (background) |
| **Spacing** | Compact — 16px container padding, 8px element gaps, 24px section gaps |
| **Border radius** | Sharp — 4px for cards, 4px for buttons, 8px for modals |
| **Shadows** | Minimal — prefer 1px borders (`#e2e8f0`) over shadows |
| **Typography** | System fonts (`-apple-system, ...`), 14px base, tight line-height (1.4) |
| **Buttons** | Compact with clear borders, icon+label combos, keyboard shortcut hints |
| **Data density** | Tables with 32px row height, inline status badges, compact form fields |

---

## Quality Checks

Apply mentally before outputting any color variant:

- **Swap Test**: Cover the brand — if it could be any app, it lacks personality.
- **Squint Test**: Blur your eyes — you should still see primary action, navigation, main content, and hierarchy.
- **Signature Test**: At least one distinctive element — unique pattern, unexpected color, thoughtful micro-detail.
- **Token Test**: Variant consistently uses its chosen token set — no mixing warm palette with sharp borders.
- **APCA Lc Test (신규 · Vercel)**: 본문 Lc 60+, 캡션/세컨더리 Lc 75+ 만족. WCAG2 만 통과는 fallback 으로만 인정.
- **Layer Test (신규 · Vercel)**: 카드/모달/팝오버에 shadow 2층 이상 적용. 단일 층 = automatic fail.
- **Concentric Test (신규 · Vercel)**: 부모-자식 radius 동심 검증. `child > parent` 또는 비례 어긋남 = fail.

### Self-Check Grep (publish 단계 자동 검증)

> publish 단계 17개 grep 명령은 **`lib/rules/vercel-wig.md` §Self-Check Grep** 으로 이전됨.
> publish-* 스킬이 종료 직전 자동 실행하여 META 블록의 `vercel_wig_grep` 필드에 기록.

---

## Anti-Patterns: Generic AI Aesthetics

Avoid these patterns that make UIs feel AI-generated and templated:

- **Inter + purple gradient on white** — the default AI look. If using Inter, pair it with a non-obvious palette
- **Gratuitous glassmorphism** — frosted glass everywhere with no purpose
- **Rainbow gradients as accents** — gradient badges, gradient borders, gradient everything
- **Identical card grids** — 3 cards in a row with icon, heading, description, all same height
- **Oversized hero with centered text** — giant padding, centered headline, centered subhead, centered CTA
- **Blue primary button with gray secondary** — fine functionally, but boring as a design choice
- **Decorative blobs and abstract shapes** — background blobs that add nothing
- **Excessive border-radius** (pill-shaped everything) — makes UI feel toylike
- **Low-contrast pastel text** — looks "soft" but fails accessibility
- **Shadows that don't match light source** — multiple shadow directions on the same page

---

## Key Principle

Every variant needs a clear aesthetic direction — bold, minimal, warm, cool, brutalist, playful all work. **Generic doesn't.** Each of the 2 color variants (Clean, Polished) must feel like a deliberate design decision, not a random theme swap. The Wireframe proves structure; the color variants prove it can work *emotionally*.

---

## Design Philosophy Directory — 5 Flows × 20 Philosophies

**When to use**: user intent is ambiguous ("make it look good", "what style", "recommend a direction") or explicit ("suggest 3 directions"). Propose **3 differentiated philosophies that must span 3 different flows**. Generate parallel demos (claude-wireframe Phase 2 style) and let the user pick → lock into `aesthetic-contract.yaml`.

**Hard rule**: Never recommend 2+ philosophies from the same flow. Differentiation dies.

### Flow 1 — Information Architecture (안전한 선택)
*Data as architectural material. Rational, restrained, evidence-first.*

| # | Name | Cue |
|---|------|-----|
| 01 | Pentagram | Michael Bierut · typographic hierarchy · Swiss grid |
| 02 | Stamen Design | Cartographic data viz · warm tones · organic pattern |
| 03 | Information Architects | Content-first · system fonts · performance aesthetic |
| 04 | Fathom | Scientific journal rigor · quantitative precision |

### Flow 2 — Motion Poetics (대담한 선택)
*Technology itself is flowing poetry.*

| # | Name | Cue |
|---|------|-----|
| 05 | Locomotive | Parallax · cinematic scene cuts · precise editing |
| 06 | Active Theory | WebGL particles · 3D realtime · neon gradient |
| 07 | Field.io | Generative art · algorithmic · voronoi |
| 08 | Resn | Gamified journey · illustration × code · non-linear |

### Flow 3 — Minimalism (안전·고급)
*Delete until nothing else can be removed.*

| # | Name | Cue |
|---|------|-----|
| 09 | Experimental Jetset | Single visual metaphor · Mondrian palette · conceptual |
| 10 | Müller-Brockmann | Mathematical grid (8pt) · objectivity · functionalism |
| 11 | Build | Luxury minimal · 70%+ whitespace · golden ratio |
| 12 | Sagmeister & Walsh | Optimistic expression · handcraft × digital · color burst |

### Flow 4 — Avant-Garde (혁신적)
*Breaking rules is the rule.*

| # | Name | Cue |
|---|------|-----|
| 13 | Zach Lieberman | Code poetics · hand-drawn algorithms · B&W purity |
| 14 | Raven Kwok | Fractal recursion · architectural info structure · Processing |
| 15 | Ash Thorp | Cinematic lighting · warm cyberpunk · industrial aesthetic |
| 16 | Territory Studio | FUI (fictional UI) · holographic · technical credibility |

### Flow 5 — Eastern Philosophy (차별화·독특)
*Whitespace is content.*

| # | Name | Cue |
|---|------|-----|
| 17 | Takram | Japanese contemplative · soft tech · diagram-as-art |
| 18 | Kenya Hara | Emptiness aesthetics · 80%+ whitespace · paper warmth |
| 19 | Irma Boom | Non-linear architecture · boundary play · unexpected palette |
| 20 | Neo Shen | Digital ink painting · poetic whitespace · warm palette |

### Application Flow

1. Ambiguous brief → select **3 philosophies from 3 different flows** (e.g. 03 + 11 + 17)
2. Generate parallel demo sketches for each
3. User picks one → lock into `aesthetic-contract.yaml` axis field
4. Downstream `publish-*` steps reference the locked philosophy (see `lib/rules/publish-patterns.md` Aesthetic Contract)

**Attribution**: Huashu Design Skill (alchaincyf/huashu-design, 2026-04, Personal Use License — idea reference, not code copy).
