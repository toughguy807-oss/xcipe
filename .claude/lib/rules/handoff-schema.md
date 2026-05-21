# 스킬→오케스트레이터 핸드오프 스키마

스킬이 산출물을 생성한 후 오케스트레이터에 전달하는 구조화된 META 블록 표준입니다.

## META 블록 형식

모든 스킬 산출물 파일 하단에 HTML 주석으로 삽입합니다:

```html
<!-- META {
  "skill": "plan-fn",
  "version": "v1",
  "project": "VISIT강남",
  "created": "2026-03-18",
  "state_version": 1,
  "self_check": "PASS",
  "self_check_detail": "6/6",
  "counts": {
    "fn_count": 12,
    "high": 3,
    "medium": 5,
    "low": 4
  },
  "ids": {
    "first": "FN-001",
    "last": "FN-012"
  },
  "dependencies": ["REQ_VG_v1.md"],
  "next_skill": "plan-ia"
} -->
```

## 패키지별 META 필드

### Planning
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| plan-qst | `q_count`, `confirmed`, `pending` | `first_q`, `last_q` |
| plan-req | `fr_count`, `nfr_count`, `must/should/could` | `first_fr`, `last_fr` |
| plan-fn | `fn_count`, `high/medium/low` | `first_fn`, `last_fn` |
| plan-ia | `page_count`, `depth_max`, `gnb_count` | `first_page`, `last_page` |
| plan-wbs | `task_count`, `milestone_count`, `total_days` | `first_task`, `last_task` |

### Planning (선택적)
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| plan-dashboard | `kpi_count`, `milestone_count`, `issue_count` | — |
| plan-competitor | `competitor_count`, `opportunity_count` | — |
| plan-persona | `persona_count`, `jtbd_count` | — |
| plan-premortem | `risk_count`, `tiger/paper_tiger/elephant` | — |
| plan-swot | `strength`, `weakness`, `opportunity`, `threat` | — |
| plan-stakeholder | `stakeholder_count`, `quadrant_count` | — |
| plan-prioritize | `feature_count`, `top5_count` | — |

### Design
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| design-benchmark | `site_count`, `category_count`, `point_count` | — |
| design-knowledge | `token_count`, `color_count`, `font_count`, **`motion_dna_count`**, **`mandate_preset_applied`** | — |
| design-layout | `page_count`, `pattern_count` | `first_page`, `last_page` |
| design-ui | `component_count`, `state_count` | `first_ui`, `last_ui` |
| design-replicate | `perspective_count`, `references_used`, **`section_packs_used`**, **`tone_assignment`** | — |
| design-image | `assets_total`, `assets_succeeded`, `assets_failed`, **`mode`**(single/batch), **`manifest_path`** | — |

> **`motion_dna_count`** (2026-05-04 신설): design-knowledge 8번째 토큰 카테고리 산출 개수. easing/duration/sequence 3축 모두 산출 시 `3`. modern-design-stack §8 CG-4 참조.
> **`section_packs_used`** (2026-05-04 신설): design-replicate가 섹션 단위 references를 사용한 경우 `["hero/foo", "pricing/bar"]` 형식. dkb-policy §7 참조.
> **`mandate_preset_applied`** (2026-05-04 신설): MANDATE 도메인 프리셋 적용 결과. `{"domain":"medical","strength":"full|signal-only|skip"}` 형식. design-knowledge MANDATE 섹션 참조.
> **`tone_assignment`** (2026-05-04 신설): design-replicate V1/V3/V4 perspective별 사용 Tone. `{"V1":"refined","V3":"editorial","V4":"brutalist"}` 형식. Tone 추천 엔진 결과 활용.
> **design-image `mode`/`manifest_path`** (2026-05-04 신설): Single/Batch 모드 구분 + Batch 시 manifest-output.json 경로.

