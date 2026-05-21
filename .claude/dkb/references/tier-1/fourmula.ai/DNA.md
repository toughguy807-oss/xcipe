# fourmula.ai — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-1 (146/180 — Awwwards SOTD 가중치)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI / Editorial Portfolio / Fashion-aesthetic Brand
**18축 종합**: **146/180**
**Tone 11종 라벨**: `luxury-refined` (1순위 — 흰 배경 + 카운터 + 시네마 인물) / `editorial-magazine` (2순위)
**어워드**: **Awwwards Site of the Day** (May 02, 2026)
**적합 도메인**: editorial / portfolio / hospitality / fashion / luxury brand (Industrial AI 부적합 — 적용 시 보조)
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view (1회)
**출처 갤러리**: awwwards.com SOTD (May 02, 2026)

## 본질 (1줄)

> "AI 브랜드도 패션 룩북처럼 보여야 한다 — 흰 배경 + 카운터 + 시네마 인물 단독."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | 거대 sans-serif 카운터 "89" + 미니멀 — 절제 시그니처 |
| L1-2 Color | 9 | 흰 배경 + 시네마 인물 사진 (sunset 황혼톤) — 단색 운용 |
| L1-3 Color Subtlety | 9 | Pure white 회피 추정 (#FAFAFA) + 사진 단독 |
| L1-4 Trend Currency | 9 | 2025-2026 Awwwards luxury-refined Editorial 시그니처 |
| L2-1 White Space | 10 | Hero 점유율 ~5% (압도적 화이트스페이스) — 매거진 룩북 |
| L2-2 Typo Hierarchy | 7 | 카운터 단일 — 대비 약함 (의도적) |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 10 | 시네마 sunset 톤 인물 사진 단독 — 톤 일관 100% |
| L3-1 Asymmetric Layout | 9 | 좌상단 카운터 + 중앙 인물 + 양 하단 로고/인디케이터 — 4-점 비대칭 |
| L3-2 Grid Depth | 7 | 단순 absolute 배치 — 그리드 시그니처 약함 |
| L3-3 Motion Intent | 9 | 추정 — 우하단 로딩 인디케이터 = 다음 인덱스 진행 모션 (페이지 카운터 89→90 시퀀스 추정) |
| L3-4 Interaction Craft ★ | 9 | 페이지 시퀀스 인터랙션 시그니처 추정 |
| L3-5 Mobile Fidelity ★ | 9 | 375 캡처 — 동일 레이아웃 + 사진 비율 정상 |
| L3-6 LCP Visual Impact ★ | 9 | "89" 카운터 + 시네마 인물 즉시 |
| L3-7 Visual Flow ★ | 8 | 카운터 → 인물 → 로고 체계 명확 |
| L3-8 Visual Rhythm ★ | 8 | 페이지 시퀀스 (89→90→...) 추정 |
| L4-1 Content Weight | 8 | Hero에 카피 부재 — 시각만 (의도적 절제, 콘텐츠 가중치 약함) |
| L4-2 Signature Element | 10 | 거대 카운터 + 시네마 단독 인물 + 픽셀 로고 + 로딩 인디케이터 (4대 시그니처) |
| **종합** | **146/180** | **PASS — tier-1 등재 (Awwwards SOTD 검증)** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러
- Background body: `#FFFFFF` ⚠️ **Pure white 사용** (추정 `#FAFAFA` 정정 — 사진/카운터 단독 강조 의도)
- Background alt: `#F7F7F7` (`--secondbg`)
- Text/카운터 (`--fonts-100`): `#020108` ✅ Pure black 회피 (거의 검정에 가까운 navy-black)
- Body 기본 텍스트: `#333333` (alt — Cookie 영역 등)
- Text 50%: `#02010880` (alpha=0.5)
- Text 64%: `#020108A3`
- Text 30%: `#0201084D`
- Text 20%: `#02010833`
- Lines (보더): `#D7D7D6`
- Dots pattern: `#D9D9D9`
- Menu colors: `#FFF3` (white 20% alpha)
- Photo tint: 시네마 sunset (warm orange/amber — 별도 자산)

### 폰트
- Display (H1, 카운터): **SF Pro Display** ⚠️ **Apple 폰트** (추정 미식별 정정) / weight 400 / size 73.2px (Hero) / letter-spacing -2.2px / line-height 68.8px
- 모든 weight 사용: 400 (regular), 500 (medium)
- 토큰 시스템: `--_fonts---h1: 5.5rem` / `--_fonts---h2: 7.5rem` / `--_fonts---h2-5: 4rem` / `--_fonts---h3: 3.25rem` / `--_fonts---h4: 2.25rem` (h2가 h1보다 큼 — 카운터 시그니처)
- Body 토큰: body-1 (1.125rem) / body-2 (1rem) / body-3 (1.25rem) / btn (1.0625rem)
- CTA: SF Pro Display / weight 400 / 14.1px / **border-radius 1317px** (완전한 pill — round 시그니처)

### 간격
- Hero 점유율: ~5% (압도적 화이트스페이스)
- 사진 중앙 정렬 + absolute 배치

### 모션
- 추정: 페이지 시퀀스 카운터 (89→90), 인물 사진 cross-fade
- 우하단 로딩 인디케이터 = 자동 진행 시퀀스

## 시그니처 요소

1. **거대 카운터 숫자** ("89") — 좌상단에 페이지 인덱스 단독 배치 (시네마 카메라 컷 카운터 미감)
2. **시네마 sunset 인물 사진 단독** — 펜스 + 도시 배경 + 황혼 톤 (Editorial fashion 룩북)
3. **양 하단 로고 + 로딩 인디케이터** — 픽셀/도트 그래픽 디테일
4. **압도적 화이트스페이스** — fold 95% 이상 빈 공간

## 사진 톤

- 시네마 sunset 인물 단독: 100%
- 일러스트/그래픽: 픽셀 로고만
- 톤: warm orange/amber sunset 일관

## 모션 정책

- 적용: 페이지 시퀀스 카운터, 인물 cross-fade (추정)
- 절대 부재: parallax 과장, 글래스모피즘, 네온, hover 화려

## 절대 안 쓰는 것 (NEVER List)

- 풀 레이아웃 (Hero 정보 채움)
- 다채 색상 (시네마 단색 일관)
- Pure #FFF / #000
- 글래스모피즘
- 3-col 카드 / Bento
- 코드 스크린샷

## Industrial-AI 적용 가이드

### 적용 가능 영역
- **About 인물**: 시네마 sunset 톤 인물 사진 (Industrial 작업자 + warm 톤)
- **Brand 캠페인**: 페이지 시퀀스 카운터 + 풀폭 사진
- **Editorial Hero**: 절제된 화이트스페이스 + 단일 시각 (제품 클로즈업)

### 적용 부적합 영역
- ❌ **B2B Hero (KPI 임팩트)**: Linear/Augury 톤 권고 — 콘텐츠 가중치 약함
- ❌ **Cases (Before/After)**: Vercel Bento 톤 권고
- ❌ **dev tools 도메인**: air.dev / vercel 톤 권고

### 가중치 추천
- 1순위 적용: About / Brand 캠페인 / Editorial Hero
- 2순위 적용: Awards / Special Event 페이지
- 미적용: B2B Hero / Cases / Numbers / Dev tools

## 출처

- screenshots: `c:/tmp/dkb-rescore/fourmula-{desktop,mobile}.png` (2026-05-04 캡처)
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view
- 갤러리 출처: awwwards.com Site of the Day (May 02, 2026)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-04 | 초기 등재 (146/180) — Vision 1440+375 검증 완료 — awwwards SOTD May 02 2026 / tier-1 |
| v1.1 | 2026-05-06 | 실측 토큰 갱신 — DevTools eval 검증. SF Pro Display(Apple) 폰트 식별 + Pure white BG 사용 확인(추정 정정) + Text #020108 navy-black + h2(7.5rem) > h1(5.5rem) 카운터 시그니처 |

## 후속 보정 권고

1. tokens.css 정확값 추출 (DevTools eval)
2. 페이지 시퀀스 카운터 모션 비디오 캡처 — 89→90 시퀀스 검증
3. 폰트 정확 식별
4. 콘텐츠 깊은 섹션 캡처 — Hero 절제 외 deeper 섹션 시그니처 검증
