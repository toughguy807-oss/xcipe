# DKB (Design Knowledge Base) Index

**버전**: v1.0
**도입일**: 2026-04-30
**범위**: 전역 (모든 프로젝트 공유)
**정책**: `lib/rules/dkb-policy.md`

## 디렉토리 구조

```
~/.claude/dkb/
├── INDEX.md                        ← 이 파일 (마스터 인덱스)
├── aesthetic-rubric-v1.md          ← 18축 루브릭 (publish-visual-verify와 동일 기준)
├── DNA-template.md                 ← references DNA.md 표준 양식
├── dkb-config.json                 ← 가중치, 등재 기준, 정책
│
├── trend-radar/                    ← 분기별 트렌드 (수동 트리거)
│   ├── 2026-Q2.md                  ← 현재 분기 (작성 예정)
│   └── archive/
│
├── awards/                         ← 어워드 메타데이터 (수동 등재)
│   ├── awwwards/sotd/
│   └── gdweb/
│
├── queue/                          ← 분석 대기 큐 (사용자 트리거)
│   └── pending.json
│
├── references/                     ← ★ 사이트별 깊은 지식 (DNA)
│   ├── tier-1/                     ← 145+/180 글로벌 톱
│   ├── tier-2/                     ← 110~144 강한 후보
│   ├── tier-3/                     ← 한국 컨텍스트
│   └── archive/                    ← <110 부정 사례 (학습용)
│
├── patterns/                       ← 패턴 카탈로그 (재사용)
│   ├── hero/
│   ├── kpi/
│   ├── case-study/
│   ├── partner-grid/
│   ├── motion/
│   ├── color-systems/
│   └── korean-typo/
│
└── industries/                     ← 업종별 시그니처 매핑
    ├── industrial-ai.md
    ├── frontier-ai.md
    └── ...
```

## 등재 기준

| 점수 (180점 만점) | tier | 처리 |
|------|------|------|
| 145+ | tier-1 / tier-2 (도메인별) | DNA.md + tokens.css + screenshots + analysis.json |
| 110~144 | tier-2 / tier-3 | DNA.md + 핵심 토큰만 |
| <110 | archive | 부정 사례로 보존 (Anti-Slop 학습용) |

## 등재된 references (현재)

**시드 등재일**: 2026-04-30 (7건 — 1차 등재, Vision 미검증)
- tier-1: 3건 (anthropic / linear / vercel)
- tier-2: 1건 (augury)
- tier-3: 3건 (makinarocks / superb-ai / toss.tech)

**보강 등재**: 2026-05-04 (총 +18건 references + trend-radar 4건 + motionsites trend = 23건 추가)
- tier-1 +5건 (ui.shadcn.com 160 / stripe.com 151 / locomotive.ca 151 / apple.com 149 / family.co 147)
- tier-2 +10건 (scale 144 / obys.agency 144 / kinfolk 144 / databricks 139 / monocle 136 / landing.ai 136 / palantir 134 / naverlabs 134 / huggingface 133 / c3.ai 120)
- tier-3 +3건 (lgcns 145 / visitseoul.net 144 / samsungsds 125)
- trend-radar +5건 (awwwards / godly / gdweb / lapa / motionsites)
- 폐기 3건 (aesop / activetheory / wanted.co.kr — Cloudflare/WebGL/CloudFront 차단)

**Q4 도메인 매칭 등재**: 2026-05-06 (Top 5 일괄 처리 — gallery Top 10 도메인 매칭)
- tier-1 +2건 (air.dev 148 — JetBrains Agentic IDE / fourmula.ai 146 — Awwwards SOTD)
- tier-2 +1건 (relace.ai 145 — AI dev tools warm-cream 변종)
- tier-3 +2건 (flim.ai 142 / happyrobot.ai 134 — Industrial AI Logistics)
- patterns 신규 3건 (color-systems/anthropic-warm-cream / color-systems/air-dev-retro-cyan / hero/cinematic-photo-hero)

