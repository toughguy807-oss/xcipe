# 관찰 토큰 — ktmyr-login

> 원본 사이트의 실제 색·간격·타이포 raw 값. **시안에서는 절대 그대로 사용하지 말고 KDS 토큰으로 치환**. 이 파일은 분석 참고용.

수집일: 2026-05-18
방법: Playwright `getComputedStyle()` + 색 빈도 집계 (모바일/데스크탑 viewport 둘 다)

---

## 폰트

- `font-family`: `Pretendard, Roboto, "Noto Sans KR", sans-serif`
- 본문 base: `font-size: 10px` (body 자체 — 실제로는 자식들이 14~32 사용)
- **KDS 매핑**: KT Flow + Pretendard (사이트 공식 폰트 = KDS 와 동일 폰트 베이스)

## 폰트 사이즈 / 위계

| 영역 | 모바일 | 데스크탑 | weight | 매핑 후보 (KDS typescale) |
|---|---|---|---|---|
| h1 "로그인" | 26px | 32px | 700 | `heading-1` 또는 `heading-2` |
| 입력 필드 텍스트 | 14px | 16px | regular | `body-2` / `body-1` |
| 로그인 버튼 라벨 | 16px | 18px | 500 | `body-1` / `title-2` (medium) |
| 네이버 로그인 라벨 | 18px | 18px | 700 | `title-2` bold |
| 보조 링크 (찾기) | 12~14px (추정) | 14px (추정) | regular | `label-3` / `caption` |
| Dismiss 링크 (모바일) | 12px | - | regular | `caption` |
| Hero 헤드라인 (캡처) | ~24~28px (추정) | ~28~32px (추정) | 700 | `heading-2` / `heading-3` |
| Hero 서브 카피 | ~14px (추정) | ~16px (추정) | regular | `body-2` / `body-1` |
| 푸터 텍스트 | 12~13px | 12~13px | regular | `caption` |

> Hero / 푸터 / 보조 링크의 정확 font-size 는 inputs/buttons 만큼 직접 집계 안 됨. 시안 작업 시 시각 위계만 참고.

---

## 컬러 (관찰값 → KDS 시맨틱 후보)

### 핵심 brand 컬러

| 관찰 rgb | hex | 사용처 | KDS 매핑 후보 |
|---|---|---|---|
| `rgb(73, 150, 144)` | **`#499690`** | 로고 강조 박스 ("알" 글자) / 앱 다운로드 버튼 / 보조 버튼 border / 메인 헤더 로고 | **KDS primitive `teal.500 #007f7f`** (강도 매칭 우선) 또는 **`teal.300 #4cc8c3`** (관찰 명도 매칭 우선). 시안에서는 brand Accent Secondary 자리 권장 |
| `rgb(107, 59, 233)` | **`#6B3BE9`** | 회원가입 버튼 메인 / 비활성 로그인 텍스트 / hero 캐러셀 다크 배경 | **KDS primitive `purple.500`** 계열 (KDS purple 토큰 정의 확인 후 가장 가까운 값 채택). 시안에서는 brand Accent Primary 자리 권장 |
| `rgb(69, 182, 73)` | `#45B649` | 네이버 로그인 버튼 (외부 브랜드) | **외부 브랜드 — KDS 토큰 치환 불가**. 외부 브랜드 자산이므로 원본 유지 (CLAUDE.md 로고 정책과 동일 논리) |
| `rgb(233, 236, 245)` | `#E9ECF5` | 비활성 로그인 버튼 bg | KDS `fill.disabled` 또는 `bg.surface-soft` 계열 |

### 텍스트 / 보조 회색

