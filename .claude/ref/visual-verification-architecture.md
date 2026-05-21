# SYS v4 시각 검증 레이어 아키텍처 v2

> 작성일: 2026-04-19 (v1) → 2026-04-20 (v2 리서치 반영)
> 배경: 다회 재시도 사고 — N회 시도 모두 "Self-Check 수치 PASS · 시각 결과 실패"로 수렴
> v2 추가 근거: Anthropic 공식 "distributional convergence" 명명 + 6개 커뮤니티 레퍼런스 교집합

---

## 0. 진단 요약

### 공식 진단 (Anthropic Applied AI, 2026)
LLM이 훈련 데이터 중 안전 패턴(Inter + 3-col cards + 퍼플 그라디언트)으로 수렴하는 현상. 블로그 *Improving frontend design through Skills*에서 **"distributional convergence"**로 명명됨. 다회 재시도 사고의 정확한 원인.

### SYS v4에서 현실화된 결함 5건 (오늘 실측)
1. `.variant { }` 직접 CSS 선언 0건인데 Self-Check 100/100 PASS
2. HTML에 BEM variant 86건 붙어도 CSS가 받지 않아 `display: block` 기본값 렌더링
3. 서버 포트 8080 충돌 감지 못해 캡처·QA·reviewer 전부 엉뚱한 디렉토리 대상
4. 헤드라인 세로 글자 쌓임 (폰트 로드 실패 + 좁은 grid 복합)
5. manifest 58 variant 정의 후 publish-style이 from-scratch 작성 → 57개 variant가 껍데기

---

## 1. 설계 5개 축 (6건 레퍼런스 교집합)

| # | 축 | 레퍼런스 | 구현 위치 |
|---|---|---|---|
| 1 | **Aesthetic Contract** — 스타일 축(editorial/brutalist/retro-futuristic 등) 1회 선언 강제 | Anthropic Frontend-Design plugin, Threads 포스트 | `design-knowledge` 산출 YAML + publish-style 진입 검증 |
| 2 | **Never-Rules** — 포화 패턴 블랙리스트 (Grep 기반 자동 검출) | Anthropic Claude Design Sys Prompt + taste-skill + gstack | `rules/publish-patterns.md` + publish-style Self-Check |
| 3 | **3-Dial 파라미터** — DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY 1~10 | taste-skill + gstack | 프로젝트 CLAUDE.md 선언 / publish-visual-verify 입력 |
| 4 | **9-Axis 감사 루브릭** — Typography / Color / Layout / Interactivity / Content / Components / Iconography / Code Quality / Strategic Omissions | taste-skill redesign-skill | publish-visual-verify Phase 2 |
| 5 | **Playwright Visual Loop** — 3 breakpoint 캡처 → Vision 비교 → 수정 → 재캡처 | Anthropic Frontend Design + Playwright MCP 사례 + gstack design-shotgun | publish-visual-verify Phase 3 + Ralph Loop 외부 verifier |

---

## 2. Iron Rules 5개 (Anthropic 공식 시스템 프롬프트 그대로 차용)

1. **의도 없는 콘텐츠 0건** — placeholder text / dummy sections / filler 금지. "One thousand no's for every yes"
2. **시스템을 먼저 발화** — 디자인 토큰·규칙·스타일 축을 코드 작성 이전에 선언
3. **스케일 하한** — 데스크톱 본문 ≥16px, 모바일 히트 ≥44px, 슬라이드 ≥24px
4. **소스 토큰만 리프트** — 레퍼런스 코드에서 정확한 hex / spacing / font stack / radius 인용. "훈련 데이터 기억으로 재구성" 금지
5. **OKLCH 기반 컬러 확장** — 새 컬러 발명 금지. 기존 팔레트 `color-mix(in oklch, ...)` 혼합만 허용

---

## 3. 아키텍처 (v2)

```
design-knowledge → [Aesthetic Contract YAML 생성] → publish-orchestrator
                                ↓
  publish-markup → [G-1 HTML] → publish-style → [G-2 CSS] → publish-interaction → [G-3 Visual]
                      │                           │                                   │
                      ↓                           ↓                                   ↓
              Grep variant 개수            Grep .variant{} 직접 선언              Playwright 3×N 캡처
              manifest UI-ID 매핑          Never-Rules 위반 검출                  Vision LLM 9-Axis 채점
              ARIA/시맨틱 수치             tokens var() 커버리지                  3-Dial 준수 여부
              [PASS 기준 명시]             computed style 샘플                    Before-After diff
                                                                                 Ralph Loop ≤3
```

