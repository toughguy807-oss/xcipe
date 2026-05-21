# 에이전시 워크플로우 자동화 & AI 코드 품질 리서치

> 조사일: 2026-03-29
> 키워드 12개, 소스 25+건, WebSearch 18회 실행
> 목적: ELUO SYS v4.0 파이프라인/스킬 개선을 위한 외부 동향 수집

---

## 목차

1. [핵심 발견 요약](#1-핵심-발견-요약)
2. [소스별 상세 분석](#2-소스별-상세-분석)
3. [테마별 종합 분석](#3-테마별-종합-분석)
4. [ELUO SYS 반영 포인트](#4-eluo-sys-반영-포인트)
5. [소스 목록](#5-소스-목록)

---

## 1. 핵심 발견 요약

| # | 발견 | 영향도 | ELUO SYS 관련성 |
|---|------|--------|----------------|
| 1 | **2025=속도, 2026=품질의 해** — 업계 KPI가 throughput에서 correctness/maintainability로 전환 중 | 높음 | 이미 품질 게이트 구조를 갖추고 있어 시장 방향과 일치 |
| 2 | **AI 코드 1.7배 더 많은 버그**, 보안 취약점 40-62% 포함, 디자인 결함 153% 증가 | 높음 | QA 파이프라인의 보안/디자인 결함 검증 강화 필요 |
| 3 | **바이브 코딩 6개월 후 기술부채 340% 증가**, 디버깅 시간 400% 증가 | 높음 | 파이프라인 자동화가 "바이브 코딩"과 근본적으로 다름을 차별점으로 활용 |
| 4 | **BMAD 방법론** — 역할 기반 에이전트 + 스토리 파일로 컨텍스트 손실 방지 | 높음 | ELUO 오케스트레이터/스킬 구조와 유사. 스토리 파일 패턴 참고 가능 |
| 5 | **멀티 모델 교차 검증** — Claude + Codex + Gemini 병렬 리뷰 | 중간 | reviewer 스킬에 멀티 모델 패턴 도입 검토 |
| 6 | **프로토타입 코드의 30%만 프로덕션에 재사용 가능** | 높음 | publish 스킬의 코드 품질이 곧 경쟁력 |
| 7 | **에이전트 프로덕션 도입 57%, 품질이 #1 장벽(32%)** | 높음 | 품질 게이트가 시장 진입 장벽 해소 핵심 |
| 8 | **스킬 3개 초과 시 컨텍스트 오버헤드로 품질 저하** | 중간 | 스킬 로딩 전략 최적화 필요 |

---

## 2. 소스별 상세 분석

### S01. CodeRabbit — "2025는 속도, 2026은 품질의 해"

- **URL**: https://www.coderabbit.ai/blog/2025-was-the-year-of-ai-speed-2026-will-be-the-year-of-ai-quality
- **핵심 인사이트**: 엔지니어링 리더들의 KPI가 raw throughput에서 defect density, review load, merge confidence, test coverage, maintainability로 전환 중. 속도는 더 이상 고성능 팀의 유일한 차별화 요소가 아니며, 품질이 진정한 경쟁 우위.
- **구체적 사례**: 팀이 20% 빠르게 배포하지만 23.5% 높은 인시던트율, 23.7% 증가한 보안 취약점 직면. AI 코드가 1.7배 더 많은 이슈 포함.
- **ELUO 반영점**: Self-Check와 reviewer 채점 시스템이 이미 이 방향. defect density 메트릭을 META 블록에 추가 검토.

### S02. Apiiro / Jit — AI 코드의 보안 블라인드 스팟

- **URL**: https://www.jit.io/resources/ai-security/ai-generated-code-the-security-blind-spot-your-team-cant-ignore
- **URL**: https://apiiro.com/blog/ai-generated-code-security/
- **핵심 인사이트**: AI 생성 코드의 디자인 결함(privilege escalation 322% 증가, design flaw 153% 증가)이 구현 버그보다 위험. 디자인 결함은 수정 비용이 구현 버그의 10-100배. "코드가 올바르게 보이기 때문에" 리뷰를 통과하는 것이 핵심 문제.
- **구체적 사례**: 인증 바이패스 패턴, 안전하지 않은 직접 객체 참조, 신뢰 경계에서 누락된 입력 검증, 부적절한 세션 관리가 주요 디자인 결함 유형.
- **ELUO 반영점**: qa-security 스킬 강화. publish 단계에서 보안 패턴 체크리스트 삽입. "코드가 맞아 보이는" 함정 방지를 위한 아키텍처 레벨 검증 추가.

### S03. Whitespectre — 프로토타입→프로덕션 현실 격차

- **URL**: https://www.whitespectre.com/ideas/ai-powered-prototype-to-production-process/
- **핵심 인사이트**: AI 프로토타입의 약 30%만 프로덕션에 재사용 가능. 핵심 문제 3가지: (1) 반복 프롬프팅으로 축적된 데드 코드, (2) 하드코딩된 API 키 등 보안 취약점, (3) 심각한 코드 중복. AI는 "빠르게 작동시키기"에 최적화하지 "아키텍처 우아함"에는 최적화하지 않음.
- **구체적 사례**: Jira Evaluator 프로젝트에서 PM이 Cursor로 기능적 프로토타입을 독립 생성. 개발팀 리뷰 결과 3대 문제 즉시 발견. 핵심 기능과 인터페이스 설계는 유지, 구현 세부사항은 전면 재작업.
- **ELUO 반영점**: publish 스킬의 코드가 "프로토타입"이 아닌 "프로덕션"이 되려면 데드코드 제거, 하드코딩 방지, 중복 검출을 빌트인으로 포함해야 함.

### S04. BMAD Method — 돌파적 애자일 AI 개발 방법론

- **URL**: https://github.com/bmad-code-org/BMAD-METHOD
- **URL**: https://github.com/24601/BMAD-AT-CLAUDE
- **URL**: https://dev.to/extinctsion/bmad-the-agile-framework-that-makes-ai-actually-predictable-5fe7
- **핵심 인사이트**: 역할 기반 에이전트(Analyst, PM, Architect, Scrum Master, Dev) + "하이퍼 디테일" 스토리 파일로 컨텍스트 손실 방지. 두 가지 경로: Quick Path(버그픽스/소기능)와 Full Path(제품/복잡 기능). 토큰 최적화 70-85% 절감(헬퍼 패턴).
- **구체적 사례**: 스토리 파일에 아키텍처 컨텍스트 + 구현 가이드라인 + 근거 설명 + 테스트 기준을 완전 패키지로 담아 Dev 에이전트가 "무엇을, 어떻게, 왜" 완전히 이해한 상태로 작업. 엔터프라이즈 트랙에서는 Security Auditor Agent + Code Review Gate + Documentation Audit 추가.
- **ELUO 반영점**: _context.md와 META 블록이 BMAD 스토리 파일과 유사 역할. 차이점은 ELUO가 "기획→디자인→퍼블리싱→QA" 전체를 커버하는 반면 BMAD는 개발 중심. 토큰 최적화 헬퍼 패턴 참고 가치 높음.

### S05. claude-pipeline (aaddrick) — 포터블 멀티에이전트 파이프라인

- **URL**: https://github.com/aaddrick/claude-pipeline
- **핵심 인사이트**: .claude/ 폴더를 프로젝트에 드롭하면 setup→plan→implement→test→review→pr 파이프라인 즉시 작동. 특화 에이전트(frontend-dev, backend-dev, code-reviewer, spec-reviewer, test-validator) + 오케스트레이션 스크립트. 적응 스킬이 프로젝트에 맞게 파이프라인을 자동 커스터마이징.
- **구체적 사례**: `--dangerously-skip-permissions` 플래그로 완전 자동화하되 샌드박스 환경에서만 사용 권고. GitHub 연동으로 브랜치 생성→PR 오픈→코멘트 자동화.
- **ELUO 반영점**: ELUO와 구조적으로 유사하지만 개발 파이프라인 전용. ELUO의 기획/디자인/퍼블리싱 포괄 범위가 차별점. 오케스트레이션 스크립트의 자동 적응(adaptation skill) 패턴은 pm-router에 참고 가능.

### S06. claude-code-skills (levnikolaevich) — 풀 딜리버리 라이프사이클

- **URL**: https://github.com/levnikolaevich/claude-code-skills
- **핵심 인사이트**: 6개 플러그인으로 풀 딜리버리 라이프사이클 커버. **멀티 모델 교차 리뷰**(Claude + Codex + Gemini 병렬, 자동 폴백) 시스템이 핵심 차별점. hex-line(해시 검증 편집), hex-graph(코드 지식 그래프), hex-ssh(원격 SSH) MCP 서버 번들.
- **구체적 사례**: ln-700 부트스트랩 → ln-100 문서 → ln-200 스코프 분해(Epic/Story) → ln-400 태스크 실행(자동 리뷰 루프) → ln-500 품질 게이트 → Done. 각 단계 인간 승인 체크포인트 포함.
- **ELUO 반영점**: 멀티 모델 교차 리뷰는 anti-rationalization 프로토콜과 시너지 가능. "동일 모델이 생성하고 동일 모델이 검증하면 편향" 문제의 해법. 단, 비용 대비 효과 평가 필요.

### S07. "바이브 코딩 6개월 후 코드베이스 엉망" 사례

- **URL**: https://medium.com/lets-code-future/after-6-months-of-vibe-coding-my-codebase-is-a-mess-here-s-what-went-wrong-7e4ad610bc93
- **URL**: https://whimseylabs.substack.com/p/the-vibe-coding-gap-five-minutes
- **핵심 인사이트**: 기술부채 340% 증가, 디버깅 시간 400% 증가, 240시간 낭비. "배포는 쉽지만 시스템을 구축하는 것은 다르다." AI가 3개월 전에 작성한 코드를 본인이 이해 못함. 새벽 3시 장애 상황에서 30분 걸릴 수정에 6시간 소요.
- **구체적 사례**: AI에게 버그 수정을 요청하면 즉각적 문제만 보고 로컬 수정을 제안하나, 이것이 다른 곳의 가정을 위반하여 연쇄 버그 발생. "데모까지 5분, 프로덕션까지 3개월" 격차.
- **ELUO 반영점**: 파이프라인 자동화가 "바이브 코딩"과 근본적으로 다른 이유를 시장 포지셔닝에 활용. 구조화된 스킬 + 추적성 + 품질 게이트가 이 문제의 정확한 해법.

### S08. LangChain — State of Agent Engineering 2026

- **URL**: https://www.langchain.com/state-of-agent-engineering
- **핵심 인사이트**: 1,300+명 서베이. 에이전트 프로덕션 도입 57%(전년 51%에서 상승). **품질이 프로덕션 #1 장벽(32%)**. 관측성(observability) 89% 도입 vs 평가(evals) 52% 도입 — 평가 체계가 관측보다 훨씬 뒤처짐. 온라인 평가는 37.3%만.
- **구체적 사례**: 대기업이 도입을 선도. "에이전트를 만들 것인가"가 아니라 "어떻게 신뢰성 있게 배포할 것인가"로 질문 전환.
- **ELUO 반영점**: Self-Check + reviewer + DA 챌린지 = 이미 평가 체계 구축. 시장의 52%가 아직 eval을 하지 않는 상황에서 ELUO의 내장 평가 시스템은 명확한 차별점.

### S09. Cursor vs V0 vs Bolt vs Lovable — 바이브 코딩 도구 비교

- **URL**: https://justtalkingtech.medium.com/vibe-coding-in-2026-i-tried-cursor-replit-bolt-lovable-and-v0-heres-what-actually-ships-11d0b70cf1d5
- **URL**: https://nerdbot.com/2026/03/11/cursor-vs-lovable-vs-bolt-the-best-vibe-coding-tools-in-2026-tested-compared/
- **핵심 인사이트**: Cursor가 가장 프로덕션에 가까운 코드 생성(전문 개발 환경에서 아키텍처 완전 제어). Lovable은 깔끔한 프론트엔드이나 백엔드가 취약. Bolt은 버그가 가장 많음. V0 코드는 UI에서 프로덕션 수준이나 보안 감사 필요. **배포와 디버깅이 1,000개+ Reddit 코멘트 분석 결과 #1, #2 고통점**.
- **구체적 사례**: Supabase 인증 이슈에 5-8백만 토큰 소모, 한 사용자는 3시간에 8백만 토큰 소모. Lovable 사용자는 1시간에 400크레딧 소진. "프로토타입은 Lovable, 프로덕션은 Cursor"로 이원화하는 팀 다수.
- **ELUO 반영점**: ELUO 퍼블리싱 파이프라인은 이들 도구와 경쟁하는 것이 아니라, 이들이 못 하는 "기획→디자인→구현→QA 일관성"을 제공. 토큰 효율도 핵심 — 스킬당 컨텍스트 비용 최적화 필수.

### S10. AWS DevOps Agent — 프로토타입에서 프로덕션으로

- **URL**: https://aws.amazon.com/blogs/devops/from-ai-agent-prototype-to-product-lessons-from-building-aws-devops-agent/
- **핵심 인사이트**: 평가(evals)가 프로토타입→프로덕션 전환의 핵심. "Eval은 ML의 테스트 스위트". 에이전트가 실패하는 시나리오를 식별하고, 품질 베이스라인을 수립하며, TDD와 유사하게 반복(red→green). 제약 설정이 중요: AI에게 "무엇을 하라"뿐 아니라 "무엇을 하지 마라"를 명확히 정의.
- **구체적 사례**: 스마트 팀은 간단한 하위 작업을 작고 저렴한 모델에 라우팅하고, 복잡한 추론은 대형 모델에 예약. 중간 결과를 적극 캐싱. 폭주 에이전트 루프를 종료하는 킬 스위치 구축.
- **ELUO 반영점**: CCD 자동 게이트의 "최대 5회 루프, 초과 시 에스컬레이션"이 킬 스위치 패턴과 동일. 모델 라우팅은 비용 최적화에 직접 적용 가능.

### S11. Red Hat — 바이브 코딩의 불편한 진실

- **URL**: https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding
- **핵심 인사이트**: 바이브 코딩된 프로젝트는 전통 개발 대비 기술부채 3배 빠르게 축적. AI 생성 코드의 45%가 보안 결함 포함(Veracode). XSS 취약점 거의 3배. OWASP Top 10 취약점 45%. 컨텍스트를 좁혀 토큰 효율을 높이는 도구(Cursor/Windsurf)는 부작용으로 "좁고 얕은 코드 뷰" → "피상적 해결책과 지속적 실수".
- **구체적 사례**: 패스워드 리셋 기능에서 AI가 캐시 만료를 5분으로 설정했으나 이메일 도착에 10분 소요 — 명시적 지시 없이 침묵적 결정. Lovable 사용자 1시간에 400크레딧 소진, Bolt "무한 에러 루프", 크레딧 모델이 플랫폼의 실수로 수익을 얻는 역인센티브.
- **ELUO 반영점**: "침묵적 결정" 방지가 핵심. 스킬이 가정/결정을 _context.md에 기록하는 현재 구조가 이를 해결. anti-rationalization 프로토콜도 이 문제의 해법.

### S12. agency-agents (msitarzewski) — 완전한 AI 에이전시

- **URL**: https://github.com/msitarzewski/agency-agents
- **핵심 인사이트**: 147개 에이전트 × 12개 디비전. 각 에이전트가 고유 음성/커뮤니케이션 스타일, 실제 코드/프로세스/측정 가능한 결과, 실전 테스트된 워크플로우와 성공 메트릭을 보유. Reddit 스레드에서 시작하여 커뮤니티 기반 성장.
- **구체적 사례**: Nexus Spatial Discovery Exercise에서 8개 에이전트를 동시 배포하여 시장 검증, 기술 아키텍처, 브랜드 전략, GTM, 지원 시스템, UX 리서치, 프로젝트 실행, Spatial UI 설계를 통합 제품 계획으로 산출.
- **ELUO 반영점**: 에이전트 "성격"과 "디비전" 개념보다는 ELUO의 스킬 단위 전문화가 더 실용적. 하지만 8개 에이전트 동시 배포 사례는 병렬 세션(S1-S4) 패턴과 유사.

### S13. Stack Overflow — "바이브 코딩하는 최악의 코더 등장"

- **URL**: https://stackoverflow.blog/2026/01/02/a-new-worst-coder-has-entered-the-chat-vibe-coding-without-code-knowledge/
- **핵심 인사이트**: 코드 지식 없이 바이브 코딩하는 것이 역사상 최악의 소프트웨어 위기를 만들 수 있다는 경고. AI가 생성하는 대규모 diff를 리뷰하는 것이 직접 작성하는 것보다 인지적으로 더 부담.
- **ELUO 반영점**: ELUO 고객(에이전시)은 코드 전문가이므로 이 문제는 해당하지 않으나, 비개발자 고객에게 파이프라인을 제공할 때의 리스크 인식 필요.

### S14. The New Stack — 바이브 코딩이 초래할 "대폭발"

- **URL**: https://thenewstack.io/vibe-coding-could-cause-catastrophic-explosions-in-2026/
- **핵심 인사이트**: 2026년 75%의 기술 의사결정자가 AI 속도 관행에서 비롯된 중간~심각 수준의 기술부채에 직면할 전망. 40-62%의 AI 생성 코드가 보안 취약점 또는 디자인 결함 포함.
- **ELUO 반영점**: "기술부채 폭발" 예방이 ELUO 파이프라인의 가치 제안. QA 스킬(functional/accessibility/performance/security)이 이를 직접 해결.

### S15. Claude Code Skills 생태계 분석

- **URL**: https://www.roborhythms.com/best-claude-code-skills-2026/
- **URL**: https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051
- **핵심 인사이트**: "대부분의 스킬은 쓰레기". 효과적인 스킬은 **좁고 구체적**인 것. 스킬 3개 초과 시 컨텍스트 오버헤드가 복잡한 태스크의 응답 품질을 가시적으로 저하. frontend-design 스킬(27.7만+ 설치)이 "코드를 만지기 전에 디자인 시스템과 철학을 부여"하여 효과적. /simplify 스킬은 3개 병렬 리뷰 에이전트를 생성하여 코드 재사용/품질/효율성 자동 개선.
- **구체적 사례**: Skills 2.0이 구조화된 평가를 추가 — 특정 기준 대비 스킬 점수화, 병렬 테스트, 빠른 이터레이션.
- **ELUO 반영점**: ELUO 스킬은 이미 "좁고 구체적" 원칙을 따름. 하지만 오케스트레이터가 스킬을 순차 로딩하므로 동시 컨텍스트 부하는 제한적 — 이것이 강점. Skills 2.0의 A/B 테스트 패턴은 스킬 버전 비교에 활용 가능.

---

## 3. 테마별 종합 분석

### 테마 A: "프로토타입→프로덕션" 격차 해소법

**문제 정의**: AI 도구가 빠르게 "작동하는 것"을 만들지만, "배포할 수 있는 것"과의 격차가 크다.

**업계 해법 패턴**:

| # | 해법 | 구현 방식 | 효과 |
|---|------|----------|------|
| 1 | **구조화된 평가(Evals)** | TDD 유사: 실패 시나리오 식별 → 베이스라인 수립 → red/green 반복 | AWS DevOps Agent 사례 |
| 2 | **멀티 모델 교차 리뷰** | Claude + Codex + Gemini 병렬 리뷰, 자동 폴백 | levnikolaevich 스킬 |
| 3 | **하이퍼 디테일 스토리 파일** | 컨텍스트+가이드라인+근거+테스트를 한 파일에 | BMAD Method |
| 4 | **스킬 수 제한** | 3개 이하, 좁고 구체적 | Skills 생태계 분석 |
| 5 | **아키텍처 먼저, 프롬프트 나중** | 구조/패턴/경계를 먼저 결정 후 AI에 코드 생성 요청 | 바이브 코딩 생존자 조언 |
| 6 | **킬 스위치** | 폭주 에이전트 루프 자동 종료 | AWS, CCD 자동 게이트 |

**ELUO 현재 상태 vs 업계 Best Practice**:

| 업계 Best Practice | ELUO 현재 | 갭 |
|-------------------|----------|-----|
| 구조화된 평가 | Self-Check + reviewer + DA 챌린지 | 거의 없음 (이미 구축) |
| 멀티 모델 리뷰 | 단일 모델(Claude) | 갭 있음 |
| 컨텍스트 패키징 | _context.md + META 블록 | 거의 없음 |
| 스킬 최적화 | 순차 로딩으로 오버헤드 관리 | 거의 없음 |
| 아키텍처 퍼스트 | PM Direction + IA 스킬 | 거의 없음 |
| 킬 스위치 | CCD 최대 5회 루프 | 거의 없음 |

### 테마 B: AI 에이전시 자동화의 현실

**시장 현황**:
- 에이전틱 AI 시장: 2025년 2조원 → 2030년 61조원 (연평균 175% 성장)
- Gartner: 2026년까지 기업 앱 40%가 특화 AI 에이전트 통합 (현재 5% 미만 → 8배)
- 에이전시 도구 시장: 2026년 $10.9B (2025년 $7.6B, 45% CAGR)

**에이전시 변화 방향**:
- "SEO 에이전시"에서 "고객 참여 에이전시"로 전환
- AI 도구가 에이전시를 "대체"하는 것이 아니라 에이전시가 AI를 "활용"하는 방향
- 소규모 에이전시가 AI로 대규모 에이전시 수준의 산출물 생산 가능

**ELUO 포지셔닝 기회**:
- 바이브 코딩 도구(Cursor/V0/Bolt/Lovable)와 직접 경쟁하지 않음
- 이들이 못 하는 "기획→디자인→구현→QA 일관성"이 차별점
- "프로토타입이 아닌 프로덕션"을 만드는 파이프라인으로 포지셔닝

### 테마 C: 컨텍스트 손실과 품질 저하 방지

**업계 공통 문제**: AI가 이전 결정/맥락을 잃어버려 후반부 산출물 품질이 저하.

**해법 비교**:

| 접근법 | 장점 | 단점 |
|--------|------|------|
| BMAD 스토리 파일 | 완전 패키지 | 개발 전용, 기획/디자인 미포함 |
| ELUO _context.md | 누적 상태 관리 | 파일 크기 증가 시 효율 감소 |
| claude-pipeline 오케스트레이션 | 자동 적응 | 개발 파이프라인 전용 |
| CLAUDE.md (프로젝트 상태 문서) | 세션 시작 시 자동 로드 | 수동 관리 필요 |

### 테마 D: "AI가 만든 티가 나는" 문제

**식별된 징후**:
1. 제네릭한 디자인 — 모든 사이트가 비슷하게 생김
2. 데드 코드 축적 — 반복 프롬프팅의 흔적
3. 하드코딩된 값 — 환경변수 미사용
4. 코드 중복 — DRY 원칙 위반
5. 피상적 에러 처리 — happy path만 구현
6. "장식적" 애니메이션 — 의도 없는 시각 효과

**해법**:
- frontend-design 스킬처럼 "코드 전에 디자인 철학을 부여" (27.7만 설치의 이유)
- 아키텍처 결정을 먼저, 코드 생성은 나중에
- 제약 설정: "무엇을 하라"뿐 아니라 "무엇을 하지 마라"를 명확히

### 테마 E: 파이프라인 자동화 실 구현 사례 비교

| 프로젝트 | 범위 | 품질 게이트 | 차별점 |
|----------|------|-----------|--------|
| **ELUO SYS** | 기획→디자인→퍼블리싱→QA | Self-Check + reviewer + DA | 에이전시 전체 워크플로우 |
| **claude-pipeline** | 개발(plan→implement→test→review→pr) | code-reviewer + spec-reviewer | 포터블, 2분 셋업 |
| **levnikolaevich** | 딜리버리 라이프사이클 | 멀티 모델 교차 리뷰 | Claude+Codex+Gemini |
| **BMAD** | 애자일 개발 | 스토리 파일 + PR 리뷰 | 컨텍스트 손실 방지 |
| **agency-agents** | 에이전시 운영 전반 | 에이전트 성격/메트릭 | 147 에이전트, 커뮤니티 |

---

## 4. ELUO SYS 반영 포인트

### P0 (즉시 반영)

| # | 항목 | 근거 | 반영 위치 |
|---|------|------|----------|
| 1 | **보안 패턴 체크리스트를 publish 스킬에 삽입** | AI 코드 40-62% 보안 취약점 (S02, S11, S14) | publish-markup, publish-interaction |
| 2 | **"침묵적 결정" 방지 강화** | AI가 명시적 지시 없이 결정 → 추적 불가 (S11) | 모든 스킬의 _context.md 기록 규칙 |
| 3 | **데드코드/중복 검출을 QA에 추가** | 프로토타입 코드의 핵심 문제 (S03) | qa-functional 또는 신규 qa-code-quality |

### P1 (다음 이터레이션)

| # | 항목 | 근거 | 반영 위치 |
|---|------|------|----------|
| 4 | **멀티 모델 교차 리뷰 파일럿** | 단일 모델 편향 방지 (S06), anti-rationalization 시너지 | reviewer 에이전트 |
| 5 | **토큰 최적화 헬퍼 패턴 도입** | BMAD 70-85% 절감 (S04) | 스킬 로딩 구조 |
| 6 | **Skills 2.0 A/B 테스트 패턴 활용** | 스킬 버전 비교/개선 (S15) | 스킬 평가 프레임워크 |
| 7 | **"아키텍처 퍼스트" 원칙 명문화** | 바이브 코딩 생존자 교훈 (S07) | design-layout, publish-markup |

### P2 (장기 검토)

| # | 항목 | 근거 | 반영 위치 |
|---|------|------|----------|
| 8 | **모델 라우팅 (작은 태스크→저비용 모델)** | AWS 사례, 비용 최적화 (S10) | 오케스트레이터 레벨 |
| 9 | **defect density 메트릭을 META 블록에 추가** | 업계 KPI 전환 (S01) | handoff-schema |
| 10 | **포터블 .claude/ 드롭인 패턴** | 2분 셋업의 UX (S05) | 프로젝트 온보딩 |

### 시장 포지셔닝 인사이트

```
ELUO SYS의 차별점 (경쟁 환경 기반):
1. 바이브 코딩 도구가 아닌 "프로덕션 파이프라인"
2. 개발만이 아닌 "기획→디자인→퍼블리싱→QA" 풀 커버리지
3. 품질 게이트가 내장 — 시장의 52%가 아직 eval 미구축
4. 추적성 체인(FR→FN→UI→TC)으로 "왜 이렇게 만들었는지" 증명
5. 컨텍스트 관리(_context.md + META)로 세션 간 품질 유지
```

---

## 5. 소스 목록

### 주요 소스 (상세 분석 완료)

| # | 제목 | URL | 유형 |
|---|------|-----|------|
| S01 | 2025 was the year of AI speed. 2026 will be the year of AI quality | https://www.coderabbit.ai/blog/2025-was-the-year-of-ai-speed-2026-will-be-the-year-of-ai-quality | 블로그 |
| S02 | AI-Generated Code: The Security Blind Spot | https://www.jit.io/resources/ai-security/ai-generated-code-the-security-blind-spot-your-team-cant-ignore | 블로그 |
| S03 | Working Demo, So What? The Reality Gap | https://www.whitespectre.com/ideas/ai-powered-prototype-to-production-process/ | 블로그 |
| S04 | BMAD Method GitHub | https://github.com/bmad-code-org/BMAD-METHOD | GitHub |
| S05 | claude-pipeline (aaddrick) | https://github.com/aaddrick/claude-pipeline | GitHub |
| S06 | claude-code-skills (levnikolaevich) | https://github.com/levnikolaevich/claude-code-skills | GitHub |
| S07 | After 6 Months of Vibe Coding, My Codebase Is a Mess | https://medium.com/lets-code-future/after-6-months-of-vibe-coding-my-codebase-is-a-mess-here-s-what-went-wrong-7e4ad610bc93 | Medium |
| S08 | LangChain State of Agent Engineering | https://www.langchain.com/state-of-agent-engineering | 리포트 |
| S09 | Vibe Coding in 2026: What Actually Ships | https://justtalkingtech.medium.com/vibe-coding-in-2026-i-tried-cursor-replit-bolt-lovable-and-v0-heres-what-actually-ships-11d0b70cf1d5 | Medium |
| S10 | AWS: From AI Agent Prototype to Product | https://aws.amazon.com/blogs/devops/from-ai-agent-prototype-to-product-lessons-from-building-aws-devops-agent/ | AWS 블로그 |
| S11 | The Uncomfortable Truth About Vibe Coding | https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding | Red Hat |
| S12 | agency-agents (msitarzewski) | https://github.com/msitarzewski/agency-agents | GitHub |
| S13 | A New Worst Coder Has Entered the Chat | https://stackoverflow.blog/2026/01/02/a-new-worst-coder-has-entered-the-chat-vibe-coding-without-code-knowledge/ | Stack Overflow |
| S14 | Vibe Coding Could Cause Catastrophic Explosions | https://thenewstack.io/vibe-coding-could-cause-catastrophic-explosions-in-2026/ | The New Stack |
| S15 | Most Claude Code Skills Are Garbage | https://www.roborhythms.com/best-claude-code-skills-2026/ | 블로그 |

### 보조 소스 (검색 결과 참고)

| # | 제목 | URL | 유형 |
|---|------|-----|------|
| S16 | BMAD at Claude Code | https://github.com/24601/BMAD-AT-CLAUDE | GitHub |
| S17 | AI Agent Scaling Gap March 2026 | https://www.digitalapplied.com/blog/ai-agent-scaling-gap-march-2026-pilot-to-production | 블로그 |
| S18 | Why Vibe Coding Fails for Production | https://docs.bswen.com/blog/2026-03-25-why-vibe-coding-fails-production/ | 블로그 |
| S19 | The Vibe Coding Gap: Five Minutes to Demo, Three Months to Production | https://whimseylabs.substack.com/p/the-vibe-coding-gap-five-minutes | Substack |
| S20 | AI-Generated Code Security Risks | https://apiiro.com/blog/ai-generated-code-security/ | 블로그 |
| S21 | Figma: 12 Defining Web Development Trends for 2026 | https://www.figma.com/resource-library/web-development-trends/ | Figma |
| S22 | Google Cloud AI Agent Trends 2026 | https://cloud.google.com/resources/content/ai-agent-trends-2026 | Google Cloud |
| S23 | 에이전틱 AI 원년, 한국 기업은 어디에 서 있는가 | https://www.raylogue.com/agentic-ai-korea-2026/ | 블로그(KR) |
| S24 | AI 자동화 에이전시 개요 | https://kimsihyun.com/blog/ai-automation-agency-overview | 블로그(KR) |
| S25 | SK AX: 2026 에이전트 AI 트렌드 | https://www.skax.co.kr/insight/trend/3624 | 블로그(KR) |

---

<!-- META {
  "skill": "research",
  "version": "v1",
  "project": "ELUO_SYS",
  "created": "2026-03-29",
  "self_check": "PASS",
  "self_check_detail": "25/25 sources, 12/12 keywords searched, 5/5 themes analyzed",
  "counts": {
    "source_count": 25,
    "keyword_count": 12,
    "theme_count": 5,
    "p0_action": 3,
    "p1_action": 4,
    "p2_action": 3
  },
  "dependencies": [],
  "next_skill": null
} -->
