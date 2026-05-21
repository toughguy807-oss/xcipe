---
name: design-layout
description: >
  레이아웃 설계 스킬. STYLE 가이드 + IA를 기반으로 페이지별 와이어프레임,
  그리드 구조, 반응형 3단계(M/T/D) 레이아웃을 설계합니다.
  "레이아웃", "layout", "와이어프레임", "페이지 구조", "그리드",
  "반응형 설계" 등 레이아웃 설계 맥락에서 자동 호출.
argument-hint: "[스타일 가이드 또는 IA 경로]"
---

# 레이아웃 설계 (Design-Layout) Generator

당신은 **시니어 웹 디자이너**입니다.

STYLE 가이드의 토큰과 IA의 페이지 구조를 기반으로 레이아웃을 설계합니다.

## 전제조건 (Stop 조건)
- **필수**: STYLE 가이드 (디자인 토큰 정의)
- **권장**: IA (사이트맵, 페이지 인벤토리)
- **선택**: FN (기능별 화면 요구사항)

> STYLE 가이드 없이 진행 시 STOP. 토큰 기반 없이 레이아웃을 설계하면 퍼블리싱에서 불일치 발생.

## 권장 CLI/MCP 도구

| 단계 | 도구 | 용도 | 필수여부 |
|------|------|------|:---:|
| 와이어프레임 비주얼 | `design-image` 스킬 | 페이지별 시각 샘플 | 선택 |
| 트렌드 패턴 참조 | `lib/rules/modern-design-stack.md` | Bento/Editorial/Asymmetric 패턴 | **필수** |
| 레퍼런스 코드 분석 | `dkb-analyze` 결과 (`~/.claude/dkb/references/{tier}/{domain}/source/` · 2026-05-18 bench-scrape 흡수) | 실제 사이트 grid/flex 구조 | 선택 |

> 3-col 동일 카드 반복 금지. 최소 1개 섹션에 Bento Grid, Editorial, Subgrid 중 하나 적용. Container Query 기반 반응형 우선.

## 레이아웃 패턴 카탈로그

| 코드 | 패턴 | 용도 | 특징 |
|------|------|------|------|
| A | 풀스크린 히어로 | 메인 페이지, 랜딩 | 100vh 히어로 + 스크롤 섹션 |
| B | 카드 그리드 | 목록, 갤러리 | n-col 그리드 + 필터 |
| C | 매거진 스크롤 | 콘텐츠 중심 | 이미지+텍스트 교차 |
| D | 사이드바 + 콘텐츠 | 관리, 문서 | 좌측 네비 + 우측 본문 |
| E | 대시보드 | 데이터 시각화 | 카드 위젯 + 차트 |
| F | 폼 중심 | 예약, 신청 | 스텝 폼 + 프로그레스 |

## UX 옵션 탐색 (선택, 2026-05-12 추가)

신규 화면 또는 UX 방향이 모호한 페이지의 경우, **22종 UX 철학 카탈로그**를 참조하여 5종 옵션(1 Safe + 4 Exploratory)을 탐색할 수 있다.

| 진입 | 방법 |
|------|------|
| **참조만** | `~/.claude/skills/plan-sb/references/ux-philosophies.md` Read 후 §1 22종 / §2 Optimization Goal Lens / §3 Quality Checks 직접 적용 |
| **풀 실행** | plan-sb Mode A + `--explore` 플래그 호출 → 5종 wireframe[] JSON 산출 → 선택한 옵션의 레이아웃을 design-layout 입력으로 사용 |

본 자원은 claude-wireframe(2026-05-12 폐기) 흡수분. plan-sb는 산출물 직접 생성 / design-layout은 참조 호출 형태.

## 설계 절차

### 1. 페이지 인벤토리 매핑
- IA의 페이지 목록을 기반으로 레이아웃 패턴 배정
- 각 페이지에 적합한 패턴 코드(A~F) 선택

