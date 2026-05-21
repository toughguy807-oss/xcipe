# Command vs Skill — 신설 기준

**원칙**: skill 시스템(자연어 description 자동 매칭)이 1순위. command는 좁은 예외 영역만.

**이유**: SYS_v4는 38 skills + 8 agents + pm-router 자동 라우팅이 이미 작동. command 추가는 inventory 중복 + 유지보수 부담. claude-starter-kit류 시스템(skill 시스템 없음)의 command 패턴을 1:1 차용 금지.

## 커맨드 신설 4대 조건 (OR — 하나라도 YES면 command 적격)

| # | 조건 | 판정 질문 | 예시 |
|---|------|----------|------|
| 1 | **메타 작업** | 프로젝트 콘텐츠가 아닌 시스템/세션 자체를 다루는가? | `/doctor` |
| 2 | **오발 치명** | 자연어 우연 매칭으로 실행되면 비용/리스크가 큰가? | `/run` |
| 3 | **외부 호출 필요** | hook/스크립트/스케줄러/CI에서 부를 가능성이 있는가? | `/figma-pull` (Git PR 훅) |
| 4 | **multi-step + 인자 파싱** | 명령 변형 (sub-command) 또는 옵션 플래그(`--scope`, `--ref`) 처리가 필요한가? | `/maintenance list/status/sync`, `/qa-run --scope=regression`, `/dkb-feedback --ref --last --summary` |

**1개라도 YES → command 적격.**
**4개 모두 NO → skill로 신설.**

**중요**: 1차 정책(2026-05-11)은 3대 조건 AND였으나, 실제 9 commands 감사 결과 조건 #4가 빠지면 multi-step orchestration이 skill로 강제 변환되어 자연어로 인자 처리가 불가능해짐. 2026-05-11 즉시 OR + 조건 #4 추가.

## 현행 9 commands 적격성 감사 (2026-05-11 4대 조건 기준)

