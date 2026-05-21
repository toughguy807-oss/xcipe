# AI 디자인 품질 리서치 (2026-03-29)

> **목적**: AI(특히 Claude Code)가 생성하는 웹 디자인/포트폴리오의 품질을 높이는 최신 기법, 커뮤니티 인사이트, 실전 팁을 수집하여 ELUO SYS 스킬에 반영할 근거를 확보한다.

---

## 1. 소스 목록

| # | 출처 | URL | 핵심 인사이트 |
|---|------|-----|--------------|
| 1 | Anthropic 공식 블로그 | https://claude.com/blog/improving-frontend-design-through-skills | frontend-design 스킬(27.7만 설치)로 AI slop 탈피. 디자인 철학을 코드보다 먼저 주입 |
| 2 | Anthropic Skills GitHub (SKILL.md) | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md | 구체적 타이포/컬러/레이아웃 지침. Inter/Roboto 금지, weight jump 100/200 vs 800/900, size jump 3x+ |
| 3 | NN/g (Nielsen Norman Group) | https://www.nngroup.com/articles/vague-prototyping/ | 모호한 프롬프트 → Frankenstein 레이아웃. 상세 프롬프트는 휴먼 디자이너 수준 결과 |
| 4 | Tech Bytes — Anti-AI-Slop Guide | https://techbytes.app/posts/escape-ai-slop-frontend-design-guide/ | Anti-Inter 운동, 금지 폰트 목록, 분위기별 aesthetic direction 사전 설정 |
| 5 | 925 Studios — AI Slop Guide | https://www.925studios.co/blog/ai-slop-web-design-guide | AI slop 정의와 진단 체크리스트. 브랜드 사진·마이크로인터랙션·카피 톤 교체 |
| 6 | Medium (Rijul Dahiya) — Beyond Make It Pretty | https://medium.com/@rijuldahiya/beyond-make-it-pretty-how-to-prompt-ai-for-truly-beautiful-website-designs-74ec4c4b859e | 스크린샷 → JSON 디자인 시스템 추출 → 프롬프트 컨텍스트로 활용 |
| 7 | The New Stack — Prompt to Production Design Systems | https://thenewstack.io/from-prompt-to-production-a-guide-to-ai-generated-design-systems/ | 디자인 시스템 먼저 생성 → 컴포넌트 프롬프트에 컨텍스트 주입 → 일관성 극대화 |
| 8 | Design System Guide (Romina Kavcic) — AI-Readable Tokens | https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually | 의도 기반 토큰(color-feedback-error)이 프리미티브(red-6)보다 AI 결과 품질 압도적 |
| 9 | Design Systems Collective — Vibe Coding Era | https://www.designsystemscollective.com/design-systems-for-the-vibe-coding-era-42282e1affef | 디자인 시스템 = AI에게 주는 컨텍스트 인프라. 토큰 20개 설명 추가 = 1시간 투자로 전체 품질 상승 |
| 10 | Bolt Blog — Create Stunning Websites Without AI Look | https://bolt.new/blog/2026-create-stunning-websites-bolt | 컨테이너+패딩+radius = 프리미엄 오브젝트 느낌. 인터랙티브 배경(셰이더). 커스텀 일러스트 |
| 11 | Hemisphere DM — 5 Reasons Your AI Website Sucks | https://www.hemispheredm.com/ai-website-problems-solutions-small-business | AI ≠ 완성. 80%까지 AI, 20% 휴먼 터치. UX/SEO/전환 최적화는 수동 필수 |
| 12 | AI MVP Builders Newsletter | https://newsletter.aimvpbuilders.com/p/why-most-ai-websites-still-look-terrible-and-how-to-fix-yours | 대부분의 AI 웹사이트가 여전히 형편없는 이유와 해결법 종합 |
| 13 | Medium (Cursor 2.0 Competition) | https://medium.com/@raj.pulapakura/cursor-2-0-vibe-coding-competition-portfolio-website-5-models-duke-it-out-005d2b9177b3 | Cursor 2.0 원샷 프롬프트 비교: Claude Sonnet이 가장 배포 가능한 결과 |
| 14 | prg.sh — Why AI Keeps Building Purple Gradient | https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website | 통계적 수렴(distributional convergence) 원인 분석. 네거티브 프롬프트의 원리 |
| 15 | Figma 2025 AI Report | https://www.figma.com/blog/figma-2025-ai-report-perspectives/ | 디자이너 vs 개발자 AI 품질 인식 격차. Figma→Code 충실도 75-80% 수준 |
| 16 | NxCode — Vibe Designing Complete Guide | https://www.nxcode.io/resources/news/vibe-designing-complete-guide-2026 | "premium and minimalist, like Stripe" 프롬프트 → AI가 hierarchy/color temp/weight/whitespace 추론 |
| 17 | 2026 웹디자인 트렌드 (KoreaWebDesign) | https://koreawebdesign.com/web-design-trends-2026/ | 레이어·깊이감·질감 표현 핵심. 빛/그림자/블러/유리 효과로 몰입감 |
| 18 | GitHub — ui-screenshot-to-prompt | https://github.com/s-smits/ui-screenshot-to-prompt | 스크린샷 → AI 분석 → 구조화된 재현 프롬프트 자동 생성 도구 |
| 19 | Impeccable.style | https://impeccable.style | Anthropic frontend-design 스킬의 보완판. 더 정교한 디자인 가이드라인 |
| 20 | paddo.dev — Claude Code Plugins: Breaking AI Slop | https://paddo.dev/blog/claude-code-plugins-frontend-design/ | ~400 토큰 스킬이 통계적 패턴을 깨는 원리. 네거티브 프롬프트 = 확률 가중치 감소 |

