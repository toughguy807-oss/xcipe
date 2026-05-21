# flim.ai — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-3 (142/180 — 110~144 범위)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI / Creative Tools / Storytelling
**18축 종합**: **142/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위 — 시네마 카드 그리드) / `brutally-minimal` (2순위 — 거대 워드마크)
**어워드**: lapa.ninja Top 10 (#5, 2026-05-04)
**적합 도메인**: AI Creative / Storytelling / Editorial / Marketing 캠페인
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view (1회)
**출처 갤러리**: lapa.ninja (#5 / Artificial Intelligence 카테고리)

## 본질 (1줄)

> "AI 도구도 영화 스틸컷처럼 보여야 한다 — 거대 워드마크 + 시네마 카드 그리드."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | 거대 sans-serif "Flim" 워드마크(weight 900급) — 시그니처 임팩트 |
| L1-2 Color | 7 | 흰 배경 + 검정 텍스트 + 노란 액센트 동그라미 — 절제 |
| L1-3 Color Subtlety | 7 | 그리드 라인 연한 회색 — Pure white 회피 추정 |
| L1-4 Trend Currency | 8 | 2025-2026 거대 워드마크 + 그리드 카드 — Editorial AI 트렌드 |
| L2-1 White Space | 8 | Hero 워드마크 점유율 ~50% + 카드 그리드 절제 |
| L2-2 Typo Hierarchy | 9 | 거대 워드마크 vs 본문 8× 대비 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 9 | 영화 스틸컷 카드 — 시네마 톤 일관 (인물/풍경 다양) |
| L3-1 Asymmetric Layout | 9 | Hero 워드마크 좌측 + 카피 우측 + 카드 비대칭 배치 |
| L3-2 Grid Depth | 8 | 카드 그리드 + 그리드 가이드라인 보조 |
| L3-3 Motion Intent | 7 | 모션 절제 추정 (정적 캡처에서 hover 미수집) |
| L3-4 Interaction Craft ★ | 7 | hover 평이 추정 |
| L3-5 Mobile Fidelity ★ | 9 | 375 캡처 — 거대 워드마크 wrap 정상, CTA 정렬 OK |
| L3-6 LCP Visual Impact ★ | 9 | 거대 "Flim" 워드마크 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | Hero → Cards → Search 명확 |
| L3-8 Visual Rhythm ★ | 8 | 카드 사이즈/위치 변주 |
| L4-1 Content Weight | 8 | "The Creative Sidekick Made for Agencies. Built for Storytellers." — 명확 |
| L4-2 Signature Element | 10 | 거대 워드마크 + 영화 스틸컷 카드 그리드 + 노란 동그라미 동심 (3대 시그니처) |
| **종합** | **142/180** | **CONDITIONAL — tier-3 등재 (게이트라인 +2)** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러
- Background body: `#FFFFFF` ⚠️ **Pure white 사용** (추정 `#FAFAFA` 정정)
- Text primary: `#141414` (Pure black 회피 — 추정 #0A0A0A에서 정정)
- Cookie CTA accent: `#FE3600` 오렌지/빨강 ⚠️ **추정 #FFD400 노란 정정** (Cookie banner 한정)
- 시그니처 노란 동그라미: cssVars 미노출 (별도 SVG/이미지 자산 추정)

### 폰트
- Display H1 (cssVars `--_typography---heading--h1`): **Swizzy** (Webflow 커스텀, Arial fallback) / weight 500 / size clamp(49px ~ 160px) / line-height 86% / letter-spacing -.02em
- Display jumbo (`--_typography---heading--jumbo`): Swizzy / weight 500 / size clamp(164px ~ 380px) — 거대 워드마크 시그니처
- Mono (FIG/UI 라벨용): **PP Neue Montreal Mono** (Pangram Pangram) / weight 400 / letter-spacing .06em
- Body: Swizzy (sans 변종 동일 family)

### 간격
- Section 간격: ~80-120px
- Container: 풀폭 그리드

### 모션
- 정적 캡처 — 추정 hover 미세 모션 + 카드 fade-up

### CSS 변수 시그니처
- 테마 네이밍: `--sci-fi--*` (light-teal / brown / teal-100/300 / red / gold) — sci-fi 테마 시스템 운용

## 시그니처 요소

1. **거대 "Flim" 워드마크** — Hero 좌측에 weight 900 sans-serif 압도적 크기
2. **영화 스틸컷 카드 그리드** — 비대칭 카드 배치 + 시네마 톤
3. **노란 동그라미 + 검정 pill CTA** — "SIGN UP NOW" 노란 원 + 검정 알약

## 사진 톤

- 영화 스틸컷: 90%+ (인물/풍경 다양)
- 일러스트/그래픽: 거의 없음
- 톤: 시네마틱 보정 + 약간의 비네팅 추정

## 모션 정책

- 적용: 카드 hover, fade-up (추정)
- 절대 부재: parallax 과장, 글래스모피즘, 네온 글로우

## 절대 안 쓰는 것 (NEVER List)

- Pure #FFF / #000
- 보라/파랑 그라디언트
- 글래스모피즘
- 3-col 단조로운 카드 (시네마 카드는 비대칭)
- 네온 액센트

## Industrial-AI 적용 가이드

### 적용 가능 영역
- **Hero 워드마크**: 거대 brand 네임 임팩트 (한국어 워드마크에도 차용 가능)
- **Case 카드 그리드**: 산업 사진 카드 비대칭 배치 (Augury 인물 사진 톤과 결합 가능)
- **Editorial 톤**: AI 도구의 인간적 면모 어필

### 적용 부적합 영역
- ❌ **KPI 임팩트**: Linear 톤 권고
- ❌ **Bento Grid**: Vercel 톤 권고

### 가중치 추천
- 1순위 적용: Hero 워드마크 / Case 카드 그리드
- 2순위 적용: 시네마 톤 사진
- 미적용: KPI / Bento

## 출처

- screenshots: `c:/tmp/dkb-rescore/flim-{desktop,mobile}.png` (2026-05-04 캡처)
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view
- 갤러리 출처: lapa.ninja Top 10 #5 (2026-05-04 fetch)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-04 | 초기 등재 (142/180) — Vision 1440+375 검증 완료 — lapa.ninja Top 10 #5 등재 |
| v1.1 | 2026-05-06 | 실측 토큰 갱신 — DevTools eval 검증. Swizzy 폰트(Webflow 커스텀) + PP Neue Montreal Mono 식별. Pure white BG 사용 확인(추정 정정). sci-fi 테마 시스템 발견 |

## 후속 보정 권고

1. tokens.css 정확값 추출 (DevTools eval) — 노란 액센트 hex 확정
2. 폰트 정확 식별 (Geist/Inter/TT Norms 후보)
3. 모션 캡처 (인터랙션 비디오) — hover 효과 검증
