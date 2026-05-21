const router = require('express').Router();
const fs = require('fs');
const { db, isFts5Ready } = require('../db');
const { authMiddleware } = require('../auth');
const { assertProjectAccess } = require('../middleware/project-access');

router.use(authMiddleware);

// FTS5 query escaping — phrase 처리 + 특수문자 제거
//   사용자 입력의 따옴표/연산자가 FTS5 syntax error를 일으키지 않도록 단순 phrase로 변환
//   예: "foo bar" → "\"foo bar\"", `foo OR bar` → `"foo OR bar"`
function escapeFtsQuery(q) {
  const cleaned = String(q).replace(/"/g, '""');
  return `"${cleaned}"`;
}

// GET /api/search/artifacts — 전 프로젝트 산출물 검색
//   q: 검색어 (file_name + 본문 grep)
//   project_id: 특정 프로젝트로 제한 (선택)
//   type: artifact.type 필터 (선택)
//   days: 최근 N일 (선택, 1-365)
//   limit: 결과 수 (1-100, default 30)
//   include_content: 본문도 검색할지 (기본 true). false면 file_name/type만
router.get('/artifacts', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'ESYS-SRCH-001', message: '검색어는 2글자 이상' });
  }

  // project_id 명시 시 격리 가드
  if (req.query.project_id) {
    const g = assertProjectAccess(req, req.query.project_id);
    if (!g.ok) return res.status(g.status).json(g.body);
  }

  const conds = [];
  const args = [];
  conds.push('p.deleted_at IS NULL');

  // member 격리: 본인 created_by 만
  if (req.user.role !== 'admin') {
    conds.push('p.created_by = ?');
    args.push(req.user.id);
  }

  if (req.query.project_id) { conds.push('a.project_id = ?'); args.push(parseInt(req.query.project_id, 10) || 0); }
  if (req.query.type) { conds.push('a.type = ?'); args.push(req.query.type); }

  const days = parseInt(req.query.days, 10);
  if (days && days >= 1 && days <= 365) {
    conds.push("a.created_at >= datetime('now', ?)");
    args.push(`-${days} days`);
  }

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
  const includeContent = req.query.include_content !== 'false';

  // 1차: file_name/type LIKE 매칭
  const like = `%${q}%`;
  const qLower = q.toLowerCase();
  const fileMatches = db.prepare(`
    SELECT a.id, a.project_id, a.type, a.version, a.file_name, a.file_path, a.created_at,
           a.pipeline_step_id, p.name as project_name, p.code as project_code
    FROM artifacts a JOIN projects p ON p.id = a.project_id
    WHERE ${conds.join(' AND ')} AND (a.file_name LIKE ? OR a.type LIKE ?)
    ORDER BY a.created_at DESC LIMIT ?
  `).all(...args, like, like, limit);

  const seen = new Set(fileMatches.map(r => r.id));
  let contentMatches = [];
  let usedFts = false;

  // 2차: 본문 검색
  //   F2: FTS5 가용 시 SQL 한 번으로 끝 (bm25 정렬 + snippet)
  //   폴백: 디스크 grep (200건 후보 → fs.readFileSync)
  if (includeContent && fileMatches.length < limit) {
    const remaining = limit - fileMatches.length;

    if (isFts5Ready()) {
      try {
        const ftsArgs = [...args];
        // FTS join을 위해 conds에서 'a.' 별칭 그대로 재사용 가능
        const excludeClause = seen.size > 0 ? `AND a.id NOT IN (${[...seen].join(',')})` : '';
        const rows = db.prepare(`
          SELECT a.id, a.project_id, a.type, a.version, a.file_name, a.file_path, a.created_at,
                 a.pipeline_step_id, p.name as project_name, p.code as project_code,
                 snippet(artifacts_fts, 1, '«', '»', '…', 12) as snippet,
                 bm25(artifacts_fts) as rank
          FROM artifacts_fts
            JOIN artifacts a ON a.id = artifacts_fts.artifact_id
            JOIN projects p ON p.id = a.project_id
          WHERE artifacts_fts MATCH ?
            AND ${conds.join(' AND ')} ${excludeClause}
          ORDER BY rank LIMIT ?
        `).all(escapeFtsQuery(q), ...ftsArgs, remaining);

        contentMatches = rows.map(r => ({
          ...r,
          match_in: 'content',
          snippet: (r.snippet || '').replace(/\s+/g, ' ').trim(),
          _meta: { rank: r.rank, fts: true }
        }));
        usedFts = true;
      } catch (e) {
        // MATCH 구문 오류·인덱스 손상 시 폴백 — 사용자에게는 침묵
        usedFts = false;
      }
    }

    // 폴백: FTS 실패 또는 미가용 시 디스크 grep
    if (!usedFts) {
      const candidates = db.prepare(`
        SELECT a.id, a.project_id, a.type, a.version, a.file_name, a.file_path, a.created_at,
               a.pipeline_step_id, p.name as project_name, p.code as project_code
        FROM artifacts a JOIN projects p ON p.id = a.project_id
        WHERE ${conds.join(' AND ')} ${seen.size > 0 ? `AND a.id NOT IN (${[...seen].join(',')})` : ''}
        ORDER BY a.created_at DESC LIMIT 200
      `).all(...args);

      for (const c of candidates) {
        if (contentMatches.length >= remaining) break;
        try {
          const stat = fs.statSync(c.file_path);
          if (stat.size > 5_000_000) continue;
          const text = fs.readFileSync(c.file_path, 'utf-8');
          const lowerText = text.toLowerCase();
          const idx = lowerText.indexOf(qLower);
          if (idx >= 0) {
            let count = 0; let pos = idx;
            while (pos >= 0 && count < 20) { count++; pos = lowerText.indexOf(qLower, pos + qLower.length); }
            const start = Math.max(0, idx - 60);
            const end = Math.min(text.length, idx + q.length + 60);
            const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
            const headerHit = idx < 200;
            contentMatches.push({
              ...c, match_in: 'content',
              snippet: snippet.replace(/\s+/g, ' ').trim(),
              _meta: { count, headerHit, idx }
            });
          }
        } catch { /* read error skip */ }
      }
    }
  }

  // C3: 점수 계산 — 매칭 위치/빈도/최근성 가중치
  function score(r) {
    let s = 0;
    const fnLower = (r.file_name || '').toLowerCase();
    if (r.match_in === 'file_name') {
      if (fnLower === qLower) s = 100;
      else if (fnLower.startsWith(qLower)) s = 80;
      else s = 60;
    } else {
      // content
      const m = r._meta || {};
      if (m.fts) {
        // bm25는 낮을수록 매칭 강도 강함 — 0~약 -20 범위에서 정규화
        // 기준: bm25 0 = 35점, -10 이하 = 60점, -20 이하 = 70점
        const rank = m.rank || 0;
        s = 35 + Math.min(35, Math.max(0, -rank * 1.75));
      } else {
        s = m.headerHit ? 40 : 20;
        s += Math.min((m.count || 1) - 1, 20);  // 추가 매칭 1회당 +1, 최대 +20
      }
    }
    // 최근성 보너스
    try {
      const ageMs = Date.now() - new Date(r.created_at + 'Z').getTime();
      const ageDays = ageMs / 86400000;
      if (ageDays < 7) s += 10;
      else if (ageDays < 30) s += 5;
    } catch { /* ignore */ }
    return s;
  }

  const fileResults = fileMatches.map(r => {
    const result = { ...r, match_in: 'file_name', snippet: null };
    result.score = score(result);
    return result;
  });
  const contentResults = contentMatches.map(r => {
    const result = { ...r, snippet: r.snippet };
    result.score = score(r);
    delete result._meta;
    return result;
  });

  const all = [...fileResults, ...contentResults].sort((a, b) => b.score - a.score);

  res.json({
    q,
    total: all.length,
    file_name_matches: fileMatches.length,
    content_matches: contentMatches.length,
    engine: usedFts ? 'fts5' : 'grep',
    results: all
  });
});

