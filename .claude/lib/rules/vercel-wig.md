# Vercel Web Interface Guidelines (Rules · 1급 Reference)

> **Source**: [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines)
> **Snapshot SHA**: `4e799d45c17aec1498c269287a83b9dba22b966b`
> **Snapshot Date**: 2026-04-06 (commit: "Add translate=\"no\" guideline for verbatim content")
> **Adopted**: 2026-05-06 — `~/.claude/lib/rules/vercel-wig.md` (격상: ref → lib/rules)
>
> **본 문서는 외부 표준의 핀(snapshot)임**. upstream 변경은 자동 반영하지 않으며, 분기별 수동 diff 후 SHA 갱신.

---

## 호출 트리거 (자동 적용 강제)

design-orchestrator / publish-orchestrator 가 다음 단계 진입 시 의무 Read:

| 단계 | 적용 카테고리 |
|------|-------------|
| **design-knowledge** (스타일 가이드 생성) | §Design (10), §Animations (9) |
| **design-layout** (레이아웃 설계) | §Layout (6) |
| **design-ui** (UI 명세) | §Interactions (39), §Forms (20) |
| **publish-markup** (HTML 생성) | §Content (20), §Forms (20) |
| **publish-style** (CSS 생성) | §Design (10), §Animations (9), §Layout (6) |
| **publish-interaction** (JS 생성) | §Interactions (39), §Animations (9), §Performance (15) |
| **qa-accessibility** | §Interactions, §Forms, §Content (semantics) |
| **qa-performance** | §Performance (15) |
| **publish-visual-verify** | 전체 — 시각/모션/접근성 교차 검증 |

### 우선순위 정책

> Vercel WIG는 **production-grade 표준**. 우리 자체 craft(ref/design-taste.md, ref/anthropic-frontend-design.md)와 충돌 시 다음 순서:
>
> 1. **Vercel WIG**(보편 룰, 기술적 정확성) > 우리 자체 craft(스타일 철학) — 측정 가능 항목(APCA Lc, hit target px, transition rules 등)
> 2. **자체 craft** > Vercel WIG — 미적 방향성(Tone 11종, NEVER List, Warm Stone vs Cool Slate 토큰)
> 3. **Anthropic frontend-design**과 충돌 시 → 두 출처 모두 명시 후 사용자 commit 강제

---

## §1. Interactions (39 룰)

### 키보드 & 포커스 (필수)
- 모든 플로우 키보드 작동 ([WAI-ARIA Authoring Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/))
- `:focus-visible` 우선 (`:focus`는 pointer 사용자에게 ring 노출). 그룹 컨트롤은 `:focus-within`
- focus trap + WAI-ARIA 패턴대로 focus 이동/복원

### Hit Target & 모바일
- 시각/히트 타겟 일치. 시각 < 24px이면 히트 ≥ 24px. 모바일 ≥ 44px
- `<input>` 모바일 폰트 ≥ 16px (iOS Safari 자동 줌 차단). 또는 `<meta name="viewport" content="...maximum-scale=1">`
- 브라우저 줌 비활성화 금지

