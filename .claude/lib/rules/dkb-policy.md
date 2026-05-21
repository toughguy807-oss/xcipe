# DKB (Design Knowledge Base) Policy v1.0

**도입일**: 2026-04-30
**적용 범위**: design-orchestrator, publish-orchestrator, design-* 스킬, publish-visual-verify
**On-demand 트리거**: DKB references 매칭·도입 결정·토큰 충돌 해소·디자인 시안 생성

## 배경

다회 재시도 (5회 케이스) + 다중 사이트 모방 (9개 갤러리, 2026-04-30) 디자인 사고 분석 결과:
- **모방 다양성** (9개 사이트 베끼기) → 평균값 회귀
- 벤치마크가 분석에 그치고 결과물 미반영
- LLM 자가 채점의 합리화로 검수 통과

DKB는 **관점 다양성 (1개 reference → 3종 V1/V3/V4 재해석)** + **References-First 강제** + **시각 정량 검증**으로 사고 본질 차단.

## 핵심 원칙

### 1. References-First (벤치마크 강제 반영)

모든 디자인 시안 생성은 **DKB references 매칭이 선행**되어야 한다.

| 단계 | 동작 |
|------|------|
| design-orchestrator Step 2B-2.7 | dkb-search로 매칭 references Top 3 자동 선정 |
| references 매칭 0건 | dkb-analyze 수동 트리거 권고 → 등재 후 진행 |
| references 무시하고 LLM 직접 생성 | **금지** — DKB 도입 효과 무력화 |

### 2. References 토큰 우선 (충돌 해소)

design-knowledge 토큰 vs DKB references DNA 토큰 충돌 시:

| 우선순위 | 적용 |
|---------|------|
| 1순위 | **DKB references DNA.md 토큰** (~/.claude/dkb/references/{tier}/{site}/) |
| 2순위 | 프로젝트 브랜드 시트 (PROJECT.md) |
| 3순위 | design-knowledge 자동 정의 (fallback) |

브랜드 시트와 references 톤이 충돌 시 사용자 확인 게이트 트리거.

### 3. 관점 다양성 (3종 V1+V3+V4)

design-replicate 시안 생성 시 **모방 다양성 금지**.

| 패턴 | 판정 |
|------|------|
| 9개 사이트 1:1 복제 → 9개 시안 | ❌ 금지 (9개 갤러리 사고 패턴) |
| 1개 reference → V1 충실 / V3 비판 대안 / V4 건설 3종 | ✓ 권장 |
| 3개 references → 각자 V1만 1:1 복제 | △ Speed Mode 한정 |

토큰 부담 + Claude-only 정책으로 **5종 → 3종 압축** (V2 트렌드는 V3에 흡수, V5 큐트는 사용자 명시 시만).

### 4. 토큰 절약 (Claude-only)

DKB 운영은 Claude API만 사용. Gemini 등 외부 LLM 금지.

| 항목 | 정책 |
|------|------|
| dkb-analyze (사이트 분석) | Claude Sonnet 4.6 vision 1회 호출 (캡처 2장 동시 입력) |
| dkb-harvest 자동 수집 | **폐기** — 사용자 명시 트리거만 |
| trend-radar 분기 자동 갱신 | **폐기 또는 사용자 트리거** |
| Vision LLM 시안 채점 | 3종 동시 입력 1회 (시안마다 호출 금지) |
| 시안 재생성 루프 | 최대 3회 (4회+ 시 사용자 에스컬레이션) |

### 5. 정량 검증 우선 (LLM 호출 최소화)

검증 순서: **정적 검증 1차 → Vision LLM 2차** (계층 검증).

| 검증 단계 | 방법 | 토큰 |
|-----------|------|:---:|
| 1차 | validate_wireframe.py 8 항목 + Grep Iron Rules + Never-Rules | **0** |
| 2차 | DKB 18축 Vision LLM 채점 (정적 PASS 시에만) | ~12K |

정적 FAIL 시 Vision 호출 생략 — 토큰 폭주 방지.

### 6. 등재 기준 (DKB references 145+/180)

dkb-analyze로 분석한 사이트는 18축 종합 점수로 등재 결정.

| 점수 | 처리 |
|------|------|
| 145+/180 | tier-1 또는 tier-2 등재 (도메인별) |
| 110~144 | tier-3 또는 archive (기록만) |
| <110 | archive — 부정 사례로 보존 (Anti-Slop 학습용) |

#### 6-1. 도메인 강제 우선 룰 (점수 vs 도메인 충돌, 2026-05-04 추가)

