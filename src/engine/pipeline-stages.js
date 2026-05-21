// 완성 수준 → 파이프라인 단계 매핑 (v4.0)
// L1 초안(5) / L2 풀기획(9) / L3 개발준비(10) / L4 사이트코드(14) / L5 프론트앱(15) / L6 배포(16)

const ALL_STAGES = {
  planning: [
    { step: 'qst', skill: 'plan-qst', label: '질의서' },
    { step: 'req', skill: 'plan-req', label: '요구사항' },
    { step: 'fn', skill: 'plan-fn', label: '기능정의' },
    { step: 'ia', skill: 'plan-ia', label: '정보구조' },
    { step: 'wbs', skill: 'plan-wbs', label: '작업분해' }
  ],
  design: [
    { step: 'benchmark', skill: 'design-benchmark', label: '벤치마크' },
    { step: 'knowledge', skill: 'design-knowledge', label: '스타일가이드' },
    { step: 'layout', skill: 'design-layout', label: '레이아웃' },
    { step: 'ui', skill: 'design-ui', label: 'UI명세' }
  ],
  devspec: [
    { step: 'dev_spec', skill: 'dev-spec', label: '개발명세(SDD)' }
  ],
  publish: [
    { step: 'markup', skill: 'publish-markup', label: 'HTML' },
    { step: 'style', skill: 'publish-style', label: 'CSS' },
    { step: 'interaction', skill: 'publish-interaction', label: 'JS' }
  ],
  qa: [
    { step: 'functional', skill: 'qa-functional', label: '기능테스트' },
    { step: 'accessibility', skill: 'qa-accessibility', label: '접근성' },
    { step: 'performance', skill: 'qa-performance', label: '성능' },
    { step: 'security', skill: 'qa-security', label: '보안' }
  ],
  development: [
    { step: 'dev_api', skill: 'dev-api', label: '백엔드 API 코드' },
    { step: 'dev_component', skill: 'dev-component', label: '프론트 컴포넌트 변환' },
    { step: 'dev_test', skill: 'dev-test', label: '테스트 코드' }
  ],
  deploy: [
    { step: 'deploy', skill: 'deploy', label: '배포' }
  ]
};

// 선택적 기획 스킬 (프로젝트별 optional_skills JSON으로 활성화)
const OPTIONAL_SKILLS = {
  'plan-persona':     { label: '페르소나',       phase: 'planning', after: 'qst' },
  'plan-competitor':  { label: '경쟁사 분석',    phase: 'planning', after: 'qst' },
  'plan-swot':        { label: 'SWOT 분석',      phase: 'planning', after: 'req' },
  'plan-premortem':   { label: '프리모템',       phase: 'planning', after: 'req' },
  'plan-stakeholder': { label: '이해관계자 맵',   phase: 'planning', after: 'req' },
  'plan-prioritize':  { label: '기능 우선순위',   phase: 'planning', after: 'fn' },
  'plan-sb':          { label: '화면설계서',     phase: 'planning', after: 'ia' },
  'plan-dashboard':   { label: '프로젝트 대시보드', phase: 'planning', after: 'wbs' },
  'qa-debug':         { label: '체계적 디버깅',   phase: 'qa',       after: 'security' }
};

// L2+ 자동 활성화 스킬 — optional_skills에 없어도 자동 포함
const AUTO_ENABLED_BY_LEVEL = {
  2: ['plan-sb']  // 풀기획 이상이면 화면설계서 자동 포함
};

const LEVEL_LABELS = {
  1: '초안 (기획 5단계)',
  2: '풀기획 (+디자인 4)',
  3: '개발준비 (+SDD 1)',
  4: '사이트코드 (+퍼블 3 + QA 3)',
  5: '풀앱 (+API/컴포넌트/테스트 3)',
  6: '배포 (+Docker/CI 1)'
};

