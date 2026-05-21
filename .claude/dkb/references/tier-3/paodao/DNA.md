# paodao (paodao.fr) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (126/180 — Awwwards SOTD May 03, 2026)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: WebGL 3D 인터랙티브 게임 / 1인 Creative Coding 프로젝트 / 'Là où rêvent les Mondes'
**18축 종합**: **126/180**
**Tone 11종 라벨**: `cinematic-photo-hero` (1순위 — WebGL cinematic) / `playful-toy` (2순위 — 3D voyageur)
**어워드**: Awwwards SOTD May 03, 2026
**적합 도메인**: Creative coding / WebGL portfolio / Interactive narrative / 게임 / 캠페인 micro-site
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 (90s timeout, LOADING canonical state) + 멀티모달 view + DevTools eval
**출처**: awwwards.com SOTD May 03 (Batch 4)

## 본질 (1줄)

> "WebGL 3D voyageur loading scene + 'Parlez aux voyageurs que vous croisez' 프랑스어 시적 카피의 Three.js cinematic 게임 micro-site — Pure black BG + 4-font (Lato + Playfair + Orbitron + indie_flowerregular) 멀티 family + paper `#9D7E4C` warm tone."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 6 | H1 38px small (3D 영역 우선) — 헤드라인 강도 낮음 |
| L1-2 Color | 4 | **Pure black `#0B0B0B` BG ⚠️ + warm paper `#9D7E4C` 3D 캐릭터로 보완** |
| L1-3 Color Subtlety | 7 | paper warm + 작은 blue accent + 3D shading natural |
| L1-4 Trend Currency | 9 | **2026 WebGL/Three.js cinematic + 3D character 트렌드 직격** |
| L2-1 White Space | 7 | 3D 캐릭터 가운데 + 거대 negative space 양옆 |
| L2-2 Typo Hierarchy | 6 | "LOADING" + 시적 카피 1줄 + 작은 H1 — 미묘 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (프랑스어) |
| L2-4 Image Tonality | 9 | **3D voyageur 캐릭터 풍자 + 그림자 ground — Three.js cinematic 일관** |
| L3-1 Asymmetric Layout ★ | 8 | 3D 가운데 + 시적 카피 하단 — 비대칭 단순 |
| L3-2 Grid Depth | 7 | 25 vars 구조 + WebGL 캔버스 z축 |
| L3-3 Motion Intent ★ | 9 | **WebGL 3D 캐릭터 idle animation + Three.js scene** ★ |
| L3-4 Interaction Craft | 8 | 3D 인터랙션 (cursor parallax / 캐릭터 reaction 추정) |
| L3-5 Mobile Fidelity ★ | 5 | WebGL 모바일 성능 우려 (375 캡처 정합 미확인) |
| L3-6 LCP Visual Impact ★ | 9 | 3D voyageur + LOADING 즉시 시그니처 |
| L3-7 Visual Flow ★ | 7 | 3D → LOADING → 시적 카피 (선형) |
| L3-8 Visual Rhythm ★ | 7 | 3D 1축 + LOADING 마커 + 카피 — 3축 리듬 |
| L4-1 Content Weight | 9 | "Parlez aux voyageurs que vous croisez : leurs mots sont parfois des portes, et leurs silences des indices." 시적 명제 강 |
| L4-2 Signature Element ★ | 9 | **WebGL 3D voyageur + 4-font 멀티 (Lato/Playfair/Orbitron/indie_flowerregular) + 프랑스어 시적 카피 + Pure black + paper warm** (5대 시그니처) |
| **종합** | **126/180** | **PASS — tier-3 등재 (Awwwards SOTD May 03)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background: **Pure black 추정** (`--rgb-black: 11 11 11`) ⚠️ Anti-Slop 위반
- 텍스트 primary: **`#F2F2F7`** (`--color-white: rgb(242 242 247)`) — 따뜻한 off-white
- paper accent: **`#9D7E4C`** (`--color-paper`, `--rgb-paper: 157 126 76`) — 3D 캐릭터 옷색
- blue accent: **`#0066FF`** (`--color-blue`) + dark `#001A40` (`--color-blue-dark`)
- transparent: `--color-blackTransparent: #00000077`

