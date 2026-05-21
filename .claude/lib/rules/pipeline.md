# 파이프라인 설계 원칙

- 단계가 독립적이면 분리, 맥락이 엮여야 하면 통합
- 분리 기준: "이 단계의 출력이 다음 단계의 입력으로 충분한가?"
- 충분하지 않으면 쪼개지 말고 하나로 유지

## 선택적 파이프라인 단계

운영 모드에서도 구축 전용 단계를 선택적으로 포함할 수 있다. 프로젝트 CLAUDE.md에서 `선택 단계`로 명시한 스킬은 파이프라인에 포함되어 실행된다.

**선택 가능 단계 (운영 모드에서 기본 스킵, 필요 시 활성화)**:

| 단계 | 커맨드 | 삽입 위치 | 활성화 기준 |
|------|--------|-----------|-------------|
| 고객질의서 | `/plan-qst` | REQ 이전 | 고객 요구사항이 불명확할 때 |
| 정보구조설계 | `/plan-ia` | FN 이후 | 페이지 구조/네비게이션 변경 시 |
| 작업분해구조 | `/plan-wbs` | FN 이후 | 변경 범위가 크고 일정 산정 필요 시 |
| 대시보드 | `/plan-dashboard` | WBS 이후 | 다수 이해관계자 진행 공유 필요 시 |
| 벤치마킹 | `/design-benchmark` | 디자인 이전 | 디자인 방향 참고가 필요할 때 |
| 프리모템 | `/plan-premortem` | REQ 이후 | 프로젝트 리스크 사전 식별 시 |
| 경쟁사 분석 | `/plan-competitor` | QST 이후 | 경쟁 환경 전략 분석 시 |
| 사용자 페르소나 | `/plan-persona` | QST 이후 | 타겟 사용자 세분화 시 |
| 체계적 디버깅 | `/qa-debug` | QA 이후 | QA 이슈 근본 원인 추적 시 |

**프로젝트 CLAUDE.md 작성법**:
```markdown
### 선택 단계 (활성화)
- `/design-benchmark` — 디자인 방향 참고 필요
```
- 명시되지 않은 단계는 스킵
- 직접 호출(`/design-benchmark`)도 파이프라인 무관하게 항상 가능

---

# 산출물 수정 원칙

| 상황 | 처리 |
|------|------|
| 파이프라인 재실행 (이전 작업과 독립) | 타임스탬프 폴더 신규 생성 (`output/{프로젝트}-{YYYYMMDD-HHmmss}/`) |
| **같은 대화 내** 수정 요청 | 동일 폴더 내 버전업 (`v1` → `v2` → `v3`) + META에 `parent`/`change_type` 기록 |
| Self-Check / reviewer 실패 → 재생성 | 동일 폴더 내 버전업. `state_version` 증가 |

**원칙**:
- **기존 산출물 파일은 수정 금지**. 변경은 새 버전 파일로 기록 (계보 보존)
- **예외**: `_context.md`, `_handoff.md`, 인덱스 파일은 누적 메타 파일이므로 갱신 허용
- 버전 접미사: `_v2`, `_v3_A` 등. `handoff-schema.md`의 `parent` 필드와 정합 유지

적용 범위: `publish-*`, `design-layout`, `design-ui` 등 파일 단위 산출물. `plan-*`처럼 단일 문서 유지가 전제인 산출물은 Ralph Loop 내부에서 같은 파일 재작성 허용.

---

# Auto-Fix Loop 프로토콜 (Ralph Loop)

모든 오케스트레이터에 적용되는 표준 이터레이션 패턴. 검증 실패 시 자동 수정→재검증을 반복한다.

## 루프 구조

```
[생성] → [Self-Check] → PASS? → [다음 단계]
                           ↓ FAIL
                     [진단] → [수정] → [재검증] → PASS?
                                                    ↓ FAIL (n < 3)
                                              [재진단] → [수정] → [재검증]
                                                    ↓ FAIL (n = 3)
                                              [에스컬레이션]
```

## 적용 범위