// 사전 정의 프리셋 — completion_level 기반이 아닌 phase 단위 조합
//   design-only: 디자인 4단계만 (DS 시안 빠른 산출)
//   publish-only: 퍼블 3단계만 (디자인 결정 후 코딩만)
//   qa-only: QA 4단계만
//   plan-only: 기획 5단계만
const PRESETS = {
  'plan-only':     ['planning'],
  'design-only':   ['design'],
  'publish-only':  ['publish'],
  'qa-only':       ['qa'],
  'plan+design':   ['planning', 'design'],
  'design+publish':['design', 'publish']
};

// preset 모드 — phase 명시 조합으로 stage 생성
function getStagesForPreset(presetName, optionalSkills = []) {
  const phases = PRESETS[presetName];
  if (!phases) throw new Error(`Unknown preset: ${presetName}`);
  const stages = [];
  for (const ph of phases) {
    const list = ALL_STAGES[ph] || [];
    stages.push(...list.map(s => ({ ...s, phase: ph })));
  }
  // optional 스킬 — preset 내 phase에 포함된 step뒤에만 삽입
  if (Array.isArray(optionalSkills) && optionalSkills.length > 0) {
    for (const skillName of optionalSkills) {
      const opt = OPTIONAL_SKILLS[skillName];
      if (!opt) continue;
      if (!phases.includes(opt.phase)) continue;
      const afterIdx = stages.findIndex(s => s.step === opt.after);
      if (afterIdx < 0) continue;
      const stepCode = skillName.replace('plan-', '').replace(/-/g, '_');
      stages.splice(afterIdx + 1, 0, { step: stepCode, skill: skillName, label: opt.label, phase: opt.phase, optional: true });
    }
  }
  return stages;
}

function getStagesForLevel(level, optionalSkills = []) {
  const l = +level || 1;
  const stages = [];

  // L1+: planning
  if (l >= 1) stages.push(...ALL_STAGES.planning.map(s => ({ ...s, phase: 'planning' })));
  // L2+: design
  if (l >= 2) stages.push(...ALL_STAGES.design.map(s => ({ ...s, phase: 'design' })));
  // L3+: dev-spec
  if (l >= 3) stages.push(...ALL_STAGES.devspec.map(s => ({ ...s, phase: 'devspec' })));
  // L4+: publish + qa
  if (l >= 4) stages.push(...ALL_STAGES.publish.map(s => ({ ...s, phase: 'publish' })));
  if (l >= 4) stages.push(...ALL_STAGES.qa.map(s => ({ ...s, phase: 'qa' })));
  // L5+: development (api + component + test)
  if (l >= 5) stages.push(...ALL_STAGES.development.map(s => ({ ...s, phase: 'development' })));
  // L6+: deploy
  if (l >= 6) stages.push(...ALL_STAGES.deploy.map(s => ({ ...s, phase: 'deploy' })));

  // 레벨별 자동 활성화 스킬 병합 (사용자 optional_skills와 union)
  const mergedOptional = new Set(Array.isArray(optionalSkills) ? optionalSkills : []);
  for (let lv = 1; lv <= l; lv++) {
    (AUTO_ENABLED_BY_LEVEL[lv] || []).forEach(s => mergedOptional.add(s));
  }
  const finalOptional = Array.from(mergedOptional);

  // 선택적 스킬 삽입 (after 지정 단계 직후)
  if (finalOptional.length > 0) {
    finalOptional.forEach(skillName => {
      const opt = OPTIONAL_SKILLS[skillName];
      if (!opt) return;
      const afterIdx = stages.findIndex(s => s.step === opt.after);
      if (afterIdx < 0) return; // 기준 step이 레벨에 포함 안 됐으면 skip
      const stepCode = skillName.replace('plan-', '').replace(/-/g, '_');
      stages.splice(afterIdx + 1, 0, {
        step: stepCode,
        skill: skillName,
        label: opt.label,
        phase: opt.phase,
        optional: true
      });
    });
  }

  // step_order 부여는 pipelines.js가 idx로 처리
  return stages;
}

module.exports = { getStagesForLevel, getStagesForPreset, ALL_STAGES, OPTIONAL_SKILLS, LEVEL_LABELS, PRESETS };
