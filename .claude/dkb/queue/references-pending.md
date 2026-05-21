# DKB references 등재 대기 큐

**도입일**: 2026-05-04
**용도**: 외부 자산 검증 후 references / tier-3 정식 등재 대기 항목 추적
**처리 트리거**: 사용자 명시 호출 또는 분기 갱신 사이클 진입 시

## 대기 항목

### P3 #11 — Wanted Montage Storybook URL 검증 ✅ **2026-05-06 완료**

| 항목 | 값 |
|------|---|
| 출처 repo | https://github.com/wanteddev/montage-web (73★, MIT + SIL OFL) |
| 발견 URL | `https://montage.wanted.co.kr` (gh repo view homepageUrl) |
| 처리 결과 | **tier-1 등재 완료** (152/180) — `references/tier-1/wanted-montage/DNA.md` |
| 시그니처 4종 | 다채 그라디언트 도형 9종 + Wanted Sans Variable + 영한 듀얼 H1 + 라이트/다크 토글 |
| 부가 발견 | `@wanteddev/wds-mcp` MCP 서버 (AI-assisted dev) — 2026 트렌드 직격 |
| 잔여 권고 | patterns/korean-design-system/wanted-design-system.md 메타 → references/tier-1/wanted-montage/ 정식본으로 인계 (메타 페이지 deprecate 검토) |

---

### P3 #13 — tone_mapping 빈 슬롯 references 보강

design-knowledge tone_mapping 11 카테고리 중 references 0건이었던 3 카테고리:

| 슬롯 | 후보 | 상태 |
|------|------|------|
| **luxury-refined** | kinfolk.com | ✅ **2026-05-04 tier-2 등재 완료** (`references/tier-2/kinfolk/DNA.md`) — Vision 풀 채점 큐 진입 |
| **maximalist-chaos** | studio-feixen.ch / etcetera.studio / area17.com / lobotomyradio.com | ⚠️ **외부 fetch 차단/403** — WebFetch 보류, 사용자 명시 트리거 시 dkb-analyze 진입 |
| **art-deco-geometric** | houseofgucci.com / chanel.com / 기타 럭셔리 패션 / dieline.com 갤러리 | ⚠️ **후보 사용자 선정 대기** — 럭셔리 패션 카테고리 라이선스 + 캡처 정책 확인 필요 |

**처리 절차 (잔여 2슬롯)**:
1. maximalist-chaos — 후보 4개 중 1개 사용자 선정 후 Playwright 캡처 + dkb-analyze 호출
2. art-deco-geometric — 후보 사용자 선정 (럭셔리 브랜드는 캡처 사용 가능 여부 확인 후) → dkb-analyze 진입
3. 두 슬롯 모두 글로벌 도메인 → 145+ 시 tier-1/2, 110~144 시 tier-3 (dkb-policy.md §6 일반 룰)

**상태**: luxury-refined 1/3 완료. 잔여 2슬롯은 후보 사이트 fetch 차단/사용자 선정 대기로 미처리.

---

### P3 #15 — 갤러리 Top 10 자동 추출 (lapa / godly / awwwards)

분기 갱신 시 갤러리 Top 10 references 자동 등재 파이프라인.

| 갤러리 | URL | 추출 룰 | 2026-05-04 fetch |
|--------|-----|--------|--------|
| lapa.ninja | https://www.lapa.ninja/ | 메인 페이지 그리드 → href 10개 추출 | ✅ Top 10 추출 완료 |
| godly.website | https://godly.website/ | 메인 페이지 카드 → href 10개 추출 | ❌ 403 차단 (반복적 — 안정 대안 필요) |
| awwwards.com | https://www.awwwards.com/websites/ | "Sites of the day" 섹션 10개 추출 | ✅ Top 10 추출 완료 (2026-04-25 ~ 05-04) |
| siteinspire.com (대체) | https://www.siteinspire.com/ | godly 차단 시 대체 — Top 10 추출 | ✅ 2026-05-04 추가 |

**2026-05-04 추출 결과 (3 갤러리 × 10건 = 30 후보 URL)**:

