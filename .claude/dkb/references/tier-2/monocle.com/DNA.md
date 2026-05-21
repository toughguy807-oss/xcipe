# monocle.com — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-2
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 글로벌 매거진 / Editorial / 라이프스타일 / Affairs
**18축 종합**: 136/180
**Tone 11종 라벨**: `editorial-magazine` (1순위 — Serif 거대 wordmark + 매거진 표지) / `luxury-refined` (2순위)
**적합 도메인**: Editorial / 매거진 / 라이프스타일 / 출판 (Pure white + Serif Display 시그니처 ⭐)

## 본질 (1줄)

> "매거진 권위는 거대 Serif wordmark + 표지 사진으로 표현된다 — Pure white + 핑크 배너 + Editorial 절제."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | Serif Display (자체 폰트 — Plantin 또는 Söhne 추정) |
| L1-2 Color | 8 | 흰 + 검정 + 핑크 배너 액센트 |
| L1-3 Color Subtlety | 7 | 흰 배경 (Pure white 가까움) |
| L1-4 Trend Currency | 8 | 2024-2025 매거진 표준 톤 |
| L2-1 White Space | 7 | wordmark 중심 + 절제 |
| L2-2 Typo Hierarchy | 9 | 거대 wordmark + 작은 sub + 핑크 배너 카피 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 9 | 매거진 표지 일관 |
| L3-1 Asymmetric Layout | 7 | wordmark 중앙 + 핑크 배너 비대칭 |
| L3-2 Grid Depth | 7 | 표준 매거진 그리드 |
| L3-3 Motion Intent | 7 | hover transition + 표지 |
| L3-4 Interaction Craft ★ | 8 | Newsstand toggle + Subscribe |
| L3-5 Mobile Fidelity ★ | 8 | 모바일 양호 |
| L3-6 LCP Visual Impact ★ | 8 | 거대 MONOCLE wordmark 즉시 |
| L3-7 Visual Flow ★ | 8 | Hero → Newsstand → Featured → Issue |
| L3-8 Visual Rhythm ★ | 8 | 흰 + 핑크 배너 교차 |
| L4-1 Content Weight | 9 | "A timely take on watchmaking, architecture and urbanism" 매거진 큐레이션 |
| L4-2 Signature Element | 9 | 거대 MONOCLE Serif wordmark + 핑크 배너 + 매거진 표지 (3대) |
| **종합** | **136/180** | **CONDITIONAL — tier-2 (Editorial 매거진 표준)** |

## 정확 토큰 (Vision 추정)

### 컬러
- Background: `#FFFFFF`
- Background banner: `#FF8095` 추정 (Monocle 핑크)
- Text primary: `#000000` 또는 `#1A1815`
- Text on banner: `#000000`

### 폰트
- Serif Display: Plantin 또는 자체 / weight 400 / size clamp(4rem, 8vw, 8rem)
- Sans body: 자체 / weight 400

## 시그니처 요소 (★)

1. **거대 MONOCLE Serif wordmark** — 페이지 거대 점유 (매거진 권위)
2. **핑크 배너 + Editorial 카피** — "A timely take on..." 매거진 큐레이션
3. **Newsstand / Issue / Subscribe** — 매거진 운영 메타

## 적용 가이드 (Editorial 매거진 한정)

### 적용 가능 영역
- **매거진 / Editorial / 출판**: 거대 Serif wordmark + 표지 사진
- **luxury-refined 보조**: Pure white + Serif + 절제
- **핑크 또는 비비드 단일 배너**: 메인 카피 강조

### 적용 부적합 (★ Default House Style 차단)
- ❌ **manufacturing AI / B2B / dev tool** — Editorial 톤은 default house style 가족 (cf. ref/anthropic-frontend-design.md)
- ❌ Industrial AI 권위 → Augury / Linear / Scale
- ❌ 한국 공공/B2B → lgcns / visitseoul
- ⚠️ **주의**: monocle은 Editorial 학습용. Industrial AI 본 시안 절대 부적합.

## 출처

- source/index.html (curl 2026-05-04, 420KB)
- screenshots/full-1440 + hero-1440 + full-375 (2026-05-04)

## 변경 이력

| v1.0 | 2026-05-04 | 초기 등재 (136/180, Vision 검증 — Editorial 매거진 표준 톤) |
