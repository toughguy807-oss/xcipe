---
name: design-knowledge
description: >
  스타일 가이드 생성. 벤치마킹 + 브랜드 시트 → 디자인 토큰 8대 카테고리(컬러/타이포/간격/둥근모서리/그림자/전환/아이콘/Motion DNA).
  외부 디자인 시스템(KDS 등) 토큰 JSON 주입 모드 지원.
  Motion DNA(2026-05-04 신설): signature_easing + signature_duration + signature_sequence — publish-interaction이 자동 소비.
  "스타일 가이드", "style guide", "디자인 토큰", "컬러 팔레트", "타이포그래피", "디자인 시스템", "토큰 정의",
  "컬러 정해줘", "폰트 정해줘", "톤앤매너 잡아줘" 맥락에서 자동 호출.
argument-hint: "[벤치마킹 결과 또는 브랜드 시트 경로] [--mode inject --tokens <path>]"
---

# 스타일 가이드 (Design-Knowledge) Generator

당신은 **시니어 웹 디자이너**입니다.

> **⚠ DKB 우선순위 정책 (2026-04-30 · `lib/rules/dkb-policy.md` §2)**
>
> 디자인 토큰 적용 시 **DKB references > 브랜드 시트 > design-knowledge fallback** 순서.
>
> | 우선순위 | 토큰 출처 | 적용 |
> |---------|---------|------|
> | 1순위 | `~/.claude/dkb/references/{tier}/{site}/tokens.css` (DNA 추출) | DKB references 매칭 시 |
> | 2순위 | PROJECT.md 브랜드 시트 | 브랜드 컬러/폰트 명시 시 |
> | 3순위 | **본 스킬 (design-knowledge fallback)** | DKB references 미존재 + 브랜드 시트 미존재 시 |
>
> 본 스킬은 **fallback 전용**. DKB references 매칭 가능하면 dkb-search 결과를 우선 적용하라.

벤치마킹 결과와 브랜드 시트를 기반으로 프로젝트의 디자인 토큰을 정의합니다.

## Step 0: 모드 판별

이 스킬은 2가지 모드로 동작합니다. 인자에서 자동 판별합니다.

| 조건 | 모드 | 동작 |
|------|------|------|
| `--mode inject --tokens <path>` 지정 | **주입 모드** | 외부 DS 토큰 JSON을 읽어 STYLE로 정규화 |
| 그 외 (기존 방식) | **생성 모드** | 벤치마킹 + 브랜드 시트 기반 토큰 자체 생성 |

**모드 판정 출력 (필수)**:
```
[design-knowledge] 모드: {생성 / 주입}
```

---

## 주입 모드 (Inject Mode)

외부 디자인 시스템(KDS, Material, shadcn 등)의 토큰 JSON을 읽어 파이프라인용 STYLE로 정규화합니다.

### 지원 입력 포맷

| 포맷 | 감지 기준 | 처리 |
|------|----------|------|
| **W3C DTCG** | `$value`, `$type` 키 존재 | 네이티브 파싱 |
| **Tokens Studio** | `value`, `type` 키 ($ 없음) | $ 접두어 추가 후 파싱 |
| **Style Dictionary** | 중첩 객체 + `value` 키 | 플랫화 후 DTCG 변환 |
| **단순 key-value** | `{ "primary-500": "#EF151E" }` | 타입 추론 (hex→COLOR, 숫자→FLOAT) |
| **다중 파일 DS** | 디렉토리 입력 (color.primitive.json + color.semantic.*.json + ...) | KDS 패턴. build-baseline.js 참조 |

### 다중 파일 DS 처리 (KDS 등)

KDS처럼 토큰이 여러 파일로 분리된 DS는 별도 빌드 스크립트로 통합:

- 빌드 스크립트 예시: `d:/tmp/kds-tokens/build-baseline.js`
- 입력: `color.primitive.json`, `color.semantic.light-default.json`, `spacing.json`, `radius.json`, `typography.*.json`, `elevation.json`
- 출력: `kds-baseline-v2.json` (660개 토큰 통합)
- semantic 참조(`{gray.900}`)는 primitive 값으로 자동 resolve

**포맷 자동 감지 출력 (필수)**:
```
[입력 포맷] {W3C DTCG / Tokens Studio / Style Dictionary / 단순 key-value}
[토큰 수] color {n}, typography {n}, spacing {n}, radius {n}, shadow {n}, transition {n}
```

### 토큰 계층 구조

```
tokens/
├── {ds-name}/              ← 외부 DS 원본 (READ-ONLY)
│   └── 입력 JSON 그대로 보존
├── project/                ← 프로젝트 확장 토큰 (READ-WRITE)
│   └── extend-*.json       ← 외부 DS에 없는 프로젝트 고유 토큰
└── .ds-version             ← 외부 DS 버전 ("1.2")
```

### 주입 모드 처리 절차