#### lapa.ninja Top 10 (2026-05-04)
1. Isa de Burgh (Portfolio) — https://isadeburgh.com/
2. Dawn (Health & Fitness) — https://joindawn.com/
3. Mobbin.com (Inspiration) — https://www.mobbin.com/
4. OWO (App) — https://owo.app/
5. Flim (AI) — https://flim.ai/
6. Relace (AI) — https://relace.ai/
7. JetBrains Air (Dev Tools) — https://air.dev/
8. Overlay (Beauty) — https://www.overlay.com/
9. Interfere (Dev Tools) — https://interfere.com/
10. Ape AI (AI) — https://askape.com/

#### awwwards.com SOTD Top 10 (2026-04-25 ~ 2026-05-04)
1. Obys (SOTD May 04, 2026) — https://obys.agency/
2. Where Worlds Take Shape (SOTD May 03) — https://paodao.fr/
3. Fourmula AI (SOTD May 02) — https://fourmula.ai
4. Adcker (SOTD May 01) — https://adcker.com/
5. Studio375 (SOTD Apr 30) — https://375.studio/en
6. PieterKoopt® (SOTD Apr 29) — https://pieterkoopt.nl/
7. Silent House (SOTD Apr 28) — https://silent-house.com/
8. Detroit Paris (SOTD Apr 27) — https://www.detroit.paris/
9. Wild Week - Athens (SOTD Apr 26) — https://week.wild.plus/athens-26
10. Don Molinico (SOTD Apr 25) — https://www.donmolinico.es/

#### siteinspire.com Top 10 (2026-05-04 — godly 차단 대체)
1. Obys Agency (Agencies) — https://www.obysagency.com [⚠️ awwwards #1과 중복 — 대표 도메인 obys.agency 우선]
2. Old Tom Capital (Design & Art Direction) — https://www.oldtomcapital.com
3. GT Mechanik (Web & Interactive) — https://www.gtmechanik.com
4. Floema (E-Commerce) — https://www.floema.com
5. CHIMI (Fashion) — https://www.chimi.com
6. Fabio Caverzasio (Portfolio) — https://www.fabiocaverzasio.com
7. The American Housing Corporation (Corporate) — https://www.americanhousing.com
8. MICRODOT (Design Agency) — https://www.microdot.vision
9. Dash Burger (Food & Beverage) — https://dashburger.ie
10. HappyRobot (AI) — https://www.happyrobot.ai

**중복 제거 후 후보 풀**: 30 - 1(Obys 중복) = **29 후보 URL** (사용자 트리거 대기)

**우선 등재 후보 (도메인 매칭 추천 Top 5 — Industrial AI / B2B SaaS / dev tools 한정)** — ✅ **2026-05-04 5건 일괄 처리 완료**:
| 순위 | URL | 매칭 도메인 | 갤러리 출처 | 등재 결과 |
|---|---|---|---|---|
| 1 | https://flim.ai/ | AI / SaaS | lapa #5 | ✅ tier-3 (142/180) — `references/tier-3/flim.ai/DNA.md` |
| 2 | https://relace.ai/ | AI / dev tools | lapa #6 | ✅ tier-2 (145/180) — `references/tier-2/relace.ai/DNA.md` |
| 3 | https://air.dev/ | Dev tools (JetBrains) | lapa #7 | ✅ tier-1 (148/180) — `references/tier-1/air.dev/DNA.md` |
| 4 | https://fourmula.ai | AI / B2B | awwwards #3 SOTD | ✅ tier-1 (146/180) — `references/tier-1/fourmula.ai/DNA.md` |
| 5 | https://www.happyrobot.ai | AI / Industrial AI 인접 | siteinspire #10 | ✅ tier-3 (134/180) — `references/tier-3/happyrobot.ai/DNA.md` |

**처리 결과 요약 (Batch 1, 2026-05-06 1차)**:
- tier-1: 2건 (air.dev 148, fourmula.ai 146)
- tier-2: 1건 (relace.ai 145)
- tier-3: 2건 (flim.ai 142, happyrobot.ai 134)
- 부산물 패턴 권고: 3건 (anthropic-warm-cream / cinematic-photo-hero / air-dev-retro-cyan)

