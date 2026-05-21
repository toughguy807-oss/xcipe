# AI 워크플로/에이전트 마켓플레이스 조사 보고서

> 조사일: 2026-03-25
> 목적: ELUO SYS v4.0 스킬팩의 시장 포지셔닝 및 판매 가능성 검증

---

## 1. n8n 마켓플레이스 (n8n.io/workflows)

### 1-1. 규모
- 총 워크플로 템플릿: **8,925건** (2026.03 기준)
- 커뮤니티 노드: **5,834개**
- 무료 공개 기반, 크리에이터 허브를 통한 수익화 지원

### 1-2. 카테고리별 워크플로 수

| 카테고리 | 워크플로 수 | 비고 |
|----------|-----------|------|
| **AI** | 6,099 | 가장 큰 카테고리. 데이터 추출, 번역, 콘텐츠 생성, 감정 분석 |
| **Marketing** | 2,759 | 이메일 캠페인, SNS 포스팅, 리드 스코어링 |
| **Sales** | 1,246 | 리드 관리, 팔로업 자동화, 견적 생성 |
| **IT Ops** | 1,022 | 인프라 모니터링, CI/CD, 배포 추적 |
| **Document Ops** | 1,011 | 문서 처리, OCR, 데이터 변환 |
| **Market Research** | 865 | 경쟁사 분석, 시장 조사, 가격 모니터링 |
| **Support** | 723 | 티켓 관리, SLA 모니터링, 고객 응대 |
| **Lead Generation** | 598 | LinkedIn 스크래핑, 이메일 아웃리치, AI 리드 스코어링 |
| **Engineering** | 465 | 테스트 파이프라인, 코드 리뷰, QA |
| **Lead Nurturing** | 267 | 드립 캠페인, 개인화 팔로업 |
| **Project Management** | 181 | AI 프로젝트 매니저, 상태 추적, 태스크 자동 생성 |
| **Product** | 151 | 피드백 수집, 로드맵 관리 |

### 1-3. 잘 팔리는/인기 있는 패턴

1. **AI 에이전트 워크플로** — 리드 생성 에이전트, 콘텐츠 팩토리, RAG 챗봇
2. **멀티플랫폼 SNS 자동화** — 한 번 작성 → 여러 채널 자동 배포 (수작업 80% 감소)
3. **LinkedIn 리드 생성** — 스크래핑 + AI 스코어링 + 이메일 아웃리치
4. **SLA 모니터링** — 티켓 SLA 임박 시 자동 에스컬레이션
5. **클라이언트 리포팅** — 크로스플랫폼 성과 데이터 자동 집계

### 1-4. 디지털 에이전시 전용 워크플로 (n8nlab.io)

n8nlab.io에서 디지털 에이전시 전용 워크플로를 별도로 분류:
- 리드 생성 & 자격 심사 (AI 기반 리드 스코어링)
- SLA 관리 (자동 에스컬레이션)
- 프로젝트 배포 추적
- 클라이언트 승인 워크플로
- 자동 성과 보고서

**핵심 발견**: "디지털 에이전시" 카테고리가 존재하지만, **기획/설계 자동화**, **QA 자동화**, **디자인 시스템 자동화**는 없다.

---

## 2. 유료 n8n 워크플로 마켓플레이스

### 2-1. N8NMarket (n8nmarket.com)

- n8n, Zapier, Make 모두 커버하는 프리미엄 마켓플레이스
- 기성 템플릿 판매 + 커스텀 자동화 의뢰 모두 지원
- 가격 비공개 (개별 문의)

### 2-2. HaveWorkflow (haveworkflow.com)

- n8n 워크플로 전문 마켓플레이스
- 카테고리/앱/키워드 검색 지원
- 크리에이터가 직접 워크플로 등록하여 판매 가능
- 가격: 워크플로당 유로 단위 (구체적 가격대 비공개)

### 2-3. ManageN8N (managen8n.com)

