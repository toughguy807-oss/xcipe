# DKB Aesthetic Rubric v1.0 — 18-Axis

**도입일**: 2026-04-30
**총점**: 180점 (18축 × 10점)
**적용**: dkb-analyze, design-replicate, publish-visual-verify --mode=design

## 채점 체계

| 임계 | 판정 |
|------|------|
| 145+ | PASS (references 등재 + 시안 통과) |
| 130~144 | CONDITIONAL (수정 후 재채점) |
| <130 | FAIL (재생성 또는 대안 모색) |

**축별 5점 미만 1개 즉시 에스컬레이션** (전체 평균 무관) — 약점 축 강화 우선.

## 18축 정의

### 표면 토큰 (L1) — 4축

#### L1-1 Typography
| 점수 | 기준 |
|------|------|
| 0 | Inter/Roboto + 깨짐 |
| 5 | Pretendard 단일 + 고정 px |
| 10 | Variable font + 극단 weight 대비(100 vs 900) + fluid clamp + text-wrap: pretty |

#### L1-2 Color
| 점수 | 기준 |
|------|------|
| 0 | 퍼플 그라디언트 #6366F1 + pure #000 / 8색+ 잡탕 |
| 5 | Hex 2-tier + black shadow / 4~5색 + 1 accent |
| 10 | OKLCH 3-tier + 단일 accent (면적 10~15%) + tinted shadow + P3 gamut |

