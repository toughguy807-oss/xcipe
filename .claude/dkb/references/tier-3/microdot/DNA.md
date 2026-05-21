# microdot (microdot.vision) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (131/180 — siteinspire #8)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 디자인 에이전시 / 포트폴리오 / 패션·라이프스타일 클라이언트
**18축 종합**: **131/180**
**Tone 11종 라벨**: `cinematic-photo-hero` (1순위) / `minimal-mono` (2순위)
**갤러리**: siteinspire.com Top 10 (2026-05-04)
**적합 도메인**: 디자인 에이전시 / 포트폴리오 / 패션 / 라이프스타일 / cinematic 3D
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval
**출처**: siteinspire.com Top 10 (Batch 3)

## 본질 (1줄)

> "Rendering imagination — warm dark `#0D0D0D` BG + 2 figures 3D fall + 페이지네이션 (G-Star, Anatomic Denim) + 하단 portfolio 썸네일 그리드 + Next.js custom font hash naming의 디자인 에이전시 시그니처."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | Next.js custom font (`__font_1c1708`) — 자체 폰트 hash 시그니처 |
| L1-2 Color | 7 | warm dark `#0D0D0D` BG (Pure black 회피 ✅) + Pure white text |
| L1-3 Color Subtlety | 6 | `--focus: #2997ff` (Apple-style blue) + `--highlight-foreground: red` 액센트 |
| L1-4 Trend Currency | 7 | 2026 portfolio thumbnails grid + 3D figure 트렌드 |
| L2-1 White Space | 7 | 메뉴 13px + portfolio thumbnails 정밀 |
| L2-2 Typo Hierarchy | 7 | 14px 메뉴 + 보조 카피 (단조 — 큰 H1 absent — 캐릭터 중심) |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality | 9 | **3D figure 2명 fall + portfolio 썸네일 그리드 — 일관 cinematic 톤** |
| L3-1 Asymmetric Layout ★ | 8 | 좌상단 메뉴 + 우상단 클라이언트 + 중앙 figures + 하단 thumbnails 4축 |
| L3-2 Grid Depth | 8 | figures z 부유 + thumbnails 그리드 별도 z |
| L3-3 Motion Intent ★ | 7 | 추정 — figures 떨어짐/회전 모션 (3D 부유) |
| L3-4 Interaction Craft | 7 | thumbnails hover preview (추정) + 페이지네이션 |
| L3-5 Mobile Fidelity ★ | 7 | 375 캡처 — figures 정합 |
| L3-6 LCP Visual Impact ★ | 8 | 2 figures 부유 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | 메뉴 → figures → thumbnails 명확 |
| L3-8 Visual Rhythm ★ | 7 | 3축 — 다소 단조 |
| L4-1 Content Weight | 7 | "Rendering imagination" + "What makes design at work over 187" 카피 |
| L4-2 Signature Element ★ | 8 | **3D figure fall + warm dark BG + thumbnails grid + Next.js custom font hash** (4대 시그니처) |
| **종합** | **131/180** | **PASS — tier-3 등재 (siteinspire Top 10)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background: `#0D0D0D` rgb(13, 13, 13) — **warm dark (Pure black `#000000` 회피 ✅)**
- foreground: `#FFFFFF` (Pure white)
- nav-color: `#FFFFFF`
- focus: `#2997ff` (Apple/macOS 시스템 blue 액센트)
- highlight-foreground: `red` (CSS 키워드)
- focus-transparent: `rgba(41, 151, 255, .2)` (focus + .2 alpha)
- highlight-background: `rgba(255, 0, 0, .2)`
- border-color: `hsla(0, 0%, 100%, .1)` (white 10% alpha)
- CSS vars: **10개 (최소 — Next.js minimalist token)**

### 폰트
- 단일 family: **`__font_1c1708` (Next.js custom font hash)** + `__font_Fallback_1c1708`
- fallback: sans-serif
- H1 (실제로는 wordmark "Microdot"): 14px, weight 400, lineHeight 16px (1.14)
- 자체 hash naming — Next.js `next/font/local` 시그니처

### 빌드 플랫폼
- **Next.js** (`__font_*` hash naming은 Next.js next/font 시그니처)
- 최소 토큰 시스템 (10 vars)

### 클라이언트
- G-Star, Anatomic Denim (페이지네이션 표기)
- 패션/라이프스타일 도메인 명확

### 모션
- 추정: figures 부유/떨어짐 + thumbnails hover scale

## 시그니처 요소

1. **3D figure 2명 부유/fall** — agency 자체 3D 컴포지션
2. **warm dark BG `#0D0D0D`** — Pure black 회피
3. **하단 portfolio thumbnails grid** — 작품 인덱스 시그니처
4. **Next.js custom font hash naming** (`__font_1c1708`) — 빌드 시그니처

## 사진 톤
- 3D 인물 부유 (figure rendering)
- 패션 클라이언트 작품 (G-Star, Anatomic Denim 풍 추정)

## 모션 정책
- 적용: figures 부유 + thumbnails hover (추정)
- 절대 부재: 글래스모피즘, 네온 글로우, pastel

## 절대 안 쓰는 것 (NEVER List)
- Pure black `#000000` (warm dark `#0D0D0D` 정책)
- pastel/cute
- glassmorphism / neon glow

## 적용 가이드 (cinematic 3D 1순위)
- **디자인 에이전시 / 포트폴리오 / 패션 / 라이프스타일** 1순위
- **3D figure 부유 hero** 차용
- **warm dark BG + thumbnails grid 하단** 정책
- **Next.js next/font** 빌드 (custom font hash)

### 적용 부적합
- ❌ 한국 SI / 정부 (lgcns-mint-pastel 권고)
- ❌ B2B Capital (oldtomcapital editorial 권고)
- ❌ AI dev tools (air-dev-retro-cyan 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/microdot-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/microdot-favicon-95.png` (1357B) + `microdot-favicon-50.svg` (393B)
- tokens: `c:/tmp/dkb-rescore/batch3-tokens.json` § microdot
- gallery: siteinspire.com Top 10 (2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + DevTools 토큰 + siteinspire 갤러리 게이트 통과 (131/180) |

## 후속 보정 권고
1. 3D figures 모션 비디오 캡처 — fall sequence 검증
2. Next.js custom font 추출 (개발자 도구로 woff2 다운로드 시도)
3. patterns/composition/3d-figure-floating-hero.md 신규 등재 검토