- n8n 워크플로 템플릿 마켓플레이스 + 관리 도구
- 크리에이터 수익화: 유연한 라이선스 옵션, 반복 수익 가능
- 내장 버전 관리, 다운로드/배포 메트릭 제공
- 조직 내부 프라이빗 라이브러리 기능

### 2-4. Gumroad/Lemon Squeezy (개인 판매)

| 플랫폼 | 수수료 | 장점 |
|--------|--------|------|
| Gumroad | 10% | 쉬운 셋업, 넓은 사용자 기반 |
| Lemon Squeezy | 5% + $0.50 | VAT/세금 자동 처리 |

**실제 판매 사례**:
- 소셜 콘텐츠 팩토리 번들 (4,000+ 템플릿) — Gumroad 판매 중
- $100M Offer 자동화 (Hormozi 프레임워크) — Gumroad 판매 중

### 2-5. 가격대 분석

| 가격대 | 대상 |
|--------|------|
| $29 이하 | 단순 워크플로 (1~2 노드, 단일 기능) |
| $49~$99 | 중간 복잡도 (AI 에이전트, 멀티채널) |
| $149~$299+ | 산업 특화 솔루션 (번들, 전체 파이프라인) |
| $5,000~$15,000 | 커스텀 구축/마이그레이션 (Zapier→n8n 등) |

### 2-6. 수익 실사례

| 크리에이터 | 월 수익 | 방법 |
|-----------|---------|------|
| 5개 워크플로 판매자 | $3,200/월 | 패시브 인컴, 멀티 마켓플레이스 |
| 4개월 테스트 판매자 | $800~$2,100/월 | 총 $4,200, 변동 큼 |
| 컨설팅 하이브리드 | $5,000+/월 | 템플릿 + 컨설팅 |

---

## 3. Dify Marketplace (marketplace.dify.ai)

### 3-1. 플러그인 카테고리

| 카테고리 | 설명 |
|----------|------|
| **Models** | AI 모델 관리 (Claude, GPT, Gemini 등) |
| **Tools** | 도메인별 기능 (데이터 분석, 번역, 커스텀 통합) |
| **Agent Strategies** | 추론 전략 (CoT, ToT, Function Call, ReAct) |
| **Extensions** | HTTP 웹훅 기반 외부 통합 |
| **Bundles** | 플러그인 묶음 |

### 3-2. 주요 특징

- **Creator Center**: 워크플로 템플릿 게시 → 사용자 원클릭 채택
- **수익화**: PartnerStack 제휴를 통한 반복 수수료 (구독 유도 시)
- **Agent Strategy**: Function Calling + ReAct 두 가지 공식 전략
- **RAG**: PDF, PPT 등 문서 수집 → 검색 → 답변 파이프라인 지원

### 3-3. 시장 포지셔닝

- Dify는 "에이전트 워크플로 빌더" 포지션
- 마켓플레이스는 아직 초기 단계 (2026.03 기준)
- n8n 대비 플러그인/템플릿 수가 훨씬 적음
- **웹 에이전시, 디자인 자동화, QA 자동화 관련 플러그인: 발견되지 않음**

---

## 4. MindStudio (mindstudio.ai)

### 4-1. 플랫폼 규모

- 투자: $36M (VC + 엔젤)
- 배포된 에이전트: **150,000+**
- 사용자: 개인, SMB, 엔터프라이즈, 정부 기관
- 100+ 사전 제작 에이전트 템플릿 제공

### 4-2. 인기 에이전트 카테고리

| 카테고리 | 대표 에이전트 | 가격 |
|----------|-------------|------|
| **법률 계약 분석** | NDA/계약서 리뷰, 리스크 식별 | $200~$500/월 |
| **의료 스케줄링** | 환자 예약, 대기자 관리 | $150~$400/월 |
| **마케팅 자동화** | 콘텐츠 생성, 캠페인 관리 | $199/월 |
| **콘텐츠 크리에이션** | 블로그, SNS, 이메일, 광고 카피 | - |
| **영업 생산성** | 리드 스코어링, CRM 업데이트 | - |
| **고객 서비스** | 티켓 라우팅, 이슈 요약, 자연어 응대 | - |
| **프리랜서/컨설턴트** | 제안서 생성, 이메일 관리, PM | - |