| 커맨드 | #1 메타 | #2 오발치명 | #3 외부호출 | #4 multi-step/인자 | 판정 |
|--------|---------|------------|------------|--------------------|------|
| `/doctor` | ✅ | ✅ | ✅ CI | ❌ | **유지** |
| `/run` | ❌ | ✅ 대규모 비용 | ✅ 스케줄러 | ❌ | **유지** |
| `/status` | ✅ 프로젝트 메타 | ❌ | ❌ | ❌ | **유지** (조건 #1) |
| `/maintenance` | ❌ | ❌ | ❌ | ✅ sub-command (list/status/sync/projects) | **유지** |
| `/qa-run` | ❌ | ❌ | ❌ | ✅ scope 옵션(full/regression/smoke) + orchestrator | **유지** |
| `/figma-pull` | ❌ | ✅ | ✅ Git PR 훅 | ✅ 옵션 | **유지** |
| `/figma-push` | ❌ | ✅ | ✅ Git PR 훅 | ✅ 옵션 | **유지** |
| `/curate-theme` | ❌ | ❌ | ❌ | ✅ theme_slug + step 1-5 + 출처귀속 검증 | **유지 (단, 위치 검토)** |
| `/dkb-feedback` | ✅ DKB 메타 | ❌ | ❌ | ✅ --ref/--last/--reason/--summary 필터 | **유지** |

**감사 결론 (2026-05-11)**: 9 commands **모두 유지**. 1차 감사(3대 조건 AND)에서 4건을 deprecation 후보로 분류했으나, 실제 명령 파일 점검 결과 모두 multi-step orchestration 또는 인자 파싱 보유 → skill autocall로 대체 불가. 조건 #4 신설하여 재분류.

**보류 사항**: `/curate-theme`는 비짓강남 프로젝트 전용 명령. SYS_v4 전역 commands/ 폴더 위치는 부적합. 비짓강남 프로젝트 `.claude/commands/`로 이동 검토 권장 (사용자 결정).

**deprecation 정책 (향후 적용용)**: 폐기 결정 시 `commands/{name}.md`에 1줄만 남김 — `> Deprecated. 자연어 '{키워드}' 또는 skill '{skill명}' 사용.`

## Skill 적격 패턴

다음은 모두 skill로 처리:
- 프로젝트 산출물 생성 (plan-*, design-*, publish-*, qa-*)
- 도메인 분석 (DKB, 벤치마킹)
- 콘텐츠 변환 (figma sync 외)
- 1회성 분석/요약 (compound, dashboard)

## 예외: 새 진입점 도입 시 체크리스트

신규 기능이 필요할 때 우선순위:
1. **기존 skill 확장**으로 해결 가능한가? → 최우선
2. 신규 skill 적격인가? (위 기준 N개 YES) → skill 신설
3. command 3대 조건 모두 충족인가? → command 신설
4. 그 외 → 만들지 말고 자연어 처리

## 1차 노이즈 사례 (교훈)

**사례 1 — `/compound` 외부 차용 (2026-05-11)**: 외부 자료(`claude-starter-kit`) 차용 검토 중 command 추천 → 본 룰 적용 결과 skill로 정정. 외부 시스템의 command 패턴은 그들 시스템에 skill 인프라가 없기 때문이며, 우리 인프라에는 부적합.

**사례 2 — 9 commands 감사 부정확 (2026-05-11)**: 1차 감사에서 description만 보고 /maintenance, /qa-run, /curate-theme, /dkb-feedback 4건을 "skill 중복"으로 deprecation 후보 분류. 실제 명령 파일 점검 결과 모두 sub-command + 옵션 플래그 + multi-step orchestration 보유 → skill autocall로 대체 불가. 4건 모두 유지로 정정 + 4대 조건 신설.

**메타 교훈**:
1. 외부 자료 패턴 차용 시 우리 인프라 상응 자산 점검 의무
2. command/skill 적격성 판단 시 **description만 보고 결정 금지** — 실제 파일 내용 읽어 multi-step/인자 처리 여부 확인 의무

---

## 외부 자료 차용 시 의무 체크리스트 (2026-05-11 신설)

GitHub repo, 블로그, 다른 AI 시스템(claude-starter-kit, agent-skills, 이외 모든 외부 자료)의 패턴을 SYS_v4에 차용 검토 시 **다음 단계 의무 통과**:

### Step 1. 외부 자료 자체 평가
- [ ] 자료 출처와 신뢰성 명시 (URL, 작성자, 작성일)
- [ ] 자료의 대상 시스템과 SYS_v4 인프라 차이 명시 (예: "그들은 skill 시스템 없음", "그들은 React 풀스택 전제")
- [ ] 자료에서 우리에게 의미 있는 패턴 1-2개로 좁힘 (전체 차용 금지)

### Step 2. SYS_v4 동등 자산 점검 (필수 grep)
차용 후보 패턴마다:
- [ ] **Skills**: `Glob ~/.claude/skills/*/SKILL.md` + 관련 키워드 grep
- [ ] **Rules**: `Read ~/.claude/lib/rules/INDEX.md` + 23개 트리거 확인
- [ ] **Commands**: `ls ~/.claude/commands/` + 동등 기능 점검
- [ ] **Hooks**: `Read ~/.claude/settings.json` hooks 섹션
- [ ] **Memory**: `MEMORY.md` 인덱스 점검

**점검 결과**:
- 동등 자산 있음 → **차용 보류**, 기존 자산 확장 검토
- 동등 자산 없음 → 4대 조건 적용 (command vs skill 신설 판단)

### Step 3. 우리에게 맞는 이유 명시 (필수 1줄+)

차용 권장 시 다음 모두 보고:
- 패턴 출처: `{출처}` 의 `{패턴명}`
- 적합 이유: SYS_v4의 `{문제·기회}` 에 정확히 매칭. 근거: `{현재 결함·공백}`
- 부적합 이유 검토: 우리 인프라 `{X}` 가 이미 기능 제공. **차용 보류 가능**

### Step 4. 차용 후 메타 학습 누적

차용 진행 시:
- [ ] memory에 `reference_external_source_{source}.md` 또는 `feedback_external_diff_{topic}.md` 작성
- [ ] 차용한 패턴 + 우리 시스템 변형 + 그 변형의 이유 1줄
- [ ] 향후 동일 출처 자료 차용 시 본 memory 참조

### 적용 시점

**필수 적용 케이스**:
- 사용자가 외부 URL/repo를 분석 요청
- 외부 시스템에서 봤다는 패턴 검토 요청
- "이거 좋아 보이는데 우리도?" 류 발화 직후

**우회 금지**: "어차피 의도가 명확하니 grep 생략"은 본 룰 §1차 노이즈 사례 재발 패턴.

### 관련 룰
- `lib/rules/anti-rationalization.md` §"진단 정확도" — 본 체크리스트의 일반화 (모든 진단에 grep 의무)
