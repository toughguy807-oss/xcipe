# Performance 체크리스트

## Core Web Vitals
- [ ] LCP ≤2.5s (Good)
- [ ] FID ≤100ms (Good)
- [ ] CLS ≤0.1 (Good)
- [ ] FCP ≤1.8s (Good)
- [ ] TTI ≤3.8s (Good)

## 이미지 최적화
- [ ] 뷰포트 밖 이미지에 `loading="lazy"` 적용
- [ ] 이미지에 `width`/`height` 속성 (CLS 방지)
- [ ] 단일 이미지 ≤500KB
- [ ] WebP/AVIF 형식 권장 (PNG/JPG 허용)

## CSS 최적화
- [ ] CSS 총 크기 ≤100KB (minified 기준)
- [ ] 사용하지 않는 셀렉터 없음
- [ ] `!important` 남용 없음 (3건 이하)
- [ ] render-blocking CSS 최소화

## JS 최적화
- [ ] JS 총 크기 ≤200KB (minified 기준)
- [ ] `document.write()` 사용 없음
- [ ] 동기 스크립트 (`<script>` without defer/async) 없음
- [ ] 미사용 코드 없음

## 네트워크
- [ ] 외부 요청 ≤10개
- [ ] 폰트에 `font-display: swap` 또는 `optional` 적용
- [ ] 정적 리소스에 캐시 헤더 설정 (해당 시)

## NFR 연계
- [ ] REQ의 NFR 성능 목표값 대비 Pass/Fail 판정 완료 (있는 경우)
- [ ] 미달 항목에 최적화 권고 사항 기록

## 유형별 추가 체크
### 구축
- [ ] 전체 페이지 측정 (메인 + 주요 서브 2-3개)
- [ ] 모바일/데스크톱 각각 측정

### 운영
- [ ] 변경 전/후 비교 측정
- [ ] 성능 저하 없음 확인 (기존 대비 10% 이내)

## 브라우저 검증 모드 (Playwright 사용 시)
- [ ] `ToolSearch("playwright")` 실행하여 도구 로딩 완료
- [ ] `browser_navigate` → 테스트 대상 페이지 로딩 성공
- [ ] `browser_evaluate(performance.getEntriesByType('paint'))` → FCP/LCP 실측
- [ ] `browser_evaluate(performance.getEntriesByType('navigation'))` → TTI 추정
- [ ] `browser_evaluate(PerformanceObserver + layout-shift)` → CLS 실측
- [ ] `browser_network_requests` → 리소스 수/크기 실측
- [ ] `browser_resize({width: 375})` → 모바일 CWV 재측정
- [ ] 정적 추정 vs 브라우저 실측 비교 테이블 작성 완료