### 4-3. 수익화 모델

- 구독 기반: 월정액 + 사용량 기반 추가 과금 (하이브리드)
- 플랫폼이 결제, 호스팅, 인프라 처리
- 크리에이터가 에이전트를 게시하면 MindStudio 사용자가 발견/구매

### 4-4. 핵심 인사이트

> "2026년 성공하는 AI 에이전트 크리에이터의 공통점: 범용 어시스턴트가 아니라 **특정 도메인의 구체적 문제**를 해결하는 에이전트를 만든다."

- 프리랜서: AI 에이전트로 주당 8시간 절약, 월 $2,000~$4,000 추가 수익
- 제안서 생성 에이전트: 제안서 산출량 200% 증가
- 이메일 관리 에이전트: 이메일 처리 시간 40~50% 감소
- PM 에이전트: 40% 더 많은 클라이언트 관리 가능

---

## 5. "웹 에이전시/디자인/기획/QA 자동화" 워크플로 존재 여부

### 5-1. 검색 결과 요약

| 키워드 | n8n | Dify | MindStudio | 유료 마켓 |
|--------|-----|------|-----------|----------|
| 웹 에이전시 자동화 | 부분 존재 (리드, SLA, 리포팅) | 없음 | 없음 | 없음 |
| 디자인 자동화 | 없음 | 없음 | 썸네일 A/B 테스트 정도 | 없음 |
| 기획 자동화 (요구사항, 기능정의) | 없음 | 없음 | 없음 | 없음 |
| QA 자동화 (테스트 케이스, 접근성) | Engineering 카테고리에 일부 CI/CD | 없음 | 없음 | 없음 |
| UI/와이어프레임 생성 | 없음 | 없음 | 없음 | 없음 |
| 프로젝트 관리 | 181건 (n8n), 기본적 수준 | 없음 | PM 에이전트 존재 | 없음 |
| 콘텐츠 생성 | 대량 존재 (2,759+ 마케팅) | 존재 | 주력 카테고리 | 존재 |
| 코드 리뷰 | Engineering에 일부 | 없음 | 언급 없음 | 없음 |

### 5-2. 결론: **명백한 시장 공백**

**존재하는 것**: 리드 생성, 마케팅, 콘텐츠, 영업, IT Ops
**존재하지 않는 것**:
- FR(요구사항) → FN(기능정의) → UI → TC(테스트케이스) 파이프라인
- 기획 산출물 자동 생성 (요구사항 정의서, 기능 명세서, IA 설계)
- 디자인 시스템 자동화 (벤치마킹, 레이아웃 규칙, 스타일 가이드)
- QA 자동화 (기능 테스트, 접근성 검증, 성능 점검)
- 산출물 간 추적성 관리 (traceability chain)

---

## 6. 잘 팔리는 워크플로의 공통 특징

### 6-1. 제품화 패턴

| 특징 | 설명 |
|------|------|
| **니치 타겟팅** | "전체 자동화"가 아니라 "이커머스 주문 동기화", "SNS 스케줄러" 등 구체적 문제 |
| **즉각적 ROI** | "이 워크플로로 주당 8시간 절약" 같은 명확한 가치 제안 |
| **원클릭 임포트** | JSON 파일 다운로드 → 즉시 사용 가능 |
| **상세 문서화** | 셋업 가이드, 변수 설명, 커스터마이징 방법 포함 |
| **번들링** | 단일 워크플로보다 "올인원 팩" (예: 4,000+ 템플릿 메가팩) |
| **영상 튜토리얼** | YouTube/Loom 설명 영상 동반 |

### 6-2. 가격 전략