| 관찰 rgb | hex | 사용처 | KDS 매핑 후보 |
|---|---|---|---|
| `rgb(0, 0, 0)` | `#000000` | 메인 본문 텍스트 / 입력 보더 / h1 | KDS `text.primary` (보통 `#191a1b` 로 정의됨) |
| `rgb(51, 51, 51)` | `#333333` | 보조 진회색 텍스트 / 로고 path 메인 컬러 | KDS `text.primary` (다크 그레이) |
| `rgb(85, 85, 85)` | `#555555` | 본문 보조 / dismiss 링크 | KDS `text.secondary` |
| `rgb(100, 100, 100)` | `#646464` | 보조 회색 | KDS `text.secondary` |
| `rgb(119, 119, 119)` | `#777777` | 보조 회색 | KDS `text.tertiary` |
| `rgb(136, 136, 136)` | `#888888` | 보조 회색 (placeholder) | KDS `text.tertiary` / `text.placeholder` |
| `rgb(153, 153, 153)` | `#999999` | 검색 input border | KDS `border.subtle` 또는 `text.tertiary` |
| `rgb(204, 204, 204)` | `#CCCCCC` | 보조 input border | KDS `border.subtle` |
| `rgb(187, 187, 187)` | `#BBBBBB` | 보조 회색 | KDS `border.subtle` |
| `rgb(220, 220, 220)` | `#DCDCDC` | 보조 보더 | KDS `border.divider` |

### 배경

| 관찰 rgb | hex | 사용처 | KDS 매핑 후보 |
|---|---|---|---|
| `rgb(255, 255, 255)` | `#FFFFFF` | 카드 / 폼 배경 | KDS `bg.surface` |
| `rgb(247, 248, 250)` | `#F7F8FA` | 카드/섹션 분리 배경 | KDS `bg.surface-soft` |
| `rgb(240, 240, 240)` | `#F0F0F0` | 보조 버튼 bg (OTP 인증 단계 추정) | KDS `bg.surface-soft` |
| `rgb(242, 242, 246)` | `#F2F2F6` | 또 다른 카드 bg | KDS `bg.surface-soft` |
| `rgb(0, 0, 0)` (alpha 0.5/0.4) | rgba(0,0,0,0.5) | hero 컨트롤 배경 (반투명 검정 위) | KDS dark surface overlay |

### 반투명 / 오버레이

| 관찰 | 사용처 |
|---|---|
| `rgba(0, 0, 0, 0.6)` color/border | 본문 보조 텍스트 (40+ 인스턴스) — 검정 60% 투명도 |
| `rgba(0, 0, 0, 0.5)` bg | hero 캐러셀 정지 버튼 |
| `rgba(0, 0, 0, 0.4)` bg | 또 다른 오버레이 |
| `rgba(0, 0, 0, 0.2)` border | 보조 보더 |
| `rgba(255, 255, 255, 0.8)` bg | 라이트 오버레이 |
| `rgba(247, 248, 250, 0.9)` bg | 카드 라이트 오버레이 |

---

## 사이즈 / 간격

### 입력 필드

| 영역 | 모바일 | 데스크탑 | KDS 매핑 |
|---|---|---|---|
| ID/PW input height | 54 | 56 | KDS `text-field` 52 — 시안에서는 52 또는 KDS XLarge 56 |
| 폼 폭 | 335 (카드 inner) | 464 (우측 카드 inner) | KDS 모바일 시안은 375 - 좌우 패딩 20 = 335 정합 |
| border | 1px solid | 1px solid | 변화 없음 |
| radius | 8 | 8 | KDS radius 8 |
| font-size | 14 | 16 | KDS body-2 / body-1 |

### 버튼

| 영역 | 모바일 | 데스크탑 | KDS 매핑 |
|---|---|---|---|
| 로그인 / 회원가입 / 네이버 height | 54 | 56 | KDS button XLarge 56 (가장 가까운 사이즈) |
| 로그인/회원가입 width | 335 | 464 | 폼 폭 100% |
| 앱 다운로드 (Teal) height | 50 | - | KDS button Large 48 (가장 가까운) |
| 앱 다운로드 width | 315 | - | 카드 inner |
| radius (로그인/회원가입/네이버) | 10 | 10 | KDS radius 8 또는 12 (10은 KDS 토큰 밖) — **시안에서 8 또는 12로 치환** |
| radius (앱 다운로드 Teal) | 4 | - | KDS radius 4 |
| font-weight | 500 (로그인) / 700 (네이버) | 500 / 700 | KDS button weight |