### Gate 1 — HTML 정합성 (publish-markup 직후)
- **Grep 검증** (자동):
  - BEM variant 클래스 개수: HTML 내 `class=".*--.*"` ≥ manifest 50%
  - data-ui-id 커버리지: ≥ 95%
  - 시맨틱 태그 (header/nav/main/section/footer) 최소 임계치
- **manifest UI-ID 매핑**: `component-manifest.json`의 모든 UI-### 값이 실제 HTML에 존재
- **Never-Rules 프레벤트** (HTML 레벨): SVG 자작 이미지 / Lorem Ipsum / John Doe / Acme

### Gate 2 — CSS 실체 (publish-style 직후, **핵심**)
- **variant 베이스 선언 필수 검증**:
  ```bash
  grep -cE "^\.([a-z_-]+--[a-z0-9-]+)\s*\{" css/*.css
  ```
  manifest variant 58개 중 **직접 베이스 선언 ≥ 50건 (86%)** 미만이면 즉시 FAIL
- **Never-Rules Grep 검증** (자동):
  - `Inter|Roboto|Arial|system-ui|Fraunces` 폰트 패밀리 금지 (Pretendard/Geist/Cabinet Grotesk/Satoshi 허용)
  - `#000000|#000\s` pure black 금지 (`#0a0a0a` / `zinc-950` 사용)
  - `100vh` 금지 (`100dvh` 사용)
  - `hover.*scale\(1\.05\)` 일괄 사용 금지
  - 좌측 border-accent + rounded container 패턴 금지
- **tokens 커버리지**: hex 하드코딩 ≤ 5건, `var(--` ≥ 1,000건
- **Playwright computed style 샘플** (5 variant):
  - 각 `.section--variant`에 `getComputedStyle` 호출
  - `display: block` 기본값 잔존 0건 (실제 grid/flex 적용 검증)
  - `grid-template-columns` / `grid-template-areas` != "none"
- **FOUC 체크**: stylesheet count = 예상치 (8 import = 8)

### Gate 3 — 시각 완성도 (publish-interaction 직후, 최종)
- **Playwright 캡처**: 3 breakpoint × 6 메인 페이지 = 18 스크린샷
  - breakpoint: 375 (mobile), 768 (tablet), 1440 (desktop)
  - reducedMotion 활성화 (캡처 안정성)
- **Vision LLM 9-Axis 평가** (Claude Sonnet vision):
  - Typography: 깨짐·scale 하한·weight 대비 (100-200 vs 800-900)
  - Color: tinting·단일 accent·퍼플 그라디언트 부재
  - Layout: bento/asymmetric/editorial 존재 여부·카드 반복 ≤ 2
  - Interactivity: 5 상태 (default/hover/active/focus/disabled) 구분
  - Content: filler·John Doe·Lorem·"Seamless"/"Elevate" 부재
  - Components: variant별 고유 시각
  - Iconography: 혼용 (Lucide 단독 X)
  - Code Quality: 콘솔 에러·FOUC 부재
  - Strategic Omissions: 과잉 장식 없음
  - 각 0~10 점수 + 한 줄 코멘트 (총 90점 만점, 75+ PASS)
- **3-Dial 준수도**: 프로젝트 CLAUDE.md 선언값(DESIGN_VARIANCE/MOTION/DENSITY)과 실제 렌더링 일치도
- **Before-After diff** (v-1 대비): pixelmatch 변경율 < 5% 경고

---

## 4. 신규 자산 (v2 확정)

### 4-1. 스킬
- `skills/publish-visual-verify/SKILL.md` — Gate 2 + Gate 3 구현
  - Phase 1: Anthropic Content Guidelines (Never-Rules Grep 검증)
  - Phase 2: 9-Axis Taste Audit (Vision LLM)
  - Phase 3: 3-Dial 준수 + Before-After diff
  - 입력: publish 출력 경로, component-manifest.json, 프로젝트 CLAUDE.md의 3-Dial
  - 출력: `VISUAL_VERIFY_v{n}.md` + 캡처 18장 + 9-Axis JSON 루브릭 + Pass/Fail

### 4-2. 룰
- `rules/publish-patterns.md` — Aesthetic Contract 템플릿 + Iron Rules 5 + Never-Rules 전수 (Typography / Color / Layout / Motion / Content / Icon & Image)