**Batch 2 (2026-05-06 2차) — 5건 추가 처리**:
| 순위 | URL | 매칭 도메인 | 갤러리 출처 | 등재 결과 |
|---|---|---|---|---|
| 1 | https://obys.agency/ | 크리에이티브 에이전시 | awwwards SOTD May 04 #1 | ✅ **tier-1 (152/180)** — `references/tier-1/obys/DNA.md` (구 tier-2/obys.agency 144 supersede) |
| 2 | https://375.studio/en | 이탈리안 에이전시 / cinematic | awwwards SOTD Apr 30 | ✅ **tier-1 (148/180)** — `references/tier-1/studio375/DNA.md` |
| 3 | https://interfere.com/ | Dev tools / 옵저버빌리티 | lapa #9 | ✅ tier-3 (140/180) — `references/tier-3/interfere/DNA.md` |
| 4 | https://www.mobbin.com/ | Inspiration platform | lapa #3 | ✅ tier-3 (128/180) — `references/tier-3/mobbin/DNA.md` |
| 5 | https://askape.com/ | AI 트레이딩 / 핀테크 | lapa #10 | ✅ tier-3 (122/180) — `references/tier-3/askape/DNA.md` |

**Batch 2 부산물 패턴 권고 (3건)**:
- `patterns/typography/editorial-italic-emphasis.md` 신규 — interfere "breaks" + studio375 "creative/meet" + relace "001" 통합 (italic 단어 emphasis 시그니처)
- `patterns/composition/asymmetric-brackets-hero.md` 신규 — Obys 거대 brackets `( )` 비대칭 (단독 강력 시그니처)
- `patterns/color-systems/anthropic-warm-cream.md` Variant C 추가 — askape `#FFFFFD` warm + 갈색 + 진청 CTA (fintech 마스코트 변종)

**Batch 3 (2026-05-06 3차) — 5건 추가 처리**:
| 순위 | URL | 매칭 도메인 | 갤러리 출처 | 등재 결과 |
|---|---|---|---|---|
| 1 | https://www.detroit.paris/ | 럭셔리 / AI Production | awwwards SOTD Apr 27 | ✅ **tier-1 (150/180)** — `references/tier-1/detroit-paris/DNA.md` |
| 2 | https://adcker.com/ | 소셜 미디어 / 뷰티 에이전시 | awwwards SOTD May 01 | ✅ tier-3 (142/180) — `references/tier-3/adcker/DNA.md` |
| 3 | https://www.oldtomcapital.com | B2B Capital / 골프 산업 | siteinspire #2 | ✅ tier-3 (143/180) — `references/tier-3/old-tom-capital/DNA.md` |
| 4 | https://silent-house.com/ | 크리에이티브 에이전시 / 이벤트 | awwwards SOTD Apr 28 | ✅ tier-3 (139/180) — `references/tier-3/silent-house/DNA.md` |
| 5 | https://www.microdot.vision | 디자인 에이전시 / 패션 | siteinspire #8 | ✅ tier-3 (131/180) — `references/tier-3/microdot/DNA.md` |

**Batch 3 부산물 패턴 권고 (4건 후보)**:
- `patterns/typography/sliced-letter-experiment.md` 신규 후보 — adcker sliced "THE ART OF HACKING SOCIAL" (단독 강력 시그니처)
- `patterns/composition/wordmark-split-hero.md` 신규 후보 — silent-house "Silent / House" 좌우 split 비대칭
- `patterns/cinematic/luxury-photo-grid-hero.md` 신규 후보 — detroit-paris 풀블랙 + 럭셔리 photo grid 4면 + Mangogrotesque
- `patterns/color-systems/golf-mist-sand-green.md` 신규 후보 — old-tom-capital mist/sand/green/black 4-tone Editorial 컬러 시스템

