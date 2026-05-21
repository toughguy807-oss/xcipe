# happyrobot.ai — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-3 (134/180 — 110~144 범위)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI / Logistics / Industrial Agents / B2B SaaS
**18축 종합**: **134/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위 — 시네마 풍경 hero) / `industrial-utilitarian` (2순위 — 물류 도메인)
**어워드**: lapa.ninja Top 10 (#8, 2026-05-04)
**적합 도메인**: Industrial AI / Logistics / Operations / B2B agents
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view (1회)
**출처 갤러리**: lapa.ninja (#8 / Artificial Intelligence 카테고리)

## 본질 (1줄)

> "물류 AI도 시네마 풍경 hero로 인간적 스케일을 보여야 한다 — 산악 + 트럭 + 황혼."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | 거대 sans-serif H1 흰색 on photo — 절제 |
| L1-2 Color | 8 | 검정 navbar + 시네마 황혼 톤 사진 — 단색 운용 |
| L1-3 Color Subtlety | 8 | Pure black/white 회피 추정 |
| L1-4 Trend Currency | 8 | 2025-2026 시네마 풍경 hero 트렌드 |
| L2-1 White Space | 7 | 사진이 화면 점유 — 절제 약함 |
| L2-2 Typo Hierarchy | 8 | H1 vs Subhead vs CTA 3단 대비 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 9 | 시네마 풍경 + 황혼 톤 일관 (산악+트럭+도로) |
| L3-1 Asymmetric Layout | 7 | 중앙 정렬 hero — 비대칭 약함 |
| L3-2 Grid Depth | 7 | 풀폭 사진 + Trust 로고 그리드 단순 |
| L3-3 Motion Intent | 7 | 정적 캡처 — 추정 미세 hover |
| L3-4 Interaction Craft ★ | 7 | hover 평이 추정 |
| L3-5 Mobile Fidelity ★ | 9 | 375 캡처 — H1 wrap + CTA pill 정상 |
| L3-6 LCP Visual Impact ★ | 9 | 시네마 산악+트럭 hero 즉시 |
| L3-7 Visual Flow ★ | 8 | Hero → CTA → Trust 로고 명확 |
| L3-8 Visual Rhythm ★ | 7 | 단조 (Hero 풀폭 + 로고 그리드) |
| L4-1 Content Weight | 9 | "Intelligence that runs your operations" + "platform to put agents to work in complex environments" — 가치 명제 명확 |
| L4-2 Signature Element | 8 | 시네마 풍경 hero + 검정 pill CTA + Trust 로고 (3대 — 시그니처 강도 보통) |
| **종합** | **134/180** | **CONDITIONAL — tier-3 등재** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러
- Background body (`--base-color-neutral--neutral-lightest`): `#FCFCFC` ✅ Pure white 회피 정확
- Anchor black (`--base-color-neutral--anchor-black`): `#0E0D0C` ✅ Pure black 회피 (Hull/시그니처)
- Anchor black darker: `#080808` (`neutral-darkest`)
- White: `#FFFFFF` (브랜드 white로 별도 운용)
- Brand neutral darker: `#333333`
- Brand neutral: `#CACACA` / dark `#858585` / light `#D9D9D9` / lighter `#D9E4E7`
- Brand cream: `#F9F8F6` (white 변종) / `#FCFCFC` (hull-white) / `#F2F2F2` (harbor-gray)
- Brand olive/khaki: `#EBE6D2` (cargo-khaki)
- Brand green (시그니처): `#A9C59D` (deck-green)
- Brand rust: `#D59566` (container-rust)
- Brand blue: `#112B42` (ocean-freight-blue) / `#2D62FF` (style-guide-blue)
- Error red: `#B42318` / Success green: `#027A48`
- CTA Cookie Accept: `#0E0D0C` (검정 pill) / 텍스트 `#FFFFFF`

### 폰트
- Display H1: **Tobias** ⚠️ **Serif Display 폰트** (Klim Type Foundry — 추정 sans-serif 정정. 시네마 매거진 톤 강화) / weight 400 / size 104px / letter-spacing -2.08px / line-height 93.6px / Georgia fallback
- Body: **Suisseintl** (Suisse Int'l — Swiss Typefaces) / Arial fallback / weight 400 / size 14px
- 폰트 조합: **Tobias Serif (Display) + Suisse Int'l (Body)** = Editorial 매거진 시그니처

### 간격
- Hero 풀폭 (사진 100% 너비)
- Container max: `100rem` (1600px)
- Border-radius 시스템: extra-small `.25rem` / small `.4rem` / medium `.5rem` / large `.75rem` / round `999px`
- Section grow padding: `5vw` / radius `2rem`
- Trust 로고: ~40-48px 높이, 그레이 톤

### 모션
- 정적 캡처 — 추정 hover 미세 모션 + parallax 가능성
- Section grow interaction (radius `2rem`, padding `5vw`) — Webflow Relume 시스템

## 시그니처 요소

1. **시네마 풍경 풀폭 hero** — 산악 + 도로 + 트럭 + 황혼 톤 (물류 AI 도메인 시각화)
2. **흰색 H1 + 라이트 CTA pill** — 사진 위 가독성 확보
3. **Trust 로고 그리드 (그레이톤)** — jobandtalent / Werner / Naturgy 등 좌측 정렬

## 사진 톤

- 시네마 풍경 사진: 90%+ (산악/도로/트럭 합성)
- Trust 로고: 10%
- 톤: warm 황혼 + amber + 시네마 보정

## 모션 정책

- 적용: 추정 미세 parallax + hover (정적 캡처)
- 절대 부재: 글래스모피즘, 네온, 보라 그라디언트

## 절대 안 쓰는 것 (NEVER List)

- Pure #FFF / #000
- 보라/파랑 그라디언트
- 글래스모피즘
- 네온 액센트
- 단조로운 Bento 카드

## Industrial-AI 적용 가이드 (★ 직격 — 물류/운영 AI 동일 도메인)

### 적용 가능 영역
- **Hero**: 산업 풍경 풀폭 사진 + 흰색 H1 + 라이트 CTA pill
- **물류/Operations 캠페인**: 시네마 풍경 + 황혼 톤
- **B2B Trust 로고**: 그레이톤 좌측 정렬 그리드
- **Industrial agents 비주얼**: 인간적 스케일(트럭/공장/현장) + 황혼 시네마 톤

### 적용 부적합 영역
- ❌ **Frontier AI Hero (terminal 톤)**: air.dev 톤 권고
- ❌ **Editorial 인물**: Anthropic/Augury 톤 권고
- ❌ **Bento Grid**: Vercel 톤 권고

### 가중치 추천
- 1순위 적용: Industrial Hero / Operations 캠페인 / Trust 로고 그리드
- 2순위 적용: Use Case 카드 (시네마 풍경 톤 차용)
- 미적용: Frontier AI Hero / Bento / KPI 임팩트

## 출처

- screenshots: `c:/tmp/dkb-rescore/happyrobot-{desktop,mobile}.png` (2026-05-04 캡처)
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view
- 갤러리 출처: lapa.ninja Top 10 #8 (2026-05-04 fetch)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-04 | 초기 등재 (134/180) — Vision 1440+375 검증 완료 — lapa.ninja Top 10 #8 / tier-3 |
| v1.1 | 2026-05-06 | 실측 토큰 갱신 — DevTools eval 검증. **Tobias(Serif Display) + Suisse Int'l(Body)** 조합 식별 — Editorial 매거진 톤 확정 / 추정 sans-serif 정정. Webflow Relume 빌드 + 풍부한 brand 색상 시스템(deck-green/cargo-khaki/container-rust) |

## 후속 보정 권고

1. tokens.css 정확값 추출 (DevTools eval) — 황혼톤 사진의 dominant hex 추출
2. 폰트 정확 식별
3. 모션 캡처 (parallax/hover 비디오) — 인터랙션 검증
4. dkb/patterns/composition/cinematic-photo-hero.md 신규 등재 검토 (fourmula + happyrobot 공통 패턴 — 시네마 풍경 hero)
