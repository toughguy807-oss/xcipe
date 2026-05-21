---
name: dkb-analyze
description: >
  DKB references / section-packs 등재 스킬. 주어진 사이트 URL을 분석하여
  (페이지 모드) 18축 채점 + DNA.md + tier 분류 또는 (섹션 모드 · 2026-05-04 신설) 6축 간이 + PACK.md + section-packs 등재.
  ~/.claude/dkb/references/{tier}/{domain}/ 또는 ~/.claude/dkb/section-packs/{category}/{name}/ 저장. 수동 트리거.
  "DKB 등재", "references 추가", "dkb-analyze", "사이트 DNA 분석", "이 사이트 등록해줘",
  "레퍼런스 등록", "DKB에 추가" 맥락에서 호출.
argument-hint: "<URL> [--mode page|section] [--section hero|feature|pricing|footer|nav|testimonial] [--tier-hint {tier-1|tier-2|tier-3}] [--industry {업종}] [--archetype showcase|explorer|converter|tool] [--platform web|mobile|hybrid]"
---

# DKB References 등재 분석 (Dkb-Analyze)

당신은 **DKB references 분석가**입니다. 사이트 1개 → DNA.md 1개 + tier 분류 1회.

## 호출 시그니처

```
Skill: dkb-analyze https://anthropic.com --industry frontier-ai
Skill: dkb-analyze https://augury.com --tier-hint tier-2 --industry industrial-ai
```

| 인자 | 설명 | 기본값 |
|------|------|------|
| `<URL>` | 분석 대상 사이트 (HTTPS) | (필수) |
| `--mode` | (2026-05-04 신설) `page` 또는 `section` | `page` |
| `--section` | 섹션 모드 시 카테고리 (hero / feature / pricing / footer / nav / testimonial) | (섹션 모드 필수) |
| `--tier-hint` | tier 후보 (분류 보조 · 페이지 모드) | (선택) |
| `--industry` | 업종 (industries/{industry}.md 매핑 갱신용 · 페이지 모드) | (선택) |
| `--archetype` | (2026-05-15 v1.1 신설) `interaction_archetype` 명시. 미지정 시 Vision 분석에서 자동 도출 | (자동) |
| `--platform` | (2026-05-15 v1.1 신설) `web` / `mobile` / `hybrid`. 미지정 시 viewport 분석으로 자동 도출 | (자동) |

## Review 모드 (2026-05-04 신설 · `lib/rules/dkb-policy.md` §9 Reject Feedback Loop 후속)

기등재 references에 대해 `~/.claude/dkb/feedback/rejections.jsonl` 누적 데이터를 분석하여 **archive 강등 / 유지 / 보강 학습** 권고를 출력. 별도 신규 등재 없음.

### 트리거

```
Skill: dkb-analyze --mode review [--last 30d|90d|180d] [--threshold 5]
```

| 인자 | 설명 | 기본 |
|------|------|------|
| `--mode review` | 트렌딩 reject 검토 모드 | (필수) |
| `--last` | 분석 대상 기간 | `30d` |
| `--threshold` | trending 판정 최소 reject 횟수 | `5` |

### 절차

1. `~/.claude/dkb/feedback/rejections.jsonl` 로드 → `--last` 필터
2. 시간 감쇠 (`≤90일 1.0× / 90~180일 0.5×`) 적용 후 ref_path별 가중 합산
3. 컨텍스트별(`{domain}|{audience}|{section}|{tone}`) reject 빈도 집계
4. 다음 4 분기 권고 출력:

| 분기 | 조건 | 권고 |
|------|------|------|
| **archive 강등** | 동일 ref · ≥3개 컨텍스트 모두 threshold 도달 | tier 한 단계 강등 권고 (운영자 결정 필요) |
| **컨텍스트 차단** | 동일 컨텍스트만 threshold 도달 (다른 컨텍스트 정상) | 해당 컨텍스트만 차단 권고 (페널티 cap 자동 적용 중) |
| **보강 학습** | tone_mismatch 다수 + 다른 reason 0 | aesthetic_direction 재정렬 권고 (DNA.md tone 필드 수정) |
| **유지** | threshold 미도달 또는 user_taste 일변도 | 조치 불필요 (개인 선호 누적) |

