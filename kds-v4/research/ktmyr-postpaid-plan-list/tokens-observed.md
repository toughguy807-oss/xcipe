# 관찰된 토큰 (KT 마이알뜰폰 후불요금제 목록)

> 본 파일은 타겟 사이트의 원시 색·간격·타이포 값 기록용. **KDS 시안에서는 절대 그대로 사용하지 않음** — 모두 KDS 토큰으로 매핑.

생성일: 2026-05-22
출처: `https://ktmyr.com/fe/mypage/ppl/pplList.do` (모바일 375 + 데스크탑 1440 동시 추출)

---

## 1. Color (관찰값 → KDS 매핑 제안)

### 1-a. 텍스트
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| `rgb(0, 0, 0)` = `#000000` | body 텍스트 기본, 헤딩 active 탭, h2 페이지 헤딩, `월` 라벨 | `text.primary` (= `#191a1b`) |
| `rgb(51, 51, 51)` = `#333333` | 정렬 옵션 active (데스크탑) | `text.primary` 또는 그 직전 회색 |
| `rgb(102, 102, 102)` = `#666666` | 정렬 드롭다운 라벨 (모바일 sub-tone) | `text.secondary` 계열 |
| `rgb(119, 119, 119)` = `#777777` | 정렬 옵션 비활성, 보조 텍스트 | `text.secondary` |
| `rgb(255, 255, 255)` = `#ffffff` | CTA 버튼 텍스트, 검색 input 배경 | `text.on-color` / `bg.surface` |

### 1-b. brand 시그니처 (이 영역에 특히 강함)
| 관찰값 | 사용처 | KDS 매핑 제안 | brand.md 관계 |
|---|---|---|---|
| **`rgb(20, 186, 215)` = `#14BAD7`** | **가격 강조 (`900원`, `6,900원` 숫자)** — 250개 카드 전체에 일관 적용 | KDS `cyan` 또는 `teal.300/400` 계열 (예: `teal.300 #4cc8c3`, 또는 `cyan.500` 류). 가장 가까운 primitive 채택 | **신규** — 기존 brand.md 의 Teal `#499690` (헤더 로고) 보다 훨씬 밝은 청록. 셀프개통의 Purple `#6B3BE9` 와도 완전 다른 영역. 상품 영역 시그니처 |
| **`rgb(7, 191, 224)` = `#07BFE0`** | **`비교하기` 메인 CTA** 채움 + outline | 위와 동일 계열 (cyan/teal 밝은 채도) | 같은 컬러군. 가격 강조와 CTA 가 같은 brand 톤으로 묶임 |
| `rgb(55, 59, 89)` = `#373B59` | **`필터` 버튼** 배경 (다크 네이비 원형/알약) | KDS `coolGray.700~800` 또는 `navy` 계열 | 보조 컬러 — 검정도 회색도 아닌 약한 채도의 네이비. brand 신규 |

### 1-c. KT brand red 잔존
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| `rgb(236, 27, 35)` = `#EC1B23` (셀프개통과 동일) | Top tab `상품` active 밑줄 (4px), 비교 카운트 배지 추정 | KDS red 계열 — KDS `red.500 #e0282f` 와 매우 근접. **fill.accent-primary 자리는 아님** (KT 본사 red 잔존, active indicator 한정) |

### 1-d. 보더·구분선
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| `rgb(153, 153, 153)` = `#999999` | 검색 input border, sub-tab 비활성 outline | `border.subtle` 또는 `coolGray.300` |
| 옅은 회색 (정확값 미캡처) | 카드 그림자, 카드 내부 스펙 박스 배경 | `border.subtle` + `bg.surface-soft` |

### 1-e. 배경
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| `rgb(255, 255, 255)` = `#ffffff` | 카드 배경, GNB 배경 | `bg.surface` |
| `rgba(0,0,0,0)` (= 투명, 실제로는 body 위 회색층) | 페이지 wrapper — 본 페이지는 옅은 회색 페이지 배경 추정 (눈대중 `#f5f6f7~#f8f9fa`) | `bg.surface-soft` |

---

## 2. Typography (KDS 매핑 제안)

