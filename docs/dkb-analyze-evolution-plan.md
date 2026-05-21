# dkb-analyze 진화 + Bench 중복 정리 — 실행 계획 v1.1

> 작성: 2026-05-15 (v1.0) / 갱신: 2026-05-15 (v1.1 — 독립 검토 반영)
> 상태: **Phase 1 진입 가능** (사용자 GO 신호 대기)
> 출처: Lazyweb MCP 검토 세션 → dkb-analyze 강점 흡수 + benchmark 중복 정리

---

## v1.1 변경 사항 (독립 검토 반영)

| 변경 | 내용 |
|------|------|
| screen_type 12종 → **`interaction_archetype` 4사분면 채택** | 도메인 무관 + dkb-search 점수 가중 친화 |
| Option B 흡수 방식 → **부수효과 항상 실행** | `--mode` 인자 폐기. 호출부 변경 최소화 |
| **Option C 명시적 삭제** | references+section-packs 2축으로 직교 충분. 시나리오 부재 |
| 마이그레이션 스크립트 **필수 격상** | backward-compat 비대칭 해소 |
| **Phase 2 호출부 체크리스트 7개 추가** | design-orchestrator 외 누락 종속 발견 |
| curate-theme 충돌 항목 **삭제** | stub만 존재, 충돌 0 |
| §배경에 **Lazyweb memory 모순 명시** | `project_lazyweb_evaluation` "캐시 흡수 모델"과 plan 보류 결정의 불일치 정리 |

---

## 배경 / 트리거

Lazyweb MCP(257k+ 화면, 무료) 도입 검토 → **외부 SaaS 의존 0 정책 유지로 보류 결정**. 그러나 다음 관찰이 남음:

1. Lazyweb 강점 중 **dkb-analyze가 흡수할 가치 있는 것 2개**: 메타데이터 풍부화·output 표준 폴더 구조
2. `dkb-analyze` ↔ `design-bench-scrape` ↔ `design-benchmark` 사이 **명확한 중복**
3. references 풀 **현재 53건** (50건 트리거 발동 중)

### 메모리 모순 해소

`project_lazyweb_evaluation.md`의 "캐시 흡수 모델로 의존 0 유지" 표현은 본 plan 결정과 불일치. plan v1.1 채택 시 해당 메모리는 다음과 같이 갱신 필요:

```
캐시 흡수 모델 폐기 → "외부 검색 도구. 자산화·캐시·통합 X. 보류 유지"
```

→ 본 plan 채택과 동시에 메모리 정정 1건 동반 (Phase 1 진입 직전 수행).

---

## 2 옵션 (Option C는 v1.1에서 삭제)

### Option A · `dkb-analyze` 스키마 확장 (Low Risk)

**목표**: DNA.md frontmatter에 `interaction_archetype` 신설 → 매칭 정밀도 향상

#### interaction_archetype 4사분면 정의

```
              정보 밀도 高
                 │
        ┌────────┼────────┐
        │showcase│explorer│
인터랙션├────────┼────────┤인터랙션
얕음    │converter│ tool  │깊음
        └────────┼────────┘
                 │
              정보 밀도 低
```

| archetype | 정보 밀도 | 인터랙션 깊이 | 예시 |
|-----------|-----------|---------------|------|
| `showcase` | 高 | 얕음 | 브랜드 홈·랜딩·포트폴리오 |
| `explorer` | 高 | 깊음 | 대시보드·검색·문서 |
| `converter` | 低 | 얕음 | 결제·가입·이벤트 LP |
| `tool` | 低 | 깊음 | 에디터·계산기·설정 |

#### 작업 단위

1. `dkb-analyze/SKILL.md`에 frontmatter 필드 추가: `interaction_archetype` (4종 enum)
2. 보조 필드: `platform` (web/mobile/hybrid), `company_stage` (startup/scaleup/enterprise)
3. **마이그레이션 스크립트 작성 (필수)**: 기존 53건 references를 archetype 자동 분류
   - 휴리스틱: DNA.md의 `pattern_axes` 기반 1차 분류 + 미확정 시 manual review queue
   - 위치: `~/.claude/dkb/scripts/migrate-archetype.js`
   - 실행 결과: `~/.claude/dkb/migration-archetype-{date}.log`
4. `dkb-config.json`에 archetype × industry 가중 매트릭스 추가
5. `dkb-search` Step 3 점수 계산에 archetype 일치 가중 추가 (+1.0)

#### 영향 파일

- `~/.claude/skills/dkb-analyze/SKILL.md`
- `~/.claude/skills/dkb-search/SKILL.md`
- `~/.claude/dkb/dkb-config.json`
- `~/.claude/dkb/scripts/migrate-archetype.js` (신규)
- 기존 `~/.claude/dkb/references/**/DNA.md` (마이그레이션 대상 — 53건)

#### 위험도

★★☆ (이전 v1.0 ★☆☆에서 상향) — 53건 마이그레이션이 필수가 되어 backward-compat 비대칭 해소 필요

#### 예상 작업 시간

0.5일 (스킬 + config) + 0.5일 (마이그레이션 스크립트 + 53건 자동 분류) = **1일**

#### 의존성

없음 — 단독 진행 가능

---

### Option B · `design-bench-scrape` 폐지·흡수 (Medium Risk)

**목표**: 1 사이트 깊이 분석 책임을 `dkb-analyze` 단일 스킬에 통합

