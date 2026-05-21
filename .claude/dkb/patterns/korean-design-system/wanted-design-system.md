# 원티드 디자인 시스템 (Wanted Design System) — 메타 패턴

**조사일**: 2026-05-04
**카테고리**: patterns/korean-design-system/
**상태**: 외부 공개 — Figma 커뮤니티 파일 (Storybook/Web 사이트 미공개)
**조사 방식**: WebSearch + WebFetch (Playwright 접근 차단 — CloudFront 403)

## 공개 출처 (★ GitHub repo 확인 — 2026-05-04)

> **중요 발견**: 원티드 DS 공식 명칭 = **"Montage"** (3 플랫폼 분리 + 자체 폰트)

| 출처 | URL | 형태 | 접근성 |
|------|-----|------|------|
| **GitHub Montage Web** ⭐ | https://github.com/wanteddev/montage-web | TypeScript repo (73★) | ✅ 공개 |
| **GitHub Montage iOS** | https://github.com/wanteddev/montage-ios | Swift repo (24★) | ✅ 공개 |
| **GitHub Montage Android** | https://github.com/wanteddev/montage-android | Kotlin repo (30★) | ✅ 공개 |
| **GitHub Wanted Sans** ⭐ | https://github.com/wanteddev/wanted-sans | 자체 한글 sans-serif 폰트 (314★) | ✅ 공개 |
| **공식 Figma 커뮤니티** | https://www.figma.com/community/file/1355516515676178246/wanted-design-system | Figma 파일 (오픈소스) | ✅ 공개 (Figma 계정) |
| 원티드 블로그 제작기 | https://blog.wantedlab.com/library/insight/wds | 블로그 글 | ⚠️ Playwright 차단, curl 통과 |
| 디자인 나침반 기사 | https://designcompass.org/2025/04/11/wanted-design-system-open-source/ | 외부 보도 | ✅ 공개 |

### Montage 시스템 구성
- **Foundation**: 컬러 / 타이포 / 간격 / 그림자 / 모션 (3 플랫폼 공통)
- **Typography**: Wanted Sans (자체 한글 폰트, 314★, CSS 패키지)
- **Theme**: Light / Dark 자동 전환
- **검색**: 한글 + 영어 키워드 애셋 검색

### Wanted Sans 폰트 ⭐
- "곧으면서도 유연한 산세리프 글꼴 | A Sans-serif font; Geometric with a heart, Humanist with a soul"
- CSS 패키지 (314 stars — 한국 폰트 중 최상위)
- 한글 + Latin 통합 / 9 weights 추정
- 라이센스: SIL Open Font License (오픈소스 추정)

## 시스템 개요 (외부 보도 종합)

- **공개일**: 2025년 4월 3일 (원티드 10주년 기념)
- **선행**: 2024년 4월 1일 만우절 — 원티드 디자인 라이브러리 1차 공개
- **확장**: 디자인 시스템 = 라이브러리 + 파운데이션 + 테마 관리
- **라이센스**: 오픈소스

## 시스템 핵심 특징

### 1. 멀티 플랫폼 파운데이션
- iOS / Android / Web 환경 모두 활용 가능
- Foundation 영역 통합 (컬러 / 타이포 / 간격 / 둥근 모서리 / 그림자 / 모션)

### 2. 테마 관리
- Light / Dark 테마 자동 전환
- 시맨틱 토큰 기반 (역할 분리 — 원시값 / 의미 / 컴포넌트)

### 3. 한영 다국어 검색
- 한글 키워드 + 영어 키워드 기반 애셋 검색
- 다국어 대응 컴포넌트 (한국 B2B 친화)

## 시그니처 패턴 (메타-추정 — Figma 파일 직접 검증 필요)

| 카테고리 | 패턴 (추정) | 근거 |
|---------|-----------|------|
| 컬러 | Toss/원티드 블루 + 차분한 그레이 톤 | 원티드 메인 사이트 컬러 |
| 타이포 | Pretendard 또는 자체 한글 폰트 | 한국 B2B 표준 |
| 컴포넌트 | 알약 CTA + 카드 그림자 미세 | 한국 B2B 톤 |
| 모션 | hover transition 절제 + scroll fade | 한국 B2B 친근 |

> ⚠️ 시그니처 추정은 **외부 보도 + 한국 B2B 일반 패턴 기반**. 정확한 토큰은 Figma 커뮤니티 파일 직접 분석 필요.

## 적용 가이드 (한국 B2B / 채용/HR 도메인)

### 적용 가능 영역
- **한국 B2B 디자인 시스템 출처**: lgcns / toss.tech / makinarocks 보완
- **채용/HR/구인 도메인**: 원티드 톤 직격 (wanted.co.kr 메인 톤)
- **Light/Dark 테마 분리 시스템**: shadcn 류와 비교 학습

### 적용 부적합
- ❌ Industrial AI / Frontier AI (Korean B2B 친근 톤은 Industrial 부적합)
- ❌ Editorial 매거진 → kinfolk/monocle
- ❌ Awwwards 어워드 톤 → locomotive/obys

## DKB 등재 결정

**현재 상태**: patterns/korean-design-system/ 메타로만 등재. references/ 미등재.

**사유**:
- Web 형태 공개 사이트 부재 → Playwright 캡처 + 18축 채점 불가능
- Figma 파일은 dkb-analyze 스킬 입력 형식 외 (PNG/HTML 기반 채점 설계)
- 향후 원티드가 Storybook/Web 디자인 시스템 사이트 공개 시 references/tier-3/wanted-ds/ 정식 등재 가능

## 후속 조치 권고

1. **Montage Web repo Storybook 검증**: github.com/wanteddev/montage-web README → Storybook 배포 URL 확인 → 발견 시 references/tier-3/ 정식 등재
2. **Wanted Sans 폰트 직접 사용**: 한국 B2B 시안 생성 시 Pretendard 대안으로 Wanted Sans 추천 (314★ 신뢰도)
3. **Figma 파일 수동 분석**: figma.com/community/file/1355516515676178246 → Montage 컬러/컴포넌트 토큰 추출
4. **블로그 본문 파싱**: blog.wantedlab.com HTML 419KB curl 통과됨 — 시그니처 패턴 인용문 추출 가능

## 변경 이력

| 일자 | 변경 |
|------|------|
| 2026-05-04 | 초기 메타 등재 (외부 공개 출처 3건 + 시스템 특징 정리, 시그니처 추정만) |
| 2026-05-04 | **GitHub Montage repo 발견** — montage-web/ios/android + wanted-sans 폰트 314★ 추가 (외부 검색 v2) |

## 참조

- WebSearch: "원티드 디자인 시스템 wanted design system storybook 공개 URL" (2026-05-04)
- WebFetch: blog.wantedlab.com/library/insight/wds (2026-05-04)
- 디자인 나침반 보도: 2025-04-11
- `dkb/patterns/` — 패턴 카탈로그 마스터
