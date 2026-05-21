// Mock Provider — 테스트용, 결정적 응답, API 비용 0
// Skill 유형별 더미 산출물 반환

const mockTemplates = {
  'plan-qst': ({ name, code, description }) => `# QST 고객질의서 — ${name}
> 작성일: ${new Date().toISOString().slice(0,10)} | 프로젝트: ${code}

## 1. 프로젝트 개요
| 항목 | 내용 |
|------|------|
| 프로젝트명 | ${name} |
| 설명 | ${description || '-'} |

## 2. 질의 목록
| Q | 질의 | 답변 | 상태 |
|---|------|------|------|
| Q-001 | 핵심 목표는? | ${description} | [확인됨] |
| Q-002 | 타겟 사용자는? | (분석 결과 기반 예상) | [미확인] |
| Q-003 | 일정 제약은? | 2개월 (추정) | [미확인] |

<!-- META {"skill":"plan-qst","version":"mock","project":"${code}","self_check":"PASS","self_check_detail":"3/3","counts":{"q_count":3,"confirmed":1,"pending":2}} -->`,

  'plan-req': ({ name, code, description }) => `# REQ 요구사항정의서 — ${name}

## BG 비즈니스 목표
- BG-01: ${description} 실현

## FR 기능 요구사항
| FR | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-01 | 메인 화면 | Must |
| FR-02 | 주요 기능 | Must |
| FR-03 | 관리 기능 | Should |

## NFR 비기능 요구사항
- NFR-01 성능: LCP < 2s
- NFR-02 보안: HTTPS + CSP

<!-- META {"skill":"plan-req","version":"mock","project":"${code}","self_check":"PASS","counts":{"fr_count":3,"nfr_count":2,"must":2,"should":1}} -->`,

  'plan-fn': ({ name, code }) => `# FN 기능정의서 — ${name}

## FN-01: 메인 화면
- FR 근거: FR-01
- 복잡도: 중간
- 처리: 메인 콘텐츠 렌더링

## FN-02: 주요 기능
- FR 근거: FR-02
- 복잡도: 높음
- 처리: 핵심 비즈니스 로직

## FN-03: 관리 기능
- FR 근거: FR-03
- 복잡도: 중간

<!-- META {"skill":"plan-fn","version":"mock","project":"${code}","self_check":"PASS","counts":{"fn_count":3,"high":1,"medium":2,"low":0}} -->`,

  'plan-ia': ({ name, code }) => `# IA 정보구조 — ${name}

## 페이지
| IA-P | 페이지 | URL |
|------|--------|-----|
| P001 | 메인 | / |
| P002 | 상세 | /detail/:id |
| P003 | 관리 | /admin |

## API
- GET /api/items
- POST /api/items
- GET /api/items/:id

<!-- META {"skill":"plan-ia","version":"mock","project":"${code}","self_check":"PASS","counts":{"page_count":3,"api_endpoint_count":3}} -->`,

  'plan-wbs': ({ name, code }) => `# WBS 작업분해 — ${name}

## 마일스톤
- M1 기획 (1일)
- M2 디자인 (2일)
- M3 개발 (5일)
- M4 QA (1일)

## 작업
- 1.1 요구사항 분석 (2h)
- 1.2 설계 (4h)
- 2.1 디자인 시안 (6h)

총 공수: 9일

<!-- META {"skill":"plan-wbs","version":"mock","project":"${code}","self_check":"PASS","counts":{"task_count":3,"milestone_count":4,"total_days":9}} -->`,

  'design-benchmark': ({ name, code }) => `# 디자인 벤치마크 — ${name}

## 분석 대상 3건
- Site A: 모던, 여백 중심
- Site B: 대담, 타이포 강조
- Site C: 미니멀, 구조적

## 차용 포인트
- 8px 그리드
- 중립 뉴트럴 팔레트

<!-- META {"skill":"design-benchmark","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'design-knowledge': ({ name, code }) => `# 스타일 가이드 — ${name}

## 토큰
- Primary: #2d6a4f
- Radius: 8px
- Font: 'Segoe UI'

<!-- META {"skill":"design-knowledge","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'design-layout': ({ name, code }) => `# 레이아웃 — ${name}
- 헤더 / 메인 / 사이드바 / 푸터 4영역
<!-- META {"skill":"design-layout","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'design-ui': ({ name, code }) => `# UI 명세 — ${name}
- Button: bg-primary, padding 8/16, radius 8
<!-- META {"skill":"design-ui","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'publish-markup': ({ name, code }) => `# HTML 마크업 — ${name}
\`\`\`html
<main><h1>${name}</h1></main>
\`\`\`
<!-- META {"skill":"publish-markup","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'publish-style': ({ name, code }) => `# CSS — ${name}
\`\`\`css
:root { --primary: #2d6a4f; }
\`\`\`
<!-- META {"skill":"publish-style","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'publish-interaction': ({ name, code }) => `# JS 인터랙션 — ${name}
\`\`\`js
console.log('${code} loaded');
\`\`\`
<!-- META {"skill":"publish-interaction","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'qa-functional': ({ name, code }) => `# 기능 테스트 — ${name}
- TC-F-001: 메인 렌더링 → PASS
- TC-F-002: 주요 기능 → PASS
<!-- META {"skill":"qa-functional","version":"mock","project":"${code}","self_check":"PASS","counts":{"tc_count":2,"pass":2}} -->`,

  'qa-accessibility': ({ name, code }) => `# 접근성 — ${name}
- WCAG AA: PASS
<!-- META {"skill":"qa-accessibility","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'qa-performance': ({ name, code }) => `# 성능 — ${name}
- LCP: 1.8s, CLS: 0.02
<!-- META {"skill":"qa-performance","version":"mock","project":"${code}","self_check":"PASS"} -->`,

  'analyze-prompt': ({ prompt }) => JSON.stringify({
    name: (prompt.match(/[가-힣a-zA-Z0-9 ]+/)?.[0] || '새 프로젝트').trim().slice(0, 30),
    code: 'PRJ_' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    type: /쇼핑|커머스|결제/.test(prompt) ? 'ecommerce' :
          /예약/.test(prompt) ? 'booking' :
          /관광|여행/.test(prompt) ? 'tourism' : 'web',
    industry: /카페|레스토랑|음식/.test(prompt) ? '요식업' :
              /병원|의료/.test(prompt) ? '의료' :
              /공공|정부/.test(prompt) ? '공공' : '일반',
    target: '일반 사용자',
    estimated_days: 60,
    description: prompt
  })
};

class MockProvider {
  getProviderName() { return 'mock'; }

  async testConnection() {
    return { ok: true, provider: 'mock', message: 'Mock provider — always available' };
  }

  async sendMessage({ task, skillName, context }) {
    // Simulate realistic delay (1-3s)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    if (task === 'analyze-prompt') {
      const content = mockTemplates['analyze-prompt'](context);
      return { ok: true, content, tokens: { input: 100, output: 50 } };
    }

    if (task === 'execute-skill') {
      const tpl = mockTemplates[skillName];
      if (!tpl) {
        return { ok: false, error: `Unknown skill: ${skillName}` };
      }
      const content = tpl(context);
      return { ok: true, content, tokens: { input: 500, output: 800 } };
    }

    return { ok: false, error: `Unknown task: ${task}` };
  }
}

module.exports = MockProvider;
