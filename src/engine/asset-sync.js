// asset-sync (S1: read-only 매니페스트)
//   ~/.claude 의 6개 카테고리 자산을 스캔해 SHA256 + version frontmatter 를 추출.
//
//   카테고리 매핑 (RUNTIME 기준):
//     skills    → skills/*/SKILL.md
//     agents    → agents/*.md
//     rules     → lib/rules/*.md
//     commands  → commands/*.md
//     ref       → ref/*.md
//     claude-md → CLAUDE.md (단일 파일)
//
//   path 정규화: 카테고리 루트 기준 상대경로
//     예) skills/plan-qst/SKILL.md, agents/reviewer.md, rules/INDEX.md
//
//   S2에서 MASTER (D:/eluo-hub_v4/dist/plan-*/.claude/...) 병합 비교 추가 예정.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const RUNTIME_ROOT = process.env.CLAUDE_RUNTIME_ROOT || path.join(os.homedir(), '.claude');
const SNAPSHOT_ROOT = process.env.ASSET_SNAPSHOT_ROOT || path.join(__dirname, '..', '..', 'data', 'asset-snapshots');

const CATEGORIES = {
  skills:    { dir: path.join(RUNTIME_ROOT, 'skills'),     pattern: 'SKILL.md', recursive: true },
  agents:    { dir: path.join(RUNTIME_ROOT, 'agents'),     pattern: '*.md',     recursive: false },
  rules:     { dir: path.join(RUNTIME_ROOT, 'lib', 'rules'), pattern: '*.md',   recursive: false },
  commands:  { dir: path.join(RUNTIME_ROOT, 'commands'),   pattern: '*.md',     recursive: false },
  ref:       { dir: path.join(RUNTIME_ROOT, 'ref'),        pattern: '*.md',     recursive: false },
  'claude-md': { single: path.join(RUNTIME_ROOT, 'CLAUDE.md') }
};

// 카테고리별 MASTER 추적 정책
//   master_required — MASTER 패키지에 자산이 존재해야 정상 (rules·skills·agents·commands·ref)
//                    MASTER 카테고리가 비어있으면 'master_missing' 경고
//   runtime_only    — MASTER 비교 비대상 (CLAUDE.md — 패키지별 차이 가능)
const CATEGORY_POLICY = {
  skills:    'master_required',
  agents:    'master_required',
  rules:     'master_required',
  commands:  'master_required',
  ref:       'master_required',
  'claude-md': 'runtime_only'
};

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const DEFAULT_VERSION = '1.0.0';

// frontmatter 의 version: 추출 — 없으면 DEFAULT_VERSION 으로 가정.
//   기획 자산은 운영 중 frontmatter 강제 삽입이 비표준(rules/commands/ref/CLAUDE.md 는
//   원래 frontmatter 가 없음)이라, "버전 없으면 1.0.0" 으로 간주하고
//   변경 발생 시점에 점진적으로 명시 버전을 추가하는 정책.
//   has_version: 사용자에게 명시 버전이 있는지 알리기 위해 플래그로 보존.
function parseVersion(content) {
  if (!content.startsWith('---')) return { version: DEFAULT_VERSION, has_version: false };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { version: DEFAULT_VERSION, has_version: false };
  const fm = content.slice(3, end);
  const m = fm.match(/^version:\s*['"]?([^'"\n]+)['"]?/m);
  return m
    ? { version: m[1].trim(), has_version: true }
    : { version: DEFAULT_VERSION, has_version: false };
}

