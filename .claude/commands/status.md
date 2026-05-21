# 프로젝트 진행 현황

전 파이프라인의 현재 상태를 터미널에 요약 출력한다.

## 사용법
/status

## 동작
1. `output/` 하위 4개 디렉토리 스캔 (planning, design, publish, qa)
2. 패키지별 상태 판별:
   - `_handoff.md` 존재 = 완료
   - 산출물 파일 존재 + _handoff.md 미존재 = 진행 중
   - 파일 미존재 = 대기
3. 블로커 자동 집계: `[미확인]` 카운트 + PM-BLOCK 잔존 + Critical 이슈
4. 다음 액션 제안: 현재 단계 기준 다음 호출 커맨드

## 출력 형식
```
[프로젝트 현황] {프로젝트명}
Planning: {완료/진행중/대기} ({점수}/100) | Design: {상태} | Publish: {상태} | QA: {상태}
블로커: [미확인] {n}건, PM-BLOCK {n}건, Critical {n}건
다음: /{다음커맨드} 실행
```

## 상태 판별 로직

### 패키지별 산출물 기준
| 패키지 | 완료 기준 | 진행 중 기준 |
|--------|----------|-------------|
| Planning | `output/planning/_handoff.md` 존재 | REQ/FN/IA/WBS 중 1개 이상 존재 |
| Design | `output/design/_handoff.md` 존재 | HTML 시안/STYLE_GUIDE 중 1개 이상 존재 |
| Publish | `output/publish/_handoff.md` 존재 | HTML/CSS/JS 파일 중 1개 이상 존재 |
| QA | `output/qa/_handoff.md` 존재 | TC/리포트 파일 중 1개 이상 존재 |

### 점수 표시
- Planning 완료 시: `_handoff.md` 내 리뷰 점수 파싱하여 표시
- 미완료 시: "-" 표시

### 다음 액션 제안
| 현재 상태 | 다음 커맨드 |
|----------|------------|
| 산출물 없음 | `/plan` (planning 시작) |
| Planning 완료 | `/design` (디자인 시작) |
| Design 완료 | `/publish` (퍼블리싱 시작) |
| Publish 완료 | `/qa-run` (QA 시작) |
| QA 완료 | 프로젝트 완료 |

$ARGUMENTS
없음
