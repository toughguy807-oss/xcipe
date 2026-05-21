# air.dev — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-1 (148/180 — 145+ 게이트 + 시그니처 강도)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI / Dev Tools / Agentic Development Environment / JetBrains
**18축 종합**: **148/180**
**Tone 11종 라벨**: `retro-futuristic` (1순위 — pixel/CRT 미감 + 시안 액센트) / `brutalist-raw` (2순위 — mono 폰트 + 다크 + 노란 형광)
**어워드**: lapa.ninja Top 10 (#7, 2026-05-04)
**적합 도메인**: dev tools / Agentic AI / JetBrains 생태계 / Frontier 인프라
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view (1회)
**출처 갤러리**: lapa.ninja (#7 / Development Tools 카테고리)

## 본질 (1줄)

> "Agentic AI는 90년대 터미널처럼 보여야 한다 — pixel + 다크 + 시안 형광."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 10 | pixel/mono 폰트 단일 family + JetBrains Mono 추정 — 시그니처 |
| L1-2 Color | 9 | 다크 배경 + 시안/Teal 액센트 + 노란 형광 CTA (CRT 미감) |
| L1-3 Color Subtlety | 8 | Pure black 회피 추정 (#0A0A0A) + 시안 채도 정밀 |
| L1-4 Trend Currency | 9 | 2025-2026 Retro-futuristic AI dev tools 톱 패턴 |
| L2-1 White Space | 8 | Hero 절제 + IDE 스크린샷 풀폭 |
| L2-2 Typo Hierarchy | 9 | 거대 H1 mono vs 본문 mono 체계적 대비 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 9 | IDE 다크 스크린샷 + 시안 액센트 — 톤 일관 |
| L3-1 Asymmetric Layout | 8 | Hero + IDE 패널 비대칭 + 카드 변주 |
| L3-2 Grid Depth | 9 | 코드 패널 z-축 + 다크 그리드 디테일 |
| L3-3 Motion Intent | 9 | 추정 — 코드 hover + agentic 모션 (JetBrains 라이브 데모) |
| L3-4 Interaction Craft ★ | 9 | hover 정밀 + JetBrains 표준 (검증 미수행) |
| L3-5 Mobile Fidelity ★ | 8 | 375 캡처 — pixel 워드마크 + 시안 박스 정상 |
| L3-6 LCP Visual Impact ★ | 9 | "run beloved agents side by side" mono H1 즉시 |
| L3-7 Visual Flow ★ | 8 | Hero → Features → Download 명확 |
| L3-8 Visual Rhythm ★ | 8 | 다크 풀폭 + 카드 교차 |
| L4-1 Content Weight | 9 | "Agentic Development Environment from Claude Agent SDK, Gemini CLI, JetBrains" — 단일 가치 명제 강함 |
| L4-2 Signature Element | 10 | pixel/mono H1 + 시안 액센트 + 노란 형광 CTA + JetBrains 브랜드 (4대 시그니처) |
| **종합** | **148/180** | **PASS — tier-1 등재** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러
- Background body: `#292B2C` ⚠️ **warm 다크 그레이** (추정 `#0A0A0A` 정정 — 채도 있음)
- HSL 변수: `--background: 210 3.5% 16.7%` (`#292B2C`에 해당)
- Card BG: HSL `200 10% 12%` (~`#1B1F21` 추정)
- Foreground (텍스트): `#FFFFFF` ⚠️ **Pure white** (추정 `#E5E5E5` 정정)
- Header white: `#FFFFFF`
- Primary 액센트: HSL `162 54% 40%` (~`#2FA37D` 시안/Teal 그린 — **추정 #00CCDD에서 정정**)
- CTA 노란 형광: `#FEFC4F` ✅ **노란 형광 정확** (Cookie "Accept All" 시그니처)
- CTA text: `#000000`

### 폰트
- Display & Body: **JetBrains Mono** ✅ 정확 (system fallback: Menlo, Consolas, Monaco)
- Cookie banner 폰트: "JetSites Cookie Banner JetBrains Mono" 커스텀 alias
- Weight 400, size 16px (body)
- Tailwind CSS 빌드 (`--tw-*` 다수 변수)

### 간격
- Section 간격: ~80px
- Container max-width: ~1440px (풀폭 IDE 스크린샷)

### 모션
- 추정: 코드 hover, agentic 데모 애니메이션
- CRT 스캔라인 효과 가능성 (정적 캡처 미검증)
- `--tw-rotate: 180deg` / `--tw-translate-y: -3px` 등 Tailwind transform 활용

## 시그니처 요소

1. **Pixel/Mono H1 단일 family** — JetBrains Mono Pixel 추정 (sans-serif 부재)
2. **시안/Teal 액센트 + 보더 박스** — CRT 90년대 터미널 미감
3. **노란 형광 CTA "Accept All"** — 다크 배경 위 강한 시인성 (Linear 노란 CTA와 유사)

## 사진 톤

- IDE 다크 스크린샷: 80%
- 다이어그램/그래픽: 20%
- 사진: 거의 없음
- 톤: 다크 + 시안 액센트 일관

## 모션 정책

- 적용: 코드 hover, IDE 데모, CRT 미세 효과 (추정)
- 절대 부재: 글래스모피즘, 보라 그라디언트, parallax 과장

## 절대 안 쓰는 것 (NEVER List)

- 라이트 배경 (다크 일관)
- Sans-serif (mono 단일)
- 보라/파랑 그라디언트
- 글래스모피즘
- 3-col 카드 (비대칭)
- 부드러운 hover (CRT 미감과 충돌)

## Industrial-AI 적용 가이드

### 적용 가능 영역
- **Hero (Frontier AI 톤)**: pixel/mono H1 + 다크 + 시안 액센트
- **IDE/Agentic 데모**: 코드 패널 풀폭 표현
- **Retro-futuristic 캠페인**: 90년대 터미널 미감 차용

### 적용 부적합 영역
- ❌ **Editorial 인물**: Anthropic 톤 권고
- ❌ **warm-cream 배경**: 다크 톤 직격
- ❌ **수치 KPI 강조**: Linear 다채 KPI 톤 권고

### 가중치 추천
- 1순위 적용: Frontier AI Hero / Agentic 데모 / Dev tools 캠페인
- 2순위 적용: 특수 이벤트(개발자 컨퍼런스) 시각
- 미적용: warm-cream Hero / Editorial / KPI

## 출처

- screenshots: `c:/tmp/dkb-rescore/air-dev-{desktop,mobile}.png` (2026-05-04 캡처)
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view
- 갤러리 출처: lapa.ninja Top 10 #7 (2026-05-04 fetch)
- 브랜드 모기업: JetBrains (https://www.jetbrains.com/)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-04 | 초기 등재 (148/180) — Vision 1440+375 검증 완료 — lapa.ninja Top 10 #7 / JetBrains Air 브랜드 / tier-1 게이트 통과 |
| v1.1 | 2026-05-06 | 실측 토큰 갱신 — DevTools eval 검증. JetBrains Mono 정확 + warm 다크 그레이 BG #292B2C(추정 #0A0A0A 정정) + 노란 형광 #FEFC4F 정확 + Tailwind 빌드 |

## 후속 보정 권고

1. tokens.css 정확값 추출 — 시안/노란 형광 정확 hex
2. JetBrains Mono 폰트 라이센스 확인 (Apache 2.0)
3. 모션 비디오 캡처 — agentic 데모 인터랙션
4. dkb/patterns/color-systems/에 air-dev-retro-cyan.md 신규 등재 검토 (Vercel warm-mesh와 차별화)
