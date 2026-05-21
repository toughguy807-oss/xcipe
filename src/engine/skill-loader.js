// Skill Loader — 우선순위: SKILLS_DIR(env) > ESYS_DEV(전역) > 번들 > 전역 fallback
// ESYS_DEV=1 → ~/.claude 직접 참조 (drift 0, 단일 원본)
// 기본 → D:/SYS_v4/.claude (배포본 자기완결)
const fs = require('fs');
const path = require('path');
const os = require('os');

const GLOBAL_BASE = path.join(os.homedir(), '.claude');
const BUNDLED_BASE = path.resolve(__dirname, '..', '..', '.claude');

const GLOBAL_SKILLS = path.join(GLOBAL_BASE, 'skills');
const BUNDLED_SKILLS = path.join(BUNDLED_BASE, 'skills');

const DEV_MODE = process.env.ESYS_DEV === '1';

function resolveSkillsDir() {
  if (process.env.SKILLS_DIR) return process.env.SKILLS_DIR;
  if (DEV_MODE && fs.existsSync(GLOBAL_SKILLS)) return GLOBAL_SKILLS;
  if (fs.existsSync(BUNDLED_SKILLS)) return BUNDLED_SKILLS;
  return GLOBAL_SKILLS;
}

function resolveClaudeRoot() {
  if (DEV_MODE && fs.existsSync(GLOBAL_BASE)) return GLOBAL_BASE;
  if (fs.existsSync(BUNDLED_BASE)) return BUNDLED_BASE;
  return GLOBAL_BASE;
}

const SKILLS_DIR = resolveSkillsDir();
const CLAUDE_ROOT = resolveClaudeRoot();

console.log(`[skill-loader] mode=${DEV_MODE ? 'DEV(global)' : 'BUNDLE'} skills=${SKILLS_DIR}`);

function loadSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return null;
  try {
    return fs.readFileSync(skillPath, 'utf-8');
  } catch (err) {
    console.warn(`[skill-loader] Failed to read ${skillPath}: ${err.message}`);
    return null;
  }
}

function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  try {
    return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')));
  } catch {
    return [];
  }
}

module.exports = { loadSkill, listSkills, SKILLS_DIR, CLAUDE_ROOT, DEV_MODE };