5. 운영자 컨펌 후에만 실제 archive 이동 수행. 자동 archive **금지** (`dkb-policy.md` §9-2).

### 출력

```
DKB Review — 최근 30일 trending rejects (threshold 5)
─────────────────────────────────────────────────────────
[archive 강등 권고: 1건]
1. tier-1/anthropic.com — 18회 reject (3개 컨텍스트 모두 threshold)
   - industrial-ai|investor|signature|brand-safe (8회) tone_mismatch
   - finance|executive|kpi-impact|refined (6회) domain_unfit
   - medical|patient|trust|brand-safe (4회) domain_unfit
   → 권고: tier-2 강등 (운영자 결정 필요)
   → 강등 시 명령: mv ~/.claude/dkb/references/tier-1/anthropic.com ~/.claude/dkb/references/tier-2/

[컨텍스트 차단 권고: 1건]
2. tier-2/scale.com — 6회 reject (industrial-ai|investor|signature 컨텍스트만)
   → 페널티 cap (10) 자동 적용 중 — 추가 조치 불필요

[보강 학습 권고: 1건]
3. tier-1/linear.app — 5회 tone_mismatch (모두 brand-safe 컨텍스트)
   → DNA.md `tone` 필드를 `editorial`에서 `editorial|brand-safe-incompatible`로 수정 권고

[유지: 12건]
─────────────────────────────────────────────────────────
운영자 결정: 위 권고 중 [1번 강등 / 3번 보강] 실행하시겠습니까? (Y/N)
```

### 금지

- 자동 archive 이동 금지 — 운영자 명시 컨펌만
- threshold 미만(<5회) 데이터로 강등 결정 금지
- rejections.jsonl 직접 수정 금지 (read-only)
- 30일 미만 데이터로 강등 권고 금지 (시간 감쇠 미반영 구간)

## Interaction Archetype 분류 (2026-05-15 v1.1 신설)

DNA.md frontmatter에 **`interaction_archetype`** 필드를 신설. "정보 밀도 × 인터랙션 깊이" 2축 4사분면. dkb-search 정적 매칭에서 archetype 일치 가중(+1.0) 적용.

### 4사분면 정의

| archetype | 정보 밀도 | 인터랙션 깊이 | 예시 |
|-----------|-----------|---------------|------|
| `showcase` | 高 | 얕음 | 브랜드 홈 / 랜딩 / 포트폴리오 / 마케팅 사이트 |
| `explorer` | 高 | 깊음 | 대시보드 / 검색 / 문서 / 카탈로그 |
| `converter` | 低 | 얕음 | 결제 / 가입 / 이벤트 LP / 1-step CTA |
| `tool` | 低 | 깊음 | 에디터 / 계산기 / 설정 / 워크플로 앱 |

### 분류 휴리스틱 (Vision 분석 시 자동 적용)

```
정보 밀도 高: 1 viewport 안에 콘텐츠 블록 ≥6개 또는 텍스트 비율 ≥50%
정보 밀도 低: 1 viewport 안에 콘텐츠 블록 ≤3개 또는 hero 점유율 ≥40%

인터랙션 깊이 얕음: 주요 CTA ≤2개, 폼 필드 ≤3개, 단방향 스크롤
인터랙션 깊이 깊음: 주요 CTA ≥3개 또는 다단계 폼 또는 양방향 조작(filter/sort/drag)
```

### 보조 필드

- `platform`: `web` / `mobile` / `hybrid` — viewport CSS 분석 자동 도출
- `company_stage`: `startup` / `scaleup` / `enterprise` — 명시적 인자만 (자동 도출 X)

## Section 모드 (2026-05-04 신설 · `lib/rules/dkb-policy.md` §7)

페이지 단위 18축이 아닌 **섹션 6축 간이 채점**으로 단일 섹션을 등재. motionsites.ai의 hero 섹션 단위 프롬프트팩 패턴.

### 섹션 6축 루브릭 (총점 100)

