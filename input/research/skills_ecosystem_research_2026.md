# Claude Code 스킬/플러그인 생태계 조사 보고서

> 조사일: 2026-03-25
> 목적: ELUO SYS v4.0 스킬팩 품질 기준 및 구조 패턴 벤치마킹

---

## 1. SkillsMP (skillsmp.com) — 커뮤니티 스킬 마켓플레이스

### 1-1. 규모

| 지표 | 수치 | 비고 |
|------|------|------|
| 총 스킬 수 | 280,000+ | 6개월 만에 달성 |
| GitHub 인덱싱 기준 | 66,500+ (2026.01) | 최소 star 2개 이상 필터링 |
| 가격 | 전량 무료 오픈소스 | GitHub 자동 인덱싱 |

### 1-2. 카테고리 및 스킬 수

| 카테고리 | 스킬 수 | ELUO 관련성 |
|----------|---------|------------|
| Developer Tools | 564 | 중 |
| Web & App Development | 398 | **높음** |
| Testing & QA | 240 | **높음** |
| Documents & Content | 211 | 중 |
| Database & Data | 190 | 낮음 |
| API & Backend | 173 | 중 |
| DevOps & Infrastructure | 125 | 낮음 |
| Security & Monitoring | 83 | 낮음 |
| **합계** | **~2,277** | — |

### 1-3. 품질 필터링 기준
- 최소 GitHub star 2개 이상
- 기본 품질 지표 스캔 (SKILL.md 존재, 구조 확인)
- **감사(audit)는 하지 않음** — 설치 전 코드 리뷰 필수 안내
- 카테고리/작성자/인기도 기반 필터링 제공

### 1-4. 트렌드 분석
- **Design 카테고리가 별도로 없음** — Web & App Development에 통합
- **Project Management 카테고리 없음** — 에이전시/PM 워크플로 스킬이 부족한 영역
- Business 카테고리 존재하나 규모 작음
- **ELUO SYS 시사점**: 디지털 에이전시 전용 기획/PM 스킬은 경쟁 빈 영역(Blue Ocean)

---

## 2. Claude Code Plugin Marketplace (공식)

### 2-1. 규모

| 지표 | 수치 |
|------|------|
| 공식 마켓플레이스 플러그인 | 101개 |
| Anthropic 제작 | 33개 |
| 파트너 제작 | 68개 |
| 전체 생태계 (비공식 포함) | 9,000+ |
| 커뮤니티 마켓플레이스 수 | 43개 |

### 2-2. Anthropic 제작 플러그인 카테고리

| 카테고리 | 개수 | 주요 플러그인 |
|----------|------|-------------|
| Language Servers | 12 | 22개 언어 지원 |
| Dev Workflow | 10 | feature-dev, code-review, commit-commands, security-guidance, **frontend-design** |
| Setup Tools | 5 | skill-creator 등 |
| Output Styles | 2 | — |
| Playground | 1 | — |
| Messaging | 3 | — |

### 2-3. 설치 수 TOP 5 (2026.03 기준)

| 순위 | 스킬 | 제작자 | 설치 수 |
|------|------|--------|---------|
| 1 | find-skills | Vercel Labs | 418,600 |
| 2 | vercel-react-best-practices | Vercel | 176,400 |
| 3 | web-design-guidelines | Vercel | 137,000 |
| 4 | remotion-best-practices | Remotion | 126,000 |
| 5 | frontend-design | Anthropic | 124,100 |

### 2-4. 주요 파트너 플러그인
- GitHub, Playwright, Supabase, Figma, Vercel, Linear, Sentry, Stripe, Firebase
- Context7 (실시간 라이브러리 문서)
- Ralph Loop (자율 코딩 세션)
- Connect-apps (500+ SaaS 연결)

### 2-5. 플러그인 구조

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json            # 메타데이터 (필수)
├── .mcp.json                  # MCP 서버 설정 (선택)
├── commands/                  # 슬래시 커맨드 (선택)
├── agents/                    # 에이전트 정의 (선택)
├── skills/                    # 스킬 정의 (선택)
└── README.md
```

---

## 3. anthropics/skills (공식 GitHub)

### 3-1. 레포 지표

| 지표 | 수치 |
|------|------|
| Stars | 102,000 |
| Forks | 11,200 |
| Contributors | 12 |
| 라이선스 | Apache 2.0 (일부 source-available) |

### 3-2. 공식 스킬 목록

**문서 처리**: pdf, docx, pptx, xlsx
**디자인/크리에이티브**: algorithmic-art, canvas-design, slack-gif-creator
**개발**: frontend-design, web-artifacts-builder, mcp-builder, webapp-testing
**커뮤니케이션**: brand-guidelines, internal-comms
**유틸리티**: skill-creator, claude-api

### 3-3. SKILL.md 공식 구조

```yaml
---
name: my-skill-name                    # 최대 64자, 소문자+숫자+하이픈
description: 스킬 설명과 트리거 조건    # 최대 1024자, 3인칭
---

