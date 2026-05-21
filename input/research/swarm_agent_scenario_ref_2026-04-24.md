# Swarm Agent 시나리오 참고 자료 (2026-04-24)

> 외부 게시글 인용 (taihuikim, 15시간 전)
> 부동산 자산 최적화 도메인의 군집 AI 협업 시나리오
> ELUO SYS Phase 2 (인바운드 자동화·영업 파이프라인·CRM) 설계 참고용

## 원문

### 🐝 군집 AI 협업 시나리오: 프로젝트 "부동산 자산 최적화"
**Scenario: Collaborative AI Swarm for Property Asset Optimization**

#### 1. 지휘관 에이전트 (Commander Agent)
- "Attention, team. Our goal is to maximize the landlord's tax benefits while securing a stable tenant. Swarm, engage!"
- (팀원들 주목. 우리의 목표는 안정적인 임차인을 확보하면서 임대인의 세제 혜택을 극대화하는 것입니다. 군집 가동!)

#### 2. 법률/세무 에이전트 (Legal & Tax Agent)
- "Analyzing Clause 11 for liquidated damages. I've cross-referenced it with the latest tax precedents to ensure it's bulletproof."
- (손해배상 특약 제11조를 분석 중입니다. 최신 세무 판례와 대조하여 법적 빈틈이 없도록 설계를 마쳤습니다.)

#### 3. 시장 분석 에이전트 (Market Analysis Agent)
- "Scanning current rental prices in Gwanak-gu. I'm filtering for high-quality tenants who prefer 'zero-loan' properties."
- (관악구 전세 시세를 스캐닝하고 있습니다. '무대출 주택'을 선호하는 우량 임차인들을 필터링 중입니다.)

#### 4. 커뮤니케이션 에이전트 (Communication Agent)
- "Drafting a persuasive proposal for the real estate office. Focusing on the 'trust' and 'security' of the owner's asset."
- (중개업소에 보낼 설득력 있는 제안서를 작성 중입니다. 소유주 자산의 '신뢰'와 '안전성'에 초점을 맞추고 있습니다.)

#### 5. 토큰/비용 최적화 에이전트 (Token & Cost Optimizer)
- "Synchronizing 300 agents' workflows. Pruning redundant tasks to save 15% on API costs."
- (300개 에이전트의 워크플로우를 동기화하고 있습니다. 불필요한 중복 작업을 제거하여 비용의 15%를 절감합니다.)

---

## ELUO SYS 설계 관점 연관 분석

### 강한 연관: Cost Optimizer (15% 절감, 워크플로우 동기화)
**대응 설계**:
- ELUO SYS 핵심 원칙 #7: 모델 자동 라우팅 (opus → sonnet → haiku 에스컬레이션)
- `skill_health` 테이블: 실행 이력, 성공률, 평균 점수
- 채널 = 표시, 실행 = 격리 (혼재 방지) → 중복 작업 차단

**Phase 2 적용 포인트**:
- 에이전트 워크플로우 동기화 모듈 — 병렬 오케스트레이터 호출 시 동일 Read 중복 방지
- 비용 측정·리포팅 자동화 — 주간/월간 리포트 영역에 토큰 비용 추적 대시보드 추가
- 중복 태스크 가지치기 — execution_queue 테이블에 중복 감지 로직

### 중간 연관: Commander + 도메인 전문가 군집
**대응 설계**:
- 핵심 아키텍처 원칙 #3: 생산 에이전트 ≠ 검토 에이전트 (편향 방지)
- Phase 1 19영역 분리 + Hub 스킬 11개
- 파일(JSON)이 에이전트 간 유일한 인터페이스

**차이점**: Swarm은 동시 실행 군집, ELUO SYS는 파이프라인 순차 + 격리 실행

### 중간 연관: Communication/Market Analysis (메일 자동 제안서)
**대응 설계** (Phase 2):
- 인바운드 자동화 (메일 → 제안 → 수주)
- 영업 파이프라인 (deals)
- CRM (고객 관리)

**적용 시 고려사항**:
- 설득 문서 드래프팅 에이전트 분리 설계
- 시장/경쟁 데이터 실시간 스캐닝 모듈 (현재 `design-benchmark`는 정적)
- 제안서 자동 생성 → 휴먼 검수 게이트 (원칙 #4: 사람이 판단, AI가 실행)

---

## 비연관 요소

- 부동산/세무/법률 같은 구체 도메인은 SYS_v4 범위 밖
- 단일 시나리오 나열이라 직접 구현 가이드는 없음
- "300 에이전트"는 스케일 상상치 — 실제 운영 숫자 아님

---

## 활용 제안

### Phase 2 설계 문서에 반영 시점
1. 인바운드 자동화 FN 작성 시 — Communication Agent 패턴 참고
2. 영업 파이프라인 설계 시 — Market Analysis Agent의 필터링 로직 참고
3. 비용 대시보드 설계 시 — Cost Optimizer의 "중복 제거 + 비용 절감" KPI 차용

### 교차 참조 문서
- [skills_ecosystem_research_2026.md](skills_ecosystem_research_2026.md) — 스킬 생태계 조사
- [action_items_global_2026-03-26.md](action_items_global_2026-03-26.md) — 전역 액션 아이템
- [research_automation_quality_2026-03-29.md](research_automation_quality_2026-03-29.md) — 자동화 품질

---

**저장 경위**: 2026-04-24 외부 게시글 검토 중, 전역 세팅에는 직접 반영할 가치 낮으나 SYS_v4 Phase 2 인바운드/CRM 설계 참고 자료로 귀속.
