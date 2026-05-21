# americanhousing (americanhousing.com) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-1 (148/180 — siteinspire #7 Corporate)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 비영리 / 정책 advocacy / 미국 주택 공급 캠페인 ('Saving the American Dream')
**18축 종합**: **148/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `cinematic-photo-hero` (2순위)
**어워드**: siteinspire #7 Corporate (2026-05-04)
**적합 도메인**: Corporate / Non-profit / Public policy / Housing / Civic narrative
**Vision 검증**: 2026-05-06 — Playwright 1440+375 + 멀티모달 view + DevTools eval
**출처**: siteinspire.com #7 (Batch 5)

## 본질 (1줄)

> "Saving American Dream — cumulus cream `#FDFFF1` + die-d Adobe custom Sans 64px + 풀블리드 cityscape photo + 'Through All-Out Housing Production' Editorial subhead — Civic policy advocacy를 매거진처럼."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **die-d Adobe custom 64px H1 / H2 동일 64px medium 500 / line-height 64px (1.0) — Editorial 정밀** |
| L1-2 Color | 9 | **cumulus cream `#FDFFF1` BG + black text + blue `#1968B4` + driveway `#302D2D` — 4-tone civic** |
| L1-3 Color Subtlety | 8 | cumulus 냉온 균형 + driveway 40% `#ACABAB` + red `#953012` 강조 |
| L1-4 Trend Currency | 8 | **2026 cumulus cream + 풀블리드 cityscape + Tailwind v4 토큰 — Editorial advocacy 트렌드** |
| L2-1 White Space | 9 | **풀블리드 cityscape + 단정 Editorial 헤드라인 — 거대 negative space** |
| L2-2 Typo Hierarchy | 9 | "Saving the American Dream" 64px → "Through All-Out Housing Production" 64px subhead → body — 명확 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (영문 advocacy 전용) |
| L2-4 Image Tonality | 9 | **풀블리드 cityscape urban photo — 일관 Editorial 톤** |
| L3-1 Asymmetric Layout ★ | 8 | hero text 좌측 하단 + cityscape 풀블리드 — 비대칭 |
| L3-2 Grid Depth | 8 | 36 vars Tailwind v4 + cumulus/driveway tonal layered |
| L3-3 Motion Intent ★ | 7 | 절제 transition (Editorial advocacy 톤) |
| L3-4 Interaction Craft | 7 | Mission/Careers nav + Saving CTA pill |
| L3-5 Mobile Fidelity ★ | 8 | 375 모바일 hero 적합 (cityscape 트리밍) |
| L3-6 LCP Visual Impact ★ | 9 | **풀블리드 cityscape + 'Saving the American Dream' Editorial — 즉시 시그니처** |
| L3-7 Visual Flow ★ | 8 | hero → mission → narrative 선형 |
| L3-8 Visual Rhythm ★ | 8 | cityscape + Editorial headline + body + CTA — 4축 리듬 |
| L4-1 Content Weight | 10 | **'Saving the American Dream' + 'Through All-Out Housing Production' civic narrative 명제** |
| L4-2 Signature Element ★ | 9 | **die-d Adobe custom font + cumulus `#FDFFF1` + 풀블리드 cityscape + Civic narrative** (4대 시그니처) |
| **종합** | **148/180** | **PASS — tier-1 등재 (siteinspire #7 Corporate)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background: **`#FDFFF1`** (`--color-cumulus`) — cumulus cream (warm white-yellow)
- 텍스트 primary: `#000000` (`--color-black`)
- driveway accent: **`#302D2D`** (`--color-driveway`) + 40% `#ACABAB`
- blue: **`#1968B4`** (`--color-blue`) + dark `#145390`
- red: **`#953012`** (`--color-red`)
- error: `#FF8A7A` / green: `#21CC56`
- white: `#FFFFFF`

### 폰트
- body: **`die-a`** (`--font-die-a: "die-a",sans-serif`) — Adobe Fonts custom
- H1/H2: **`die-d`** (`--font-die-d: "die-d",sans-serif`) — Adobe Fonts custom Sans
- Editorial Serif 보조: **`gt-super-book`** (`--font-gt-super-book`) — Grilli Type
- mono: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas
- H1: **64px / weight 500 medium / letter-spacing normal / line-height 64px (1.0)**
- H2: 64px / weight 500 medium / driveway color

### 그리드 / spacing
- spacing scale: `--spacing: .25rem` (Tailwind v4 base)
- 36 vars (Tailwind v4 oklch system 변종)
- font-weight scale: medium 500 / normal 400

### 모션
- `--default-transition-duration: .15s`
- `--default-transition-timing-function: cubic-bezier(.4,0,.2,1)` (Tailwind 기본)
- `--blur-lg: 16px` (subtle 적용)

## 시그니처 요소

1. **die-d Adobe custom Sans** — 64px H1 medium 500 (rare custom typeface)
2. **cumulus cream `#FDFFF1`** — warm yellow-white BG (Anti-Slop 양성)
3. **풀블리드 cityscape** — Editorial advocacy hero photo
4. **'Saving the American Dream'** — Civic narrative copy
5. **Tailwind v4 oklch** + 36 vars — modern build chain

## 사진 톤
- cityscape urban photo 풀블리드 (Editorial advocacy 톤)
- driveway gray 보조 사진 (mission section)
- warm tone 통일 (cumulus 배경과 정합)

## 모션 정책
- 적용: 절제 transition (.15s + cubic-bezier .4 0 .2 1)
- 절대 부재: WebGL, 3D, 글래스모피즘 (Editorial advocacy 톤 유지)

## 절대 안 쓰는 것 (NEVER List)
- Pure white #FFFFFF BG (cumulus warm으로 차별)
- 다크 BG (Civic advocacy = light)
- 갬블링 / playful 톤
- 한국어 (영문 전용)

## 적용 가이드 (editorial-magazine 1순위)

- **Civic / Non-profit / Public policy / Advocacy** 1순위
- **cumulus cream `#FDFFF1` BG** 차용 (Anti-Slop 양성 토큰)
- **풀블리드 cityscape / urban photo hero** 차용
- **Editorial 64px medium H1 + 동일 크기 subhead** 패턴
- **die 시리즈 / Adobe Fonts custom** — 차별화 typography

### 적용 부적합
- ❌ B2B SaaS / dev tools (Editorial advocacy 톤)
- ❌ playful / Gen-Z (절제 톤)
- ❌ E-commerce 풀블리드 product (cityscape 시그니처와 충돌)

## 출처

- screenshots: `c:/tmp/dkb-rescore/americanhousing-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/americanhousing-favicon-*.png|svg`
- tokens: `c:/tmp/dkb-rescore/batch5-tokens.json` § americanhousing
- gallery: siteinspire #7 Corporate (2026-05-04 추출)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 (148/180, tier-1 — Batch 5 #1) |

## 후속 보정 권고
1. die-a / die-d Adobe Fonts 라이선스 확인 (외부 차용 시)
2. cumulus `#FDFFF1` → `patterns/color-systems/cumulus-cream.md` 신규 등재 검토
3. 풀블리드 cityscape advocacy hero → `patterns/cinematic/civic-cityscape-hero.md` 검토