| 오케스트레이터 | 루프 적용 단계 | 검증 기준 |
|--------------|-------------|----------|
| planning | Self-Check FAIL 시 | 체크리스트 항목 전수 Pass + **reviewer 자동 호출 PASS** |
| design | reviewer 60~79점 시 | P0/P1 이슈 0건 |
| publish | Self-Check FAIL 시 | 체크리스트 항목 전수 Pass |
| qa | Critical 잔존 시 | Critical 0건 |

## plan-* 단계 reviewer 강제 게이트 (2026-04-30 추가)

**이유**: 5건 외부 사례 분석(Schomay/Debs/Addy/Kanban/builder.inkeun) 메타 패턴 #2 — "생성자 ≠ 평가자". 자기 평가는 신뢰 불가. 디자인/퍼블리싱/QA는 외부 verifier(reviewer, publish-visual-verify) 보유하나, plan-* 6스킬(QST/REQ/FN/IA/WBS/Dashboard)은 자체 채점 위주 → 첫 단계 오류 하류 증폭 위험.

**규칙**: 각 plan-* 스킬 종료 시 Self-Check 통과 후 **reviewer 에이전트 자동 호출 필수**. reviewer는 독립 모델(Sonnet/high)로 산출물을 0~100점 채점.

| plan 스킬 | reviewer 게이트 점수 | 미달 시 |
|----------|--------------------|--------|
| plan-qst | ≥ 80 | Ralph Loop 진입 (최대 3회) |
| plan-req | ≥ 80 | Ralph Loop 진입 (최대 3회) |
| plan-fn | ≥ 85 | Ralph Loop 진입 (가장 결정적) |
| plan-ia | ≥ 75 | Ralph Loop 진입 |
| plan-wbs | ≥ 75 | Ralph Loop 진입 |
| plan-dashboard | ≥ 70 | 경고만 (집계 산출물) |

**예외**: 사용자가 명시적으로 `skip-reviewer` 옵션을 지정하거나 `feedback_pipeline_skip_ban.md`의 "긴급 운영 모드" 발동 시.

## 루프 규칙

1. **최대 3회** — 무한 루프 방지. 3회 실패 시 에스컬레이션
2. **부분 재검증** — 전체 재실행 아닌 실패 항목만 재검증
3. **수정 기록** — 매 회차 수정 내용을 _context.md에 기록
4. **점진적 개선 확인** — n회차 점수 ≥ (n-1)회차 점수가 아니면 접근 방식 변경 필요
5. **에스컬레이션 형식** — ccd-autogate.md의 에스컬레이션 출력 형식 준수

## 컨텍스트 오프로딩 (2026-04-30 추가)

**이유**: Addy Osmani 하네스 엔지니어링 — "큰 출력은 파일시스템에 오프로드". 한글 1.35x 토크나이저 + 75% 컴팩션 트리거 환경에서 본 컨텍스트는 가볍게 유지해야 reasoning thread 보존.

**규칙**:
- **서브에이전트(`Agent` 호출) 결과는 200단어 이하 요약만 본 컨텍스트로 회수**. 본 산출물은 `output/` 또는 `_context.md`에 저장 후 경로만 회수
- **WebFetch/검색 결과 1KB 초과 시** 핵심 인용 5줄 + 파일 저장 경로 패턴 권장
- **Self-Check/reviewer 채점표** 본문은 _context.md, 본 컨텍스트엔 점수+게이트 결과만

## 단계별 모델 배정 (Advisor Strategy)

Anthropic Advisor Strategy 패턴. 단계 유형별로 최적 모델을 자동 배정하여 품질은 유지하고 비용 60~80% 절감.

| 단계 유형 | 권장 모델 | 권장 effort | 사유 |
|----------|---------|-----------|------|
| 아키텍처/판단 (orchestrator) | Opus | xhigh | 복합 추론 필수 |
| 창작 (plan-fn, plan-req, design-layout) | Opus | xhigh | 품질 결정적 |
| 검증/채점 (reviewer, self-check) | Sonnet | high | 독립성 + 비용 효율 |
| 분석 (plan-competitor, plan-persona) | Sonnet | high | 패턴 분석 충분 |
| 단순 포맷팅 (plan-dashboard, MEMORY 갱신) | Haiku | medium | 비용 최소 |
| 라우팅 (pm-router) | Sonnet | medium | 빠른 분류 |