**Batch 3 부가 발견**:
- adcker 파비콘 직접 fetch 시 `b-cdn.net` Bunny CDN 403 차단 → Playwright context fetch (`ctx.request.get` + Referer 헤더) 우회 성공
- old-tom-capital Webflow 3계층 토큰 시스템 (`--_primitives---*` / `--_responsive---*` / `--_ui-styles---*`) — Webflow Custom Code 시그니처
- microdot Next.js custom font hash naming (`__font_1c1708`) — `next/font/local` 빌드 시그니처
- 5건 파비콘 일괄 다운로드 완료 (`c:/tmp/dkb-rescore/{id}-favicon-*.png|svg|jpg`)

**Batch 4 (2026-05-06 4차) — 5건 추가 처리** (chimi 폐기 → pieterkoopt 대체):
| 순위 | URL | 매칭 도메인 | 갤러리 출처 | 등재 결과 |
|---|---|---|---|---|
| 1 | https://www.floema.com | 가구·라이프스타일 E-com | siteinspire #4 | ✅ **tier-1 (152/180)** — `references/tier-1/floema/DNA.md` |
| 2 | https://www.donmolinico.es/ | 식품 / Spanish heritage | awwwards SOTD Apr 25 | ✅ **tier-1 (149/180)** — `references/tier-1/donmolinico/DNA.md` |
| 3 | https://pieterkoopt.nl/ | Premium B2B 컨설팅 / 보안 | awwwards SOTD Apr 29 | ✅ tier-3 (140/180) — `references/tier-3/pieterkoopt/DNA.md` |
| 4 | https://isadeburgh.com/ | 1인 Brand Architect 포트폴리오 | lapa.ninja #1 | ✅ tier-3 (128/180) — `references/tier-3/isadeburgh/DNA.md` |
| 5 | https://paodao.fr/ | WebGL 3D / Creative coding | awwwards SOTD May 03 | ✅ tier-3 (126/180) — `references/tier-3/paodao/DNA.md` |
| ❌ | https://www.chimi.com | 폐기 | siteinspire #5 | **도메인 squatter parking page — siteinspire 등록 정보 stale** |

**Batch 4 부산물 패턴 권고 (4건 후보)**:
- `patterns/editorial/scattered-product-collage.md` 신규 후보 — floema 16+ product cards 흩뿌림 + Locomotive 24-col + cream Editorial collage
- `patterns/cinematic/heritage-food-brand-hero.md` 신규 후보 — donmolinico cream + 거대 super-med + 풀블리드 macro + 빨간 wordmark badge + DESDE year
- `patterns/cinematic/audio-splash-gate.md` 신규 후보 — pieterkoopt "WITHOUT/WITH AUDIO" 진입 의식 (premium B2B 차별화)
- `patterns/typography/multi-family-stack.md` 신규 후보 — paodao 4-font 멀티 (Lato + Playfair + Orbitron + indie_flower) 한 사이트 통합
- `patterns/typography/oversized-condensed-wordmark.md` 신규 후보 — isadeburgh 240px FoundersGroteskCondensedMedium 1인 brand wordmark

**Batch 4 부가 발견**:
- chimi.com 도메인 squatter parking page — siteinspire 등록 정보 stale (real CHIMI fashion brand는 다른 도메인 추정) → 폐기 후 pieterkoopt(awwwards SOTD Apr 29)로 대체
- paodao WebGL Three.js (추정) 3D voyageur scene — 90s timeout 후 LOADING canonical state 캡처 (LOADING 자체가 시그니처 hero)
- floema Locomotive 24-col `--grid-columns: 24` + clamp() 기반 fluid grid — 16/12-col 대비 정밀
- donmolinico clamp via `max(min())` gutter 패턴 — modern fluid grid 시스템
- pieterkoopt **209 CSS vars (Batch 4 최다)** + Webflow 3-layer 토큰 + Osmo.supply scaling system — industry-leading custom code 시그니처
- 5건 파비콘 일괄 다운로드 완료 (chimi 폐기 → pieterkoopt 대체)

**누계 (Batch 1 + 2 + 3 + 4)**:
- tier-1: 8건 (air.dev / fourmula.ai / wanted-montage / obys / studio375 / detroit-paris / **floema** / **donmolinico**)
- tier-2: 1건 (relace.ai)
- tier-3: 12건 (flim.ai / happyrobot.ai / interfere / mobbin / askape / adcker / old-tom-capital / silent-house / microdot / **pieterkoopt** / **isadeburgh** / **paodao**)
- 폐기: 1건 (chimi.com — 도메인 squatter)
- **잔여: 9 후보 URL** (24 - 15 처리 — 사용자 트리거 대기)