# 스킬 제목

## Quick Start
[핵심 사용법]

## Advanced Features
**상세 기능 A**: See [A.md](A.md)
**상세 기능 B**: See [B.md](B.md)

## Guidelines
[제약 조건, 주의사항]
```

### 3-4. 디렉토리 구조 패턴

```
skill-name/
├── SKILL.md              # 메인 (500줄 이하)
├── FORMS.md              # 상세 가이드 (필요 시 로드)
├── reference.md          # API 레퍼런스 (필요 시 로드)
├── examples.md           # 사용 예시 (필요 시 로드)
└── scripts/
    ├── analyze.py        # 유틸리티 스크립트
    ├── validate.py       # 검증 스크립트
    └── process.py        # 처리 스크립트
```

---

## 4. awesome-claude-skills / awesome-agent-skills (커뮤니티)

### 4-1. 주요 레포 현황

| 레포 | Stars | 스킬 수 | 특징 |
|------|-------|---------|------|
| travisvn/awesome-claude-skills | 9,700 | 50+ | 가장 오래된 큐레이션 |
| VoltAgent/awesome-agent-skills | 12,700 | 680+ | 크로스 플랫폼 (Codex, Gemini CLI 등) |
| sickn33/antigravity-awesome-skills | — | 1,304+ | CLI 설치 도구 포함 |
| karanb192/awesome-claude-skills | — | 50+ | 검증(verified) 강조 |

### 4-2. VoltAgent 카테고리 (680+ 스킬)

공식 팀별 분류: Anthropic, Vercel, Supabase, Google Gemini, Stripe, Expo, HashiCorp, Sanity, Firecrawl, Neon, ClickHouse, Remotion, Replicate, Cloudflare, Netlify, Hugging Face, Trail of Bits, Sentry, Microsoft, Figma, WordPress, OpenAI 등

### 4-3. 품질 기준 (VoltAgent)
- **"3시간 전에 만든 스킬은 제출하지 마라"** — 실제 사용/검증된 스킬만 수용
- 메타데이터 100 토큰 이하
- 스킬 본문 500줄 이하
- 하드코딩 경로 금지 (`$HOME`, `$PROJECT_ROOT` 사용)
- 도구 선언 명시적으로 (와일드카드 금지)
- 3인칭 서술

### 4-4. 디지털 에이전시 관련 스킬

| 도메인 | 발견된 스킬 | 성숙도 |
|--------|-----------|--------|
| 웹 개발 | frontend-design, web-artifacts-builder, Next.js best practices, React 최적화, web-design-guidelines | 높음 |
| 디자인 | canvas-design, algorithmic-art, brand-guidelines, Figma 연동, 63 design skills (marieclairedean) | 중간 |
| QA/테스팅 | webapp-testing (Playwright), Trail of Bits Security, error-recovery | 중간 |
| 프로젝트 관리 | internal-comms, product-manager | **낮음** |
| 기획 (Planning) | **없음** | **존재하지 않음** |
| 디지털 에이전시 파이프라인 | **없음** | **존재하지 않음** |

---

## 5. 인기 스킬 TOP 20 종합 (설치 수 + Stars 기준)

| 순위 | 스킬명 | 제작자 | 설치/Stars | 카테고리 |
|------|--------|--------|-----------|----------|
| 1 | find-skills | Vercel Labs | 418.6K 설치 | 유틸리티 |
| 2 | **frontend-design** | Anthropic | 277K+ 설치 | 디자인/개발 |
| 3 | vercel-react-best-practices | Vercel | 176.4K 설치 | 프론트엔드 |
| 4 | web-design-guidelines | Vercel | 137K 설치 | 디자인 |
| 5 | remotion-best-practices | Remotion | 126K 설치 | 미디어 |
| 6 | **superpowers** | obra | 53K Stars, 52K 설치 | 프레임워크 |
| 7 | pdf | Anthropic | — | 문서 |
| 8 | docx | Anthropic | — | 문서 |
| 9 | webapp-testing | Anthropic | — | QA |
| 10 | mcp-builder | Anthropic | — | 개발 |
| 11 | context7 | — | — | 개발도구 |
| 12 | feature-dev | Anthropic | — | 워크플로 |
| 13 | code-review | Anthropic | — | 워크플로 |
| 14 | error-recovery | madappgang | — | 에러처리 |
| 15 | security-guidance | Anthropic | — | 보안 |
| 16 | systematic-debugging | superpowers | — | 디버깅 |
| 17 | brainstorming | superpowers | — | 기획 |
| 18 | aws-skills | — | — | 인프라 |
| 19 | software-architecture | — | — | 아키텍처 |
| 20 | 63 design skills | marieclairedean | — | 디자인 |

---

## 6. 고품질 스킬의 공통 패턴

### 6-1. SKILL.md 구조 패턴 (Anthropic 공식 Best Practice)

**핵심 원칙**:

| # | 원칙 | 설명 |
|---|------|------|
| 1 | **간결함 우선** | Claude는 이미 똑똑하다. Claude가 모르는 것만 추가 |
| 2 | **자유도 매칭** | 작업 취약성에 비례해 구체성 조절 (높음/중간/낮음) |
| 3 | **Progressive Disclosure** | SKILL.md는 목차 역할, 상세는 별도 파일에 |
| 4 | **3인칭 서술** | "I can help you"(X) → "Processes Excel files"(O) |
| 5 | **500줄 제한** | SKILL.md 본문 500줄 이하, 초과 시 분할 |
| 6 | **참조 1단계만** | SKILL.md → 참조파일 (직접). 참조→참조(X) |

**description 작성법**:
```yaml
# 나쁜 예
description: Helps with documents