### 헤더 / 푸터

| 영역 | 모바일 | 데스크탑 | KDS 매핑 |
|---|---|---|---|
| 헤더 높이 | 추정 60~70 | 추정 80 | KDS top-navigation 52 |
| 검색 아이콘 터치 영역 | 44×44 | 50×50 | KDS accessibility 44 충족 |
| 메뉴 햄버거 | 50×50 | - | 충족 |
| 캐러셀 prev/next 영역 | 12×13 | 12×13 | **44 미만 — KDS 시안에서 확대 필요** |
| 캐러셀 정지 버튼 | 32×32 | 40×40 | 44 미만 — 확대 권장 |
| 로고 렌더 크기 | 108×38 | 108×38 (추정) | viewBox 0 0 108 38 그대로 |

### 페이지 크기

| viewport | 폭 × 높이 | body 높이 |
|---|---|---|
| 모바일 | 375 × 812 | 1546 (스크롤) |
| 데스크탑 | 1440 × 900 | 1624 (스크롤) |

---

## 라운드 (radius) 관찰값

| 관찰값 | 사용처 | KDS 매핑 |
|---|---|---|
| 0 | 헤더 / 푸터 / inline 링크 | KDS radius 0 |
| 3 | 2차 인증 OTP input (hidden) | KDS radius 4 (가장 가까운) |
| 4 | 앱 다운로드 버튼 / OTP 인증 버튼 / reCAPTCHA | KDS radius 4 |
| 8 | ID/PW 입력 필드 | KDS radius 8 |
| 10 | 로그인 / 회원가입 / 네이버 로그인 버튼 | **KDS 토큰 밖 — 8 또는 12 로 치환** |
| 50 | 검색 input (둥근 pill) | KDS radius circle 999 (pill) |
| 50% | 캐러셀 정지 버튼 (원형) | KDS radius circle 999 |

---

## 그림자 / Elevation (관찰 추정)

- 카드는 가벼운 그림자 사용 (캡처에서 확인) — 정확 box-shadow 값 미수집 (computed style 미캡처). 시안에서는 KDS `elevation` 토큰 (예: `elevation-1`, `elevation-2`) 으로 매핑.
- Hero 캐러셀 정지 버튼은 반투명 검정 bg `rgba(0,0,0,0.5)` — 그림자 아닌 overlay 효과.

---

## 폼 / Input 상세 디테일

- ID/PW 입력 border 가 검정 1px (`rgb(0,0,0)`) — 일반적인 회색 보더 입력보다 강한 인상. KDS `text-field` 기본은 회색 보더일 가능성 높음 — 시안에서는 KDS 기본 따르거나, 강조 의도 유지하려면 active focus 스타일로 변환
- 라벨이 placeholder 안에만 존재 (시각 라벨 별도 없음) — **시안에서는 KDS 가이드 준수해 label 별도 추가**
- ID/PW 모두 마침표 포함 placeholder ("아이디를 입력해주세요.") — KDS UX-writing 가이드 lookup 후 적용

---

## 외부 의존성 흔적

- Pretendard / Roboto / Noto Sans KR 폰트 (CDN 또는 self-hosted)
- Swiper.js (캐러셀)
- reCAPTCHA v2 invisible (Google) — bottom-right 배지
- jQuery (`$(document).ready` 흔적)
- NetFunnel (KT 그룹 공통 대기열 시스템)
- Google Tag Manager (`GTM-NZ4CRZ8`)
- Facebook App ID (페북 로그인 의도 흔적이나 현재 미활성)

> 시안에서는 위 외부 의존성을 모두 제거. 캐러셀은 단순 정적 카드 1장으로 표현하거나 KDS 의 자체 패턴 사용.
