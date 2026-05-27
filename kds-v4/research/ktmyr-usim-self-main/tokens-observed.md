# Tokens Observed — 셀프개통 (USIM/eSIM)

> 타겟 사이트의 색·간격·타이포·radius 관찰값 모음. **시안 작업에서는 직접 사용 금지** — KDS 시맨틱 토큰으로 매핑 대상.

## 색상 팔레트 (출현 빈도순, 데스크탑 전수 스캔)

| Hex | 빈도 | 역할 추정 | 매핑 제안 (KDS) |
|---|---|---|---|
| `#333333` | 109 | 기본 본문 텍스트 (large body) | `text.primary` (`gray.900` 영역) |
| `#888888` | 97 | 보조 텍스트·라벨 | `text.secondary` (`gray.500~600`) |
| `#000000` | 65 | 헤딩 (H1·H2 강조)·LNB active | `text.primary` |
| `#646464` | 34 | 본문 보조 | `text.secondary` |
| **`#6B3BE9`** | 34 | **메인 CTA / step 인디케이터 / Hero 다크 배경** = **Brand Purple Primary** | KDS primitive `purple.500` 영역 — 가장 가까운 KDS purple 토큰 채택 |
| `#777777` | 29 | 가격 정가 표기·기타 보조 | `text.secondary` |
| `#555555` | 26 | 본문 sub-tone | `text.secondary` |
| **`#499690`** | 14 | **로고 "알" 강조 + 헤더 로고 영역** = **Brand Teal (Accent Secondary)** | KDS primitive `teal.500` 또는 `teal.300` (이 화면에서는 로고 한정 사용이라 KDS 의 `kt-mvno` 로고 색을 그대로 보존 — KDS 토큰 매핑은 brand override 영역) |
| `#F7F8FA` / `#F8F9FC` | 12·6 | 섹션 배경 (가이드 섹션) | `bg.surface-soft` / `surface.muted` |
| `#666666` | 12 | 본문 약한 톤 | `text.secondary` |
| `#AAAAAA` | 12 | placeholder·disabled 텍스트 | `text.tertiary` |
| `#E9ECF5` | 9 | **`상세보기` 버튼 배경 (회색 보조 CTA)** | `bg.surface-strong` 또는 `fill.tertiary` (밝은 회색 버튼 배경) |
| `#7B828E` | 7 | 보조 회색 | `text.secondary` |
| `#EBEBEB` | 6 | 카드 보더·구분선 | `border.subtle` |
| `#E0E2FF` | 4 | 보라 보조 (연한 라일락) | `fill.accent-primary` 의 hover/secondary 영역 |
| `#636DFF` | 4 | 보조 보라 (좀 더 푸른 보라) | (관찰 빈도 낮음 — 보조 액센트로 추정) |
| `#EC1B23` | 4 | **빨강 강조** (sub-tab `유심/eSIM` 밑줄·active indicator 추정) | KDS `fill.accent-primary` 의 red 토큰 — KT 본 브랜드 컬러로 보임 (이 화면에서는 LNB/sub-tab 의 active 강조에만 사용) |
| `#85DCDD` / `#C3DDDB` / `#8ABCB8` | 3·2·1 | 연한 teal·민트 (보조) | `teal.300` 영역 (보조) |
| `#B8B8FF` (관찰: step 보더) | - | **step 원형 인디케이터의 라일락 보더 4px** | KDS purple 토큰의 light 변형 (예: `purple.100` 또는 `purple.200`) |
| `#77738B` | 1 | hero 페이지네이션 비활성 dot | `fill.tertiary` 또는 `border.subtle` |
| `#DDDDDD` (요금제 카드 border) | - | 카드 보더 | `border.subtle` |

> KDS 토큰의 정확한 매핑은 디자이너가 `kds/tokens/color.semantic.light-default.json` 과 비교하며 결정. brand override (Purple Primary) 는 CLAUDE.md "Accent Primary 대체 규칙" 에 따라 KDS primitive `purple.x00` 안에서 채택.

