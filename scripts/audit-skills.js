#!/usr/bin/env node
// 스킬 SKILL.md 구조 일관성 audit
//
//   ~/.claude/skills/*/SKILL.md 또는 .claude/skills/*/SKILL.md
//   각 스킬에 대해 다음 5축 점검:
//     1) frontmatter (name + description)
//     2) version frontmatter (선택)
//     3) "권장 CLI/MCP 도구" 섹션 존재 (운영 가이드)
//     4) "출력 형식" 또는 "산출물" 섹션
//     5) "Self-Check" 또는 검증 절차 섹션
//
// 사용:
//   node scripts/audit-skills.js                # 사람용
//   node scripts/audit-skills.js --json         # JSON
//   node scripts/audit-skills.js --strict       # 누락 시 exit 1

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILLS_DIRS = [
  path.join(os.homedir(), '.claude', 'skills'),
  path.join(__dirname, '..', '.claude', 'skills')
];

function findSkills() {
  for (const dir of SKILLS_DIRS) {
    if (fs.existsSync(dir)) return { root: dir, list: fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) };
  }
  return { root: null, list: [] };
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = content.slice(3, end);
  const obj = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (m) obj[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return obj;
}

const REQUIRED_FIELDS = ['name', 'description'];
const SECTION_PATTERNS = {
  cli_tools:   /권장\s*CLI|권장\s*도구|CLI\s*도구|MCP\s*도구/i,
  output:      /출력\s*형식|산출물|출력\s*규격/i,
  self_check:  /Self.?Check|자가\s*점검|검증\s*절차|체크리스트/i
};

function auditOne(file) {
  const content = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(content);
  const issues = [];
  if (!fm) {
    issues.push('frontmatter 누락');
  } else {
    for (const f of REQUIRED_FIELDS) {
      if (!fm[f]) issues.push(`frontmatter.${f} 누락`);
    }
  }
  const sections = {};
  for (const [key, re] of Object.entries(SECTION_PATTERNS)) {
    sections[key] = re.test(content);
  }
  // 본문 너무 짧으면 stub 의심
  const bodyLen = content.length;
  if (bodyLen < 300) issues.push('본문 너무 짧음 (<300자)');

  return {
    has_frontmatter: !!fm,
    name: fm?.name || null,
    description: fm?.description || null,
    has_version: !!fm?.version,
    sections,
    body_length: bodyLen,
    issues
  };
}

function audit() {
  const { root, list } = findSkills();
  if (!root) return { error: 'skills dir not found', results: [] };
  const results = [];
  for (const skill of list) {
    const skillMd = path.join(root, skill, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      results.push({ skill, file: skillMd, missing: true });
      continue;
    }
    const r = auditOne(skillMd);
    results.push({ skill, ...r });
  }
  return { root, total: results.length, results };
}

function summarize(r) {
  const lines = [];
  lines.push(`\n[Skills audit] root=${r.root} total=${r.total}`);
  let withIssues = 0, missing = 0, healthy = 0;
  for (const x of r.results) {
    if (x.missing) {
      lines.push(`  ✗ ${x.skill.padEnd(30)} — SKILL.md 없음`);
      missing++;
      continue;
    }
    const sec = x.sections;
    const sectionSummary = `cli=${sec.cli_tools?'✓':'·'} out=${sec.output?'✓':'·'} chk=${sec.self_check?'✓':'·'}`;
    const issuesStr = x.issues.length > 0 ? `  ⚠️ ${x.issues.join(', ')}` : '';
    if (x.issues.length > 0) withIssues++;
    else if (sec.cli_tools && sec.output && sec.self_check) healthy++;
    lines.push(`  ${x.issues.length === 0 ? '✓' : '◐'} ${x.skill.padEnd(30)} ${sectionSummary}${issuesStr}`);
  }
  lines.push(`\n=== 요약: 건강=${healthy}, 이슈=${withIssues}, 누락=${missing} / 총 ${r.total} ===`);
  return { text: lines.join('\n'), issues: withIssues + missing };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const r = audit();
  if (r.error) {
    console.error('ERR:', r.error);
    process.exit(1);
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const s = summarize(r);
    console.log(s.text);
    if (args.includes('--strict') && s.issues > 0) {
      process.exit(1);
    }
  }
}

module.exports = { audit, summarize };
