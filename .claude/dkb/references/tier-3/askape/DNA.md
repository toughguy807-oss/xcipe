# askape (askape.com / Ape AI) — 시각 DNA

**분석일**: 2026-05-06
**Tier**: tier-3 (122/180)
**interaction_archetype**: converter
**platform**: hybrid
**도메인**: AI 트레이딩 플랫폼 / 핀테크 인사이트 / 마스코트 캐릭터 브랜드
**18축 종합**: **122/180**
**Tone 11종 라벨**: `playful-toy` (1순위) / `editorial-magazine` (2순위)
**어워드**: lapa.ninja Top 10 (2026-05-04)
**적합 도메인**: AI 트레이딩 / 핀테크 컨슈머 / 마스코트 캐릭터 브랜드 / warm-cream playful
**Vision 검증**: 2026-05-06 — Playwright 1440 + 375 캡처 + DevTools eval
**출처**: lapa.ninja Top 10 #10 (2026-05-04)

## 본질 (1줄)

> "warm cream BG + 갈색 거대 H1 + 원숭이 마스코트 캐릭터 hero + 진청색 CTA pill — AI 트레이딩의 playful 핀테크."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 7 | Inter sans + 거대 H1 (갈색 #5C3A1E 추정) — playful 사인 |
| L1-2 Color | 7 | warm cream `#FFFFFD` + 진청 CTA + 갈색 텍스트 + 베이지 (anthropic-warm-cream variant) |
| L1-3 Color Subtlety | 7 | warm tint Pure white 회피 + 갈색 그라디언트 텍스트 |
| L1-4 Trend Currency | 7 | 2026 마스코트 캐릭터 + warm-cream 트렌드 |
| L2-1 White Space | 8 | hero 풀폭 + 마스코트 우측 워터마크 + 중앙 H1 |
| L2-2 Typo Hierarchy | 7 | H1 거대 + 부제 + CTA pill 3단 |
| L2-3 Korean Typo ★ | 5 | 한글 부재 |
| L2-4 Image Tonality ★ | 8 | 원숭이 마스코트 + 우측 워터마크 그룹 (Twitter handles 도구) — playful 일관 |
| L3-1 Asymmetric Layout | 7 | 우측 마스코트 워터마크 (서브틀) + 중앙 hero — 약 비대칭 |
| L3-2 Grid Depth | 7 | 마스코트 z-1 + 텍스트 z-2 합성 |
| L3-3 Motion Intent | 6 | 추정 — 마스코트 idle 모션 |
| L3-4 Interaction Craft | 7 | nav (Features/Companions/Guides/FAQ) + Login/Join 정밀 |
| L3-5 Mobile Fidelity ★ | 7 | 375 캡처 정합 |
| L3-6 LCP Visual Impact ★ | 8 | 거대 갈색 H1 + 마스코트 즉시 임팩트 |
| L3-7 Visual Flow ★ | 7 | logo → H1 → 부제 → CTA → 마스코트 명확 |
| L3-8 Visual Rhythm | 7 | warm cream + 진청 + 갈색 3톤 변주 |
| L4-1 Content Weight | 7 | "Your AI edge in every trade" + "No more guessing. No more noise." 명확 |
| L4-2 Signature Element | 8 | **원숭이 마스코트 + warm cream BG + 진청 CTA pill + 갈색 그라디언트 H1** (4대 시그니처) |
| **종합** | **122/180** | **PASS — tier-3 등재 (110~144 범위)** |

## 정확 토큰 (실측, 2026-05-06)

### 컬러
- Background body: `rgb(255, 255, 253)` (#FFFFFD) ⚠️ ✅ Pure white 회피 (warm tint)
- 텍스트 primary: `rgb(9, 9, 11)` (#09090B) ✅ Pure black 회피 (warm 다크)
- CTA color: `rgb(130, 121, 111)` (회색-갈색 톤 — Login)
- Join CTA: 진청 BG (추정 `#1E40AF` 추정)
- CSS vars: 556개 (rich token system — Tailwind 추정)

### 폰트
- Body: **Inter, system-ui** / 시스템 fallback
- H1: 자체 추정 (h1 element null — 부모 div 캡쳐 필요)
- 시그니처: Inter + 갈색 거대 디스플레이 텍스트

### 간격
- CTA pill: border-radius 4px (Login) / pill rounded (Join)
- padding: 0px 16px

### 모션
- 추정: 마스코트 idle wiggle + CTA hover

## 시그니처 요소

1. **원숭이 마스코트 캐릭터** — playful AI 트레이딩 시그니처
2. **warm cream `#FFFFFD` + 갈색 `#5C3A1E` 거대 H1** — anthropic-warm-cream variant
3. **진청 CTA pill rounded** — 핀테크 trust 시그니처
4. **우측 마스코트 워터마크 그룹** (Twitter handles 도구) — 절제 z-1

## 사진 톤
- 원숭이 마스코트 100% (logo 미니어처 + hero 마스코트)
- 워터마크 도구 그룹 (베이지 톤 일관)

## 모션 정책
- 적용: 마스코트 idle + CTA hover
- 절대 부재: cinematic dark, neon glow

## 절대 안 쓰는 것 (NEVER List)
- 다크 BG (warm-cream 라이트 정책)
- glassmorphism
- 비대칭 maximalist

## 적용 가이드 (warm-cream playful 1순위)
- **AI 트레이딩 / 핀테크 컨슈머 / 마스코트 캐릭터 브랜드** 1순위
- **warm cream BG (`#FFFFFD` ~ `#F0EEE6`) + 갈색 텍스트** 차용
- **진청 CTA pill** trust 시그니처
- **마스코트 캐릭터 hero** (anthropic + 코랄 variant 대체)

### 적용 부적합
- ❌ Frontier AI 다크 (scale-pure-black 권고)
- ❌ Editorial 인물 (cinematic-photo-hero 권고)
- ❌ 한국 SI (lgcns-mint-pastel 권고)

## 출처

- screenshots: `c:/tmp/dkb-rescore/askape-{desktop,mobile}.png` (2026-05-06)
- tokens: `c:/tmp/dkb-rescore/batch2-tokens.json` § askape
- gallery: lapa.ninja Top 10 #10 (2026-05-04)

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-05-06 | 초기 등재 (122/180) — Vision 1440+375 + DevTools 토큰 + tier-3 게이트 통과 |

## 후속 보정 권고
1. H1 폰트 정확 추출 (h1 element 부재 — 직접 inspect)
2. 마스코트 idle 모션 비디오 캡처
3. patterns/color-systems/anthropic-warm-cream.md Variant C 추가 (askape `#FFFFFD` + 갈색 + 진청 CTA — fintech 마스코트 변종)
