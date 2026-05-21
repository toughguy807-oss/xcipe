# Publish 시각 패턴 룰 (Anthropic Content Guidelines 기반)

> 작성일: 2026-04-20
> 출처: Anthropic Claude Design 시스템 프롬프트 + Frontend-Design plugin + taste-skill + gstack
> 적용 대상: publish-markup / publish-style / publish-interaction / publish-visual-verify / design-knowledge
> 연관: `rules/modern-design-stack.md` · `rules/anti-rationalization.md`

## 0. 적용 원칙

모든 publish 작업은 아래 3단 검증을 통과해야 한다:
1. **Iron Rules 5개** — Anthropic 공식 필수 (위반 시 산출물 무효)
2. **Aesthetic Contract** — 프로젝트별 1회 선언 (스타일 축 고정)
3. **Never-Rules** — 패턴 블랙리스트 (Grep 자동 검출)

"Self-Check 수치 PASS = 품질 보증"이 아님. 메모리 `feedback_selfcheck_limits.md` 재확인.

---

## 1. Iron Rules (Anthropic 공식 시스템 프롬프트 인용)

### IR-1. 의도 없는 콘텐츠 0건
- placeholder text / dummy sections / filler content 금지
- 원칙: "One thousand no's for every yes" — 가능한 요소 중 극소수만 채택
- 예: Lorem Ipsum / "Feature 1 / Feature 2 / Feature 3" 카드 3개 자동 생성 / "Testimonials" 섹션에 빈 3개 카드 / "Team" 그리드에 stock photo 4명

### IR-2. 시스템을 먼저 발화 (Vocalize First)
- 코드 작성 전에 다음을 선언:
  - 디자인 토큰 (color / spacing / radius / shadow / motion)
  - 폰트 스택 (본문 / 헤드라인 / 모노)
  - 스타일 축 (editorial / brutalist / retro-futuristic / swiss / etc.)
  - 그리드 시스템 (container / breakpoint / gutter)
- `design-knowledge` 산출물이 이 선언의 공식 저장소
- 선언 없이 publish 진입 = IR-2 위반

### IR-3. 스케일 하한
| 맥락 | 최소 크기 |
|---|---|
| 데스크톱 본문 | 16px |
| 데스크톱 캡션 | 13px |
| 모바일 히트 타겟 | 44×44px |
| 슬라이드·배너 헤드 | 24px 이상 (대형 스크린 30px+) |
| 모바일 본문 | 15px |

### IR-4. 소스 토큰만 리프트 (No Memory Reconstruction)
- 브랜드 가이드 / 레퍼런스 사이트 / Figma 토큰 파일이 주어진 경우:
  - **정확한 hex / spacing / font stack / radius를 그대로 인용**
  - "훈련 데이터 기억으로 재구성" 금지 (lazy slop 생성 경로)
- 토큰 소스가 없으면:
  - Frontend Design Skill 호출해서 신규 생성 (발명 아닌 합성)
  - 사용자에게 확인받은 후 사용

### IR-5. OKLCH 기반 컬러 확장
- 새 컬러 발명 금지
- 기존 팔레트 부족 시:
  ```css
  color-mix(in oklch, var(--brand) 80%, white);
  ```
- P3 wide-gamut 허용: `@supports (color: color(display-p3 1 0 0))`

---

## 2. Aesthetic Contract 템플릿

`design-knowledge` 산출물 상단 또는 프로젝트 CLAUDE.md에 YAML 삽입:

```yaml
aesthetic-contract:
  project: "{프로젝트명}"
  axis: "editorial"  # editorial / brutalist / retro-futuristic / swiss / luxury / minimal-tech / industrial
  tone: "enterprise-sober"  # enterprise-sober / playful / academic / artisan / cinematic
  reference:
    - "anthropic.com"
    - "linear.app"
    - "rathontech.com"
  domain: "B2B 제조 AI 솔루션"
  constraints:
    - "한국어 본문 Pretendard 필수"
    - "PPT 11p 외 사실 생성 금지 (Iron Law)"
  dial:
    design_variance: 5   # 1~10, 실험성
    motion_intensity: 4  # 1~10, 동적 정도
    visual_density: 4    # 1~10, 여백 vs 밀도
```

