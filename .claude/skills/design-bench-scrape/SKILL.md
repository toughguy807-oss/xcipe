---
name: design-bench-scrape
description: >
  참조 사이트 코드 레벨 분석. curl + node 파싱 → 모던 CSS/레이아웃/모션/폰트 스택 추출.
  design-benchmark가 "보고 따라하기"라면 본 스킬은 "코드 읽고 따라하기".
  "벤치마크 스크래핑", "코드 분석", "CSS 기법 추출", "기술 스택 분석",
  "design-bench-scrape", "보고 따라하기", "코드 읽고 따라하기" 맥락에서 자동 호출.
argument-hint: "[참조 사이트 URL 또는 URL 목록]"
---

> **⚠ DEPRECATED — Phase 2 흡수 진행 중 (2026-05-18 v1.1)**
>
> 본 스킬은 **dkb-analyze에 흡수됨**. curl + node 파싱 로직은 `dkb-analyze` Step 1 자산 수집 단계의 **부수효과로 항상 실행**되도록 통합 완료.
>
> ## 정책 (2026-05-18 신설)
>
> - **신규 호출 금지**: 신규 코드에서 `design-bench-scrape` 호출 작성 금지. 대신 `dkb-analyze {URL}` 호출
> - **본 stub 유지 기간**: 2026-07-15까지 (2개월). 기존 호출부 마이그레이션 검증 후 완전 삭제
> - **단독 실행은 가능**: 기존 호출부 backward-compat 목적. dkb-analyze 미사용 시 본 스킬이 자동 호출되어 BENCHSCRAPE.md만 생성
>
> ## 마이그레이션 가이드
>
> | 기존 호출 | 신규 호출 |
> |-----------|----------|
> | `Skill: design-bench-scrape https://anthropic.com` | `Skill: dkb-analyze https://anthropic.com` (DNA.md + tier 분류까지 통합) |
> | `design-bench-scrape` 산출물 (`output/design/ref/scrape/`) | `~/.claude/dkb/references/{tier}/{domain}/source/` (자동 흡수) |
>
> 자세한 정책: `lib/rules/dkb-policy.md` §1 References-First + `d:/SYS_v4/docs/dkb-analyze-evolution-plan.md` Phase 2


# 벤치마크 코드 분석 (Design-Bench-Scrape) Generator

당신은 **프론트엔드 기술 리서처**입니다.

참조 사이트의 실제 코드(HTML/CSS/JS)를 수집·분석하여 사용된 모던 CSS 기법, 레이아웃 패턴, 모션 라이브러리를 식별합니다. design-benchmark의 "시각적 관찰"을 보완하여 "구현 레벨 인사이트"를 제공합니다.

## 전제조건 (Stop 조건)

- **필수**: 대상 URL (1개 이상, 최대 10개 권장)
- **필수**: Node.js 18+ (파싱 스크립트용)
- **선택**: modern-design-stack.md (감지 항목 기준표)

## 권장 CLI/MCP 도구

| 단계 | 도구 | 명령 | 용도 | 필수 |
|------|------|------|------|:---:|
| HTML 수집 | curl | `curl -sL -A "Mozilla/5.0"` | 페이지 다운로드 | 필수 |
| CSS 수집 | curl | 2차 요청 (link[href]) | 스타일시트 다운로드 | 필수 |
| 파싱 | node | `node -e "..."` + 정규식 | 패턴 추출 | 필수 |
| 분석 기준 | Read | modern-design-stack.md | 감지 항목 정의 | 권장 |

## 감지 대상

### 모던 CSS 기법 (8종)

| 기능 | 감지 패턴 |
|------|----------|
| :has() | `:has(` |
| Container Query | `@container` |
| View Transitions | `view-transition-name`, `::view-transition` |
| Subgrid | `grid-template.*subgrid`, `grid-template-columns: subgrid` |
| Anchor Positioning | `anchor-name:`, `position-anchor:` |
| color-mix() | `color-mix(` |
| @layer | `@layer ` |
| scroll-driven animation | `animation-timeline:`, `scroll()` |

### 레이아웃 패턴 (6종)

| 패턴 | 감지 휴리스틱 |
|------|-------------|
| Bento Grid | `grid-template-areas` + 불균등 span |
| Subgrid 활용 | `subgrid` 키워드 |
| Scroll Snap | `scroll-snap-type`, `scroll-snap-align` |
| Horizontal Scroll | `overflow-x: auto/scroll` + flex-row |
| CSS Grid(12-col) | `grid-template-columns: repeat(12, ...)` |
| Container Query 반응형 | `@container` 사용량 |

### 모션 라이브러리 (7종)

| 라이브러리 | 감지 패턴 (script src 또는 전역 변수) |
|-----------|----------------------------------|
| GSAP | `gsap.min.js`, `window.gsap` |
| ScrollTrigger | `ScrollTrigger.register` |
| Lenis | `lenis.min.js`, `new Lenis` |
| Locomotive Scroll | `locomotive-scroll` |
| AOS | `aos.js`, `data-aos=` |
| Framer Motion | `framer-motion` (React 빌드) |
| Motion One | `motion.one` |

### 폰트 스택

- `@font-face` 선언
- Google Fonts `<link>` (fonts.googleapis.com)
- Variable font 여부 (`font-variation-settings`)
- font-family 선언 전수

## 작성 절차

### Step 0: 입력 스캔

1. URL 목록 수신 (단일 또는 JSON 배열)
2. 출력 디렉토리 준비:
   ```bash
   mkdir -p output/design/ref/scrape
   ```