effort 레벨 (Opus 4.7):
- **xhigh**: 코딩/에이전틱 최적. high와 max 사이. 도구 호출 활발
- **high**: 대부분의 지능 필요 작업 최소 기준
- **medium**: 빠른 응답, 단순 작업
- **low**: 분류/라우팅 전용

설정 방법:
- 에이전트 frontmatter `model: opus|sonnet|haiku`
- 환경 변수 `CLAUDE_CODE_SUBAGENT_MODEL` (서브에이전트 일괄)
- effort: `/effort xhigh` 또는 `--effort xhigh`
- 스킬 내부 호출은 inherit (호출한 세션 모델 사용)

### Opus 4.7 행동 변화 주의 (2026-04-16)
- **더 문자적 지시 따르기**: "전부" "모든" 식 일반화를 자동 확장하지 않음. 구체적으로 열거해야 함
- **도구 호출 감소**: effort를 올리면 도구 사용 증가. xhigh 권장
- **서브에이전트 감소**: 명시적 Skill() 호출로 대응 (오케스트레이터에서 이미 적용)
- **토크나이저 1.35x**: 동일 입력에 토큰 최대 35% 증가. 컴팩션 트리거 여유 필요

## 검증의 코드화 (VeriMAP 패턴)

Self-Check를 마크다운 체크리스트에서 **실행 가능한 검증 함수**로 격상하는 패턴.

| 단계 | 방식 | 합리화 가능성 |
|------|------|-------------|
| 현재 (체크리스트) | "FR→FN 매핑 완전" (사람이 판단) | 🔴 높음 (합리화 가능) |
| VeriMAP (코드) | `verify_mapping(req, fn)` → `{pass, coverage, orphans}` | ✅ 0 (코드는 합리화 불가) |

적용 우선순위:
1. 추적성 검증 (FR→FN→UI→TC 자동 대조)
2. ID 스캔 (중복/누락 자동 탐지)
3. META 블록 검증 (필수 필드 존재 여부)
4. 하드코딩 탐지 (CSS 색상/폰트)

tools/verify-*.js 형식으로 스킬 내부에서 호출하거나 pipeline-worker 게이트에서 자동 실행.

## Motion DNA · Section Packs handoff (2026-05-04 추가)

motionsites.ai 리서치 + Interop 2026 반영. design ↔ publish 단계 간 자동 전달되어야 하는 신규 페이로드:

| 단계 | 산출 (META) | 소비 (다음 단계) |
|------|-----------|---------------|
| **design-knowledge** | `motion_dna_count: 3` (easing/duration/sequence) + `_handoff.md`에 `motion_dna` YAML 블록 | publish-style이 `:root`에 `--ease-*` / `--dur-*` 변수로 1:1 전사 |
| **design-replicate** | `section_packs_used: [...]` + REPLICATE_NOTE.md에 매칭 근거 | publish-markup이 섹션별 구조 참조 |
| **publish-style** | `view_transition_count` / `scroll_driven_count` / `motion_dna_var_uses` | publish-interaction이 보강 호출 결정 |
| **publish-interaction** | `css_native_motion_count` / `gsap_framer_count` | publish-visual-verify가 CSS-Native Self-Check (`modern-design-stack` §9) 강제 |

**파이프라인 게이트 자동화**:
- design-knowledge `motion_dna_count < 3` → PM-WARN, design-orchestrator Step 2 재진입
- publish-interaction `gsap_framer_count ≥ 1` AND PROMPT-NOTE.md에 사유 부재 → PM-WARN
- publish-style `motion_dna_var_uses < 6` → PM-BLOCK, Ralph Loop 진입 (스타일 토큰 부족)

자세한 검증 규칙은 `lib/rules/modern-design-stack.md` §9, 필드 정의는 `lib/rules/handoff-schema.md` Design/Publish 섹션 참조.

