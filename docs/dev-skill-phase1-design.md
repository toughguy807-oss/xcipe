# 개발 스킬 Phase 1 설계서
> 작성일: 2026-03-27 | 상태: 설계 (구현 전)

## 배경

파이프라인 갭: 기획✅ 디자인✅ 퍼블리싱✅ **개발❌** QA✅

현재 publish-markup/style/interaction이 **프론트엔드 정적 구현**만 담당.
백엔드 로직, API, 데이터 모델, 인증/인가는 수동 개발 영역.

## Phase 로드맵

| Phase | 스킬 | 입력 | 출력 | 범위 |
|-------|------|------|------|------|
| **1** | dev-spec | FN 기능정의서 | SDD(개발 명세서) | API 엔드포인트 + 데이터 모델 + 시퀀스 다이어그램 |
| **1** | dev-component | FN + STYLE + UI | 프론트엔드 컴포넌트 코드 | React/Vue 컴포넌트 (publish-*의 HTML→프레임워크 전환) |
| 2 | dev-api | dev-spec SDD | 백엔드 API 코드 | REST/GraphQL 엔드포인트 구현 |
| 2 | dev-test | FN + dev-spec | 테스트 코드 | 유닛/통합 테스트 |
| 3 | dev-deploy | 전체 | 배포 설정 | Docker, CI/CD, 환경 변수 |

## Phase 1 상세 — dev-spec

### 역할
FN(기능정의서)을 **개발팀이 바로 구현 가능한 기술 명세서**로 변환.

