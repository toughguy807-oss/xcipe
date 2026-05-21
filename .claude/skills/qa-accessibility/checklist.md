# Accessibility 체크리스트 (WCAG 2.1 AA)

## 인식 가능 (Perceivable)
- [ ] 모든 `<img>`에 `alt` 존재 (장식: `alt=""` + `aria-hidden="true"`)
- [ ] 색상만으로 정보 전달하지 않음
- [ ] 텍스트 색상 대비 ≥4.5:1 (본문)
- [ ] 대형 텍스트 색상 대비 ≥3:1 (18px+ bold 또는 24px+)
- [ ] 미디어에 대체 텍스트/자막 제공 (해당 시)
- [ ] 텍스트 200% 확대 시 콘텐츠 손실 없음

## 운용 가능 (Operable)
- [ ] 모든 인터랙티브 요소에 키보드 접근 가능
- [ ] 키보드 트랩 없음
- [ ] 포커스 표시 명확 (`outline` 2px+ 또는 동등)
- [ ] `skip-link` (본문 바로가기) 존재
- [ ] 자동 재생 콘텐츠에 중지/일시정지 가능
- [ ] 시간 제한에 연장/해제 기능 (해당 시)

## 이해 가능 (Understandable)
- [ ] `<html lang="ko">` (또는 해당 언어) 선언
- [ ] 폼 입력에 `<label>` 연결
- [ ] 에러 메시지가 구체적 (원인 + 수정 방법)
- [ ] 일관된 내비게이션 패턴
- [ ] focus 시 예기치 않은 컨텍스트 변경 없음

## 견고성 (Robust)
- [ ] 중복 `id` 없음
- [ ] 닫히지 않은 태그 없음
- [ ] ARIA `role` + 필수 `aria-*` 속성 쌍 올바름
- [ ] `aria-expanded` / `aria-selected` / `aria-hidden` 상태 동기화

## 코드 스캔 (자동 검증)
- [ ] `<img>` alt 미기입 0건
- [ ] 제목 계층 건너뜀 0건
- [ ] `:focus-visible` 정의 존재
- [ ] `.sr-only` 클래스 정의 존재
- [ ] 잘못된 ARIA 사용 0건

## 브라우저 검증 모드 (Playwright 사용 시)
- [ ] `ToolSearch("playwright")` 실행하여 도구 로딩 완료
- [ ] `browser_navigate` → 테스트 대상 페이지 로딩 성공
- [ ] `browser_snapshot` → 접근성 트리 정상 출력
- [ ] `browser_press_key("Tab")` 연속 → 포커스 순서 논리적
- [ ] `browser_press_key("Escape")` → 키보드 트랩 없음 확인
- [ ] `browser_evaluate(getComputedStyle)` → 색상 대비 비율 ≥4.5:1
- [ ] `browser_resize({width: 375})` → 모바일 접근성 유지
- [ ] 동적 ARIA 상태 변경 확인 (`aria-expanded` 토글 등)