**Batch 5 (2026-05-06 5차) — 7건 추가 처리** (gtmechanik 폐기 → 대체 없이 진행, queue 완전 소진):
| 순위 | URL | 매칭 도메인 | 갤러리 출처 | 등재 결과 |
|---|---|---|---|---|
| 1 | https://www.americanhousing.com | Civic / Non-profit / Housing | siteinspire #7 Corporate | ✅ **tier-1 (148/180)** — `references/tier-1/americanhousing/DNA.md` |
| 2 | https://www.overlay.com | AI Beauty / D2C | lapa.ninja #8 Beauty | ✅ **tier-1 (146/180)** — `references/tier-1/overlay/DNA.md` |
| 3 | https://owo.app | Fintech / Gen-Z / WhatsApp | lapa.ninja #4 App | ✅ **tier-1 (145/180)** — `references/tier-1/owo/DNA.md` |
| 4 | https://joindawn.com | Healthcare / Mental health | lapa.ninja #2 Health & Fitness | ✅ tier-3 (143/180) — `references/tier-3/joindawn/DNA.md` |
| 5 | https://dashburger.ie | Food / Burger / 아일랜드 D2C | siteinspire #9 Food & Beverage | ✅ tier-3 (140/180) — `references/tier-3/dashburger/DNA.md` |
| 6 | https://week.wild.plus/athens-26 | Campaign / Event / Cultural | awwwards SOTD Apr 26 | ✅ tier-3 (138/180) — `references/tier-3/week-wild/DNA.md` |
| 7 | https://www.fabiocaverzasio.ch | 1인 Portfolio / 스위스 | siteinspire #6 Portfolio | ✅ tier-3 (128/180) — `references/tier-3/fabiocaverzasio/DNA.md` |
| ❌ | https://www.gtmechanik.com | 폐기 | siteinspire #3 Web & Interactive | **Atom.com 도메인 marketplace squatter — siteinspire 등록 정보 stale** |

**Batch 5 부산물 패턴 권고 (5건 후보)**:
- `patterns/color-systems/cumulus-cream.md` 신규 후보 — americanhousing `#FDFFF1` cumulus warm white-yellow Civic advocacy palette
- `patterns/color-systems/lavender-tinted-white.md` 신규 후보 — overlay `#FBF9FB` Beauty 차별 BG (Pure white 회피)
- `patterns/color-systems/fintech-candy-palette.md` 신규 후보 — owo `#FFF8DC` cream + 핫 핑크 `#FF00A0` CTA Gen-Z 시그니처
- `patterns/typography/extreme-condensed-headline.md` 신규 후보 — dashburger Kommissar XCond Regular 190px + 80px line-height 210px extreme spacing
- `patterns/build/explicit-device-tier-tokens.md` 신규 후보 — fabiocaverzasio 3-tier `--typography-{desktop|tablet|smartphone}` 명시적 디바이스 타겟 토큰 시그니처 (rare)

**Batch 5 부가 발견**:
- gtmechanik.com Atom.com 도메인 marketplace parking page (siteinspire 등록 정보 stale) → 폐기 (chimi.com 후속, 두 번째 도메인 squatter 패턴 확인)
- fabiocaverzasio.com DNS_NAME_NOT_RESOLVED → nslookup 변종 테스트(.ch/.it/.studio/.design) → .ch 도메인 정상 resolution(135.125.6.167) → batch5-fabio.mjs로 alternate domain 캡처 복구 (siteinspire 등록 .com vs 라이브 .ch mismatch 발견)
- overlay 156 vars (Batch 5 최다, Batch 4 pieterkoopt 209에 이어 2위) — Webflow Custom Code rich token 시그니처
- owo Tailwind v4 oklch 시스템 + cream `#FFF8DC` + 핫 핑크 `#FF00A0` CTA + Greed custom Sans 90px H1 — Gen-Z fintech 4축 시그니처
- americanhousing die-a / die-d Adobe Fonts custom typeface (rare 외부 차용) + cumulus `#FDFFF1` 양성 토큰
- week-wild Framer 1 var only (`--one-if-corner-shape-supported`) — Framer site builder 시그니처 패턴 (DKB Grid Depth 패널티 -2)
- dashburger `cursor: none !important` custom cursor 강제 적용 (식음료 D2C interactive food experience)
- 7건 파비콘 일괄 다운로드 완료 (gtmechanik squatter Atom.com 파비콘 폐기 / fabiocaverzasio .ch alternate domain 복구)

