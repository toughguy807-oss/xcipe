# Functional 체크리스트

## 필수 항목
- [ ] 모든 FN에 최소 1개 TC 매핑
- [ ] Must 기능 TC 커버율 100%
- [ ] 복잡도 높음 FN: 정상 + 예외 + 에러 3단계 검증
- [ ] 복잡도 중간 FN: 정상 + 예외 2단계 검증
- [ ] 모든 TC에 고유 ID (TC-###) 부여
- [ ] 모든 TC에 FN-### 연관 명시
- [ ] 모든 TC에 판정 (Pass/Fail/Block) 기록

## 추적성
- [ ] REQ → FN → TC 추적 테이블 존재
- [ ] 미커버 FN 목록 명시 (있는 경우 사유 기록)
- [ ] Fail TC에 결함 ID (DEF-###) 연결

## 결함 관리
- [ ] 모든 결함에 심각도 분류 (Critical/Major/Minor/Trivial)
- [ ] Critical/Major 결함에 재현 단계 기록
- [ ] 결함별 담당자/상태 지정

## 리포트 완결성
- [ ] 커버리지 집계 (FN/Must/3단계) 포함
- [ ] 결함 현황 요약 포함
- [ ] 최종 판정 + 근거 포함

## SEO 기본 검증
- [ ] 모든 페이지에 title 존재 (30~60자, 페이지별 고유)
- [ ] 모든 페이지에 meta description 존재 (70~155자)
- [ ] 페이지당 h1 정확히 1개
- [ ] Heading 계층 건너뜀 0건
- [ ] OG 태그 3종 존재 (og:title, og:description, og:image)
- [ ] canonical 링크 존재
- [ ] 모든 img에 alt 존재

## 크로스 브라우저 검증
- [ ] Chrome Desktop/Mobile Pass
- [ ] Safari Desktop/Mobile(iOS) Pass
- [ ] TC-CB-### ID 부여 완료

## 유형별 추가 체크
### 구축
- [ ] 모든 페이지에 대해 TC 존재
- [ ] 크로스 브라우저 TC 포함 (Required 브라우저 전수)

### 운영
- [ ] 변경 영향 범위 TC 포함
- [ ] 회귀 테스트 TC 포함
- [ ] 롤백 시나리오 TC 포함

## 브라우저 검증 모드 (Playwright 사용 시)
- [ ] `ToolSearch("playwright")` 실행하여 도구 로딩 완료
- [ ] `browser_navigate` → 테스트 대상 페이지 로딩 성공
- [ ] 링크 클릭 TC: `browser_click` → 대상 페이지 이동 확인
- [ ] 폼 입력 TC: `browser_fill_form` → 입력값 반영 확인
- [ ] 키보드 동작 TC: `browser_press_key` → 동작 확인
- [ ] JS 상태 검증 TC: `browser_evaluate` → 예상 값 일치
- [ ] `browser_snapshot` → 접근성 트리에서 요소 존재 확인
- [ ] 모드별 판정 표기 완료 (Pass(코드) / Pass(실행) / Pass(코드+실행))
