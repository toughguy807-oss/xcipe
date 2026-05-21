# Interaction 체크리스트

## 필수 항목
- [ ] IIFE 패턴으로 전역 오염 방지
- [ ] `'use strict'` 선언
- [ ] `DOMContentLoaded` 이벤트에서 초기화
- [ ] 외부 라이브러리 의존성 없음 (바닐라 JS)
- [ ] 요소 미존재 시 가드 처리 (`if (!el) return;`)

## ARIA 상태 관리
- [ ] 토글 컴포넌트: `aria-expanded` 동기화 (메뉴, 아코디언, 드롭다운)
- [ ] 탭: `aria-selected`, `role="tablist/tab/tabpanel"` 동기화
- [ ] 모달: `aria-modal`, `role="dialog"`, 포커스 트랩
- [ ] 슬라이더: `aria-live="polite"` 업데이트
- [ ] 폼: `aria-invalid`, `aria-describedby` 에러 연결

## 키보드 내비게이션
- [ ] `Escape`: 열린 메뉴/모달/드롭다운 닫기
- [ ] `Enter/Space`: 버튼, 토글, 아코디언 활성화
- [ ] `←→` 또는 `↑↓`: 탭/슬라이더 이동
- [ ] `Tab`: 포커스 순서가 시각적 순서와 일치
- [ ] 모달: 포커스 트랩 (Tab 키가 모달 밖으로 나가지 않음)

## 모션 + 성능
- [ ] `prefers-reduced-motion: reduce` 감지 시 애니메이션 비활성화
- [ ] `IntersectionObserver` 사용 시 폴리필 또는 기능 감지
- [ ] 스크롤 이벤트에 `passive: true` 또는 `requestAnimationFrame` 사용
- [ ] 이벤트 위임 패턴 사용 (동적 요소 대응)

## 코드 품질
- [ ] 컴포넌트별 `init{Component}()` 함수로 분리
- [ ] 매직 넘버 없음 (상수 또는 CSS 변수로 관리)
- [ ] console.log 잔여물 없음
- [ ] DOM 쿼리 최소화 (변수에 캐싱)

## 유형별 추가 체크
### 구축
- [ ] 전체 컴포넌트 목록이 FN 명세의 프론트엔드 항목과 일치

### 운영
- [ ] 기존 JS와 이벤트 리스너 충돌 없음
- [ ] 기존 전역 변수 덮어쓰기 없음
