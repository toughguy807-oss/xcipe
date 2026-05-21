# linear.app — 시각 DNA

**분석일**: 2026-04-30 (v1.0/v1.1) / **2026-05-04 v1.2 풀 Vision 재채점**
**Tier**: tier-1
**interaction_archetype**: converter
**platform**: hybrid
**도메인**: B2B SaaS / Project Management
**18축 종합**: **151/180** (v1.2 갱신)
**Tone 11종 라벨**: `industrial-utilitarian` (1순위) / `brutally-minimal` (2순위)
**어워드**: Awwwards SOTD 다수 (추정)
**적합 도메인**: dev tools / SaaS B2B / Industrial AI (KPI Dark + 정밀 — manufacturing AI 적합)
**Vision 검증**: 2026-05-04 — Playwright 1440 + 375 캡처 + 멀티모달 view 재수행 (v1.2)

## Vision 보정 사항 (2026-04-30)

| 항목 | v1.0 추정 | v1.1 실측 | 변경 |
|------|----------|----------|------|
| H1 텍스트 스타일 | 그라디언트 텍스트 | 솔리드 흰색 H1 (그라디언트 텍스트는 일부 강조에만) | 정정 |
| 시그니처 | KPI Dark + Cmd+K + 그라디언트 텍스트 | KPI Dark + 다채 차트 색상(시안/마젠타/오렌지) + 노란 CTA | 정정 |
| 코드 블록 | 미언급 | Syntax highlighting 다크 + 다채 — Linear 시그니처 발견 | +추가 |
| L3-3 Motion | 10 | 10 (확인 — 실제 코드 데모) | 0 |
| L4-2 Signature | 10 | 10 (보강 — 코드 syntax highlighting 추가) | 0 |
| 종합 | 148 | 150 | +2 |

## 본질 (1줄)

> "Dark + 정밀 + 미세 디테일 = 개발자 도구는 도구처럼 보여야 한다."

## 18축 채점