스타일 축 선택 가이드:
| 축 | 대표 예 | 특징 |
|---|---|---|
| editorial | Kinfolk · Cereal | 서체 믹스 + 여백 + 비대칭 |
| brutalist | Balenciaga · Bloomberg Originals | 대담한 타이포 + 그리드 파괴 + 거친 질감 |
| retro-futuristic | Vercel (과거) · Replit | 네온 + monospace + 터미널 감성 |
| swiss | Helvetica 헌정 · 건축 사이트 | 엄격한 그리드 + 산세리프 + 정렬 |
| luxury | Apple · Aesop · Diptyque | 극단적 여백 + 세련된 비율 |
| minimal-tech | Linear · Notion · Stripe | 라이트 + 단일 accent + 정돈된 그리드 |
| industrial | Palantir · Samsara · c3.ai | 엔지니어링 정밀 + 데이터 중심 + 다크 톤 |

---

## 3. Never-Rules (Grep 기반 자동 검출)

### 3-1. Typography (폰트)
**금지**:
- `font-family: Inter` / `Roboto` / `Arial` / `system-ui` / `Fraunces`
- All-caps subheader 일괄 사용
- Title Case On Every Header (sentence case 사용)
- 고정 px 본문 (clamp() 사용)
- Serif 대시보드/소프트웨어 UI

**권장**:
- 한국어 프로젝트: Pretendard Variable
- 영문 디스플레이: Geist / Cabinet Grotesk / Satoshi / Tuesday Night / Instrument Serif 믹스
- 모노: JetBrains Mono / Geist Mono / Berkeley Mono
- Variable font weight 대비: 100-200 (본문) vs 800-900 (디스플레이)

**Grep**:
```bash
grep -rE "font-family:\s*['\"]?(Inter|Roboto|Arial|system-ui|Fraunces)" css/
```

### 3-2. Color (컬러)
**금지**:
- `#000000` / `#000\s` / `rgb(0,0,0)` (pure black)
- `#6366F1` 퍼플 그라디언트 계열
- `linear-gradient.*(purple|violet|#6366F1|#7C3AED|#8B5CF6)`
- box-shadow 순수 black `rgba(0, 0, 0, ...)` (배경 hue tinted 필수)
- Warm/Cool gray 혼용 (한 tint 고정)

**권장**:
- `#0a0a0a` / `zinc-950` (near-black)
- 단일 accent (saturation < 80%)
- OKLCH 기반 팔레트: `oklch(0.2 0.05 240)` 등
- tinted shadow: `rgba(10, 20, 40, 0.12)` 배경 hue 반영

**Grep**:
```bash
grep -rE "#000000|#000[^\w]|rgb\(0,\s*0,\s*0\)" css/
grep -rE "(purple|violet|#6366F1|#7C3AED|#8B5CF6)" css/
grep -rE "rgba\(0,\s*0,\s*0," css/
```

### 3-3. Layout (레이아웃)
**금지**:
- 3-column 균등 카드 feature row (메인 6페이지 중 ≤ 2 페이지만 허용)
- `height: 100vh` (모바일 주소창 계산 오차)
- 좌측 border-accent + rounded container 조합
- "Modals for everything" (inline / slide-over 대안 우선)

**권장**:
- Bento Grid (`grid-template-areas` 비대칭, `grid-auto-flow: dense`)
- Editorial Asymmetric + Subgrid
- Sticky scroll + scroll-driven animation
- Horizontal scroll snap (가로 스토리)
- `min-height: 100dvh`

**Grep**:
```bash
grep -rE "height:\s*100vh|min-height:\s*100vh" css/
grep -rE "border-left.*accent|border-left.*primary" css/ | grep -B2 "border-radius"
```

### 3-3-추가. DOM / CSS Technical Landmines

