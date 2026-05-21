# fabiocaverzasio (fabiocaverzasio.ch) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (128/180 — siteinspire #6 Portfolio)
**interaction_archetype**: showcase
**platform**: hybrid
**도메인**: 1인 디자이너 포트폴리오 / 스위스 / 'Selected works'
**18축 종합**: **128/180**
**Tone 11종 라벨**: `minimal-mono` (1순위 — Pure black + Helvetica) / `editorial-magazine` (2순위)
**어워드**: siteinspire #6 Portfolio (2026-05-04)
**적합 도메인**: 1인 Portfolio / Designer / 스위스 디자인 / Minimal Editorial
**Vision 검증**: 2026-05-06 — Playwright 1440+375 + DevTools eval (.com DNS 실패 → .ch alternate domain 복구)
**출처**: siteinspire.com #6 (Batch 5)

## 본질 (1줄)

> "Selected works — Pure black `#000000` BG + Helvetica Now Display 48px H1 medium 500 / -1.44px + button orange `#F44F05` accent + 3-tier `--typography-{desktop|tablet|smartphone}` 토큰 — 스위스 1인 포트폴리오 minimal-mono."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | **Helvetica Now Display 48px / weight 500 / -1.44px / line-height 48px (1.0) — 스위스 minimal 정밀** |
| L1-2 Color | 4 | **Pure black `#000000` BG ⚠️ + orange `#F44F05` button accent로 보완** |
| L1-3 Color Subtlety | 7 | light-2 `#D9D9D9` + button orange + dark mode 단계 — 절제 |
| L1-4 Trend Currency | 7 | **2026 Pure black 1인 포트폴리오 (트렌드 대비 보수적) + 3-tier responsive 토큰 시그니처** |
| L2-1 White Space | 8 | hero 거대 negative space + 작은 thumbnail 그리드 |
| L2-2 Typo Hierarchy | 7 | H1 48px → H2 12px (`Fondazione Guastalla` 작은 라벨) — 1인 포트폴리오 minimal |
| L2-3 Korean Typo ★ | 5 | 한글 부재 (영문/이탈리아어) |
| L2-4 Image Tonality | 8 | works thumbnail grid (다양 client work 트리밍) |
| L3-1 Asymmetric Layout ★ | 7 | 상단 nav + Selected works 좌측 + thumbnail grid — 비대칭 |
| L3-2 Grid Depth | 9 | **87 vars 3-tier `--typography-{desktop|tablet|smartphone}` ★ responsive 토큰 시그니처 (rare)** |
| L3-3 Motion Intent ★ | 7 | 절제 transition (스위스 minimal 톤) |
| L3-4 Interaction Craft | 7 | "Discover more" CTA + nav minimal |
| L3-5 Mobile Fidelity ★ | 9 | **3-tier responsive 토큰 (`smartphone` 명시) — 모바일 정합 시그니처** |
| L3-6 LCP Visual Impact ★ | 7 | 'Selected works' 48px Helvetica + 다크 BG — Editorial impact 보통 |
| L3-7 Visual Flow ★ | 7 | hero → Selected works → about → contact 선형 |
| L3-8 Visual Rhythm ★ | 7 | H1 + thumbnail grid + label H2 — 3축 리듬 |
| L4-1 Content Weight | 7 | 'Selected works' + project label만 (1인 포트폴리오 절제) |
| L4-2 Signature Element ★ | 9 | **Helvetica Now Display + Pure black + 3-tier responsive 토큰 + button orange `#F44F05` + 1px border-radius (sharp)** (5대 시그니처) |
| **종합** | **128/180** | **PASS — tier-3 등재 (siteinspire #6 Portfolio; Pure black 패널티 -3 적용)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background: **`#000000`** (Pure black) ⚠️ Anti-Slop 위반
- 텍스트 primary: `#FFFFFF` (Pure white)
- button orange: **`#F44F05`** (`--buttons--primary-background` / `--swatches-dark-mode--button-color`)
- button text: white (`--buttons--primary-text: white`)
- light-2: `#D9D9D9` (`--swatches--light-2`)

### 폰트
- body / H1 / H2: **`"Helvetica Now Display", Arial, sans-serif`** (Monotype contemporary Helvetica)
- H1: **48px / weight 500 / letter-spacing -1.44px / line-height 48px (1.0)**
- H2: 12px / weight 400 / letter-spacing 0.42px (작은 label)
- buttons-button-font: Helvetica Now Display
- buttons-font-size: 12px

### 그리드 / spacing — ★ 3-tier responsive 시그니처
- **`--typography-desktop--*`** : h1/h2/h3/h4/h5 + body 12px
- **`--typography-tablet--*`** : h1 3em / h2 24px / h3 2em / h4 1.5em + body 12px
- **`--typography-smartphone--*`** : h1 2em / h2 24px / h4 1em / h5 .8em + body 12px
- **`--space--{desktop|tablet|smartphone}--{small|medium|large|xlarge|xxlarge}`** spacing 5단계 × 3-tier
- desktop space: small 8px / xlarge 64px / xxlarge 128px
- tablet space: small 8px / medium 16px / large 32px / xlarge 64px
- smartphone space: small 5vw / medium 25px
- **`--structure--border-radius: 0px`** ★ (sharp 시그니처 — rounded 회피)
- buttons-horizontal-padding: 1.5rem
- 87 vars (3-tier 시스템)

### 모션
- 절제 transition (스위스 minimal 톤)

## 시그니처 요소

1. **Helvetica Now Display** — Monotype contemporary Helvetica 48px H1 medium 500 (스위스 minimal)
2. **Pure black `#000000` BG** — 1인 포트폴리오 minimal-mono (Anti-Slop 위반 but 시그니처)
3. **3-tier `--typography-{desktop|tablet|smartphone}` 토큰** ★ — 명시적 디바이스 타겟 토큰 시그니처
4. **button orange `#F44F05`** — 다크 BG accent (시그니처 단일 컬러)
5. **`--structure--border-radius: 0px`** sharp — rounded 회피 시그니처

## 사진 톤
- works thumbnail grid (다양 client work 트리밍)
- 다크 BG에 적합한 high-contrast 사진 톤

## 모션 정책
- 적용: 절제 transition (스위스 minimal)
- 절대 부재: WebGL, 3D, 글래스모피즘 (1인 포트폴리오 minimal 톤)

## 절대 안 쓰는 것 (NEVER List)
- 라이트 BG (Pure black 시그니처)
- rounded corners (`border-radius: 0px` sharp 시그니처)
- 한국어 (영문/이탈리아어 1인 포트폴리오)
- playful / 다채 컬러 (minimal 톤)

## 적용 가이드 (minimal-mono 1순위)

- **1인 Portfolio / Designer / 스위스 디자인 / Minimal Editorial** 1순위
- **3-tier `--typography-{desktop|tablet|smartphone}` 토큰** 차용 (명시적 디바이스 타겟)
- **Helvetica Now Display 48px H1 medium 500 / -1.44px** — 스위스 minimal Editorial
- **button orange `#F44F05` accent** — 다크 BG 단일 시그니처 컬러
- **`border-radius: 0px` sharp** — rounded 회피 일관성

### 적용 부적합
- ❌ B2B SaaS dashboard (1인 minimal 톤)
- ❌ playful / Gen-Z (refined minimal)
- ❌ Beauty / pastel (Pure black 다크)
- ❌ 한국 SI (영문 minimal)

## ⚠️ 주의 사항

- **Pure black BG 사용** — Anti-Slop 정책 ⚠️ (1인 포트폴리오 minimal-mono 시그니처 인정 but 회피 권고)
- **fabiocaverzasio.com DNS 실패** — siteinspire 등록은 .com이나 실제 라이브는 .ch 도메인 (DNS_NAME_NOT_RESOLVED 후 nslookup으로 .ch 발견)
- **Helvetica Now Display 라이선스** — Monotype 외부 차용 시 확인

## 출처

- screenshots: `c:/tmp/dkb-rescore/fabiocaverzasio-{desktop,mobile}.png` (2026-05-06)
- favicon: `c:/tmp/dkb-rescore/fabiocaverzasio-favicon-*.png|svg`
- tokens: `c:/tmp/dkb-rescore/batch5-tokens.json` § fabiocaverzasio
- gallery: siteinspire #6 Portfolio (2026-05-04 추출)
- script: `c:/tmp/dkb-rescore/batch5-fabio.mjs` (DNS 복구 + .ch 캡처)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | Vision 1440+375 실측 + .com → .ch DNS 복구 + DevTools 토큰 (128/180, tier-3 — Batch 5 #7) |

## 후속 보정 권고
1. Helvetica Now Display Monotype 라이선스 확인 (외부 차용 시)
2. 3-tier `--typography-{desktop|tablet|smartphone}` → `patterns/build/explicit-device-tier-tokens.md` 신규 등재 검토 (rare 시그니처)
3. siteinspire 등록 도메인 vs 라이브 도메인 mismatch — siteinspire 검수 정책 검토
4. Pure black 1인 포트폴리오 → DKB ranking에 -3 패널티 적용 일관성 점검
