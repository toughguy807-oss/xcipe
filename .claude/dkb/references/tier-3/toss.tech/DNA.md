# toss.tech — 시각 DNA

**분석일**: 2026-04-30
**Tier**: tier-3 (한국 B2C 핀테크 기술 블로그)
**interaction_archetype**: showcase
**platform**: mobile
**도메인**: 한국 핀테크 / Engineering Blog / Toss 기술 컨텐츠
**18축 종합**: 128/180
**Tone 11종 라벨**: `playful-toy` (1순위 — 친근 + 이모지 + 일러스트) / `soft-pastel` (2순위 — Toss Blue 친근)
**어워드**: (한국 디자인 시스템 톱 — 비공식)
**적합 도메인**: 한국 핀테크 / B2C 친근 / Engineering Blog (한글 타이포 + 모바일 우선 ⭐, manufacturing AI 부적합)
**Vision 검증**: 미수행 (WebFetch + 사전 지식)

## 본질 (1줄)

> "친근함과 전문성의 균형 — 핀테크는 기술 콘텐츠도 친근해야 한다."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | Toss Product Sans 또는 Pretendard 추정. 한영 최적화 |
| L1-2 Color | 8 | Toss Brand Blue 단일 액센트 + 흰 배경 — 강한 브랜딩 |
| L1-3 Color Subtlety | 7 | 흰 배경 사용하지만 액센트 채도 정밀 |
| L1-4 Trend Currency | 7 | 2024-2025 톤 (B2C 친근 미니멀) |
| L2-1 White Space | 8 | 카드 간격 + 여백 적정 |
| L2-2 Typo Hierarchy | 8 | 카드 제목 vs 메타 강한 대비 |
| L2-3 Korean Typo ★ | 9 | 한글 line-height 정밀 + word-break + 한국 톱 가독성 |
| L2-4 Image Tonality | 8 | 일러스트 + 이모지 — 친근 톤 일관 |
| L3-1 Asymmetric Layout | 7 | 카테고리 카드 + Featured carousel |
| L3-2 Grid Depth | 7 | 표준 카드 그리드 |
| L3-3 Motion Intent | 8 | hover 미세 + carousel — 의도 명확 |
| L3-4 Interaction Craft ★ | 9 | Toss 특유의 미세 인터랙션 (이모지 프로필 / arrow 페이지네이션) |
| L3-5 Mobile Fidelity ★ | 10 | 한국 모바일 우선 톱 — 반응형 이미지 최적화 |
| L3-6 LCP Visual Impact ★ | 8 | Featured carousel 첫 카드 즉시 |
| L3-7 Visual Flow ★ | 8 | Hero → Featured → Categories → Articles → Pagination |
| L3-8 Visual Rhythm ★ | 7 | 카드 grid 일정 + Featured 변주 |
| L4-1 Content Weight | 8 | 카테고리 3종 (Engineering/Design/Product) — 명확 |
| L4-2 Signature Element | 9 | 이모지 프로필 + 친근 일러스트 + Toss Blue (3대 시그니처) |
| **종합** | **128/180** | **CONDITIONAL — tier-3 등재 (한국 모바일 우선 톱)** |

## 정확 토큰 (WebFetch + 추정)

### 컬러
- Background: `#FFFFFF`
- Text primary: `#191F28` 추정 (Toss 다크 그레이)
- Text secondary: `#4E5968` 추정
- Accent: `#3182F6` 추정 (Toss Brand Blue)
- Accent light: `#E8F2FF` 추정

### 폰트
- Toss Product Sans 추정 (or Pretendard)
- 한영 최적화

### 모션
- hover 미세 transition
- arrow 페이지네이션
- Featured carousel

### 이미지 처리
- 반응형 이미지 (width/quality 파라미터)
- 모바일 우선 최적화

## 시그니처 요소 (★)

1. **이모지 프로필** — 사용자 친근감 시그니처 (B2C 핀테크 톤)
2. **친근 일러스트** — 기술 콘텐츠를 어렵지 않게
3. **Toss Brand Blue** — 단일 액센트 강한 브랜딩

## 사진/그래픽 톤

- 일러스트 위주 (사진 거의 없음)
- 이모지 활용
- 톤 일관성: ~95%

## 모션 정책

- 적용: hover 미세, carousel, arrow 페이지네이션
- 절대 부재: 글래스모피즘, 네온, parallax, 강한 transform

## 절대 안 쓰는 것 (NEVER List)

- 다크 배경 (Toss는 화이트 메인)
- 네온 액센트 (B2C 친근 부적합)
- Italic Serif (한국 친근 부적합)
- Bento 비대칭 카드 (균형 카드 그리드 선호)

## Industrial AI/한국 B2B 적용 가이드

### 적용 가능 영역
- **한글 타이포 정밀**: line-height + word-break: keep-all + 자간 최적화
- **모바일 우선 패턴**: 반응형 이미지 + 햄버거 nav
- **이모지/일러스트 친근감**: B2C 또는 친근 B2B 영역

### 적용 부적합 영역
- ❌ **Industrial AI Industrial 톤**: 친근 B2C 톤 부적합 (Augury 권고)
- ❌ **투자자 신뢰 시그니처**: 친근 톤 부적합 (Anthropic 권고)
- ❌ **Editorial 권위**: 친근 톤 부적합

### 가중치 추천
- 1순위 적용: 한글 타이포 정밀 / 모바일 반응형
- 2순위 적용: 인터랙션 craft (focus-ring / hover micro)
- **미적용: Industrial AI 본 영역** (친근 B2C 톤은 Industrial AI에 부적합)

> **주의**: toss.tech은 한글 타이포 + 모바일 패턴 학습용 reference. Industrial AI 본 시안 생성에는 부적합. **patterns/korean-typo/** 카탈로그 등재 권고.

## 출처

- source/index.html (curl 2026-04-30, 317KB)
- WebFetch 분석 (2026-04-30) — 카테고리 + 시그니처 + 모바일 톤
- screenshots/ (미수집)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-04-30 | 초기 등재 (128/180, WebFetch + Vision 미검증) |

## 후속 보정 권고

1. Playwright 캡처 후 Vision 재채점 (한글 타이포 정밀 검증)
2. Toss Product Sans 적용 검증 (DevTools)
3. patterns/korean-typo/toss-pattern.md 카탈로그 등재
