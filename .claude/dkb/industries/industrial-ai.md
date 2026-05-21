# Industrial AI 업종 시그니처 매핑

**도메인**: 제조 AI / Industrial AI / DX 컨설팅
**대표 사이트**: Augury, Scale AI, Landing AI, C3.ai, MakinaRocks, Superb AI
**한국 Industrial AI / 한국 B2B 프로젝트**: tier-2 (글로벌 직격) + tier-3 (한국 컨텍스트) 혼합 우선

## 도메인 시그니처 패턴

| 패턴 | 사이트 | 적용 |
|------|------|------|
| **공장/기계 사진 톤** | Augury, Scale AI | Hero 풀블리드 + 사진 일관 톤 |
| **숫자 KPI 임팩트** | Landing AI ("1B+") · C3.ai ("300+ clients") | Numbers 섹션 |
| **Trust 메트릭스** | C3.ai · MakinaRocks | 한국 대기업 로고 40+ |
| **Before/After 수치** | (Vercel 톤 차용) | Cases 3건 임팩트 |
| **Vertical AI 강조** | Landing AI · Augury | Platform 섹션 |
| **Sim-to-Real / Digital Twin** | Augury · C3.ai | 기술 비전 섹션 |

## 권장 references 매칭

### Tier 우선순위 (Industrial AI)

1. **Tier-2 (110~144)** 우선 — 도메인 직격
   - `tier-2/augury.com/` (제조 AI 직접)
   - `tier-2/scale.com/`
   - `tier-2/landing.ai/`
   - `tier-2/c3.ai/`
2. **Tier-1 (145+)** 보조 — 시각 퀄리티 톱
   - `tier-1/anthropic.com/` (Off-white + Serif → About 영역)
   - `tier-1/linear.app/` (KPI 표현 → Numbers 섹션)
   - `tier-1/vercel.com/` (Bento + 네온 → Cases Before/After)
3. **Tier-3 (한국 컨텍스트)** — 친숙도
   - `tier-3/makinarocks.ai/`
   - `tier-3/superb-ai.com/`

### 영역별 권장 매핑 (Industrial AI 일반)

| 영역 | 1순위 reference | 2순위 |
|------|---------------|------|
| Hero | Augury (공장 사진 + Industrial blue) | Linear (KPI Dark + 거대 타이포) |
| About | Linear (mono + grid) | Vercel (Bento) |
| Service 단계 | Linear (대형 번호) | Augury (Step Bento) |
| Why Now (Before/After) | Augury (다크 네이비 KPI 박스) | Vercel (절제 Bento) |
| Platform Pillar | Vercel (Bento tile 극단 대비) | Linear (다채 차트) |
| Cases | Augury (KPI 임팩트) | Vercel (Before/After 카드) |
| Numbers (22+/26+/37/5) | Linear (대형 KPI) | C3.ai |
| Partners (MOU 5사) | MakinaRocks (한국 로고 그리드) | Superb AI |
| Contact | Anthropic (Editorial 카피) | Linear |

## 한국 Industrial AI 특수 고려

1. **한글 타이포 핵심** (L2-3 ★) — Pretendard + word-break: keep-all 필수
2. **파트너/투자자 1순위 톤** — 묵직한 신뢰감 (Linear 다크 미니멀 또는 industrial-utilitarian)
3. **MOU 5건 강조** — Superb AI NVIDIA Inception 배지 패턴 차용

## ★ Default House Style 차단 룰 (2026-05-04 추가)

> 출처: `ref/anthropic-frontend-design.md` § Default House Style 회피 룰
> Industrial AI는 LLM default house style **부적합 도메인**. 명시적 차단 필수.

### 차단 대상 (LLM default 회귀 패턴)

```
❌ 배경 #F4F1EA / #FAFAF7 / warm cream off-white 류
❌ Serif Display + Italic word-accents 시그니처 (anthropic.com 톤)
❌ terracotta / amber / coral / sepia 류 액센트
❌ Editorial 매거진 절제 톤 (B2B는 trust/authority가 핵심)
❌ underline 강조 단어 + Italic em 시그니처
```

= **anthropic.com을 시드로 등재했지만, Industrial AI 시안에 적용 시 hospitality/editorial 톤으로 변질되어 부적합.**

### 강제 톤 1개 commit (Tone 11종 중 선택)

Industrial AI / manufacturing 도메인은 다음 중 **1개만** commit:

| Tone | 시그니처 | 적합 시기 |
|------|---------|---------|
| **industrial-utilitarian** ⭐ 1순위 | mono + grid + 기능 중심 + 구조 표현 | 제조 본질 / 도메인 직격 |
| **brutalist-raw** | 회색 톤 + sharp edge + 거대 텍스트 + minimal motion | 기술적 권위 강조 |
| **brutally-minimal** (KPI Dark 류) | Pure dark + 정밀 + 다채 차트 색 | Numbers/투자자 1순위 |

**금지**: editorial-magazine, luxury-refined, soft-pastel, organic-natural, playful (default 회귀 또는 도메인 부적합)

### references 적용 가이드 (Industrial AI 한정)

**default 가족 references (사용 금지)**:
- ❌ anthropic.com (editorial-magazine 1순위 — default 가족, Industrial AI 부적합)
- ❌ Editorial Italic Serif H1 / Off-white 배경 / B&W 인물 / underline 강조