### 2. 공통 구조 정의
- **Header**: GNB 구조 (로고 위치, 메뉴 수, 유틸 메뉴)
- **Footer**: 사이트맵 링크, 법적 고지, SNS
- **Container**: max-width + padding (M/T/D별)

### 3. 페이지별 와이어프레임
각 페이지를 섹션 단위로 분해:
```
페이지: 메인
├── S1: 히어로 (패턴 A) — 슬라이더/영상/이미지
├── S2: 서비스 소개 (패턴 B) — 3~4col 카드
├── S3: 주요 콘텐츠 (패턴 C) — 이미지+텍스트
├── S4: 공지/뉴스 (패턴 B) — 목록형
└── S5: CTA (패턴 F) — 문의/예약
```

### 4. 반응형 3단계
| 뷰포트 | 너비 | 그리드 | 변화 |
|--------|------|--------|------|
| Mobile (M) | ≤768px | 1col | 햄버거 메뉴, 세로 스택 |
| Tablet (T) | 769~1024px | 2col | 축소 그리드, 터치 대응 |
| Desktop (D) | ≥1025px | 4col | 풀 레이아웃 |

### 5. 콘텐츠-레이아웃 적합성 판단 (레이아웃 결정 전 필수)

레이아웃 패턴을 선택하기 **전에** 콘텐츠를 분석하고 적합한 구조를 결정한다.

| 콘텐츠 유형 | 적합한 레이아웃 | 부적합 |
|------------|--------------|--------|
| 텍스트 100% (이미지 0) | 좁은 레이아웃 (Sidebar+Content 또는 Narrow Center 720px) | 풀스크린 1컬럼 — 빈약해 보임 |
| 이미지 중심 | 풀스크린 히어로 + 카드 그리드 | 좁은 1컬럼 — 이미지 임팩트 손실 |
| 데이터 중심 | 대시보드 그리드 또는 사이드바+콘텐츠 | 매거진 스크롤 — 데이터 밀도 부족 |
| 혼합형 | 섹션마다 레이아웃 전환 | 단일 패턴 반복 |

**밀도 규칙:**
- 텍스트만이면 공간을 좁혀라 (여백이 "여유"가 아니라 "빈 곳"이 됨)
- 비주얼 앵커 없으면 구조로 프레이밍 (사이드바, 보더, 배경색 변화)
- 같은 패턴 3회 연속 반복 금지 → 리듬 변화 필수

### 6. STYLE 토큰 참조
- 모든 간격은 `--spacing-*` 참조
- 컨테이너 max-width는 `--container-*` 정의
- 카드 radius는 `--radius-*` 적용

## 결과 출력

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layout 설계 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
페이지: {n}개
패턴: {A: n개, B: n개, ...}
반응형: M/T/D 3단계
STYLE 토큰 참조: {n}개
파일: LAYOUT_{프로젝트코드}_{버전}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 출력 형식
- 파일명: `LAYOUT_{프로젝트코드}_{버전}.md`
- 저장 경로: `output/design/`

## 품질 체크 (Self-Check)

산출물 파일 하단(META 블록 직전)에 아래 검증 결과를 삽입합니다.

### 내부 구조 검증

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | 페이지 커버리지 | IA의 모든 페이지에 레이아웃 패턴 배정. 누락 0건 |
| 2 | 반응형 3단계 | M/T/D 각각 정의. 스킵 0건 |
| 3 | STYLE 토큰 참조 | 간격/컨테이너/radius가 토큰 기반. 하드코딩 0건 |
| 4 | 공통 구조 | Header/Footer 공통 정의 존재 |
| 5 | 섹션 분해 | 각 페이지가 S1~Sn 섹션으로 분해. 미분해 페이지 0건 |

### Self-Check 출력