### 4-3. 스크립트 (skills/publish-visual-verify/scripts/)
- `verify-variant-declarations.js` — `.variant {` 직접 선언 개수 Grep
- `verify-never-rules.js` — Inter·#000·100vh·hover:scale(1.05) 등 Grep
- `verify-computed-style.js` — Playwright 5 variant computed style 샘플
- `capture-viewports.js` — 3 breakpoint × N 페이지 캡처
- `visual-rubric-eval.js` — Claude Sonnet Vision API 호출, 9-Axis JSON 채점
- `check-server-port.js` — 서버 포트 충돌 자동 감지·선택

### 4-4. 템플릿
- `skills/publish-visual-verify/templates/aesthetic-contract.yaml` — 프로젝트별 선언 양식
- `skills/publish-visual-verify/templates/9-axis-rubric.json` — 채점 결과 양식

---

## 5. 기존 자산 수정

| 파일 | 수정 내용 |
|---|---|
| `agents/publish-orchestrator.md` | Step 4·5·6 Gate 1·2·3 연결, Ralph Loop 외부 verifier를 publish-visual-verify로 |
| `skills/publish-style/SKILL.md` | Self-Check에 "variant 베이스 선언 ≥ 50" 필수 + `verify-variant-declarations.js` 호출 + Never-Rules Grep |
| `skills/publish-markup/SKILL.md` | Self-Check에 "manifest UI-ID 100% 반영" 필수 |
| `skills/design-knowledge/SKILL.md` | 산출물에 `aesthetic-contract.yaml` 포함 강제 |
| `rules/pipeline.md` | Ralph Loop 정의 확장 — 외부 verifier 명시 |
| `rules/handoff-schema.md` | META 블록에 `visual_verify: PASS/FAIL/SKIPPED` 필드 추가 |
| `rules/environment.md` | 서버 포트 자동 관리 프로토콜 추가 (B6) |
| `rules/anti-rationalization.md` | Red Flag #8 "variant 직접 선언 0건 + Self-Check PASS = 합리화" 추가 |
| `rules/modern-design-stack.md` | "포화 패턴 금지" 권고 → publish-patterns.md 참조 강제 |

---

## 6. 3-Dial 파라미터 정의

프로젝트 `CLAUDE.md`에 아래 섹션 의무화:

```markdown
### 시각 검증 프로파일 (3-Dial)
DESIGN_VARIANCE: 1~10  # 낮을수록 보수적, 높을수록 실험적
MOTION_INTENSITY: 1~10 # 낮을수록 정적, 높을수록 동적
VISUAL_DENSITY: 1~10   # 낮을수록 여백 중심, 높을수록 대시보드 밀도
```

업종별 기본값 가이드:
| 업종 | VARIANCE | MOTION | DENSITY |
|---|:---:|:---:|:---:|
| B2B 엔터프라이즈 솔루션 | 5 | 4 | 4 |
| 관광·문화 | 7 | 7 | 6 |
| 이커머스 | 6 | 5 | 7 |
| 핀테크 | 4 | 3 | 6 |
| 미디어·에디토리얼 | 8 | 6 | 5 |
| 포트폴리오 | 8 | 7 | 4 |

---

## 7. 9-Axis 채점 루브릭 (0~10)

| 축 | 10점 기준 | 5점 기준 | 0점 기준 |
|---|---|---|---|
| **Typography** | Variable font + 극단 weight 대비(100 vs 900) + fluid clamp + pretty wrap | Pretendard 단일 + 고정 px | Inter/Roboto + 깨짐 |
| **Color** | OKLCH 3-tier + 단일 accent + tinted shadow + P3 gamut | Hex 2-tier + black shadow | 퍼플 그라디언트 #6366F1 + pure #000 |
| **Layout** | Bento + Editorial + Subgrid + Container Query | 2-col + asymmetric 1건 | 3-col 카드 grid 반복 3+건 |
| **Interactivity** | 5 상태 × 컴포넌트별 고유 모션 | 기본 hover만 | hover:scale(1.05) 일괄 |
| **Content** | 실제 카피 + 구체 수치 + 고유 제품명 | placeholder 일부 | Lorem/John Doe/"Seamless" |
| **Components** | manifest 58 variant 중 50+ 실구현 | 30~49 variant | 카드 그리드만 |
| **Iconography** | Phosphor + Heroicons 혼용 + 의미 맞춤 | Lucide 단독 | "Rocket = Launch" |
| **Code Quality** | 콘솔 에러 0 + FOUC 0 + Lighthouse 90+ | 경미한 경고 | 에러 다수 + FOUC |
| **Strategic Omissions** | 과잉 장식 0 + placeholder 0 + emoji 0 | 일부 장식 | 파티클·글리터·스팸 |