폰트 패밀리는 `Pretendard, Roboto, "Noto Sans KR", sans-serif` — KDS 의 KT Flow + Pretendard 정책과 정합 (Pretendard 우선).

### 2-a. 모바일 위계
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| 16px / weight 700 / lh 20.8px | h2 페이지 헤딩 "후불요금제" | `title-1` 또는 `heading-3` (KDS typescale에 가장 가까운 18~20px bold 매핑) |
| 17px / weight 700 | 카드 안 `월` 라벨 + 가격 검정 부분 | `title-2` 또는 `body-1 strong` |
| 19px / weight 700 | 카드 안 가격 숫자 (cyan-teal 강조) | `title-1` 또는 `heading-3` |
| 14~16px / weight 700 | 카드 안 요금제 이름 (h3 또는 strong) | `body-1` bold |
| 13~14px / weight 400 | 카드 안 스펙 라벨/값 (데이터, 음성통화, 메세지) | `body-2` / `body-3` |
| 12~13px / weight 400, 회색 | 보조 메타 ("7개월 이후 4,800원", "평생 할인") | `caption` / `label-3` |
| 14~16px / weight 400, 회색 | 정렬 옵션 비활성 | `body-3` regular |

### 2-b. 데스크탑 위계
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| 20px / weight 700 | 카드 안 `월` 라벨 + 가격 검정 부분 | `title-1` |
| 22px / weight 700 | 카드 안 가격 숫자 (cyan-teal) | `heading-3` 또는 `title-1` 강조 |
| 16~18px / weight 700 | 카드 안 요금제 이름 | `body-1` bold |
| 14~16px / weight 400 | 정렬 옵션 active (검정 weight 400) | `body-2` |
| 14px / weight 300, 회색 | 정렬 옵션 비활성 | `body-3` light |

> brand.md 의 셀프개통 영역 결론과 비교: 본 페이지는 **카드 자체에는 lighter heading 없음** — 모든 강조가 weight 700 굵게. brand 의 "lighter heading + 작은 본문" 패턴이 콘텐츠 페이지 (셀프개통) 에서는 캐러셀 hero 에만 적용되고, **상품 목록 페이지에서는 사라짐**. 정보 가독성 우선.

---

## 3. Spacing / Layout (눈대중 + DOM 추출)

### 3-a. 카드 간격
- 카드 사이 세로 간격: 눈대중 12~16px
- 카드 내부 padding: 16~20px (모바일) / 20~24px (데스크탑)
- 카드 안 가격 블록과 스펙 박스 사이: 12~16px

### 3-b. 페이지 구조
- 모바일 좌우 padding: 16~20px (헤딩·카드 좌측 정렬 기준)
- 데스크탑 콘텐츠 max-width: 약 1100~1200px (중앙 정렬, 양쪽 큰 여백)
- GNB 높이: 모바일 약 60px / 데스크탑 약 80px

### 3-c. 라운드
| 관찰값 | 사용처 | KDS 매핑 제안 |
|---|---|---|
| `8px` | 비교하기 메인 CTA | `radius.8` |
| `50px` (pill) | 검색 input, sub-tab 칩, 카테고리 칩, 필터 버튼 (데스크탑 알약형) | `radius.circle` (= 999px, 사실상 pill 처리) |
| 눈대중 12~16px | 카드 컨테이너 라운드 | `radius.12` 또는 `radius.16` |
| 눈대중 16~20px | 카테고리 칩 (이모지 + 라벨) | `radius.16` |
| 원형 | 필터 버튼 (모바일) | `radius.circle` |
| 4px | top-tab active 밑줄 두께 | (KDS top-navigation 컴포넌트 표준 따름) |

### 3-d. 그림자
- 카드 그림자: 옅음 (눈대중 `0 2px 8px rgba(0,0,0,0.04~0.06)`)
- sticky 비교 영역: 위에서 아래로 가벼운 그림자 (`0 -2px 8px rgba(0,0,0,0.06)` 추정)

KDS `elevation.json` 의 elevation-1 또는 elevation-2 매핑.

---

## 4. 컴포넌트 매핑 (KDS components)