---

## 2. 핵심 발견 (Top 10)

### 발견 1: "AI Slop"은 통계적 수렴의 결과다

LLM은 훈련 데이터의 통계적 중심으로 수렴한다. 가이드 없이 "랜딩 페이지 만들어줘"라고 하면 2019-2024년 Tailwind 튜토리얼의 중간값(Inter 폰트, 보라색 그라디언트, 흰색 배경, 그리드 카드)이 나온다. **이것은 AI의 한계가 아니라 프롬프트의 한계다.**

> "You're getting the median of every Tailwind CSS tutorial scraped from GitHub between 2019 and 2024." — prg.sh

### 발견 2: 디자인 시스템을 먼저 생성하면 일관성이 극대화된다

개별 컴포넌트를 하나씩 프롬프트하면 각각 다른 스타일이 나온다. **디자인 시스템(토큰+컴포넌트+가이드라인)을 먼저 생성하고 모든 후속 프롬프트에 컨텍스트로 주입**하면 전체 일관성이 극적으로 향상된다. 단일 프롬프트로 20분 만에 프로덕션급 디자인 시스템을 생성할 수 있다.

### 발견 3: 상세 프롬프트는 휴먼 디자이너 수준 결과를 낸다

NN/g 연구에 따르면:
- **모호한 프롬프트** → "Frankenstein 레이아웃" (무작위 조합 느낌)
- **상세 프롬프트** → 휴먼 디자이너가 만든 것과 유사한 결과

프롬프트에 포함해야 할 것: 사용자, 태스크, 매체, 톤, 미학적 방향, 레퍼런스.

### 발견 4: 네거티브 프롬프트(금지 목록)가 통계적 수렴을 깬다

Transformer 모델은 추론 시 부정(negation)을 수행할 수 있다. **"Inter, Roboto, Arial, system-ui 사용 금지"를 명시하면 해당 패턴의 확률 가중치가 감소**하여 더 독특한 선택이 나온다.

**금지해야 할 것:**
- 폰트: Inter, Roboto, Arial, system fonts
- 색상: 보라색 그라디언트 + 흰색 배경
- 레이아웃: 예측 가능한 그리드 카드
- 패턴: 쿠키커터 컴포넌트

### 발견 5: 타이포그래피에서 극단적 대비가 핵심이다

Anthropic SKILL.md의 핵심 지침:
- **Weight jump**: 100/200 vs 800/900 (400 vs 600 금지)
- **Size jump**: 3x 이상 (1.5x 금지)
- **Pairing**: Display + Monospace, Serif + Geometric Sans
- **추천 폰트**: JetBrains Mono, Fira Code, Playfair Display, Crimson Pro, IBM Plex, Source Sans 3
- **원칙**: "하나의 독특한 폰트를 골라서 결정적으로 사용하라"