### 입력
- FN 산출물 (FN-### 카드: 화면/입력/처리/출력/검증기준/기술노트)
- _context.md (프로젝트 기술 스택 정보)

### 출력 구조
```markdown
# DEV-SPEC 개발 명세서 — {프로젝트명}
> FN 기반 | 버전: v1.0

## 1. 기술 스택 결정
| 항목 | 선택 | 대안 | 사유 |
|------|------|------|------|
| 프레임워크 | Next.js 14 | Nuxt 3 | FN 기술 노트 기반 |
| DB | PostgreSQL | MySQL | 관계형 데이터 + 예약 시스템 |
| ORM | Prisma | Drizzle | 타입 안전성 |
| 인증 | NextAuth.js | Clerk | 소셜 로그인 요건 |
| API | REST | GraphQL | 단순 CRUD 중심 |

## 2. 데이터 모델
### ERD
| 테이블 | 컬럼 | 타입 | FK | 인덱스 | FN 근거 |
|--------|------|------|----|----|---------|
| users | id | uuid PK | — | — | FN-014 |
| cafes | id | uuid PK | users.id (owner) | name | FN-009 |
| reservations | id | uuid PK | users.id, cafes.id | (user_id, date) | FN-004 |

### Prisma 스키마 (코드)
```prisma
model User { ... }
model Cafe { ... }
model Reservation { ... }
```

## 3. API 엔드포인트
| # | Method | Path | FN 근거 | 인증 | 요청 | 응답 |
|---|--------|------|---------|------|------|------|
| 1 | GET | /api/cafes | FN-001 | 불필요 | ?lat=&lng=&radius= | Cafe[] |
| 2 | POST | /api/reservations | FN-004 | 필수 | {cafeId, date, time, seats} | Reservation |

## 4. 시퀀스 다이어그램 (주요 플로우)
### 예약 생성 플로우
```
Client → API(/reservations) → DB(좌석 잔여 확인) → DB(예약 생성) → 알림 서비스 → Client(예약 확인)
```

## 5. 에러 처리 매트릭스
| FN-### | 에러 케이스 | HTTP 코드 | 응답 | 복구 |
|--------|-----------|----------|------|------|
| FN-004 | 좌석 없음 | 409 Conflict | {error: "no_seats"} | 다른 시간 안내 |
| FN-006 | 주문 시간 초과 | 400 | {error: "past_pickup"} | 시간 재선택 |

## 6. 추적성
| FN-### | API | 데이터 모델 | 테스트 |
|--------|-----|-----------|--------|
| FN-001 | GET /api/cafes | cafes | TC-F-001 |
| FN-004 | POST /api/reservations | reservations | TC-F-004 |
```

### 추적 체인 확장
```
FR-### → FN-### → API-### → MODEL-### → TC-###
                 ↓
              UI-### → HTML → Component
```

### Self-Check 항목 (draft)
| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | FN→API 매핑 완전성 | 복잡도 중간+ FN에 최소 1개 API 매핑. orphan FN 0건 |
| 2 | 데이터 모델 정규화 | 3NF 이상. 중복 컬럼 0건 |
| 3 | 에러 처리 매트릭스 | FN 검증기준의 에러 시나리오 → HTTP 에러 코드 1:1 매핑 |
| 4 | 인증/인가 | 보호 API에 인증 필수 표기. NFR-005(보안) 반영 |
| 5 | 기술 스택 사유 | 모든 선택에 "대안 + 사유" 존재. 무근거 선택 0건 |

### Gotchas
- FN 기술 노트가 비어있으면 스택 선택이 추측이 됨. FN에 기술 노트가 없는 기능은 `[기술 미결정]` 태그
- 데이터 모델에서 다대다 관계를 중간 테이블 없이 설계하면 쿼리 성능 문제
- API 버저닝 미설정 시 향후 호환성 파괴
- 인증 로직을 API마다 개별 구현하면 미들웨어 누락 위험. 공통 미들웨어 패턴 필수

---

## Phase 1 상세 — dev-component

### 역할
publish-markup의 **정적 HTML을 프론트엔드 프레임워크 컴포넌트로 전환**.

### 입력
- publish-markup 산출물 (HTML)
- STYLE 가이드 (디자인 토큰)
- UI 명세서 (상태/인터랙션)
- dev-spec (API 엔드포인트 — 데이터 바인딩)

### 변환 규칙
| HTML | → | Component |
|------|---|-----------|
| BEM 클래스 | → | CSS Modules 또는 Tailwind 클래스 |
| `data-ui-id` | → | 컴포넌트 ID 매핑 |
| 정적 텍스트 | → | props / state 바인딩 |
| `<form>` | → | 폼 라이브러리 (react-hook-form 등) |
| 플레이스홀더 이미지 | → | API 데이터 바인딩 |

### 출력 구조
```
src/
├── components/
│   ├── common/       (Header, Footer, Card, Button)
│   ├── cafe/         (CafeCard, CafeDetail, CafeMap)
│   ├── reservation/  (ReservationForm, TimeSlot, SeatPicker)
│   └── review/       (ReviewCard, ReviewForm, StarRating)
├── pages/            (라우팅별 페이지 컴포넌트)
├── hooks/            (useReservation, useCafe, useAuth)
├── lib/              (api.ts, utils.ts)
└── styles/           (tokens.css, globals.css)
```

### Self-Check 항목 (draft)
| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | UI-ID 1:1 매핑 | HTML data-ui-id → 컴포넌트 1:1. 누락 0건 |
| 2 | 디자인 토큰 참조 | 하드코딩 색상/폰트 0건. 전부 토큰 참조 |
| 3 | 상태 관리 | UI 명세 상태(hover/active/disabled/error) 전수 구현 |
| 4 | API 바인딩 | dev-spec API 엔드포인트에 대응하는 fetch/hook 존재 |
| 5 | 접근성 유지 | HTML의 ARIA 속성이 컴포넌트에서도 보존 |

---

## 리스크 (리서치 기반)

| 리스크 | 수치 | 대응 |
|--------|------|------|
| 컨텍스트 드리프트 | FN 70%+ 시 품질 하락 | 컴팩션 대응 룰 적용. FN 15건+ 시 분할 실행 |
| 코드 환각 | 19.7% (존재하지 않는 API/라이브러리) | Self-Check에서 import 유효성 검증 |
| 로직 에러 | 1.75배 (일반 코딩 대비) | FN 검증기준 → 테스트 코드 자동 생성으로 보완 |

## 선결 조건
- [ ] E2E 기획→퍼블리싱 파이프라인 안정화 (✅ 완료)
- [ ] publish-* Self-Check 보강 (✅ 완료)
- [ ] 타겟 기술 스택 확정 (Next.js vs Nuxt vs plain)
- [ ] dev-spec SKILL.md 초안 작성
- [ ] dev-component SKILL.md 초안 작성
