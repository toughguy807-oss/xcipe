# Style 체크리스트

## 필수 항목 — 토큰
- [ ] `:root` 블록에 모든 STYLE 가이드 토큰이 CSS Custom Properties로 존재
- [ ] 하드코딩 색상값 0개 (모든 색상이 `var(--color-*)` 참조)
- [ ] 하드코딩 폰트 크기 0개 (모든 크기가 `var(--font-size-*)` 참조)
- [ ] 하드코딩 여백 0개 주요 간격 (컴포넌트 내부 미세 간격은 예외 허용)
- [ ] `/* [미확인] */` 주석 0건 (STYLE 가이드에 없는 값이 없어야 함)

## 필수 항목 — 구조
- [ ] CSS Reset 존재 (box-sizing, margin/padding 초기화)
- [ ] 파일 구조 순서: Reset → Typography → Layout → Components → Responsive → Utility
- [ ] 각 컴포넌트 블록에 `/* ── Component: {이름} ── */` 구분 주석
- [ ] BEM 셀렉터만 사용 (ID 셀렉터, `!important` 금지)

## 반응형
- [ ] 모바일 퍼스트: 기본 스타일이 모바일, `min-width`로 확장
- [ ] 브레이크포인트 3단계: M(기본) / T(769px) / D(1025px)
- [ ] 카드 그리드 반응형: M=1col, T=2col, D={n}col
- [ ] 히어로 높이 반응형: D≥80vh, T≥60vh, M≥50vh (프로젝트별 조정)
- [ ] 폰트 크기 반응형: 제목 계열이 모바일에서 적절히 축소

## 이미지 비율
- [ ] `aspect-ratio` 기반 비율 클래스 존재 (3x2, 16x9, 1x1, 3x4)
- [ ] `object-fit: cover` 적용
- [ ] 비율 클래스가 UI 명세의 이미지 비율과 일치

## 접근성
- [ ] `.sr-only` 클래스 정의
- [ ] `.skip-link` 스타일 정의
- [ ] `*:focus-visible` 포커스 링 스타일 정의 (outline 2px+)
- [ ] 본문 텍스트 색상 대비 ≥4.5:1 (WCAG AA)
- [ ] 대형 텍스트(18px+ bold 또는 24px+) 색상 대비 ≥3:1

## 유형별 추가 체크
### 구축
- [ ] 단일 파일 원칙 유지 (1500L 이하)
- [ ] 사용하지 않는 클래스 없음

### 운영
- [ ] 기존 CSS와 클래스 충돌 없음
- [ ] 기존 변수명 덮어쓰기 없음 (namespace 접두어 사용)