### 발견 6: AI 읽기용 디자인 토큰은 "의도"를 포함해야 한다

프리미티브 토큰(`red-6`, `space-4`) → AI가 임의 선택
의도 기반 토큰(`color-feedback-error`, `spacing-component-button-padding`) → AI가 맥락에 맞는 선택

**핵심**: 토큰에 설명(description)을 추가하면 AI가 "이 값이 왜 존재하는지, 언제 써야 하는지"를 이해한다. 상위 20개 토큰에 설명 추가 = 1시간 투자로 전체 컴포넌트 품질 상승.

### 발견 7: 스크린샷 → 프롬프트 변환이 가장 효과적인 레퍼런스 전달법이다

1. 좋아하는 디자인의 스크린샷을 캡처
2. AI에게 "이 스크린샷에서 JSON 디자인 시스템을 추출해줘" 요청
3. 추출된 JSON(색상, 타이포, 간격 등)을 후속 프롬프트의 컨텍스트로 사용
4. 또는 `ui-screenshot-to-prompt` 같은 도구로 자동 변환

> "AI가 생성한 프롬프트가 사람이 만든 프롬프트보다 구조화되어 있어 더 좋은 결과를 낸다."

### 발견 8: "프리미엄 느낌"의 CSS 공식이 존재한다

**컨테이너 기법:**
- 콘텐츠를 컨테이너로 감싸기 + 넉넉한 패딩 + rounded corners → "플랫 페이지"가 아닌 "프리미엄 오브젝트" 느낌

**깊이감 기법:**
- Glassmorphism: `backdrop-filter: blur()` + 반투명 배경 + 정교한 border + soft shadow
- 2024-2026 프리미엄 SaaS의 64%가 glassmorphism 적용
- 사용자의 23%가 플랫 디자인 대비 더 높은 품질감을 느낌

**배경 기법:**
- 앰비언트 그라디언트: 딥 퍼플, 네온 블루, 핫 핑크 오브가 뒤에서 부유
- 인터랙티브 배경: 셰이더, 파티클 → 커스텀 느낌

**2026 CSS 신기능:**
- Container Queries: 뷰포트 대신 부모 컨테이너 크기에 반응
- CSS Subgrid: 복잡한 반응형 레이아웃을 media query 없이 구현
- `css if()`: 프로퍼티 값 내부의 조건 로직

### 발견 9: Aesthetic Direction을 사전에 명시해야 한다

"깔끔하게", "모던하게" 같은 모호한 지시 대신 **구체적 미학 방향**을 지정:

| 방향 | 특징 |
|------|------|
| Luxury/Refined | 골드/다크 악센트, 세리프 폰트, 넉넉한 간격 |
| Brutalist/Raw | 모노스페이스 폰트, 거친 대비, 산업적 |
| Art Deco/Geometric | 기하학적 패턴, 대칭, 장식적 디테일 |
| Editorial/Magazine | 크게 쓰는 타이포, 이미지 중심, 그리드 파괴 |
| Retro-Futuristic | 네온, CRT 효과, 80년대 SF 느낌 |
| Organic/Natural | 곡선, 어스 톤, 텍스처 |

"premium and minimalist, like Stripe" 같은 **레퍼런스 브랜드 언급**도 효과적. AI가 hierarchy, color temperature, weight, whitespace를 의도에서 추론한다.

### 발견 10: 80/20 법칙 — AI 80%, 휴먼 터치 20%

모든 소스가 합의하는 원칙:
- AI는 **첫 번째 초안 전문가**다 (first draft expert)
- 20%의 인간 개입이 "AI 같은 느낌"을 "프로 같은 느낌"으로 바꾼다
- 커스텀 일러스트, 브랜드 보이스 카피, 의도적 레이아웃 파괴가 차별화의 핵심
- "What tool you used" 보다 "Do I understand what you do? Do I trust you? What should I do next?"가 중요

---

## 3. ELUO SYS 적용 방안