**누계 (Batch 1 + 2 + 3 + 4 + 5)**:
- tier-1: 11건 (air.dev / fourmula.ai / wanted-montage / obys / studio375 / detroit-paris / floema / donmolinico / **americanhousing** / **overlay** / **owo**)
- tier-2: 1건 (relace.ai)
- tier-3: 16건 (flim.ai / happyrobot.ai / interfere / mobbin / askape / adcker / old-tom-capital / silent-house / microdot / pieterkoopt / isadeburgh / paodao / **joindawn** / **dashburger** / **week-wild** / **fabiocaverzasio**)
- 폐기: 2건 (chimi.com / gtmechanik.com — 도메인 squatter 패턴)
- **잔여: 0 후보 URL** ★ **30 URL queue 완전 소진** (Batch 1~5 누적 28건 등재 + 2건 폐기)

**파이프라인** (`/curate-theme --gallery {name} --top 10` 호출 시):
```
1. WebFetch 갤러리 페이지 → 외부 사이트 URL 10개 추출 ✅
2. dkb-analyze 일괄 호출 (10건 직렬, Vision 1회/사이트) — 미수행 (사용자 트리거 대기)
3. 등재 결정 — 145+ → tier-1/2 / 110~144 → tier-3 / <110 → archive
4. 산업별 동의어 사전(industry / domain) 갱신
```

**상태**: 30 URL 추출 완료. **Batch 1 + 2 + 3 + 4 + 5 = 28건 등재 완료 (2026-05-06)** (chimi/gtmechanik 폐기 2건 포함 시 30건 처리 — **queue 완전 소진**).

**잔여 0 URL** ★ **2026-05-06 일괄 처리 종료**:
- 시작: 30 URL (lapa.ninja 10 + awwwards SOTD 10 + siteinspire 10 — Obys 1건 중복 제거)
- 등재: 28건 (tier-1 11건 + tier-2 1건 + tier-3 16건)
- 폐기: 2건 (chimi.com Batch 4 / gtmechanik.com Batch 5 — 모두 도메인 squatter parking page, siteinspire 등록 정보 stale)
- 일괄 처리 기간: 2026-05-04 추출 → 2026-05-06 5배치 (5건/배치) 분할 처리 완료

**스크립트 위치**: `~/.claude/skills/curate-theme/SKILL.md` 또는 `commands/curate-theme.md`에 통합 — 별도 스크립트 작성 불필요 (스킬 내부 fetch + dkb-analyze 호출).

**godly.website 403 차단 대응**:
- 2026-05-04 반복 fetch 시도 시 403 에러 → User-Agent 헤더 검증 / Cloudflare 봇 차단 추정.
- 대체 갤러리: siteinspire.com (정상 fetch). 향후 godly 우회 필요 시 Playwright 헤드리스 fetch 검토.

---

## 처리 후 작업

- 등재 완료 시 본 큐에서 항목 제거 → `done/` 이동 또는 archive
- `~/.claude/dkb/INDEX.md` references 표 갱신
- tier 분류 확정 후 lib/rules/dkb-policy.md §6-1 한국 도메인 강제 룰 적용 검토

## 관련 자산

- `lib/rules/dkb-policy.md` §4 Claude-only / §6 등재 기준 / §8 운영 비용 정책
- `dkb/queue/vision-rescore-pending.md` — 기존 references v1.1 → v1.2 재채점 큐 (4건)
- `dkb/patterns/korean-design-system/wanted-design-system.md` — Montage 메타 패턴 (P3 #11 출처)