| 전략 | 설명 |
|------|------|
| 프리미엄 단일 판매 | $49~$299, 라이프타임 액세스 |
| 번들/메가팩 | $99~$499, 대량 템플릿 + 업데이트 |
| SaaS 래핑 | 워크플로를 Bubble/Softr UI로 감싸서 월정액 |
| 컨설팅 하이브리드 | 템플릿 무료 공개 → 커스텀 구축 의뢰 유도 |

### 6-3. 수요가 높은 자동화 카테고리 (2026)

1. **AI 에이전트** (리드 생성, RAG 챗봇, 콘텐츠 팩토리)
2. **마케팅 자동화** (이메일, SNS, 리드 스코어링)
3. **영업 자동화** (CRM 동기화, 견적, 팔로업)
4. **문서 처리** (OCR, PDF 추출, 데이터 변환)
5. **IT Ops** (CI/CD, 모니터링, 배포)

---

## 7. 시장 규모 참고

- 글로벌 워크플로 자동화 시장: **$26.01B** (2026) → **$40.77B** (2031), CAGR 9.41%
- 대기업 90%가 하이퍼오토메이션 우선순위화 (Gartner)
- SME 성장 CAGR 10.19% — 소규모 팀의 자동화 수요 급증
- 클라우드 배포 비중 62.15%, 하이브리드 성장 10.08%

---

## 8. ELUO SYS v4.0에 대한 시사점

### 8-1. 시장 기회 분석

| 영역 | 시장 상태 | ELUO SYS 포지션 | 기회 수준 |
|------|----------|----------------|----------|
| 기획 자동화 (REQ/FN/IA/WBS) | **완전 공백** | 핵심 역량 | ★★★★★ |
| QA 자동화 (TC/접근성/성능) | **거의 공백** (CI/CD만 존재) | 핵심 역량 | ★★★★★ |
| 디자인 파이프라인 자동화 | **완전 공백** | 핵심 역량 | ★★★★☆ |
| 퍼블리싱 자동화 (마크업/스타일) | **완전 공백** | 핵심 역량 | ★★★★☆ |
| 산출물 추적성 (FR→FN→UI→TC) | **개념 자체가 없음** | 유일한 솔루션 | ★★★★★ |
| PM/프로젝트 관리 | 기본 수준 존재 (181건) | 차별화 가능 | ★★★☆☆ |
| 리드 생성/마케팅 | 포화 (6,000+건) | 진입 불필요 | ★☆☆☆☆ |

### 8-2. 경쟁 우위 재확인

기존 벤치마킹에서 확인된 6가지 경쟁 우위가 마켓플레이스 조사에서도 그대로 유효:

1. **FR→FN→UI→TC 추적 체인** — 어떤 마켓플레이스에도 이 개념이 없음
2. **4도메인 통합 reviewer** — QA 자동화가 CI/CD 수준에 머물러 있음
3. **PM Devil's Advocate** — 의사결정 검증 에이전트는 시장에 부재
4. **_handoff.md + META 블록** — 단계 간 구조화된 핸드오프 표준 부재
5. **디지털 에이전시 전용 파이프라인** — n8nlab이 일부 커버하지만 기획→디자인→퍼블리싱→QA 전체 파이프라인은 없음
6. **3회 이터레이션 + 에스컬레이션** — 자기 교정(self-correction) 루프가 있는 워크플로는 희귀

### 8-3. 배포 전략 시사점

| 벤치마크 인사이트 | ELUO SYS 적용 |
|------------------|---------------|
| 니치 타겟팅이 핵심 | "디지털 프로덕트 에이전시"는 충분히 구체적인 니치 |
| 즉각적 ROI 제시 필요 | "기획서 작성 2일 → 2시간" 같은 수치 |
| 원클릭 임포트 중요 | 스킬팩 install.bat이 이미 이 역할 |
| 번들링이 단일 판매보다 효과적 | 4 Layer (Skill Pack + Orchestration + Hub + Dashboard) 번들 |
| 영상 튜토리얼 동반 필수 | 데모 영상 + E2E 테스트 영상 필요 |
| 상세 문서화 필수 | 스킬별 SKILL.md + 커맨드별 사용법 |