| # | 발견 | 적용 스킬 | 구체적 변경 |
|---|------|-----------|------------|
| 1 | AI Slop은 통계적 수렴 | `design-knowledge` | 스킬 프롬프트에 **Anti-Slop 금지 목록** 삽입 (Inter/Roboto/Arial/purple gradient 금지) |
| 2 | 디자인 시스템 먼저 생성 | `design-knowledge` | 현재 스타일 가이드 생성 → 후속 스킬에 컨텍스트 전달 흐름을 **필수 의존성**으로 강화 |
| 3 | 상세 프롬프트가 품질 결정 | `design-layout`, `design-ui` | 각 스킬에 **4차원 사전 결정**(Purpose/Tone/Constraints/Differentiation) 단계를 추가 |
| 4 | 네거티브 프롬프트 | 전체 design-* 스킬 | **AVOID 섹션** 신설: 금지 폰트, 금지 색상 조합, 금지 레이아웃 패턴 명시 |
| 5 | 극단적 타이포 대비 | `design-knowledge` | 타이포 토큰 가이드에 **weight jump 규칙**(100/200 vs 800/900), **size jump 규칙**(3x+) 추가 |
| 6 | AI-readable 토큰 | `design-knowledge` | 디자인 토큰에 **intent description** 필드 추가. `color-feedback-error` 형태의 시맨틱 레이어 필수화 |
| 7 | 스크린샷 → 프롬프트 변환 | `design-benchmark` | 벤치마킹 시 **스크린샷에서 JSON 디자인 시스템 추출** 단계 추가. 추출 결과를 design-knowledge 입력으로 연결 |
| 8 | 프리미엄 CSS 공식 | `publish-style` | **컨테이너+패딩+radius 기법**, **glassmorphism 레시피**, **앰비언트 그라디언트** 패턴을 CSS 생성 지침에 포함 |
| 9 | Aesthetic Direction 사전 설정 | `design-knowledge`, PM Direction | PM Direction 단계에서 **미학 방향(aesthetic direction)** 선택을 필수 의사결정 항목으로 추가 |
| 10 | 80/20 휴먼 터치 | `qa-functional` | QA 단계에서 **"AI 느낌" 체크리스트** 추가: 기본 폰트 사용 여부, 보라색 그라디언트 감지, 반복 패턴 검출 |
| 11 | Vibe Coding 레퍼런스 | `design-benchmark` | 벤치마킹 결과에 "aesthetic direction" 태그 부여 (luxury/brutalist/editorial 등) |
| 12 | 2026 CSS 신기능 | `publish-style` | Container Queries, Subgrid, `css if()` 등 2026 CSS 기능을 코드 생성 옵션에 포함 |
| 13 | 디자인 레퍼런스 브랜드 활용 | `design-knowledge` | "like Stripe", "like Linear" 같은 **레퍼런스 브랜드 지정** 옵션을 스킬 입력에 추가 |
| 14 | 컴포넌트 단위 점진적 생성 | `design-ui`, `publish-markup` | 전체 페이지 한번에 생성 대신 **개별 컴포넌트 → 섹션 → 페이지** 점진적 조립 패턴 적용 |
| 15 | 폰트 추천 데이터베이스 | `design-knowledge` | 미학 방향별 **추천 폰트 페어링** 사전 구축 (현재 AI가 알아서 선택 → 큐레이션된 선택지) |

---

## 4. 기법별 상세 정리

### 4.1 프롬프트 엔지니어링 기법

| 기법 | 설명 | 예시 |
|------|------|------|
| **4차원 사전 결정** | Purpose/Tone/Constraints/Differentiation을 코드 전에 결정 | "B2B SaaS 대시보드, editorial/magazine 스타일, React+Tailwind, 경쟁사 X와 차별화" |
| **네거티브 프롬프트** | 금지 패턴 명시로 통계적 수렴 파괴 | "Inter, Roboto, Arial 사용 금지. 보라색 그라디언트 금지. 기본 카드 그리드 금지" |
| **레퍼런스 브랜드** | 목표 미학을 브랜드명으로 압축 전달 | "premium and minimalist, like Stripe" |
| **스크린샷 → JSON 추출** | 시각적 레퍼런스를 구조화된 토큰으로 변환 | "이 스크린샷에서 컬러, 타이포, 간격, 레이아웃 패턴을 JSON으로 추출해줘" |
| **점진적 조립** | 컴포넌트 → 섹션 → 페이지 순서로 생성 | 헤더 먼저, 히어로 섹션, 기능 섹션, 조합 |
| **한 번에 하나씩** | 한 프롬프트에 하나의 변경만 요청 | "색상만 변경" 또는 "레이아웃만 변경" (동시 X) |

