---
name: qa-performance
description: >
  성능 테스트 스킬. Core Web Vitals + 리소스 최적화 + NFR 목표값 기준으로
  웹 성능을 검증합니다.
  "성능", "performance", "속도", "로딩 속도", "Core Web Vitals",
  "LCP", "CLS", "Lighthouse", "성능 최적화", "성능 테스트" 등
  웹 성능을 측정하거나 최적화하는 맥락에서 자동 호출.
argument-hint: "[URL 또는 HTML 파일경로]"
---

# 성능 테스트 (QA-Performance) Generator

당신은 **시니어 QA 엔지니어**입니다.

Core Web Vitals 및 리소스 최적화 관점에서 웹 성능을 검증합니다.

## 전제조건 (Stop 조건)
- **필수**: 테스트 대상 (HTML 파일 또는 URL)
- **권장**: REQ의 NFR 섹션 (성능 목표값 정의)
- **선택**: 퍼블리싱 산출물 (CSS/JS 파일 크기 분석)

## 실행 모드

| 모드 | 방법 | 측정 범위 | 사용 시점 |
|------|------|----------|----------|
| **정적 분석** (기본) | 파일 크기/코드 패턴 직접 분석 | 리소스 크기, 코드 품질, CWV 추정 | 항상 가능 |
| **브라우저 측정** | Playwright로 실제 로딩 측정 | CWV 실측, 네트워크 요청, 런타임 성능 | 정확한 CWV 필요 시 |
| **Lighthouse 실측** | `qa-lighthouse` 스킬 연동 | CWV 5지표 + 카테고리 4점수 실측 JSON | 객관 점수 필요 시 |

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수여부 |
|------|------|------|------|:---:|
| Lighthouse 실측 | `qa-lighthouse` | `npx lighthouse` 래핑 스킬 | CWV 실측 JSON + 정적 분석 병합 | 권장 |
| 로컬 서버 | npx | `npx http-server output/publish -p 8080` | 파일 기반 측정 | 선택 |
| 브라우저 실측 | Playwright MCP | `performance.getEntriesByType()` | PerformanceObserver CLS | 선택 |
| 네트워크 분석 | Playwright MCP | `browser_network_requests` | 리소스 타이밍 | 선택 |

### 브라우저 모드 측정 절차
1. `ToolSearch("playwright")` → Playwright 도구 로딩
2. `browser_navigate("file:///{절대경로}/output/publish/index.html")`
3. **CWV 실측**:
   ```javascript
   // LCP + FCP (browser_evaluate)
   performance.getEntriesByType('paint')
   // → {name: "first-contentful-paint", startTime: 1100}

   // Navigation Timing (browser_evaluate)
   performance.getEntriesByType('navigation')[0]
   // → domContentLoadedEventEnd, loadEventEnd → TTI 추정

   // CLS (browser_evaluate)
   new Promise(resolve => {
     let cls = 0;
     new PerformanceObserver(list => {
       for (const entry of list.getEntries()) cls += entry.value;
     }).observe({type: 'layout-shift', buffered: true});
     setTimeout(() => resolve(cls), 3000);
   })
   ```
4. **네트워크 분석**: `browser_network_requests` → 요청 수, 크기, 타이밍
5. **반응형 성능**: `browser_resize({width: 375})` → 모바일 CWV 재측정
6. **스크린샷**: `browser_take_screenshot` → 로딩 상태 증빙

### 정적 vs 브라우저 비교 테이블
결과 출력 시 양쪽 데이터를 비교 표시합니다:
```
| 지표 | 정적 추정 | 브라우저 실측 | 판정 |
|------|----------|-------------|------|
| LCP  | ~2.0s   | 1.8s        | Good |
```

## 검증 절차

### 1. Core Web Vitals 측정

| 지표 | 약어 | Good | Needs Improvement | Poor |
|------|------|------|-------------------|------|
| Largest Contentful Paint | LCP | ≤2.5s | ≤4.0s | >4.0s |
| First Input Delay | FID | ≤100ms | ≤300ms | >300ms |
| Cumulative Layout Shift | CLS | ≤0.1 | ≤0.25 | >0.25 |
| First Contentful Paint | FCP | ≤1.8s | ≤3.0s | >3.0s |
| Time to Interactive | TTI | ≤3.8s | ≤7.3s | >7.3s |