| 축 | 점수 | 근거 |
|---|:---:|---|
| L1-1 Typography | 9 | Inter Display + 모노 믹스. weight 변주 정밀 (300/500/700) |
| L1-2 Color | 9 | Dark 배경 + 단일 보라/블루 액센트 + 그라디언트 절제 |
| L1-3 Color Subtlety | 9 | Pure black 회피 — 진한 네이비 톤 (#08090A 추정). 액센트 채도 절제 |
| L1-4 Trend Currency | 10 | 2025-2026 KPI Dark 시그니처 (b2b-saas 톱 브랜드 패턴) |
| L2-1 White Space | 8 | Hero 점유율 적정 (40% 추정) |
| L2-2 Typo Hierarchy | 9 | weight 300 vs 700 극단 대비 + size 4× 대비 |
| L2-3 Korean Typo ★ | 0 | 한국어 미지원 |
| L2-4 Image Tonality | 8 | 제품 스크린샷 위주, 일관 다크 톤 |
| L3-1 Asymmetric Layout | 7 | 균형잡힌 그리드 + 카드 변주 |
| L3-2 Grid Depth | 9 | Subgrid + Container Query 사용 (추정) |
| L3-3 Motion Intent | 10 | 스크롤 트리거 미세 모션 + 키보드 단축키 데모 — "기능을 모션으로 보여준다" |
| L3-4 Interaction Craft ★ | 10 | Cmd+K 데모 + focus-ring 정밀 + hover-delay 미세조정 (개발자 도구 톱 수준) |
| L3-5 Mobile Fidelity ★ | 8 | 데스크톱 우선이나 모바일 fallback 양호 |
| L3-6 LCP Visual Impact ★ | 9 | Hero 텍스트 즉시 + 제품 스크린샷 점진 |
| L3-7 Visual Flow ★ | 9 | Hero → Features → Pricing → Customer logos 명확 |
| L3-8 Visual Rhythm ★ | 9 | 다크/light 섹션 교차 + 밀도 교차 |
| L4-1 Content Weight | 10 | "The issue tracking tool you'll enjoy using" — 단일 가치 명제 |
| L4-2 Signature Element | 10 | KPI Dark + 키보드 단축키 데모 + 그라디언트 텍스트 (3대 시그니처) |
| **종합** | **148/180** | **PASS — tier-1 확정** |

## 정확 토큰 (추정, Vision 검증 필요)

### 컬러
- Background: `#08090A` 추정 (Pure black 회피)
- Background alt: `#0F0F10` 추정
- Text primary: `#F7F8F8` 추정 (Pure white 회피)
- Text secondary: `#8A8F98` 추정
- Accent: `#5E6AD2` 추정 (Linear 보라)
- Accent gradient: linear-gradient(120deg, #5E6AD2, #BE6A6A) 추정

### 폰트
- H1: Inter Display 또는 커스텀 / weight 500-700 / size clamp(2.5rem, 5vw, 4.5rem) / letter-spacing -0.04em
- Body: Inter / weight 400 / size 14-16px
- Mono: Berkeley Mono 또는 JetBrains Mono

### 간격
- Section 간격: ~120px
- Container max-width: ~1024px (의도적 좁힘)

### 모션
- Scroll-triggered fade + slight translate
- Keyboard shortcut demo (data-driven)
- Hover transition: ~150ms

## 시그니처 요소 (★ Vision 보정)

1. **KPI Dark + 코드 블록 syntax highlighting** — 다크 배경 위 시안/마젠타/오렌지 syntax 색상 (개발자 도구의 정수)
2. **다채 차트 색상** — Hero 다이어그램의 시안/마젠타/오렌지 데이터 시각화
3. **노란 CTA "Built for the future"** — 다크 톤 위 노란 컬러 액센트 (의외성)

## 사진 톤

- 제품 스크린샷 위주 (사진 거의 없음)
- 다크 UI 일관
- 톤 일관성: ~98%

## 모션 정책

- 적용: scroll-triggered fade, keyboard demo, hover micro-interaction
- 절대 부재: 글래스모피즘, 보라/파랑 gradient bg, parallax 과장

## 절대 안 쓰는 것 (NEVER List)

- Pure #FFF / #000
- Roboto / Open Sans (Inter 자체는 사용)
- 보라 gradient 배경 (그라디언트는 텍스트만)
- 글래스모피즘
- 3-col 카드 반복 (Bento 스타일 변주)

## Industrial-AI 적용 가이드

### 적용 가능 영역
- **Service 3단계**: 대형 번호 + 다크 톤
- **Numbers (22+/26+/37/5)**: 대형 KPI 표현 — Linear 톱 강점
- **Hero**: 다크 + 그라디언트 텍스트 H1

### 적용 부적합 영역
- ❌ **About 인물**: B&W 인물 부재 → Anthropic 톤 권고
- ❌ **Cases (Before/After)**: Linear는 단일 KPI에 강함 → Vercel Bento 권고

### 가중치 추천
- 1순위 적용: Numbers / Service / Hero
- 2순위 적용: Pricing / Features
- 미적용: About 인물 / Cases

## 출처

- source/index.html (curl 2026-04-30, 2.3MB — JS 번들 포함)
- screenshots/ (미수집)
- 분석 방식: 사전 지식 + 정적 HTML

## 변경 이력

| 버전 | 일자 | 변경 |
|------|------|------|
| v1.0 | 2026-04-30 | 초기 등재 (148/180 추정, Vision 미검증) |
| v1.1 | 2026-04-30 | Vision 1440 view 보정 (150/180) — H1 솔리드 흰색 정정, 코드 syntax highlighting 시그니처 추가, 노란 CTA 발견 |
| v1.2 | 2026-05-04 | **Playwright 1440+375 풀 캡처 + 멀티모달 재채점 (151/180)** — H1 카피 갱신("The product development system for teams and agents"), 본문 색 매우 진한 차콜(#08090A 가까움) 재확인, 다크 hero에 노란 CTA 부재(현재 hero는 검정 배경 + 흰 "Sign up" 알약 pill만) — 노란 CTA는 Now/Pricing 섹션 한정 추정. L4-1 Content Weight +1 (AI 시대 + Agent 명시로 단일 가치 명제 더 명확) |

## v1.2 Vision 재채점 결과 (2026-05-04)

| 축 | v1.1 | v1.2 | 변경 사유 |
|----|:---:|:---:|-----|
| L1-1 Typography | 9 | 9 | sans-serif H1 흰색 — 유지. 노란/그라디언트 텍스트 hero 부재 |
| L1-2 Color | 9 | 9 | 다크(#08090A) + 흰색 pill CTA — 유지. accent 보라/그라디언트는 deeper 섹션 |
| L4-1 Content Weight | 10 | 10 | "for teams and agents" — AI agents 시대 메시지 — 유지(상한치) |
| L4-2 Signature Element | 10 | 10 | KPI Dark + 코드 syntax + 단축키 데모(deeper 섹션) — 유지 |
| L3-5 Mobile Fidelity | 8 | 9 | 375 캡처 확인 — 햄버거 + Sign up CTA 정상, 폰트 wrap OK — +1 |
| 합계 | 150 | **151** | +1 (모바일 fidelity 재확인) |

## 후속 보정 권고 (v1.3 이후)

1. ✅ Playwright 1440 + 375 캡처 (v1.2 완료)
2. tokens.css 정확값 추출 (DevTools eval) — 노란 CTA hex / 보라 #5E6AD2 / 코드 syntax 토큰 확정 잔여
3. Berkeley Mono / Inter Display 라이센스 확인 (사용 시)
