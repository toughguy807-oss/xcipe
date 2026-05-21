# KT 계열 로고 라이브러리

`kds/data/icons/` 와 짝을 이루는 **로고 자산 라이브러리**. HTML 의 ref (`<svg data-kds-logo="<name>" />`) 만 작성하면 `scripts/inject-svg.mjs` 가 자동으로 검증된 SVG 로 치환.

## 아이콘 라이브러리와의 차이 (중요)

| 항목 | 아이콘 (`kds/data/icons/`) | 로고 (`kds/data/logos/`) |
|---|---|---|
| ref 어트리뷰트 | `data-kds-icon` | `data-kds-logo` |
| 컬러 처리 | `currentColor` (CSS color 로 자유 변경) | **원본 브랜드 컬러 고정** (변경 금지) |
| 표준 viewBox | `0 0 24 24` (24×24 그리드) | 로고별 고유 viewBox (가로로 긴 wordmark 가 다수) |
| stroke 정책 | 2px (1.2~4 범위) | 변경 금지 (브랜드 자산 원본 보존) |
| fills override | inject-svg 가 자동 적용 (icon.* 시맨틱) | **미적용** — 원본 fill 그대로 |
| 사용자 결정 정책 | 자유 변형 가능 | 사용자 결정 = "원본 브랜드 컬러 고정" |

## 라이브러리 목록

| 파일 | 사이트 | 브랜드 컬러 | 원본 dimensions | 비고 |
|---|---|---|---|---|
| `kt.svg` | KT 본사이트 (www.kt.com) + KT 샵 (shop.kt.com 공유) | 검정 `#1D1D1B` + 빨강 `#E20613` | viewBox `0 0 46.95 38.31` | wordmark "kt" + 빨강 액센트 라인. **KT 본가의 표준 로고**. shop 사이트도 같은 자산 사용 |
| `kt-mvno.svg` | KT 마이알뜰폰 (ktmyr.com) — 헤더 | 검정 `#333333` + teal `#499690` | viewBox `0 0 108 38` | 컬러 버전. teal 시그니처 마크 + "온라인 모바일" wordmark |
| `kt-mvno-black.svg` | KT 마이알뜰폰 (ktmyr.com) — footer | 단색 `#000000` | viewBox `0 0 108 38` | 흑백 버전. 어두운 배경·통일된 톤이 필요한 영역용 |
| `kt.png` | KT 본가 (PC 헤더 원본) | (PNG raster) | 76 × 76 px | SVG 가 안 들어가는 환경의 fallback. 일반 작업에선 `kt.svg` 사용 |
| `naver.svg` | 네이버 — 외부 OAuth 브랜드 (KT 도메인 외) | 네이버 그린 `#03C75A` + 흰 N | viewBox `0 0 20 20` | 소셜 로그인 버튼 안 마크용. 외부 브랜드 컬러 보존 정책에 따라 `#03C75A` 고정. KT 시스템에서 "다른 방법으로 로그인 → 네이버" 자리에 사용 |

## HTML 사용 예시

```html
<!-- inline SVG (1순위 — inject-svg 가 자동 치환) -->
<svg data-kds-logo="kt" width="47" height="38"></svg>
<svg data-kds-logo="kt-mvno" width="89" height="32"></svg>
<svg data-kds-logo="kt-mvno-black" width="89" height="32"></svg>

<!-- img 태그 (2순위 — inject-images 가 처리) -->
<img src="/kds/data/logos/kt.svg" alt="kt" width="47" height="38">
```

**권장 사이즈** (헤더용):
- `kt` — 47×38 또는 비율 유지 (1.226:1)
- `kt-mvno` / `kt-mvno-black` — 89×32 (헤더 표시 기준) 또는 비율 유지 (2.84:1)
- 카드 안 같이 작게 표시하면 가로 24~32 정도

## 컬러 변경 금지 (절대 원칙)

사용자 결정 정책: **로고는 원본 브랜드 컬러를 변경하지 않는다.**

- KT 빨강 `#E20613` 고정 — KDS `red.500 #e0282f` 와 미세하게 다르지만 **브랜드 원본 보존**
- 마이알뜰폰 teal `#499690` 고정 — KDS `teal.500 #007f7f` 와 색조 다르지만 **브랜드 원본 보존**
- 검정 wordmark 부분도 원본 그대로 (`#1D1D1B`, `#333333` 등) — KDS `gray.900 #191a1b` 와 다르지만 보존

**이유**: 로고는 브랜드 정체성의 일부이며, KDS 토큰으로 자동 매핑하면 사이트 식별성을 해칠 위험. `currentColor` 도 미사용.

**예외**: 사용자가 명시적으로 "이 시안만 로고 단색화" 같은 요청을 하면 그 시안 한정 변경 가능. 단 라이브러리 파일 자체는 원본 보존 — 시안 HTML 에서만 override.

## 라이센스·사용 노트

- 각 로고는 KT주식회사 / KT 마이알뜰폰의 공식 브랜드 자산. **KDS 내부 시안·재현 작업에만 사용**. 외부 배포·재판매·상업적 변형 금지
- footer 의 copyright 표기:
  - KT 본사이트: `Copyright KT Corp. All rights reserved.`
  - KT 마이알뜰폰: `Copyright KTmyr. All rights reserved.`

## 출처 (원본 추출)

- KT 본가 (SVG): `https://m.kt.com/images/v2/layout/header_kt.svg` (모바일 헤더)
- KT 본가 (PNG): `https://cfm.kt.com/images/v2/layout/gnb-ktlogo.png?version=2025042401` (PC 헤더, raster fallback)
- KT 마이알뜰폰 (컬러): `https://ktmyr.com/web/kmvno/assets/images/common/logo_color.svg`
- KT 마이알뜰폰 (흑백): `https://ktmyr.com/web/kmvno/assets/images/common/logo_black.svg`

추출 일자: 2026-05-15
원본 리서치 자료: `research/brands/kt.com/logos/`

## 라이브러리 확장 (새 로고 추가 시)

1. `kds-researcher` 를 brand_mode + logo extraction 으로 호출해 `research/brands/<domain>/logos/` 에 저장
2. self-contained SVG 인지 검증 (외부 CSS 의존 없는지)
3. `kds/data/logos/` 로 복사
4. 이 README 의 "라이브러리 목록" 표에 항목 추가
5. `CLAUDE.md` 의 로고 라이브러리 섹션 인덱스도 함께 갱신