### 2. 리소스 최적화 검증

| 항목 | 검증 방법 | 목표 |
|------|----------|------|
| **이미지 포맷** | `<img>` src 확장자 | WebP/AVIF 권장, PNG/JPG 허용 |
| **이미지 크기** | 파일 크기 확인 | 단일 이미지 ≤500KB |
| **Lazy Loading** | `loading="lazy"` 속성 | 뷰포트 밖 이미지에 적용 |
| **CSS 크기** | 파일 크기 합산 | ≤100KB (minified) |
| **JS 크기** | 파일 크기 합산 | ≤200KB (minified) |
| **외부 요청** | `<link>`, `<script>` src 도메인 | 최소화 (10개 이하) |
| **폰트 로딩** | `font-display` 속성 | `swap` 또는 `optional` |
| **캐시 헤더** | HTTP 응답 헤더 (URL 테스트 시) | `Cache-Control` 존재 |

### 3. 코드 수준 분석 (정적 검증)
HTML/CSS/JS 파일을 직접 분석:

- **CSS**: 사용하지 않는 셀렉터, 중복 속성, `!important` 남용
- **JS**: `document.write()` 사용, 동기 스크립트, 미사용 코드
- **HTML**: 인라인 스타일/스크립트, render-blocking 리소스
- **이미지**: `width`/`height` 속성 (CLS 방지), `srcset` (반응형)

### 4. NFR 연계 검증
REQ의 NFR(성능) 목표값이 있으면 해당 기준으로 Pass/Fail 판정:

```
NFR-001: 페이지 로드 3초 이내 → LCP {측정값} → {Pass/Fail}
NFR-002: API 응답 500ms 이내 → {측정값} → {Pass/Fail}
```

## 결과 출력

```
═══════════════════════════════════
[성능 테스트 결과]
═══════════════════════════════════
테스트 대상: {파일/URL}
실행일: {날짜}
───────────────────────────────────
[Core Web Vitals]
LCP: {값} → {Good/NI/Poor}
FID: {값} → {Good/NI/Poor}
CLS: {값} → {Good/NI/Poor}
FCP: {값} → {Good/NI/Poor}
TTI: {값} → {Good/NI/Poor}
───────────────────────────────────
[리소스]
이미지: {n}개, 총 {n}KB, WebP {n}%, lazy {n}%
CSS: {n}KB (목표 ≤100KB)
JS: {n}KB (목표 ≤200KB)
외부 요청: {n}개 (목표 ≤10)
───────────────────────────────────
[NFR 검증] (있는 경우)
{NFR별 목표 vs 실측 vs Pass/Fail}
───────────────────────────────────
[최적화 권고]
{우선순위별 개선 항목}
───────────────────────────────────
[판정]
성능: {Pass / Fail / 부분 통과}
═══════════════════════════════════
```

## 출력 형식
- 파일명: `Performance_{프로젝트코드}_{버전}.md`
- 저장 경로: `output/qa/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | CWV 5지표 | LCP/FID/CLS/FCP/TTI 전수 측정 또는 추정. 누락 지표 0건 |
| 2 | 리소스 8항목 | 이미지 포맷/크기, lazy loading, CSS/JS 크기, 외부 요청, 폰트, 캐시 전수 검증 |
| 3 | Good/NI/Poor 판정 | 각 CWV에 Good/Needs Improvement/Poor 등급 명시 |
| 4 | 코드 수준 분석 | CSS(미사용 셀렉터, !important), JS(동기 스크립트, document.write), HTML(render-blocking) 검출 |
| 5 | NFR 연계 | REQ의 NFR 성능 목표 존재 시 목표 vs 실측 비교 + Pass/Fail 판정 `[연계 모드 전용]` |
| 6 | 최적화 권고 | 우선순위별 개선 항목 제시 (즉시/단기/장기) |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] qa-performance
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | CWV 5지표                  | {Pass/Fail — 누락: xxx} |
| 2 | 리소스 8항목               | {Pass/Fail — 미검증 n건} |
| 3 | Good/NI/Poor 판정          | {Pass/Fail} |
| 4 | 코드 수준 분석             | {Pass/Fail} |
| 5 | NFR 연계                   | {Pass/Fail/N/A} |
| 6 | 최적화 권고                | {Pass/Fail} |
▶ PM Devil's Advocate
| DA1 | 정확성 — CWV 추정값과 실측 괴리가 클 수 있는 요인    | {OK/WARN — 사유} |
| DA2 | 누락 — 폰트/외부스크립트/third-party 등 놓친 리소스   | {OK/WARN — 사유} |
| DA3 | 기준 — NFR 미존재 시 업종 기준값을 적용했는가         | {OK/WARN — 사유} |
───────────────────────────────────
판정: {PASS — 9/9} 또는 {FAIL — n/9}
═══════════════════════════════════
```