function listFiles(dir, pattern, recursive) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) out.push(...listFiles(full, pattern, recursive));
      continue;
    }
    if (pattern === '*.md' && e.name.endsWith('.md')) out.push(full);
    else if (pattern === 'SKILL.md' && e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

function relPath(category, fullPath) {
  if (category === 'claude-md') return 'CLAUDE.md';
  if (category === 'rules') {
    return 'rules/' + path.relative(CATEGORIES.rules.dir, fullPath).split(path.sep).join('/');
  }
  return category + '/' + path.relative(CATEGORIES[category].dir, fullPath).split(path.sep).join('/');
}

// RUNTIME 단일 스캔 → [{path, category, version, sha256, size}]
function scanRuntime() {
  const out = [];
  for (const [category, cfg] of Object.entries(CATEGORIES)) {
    if (cfg.single) {
      if (!fs.existsSync(cfg.single)) continue;
      const buf = fs.readFileSync(cfg.single);
      const v = parseVersion(buf.toString('utf8'));
      out.push({
        path: 'CLAUDE.md',
        category,
        version: v.version,
        has_version: v.has_version,
        sha256: sha256(buf),
        size: buf.length
      });
      continue;
    }
    const files = listFiles(cfg.dir, cfg.pattern, cfg.recursive);
    for (const f of files) {
      const buf = fs.readFileSync(f);
      const v = parseVersion(buf.toString('utf8'));
      out.push({
        path: relPath(category, f),
        category,
        version: v.version,
        has_version: v.has_version,
        sha256: sha256(buf),
        size: buf.length
      });
    }
  }
  return out;
}

// DB 업서트 — manifest와 runtime 비교 후 변경분만 UPDATE
function rebuildManifest({ db, actor = 'system' }) {
  const runtime = scanRuntime();
  const existing = new Map(db.prepare('SELECT path, sha256, version FROM asset_manifest').all().map(r => [r.path, r]));

  const ins = db.prepare(`
    INSERT INTO asset_manifest (path, category, version, sha256, size, status, updated_at)
    VALUES (?, ?, ?, ?, ?, 'synced', datetime('now'))
    ON CONFLICT(path) DO UPDATE SET
      category = excluded.category,
      version = excluded.version,
      sha256 = excluded.sha256,
      size = excluded.size,
      updated_at = datetime('now')
  `);
  const audit = db.prepare(`
    INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
    VALUES (?, 'manifest_rebuild', ?, ?, ?, ?, ?, ?)
  `);

  const seen = new Set();
  let added = 0, changed = 0, unchanged = 0;

  const tx = db.transaction(() => {
    for (const r of runtime) {
      seen.add(r.path);
      const prev = existing.get(r.path);
      ins.run(r.path, r.category, r.version, r.sha256, r.size);
      if (!prev) {
        added++;
        audit.run(actor, r.path, null, r.sha256, null, r.version, JSON.stringify({ kind: 'added' }));
      } else if (prev.sha256 !== r.sha256) {
        changed++;
        audit.run(actor, r.path, prev.sha256, r.sha256, prev.version, r.version, JSON.stringify({ kind: 'changed' }));
      } else {
        unchanged++;
      }
    }
    // RUNTIME에서 사라진 row → orphan으로 마킹 (실 삭제는 S2 sync에서)
    const orphaned = [];
    for (const p of existing.keys()) {
      if (!seen.has(p)) orphaned.push(p);
    }
    if (orphaned.length) {
      const upd = db.prepare(`UPDATE asset_manifest SET status='orphan', updated_at=datetime('now') WHERE path = ?`);
      for (const p of orphaned) {
        upd.run(p);
        const prev = existing.get(p);
        audit.run(actor, p, prev.sha256, null, prev.version, null, JSON.stringify({ kind: 'orphan_runtime' }));
      }
    }
  });
  tx();

  return { total: runtime.length, added, changed, unchanged };
}

// 카테고리/상태 필터 조회
function listManifest({ db, category = null, status = null, q = null, limit = 500 }) {
  const conds = [];
  const args = [];
  if (category) { conds.push('category = ?'); args.push(category); }
  if (status)   { conds.push('status = ?');   args.push(status); }
  if (q)        { conds.push('path LIKE ?');  args.push(`%${q}%`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT path, category, version, sha256, size, master_sha, master_version, status,
           pending_action, updated_at, approved_by, approved_at
    FROM asset_manifest
    ${where}
    ORDER BY category, path
    LIMIT ?
  `).all(...args, limit);
  return rows;
}

function summary({ db }) {
  const rows = db.prepare(`
    SELECT category, status, COUNT(*) as c FROM asset_manifest
    GROUP BY category, status
  `).all();
  const byCategory = {};
  const byStatus = { synced: 0, behind: 0, ahead: 0, new: 0, orphan: 0, pending_approval: 0, divergent: 0, unmanaged: 0 };
  let total = 0;
  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.c;
    if (byStatus[r.status] !== undefined) byStatus[r.status] += r.c;
    total += r.c;
  }
  return { total, byCategory, byStatus };
}

// 카테고리별 MASTER 추적 헬스 진단
//   - master_required인 카테고리에 MASTER 자산이 0건이면 'master_missing' 경고
//   - 정상 카테고리는 'ok'
//   - claude-md는 'runtime_only' (비교 제외 — 설계 정상)
//
// 반환: [{ category, policy, status, runtime_count, master_count, message }]
function getCategoryHealth({ db }) {
  // MASTER 자산 카테고리별 카운트
  const masterByCategory = {};
  for (const m of scanMaster()) {
    masterByCategory[m.category] = (masterByCategory[m.category] || 0) + 1;
  }
  // RUNTIME 자산 카테고리별 카운트 (manifest 기준 — 빠른 조회)
  const runtimeByCategory = {};
  for (const r of db.prepare('SELECT category, COUNT(*) c FROM asset_manifest GROUP BY category').all()) {
    runtimeByCategory[r.category] = r.c;
  }

  const out = [];
  for (const [category, policy] of Object.entries(CATEGORY_POLICY)) {
    const masterCount = masterByCategory[category] || 0;
    const runtimeCount = runtimeByCategory[category] || 0;
    let status = 'ok';
    let message = null;
    if (policy === 'runtime_only') {
      status = 'runtime_only';
      message = 'MASTER 비교 비대상 (정상)';
    } else if (policy === 'master_required') {
      if (masterCount === 0 && runtimeCount > 0) {
        status = 'master_missing';
        message = `MASTER 패키지(${listMasterPackages().length}개)의 ${category} 카테고리에 자산이 없습니다. ` +
                  `RUNTIME ${runtimeCount}건은 master 추적이 불가하여 'unmanaged' 상태로 표시됩니다. ` +
                  (category === 'rules'
                    ? 'MASTER 빌드 시 lib/rules/ 디렉토리가 패키지에 포함되도록 빌드 스크립트를 확인하세요.'
                    : `MASTER 빌드 시 ${category}/ 디렉토리가 패키지에 포함되도록 확인하세요.`);
      } else if (masterCount === 0 && runtimeCount === 0) {
        status = 'empty';
        message = '자산 없음';
      }
    }
    out.push({ category, policy, status, runtime_count: runtimeCount, master_count: masterCount, message });
  }
  return out;
}

// ============================================================
// S2: MASTER 비교 + SemVer 분류 + sync/lock
// ============================================================

const MASTER_ROOT = process.env.CLAUDE_MASTER_ROOT || 'D:/eluo-hub_v4/dist';
// 패키지 디렉토리 자동 탐색 — plan-* 형태 하위가 .claude/ 보유
function listMasterPackages() {
  if (!fs.existsSync(MASTER_ROOT)) return [];
  return fs.readdirSync(MASTER_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('plan-'))
    .map(e => path.join(MASTER_ROOT, e.name, '.claude'))
    .filter(p => fs.existsSync(p));
}

// 패키지별 카테고리 디렉토리 매핑 (RUNTIME과 동일 명명, lib/rules 포함)
function masterCategoryDir(pkgClaudeDir, category) {
  if (category === 'claude-md') return null; // 패키지별 차이 가능 — MASTER 비교 제외 (향후 정책)
  if (category === 'rules')     return path.join(pkgClaudeDir, 'lib', 'rules');
  return path.join(pkgClaudeDir, category);
}

// 6개 패키지를 합쳐 단일 path → {sha256, version, size, sources[]} 맵 생성.
//   동일 path가 여러 패키지에 있으면 SHA 일치 검증, 불일치 시 conflict=true.
function scanMaster() {
  const pkgs = listMasterPackages();
  const merged = new Map(); // path → entry
  for (const pkg of pkgs) {
    for (const [category, cfg] of Object.entries(CATEGORIES)) {
      const dir = masterCategoryDir(pkg, category);
      if (!dir || !fs.existsSync(dir)) continue;
      const files = listFiles(dir, cfg.pattern || '*.md', cfg.recursive || false);
      for (const f of files) {
        const buf = fs.readFileSync(f);
        const v = parseVersion(buf.toString('utf8'));
        const rel = relPath(category, makeFullForRel(category, dir, f));
        const sha = sha256(buf);
        const prev = merged.get(rel);
        if (!prev) {
          merged.set(rel, {
            path: rel,
            category,
            version: v.version,
            has_version: v.has_version,
            sha256: sha,
            size: buf.length,
            sources: [pkg],
            conflict: false
          });
        } else {
          prev.sources.push(pkg);
          if (prev.sha256 !== sha) prev.conflict = true;
        }
      }
    }
  }
  return Array.from(merged.values());
}

// relPath()는 RUNTIME 절대경로 가정으로 짜여 있어, MASTER 경로에 맞춰 변환
function makeFullForRel(category, masterCategoryDir, filePath) {
  if (category === 'claude-md') return filePath;
  // RUNTIME relPath()가 CATEGORIES[category].dir 기준 상대경로를 만드므로,
  // 임시로 같은 키로 쓰려면 category dir만 맞으면 됨. 다른 임시 객체 만들기보다
  // 직접 상대경로 계산하는 게 안전.
  const rel = path.relative(masterCategoryDir, filePath).split(path.sep).join('/');
  if (category === 'rules') return path.join(CATEGORIES.rules.dir, rel);
  return path.join(CATEGORIES[category].dir, rel);
}

function parseSemver(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

// runtime entry vs master entry → diff 분류
//   결과: { status, action, bump, auto_eligible, reason }
//   status: synced | behind | ahead | new | orphan | divergent | unmanaged
//   action: noop | sync | approve | manual
//   bump:   patch | minor | major | -
//
//   masterCategoryHasAny: 해당 카테고리가 MASTER 에 자산을 하나라도 갖고 있는지.
//   false 이면 그 카테고리 자체가 MASTER 추적 비대상이라 보고, runtime-only 자산은 orphan 이 아니라 unmanaged 로 분류.
function classifyDiff(runtime, master, masterCategoryHasAny = true) {
  // 한쪽만 존재
  if (!runtime && master) {
    return { status: 'new', action: 'approve', bump: '-', auto_eligible: false, reason: 'master에만 존재 — 신규 추가 승인 필요' };
  }
  if (runtime && !master) {
    if (!masterCategoryHasAny) {
      return { status: 'unmanaged', action: 'noop', bump: '-', auto_eligible: false, reason: '해당 카테고리는 MASTER 추적 비대상' };
    }
    return { status: 'orphan', action: 'approve', bump: '-', auto_eligible: false, reason: 'master에서 제거됨 — 삭제 승인 필요' };
  }
  // 동일
  if (runtime.sha256 === master.sha256) {
    return { status: 'synced', action: 'noop', bump: '-', auto_eligible: false, reason: 'SHA 동일' };
  }
  // CLAUDE.md는 항상 major
  if (runtime.category === 'claude-md' || master.category === 'claude-md') {
    return { status: 'pending_approval', action: 'approve', bump: 'major', auto_eligible: false, reason: 'CLAUDE.md 변경은 항상 승인 필요' };
  }
  // SemVer 비교
  const a = parseSemver(runtime.version);
  const b = parseSemver(master.version);
  if (!a || !b) {
    // 둘 중 하나라도 SemVer가 아니면 divergent — patch 취급(자동 eligible)으로 가지 않고 manual 승인
    return { status: 'pending_approval', action: 'approve', bump: '-', auto_eligible: false, reason: '버전 형식 불명 — 명시 승인 필요' };
  }
  if (b.major > a.major) return { status: 'pending_approval', action: 'approve', bump: 'major', auto_eligible: false, reason: 'major bump — 승인 필요' };
  if (b.major < a.major) return { status: 'ahead', action: 'manual', bump: '-', auto_eligible: false, reason: 'master 가 runtime 보다 낮은 major' };
  if (b.minor > a.minor) return { status: 'behind', action: 'sync', bump: 'minor', auto_eligible: true, reason: 'minor bump — 자동 적용 가능' };
  if (b.minor < a.minor) return { status: 'ahead', action: 'manual', bump: '-', auto_eligible: false, reason: 'master 가 runtime 보다 낮은 minor' };
  if (b.patch > a.patch) return { status: 'behind', action: 'sync', bump: 'patch', auto_eligible: true, reason: 'patch bump — 자동 적용 가능' };
  if (b.patch < a.patch) return { status: 'ahead', action: 'manual', bump: '-', auto_eligible: false, reason: 'master 가 runtime 보다 낮은 patch' };
  // 동일 버전인데 SHA 다름 → divergent
  return { status: 'divergent', action: 'approve', bump: '-', auto_eligible: false, reason: '버전 동일하지만 내용 상이 — 승인 필요' };
}

// MASTER 와 RUNTIME 비교 후 manifest 업데이트.
//   runtime 먼저 rebuild → master 스캔 → 각 path 분류 → status/master_sha/master_version/pending_action 갱신.
//   반환: 카운트 + 변경 요약
function diffWithMaster({ db, actor = 'system' }) {
  // 1) runtime 최신화
  const runtimeRows = scanRuntime();
  const rRows = new Map(runtimeRows.map(r => [r.path, r]));

  // 2) master 합집합
  const masterRows = scanMaster();
  const mRows = new Map(masterRows.map(r => [r.path, r]));

  // 카테고리별 master 보유 여부 (orphan vs unmanaged 분류용)
  const masterCategories = new Set(masterRows.map(r => r.category));

  // 3) 합집합 path 순회
  const allPaths = new Set([...rRows.keys(), ...mRows.keys()]);
  const upd = db.prepare(`
    UPDATE asset_manifest SET
      master_sha = ?, master_version = ?, status = ?,
      pending_action = ?, pending_diff = ?, updated_at = datetime('now')
    WHERE path = ?
  `);
  const ins = db.prepare(`
    INSERT INTO asset_manifest (path, category, version, sha256, size, master_sha, master_version, status, pending_action, pending_diff, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(path) DO UPDATE SET
      master_sha = excluded.master_sha,
      master_version = excluded.master_version,
      status = excluded.status,
      pending_action = excluded.pending_action,
      pending_diff = excluded.pending_diff,
      updated_at = datetime('now')
  `);
  const audit = db.prepare(`
    INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
    VALUES (?, 'pull', ?, ?, ?, ?, ?, ?)
  `);

  const counts = { synced: 0, behind: 0, ahead: 0, new: 0, orphan: 0, pending_approval: 0, divergent: 0, unmanaged: 0 };
  const tx = db.transaction(() => {
    for (const p of allPaths) {
      const r = rRows.get(p);
      const m = mRows.get(p);
      const cat = (r || m).category;
      const cls = classifyDiff(r, m, masterCategories.has(cat));
      const meta = JSON.stringify({
        bump: cls.bump,
        auto_eligible: cls.auto_eligible,
        reason: cls.reason,
        master_sources: m ? m.sources : null,
        master_conflict: m ? m.conflict : false
      });

      if (r && !m) {
        // orphan — 디스크엔 있지만 master 에 없음
        upd.run(null, null, cls.status, cls.action === 'approve' ? 'delete' : null, meta, p);
      } else if (!r && m) {
        // new — master 에만 있음. asset_manifest 행이 없을 수 있으니 INSERT
        ins.run(p, m.category, null, '', m.size, m.sha256, m.version, cls.status, 'add', meta);
      } else {
        // 양쪽 다 있음 — runtime 행이 보장됨 (S1 rebuildManifest 가 selo 적재했을 것)
        // 만약 없다면(누락 케이스) ins 가 채움
        const exists = db.prepare('SELECT 1 FROM asset_manifest WHERE path = ?').get(p);
        if (!exists) {
          ins.run(p, r.category, r.version, r.sha256, r.size, m.sha256, m.version, cls.status,
            cls.auto_eligible ? 'promote' : (cls.action === 'approve' ? 'promote_major' : null), meta);
        } else {
          upd.run(m.sha256, m.version, cls.status,
            cls.auto_eligible ? 'promote' : (cls.action === 'approve' ? 'promote_major' : null),
            meta, p);
        }
      }

      audit.run(actor, p,
        r ? r.sha256 : null,
        m ? m.sha256 : null,
        r ? r.version : null,
        m ? m.version : null,
        meta);

      if (counts[cls.status] !== undefined) counts[cls.status]++;
    }
  });
  tx();

  return {
    runtime: runtimeRows.length,
    master: masterRows.length,
    total: allPaths.size,
    counts
  };
}

// 단일 자산을 MASTER → RUNTIME 으로 복사 (atomic write).
//   - row.path 의 카테고리 dir 아래 동일 상대경로로 기록
//   - master 복수 패키지 중 첫 번째 source 우선
function applySync({ db, path: assetPath, actor }) {
  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
  if (!row) throw new Error(`unknown asset: ${assetPath}`);

  // master 측 본문을 다시 읽음 (안정성)
  const masterEntry = scanMaster().find(m => m.path === assetPath);
  if (!masterEntry) throw new Error(`master 에 없음 — orphan 은 별도 액션`);
  if (masterEntry.sha256 !== row.master_sha) {
    // sync 도중 master 가 또 바뀐 경우
    throw new Error(`master sha 불일치 — pull 후 재시도 필요`);
  }

  // 첫 source 패키지의 실제 파일 경로 찾기
  const cat = row.category;
  const firstPkg = masterEntry.sources[0];
  const masterDir = masterCategoryDir(firstPkg, cat);
  if (!masterDir) throw new Error(`MASTER 비교 대상 아님: ${cat}`);
  const subPath = assetPath.startsWith(cat + '/') ? assetPath.slice(cat.length + 1)
                : (cat === 'rules' && assetPath.startsWith('rules/') ? assetPath.slice('rules/'.length) : null);
  if (!subPath || subPath.includes('..')) throw new Error(`unsafe path`);
  const masterFile = path.join(masterDir, subPath);
  const buf = fs.readFileSync(masterFile);

  // RUNTIME 대상 경로
  let targetFile;
  if (cat === 'claude-md') targetFile = path.join(RUNTIME_ROOT, 'CLAUDE.md');
  else if (cat === 'rules') targetFile = path.join(CATEGORIES.rules.dir, subPath);
  else targetFile = path.join(CATEGORIES[cat].dir, subPath);

  // 변경 직전 본문 → 스냅샷 (rollback 대비)
  let snapshotSaved = false;
  if (fs.existsSync(targetFile)) {
    saveSnapshot(fs.readFileSync(targetFile));
    snapshotSaved = true;
  }

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  // atomic write: tmp → rename
  const tmp = targetFile + '.sync-tmp';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, targetFile);

  // manifest 갱신
  const newSha = sha256(buf);
  db.prepare(`
    UPDATE asset_manifest SET
      sha256 = ?, version = ?, size = ?, status = 'synced',
      pending_action = NULL, pending_diff = NULL,
      updated_at = datetime('now')
    WHERE path = ?
  `).run(newSha, masterEntry.version, buf.length, assetPath);

  db.prepare(`
    INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
    VALUES (?, 'sync', ?, ?, ?, ?, ?, ?)
  `).run(actor, assetPath, row.sha256, newSha, row.version, masterEntry.version,
    JSON.stringify({ master_sources: masterEntry.sources, size: buf.length, snapshot_saved: snapshotSaved }));

  return { path: assetPath, before_sha: row.sha256, after_sha: newSha, version: masterEntry.version };
}

// orphan 승인: RUNTIME 디스크에서 파일 삭제 + manifest row 제거
function applyOrphanDelete({ db, path: assetPath, actor }) {
  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
  if (!row) throw new Error(`unknown asset: ${assetPath}`);
  if (row.status !== 'orphan') throw new Error(`status != orphan (${row.status})`);

  let targetFile;
  const cat = row.category;
  if (cat === 'claude-md') targetFile = path.join(RUNTIME_ROOT, 'CLAUDE.md');
  else if (cat === 'rules') {
    const sub = assetPath.replace(/^rules\//, '');
    targetFile = path.join(CATEGORIES.rules.dir, sub);
  } else {
    const sub = assetPath.slice(cat.length + 1);
    targetFile = path.join(CATEGORIES[cat].dir, sub);
  }
  let snapshotSaved = false;
  if (fs.existsSync(targetFile)) {
    saveSnapshot(fs.readFileSync(targetFile));
    snapshotSaved = true;
    fs.unlinkSync(targetFile);
  }
  db.prepare('DELETE FROM asset_manifest WHERE path = ?').run(assetPath);
  db.prepare(`
    INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
    VALUES (?, 'sync', ?, ?, NULL, ?, NULL, ?)
  `).run(actor, assetPath, row.sha256, row.version,
    JSON.stringify({ kind: 'orphan_delete', snapshot_saved: snapshotSaved }));
  return { path: assetPath, deleted: true };
}

// MASTER 본문 + RUNTIME 본문 동시 반환 (diff viewer 용)
function readBothSides({ db, path: assetPath }) {
  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
  const cat = row ? row.category : null;
  let runtimeText = null, masterText = null, masterSourcePkg = null;

  // runtime
  if (row && cat) {
    let f;
    if (cat === 'claude-md') f = path.join(RUNTIME_ROOT, 'CLAUDE.md');
    else if (cat === 'rules') f = path.join(CATEGORIES.rules.dir, assetPath.slice('rules/'.length));
    else f = path.join(CATEGORIES[cat].dir, assetPath.slice(cat.length + 1));
    if (fs.existsSync(f)) runtimeText = fs.readFileSync(f, 'utf8');
  }

  // master (첫 source)
  const m = scanMaster().find(x => x.path === assetPath);
  if (m) {
    masterSourcePkg = m.sources[0];
    const md = masterCategoryDir(masterSourcePkg, m.category);
    let sub;
    if (m.category === 'rules') sub = assetPath.slice('rules/'.length);
    else if (m.category === 'claude-md') sub = 'CLAUDE.md';
    else sub = assetPath.slice(m.category.length + 1);
    if (md) {
      const f = path.join(md, sub);
      if (fs.existsSync(f)) masterText = fs.readFileSync(f, 'utf8');
    }
  }
  return { runtimeText, masterText, masterSourcePkg, masterAvailable: !!m };
}

// ============================================================
// Snapshot (rollback 지원)
//   디스크 변경 직전 본문을 SHA 기반 dedup 으로 보관.
//   경로: data/asset-snapshots/{sha[0..1]}/{sha}
//   - 동일 SHA 는 한 번만 저장 (rollback target 후보가 되는 모든 시점의 before_sha 본문이 영구 유지)
// ============================================================
function snapshotPath(sha) {
  return path.join(SNAPSHOT_ROOT, sha.slice(0, 2), sha);
}
function saveSnapshot(buf) {
  const sha = sha256(buf);
  const f = snapshotPath(sha);
  if (fs.existsSync(f)) return sha;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buf);
  return sha;
}
function readSnapshot(sha) {
  const f = snapshotPath(sha);
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f);
}
function hasSnapshot(sha) {
  return !!sha && fs.existsSync(snapshotPath(sha));
}

// rollback: audit 의 before_sha 본문을 디스크에 다시 씀.
//   - target_sha 본문이 스냅샷에 있어야 함 (없으면 실패)
//   - 현재 디스크 본문도 스냅샷으로 보관 (rollback 자체도 되돌릴 수 있게)
//   - manifest 갱신 + audit 'rollback' 기록
function rollback({ db, path: assetPath, target_sha, actor }) {
  if (!target_sha) throw new Error('target_sha 필수');
  const row = db.prepare('SELECT * FROM asset_manifest WHERE path = ?').get(assetPath);
  if (!row) throw new Error(`unknown asset: ${assetPath}`);

  const targetBuf = readSnapshot(target_sha);
  if (!targetBuf) throw new Error(`스냅샷 없음 — ${target_sha.slice(0, 12)} (이 시점 이전 자산은 rollback 불가)`);

  // 디스크 경로
  const cat = row.category;
  let targetFile;
  if (cat === 'claude-md') targetFile = path.join(RUNTIME_ROOT, 'CLAUDE.md');
  else if (cat === 'rules') targetFile = path.join(CATEGORIES.rules.dir, assetPath.slice('rules/'.length));
  else targetFile = path.join(CATEGORIES[cat].dir, assetPath.slice(cat.length + 1));

  // 현재 디스크 본문 → 스냅샷 보관 (rollback 의 rollback 가능)
  let currentSha = null;
  if (fs.existsSync(targetFile)) {
    currentSha = saveSnapshot(fs.readFileSync(targetFile));
  }

  // atomic write
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const tmp = targetFile + '.rb-tmp';
  fs.writeFileSync(tmp, targetBuf);
  fs.renameSync(tmp, targetFile);

  // version 추출 (없으면 row.version 유지)
  const verInfo = parseVersion(targetBuf.toString('utf8'));

  // master_sha 와 일치하면 status=synced, 아니면 divergent
  const newStatus = (row.master_sha && target_sha === row.master_sha) ? 'synced' : 'divergent';
  const newAction = newStatus === 'divergent' ? 'promote_major' : null;

  db.prepare(`
    UPDATE asset_manifest SET
      sha256 = ?, version = ?, size = ?, status = ?,
      pending_action = ?, pending_diff = NULL,
      updated_at = datetime('now')
    WHERE path = ?
  `).run(target_sha, verInfo.version, targetBuf.length, newStatus, newAction, assetPath);

  db.prepare(`
    INSERT INTO asset_audit_log (actor, action, path, before_sha, after_sha, before_ver, after_ver, meta)
    VALUES (?, 'rollback', ?, ?, ?, ?, ?, ?)
  `).run(actor, assetPath, currentSha, target_sha, row.version, verInfo.version,
    JSON.stringify({ size: targetBuf.length, restored_to_status: newStatus }));

  return {
    path: assetPath,
    before_sha: currentSha,
    after_sha: target_sha,
    version: verInfo.version,
    status: newStatus
  };
}

// ============================================================
// Lock (5분 TTL)
// ============================================================
function acquireLock({ db, scope = 'global', holder, ttlMs = 5 * 60 * 1000 }) {
  const now = Date.now();
  const expires = new Date(now + ttlMs).toISOString().replace('T', ' ').slice(0, 19);
  // 기존 lock 만료면 자동 해제
  const cur = db.prepare('SELECT * FROM asset_lock WHERE scope = ?').get(scope);
  if (cur && new Date(cur.expires_at).getTime() > now) {
    return { ok: false, error: 'locked', held_by: cur.holder, expires_at: cur.expires_at };
  }
  if (cur) db.prepare('DELETE FROM asset_lock WHERE scope = ?').run(scope);
  db.prepare(`INSERT INTO asset_lock (scope, holder, expires_at) VALUES (?, ?, ?)`).run(scope, holder, expires);
  db.prepare(`INSERT INTO asset_audit_log (actor, action, meta) VALUES (?, 'lock_acquire', ?)`)
    .run(holder, JSON.stringify({ scope, expires_at: expires }));
  return { ok: true, scope, holder, expires_at: expires };
}

function releaseLock({ db, scope = 'global', holder, force = false }) {
  const cur = db.prepare('SELECT * FROM asset_lock WHERE scope = ?').get(scope);
  if (!cur) return { ok: true, message: 'no lock' };
  if (!force && cur.holder !== holder) return { ok: false, error: 'not owner', held_by: cur.holder };
  db.prepare('DELETE FROM asset_lock WHERE scope = ?').run(scope);
  db.prepare(`INSERT INTO asset_audit_log (actor, action, meta) VALUES (?, ?, ?)`)
    .run(holder, force ? 'lock_force_release' : 'lock_release', JSON.stringify({ scope, was_held_by: cur.holder }));
  return { ok: true };
}

// ============================================================
// Auto-pull scheduler
//   - 환경변수 ASSET_SYNC_AUTO_PULL=false 면 비활성
//   - 환경변수 ASSET_SYNC_INTERVAL_MIN (default 30) — 분 단위
//   - 부팅 후 90초 뒤 첫 실행 (다른 백필 잡 충돌 회피)
//   - divergent/new/orphan 카운트 변동 시 console + audit 'auto_pull_alert' 기록
// ============================================================
let _schedulerInterval = null;
let _lastSnapshot = null;
let _schedulerState = {
  enabled: false,
  interval_min: null,
  started_at: null,
  last_tick_at: null,
  last_tick_skipped_reason: null,
  last_alert_at: null,
  last_alert_changed: null,
  ticks: 0,
  alerts: 0
};

function getSchedulerStatus() {
  return { ..._schedulerState };
}

function startScheduler({ db } = {}) {
  if (_schedulerInterval) return;
  if (process.env.ASSET_SYNC_AUTO_PULL === 'false') {
    console.log('[ASSET-SYNC] auto-pull disabled (ASSET_SYNC_AUTO_PULL=false)');
    _schedulerState.enabled = false;
    return;
  }
  const intervalMin = Math.max(1, parseInt(process.env.ASSET_SYNC_INTERVAL_MIN, 10) || 30);
  const dbRef = db || require('../db').db;

  const tick = () => {
    const tickAt = new Date().toISOString();
    _schedulerState.ticks++;
    try {
      const cur = getLock({ db: dbRef, scope: 'global' });
      if (cur) {
        _schedulerState.last_tick_at = tickAt;
        _schedulerState.last_tick_skipped_reason = `lock held by ${cur.holder}`;
        return;
      }
      const r = diffWithMaster({ db: dbRef, actor: 'auto_pull' });
      const interesting = ['divergent', 'new', 'orphan', 'pending_approval', 'behind'];
      const changed = [];
      if (_lastSnapshot) {
        for (const k of interesting) {
          if ((r.counts[k] || 0) !== (_lastSnapshot[k] || 0)) {
            changed.push(`${k}: ${_lastSnapshot[k] || 0}→${r.counts[k] || 0}`);
          }
        }
      }
      if (changed.length) {
        console.log(`[ASSET-SYNC] auto-pull alert — ${changed.join(', ')}`);
        try {
          dbRef.prepare(`INSERT INTO asset_audit_log (actor, action, meta) VALUES ('auto_pull', 'auto_pull_alert', ?)`)
            .run(JSON.stringify({ counts: r.counts, changed }));
        } catch (e) { /* swallow */ }
        _schedulerState.last_alert_at = tickAt;
        _schedulerState.last_alert_changed = changed;
        _schedulerState.alerts++;
      }
      _lastSnapshot = r.counts;
      _schedulerState.last_tick_at = tickAt;
      _schedulerState.last_tick_skipped_reason = null;
    } catch (e) {
      console.warn('[ASSET-SYNC] auto-pull error:', e.message);
      _schedulerState.last_tick_at = tickAt;
      _schedulerState.last_tick_skipped_reason = `error: ${e.message}`;
    }
  };

  setTimeout(tick, 90_000);
  _schedulerInterval = setInterval(tick, intervalMin * 60_000);
  _schedulerState.enabled = true;
  _schedulerState.interval_min = intervalMin;
  _schedulerState.started_at = new Date().toISOString();
  console.log(`[ASSET-SYNC] auto-pull scheduler started — every ${intervalMin}min`);
}

function stopScheduler() {
  if (_schedulerInterval) clearInterval(_schedulerInterval);
  _schedulerInterval = null;
  _lastSnapshot = null;
  _schedulerState.enabled = false;
}

function getLock({ db, scope = 'global' }) {
  const cur = db.prepare('SELECT * FROM asset_lock WHERE scope = ?').get(scope);
  if (!cur) return null;
  if (new Date(cur.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM asset_lock WHERE scope = ?').run(scope);
    return null;
  }
  return cur;
}

module.exports = {
  RUNTIME_ROOT,
  MASTER_ROOT,
  SNAPSHOT_ROOT,
  CATEGORIES,
  CATEGORY_POLICY,
  scanRuntime,
  scanMaster,
  listMasterPackages,
  rebuildManifest,
  diffWithMaster,
  classifyDiff,
  applySync,
  applyOrphanDelete,
  readBothSides,
  listManifest,
  summary,
  getCategoryHealth,
  parseVersion,
  parseSemver,
  sha256,
  saveSnapshot,
  readSnapshot,
  hasSnapshot,
  rollback,
  acquireLock,
  releaseLock,
  getLock,
  startScheduler,
  stopScheduler,
  getSchedulerStatus
};
