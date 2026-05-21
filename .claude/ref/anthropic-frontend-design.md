# Anthropic Frontend Design Skill (원본 흡수)

> 출처: AX_website (`.agents/skills/frontend-design/SKILL.md`) — Anthropic 공식 Skills 저장소
> 흡수일: 2026-04-30
> license: Anthropic frontend-design (참조용)
> 적용: design-orchestrator + design-replicate + ref/design-taste.md

## 원본 핵심 메시지

> "Create distinctive, production-grade frontend interfaces that avoid generic AI-slop aesthetics."

평범한 AI 룩(보라 그라디언트, Inter, 글래스모피즘)에서 벗어나, **의도된 미적 방향(intentionality)** 으로 차별화된 프로덕션급 인터페이스를 만든다.

## Design Thinking — 코딩 전 사전 결정

코딩 시작 전 4가지 컨텍스트 확정:

| # | 항목 | 질문 |
|---|------|------|
| 1 | **Purpose** | 이 인터페이스가 해결하는 문제는? 누가 사용하는가? |
| 2 | **Tone** | 11종 중 1개 선택 (다음 표) |
| 3 | **Constraints** | 기술 제약 (프레임워크, 성능, 접근성) |
| 4 | **Differentiation** | 무엇이 이 디자인을 unforgettable하게 만드는가? 1개의 기억할 만한 요소는? |

### Tone 11종 (1개 선택 강제)

| Tone | 설명 |
|------|------|
| brutally minimal | 극단적 미니멀 (예: 텍스트만, 흑백) |
| maximalist chaos | 의도된 혼돈 (밀도 극대) |
| retro-futuristic | 80~90년대 미래상 (Synthwave, neon) |
| organic/natural | 유기적·자연 (texture, soft curve) |
| luxury/refined | 럭셔리 (절제, gold, serif) |
| playful/toy-like | 장난감/캐릭터 (둥근, 컬러풀) |
| editorial/magazine | 매거진 (Serif, 비대칭, 레이아웃) |
| brutalist/raw | 브루탈리즘 (gray scale, sharp) |
| art deco/geometric | 아르데코 (기하학, gold, symmetric) |
| soft/pastel | 파스텔 (soft, pink, peach) |
| industrial/utilitarian | 산업 (기능 중심, mono, grid) |

> **CRITICAL**: 11개 중 1개 선택 후 **정밀 실행**. Bold maximalism과 refined minimalism 모두 OK. 핵심은 **intentionality**, intensity가 아니다.

## Frontend Aesthetics Guidelines (5축)

### 1. Typography

> Choose fonts that are **beautiful, unique, and interesting**.

- **Avoid generic fonts** like Arial and Inter
- 대신 **distinctive choices** (unexpected, characterful)
- **Display + Body 페어링** — 다른 폰트 가족 믹스
- 예시 권장 페어:
  - Display: Crimson Pro Italic / Söhne / GT America / Editorial New
  - Body: Inter (단, Display와 다른 가족이라 OK) / Söhne / Pretendard

### 2. Color & Theme

> Commit to a **cohesive aesthetic**.

- CSS 변수로 일관성 유지
- **Dominant + Sharp accents** > timid evenly-distributed palettes
- 약한 균형 잡힌 4~5색은 평범. 1개 dominant + 1개 sharp accent가 강함

### 3. Motion

- Effects + micro-interactions에 사용
- **CSS-only solutions 우선** (HTML)
- React은 Motion library
- **High-impact moments에 집중**:
  - One well-orchestrated page load (staggered reveals via `animation-delay`)
  - Scroll-triggering 서프라이즈
  - Hover states 서프라이즈
- 흩어진 micro-interactions보다 **1개의 잘 안무된** 모먼트가 효과적

### 4. Spatial Composition

- Unexpected layouts
- Asymmetry
- Overlap (요소 겹치기)
- Diagonal flow
- Grid-breaking elements
- **Generous negative space** OR **controlled density** — 둘 중 1개 commit

### 5. Backgrounds & Visual Details

> Create **atmosphere and depth** rather than defaulting to solid colors.

- Contextual effects + textures (Tone 정합)
- Creative forms:
  - Gradient meshes
  - Noise textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Grain overlays

## NEVER List (Anti-Slop 명시)

> NEVER use generic AI-generated aesthetics:

- **Overused fonts**: Inter, Roboto, Arial, system fonts
- **Cliched colors**: 보라 그라디언트 on white
- **Predictable layouts**: 3-col 카드 그리드 반복
- **Cookie-cutter design** that lacks context-specific character

### 다양화 의무

