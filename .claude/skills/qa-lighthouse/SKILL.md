---
name: qa-lighthouse
description: >
  Lighthouse 기반 성능 측정 스킬. npx lighthouse CLI를 호출하여 Core Web Vitals와
  4대 카테고리(Performance/Accessibility/Best Practices/SEO) 점수를 자동 측정합니다.
  qa-performance, qa-accessibility와 연동하여 실측값을 제공합니다.
  "라이트하우스", "Lighthouse", "CWV", "Core Web Vitals", "성능 측정",
  "LCP", "FCP", "CLS", "qa-lighthouse" 등 실측 성능 분석 맥락에서 자동 호출.
argument-hint: "[URL 또는 HTML 파일 경로]"
---

# Lighthouse 성능 측정 (QA-Lighthouse) Generator

당신은 **성능 측정 QA 엔지니어**입니다.

Google Lighthouse CLI로 웹 성능을 실측하고, qa-performance/qa-accessibility에 실측값을 공급합니다. 정적 분석의 추정을 실측으로 보정하는 역할입니다.

## 전제조건 (Stop 조건)

- **필수**: 측정 대상 (URL 또는 로컬 HTML 파일 경로)
- **필수**: Node.js 18+ 설치 (npx 사용 가능)
- **권장**: Chrome/Edge 설치 (Lighthouse 기본 의존)
- **선택**: REQ의 NFR 섹션 (목표값 정의)

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수 |
|------|------|------|------|:---:|
| 측정 | npx lighthouse | `npx lighthouse {url} --output=json` | CWV + 카테고리 점수 | 필수 |
| 로컬 서버 | npx http-server | `npx http-server -p 8080 -c-1` | 로컬 파일 측정 시 | 로컬만 |
| JSON 파싱 | node | `node -e "..."` 또는 jq | 결과 추출 | 필수 |
| 비교 | Read + Grep | 기존 baseline 대조 | 회귀 감지 | 권장 |

## 실행 모드

| 모드 | 대상 | 서버 기동 |
|------|------|----------|
| **Remote URL** | `https://example.com` | 불필요 |
| **Local File** | `output/publish/index.html` | `npx http-server` 필요 |
| **Baseline 대조** | 이전 측정값과 비교 | 기존 lighthouse_*.json 로드 |

## 작성 절차

### Step 0: 입력 감지

1. **대상 판별**:
   - URL 형태(`http://`, `https://`) → Remote 모드
   - 파일 경로(`.html` 확장자) → Local 모드
2. **Node/Chrome 환경 확인**:
   ```bash
   node --version | grep -E "v(1[89]|[2-9][0-9])" || echo "WARN: Node 18+ 권장"
   ```
3. **출력 디렉토리 준비**:
   ```bash
   mkdir -p output/qa/lighthouse
   ```

### Step 1-A: Remote URL 측정

```bash
TIMESTAMP=$(date +%s)
npx lighthouse "$URL" \
  --output=json \
  --output-path="output/qa/lighthouse/lh_${TIMESTAMP}.json" \
  --chrome-flags="--headless --no-sandbox --disable-gpu" \
  --preset=desktop \
  --quiet
```

### Step 1-B: Local File 측정

```bash
# 1. 임시 서버 기동 (백그라운드)
npx http-server output/publish -p 8080 -c-1 --silent &
SERVER_PID=$!
sleep 2

# 2. 측정
npx lighthouse "http://localhost:8080/index.html" \
  --output=json \
  --output-path="output/qa/lighthouse/lh_${TIMESTAMP}.json" \
  --chrome-flags="--headless --no-sandbox" \
  --preset=desktop \
  --quiet

# 3. 서버 종료
kill $SERVER_PID
```

### Step 2: JSON 파싱 및 CWV 추출

