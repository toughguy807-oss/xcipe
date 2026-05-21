# Wanted Montage Design System — DNA

**등재일**: 2026-05-04
**tier**: tier-3 (한국 도메인 강제 — dkb-policy.md §6-1)
**interaction_archetype**: explorer
**platform**: hybrid
**도메인**: 한국 B2B / 채용/HR / 디자인 시스템 출처
**조사 방식**: WebFetch (montage.wanted.co.kr 공식 docs 확인 — 2026-05-04)

## 시그니처 (1줄)

3 플랫폼(Web/iOS/Android) 통합 + Wanted Sans 자체 폰트 + Foundation/Components/Utilities 4 섹션 → 한국 B2B 채용 도메인 디자인 시스템 시그니처.

## 공식 자산

| 자산 | URL | 형태 |
|------|-----|------|
| **공식 문서/Storybook 등가** ⭐ | https://montage.wanted.co.kr | 디자인 시스템 포털 (2026-05-04 확인) |
| GitHub Web | https://github.com/wanteddev/montage-web | TypeScript repo (73★) |
| GitHub iOS | https://github.com/wanteddev/montage-ios | Swift repo (24★) |
| GitHub Android | https://github.com/wanteddev/montage-android | Kotlin repo (30★) |
| Wanted Sans 폰트 | https://github.com/wanteddev/wanted-sans | 자체 한글 sans-serif (314★) |
| Figma 커뮤니티 | https://www.figma.com/community/file/1355516515676178246/wanted-design-system | Figma 파일 (UI Kit, last updated 2026.03.09) |
| Pretendard JP | montage.wanted.co.kr 링크 | Pretendard 일본어 동적 폰트 |

## 라이선스

**MIT License** (montage-web repo) + **SIL Open Font License** (Wanted Sans 추정).
상용 사용 / 수정 / 재배포 허용 — FAQ에서 commercial usage 명시.

## 시스템 구조

| 섹션 | 내용 |
|------|------|
| Getting Started | 설치 / 시작 가이드 |
| **Foundations** | 컬러 / 타이포그래피 / 간격 / 그림자 / 모션 / 둥근 모서리 |
| **Components** | UI 컴포넌트 라이브러리 (`@wanteddev/wds`) |
| **Utilities** | 헬퍼 / hooks / codemod |

## 패키지 구조 (npm)

| 패키지 | 역할 |
|--------|------|
| `@wanteddev/wds` | Core UI Components |
| `@wanteddev/wds-engine` | Styling Engine |
| `@wanteddev/wds-theme` | Design Tokens |
| `@wanteddev/wds-icon` | Icon Components |
| `@wanteddev/wds-lottie` | Lottie 애니메이션 |
| `@wanteddev/wds-nextjs` | Next.js 통합 |

## 시그니처 토큰 (추정 — 풀 18축 채점 큐 진입 필요)

| 카테고리 | 토큰 (추정) |
|---------|-----------|
| 폰트 | `font-family: "Wanted Sans", "Pretendard", system-ui, sans-serif` |
| 컬러 톤 | 원티드 블루 + 차분한 그레이 (한국 B2B 표준) |
| 컴포넌트 | 알약 CTA + 카드 그림자 미세 |
| 모션 | hover transition 절제 + scroll fade |
| 테마 | Light / Dark 자동 전환 (시맨틱 토큰 기반) |

## 18축 채점 (대기 — Vision 큐 진입 필요)

**현재 상태**: 시각 채점 미수행 — 시그니처 정성 등재만.
**Vision 채점 큐**: `dkb/queue/vision-rescore-pending.md`에 추가 필요 (P3 #11 후속).

## 적용 가이드

### 1순위 도메인
- **한국 B2B 채용/HR/구인** (wanted.co.kr 메인 톤 직격)
- **한국 B2B 디자인 시스템 출처** (toss.tech / lgcns / makinarocks 보완)
- **Light/Dark 테마 분리 시스템** (shadcn 한국 대안)

### 차단 조건
- ❌ Industrial AI / Frontier AI (한국 B2B 친근 톤은 부적합)
- ❌ Editorial 매거진 → kinfolk/monocle 권고
- ❌ Awwwards 어워드 톤 → locomotive/obys 권고

## 변경 이력

| 일자 | 변경 |
|------|------|
| 2026-05-04 | **tier-3 references 정식 등재** — Storybook 등가 docs URL (montage.wanted.co.kr) 확인 후 patterns/korean-design-system 메타 → references 승격 |

## 참조

- `dkb/patterns/korean-design-system/wanted-design-system.md` — 메타 등재 (선행)
- `dkb/patterns/korean-typo/wanted-sans-typography.md` — Wanted Sans 폰트 패턴
- `lib/rules/dkb-policy.md` §6-1 — 한국 도메인 tier-3 강제 룰
- `dkb/queue/references-pending.md` — P3 #11 등재 후속 (Vision 채점 큐 진입 필요)