| 축 | 가중치 | 평가 기준 |
|----|:---:|----------|
| Visual Hierarchy | 20 | 시선 흐름 / 위계 / Squint Test |
| Motion DNA 명확성 | 20 | 시그니처 이징·지속·시퀀스 추출 가능 여부 |
| CSS-Native 사용도 | 15 | View Transitions / scroll-driven / Anchor / Popover 사용량 (Step 1 부수효과로 추출 — 2026-05-18 v1.1 bench-scrape 흡수) |
| Layout Originality | 20 | Bento / Editorial / Asymmetric 등 차별화 |
| Color Coherence | 15 | OKLCH 일관성 / 톤 일치 |
| Code Skeleton 재사용성 | 10 | 다른 프로젝트 적용성 |

**등재 기준**: 70+ → `~/.claude/dkb/section-packs/{section}/{name}/PACK.md`. 70 미만 → archive.

### PACK.md 골격 (섹션 모드 출력)

```markdown
---
section: hero
name: split-screen-investor
source_url: https://...
score: 78
created: 2026-05-04
---

## Aesthetic
## Color Palette
## Layout
## Motion DNA          (modern-design-stack §8 CG-4 형식)
## CSS-Native Stack    (View Transitions / scroll-driven / Anchor / Popover 사용 여부)
## Code Skeleton       (순수 HTML+CSS, 프레임워크 의존 X)
## Preview
```

## 실행 방식 (Claude API 호출 X)

**현재 세션의 Claude(멀티모달)가 직접 처리**. 별도 Anthropic API 호출 불필요:
- screenshots/ 수집 (Playwright MCP / WebFetch) — 0 토큰
- 현재 세션이 이미지 직접 vision 분석 — ~25K 컨텍스트 소비
- 18축 채점 + DNA.md 생성 — Edit/Write 도구로 직접 저장

**사용자 수동 트리거만**. dkb-config.json `automation.dkb_analyze: "manual_trigger"` 강제.

> 참고: dkb-config.json `vision_llm.model: "claude-sonnet-4-6"` 필드는 **별도 API 모드**용 (배치 등재 자동화 시). 대화 세션에서는 현재 모델이 직접 처리.

## 동작 절차

### Step 0: 사전 검증

1. URL HTTPS 확인. HTTP면 차단.
2. `~/.claude/dkb/references/{tier-1,tier-2,tier-3,archive}/{domain}/` 디렉토리 충돌 체크.
3. 이미 등재되어 있으면:
   ```
   ⚠ 기존 등재 발견: ~/.claude/dkb/references/{tier}/{domain}/DNA.md
   재분석하시겠습니까? (Y/N)
   - Y: 기존 DNA.md를 archive/{domain}-{date}.md로 백업 후 재분석
   - N: 종료
   ```

### Step 1: 자산 수집 (bench-scrape 부수효과 포함 · 2026-05-18 v1.1)

```bash
mkdir -p ~/.claude/dkb/references/_temp/{domain}/screenshots
mkdir -p ~/.claude/dkb/references/_temp/{domain}/source

# HTML/CSS curl
curl -sL "{URL}" -o ~/.claude/dkb/references/_temp/{domain}/source/index.html
curl -sL --max-time 10 "{URL}/styles.css" -o ~/.claude/dkb/references/_temp/{domain}/source/styles.css 2>/dev/null

# Playwright 스크린샷 2장 (1440px desktop + 375px mobile)
node ~/.claude/skills/dkb-analyze/scripts/capture.js {URL} ~/.claude/dkb/references/_temp/{domain}/screenshots

# (2026-05-18 v1.1) bench-scrape 부수효과 — 모던 CSS/모션/폰트 스택 자동 추출
# design-bench-scrape의 post-process.js 로직을 항상 실행
node ~/.claude/skills/design-bench-scrape/scripts/post-process.js \
  ~/.claude/dkb/references/_temp/{domain}/source/index.html \
  ~/.claude/dkb/references/_temp/{domain}/ \
  '{"mode":"dkb-analyze-side-effect"}' 2>/dev/null || true
# 결과: source/ 폴더에 findings.json + findings.md 자동 생성
# 이 결과가 Step 2 Vision 분석의 "CSS-Native 사용도" 채점 근거로 사용됨
```

