# Core Web Vitals 기준값 참조

> qa-performance 스킬 참조용. CWV 목표값 + 리소스 예산 + 측정 방법을 정리합니다.

---

## 1. Core Web Vitals 기준 (2026)

| 지표 | Good | Needs Improvement | Poor | 측정 도구 |
|------|------|-------------------|------|----------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5~4.0s | > 4.0s | Lighthouse, CrUX |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200~500ms | > 500ms | Lighthouse, CrUX |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1~0.25 | > 0.25 | Lighthouse, CrUX |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8~3.0s | > 3.0s | Lighthouse |
| **TTFB** (Time to First Byte) | ≤ 0.8s | 0.8~1.8s | > 1.8s | WebPageTest |
| **TBT** (Total Blocking Time) | ≤ 200ms | 200~600ms | > 600ms | Lighthouse |

### 프로젝트 유형별 목표값

| 유형 | LCP | INP | CLS | FCP | 근거 |
|------|-----|-----|-----|-----|------|
| 기업/브랜드 | ≤ 2.0s | ≤ 150ms | ≤ 0.05 | ≤ 1.5s | 첫인상 중요, 이미지 중심 |
| 공공/기관 | ≤ 2.5s | ≤ 200ms | ≤ 0.1 | ≤ 1.8s | 접근성 우선, 다양한 환경 |
| 커머스/쇼핑 | ≤ 1.5s | ≤ 100ms | ≤ 0.05 | ≤ 1.2s | 전환율 직결 (1초 지연 = 7% 감소) |
| 콘텐츠/미디어 | ≤ 2.0s | ≤ 150ms | ≤ 0.1 | ≤ 1.5s | 스크롤 경험, 이미지/영상 다수 |
| 관광/여행 | ≤ 2.5s | ≤ 200ms | ≤ 0.1 | ≤ 1.8s | 비주얼 중심, 지도 연동 |

---

## 2. 리소스 예산 (Resource Budget)

### 파일 크기 기준

| 리소스 | 예산 (gzip) | 비압축 참고 | 비고 |
|--------|------------|-----------|------|
| HTML | ≤ 30KB | ~100KB | 시맨틱 마크업, 인라인 CSS 최소화 |
| CSS (전체) | ≤ 50KB | ~200KB | 미사용 규칙 제거 |
| JS (전체) | ≤ 100KB | ~350KB | 서드파티 포함 |
| 이미지 (개별) | ≤ 200KB | — | WebP/AVIF 우선 |
| 이미지 (페이지 전체) | ≤ 1.5MB | — | lazy loading 적용 |
| 폰트 (전체) | ≤ 100KB | — | subset + display:swap |
| 총 전송량 | ≤ 2MB | — | 3G 환경 기준 |

### HTTP 요청 수 기준

| 항목 | 기준 | 최적화 방법 |
|------|------|-----------|
| 총 요청 수 | ≤ 50 | 스프라이트, 인라인 SVG, 번들링 |
| 서드파티 요청 | ≤ 10 | 필요 최소한, defer/async |
| 폰트 파일 | ≤ 4 | 2서체 × 2웨이트 이내 |
| 이미지 above-the-fold | ≤ 5 | 히어로 + 로고 + 아이콘 |

---

## 3. 이미지 최적화 기준

| 용도 | 권장 포맷 | 최대 크기 | 해상도 |
|------|----------|----------|--------|
| 히어로/배너 | WebP | 200KB | 1920×1080 (2x: 3840) |
| 카드 썸네일 | WebP | 50KB | 600×400 |
| 아이콘 | SVG | 5KB | 벡터 |
| 로고 | SVG | 10KB | 벡터 |
| OG 이미지 | PNG/JPG | 100KB | 1200×630 |

### `<picture>` 패턴

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="설명" loading="eager" width="1920" height="1080">
</picture>
```

---

## 4. Lighthouse 점수 기준

| 카테고리 | 목표 | 최소 허용 |
|---------|------|----------|
| Performance | ≥ 90 | ≥ 70 |
| Accessibility | ≥ 95 | ≥ 90 |
| Best Practices | ≥ 95 | ≥ 85 |
| SEO | ≥ 95 | ≥ 90 |

---

## 5. 측정 코드 (Playwright browser_evaluate)

### CWV 실측

```javascript
// LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lcp = entries[entries.length - 1];
  console.log('LCP:', lcp.startTime, 'ms');
}).observe({ type: 'largest-contentful-paint', buffered: true });

// CLS
let clsValue = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) clsValue += entry.value;
  }
  console.log('CLS:', clsValue);
}).observe({ type: 'layout-shift', buffered: true });

// FCP
const paintEntries = performance.getEntriesByType('paint');
const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
console.log('FCP:', fcp?.startTime, 'ms');
```

### 리소스 크기 집계

```javascript
const resources = performance.getEntriesByType('resource');
const summary = {};
resources.forEach(r => {
  const type = r.initiatorType || 'other';
  if (!summary[type]) summary[type] = { count: 0, size: 0 };
  summary[type].count++;
  summary[type].size += r.transferSize;
});
console.table(summary);
```

---

## 6. 검수 보고서 판정 기준

| 판정 | 조건 |
|------|------|
| **PASS** | CWV 3개 전부 Good + Lighthouse 4카테고리 목표 달성 |
| **CONDITIONAL** | CWV 2개 Good + 1개 NI + Lighthouse 최소 허용 이상 |
| **BLOCK** | CWV 1개 이상 Poor 또는 Lighthouse Performance < 70 |