# 좋은 예
description: Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```
- description은 **트리거 조건**이다 — "언제 이 스킬을 활성화할 것인가?"를 모델에게 알려주는 것
- what + when 모두 포함 필수

**네이밍 컨벤션**:
- 동명사형 추천: `processing-pdfs`, `analyzing-spreadsheets`
- 소문자+숫자+하이픈만
- 모호한 이름 금지: `helper`, `utils`, `tools`
- 예약어 포함 금지: `anthropic-*`, `claude-*`

### 6-2. Gotchas 섹션 패턴

**Gotchas = 스킬의 최고 가치 콘텐츠**. Claude가 반복적으로 실패하는 지점을 축적한다.

**구조 예시** (superpowers 참고):
```markdown
## Gotchas

### 1. 스킬 이름 충돌
- 예약 키워드("skill")로 이름 지으면 **모든** 커스텀 스킬이 로딩 안 됨
- 에러 메시지 없이 조용히 실패

### 2. 컨텍스트 예산 초과
- 기본 2% 컨텍스트 윈도우 (또는 16,000자 fallback)
- 스킬이 많으면 메타데이터만으로도 예산 소진

### 3. 발견 경로 제한
- 중첩 폴더의 스킬은 발견 안 됨 (재귀 탐색 X)
- symlink 무시

### 4. 합리화 패턴 (Anti-rationalization)
- "이미 수동 테스트 했다" → 코드 삭제, TDD부터 재시작
- "이번엔 다르다" → 다르지 않다. 프로세스 따라라
- "테스트 나중에 해도 같다" → 같지 않다. 삭제하고 재시작
```

**Anti-rationalization Table** (superpowers 원본 패턴):

| 합리화 시도 | 대응 |
|------------|------|
| Code before test | 삭제. TDD부터 재시작 |
| "I already manually tested it" | 수동 테스트는 증거가 아님. 자동화 테스트 필수 |
| "Tests after achieve the same purpose" | 아님. 설계 사고가 빠짐 |
| "It's about spirit not ritual" | 의식(ritual)이 규율. 따라라 |
| "This is different because..." | 다르지 않음. 12개 변명 패턴에 모두 대응 있음 |

### 6-3. 에러 처리 / Fallback 패턴

**error-recovery 스킬 (madappgang) 패턴**:

```
에러 분류 → 복구 전략 매핑
├── 401 Unauthorized → 재시도 금지, 즉시 실패
├── 429 Rate Limit → Retry-After 헤더 존중
├── 500 Server Error → 5초 대기 후 1회 재시도
├── Network Error → 지수 백오프 (1s, 2s, 4s) 최대 3회
└── Timeout → 임계치 감지, 더 긴 타임아웃으로 재시도 또는 스킵
```

**Anthropic 공식 패턴 — "Solve, don't punt"**:
```python
# 나쁜 예: Claude에게 떠넘기기
def process_file(path):
    return open(path).read()  # FileNotFoundError → Claude가 알아서