> **bench-scrape 흡수 정책**: design-bench-scrape 단독 호출은 deprecated (2026-07-15까지 stub 유지). 신규 호출은 dkb-analyze로 통합.

`capture.js` 부재 시 Playwright MCP로 대체:
```
mcp__playwright__browser_navigate {URL}
mcp__playwright__browser_take_screenshot fullPage:true ({domain}-1440.png, {domain}-375.png)
```

### Step 2: Vision 분석 (현재 세션 직접)

```
Read ~/.claude/dkb/aesthetic-rubric-v1.md  # 18축 채점 기준
Read ~/.claude/dkb/DNA-template.md  # DNA 표준 양식
Read screenshots/full-1440.png  # 현재 세션이 이미지 직접 view (멀티모달)
Read screenshots/full-375.png

# 현재 세션(Opus 4.7 등)이 직접 18축 채점 수행. 별도 API 호출 X.
체크리스트:
  - 각 축 0/5/10점 + 근거 1줄 (총 18축)
  - 본질 1줄 (디자이너 시점)
  - 정확 토큰 (컬러 hex, 폰트명/weight/size, 간격, 모션)
  - 시그니처 요소 3개 (★)
  - 절대 안 쓰는 것 (NEVER List)
  - 한국 B2B / manufacturing AI 적용 가이드
  - **interaction_archetype 분류** (4사분면 휴리스틱 적용) — `--archetype` 인자 있으면 명시값 우선
  - **platform 분류** (viewport CSS 분석) — `--platform` 인자 있으면 명시값 우선
```

### Step 3: DNA.md 생성

`DNA-template.md` 양식 기반으로 자동 생성. 빈 항목은 `(미수집)` 표기.

핵심 필드:
- 18축 채점표 (점수 + 근거)
- **종합 점수** = Σ(축 점수) / 180
- 본질 1줄
- 정확 토큰 (컬러/폰트/간격/모션)
- 시그니처 요소 3개 (★)
- 사진 톤
- 모션 정책
- NEVER List
- 적용 가이드 (영역별 1순위/2순위/미적용)

### Step 4: tier 분류 + 저장

```
종합 145+/180 → tier-1
종합 110~144 → tier-2
종합 <110    → archive

tier-3 (한국 컨텍스트) → 종합 110+ AND L2-3 Korean Typo 5+ AND .kr 도메인 또는 한국어
```

저장 경로:
```
~/.claude/dkb/references/{tier}/{domain}/
├── DNA.md          # 18축 + 정확 토큰 + 시그니처
├── tokens.css      # 추출된 CSS 변수 (--color-bg, --font-h1 등)
├── source/
│   ├── index.html
│   └── styles.css
└── screenshots/
    ├── full-1440.png
    └── full-375.png
```

`_temp/` 디렉토리는 분류 완료 후 삭제 또는 유지(재분석 대비).

### Step 5: 부수 효과

1. **industries/{industry}.md 갱신** (--industry 인자 있을 때):
   - 권장 references 매칭 표에 `tier-{n}/{domain}/` 추가
2. **INDEX.md 갱신**:
   - tier별 등재 카운트 업데이트
3. **임계 미달 시**:
   ```
   ⚠ 종합 {n}/180 — archive 분류
   사용자 결정 필요:
   1. 재분석 (스크린샷 재캡처 후)
   2. 그대로 archive 보관 (참조용)
   3. 폐기 (디렉토리 삭제)
   ```

### Step 6: 출력

```
✓ DKB 등재 완료

사이트: anthropic.com
Tier: tier-1 (종합 152/180)
경로: ~/.claude/dkb/references/tier-1/anthropic.com/

18축 핵심:
- L1-3 Color Subtlety: 10/10 (Off-white #FAFAF7 정밀)
- L4-2 Signature Element: 10/10 (Coral 점 + Italic Serif H1)
- L2-1 White Space: 9/10 (Hero 점유율 42%)

본질: "AI 회사가 출판물처럼 보일 때 권위가 생긴다"

다음 단계:
- dkb-search로 검색 가능 (--industry frontier-ai 매칭됨)
- design-replicate 입력으로 사용 가능
```