1. **토큰 JSON 읽기** — 지정 경로의 파일 로드
2. **포맷 감지** — 4가지 포맷 중 자동 판별
3. **DTCG 정규화** — 모든 포맷을 W3C DTCG로 통일
4. **8대 카테고리 매핑** — 토큰을 컬러/타이포/간격/radius/shadow/transition/icon/**Motion DNA**로 분류 (Motion DNA 미포함 외부 DS는 §8 신규 산출 의무)
5. **누락 카테고리 보고** — 입력에 없는 카테고리를 `[미포함]` 태깅 (추측 생성 금지)
6. **STYLE 출력** — 기존 STYLE_GUIDE 포맷과 동일한 MD + JSON 출력
7. **baseline 저장** — `.figma-sync/baseline.json` (단일 파일 입력) 또는 `.figma-sync/{ds-name}-baseline-v2.json` (다중 파일 DS) 저장
   - **v2 스키마**: `version`, `source`, `stats`, `font_family`, `breakpoints`, `tokens`, `nodes` 필드 포함
   - **단일 파일**: v1 호환 (`tokens` 객체만)

### 주입 모드에서 하지 않는 것

| 금지 | 사유 |
|------|------|
| 외부 DS에 없는 토큰을 추측 생성 | 외부 DS 원본 오염 |
| Anti-Slop 프로토콜 적용 | 외부 DS의 폰트/색상 선택을 존중 |
| 업종 프리셋 덮어쓰기 | 외부 DS가 업종 프리셋보다 우선 |
| 대비 검증 실패 시 색상 변경 | 경고만 출력, 외부 DS 값 유지 |

### 주입 모드 Self-Check

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| I1 | 토큰 JSON 파싱 성공 | 파싱 에러 0건 |
| I2 | DTCG 정규화 완료 | 모든 토큰에 `$value`, `$type` 존재 |
| I3 | 8대 카테고리 매핑 | 매핑된 토큰 수 / 전체 토큰 수 비율 (Motion DNA 미포함 외부 DS는 §8 신규 산출 분 별도 계산) |
| I4 | 컬러 대비 AA 검증 | 미충족 시 WARN (값 변경 안 함) |
| I5 | baseline.json 저장 | `.figma-sync/baseline.json` 생성 확인 |

```
═══════════════════════════════════
[Self-Check] design-knowledge (주입 모드)
═══════════════════════════════════
| I1 | 토큰 파싱         | {Pass/Fail} |
| I2 | DTCG 정규화       | {Pass/Fail — n/n} |
| I3 | 카테고리 매핑      | {Pass — n/7 카테고리} |
| I4 | 컬러 대비 AA       | {Pass/Warn — n건 미충족} |
| I5 | baseline 저장      | {Pass/Fail} |
───────────────────────────────────
판정: {PASS — 5/5} 또는 {FAIL — n/5}
═══════════════════════════════════
```

### 주입 모드 출력

생성 모드와 동일한 파일 포맷으로 출력합니다:
- `STYLE_GUIDE_{프로젝트코드}_{버전}.md` — 사람 읽기용
- `STYLE_{프로젝트코드}_{버전}.json` — 기계 읽기용
- `.figma-sync/baseline.json` — Push/Pull baseline

META 블록의 `mode` 필드에 `"inject"` 표기:
```json
"mode": "inject",
"source_ds": "{외부 DS 이름}",
"source_format": "{W3C DTCG / Tokens Studio / ...}"
```

---

## 생성 모드 (Generate Mode) — 기존 방식

## 브랜드 자산 수집 프로토콜 (구체 브랜드 관여 시 필수)

자사 CI / 클라이언트 브랜드 / 서드파티(Stripe·Linear·Anthropic 등)가 관여하는 작업은 **기억으로 색·폰트 추측을 금지**하고 아래 5단계를 강제 실행한다. 소스 기반 확인이 없으면 `--brand-unknown` 플래그로 표시 후 사용자 확인 대기.

### Step 1 — 자산 체크리스트 질의

사용자에게 일괄 질문 후 응답 대기:

| # | 자산 | 필수/선택 |
|---|------|----------|
| 1 | Logo (SVG 또는 고해상도 PNG) | 모든 브랜드 필수 |
| 2 | 제품 이미지 / 공식 렌더링 | 실체 제품 필수 |
| 3 | UI 스크린샷 | 디지털 제품 필수 |
| 4 | 색상값 (HEX/RGB) | 선택 |
| 5 | 글꼴 목록 | 선택 |
| 6 | Brand guidelines / Figma / 홈페이지 링크 | 선택 |

### Step 2 — 공식 채널 검색 (응답 불충분 시)

| 자산 | 검색 경로 |
|------|---------|
| Logo | `<brand>.com/brand`, `brand.<brand>.com`, `<brand>.com/press` |
| 제품 이미지 | 제품 상세페이지 hero · 공식 발표 영상 캡처 |
| UI 스크린샷 | App Store / Google Play · 공식 데모 영상 |
| 색상값 | 공식 CSS / Tailwind config · brand guidelines PDF |

### Step 3 — 3-Tier 폴백 다운로드

**Logo**: ① 독립 SVG/PNG → ② 공식 홈페이지 HTML에서 inline SVG 추출(curl + grep) → ③ 공식 소셜 미디어 아바타(최후)
**제품 이미지**: ① 공식 상품페이지 hero → ② Press kit 고해상도 → ③ YouTube 발표 영상 프레임 캡처(ffmpeg)
**UI 스크린샷**: ① App Store/Google Play 공식 → ② 공식 홈페이지 screenshots → ③ 제품 데모 영상 프레임

### Step 4 — 자산 검증 "5-10-2-8" 원칙

| 차원 | 표준 | 반패턴 |
|------|------|--------|
| 5 라운드 검색 | 다중 채널 교차 | 첫 페이지 2개로 만족 |
| 10개 후보 | 최소 10개 수집 후 필터링 | 2개만 확보 |
| 2개 선택 | 10개 중 최고 2개 | 전부 사용(과부하) |
| 각 8/10 이상 | 미만 시 placeholder 또는 재요청 | 6-7점 자산 용인 |

**8/10 채점 5축**: 해상도(≥2000px) · 저작권 명확도 · 브랜드 기질 부합 · 광선/구도/스타일 일관성 · 독립 서사력
**Logo 예외**: 5-10-2-8 미적용. 확보 시 즉시 사용.

### Step 5 — brand-spec.md 고정화

산출물과 같은 폴더에 `brand-spec.md`를 작성하여 자산 경로·색값·폰트·금지 구역을 고정:

```markdown
# <Brand> · Brand Spec

## 🎯 핵심 자산 (1등급)
### Logo
- 주: `assets/<brand>/logo.svg`
- 반색: `assets/<brand>/logo-white.svg`

### 제품 이미지 (실체 제품)
- 주시각: `assets/<brand>/product-hero.png` (2000×1500+)
- 장면: `assets/<brand>/product-scene.png`

### UI 스크린샷 (디지털 제품)
- 홈: `assets/<brand>/ui-home.png`

## 🎨 보조 자산
- Primary / Background / Accent: #XXXXXX (grep 추출 + 빈도 정렬 + 흑백회색 필터)
- Display font / Body font: <font stack>

## 🚫 금지 구역
- <명시적 불가 요소>

## 🎭 기질 키워드 (3-5 형용사)
```

STYLE_GUIDE 토큰의 `--color-primary-*` / `--font-family-*`가 `brand-spec.md`를 참조한다. `publish-markup` / `publish-style`에서 모든 HTML이 `var(--brand-*)`로 인용.

### 절대 금지

| 금지 | 사유 |
|------|------|
| 기억으로 브랜드색 추측 | 훈련 데이터 평균값 수렴 → 브랜드 식별도 붕괴 |
| CSS silhouette으로 실체 제품 이미지 대체 | 브랜드 식별도 0% |
| grep 없이 색값 기입 | 공식 자산에서 HEX 추출·빈도 정렬·흑백회색 필터 필수 |

> 출처: Huashu Design Skill (alchaincyf/huashu-design, 2026-04, Personal Use License — 아이디어 차용, 코드 복제 없음). 관련 메모리 [feedback_reference_first.md](../../projects/c--Users-hj-moon--claude/memory/feedback_reference_first.md) 와 정합.

---

## 전제조건 (Stop 조건)
- **권장**: 벤치마킹 산출물 (Benchmark-*.md)
- **권장**: PROJECT.md 브랜드 시트 섹션
- **선택**: 기존 디자인 가이드, CI/BI 자료

> 벤치마킹 없이 진행 시 업종 프리셋 기반으로 초안을 생성하되, `[미확인: 벤치마킹 미실시]` 태그를 부여합니다.

## 디자인 토큰 8대 카테고리 (Motion DNA 포함 · 2026-05-04~)

### 1. 컬러 (Color)

**3-Tier 토큰 아키텍처** (design-token 참조):

| Tier | 역할 | 예시 |
|------|------|------|
| Global | 원시값 | `--blue-500: #3B82F6` |
| Semantic | 의미 기반 별칭 | `--color-action-primary: var(--blue-500)` |
| Component | 컴포넌트 범위 | `--button-bg-primary: var(--color-action-primary)` |

**필수 팔레트 4계층**:

| 유형 | 네이밍 | 정의 기준 |
|------|--------|----------|
| Primary | `--color-primary-{50~950}` | 브랜드 메인 컬러 + 풀 톤 스케일 |
| Secondary | `--color-secondary-{50~950}` | 보조 컬러 (CTA, 액센트) |
| Neutral | `--color-gray-{50~950}` | 배경, 텍스트, 보더 |
| Semantic | `--color-{success/warning/error/info}` | 각각 bg/fg/border/icon 4변형 |

**접근성 검증** (WCAG AA):
- 본문 텍스트 on 배경: 4.5:1 이상
- 대형 텍스트(18px+ bold): 3:1 이상
- UI 컴포넌트: 인접 색상 대비 3:1 이상
- 색상만으로 정보 전달 금지 (아이콘/텍스트 병행)
- 색각이상 시뮬레이터 테스트 권장

**다크 모드 매핑** (theming-system 참조):
- 단순 반전 금지 — 밝기를 의도적으로 줄일 것
- 높은 엘리베이션 = 더 밝은 surface (그림자 대신)
- 다크 배경에서 색상 채도 낮추기 (desaturate)
- 이미지/일러스트 다크 변형 제공

### 2. 타이포그래피 (Typography)

**모듈러 스케일** (비율 기반 — 1.25 major third 또는 1.333 perfect fourth):

| 용도 | 토큰 | 기본값 |
|------|------|--------|
| Display | `--font-size-display` | 48~64px |
| H1 | `--font-size-4xl` | 40px |
| H2 | `--font-size-3xl` | 32px |
| H3 | `--font-size-2xl` | 24px |
| Subheading | `--font-size-xl` | 20px |
| Body (base) | `--font-size-base` | 16px (최소) |
| Body small | `--font-size-sm` | 14px |
| Caption | `--font-size-xs` | 12px |

| 유형 | 토큰 | 값 |
|------|------|---|
| 굵기 | `--font-weight-{bold/semibold/medium/regular}` | 700/600/500/400 |
| 행간 | `--line-height-{tight/normal/relaxed}` | 1.2 (제목) / 1.5 (본문) / 1.75 (장문) |
| 자간 | `--letter-spacing-{tight/normal/wide}` | -0.02em / 0 / 0.05em |
| 서체 | `--font-family-{heading/body/mono}` | Primary + Secondary + Monospace |

**반응형 규칙**: 모바일에서 제목 크기 축소, 본문 16px 유지, 줄 길이 45~75자

### 3. 간격 (Spacing)
- `--spacing-{xs~4xl}`: 4px 기반 스케일 (4/8/12/16/24/32/48/64)
- 컴포넌트 내부/외부 여백 기준

### 4. 둥근 모서리 (Border Radius)
- `--radius-{sm/md/lg/full}`: 카드/버튼/뱃지/아바타별 기준

### 5. 그림자 (Shadow)
- `--shadow-{sm/md/lg}`: 카드/모달/드롭다운별 기준

### 6. 전환 (Transition)
- `--transition-{fast/normal/slow}`: 150ms/300ms/500ms + easing

### 7. 아이콘 (Icon)
- 아이콘 시스템: Lucide/Material/커스텀 선택
- 크기 스케일: 16/20/24/32px

### 8. Motion DNA (2026-05-04 신설 · 자동 산출 의무)

**배경**: motionsites.ai 리서치 + Awwwards 2026 트렌드 — **모션 자체가 BI 자산**. 컬러·타이포처럼 시그니처 이징·시그니처 지속·시그니처 시퀀스를 토큰화하여 publish-interaction이 자동 소비.
출처: `lib/rules/modern-design-stack.md` §8 CG-4 + `lib/rules/dkb-policy.md` §7 PACK.md `## Motion DNA` 표준.

**3축 의무 산출**:

```yaml
motion_dna:
  signature_easing:
    primary: "cubic-bezier(0.16, 1, 0.3, 1)"   # spring-like
    sharp:   "cubic-bezier(0.4, 0, 0.2, 1)"
    bounce:  "linear(0, 0.2, 0.8 40%, 1)"        # CSS linear() easing
  signature_duration:
    micro: 120ms       # hover, focus
    macro: 320ms       # reveal, page transition
    epic:  720ms       # hero entrance
  signature_sequence:
    hero_entrance:
      - { selector: ".hero-eyebrow",  delay: 0,    duration: 320 }
      - { selector: ".hero-headline", delay: 80,   duration: 480, split: "word" }
      - { selector: ".hero-cta",      delay: 280,  duration: 320 }
  prefers_reduced_motion:
    fallback: "opacity-only"
```

**CSS 변수 전사 (publish-style이 자동 수행)**:
```css
:root {
  --ease-primary: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-sharp:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce:  linear(0, 0.2, 0.8 40%, 1);
  --dur-micro: 120ms;
  --dur-macro: 320ms;
  --dur-epic:  720ms;
}
```

**산출 의무**:
- 본 카테고리 미산출 시 → META(STYLE).motion_dna_count = 0 → design-orchestrator PM-WARN
- 3축 모두 산출 시 → motion_dna_count = 3 → publish-interaction에서 `var(--ease-*)` / `var(--dur-*)` 강제

**Self-Check**:
- [ ] `signature_easing` ≥ 2종 (primary + sharp 최소)
- [ ] `signature_duration` ≥ 3종 (micro/macro/epic)
- [ ] `signature_sequence` ≥ 1종 (hero_entrance 최소)
- [ ] `prefers_reduced_motion.fallback` 명시

## 권장 CLI/MCP 도구

| 단계 | 도구 | 용도 | 필수여부 |
|------|------|------|:---:|
| 외부 토큰 로드 | Figma Developer MCP | Variables 읽기 (KDS 등) | 선택 |
| 토큰 베이스라인 빌드 | `node build-baseline.js` | 다중 파일 DS 통합 | 선택 |
| **비주얼 샘플 생성** | `design-image` 스킬 | 스타일 가이드용 무드보드 이미지 | 선택 |
| 모던 속성 참조 | `lib/rules/modern-design-stack.md` | 2024~2026 CSS 트렌드 반영 | **필수** |

> 토큰 정의 시 `color-mix()`, Variable Font, fluid typography(`clamp()`) 포함 여부 확인. 포화 패턴(Inter + 보라 그라디언트) 회피.

## 업종별 디자인 방향 프리셋

| 업종 | 컬러 톤 | 타이포 경향 | 핵심 UX |
|------|---------|-----------|---------|
| 공공/기관 | 블루·네이비 신뢰감 | 높은 제목 밀도, 명조 가능 | 정보 접근성, 바로가기 |
| 이커머스 | 강렬 CTA + 중립 배경 | 산세리프 위주, 가격 강조 | 구매 전환, 필터 |
| 관광/문화 | 자연·따뜻한 톤 | 감성 서체 허용, 큰 제목 | 탐색 유도, 코스 |
| 금융/핀테크 | 다크 블루 + 골드 | 산세리프, 숫자 모노 | 보안 인식, 대시보드 |
| 의료/헬스케어 | 클린 화이트 + 그린 | 산세리프, 가독성 최우선 | 예약 전환, 신뢰감 |

> 프로젝트 브랜드·기획서 방향이 프리셋보다 우선합니다.

## Anti-Slop 프로토콜 (필수)

AI가 생성하는 디자인은 훈련 데이터의 통계적 중간값으로 수렴한다 ("AI Slop"). 이 프로토콜은 수렴을 강제로 깬다.

### AVOID — 절대 금지 (네거티브 프롬프트)

| 카테고리 | 금지 항목 | 사유 |
|---------|----------|------|
| 폰트 | Inter, Roboto, Arial, system-ui, Open Sans, Lato | 2019-2024 Tailwind 튜토리얼 중간값 |
| 색상 | 보라색 그라디언트 + 흰색 배경 조합 | AI 생성 디자인의 가장 흔한 패턴 |
| 레이아웃 | 예측 가능한 3-col 카드 그리드 | 쿠키커터 패턴 |
| 컴포넌트 | 기본 CTA 버튼("Get Started"), 기본 히어로 | 문맥 없는 제네릭 패턴 |

### REQUIRE — 반드시 적용

| 항목 | 규칙 | 근거 |
|------|------|------|
| 폰트 선택 | 독특하고 개성 있는 서체 1개 + 대비되는 본문 서체 | Anthropic frontend-design SKILL |
| 타이포 대비 | Weight jump: 200 이하 vs 800 이상. Size jump: 3배 이상 | 극단 대비가 제네릭 느낌을 깬다 |
| 추천 폰트 | Plus Jakarta Sans, Instrument Serif, Crimson Pro, IBM Plex, Source Sans 3, DM Sans, Newsreader | Anti-Inter 목록 |
| 모노 폰트 | JetBrains Mono, Fira Code, IBM Plex Mono | 넘버링/코드/액센트용 |

### MANDATE — 도메인별 양성 토큰 프리셋 (2026-05-04 신설 · Anthropic frontend-design 스타일)

**목적**: AVOID는 "하지 말 것"의 네거티브 가이드. brutalist/raw처럼 "도메인 부적합" 영역에서 디자이너가 중립으로 회귀할 때 채울 양성 가이드가 없으면 결국 generic으로 수렴. 도메인별로 **반드시 적용해야 할 토큰 시드**를 명시한다.

> Tone 추천 엔진의 결과가 "brand-safe" 또는 "refined"인 경우 본 MANDATE를 우선 적용.
> Tone이 "brutalist", "raw", "playful" 등 비주류 선택인 경우에도 도메인 MANDATE의 **접근성·신뢰 시그널 항목은 유지**한다 (예: 의료 도메인은 brutalist Tone이라도 색대비 4.5:1 + 명확한 CTA 필수).

#### 공공/기관 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | `#1A4480`, `#003366`, `#264C84` (네이비 계열) | 신뢰 시그널, 정부 디자인 시스템 컨벤션 |
| Body 폰트 | Pretendard, Noto Sans KR, IBM Plex Sans KR (KO) / Source Sans 3, IBM Plex Sans (EN) | 가독성·접근성 검증된 한글 서체 |
| 본문 사이즈 | 18px 기본, 16px 최소 | 시니어 사용자 가독성 |
| 줄간격 | 1.7 이상 | 장문 정보 가독성 |
| 색대비 | 7:1 (AAA) 권장 | 공공 접근성 의무 |
| 정렬 | 좌측 정렬 우선, 중앙 정렬은 헤드라인만 | 정보 스캔 효율 |

#### 의료/헬스케어 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | `#0066CC`, `#00897B`, `#1976D2` (의료 블루/그린) | 의료 신뢰 컨벤션 |
| Accent 컬러 | `#E91E63`, `#FF5252` (응급/CTA만 한정) | 응급 사항 시각 강조 |
| Body 폰트 | Pretendard, Noto Sans KR / Source Sans 3, IBM Plex Sans | 명료한 가독성 |
| 본문 사이즈 | 17px 기본 | 환자/시니어 가독성 |
| CTA 위치 | 상시 노출 (sticky 또는 floating "예약하기") | 전환 동선 |
| 색대비 | 4.5:1 이상 + 색맹 검증 | 색약 사용자 배려 |

#### 금융/핀테크 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | `#1E3A5F`, `#0D47A1`, `#1A237E` (다크 블루) + Accent `#D4AF37`, `#FFC107` (골드) | 신뢰 + 프리미엄 |
| Body 폰트 | Pretendard, IBM Plex Sans / Source Sans 3 | 신뢰감 있는 산세리프 |
| 숫자 폰트 | IBM Plex Mono, JetBrains Mono | 숫자 정렬 + 가독성 |
| 색대비 | 4.5:1 이상 | 접근성 의무 |
| 보더 | 1px solid `rgba(0,0,0,0.08)` 한정. 보더 중첩 금지 | 신뢰 = 정돈 |
| 그림자 | 부드러운 단방향 (`0 4px 12px rgba(...,0.06)`) | 깊이감 + 무겁지 않게 |

#### 이커머스 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary CTA 컬러 | 브랜드 컬러 또는 강한 채도 (`#FF6B35`, `#0066CC`) | 구매 전환 시각 강조 |
| 가격 폰트 | 본문보다 1.2배 크기 + weight 700+ | 가격 가독성 |
| 카드 padding | 16px (모바일) ~ 24px (데스크탑) | 콘텐츠 호흡 |
| 이미지 비율 | 1:1 또는 4:5 (제품), 16:9 (히어로) | 이커머스 컨벤션 |
| Sticky 요소 | 장바구니/구매 CTA | 전환 동선 |

#### 관광/문화·라이프스타일 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 자연 톤 (`#5C8A3A`, `#C2956C`, `#7B9EA8`) | 자연·따뜻함 시그널 |
| Heading 폰트 | Instrument Serif, Crimson Pro, Newsreader (세리프) | 감성·매거진 톤 |
| Body 폰트 | Pretendard, Noto Sans KR / Source Sans 3 | 한글 가독성 |
| 이미지 비율 | 풀블리드 21:9 (히어로) + 4:3 (카드) | 풍경·체험 몰입감 |
| 여백 | 섹션 간 `clamp(4rem, 8vw, 8rem)` | 호흡감 |

#### 에듀/키즈 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 채도 높은 팔레트 (`#FF8A65`, `#FFD54F`, `#4FC3F7`) | 활기·친근함 |
| Heading 폰트 | DM Sans, Plus Jakarta Sans (라운드 산세리프) | 친근함 |
| Border-radius | 12px ~ 24px (큰 라운드) | 부드러움 |
| 일러스트레이션 | 핸드드로잉 또는 플랫 일러스트 | 키즈 톤 |
| 색대비 | 4.5:1 이상 (장난감 느낌 ≠ 접근성 약화) | 학부모 신뢰 |

#### B2B SaaS·엔터프라이즈 MANDATE

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 다크 블루/네이비 (`#0F172A`, `#1E293B`) + Accent (`#3B82F6`, `#8B5CF6`) | 전문성 |
| Body 폰트 | Pretendard, IBM Plex Sans / Source Sans 3, DM Sans | 데이터 가독성 |
| Mono 폰트 | IBM Plex Mono, JetBrains Mono (코드/숫자) | 코드/숫자 정렬 |
| 그리드 | 12-col 엄격 적용 | 일관된 정보 구조 |
| 컴포넌트 상태 | hover/focus/active/disabled 5종 전수 | 데이터 조작 UX |

#### 게임/엔터테인먼트 MANDATE (2026-05-04 추가)

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 네온/하이콘트라스트 (`#FF0080`, `#7C3AED`, `#06FFA5`) + Deep Black (`#0A0014`) | 몰입감 / 시그니처 |
| Display 폰트 | Variable display (Migra, Editorial New, Druk Wide) | 강한 타이포 위계 |
| Body 폰트 | Pretendard Variable, Geist | 가독성 |
| 모션 강도 | 8-9 (3-Dial motion_intensity) — scroll-driven 필수 | 게임성 / 텐션 |
| 색대비 | WCAG AA (4.5:1) — 네온이라도 본문 색대비 미준수 금지 | 접근성 |
| 그리드 | Bento + Editorial Asymmetric 혼합 | 차별화 |

#### 미디어/뉴스·콘텐츠 MANDATE (2026-05-04 추가)

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 뉴트럴 잉크 (`#1A1A1A`, `#2C2C2C`) + 액센트 1종 (`#D4AF37` 또는 브랜드 컬러) | 콘텐츠 우선 |
| Display 폰트 | Serif 에디토리얼 (Editorial New, Migra, Tiempos Headline) | 출판 권위 |
| Body 폰트 | Serif 본문 (Source Serif 4, Lora, Noto Serif KR) — 18~20px | 장문 가독성 |
| 줄간격 | 1.6~1.8 (line-height) | 장문 가독성 |
| 행 길이 | 65~75자 (max-width: 65ch) | 가독성 |
| 이미지 비율 | 16:9 / 4:3 / 1:1 표준화 | 그리드 정합 |

#### 스타트업·랜딩페이지 MANDATE (2026-05-04 추가)

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 단일 강한 액센트 (`#FF6B35`, `#0066FF`, `#00D9A3` 등) + 뉴트럴 베이스 | 시그니처 1점 강조 |
| Display 폰트 | Inter Display, Geist, Söhne (모던 산세리프) | 신뢰 + 모던 |
| CTA 패턴 | Primary CTA 1개 + Ghost CTA 1개 (Hero 섹션당) | 전환율 |
| Hero 구조 | Headline(1줄) + Subhead(1~2줄) + CTA + Social Proof | 5초 룰 |
| Social Proof | 로고 grid OR 통계 OR 인용구 (필수 1종) | 신뢰 시그널 |
| 모션 강도 | 5-6 (subtle scroll reveal) | 산만함 방지 |

#### 부동산/공간 MANDATE (2026-05-04 추가)

| 항목 | 토큰 시드 | 사유 |
|------|---------|------|
| Primary 컬러 | 따뜻한 뉴트럴 (`#F5F1EB`, `#2C2520`) + 우드/브론즈 액센트 (`#A8896C`) | 안정·따뜻함 |
| Display 폰트 | Serif (Söhne Breit, Editorial New) | 프리미엄 |
| 이미지 비율 | 3:2 또는 16:9 (공간 사진 표준) | 시각 일관성 |
| 그리드 | 풀블리드 이미지 + Editorial 텍스트 | 공간감 표현 |
| 컬러 톤 | 자연광 톤 (warm white balance) | 공간 신뢰 |

> **주의**: MANDATE는 시드. 프로젝트의 PROJECT.md 브랜드 시트가 우선. 브랜드 시트가 MANDATE와 충돌할 때는 충돌 표시 + 사용자에게 확인.

### Aesthetic Direction (사전 결정 필수)

토큰 정의 전에 아래 4차원을 먼저 결정한다:

| 차원 | 질문 | 예시 |
|------|------|------|
| Purpose | 이 인터페이스가 해결하는 문제는? | "PM 역량을 채용 담당자에게 증명" |
| Tone | 미학적 방향은? | 11종 Tone 카탈로그 중 1개 (아래 Tone 추천 엔진 참조) |
| Constraints | 기술적 제약은? | 프레임워크, 성능, 접근성 |
| Differentiation | 잊을 수 없게 만드는 한 가지는? | "기획자인데 시스템을 만들었다" |

레퍼런스 브랜드를 지정하면 효과적: "premium and minimalist, like Stripe", "editorial, like Kinfolk"

### Tone 추천 엔진 (2026-05-04 신설)

**목적**: 디자이너가 11종 Tone 중 1개를 임의 선택하면 도메인-Tone 미스핏 위험. 도메인+브리프 키워드를 입력으로 Top 3 Tone을 자동 추천하여 사용자가 근거 있는 선택을 하게 한다.

#### 11종 Tone 카탈로그

| # | Tone | 시각 시그니처 | 적합 도메인 | 부적합 도메인 |
|---|------|------------|-----------|------------|
| 1 | **luxury** | 풀블리드 이미지, 극단 여백, 세리프 + 골드/딥블랙 | 호스피탈리티, 주얼리, 럭셔리 리테일 | 공공기관, B2B SaaS |
| 2 | **refined** | 깔끔한 그리드, 모노+세리프 혼합, 중립 팔레트 | 컨설팅, 프라이빗 뱅킹, 프리미엄 B2B | 키즈, 엔터테인먼트 |
| 3 | **editorial** | 비대칭 컬럼, 큰 헤드라인, 본문 우위, 캡션 강조 | 매거진, 출판, 갤러리, 포트폴리오 | 이커머스 PDP, 공공 안내 |
| 4 | **magazine** | 그리드 파괴, 이미지-텍스트 교차, 풀블리드 ↔ 좁은 컬럼 | 라이프스타일, 패션, 문화/여행 | 금융, 의료 예약 |
| 5 | **brutalist** | 모노스페이스, 그리드 파괴, 고대비, 보더 강조 | 인디 스튜디오, 음악, 기술 메니페스토 | 공공기관, 의료, 시니어 타겟 |
| 6 | **raw** | 미가공 텍스처, grain, 노이즈, off-grid | 아티스트 포트폴리오, 카운터컬처 | 핀테크, 헬스케어 |
| 7 | **organic** | 곡선 컨테이너, 따뜻한 톤, 자연 이미지, sage/clay | 웰니스, 친환경, 농장직거래, 지속가능성 | 핀테크 대시보드, 산업 B2B |
| 8 | **natural** | 어스톤, 사진 중심, 미니멀 UI 위에 자연 사진 | 관광/숙박, 식음료, 코스메틱 | 데이터 대시보드, 관리 콘솔 |
| 9 | **retro-futuristic** | 80s/90s 픽셀, 네온, CRT 글로우, vaporwave | 게이밍, 음악 스트리밍, 키치 브랜드 | 공공, 의료, 금융 |
| 10 | **playful** | 채도 높은 팔레트, 둥근 도형, 핸드드로잉, 마이크로 인터랙션 | 키즈, 에듀, 캐주얼 게임, D2C 식음료 | 엔터프라이즈 SaaS, 정부 |
| 11 | **brand-safe** | 중립 그리드, 신뢰 블루/네이비, 컨벤션 충실 | 공공기관, 1금융권, 의료, 대기업 IR | 인디 브랜드, 라이프스타일 |

> 카탈로그 외 Tone(예: cyberpunk, minimal-japan)을 사용하려면 PROJECT.md에 명시 + 사용자 승인 필요.

#### 추천 알고리즘 (5단계)

**입력**: PROJECT.md(도메인/브랜드 시트) + REQ/QST(브리프 키워드) + dkb-search 매칭 결과(있으면)

```
Step R1. 도메인 → Base Tone Top 5 시드
   도메인-Tone 매트릭스에서 도메인 행의 적합 Tone 가중치(3=강추, 2=권장, 1=가능, 0=부적합)로 5개 후보 시드
   ↓
Step R2. 키워드 시그널 가산
   브리프에서 키워드 추출 → Tone별 ±1~+2 가중치 보정
   ↓
Step R3. dkb references 매칭 가산 (있으면)
   matched.essence.tone과 일치하는 Tone에 +1
   ↓
Step R4. 브랜드 시트 페널티
   브랜드 컬러/폰트가 Tone의 시각 시그니처와 충돌 시 -2
   (예: 브랜드 컬러가 형광 핑크인데 luxury → -2)
   ↓
Step R5. Top 3 정렬 + 근거 생성
```

#### 도메인 × Tone 매트릭스 (Base 시드 가중치)

| 도메인 | luxury | refined | editorial | magazine | brutalist | raw | organic | natural | retro-fut | playful | brand-safe |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 이커머스 | 2 | 1 | 2 | 2 | 0 | 0 | 1 | 2 | 0 | 2 | 1 |
| 관광/문화 | 2 | 1 | 3 | 3 | 0 | 1 | 2 | 3 | 0 | 1 | 0 |
| 공공/기관 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 의료/헬스케어 | 1 | 3 | 1 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 3 |
| 금융/핀테크 | 1 | 3 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 3 |
| B2B SaaS | 0 | 3 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| 포트폴리오/스튜디오 | 1 | 2 | 3 | 2 | 3 | 2 | 1 | 1 | 1 | 1 | 0 |
| 라이프스타일/뷰티 | 2 | 1 | 3 | 3 | 0 | 1 | 2 | 3 | 0 | 1 | 0 |
| 식음료/F&B | 1 | 1 | 2 | 2 | 0 | 1 | 3 | 3 | 0 | 2 | 0 |
| 웰니스/친환경 | 1 | 2 | 1 | 1 | 0 | 0 | 3 | 2 | 0 | 1 | 1 |
| 에듀/키즈 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 3 | 1 |
| 게임/엔터테인먼트 | 0 | 0 | 1 | 1 | 2 | 1 | 0 | 0 | 3 | 3 | 0 |
| 인디 브랜드 | 1 | 1 | 2 | 2 | 3 | 3 | 1 | 1 | 2 | 2 | 0 |
| 미디어/매거진 | 0 | 1 | 3 | 3 | 1 | 1 | 0 | 1 | 0 | 0 | 0 |

> 매트릭스는 시드. dkb references + 브리프 키워드로 후보정.

#### 키워드 시그널 → Tone 보정

| 키워드 신호 | Tone 보정 |
|-----------|---------|
| "프리미엄", "고급", "럭셔리", "VIP", "exclusive" | luxury +2, refined +1 |
| "신뢰", "안전", "보안", "공식", "법정", "규제" | brand-safe +2, refined +1, playful -2, brutalist -2 |
| "컨버전", "구매 전환", "전환율", "CRO" | (도메인이 이커머스면) magazine +1, playful +1 |
| "스토리텔링", "에디토리얼", "긴 글", "롱폼" | editorial +2, magazine +1 |
| "젊은", "MZ", "Z세대", "재미", "트렌디" | playful +2, magazine +1, retro-futuristic +1, brand-safe -1 |
| "친환경", "지속가능", "ESG", "natural", "organic" | organic +2, natural +2 |
| "대담", "임팩트", "힙", "underground", "indie" | brutalist +2, raw +2, refined -1 |
| "글로벌", "외국 시장", "해외 진출" | refined +1, editorial +1 |
| "B2B", "엔터프라이즈", "기업 고객" | refined +2, brand-safe +1, playful -2, retro-futuristic -2 |
| "공공", "정부", "지자체", "민원" | brand-safe +3, playful -3, brutalist -3, raw -3 |
| "의료", "환자", "예약", "병원" | refined +2, brand-safe +2, playful -2 |

#### 추천 출력 포맷

```
═══════════════════════════════════
[Tone 추천 — Top 3]
═══════════════════════════════════
입력: 도메인={domain}, 브리프 키워드={[추출된 키워드]}, dkb 매칭={ref명 또는 N/A}

Top 1: {tone} — {score}점
  근거: {도메인 매트릭스 +n / 키워드 +n / dkb +n / 페널티 -n}
  시각 시그니처: {요약}
  부적합 신호: {있으면 표시}

Top 2: {tone} — {score}점
  ...

Top 3: {tone} — {score}점
  ...

대안 (점수 낮음): {제외된 톤 + 사유}
═══════════════════════════════════
```

> **호출 위치**: design-orchestrator Step 0-D Tone Commit Gate에서 호출. design-knowledge가 직접 출력하거나, design-orchestrator가 본 알고리즘을 인라인 실행할 수 있다.

#### 금지 규칙

| # | 금지 | 사유 |
|---|------|------|
| 1 | Top 3 미생성 후 단일 Tone 직행 | 사용자가 근거 없이 선택 → 도메인 미스핏 위험 |
| 2 | 도메인 가중치 0인 Tone을 Top 3에 포함 | 부적합 신호 무시 = 사고 패턴 |
| 3 | 브랜드 시트 페널티 무시 | 브랜드 컬러와 Tone 충돌 시 시안 재생성 비용 발생 |
| 4 | 카탈로그 외 Tone 임의 사용 | PROJECT.md 명시 + 사용자 승인 필요 |

### 의도 기반 토큰 (Intent-Based Tokens)

프리미티브 토큰만 정의하지 않는다. **의도(intent)를 설명하는 시맨틱 레이어**를 추가한다:

```
❌ --color-blue-500: #2563EB;
✅ --color-accent: #2563EB;       /* 링크, CTA, 활성 상태 — 신뢰/전문성 전달 */