| 관찰된 컴포넌트 | KDS 컴포넌트 매핑 |
|---|---|
| 상단 바 (로고 + 우상단 아이콘 3개) | `top-navigation` (52px) |
| Top tab (4~6개) | `tab` (48px) — fixed 4분할 또는 fitted scrollable |
| Sub tab (4개 알약 칩) | `chip` (36px) 또는 `segmented-tab` |
| 카테고리 칩 (이모지 + 라벨) | `chip` (36px) — selectable + 이모지 prefix |
| 검색 input | `search` (48px) — pill radius |
| 필터 버튼 | `button` Medium (44px) — 원형/알약형 secondary, dark fill (KDS 라이브러리에 fab 형태 또는 secondary 버튼 응용) |
| 결과 카운트 + 정렬 | `data-table` Compact 헤더 응용 또는 별도 영역 |
| 정렬 옵션 (가로 일렬, 데스크탑) | `tab` (text-only fitted) 또는 inline radio |
| 정렬 드롭다운 (모바일) | `dropdown` (52px) |
| 요금제 카드 | `card` — 사업자 로고 / 헤딩 / 가격 / 스펙 row / 비교 체크박스 |
| 카드 우상단 `+ 비교` 체크박스 | `checkbox` (46px) + label, 또는 `chip` selectable |
| 스펙 행 (3그룹) | `data-table` Compact 또는 inline metric (KDS `tag` x 3) |
| Sticky 비교 영역 | `bottom-sheet` (sticky 모드) 또는 페이지 floating bar — KDS `popup` 응용 |
| 메인 CTA `비교하기` | `button` Large (48px) primary |
| 비교 카운트 배지 | `tag` Small (18px) 또는 badge — 빨강 fill |
| 더보기 페이지네이션 | `button` Large (48px) tertiary (외곽선) |
| 푸터 | 별도 footer 영역 (KDS 컴포넌트 별도 정의 없음 — 일반 frame) |
| 필터 팝업 (모달) | `popup` (PC 400w) 또는 `bottom-sheet` (모바일) |

---

## 5. 시안 작업 시 KDS 치환 우선순위

1. **가격 강조 컬러** `#14BAD7` → KDS `teal` 또는 `cyan` primitive 안에서 가장 가까운 토큰. 후보:
   - `teal.300 #4cc8c3` — 채도가 약간 다르지만 가장 가까운 light teal
   - `cyan.500` 류 — 만약 KDS 에 cyan 토큰 있으면 우선
   - **검증 후 시안 B 디자이너 채택**
2. **비교하기 CTA** `#07BFE0` → 위와 동일 매핑 (같은 계열로 통일)
3. **필터 버튼 다크 네이비** `#373B59` → KDS `coolGray.700` 또는 `coolGray.800` 류. 또는 `fill.primary` (검정 #191a1b) 로 통일하는 것도 옵션
4. **Top tab active red** `#EC1B23` → KDS `red.500 #e0282f` (=KDS Accent Primary 의 기본값, 이 영역에서는 indicator 역할로만 사용)

---

## 6. Accent Primary 자리 결정 (이 영역 한정)

CLAUDE.md "Accent Primary 대체 규칙" + brand.md 의 시그니처 관찰에 따라:

- 이 영역의 brand 시그니처는 **cyan-teal `#14BAD7 / #07BFE0`** — 가격·CTA·brand 인지 모두 이 컬러로 통일
- 후불요금제 목록 시안 작업 시 **Accent Primary = KDS teal (또는 cyan) primitive**. KDS Brand Color Case 2 (Blue) 와 가장 유사한 패턴
- 디자이너 사용자 확인 불필요 — brand.md 의 시그니처 관찰 결과 + 이 페이지 자체의 일관된 cyan-teal 사용이 자동 정당화 근거
- **단 시안 B (톤 우선) 에서는 다른 양축 활용 가능**:
  - "Teal Primary (밝은 톤)" — 원본 그대로, 가격·CTA 모두 cyan-teal
  - "Purple Primary (셀프개통 톤 carry-over)" — brand 의 두 양축 중 Purple 채택, 가격·CTA 모두 Purple — brand 전체 통일성 우선
  - "모노톤 + Red Accent" — KDS 기본값, 검정 강조 + 빨강 minor accent — 절제 톤
- **시안 A·C 는 cyan-teal Primary 유지** 가 권장 (이 영역의 brand 정합성 우선)