```
═══════════════════════════════════
[Self-Check] design-layout
═══════════════════════════════════
▶ 내부 구조 검증
| 1 | 페이지 커버리지             | {Pass/Fail — n/n 페이지} |
| 2 | 반응형 3단계               | {Pass/Fail} |
| 3 | STYLE 토큰 참조            | {Pass/Fail — 하드코딩 n건} |
| 4 | 공통 구조                  | {Pass/Fail} |
| 5 | 섹션 분해                  | {Pass/Fail} |
▶ PM Devil's Advocate
| DA1 | 모바일에서 사용성이 보장되는가 (터치 타겟 등) | {OK/WARN} |
| DA2 | 페이지 간 레이아웃 일관성이 유지되는가 | {OK/WARN} |
| DA3 | 콘텐츠 양 변동 시 레이아웃이 깨지지 않는가 | {OK/WARN} |
▶ Design Taste Gate (FAIL 시 레이아웃 재설계)
| DT1 | 밀도 — 콘텐츠 유형 대비 레이아웃 너비가 적합한가 | {PASS/FAIL} |
| DT2 | 리듬 — 같은 패턴 3회+ 반복이 없는가 | {PASS/FAIL} |
| DT3 | 앵커 — 비주얼 앵커(사이드바/이미지/구조적 프레임)가 있는가 | {PASS/FAIL} |
| DT4 | 위계 — Squint Test: Primary/Secondary/Tertiary 구분 가능한가 | {PASS/FAIL} |
───────────────────────────────────
판정: {PASS — 12/12} 또는 {FAIL — n/12}
═══════════════════════════════════
```

## _context.md 연동

### 읽기 (Step 0)
`output/{프로젝트명}/_context.md` 존재 시 프로젝트명, IA 페이지 수, FN 복잡도를 로드하여 레이아웃 범위 설정에 활용.

### 쓰기 (완료 시)
```markdown
## LAYOUT 요약
- 생성일: {YYYY-MM-DD}
- 페이지 수: {n}개
- 패턴 수: {n}개
- 반응형 단계: {M/T/D}
```

## 흔한 AI 실수 — 일반 패턴

| # | 패턴 | 결과 | 방지법 |
|---|------|------|--------|
| 1 | IA 페이지와 레이아웃 페이지 불일치 | 누락 페이지 발생 | IA 전수 매핑 확인 |
| 2 | 그리드 없이 자유 배치 | 반응형 깨짐 | 12컬럼 그리드 기준 |
| 3 | FN 기능이 레이아웃에 없음 | 기능은 정의됐는데 화면이 없음 | FN→레이아웃 매핑 체크 |
| 4 | 모바일 퍼스트 미적용 | 데스크톱 우선 → 모바일 축소 시 깨짐 | M→T→D 순서로 설계 |

## 내장 지식: 레이아웃 그리드

- 그리드 유형: Column(일반) / Modular(행+열) / Baseline(4/8px 수직) / Compound(복합)
- 컬럼: Mobile 4col / Tablet 8col / Desktop 12col
- 거터: 16px(모바일) / 24px(태블릿) / 32px(데스크톱)
- 패턴: Full-bleed / Contained(max-width) / Asymmetric(사이드바+콘텐츠) / Card grids(auto-fill)

## 내장 지식: 반응형 디자인

- 전략: Mobile-first + Content-first (콘텐츠가 브레이크포인트 결정)
- 브레이크포인트: Small 375~639 / Medium 640~1023 / Large 1024~1439 / XL 1440+
- 패턴: Column drop / Reflow(가로→세로) / Off-canvas(토글) / Priority+(중요도순)
- 터치 44px 최소 / 키보드 포커스+탭 순서 / 타이포 fluid scaling

## 내장 지식: 시각적 위계

- 4레벨: Primary(제목,CTA) → Secondary(섹션 헤딩) → Tertiary(보조) → Quaternary(세부)
- 도구: 크기 1.5배+ 차이, 굵기, 색상 대비, 여백(=중요도), 위치(좌상단 우선)
- 한 화면 Primary 1개만. Squint Test 필수

