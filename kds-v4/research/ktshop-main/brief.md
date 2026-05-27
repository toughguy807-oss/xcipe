# shop.kt.com 메인 — 분석 brief

- **URL**: https://shop.kt.com
- **viewport 패턴**: 반응형 (모바일 / 데스크탑 별도 레이아웃). 이번 작업은 **모바일 (375)** 만
- **분석일**: 2026-05-21
- **참고 brand**: `research/brands/kt.com/brand.md`

## 정보 구조 (모바일 메인 일반 패턴)

| 영역 | 구성요소 | KDS 컴포넌트 매핑 |
|---|---|---|
| Top Navigation | KT 로고, 알림(bell), 장바구니(cart) | top-navigation |
| Search | "단말 / 자급제 / 알뜰폰 등 검색" 한 줄 placeholder | search |
| Quick Category (1차) | 휴대폰 · 요금제 · 결합 · 부가 · 알뜰폰 · 이벤트 (5~6 칸) | 아이콘 그리드 (자체) |
| Hero Banner | 신규 단말 출시 + 사전예약 또는 가격 강조 hero | card + 풀폭 image |
| Hot Pick (베스트 단말) | 가로 스크롤 단말 카드 — 모델명 / 색상 / 공시지원금 가격 | card 가로 캐러셀 |
| Plan Section (요금제 추천) | 요금제 1~3개 카드 (가격 / 데이터 / 통화) | card 적층 |
| Combo / Benefit | 결합 혜택 + 신규고객 할인 + 멤버십 이벤트 | card + tag |
| Bottom Navigation | 홈 / 카테고리 / 검색 / 장바구니 / MY | bottom-navigation |

## UX 흐름 (관찰)

1. 진입 → 메인 hero 시선 끌기 (신단말 또는 즉시혜택)
2. **2 갈래 분기**:
   - "특정 단말이 명확함" → 상단 검색바 / 카테고리 그리드
   - "둘러보기" → hero → hot pick → 추천 요금제 순으로 스크롤
3. 카드 클릭 → 단말 상세 → 색상/용량 선택 → 요금제 선택 (단계형) → 신청
4. 하단 nav 의 "장바구니"·"MY"가 항시 접근 가능

## UX 라이팅 톤 (관찰)

- Hero 헤드라인: 직설 (예: "지금 사전예약하면 24% 할인")
- 가격: 항상 정가 ↓ 할인가 ↑ 표시 + "월" 단위 환산 ("월 39,000원 부터")
- CTA 라벨: "자세히 보기" / "사전예약" / "비교하기" — 동사+명사 또는 동사형 짧게
- 뱃지: "단독", "1Day 특가", "사전예약", "한정수량" — 2~5 글자 짧게

## 토큰 관찰 (KDS 치환 대상 — 참고용)

- 원본 색: KT Red `#E20613`, 검정, 회색 단계 → KDS `red.500` + `gray.*` + `static.white` 로 모두 치환
- 원본 라운드: 8~12px → KDS `radius` 토큰 (8 / 12)
- 원본 폰트: KT 산스 → KDS typography semantic (heading-3, title-2, body-2, label-2 등)
- 임의 hex 절대 금지

## 차별화 축 (이번 시안)

베이스(개념적): KDS 표준 카드 + accent-primary 1회 hero CTA + 카테고리 그리드 + 추천 카드 적층 + bottom-navigation.

| 시안 | 우선 축 | 변형 컨셉 |
|---|---|---|
| **A** | 레이아웃 | "좌우 분할 hero + 3×2 카테고리 그리드 + 가로 캐러셀" — hero 가 좌우 2분할 카드 (메인 단말 + 서브 프로모션), 카테고리는 6분할 그리드 |
| **B** | 톤 | "KT Red Accent 강조 + 큰 타이포 + 다크 hero" — hero 가 black surface + KT Red CTA, 타이포 weight 700 / 상위 typescale 적극 사용 |
| **C** | UX·구조 | "검색 + 단계 indicator + 카테고리 탭" — 검색바를 hero 위로 끌어올림, "1.단말 → 2.요금제 → 3.개통" indicator, 카테고리 tab 으로 추천 큐레이션 |

세 시안 모두 KDS 토큰·컴포넌트만 사용. 변형 안 한 두 축은 베이스에 근접.

## 스크린샷

- (시도) 외부 사이트 캡처는 별도 도구 필요 — 본 작업에서는 일반 도메인 지식 + brand.md 기반으로 진행. `screenshots/` 비어있음 (필요 시 추후 보강)