**PASS 기준**: 75점 이상 (9축 평균 8.3점)

---

## 8. 구현 로드맵 (v2)

| 단계 | 산출 | 예상 |
|---|---|---|
| B1.5 | 이 문서 v2 업데이트 | 완료 |
| B2 | `publish-visual-verify` 스킬 + 6 스크립트 + 2 템플릿 | 60분 |
| B3 | `rules/publish-patterns.md` (Iron Rules + Never-Rules 전수) | 20분 |
| B4 | `publish-orchestrator` Gate 1·2·3 연결 | 15분 |
| B5 | `publish-style`·`publish-markup`·`design-knowledge` Self-Check 보강 | 30분 |
| B6 | `environment.md` 서버 포트 자동 관리 | 10분 |
| B7 | 실측 사고 케이스 실증 테스트 (Gate 2·3 실행) | 30분 |
| B8 | 결과 보고 + 변경 이력 기록 | 10분 |

---

## 9. 성공 기준

- [ ] 실측 사고 케이스에 publish-visual-verify 실행 → Gate 2에서 "variant 베이스 선언 0건" FAIL 자동 감지
- [ ] Never-Rules Grep이 `font-family: Inter` / `100vh` / `box-shadow: ... rgba(0,0,0,...)` 자동 탐지
- [ ] 오늘 발견된 결함 5건 전수 자동 감지
- [ ] 다음 프로젝트에서 publish-orchestrator Ralph Loop가 시각 검증 실패 시 자동 재시도 ≤ 3회
- [ ] 외부 AI 도구 의존 없이 SYS v4 내부에서 시각 품질 검증

---

## 10. 실측 사고 케이스 즉시 적용 가능 (B7 테스트 전 참고)

Gate 2 FAIL이 확정되면 다음을 적용해 재검증:
1. 폰트 교체: Pretendard + Geist + JetBrains Mono
2. Pure #000 → #0a0a0a
3. 100vh → 100dvh
4. 본문 `text-wrap: pretty` + `max-width: 65ch`
5. Shadow tinting: `rgba(10, 20, 40, 0.12)` 계열
6. Bento 적용: `grid-template-columns: 2fr 1fr 1fr; grid-auto-flow: dense;`
7. Active feedback: `button:active { transform: translateY(1px) scale(0.98); }`
8. Focus ring: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }`
9. Skeleton loader (shimmer 키프레임)
10. "혁신적"/"Next-Gen"/"Seamless"/"Acme"/"John Doe" 전수 삭제

---

## 11. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| Vision LLM 평가 주관성 | 9-Axis 각 항목 구체 수치화 (카드 반복 ≤ 2, weight 대비 ≥ 700 등) |
| Playwright 환경 요구 | `environment.md` 명시 + npx playwright install 자동 안내 |
| API 호출 비용 | Grep 1차 FAIL 시 Vision 생략 (계층 검증) |
| 기존 파이프라인 break | 신규 Gate는 publish-orchestrator에 `--visual-verify=true` 기본 ON, false로 우회 가능 |
| 커뮤니티 레퍼런스 과적합 | SYS v4 도메인(B2B·공공·관광 등)에 맞춰 3-Dial 기본값 재조정 가능 |

---

## 12. 출처

### Anthropic 공식
- [Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills)
- [anthropics/claude-code frontend-design plugin](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [anthropics/claude-cookbooks prompting_for_frontend_aesthetics](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb)
- [Anthropic Claude Design Sys Prompt (elder-plinius 유출본)](https://raw.githubusercontent.com/elder-plinius/CL4R1T4S/main/ANTHROPIC/Claude-Design-Sys-Prompt.txt)

### 커뮤니티 레퍼런스
- [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
- [garrytan/gstack](https://github.com/garrytan/gstack)
- [obra/superpowers](https://github.com/obra/superpowers)
- [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)
- [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [masonjames/Shadcnblocks-Skill](https://github.com/masonjames/Shadcnblocks-Skill)
- [Koomook/claude-frontend-skills](https://github.com/Koomook/claude-frontend-skills)
- [ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)

### 실증 사례
- [raduan.xyz — Claude Code for Landing (Summate.io)](https://raduan.xyz/blog/claude-code-for-landing)
- [lilys.ai — Claude Code Self-Correcting Designer (Playwright MCP)](https://lilys.ai/en/notes/claude-code-20251028/claude-code-self-correcting-designer-playwright-mcp)
- [Threads @choi.openai 포스트](https://www.threads.com/@choi.openai/post/DXSLJTrDgeG)