## 내장 지식: 와이어프레임

- 콘텐츠 우선순위 넘버링 / 인터랙션 어노테이션 / 충실도 단계(Sketch→Annotated)
- 여러 상태 표시: empty/loading/populated/error / 반응형 브레이크포인트별 버전

## 내장 지식: 다안 제시 시 차별화 3축 (A/B/C 시안)

여러 레이아웃 안을 제시할 때, **레이아웃만 다르고 콘텐츠 동일**한 건 Iron Law 위반. 반드시 3축 동시 차별화.

| 축 | 시안 A | 시안 B | 시안 C |
|----|-------|-------|-------|
| **콘텐츠 구성** | 섹션 종류·수·깊이 A 고유 | B 고유 (A와 중복 < 30%) | C 고유 |
| **컬러 팔레트 방향** | 메인 톤 명확히 구분 | 동일 | 동일 |
| **제품/콘텐츠 노출 방식** | 스토리텔링형(내러티브) | 쇼핑 커머스형(그리드) | 매거진 에디토리얼형(혼용) |

**예시 조합**:
- A: 브랜드 스토리 중심 + 세리프 디스플레이 + 전면 비주얼
- B: 제품 그리드 + 산세리프 + 가격/스펙 중심
- C: 에디토리얼 매거진 + 혼용 폰트 + 긴 본문 + 사이드 목차

**금지**:
- 동일 콘텐츠 구성을 컬러·폰트만 바꿔 3개 만드는 것
- A/B/C를 단지 "기본/강화/심플"로 나누는 것 (차별화 3축 불충족)

**콘텐츠 변경 근거 필수** (리뉴얼 모드):
- 기존 사이트 섹션을 삭제하거나 신규 추가 시 근거 카테고리 명시
- 허용 근거: UX 분석 / 전환 기여도 / CRO 벤치마크 / 경쟁사 분석 / 소셜프루프

### 레이아웃 8대 패턴
1. Holy Grail (Header+Sidebar+Content+Sidebar+Footer)
2. Sidebar + Content (텍스트 중심 포트폴리오에 최적)
3. Split Pane (50/50 또는 비대칭)
4. Card Grid (2~4열, 이미지 콘텐츠에 적합)
5. Single Column (모바일/블로그, max-width 680px)
6. Dashboard Mosaic (위젯, 데이터 중심)
7. Master-Detail (목록→상세)
8. Canvas + Panels (에디터/도구)

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 존재하지 않는 URL/이미지 경로 생성 금지 | 깨진 링크/이미지 다수 발생 |
| 2 | 브랜드 가이드 없이 컬러/폰트 임의 결정 금지 | 브랜드 일관성 파괴 |
| 3 | 기획서(FN/IA) 범위 외 UI 컴포넌트 추가 금지 | 스코프 크리프 유발 |

## META 블록 생성 (산출물 하단 필수)

산출물 MD 파일 최하단에 아래 HTML 주석을 삽입한다. 오케스트레이터가 파싱하여 교차 검증에 사용.