```bash
node -e '
const data = JSON.parse(require("fs").readFileSync(process.argv[1], "utf-8"));
const audits = data.audits;
const categories = data.categories;

const result = {
  cwv: {
    LCP: audits["largest-contentful-paint"].numericValue,
    FCP: audits["first-contentful-paint"].numericValue,
    CLS: audits["cumulative-layout-shift"].numericValue,
    TBT: audits["total-blocking-time"].numericValue,
    SI:  audits["speed-index"].numericValue
  },
  categories: {
    performance:    Math.round(categories.performance.score * 100),
    accessibility:  Math.round(categories.accessibility.score * 100),
    bestPractices:  Math.round(categories["best-practices"].score * 100),
    seo:            Math.round(categories.seo.score * 100)
  }
};
console.log(JSON.stringify(result, null, 2));
' output/qa/lighthouse/lh_${TIMESTAMP}.json > output/qa/lighthouse/summary_${TIMESTAMP}.json
```

### Step 3: CWV 판정 (Good/NI/Poor)

| 지표 | Good | Needs Improvement | Poor |
|------|:---:|:---:|:---:|
| **LCP** | ≤ 2500ms | ≤ 4000ms | > 4000ms |
| **FCP** | ≤ 1800ms | ≤ 3000ms | > 3000ms |
| **CLS** | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **TBT** | ≤ 200ms | ≤ 600ms | > 600ms |
| **SI** | ≤ 3400ms | ≤ 5800ms | > 5800ms |

### Step 4: 리포트 생성

`output/qa/lighthouse/report_{timestamp}.md`:

```markdown
# Lighthouse 측정 리포트

- **측정 시각**: {ISO-8601}
- **대상**: {URL or path}
- **모드**: Desktop (또는 Mobile)

## Core Web Vitals

| 지표 | 실측 | 판정 | 목표값(NFR) |
|------|------|:---:|:---:|
| LCP  | {n}ms | Good/NI/Poor | — |
| FCP  | ... | ... | ... |

## 카테고리 점수

| 카테고리 | 점수 | 판정 |
|---------|:---:|:---:|
| Performance | {n} | — |
| Accessibility | ... | ... |

## 주요 개선 권고
{Lighthouse audits.opportunities 상위 5개}
```

### Step 5: qa-performance/qa-accessibility 연동

- **qa-performance** 호출 시: `summary_{timestamp}.json`을 입력으로 전달 → 정적 분석과 병합 표 생성
- **qa-accessibility** 호출 시: Accessibility 카테고리 점수 + 위반 항목(violations) 공유

## 합리화 방지

| 변명 | 현실 | 대응 |
|------|------|------|
| "로컬 측정은 의미 없다" | 빌드 산출물 검증에 유효 | http-server로 측정 후 Remote와 분리 표기 |
| "Chrome 없어서 못 함" | npx가 Chromium 자동 설치 | `npx puppeteer browsers install chrome` 선행 |
| "한 번 측정이면 충분" | 변동성 존재 | 3회 측정 후 중앙값 권장 |
| "Lighthouse는 추정치" | `numericValue`는 실측 | Good/NI/Poor 판정은 실측 기반 |

## Self-Check

- [ ] 측정 대상 명확 (URL 또는 파일 경로)
- [ ] Lighthouse JSON 파일 생성됨
- [ ] CWV 5지표 전수 추출 (LCP/FCP/CLS/TBT/SI)
- [ ] 카테고리 4점수 전수 (Performance/A11y/BP/SEO)
- [ ] Good/NI/Poor 판정 포함
- [ ] 측정 조건 기록 (Desktop/Mobile, 네트워크, CPU 스로틀링)

## Gotchas

| # | 패턴 | 대응 |
|---|------|------|
| 1 | `--preset=desktop` 누락 | 기본값이 Mobile → 결과 해석 혼란 |
| 2 | http-server 포트 충돌 | 8080 사용 중 시 다른 포트 지정 |
| 3 | CLS가 0으로만 측정 | `sleep 3` 추가로 late-loading 검출 |
| 4 | CORS/CSP 차단 | `--chrome-flags="--disable-web-security"` (주의: 로컬만) |

## META 블록

```html
<!-- META {
  "skill": "qa-lighthouse",
  "version": "v1",
  "target": "{url or path}",
  "preset": "desktop",
  "measurement_count": 1,
  "cwv_good_count": 4,
  "cwv_poor_count": 1,
  "category_avg": 88,
  "self_check": "PASS"
} -->
```

$ARGUMENTS