// POST /api/search/reindex — admin 전용 (수동 재색인 트리거)
//   migration 누락·디스크 변경 후 일괄 재구축에 사용
router.post('/reindex', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'ESYS-AUTH-005', message: 'Insufficient permissions' });
  }
  if (!isFts5Ready()) {
    return res.status(503).json({ error: 'ESYS-SRCH-007', message: 'FTS5 미가용 (LIKE 폴백 사용 중)' });
  }
  try {
    db.exec('DELETE FROM artifacts_fts');
    const { reindexAllArtifacts } = require('../db');
    const r = reindexAllArtifacts();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ error: 'ESYS-SRCH-008', message: e.message });
  }
});

// T1-C: GET /api/search/all — 통합 검색 (projects + artifacts + tickets + messages)
//   q: 검색어 (2글자 이상)
//   limit: 카테고리당 결과 수 (1-20, default 5)
//   member는 자기 created_by 프로젝트 컨텍스트만 (T0-1 격리 정책 적용)
router.get('/all', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'ESYS-SRCH-010', message: '검색어는 2글자 이상' });
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const like = `%${q}%`;
  const isAdmin = req.user.role === 'admin';
  const userId = req.user.id;

  // 프로젝트 격리: member는 본인 프로젝트만 표시 → 후속 카테고리도 본인 프로젝트로 한정
  const projWhere = isAdmin
    ? 'p.deleted_at IS NULL'
    : 'p.deleted_at IS NULL AND p.created_by = ?';
  const projArgs = isAdmin ? [] : [userId];

  // 1) projects
  const projects = db.prepare(`
    SELECT id, name, code, status, description
    FROM projects p
    WHERE ${projWhere} AND (p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)
    ORDER BY updated_at DESC LIMIT ?
  `).all(...projArgs, like, like, like, limit);

  // 2) artifacts — file_name·type 매칭 (본문은 무거우니 통합에서는 file_name만)
  const artifacts = db.prepare(`
    SELECT a.id, a.file_name, a.type, a.version, a.project_id,
           p.name AS project_name, p.code AS project_code
    FROM artifacts a JOIN projects p ON a.project_id = p.id
    WHERE ${projWhere} AND a.file_name LIKE ?
    ORDER BY a.created_at DESC LIMIT ?
  `).all(...projArgs, like, limit);

  // 3) tickets — title·description 매칭
  const tickets = db.prepare(`
    SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.project_id,
           p.name AS project_name, p.code AS project_code
    FROM tickets t JOIN projects p ON t.project_id = p.id
    WHERE ${projWhere} AND (t.title LIKE ? OR t.description LIKE ?)
    ORDER BY t.updated_at DESC LIMIT ?
  `).all(...projArgs, like, like, limit);

  // 4) messages — content 매칭 (본문 1000자 미리보기)
  const messages = db.prepare(`
    SELECT m.id, m.role, m.kind, substr(m.content, 1, 200) AS preview, m.project_id, m.created_at,
           p.name AS project_name, p.code AS project_code
    FROM messages m JOIN projects p ON m.project_id = p.id
    WHERE ${projWhere} AND m.content LIKE ?
    ORDER BY m.id DESC LIMIT ?
  `).all(...projArgs, like, limit);

  res.json({
    q,
    total: projects.length + artifacts.length + tickets.length + messages.length,
    categories: {
      projects: { count: projects.length, items: projects },
      artifacts: { count: artifacts.length, items: artifacts },
      tickets: { count: tickets.length, items: tickets },
      messages: { count: messages.length, items: messages }
    }
  });
});

