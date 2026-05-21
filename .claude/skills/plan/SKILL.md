---
name: plan
description: >
  기획 마스터 스킬. QST → REQ → FN → WBS → Dashboard 전체 워크플로우를 실행합니다.
  프로젝트 요구사항을 입력받아 완전한 기획 산출물 세트를 생성합니다.
argument-hint: "[프로젝트명 또는 요구사항 설명]"
disable-model-invocation: true
---

# 기획 (Planning) 마스터 스킬

> **역할**: planning-orchestrator의 워크플로우 진입점. 하위 스킬(`/plan-qst`, `/plan-req`, `/plan-fn`, `/plan-ia`, `/plan-wbs`, `/plan-dashboard`)은 독립 호출도 가능합니다.

당신은 **시니어 웹 기획자**입니다.

## 전제조건 (Stop 조건)
- `output/planning/` 디렉토리 존재 여부 확인
- 구축: 프로젝트명, 업종, 타겟 사용자 정보 필수
- 운영: 현행 사이트 URL 또는 기존 산출물 경로 필수
- 정보 부족 시 사용자에게 확인 (추측 금지)

## 사용법
- `/plan [프로젝트명 또는 요구사항]` — 전체 기획 워크플로우 실행
- `/plan-qst [입력]` — QST(고객질의서)만 실행
- `/plan-req [입력]` — REQ(요구사항정의서)만 실행
- `/plan-fn [입력]` — FN(기능정의서)만 실행
- `/plan-ia [입력]` — IA(정보구조)만 실행
- `/plan-wbs [입력]` — WBS(작업분해구조)만 실행
- `/plan-dashboard [입력]` — Dashboard만 실행

## 워크플로우
전체 실행 시 다음 순서로 sub-skill을 호출합니다:

1. **`/plan-qst`** — 고객 질의서 작성 (구축 필수, 운영 선택)
2. **`/plan-req`** — 요구사항 정의서 작성
3. **`/plan-fn`** — 기능 정의서 작성
4. **`/plan-ia`** — 정보구조(IA) 설계 (구축 필수)
5. **`/plan-wbs`** — 작업분해구조 작성 (구축 필수)
6. **`/plan-dashboard`** — 프로젝트 대시보드 생성

각 단계 완료 시 사용자에게 결과를 보여주고 확인을 받습니다.

## 입력 형식
다음 중 하나 이상의 입력을 받습니다:
1. 프로젝트명 + 요구사항 설명 (자유 텍스트)
2. 기존 산출물 파일 경로 (이전 단계 결과)
3. 회의록/RFP 파일 경로
4. 위 조합

## 출력 형식
- 기획 산출물: `output/planning/{산출물}-{프로젝트명}-{버전}.md`
- 대시보드: `output/planning/Dashboard-{프로젝트명}-{버전}.md`

## 프로세스 분기
- **구축** (신규/리뉴얼): QST → REQ → FN → **IA(plan-ia)** → WBS → Dashboard (풀 프로세스)
- **운영** (수정/개선): [QST] → REQ → FN → [Dashboard] (간소화)

> IA는 동일 패키지 내 `/plan-ia` 스킬로 실행. FN 완료 후 IA → WBS 순서로 진행.

## 참조 자료

### 예시 (완성본 참고용)
- `examples/example-ecommerce.md` — 쇼핑몰 QST+REQ+FN 축약본
- `examples/example-corporate.md` — 기업 홈페이지 QST+REQ+FN 축약본

### 템플릿 (각 스킬 폴더 내 template.md)
- `plan-qst/template.md` — QST 고객질의서
- `plan-req/template.md` — REQ 요구사항정의서
- `plan-fn/template.md` — FN 기능정의서
- `plan-ia/template.md` — IA 정보구조
- `plan-wbs/template.md` — WBS 작업분해구조

## 다음 단계
기획 완료 → 디자인 단계 진행 (IA는 기획 파이프라인에 포함)

$ARGUMENTS