#### L1-3 Color Subtlety
| 점수 | 기준 |
|------|------|
| 0 | Pure #FFF / #000 사용 |
| 5 | 약간 톤다운 (#FAFAFA급) |
| 10 | Off-white #FAFAF7 정밀 + 자연 톤 액센트 (Coral/Terracotta) |

#### L1-4 Trend Currency
| 점수 | 기준 |
|------|------|
| 0 | 2020년 톤 (글래스모피즘 / 보라 그라디언트) |
| 5 | 2023년 톤 |
| 10 | 2025-2026 최신 (`:has()`, container query, OKLCH, view-transitions) |

### 정밀도 (L2) — 4축

#### L2-1 White Space
| 점수 | 기준 |
|------|------|
| 0 | Hero 콘텐츠 점유 80%+ 빽빽 |
| 5 | 50~60% |
| 10 | 35~45% (절제 — 어워드 시그니처) |

#### L2-2 Typo Hierarchy
| 점수 | 기준 |
|------|------|
| 0 | weight 동일, size 1.5× |
| 5 | weight 200차, size 2.5× |
| 10 | weight 600차+, size 3.5× + 섹션 라벨(영문 lowercase) + 큰 타이틀 조합 |

#### L2-3 Korean Typography ★
| 점수 | 기준 |
|------|------|
| 0 | 영문 그대로 적용 |
| 5 | Pretendard 단독 |
| 10 | font-feature-settings + 자간 미세 + 행간 1.6~1.8 + word-break: keep-all |

#### L2-4 Image Tonality
| 점수 | 기준 |
|------|------|
| 0 | placeholder 다수 |
| 5 | 일부 일관 |
| 10 | 100% 후처리 일관 (sepia/B&W/desaturate) + 단일 톤 분포 |

### 구성 논리 (L3) — 8축

#### L3-1 Asymmetric Layout
| 점수 | 기준 |
|------|------|
| 0 | 3-col 카드 grid 반복 3+건 |
| 5 | 2-col + asymmetric 1건 |
| 10 | Bento + Editorial + 비대칭 6:4/7:3 + 카드 그리드 변주 (3+4) |

#### L3-2 Grid Depth
| 점수 | 기준 |
|------|------|
| 0 | flex만 |
| 5 | grid 12-col |
| 10 | Subgrid + Container Query + grid-template-areas |

#### L3-3 Motion Intent
| 점수 | 기준 |
|------|------|
| 0 | hover:scale(1.05) 일괄 / transition 일괄 |
| 5 | 기본 hover만 |
| 10 | hover translateY+shadow / 이미지 scale(1.03~1.05) / transition 0.2~0.3s / scroll-driven fade-up + stagger (transition-delay 0.05s × 8) |

#### L3-4 Interaction Craft ★
| 점수 | 기준 |
|------|------|
| 0 | 디테일 0 |
| 5 | 일부 미세조정 |
| 10 | 모든 인터랙션 micro-tuning (focus-ring / hover-delay / easing 차별) |

#### L3-5 Mobile Fidelity ★
| 점수 | 기준 |
|------|------|
| 0 | 단순 축소 |
| 5 | 일부 재배치 |
| 10 | 모바일 전용 시그니처 (햄버거 메뉴 / 풀스크린 nav / 모바일 전용 인터랙션) |

#### L3-6 LCP Visual Impact ★
| 점수 | 기준 |
|------|------|
| 0 | 빈 화면 / 텍스트만 로딩 |
| 5 | 텍스트 빠른 로딩 |
| 10 | 단계적 등장 (skeleton → content) + 의도된 LCP 이미지 + Hero 즉시 노출 |

#### L3-7 Visual Flow ★
| 점수 | 기준 |
|------|------|
| 0 | 시선 흐름 무관 |
| 5 | F/Z 패턴 일부 |
| 10 | Hero → 핵심정보 → CTA 명확 + 한 섹션 포커스 1개 |

#### L3-8 Visual Rhythm ★
| 점수 | 기준 |
|------|------|
| 0 | 백색 배경 반복 |
| 5 | 일부 교차 |
| 10 | 배경색 교차 + 이미지↔텍스트 교차 + 밀도 교차 (스크롤 리듬) |

### 본질 (L4) — 2축

#### L4-1 Content Weight
| 점수 | 기준 |
|------|------|
| 0 | Lorem/John Doe/"Empower"/"Seamless" |
| 5 | 일반 카피 / placeholder 일부 |
| 10 | 인용 가능한 단일 수치 + 구체 제품명 + 고유 카피 |

#### L4-2 Signature Element
| 점수 | 기준 |
|------|------|
| 0 | 표면 모방 |
| 5 | 1개 시그니처 |
| 10 | 시그니처 + 일관 적용 (예: Anthropic Coral 점, Vercel 네온) |

## ★ 한국 B2B 핵심 4축

L2-3 Korean Typo / L3-4 Interaction / L3-5 Mobile / L3-6 LCP

한국 B2B 프로젝트는 이 4축에 가중 ×1.5 적용 가능.

## 어워드 정밀도 4축

L3-7 Visual Flow / L3-8 Visual Rhythm — AX_landing 어워드 수치 흡수.

## 채점 자동화

| 단계 | 도구 | 토큰 |
|------|------|:---:|
| L1 (표면 토큰) | 정적 grep + tokens.css 파싱 | 0 |
| L2-1, L2-2 (여백·위계) | Vision LLM 캡처 분석 | 12K |
| L2-3 (한글) | 정적 grep (font-feature-settings 등) | 0 |
| L2-4 (사진 톤) | Vision LLM | (12K에 포함) |
| L3-1~L3-3 (레이아웃·모션) | 정적 grep + Vision | (12K에 포함) |
| L3-4~L3-8 (인터랙션·모바일·LCP·플로우·리듬) | Vision LLM | (12K에 포함) |
| L4-1 (콘텐츠) | 정적 grep (마케팅 카피 BLOCK 룰) | 0 |
| L4-2 (시그니처) | Vision LLM | (12K에 포함) |

→ **사이트 1개당 Vision LLM 1회 호출 ~12K 토큰**으로 18축 전수 채점 가능.

## 9축 → 18축 환산

기존 9축 채점 산출물:
- 9축 점수 × 2 = 18축 환산 점수 (근사)
- 단 한국 B2B 4축 + 어워드 4축은 별도 채점 필요
- 권장: 18축 전수 재채점

## 참조

- `lib/rules/dkb-policy.md` — DKB 정책
- `skills/publish-visual-verify` v2.0 — 18축 구현
- `agents/design-orchestrator.md` — DQG 마커 (18축 145+ 임계)
- `ref/anthropic-frontend-design.md` — Anthropic 5축 통합