// GET /api/search/projects — 프로젝트명/코드/설명 검색
router.get('/projects', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'ESYS-SRCH-002', message: '검색어는 2글자 이상' });
  const like = `%${q}%`;
  const rows = db.prepare(`
    SELECT id, name, code, type, description, status, completion_level, created_at
    FROM projects
    WHERE deleted_at IS NULL AND (name LIKE ? OR code LIKE ? OR description LIKE ?)
    ORDER BY created_at DESC LIMIT 30
  `).all(like, like, like);
  res.json({ q, total: rows.length, results: rows });
});

// GET /api/search/artifacts/:id/context — 단일 산출물에서 q 매칭 위치 ±800자 발췌
//   결과 카드에서 inline expand 시 사용 (D2)
router.get('/artifacts/:id/context', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'ESYS-SRCH-003', message: '검색어는 2글자 이상' });
  const id = parseInt(req.params.id, 10) || 0;
  const a = db.prepare(`
    SELECT a.id, a.file_name, a.file_path, a.type, a.project_id, p.created_by
    FROM artifacts a JOIN projects p ON p.id = a.project_id
    WHERE a.id = ? AND p.deleted_at IS NULL
  `).get(id);
  if (!a) return res.status(404).json({ error: 'ESYS-SRCH-004', message: '산출물 없음' });
  // 격리: member 는 본인 created_by 만
  if (req.user.role !== 'admin' && a.created_by !== req.user.id) {
    return res.status(403).json({ error: 'ESYS-PRJ-019', message: '본인이 생성한 프로젝트의 산출물만 조회 가능' });
  }

  let text = '';
  try {
    const stat = fs.statSync(a.file_path);
    if (stat.size > 5_000_000) {
      return res.status(413).json({ error: 'ESYS-SRCH-005', message: '본문이 5MB를 초과해 미리보기 불가', size: stat.size });
    }
    text = fs.readFileSync(a.file_path, 'utf-8');
  } catch (e) {
    return res.status(500).json({ error: 'ESYS-SRCH-006', message: '파일 읽기 실패' });
  }

  const qLower = q.toLowerCase();
  const lower = text.toLowerCase();
  const positions = [];
  let pos = lower.indexOf(qLower);
  while (pos >= 0 && positions.length < 5) {
    positions.push(pos);
    pos = lower.indexOf(qLower, pos + qLower.length);
  }

  const segments = positions.map(p => {
    const start = Math.max(0, p - 400);
    const end = Math.min(text.length, p + q.length + 400);
    return {
      offset: p,
      truncated_left: start > 0,
      truncated_right: end < text.length,
      text: text.slice(start, end),
      match_in_segment: p - start
    };
  });

  res.json({
    id: a.id,
    file_name: a.file_name,
    type: a.type,
    project_id: a.project_id,
    q,
    total_matches: positions.length,
    truncated: positions.length === 5 && lower.indexOf(qLower, positions[4] + qLower.length) >= 0,
    segments
  });
});

module.exports = router;