## 폰트

- **family**: `Pretendard, Roboto, "Noto Sans KR", sans-serif` (모바일·데스크탑 동일)
- **헤딩 weight**: 700 (모바일 H2 16px, 데스크탑 H2 18px) — **로그인 페이지의 32px 강한 헤딩보다 가벼움**. 셀프개통은 H3 (hero) 가 weight 400 / 20~26px 의 *큰 lighter heading* 톤을 적극 사용 (brand 의 light heading 시그니처와 정합)
- **본문 weight**: 400~600
- **버튼 weight**: 600

## Typography 관찰

| 역할 | 모바일 | 데스크탑 | 매핑 제안 (KDS) |
|---|---|---|---|
| Hero H3 (캐러셀 제목) | 20px / weight 400 / lh 26 | 26px / weight 400 / lh 34 | `typography.title-1` 또는 `title-2` — **light heading** 변형 |
| Section H2 (`셀프개통 가능시간`, `추천 요금제`, `셀프개통 FAQ`) | 20px / weight 700 / lh 20 (info_summary) / 일반은 16px | 18~22px / weight 700 | `typography.title-2` (H2 표준) |
| Step 인디케이터 숫자 | 14px / weight 700 / lh 14 | 16px / weight 700 | `typography.label-1` (작은 강조) |
| 본문 (FAQ Q·유의사항·정보) | 14~16px / weight 400 / lh ≈1.4 | 14~16px / weight 400 | `typography.body-1` / `body-2` |
| 보조·라벨·가격 정가 | 12~14px / weight 400 | 12~14px | `typography.label-2` / `caption` |
| 가격 강조 (할인 후) | 추정 26~32px / weight 700 | 26~32px / weight 700 | `typography.heading-3` 또는 별도 `price-display` |
| 버튼 라벨 | 16px / weight 600 / lh 50 (PC) | 16px / weight 600 | `typography.label-1` (button 컴포넌트 표준) |
| 메뉴 (GNB) | 16px / weight 700 | 16px / weight 700 | `typography.label-1` |
| Footer 본문 | 10~12px / weight 400 | 10~12px | `typography.caption` |

> 페이지 전반의 묶음 컨테이너 (`body`, `header`, `main`) 의 `font-size: 10px` 는 reset/base — 실제 화면 텍스트는 자식 요소가 명시 지정. 무시.

## Spacing

| 구간 | 관찰값 | 매핑 제안 (KDS spacing.json) |
|---|---|---|
| 모바일 좌우 padding | 20px | `space-20` |
| 데스크탑 좌우 padding | 28px (header) / 컨텐츠 wrap auto | `space-28` 등가 (KDS 토큰 검증 필요 — 없으면 `space-32`) |
| 섹션 세로 padding | 50px / 60px / 90px (섹션별) | `space-48` / `space-64` / `space-96` 영역에서 선택 |
| Hero 영역 padding | 90px 0 (PC) | `space-96` |
| 가이드 섹션 패딩 | 0 (배경만 변경 + 내부 컨텐츠가 자체 패딩) | - |
| 추천 요금제 섹션 패딩 | 90px 0 (PC) / 50px 20 (mobile) | `space-96` / `space-48 + space-20` |
| step list 가로 gap | 28px | `space-28` (KDS 없으면 `space-32`) |
| step item 내부 gap | 16px | `space-16` |
| info_summary li gap | 14px | `space-12` 또는 `space-16` (KDS 토큰 안에서 가장 가까운 값) |

## Radius