### 4.2 CSS 기법 — "고급스러운 느낌" 레시피

```css
/* 프리미엄 컨테이너 */
.premium-container {
  padding: clamp(2rem, 5vw, 4rem);
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* 앰비언트 그라디언트 배경 */
.ambient-bg {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(120, 60, 200, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(60, 130, 240, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(200, 60, 120, 0.10) 0%, transparent 50%);
}

/* 극단적 타이포 대비 */
.hero-title {
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  font-size: clamp(3rem, 8vw, 7rem);  /* 3x+ jump */
  line-height: 0.95;
  letter-spacing: -0.03em;
}
.hero-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 200;  /* 200 vs 900 = 극단 대비 */
  font-size: clamp(0.875rem, 1.5vw, 1.125rem);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```

### 4.3 Aesthetic Direction 프리셋

| 프리셋 | 컬러 | 타이포 | 레이아웃 | 인터랙션 |
|--------|------|--------|---------|----------|
| **Luxury** | 골드 + 딥블랙 + 아이보리 | Serif (Playfair) + Sans (Montserrat) | 넓은 마진, 대칭, 여백 중시 | 느린 fade, parallax |
| **Brutalist** | 하이콘트라스트 흑백 + 원색 악센트 | Monospace (JetBrains Mono) | 비대칭, 겹침, 그리드 파괴 | 하드컷, 글리치 |
| **Editorial** | 뉴트럴 + 단일 악센트 | 초대형 Serif + 본문 Sans | 매거진 그리드, 대형 이미지 | 스크롤 애니메이션 |
| **SaaS/Tech** | 블루/퍼플 + 화이트 + 다크 | Geometric Sans (IBM Plex) | 카드 기반, 깔끔한 그리드 | hover elevation, smooth transition |
| **Organic** | 어스톤 (테라코타, 세이지, 크림) | Rounded Sans + Handwritten accent | 비정형 blob, 자연 곡선 | 부드러운 모핑, 웨이브 |
| **Retro-Future** | 네온 + 다크 배경 | Futuristic Sans + Pixel accent | 레트로 그리드, 스캔라인 | 글로우, 타이핑 효과 |

---

## 5. 커뮤니티 합의 사항 (Cross-Source Consensus)

아래 사항은 3개 이상의 독립 소스에서 반복 등장한 합의점이다:

1. **"깔끔하게/모던하게" 금지** — 모호한 미학 지시는 AI의 통계적 중간값을 강화할 뿐이다. 구체적 방향을 명시해야 한다.

2. **디자인 시스템 = AI 컨텍스트 인프라** — 토큰, 컴포넌트, 패턴, 가이드라인이 정의된 시스템은 인간 팀뿐 아니라 AI 에이전트에게도 필수 컨텍스트다.

3. **Inter 폰트 = AI slop의 가장 확실한 시그널** — 커뮤니티에서 "Anti-Inter Movement"까지 형성. 독특한 폰트 하나가 전체 인상을 바꾼다.

4. **80% AI + 20% Human이 최적 비율** — 완전 자동화도, 완전 수동도 아닌 하이브리드가 비용 대비 최고 품질.

5. **Whitespace가 프리미엄의 핵심** — 여백이 넉넉할수록 고급스럽다. AI는 기본적으로 요소를 빽빽하게 배치하는 경향이 있으므로 명시적으로 "generous whitespace" 지시 필요.

6. **레퍼런스 없는 프롬프트는 로또** — 스크린샷, 브랜드명, 미학 방향 중 최소 하나는 제공해야 예측 가능한 결과.

7. **점진적 생성 > 한방 생성** — 컴포넌트 → 섹션 → 페이지 순서로 조립하면 버그가 줄고 재사용성이 올라간다.

---

## 6. 위험 요인 및 한계

