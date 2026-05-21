# 디자인 토큰 예시

> design-knowledge 스킬 참조용. 8대 카테고리별 CSS Custom Properties 작성 예시 (2026-05-04: Motion DNA 추가 — modern-design-stack §8 CG-4 + skills/design-knowledge/SKILL.md §8 참조).

---

## 1. 컬러 (Color)

```css
:root {
  /* Primary — 브랜드 메인 */
  --color-primary-50:  #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-200: #BFDBFE;
  --color-primary-300: #93C5FD;
  --color-primary-400: #60A5FA;
  --color-primary-500: #3B82F6;  /* 기본값 */
  --color-primary-600: #2563EB;
  --color-primary-700: #1D4ED8;
  --color-primary-800: #1E40AF;
  --color-primary-900: #1E3A8A;

  /* Secondary — CTA/액센트 */
  --color-secondary-500: #F59E0B;
  --color-secondary-600: #D97706;

  /* Neutral — 텍스트/배경/보더 */
  --color-gray-50:  #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Semantic — 시스템 피드백 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3B82F6;
}
```

**WCAG AA 대비 검증 예시**:
| 조합 | 대비비 | 판정 |
|------|--------|------|
| primary-500 on white | 4.7:1 | AA Pass (본문) |
| primary-600 on white | 6.0:1 | AA Pass (본문) |
| gray-500 on white | 4.6:1 | AA Pass (본문) |
| gray-400 on white | 3.0:1 | AA Pass (대형 텍스트만) |

---

## 2. 타이포그래피 (Typography)

```css
:root {
  /* 서체 */
  --font-family-heading: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-family-body:    'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-family-mono:    'JetBrains Mono', 'D2Coding', monospace;

  /* 크기 (rem 기준, base 16px) */
  --font-size-4xl: 2.25rem;   /* 36px — 히어로 제목 */
  --font-size-3xl: 1.875rem;  /* 30px — 섹션 제목 */
  --font-size-2xl: 1.5rem;    /* 24px — 서브 제목 */
  --font-size-xl:  1.25rem;   /* 20px — 카드 제목 */
  --font-size-lg:  1.125rem;  /* 18px — 강조 본문 */
  --font-size-md:  1rem;      /* 16px — 기본 본문 */
  --font-size-sm:  0.875rem;  /* 14px — 캡션 */
  --font-size-xs:  0.75rem;   /* 12px — 뱃지, 메타 */

  /* 굵기 */
  --font-weight-bold:     700;
  --font-weight-semibold: 600;
  --font-weight-medium:   500;
  --font-weight-regular:  400;

  /* 행간 */
  --line-height-tight:   1.2;  /* 제목 */
  --line-height-normal:  1.5;  /* 본문 */
  --line-height-relaxed: 1.8;  /* 넓은 본문 */
}
```

---

## 3. 간격 (Spacing)

```css
:root {
  --spacing-xs:  0.25rem;  /*  4px */
  --spacing-sm:  0.5rem;   /*  8px */
  --spacing-md:  0.75rem;  /* 12px */
  --spacing-base: 1rem;    /* 16px */
  --spacing-lg:  1.5rem;   /* 24px */
  --spacing-xl:  2rem;     /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
  --spacing-4xl: 6rem;     /* 96px */
}
```

---

## 4. 둥근 모서리 (Border Radius)

```css
:root {
  --radius-sm:   0.25rem;  /*  4px — 뱃지, 칩 */
  --radius-md:   0.5rem;   /*  8px — 카드, 입력 */
  --radius-lg:   0.75rem;  /* 12px — 모달, 대형 카드 */
  --radius-xl:   1rem;     /* 16px — 큰 컨테이너 */
  --radius-full: 9999px;   /* 원형 — 아바타, 태그 */
}
```

---

## 5. 그림자 (Shadow)

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
               0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
               0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
               0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
```

---

## 6. 전환 (Transition)

```css
:root {
  --transition-fast:   150ms ease-out;  /* 호버, 토글 */
  --transition-normal: 300ms ease-out;  /* 패널 열기, 탭 전환 */
  --transition-slow:   500ms ease-out;  /* 모달, 페이드인 */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 7. 아이콘 (Icon)

```css
:root {
  --icon-size-sm: 16px;  /* 인라인, 버튼 내부 */
  --icon-size-md: 20px;  /* 기본 */
  --icon-size-lg: 24px;  /* 네비게이션, 카드 */
  --icon-size-xl: 32px;  /* 피처 아이콘, 빈 상태 */
}
```

**아이콘 시스템 선택지**:
| 시스템 | 특징 | 적합 |
|--------|------|------|
| Lucide | 깔끔, 일관, MIT | 범용 (권장 기본) |
| Material Symbols | 구글 생태계, 가변 | 대시보드, 관리 |
| Heroicons | Tailwind 친화 | Tailwind 기반 |
| 커스텀 SVG | 브랜드 아이덴티티 | 브랜드 차별화 필요 시 |