**적합 references**:
- ✓ augury.com (industrial-utilitarian 1순위, Industrial AI 직격) → Hero 카피 / Numbers 박스 / Bento 4종
- ✓ linear.app (industrial-utilitarian 1순위) → Numbers 대형 / Service / 코드 syntax
- ✓ vercel.com (industrial-utilitarian 2순위) → Bento 변주 / 그라디언트 메쉬 절제
- ✓ makinarocks.ai (brutally-minimal 1순위) → 한국 대기업 로고 그리드
- ✓ superb-ai.com (industrial-utilitarian 1순위) → NVIDIA + AWS 인증 묶음

> 매핑 출처: `dkb-config.json` § tone_mapping (2026-05-04 도입)

### 검증 (시안 생성 후 자가 점검)

각 시안 생성 후 다음 4개 자동 검증:
1. 배경 hex grep — `#F4F1EA|#FAFAF7|#F5F2EA` 매칭 시 BLOCK
2. 폰트 grep — `font-family.*Newsreader\|.*Italic.*Serif.*Display` 매칭 시 BLOCK
3. 액센트 grep — `#CC7856|#A8412A|terracotta|amber|coral` 매칭 시 BLOCK (네이비/그레이/Industrial blue 외)
4. 시그니처 grep — `Italic em|underline 강조` 매칭 시 BLOCK

→ 4개 중 1개라도 매칭되면 시안 폐기 + Tone 1개 명시적 commit 후 재생성

## Anti-Pattern (Industrial AI 도메인 한정)

- ❌ 토스/라인 톤 (B2C 친근 → 파트너/투자자 신뢰 약화)
- ❌ Family.co OKLCH (실험적 → 보수적 B2B에 위험)
- ❌ Cute trend (V5) — 제조 도메인 부적합
- ❌ 글래스모피즘 (이미 죽은 트렌드)
- ❌ **anthropic Editorial 톤** (2026-05-04 추가 — default 회귀)
- ❌ **warm cream/off-white 배경** (2026-05-04 추가)
- ❌ **Serif Italic Display H1** (2026-05-04 추가)

## 도메인 학습 사례

> Industrial AI 도메인 실패 케이스 학습은 메모리로 분리되어 보존됨.
> 참조: `~/.claude/projects/c--Users-hj-moon--claude/memory/feedback_default_house_style_failures.md`

## 등재 시드 (2026-04-30 1차 등재 완료)

| 사이트 | 점수 | tier | 적용 영역 |
|--------|:---:|------|---------|
| [anthropic.com](../references/tier-1/anthropic.com/DNA.md) | 152 | tier-1 | Hero / About / Contact (Editorial Italic Serif) |
| [linear.app](../references/tier-1/linear.app/DNA.md) | 148 | tier-1 | Numbers / Service / Hero (KPI Dark + 그라디언트 텍스트) |
| [vercel.com](../references/tier-1/vercel.com/DNA.md) | 145 | tier-1 | Why Now / Cases / Platform 3 Pillar (Bento + 네온) |
| [scale.com](../references/tier-2/scale.com/DNA.md) | 144 | tier-2 | Hero 3D 그라디언트 / Trust 다크 로고 / Frontier AI 권위 (Pure black + 파스텔 일러스트) |
| [landing.ai](../references/tier-2/landing.ai/DNA.md) | 136 | tier-2 | Hero Italic Serif 믹스 / Forest green nav / Lime CTA / Vertical AI 권위 (Andrew Ng 톤) |
| [augury.com](../references/tier-2/augury.com/DNA.md) | 132 | tier-2 | KPI 표현 / Trust 로고 / 산업 사진 톤 / Hero 카피 |
| [c3.ai](../references/tier-2/c3.ai/DNA.md) | 120 | tier-2 | Hero 산업 사진 Triptych / Fortune 500 Trust / 15+ 권위 명제 (Enterprise AI 직격) |
| [palantir.com](../references/tier-2/palantir.com/DNA.md) | 134 | tier-2 | 다크 + 코드 시각화 / AI-Powered Automation / 정부/방산 권위 |
| [naverlabs.com](../references/tier-2/naverlabs.com/DNA.md) | 134 | tier-2 | Hero 도시 풀블리드 / Digital Twin / 한국 R&D Mobility AI |
| [databricks.com](../references/tier-2/databricks.com/DNA.md) | 139 | tier-2 | Lakehouse / 제품 대시보드 / Trust Fortune 500 (Data Platform) |
| [lgcns.com](../references/tier-3/lgcns.com/DNA.md) | 145 | tier-3 | Mint pastel + 한영 듀얼 H1 / Agentic AI / 한국 SI 시각 시그니처 톱 |
| [samsungsds.com](../references/tier-3/samsungsds.com/DNA.md) | 125 | tier-3 | 한영 듀얼 + Big Tech 파트너십 / 한국 대기업 SI |

> 모두 Vision 미검증 (WebFetch + 사전 지식 기반). 후속 보정 권고.

## 참조

- `~/.claude/dkb/references/tier-1/linear.app/DNA.md` — industrial-utilitarian 1순위
- `~/.claude/dkb/references/tier-1/vercel.com/DNA.md` — industrial-utilitarian 2순위
- `~/.claude/dkb/references/tier-2/augury.com/DNA.md` — Industrial AI 직격 매칭 ⭐
- `~/.claude/dkb/references/tier-3/makinarocks.ai/DNA.md` — 한국 Industrial AI / brutally-minimal
- `~/.claude/dkb/references/tier-3/superb-ai.com/DNA.md` — 한국 출신 글로벌 B2B / industrial-utilitarian
- `~/.claude/dkb/dkb-config.json` § tone_mapping — Tone 11종 ↔ references 매칭표
- `~/.claude/lib/rules/dkb-policy.md` — DKB 정책
- `~/.claude/ref/anthropic-frontend-design.md` § Default House Style 회피 룰
