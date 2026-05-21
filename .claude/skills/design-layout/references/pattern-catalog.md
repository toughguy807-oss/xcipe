# 레이아웃 패턴 카탈로그 (A~R)

> design-layout 스킬 참조용. DESIGN_PRINCIPLES.md §5 기반 18패턴 요약.

---

## 패턴 일람

| 코드 | 이름 | 구조 | 용도 |
|------|------|------|------|
| **A** | Hero | 풀스크린 비주얼 + CTA | 메인, 랜딩 첫인상 |
| **B** | Split | 2등분/비대칭 분할 | 이미지+텍스트, 비교 |
| **C** | Card Grid | 균등 카드 N열 | 목록, 갤러리, 상품 |
| **D** | Bento Grid | 크기 다른 카드 모듈 | 대시보드, 피처드 |
| **E** | Zigzag | 좌우 교차 반복 | 기능 소개, 스텝 |
| **F** | Full-width | 화면 전체 폭 | CTA 배너, 강조 |
| **G** | Masonry | 높이 다른 카드 충전 | 이미지 갤러리 |
| **H** | Magazine | 피처드+서브 비대칭 | 뉴스, 블로그 |
| **I** | Timeline | 세로선 좌우 교차 | 연혁, 코스 |
| **J** | Feature List | 아이콘+제목+설명 반복 | 서비스 특장점 |
| **K** | CTA Banner | 고대비 배경+버튼 | 전환 유도 |
| **L** | Horizontal Strips | 풀와이드 섹션 수직 스택 | 랜딩, 순차 스토리 |
| **M** | Alternating | 이미지+텍스트 교대 | 기능 소개, 어바웃 |
| **N** | Comparison Table | 2~4열 비교표 | 요금제, 스펙 비교 |
| **O** | Interactive Map | 지도+사이드 리스트 | 매장 찾기, 관광 |
| **P** | Storytelling Scroll | 스크롤 연동 콘텐츠 | 브랜드 스토리 |
| **Q** | Dashboard/Widget | 카드 위젯 격자 | 관리자, 마이페이지 |
| **R** | Sidebar + Content | 좌측 네비+우측 본문 | 문서, 카테고리 |

---

## 콘텐츠→패턴 선택 가이드

| 콘텐츠 유형 | 1순위 | 2순위 |
|------------|-------|-------|
| 첫인상/브랜드 | A (Hero) | F (Full-width) |
| 목록 3~8개 | C (Card Grid) | D (Bento Grid) |
| 목록 9개+ | C + 페이지네이션 | G (Masonry) |
| 기능/특장점 | E (Zigzag) | J (Feature List) |
| 스토리/순서 | I (Timeline) | P (Storytelling) |
| 강조/전환유도 | K (CTA Banner) | F (Full-width) |
| 혼합 콘텐츠 | D (Bento Grid) | H (Magazine) |
| 이미지 중심 | G (Masonry) | C (Card Grid) |
| 비교/듀얼 | B (Split) | N (Comparison) |
| 위치/지역 | O (Interactive Map) | C + 지도 |
| 데이터/현황 | Q (Dashboard) | D (Bento Grid) |
| 문서/가이드 | R (Sidebar) | I (Timeline) |

---

## 패턴별 CSS 핵심 스니펫

### A. Hero
```css
.hero { height: 100vh; display: flex; align-items: center; justify-content: center; }
.hero__bg { position: absolute; inset: 0; object-fit: cover; }
```

### B. Split
```css
.split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-xl); }
/* 비대칭: grid-template-columns: 2fr 3fr; */
```

### C. Card Grid
```css
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--spacing-lg); }
```

### D. Bento Grid
```css
.bento { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-lg); }
.bento__featured { grid-column: span 2; grid-row: span 2; }
```

### E. Zigzag
```css
.zigzag { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-2xl); }
.zigzag:nth-child(even) { direction: rtl; }
.zigzag:nth-child(even) > * { direction: ltr; }
```

### F. Full-width
```css
.full-width { width: 100vw; margin-left: calc(-50vw + 50%); padding: var(--spacing-4xl) var(--spacing-lg); }
```

### I. Timeline
```css
.timeline__item { border-left: 2px solid var(--color-primary-200); padding-left: var(--spacing-lg); position: relative; }
.timeline__item::before { content: ''; width: 12px; height: 12px; border-radius: 50%; background: var(--color-primary-500); position: absolute; left: -7px; }
```

### R. Sidebar + Content
```css
.sidebar-layout { display: grid; grid-template-columns: 260px 1fr; gap: var(--spacing-xl); }
.sidebar { position: sticky; top: 80px; align-self: start; }
```

---

## 반응형 변환 규칙

| 뷰포트 | 패턴 변환 |
|--------|----------|
| ≤768px (M) | Grid → 1col 스택, Split → 세로 스택, Sidebar → 상단 토글 |
| 769~1024px (T) | 4col → 2col, Bento → 간소화, Map → 풀맵+하단 리스트 |
| ≥1025px (D) | 풀 레이아웃 유지 |

---

## 섹션 시퀀스 규칙

1. **동일 패턴 연속 금지** — Card Grid → Card Grid (X). Card Grid → Zigzag → Card Grid (O)
2. **배경 교차** — 흰색 → 회색/컬러 → 흰색 (단조로움 방지)
3. **무게 리듬** — 무거운(이미지 풀) → 가벼운(텍스트) → 무거운 교차
4. **CTA 배치** — 3~4 섹션마다 CTA 삽입 (스크롤 깊이 고려)