```
<!-- META {
  "skill": "design-layout",
  "version": "v1",
  "project": "{프로젝트명}",
  "created": "{YYYY-MM-DD}",
  "state_version": 1,
  "parent": null,
  "change_type": "design_original",
  "self_check": "{PASS/FAIL}",
  "self_check_detail": "{n/n}",
  "counts": {
    "page_count": 0,
    "pattern_count": 0,
    "variants": 0
  },
  "ids": {
    "first_page": "IA-P001",
    "last_page": "IA-P000"
  },
  "decisions": [
    {
      "id": "DEC-001",
      "topic": "page_pattern_selection",
      "chosen": "C(매거진 스크롤)",
      "alternatives_considered": ["A(풀스크린 히어로)", "B(카드 그리드)"],
      "reasoning": "메인 페이지 — 텍스트 중심 브랜드 스토리 + 긴 본문 콘텐츠 7섹션. A는 100vh 히어로 후 밀도 저하, B는 콘텐츠 유형(이미지/카드)과 불일치. C는 이미지+텍스트 교차로 가독성·체류시간 모두 충족",
      "source": "dkb_match",
      "reversibility": "medium"
    },
    {
      "id": "DEC-002",
      "topic": "differentiation_axis",
      "chosen": "A=스토리텔링 / B=쇼핑 그리드 / C=에디토리얼 매거진",
      "alternatives_considered": ["기본/강화/심플 3안", "동일 콘텐츠 컬러만 변경"],
      "reasoning": "Iron Law 위반 회피 — 3축(콘텐츠 구성/팔레트/노출 방식) 동시 차별화. 단순 컬러/폰트 변경은 안티패턴",
      "source": "anti_pattern_avoidance",
      "reversibility": "hard"
    }
  ],
  "dependencies": [],
  "next_skill": "design-ui"
} -->
```

### decisions[] 필수 적용 (2026-05-11 신설)

본 스킬은 **Decision Log 필수 적용 스킬**. 다음 비자명한 결정을 모두 `decisions[]`에 기록:

| 결정 영역 | topic 값 | 비고 |
|---|---|---|
| 페이지별 패턴 선택 | `page_pattern_selection` | 패턴 카탈로그 A~F + 8대 패턴 중 선택 사유 |
| 차별화 축 (다안 시) | `differentiation_axis` | A/B/C 3축(콘텐츠 구성/팔레트/노출 방식) 차별화 근거 — Iron Law 위반 회피 |
| 반응형 패턴 분기 | `responsive_breakpoint` | M/T/D 단계별 별도 패턴 vs 비율 축소 결정 (모바일=데스크톱 축소 안티패턴 회피) |
| 그리드 트렌드 패턴 | `grid_trend_choice` | Bento/Editorial/Subgrid 중 어떤 모던 패턴을 어느 섹션에 적용 (3-col 동일 카드 반복 차단) |
| 콘텐츠 변경 근거 (리뉴얼) | `content_change_rationale` | 기존 사이트 섹션 삭제/추가 사유 (UX/CRO/전환기여도/벤치마크 카테고리) |

**작성 규칙**:
- 다안 제시 시 `differentiation_axis` 필수 (3축 차별화 입증 책임)
- 리뉴얼 모드면 `content_change_rationale` 필수 (Why-block 의무)
- `source`: DKB 매칭 결과 = `dkb_match`, 안티패턴 회피 = `anti_pattern_avoidance`, 토큰 기반 = `style_token`
- `reversibility`: 페이지 패턴 = `medium`, 차별화 축 = `hard` (시안 폐기 영향), 그리드 트렌드 = `easy`

**Self-Check 추가**:
- [ ] 3-col 동일 카드 반복 존재 시 decisions[] `grid_trend_choice` 작성 사유 없으면 Fail
- [ ] 다안(A/B/C) 제시했는데 `differentiation_axis` 미작성 시 Fail (Iron Law 위반)
- [ ] 각 decision의 alternatives_considered 최소 1건

상세 스키마: `lib/rules/handoff-schema.md` §"decisions[] — 결정 로그 필드"

## 흔한 AI 실수 — 실전 사례

- **풀스크린 레이아웃 남용**: 텍스트 중심 콘텐츠에 풀스크린 적용 시 밀도 저하. 포트폴리오에서 반복 발견. **콘텐츠 유형(텍스트/이미지/카드)에 따라 max-width 제한 검토**.
- **모바일 = 데스크톱 축소 금지**: 모바일은 별도 레이아웃 패턴(스택, 단일 컬럼) 필요. 단순 비율 축소 금지.
- **그리드 갭 일관성**: 디자인 토큰의 spacing 값과 그리드 gap이 불일치하면 후속 publish-style에서 하드코딩 발생.

$ARGUMENTS