# 좋은 예: 명시적 에러 처리
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, "w") as f:
            f.write("")
        return ""
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ""
```

**부분 성공 패턴**:
- `Promise.allSettled` 스타일 — 일부 실패해도 성공분 보존
- 부분 상태 저장 후 취소 시 이어서 진행 가능
- 사용자 선택지 노출: retry / skip / cancel

### 6-4. 워크플로 패턴

**체크리스트 패턴** (Anthropic 공식):
```markdown
## 워크플로

Task Progress:
- [ ] Step 1: 분석 (스크립트 실행)
- [ ] Step 2: 매핑 생성 (파일 편집)
- [ ] Step 3: 검증 (스크립트 실행)
- [ ] Step 4: 실행 (스크립트 실행)
- [ ] Step 5: 결과 확인 (스크립트 실행)
```

**피드백 루프 패턴**:
```
실행 → 검증 스크립트 → 에러 발견 시 수정 → 재검증 → 통과 시 다음 단계
```

**조건부 워크플로 패턴**:
```markdown
1. 수정 유형 결정:
   - 새로 생성? → Creation 워크플로
   - 기존 편집? → Editing 워크플로
```

**Plan-Validate-Execute 패턴**:
```
분석 → 계획 파일 생성 → 계획 검증 → 실행 → 결과 확인
```

### 6-5. Progressive Disclosure 3 패턴

| 패턴 | 용도 | 구조 |
|------|------|------|
| High-level guide + refs | 일반 스킬 | SKILL.md (개요) → 상세.md (필요 시 로드) |
| Domain-specific org | 다중 도메인 | SKILL.md → reference/finance.md, sales.md 등 |
| Conditional details | 분기 스킬 | 기본 내용 인라인 + 고급 기능은 별도 파일 |

---

## 7. 사용자 피드백 — 불만/개선 요청

### 7-1. 플러그인 로딩 실패
- 플러그인 설치 후 슬래시 커맨드가 Cowork에서 안 나타남
- 에러 메시지 없이 조용히 실패하는 케이스 다수

### 7-2. 모델 품질 이슈
- "20+ 번 시행착오" — 한 번에 분석 후 해결하지 않고 반복 시도
- "완료했다"고 말하지만 실제로는 미완료/부분 완료
- Thinking 모드 기본 활성화 이후 오히려 분석 깊이 저하

### 7-3. 스킬 발견 문제
- 스킬이 트리거되지 않는 문제 빈번
- 해결법: description에 트리거 키워드 명시, CLAUDE.md에 직접 참조 추가
- 중첩 폴더 스킬 발견 불가

### 7-4. 컨텍스트 예산 소진
- 스킬 많이 설치하면 메타데이터만으로 컨텍스트 2% 초과
- "어떤 스킬이 실제로 가치 있는지 설치 전에 판단이 어렵다"

### 7-5. 인프라 불안정
- 2026.03 기준 평균 2~3일에 1건 주요 장애
- 연결 에러(ECONNRESET, EPIPE) 재시도 미지원

---

## 8. 디지털 에이전시 / 웹 개발 / 기획 / 디자인 / QA 관련 스킬 현황

### 8-1. 웹 개발 (성숙도: 높음)

| 스킬 | 제작자 | 핵심 기능 |
|------|--------|----------|
| frontend-design | Anthropic | 디자인 시스템+철학 주입 후 코딩 |
| web-design-guidelines | Vercel | 100+ 규칙 (접근성, 성능, UX) |
| vercel-react-best-practices | Vercel | React 최적화 패턴 |
| web-artifacts-builder | Anthropic | HTML+React+shadcn/ui 아티팩트 |
| Next.js best practices | Vercel | Next.js 프레임워크 가이드 |

### 8-2. 디자인 (성숙도: 중간)

| 스킬 | 제작자 | 핵심 기능 |
|------|--------|----------|
| 63 design skills | marieclairedean | 8 플러그인: 리서치/시스템/전략/UI/인터랙션/프로토타이핑/DesignOps/일상도구 |
| canvas-design | Anthropic | 시각 아트 (PNG, PDF) |
| brand-guidelines | Anthropic | 브랜드 가이드 적용 |
| interface-design (Dammyjay) | 커뮤니티 | 디자인 엔지니어링, UI 일관성 |
| Figma 연동 | Figma | Figma 파일 읽기/분석 |

**63 design skills 상세**:
- `/discover` — 풀 리서치 디스커버리 사이클
- `/strategize` — 비전→메트릭스 UX 전략 수립
- `/handoff` — 개발자 핸드오프 패키지 (측정값, 동작, 엣지케이스, QA 체크리스트)
- 주니어: 더 나은 스캐폴딩 / 시니어: 구조적으로 예측 가능한 부분 가속

### 8-3. QA/테스팅 (성숙도: 중간)

| 스킬 | 제작자 | 핵심 기능 |
|------|--------|----------|
| webapp-testing | Anthropic | Playwright 기반 E2E 테스트 |
| error-recovery | madappgang | 에러 분류+복구 전략+지수 백오프 |
| Trail of Bits Security | Trail of Bits | CodeQL, 취약점 분석, 변형 분석 |
| systematic-debugging | superpowers | 체계적 디버깅 프로세스 |

### 8-4. 기획/프로젝트 관리 (성숙도: 매우 낮음)

| 스킬 | 제작자 | 핵심 기능 |
|------|--------|----------|
| brainstorming | superpowers | 브레인스토밍 프로세스 |
| internal-comms | Anthropic | 상태 보고서, 뉴스레터, FAQ |
| product-manager | 커뮤니티 | PM 워크플로 (상세 불명) |

**기획 전용 스킬 = 사실상 없음**
- 요구사항 정의(REQ), 기능 정의(FN), 정보구조(IA), WBS, 고객질의서(QST) 등의 스킬은 **어디에도 존재하지 않음**
- 디지털 에이전시 파이프라인 (Planning→Design→Publish→QA)을 통합한 스킬셋도 **없음**

### 8-5. 디지털 에이전시 활용 사례

Claude Code가 디지털 에이전시를 변화시키는 5가지 방식:
1. **보고서 자동화** — 즉각적 운영 효율
2. **내부 도구 개발** — 맞춤형 자동화
3. **클라이언트 딜리버리 가속** — 제작 속도 향상
4. **콘텐츠 운영 인프라** — 콘텐츠 파이프라인
5. **독점 AI 도구 구축** — 장기 전략적 차별화

---

## 9. ELUO SYS v4.0 시사점

### 9-1. 시장 공백 (Blue Ocean)

| 영역 | 현재 시장 | ELUO 보유 |
|------|----------|----------|
| Planning 스킬 (REQ/FN/IA/WBS/QST) | **없음** | 5+ 스킬 |
| 4도메인 통합 파이프라인 | **없음** | 7 오케스트레이터 |
| FR→FN→UI→TC 추적 체인 | **없음** | 전수 구현 |
| PM Direction + DA 챌린지 | **없음** | 3축 챌린지 |
| Anti-rationalization (기획 전용) | superpowers에 개발 전용 있음 | 기획 전용 확장 |
| 디자인 에이전시 핸드오프 | marieclairedean에 부분 있음 | META 블록 + _handoff.md |

### 9-2. 품질 기준 적용 사항

Anthropic 공식 best practice 기준으로 ELUO 스킬에 적용할 것:

| # | 적용 항목 | 현재 상태 | 조치 |
|---|----------|----------|------|
| 1 | SKILL.md 500줄 제한 | 미확인 | 전수 점검 |
| 2 | description 3인칭 + 트리거 조건 | 미확인 | 전수 리팩터 |
| 3 | Progressive Disclosure | 일부 적용 | 참조 파일 분할 확대 |
| 4 | Gotchas 섹션 | P2에 계획됨 | **P1으로 승격** — 최고 가치 콘텐츠 |
| 5 | 참조 1단계 제한 | 미확인 | 구조 점검 |
| 6 | 네이밍 컨벤션 (소문자+하이픈) | 이미 적용 | 유지 |
| 7 | 에러 처리 "Solve, don't punt" | 부분 적용 | 스크립트 보강 |
| 8 | 피드백 루프 (검증→수정→재검증) | 이미 적용 (reviewer) | 유지 |
| 9 | Plan-Validate-Execute | Self-Check로 적용 | 유지 |
| 10 | 모델별 테스트 (Haiku/Sonnet/Opus) | 미실시 | 테스트 매트릭스 추가 |

### 9-3. superpowers 대비 경쟁 우위

| 기능 | superpowers (53K stars) | ELUO SYS |
|------|----------------------|----------|
| Anti-rationalization | 개발 TDD 전용 12패턴 | **기획+디자인+QA 전용** |
| 파이프라인 | 7-phase (개발 전용) | **4도메인 통합** |
| 추적성 | 없음 | **FR→FN→UI→TC** |
| 오케스트레이션 | brainstorm→plan→test→implement→review | **PM Direction→QST→REQ→FN→IA→Design→Publish→QA** |
| DA 챌린지 | 없음 | **3축 Devil's Advocate** |
| 핸드오프 | 없음 | **META 블록 + _handoff.md** |
| 대상 사용자 | 개발자 | **디지털 에이전시 PM/기획자/디자이너** |

### 9-4. marieclairedean 63 design skills 대비

| 기능 | 63 design skills | ELUO SYS |
|------|-----------------|----------|
| 범위 | 디자인 전용 (8 플러그인) | **4도메인 통합** |
| 워크플로 체인 | /discover → /strategize → /handoff | **파이프라인 + 오케스트레이터** |
| ID 추적 | 없음 | **FR→FN→UI→TC** |
| QA 연계 | /handoff에 QA 체크리스트 포함 | **전용 QA 스킬 3종** |
| 기획 연계 | 없음 | **Planning 스킬 5종** |

---

## 10. 핵심 요약

1. **기획(Planning) 스킬은 전체 생태계에서 사실상 부재** — ELUO SYS의 최대 차별화 영역
2. **디지털 에이전시 전용 파이프라인은 어디에도 없음** — Blue Ocean 확인
3. **Gotchas 섹션은 "스킬의 최고 가치 콘텐츠"** — P1으로 즉시 구현 필요
4. **description 필드가 스킬 활성화의 핵심** — 트리거 조건 명시 필수
5. **Anti-rationalization 패턴은 superpowers가 개척** — ELUO는 기획/디자인 도메인으로 확장하여 차별화
6. **에러 복구 패턴은 분류→전략 매핑 구조** — 에러별 다른 복구 전략
7. **Progressive Disclosure가 공식 권장** — SKILL.md는 500줄 이하, 상세는 별도 파일
8. **"Solve, don't punt"** — 스크립트에서 에러를 직접 처리, Claude에게 떠넘기지 않기
9. **설치 수 TOP은 Vercel/Anthropic이 독점** — 파트너십 또는 품질로 경쟁 필요
10. **사용자 최대 불만: 스킬이 트리거 안 됨, 컨텍스트 예산 소진** — description 최적화와 토큰 효율이 핵심

---

## Sources

- [SkillsMP - Agent Skills Marketplace](https://skillsmp.com/)
- [SkillsMP Review 2026 - SmartScope](https://smartscope.blog/en/blog/skillsmp-marketplace-guide/)
- [Claude Code Plugin Marketplace - Official Docs](https://code.claude.com/docs/en/discover-plugins)
- [anthropics/skills - GitHub](https://github.com/anthropics/skills)
- [anthropics/claude-plugins-official - GitHub](https://github.com/anthropics/claude-plugins-official)
- [travisvn/awesome-claude-skills - GitHub](https://github.com/travisvn/awesome-claude-skills)
- [VoltAgent/awesome-agent-skills - GitHub](https://github.com/VoltAgent/awesome-agent-skills)
- [Skill Authoring Best Practices - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Top 10 Claude Code Skills - Composio](https://composio.dev/content/top-claude-skills)
- [Best Claude Code Skills 2026 - Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills)
- [349 Agent Skills Ranked - OpenAIToolsHub](https://www.openaitoolshub.org/en/blog/best-claude-code-skills-2026)
- [5 Ways Claude Code Changes Digital Agencies](https://www.adventureppc.com/blog/5-ways-claude-code-is-changing-how-digital-agencies-work-in-2026)
- [I Built 63 Design Skills For Claude - marieclairedean](https://marieclairedean.substack.com/p/i-built-63-design-skills-for-claude)
- [superpowers - GitHub](https://github.com/obra/superpowers)
- [error-recovery skill - madappgang](https://playbooks.com/skills/madappgang/claude-code/error-recovery)
- [Top 8 Claude Skills for UI/UX Engineers - Snyk](https://snyk.io/articles/top-claude-skills-ui-ux-engineers/)
- [10 Must-Have Skills for Claude 2026 - Medium](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051)
- [Claude Code Skills Limitations - Medium](https://medium.com/@cheparsky/ai-in-testing-9-the-invisible-limitations-of-claude-code-skills-you-didnt-know-f3adbdcf3680)
- [20 Best Claude Skills 2026 - BrowserAct](https://www.browseract.com/blog/best-claude-skills)