### 폰트
- **4-family 멀티 시스템** ★ (드문 패턴):
  - default: **`Lato`** (`--fontFamily-default`)
  - title: **`Playfair, serif`** (`--fontFamily-title`) — Editorial Serif
  - **`Orbitron`** (`--fontFamily-orbitron`) — sci-fi geometric
  - **`indie_flowerregular`** (`--fontFamily-script`) — handwritten
- font-sizes: small `.85rem` / default `1.3rem` / title `2rem`
- H1: 38px / weight 700 / letter-spacing normal / Lato (3D 영역 외 작은 카피)

### 모션 / 그래픽
- **WebGL Three.js (추정)** — 3D 캐릭터 idle animation
- `--transitionDuration: .25s`
- `--blurSize: 5px`
- `--transition: 0%`
- 25 vars (체계화됨)

### 그리드
- gap-small `.5rem` / gap-normal `1rem` / gap-large `2rem` 3단계
- borderSize `1px`
- 단순 spacing system

## 시그니처 요소

1. **WebGL 3D voyageur 캐릭터** — Three.js scene + idle animation (paper warm 의상)
2. **4-font 멀티 family** (Lato + Playfair + Orbitron + indie_flowerregular) — 하나의 사이트에 4종 사용
3. **프랑스어 시적 카피** "Parlez aux voyageurs que vous croisez..." — Editorial 명제
4. **Pure black + paper warm** 듀얼 — cinematic + heritage 톤
5. **LOADING canonical state** — 게임 site 진입 의식

## 사진 톤
- 3D 렌더링 100% (실사 photo 부재)
- 캐릭터 1체 가운데 + ground shadow
- warm paper tone 통일 (Spaghetti Western style)

## 모션 정책
- 적용: WebGL Three.js + 3D 캐릭터 idle + cursor parallax (추정)
- 절대 부재: 평면 transition only, 글래스모피즘

## 절대 안 쓰는 것 (NEVER List)
- 평면 디자인 (3D 시그니처)
- pastel / 한국 SI
- B2B SaaS dashboard 톤

## 적용 가이드 (cinematic 1순위 — WebGL 한정)
- **Creative coding portfolio / 캠페인 micro-site / 인터랙티브 narrative** 1순위
- **WebGL Three.js 3D 캐릭터 single hero** 차용 (capacity 있을 때만)
- **multi-font (3-4 family)** mix — Editorial + sci-fi + script
- **시적/문학적 카피** — 단순 마케팅 카피 회피

### 적용 부적합
- ❌ B2B SaaS / 대시보드 (WebGL 부담)
- ❌ E-commerce (LOADING state 전환 부적합)
- ❌ 모바일 우선 / 저사양 디바이스 타겟
- ❌ 가독성 우선 사이트

## ⚠️ 주의 사항

- **Pure black BG 사용** — Anti-Slop 정책 ⚠️ (paper warm + blue accent로 보완하지만 회피 권고)
- **WebGL 의존** — 모바일/저사양 fallback 필요
- **LOADING canonical state** — 90s timeout 후 메인 화면 진입. 본 캡처는 LOADING 상태 (시그니처 인정)

## 출처

- screenshots: `c:/tmp/dkb-rescore/paodao-{desktop,mobile}.png` (2026-05-06, LOADING state)
- favicon: `c:/tmp/dkb-rescore/paodao-favicon-5.ico`
- tokens: `c:/tmp/dkb-rescore/batch4-tokens.json` § paodao
- award: Awwwards SOTD May 03, 2026

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + 90s timeout 후 LOADING 캡처 (126/180) |

## 후속 보정 권고
1. WebGL 메인 scene 진입 후 재캡처 — LOADING 이외 시그니처 검증 (인터랙션 가능 시)
2. 4-font 멀티 family 패턴 → patterns/typography/multi-family-stack.md 신규 등재 검토
3. Three.js + idle animation 3D 캐릭터 패턴 → patterns/motion/webgl-character-hero.md 검토
4. Pure black 사용 → DKB ranking에 -5 패널티 적용 일관성 점검