| 위험 | 상세 | 대응 |
|------|------|------|
| 보안 취약점 | AI 생성 코드의 45-80%에 보안 취약점 포함 (Stanford 연구) | `qa-security` 스킬로 OWASP Top 10 필수 검증 |
| Figma→Code 충실도 | 최고 수준에서도 75-80% (Kombai). 100% pixel-perfect 불가 | "pixel-perfect" 대신 "의도적 충실도(intentional fidelity)" 목표 |
| v0 품질 저하 | 2025 말~2026 초 v0 품질 하락 보고 (hallucinated imports, broken layouts) | Claude Code 기반 자체 파이프라인으로 통제 가능 |
| 다크 모드 편향 | AI 포트폴리오 빌더 대부분이 다크/테크 디자인으로 수렴 | aesthetic direction에서 라이트 모드/어스톤 등 명시적 분기 |

---

## 7. 결론

### AI 디자인 품질의 핵심 레버

**품질 = f(디자인 시스템 컨텍스트, 프롬프트 구체성, 네거티브 제약, 휴먼 커레이션)**

ELUO SYS가 취해야 할 3대 조치:

1. **design-knowledge 스킬에 Anti-Slop 프로토콜 내장**: 금지 폰트/색상/패턴 목록, 극단적 타이포 대비 규칙, aesthetic direction 필수 선택을 스킬 프롬프트에 직접 삽입. 이 ~400 토큰 투자가 전체 디자인 파이프라인의 품질을 결정한다.

2. **디자인 토큰에 의도(intent) 레이어 추가**: 현재 design-knowledge가 생성하는 토큰에 시맨틱 설명을 추가하여 후속 스킬(layout, ui, markup, style)이 토큰을 "이해"하고 사용하도록 개선. 상위 20개 토큰 설명 = 1시간 투자로 전체 일관성 상승.

3. **벤치마킹 → 디자인 시스템 추출 파이프라인 강화**: design-benchmark에서 수집한 레퍼런스 사이트의 스크린샷/디자인 패턴을 JSON 디자인 시스템으로 추출하고, 이를 design-knowledge의 입력으로 직접 연결. "영감"이 아닌 "데이터"로 레퍼런스를 활용.

### 한 줄 요약

> AI에게 "예쁘게 만들어줘"라고 말하면 평균을 얻고, "Playfair Display 900 + JetBrains Mono 200, 골드/딥블랙 팔레트, 넉넉한 여백, glassmorphism 카드"라고 말하면 프로급을 얻는다.

---

## 부록: 참고 소스 전체 URL

1. https://claude.com/blog/improving-frontend-design-through-skills
2. https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
3. https://www.nngroup.com/articles/vague-prototyping/
4. https://techbytes.app/posts/escape-ai-slop-frontend-design-guide/
5. https://www.925studios.co/blog/ai-slop-web-design-guide
6. https://medium.com/@rijuldahiya/beyond-make-it-pretty-how-to-prompt-ai-for-truly-beautiful-website-designs-74ec4c4b859e
7. https://thenewstack.io/from-prompt-to-production-a-guide-to-ai-generated-design-systems/
8. https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually
9. https://www.designsystemscollective.com/design-systems-for-the-vibe-coding-era-42282e1affef
10. https://bolt.new/blog/2026-create-stunning-websites-bolt
11. https://www.hemispheredm.com/ai-website-problems-solutions-small-business
12. https://newsletter.aimvpbuilders.com/p/why-most-ai-websites-still-look-terrible-and-how-to-fix-yours
13. https://medium.com/@raj.pulapakura/cursor-2-0-vibe-coding-competition-portfolio-website-5-models-duke-it-out-005d2b9177b3
14. https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
15. https://www.figma.com/blog/figma-2025-ai-report-perspectives/
16. https://www.nxcode.io/resources/news/vibe-designing-complete-guide-2026
17. https://koreawebdesign.com/web-design-trends-2026/
18. https://github.com/s-smits/ui-screenshot-to-prompt
19. https://impeccable.style
20. https://paddo.dev/blog/claude-code-plugins-frontend-design/
21. https://dev.to/_46ea277e677b888e0cd13/claude-code-vs-codex-2026-what-500-reddit-developers-really-think-31pb
22. https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051
23. https://snyk.io/articles/top-claude-skills-ui-ux-engineers/
24. https://strikingloo.github.io/llm-css-design
25. https://www.parallelhq.com/blog/prompt-engineering-designers
26. https://zeroskillai.com/how-to-fix-purple-ai-slop/
27. https://muz.li/blog/the-complete-vibe-coding-guide-for-designers-2026/
28. https://lovable.dev/guides/website-design-trends-2026