**금지** (Huashu Design Skill 2026-04 반영):
- `scrollIntoView()` 호출 — 컨테이너 스크롤 상태 파괴. 스크롤 위치 보존이 필요한 UX에서 파편화 유발
- 값 없는 `@property` 선언 — Firefox 미지원. `syntax`, `inherits`, `initial-value` 3필드 모두 기재 필수
- `const styles = {...}` 다중 컴포넌트 공유 — 이름 충돌. `const componentNameStyles = {...}` 네임스페이스화
- iPhone 프레임 좌표 수동 계산 — 상태바/Dynamic Island 겹침. `ios_frame` 기성 자산 사용

**Grep**:
```bash
grep -rE "\.scrollIntoView\(" js/ html/
grep -rE "@property\s+--[^{]+\{" css/ | grep -v "syntax:"
grep -rE "^const\s+styles\s*=" js/
```

### 3-4. Motion (모션) — 2026-05 CSS-Native 1순위 강화
**금지**:
- `top` / `left` / `width` / `height` 애니메이션 (레이아웃 reflow 발생)
- `linear` 이징 단독 (진행률 표시는 예외)
- `hover: transform: scale(1.05)` 일괄 적용 (컴포넌트별 고유 모션 원칙)
- infinite loop 장식 모션 (회전 배경 등)
- **GSAP/Framer Motion을 디폴트로 도입** (CSS-Native 시도 없이 곧장 라이브러리 추가)
- **하드코딩 이징·지속** (`cubic-bezier(...)`, `300ms` 직접 기재 — Motion DNA 토큰 미사용)

**권장**:
- `transform` (translate / scale / rotate) + `opacity` 만
- **CSS-Native 1순위**: `animation-timeline: scroll()`/`view()` · `@view-transition` · `anchor-name` (modern-design-stack §8 게임 체인저 5선 참조)
- **Motion DNA 토큰 변수만 사용**: `var(--ease-primary)` · `var(--dur-macro)` (design-knowledge 8번째 토큰 카테고리)
- `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like) — 단, 직접 기재 X. 토큰 변수로
- 5 상태 구분: default / hover 150ms / active 100ms / focus-visible 즉시 / disabled 즉시
- `prefers-reduced-motion: reduce` 전수 가드 (Motion DNA에 fallback 정의 필수)

**Grep (자동 검출)**:
```bash
# 하드코딩 이징·지속 (Motion DNA 미준수)
grep -rE "transition:.*\b(cubic-bezier|ease-in|ease-out|[0-9]+(ms|s))\b" output/.../css/ | grep -v "var(--"
grep -rE "animation:.*\b[0-9]+(ms|s)\b" output/.../css/ | grep -v "var(--"

# CSS-Native 사용 여부 (페이지 ≥ 2 또는 scroll/parallax 패턴 식별 시)
grep -rE "@view-transition|animation-timeline|anchor-name|position-anchor" output/.../css/

