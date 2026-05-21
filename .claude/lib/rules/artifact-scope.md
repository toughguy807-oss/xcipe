# 산출물 범위 경계 (Artifact Scope)

파이프라인의 각 단계는 **고유 담당 영역**을 가진다. 한 스킬이 다음 단계의 결정을 미리 내리면, 후속 스킬이 그걸 복제하게 되어 전체 파이프라인 품질이 저하된다.

> **Iron Law**: "내가 이 결정을 내릴 권한이 있는가?" 를 생성 전에 확인하라. 없으면 뒷 단계로 위임한다.

## 단계별 소유 영역

| 단계 | 스킬 | 소유 결정 | 후속 단계로 위임 |
|------|------|---------|---------------|
| 1 | **plan-qst** | 고객에게 물을 질문 | 비즈니스 목표·KPI는 REQ가 확정 |
| 2 | **plan-req** | 비즈니스 목표·기능/비기능 요구사항·AC | 기능 상세 분기·상태 처리는 FN |
| 3 | **plan-fn** | 기능 분기·상태·검증 기준 | API/DB 구현·화면 배치는 dev-spec/design |
| 4 | **plan-ia** | 페이지 구조·네비·URL | 화면별 상세는 SB |
| 5 | **plan-sb** | 화면별 영역·요소 기능·플로우·MSG Case | 비주얼 디자인은 design-* |
| 6 | **design-benchmark** | 경쟁사·참조 사이트 분석 | 실제 토큰은 design-knowledge |
| 7 | **design-knowledge** | **디자인 토큰(컬러·타이포·spacing·radius·shadow·transition·icon)** | 레이아웃은 design-layout |
| 8 | **design-layout** | 페이지별 반응형 레이아웃·그리드 | 컴포넌트 스펙은 design-ui |
| 9 | **design-ui** | 컴포넌트 UI 스펙(hover/focus/disabled/size) | 구현 코드는 publish-* |
| 10 | **dev-spec** | ERD·API 엔드포인트·시퀀스·에러 매트릭스 | 실제 코드는 dev-api/dev-component |
| 11 | **publish-markup** | 시맨틱 HTML | CSS는 publish-style, JS는 publish-interaction |
| 12 | **publish-style** | BEM CSS·토큰 적용 | 상호작용은 publish-interaction |
| 13 | **publish-interaction** | JS 이벤트·상태 관리 | — |
| 14 | **qa-*** | 기능·접근성·성능·보안 검증 | — |
| 15 | **dev-api** | 백엔드 API 구현 | — |
| 16 | **dev-component** | 프레임워크 컴포넌트 변환 | — |

## 교차 금지 규칙 (가장 위반 많은 영역)

### plan-sb ← 디자인 결정 금지

SB는 기획 단계 최종 산출물. 디자인 요소를 미리 결정하면 design-knowledge/layout/ui가 SB를 복제하게 되어 **디자인 품질이 무너진다**.

| 금지 사항 | 이유 |
|---------|------|
| `theme` 객체 설정 (primary/background/text 등) | design-knowledge가 벤치마킹·브랜드 시트 분석 후 결정해야 함 |
| `divider.color`, `divider.background` 설정 | 위와 동일 |
| Description에 hex 값·폰트명·px 수치 기재 | design-knowledge(토큰)·design-ui(컴포넌트 스펙)의 영역 |
| Mockup HTML에 브랜드 컬러·세리프 폰트·그라디언트 | 흑백 와이어프레임만 허용 |
| `overview.techStack` 구체 기재 | dev-spec이 결정 |

**허용되는 디자인 메타**:
- Mockup HTML의 무채색 와이어프레임 팔레트 (#fff/#fafafa/#f0f0f0/#e0e0e0/#ccc/#333/#666/#999)
- 마커 식별색 #e4002b (브랜드와 무관한 식별 전용)

### plan-fn ← 구현 결정 금지

FN은 기능 명세. 구현 코드·API 호출·DB 쿼리는 dev-spec 영역.

| 금지 | 이유 |
|------|------|
| API URL·HTTP 메서드 지정 | dev-spec이 결정 |
| 테이블 스키마·SQL 쿼리 | dev-spec이 결정 |
| 라이브러리 선택 (React Query, SWR 등) | dev-component가 결정 |

### design-knowledge ← 컴포넌트 스펙 금지

design-knowledge는 토큰만. 컴포넌트별 hover/focus/disabled 상태는 design-ui.

| 금지 | 이유 |
|------|------|
| Button 기본 padding/border-radius | design-ui가 컴포넌트별 결정 |
| Card shadow variant | design-ui 컴포넌트 스펙 |

### design-ui ← 구현 코드 금지

design-ui는 명세만. 실제 HTML/CSS 코드는 publish-*.

| 금지 | 이유 |
|------|------|
| 실제 BEM 클래스명 `.btn--primary { ... }` | publish-style이 작성 |
| JavaScript 이벤트 핸들러 | publish-interaction |

## 독자 3자 이해 테스트 (산출물 검증)

각 산출물 생성 후 다음 3명이 읽었을 때 이해 가능해야 한다:

| 독자 | 이해 가능 | 실패 징후 |
|------|--------|---------|
| **클라이언트(비개발자)** | "내 서비스가 이렇게 동작한다" | "무슨 말인지 모르겠다" |
| **디자이너** | "어떤 영역이 어떤 기능인지 알고 시안 만들 수 있다" | "이건 개발 얘기 같은데?" |
| **개발자** | "구현 방향 이해. 상세는 FN/dev-spec 참조" | "상태·API 스키마를 추가로 봐야 함" |

3명 중 1명이라도 첫 반응이 "모르겠다" 또는 "내 영역 아님"이면 해당 부분 재작성.

## 스크러빙 (자동 복구)

LLM이 경계를 어겨도 post-process.js 또는 reviewer가 자동 제거:

| 대상 | 자동 제거 |
|------|---------|
| SB data.json의 theme 객체 | post-process.js normalizeDataJson |
| SB data.json의 divider.color | post-process.js normalizeDataJson |
| 한글 outputPrefix | post-process.js 영문 슬러그 변환 |

## 참조

- `rules/quality.md` — 산출물 품질 기준
- `rules/traceability.md` — ID 추적 체인
- `rules/pipeline.md` — 파이프라인 실행 원칙
- `rules/anti-rationalization.md` — 합리화 방지 (범위 이탈 시도 방지)