**Q4 후속 P3 #11 + Batch 2 등재**: 2026-05-06 (총 +6건 — 한국 디자인 시스템 + Awwwards SOTD 2건 + dev tools 3건)
- tier-1 +3건 (wanted-montage 152 — 한국 디자인 시스템 톱 / obys 152 — Awwwards SOTD May 04 #1 / studio375 148 — Awwwards SOTD Apr 30)
- tier-3 +3건 (interfere 140 — Dev tools editorial / mobbin 128 — Inspiration platform / askape 122 — AI 트레이딩 마스코트)

**Q4 Batch 3 등재**: 2026-05-06 (총 +5건 — Awwwards SOTD 3건 + siteinspire Top 10 2건)
- tier-1 +1건 (detroit-paris 150 — Awwwards SOTD Apr 27 — AI Production House for Luxury)
- tier-3 +4건 (adcker 142 — sliced typography Awwwards SOTD May 01 / silent-house 139 — Awwwards SOTD Apr 28 split wordmark / old-tom-capital 143 — siteinspire 골프 capital / microdot 131 — siteinspire Next.js 디자인 에이전시)
- 잔여: 14 후보 URL (24 - 10 처리)

**Q4 Batch 4 등재**: 2026-05-06 (총 +5건 — Awwwards SOTD 3건 + siteinspire/lapa 2건; chimi.com 도메인 squatter 폐기 → pieterkoopt 대체)
- tier-1 +2건 (floema 152 — siteinspire #4 E-commerce / donmolinico 149 — Awwwards SOTD Apr 25 Spanish food cinematic)
- tier-3 +3건 (pieterkoopt 140 — Awwwards SOTD Apr 29 audio splash premium B2B / isadeburgh 128 — lapa.ninja #1 Portfolio / paodao 126 — Awwwards SOTD May 03 WebGL voyageur)
- 폐기 1건 (chimi.com — 도메인 squatter parking page, siteinspire 등록 정보 stale)
- 잔여: 9 후보 URL (24 - 15 처리)

**Q4 Batch 5 등재**: 2026-05-06 (총 +7건 — lapa.ninja 3건 + siteinspire 3건 + Awwwards SOTD 1건; gtmechanik 도메인 squatter 폐기)
- tier-1 +3건 (americanhousing 148 — siteinspire #7 Corporate civic / overlay 146 — lapa #8 Beauty AI / owo 145 — lapa #4 App fintech Gen-Z)
- tier-3 +4건 (joindawn 143 — lapa #2 Health & Fitness / dashburger 140 — siteinspire #9 Food / week-wild 138 — Awwwards SOTD Apr 26 / fabiocaverzasio 128 — siteinspire #6 Portfolio)
- 폐기 1건 (gtmechanik.com — Atom.com 도메인 marketplace squatter, siteinspire 등록 정보 stale)
- 잔여: 0 후보 URL (24 - 22 처리, 폐기 2건 포함 시 30 URL queue 완전 소진)

### Tier 1 (145+/180) — 글로벌 톱

| 사이트 | 점수 (v1.1 Vision 보정) | 도메인 | 본질 |
|--------|:---:|--------|------|
| [ui.shadcn.com](references/tier-1/ui.shadcn.com/DNA.md) | 160 | 디자인 시스템 | "디자인 시스템은 컴포넌트 자체로 권위 — Pure white + Bento 컴포넌트 데모 + 'The Foundation'" ⭐ 최고점 |
| [stripe.com](references/tier-1/stripe.com/DNA.md) | 151 | B2B SaaS Fintech | "Financial infrastructure는 그라디언트 메쉬로 미래를 표현한다 — Pure white nav + 거대 컬러 메쉬" |
| [locomotive.ca](references/tier-1/locomotive.ca/DNA.md) | 151 | Digital Agency | "Digital Agency는 거대 인물 hero + 강렬 빨강 + scroll-driven 모션으로 권위를 표현한다" |
| [linear.app](references/tier-1/linear.app/DNA.md) | 150 | B2B SaaS | "Dark + 정밀 + 미세 디테일 = 개발자 도구는 도구처럼" |
| [apple.com](references/tier-1/apple.com/DNA.md) | 149 | 컨슈머 가전 | "컨슈머 권위는 제품 사진의 톤 일관성으로 표현된다 — 흰 배경 + SF Pro + 제품 풀임팩트" |
| [air.dev](references/tier-1/air.dev/DNA.md) | 148 | AI dev tools / JetBrains | "Agentic AI는 90년대 터미널처럼 보여야 한다 — pixel + 다크 + 시안 형광" |
| [anthropic.com](references/tier-1/anthropic.com/DNA.md) | 148 | Frontier AI | "Editorial 권위는 다크 카드 대비와 underline 강조 단어로 만든다" |
| [vercel.com](references/tier-1/vercel.com/DNA.md) | 147 | B2B SaaS | "Hero 그라디언트 메쉬 + Bento 5종 = Frontier 인프라는 미래처럼" |
| [family.co](references/tier-1/family.co/DNA.md) | 147 | 컨슈머 핀테크 | "컨슈머는 cute mascot + 다채 일러스트로 친근감을 표현한다 — Pure white + 9개 캐릭터 + 어워드 cute trend" |
| [fourmula.ai](references/tier-1/fourmula.ai/DNA.md) | 146 | AI / Editorial Portfolio | "AI 브랜드도 패션 룩북처럼 — 흰 배경 + 카운터 + 시네마 인물 단독" (Awwwards SOTD May 02) |
| [wanted-montage](references/tier-1/wanted-montage/DNA.md) | 152 | 한국 디자인 시스템 / DX | "한국 디자인 시스템도 다채 그라디언트 도형 + 영한 듀얼 H1 — Wanted Sans Variable + 15단계 atomic 토큰" |
| [obys](references/tier-1/obys/DNA.md) | 152 | 크리에이티브 에이전시 | "거대 괄호 `( )` 사이 흑백 portfolio + 자체 'Obys' Serif — 우크라이나 maximalist Editorial" (Awwwards SOTD May 04 #1) |
| [studio375](references/tier-1/studio375/DNA.md) | 148 | 이탈리안 에이전시 | "마젠타/시안 글로우 자동차 hero + Editorial Serif italic emphasis + 거대 라이트 그레이 '3'" (Awwwards SOTD Apr 30) |
| [detroit-paris](references/tier-1/detroit-paris/DNA.md) | 150 | AI Production House / 럭셔리 | "AI Production House for Luxury — 풀블랙 cinematic + 'CRAFTING CULTURE' Mangogrotesque + 럭셔리 photo grid 4면" (Awwwards SOTD Apr 27) |
| [floema](references/tier-1/floema/DNA.md) | 152 | 가구·라이프스타일 E-commerce | "Sustainable furniture editorial — cream `#F2EFEA` + Zimula Serif + scattered product cards 16+ collage + Locomotive 24-col" (siteinspire #4 E-Commerce) |
| [donmolinico](references/tier-1/donmolinico/DNA.md) | 149 | 식품 브랜드 / Spanish heritage | "Spanish heritage food cinematic — cream `#FBF5E7` + 거대 super-med H1 216px + 풀블리드 charcuterie macro + 빨간 wordmark badge + DESDE 1987" (Awwwards SOTD Apr 25) |
| [americanhousing](references/tier-1/americanhousing/DNA.md) | 148 | Civic / Non-profit / Housing advocacy | "Saving the American Dream — cumulus cream `#FDFFF1` + die-d Adobe custom 64px H1 + 풀블리드 cityscape + Tailwind v4 36 vars" (siteinspire #7 Corporate) |
| [overlay](references/tier-1/overlay/DNA.md) | 146 | AI Beauty / D2C personalization | "The Future of Beauty is Automated — lavender `#FBF9FB` + Ppeditorialold Serif 72px / -2.16px + dark blue `#2E2F53` + 156 vars Webflow rich" (lapa.ninja #8) |
| [owo](references/tier-1/owo/DNA.md) | 145 | Fintech / Gen-Z / WhatsApp 송금 | "Send money like you chat — cream `#FFF8DC` + Greed Sans 90px medium 600 + 핫 핑크 `#FF00A0` CTA + Tailwind v4 oklch" (lapa.ninja #4 App) |

### Tier 2 (110~144) — 강한 후보

| 사이트 | 점수 | 도메인 | 본질 |
|--------|:---:|--------|------|
| [relace.ai](references/tier-2/relace.ai/DNA.md) | 145 | AI dev tools / Coding agents | "코딩 에이전트도 매거진처럼 — 크림 배경 + Editorial FIG 라벨 + 산악 위 검정 코드 패널" |
| [scale.com](references/tier-2/scale.com/DNA.md) | 144 | Frontier AI | "Frontier AI는 미래적 시각으로 권위 — Pure black + 3D 그라디언트 + 절제 light weight" |
| [kinfolk.com](references/tier-2/kinfolk.com/DNA.md) | 144 | luxury Editorial | "luxury Editorial은 절제된 Serif + 단정 표지 + 거대 여백으로 격조 — ISSUE 59 THE CLEAN ISSUE" |
| [monocle.com](references/tier-2/monocle.com/DNA.md) | 136 | Editorial 매거진 | "매거진 권위는 거대 Serif wordmark + 표지 사진 — Pure white + 핑크 배너 + Editorial 절제" |
| [databricks.com](references/tier-2/databricks.com/DNA.md) | 139 | Data Platform | "Lakehouse는 제품 스크린샷으로 권위 — 흰 + 빨강 강조 단어 + AI agents 명제" |
| [augury.com](references/tier-2/augury.com/DNA.md) | 138 | Industrial AI | "Industrial AI는 신뢰를 보여줘야 한다 — 다크 네이비 KPI 박스 + 오렌지 CTA" |
| [landing.ai](references/tier-2/landing.ai/DNA.md) | 136 | Vertical AI | "Vertical AI는 nature-inspired 신뢰 — Forest green + Lime + Italic Serif 믹스" |
| [palantir.com](references/tier-2/palantir.com/DNA.md) | 134 | 정부/방산 AI | "정부/방산 AI는 어둡고 절제된 화면으로 권위 — Pure dark + 코드 시각화 + AI Decision" |
| [naverlabs.com](references/tier-2/naverlabs.com/DNA.md) | 134 | 한국 R&D / Mobility | "R&D 연구소는 풀스크린 도시 사진으로 미래 비전 — Digital Twin 풀블리드 + 절제된 H1" |
| [huggingface.co](references/tier-2/huggingface.co/DNA.md) | 133 | AI 커뮤니티 | "AI 커뮤니티는 친근한 이모지로 권위를 부드럽게 — 다크 + 노란 mascot 🤗 + 모델 허브" |
| [c3.ai](references/tier-2/c3.ai/DNA.md) | 120 | Enterprise AI | "Enterprise AI는 산업 사진으로 권위 — 15년 + 300+ Fortune 500 + 다크 사진 triptych" |

### Trend Radar (메타-레퍼런스 — 인덱스 사이트, 18축 채점 미적용)

| 사이트 | 역할 | 갱신 | 분기 |
|--------|------|:---:|:---:|
| [awwwards.com](trend-radar/2026-Q2/awwwards.com/META.md) | SOTD/SOTM 글로벌 어워드 인덱스 | 일일 | 2026-Q2 |
| [godly.website](trend-radar/2026-Q2/godly.website/META.md) | AI 도메인 큐레이션 | 주간 | 2026-Q2 |
| [gdweb.co.kr](trend-radar/2026-Q2/gdweb.co.kr/META.md) ⭐ | 한국 어워드 / 한국 톤 인덱스 | 분기 | 2026-Q2 |
| [lapa.ninja](trend-radar/2026-Q2/lapa.ninja/META.md) | 랜딩 페이지 톱 (7,300+) | 주간 | 2026-Q2 |
| [motionsites.ai](trend-radar/2026-Q2/motionsites.ai/META.md) | AI 디자인 + 모션 큐레이션 | 주간 | 2026-Q2 |

> 운용: `trend-radar/2026-Q2/README.md` 참조. 분기 1회 사용자 트리거 시 Top 10 추출 → dkb-analyze 후보.

### Patterns — 별도 카테고리 (메타 / 외부 공개 부재 케이스)

| 패턴 | 카테고리 | 출처 | 비고 |
|------|---------|------|------|
| [원티드 디자인 시스템](patterns/korean-design-system/wanted-design-system.md) | korean-design-system | Figma 커뮤니티 + 블로그 | Web/Storybook 미공개 → 메타만 |

### Tier 3 — 한국 컨텍스트

| 사이트 | 점수 | 도메인 | 본질 |
|--------|:---:|--------|------|
| [lgcns.com](references/tier-3/lgcns.com/DNA.md) | 145 | 한국 SI Agentic AI | "한국 SI는 mint pastel + 한영 듀얼 H1로 친근한 권위 — Agentic AI in your work" |
| [visitseoul.net](references/tier-3/visitseoul.net/DNA.md) | 144 | 한국 공공/관광 ⭐ | "공공 관광은 자연 사진 풀블리드 + 위젯 카드로 친근한 권위 — 벚꽃 + 9개 언어 + 4계절" |
| [flim.ai](references/tier-3/flim.ai/DNA.md) | 142 | AI Creative / Storytelling | "AI 도구도 영화 스틸컷처럼 — 거대 워드마크 + 시네마 카드 그리드 + 노란 동그라미" |
| [happyrobot.ai](references/tier-3/happyrobot.ai/DNA.md) | 134 | AI Logistics / Industrial agents | "물류 AI도 시네마 풍경 hero — 산악 + 트럭 + 황혼 + 흰색 H1 + 라이트 CTA pill" |
| [interfere](references/tier-3/interfere/DNA.md) | 140 | Dev tools / 옵저버빌리티 | "Pure white + InterVariable + italic 'breaks' Editorial + 핑크 ambient blur + product 카드 z축" |
| [mobbin](references/tier-3/mobbin/DNA.md) | 128 | Inspiration platform | "saans Variable 80px + Airbnb 단일 vivid 아이콘 + 톱티어 trust grid — Inspiration platform minimal-mono" |
| [askape](references/tier-3/askape/DNA.md) | 122 | AI 트레이딩 / 핀테크 | "warm cream `#FFFFFD` + 갈색 거대 H1 + 원숭이 마스코트 + 진청 CTA pill — AI 트레이딩 playful" |
| [adcker](references/tier-3/adcker/DNA.md) | 142 | 소셜 미디어 에이전시 / 뷰티 | "warm cream `#EFEDEA` + sliced typography 'THE ART OF HACKING SOCIAL' + 자체 'nhm' Sans" (Awwwards SOTD May 01) |
| [old-tom-capital](references/tier-3/old-tom-capital/DNA.md) | 143 | B2B Capital / 골프 산업 | "Golf's Institutional Platform — B&W 골프 항공 사진 + Messinasans 120px / -4px + mist/sand/green/black 4-tone" (siteinspire #2) |
| [silent-house](references/tier-3/silent-house/DNA.md) | 139 | 크리에이티브 에이전시 / 이벤트 통합 | "'Silent / House' split wordmark + 3D folded photo card + 거대 'Press' 160px aktiv_grotesk 1:3 대비" (Awwwards SOTD Apr 28) |
| [microdot](references/tier-3/microdot/DNA.md) | 131 | 디자인 에이전시 / 패션·라이프스타일 | "warm dark `#0D0D0D` + 3D figure 2명 부유 + 하단 portfolio thumbnails + Next.js custom font hash" (siteinspire #8) |
| [pieterkoopt](references/tier-3/pieterkoopt/DNA.md) | 140 | Premium B2B 컨설팅 / 보안·위기관리 | "dark olive eerie-black `#171C1C` + warm beige `#D4C6B9` + Basic Grotesque + audio splash 진입 의식 + Webflow Osmo 209 vars 3-layer" (Awwwards SOTD Apr 29) |
| [isadeburgh](references/tier-3/isadeburgh/DNA.md) | 128 | 1인 Brand Architect 포트폴리오 | "warm white `#FFFEFC` + FoundersGroteskCondensedMedium 240px H1 + B&W portrait + 4-line 서비스 스택" (lapa.ninja #1 Portfolio) |
| [paodao](references/tier-3/paodao/DNA.md) | 126 | WebGL 3D 인터랙티브 게임 / Creative coding | "Pure black + WebGL 3D voyageur idle + 4-font 멀티 (Lato/Playfair/Orbitron/indie_flower) + 프랑스어 시적 카피 + paper warm" (Awwwards SOTD May 03) |
| [joindawn](references/tier-3/joindawn/DNA.md) | 143 | Healthcare / Mental health / AI 상담 | "Your mind is always on — warm orange `#FBF3EB` + Source Serif Pro 48px + brand-primary `#FF9C31` + 90 vars Webflow rich" (lapa.ninja #2 Health & Fitness) |
| [dashburger](references/tier-3/dashburger/DNA.md) | 140 | Food / Restaurant / 아일랜드 D2C 버거 | "JOIN THE BURGER CLUB — Pure white + Kommissar XCond Regular H2 190px / H1 80px + MessinaSans + custom cursor + Bootstrap 5" (siteinspire #9 Food & Beverage) |
| [week-wild](references/tier-3/week-wild/DNA.md) | 138 | Campaign / Event / Cultural festival | "Wild Week Athens 26 — light grey `#CBCBCB` + Albertus Nova Light 32px + royal blue `#0755BB` + Greek statue + Framer 1 var" (Awwwards SOTD Apr 26) |
| [fabiocaverzasio](references/tier-3/fabiocaverzasio/DNA.md) | 128 | 1인 Portfolio / 스위스 디자이너 | "Selected works — Pure black + Helvetica Now Display 48px / -1.44px + button orange `#F44F05` + 3-tier `--typography-{desktop\|tablet\|smartphone}` 토큰 + sharp 0px radius" (siteinspire #6 Portfolio) |
| [superb-ai.com](references/tier-3/superb-ai.com/DNA.md) | 130 | 한국 출신 글로벌 B2B | "Big Tech 인증과 Fortune 500 신뢰 — NVIDIA + AWS + K-AI" |
| [toss.tech](references/tier-3/toss.tech/DNA.md) | 128 | 한국 핀테크/Engineering | "친근함과 전문성의 균형 — 한글 타이포 + 모바일 우선 톱" |
| [samsungsds.com](references/tier-3/samsungsds.com/DNA.md) | 125 | 한국 SI 대기업 | "한국 SI 대기업은 Big Tech 파트너십으로 권위 — 다크 + Strategic Partnership + 한영 듀얼" |
| [makinarocks.ai](references/tier-3/makinarocks.ai/DNA.md) | 124 | 한국 Industrial AI | "한국 대기업 신뢰로 검증한다 — 40+ 고객 로고 + 한영 듀얼" |

### 등재 검증 상태

> 1차 등재 4건 모두 **Vision 미검증**. WebFetch + 사전 지식 + 정적 HTML 기반.
> 후속 보정 권고: Playwright 캡처 + Vision 재채점 + tokens.css 정확값 추출.

## 자동화 정책

| 항목 | 정책 |
|------|------|
| dkb-harvest 자동 수집 | ❌ 폐기 (토큰 폭주 방지) |
| dkb-analyze 사이트 분석 | 사용자 명시 트리거만 (Vision LLM 1회) |
| trend-radar 분기 갱신 | ❌ 자동 폐기 / 사용자 트리거 시만 |
| dkb-search references 매칭 | ✓ 자동 (정적 작업, 토큰 0) |

근거: `lib/rules/dkb-policy.md` §4 토큰 절약

## 통합 매핑

| 단계 | 호출 |
|------|------|
| design-orchestrator Step 2B-2.7 | dkb-search → references Top 3 |
| design-replicate Step 0 | dkb-search 결과 입력 |
| publish-visual-verify --mode=design | 18축 채점 (DKB와 동일 기준) |
| 사용자 "사이트 등재해줘" | dkb-analyze 1회 호출 |

## 참조

- `lib/rules/dkb-policy.md` — 정책 (References-First, 토큰 절약, CCD 통합)
- `skills/publish-visual-verify` v2.0 — 18축 채점 로직
- `skills/design-replicate` v2.0 — 3종 관점 시안 생성
- `agents/design-orchestrator.md` — DA Protocol + DQG 마커
- `ref/anthropic-frontend-design.md` — Anthropic 공식 가이드 흡수