| 요소 | 관찰값 | 매핑 제안 (KDS radius.json) |
|---|---|---|
| Hero 카드 / info_summary | 30px | KDS 토큰 밖 — **가장 가까운 `radius-24` 또는 `radius-32`** (KDS 토큰 실제값 확인 필요) |
| 요금제 카드 | 20px | KDS 토큰 밖 — **가장 가까운 `radius-16` 또는 `radius-24`** |
| FAQ 카드 | 12px | `radius-12` |
| 메인 CTA (`5분 만에 셀프개통 하기`) | 10px | KDS 토큰 밖 — **가장 가까운 `radius-8` 또는 `radius-12`** |
| 일반 button (가입하기 / 상세보기 / btn 기본) | 8px | `radius-8` |
| Step 원형 | 50% (circle) | `radius-circle` (= 999) |
| Hero pagination dot | 100% (circle) | `radius-circle` |

> **주의**: 타겟의 30px / 20px / 10px radius 는 KDS 토큰 (4 / 8 / 12 / 16 / 24 / 32 / circle) 사이에 끼는 값. 디자이너는 가장 가까운 KDS 토큰으로 매핑 (시안 기준 30 → 24 또는 32, 20 → 16 또는 24, 10 → 8 또는 12).

## Border / Shadow

- 요금제 카드: `1px solid #DDD` 보더 (그림자 없음)
- step 원형: `4px solid #B8B8FF` (라이트 라일락 보더 — 핵심 시각 시그니처)
- 그 외 카드/FAQ: 보더·그림자 거의 없음 (배경 컬러 차이로 구분)
- elevation 사용 약함 — 평면 카드 (flat card) 톤

## 컴포넌트 사이즈 관찰

| 컴포넌트 | 관찰 폭/높이 | KDS 사이즈 토큰 매핑 |
|---|---|---|
| 메인 CTA (보라 풀폭) | 335×54 (mobile) | **button XLarge 56** 에 매핑 (54 → 56) |
| 카드 안 가입/상세 액션 | 141×46 | **button Medium 44** 에 매핑 (46 → 44, KDS 표준 토큰) |
| Step 원형 | 40 (mobile) / 48 (PC) | KDS step indicator 컴포넌트 가이드 검토 (별도 컴포넌트일 가능성) |
| GNB 링크 | h 16 (text only) | label 위주, 폭은 텍스트 자연폭 |
| LNB chip | (height 미측) | KDS `chip 36` 으로 매핑 (KDS 표준 chip 사이즈) |
| 페이지 sub-tab | text only | KDS `tab 48` (밑줄 형식이라면) |
| 헤더 | 60 (mobile) / 80 (PC) | KDS `top-navigation 52` 와 다름 — KDS 표준 따르면 모바일 52 / PC 별도 (CLAUDE.md 의 top-navigation 토큰 = 52) |
| FAQ 카드 | h 68 (mobile) | KDS 토큰 매핑 검토 (FAQ accordion 표준 사이즈 확인) |

> 모든 사이즈는 시안 작업 시 **KDS 컴포넌트 사이즈 토큰** 으로 정합. 관찰값이 토큰 밖이면 가장 가까운 KDS 토큰 채택.

## 모션 (관찰)

- Hero 캐러셀 auto-rotate 없음 (수동 swipe)
- step 인디케이터 active 변화 시 별도 모션 안 보임 (CSS hover/click 정도)
- KDS `motion.txt` 적용 시 transition timing 은 KDS 표준 사용

---

**요약**: 이 화면은 KT 마이알뜰폰의 **Purple 시그니처 (Accent Primary = #6B3BE9 + 라일락 보더)** 를 강하게 사용한 컨버전 페이지. red (`#EC1B23`) 는 sub-tab active 의 강조에만 한정 등장 — KT 본 브랜드 컬러의 잔존으로 보이나 메인이 아님. **시안 작업 시 Purple 을 Accent Primary 로 두고, KDS purple primitive 토큰 안에서 매핑**. Teal 은 이 화면에서 거의 미사용 (로고 한정) — 셀프개통 영역에서는 Accent Secondary 자리도 비워둘 가능성. 라디우스가 KDS 토큰 사이에 끼는 값이 많음 (30/20/10) — 가장 가까운 KDS 토큰 매핑 필요.