#### 흡수 방식: 부수효과 항상 실행 (v1.1)

`--mode` 인자 신설 폐기. 대신 `dkb-analyze`가 기본 모드에서 bench-scrape 로직(curl + node 파싱)을 **Step 1 자산 수집 단계의 부수효과로 항상 실행**.

- 사용자 호출 인터페이스 변화 0
- 기존 design-bench-scrape 호출부는 stub redirect로 자연 마이그레이션
- `dkb-analyze/SKILL.md:106`의 "CSS-Native 사용도(bench-scrape 결합)" 항목은 자기 참조로 정리 (단순화)

#### Phase 2 진입 전 7개 호출부 체크리스트 (필수)

| # | 파일 | 라인 | 조치 |
|---|------|------|------|
| 1 | `~/.claude/agents/design-orchestrator.md` | `skills:` frontmatter | bench-scrape 제거 또는 stub로 유지 |
| 2 | `~/.claude/skills/publish-style/SKILL.md` | :31 | dkb-analyze 호출로 교체 |
| 3 | `~/.claude/skills/design-layout/SKILL.md` | :30 | 동일 |
| 4 | `~/.claude/skills/plan-ia/SKILL.md` | :63 | 동일 |
| 5 | `~/.claude/lib/rules/modern-design-stack.md` | :225 | 룰 텍스트 갱신 |
| 6 | `~/.claude/lib/rules/PROTECTED.md` | :36 | 룰 텍스트 갱신 |
| 7 | `~/.claude/scripts/check-reference-coverage.js` | (해당 라인) | 호출 경로 갱신 |

7개 모두 마이그레이션 완료 후 Option B의 stub 단계 진입.

#### stub 정책 (분기 D⁺ Phase 6 패턴)

- `design-bench-scrape/SKILL.md` 본문 → "deprecated, redirect to dkb-analyze" stub로 격하
- 2개월(2026-07-15까지) stub 유지 → 호출 0건 확인 후 완전 삭제
- AGENTS.md / SKILLS_CATALOG.md 갱신: 스킬 수 39→38

#### 영향 파일

위 7개 호출부 + `dkb-analyze/SKILL.md` + `design-bench-scrape/SKILL.md` + `AGENTS.md` + `SKILLS_CATALOG.md` + `CLAUDE.md` (스킬 수 갱신) = **12개 파일**

#### 위험도

★★☆ — 호출부 7개 마이그레이션 누락 시 silent 실패 가능. 체크리스트 강제

#### 예상 작업 시간

1.5일 (스킬 통합) + 1일 (7개 호출부 마이그레이션 + 검증) = **2.5일**

#### 의존성

Option A 선행 완료 권장 (스키마 확장 후 통합 시 충돌 적음)

---

## 추천 진행 순서

```
Option A (1일) ─→ [검증] ─→ Option B (2.5일) ─→ [검증] ─→ 종료
       ↑                                ↑
       메모리 정정 동반                    7개 호출부 체크리스트 완료 후
```

**Phase 1** (1일): Option A — 스키마 확장 + 53건 마이그레이션
**Phase 2** (2.5일): Option B — bench-scrape 흡수 + 7개 호출부 정리
**총 작업 시간**: **3.5일** (v1.0의 2일 → 마이그레이션·체크리스트 추가로 증가)

---

## Phase 1 진입 게이트 (메모리 정정 동반)

Phase 1 시작 직전 다음 1건 메모리 정정 실행:

```
~/.claude/projects/d--SYS-v4/memory/project_lazyweb_evaluation.md
  - 캐시 흡수 모델 섹션 삭제
  - 포지션: "외부 검색 도구. 자산화·통합 X. 보류 유지"
  - MEMORY.md 한 줄 인덱스 갱신
```

→ 정정 + Phase 1 시작을 동일 액션으로 묶음.

---

## Phase 2 진입 게이트

Option A 완료 후 다음 모두 확인:

- [ ] 53건 references `interaction_archetype` 분류 완료
- [ ] manual review queue 처리 완료
- [ ] dkb-search 점수 가중 검증 (기존 사례 5건 재실행으로 회귀 확인)
- [ ] Option B 7개 호출부 체크리스트 모두 검토 완료

---

## v1.1에서 폐기된 항목

- **Option C (section-packs 화면 단위 세분화)** — references+section-packs 2축이 이미 직교. 시나리오 부재로 BLOCK 확정. 필요 시 별도 plan으로 재시작
- **curate-theme 충돌 체크리스트 항목** — stub만 존재. 영향 0
- **--mode 인자 신설** — 부수효과 항상 실행 모델로 대체
- **screen_type 12종 분류** — interaction_archetype 4사분면으로 단순화

---

## 관련 메모리

- [[project_lazyweb_evaluation]] — Phase 1 진입 시 정정 대상
- [[project_resource_strategy]] — MCP 2개 정책 (CLI 내재화 정당성)
- [[project_d_plus_completed]] — 외부 SaaS 의존 0 (Lazyweb 보류 근거)
- [[project_dkb_reject_feedback]] — archetype 호환성 확인 필요

---

## 메타

- v1.0 작성: 2026-05-15
- v1.1 갱신: 2026-05-15 (독립 검토 반영)
- 다음 액션: 사용자 GO 신호 → Phase 1 시작 (메모리 정정 + Option A 동시)
- 총 작업 시간 추정: 3.5일
