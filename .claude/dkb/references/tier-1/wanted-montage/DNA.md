# wanted-montage (montage.wanted.co.kr) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-1 (152/180 — 한국 디자인 시스템 톱)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 한국 디자인 시스템 / DX 가이드 / B2B SaaS 채용 / 컴포넌트 라이브러리
**18축 종합**: **152/180**
**Tone 11종 라벨**: `playful-toy` (1순위 — 다채 그라디언트 도형 9종) / `editorial-magazine` (2순위 — 거대 H1 + 절제 카피)
**어워드**: 자체 OSS 프로덕트 (GitHub wanteddev/montage-web 73★ + MIT 라이선스)
**적합 도메인**: 한국 디자인 시스템 / 한국 B2B SaaS / DX 가이드 / 한영 듀얼 사이트
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + 멀티모달 view + DevTools eval 토큰 추출
**출처**: P3 #11 follow-up — wanteddev/montage-web README homepageUrl

## 본질 (1줄)

> "한국 디자인 시스템도 다채 그라디언트 도형과 영한 듀얼 헤드라인으로 친근하게 — From Separate Core Blocks To a Seamless Flow."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 8 | 거대 sans-serif 영문 H1 + 한글 절제 — Wanted Sans Variable 시그니처 |
| L1-2 Color | 9 | 흰 배경 + 다채 그라디언트 도형 (핑크/오렌지/시안/녹색/자주 등) — 시그니처 강함 |
| L1-3 Color Subtlety | 8 | 블러 그라디언트 정밀 + Pure white BG 사용 (디자인 시스템 톤 의도) |
| L1-4 Trend Currency | 9 | 2025-2026 cute/그라디언트 + Variable 폰트 + 라이트/다크 토글 트렌드 |
| L2-1 White Space | 9 | Hero 절제 + 도형 그리드 여백 (행간/도형간 정밀) |
| L2-2 Typo Hierarchy | 8 | 영문 거대 H1 (72px) vs 한글 sub vs CTA 3단 |
| L2-3 Korean Typo ★ | 9 | **Wanted Sans Variable + Pretendard 영한 듀얼** — 한국 도메인 직격 시그니처 |
| L2-4 Image Tonality | 9 | 다채 그라디언트 도형 9종 비비드 일관 — 자체 Lottie 컴포넌트 추정 |
| L3-1 Asymmetric Layout | 7 | 중앙 정렬 hero — 비대칭 약함 (디자인 시스템 가이드 톤) |
| L3-2 Grid Depth | 8 | 도형 그리드 + 블러 z축 + Foundations/Components/Utilities 정보 구조 |
| L3-3 Motion Intent | 8 | 추정 — Lottie 그라디언트 도형 모션 + 라이트/다크 fade |
| L3-4 Interaction Craft ★ | 8 | 테마 토글 + 검색 + nav 정밀 (디자인 시스템 빌더로서 정밀도 시그니처) |
| L3-5 Mobile Fidelity ★ | 9 | 375 캡처 — H1 wrap + 도형 6/9개 정상 + nav 햄버거 정합 |
| L3-6 LCP Visual Impact ★ | 9 | 거대 H1 + 다채 도형 9종 즉시 임팩트 |
| L3-7 Visual Flow ★ | 8 | Hero → 한글 부제 → CTA → 도형 그리드 명확 |
| L3-8 Visual Rhythm ★ | 8 | 도형 사이즈/위치 변주 (X / + / 반원 / 별 / 육각형 / 클로버 / 원형 등) |
| L4-1 Content Weight | 8 | "From Separate Core Blocks To a Seamless Flow" + "원티드가 꿈꿔온 세상은..." 영한 비전 명제 |
| L4-2 Signature Element | 10 | **다채 그라디언트 도형 9종 + Wanted Sans Variable + 영한 듀얼 H1 + 라이트/다크 토글** (4대 시그니처) |
| **종합** | **152/180** | **PASS — tier-1 등재 (한국 디자인 시스템 톱)** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러 (atomic 토큰 시스템 — 풍부한 레벨 스케일)
- Background body: `#FFFFFF` (Pure white 사용 — 디자인 시스템 톤)
- H1 text: `#171719` (`--atomic-coolNeutral-10`) ✅ Pure black 회피
- coolNeutral 스케일 (5/7/10/15/17/20/22/23/25/30/40/50/60/70/80/90/95/96/97/98/99): `#0F0F10` ~ `#F7F7F8` (15단계 그레이 계조)
- atomic-blue 스케일: `#001536` ~ `#F7FBFF` (15단계 — `#0066FF` = 50)
- atomic-cyan 스케일: `#00252B` ~ (15단계)
- atomic-common: 0=`#000`, 100=`#FFF`
- 시그니처: **15단계 atomic 토큰 시스템** (IBM Carbon/Material 스케일 수준 — 한국 디자인 시스템 중 가장 정밀한 레벨)

### 폰트
- Display H1: **Wanted Sans Variable** ✅ (Wanted 자체 폰트 — SIL OFL) / weight 500 / size 72px / letter-spacing -1.577px / line-height 72px (1:1 — 시그니처)
- Body: **Pretendard Variable** + Pretendard JP Variable (다국어 fallback)
- 폰트 조합: **Wanted Sans (영문 wordmark/H1) + Pretendard (한글 본문)** — 한국 디자인 시스템 표준
- 라이선스: MIT (코드) + SIL OFL (Wanted Sans 폰트)