### 상태 & 입력
- Hydration 후 input focus/value 손실 금지
- Paste 차단 금지 (`<input>`, `<textarea>`)
- Loading 버튼: 인디케이터 표시 + 원래 라벨 유지
- Loading 표시 최소 지속: show-delay ~150-300ms + min visible ~300-500ms (React `<Suspense>`는 자동)
- **URL as state** (필터/탭/페이지네이션/패널 펼침 — `useState` 사용 시 거의 모두). 라이브러리: [nuqs](https://nuqs.dev)
- **Optimistic update**: 성공 가능성 높을 때 즉시 UI 갱신 → 서버 응답으로 reconcile. 실패 시 에러 + 롤백/Undo
- 후속 입력 메뉴/처리 상태에 ellipsis: "Rename…", "Loading…", "Saving…", "Generating…"
- **Destructive action 확인** 또는 Undo (안전 윈도우)

### 터치 & 모바일 디테일
- `touch-action: manipulation` (더블 탭 줌 차단)
- `webkit-tap-highlight-color` 디자인 정합 (또는 transparent)
- 너그러운 hit target + 명확한 affordance + 예측 가능 인터랙션 ([prediction cones](https://x.com/JohnPhamous/status/1657083267299028992))

### Tooltip / Overscroll / Scroll
- 첫 툴팁만 delay, 인접 peer는 즉시 표시
- `overscroll-behavior: contain` (모달/드로어)
- Back/Forward → 스크롤 위치 복원
- Desktop 단일 primary input → autofocus. 모바일은 키보드 열림으로 인한 layout shift 위험 → 거의 사용 안 함

### 인터랙션 패턴
- Dead zone 금지 (interactive 보이는 부분은 모두 interactive)
- **Deep-link everything** (필터, 탭, 페이지네이션, 펼침 패널)
- **Drag**: `inert` + 텍스트 선택 비활성 (drag 중 hover/selection 동시 발생 차단)
- **링크는 링크**: 네비게이션은 `<a>`/`<Link>` (Cmd+Click, 미들 클릭, 우클릭 → 새 탭). `<button>`/`<div>`로 대체 금지
- **비동기 업데이트 announce**: `aria-live="polite"` (토스트, 인라인 검증)
- **로케일 인지 키보드 단축키**: 비-QWERTY 대응. 플랫폼별 심볼 표시

---

## §2. Animations (9 룰)

- **`prefers-reduced-motion` 대응 변형 제공** (필수)
- **구현 우선순위**: CSS > Web Animations API > JS 라이브러리 (motion 등)
- **Compositor-friendly**: `transform`, `opacity`만. `width/height/top/left` 금지 (reflow/repaint)
- **필요성 검증**: 인과 명확화 또는 의도된 delight일 때만
- **Easing은 주제와 매칭** (크기/거리/트리거에 따라 선택)
- **Interruptible**: 사용자 입력으로 취소 가능
- **Input-driven**: autoplay 회피, 액션 응답으로 애니메이션
- **Transform origin** 정확히 (모션이 "물리적으로 시작하는" 곳)
- **`transition: all` 절대 금지**: 명시 속성만 (`opacity, transform`). `all`은 layout 속성 의도치 않게 애니메이션 → jank
- **SVG cross-browser**: `<g>` wrapper에 transform + `transform-box: fill-box; transform-origin: center;` (Safari transform-origin 버그 회피)

---

## §3. Layout (6 룰)

- **Optical alignment**: ±1px 조정 (지각 > 기하학)
- **Deliberate alignment**: 모든 요소가 의도적 정렬 (그리드/베이스라인/엣지/광학 중심). 우연한 위치 금지
- **Lockup contrast balance**: 텍스트+아이콘 인접 시 weight/size/spacing/color 조정 (얇은 stroke 아이콘은 medium weight 텍스트 옆에 bolder 처리)
- **반응형 커버리지**: 모바일 + 노트북 + 울트라와이드. 울트라와이드는 50% 줌으로 시뮬
- **Safe area**: 노치/inset 대응 ([safe-area variables](https://developer.mozilla.org/en-US/docs/Web/CSS/env))
- **불필요한 스크롤바 제거**: overflow 이슈 fix. macOS는 "Show scroll bars: Always"로 Windows 사용자 시점 테스트
- **CSS에 사이즈 위임**: flex/grid/intrinsic. JS 측정 회피 (layout thrash 방지)

---

## §4. Content (20 룰)

### 정보 전달
- **Inline help 우선**, 툴팁은 last resort
- **Stable skeletons**: 최종 콘텐츠와 정확히 일치 (layout shift 방지)
- **`<title>` 정확성**: 현재 컨텍스트 반영
- **Dead end 없음**: 모든 화면에 다음 단계/복구 경로
- **모든 상태 디자인**: empty / sparse / dense / error

### 타이포그래피 디테일
- **Curly quotes** (" ") > straight quotes (" ")
- **Widow/orphan 회피**: rag/line break 정돈
- **Tabular numbers**: 비교 시 `font-variant-numeric: tabular-nums` 또는 monospace ([Geist Mono](https://vercel.com/font))
- **`…` 문자** > 점 3개 (`...`)
- **`scroll-margin-top`**: 섹션 링크 시 헤더 anchor 정렬

### 접근성 & 의미
- **상태 표현 redundant cue**: 색상 단독 금지, 텍스트 라벨 동반
- **아이콘 라벨**: 비-시각 사용자에 텍스트 의미 전달
- **시각 라벨 생략 허용**, 단 accessible name (`aria-label`)은 유지
- **Accessible content**: `aria-label`/`aria-hidden` 정확히 ([accessibility tree](https://developer.chrome.com/blog/full-accessibility-tree)에서 검증)
- **Icon-only button**에 descriptive `aria-label` 의무
- **시맨틱 우선** (`button`, `a`, `label`, `table`) → ARIA는 보조
- **헤딩 계층** + Skip-to-content 링크
- **로고 우클릭 → 브랜드 리소스** (편의)

### 국제화 & 보호
- **사용자 생성 콘텐츠 견고성**: short/average/long 모두 처리
- **로케일 포맷**: 날짜/시간/숫자/구분자/통화
- **언어 설정 우선**: `Accept-Language` + `navigator.languages`. IP/GPS 금지
- **`translate="no"`**: 브랜드명/제품명/코드 토큰/기술 식별자 보호 (자동 번역 차단) ★ snapshot 4e799d4 신규
- **`&nbsp;` glued terms**: `10 MB` → `10&nbsp;MB`, `⌘ + K` → `⌘&nbsp;+&nbsp;K`, `Vercel SDK` → `Vercel&nbsp;SDK`. no-space는 `&#x2060;`

---

## §5. Forms (20 룰)

### 제출 & 키보드
- **Enter 제출 규칙**: 텍스트 input 단독 → Enter 제출. 다중 컨트롤 → 마지막 컨트롤에 적용
- **Textarea**: ⌘/⌃ + Enter = 제출, Enter = 줄바꿈
- **Submit 활성 유지**: 제출 시작까지 enabled. 인플라이트 중 disable + 스피너 + idempotency key

### 라벨 & 입력
- **Label 100%**: 모든 컨트롤에 `<label>` 또는 보조기술용 연결
- **Label 클릭 → 컨트롤 focus**
- **타이핑 차단 금지**: 숫자만 받는 필드도 모든 입력 허용 + 검증 피드백 (차단은 무설명 → 혼란)
- **Pre-disable submit 금지**: 미완성 폼 제출 허용 → 검증 피드백 노출
- **체크박스/라디오 dead zone 0**: 라벨+컨트롤이 단일 너그러운 hit target 공유

### 검증 & 자동완성
- **에러 위치**: 필드 옆. 제출 시 첫 에러로 focus
- **`autocomplete` + 의미 있는 `name`**: 자동 채움 활성화
- **Spellcheck 선택적**: email/code/username 등은 비활성
- **올바른 `type` + `inputmode`**: 키보드 + 검증 정확도
- **Placeholder는 빈 상태 신호**: ellipsis로 종료
- **Placeholder 값**: 예시 또는 패턴 (`+1 (123) 456-7890`, `sk-012345679…`)

### 안전성 & 호환
- **Unsaved changes 경고**: 데이터 손실 가능 시 navigation 차단
- **Password manager + 2FA 호환**: paste 허용 (OTP 포함)
- **non-auth 필드에서 password manager 트리거 금지**: 검색 input 등은 reserved name 회피, `autocomplete="off"` 또는 OTP는 `autocomplete="one-time-code"`
- **Trailing whitespace trim**: text replacement/expansion 추가 공백 제거 (오류 메시지 혼란 방지)
- **Windows `<select>` 다크모드 버그**: `background-color`, `color` 명시 (대비 보장)

---

## §6. Performance (15 룰)

- **디바이스 매트릭스**: iOS Low Power Mode + macOS Safari 테스트
- **확장 프로그램 비활성**: 측정 안정성
- **Re-render 추적**: [React DevTools](https://react.dev/learn/react-developer-tools) 또는 [React Scan](https://react-scan.com/)
- **CPU + 네트워크 throttle**로 프로파일
- **Layout work 최소화**: read/write batch, 불필요 reflow/repaint 회피
- **네트워크 latency 예산**: `POST/PATCH/DELETE` < 500ms
- **Keystroke 코스트**: uncontrolled input 우선, controlled loop 저비용화
- **Large list virtualize**: [virtua](https://github.com/inokawa/virtua) 또는 [content-visibility: auto](https://web.dev/articles/content-visibility)
- **Preload 신중**: above-the-fold 이미지만. 나머지 lazy-load
- **이미지 CLS 0**: 명시 dimensions + 공간 예약
- **`<link rel="preconnect">`**: 자산/CDN 도메인 (필요 시 `crossorigin`) — DNS/TLS latency 감소
- **Critical font preload**: flash + layout shift 차단
- **Font subset**: unicode-range로 사용 코드포인트만 + variable axis 최소화
- **Web Worker로 expensive work 분리**: 메인 스레드 차단 회피

---

## §7. Design (10 룰) ★ 핵심

- **Layered shadows**: ambient + direct light 모방, 최소 2층
  ```css
  /* ✓ */
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),    /* ambient */
    0 8px 24px rgba(0,0,0,0.08);   /* direct */
  /* ✗ 단일 층 */
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  ```
- **Crisp borders**: border + shadow 조합, semi-transparent border (`rgba(0,0,0,0.08)`) — edge clarity
- **Nested radii**: child radius ≤ parent radius. 동심(concentric) 곡선 정렬
  - 공식: `child = parent - padding` (parent 12px + padding 4px → child 8px)
- **Hue consistency**: 비-중성 배경에서 borders/shadows/text를 같은 hue로 tint (warm bg에 pure neutral 금지)
- **Accessible charts**: color-blind 친화 팔레트
- **Minimum contrast**: **APCA** ([apcacontrast.com](https://apcacontrast.com/)) > WCAG 2 ([webaim](https://webaim.org/resources/contrastchecker/)) — 지각 정확. Lc 60+ body, Lc 75+ fine text
- **Interaction contrast 증가**: `:hover`, `:active`, `:focus`는 rest 보다 **반드시 높은 대비**
- **Browser UI 정합**: `<meta name="theme-color" content="#000000">` (페이지 배경과 일치)
- **`color-scheme`**: 다크 테마 시 `<html>`에 `color-scheme: dark` 명시 → 스크롤바/디바이스 UI 대비 정합
- **Text anti-aliasing & transforms**: 텍스트 노드 직접 transform/scale 금지 (smoothing 아티팩트). wrapper에 적용. 잔여 시 `translateZ(0)` 또는 `will-change: transform`로 layer promote
- **Gradient banding 회피**: dark fade는 CSS mask 대신 background image

---

## §8. Copywriting (Vercel-specific · 채택 옵션)

> 우리 시스템에 copy-* 축이 없음. 본 카테고리는 **plan-* 단계에서 선택적 참조**. 자동 적용 안 함.

- Active voice ("The CLI will be installed" ✗ → "Install the CLI" ✓)
- Heading/Button: Title Case ([Chicago](https://title.sh/)). 마케팅은 sentence case
- 간결성 (최소 단어)
- `&` > `and`
- Action-oriented (You will need... ✗ → Install... ✓)
- 명사 일관성 (unique term 최소화)
- 2nd person, 1st person 회피
- 일관 placeholder: `YOUR_API_TOKEN_HERE` / `0123456789`
- 카운트는 numeral (`8 deployments`)
- 통화 일관 (0 또는 2 소수 자리, 혼용 금지)
- 숫자/단위 사이 공백 + `&nbsp;` (10 MB)
- Positive language (Your deployment failed ✗ → Something went wrong, try again or contact support ✓)
- **Error는 exit 안내**: "Invalid API key" ✗ → "Your API key is incorrect or expired. Generate a new key in your account settings." ✓
- 모호 라벨 회피 (Continue ✗ → Save API Key ✓)

---

## Self-Check Grep (publish 단계 의무 실행)

publish-* 스킬 종료 직전 다음 grep 명령으로 자체 검증. 0건/N건 기준 충족 시 PASS.

```bash
PROJ=output/{프로젝트명}/publish*

# §2 Animations
grep -rEn "transition:\s*all" $PROJ/css/                          # 0건 (Critical)
grep -rEnc "@media \(prefers-reduced-motion" $PROJ/css/           # ≥1건

# §4 Content
grep -rEn "\.\.\." $PROJ/*.html | grep -vE "(href|src|//|/\*)"    # ellipsis char(…) 사용 권고
grep -rEn 'translate="no"' $PROJ/*.html                           # 브랜드명 보호 (≥0, ≥1 권장)
grep -rEn "tabular-nums|font-variant-numeric" $PROJ/css/          # 비교 데이터 시 ≥1
grep -rEn "&nbsp;" $PROJ/*.html                                   # 단위/단축키 결합 시 ≥1

# §5 Forms
grep -rEn 'autocomplete=' $PROJ/*.html                            # 폼 존재 시 ≥1
grep -rEn 'inputmode=' $PROJ/*.html                               # 숫자/이메일/전화 input 시 ≥1
grep -rEn 'autocomplete="one-time-code"' $PROJ/*.html             # OTP input 시 1건

# §6 Performance
grep -rEn 'rel="preconnect"' $PROJ/*.html                         # 외부 CDN 사용 시 ≥1
grep -rEn 'loading="lazy"' $PROJ/*.html                           # below-fold image 시 ≥1
grep -rEn 'rel="preload"\s+as="font"' $PROJ/*.html                # critical font 시 ≥1

# §7 Design
grep -rEn "color-scheme:\s*(dark|light dark)" $PROJ/css/          # 다크 테마 시 ≥1
grep -rEn 'name="theme-color"' $PROJ/*.html                       # ≥1 권장
grep -rEnc "box-shadow:[^;]*,[^;]*;" $PROJ/css/                   # layered shadow 사용 시 ≥1
grep -rEn ":focus-visible" $PROJ/css/                             # ≥1건 (Critical)
grep -rEn "touch-action:\s*manipulation" $PROJ/css/               # 인터랙티브 요소 시 ≥1
```

> Self-Check 결과는 publish-interaction META 블록에 `vercel_wig_grep` 필드로 기록 (PASS/WARN/BLOCK).

---

## 우리 시스템 흡수 매핑

| Vercel WIG 카테고리 | 흡수 위치 | 적용 시점 |
|---|---|---|
| §1 Interactions | `lib/rules/publish-patterns.md` (Iron Rules), publish-interaction SKILL.md (Self-Check) | publish-interaction 실행 |
| §2 Animations | `lib/rules/modern-design-stack.md` §8 (CSS-Native 1순위와 정합), publish-interaction Self-Check | publish-interaction 실행 |
| §3 Layout | design-layout SKILL.md, publish-style SKILL.md | design-layout / publish-style |
| §4 Content | publish-markup SKILL.md, qa-accessibility | publish-markup / qa-a11y |
| §5 Forms | publish-markup SKILL.md (forms 섹션 신설 권고) | publish-markup |
| §6 Performance | qa-performance SKILL.md, qa-lighthouse | qa-performance |
| §7 Design | `ref/design-taste.md` (craft 보강), design-knowledge | design-knowledge |
| §8 Copywriting | (옵션) plan-* 또는 신규 copy 가이드 | 사용자 commit 시 |

---

## 변경 이력

- **2026-05-06**: 초기 등재. snapshot SHA `4e799d4` (2026-04-06). 트리거 9개 단계 정의. Self-Check Grep 17 명령 정의.
- **다음 갱신 예정**: 분기별 (2026-08) — `gh api repos/vercel-labs/web-interface-guidelines/commits/main` 으로 SHA diff 확인 후 본 문서 갱신.
