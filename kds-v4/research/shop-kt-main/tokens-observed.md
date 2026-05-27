# 메인 화면의 관찰된 토큰 (참고용)

원본 사이트 (`shop.kt.com` + `m.shop.kt.com/m/main.do`) 에서 관찰된 색·타이포·간격 패턴.
**KDS 치환 대상**이므로 시안 생성 시 그대로 쓰지 말 것. 가장 가까운 KDS primitive 로 매핑.

## 컬러 (외부 CSS `KT_0.Main.css` 정량 분석)

### 시그니처 컬러 (강조용)

| 원본 hex | 사용 빈도 | 사용 위치 | KDS 매핑 후보 |
|---|---|---|---|
| `#d71826` | 24+회 | 메인 빨강 (할인 강조·배지·CTA·`tit red`/`txt red` 클래스·7% 할인) | `red.500` (KDS primitive) |
| `#db2c39` / `#ee2f3e` / `#dd0000` / `#b80000` / `#ed525a` | 보조 | 다양한 red shade (그라디언트·배지 hover 등) | `red.400` / `red.600` |
| `#01a69f` | 다수 | 캐러셀 페이저 active, 인터넷 디자인 홈 디바이스 강조 | `teal.500` |
| `#01a2ba` / `#00a2bb` / `#00a4b5` / `#05a4bc` / `#0bbdcf` / `#09bad0` | 19+회 | 요고·인터넷 영역 강조, 보조 UI | `teal.400` ~ `teal.500` |
| `#4ebcc6` / `#4dc4d5` / `#10c6cb` / `#00aac3` | 보조 | 보조 강조·badge | `teal.300` ~ `teal.400` |

### 면 컬러 (surface)

| 원본 hex | 사용 위치 | KDS 매핑 후보 |
|---|---|---|
| `#e8f8f6` | 바로가기 카드 배경 (혜택/신규 가입 성격) | `teal.50` 또는 `fill.surface-tertiary` |
| `#f1f5f8` | 바로가기 카드 배경 (기존 기능 성격) | `gray.100` 또는 `fill.surface-secondary` |
| `#f1f1f1` / `#f5f5f5` | 카드·섹션 분리 배경 | `gray.100` / `fill.surface-secondary` |
| `#f3f4f9` | 슬라이드 박스 배경 | `gray.100` |
| `#fff` | 베이스 화이트 | `fill.surface-primary` |
| `#ededed` / `#e5e5e5` / `#e0e1e2` | 구분선·테두리 | `gray.200` / `border.divider` |

### 텍스트 컬러

| 원본 hex | 사용 위치 | KDS 매핑 후보 |
|---|---|---|
| `#000` / `#0a090b` | 강조 헤딩 (드물게) | `text.primary` (`#191a1b`) |
| `#222` / `#1b1e1f` / `#1c1d1f` | 본문 헤딩·기본 강조 | `text.primary` |
| `#525252` | 본문 텍스트 (바로가기 라벨 등) | `text.secondary` |
| `#666` / `#73787a` / `#777` | 보조 텍스트·라벨 | `text.tertiary` |
| `#808080` / `#abacb1` / `#adadad` | 비활성·약한 보조 | `text.disabled` 또는 `text.tertiary` |
| `#bfbfbf` / `#bbbfc8` / `#cbcbcb` | placeholder·약한 보조 | `text.disabled` |

## 타이포 (인라인 관찰)

- 본문 폰트 크기: vw 기반 가변 (모바일 `font-size: 3.1vw` 등 — 375 기준 ~12px)
- 가격 강조: `<em>` 태그 + 큰 폰트 + 검정 굵은 weight (대략 24~32px 추정)
- 헤딩 (`<h2>인기상품`, `<h2>기획전`, `<h2>고객센터`): 검정 굵은 weight, 상단 마진 큼
- 영문 헤딩 ("Hot Issue"): 영문 타이포로 별도 처리, 본문과 같은 굵은 weight
- letter-spacing: `-0.5vw` ~ `-0.7px` (한글 자간 좁힘) — KDS 의 한글 letter-spacing 정책 따라 치환

## 간격 (인라인 관찰)

- 섹션 간 마진: `margin-top:8.53vw` (≈ 32px @ 375), 즉 ~32px (`space-32`)
- 컨테이너 padding: `inner-wrap` 클래스로 통일 (좌우 padding 추정 16~20px = `space-16` / `space-20`)
- 바로가기 그리드 간 마진: `-2.5vw` (음수 margin 으로 살짝 밖으로) — KDS 에서 grid gap 으로 치환
- 카드 라운드: 외부 CSS 미확인. 화면상 카드 모서리 ~8~12px round → `radius.8` 또는 `radius.12`
- 모서리: 바로가기 카드는 명확한 round (>= 16px) — `radius.16`

## SVG/아이콘 패턴

- 바로가기 아이콘은 **PNG 비트맵** (SVG 아님). KDS 매핑 시 KDS 아이콘 라이브러리 (`kds/data/icons/`) 의 동등한 아이콘으로 대체:
  - 핸드폰구매 → `smartphone`
  - Apple/Galaxy 브랜드 → 브랜드 로고 (별도 `kds/data/logos/` 필요)
  - 인터넷,TV 가입 → `wifi`
  - 액세서리 → (KDS 라이브러리에 없을 가능성 — placeholder 또는 추가 필요)
  - USIM/자급제 → `credit-card` 또는 `smartphone`
  - 핫딜 → `percent`
  - 캐시리워드 → `gift`
  - 마이샵 → `user` 또는 `cart`

## 모션·인터랙션 관찰

- 바로가기 카드의 badge 애니메이션: `ani_badge` keyframe — `translate(-50%, 0) → translate(-50%, 15%) → translate(-50%, 0)`, 1.25s ease-in-out 무한 반복 (모바일 기준). PC 는 `-5px` 거리 + 1.5s. **KDS motion 토큰의 fade·slide easing 으로 치환 가능 — `kds/data/foundations/motion.txt` 참고**
- 빅배너 자동 롤링: `data-rolling="Y"` (롤링 속도·딜레이는 외부 JS 에 있음, 측정 안 함)
