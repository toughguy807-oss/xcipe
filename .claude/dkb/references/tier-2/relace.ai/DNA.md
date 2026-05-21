# relace.ai — 시각 DNA

**분석일**: 2026-05-04
**Tier**: tier-2 (145/180 — 145+ 게이트 통과)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: AI / Dev Tools / Coding Agents / SaaS B2B
**18축 종합**: **145/180**
**Tone 11종 라벨**: `editorial-magazine` (1순위 — FIG 001/003 라벨 + 크림 톤) / `industrial-utilitarian` (2순위 — dev tools)
**어워드**: lapa.ninja Top 10 (#6, 2026-05-04)
**적합 도메인**: AI dev tools / SaaS B2B / Industrial AI (warm-cream + 코드 hero — manufacturing AI 인접)
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view (1회)
**출처 갤러리**: lapa.ninja (#6 / Artificial Intelligence 카테고리)

## 본질 (1줄)

> "코딩 에이전트도 매거진처럼 보여야 한다 — 크림 배경 + Editorial FIG 라벨 + 코드 hero."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | 거대 sans-serif H1 + Editorial mono 보조 (FIG 001/003) — 시그니처 |
| L1-2 Color | 9 | 크림 베이지(#F5F0E5 추정) + 검정 + 오렌지 CTA — Anthropic warm-cream 계열 정합 |
| L1-3 Color Subtlety | 9 | Pure white 회피 + Pure black 회피 추정 |
| L1-4 Trend Currency | 9 | 2025-2026 warm-cream + Editorial AI dev tools 시그니처 |
| L2-1 White Space | 9 | Hero 점유율 절제 + Trust 로고 ~ Hero 이미지 사이 여백 |
| L2-2 Typo Hierarchy | 9 | 거대 H1 vs 본문 vs FIG mono 라벨 3단 대비 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 9 | 코드 스크린샷 + 산악 풍경 합성 — 시네마/Editorial 톤 |
| L3-1 Asymmetric Layout | 8 | Hero 좌측 텍스트 + 우측 CTA / 코드 hero 풀폭 비대칭 |
| L3-2 Grid Depth | 8 | 그리드 + 코드 박스 z-축 (검정 코드 패널이 산악 위로 떠오름) |
| L3-3 Motion Intent | 8 | 정적 캡처 — 추정 hover 미세 + 코드 typing 애니메이션 |
| L3-4 Interaction Craft ★ | 8 | hover 평이 추정 + CTA pill 정밀 |
| L3-5 Mobile Fidelity ★ | 9 | 375 캡처 — H1 wrap + 풀폭 CTA + FIG 라벨 정상 |
| L3-6 LCP Visual Impact ★ | 9 | "Models built for coding agents" H1 즉시 |
| L3-7 Visual Flow ★ | 9 | Hero → Trust 로고 → 코드 hero → Features 명확 |
| L3-8 Visual Rhythm ★ | 8 | 텍스트 hero + 비주얼 hero 교차 |
| L4-1 Content Weight | 9 | "Models built for coding agents" + "out-of-the-box codebase retrieval" — 명확 가치 명제 |
| L4-2 Signature Element | 10 | 크림 톤 + Editorial FIG 라벨 + 산악 풍경 위 코드 패널 (3대 시그니처) |
| **종합** | **145/180** | **PASS — tier-2 등재 (게이트 진입)** |

## 정확 토큰 (실측, 2026-05-06 DevTools eval 검증)

### 컬러
- Background body: `#FFFEF2` ✅ **크림 베이지 정확** (추정 #F5F0E5에서 미세 보정 — 더 엷은 ivory)
- Text primary (H1): `#191918` ✅ Pure black 회피 정확
- Text secondary (60%): `#19191899` (alpha=0.6)
- Text tertiary (50%): `#19191880`
- Accent yellow/amber: `#FCAA2D` ⚠️ **오렌지가 아닌 amber/gold** (selection-background-color 시그니처)
- Code highlight gold: `#A36404` (다크 amber)
- BG alt 베이지: `#F3F2E7` / `#E3E2D8`
- BG semi: `#FFFEF2CC` (alpha=0.8)
- Border subtle: `#1919181A` (10% alpha)
- Code panel: 별도 토큰 미노출 (검정 박스 합성 추정)

### 폰트
- H1: **Parabole Trial Regular Text** ⚠️ **Serif 폰트** (추정 sans-serif 정정 — Editorial 매거진 톤 강화) / weight 400 / size 64px / letter-spacing -3.2px / line-height 70.4px
- Body bold fallback: Inter / weight 700
- Body base: Framer 시스템 sans / weight 400 / size 12px (작음 — Framer 빌드)
- 빌드 플랫폼: **Framer** (token UUID 패턴 + framer-* 변수)

### 간격
- Section 간격: ~80-120px
- Container max-width: ~1280px

### 모션
- 정적 캡처 — 추정 코드 타이핑 애니메이션 + hover 미세 모션
- Framer 플랫폼 기본 모션 활용 추정

## 시그니처 요소

1. **크림 베이지 배경 + 검정 H1** — Anthropic warm-cream 계열 정합
2. **FIG 001 / FIG 003 mono 라벨** — Editorial 매거진 도판 번호 차용 (시그니처 디테일)
3. **산악 풍경 위 코드 패널** — 합성 시네마틱 hero (dev tools를 매거진 화보처럼)

## 사진 톤

- 코드 스크린샷: 50%
- 자연 풍경 합성: 30%
- Trust 로고: 20%
- 톤: 시네마틱 + warm 보정

## 모션 정책

- 적용: 코드 타이핑 (추정), hover 미세
- 절대 부재: 글래스모피즘, 네온 글로우, parallax 과장

## 절대 안 쓰는 것 (NEVER List)

- Pure #FFF / #000
- 보라/파랑 그라디언트
- 글래스모피즘
- 3-col 단조로운 카드
- 네온 액센트

## Industrial-AI 적용 가이드 (★ warm-cream 계열 직격)

### 적용 가능 영역
- **Hero**: 크림 + 검정 H1 + 오렌지 CTA — Anthropic + Augury 결합 톤
- **FIG 라벨 디테일**: Editorial 매거진 도판 번호 — Industrial 사진에 차용 가능
- **합성 hero 이미지**: 코드/UI 패널을 산업 사진 위에 합성
- **Trust 로고 그리드**: 작은 그레이 로고 + 좌측 정렬 캡션

### 적용 부적합 영역
- ❌ **Bento Grid**: Vercel 톤 권고
- ❌ **Pure dark KPI**: Linear 톤 권고

### 가중치 추천
- 1순위 적용: Hero / FIG 라벨 / 합성 이미지
- 2순위 적용: Trust 로고 그리드
- 미적용: Bento / Dark KPI

## 출처

- screenshots: `c:/tmp/dkb-rescore/relace-{desktop,mobile}.png` (2026-05-04 캡처)
- 분석 방식: Playwright 캡처 + 멀티모달 Read tool view
- 갤러리 출처: lapa.ninja Top 10 #6 (2026-05-04 fetch)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-04 | 초기 등재 (145/180) — Vision 1440+375 검증 완료 — lapa.ninja Top 10 #6 / tier-2 게이트 통과 |
| v1.1 | 2026-05-06 | 실측 토큰 갱신 — DevTools eval 검증. Parabole Trial(Serif) H1 식별 — Editorial 매거진 톤 확정. Framer 빌드 + amber 액센트 #FCAA2D 정확 |

## 후속 보정 권고

1. tokens.css 정확값 추출 (DevTools eval) — 크림/오렌지 정확 hex
2. 폰트 정확 식별 (Inter/Geist/커스텀 후보)
3. 모션 캡처 (코드 타이핑 + hover 비디오) — 인터랙션 검증
4. dkb/patterns/color-systems/anthropic-warm-cream.md 정합성 검증 (relace 변종 추가 등재 검토)
