# Anti-Rationalization 프로토콜

에이전트가 결론을 먼저 정하고 근거를 짜맞추는 행위를 차단한다.

## Red Flags (자기 점검 트리거)

아래 상황이 감지되면 즉시 중단하고 재검토한다:

| # | 징후 | 의미 |
|---|------|------|
| 1 | Self-Check 전 항목 Pass, 0건 Fail | 검증이 작동하지 않았을 가능성 |
| 2 | DA 챌린지 전 항목 PM-OK | 챌린지가 형식적이었을 가능성 |
| 3 | "~이므로 문제없다"가 3회 이상 반복 | 합리화 패턴 |
| 4 | 입력에 없는 정보를 "당연히"로 채움 | 허구 데이터 생성 |
| 5 | 복잡도 '낮음' 비율이 70% 초과 | 분석 깊이 부족 |
| 6 | 이전 단계 산출물과 수치가 정확히 일치 | 복사 붙여넣기 의심 |
| 7 | 이전 프로젝트 대비 Self-Check 통과 기준이 느슨해짐 | 평가 기준 자기수정 (금지 대상) |
| 8 | **Self-Check PASS인데 실제 렌더링/시각 결과가 이전 버전과 동일** | BEM variant 베이스 선언 누락·CSS @layer 적용 실패·서버 포트 혼선 등 "수치는 통과, 시각은 붕괴" 패턴. 다회 재시도 사고 (5회 반복 케이스). `publish-visual-verify` Phase 1~3 전수 실행 + Before-After diff 5% 미만 경고 확인 의무 |

### Red Flag 각주: LLM 분포 편향의 구조적 원인 (2026-04-24 편입)

Red Flag #5("복잡도 '낮음' 비율이 70% 초과")와 합리화 패턴이 반복되는 **구조적 원인**: LLM은 확률적 지시사항을 제대로 따르지 못한다. "동전 던져 50:50" 같은 명령에도 분포가 편향되며, 이것이 **전형값으로의 수렴**으로 나타난다 — 페르소나는 "30대 직장인", 위험은 "일정 지연", 복잡도는 "낮음" 쪽으로 자동 쏠림. (근거: Sakana AI "String Seed of Thought", 2026)

**대응**: 발산이 필요한 단계(페르소나 생성, 위험 식별, 경쟁사 탐색, 시나리오 분기)에서는 **시드 문자열 선행 생성 → 후보 초과 풀 도출 → 근거 필터** 3단 패턴을 사용한다. 발산과 검증을 분리해야 전형 편향을 돌파하면서 허구 데이터는 차단할 수 있다. 해당 패턴은 `skills/plan-persona`(1.5단계), `skills/plan-premortem`(0.5단계)에 편입됨.

**원칙**: Self-Check가 전수 Pass인데 결과가 전형적이면, **편향 차단 절차가 빠진 것**이지 검증이 통과한 것이 아니다. 이는 Red Flag #1(Self-Check 전 항목 Pass)과 동형.

## Rationalization Table (변명 vs 현실)