점수 145+/180이지만 **한국 도메인 (한글 메인 콘텐츠 / 한국 대기업 / 한국 공공 / 한국 B2C)** 인 경우:

| 케이스 | 처리 | 사유 |
|--------|------|------|
| 점수 145+ AND 한국 도메인 | **tier-3 강제** (점수 우선 X) | 글로벌 시각 톱(tier-1/tier-2)과 한국 컨텍스트 references 분리 — design-orchestrator의 "한국 컨텍스트 보강" 매칭이 tier-3에서 일어남 |
| 점수 145+ AND 글로벌 도메인 | tier-1 또는 tier-2 (점수 우선) | 일반 룰 |
| 점수 144 이하 AND 한국 도메인 | tier-3 등재 | 일반 룰 |

**현재 사례**: `tier-3/lgcns.com` (145/180), `tier-3/visitseoul.net` (144/180) — 점수상 tier-1/2 진입 가능하나 **한국 도메인 직격 references**로 tier-3 고정.

**판정 기준 (한국 도메인)**:
- 한글 메인 콘텐츠가 시그니처에 포함됨 (한영 듀얼 H1, 한글 word-break, Pretendard/Wanted Sans)
- 한국 시장 직격 사이트 (한국 대기업 SI, 한국 공공/지자체, 한국 B2C 톱)
- design-orchestrator에서 "한국 컨텍스트 매칭"으로 호출되는 직격 references

**예외**: 한국 도메인이라도 **글로벌 일반 매칭 의도가 분명**한 경우(예: toss.tech가 글로벌 fintech 톱으로 등재될 때)는 사용자 명시 트리거 시 tier-1/tier-2 진입 허용.

**Why**: tier-1/tier-2는 글로벌 시각 시그니처 톱 references로 운영. 한국 도메인이 점수만으로 진입하면 design-orchestrator가 "글로벌 톱 references" 매칭에서 한국 사이트를 가져와 시각 톤이 흐려짐. tier 분리로 매칭 의도 보존.

## 주요 자산 위치

| 자산 | 경로 |
|------|------|
| DKB 디렉토리 | `~/.claude/dkb/` |
| 16/18축 루브릭 | `~/.claude/dkb/aesthetic-rubric-v1.md` |
| DNA 표준 양식 | `~/.claude/dkb/DNA-template.md` |
| references | `~/.claude/dkb/references/{tier-1|tier-2|tier-3}/{site}/DNA.md` |
| dkb-config | `~/.claude/dkb/dkb-config.json` |
| 신규 스킬 | `skills/dkb-analyze`, `skills/dkb-search`, `skills/dkb-curate` |

## CCD 모드 통합

CCD 모드에서도 DKB 정책은 우선 적용:

| 단계 | CCD 자동 | 사용자 게이트 |
|------|:--------:|:------------:|
| references 매칭 | ✓ | - |
| 3종 시안 생성 | ✓ | - |
| 18축 정량 채점 | ✓ | - |
| 145+ PASS 시 시안 선정 | ✓ (최고점 자동) | - |
| 145 미달 자동 재생성 (최대 3회) | ✓ | - |
| 3회 후 미달 | ❌ | **에스컬레이션** |

CCD에서도 **3회 재생성 후 미달은 사용자 확인 게이트 유지** (자동 강행 금지).

## DA Protocol 정합