### 상세 체크리스트
전체 항목: [checklist.md](checklist.md) 참조 (reviewer 검수 시 사용)

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 MARKUP 섹션 수, STYLE CSS 토큰 수를 로드.

### 쓰기 (완료 시)
```markdown
## QA-P 요약
- 생성일: {YYYY-MM-DD}
- CWV Good: {n}%
- 리소스: {n}개
```

## 내장 지식: 성능 병목 진단 순서

### Core Web Vitals 목표값
| 지표 | Good | Needs Improvement | Poor |
|------|------|-------------------|------|
| LCP | ≤2.5s | 2.5~4.0s | >4.0s |
| FID/INP | ≤100ms / ≤200ms | 100~300ms / 200~500ms | >300ms / >500ms |
| CLS | ≤0.1 | 0.1~0.25 | >0.25 |

### 병목 진단 순서 (80/20 법칙)
1. **이미지** (LCP 악화 #1 원인) → WebP/AVIF, srcset, lazy loading, 적절 크기
2. **JS 번들** (TTI/INP 악화) → 코드 분할, tree shaking, 200KB 이하 목표
3. **렌더 블로킹** (FCP 악화) → CSS critical path, async/defer 스크립트
4. **폰트** (CLS 원인) → font-display: swap, preload, woff2
5. **서드파티** (예측 불가) → Analytics/Chat 위젯 지연 로드

### 측정 조건 표준화
| 항목 | 기준 |
|------|------|
| 네트워크 | Fast 3G throttling (1.6Mbps down) |
| CPU | 4x slowdown |
| 캐시 | 첫 방문 (cold cache) |
| 페이지 | 최소 3페이지 (메인 + 콘텐츠 + 목록) |
| 도구 | Lighthouse CI 또는 WebPageTest |

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 로컬에서만 측정 | 실제 네트워크 환경과 차이 | throttling (3G/4G) 적용 |
| 2 | 메인 페이지만 측정 | 하위 페이지 성능 미검증 | 최소 3페이지 측정 |
| 3 | 이미지 최적화 미검증 | LCP 악화의 주범 | WebP/AVIF + lazy loading 확인 |
| 4 | 번들 사이즈 미확인 | JS 비대화 → TTI 악화 | 200KB 이하 목표 |

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 테스트 미실행 상태에서 Pass 판정 금지 | 품질 보증 무효화 |
| 2 | 존재하지 않는 파일/URL 참조 금지 | 검증 불가한 결과 |
| 3 | Critical 결함을 임의로 등급 하향 금지 | 출시 후 장애 위험 |

## META 블록 생성 (산출물 하단 필수)

산출물 MD 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "qa-performance",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "cwv_good_pct": 0,
    "resource_count": 0
  },
  "dependencies": [],
  "next_skill": null
} -->
```

## 흔한 AI 실수 — 실전 사례

- **이미지 lazy loading 누락**: 히어로 제외 모든 `<img>`에 `loading="lazy"` 필수. 카페예약에서 P0.
- **JS defer 미적용**: 렌더 블로킹 스크립트에 `defer` 또는 `async` 미적용. 카페예약 P1.
- **img width/height 미명시**: CLS 방지를 위해 모든 `<img>`에 width/height 필수. 카페예약 P1.
- **WebP 미사용**: `<picture>` 소스셋에 WebP 미포함. 카페예약 P1.
- **위젯형 프로젝트 과잉 검사 주의**: 비짓강남 챗봇처럼 경량 위젯은 14건 TC 전부 Pass. 불필요하게 깊은 검사 하지 말 것.

$ARGUMENTS