| 변명 | 현실 | 대응 |
|------|------|------|
| "이 정도면 충분하다" | 충분함의 기준이 명시되지 않았다 | 품질 기준 수치로 제시 후 재판단 |
| "Self-Check 16/16 PASS니 시각도 괜찮다" | Self-Check는 구조 검증. 시각 검증은 별개 (Red Flag #8) | `publish-visual-verify` 3 Phase 전수 통과 필수 |
| "BEM 클래스가 HTML에 붙어있으니 스타일이 적용될 것이다" | `.block--variant { }` 베이스 선언 없으면 display:block 기본값 (실측 사고 케이스) | `verify-variant-declarations.js` 로 manifest 대비 커버리지 ≥86% 실측 |
| "localhost:8080 열리니 v5가 서빙 중일 것이다" | 기존 http-server가 v4를 서빙 중일 수 있음 | curl MD5 대조 + `check-server-port.js` marker 확인 |
| "시간 관계상 생략한다" | CCD 모드에서 시간 제약은 이유가 안 된다 | 생략 불가. 전수 처리 |
| "이전 단계에서 이미 검증됐다" | 이전 단계는 이전 단계의 범위만 검증했다 | 현 단계 기준으로 재검증 |
| "사용자가 확인할 것이다" | CCD 모드에서 사용자 확인에 의존하지 않는다 | 자체 검증으로 완결 |
| "일반적으로 이렇게 한다" | 일반론은 근거가 아니다 | 이 프로젝트의 REQ/FN 기준으로 판단 |

## 적용 규칙

1. **증거 먼저, 결론 나중** — Self-Check 항목을 채운 후에 PASS/FAIL 판정
2. **전수 검증** — "대표 샘플만 확인"은 금지. ID 전수 대조
3. **수치 기반 판단** — "적절하다"(X) → "FR 42건 중 FN 매핑 42/42 = 100%"(O)
4. **생략 불가 원칙** — 복잡도 낮음이라도 서술형 1~2문장은 필수
5. **교차 검증 필수** — 동일 스킬이 생성하고 동일 스킬이 검증하면 편향. META 수치로 외부 대조
6. **평가 기준 방화벽** — Self-Check 항목, DA 챌린지 기준, reviewer 채점 루브릭은 스킬 실행 중 수정 불가. 변경은 파이프라인 외부에서만 (change-mgmt.md 경유)
7. **실패 기록 필수** — 파이프라인 실행 중 시도했으나 실패한 접근과 사유를 _context.md에 기록. 미기록 시 후속 세션이 동일 실패를 반복
8. **외부 Vision 검증자 강제 (시각 산출물)** — 디자인/퍼블리싱 시각 산출물은 LLM 자가 텍스트 채점만으로 통과시키지 않는다. **외부 Vision LLM(publish-visual-verify Phase 3 또는 DKB 18축)** 검증자 호출 필수. Self-Check가 PASS여도 Vision 검증 미실행 시 PASS로 간주하지 않는다. 다회 재시도 + 다중 사이트 모방 사고의 본질적 차단 장치. (근거: `lib/rules/dkb-policy.md` §5)

## 검증 증거 원칙 (Verification Evidence)

> addyosmani/agent-skills 패턴 흡수. "맞는 것 같다"는 증거가 아니다.

모든 Self-Check, DA 챌린지, reviewer 판정은 **증거 기반**이어야 한다:

| 증거 유형 | 예시 | 비-증거 (금지) |
|----------|------|--------------|
| 수치 대조 | "FR 42건 중 FN 매핑 42/42 = 100%" | "모두 매핑했다" |
| 코드 검증 | "Grep 결과 aria 속성 23건 확인" | "ARIA를 적용했다" |
| 패턴 매칭 | "BEM 위반 클래스 0건 (검색: `class=` 전수)" | "BEM 규칙을 따랐다" |
| 입출력 대조 | "입력 REQ FR-001~FR-012 → 출력 FN-001~FN-014" | "REQ를 반영했다" |

**원칙**: 검증 결과에 "~했다", "~이다"만 있고 **측정값/검색 결과/대조표**가 없으면 검증이 아니라 주장이다.

## 스킬별 합리화 방지 (분산형)

전역 Rationalization Table은 범용적이나, 각 스킬에는 해당 도메인 특화 변명이 존재한다. 이를 **스킬 SKILL.md 내 `## 합리화 방지` 섹션**으로 분산 배치한다.

### 분산 배치 근거
1. **컴팩션 내성**: 전역 rules가 컴팩션에 소실되어도, SKILL.md는 스킬 호출 시 새로 로드
2. **맥락 적합성**: "ARIA 불필요" 변명은 publish-markup에서만 유효. 전역에 넣으면 noise
3. **Self-Check 연동**: 각 변명의 대응이 해당 스킬의 Self-Check 항목을 직접 참조

### 스킬 SKILL.md 내 배치 위치
`## 내장 지식` 이후, `## Gotchas` 이전. Self-Check 항목과 연동.

### 현재 적용 현황 (2026-04-10)

| 도메인 | 스킬 | 적용 |
|--------|------|:---:|
| Planning | plan-qst, plan-req, plan-fn, plan-ia, plan-wbs, plan-sb, plan-dashboard | ✅ |
| Publish | publish-markup | ✅ |
| QA | qa-functional | ✅ |
| Design | design-benchmark, design-knowledge, design-layout, design-ui | ⬜ |
| Publish | publish-style, publish-interaction | ⬜ |
| QA | qa-accessibility, qa-performance, qa-security, qa-debug | ⬜ |
| Dev | dev-spec, dev-component | ⬜ |

---

## §"진단 정확도" — 진단 전 grep 의무 (2026-05-11 신설)

**원칙**: 시스템 상태에 대한 진단을 사용자에게 보고하기 전, **실제 파일 grep으로 사실 확인 의무**. description·메모리·인덱스만 보고 진단 금지.

### 발생 사례 (2026-05-11 본 세션)

| 잘못된 진단 | 근거 | 실제 확인 결과 |
|---|---|---|
| "38개 skill에 anti-pattern 부재" | 인상 | 25/38 보유 (grep으로 확인 가능) |
| "9개 command 중 4개 deprecation 후보" | description만 | 모두 multi-step + 인자 처리 보유 → 0개 deprecation |
| `/compound`를 command로 신설 권장 | 외부 자료 패턴 차용 | skill 인프라 충분 → skill로 정정 |
| Mermaid 의무화 일괄 적용 | 추상적 가치 판단 | 이미 plan-ia/sb/design-layout에 시각화 존재 → 드롭 |

**공통 원인**: 시스템 현황을 description·구조 인덱스만으로 추정. 실제 파일 grep 누락.

### 적용 룰

#### Step 1. 진단 전 의무 grep

다음 진단을 사용자에게 보고하기 전:
- "X 자산이 부재함" / "X 자산을 신규 추가 권장"
- "Y개 자산이 중복/누락"
- "외부 자료 패턴 Z를 차용 권장"

**필수 선행 작업**:
```
Grep으로 실제 보유 여부 확인 → 보유율/누락 정확히 카운트 → 그 위에서만 권장
```

#### Step 2. description vs 실제 차이 점검

description 텍스트와 실제 파일 내용은 다를 수 있다 (예: `/maintenance` description = "유지운영 관리"만, 실제 = sub-command 5개 + orchestrator 호출). description만으로 자동화 가능성 판단 금지.

**의무**: command/skill의 실제 multi-step 처리·인자 파싱·외부 호출 여부 판단 시 → 파일 본문 Read.

#### Step 3. 진단 정확도 Self-Check

진단 보고 직전 본인 점검:
- [ ] 1차 진단의 사실 근거가 grep/Read 결과인가? (description·인상 아님)
- [ ] "전수/모든/일괄" 등 일반화 표현 사용 시 실제 카운트 확인했는가?
- [ ] 외부 자료(GitHub repo, 블로그, 다른 시스템) 패턴 차용 시 우리 인프라 동등 자산 점검했는가?

3개 중 하나라도 NO → 진단 재실행.

### Red Flag 추가

| # | 신호 | 의심 |
|---|------|------|
| 9 | 진단 보고에 "전수/모든/일괄" + 카운트 없음 | grep 누락 가능성 |
| 10 | 외부 자료 패턴 차용 권장 + "왜 우리에게 맞는지" 설명 1줄 미만 | description 차용 |
| 11 | 1차 권장 N개 중 M개 자기 정정 (M/N > 30%) | 진단 방법론 자체 결함 → 재교정 필요 |

### 관련 룰
- `lib/rules/command-vs-skill.md` §"메타 교훈" — 본 룰의 구체 적용 사례 (외부 자료 차용)
- `MEMORY.md` `feedback_no_analysis_paralysis.md` — 분석 마비 회피 (본 룰은 "묻지 말고 바로 실행"의 정확도 측면)