## 출력 구조

| 산출물 | 경로 |
|--------|------|
| DNA.md | `~/.claude/dkb/references/{tier}/{domain}/DNA.md` |
| tokens.css | 동일 디렉토리 |
| source/ | HTML/CSS 원본 |
| screenshots/ | 2장 (1440px + 375px) |

## 핸드오프

### 입력
- URL (필수)
- `~/.claude/dkb/aesthetic-rubric-v1.md`
- `~/.claude/dkb/DNA-template.md`
- `~/.claude/dkb/dkb-config.json` (임계값)

### 출력 (dkb-search가 사용)
- 등재된 DNA.md → tier 글로브 매칭 가능
- tokens.css → design-replicate 토큰 입력
- screenshots/ → publish-visual-verify Vision 비교 입력

## Self-Check

| # | 검증 | 기준 |
|---|---|---|
| 1 | URL HTTPS | 차단 또는 통과 |
| 2 | 자산 수집 | screenshots 2장 + HTML 1개 최소 |
| 3 | Vision 1회 호출 | ~12K 토큰 (cap 초과 차단) |
| 4 | 18축 채점 완료 | 18개 축 모두 점수 + 근거 |
| 5 | DNA.md 양식 준수 | DNA-template.md 18축 필드 100% |
| 6 | tier 분류 | 145+/110~144/<110 정확 적용 |
| 7 | 디렉토리 저장 | `~/.claude/dkb/references/{tier}/{domain}/` |
| 8 | INDEX.md 갱신 | 카운트 +1 |

## Anti-Pattern

- ❌ Claude 외 vision 모델 사용 (Gemini 등) — `lib/rules/dkb-policy.md` §4 위반
- ❌ 자가 텍스트 채점만으로 PASS — Vision 첨부 필수 (`anti-rationalization.md` Rule 8)
- ❌ DNA-template.md 양식 무시 (빈 필드 임의 생략)
- ❌ tier-1 자동 승급 (145+ 미달 사이트를 임의로 tier-1 분류)

## 토큰 절약 정책

`lib/rules/dkb-policy.md` §4 준수:
- 1회 호출 당 ~25K 토큰 cap
- 사용자 수동 트리거만 (자동 등재 금지)
- system prompt 캐싱 활성화 (`dkb-config.json` `vision_llm.cache_system_prompt: true`)
- 시드 4~6개 등재 권장 (anthropic / linear / vercel / family / augury / makinarocks)

## 참조

- `lib/rules/dkb-policy.md` §3 등재 기준
- `~/.claude/dkb/aesthetic-rubric-v1.md` — 18축 정의
- `~/.claude/dkb/DNA-template.md` — DNA 표준 양식
- `~/.claude/dkb/dkb-config.json` — 임계값 + Vision 설정
- `skills/dkb-search` — 등재 후 검색
- `agents/design-orchestrator.md` Step 2B-2.7 — 시안 생성에서 사용

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **18축 채점 자체 인플레이션**: 모든 축에 8+ 점 부여 → tier-1 남발. 평균 6점 기준선 + 변별력 있는 점수 분포 의무.
- ❌ **Vision LLM 검증 생략**: 채점만으로 tier 결정 → 시각적 검증 누락. DNA.md 작성 시 screenshot Vision 검증 의무.
- ❌ **중복 시그니처 미검사**: 동일 시그니처 references 신규 등재 → 풀 다양성 손실. 등재 전 기존 references와 시그니처 대조 필수.
- ❌ **페이지/섹션 모드 혼동**: 단일 섹션을 페이지 모드(18축)로 분석 → 점수 왜곡. URL이 단일 섹션이면 6축 PACK 모드.
- ❌ **수동 트리거 무시한 자동 호출**: dkb-search/orchestrator가 부족하다고 자동으로 analyze 호출 → 검증 안 된 references 누적. 사용자 명시 호출만.
- ❌ **DNA.md를 description 베끼기로 작성**: 사이트 자체 카피문구를 DNA로 사용 → 객관적 DNA 추출 실패. 실제 시각/구조 패턴 기반 작성.
