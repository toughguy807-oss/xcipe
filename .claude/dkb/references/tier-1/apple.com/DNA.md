# apple.com — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-1
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 컨슈머 가전 / Industrial Design / 글로벌 권위
**18축 종합**: 149/180
**Tone 11종 라벨**: `brutally-minimal` (1순위 — 흰 배경 + 미니멀 nav + 제품 사진 풀임팩트) / `industrial-utilitarian` (2순위 — Industrial Design 권위)
**어워드**: 글로벌 디자인 톱 (비공식 — Apple Design Awards 운영)

## 본질 (1줄)

> "컨슈머 권위는 제품 사진의 톤 일관성으로 표현된다 — 흰 배경 + SF Pro + 제품 풀임팩트."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | SF Pro Display + SF Pro Text — Apple 자체 폰트 |
| L1-2 Color | 8 | 흰 + 검정 + 제품 컬러 (3-tier 절제) |
| L1-3 Color Subtlety | 7 | 흰 배경 (Pure white 가까움) |
| L1-4 Trend Currency | 8 | 2025 톤 (제품 사진 톱 + 미니멀) |
| L2-1 White Space | 9 | Hero 점유율 ~40% + 절제 |
| L2-2 Typo Hierarchy | 8 | H1 거대 + body 작은 |
| L2-3 Korean Typo ★ | 4 | KR 토글 / 한국 페이지 별도 (Pretendard 미사용 / Apple SD Gothic) |
| L2-4 Image Tonality | 10 | 제품 사진 톱 — 글로벌 톤 일관 (~99%) |
| L3-1 Asymmetric Layout | 7 | 표준 중앙 정렬 |
| L3-2 Grid Depth | 7 | 표준 그리드 |
| L3-3 Motion Intent | 8 | scroll-driven 제품 회전 + parallax 절제 |
| L3-4 Interaction Craft ★ | 9 | 제품 hover 정밀 + 미세 카드 변환 |
| L3-5 Mobile Fidelity ★ | 9 | 모바일 우선 (iPhone 시연) |
| L3-6 LCP Visual Impact ★ | 10 | Hero 제품 사진 즉시 |
| L3-7 Visual Flow ★ | 9 | Hero → 제품 → 카테고리 → CTA 명확 |
| L3-8 Visual Rhythm ★ | 9 | 흰/cream 섹션 교차 + 제품 컬러 |
| L4-1 Content Weight | 9 | "Meet the latest iPhone lineup." 단일 명제 |
| L4-2 Signature Element | 9 | SF Pro + 제품 사진 톤 + 미니멀 nav (3대) |
| **종합** | **149/180** | **PASS — tier-1 (컨슈머 가전 권위 톱)** |

## 정확 토큰 (Vision 추정)

### 컬러
- Background: `#FFFFFF`
- Background section: `#F5F5F7` 추정 (Apple 회색)
- Text primary: `#1D1D1F` (Apple 다크 그레이)
- Text secondary: `#6E6E73`
- Accent CTA: `#0066CC` (Apple 블루)
- Accent secondary: 제품 컬러 다양

### 폰트
- Display: SF Pro Display / weight 400-700
- Body: SF Pro Text / weight 400-500
- Korean: Apple SD Gothic Neo (한국 페이지)

### 간격
- Section 간격: ~80px
- Container max-width: ~980px

### 모션
- Scroll-driven 제품 회전
- Parallax 절제
- Hover 미세

## 시그니처 요소 (★)

1. **제품 사진 풀임팩트** — Hero 풀블리드 + 컬러 변주 (iPhone 4컬러)
2. **SF Pro Display + 미니멀 nav** — Apple 시그니처
3. **흰 배경 + 회색 섹션 교차** — 절제된 리듬

## 적용 가이드

### 적용 가능 영역
- **컨슈머 / 제조 권위**: 제품 사진 풀임팩트 톤
- **미니멀 nav**: 흰 배경 + 작은 메뉴
- **Industrial Design 권위**: SF Pro 자체 폰트 톤

### 적용 부적합
- ❌ 모션 화려함 (Apple은 절제) → locomotive.ca 권고
- ❌ 그라디언트 메쉬 (Apple은 흰 배경) → stripe 권고
- ❌ 한글 typography 정밀 (Apple SD Gothic — 한국 자체 폰트 부재) → lgcns/toss 권고

## 출처

- source/index.html (curl 2026-05-04, 241KB)
- screenshots/full-1440 + hero-1440 + full-375 (2026-05-04)
- 한국 페이지 자동 redirect 표시

## 변경 이력

| v1.0 | 2026-05-04 | 초기 등재 (149/180, Vision 검증 — 컨슈머 가전 톱) |