3. modern-design-stack.md 로드 (감지 기준 확인)

### Step 1: HTML 수집

```bash
for URL in "${URLS[@]}"; do
  SITE=$(echo "$URL" | sed -E 's|https?://||' | sed 's|/.*||')
  curl -sL -A "Mozilla/5.0 (compatible; design-bench-scrape)" \
    -o "output/design/ref/scrape/${SITE}.html" \
    --max-time 30 \
    "$URL"
done
```

### Step 2: CSS 수집

```bash
# HTML에서 link[rel=stylesheet] href 추출 → curl로 순차 다운로드
node -e '
const fs = require("fs");
const html = fs.readFileSync(process.argv[1], "utf-8");
const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
console.log(links.join("\n"));
' "output/design/ref/scrape/${SITE}.html" | while read CSS_URL; do
  curl -sL -o "output/design/ref/scrape/${SITE}_$(basename $CSS_URL)" "$CSS_URL"
done
```

### Step 3: 패턴 감지 (node 스크립트)

```bash
node -e '
const fs = require("fs");
const path = process.argv[1];

// 대상: HTML + 모든 CSS 파일 통합
const allCss = fs.readdirSync(path).filter(f => f.endsWith(".css") || f.endsWith(".html")).map(f => fs.readFileSync(`${path}/${f}`, "utf-8")).join("\n");

const cssFeatures = {
  has:          /:has\(/.test(allCss),
  containerQry: /@container\s/.test(allCss),
  viewTrans:    /view-transition/.test(allCss),
  subgrid:      /subgrid/.test(allCss),
  anchor:       /anchor-name:/.test(allCss),
  colorMix:     /color-mix\(/.test(allCss),
  cssLayer:     /@layer\s/.test(allCss),
  scrollDriven: /animation-timeline:/.test(allCss)
};

const motion = {
  gsap:        /gsap\.min\.js|window\.gsap/.test(allCss),
  scrollTrig:  /ScrollTrigger/.test(allCss),
  lenis:       /lenis[\.@]/.test(allCss),
  locomotive:  /locomotive-scroll/.test(allCss),
  aos:         /aos\.js|data-aos/.test(allCss),
  motionOne:   /motion\.one/.test(allCss)
};

const fonts = [...allCss.matchAll(/font-family:\s*([^;]+)/gi)].map(m => m[1].trim()).filter((v,i,a) => a.indexOf(v) === i);

console.log(JSON.stringify({ cssFeatures, motion, fonts: fonts.slice(0, 10) }, null, 2));
' "output/design/ref/scrape" > "output/design/ref/scrape/${SITE}_analysis.json"
```

### Step 4: 사이트별 리포트 생성

```markdown
# {SITE} 기술 분석

## 모던 CSS 기법
| 기능 | 사용 |
|------|:---:|
| :has() | ✅/❌ |
| Container Query | ... |

## 레이아웃 패턴
- 감지된 패턴: Bento / Subgrid / ...

## 모션 스택
- 주 라이브러리: GSAP + ScrollTrigger
- 부가: Lenis (스무스 스크롤)

## 폰트 스택
{폰트 목록}

## SYS v4 적용 제안
- {어떤 publish-style/interaction 스킬에 반영할지}
```

### Step 5: design-benchmark 연동

benchmark MD에 "기술 분석" 섹션으로 삽입:

```markdown
## 기술 분석 (design-bench-scrape)

| 사이트 | 모던 CSS | 모션 | 폰트 |
|--------|----------|------|------|
| Site1  | :has, @container, subgrid | GSAP+ST, Lenis | Geist |
| Site2  | @layer, color-mix | Motion One | Fraunces |
```

## 합리화 방지

| 변명 | 현실 | 대응 |
|------|------|------|
| "SPA라 HTML만 봐서 한계" | 초기 HTML + 런타임 CSS에 단서 존재 | 정적 분석 + 주요 CSS 추출로도 충분 |
| "동적 스크립트는 감지 불가" | src 속성 기반 감지 가능 | script src 전수 추출 |
| "난독화로 분석 어렵다" | 네이티브 CSS 기능은 난독화 안 됨 | @container, :has() 등 검출 가능 |
| "1개만 분석" | 패턴은 복수 사이트 비교에서 보임 | 최소 3개 권장 |

## Self-Check

- [ ] 대상 사이트 1개 이상 HTML 다운로드 성공
- [ ] CSS 파일 최소 1개 이상 수집
- [ ] 모던 CSS 8개 항목 전수 검사
- [ ] 모션 라이브러리 6개 항목 전수 검사
- [ ] 폰트 스택 추출
- [ ] 사이트별 JSON 리포트 생성
- [ ] design-benchmark MD에 표 삽입 (연계 모드)

## Gotchas

| # | 패턴 | 대응 |
|---|------|------|
| 1 | Cloudflare/JS 렌더링 사이트 | 초기 HTML만 분석 가능. 한계 명시 |
| 2 | CSS가 인라인 스타일 우세 | `<style>` 태그 내부도 수집 |
| 3 | 압축/난독화된 CSS | 네이티브 기능(@container, :has)은 보존됨 |
| 4 | 네트워크 타임아웃 | `--max-time 30` 필수 |
| 5 | User-Agent 차단 | `-A "Mozilla/5.0"` 지정 |

## META 블록

```html
<!-- META {
  "skill": "design-bench-scrape",
  "version": "v1",
  "site_count": 5,
  "css_feature_detected": 6,
  "motion_lib_detected": 3,
  "font_count": 12,
  "self_check": "PASS"
} -->
```

$ARGUMENTS