design-orchestrator의 DA(Devil's Advocate) Protocol과 DKB는 보완 관계:

| 게이트 | 역할 | 적용 |
|--------|------|------|
| **DA 디자인 3대 챌린지** | 정성 도전 (시각 퀄리티 / 레퍼런스 정합 / 차별화) | 매 Step 진입 전 |
| **DKB 18축 Vision 채점** | 정량 측정 | Step 2B-2.7 후 |

둘 다 통과해야 Step 3 검수 진입.

## 7. Section Packs (2026-05-04 추가 · motionsites.ai 패턴)

**배경**: motionsites.ai는 페이지 단위가 아닌 **hero 섹션 단위 프롬프트팩** 65개로 운영. dkb references(페이지·사이트 단위)와 **직교 차원**으로 운영하면 design-replicate 조합 폭이 N배 증가.

### 7-1. 디렉토리 구조

```
~/.claude/dkb/
├── references/          (기존 — 페이지·사이트 단위 DNA)
│   └── {tier}/{site}/DNA.md
└── section-packs/       (신설 — 섹션 단위 미니 프롬프트팩)
    ├── README.md
    ├── hero/
    │   └── {pack-name}/PACK.md
    ├── feature/
    ├── pricing/
    ├── footer/
    ├── nav/
    └── testimonial/
```

### 7-2. PACK.md 구조 (motionsites.ai 골격 차용)

각 PACK.md 필수 섹션:

| 섹션 | 내용 |
|------|------|
| `## Aesthetic` | 톤 1줄 + 적합 업종 |
| `## Color Palette` | hex / oklch + 다크/라이트 분기 |
| `## Layout` | grid/flex 골격 + max-width + 여백 토큰 |
| `## Motion DNA` | easing/duration/sequence (modern-design-stack §8 CG-4 형식) |
| `## CSS-Native Stack` | View Transitions / scroll-driven / Anchor 사용 여부 |
| `## Code Skeleton` | HTML + CSS 스니펫 (Framer Motion 등 React 의존성 X) |
| `## Preview` | 스크린샷 또는 캡처 비디오 경로 |

### 7-3. dkb-search 매칭 우선순위

`dkb-search` 호출 시 페이지 단위 references와 섹션 단위 packs를 **직교 매칭**:

```
Skill: dkb-search
  --industry industrial-ai
  --target investor
  --priority signature,kpi-impact
  --top 3
  --section-packs hero,pricing,footer   # NEW
```

→ 출력에 `matched_pages[]` (기존) + `matched_section_packs[]` (신규) 둘 다 포함.

### 7-4. design-replicate 자동 흐름

```
1. dkb-search → 페이지 references Top 3 + 섹션 packs Top {n}
2. design-replicate
   - V1 충실: 페이지 references 1개 그대로
   - V3 비판: 섹션 packs 조합 (hero=A + pricing=B + footer=C)
   - V4 건설: 페이지 references + 섹션 packs 부분 차용
```

→ design-replicate META에 `section_packs_used: ["hero/foo", "pricing/bar"]` 기록 (handoff-schema 참조).

### 7-5. 등재 기준 (dkb-analyze 섹션 모드)

`dkb-analyze --mode section --section hero --url ...` 으로 단일 섹션 등재 가능. 18축 풀 채점이 아니라 **섹션 6축 간이 채점**:

| 축 | 가중치 |
|----|:---:|
| Visual Hierarchy | 20 |
| Motion DNA 명확성 | 20 |
| CSS-Native 사용도 | 15 |
| Layout Originality | 20 |
| Color Coherence | 15 |
| Code Skeleton 재사용성 | 10 |

총점 70+ 등재. 70 미만은 archive (Anti-Slop 학습용).

### 7-6. 자동화 진입점

| 진입점 | 동작 |
|--------|------|
| design-orchestrator Step 2B-2.7 | dkb-search가 자동으로 packs 동시 매칭 |
| publish-orchestrator Step 1 직전 | 섹션별 packs Code Skeleton 참조 가능 |
| `/curate-theme` 커맨드 | 신규 섹션 pack 등재 트리거 |

---

## 8. 운영 비용 정책 (2026-05-04 추가)

### 8-1. dkb-search 정렬 비용 (P3 #10)

dkb-search는 references + section-packs + patterns frontmatter를 **메모리 정렬**한다. 30+ references 환경 기준 부하 특성:

| 항목 | 측정값 (모의) | 임계 |
|------|:---:|:---:|
| Glob references 30개 frontmatter Read | ~30 × 4KB = 120KB I/O | 정상 |
| domains[] 매칭 점수 계산 | O(N × M) — N=references, M=쿼리 키워드 | N≤50까지 0-token |
| 정렬 (Top 3) | O(N log N) | N≤100까지 즉시 |
| section-packs 직교 매칭 | 카테고리당 ≤10건 (현재 6 카테고리) | 정상 |
| patterns 직교 매칭 | 카테고리당 ≤5건 (현재 8 카테고리) | 정상 |

**정책**:
- references **50건 이상** 시 dkb-config.json에 `index_cache: true` 도입 → frontmatter 인덱스 캐시 (`~/.claude/dkb/.index.json`).
- references **100건 이상** 시 정렬을 산업/도메인 사전 필터링 → Top N candidate만 채점.
- patterns / section-packs은 카테고리 단위로 디렉토리 분리 운영 → 정렬 대상 자체 축소 유지.

**현재 부하 (2026-05-04)**: references 5건(tier-3 4 + tier-1/2 1) + packs 6 카테고리 + patterns 8 카테고리 → **0-token 정적 매칭만으로 충분**. 캐시 도입은 50건 도달 시점에 트리거.

### 8-2. Pure black `#000` 사용 정합성 (P3 #12)

scale.com (tier-1) Pure black 시그니처 vs 일반 Anti-Slop "Pure black 회피" 룰 충돌. 일관 정책:

| 케이스 | 처리 |
|--------|------|
| **단일 사이트 시그니처 일부**(scale-pure-black 패턴, dev-tools/AI-research 도메인) | 허용 — Pure `#000` background + white text는 시그니처로 인정 |
| **Anti-Slop 자동 채택** (LLM이 토큰 부족으로 #000을 기본값으로 선택) | 차단 — modern-design-stack.md §3 Anti-Slop 적용 |

**판정 규칙**:
1. `dkb/patterns/color-systems/scale-pure-black.md`에 등재된 도메인(dev-tools / AI-research / 기술-실험적)에서 references 매칭 결과로 사용 → ✓
2. references 매칭 없이 LLM 기본값으로 사용 → ❌ Anti-Slop 차단
3. 한국 도메인에서 `#000` 본문 → ❌ (Pretendard + `#000` 조합은 contrast 가독성 떨어짐, `#1A1A1A`+ 권고)

**Why**: Pure black은 도메인 시그니처일 때만 의도적이며, 그 외에는 LLM 안전선택의 결과. references 매칭 트레이서로 의도 vs 회피 구분.

### 8-3. Vision LLM 재채점 토큰 cap (P3 #14)

archive 25건 일괄 재채점 시 토큰 폭주 방지:

| 항목 | 추정 |
|------|:---:|
| 시안 1건당 입력 (캡처 + 18축 프롬프트) | ~12K 토큰 |
| 25건 직렬 합산 | ~300K 토큰 |
| Opus 4.7 단일 컨텍스트 한계 | 200K (실효 ~150K) |

**정책**:
- 일괄 재채점은 **5건/배치** 분할 — 배치당 ~60K 토큰 (안전 마진).
- 배치 사이 대기 시간 없음 (사용자 대기 시간 최소화).
- `dkb/queue/vision-rescore-pending.md`에 배치 진행 상태 기록 (배치 1/5 완료 등).
- **재채점 트리거**: 사용자 명시 호출만 (자동 분기 갱신 없음 — §4 Claude-only 정책과 일치).
- 재채점 실패(timeout 등) 시 해당 배치만 재시도, 완료 배치는 보존.

### 8-4. Top 10 자동 추출 (P3 #15)

lapa.ninja / godly.website / awwwards.com 등 갤러리 사이트의 Top 10 references 자동 추출 정책:

| 항목 | 정책 |
|------|------|
| 자동 분기 갱신 | **폐기** (§4와 일치) |
| 트리거 | 사용자 명시 — `/curate-theme --gallery awwwards --top 10` |
| 파이프라인 | 갤러리 페이지 fetch → URL 추출 → dkb-analyze 일괄 호출 (Vision 1회/사이트) |
| 일괄 분석 토큰 | 10건 × 12K = 120K → 단일 호출 가능 |
| 등재 결정 | 18축 145+ → references / 110~144 → tier-3 / <110 → archive |

**Why**: 갤러리 자동 모니터링은 9개 사이트 사고 패턴(모방 다양성 회귀)으로 회귀할 위험 — **사용자 의도 명시**를 필수 게이트로 운영.

### 8-5. Figma 커뮤니티 → tokens.css 파이프라인 (P3 #16)

Figma 커뮤니티 디자인 시스템 파일을 references 자산으로 등재하는 형식:

| 단계 | 도구 | 산출 |
|------|------|------|
| 1. Figma 파일 import | Figma MCP `get_variable_defs` | variables JSON |
| 2. 토큰 정규화 | dkb-curate (신설 케이스) | `dkb/references/{tier}/{system}/tokens.json` |
| 3. CSS 변환 | dkb-curate `tokens.json → tokens.css` 변환기 | `dkb/references/{tier}/{system}/tokens.css` |
| 4. DNA.md 작성 | dkb-analyze 수동 호출 | DNA.md (토큰 시그니처 + 18축 채점) |
| 5. 등재 | references / patterns / section-packs 분기 | 점수에 따라 |

**등재 형식 (Figma 출처)**:
```
~/.claude/dkb/references/{tier}/{system-name}/
├── DNA.md           — 18축 채점 + 시그니처
├── tokens.json      — Figma variables 원본
├── tokens.css       — CSS 변환 산출
└── source.md        — Figma 커뮤니티 URL + 라이선스 명시
```

**라이선스 가드**: Figma 커뮤니티 파일은 라이선스 다양 (CC BY / 자체 라이선스 등). `source.md`에 라이선스 명시 + 사내 사용 가능 여부 기록 의무.

**Why**: Figma는 토큰 origin 자산 — 코드로 변환된 후에도 origin 추적 가능해야 라이선스 + 업데이트 추적 가능.

---

## 9. Reject Feedback Loop (2026-05-04 추가 · 동적 가중치)

### 9-1. 배경

dkb-search 매칭 결과가 **사용자 거부**(시안 검수에서 BLOCK / 직접 reject)로 끝나도 다음 매칭에서 동일 references가 다시 1순위로 추천되는 회귀 패턴 발견. 9개 갤러리 사고의 변형 — **모방 다양성 회귀**가 reject 신호 미반영으로 발생.

해결: reject 이벤트를 영구 로그에 누적해 dkb-search Step 0.5에서 동적 페널티로 차감. references 등재 강등은 운영자 명시 결정만 허용.

### 9-2. 핵심 정책

| 항목 | 룰 |
|------|---|
| 로그 위치 | `~/.claude/dkb/feedback/rejections.jsonl` (append-only) |
| 스키마 정의 | `~/.claude/dkb/feedback/README.md` |
| reason_code | 6종 화이트리스트 (tone_mismatch / domain_unfit / visual_overlap / user_taste / duplicate_signature / other) |
| reason 신규 추가 | 본 §9 갱신 + dkb/feedback/README.md 동기 갱신 필수 |
| 페널티 누적 cap | ref당 합계 절대값 ≤ 10 |
| 시간 감쇠 | ≤90일 1.0× / 90~180일 0.5× / >180일 무시 |
| references archive 결정 | 운영자 명시만 — reject 누적 자동 archive 금지 |

### 9-3. 적용 단계

| 단계 | 동작 |
|------|------|
| dkb-search Step 0.5 | rejections.jsonl 로드 → penalty_map 구성 |
| dkb-search Step 3 | `final_score = base + tier + axis + target - penalty_map[ref_path]` |
| dkb-search Step 5 | 출력에 `reject_penalty_applied{}` + `feedback_alert[]` 포함 |
| dkb-search Step 7 | `--reject` 인자 시 매칭 대신 reject 이벤트 append API 동작 |
| design-orchestrator | 시안 검수에서 사용자 BLOCK 신호 받으면 Step 7 자동 호출 (source: orchestrator) |
| reviewer 에이전트 | V1/V3/V4 검수 BLOCK 결정 시 자동 호출 (source: reviewer, 후속 과제) |

### 9-4. trending alert (Step 5 출력 `feedback_alert[]`)

동일 ref가 동일 컨텍스트에서 **5회 이상** reject된 경우, dkb-search 출력 `feedback_alert[]`에 다음 메시지 포함:

```
[
  "⚠ tier-1/anthropic.com — industrial-ai|investor|signature 컨텍스트에서 8회 reject. dkb-curate 재검토 권고."
]
```

이 alert는 정보성이며 자동 강등을 트리거하지 않는다. 운영자가 dkb-curate / dkb-analyze로 재평가한다.

### 9-5. §4 Claude-only 정책과 정합성

reject 로그는 **로컬 JSONL 파일 append**만 사용. 외부 LLM 호출 없음. Step 0.5 페널티 계산도 정적 매칭(LLM 0회). §4 토큰 절약 정책과 정합.

### 9-6. 감사 추적

- rejections.jsonl 라인 수정/삭제 금지 — 감사 추적성 유지
- 잘못 기록된 reject는 **반대 사유의 reject** 또는 **메타 라인**(`{"meta":"correction", "ref_target": "...", ...}`)으로 보정
- 분기 리포트 시 stats.json 자동 생성(50건 도달 시) → 운영자 검토 자료

---

## 참조

- `agents/design-orchestrator.md` — DA Protocol + References-First + 3종 관점 + Section Packs 자동 매칭
- `agents/publish-orchestrator.md` — 퍼블리싱 DA Protocol
- `lib/rules/pm-direction.md v2.0` — PMG vs DQG 구분
- `lib/rules/ccd-autogate.md` — DKB 단계 사용자 게이트 유지
- `lib/rules/anti-rationalization.md` — 외부 Vision 검증자 강제
- `lib/rules/modern-design-stack.md` §8 CG-4 — Motion DNA 토큰 형식 (PACK.md `## Motion DNA` 표준)
- `skills/publish-visual-verify` — 18축 채점 (design 모드)
- `memory/ref_design_quality_levers.md` — 4대 레버 + DKB 도입 배경
- `memory/ref_section_packs.md` — Section Packs 도입 배경 (motionsites.ai 패턴)