# Motion DNA 토큰 사용량
grep -rEc "var\(--ease-|var\(--dur-" output/.../
```

**Grep**:
```bash
grep -rE "transition:.*\b(top|left|width|height)\b" css/
grep -rE "hover.*scale\(1\.05\)" css/
grep -rE "animation:.*infinite" css/
```

### 3-5. Content (콘텐츠)
**금지**:
- "John Doe" / "Acme" / "Nexus" / "Globex" 가짜 이름
- "99.99%" / "$100.00" / "10,000" 과도하게 깔끔한 가짜 수치
- "Elevate" / "Seamless" / "Unleash" / "Empower" / "Next-Gen" 마케팅 과잉어
- Lorem Ipsum / Bacon Ipsum / etc.
- Exclamation mark in success messages (UI UX 부자연)
- 이모지 (브랜드가 이모지 기반이 아닌 한)

**권장**:
- 실제 초안 카피 (고객 자료 기반)
- organic messy data (94.7% / $87.23 / 9,472 식)
- 포지션 기반 인용 ("국내 대형 반도체 제조사 공정 엔지니어")
- 담담한 statement 문장

**Grep**:
```bash
grep -rE "John Doe|Jane Doe|Acme|Lorem ipsum|Nexus|Globex" .
grep -rE "Elevate|Seamless|Unleash|Empower|Next-?Gen|Revolutionary" .
```

### 3-6. Icon & Image (아이콘·이미지)
**금지**:
- Lucide / Feather 단독 사용 (혼용 원칙)
- "Rocket = Launch" / "Gear = Settings" 뻔한 메타포
- SVG 자작 사진 (풍경·인물·제품 등) — placeholder 쓰고 사용자에게 요청
- SVG로 사람 얼굴 그리기 (절대 금지 — 초현실적 불쾌감 유발)
- stock photo 4명 팀 그리드 (Unsplash stock 그대로)
- 모든 제목 앞 이모지 아이콘 일괄 배치 (AI slop 시그니처 — 정보 전달 밀도만 보존)
- CSS silhouette으로 실체 제품 이미지 대체 (브랜드 식별도 0%)

**권장**:
- Phosphor Icons + Heroicons 혼용
- 의미 맞춤 커스텀 아이콘
- 이미지는 실제 에셋 또는 Claude Code의 design-image 스킬로 생성
- placeholder 필요 시 picsum.photos/seed/{key}/{W}x{H}

---

## 4. 3-Dial 파라미터 적용

프로젝트 CLAUDE.md의 3-Dial에 따라 publish 산출물의 기대치가 달라진다:

### DESIGN_VARIANCE (실험성)
- **1~3 (보수적)**: 표준 그리드 + 안전한 폰트 조합 + 단색
- **4~6 (중도)**: Bento + 한 섹션 asymmetric + 단일 accent
- **7~9 (실험적)**: Editorial + 비대칭 + Variable font 믹스 + 과감한 대비
- **10 (극단)**: Brutalist + anti-grid + 타이포 파괴

### MOTION_INTENSITY (동적 정도)
- **1~3 (정적)**: hover 150ms 외 모션 없음
- **4~6 (온화)**: scroll-driven reveal + 섹션 진입 애니메이션
- **7~9 (풍부)**: Lenis + scroll-snap + View Transitions + 순차 stagger
- **10 (몰입)**: GSAP + 3D + parallax + 인터랙티브 스토리텔링

### VISUAL_DENSITY (밀도)
- **1~3 (광활)**: 극단적 여백 + 한 섹션에 한 요소
- **4~6 (조화)**: 적절한 여백 + 위계 있는 구성
- **7~9 (밀도 높음)**: 대시보드 스타일 + 정보 패널
- **10 (포화)**: 트레이딩 뷰 / 모니터링 콘솔

---

## 5. publish-visual-verify 연계

`publish-visual-verify` 스킬의 3 Phase는 이 룰을 다음과 같이 참조:

| Phase | 참조 규칙 |
|---|---|
| Phase 1 (Content Guidelines) | Iron Rules 5 + Never-Rules Grep 전수 |
| Phase 2 (9-Axis Taste Audit) | Aesthetic Contract 정합 + 3-Dial 준수 |
| Phase 3 (Visual Rendering) | Playwright 캡처 + Vision LLM 9-Axis 채점 |

---

## 6. anti-rationalization.md 연계

Red Flag #8 신규 추가:
| # | 징후 | 의미 |
|---|------|------|
| 8 | `.variant {` 직접 CSS 선언 0건인데 Self-Check PASS | CSS variant 껍데기 — 실체 레이아웃 없음 |

variant 선언 개수 검증은 publish-style Self-Check에 의무화.

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v1.0 | 2026-04-20 | 최초 작성 (Anthropic 공식 + 6 커뮤니티 레퍼런스 통합) |
| v1.1 | 2026-04-24 | Huashu Design Skill Never-Rules 흡수 — 3-3-추가(scrollIntoView / @property 누락값 / styles 네임스페이스 / iPhone 좌표), 3-6 보강(SVG 얼굴 · 제목 이모지 일괄 · CSS silhouette) |
