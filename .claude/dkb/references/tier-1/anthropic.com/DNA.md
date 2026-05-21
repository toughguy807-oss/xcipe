# anthropic.com — 시각 DNA

**분석일**: 2026-04-30 (v1.0) / 2026-04-30 v1.1 / **2026-05-04 v1.2 풀 Vision 재채점**
**Tier**: tier-1
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: Frontier AI / Public Benefit Corp
**18축 종합**: **150/180** (v1.2 갱신)
**Tone 11종 라벨**: `editorial-magazine` (1순위) / `luxury-refined` (2순위)
**어워드**: (미수집 — Awwwards 등재 추정)
**적합 도메인**: editorial / hospitality / portfolio (default house style 가족 — manufacturing AI 부적합)
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view 재수행 (v1.2)

## 본질 (1줄)

> "Editorial 권위는 다크 카드 대비와 underline 강조 단어로 만든다 — Off-white + 절제."

## Vision 보정 사항 (2026-04-30)

| 축 | v1.0 추정 | v1.1 실측 | 변경 |
|----|----------|----------|------|
| L1-1 Typography | Italic Serif H1 (10) | Sans-serif Display H1 + 부분 Serif (Project 카드만) (9) | -1 |
| L4-2 Signature | Italic Serif H1 + Coral 점 + Editorial (10) | underline 강조 단어 + 다크 카드 대비 + Anthropic A 로고 (9) | -1 |
| L1-2 Color | Off-white + Coral accent (9) | Off-white + 다크 카드(#1A1815급) 강한 대비 (10) | +1 |
| L3-1 Asymmetric | 비대칭 Editorial (8) | H1 + 다크 카드 비대칭 매우 강함 (9) | +1 |
| L1-3 Color Subtlety | Off-white #FAFAF7 (10) | 확인됨 (10) | 0 |
| L2-1 White Space | Hero 절제 (9) | 확인됨 — 큰 H1 + 사이드 인용 (9) | 0 |
| 종합 변화 | 152 | 148 | -4 (시그니처 보정) |

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | Serif H1 + Sans body 믹스 (Copernicus Serif 추정 + Styrene B 또는 시스템 sans). Italic 사용은 AI 회사 중 희귀 |
| L1-2 Color | 9 | Off-white 배경 + Coral/Terracotta 단일 accent + 거의 단색 운용 |
| L1-3 Color Subtlety | 10 | Pure #FFF 회피 — Off-white #FAFAF7 추정. Pure black 회피 텍스트 #1A1815 추정 |
| L1-4 Trend Currency | 9 | 2025-2026 Off-white + Editorial Serif 시그니처 (frontier-ai 톱 브랜드 패턴) |
| L2-1 White Space | 9 | Hero 점유율 절제 (큰 화면에 작은 H1) — 매거진 룩 |
| L2-2 Typo Hierarchy | 8 | Serif H1 vs Sans body 강한 family 대비. weight 대비도 명확 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 (영문 전용) |
| L2-4 Image Tonality | 9 | 인물 B&W + sepia 후처리 (지식 기반 추정). 일관 톤 |
| L3-1 Asymmetric Layout | 8 | 비대칭 Editorial 그리드 + 카드 변주 |
| L3-2 Grid Depth | 7 | Subgrid 사용 추정 (검증 미수행) |
| L3-3 Motion Intent | 9 | fade-up 미세 모션 단독, parallax/scroll-driven 부재 — "모션 부재가 시그니처" |
| L3-4 Interaction Craft ★ | 8 | focus-ring 정밀 / hover-delay 미세 (지식 기반 추정) |
| L3-5 Mobile Fidelity ★ | 9 | 햄버거 풀스크린 nav 시그니처 추정 |
| L3-6 LCP Visual Impact ★ | 9 | Hero 텍스트 즉시 + 이미지 점진 로드 |
| L3-7 Visual Flow ★ | 9 | Hero → Featured project → Latest → Core views → Footer 명확 |
| L3-8 Visual Rhythm ★ | 9 | 배경색 교차 + 밀도 교차 패턴 |
| L4-1 Content Weight | 10 | "AI research and products that put safety at the frontier" — 인용 1줄 + 단일 KPI 룩 |
| L4-2 Signature Element | 10 | Coral 점 + Italic Serif H1 + Editorial 매거진 룩 (3대 시그니처) |
| **종합** | **152/180** | **PASS — tier-1 확정** |

## 정확 토큰 (추정, Vision 검증 필요)

### 컬러
- Background: `#FAFAF7` 추정 (Off-white, HSL 50/14%/97%)
- Accent: `#CC7856` 추정 (Coral/Terracotta, HSL 18/53%/57%)
- Body text: `#1A1815` 추정 (Pure black 회피)
- Border: `#1A18151A` 추정

### 폰트
- H1: Copernicus Serif 추정 / Italic / weight 400-500 / size clamp(2.5rem, 5vw, 4.5rem)
- Body: Styrene B 또는 시스템 sans / weight 400 / size 16-18px
- Mono: 미수집

### 간격
- Section 간격: ~120px (대형 화이트스페이스)
- Container max-width: 추정 1200px

### 모션
- Fade-up 단독, ~0.4s ease-out
- Hover transition: ~0.2s
- 절대 부재: parallax, scroll-driven, 과장 hover

## 시그니처 요소 (★ Vision 보정)

1. **underline 강조 단어** — Hero H1 "AI **research** and **products** that put safety at the frontier"의 핵심 명사 underline
2. **다크 카드 + Off-white 배경 강한 대비** — Project Glasswing 카드는 다크 + Serif 폰트, Hero는 Off-white + Sans
3. **Anthropic "A" 큰 로고** — Footer 좌하단에 압도적 크기로 배치 — 브랜드 자신감

## 사진 톤

- 인물: B&W + sepia (추정)
- 그래픽: 사진 위주, 일러스트 거의 없음
- 톤 일관성: ~95% (추정)

## 모션 정책

- 적용: fade-up, hover transition
- 절대 부재: parallax, scroll-driven, 글래스모피즘 hover

## 절대 안 쓰는 것 (NEVER List)

- Pure #FFF / #000
- Inter / Roboto / Open Sans
- 보라/파랑 그라디언트
- 글래스모피즘
- 3-col 카드 반복
- 과장 hover/parallax

## Industrial-AI 적용 가이드

### 적용 가능 영역
- **Hero**: Italic Serif + Coral accent
- **About**: B&W 인물 사진 + 인용
- **Service**: Serif 번호 큰 H1
- **Contact**: Editorial 카피

### 적용 부적합 영역
- ❌ **Cases (Before/After)**: Editorial 톤은 수치 임팩트 약함 → Vercel 톤 권고
- ❌ **Numbers (22+/26+/37/5)**: 큰 KPI 표현은 Linear 톤 권고

### 가중치 추천
- 1순위 적용: Hero / About / Contact
- 2순위 적용: Service
- 미적용: Cases / Numbers

## 출처

- source/index.html (curl 2026-04-30, 253KB)
- screenshots/ (미수집 — Vision 검증 시 보강 필요)
- 분석 방식: 현재 세션 사전 지식 + 정적 HTML 텍스트 (멀티모달 vision 미수행)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-04-30 | 초기 등재 (152/180 추정, Vision 미검증) |
| v1.1 | 2026-04-30 | Vision 1440 view 보정 (148/180) — Italic Serif 추정 정정, 시그니처 재정의 |
| v1.2 | 2026-05-04 | **Playwright 1440+375 풀 캡처 + 멀티모달 재채점 (150/180)** — H1 typography 재확인(거대 sans + serif 액센트 조합 X, 단일 sans-serif H1 with `research`/`products` underline), 다크 카드 시그니처 재확인 (Project Glasswing 검정 카드 + 메쉬/네트워크 일러스트), Coral accent는 hero 스코프 외 (footer/section 추정) — L1-1 유지(9), L4-2 +1(시그니처 단순화로 명료성 ↑) |

## v1.2 Vision 재채점 결과 (2026-05-04)

| 축 | v1.1 | v1.2 | 변경 사유 |
|----|:---:|:---:|-----|
| L1-1 Typography | 9 | 9 | sans-serif H1 단일(serif 사용 부분만 다크 카드 — Editorial은 카드 한정) — 유지 |
| L1-2 Color | 9 | 9 | Off-white + 다크 카드 — 유지 |
| L2-1 White Space | 9 | 9 | Hero 점유율 절제 + 좌측 H1 + 우측 인용 — 유지 |
| L4-2 Signature Element | 10 | 10 | underline 강조 + 다크 카드 + Anthropic A — 유지 |
| L3-1 Asymmetric Layout | 8 | 9 | Hero(밝음) → Project Glasswing(어둠) 즉시 전환의 비대칭 강함 — +1 |
| L3-5 Mobile Fidelity | 9 | 9 | 375 캡처 확인 — 햄버거 메뉴 + H1 wrap 정상 |
| L3-6 LCP Visual Impact | 9 | 9 | Hero 텍스트 즉시 — 유지 |
| 합계 | 148 | **150** | +2 (L3-1 비대칭 강도 재평가) |

**Pure black 회피 재확인**: 다크 카드는 #1A1815 또는 #181615 추정 — Pure `#000` 미사용. `dkb/patterns/color-systems/anthropic-warm-cream.md` 토큰과 정합.

## 후속 보정 권고 (v1.3 이후)

1. ✅ Playwright 1440 + 375 캡처 (v1.2 완료)
2. tokens.css 추출 (DevTools eval 또는 source/index.html CSS variables 파싱) — 정확 hex 확정 작업 잔여
3. Awwwards 어워드 이력 확인 (v1.3 검토)
