# donmolinico (donmolinico.es) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-1 (149/180 — Awwwards SOTD Apr 25, 2026)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 식품 브랜드 / Spanish heritage / Cinematic photo hero
**18축 종합**: **149/180**
**Tone 11종 라벨**: `cinematic-photo-hero` (1순위) / `editorial-magazine` (2순위)
**어워드**: Awwwards SOTD Apr 25, 2026
**적합 도메인**: 식품 브랜드 / heritage / hospitality / 농수산 / craft beverage / restaurant
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD Apr 25 (Batch 4)

## 본질 (1줄)

> "Spanish heritage food brand cinematic — cream `#FBF5E7` BG + 거대 `super-med` H1 216px + 풀블리드 charcuterie macro photo + 빨간 #D70321 wordmark badge의 1987 navarra 명제."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **super-med custom Sans H1 216px / 183.6 line-height — 거대 일러스트레이티브 헤드라인** |
| L1-2 Color | 9 | **cream `#FBF5E7` + red `#D70321` + secondary `#CBA058` gold + dark `#9F0005` — Pure 회피 만점** |
| L1-3 Color Subtlety | 8 | cream + red 듀얼 + gold 서브 + 음식 photo 색감 통합 |
| L1-4 Trend Currency | 9 | 2026 cinematic-photo-hero + heritage food brand 트렌드 직격 |
| L2-1 White Space | 8 | 거대 H1 + 풀블리드 photo — negative space는 photo 위 텍스트 zone |
| L2-2 Typo Hierarchy | 9 | 큰 H1 216px + 작은 마커 "DESDE 1987" / "NUEVA TRADICIÓN" 듀얼 라벨 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (스페인어) |
| L2-4 Image Tonality | 10 | **Spanish charcuterie 풀블리드 macro — Iberico ham + olives + cheese 일관 톤** |
| L3-1 Asymmetric Layout ★ | 9 | 좌상 wordmark + 좌측 마커 + 거대 H1 가운데 + 우측 마커 + photo 풀블리드 |
| L3-2 Grid Depth | 9 | **12-col + clamp `max(2rem,min(2vw,4rem))` 기반 gutter + svh viewport** |
| L3-3 Motion Intent ★ | 8 | 추정 scroll-triggered photo parallax + H1 reveal |
| L3-4 Interaction Craft | 8 | 메뉴 hover + 좌측 toggle UI |
| L3-5 Mobile Fidelity ★ | 9 | 375 — H1 3-line "DESDE NAVARRA A TODA ESPAÑA" 정합 + photo crop |
| L3-6 LCP Visual Impact ★ | 10 | **풀블리드 charcuterie photo + 216px H1 + 빨간 wordmark — 즉시 cinematic 임팩트** |
| L3-7 Visual Flow ★ | 9 | wordmark → H1 → 마커 듀얼 → photo 전체 통합 1장면 |
| L3-8 Visual Rhythm ★ | 9 | 거대 1축(H1) + 듀얼 마커 라벨 + photo macro — 3축 리듬 |
| L4-1 Content Weight | 9 | "DESDE NAVARRA A TODA ESPAÑA" / "DESDE 1987" / "NUEVA TRADICIÓN" 명제 강 |
| L4-2 Signature Element ★ | 10 | **빨간 wordmark badge + super-med 216px + 풀블리드 charcuterie + cream + 1987** (5대 시그니처) |
| **종합** | **149/180** | **PASS — tier-1 등재 (Awwwards SOTD Apr 25)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: **`#FBF5E7`** (`--c-bg`) — warm cream
- 텍스트 primary (body color): **`#D70321`** (`--c-accent`, `--text-color`) ★ red dominant
- 텍스트 alt (photo 위): **`#FBF5E7`** (`--c-text-alt`) cream
- secondary: **`#CBA058`** (`--c-secondary`) gold
- accent dark: **`#9F0005`** (`--c-accent-dark`)
- placeholder: `#363636`

### 폰트
- 시그니처 family: **super-med** (custom Sans, 일러스트레이티브 weight)
- fallback: Helvetica, sans-serif
- H1: 216px / weight 400 / line-height 183.6px (line-height/font-size = 0.85)
- letter-spacing: normal (super-med 자체가 condensed-display)

### 그리드 (12-col fluid)
- `--columns: 12`
- `--width: 96vw` (margin 4vw)
- `--gutter: max(2rem, min(2vw, 4rem))` ★ clamp-style gutter
- `--col: calc((96vw - 11 * gutter) / 12)`
- `--col-{1..12}` 사전 계산 12개
- `--offset / --offset-half / --offset-double` 3종

### Modern CSS
- **svh** viewport unit 사용 (`--height: 100svh`)
- **clamp via max(min())** gutter pattern (modern CSS 패턴)
- `--radius: 2rem` 큰 둥근 모서리
- 30 vars 구조화

## 시그니처 요소

1. **빨간 wordmark badge** "DON MOLINICO" — 좌상 absolute 고정 (Heritage seal 형태)
2. **super-med 216px 거대 H1** — Spanish heritage typography 명제
3. **풀블리드 charcuterie macro photo** — Iberico ham + olives + cheese cinematic
4. **cream + red 듀얼 팔레트** + gold accent — heritage food brand 톤
5. **"DESDE 1987" 마커 라벨** — heritage years 강조

## 사진 톤
- Spanish charcuterie macro 100% (Iberico, queso, olivas)
- warm tone + 정상조명 (자연광 따뜻)
- 풀블리드 1장 단독 (multi-image collage 부재)

## 모션 정책
- 적용: scroll parallax + H1 reveal (추정)
- 절대 부재: 글래스모피즘, 네온 글로우, 한국 SI 스타일

## 절대 안 쓰는 것 (NEVER List)
- Pure white BG / Pure black BG
- pastel / cute (heritage 진중 충돌)
- 한국 SI 스타일
- 차가운 blue-grey 팔레트

## 적용 가이드 (cinematic-photo-hero 1순위)
- **식품 브랜드 / heritage / hospitality / 농수산** 1순위
- **풀블리드 macro photo + 거대 condensed H1** 차용
- **cream + brand color (red/green/blue) 듀얼** 팔레트
- **wordmark badge 좌상 고정** 헤리티지 seal

### 적용 부적합
- ❌ B2B SaaS dashboard (cinematic 부적합)
- ❌ AI dev tools (air-dev-retro-cyan 권고)
- ❌ 의료/법률 (red 위험)

## 출처

- screenshots: `c:/tmp/dkb-rescore/donmolinico-{desktop,mobile}.png` (2026-05-06)
- favicons: `c:/tmp/dkb-rescore/donmolinico-favicon-{150,20}.png` (PNG primary)
- tokens: `c:/tmp/dkb-rescore/batch4-tokens.json` § donmolinico
- award: Awwwards SOTD Apr 25, 2026

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + Awwwards SOTD 게이트 통과 (149/180) |

## 후속 보정 권고
1. super-med 폰트 라이선스/대안 조사 (Druk Wide / Migra / Editorial New 매핑)
2. patterns/cinematic/heritage-food-brand-hero.md 신규 등재 검토 (Don Molinico + 영어권 비교)
3. clamp via `max(min())` gutter 패턴 → publish-style modern fluid grid 옵션 추가 검토
