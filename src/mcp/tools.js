// MCP Tools — 6개 plan-* 스킬을 도구로 노출
//
// 각 tool 입력: { project_code: string, user_input?: string }
// 각 tool 출력: { content: [{ type: 'text', text: <skill 결과 본문> }] }
//
// 호출 흐름:
//   1) project_code → DB project 조회 (없으면 ESYS-MCP-PRJ)
//   2) skill-loader → SKILL.md 본문 (없으면 ESYS-MCP-SKL)
//   3) DB → previous artifacts (단계 의존성: REQ→FN→IA→WBS)
//   4) model-bridge.executeSkill → 본문 반환

const { db } = require('../db');
const skillLoader = require('../engine/skill-loader');
const modelBridge = require('../engine/model-bridge');

// 단계 의존: 본 스킬 실행 전 이미 생성된 산출물 type 목록 (있으면 컨텍스트 주입)
const DEPENDENCIES = {
  'plan-qst':  [],
  'plan-req':  ['plan-qst'],
  'plan-fn':   ['plan-req'],
  'plan-ia':   ['plan-req', 'plan-fn'],
  'plan-sb':   ['plan-ia', 'plan-fn'],
  'plan-wbs':  ['plan-req', 'plan-fn', 'plan-ia'],
  'ops-deploy': ['plan-fn', 'plan-ia', 'plan-wbs']
};

const TOOL_DEFS = [
  {
    name: 'sys_plan_qst',
    skill: 'plan-qst',
    title: 'plan-qst — 고객질의서 생성',
    description: '프로젝트 정보를 받아 비즈니스 목표/KPI/팀/예산을 선택형으로 정리한 고객질의서(QST)를 생성합니다.'
  },
  {
    name: 'sys_plan_req',
    skill: 'plan-req',
    title: 'plan-req — 요구사항정의서 생성',
    description: 'QST 결과를 입력으로 기능/비기능 요구사항 + AC + NFR + 추적성 매트릭스를 정의합니다. 사전 plan_qst 실행 권장.'
  },
  {
    name: 'sys_plan_fn',
    skill: 'plan-fn',
    title: 'plan-fn — 기능정의서 생성',
    description: 'REQ 기반 상세 기능정의서(처리/예외/에러 + 의존관계)를 생성합니다. 사전 plan_req 실행 필요.'
  },
  {
    name: 'sys_plan_ia',
    skill: 'plan-ia',
    title: 'plan-ia — 정보구조설계 생성',
    description: '사이트맵/페이지 인벤토리/네비게이션/URL 설계를 생성합니다. 사전 plan_req/plan_fn 실행 권장.'
  },
  {
    name: 'sys_plan_sb',
    skill: 'plan-sb',
    title: 'plan-sb — 화면설계서(Screen Blueprint) 생성',
    description: 'IA/FN 기반 화면설계서(JSON v2 스키마: screens[].wireframe[]/descriptions[]/msgCases[])를 생성합니다. ' +
                 '페이지 → 섹션(wireframe) → 콘텐츠 항목(descriptions.marker) 3단계 계층. ' +
                 'GUI 플랫폼이 페이지 트리/콘텐츠 편집 UI로 직접 렌더링 가능. FN 연계/독립 모드 모두 지원.'
  },
  {
    name: 'sys_plan_wbs',
    skill: 'plan-wbs',
    title: 'plan-wbs — 작업분해구조 생성',
    description: 'REQ/FN/IA 기반 WBS + 간트 + 마일스톤을 생성합니다. 사전 plan_req/plan_fn/plan_ia 실행 권장.'
  },
  {
    name: 'sys_ops_deploy',
    skill: 'ops-deploy',
    title: 'ops-deploy — 산출물 배포 명세',
    description: '산출물(output/) + 티켓 + Dashboard를 GitHub Pages 정적 배포로 묶는 명세를 생성합니다.'
  }
];

// MCP tool listing — 각 도구의 inputSchema 동일 (project_code 필수)
function listTools() {
  return TOOL_DEFS.map(t => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: {
      type: 'object',
      properties: {
        project_code: { type: 'string', description: '프로젝트 코드 (대문자/숫자/언더바, 예: CAFE2026)' },
        user_input:   { type: 'string', description: '추가 지시사항 (선택)' }
      },
      required: ['project_code']
    }
  }));
}

function findToolDef(name) {
  return TOOL_DEFS.find(t => t.name === name);
}

function lookupProject(code) {
  return db.prepare('SELECT * FROM projects WHERE code = ? OR id = ?').get(code, parseInt(code, 10) || -1);
}

function loadPreviousArtifacts(projectId, requiredSkills) {
  if (requiredSkills.length === 0) return [];
  const placeholders = requiredSkills.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT type, content, created_at
    FROM artifacts
    WHERE project_id = ? AND type IN (${placeholders})
    ORDER BY created_at DESC
  `).all(projectId, ...requiredSkills);
  // 각 type에서 가장 최신 1건만
  const latest = new Map();
  for (const r of rows) if (!latest.has(r.type)) latest.set(r.type, r);
  return Array.from(latest.values());
}

async function callTool(name, args = {}) {
  const def = findToolDef(name);
  if (!def) {
    return { isError: true, code: -32602, message: `Unknown tool: ${name}` };
  }
  const projectCode = (args.project_code || '').trim();
  if (!projectCode) {
    return { isError: true, code: -32602, message: 'project_code 필수' };
  }

  const project = lookupProject(projectCode);
  if (!project) {
    return { isError: true, code: -32000, message: `ESYS-MCP-PRJ: project not found — ${projectCode}` };
  }

  const skillContent = skillLoader.loadSkill(def.skill);
  if (!skillContent) {
    return { isError: true, code: -32000, message: `ESYS-MCP-SKL: skill SKILL.md not found — ${def.skill}` };
  }

  const previousArtifacts = loadPreviousArtifacts(project.id, DEPENDENCIES[def.skill] || []);
  const userInput = (args.user_input || '').trim();

  let result;
  try {
    result = await modelBridge.executeSkill({
      skillName: def.skill,
      skillContent,
      project,
      previousArtifacts,
      userInput,
      invocationId: `mcp-${Date.now()}`
    });
  } catch (err) {
    return { isError: true, code: -32000, message: `ESYS-MCP-EXEC: ${err.message}` };
  }

  if (!result.ok) {
    return {
      isError: true,
      code: -32000,
      message: `ESYS-MCP-PROV: ${result.error || 'provider returned ok=false'}`
    };
  }

  // MCP tools/call 응답 — content array (TextContent)
  return {
    isError: false,
    content: [
      { type: 'text', text: typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2) }
    ],
    structuredContent: {
      skill: def.skill,
      project_code: project.code,
      tokens: result.tokens || null,
      model: result.model || null
    }
  };
}

module.exports = { listTools, callTool, TOOL_DEFS };