> Vary between light and dark themes, different fonts, different aesthetics.
> **NEVER converge on common choices** (Space Grotesk, for example) across generations.

매 시안마다 의도적으로 다른 톤·폰트·미적 방향 선택.

## ★ Default House Style 회피 룰 (2026-05-04 추가, 외부 리서치 기반)

> 출처: Muzli "Claude Design One Week In" 외 (Claude Opus 4.7의 default 미적 본능 검증)
> 모든 프로젝트의 디자인 시안 생성 시 1차 검증 룰.

### Claude Opus 4.7의 default house style (자동 회귀 톤)

```
배경     : warm cream / off-white #F4F1EA
타이포   : serif display + italic word-accents
액센트   : terracotta / amber / coral
레이아웃 : Editorial 매거진 절제
```

= **anthropic.com 톤 그대로**. LLM이 톤 자가 결정 시 본능적으로 이 톤으로 회귀.

### 도메인별 적합/부적합

| 적합 도메인 (default 그대로 OK) | 부적합 도메인 (default **명시 차단** 필수) |
|----|----|
| editorial / 매거진 / 출판 | dashboards / dev tools |
| hospitality / 공간 / 호텔 / 카페 | fintech / SaaS B2B |
| portfolio / 개인 / 작가 | healthcare / medical |
| 라이프스타일 / wellness | enterprise apps |
| | **manufacturing / Industrial AI** |

### 부적합 도메인에서 default 차단 필수

manufacturing / B2B / dev tool / fintech / healthcare / enterprise를 대상으로 시안 생성 시 **명시적으로 다음 4개 차단**:

```
[DEFAULT 차단 룰]
- 배경 #F4F1EA 또는 warm cream/off-white 류 X
- Serif Display + Italic word-accents 시그니처 X
- terracotta / amber / coral / sepia 류 액센트 X
- Editorial 매거진 절제 톤 X (B2B는 trust/authority가 핵심)

→ 차단 후 명시적으로 도메인 적합 톤 1개 commit:
- Industrial AI / manufacturing → industrial-utilitarian (mono + grid + 기능)
                                  또는 brutalist-raw (회색 + sharp + 거대 텍스트)
- Dev tool / SaaS B2B           → KPI Dark (linear 스타일) 또는 industrial
- Fintech                       → refined-minimal 다크 또는 industrial
- Healthcare                    → soft 절제 (단 default와 다른 컬러)
- Enterprise app                → industrial 또는 brutalist refined
```

### 검증 (시안 생성 후 자가 점검)

- 배경 hex가 #F4F1EA / #FAFAF7 / #F5F2EA 류면 → default 회귀 의심 → 도메인 부적합 시 BLOCK
- 폰트가 Serif Italic Display 시그니처 사용 → 부적합 도메인이면 BLOCK
- terracotta/amber/coral 액센트 → 부적합 도메인이면 BLOCK
- "Italic em + underline 강조 단어" 시그니처 → 부적합 도메인이면 BLOCK

### 검증 사례 학습

> 본 룰의 검증 케이스는 메모리로 분리되어 보존됨.
> 참조: `~/.claude/projects/c--Users-hj-moon--claude/memory/feedback_default_house_style_failures.md`

## Implementation Complexity 매칭

> Match implementation complexity to the aesthetic vision.

| 미적 비전 | 코드 복잡도 |
|----------|----------|
| Maximalist | 정교한 코드 + 광범위한 애니메이션·이펙트 |
| Minimalist / Refined | 절제 + 정밀 + spacing/typography/subtle 디테일 집중 |

**Elegance comes from executing the vision well.**

## 마지막 메시지

> Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## 우리 시스템 통합 매핑

| Anthropic 원본 | 우리 시스템 |
|--------------|-----------|
| 4 Design Thinking | design-orchestrator Step 0-D 브랜드 시트 + Step 0-B.5 Mode 결정 |
| Tone 11종 | DKB references industries/{업종}.md 매핑 |
| 5축 가이드라인 | publish-visual-verify 18-Axis (특히 L1/L3 축) |
| NEVER List | publish-visual-verify Phase 1 Never-Rules + ref/design-taste.md |
| 다양화 의무 | design-replicate 3종 관점 (V1/V3/V4) — 같은 톤 수렴 차단 |
| Implementation Complexity 매칭 | design-orchestrator Speed/Quality/Premium Mode |

## 참조

- 원본: AX_website `.agents/skills/frontend-design/SKILL.md`
- 통합: `ref/design-taste.md` (Anti-Slop 룰 강화)
- 적용: `agents/design-orchestrator.md`, `skills/design-replicate`, `skills/publish-visual-verify`
