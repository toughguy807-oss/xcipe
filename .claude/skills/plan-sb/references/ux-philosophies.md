# UX Philosophies — 화면 단위 UX 패턴 카탈로그

> **위치**: 이 문서는 **화면 UX 관점**의 패턴(Progressive Disclosure / Wizard 등)을 다룹니다.
> **element/JSON 수준**의 패턴은 [`wireframe-patterns.md`](./wireframe-patterns.md) 참조.
>
> **출처**: claude-wireframe 스킬에서 흡수 (2026-05-12). 5종 옵션 탐색 시 Option 2~5의 UX 철학 후보로 사용.

---

## 목차

1. [22종 UX 철학](#1-22종-ux-철학)
2. [Optimization Goal Lens](#2-optimization-goal-lens)
3. [Quality Checks (4축)](#3-quality-checks-4축)
4. [Anti-Patterns — 시각](#4-anti-patterns--시각)
5. [Anti-Patterns — Generic AI Aesthetics](#5-anti-patterns--generic-ai-aesthetics)
6. [Style Tokens — Warmth vs Precision](#6-style-tokens--warmth-vs-precision)

---

## 1. 22종 UX 철학

5종 옵션 탐색(Mode A `--explore` 플래그) 시 Option 1은 항상 Safe(기존 패턴 확장), Option 2~5는 아래에서 선택.

| # | 패턴 | 핵심 | 적합 케이스 |
|---|------|------|-----------|
| 1 | **Progressive Disclosure** | 1차 정보 노출 → 필요 시 확장 | 복잡한 폼/설정, 정보 과부하 회피 |
| 2 | **Dashboard-First** | 핵심 지표 상단 배치 + 드릴다운 | 관리자, 데이터 분석, KPI |
| 3 | **Wizard / Step-by-Step** | N단계 분할 + 진행 표시 | 회원가입, 결제, 마법사 폼 |
| 4 | **Hub-and-Spoke** | 중앙 허브 → 방사형 진입 | 메인 → 카테고리, 마이페이지 |
| 5 | **Inline Editing** | 클릭 즉시 편집 가능 | 빠른 수정, 관리자 |
| 6 | **Split View** | 좌측 목록 + 우측 상세 | 이메일, 파일 탐색기, 채팅 |
| 7 | **Card-Based** | 카드 그리드 + 호버/탭 액션 | 콘텐츠 갤러리, 상품 목록 |
| 8 | **Conversational** | 대화형 UI (챗봇/Q&A) | 챗봇, 가이드 투어 |
| 9 | **Kanban / Column** | 칸반 보드 (To Do / Doing / Done) | 프로젝트 관리, 작업 흐름 |
| 10 | **Timeline** | 시간순 흐름 (수직/수평) | 활동 로그, 히스토리 |
| 11 | **Search-First** | 검색바 최상단, 필터 좌측 | 대량 데이터, 카탈로그 |
| 12 | **Contextual Actions** | 마우스 위치 기반 액션 노출 | 인라인 메뉴, 텍스트 편집기 |
| 13 | **Feed-Based** | 무한 스크롤 피드 | 소셜, 뉴스, 추천 |
| 14 | **Spatial / Map-Centric** | 지도 중심 + 핀 클릭 상세 | 부동산, 여행, 위치 검색 |
| 15 | **Gesture-Driven** | 스와이프/드래그 위주 | 모바일, 카드 덱 |
| 16 | **Command Palette** | ⌘K 키보드 진입점 | 개발자 도구, 파워유저 |
| 17 | **Notification-Driven** | 우측 패널/배지 중심 | 알림함, 인박스 제로 |
| 18 | **Floating Action** | FAB 1개 + 컨텍스트 액션 | 모바일 주요 액션, 글쓰기 |
| 19 | **Comparison Table** | 행 = 옵션, 열 = 속성 | 상품 비교, 요금제 |
| 20 | **Drag-and-Drop** | 자유로운 재배치 | 빌더, 우선순위 정렬 |
| 21 | **Accordion / Collapsible** | 섹션 접기/펼치기 | FAQ, 긴 설정 페이지 |
| 22 | **Gamified Progress** | 진행률 + 보상 시각화 | 온보딩, 학습, 챌린지 |

**선택 규칙**:
- Option 1 = Safe (기존 패턴 확장, design-context 기반)
- Option 2~5 = 위 22종 중 4개 선택, **서로 다른 철학** 의무 (예: Wizard + Dashboard-First + Split View + Conversational)
- Option 1과 동일 계열 금지 (Card-Based가 Safe면 Option 2~5에 Card-Based 변형 금지)

---

## 2. Optimization Goal Lens

기획 의도가 명확할 때 22종 중 후보군 축소에 사용.

| 목표 | 우선 후보 패턴 |
|------|---------------|
| **More conversions** | Wizard / FAB / Card-Based / Comparison Table |
| **Less drop-offs** | Progressive Disclosure / Wizard / Accordion |
| **More time on page** | Feed-Based / Card-Based / Spatial / Timeline |
| **Better discoverability** | Search-First / Hub-and-Spoke / Dashboard-First / Command Palette |

기획 단계에서 사용자가 목표를 명시한 경우 해당 lens로 Option 2~5 후보를 좁힌다.

---

## 3. Quality Checks (4축)

5종 옵션 출력 직전 셀프 게이트.

| 축 | 기준 | 실패 신호 |
|----|------|----------|
| **Swap Test** | 브랜드 가려도 식별 가능한가? | "어느 앱이든 똑같아 보임" → 개성 부족 |
| **Squint Test** | 흐릿하게 봐도 1차 액션/네비/콘텐츠 위계 식별되는가? | 위계 미명확 → 정보 평탄화 실패 |
| **Signature Test** | 한 가지 distinctive 요소가 있는가? | 일반화된 grid/카드만 → 기억 안 남음 |
| **Token Test** | 선택한 토큰 세트(Warmth/Precision) 일관 적용? | warm 팔레트 + sharp 보더 혼용 → 불일치 |

**적용 위치**: sb-wf-design Step 1.5 검수에 추가.

---

## 4. Anti-Patterns — 시각

5종 옵션 또는 색상 시안 단계에서 자주 발생하는 4종 시각 결함.

| # | 결함 | 검출 신호 | 수정 가이드 |
|---|------|----------|-----------|
| 1 | **Decorative borders overlapping content** | `border-top: 3px` 추가했는데 `padding-top` 없음 → 텍스트와 라인 겹침 | border 추가 시 같은 방향 padding ≥ 16px 보장 |
| 2 | **Full-width sections clipped by parent** | hero/banner가 `max-width` 컨테이너 안에 있어 좌우 잘림 | `width: 100vw; margin-left: calc(-50vw + 50%);` 또는 컨테이너 break-out |
| 3 | **Flat backgrounds where gradients specified** | `linear-gradient(135deg, #f0f0f0, #f1f1f1)` 같은 무감각 gradient | gradient stop 간 ΔL ≥ 8% (e.g., `#e8f5e9 → #a5d6a7`) |
| 4 | **Content escaping browser frame** | 음수 margin / absolute positioning이 프레임 밖으로 나감 | frame 컨테이너에 `overflow: hidden` |

**적용 위치**: sb-wf-design Step 1.5 검수 + publish-visual-verify Phase 1 Grep 패턴에 흡수.

---

## 5. Anti-Patterns — Generic AI Aesthetics

LLM이 학습 분포 평균값으로 회귀할 때 나타나는 10종 패턴.

| # | 패턴 | 회피 가이드 |
|---|------|-----------|
| 1 | Inter + purple gradient on white | Inter 쓰려면 비예측 팔레트 페어링 |
| 2 | Gratuitous glassmorphism | 목적 없는 frosted glass 금지 |
| 3 | Rainbow gradients as accents | gradient는 1개 위치만 (hero or CTA, not both) |
| 4 | Identical 3-card grids | 카드 수/높이/구성 variation 의무 |
| 5 | Oversized hero + centered text | 좌측 정렬 또는 asymmetric 시도 |
| 6 | Blue primary + gray secondary | 의도적 페어링 (예: 다크 그린 + 코랄) |
| 7 | Decorative blobs / abstract shapes | 구조 무관 장식 금지 |
| 8 | Excessive border-radius (pill everything) | radius 위계 (12px 카드 / 4px 입력 / 999px 뱃지만 pill) |
| 9 | Low-contrast pastel text | WCAG AA 4.5:1 검증 |
| 10 | Shadows with mismatched light source | 페이지 전체 그림자 방향 통일 |

**적용 위치**: design-replicate / design-knowledge 적용 가능. plan-sb는 와이어 단계라 1·5·7만 해당.

---

## 6. Style Tokens — Warmth vs Precision

5종 옵션의 색상 시안 단계(plan-sb 범위 외, design-replicate 영역)에서 사용. plan-sb는 흑백 와이어 단계라 직접 적용하지 않으나, 토큰 분기 기준은 참고.

### Warmth & Approachability (Consumer Apps)

| 토큰 | 값 |
|------|-----|
| Palette | `#1a1a1a` (text) / `#6b5b4f` (sec) / `#d4a574` (accent) / `#f5f0eb` (surface) / `#faf8f5` (bg) |
| Spacing | 24px container / 16px elem / 48px section |
| Radius | 8px card / 6px button / 12px modal |
| Shadow | `0 2px 8px rgba(107,91,79,0.08)` |
| Typo | Inter or system sans, 16px base, line-height 1.6 |

### Precision & Density (Admin / Dashboard)

| 토큰 | 값 |
|------|-----|
| Palette | `#0f172a` / `#475569` / `#3b82f6` / `#f1f5f9` / `#f8fafc` |
| Spacing | 16px container / 8px elem / 24px section |
| Radius | 4px card / 4px button / 8px modal |
| Shadow | 최소 — 1px border (`#e2e8f0`) 우선 |
| Typo | system fonts, 14px base, line-height 1.4 |
| Density | 32px row table, inline status badge |

**분기 기준**: 컨슈머 서비스 / B2C → Warmth. 어드민 / 대시보드 / 내부 도구 → Precision.

---

## 변경 이력

- 2026-05-12: claude-wireframe SKILL.md / design-taste.md에서 흡수 신설.
