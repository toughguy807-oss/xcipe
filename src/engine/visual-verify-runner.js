// publish-visual-verify 자동 실행 wrapper
//
// 호출 시점: design-ui / publish-style / publish-interaction 완료 직후 (pipeline-worker)
// 입력: { skillName, project, outputDir, artifactPath }
// 출력: { ok, skipped?, score?, gate?, axes?, error? }
//
// Phase 1 (Grep 기반 Never-Rules): 항상 가능
// Phase 2 (Taste 9-Axis LLM 채점): provider 설정 시
// Phase 3 (Playwright Vision): Playwright 미설치 시 skip
//
// 본 모듈은 Phase 1만 정적 구현 — Phase 2/3은 별도 큰 작업이라 stub.

const fs = require('fs');
const path = require('path');

// Anthropic Content Guidelines + 디자인 Never-Rules 정규식 패턴
const NEVER_RULES = [
  { id: 'house-cream-bg',      re: /#F4F1EA|#FAFAF7|#F5EFE6/i,                      label: 'Default House Style 크림 배경 (warm off-white)' },
  { id: 'house-terracotta',    re: /#[Cc]4[a-fA-F0-9]{4}|#D4654[A-Fa-f0-9]/i,       label: 'Default House Style 테라코타/앰버/코랄' },
  { id: 'serif-italic-accent', re: /<em[^>]*>.*<\/em>|font-style:\s*italic[^;]*serif/i, label: 'Serif Display + Italic word-accent' },
  { id: 'placeholder-content', re: /lorem\s+ipsum|TODO:|FIXME:|Coming Soon/i,       label: '실제 콘텐츠 미입력 (lorem/TODO)' },
  { id: 'too-many-colors',     re: null, custom: (text) => {
      const hexes = (text.match(/#[0-9a-fA-F]{6}/g) || []);
      const unique = new Set(hexes.map(h => h.toLowerCase()));
      return unique.size > 25 ? `너무 많은 컬러(${unique.size}종) — 팔레트 정리 필요` : null;
  }, label: '컬러 25종 초과' },
  { id: 'hardcoded-px',        re: null, custom: (text) => {
      const pxMatches = text.match(/\b\d{2,4}px\b/g) || [];
      // 토큰 변수 없이 절대 px가 50회 이상이면 시스템화 부족
      return pxMatches.length > 50 ? `절대 px 사용 과다(${pxMatches.length}회) — clamp() 또는 토큰 권장` : null;
  }, label: 'px 과다 사용' }
];

// Phase 1: 산출물 디스크 본문에서 Never-Rules 검출
function scanNeverRules(content) {
  const violations = [];
  for (const rule of NEVER_RULES) {
    if (rule.custom) {
      const v = rule.custom(content);
      if (v) violations.push({ id: rule.id, label: rule.label, detail: v });
    } else if (rule.re && rule.re.test(content)) {
      violations.push({ id: rule.id, label: rule.label });
    }
  }
  return violations;
}

// 9-Axis 평가 — 본 stub은 휴리스틱 (실 LLM 채점은 별도 작업)
function tasteHeuristics(content, skillName) {
  const axes = {};
  // 1. 타이포그래피 계층 — h1~h6 + font-size 다양성
  const headings = (content.match(/<h[1-6]/g) || []).length;
  axes.typography_hierarchy = { score: Math.min(100, headings * 20), evidence: `${headings}개 heading 검출` };
  // 2. 컬러 사용 — 토큰 변수 vs 절대값 비율
  const varColors = (content.match(/var\(--[a-zA-Z][\w-]*\)/g) || []).length;
  const hexColors = (content.match(/#[0-9a-fA-F]{6}/g) || []).length;
  const tokenRatio = varColors + hexColors > 0 ? Math.round(varColors / (varColors + hexColors) * 100) : 50;
  axes.color_tokenization = { score: tokenRatio, evidence: `var() ${varColors} vs hex ${hexColors}` };
  // 3. 반응형 — media query / clamp() 존재
  const hasMedia = /@media\s*\([^)]*\b(min-width|max-width)/.test(content);
  const hasClamp = /clamp\s*\(/.test(content);
  axes.responsive = { score: (hasMedia ? 50 : 0) + (hasClamp ? 50 : 0), evidence: `media=${hasMedia}, clamp=${hasClamp}` };
  // 4. 컴포넌트 분리 — class 이름 다양성
  const classes = new Set((content.match(/class="[^"]+"/g) || []).flatMap(s => s.slice(7, -1).split(/\s+/)));
  axes.component_separation = { score: Math.min(100, classes.size * 2), evidence: `unique classes ${classes.size}` };
  // 5. 접근성 hint — alt/aria/role
  const a11y = ((content.match(/\balt=/g) || []).length + (content.match(/\baria-/g) || []).length);
  axes.accessibility = { score: Math.min(100, a11y * 5), evidence: `alt+aria ${a11y}` };
  // 평균
  const total = Object.values(axes).reduce((s, a) => s + a.score, 0);
  const avg = Math.round(total / Object.keys(axes).length);
  return { axes, avg };
}

async function runVisualVerify({ skillName, project, outputDir, artifactPath }) {
  if (!artifactPath || !fs.existsSync(artifactPath)) {
    return { ok: false, skipped: true, reason: 'artifact 파일 없음' };
  }
  let content = '';
  try { content = fs.readFileSync(artifactPath, 'utf8'); }
  catch (err) { return { ok: false, skipped: true, reason: err.message }; }

  // 산출물이 너무 짧으면 skip (HTML/CSS 외 단순 텍스트)
  if (content.length < 200) {
    return { ok: false, skipped: true, reason: 'artifact 길이 < 200자' };
  }

  // Phase 1: Never-Rules
  const violations = scanNeverRules(content);

  // Phase 2 (heuristic): 9-Axis 휴리스틱 (실 LLM 채점은 후속 작업)
  const { axes, avg } = tasteHeuristics(content, skillName);

  // 게이트 판정 — Never-Rules 위반이 있으면 REQUIRED, avg < 60이면 RECOMMENDED, 아니면 PASS
  let gate = 'PASS';
  if (violations.length > 0) gate = 'HITL_REQUIRED';
  else if (avg < 60) gate = 'HITL_RECOMMENDED';

  return {
    ok: true,
    phase: 'heuristic',
    score: avg,
    gate,
    axes,
    violations,
    skill: skillName,
    artifact: path.basename(artifactPath),
    timestamp: new Date().toISOString()
  };
}

module.exports = { runVisualVerify, scanNeverRules, tasteHeuristics, NEVER_RULES };
