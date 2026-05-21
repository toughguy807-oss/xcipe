# UI 컴포넌트 스펙 예시

> design-ui 스킬 참조용. 버튼/카드/모달/네비게이션 4개 컴포넌트의 상세 스펙 작성 예시.

---

## 예시 1: 버튼 (UI-BTN)

### UI-BTN-001: Primary Button

| 속성 | 값 |
|------|-----|
| **유형** | Primary (채움) |
| **크기** | S: 32px / M: 40px / L: 48px (높이) |
| **패딩** | S: 8px 16px / M: 10px 24px / L: 12px 32px |
| **서체** | `--font-size-sm` (S) / `--font-size-md` (M) / `--font-size-lg` (L) |
| **굵기** | `--font-weight-semibold` (600) |
| **border-radius** | `--radius-md` (8px) |
| **STYLE 참조** | `--color-primary-500` (배경), `white` (텍스트) |

**상태별 스타일**:

| 상태 | 배경 | 텍스트 | 기타 |
|------|------|--------|------|
| Default | `--color-primary-500` | `#FFFFFF` | — |
| Hover | `--color-primary-600` | `#FFFFFF` | `--shadow-sm`, `--transition-fast` |
| Focus | `--color-primary-500` | `#FFFFFF` | `outline: 2px solid --color-primary-300; offset: 2px` |
| Active | `--color-primary-700` | `#FFFFFF` | `transform: scale(0.98)` |
| Disabled | `--color-gray-200` | `--color-gray-400` | `cursor: not-allowed; opacity: 0.6` |
| Loading | `--color-primary-500` | — | spinner 아이콘, `aria-busy="true"` |

**접근성**:
- 최소 터치 타겟: 44×44px (WCAG 2.5.5)
- `role="button"` (기본), 아이콘 전용 시 `aria-label` 필수
- 키보드: Enter/Space 활성화, Tab 포커스

---

## 예시 2: 카드 (UI-CRD)

### UI-CRD-001: 서비스 소개 카드

| 속성 | 값 |
|------|-----|
| **구조** | 이미지 상단 + 제목 + 설명 + CTA |
| **너비** | 반응형 (min 280px, max 1fr) |
| **이미지** | aspect-ratio: 16/9, `object-fit: cover` |
| **패딩** | 콘텐츠 영역 `--spacing-lg` (24px) |
| **border-radius** | `--radius-lg` (12px) |
| **그림자** | `--shadow-sm` (default) → `--shadow-md` (hover) |

**콘텐츠 구조**:
```
┌─────────────────────┐
│   이미지 (16:9)      │
├─────────────────────┤
│ [뱃지]               │  ← --font-size-xs, --color-primary-100 bg
│ 카드 제목             │  ← --font-size-xl, --font-weight-bold, max 2줄
│ 설명 텍스트 (3줄)     │  ← --font-size-md, --color-gray-500, line-clamp: 3
│ [더보기 →]            │  ← --font-size-sm, --color-primary-500
└─────────────────────┘
```

**호버 효과**:
- 그림자: `--shadow-sm` → `--shadow-md`
- 이미지: `transform: scale(1.03)`, `overflow: hidden`으로 컨테이너 내 확대
- 전환: `--transition-normal` (300ms)

**반응형**:
| 뷰포트 | 그리드 | 카드 변화 |
|--------|--------|----------|
| M (≤768) | 1col | 풀폭, 이미지 비율 유지 |
| T (769~1024) | 2col | 간격 축소 (16px) |
| D (≥1025) | 3col | 기본 레이아웃 |

---

## 예시 3: 모달 (UI-MDL)

### UI-MDL-001: 확인 모달

| 속성 | 값 |
|------|-----|
| **크기** | S: 400px / M: 560px / L: 720px (max-width) |
| **max-height** | 85vh (스크롤 대응) |
| **패딩** | `--spacing-xl` (32px) |
| **border-radius** | `--radius-lg` (12px) |
| **오버레이** | `rgba(0, 0, 0, 0.5)`, `backdrop-filter: blur(4px)` |

**구조**:
```
┌──────────────────────────┐
│ 제목           [X 닫기]  │  ← 헤더 (border-bottom)
│──────────────────────────│
│                          │
│   본문 콘텐츠             │  ← 스크롤 영역 (overflow-y: auto)
│                          │
│──────────────────────────│
│        [취소]  [확인]     │  ← 푸터 (우측 정렬)
└──────────────────────────┘
```

**인터랙션**:
- 열기: `opacity: 0 → 1` + `translateY(16px) → 0`, `--transition-normal`
- 닫기: X 버튼, 오버레이 클릭, ESC 키
- 포커스 트랩: 모달 내부에서만 Tab 순환

**접근성**:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{제목ID}"`
- 열릴 때 첫 포커스 → 닫기 버튼 또는 본문
- 닫힐 때 포커스 → 트리거 요소로 복원

---

## 예시 4: GNB (UI-NAV)

### UI-NAV-001: 데스크톱 GNB

| 속성 | 값 |
|------|-----|
| **높이** | 64px (고정) |
| **max-width** | `--container-xl` (1280px) |
| **배경** | `white` + `--shadow-sm` (스크롤 시) |
| **position** | `sticky; top: 0; z-index: 100` |

**구조**:
```
┌──────────────────────────────────────┐
│ [로고]   메뉴1  메뉴2  메뉴3   [검색] [언어] │
└──────────────────────────────────────┘
```

**메뉴 아이템 상태**:
| 상태 | 스타일 |
|------|--------|
| Default | `--color-gray-700`, `--font-weight-medium` |
| Hover | `--color-primary-500`, underline (2px bottom) |
| Active (현재 페이지) | `--color-primary-600`, `--font-weight-semibold`, `aria-current="page"` |

### UI-NAV-002: 모바일 GNB

| 속성 | 값 |
|------|-----|
| **높이** | 56px (고정) |
| **햄버거** | 24px 아이콘, 우측 배치 |
| **드로어** | 좌측 슬라이드, `width: 280px`, 오버레이 |

**인터랙션**:
- 햄버거 → 드로어 열기: `translateX(-100%) → 0`, `--transition-normal`
- 오버레이: `rgba(0, 0, 0, 0.5)` 탭 시 닫기
- 접근성: `aria-expanded`, `aria-controls`, ESC로 닫기

---

## 스펙 작성 체크리스트

모든 UI 컴포넌트에 아래 항목이 포함되어야 합니다:

- [ ] **크기**: 높이/너비/패딩 (S/M/L 분기)
- [ ] **STYLE 토큰 참조**: 색상/서체/간격/radius/shadow
- [ ] **상태**: Default/Hover/Focus/Active/Disabled (인터랙티브 시)
- [ ] **반응형**: M/T/D별 변화
- [ ] **접근성**: ARIA 속성, 키보드 지원
- [ ] **FN 참조**: 동적 기능이 있으면 FN-### 매핑
- [ ] **이미지**: 이미지 포함 시 data-src-keyword 또는 비율 명시