### Publish
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| publish-markup | `section_count`, `ui_id_mapped`, `aria_count`, **`anchor_positioning_count`**, **`popover_count`**, **`batch_injected`**, **`batch_inject_errors`** | `first_ui`, `last_ui` |
| publish-style | `token_count`, `hardcoded`, `breakpoint_count`, **`view_transition_count`**, **`scroll_driven_count`** | — |
| publish-interaction | `component_count`, `event_pair_count`, **`css_native_motion_count`**, **`gsap_framer_count`**, **`motion_dna_var_uses`** | — |

> **CSS-Native Motion 필드** (2026-05-04 신설):
> - `view_transition_count`: `@view-transition` 선언 수
> - `scroll_driven_count`: `animation-timeline` / `animation-range` / `animation-trigger` 선언 수
> - `anchor_positioning_count`: `anchor-name` / `position-anchor` 선언 수
> - `popover_count`: `popover` 속성 사용 수
> - `css_native_motion_count`: 위 4 항목 합산
> - `gsap_framer_count`: GSAP/Framer Motion import 수 (≥1이면 PROMPT-NOTE.md 사유 명시 필수)
> - `motion_dna_var_uses`: `var(--ease-*)` + `var(--dur-*)` 사용 횟수 (목표 ≥6)
> 출처: modern-design-stack §8·§9 게임 체인저 5선 + CSS-Native Self-Check.

### QA
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| qa-functional | `tc_count`, `pass/fail/block`, `coverage_pct` | `first_tc`, `last_tc` |
| qa-accessibility | `violation_count`, `critical/major/minor` | — |
| qa-performance | `cwv_good_pct`, `resource_count` | — |
| qa-security | `vulnerability_count`, `critical/high/medium/low` | — |
| qa-debug | `issue_count`, `fixed`, `remaining`, `root_cause_identified` | — |

### Development
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| dev-spec | `table_count`, `api_count`, `api_auth/api_public`, `sequence_count`, `error_scenario_count` | `first_api`, `last_api` |
| dev-component | `component_count`, `atom/molecule/organism/page`, `hook_count`, `api_binding` | `first_ui`, `last_ui` |

### Utility
| 스킬 | counts 필드 | ids 필드 |
|------|------------|---------|
| playground | `template_type`, `component_count`, `interactive_control_count` | — |

## 통합 META 카운터 (오케스트레이터 누적, 2026-05-04 신설)

오케스트레이터는 파이프라인 1회 실행 동안 다음 카운터를 누적해 최종 핸드오프 리포트에 포함한다. 이 카운터들은 5건의 P0~P2 작업(design-image Batch / Tone 추천 / MANDATE / DKB Reject / figma-pull PR)의 운영 가시성을 확보하기 위함.

```json
"run_counters": {
  "tone_decision": {
    "top3": ["refined", "editorial", "brand-safe"],
    "selected": "refined",
    "source": "user_choice|orchestrator_default|mandate_override"
  },
  "mandate_application": {
    "domain": "medical",
    "strength": "full",
    "applied_tokens": ["primary_color", "body_font", "min_contrast"]
  },
  "design_image_batch": {
    "manifest_used": true,
    "assets_succeeded": 12,
    "assets_failed": 1,
    "publish_injected": 11
  },
  "dkb_rejects_logged_this_run": 0,
  "figma_pull_pr_created": false
}
```

| 카운터 | 산출 시점 | 출처 |
|--------|----------|------|
| `tone_decision` | Step 0-D.2 통과 직후 | design-orchestrator |
| `mandate_application` | Step 0-D.2 + design-knowledge 호출 후 | design-knowledge |
| `design_image_batch` | Step 2B-2.5 종료 시 | design-image manifest-output.json |
| `dkb_rejects_logged_this_run` | Step 3-5 호출 누계 | design-orchestrator |
| `figma_pull_pr_created` | figma-pull Step 9 종료 시 | figma-pull |

> 통합 카운터는 _handoff.md 또는 design 단계 종료 리포트에 JSON 블록으로 첨부. 누락 필드는 `null` 허용.