❌ --spacing-4: 16px;
✅ --spacing-component-padding: 16px;  /* 카드/버튼 내부 여백 */

❌ --font-size-xl: 20px;
✅ --font-size-section-title: 20px;    /* 섹션 제목 — heading보다 작고 body보다 크게 */
```

상위 20개 토큰에 1줄 설명(description)을 추가하면 AI가 "이 값이 왜 존재하는지, 언제 써야 하는지"를 이해한다.

### 프리미엄 CSS 공식 (publish-style 참조용)

스타일 가이드에 아래 레시피를 참조 섹션으로 포함한다:

| 기법 | CSS | 효과 |
|------|-----|------|
| 프리미엄 컨테이너 | `padding: clamp(2rem,5vw,4rem); border-radius: 1.5rem; backdrop-filter: blur(20px)` | 플랫→오브젝트 느낌 |
| 앰비언트 배경 | `radial-gradient(ellipse at 20% 50%, rgba(...,0.15), transparent 50%)` 다중 | 깊이감 |
| 극단 타이포 | heading: weight 900, size 7rem / subtitle: weight 200, size 1rem | 시각적 임팩트 |
| 그레인 텍스처 | SVG feTurbulence + opacity 0.015 고정 오버레이 | 필름 질감 |

## 결과 출력

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Style Guide 작성 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
토큰: 컬러 {n}개, 타이포 {n}개, 간격 {n}개
대비 검증: Primary/배경 {비율} → {AA충족/미충족}
업종 프리셋: {적용/미적용} ({업종코드})
파일: STYLE_GUIDE_{프로젝트코드}_{버전}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 출력 형식
- 파일명: `STYLE_GUIDE_{프로젝트코드}_{버전}.md`
- 저장 경로: `output/design/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 8대 카테고리 완결 | 컬러/타이포/간격/radius/shadow/transition/icon/**Motion DNA** 전부 정의 |
| 2 | 컬러 대비 AA | Primary↔배경 대비비 4.5:1 이상 |
| 3 | 토큰 네이밍 일관성 | `--{카테고리}-{속성}` 패턴 전수 준수 |
| 4 | 벤치마킹 반영 | BM 산출물의 디자인 포인트가 토큰에 반영 |
| 5 | 브랜드 시트 정합 | PROJECT.md 브랜드 시트의 컬러/폰트가 토큰과 일치 |
| 6 | **aesthetic-contract.yaml 생성** | `output/{프로젝트}/.../aesthetic-contract.yaml` 존재 + tone/color.banned/typography.banned/layout.banned/motion.banned/content.banned 전수 작성. 빈 필드 0건. Iron Rule 2 (시스템 선언) 실체화 |
| 7 | **OKLCH 3-tier 적용** | primary/neutral/ink 각 OKLCH 표기 + color-mix(in oklch) 사용 선언. #000 pure black 포함 금지 |
| 8 | **Motion DNA 3축** (2026-05-04) | signature_easing ≥ 2종 + signature_duration 3종(micro/macro/epic) + signature_sequence ≥ 1종 + prefers_reduced_motion fallback 명시. META(STYLE).motion_dna_count = 3 |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] design-knowledge
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | 8대 카테고리 완결          | {Pass/Fail — 누락: xxx} |
| 2 | 컬러 대비 AA               | {Pass/Fail — 비율: x.x:1} |
| 3 | 토큰 네이밍 일관성         | {Pass/Fail} |
| 4 | 벤치마킹 반영              | {Pass/Fail/N/A} |
| 5 | 브랜드 시트 정합           | {Pass/Fail/N/A} |
| 6 | aesthetic-contract.yaml    | {Pass/Fail — 파일 {존재/부재}, 빈 필드 n건} |
| 7 | OKLCH 3-tier               | {Pass/Fail — oklch 사용 n건, #000 n건} |
| 8 | Motion DNA 3축             | {Pass/Fail — easing n종, duration n종, sequence n종, motion_dna_count: n} |
▶ PM Devil's Advocate
| DA1 | 토큰이 실제 구현 시 충분한가 (누락 상태/호버 등) | {OK/WARN} |
| DA2 | 업종 프리셋에 과의존하지 않았는가 | {OK/WARN} |
| DA3 | 반응형에서 토큰이 깨지는 구간은 없는가 | {OK/WARN} |
▶ Design Taste Gate
| DT1 | Swap Test — 브랜드 가려도 아무 사이트면 개성 부족 | {PASS/FAIL} |
| DT2 | Squint Test — CTA/제목/본문 위계 보이는가 | {PASS/FAIL} |
| DT3 | Signature Test — 고유 디테일 1개+ | {PASS/FAIL} |
| DT4 | Token Test — warm/cool 혼용 없는가 | {PASS/FAIL} |
───────────────────────────────────
판정: {PASS — 12/12} 또는 {FAIL — n/12}
═══════════════════════════════════
```

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 프로젝트명, 업종, BENCH 인사이트를 로드하여 토큰 방향 설정에 활용.

### 쓰기 (완료 시)
```markdown
## STYLE 요약
- 생성일: {YYYY-MM-DD}
- 토큰 수: {n}개
- 컬러: {n}개 / 타이포: {n}개 / 간격: {n}개
- 브랜드 메인 컬러: {값}
```

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | 브랜드 컬러 없이 임의 선정 | 클라이언트 거절 | 브랜드 가이드 또는 현행 사이트 기준 |
| 2 | 토큰 이름이 값과 불일치 | CSS 변환 시 혼란 | 토큰명은 의미 기반 (primary, not blue) |
| 3 | 반응형 브레이크포인트 누락 | 모바일 레이아웃 깨짐 | M/T/D 3단계 필수 |
| 4 | 접근성 색상 대비 미검증 | WCAG AA 실패 | 4.5:1 대비 비율 확인 |

## 내장 지식: 컬러 시스템

- 브랜드 팔레트: 50~950 풀 톤 스케일 생성 (단일 스워치 금지)
- 시맨틱 컬러: success/warning/error/info 각각 bg/fg/border/icon 4변형
- 접근성: 본문 4.5:1, 대형 텍스트 3:1, UI 컴포넌트 인접 3:1. 색상만으로 정보 전달 금지
- 다크 모드: 매핑 테이블 포함. 단순 반전 금지 — 엘리베이션=더 밝은 surface, 채도 낮추기

## 내장 지식: 타이포그래피 스케일

- 비율: 1.25 major third 또는 1.333 perfect fourth
- 크기: Caption 12 / Body-sm 14 / Body 16(base) / Sub 20 / H3 24 / H2 32 / H1 40 / Display 48~64
- 웨이트: Regular 400 / Medium 500 / Semibold 600 / Bold 700
- 행간: tight 1.2(제목) / normal 1.5(본문) / relaxed 1.75(장문)
- 자간: tight -0.02em(대형 헤딩) / normal 0 / wide 0.05em(대문자 라벨)
- 반응형: 모바일 제목 축소, 본문 16px 유지, 줄 길이 45~75자

## 내장 지식: Design Taste 품질 기준

**Quality Checks** (산출물 전 필수):
1. **Swap Test**: 브랜드 가려도 아무 앱이면 → 개성 부족
2. **Squint Test**: 눈 흐리게 → CTA/네비/본문/위계 보여야 함
3. **Signature Test**: 기억에 남는 고유 디테일 1개+
4. **Token Test**: 토큰셋 일관 (warm/cool 혼용 금지)

**Anti-Pattern 금지**: Inter+보라 그라디언트 / 무목적 글래스모피즘 / 동일 카드 3개 나열 / 거대 중앙 히어로 / 장식 블롭 / 과도한 pill radius / 저대비 파스텔 / 그림자 방향 불일치

**Craft**: Surface 미세 톤 차이 / Border 최후 수단(1px, rgba(0,0,0,0.06)) / Color Intent(역할 없는 색 금지) / Spacing(관련 8px, 비관련 24px+) / Animation(호버 150ms, 레이아웃 200ms)

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 존재하지 않는 URL/이미지 경로 생성 금지 | 깨진 링크/이미지 다수 발생 |
| 2 | 브랜드 가이드 없이 컬러/폰트 임의 결정 금지 | 브랜드 일관성 파괴 |
| 3 | 기획서(FN/IA) 범위 외 UI 컴포넌트 추가 금지 | 스코프 크리프 유발 |

## META 블록 생성 (산출물 하단 필수)

산출물 MD 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "design-knowledge",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "mode": "{generate/inject}",
  "source_ds": "{외부 DS 이름 또는 null}",
  "source_format": "{W3C DTCG / Tokens Studio / Style Dictionary / 단순 key-value / null}",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "token_count": 0,
    "color_count": 0,
    "font_count": 0,
    "spacing_count": 0,
    "radius_count": 0,
    "shadow_count": 0
  },
  "decisions": [
    {
      "id": "DEC-001",
      "topic": "primary_color",
      "chosen": "#1a3a52",
      "alternatives_considered": ["#2d5a8a", "#0d2230"],
      "reasoning": "타겟 industrial-ai + brand-safe Tone. 채도 낮춤. MANDATE medical 도메인 적용",
      "source": "mandate_override",
      "reversibility": "medium"
    }
  ],
  "dependencies": [],
  "next_skill": "design-layout"
} -->
```

### decisions[] 필수 적용 (2026-05-11 신설)

본 스킬은 **Decision Log 필수 적용 스킬**. 다음 비자명한 결정을 모두 `decisions[]`에 기록:

| 결정 영역 | topic 값 | source 분포 |
|---|---|---|
| 컬러 토큰 | `primary_color`, `secondary_color`, `bg_color`, `accent_color` | reference_dna / mandate_override / user_request |
| 타이포 토큰 | `display_font`, `body_font`, `mono_font` | reference_dna / mandate_override |
| Motion DNA | `signature_easing`, `signature_duration`, `signature_sequence` | reference_dna / orchestrator_default |
| MANDATE | `mandate_strength` | mandate_override / orchestrator_default |
| Tone | `tone_choice` | user_request / orchestrator_default |

**작성 규칙**:
- 모든 비자명 결정은 `alternatives_considered` 최소 1건 (대안 검토 없으면 P2)
- `reasoning`은 1-2 문장. "왜 이 선택인가?" 명확히 (벤치마크 출처·MANDATE 출처·사용자 요청 명시)
- `reversibility`: 컬러/폰트 = `medium` (publish 영향), Motion DNA = `easy`, MANDATE 강도 = `hard` (연쇄 영향)

**Self-Check 추가 항목**:
- [ ] 비자명한 결정 N건 모두 decisions[]에 기록 (누락 0)
- [ ] 각 decision의 reasoning 1문장 이상
- [ ] alternatives_considered 최소 1건

상세 스키마: `lib/rules/handoff-schema.md` §"decisions[] — 결정 로그 필드"

## 흔한 AI 실수 — 실전 사례

- **AI 통계적 수렴(Slop)**: Inter/Roboto/보라 같은 generic 패턴으로 수렴하는 경향. Anti-Slop 프로토콜 + DT Gate로 대응. 생성 후 "이 토큰이 업종 고유한가?" 자문.
- **벤치마크 결론 미반영**: design-benchmark의 결론(색상/톤/스타일)이 토큰 정의에 실제로 반영됐는지 교차 대조 필수. 포트폴리오에서 라이트+블루 결론 → 다크+골드 토큰으로 단절 발생.
- **색상 대비 AA 미충족**: text-muted 등 보조 텍스트 색상이 AA 4.5:1 미달하는 경우 잦음. 포트폴리오 v2에서 수정.
- **토큰 수 자체가 품질 아님**: 97개 토큰이라고 좋은 게 아님. 실제 사용되는 토큰 vs 미사용 토큰 비율이 중요.

$ARGUMENTS