### 8-4. 판매 채널 옵션

| 채널 | 적합도 | 이유 |
|------|--------|------|
| **GitHub (오픈코어)** | ★★★★★ | BMAD-METHOD(41K), superpowers(105K) 성공 사례 |
| **Gumroad** | ★★★★☆ | 프리미엄 번들 판매, 10% 수수료 |
| **자체 사이트** | ★★★★☆ | 프리미엄 포지셔닝, 커스텀 의뢰 연계 |
| **n8n Creator Hub** | ★★☆☆☆ | n8n 워크플로가 아니므로 부적합 |
| **Dify Marketplace** | ★★☆☆☆ | Dify 플러그인이 아니므로 부적합 |
| **MindStudio** | ★★☆☆☆ | MindStudio 에이전트가 아니므로 부적합 |

---

## Sources

- [n8n Workflows](https://n8n.io/workflows/)
- [n8n AI Workflows](https://n8n.io/workflows/categories/ai/)
- [n8n Marketing Workflows](https://n8n.io/workflows/categories/marketing/)
- [n8n Engineering Workflows](https://n8n.io/workflows/categories/engineering/)
- [n8n Project Management Workflows](https://n8n.io/workflows/categories/project-management/)
- [N8NMarket](https://n8nmarket.com/)
- [HaveWorkflow](https://haveworkflow.com/)
- [ManageN8N Marketplace](https://www.managen8n.com/features/marketplace)
- [Best n8n Workflows for Digital Agencies - N8N Lab](https://n8nlab.io/blog/best-n8n-workflows-digital-agencies)
- [n8n for Digital Agencies](https://n8nlab.io/n8n-for-digital-agencies)
- [n8n Monetization Strategies](https://ritz7.com/blog/monetize-n8n-automation-skills)
- [Selling n8n Workflows - Medium](https://medium.com/write-a-catalyst/im-trying-to-make-3k-10k-month-selling-n8n-workflows-here-s-what-s-actually-working-a43624121b70)
- [5 n8n Automations $3,200/Month - Medium](https://medium.com/write-a-catalyst/i-built-5-n8n-automations-that-generate-3-200-month-passively-72e2a3050e17)
- [How to Make Money with n8n](https://www.browseract.com/blog/how-to-make-money-with-n8n-workflow-automation)
- [Dify Marketplace](https://marketplace.dify.ai/)
- [Dify Plugins Blog](https://dify.ai/blog/introducing-dify-plugins)
- [Dify Creator Center Blog](https://dify.ai/blog/dify-creator-center-template-marketplace-share-your-workflows)
- [MindStudio](https://www.mindstudio.ai/)
- [MindStudio Monetization](https://www.mindstudio.ai/blog/creator-economy-ai-monetizing-agent-apps)
- [MindStudio AI Agents for Freelancers](https://www.mindstudio.ai/blog/ai-agents-for-freelancers)
- [MindStudio AI Agent Use Cases](https://university.mindstudio.ai/docs/ai-agent-use-cases)
- [MindStudio AI Agents for Marketing](https://www.mindstudio.ai/blog/ai-agents-for-marketing-teams)
- [MindStudio Build & Monetize](https://www.mindstudio.ai/blog/build-monetize-ai-agents-business)
- [n8n Community - Selling Workflows](https://community.n8n.io/t/where-can-i-sell-my-n8n-workflow-i-am-looking-for-marketplaces-not-the-creator-hub/212963)
- [AI Workflow Automation Trends 2026](https://www.cflowapps.com/ai-workflow-automation-trends/)
- [Workflow Automation Market Size](https://www.mordorintelligence.com/industry-reports/workflow-automation-market)
- [n8n Guide 2026 - Hatchworks](https://hatchworks.com/blog/ai-agents/n8n-guide/)
- [awesome-n8n-templates GitHub](https://github.com/enescingoz/awesome-n8n-templates)
