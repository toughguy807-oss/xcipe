# QA Generator

프로젝트 테스트를 실행합니다. qa-orchestrator가 전체 워크플로우를 통합 관리합니다.

## 사용법
- `/qa-run [프로젝트명]` — 전체 테스트 (기본값: full)
- `/qa-run [프로젝트명] --scope=full` — 전체 (Step 1→1.5→2→3→4)
- `/qa-run [프로젝트명] --scope=regression` — 회귀 (변경분 + Must TC)
- `/qa-run [프로젝트명] --scope=smoke` — 스모크 (Must TC만)
- `/qa-functional` — 기능 테스트만 (개별 스킬 직접 호출)
- `/qa-accessibility` — 접근성 테스트만
- `/qa-performance` — 성능 테스트만

## 테스트 범위 옵션

| 범위 | 실행 단계 | TC 범위 | 사용 시점 |
|------|----------|---------|----------|
| **전체 (full)** | Step 1→1.5→2→3→4 | FN 전체 TC 작성 + 실행 | 구축 완료, 첫 릴리즈 |
| **회귀 (regression)** | Step 1→2→4 | 변경분 TC + 기존 Must TC 재실행 | 운영 중 기능 추가/수정 |
| **스모크 (smoke)** | Step 1(Must만)→4 | Must TC만 빠르게 실행 | 긴급 배포, 핫픽스 |
| **기능+접근성** | Step 1→2→4 | 전체 TC + 접근성 (성능 생략) | 디자인 변경 위주 |
| **성능만** | Step 3→4 | 성능 측정만 | 최적화 후 재측정 |

> scope 미지정 시 qa-orchestrator가 Gate 0에서 사용자에게 범위 선택을 요청합니다.

## 입력 요구사항

| 산출물 | 필수 | 용도 |
|--------|------|------|
| HTML/CSS/JS (`output/publish/`) | **필수** | 테스트 대상 |
| FN 명세 (`output/planning/`) | **필수** | TC 매핑 기준 |
| REQ NFR | 권장 | 성능 목표값 |
| HTML 시안 / DESIGN_PRINCIPLES | 권장 | 디자인 QA 기준 |

## 예상 산출물

```
output/qa/
├── TC_{코드}_{버전}.md          ← 기능 테스트 결과
├── Accessibility_{코드}_{버전}.md ← 접근성 테스트 결과
├── Performance_{코드}_{버전}.md   ← 성능 테스트 결과
├── QA_Report_{코드}_{버전}.md     ← 종합 리포트
└── review-logs/                   ← 검수 로그
```

## 이터레이션

Critical 이슈 잔존 시 **최대 3회** 수정→재검증 루프를 실행합니다.
3회 후에도 미해결 시 사용자에게 에스컬레이션합니다.

$ARGUMENTS