## `/loop` 스킬 연동

`/loop` 빌트인 스킬은 주기적 반복 실행용. 오케스트레이터의 Ralph Loop와는 다른 용도:

| 용도 | 도구 | 예시 |
|------|------|------|
| 검증 실패 자동 수정 | Ralph Loop (오케스트레이터 내장) | Self-Check FAIL → 수정 → 재검증 |
| 주기적 상태 확인 | `/loop` 빌트인 | `/loop 5m /status` — 5분마다 진행 현황 체크 |
| 배포 후 모니터링 | `/loop` 빌트인 | `/loop 10m /qa-performance` — 10분마다 성능 재측정 |

---

# Ralph Loop 자율 실행 안전망 (컨테이너 격리)

장시간 무인 실행이나 위험한 권한이 필요한 자율 실행은 **호스트 시스템과 격리**된 환경에서 돌린다. 시스템 손상 위험을 차단하고, 실패해도 본 환경은 영향받지 않게 한다.

## 격리 필요 조건 (하나라도 해당 시)

| 조건 | 사유 |
|------|------|
| `--dangerously-skip-permissions` 사용 | 권한 검사 우회 — 의도치 않은 파일 수정/삭제 가능 |
| 무인 야간 실행 (사용자 부재) | 실시간 개입 불가 — 폭주 시 차단 못함 |
| 외부 스크립트 실행 (`curl ... | sh`) | 출처 미검증 코드 실행 |
| Ralph Loop 4회+ 반복 (3회 한도 초과) | 비정상 패턴 — 합리화 루프 의심 |
| 패키지 매니저 글로벌 설치 (`npm i -g`, `pip install --user`) | 시스템 환경 오염 |

## 격리 방식 (우선순위)

1. **Docker 컨테이너** (권장)
   - `claude --dangerously-skip-permissions` 는 컨테이너 내부에서만
   - 호스트 마운트는 작업 디렉토리만 (`-v $(pwd):/work:rw`)
   - 네트워크는 필요 시에만 (`--network none` 기본)

2. **Worktree 격리** (Agent 호출)
   - `Agent({ isolation: "worktree" })` — git worktree 임시 생성
   - 코드 변경 실험에 적합. 시스템 자원 격리는 못함

3. **별도 사용자 계정** (Linux/macOS)
   - 일반 권한 사용자로 실행. sudo 권한 없는 환경

## 미격리 실행 차단

오케스트레이터는 다음 조건 중 하나라도 해당하면 **사용자 확인 없이는 진행 금지**:
- `--dangerously-skip-permissions` 플래그 감지
- Ralph Loop 4회차 진입 시도
- settings.json에 위험 권한 (`rm -rf`, `curl | sh` 등) 발견 → `/doctor` 권한 감사 결과 🔴 1건 이상

확인 시 메시지 형식:
```
⚠️ 격리 환경 권장
사유: {조건}
권장 조치: Docker 컨테이너 / worktree / 별도 계정
계속하시겠습니까? (y/격리 안내 보기/취소)
```

---

# 협업 프로토콜

자동화의 핵심은 "잘 짜인 프롬프트"가 아니라 **단계별 체크인이 가능한 협업 구조**다.

## 실행 원칙
- **단계별 확인**: 파이프라인을 한번에 돌리지 않는다. 각 단계 결과를 사용자에게 보여주고 확인 후 다음으로
- **옵션 제시**: 판단이 필요한 지점에서 혼자 결정하지 말고 선택지를 보여준다
- **방향 수정 권한**: 사용자가 잘못된 방향으로 가면 push back. 기대치 조절이 실망보다 낫다
- **중간 과정 설명**: 무엇을 왜 하는지 설명하면서 진행. 최종 산출물만 던지지 않는다
- **가정 금지**: 정보가 부족하면 추측하지 말고 사용자에게 확인

## 품질 앵커
- "해커톤 프로젝트가 아니라 프로급 결과물"
- "작동하는 것"이 아니라 "보여줄 수 있는 것"
- v1을 먼저 완성하고, v2에서 개선할 것을 제안
