// U-G22: RAG 최소 구현 — ~/.claude 자산을 sqlite-fts5로 색인 + BM25 검색
//
// 코퍼스 (memory: project_rag_direction.md):
//   - skill   : ~/.claude/skills/*/SKILL.md
//   - rule    : ~/.claude/lib/rules/*.md
//   - ref     : ~/.claude/ref/*.md
//   - agent   : ~/.claude/agents/*.md
//   - catalog : ~/.claude/AGENTS.md, ~/.claude/SKILLS_CATALOG.md
//
// CLAUDE_HOME 환경변수로 경로 오버라이드 가능 (개발/CI 환경).
// 본문은 첫 8KB만 색인 — SKILL.md는 헤더+첫 절이 가장 정보 밀도 높음.
// 검색은 FTS5 MATCH + bm25() — search.js와 동일 패턴.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { db, isRagReady } = require('../db');

const BODY_LIMIT = 8192;

function getClaudeHome() {
  return process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
}

function _safeRead(filePath, limit = BODY_LIMIT) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(Math.min(limit, stat.size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf.toString('utf-8');
  } catch { return null; }
}

function _listMarkdown(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(dir, f));
  } catch { return []; }
}

function _walkSkills(skillsDir) {
  // skills/{name}/SKILL.md 형태
  const out = [];
  try {
    if (!fs.existsSync(skillsDir)) return out;
    for (const name of fs.readdirSync(skillsDir)) {
      const skillFile = path.join(skillsDir, name, 'SKILL.md');
      if (fs.existsSync(skillFile)) out.push({ name, path: skillFile });
    }
  } catch { /* 흡수 */ }
  return out;
}

function _walkAgents(agentsDir) {
  // agents/*.md 직접 (서브폴더 X)
  return _listMarkdown(agentsDir).map(p => ({
    name: path.basename(p, '.md'),
    path: p
  }));
}

// 코퍼스 전체 재색인 — 부팅 시 1회 + admin 수동 트리거
function reindexAll() {
  if (!isRagReady()) return { ready: false, indexed: 0 };
  const t0 = Date.now();
  const home = getClaudeHome();

  if (!fs.existsSync(home)) {
    return { ready: true, indexed: 0, error: 'CLAUDE_HOME not found', home };
  }

  // 기존 색인 비우고 다시 채움 (전체 재색인 — 부분 갱신은 단순화 차원에서 미지원)
  db.prepare(`DELETE FROM rag_corpus`).run();

  const sources = { skill: 0, rule: 0, ref: 0, agent: 0, catalog: 0 };
  const insert = db.prepare(`
    INSERT INTO rag_corpus (source, name, path, body) VALUES (?, ?, ?, ?)
  `);

  // 1. skills/*/SKILL.md
  for (const s of _walkSkills(path.join(home, 'skills'))) {
    const body = _safeRead(s.path);
    if (body) { insert.run('skill', s.name, s.path, body); sources.skill++; }
  }

  // 2. lib/rules/*.md
  for (const p of _listMarkdown(path.join(home, 'lib', 'rules'))) {
    const body = _safeRead(p);
    if (body) {
      insert.run('rule', path.basename(p, '.md'), p, body);
      sources.rule++;
    }
  }

  // 3. ref/*.md
  for (const p of _listMarkdown(path.join(home, 'ref'))) {
    const body = _safeRead(p);
    if (body) {
      insert.run('ref', path.basename(p, '.md'), p, body);
      sources.ref++;
    }
  }

  // 4. agents/*.md
  for (const a of _walkAgents(path.join(home, 'agents'))) {
    const body = _safeRead(a.path);
    if (body) { insert.run('agent', a.name, a.path, body); sources.agent++; }
  }

  // 5. catalog — AGENTS.md, SKILLS_CATALOG.md, CLAUDE.md
  for (const f of ['AGENTS.md', 'SKILLS_CATALOG.md', 'CLAUDE.md']) {
    const p = path.join(home, f);
    const body = _safeRead(p);
    if (body) {
      insert.run('catalog', path.basename(p, '.md'), p, body);
      sources.catalog++;
    }
  }

  const total = sources.skill + sources.rule + sources.ref + sources.agent + sources.catalog;
  return { ready: true, total, sources, ms: Date.now() - t0, home };
}

// FTS5 MATCH 쿼리는 특수문자 (`-`, `:`, `"`)가 토큰 분리에 영향. 안전 변환:
//   - 한글/영문/숫자만 추출, 토큰별로 따옴표로 감쌈
//   - 짧은 토큰 (<2) 제거
function _buildMatchQuery(q) {
  if (!q || typeof q !== 'string') return null;
  const tokens = q.match(/[\p{L}\p{N}]+/gu) || [];
  const terms = tokens.filter(t => t.length >= 2).map(t => `"${t}"`);
  if (!terms.length) return null;
  return terms.join(' ');
}

function search(query, opts = {}) {
  if (!isRagReady()) return { ready: false, results: [] };
  const limit = Math.max(1, Math.min(20, parseInt(opts.limit, 10) || 5));
  const source = opts.source && ['skill', 'rule', 'ref', 'agent', 'catalog'].includes(opts.source)
    ? opts.source : null;

  const match = _buildMatchQuery(query);
  if (!match) return { ready: true, results: [], query, match: null };

  let sql = `
    SELECT source, name, path,
           snippet(rag_corpus, 3, '<mark>', '</mark>', '…', 16) AS snippet,
           bm25(rag_corpus) AS score
    FROM rag_corpus
    WHERE rag_corpus MATCH ?
  `;
  const params = [match];
  if (source) { sql += ` AND source = ?`; params.push(source); }
  // bm25()는 음수 반환 — 더 작을수록(더 음수) 관련도 높음. ASC = 관련도 높은순.
  sql += ` ORDER BY score ASC LIMIT ?`;
  params.push(limit);

  try {
    const rows = db.prepare(sql).all(...params);
    return { ready: true, results: rows, query, match, total: rows.length };
  } catch (e) {
    return { ready: true, results: [], query, match, error: e.message };
  }
}

function getStats() {
  if (!isRagReady()) return { ready: false };
  const rows = db.prepare(`
    SELECT source, COUNT(*) AS c FROM rag_corpus GROUP BY source
  `).all();
  const sources = { skill: 0, rule: 0, ref: 0, agent: 0, catalog: 0 };
  let total = 0;
  for (const r of rows) { sources[r.source] = r.c; total += r.c; }
  return { ready: true, total, sources, home: getClaudeHome() };
}

module.exports = { reindexAll, search, getStats, getClaudeHome };