### 간격
- H1 padding: ~72px line-height 단일
- CTA padding: 12px 10px
- Hero 도형 그리드: 정밀 행간/도형간

### 모션
- 추정: Lottie 그라디언트 도형 morph + 라이트/다크 toggle fade
- 자체 패키지 `@wanteddev/wds-lottie` 보유

## 시그니처 요소

1. **다채 그라디언트 도형 9종** — Hero 하단 그리드 (X / + / 반원 / 별 / 육각형 / 클로버 / 원형 등 — 비비드 블러 그라디언트)
2. **Wanted Sans Variable + 영한 듀얼 H1** — 영문 거대 H1 + 한글 부제 시그니처
3. **15단계 atomic 토큰 시스템** — coolNeutral/blue/cyan 등 풍부한 레벨 스케일
4. **라이트/다크 토글 + 검색** — 디자인 시스템 정밀 nav

## 사진 톤

- 그라디언트 도형: 100% (사진 부재 — 도형/Lottie만)
- 톤: 비비드 다채 + 블러 그라디언트 일관

## 모션 정책

- 적용: 추정 Lottie 도형 morph + 라이트/다크 toggle
- 절대 부재: parallax 과장, 글래스모피즘, 네온 글로우

## 절대 안 쓰는 것 (NEVER List)

- Pure dark BG (디자인 시스템 라이트 기조)
- 단조로운 단색 hero (다채 그라디언트 시그니처 충돌)
- 글래스모피즘
- 네온 액센트
- 영문 단독 hero (영한 듀얼 시그니처)

## 패키지 구조 (디자인 시스템 자체)

| 패키지 | 역할 |
|---|---|
| `@wanteddev/wds` | Core UI 컴포넌트 라이브러리 |
| `@wanteddev/wds-engine` | 스타일링 엔진 |
| `@wanteddev/wds-theme` | 디자인 토큰 + 테마 정의 |
| `@wanteddev/wds-icon` | 아이콘 컴포넌트 |
| `@wanteddev/wds-lottie` | Lottie 애니메이션 |
| `@wanteddev/wds-nextjs` | Next.js 통합 (App + Page Router) |
| `@wanteddev/wds-codemod` | 마이그레이션 codemod |
| `@wanteddev/wds-mcp` | **MCP 서버 (AI-assisted dev)** ★ |
| `@wanteddev/eslint-plugin-wds` | ESLint 베스트 프랙티스 |

> 시그니처: **wds-mcp 자체 MCP 서버 보유** — AI 통합 디자인 시스템 (2026 트렌드 직격)

## 한국 디자인 시스템 적용 가이드 (★ 한국 도메인 1순위)

### 적용 가능 영역
- **한국 B2B SaaS Hero**: 영문 H1 + 한글 부제 듀얼 + 다채 도형
- **디자인 시스템 가이드 / 컴포넌트 도큐먼트**: 라이트 BG + atomic 토큰 + 라이트/다크 토글
- **채용 / HR Tech**: 친근한 cute 그라디언트 (Wanted 도메인 시그니처)
- **한영 듀얼 비전 명제**: "원티드가 꿈꿔온 세상은..." 패턴 차용

### 적용 부적합 영역
- ❌ **Frontier AI 다크 톤**: air-dev-retro-cyan 권고
- ❌ **Editorial 인물**: cinematic-photo-hero 권고
- ❌ **Industrial 권위**: kpi-dark-monogrid 권고

### 가중치 추천
- 1순위 적용: 한국 B2B SaaS / 디자인 시스템 가이드 / HR Tech / 한영 듀얼 사이트
- 2순위 적용: 한국 컨슈머 친근 (lgcns mint pastel과 차별화 — Wanted은 다채)
- 미적용: Frontier AI / Industrial / Editorial 인물

## 출처

- screenshots: `c:/tmp/dkb-rescore/wanted-montage-{desktop,mobile}.png` (2026-05-06 캡처)
- tokens: `c:/tmp/dkb-rescore/montage-tokens.json`
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view + DevTools eval
- repo: https://github.com/wanteddev/montage-web (73★, MIT)
- docs: https://montage.wanted.co.kr
- 라이선스: MIT (코드) + SIL OFL (Wanted Sans)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | 초기 등재 (152/180) — Vision 1440+375 검증 + DevTools eval 실측 토큰 + tier-1 게이트 통과 (한국 디자인 시스템 톱) — P3 #11 큐 완료 처리 |

## 후속 보정 권고

1. Lottie 도형 모션 비디오 캡처 — 9종 그라디언트 도형 morph 검증
2. 라이트/다크 토글 모션 캡처
3. atomic 토큰 시스템 전체 추출 (현재 60건 — blue/cyan/coolNeutral 외 brand/secondary/accent 등 잔여)
4. wds-mcp MCP 서버 사용 가이드 (AI-assisted design system) — SYS_v4 통합 검토
5. patterns/korean-design-system/wanted-design-system.md 메타 → references/tier-1 정식 본 등재로 업그레이드 처리 (메타 페이지 처리 정책 갱신)