## 오케스트레이터 소비 방식

### Cross-Document Consistency Check
오케스트레이터는 이전 산출물의 META 블록을 파싱하여 교차 검증합니다:

```
FN 진입 시:  META(REQ).fr_count ≤ META(FN).fn_count (FN ≥ FR 원칙)
IA 진입 시:  META(FN).fn_count ↔ META(IA).page_count (기능-페이지 정합)
WBS 진입 시: META(FN).fn_count ↔ META(WBS).task_count (기능-작업 정합)
DEVSPEC 진입 시: META(FN).fn_count ↔ META(DEVSPEC).api_count (기능-API 정합, 중간+ 기준)
COMPONENT 진입 시: META(UI).component_count ↔ META(COMPONENT).component_count (UI-컴포넌트 정합)
```

### Gate 출력에 META 수치 포함
```
[Gate 2] FN 완료. Self-Check: PASS (6/6). FN 12건(H3/M5/L4). FR→FN 매핑 12/12.
→ A) IA 진행 B) reviewer unit 검수 C) FN 수정
```

## state_version 규칙

META 블록의 `state_version`은 동일 산출물의 수정 횟수를 추적한다.

| 상황 | state_version |
|------|--------------|
| 최초 생성 | `1` |
| Self-Check 실패 → 수정 후 재생성 | `2` |
| reviewer 피드백 → 수정 후 재생성 | `3` |

오케스트레이터는 state_version이 3 이상이면 이터레이션이 반복되고 있다는 신호로 판단한다. Ralph Loop 최대 3회 규칙과 연동된다.

## 계보(Lineage) 추적 — `parent` / `change_type`

산출물 버전업 시 **어느 버전에서 파생됐는지** + **무엇을 바꿨는지**를 명시한다. `publish-*` / `design-layout` / `design-ui` 같이 A/B/C 다안·버전업이 반복되는 산출물이 주 대상.

```html
<!-- META {
  "skill": "publish-markup",
  "state_version": 2,
  "parent": "v1_A",
  "change_type": "interaction_added",
  ...
} -->
```

| 필드 | 형식 | 설명 |
|------|------|------|
| `parent` | `v{n}` 또는 `v{n}_{A\|B\|C}` / `null` | 직계 부모 버전. 최초 생성은 `null` |
| `change_type` | enum | `design_original` / `interaction_added` / `image_fixed` / `review_applied` / `user_request` |

**적용 원칙**:
- `state_version: 1` + `parent: null` = 신규 창작
- `state_version: 2+`는 `parent` 필수. 누락 시 reviewer P1
- `change_type`은 enum 고정. 자유 기재 금지

**HTML 산출물**은 `<head>` 내부에도 동일 정보를 주석으로 남길 수 있다:
```html
<!-- 버전 정보: v2 | 작업: 인터랙션 추가 | 원본: v1_A -->
```

## META 블록 미존재 시 Fallback

- 이전 산출물에 META가 없으면 Grep으로 직접 파싱 (ID 패턴 검색)
- META 파싱 실패 시 "[META 미존재: 수동 확인 필요]" 경고 출력
- 다음 단계 진행은 차단하지 않음 (경고만)

---

## §"decisions[]" — 결정 로그 필드 (2026-05-11 신설)

**도입 근거**: 2026-05-11 세션 외부 자료 차용 체크리스트 적용 — MaxBrain 패턴(저자 판단 DB 자동 누적)을 SYS_v4 메타 시스템 차원으로 적용. 동등 자산(internal-ticket·memory) 부분 부재 → handoff-schema 확장으로 구현 (E.2 결과).

### 목적

각 스킬이 산출물 생성 시 **비자명한 결정**을 누적 기록 → 유사 프로젝트 착수 시 dkb-search가 references뿐 아니라 **과거 결정 로그**도 매칭. DKB의 프로젝트 레이어.

### 필드 정의

META 블록에 `decisions[]` 배열 필드 추가 (선택 필드, null 또는 빈 배열 허용):

```html
<!-- META {
  "skill": "design-knowledge",
  ...
  "decisions": [
    {
      "id": "DEC-001",
      "topic": "primary_color",
      "chosen": "#1a3a52",
      "alternatives_considered": ["#2d5a8a", "#0d2230"],
      "reasoning": "타겟 industrial-ai + brand-safe Tone. 채도 낮춤. MANDATE medical 도메인 적용",
      "source": "user_request|orchestrator_default|reference_dna|mandate_override",
      "reversibility": "easy|medium|hard"
    },
    {
      "id": "DEC-002",
      "topic": "hero_layout",
      "chosen": "split_60_40_image_right",
      "alternatives_considered": ["fullwidth_video", "centered_text_only"],
      "reasoning": "tier-1 anthropic.com hero DNA 차용. V1 perspective.",
      "source": "reference_dna",
      "reversibility": "medium"
    }
  ]
} -->
```

### 필드 명세

| 필드 | 형식 | 필수 | 설명 |
|------|------|:---:|------|
| `id` | `DEC-###` | ✓ | 스킬 내 순번 |
| `topic` | string | ✓ | 결정 대상 (예: `primary_color`, `hero_layout`, `tone_choice`) |
| `chosen` | any | ✓ | 채택된 값 |
| `alternatives_considered` | array | ✓ | 검토된 다른 선택지 (최소 1개) |
| `reasoning` | string | ✓ | 채택 이유 (1-2 문장) |
| `source` | enum | ✓ | `user_request` / `orchestrator_default` / `reference_dna` / `mandate_override` / `user_feedback` |
| `reversibility` | enum | ✓ | `easy` (Self-Check FAIL 시 즉시 변경 가능) / `medium` (publish 영향) / `hard` (Plan→Design→Publish 연쇄 영향) |

### 적용 우선순위

**필수 적용 스킬** (비자명 결정이 많은 영역):
- `design-knowledge` (color/font/spacing/motion 토큰 결정)
- `design-replicate` (V1/V3/V4 perspective + tone 결정)
- `design-layout` (페이지별 레이아웃 패턴 선택)
- `plan-fn` (복잡도 분류 결정)
- `plan-ia` (URL 구조 결정)

**선택 적용** (비자명 결정 적은 영역):
- `qa-*` (대부분 자동 측정)
- `dev-*` (스펙 기반 자동 도출)

### 오케스트레이터 활용

#### Cross-Project Decision Search

```
dkb-search (확장 모드) 호출 시:
  1. references 매칭 (기존 정적 매칭)
  2. + 과거 _handoff.md decisions[] 매칭 (신규)
     → 유사 컨텍스트(업종/타겟/우선축) 프로젝트의 결정 로그 발견
     → 채택률 / 거부율 / source 분포 분석
  3. design-replicate 입력으로 references + 과거 결정 함께 제공
```

#### Reviewer 활용

reviewer는 산출물 검수 시 decisions[] 확인:
- `reasoning` 1줄 미만 → P1 (이유 명시 부족)
- `alternatives_considered` 0건 → P2 (대안 검토 누락)
- `source: orchestrator_default` 70%+ → P2 (사용자 의도 반영 부족)

### Self-Check 항목 추가

각 스킬 Self-Check에 추가:
- [ ] 비자명한 결정 N건 중 decisions[]에 기록한 건수 = N (누락 0)
- [ ] 각 decision의 `reasoning` 1문장 이상
- [ ] 각 decision의 `alternatives_considered` 최소 1건

### 도입 일정 (점진)

- **2026-05-11**: 스키마 정의 신설 (본 §)
- **다음 세션**: design-knowledge·design-replicate에 시범 적용 (대표 스킬 2건)
- **검증 후**: 나머지 필수 적용 스킬에 확장
- **롤백 조건**: decision 기록이 스킬 출력 분량 30%+ 증가 → 간소화 (필수 필드만 유지)
