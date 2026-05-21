const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'eluo.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema initialization
db.exec(`
  -- IA-D001: users
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
    created_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  -- IA-D002: invitations
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member')),
    token TEXT NOT NULL UNIQUE,
    invited_by INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired')),
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

  -- IA-D003: projects (v4.0: completion_level 1~6, dev 필드 + reference_url + optional_skills 추가)
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'web',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
    prompt TEXT,
    completion_level INTEGER NOT NULL DEFAULT 1 CHECK(completion_level BETWEEN 1 AND 6),
    tech_stack TEXT,
    framework TEXT,
    reference_url TEXT,
    optional_skills TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

  -- IA-D004: pipelines
  CREATE TABLE IF NOT EXISTS pipelines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','paused','cancelled','completed','failed')),
    current_phase TEXT,
    current_step TEXT,
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_pipelines_project ON pipelines(project_id);

  -- IA-D005: pipeline_steps (v3.0: approval_status, retry_count 추가)
  CREATE TABLE IF NOT EXISTS pipeline_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id INTEGER NOT NULL REFERENCES pipelines(id),
    phase TEXT NOT NULL,
    step TEXT NOT NULL,
    step_order INTEGER NOT NULL DEFAULT 0,
    skill_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','awaiting_approval','approved','rejected','failed','skipped')),
    self_check_result TEXT,
    output_file TEXT,
    output_content TEXT,
    meta_json TEXT,
    retry_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_steps_pipeline ON pipeline_steps(pipeline_id);
  CREATE INDEX IF NOT EXISTS idx_steps_status ON pipeline_steps(status);

  -- IA-D006: artifacts
  CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    type TEXT NOT NULL,
    version TEXT DEFAULT 'v1.0',
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    meta_json TEXT,
    pipeline_step_id INTEGER REFERENCES pipeline_steps(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id);

  -- IA-D007: tickets
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    ticket_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('TXT','STR','FNC','IMG','BUG')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

  -- IA-D008: ticket_history
  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    actor_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- IA-D009: activity_log
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT,
    actor_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

  -- IA-D010: skills (엔진 내부, 웹 UI 미노출)
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    version TEXT DEFAULT '1.0.0',
    type TEXT,
    description TEXT,
    path TEXT,
    installed_at TEXT DEFAULT (datetime('now'))
  );

  -- IA-D011: skill_history
  CREATE TABLE IF NOT EXISTS skill_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id INTEGER NOT NULL REFERENCES skills(id),
    version TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- IA-D012: settings (v3.0 신규 — AI Provider 설정)
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- IA-D013: notifications (v3.0 신규 — 승인 대기/실패 알림)
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    message TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

  -- IA-D014: messages (v3.1 신규 — 프로젝트별 대화 스레드)
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','artifact','status','approval_request','approval_response','error')),
    content TEXT,
    artifact_id INTEGER REFERENCES artifacts(id),
    step_id INTEGER REFERENCES pipeline_steps(id),
    user_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, id);

  -- IA-D015: skill_lessons (P2-2 — Reflexion lessons-learned)
  -- 스킬별 실패 패턴을 누적하여 다음 실행 시 systemPrompt에 주입.
  -- pattern은 deriveImprovements와 같은 패턴 키 (예: '응답_길이_부족', '메타_응답_패턴', 'reviewer_저점' 등)
  CREATE TABLE IF NOT EXISTS skill_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    lesson TEXT NOT NULL,
    occurrences INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(skill_name, pattern)
  );
  CREATE INDEX IF NOT EXISTS idx_lessons_skill ON skill_lessons(skill_name, occurrences DESC);

  -- IA-D016: token_usage (P3-1 — 토큰/비용 모니터링)
  -- AI Provider 호출 1건당 사용량/예상 비용을 적재. step_id는 NULL 가능 (analyze-prompt 등).
  CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    pipeline_id INTEGER REFERENCES pipelines(id),
    step_id INTEGER REFERENCES pipeline_steps(id),
    skill_name TEXT,
    task TEXT,
    model TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_token_usage_project ON token_usage(project_id);
  CREATE INDEX IF NOT EXISTS idx_token_usage_skill ON token_usage(skill_name);

  -- IA-D017: error_log (A10 — 운영 에러 영속화)
  -- pipeline-worker / route 핸들러의 실패를 DB에 기록. 디버깅·통계용.
  CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    code TEXT,
    message TEXT NOT NULL,
    stack TEXT,
    context_json TEXT,
    project_id INTEGER REFERENCES projects(id),
    pipeline_id INTEGER REFERENCES pipelines(id),
    step_id INTEGER REFERENCES pipeline_steps(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_error_log_source ON error_log(source);
`);

// v4.0 마이그레이션 — 기존 projects 테이블에 신규 컬럼 추가 + CHECK 제약 확장
function migrateV4() {
  const cols0 = db.pragma('table_info(projects)');
  const has0 = (name) => cols0.some(c => c.name === name);
  // v4.1 — reference_content 컬럼 (페이지 DOM 스냅샷/기존 소스 붙여넣기)
  if (!has0('reference_content')) db.exec('ALTER TABLE projects ADD COLUMN reference_content TEXT');

  // v4.2 — pipelines.prompt (실행별 prompt override)
  const pipeCols = db.pragma('table_info(pipelines)');
  if (pipeCols.length > 0 && !pipeCols.some(c => c.name === 'prompt')) {
    db.exec('ALTER TABLE pipelines ADD COLUMN prompt TEXT');
  }

  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 2) return;

  const cols = db.pragma('table_info(projects)');
  const has = (name) => cols.some(c => c.name === name);

  // 누락된 컬럼 추가 (ALTER TABLE ADD COLUMN)
  if (!has('tech_stack')) db.exec('ALTER TABLE projects ADD COLUMN tech_stack TEXT');
  if (!has('framework')) db.exec('ALTER TABLE projects ADD COLUMN framework TEXT');
  if (!has('reference_url')) db.exec('ALTER TABLE projects ADD COLUMN reference_url TEXT');
  if (!has('optional_skills')) db.exec('ALTER TABLE projects ADD COLUMN optional_skills TEXT');

  // CHECK 제약 확장 (1~4 → 1~6). SQLite는 CHECK 변경 불가 → 테이블 재생성 필요.
  // 기존 CHECK가 1~4인 경우에만 재생성.
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects'").get();
  if (sql && /completion_level\s+INTEGER\s+NOT NULL\s+DEFAULT\s+1\s+CHECK\s*\(completion_level\s+BETWEEN\s+1\s+AND\s+4\)/i.test(sql.sql)) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      BEGIN;
      CREATE TABLE projects_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        type TEXT DEFAULT 'web',
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
        prompt TEXT,
        completion_level INTEGER NOT NULL DEFAULT 1 CHECK(completion_level BETWEEN 1 AND 6),
        tech_stack TEXT,
        framework TEXT,
        reference_url TEXT,
        optional_skills TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT
      );
      INSERT INTO projects_new (id, name, code, type, description, status, prompt, completion_level, tech_stack, framework, reference_url, optional_skills, created_by, created_at, updated_at, deleted_at)
        SELECT id, name, code, type, description, status, prompt, completion_level, tech_stack, framework, reference_url, optional_skills, created_by, created_at, updated_at, deleted_at FROM projects;
      DROP TABLE projects;
      ALTER TABLE projects_new RENAME TO projects;
      CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      COMMIT;
    `);
    db.pragma('foreign_keys = ON');
  }

  db.pragma('user_version = 2');
  console.log('[DB] v4 migration applied (projects: +4 columns, completion_level 1~6)');
}
migrateV4();

// v3 migration: pipelines.status CHECK 확장 — 'cancelled' 추가
function migrateV5_pipelinesStatus() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 3) return;

  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pipelines'").get();
  // 기존 CHECK가 'cancelled' 미포함인 경우에만 재생성
  if (sql && !/'cancelled'/i.test(sql.sql)) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      BEGIN;
      CREATE TABLE pipelines_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','paused','cancelled','completed','failed')),
        current_phase TEXT,
        current_step TEXT,
        progress INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        prompt TEXT
      );
      INSERT INTO pipelines_new (id, project_id, status, current_phase, current_step, progress, error_message, started_at, completed_at, created_at, prompt)
        SELECT id, project_id, status, current_phase, current_step, progress, error_message, started_at, completed_at, created_at, prompt FROM pipelines;
      DROP TABLE pipelines;
      ALTER TABLE pipelines_new RENAME TO pipelines;
      CREATE INDEX IF NOT EXISTS idx_pipelines_project ON pipelines(project_id);
      COMMIT;
    `);
    db.pragma('foreign_keys = ON');
  }

  db.pragma('user_version = 3');
  console.log('[DB] v5 migration applied (pipelines.status: +cancelled)');
}
migrateV5_pipelinesStatus();

// v6 migration: artifacts FTS5 가상 테이블 — 본문 검색 가속 (F2)
//
// 기존: search.js가 매 요청마다 fs.readFileSync 200건 → I/O 병목
// 신규: artifacts_fts (FTS5) — file_name + body + type 색인.
//   - SQL MATCH + bm25() 점수로 정렬·스니펫 한 번에 처리
//   - 한글 호환: tokenize='unicode61 remove_diacritics 2'
//   - 본문은 5MB 미만만 색인 (대형 바이너리·번들 제외)
//   - 색인 실패는 무시 (검색은 LIKE 폴백 가능 — search.js에서 처리)
function migrateV6_artifactsFts() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 4) return;

  // FTS5 가용성 체크
  let fts5Available = false;
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_probe USING fts5(x, tokenize='unicode61')`);
    db.exec(`DROP TABLE IF EXISTS _fts5_probe`);
    fts5Available = true;
  } catch (e) {
    console.warn('[DB] FTS5 미지원 — F2 색인 건너뜀, search.js LIKE 폴백 사용');
  }

  if (fts5Available) {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
        file_name,
        body,
        type UNINDEXED,
        artifact_id UNINDEXED,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);
  }

  db.pragma('user_version = 4');
  console.log(`[DB] v6 migration applied (artifacts_fts ${fts5Available ? 'created' : 'unavailable'})`);
}
migrateV6_artifactsFts();

// v7 migration: artifacts.content_sha256 — G6 dedupe 키 (같은 project+type 내 중복 콘텐츠 재사용)
function migrateV7_artifactDedupe() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 5) return;
  const cols = db.pragma('table_info(artifacts)');
  const has = (n) => cols.some(c => c.name === n);
  if (!has('content_sha256')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN content_sha256 TEXT`);
  }
  // dedupe 빠른 조회 — (project_id, type, content_sha256) 복합 인덱스
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artifacts_sha ON artifacts(project_id, type, content_sha256)`);
  db.pragma('user_version = 5');
  console.log(`[DB] v7 migration applied (artifacts.content_sha256 + dedupe index)`);
}
migrateV7_artifactDedupe();

// FTS5 헬퍼 — artifact 본문 색인 갱신
//   indexArtifact: 단일 artifact 색인 (등록·갱신 시점)
//   reindexAllArtifacts: 부팅 시 미색인분 백필 (1회성)
//   isFts5Ready: 검색 라우트가 FTS 사용 가능 여부 판단
function isFts5Ready() {
  try {
    const row = db.prepare(
      "SELECT 1 as v FROM sqlite_master WHERE type='table' AND name='artifacts_fts'"
    ).get();
    return !!row;
  } catch { return false; }
}

function _readArtifactBody(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 5_000_000) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return null; }
}

function indexArtifact(artifactId) {
  if (!isFts5Ready()) return false;
  try {
    const a = db.prepare(`
      SELECT id, type, file_name, file_path FROM artifacts WHERE id = ?
    `).get(artifactId);
    if (!a) return false;
    const body = _readArtifactBody(a.file_path) || '';
    db.prepare(`DELETE FROM artifacts_fts WHERE artifact_id = ?`).run(a.id);
    db.prepare(`
      INSERT INTO artifacts_fts (file_name, body, type, artifact_id)
      VALUES (?, ?, ?, ?)
    `).run(a.file_name || '', body, a.type || '', a.id);
    return true;
  } catch (e) {
    return false;
  }
}

function reindexAllArtifacts() {
  if (!isFts5Ready()) return { indexed: 0, skipped: 0, ready: false };
  const indexed_ids = new Set(
    db.prepare(`SELECT artifact_id FROM artifacts_fts`).all().map(r => r.artifact_id)
  );
  const all = db.prepare(`SELECT id FROM artifacts`).all();
  let indexed = 0, skipped = 0;
  for (const r of all) {
    if (indexed_ids.has(r.id)) { skipped++; continue; }
    if (indexArtifact(r.id)) indexed++;
  }
  return { indexed, skipped, ready: true, total: all.length };
}

// v8 migration: rag_corpus FTS5 — ~/.claude 자산 (skills/rules/ref/agents) 검색 (U-G22)
//   memory: project_rag_direction.md — 별도 KB 구축 X, 기존 자산 corpus 재사용
//   source ∈ {skill, rule, ref, agent, catalog}
//   본문은 첫 8KB만 색인 (대용량 SKILL.md 일부 → 핵심 헤더 위주)
// v9 migration: 통합 채팅 UX (U-G23) — intake 세션 + 메시지 확장
//   intake_sessions(id, user_id, slots_json, status, created_at, committed_project_id) — 프로젝트 생성 전 대화
//   messages.intake_session_id (TEXT) — project_id NULL인 메시지 식별
//   messages.kind에 'user_feedback' 추가 (다음 step에 컨텍스트 주입)
//   messages.consumed_at (TEXT) — pipeline-worker가 피드백 소비한 시각
function migrateV9_chatIntake() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 7) return;

  // 1. intake_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS intake_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      slots_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','committed','abandoned')),
      committed_project_id INTEGER REFERENCES projects(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_intake_user ON intake_sessions(user_id, status);
  `);

  // 2. messages 테이블 확장 — intake_session_id, consumed_at + kind에 user_feedback 추가
  //    SQLite ALTER TABLE은 CHECK 변경이 안 되므로 새 테이블 → 복사 → 교체
  const cols = db.pragma('table_info(messages)');
  const has = (n) => cols.some(c => c.name === n);

  // 두 컬럼이 모두 있어야만 스킵 — 부분 적용된 상태에서도 마저 마이그레이션
  if (!(has('intake_session_id') && has('consumed_at'))) {
    // 신규 CHECK 제약 (project_id IS NOT NULL OR intake_session_id IS NOT NULL) 위반 행 사전 차단
    const orphan = db.prepare(
      "SELECT COUNT(*) AS c FROM messages WHERE project_id IS NULL"
    ).get().c;
    if (orphan > 0) {
      throw new Error(
        `[DB v9] 마이그레이션 중단: project_id가 NULL인 messages 행 ${orphan}건 존재. 정리 후 재시도 필요.`
      );
    }

    // foreign_keys OFF/ON을 try/finally로 보장 — 예외 발생해도 ON 복구
    db.pragma('foreign_keys = OFF');
    try {
      db.exec(`
        BEGIN;
        CREATE TABLE messages_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER REFERENCES projects(id),
          intake_session_id TEXT REFERENCES intake_sessions(id),
          role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
          kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','artifact','status','approval_request','approval_response','user_feedback','error')),
          content TEXT,
          artifact_id INTEGER REFERENCES artifacts(id),
          step_id INTEGER REFERENCES pipeline_steps(id),
          user_id INTEGER REFERENCES users(id),
          consumed_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          CHECK (project_id IS NOT NULL OR intake_session_id IS NOT NULL)
        );
        INSERT INTO messages_new (id, project_id, role, kind, content, artifact_id, step_id, user_id, created_at)
          SELECT id, project_id, role, kind, content, artifact_id, step_id, user_id, created_at FROM messages;
        DROP TABLE messages;
        ALTER TABLE messages_new RENAME TO messages;
        CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, id);
        CREATE INDEX IF NOT EXISTS idx_messages_intake ON messages(intake_session_id, id);
        CREATE INDEX IF NOT EXISTS idx_messages_feedback ON messages(project_id, kind, consumed_at);
        COMMIT;
      `);
    } catch (e) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw e;
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }

  db.pragma('user_version = 7');
  console.log('[DB] v9 migration applied (intake_sessions + messages.intake_session_id/consumed_at + user_feedback kind)');
}
// (v9는 v8 뒤에서 호출됨 — 아래 migrateV8 invoke 직후)

function migrateV8_ragCorpus() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 6) return;

  let fts5Available = false;
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_probe USING fts5(x, tokenize='unicode61')`);
    db.exec(`DROP TABLE IF EXISTS _fts5_probe`);
    fts5Available = true;
  } catch {
    console.warn('[DB] FTS5 미지원 — RAG 색인 건너뜀');
  }

  if (fts5Available) {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS rag_corpus USING fts5(
        source UNINDEXED,
        name,
        path UNINDEXED,
        body,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);
  }

  db.pragma('user_version = 6');
  console.log(`[DB] v8 migration applied (rag_corpus ${fts5Available ? 'created' : 'unavailable'})`);
}
migrateV8_ragCorpus();
migrateV9_chatIntake();

// v10 migration: U-G24 Agentic Project Discovery — 회사 정체성 + 프로젝트 인덱스 + 자산 인덱스
//   company_profile  : 회사 1행 (정체성·강점·톤·브랜드 토큰 + 임베딩)
//   project_index    : 과거 프로젝트 시그니처 (4축: purpose/features/shape/keyword) + 임베딩
//   artifact_index   : 자산 단위 (hero/feature/footer 등) digest + 임베딩
//   artifact_corpus  : FTS5 BM25 검색 (artifact_index와 1:1 대응)
//
// 임베딩은 BLOB(Float32Array). 차원/모델명은 별도 컬럼에 저장 → 모델 변경 감지·재계산 가능.
// 100~1000건 규모에서는 BLOB + 자체 cosine 충분 (sqlite-vss 도입은 1만건+ 시점에).
function migrateV10_discoveryIndex() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 8) return;

  // FTS5 가용성 (artifact_corpus 생성 가드)
  let fts5Available = false;
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_probe USING fts5(x, tokenize='unicode61')`);
    db.exec(`DROP TABLE IF EXISTS _fts5_probe`);
    fts5Available = true;
  } catch {
    console.warn('[DB v10] FTS5 미지원 — artifact_corpus 건너뜀, BM25 검색 불가');
  }

  db.exec(`
    -- 회사 정체성 (1행, 향후 멀티 테넌트 대비 테이블화)
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website_url TEXT,
      identity_summary TEXT,
      core_competencies TEXT,           -- JSON array
      strength_domains TEXT,            -- JSON array of {domain, evidence, count?}
      signature_tone TEXT,              -- JSON {tone, voice, audience}
      brand_tokens TEXT,                -- JSON {primary_colors, fonts, imagery}
      awards TEXT,                      -- JSON array of {name, year, category?}
      client_logos TEXT,                -- JSON array of strings
      source_files TEXT,                -- JSON array of {source, url|path, digest, captured_at}
      identity_embedding BLOB,
      embedding_model TEXT,
      embedding_dim INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 프로젝트 4축 시그니처 + 임베딩
    -- project_id NULL 허용: 외부 프로젝트(검증/운영_v2 등 SYS_v4 외부 폴더)도 인덱스 가능
    CREATE TABLE IF NOT EXISTS project_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
      external_path TEXT UNIQUE,        -- SYS_v4 projects 외부 (D:/검증/visitgangnam 등)
      name TEXT NOT NULL,
      code TEXT,
      site_purpose TEXT,                -- 1~2문장 요약
      feature_signature TEXT,           -- JSON: top-N 기능 키워드
      auto_tags TEXT,                   -- JSON: 자유 태그 5~10
      audience TEXT,                    -- B2C/B2B/B2G/Internal
      scale TEXT,                       -- landing/multi-page/portal/app
      tone TEXT,                        -- corporate/playful/minimal/luxury
      tech_stack TEXT,                  -- JSON
      completion_level TEXT,            -- mvp/standard/premium
      artifact_counts TEXT,             -- JSON: {req,fn,ia,ui,html,...}
      embedding BLOB,
      embedding_model TEXT,
      embedding_dim INTEGER,
      digest TEXT,                      -- 시그니처 입력 sha256 → 변경 감지
      reused_count INTEGER NOT NULL DEFAULT 0,
      last_reused_at TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','template')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      CHECK (project_id IS NOT NULL OR external_path IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_project_index_status ON project_index(status);
    CREATE INDEX IF NOT EXISTS idx_project_index_audience ON project_index(audience, scale);

    -- 자산 단위 (섹션·컴포넌트 재사용)
    CREATE TABLE IF NOT EXISTS artifact_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_index_id INTEGER NOT NULL REFERENCES project_index(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,               -- req/fn/ia/wbs/sb/style/ui/html/css/js
      section TEXT,                     -- hero/feature/footer/cta/...
      path TEXT,                        -- output/design/ui/hero.html
      digest TEXT,                      -- sha256
      body_excerpt TEXT,                -- 첫 8KB
      embedding BLOB,                   -- 큰 섹션만 (>1KB)
      embedding_model TEXT,
      reused_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_artifact_index_project ON artifact_index(project_index_id);
    CREATE INDEX IF NOT EXISTS idx_artifact_index_kind ON artifact_index(kind, section);
    CREATE INDEX IF NOT EXISTS idx_artifact_index_digest ON artifact_index(digest);
  `);

  if (fts5Available) {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS artifact_corpus USING fts5(
        kind UNINDEXED,
        section UNINDEXED,
        path UNINDEXED,
        body,
        artifact_index_id UNINDEXED,
        project_index_id UNINDEXED,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);
  }

  db.pragma('user_version = 8');
  console.log(`[DB] v10 migration applied (company_profile + project_index + artifact_index${fts5Available ? ' + artifact_corpus' : ''})`);
}
migrateV10_discoveryIndex();

// v11 migration: asset-sync — claude-assets 동기화 (skills/agents/rules/commands/ref/CLAUDE.md)
//   asset_manifest: SERVER 측 단일 진실 (path, version, sha, status, pending_*)
//   asset_audit_log: 모든 동기/승인/롤백/클라이언트 행위
//   asset_lock: 동시 sync 방지 (5분 TTL)
//   v11.1 (user_version=10): status CHECK 에 'unmanaged' 추가
function migrateV11_assetSync() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 10) return;
  if (userVersion === 9) {
    // 11→11.1: status CHECK 확장 — 'unmanaged' 추가 (MASTER 추적 비대상)
    db.pragma('foreign_keys = OFF');
    db.exec(`
      BEGIN;
      CREATE TABLE asset_manifest_new (
        path TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK(category IN ('skills','agents','rules','commands','ref','claude-md')),
        version TEXT,
        sha256 TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        master_sha TEXT,
        master_version TEXT,
        status TEXT NOT NULL DEFAULT 'unmanaged' CHECK(status IN ('synced','behind','ahead','new','orphan','pending_approval','divergent','unmanaged')),
        pending_action TEXT,
        pending_diff TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        approved_by TEXT,
        approved_at TEXT
      );
      INSERT INTO asset_manifest_new SELECT * FROM asset_manifest;
      DROP TABLE asset_manifest;
      ALTER TABLE asset_manifest_new RENAME TO asset_manifest;
      CREATE INDEX IF NOT EXISTS idx_asset_manifest_status ON asset_manifest(status);
      CREATE INDEX IF NOT EXISTS idx_asset_manifest_category ON asset_manifest(category);
      COMMIT;
    `);
    db.pragma('foreign_keys = ON');
    db.pragma('user_version = 10');
    console.log('[DB] v11.1 migration applied (asset_manifest.status += unmanaged)');
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_manifest (
      path TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('skills','agents','rules','commands','ref','claude-md')),
      version TEXT,
      sha256 TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      master_sha TEXT,
      master_version TEXT,
      status TEXT NOT NULL DEFAULT 'unmanaged' CHECK(status IN ('synced','behind','ahead','new','orphan','pending_approval','divergent','unmanaged')),
      pending_action TEXT,
      pending_diff TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_by TEXT,
      approved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_asset_manifest_status ON asset_manifest(status);
    CREATE INDEX IF NOT EXISTS idx_asset_manifest_category ON asset_manifest(category);

    CREATE TABLE IF NOT EXISTS asset_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      actor TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('pull','sync','approve_major','reject','rollback','client_fetch','conflict','lock_acquire','lock_release','lock_force_release','manifest_rebuild')),
      path TEXT,
      before_sha TEXT,
      after_sha TEXT,
      before_ver TEXT,
      after_ver TEXT,
      meta TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_asset_audit_ts ON asset_audit_log(ts);
    CREATE INDEX IF NOT EXISTS idx_asset_audit_path ON asset_audit_log(path);
    CREATE INDEX IF NOT EXISTS idx_asset_audit_action ON asset_audit_log(action);

    CREATE TABLE IF NOT EXISTS asset_lock (
      scope TEXT PRIMARY KEY,
      holder TEXT NOT NULL,
      acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);

  // 신규 DB는 v11.1 status CHECK까지 포함된 스키마로 만들었으므로 user_version=10으로 마무리.
  // 기존 DB(user_version===9)는 위 분기에서 ALTER 후 user_version=10 처리.
  db.pragma('user_version = 10');
  console.log('[DB] v11 migration applied (asset_manifest + asset_audit_log + asset_lock, status=unmanaged ready)');
}
migrateV11_assetSync();

// v12 migration: asset_audit_log.action CHECK 확장 — 'auto_pull_alert' 추가 (S4 스케줄러 알림)
function migrateV12_assetAuditAutoPull() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 11) return;
  if (userVersion < 10) return;
  db.pragma('foreign_keys = OFF');
  db.exec(`
    BEGIN;
    CREATE TABLE asset_audit_log_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      actor TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('pull','sync','approve_major','reject','rollback','client_fetch','conflict','lock_acquire','lock_release','lock_force_release','manifest_rebuild','auto_pull_alert')),
      path TEXT,
      before_sha TEXT,
      after_sha TEXT,
      before_ver TEXT,
      after_ver TEXT,
      meta TEXT
    );
    INSERT INTO asset_audit_log_new SELECT * FROM asset_audit_log;
    DROP TABLE asset_audit_log;
    ALTER TABLE asset_audit_log_new RENAME TO asset_audit_log;
    CREATE INDEX IF NOT EXISTS idx_asset_audit_ts ON asset_audit_log(ts);
    CREATE INDEX IF NOT EXISTS idx_asset_audit_path ON asset_audit_log(path);
    CREATE INDEX IF NOT EXISTS idx_asset_audit_action ON asset_audit_log(action);
    COMMIT;
  `);
  db.pragma('foreign_keys = ON');
  db.pragma('user_version = 11');
  console.log('[DB] v12 migration applied (asset_audit_log.action += auto_pull_alert)');
}
migrateV12_assetAuditAutoPull();

// v13 migration: asset_client_keys — 클라이언트(외부 ~/.claude 머신) API 키
//   key_hash: sha256(plaintext) — 평문 저장 금지
//   admin 이 발급/폐기, 클라이언트는 X-API-Key 헤더로 인증
function migrateV13_assetClientKeys() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 12) return;
  if (userVersion < 11) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_client_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      last_used_ip TEXT,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_asset_client_keys_hash ON asset_client_keys(key_hash);
  `);
  db.pragma('user_version = 12');
  console.log('[DB] v13 migration applied (asset_client_keys)');
}
migrateV13_assetClientKeys();

// v14 migration: 프로젝트별 디자인 시스템 등록
//   projects.design_system_id (FK)  — 적용된 DS의 식별자 (NULL = 없음)
//   project_design_systems          — DS 베이스라인 저장 (KDS, Material3, custom 등)
//
//   DS 한 건 = baseline.json + tokens.css 묶음. SYS_v4 가 SoT.
//   프로젝트 input/design-system/ 폴더는 export/import 시점에만 사용
function migrateV14_projectDesignSystems() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 13) return;
  if (userVersion < 12) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS project_design_systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      version TEXT,
      source TEXT,
      baseline_json TEXT NOT NULL,
      tokens_css TEXT,
      stats TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pds_slug ON project_design_systems(slug);
  `);

  // projects 에 design_system_id 컬럼 추가 (NULL 허용)
  const cols = db.prepare(`PRAGMA table_info(projects)`).all();
  if (!cols.some(c => c.name === 'design_system_id')) {
    db.exec(`ALTER TABLE projects ADD COLUMN design_system_id INTEGER REFERENCES project_design_systems(id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_ds ON projects(design_system_id);`);
  }

  db.pragma('user_version = 13');
  console.log('[DB] v14 migration applied (project_design_systems + projects.design_system_id)');
}
migrateV14_projectDesignSystems();

// v15 migration: artifacts.thinking_text — Extended thinking 블록 영속화 (PR1-C2)
//   Claude API thinking blocks (budget 4K~32K) 의 reasoning 텍스트를 산출물 옆에 보관.
//   - claude-api: messages.create response 의 type='thinking' 블록을 join 한 결과
//   - claude-code: --effort 응답에 thinking 노출 안 됨 → NULL (CLI 한계)
//   - artifact-saver.js 에서 thinking 인자가 있으면 함께 INSERT
//   목적: 사용자가 "왜 이렇게 만들었는지" UI 에서 펼쳐 볼 수 있게 + 디버깅·회귀분석
function migrateV15_artifactsThinking() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 14) return;
  if (userVersion < 13) return;
  const cols = db.pragma('table_info(artifacts)');
  const has = (n) => cols.some(c => c.name === n);
  if (!has('thinking_text')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN thinking_text TEXT`);
  }
  if (!has('thinking_budget')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN thinking_budget INTEGER`);
  }
  db.pragma('user_version = 14');
  console.log('[DB] v15 migration applied (artifacts.thinking_text + thinking_budget)');
}
migrateV15_artifactsThinking();

// v16 migration: intake_sessions.intent_json — PR3 의도 분류 결과 보존
//   intent-classifier.classify(prompt) 결과({type, level, scope, confidence, reasoning, matched})를
//   세션에 함께 저장해 (1) UI에서 "왜 이 type/level이 자동 채워졌는지" 표시, (2) 회귀 분석.
function migrateV16_intakeIntent() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 15) return;
  if (userVersion < 14) return;
  const cols = db.pragma('table_info(intake_sessions)');
  const has = (n) => cols.some(c => c.name === n);
  if (!has('intent_json')) {
    db.exec(`ALTER TABLE intake_sessions ADD COLUMN intent_json TEXT`);
  }
  db.pragma('user_version = 15');
  console.log('[DB] v16 migration applied (intake_sessions.intent_json)');
}
migrateV16_intakeIntent();

// v17 migration: guest role 제거
//   users CHECK 제약을 ('admin','member')로 축소, DEFAULT를 'member'로 변경
//   invitations CHECK 제약을 ('member')로 축소
//   기존 guest 사용자는 member로 변환
//   SQLite는 CHECK 변경이 ALTER TABLE로 불가 — 테이블 재생성 필요
//   SQLite 공식 권장 패턴: PRAGMA foreign_keys=OFF → 트랜잭션 안에서 재생성 → 검증 → ON
function migrateV17_dropGuestRole() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 16) return;
  if (userVersion < 15) return;

  // FK는 트랜잭션 밖에서만 토글 가능 — users 재생성 중 다른 테이블의 FK 참조가 끊어지는 걸 허용
  db.pragma('foreign_keys = OFF');

  try {
    const tx = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_v17_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
          created_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT
        );
        INSERT INTO users_v17_new (id, email, name, password_hash, role, created_at, deleted_at)
        SELECT id, email, name, password_hash,
               CASE WHEN role = 'guest' THEN 'member' ELSE role END,
               created_at, deleted_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_v17_new RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE invitations_v17_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member')),
          token TEXT NOT NULL UNIQUE,
          invited_by INTEGER REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired')),
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
        INSERT INTO invitations_v17_new (id, email, role, token, invited_by, status, created_at, expires_at)
        SELECT id, email,
               CASE WHEN role = 'guest' THEN 'member' ELSE role END,
               token, invited_by, status, created_at, expires_at
        FROM invitations;
        DROP TABLE invitations;
        ALTER TABLE invitations_v17_new RENAME TO invitations;
        CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
      `);

      // FK 검증 — 위반 있으면 트랜잭션 롤백
      const violations = db.prepare('PRAGMA foreign_key_check').all();
      if (violations.length > 0) {
        throw new Error(`v17 migration FK violation: ${JSON.stringify(violations)}`);
      }
    });
    tx();
    db.pragma('user_version = 16');
    console.log('[DB] v17 migration applied (guest role removed)');
  } finally {
    db.pragma('foreign_keys = ON');
  }
}
migrateV17_dropGuestRole();

// v18 migration: 티켓 Asana baseline — 필드 8개 + comments 테이블
//   tickets: assignee_id · priority · due_date · labels · parent_id · estimate · started_at · closed_at
//   ticket_comments: id · ticket_id · actor_id · body · created_at
//   ALTER TABLE ADD COLUMN으로 충분 (CHECK 변경 없음)
function migrateV18_ticketsAsana() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 17) return;
  if (userVersion < 16) return;

  const cols = db.pragma('table_info(tickets)');
  const has = (n) => cols.some(c => c.name === n);

  db.exec(`
    ${!has('assignee_id') ? "ALTER TABLE tickets ADD COLUMN assignee_id INTEGER REFERENCES users(id);" : ""}
    ${!has('priority')    ? "ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','high','normal','low'));" : ""}
    ${!has('due_date')    ? "ALTER TABLE tickets ADD COLUMN due_date TEXT;" : ""}
    ${!has('labels')      ? "ALTER TABLE tickets ADD COLUMN labels TEXT;" : ""}
    ${!has('parent_id')   ? "ALTER TABLE tickets ADD COLUMN parent_id INTEGER REFERENCES tickets(id);" : ""}
    ${!has('estimate')    ? "ALTER TABLE tickets ADD COLUMN estimate INTEGER;" : ""}
    ${!has('started_at')  ? "ALTER TABLE tickets ADD COLUMN started_at TEXT;" : ""}
    ${!has('closed_at')   ? "ALTER TABLE tickets ADD COLUMN closed_at TEXT;" : ""}

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id),
      actor_id INTEGER REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

    CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_parent ON tickets(parent_id);
  `);

  db.pragma('user_version = 17');
  console.log('[DB] v18 migration applied (tickets Asana baseline: 8 fields + comments)');
}
migrateV18_ticketsAsana();

// v19 migration: 사용자별 AI Provider 키 — users.anthropic_api_key (encrypted at rest 미적용, 평문 보관)
//   사용자가 본인 ANTHROPIC_API_KEY 를 등록하면, executeSkill 시 우선 사용
//   미등록이면 settings 의 전역 키로 fallback (기존 동작)
function migrateV19_userApiKey() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 18) return;
  if (userVersion < 17) return;

  const cols = db.pragma('table_info(users)');
  const has = (n) => cols.some(c => c.name === n);
  db.exec(`
    ${!has('anthropic_api_key') ? "ALTER TABLE users ADD COLUMN anthropic_api_key TEXT;" : ""}
    ${!has('anthropic_model')   ? "ALTER TABLE users ADD COLUMN anthropic_model TEXT;" : ""}
  `);
  db.pragma('user_version = 18');
  console.log('[DB] v19 migration applied (users.anthropic_api_key + anthropic_model)');
}
migrateV19_userApiKey();

// v20 migration: 사용자 그룹/팀 — teams + team_members + projects.team_id
//   admin: 팀 생성/멤버 관리
//   member: 본인이 속한 팀의 프로젝트 접근 가능 (created_by 외에 team_id 격리도 인정)
function migrateV20_teams() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 19) return;
  if (userVersion < 18) return;

  const prjCols = db.pragma('table_info(projects)');
  const hasTeam = prjCols.some(c => c.name === 'team_id');

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member' CHECK(role IN ('owner','member')),
      added_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (team_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    ${!hasTeam ? "ALTER TABLE projects ADD COLUMN team_id INTEGER REFERENCES teams(id);" : ""}
    ${!hasTeam ? "CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);" : ""}
  `);

  db.pragma('user_version = 19');
  console.log('[DB] v20 migration applied (teams + team_members + projects.team_id)');
}
migrateV20_teams();

// v21 migration: 디자인 시스템 Figma 양방향 sync 메타
//   project_design_systems 에 figma_file_key + figma_node_id + last_synced_at + sync_direction + sync_meta
function migrateV21_figmaSync() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 20) return;
  if (userVersion < 19) return;

  const cols = db.pragma('table_info(project_design_systems)');
  const has = (n) => cols.some(c => c.name === n);
  db.exec(`
    ${!has('figma_file_key')    ? "ALTER TABLE project_design_systems ADD COLUMN figma_file_key TEXT;" : ""}
    ${!has('figma_node_id')     ? "ALTER TABLE project_design_systems ADD COLUMN figma_node_id TEXT;" : ""}
    ${!has('last_synced_at')    ? "ALTER TABLE project_design_systems ADD COLUMN last_synced_at TEXT;" : ""}
    ${!has('last_sync_direction') ? "ALTER TABLE project_design_systems ADD COLUMN last_sync_direction TEXT;" : ""}
    ${!has('sync_meta')         ? "ALTER TABLE project_design_systems ADD COLUMN sync_meta TEXT;" : ""}
  `);
  db.pragma('user_version = 20');
  console.log('[DB] v21 migration applied (project_design_systems + figma sync fields)');
}
migrateV21_figmaSync();

// v22 migration: token_usage provider 분리 + 캐시 토큰
//   provider 컬럼 (claude-api | claude-code | mock) — UI/대시보드 분기 표시 필수
//     · claude-api  → "API 사용량 + 비용($)" 레이아웃
//     · claude-code → "구독 토큰 usage" 레이아웃 (cost_usd 는 API 환산 참고값)
//   cache_creation_tokens / cache_read_tokens — Anthropic 캐시 효과 추적
function migrateV22_tokenUsageProvider() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 21) return;
  if (userVersion < 20) return;

  const cols = db.pragma('table_info(token_usage)');
  const has = (n) => cols.some(c => c.name === n);
  db.exec(`
    ${!has('provider')                  ? "ALTER TABLE token_usage ADD COLUMN provider TEXT;" : ""}
    ${!has('cache_creation_tokens')     ? "ALTER TABLE token_usage ADD COLUMN cache_creation_tokens INTEGER NOT NULL DEFAULT 0;" : ""}
    ${!has('cache_read_tokens')         ? "ALTER TABLE token_usage ADD COLUMN cache_read_tokens INTEGER NOT NULL DEFAULT 0;" : ""}
    CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);
  `);
  db.pragma('user_version = 21');
  console.log('[DB] v22 migration applied (token_usage: +provider, +cache_creation/read)');
}
migrateV22_tokenUsageProvider();

// v23 migration: messages.artifact_id FK를 ON DELETE SET NULL 로 변경
//   현재 NO ACTION → step retry 시 saveArtifact 의 DELETE FROM artifacts 가 자식 message 때문에 막힘.
//   영구 해결: FK를 SET NULL 로 바꿔 artifact 삭제 시 자식 messages.artifact_id 자동 NULL 처리.
//   메시지 본문은 보존 (예: "벤치마크 생성 완료" 텍스트 그대로, 단지 산출물 링크만 끊김).
function migrateV23_messagesArtifactSetNull() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 22) return;
  if (userVersion < 21) return;

  // 현재 FK 정의 확인 — 이미 SET NULL 이면 skip
  const fks = db.pragma('foreign_key_list(messages)');
  const target = fks.find(f => f.table === 'artifacts' && f.from === 'artifact_id');
  if (target && target.on_delete === 'SET NULL') {
    db.pragma('user_version = 22');
    console.log('[DB] v23 skipped (messages.artifact_id already ON DELETE SET NULL)');
    return;
  }

  db.pragma('foreign_keys = OFF');
  try {
    db.exec(`
      BEGIN;
      CREATE TABLE messages_v23 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id),
        intake_session_id TEXT REFERENCES intake_sessions(id),
        role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
        kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','artifact','status','approval_request','approval_response','user_feedback','error')),
        content TEXT,
        artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL,
        step_id INTEGER REFERENCES pipeline_steps(id),
        user_id INTEGER REFERENCES users(id),
        consumed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        CHECK (project_id IS NOT NULL OR intake_session_id IS NOT NULL)
      );
      INSERT INTO messages_v23 (id, project_id, intake_session_id, role, kind, content, artifact_id, step_id, user_id, consumed_at, created_at)
        SELECT id, project_id, intake_session_id, role, kind, content, artifact_id, step_id, user_id, consumed_at, created_at FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_v23 RENAME TO messages;
      CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, id);
      CREATE INDEX IF NOT EXISTS idx_messages_intake ON messages(intake_session_id, id);
      CREATE INDEX IF NOT EXISTS idx_messages_feedback ON messages(project_id, kind, consumed_at);
      COMMIT;
    `);
  } catch (e) {
    try { db.exec('ROLLBACK;'); } catch {}
    throw e;
  } finally {
    db.pragma('foreign_keys = ON');
  }
  db.pragma('user_version = 22');
  console.log('[DB] v23 migration applied (messages.artifact_id → ON DELETE SET NULL)');
}
migrateV23_messagesArtifactSetNull();

// v24 migration: artifacts.parent_artifact_id / role / mime_type
//   부속 파일(### FILE: wireframes/login-pc.html 등)을 1급 산출물로 등록하기 위함.
//   - parent_artifact_id: 메인 산출물 id (NULL이면 본인이 메인)
//   - role: mockup | wireframe | preview | tokens | spec | reference | image | sb-html | sb-pdf | sb-data
//   - mime_type: text/html, text/css, application/json, image/png 등
//   목적: xcipe UI 가 시안 HTML/PNG/JSON 을 1급 산출물로 노출 (기존엔 .md만 보임)
function migrateV24_artifactsSubFiles() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 23) return;
  if (userVersion < 22) return;
  const cols = db.pragma('table_info(artifacts)');
  const has = (n) => cols.some(c => c.name === n);
  if (!has('parent_artifact_id')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN parent_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE CASCADE`);
  }
  if (!has('role')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN role TEXT`);
  }
  if (!has('mime_type')) {
    db.exec(`ALTER TABLE artifacts ADD COLUMN mime_type TEXT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artifacts_parent ON artifacts(parent_artifact_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artifacts_role ON artifacts(project_id, role)`);
  db.pragma('user_version = 23');
  console.log('[DB] v24 migration applied (artifacts.parent_artifact_id + role + mime_type)');
}
migrateV24_artifactsSubFiles();

// v25 migration: 분산 워커 모델 — 사용자 PC가 자기 ~/.claude OAuth로 파이프라인 실행
//   users.worker_token TEXT — 사용자별 워커 인증 토큰 (admin 발급, UUID v4)
//   pipeline_steps.worker_id TEXT — claim 한 워커 식별자 (hostname:pid 같은 자기소개)
//   pipeline_steps.claim_token TEXT — claim 별 unique 토큰 (다른 워커가 result 위조 차단)
//   pipeline_steps.claimed_at TEXT — claim 시각 (stale 판정 기준)
//   pipeline_steps.heartbeat_at TEXT — 마지막 heartbeat 시각 (30s 미수신 = stale → 회수)
//   pipeline_steps.user_id INTEGER — 작업 요청한 사용자 (워커 → 본인 작업만 claim 하도록 필터)
function migrateV25_distributedWorker() {
  const userVersion = db.pragma('user_version', { simple: true });
  if (userVersion >= 24) return;
  if (userVersion < 23) return;

  // users.worker_token
  const userCols = db.pragma('table_info(users)');
  const userHas = (n) => userCols.some(c => c.name === n);
  if (!userHas('worker_token')) {
    db.exec(`ALTER TABLE users ADD COLUMN worker_token TEXT`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_worker_token ON users(worker_token) WHERE worker_token IS NOT NULL`);
  }

  // pipeline_steps.worker_* + user_id
  const stepCols = db.pragma('table_info(pipeline_steps)');
  const stepHas = (n) => stepCols.some(c => c.name === n);
  if (!stepHas('worker_id'))      db.exec(`ALTER TABLE pipeline_steps ADD COLUMN worker_id TEXT`);
  if (!stepHas('claim_token'))    db.exec(`ALTER TABLE pipeline_steps ADD COLUMN claim_token TEXT`);
  if (!stepHas('claimed_at'))     db.exec(`ALTER TABLE pipeline_steps ADD COLUMN claimed_at TEXT`);
  if (!stepHas('heartbeat_at'))   db.exec(`ALTER TABLE pipeline_steps ADD COLUMN heartbeat_at TEXT`);
  if (!stepHas('user_id'))        db.exec(`ALTER TABLE pipeline_steps ADD COLUMN user_id INTEGER REFERENCES users(id)`);

  // 큐 polling 가속 — 사용자별 pending step + stale claim 회수용
  db.exec(`CREATE INDEX IF NOT EXISTS idx_steps_claim ON pipeline_steps(status, user_id, claimed_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_steps_heartbeat ON pipeline_steps(status, heartbeat_at) WHERE status = 'running'`);

  db.pragma('user_version = 24');
  console.log('[DB] v25 migration applied (distributed worker: users.worker_token + pipeline_steps.worker_*)');
}
migrateV25_distributedWorker();

function isAssetSyncReady() {
  try {
    const row = db.prepare(
      "SELECT 1 as v FROM sqlite_master WHERE type='table' AND name='asset_manifest'"
    ).get();
    return !!row;
  } catch { return false; }
}

function isDiscoveryReady() {
  try {
    const row = db.prepare(
      "SELECT 1 as v FROM sqlite_master WHERE type='table' AND name='project_index'"
    ).get();
    return !!row;
  } catch { return false; }
}

function isRagReady() {
  try {
    const row = db.prepare(
      "SELECT 1 as v FROM sqlite_master WHERE type='table' AND name='rag_corpus'"
    ).get();
    return !!row;
  } catch { return false; }
}

// Default settings
const defaultSettings = [
  ['ai_provider', 'mock'],
  ['anthropic_api_key', ''],
  ['anthropic_model', 'claude-opus-4-7']
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of defaultSettings) insertSetting.run(k, v);

// audit trigger — 직접 UPDATE/INSERT 라도 중요 키 변경은 activity_log에 자동 기록
//   setSetting()을 우회한 db.prepare("UPDATE settings ...") 도 잡음
db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_settings_audit_update
  AFTER UPDATE OF value ON settings
  WHEN NEW.key IN ('ai_provider','anthropic_api_key','anthropic_model','figma_access_token',
                   'reviewer_threshold_retry','reviewer_threshold_required','reviewer_threshold_recommended')
    AND OLD.value IS NOT NEW.value
  BEGIN
    INSERT INTO activity_log (entity_type, entity_id, action, detail)
    VALUES ('setting', 0, 'changed',
      NEW.key || ': ' ||
      CASE WHEN NEW.key LIKE '%key%' OR NEW.key LIKE '%token%'
           THEN '(masked) → (masked)'
           ELSE COALESCE(OLD.value, '(null)') || ' → ' || COALESCE(NEW.value, '(null)')
      END);
  END;

  CREATE TRIGGER IF NOT EXISTS trg_settings_audit_insert
  AFTER INSERT ON settings
  WHEN NEW.key IN ('ai_provider','anthropic_api_key','anthropic_model','figma_access_token',
                   'reviewer_threshold_retry','reviewer_threshold_required','reviewer_threshold_recommended')
  BEGIN
    INSERT INTO activity_log (entity_type, entity_id, action, detail)
    VALUES ('setting', 0, 'inserted',
      NEW.key || ': ' ||
      CASE WHEN NEW.key LIKE '%key%' OR NEW.key LIKE '%token%' THEN '(masked)'
           ELSE COALESCE(NEW.value, '(null)') END);
  END;
`);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  // 변경 감지 — 이전 값 캡처 후 activity_log에 audit trail 기록 (mock 등으로 silently 바뀌는 사건 추적)
  const prev = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
  // 중요 키 audit — provider/threshold/token 등
  const AUDITED = new Set(['ai_provider', 'anthropic_api_key', 'anthropic_model', 'figma_access_token', 'reviewer_threshold_retry', 'reviewer_threshold_required', 'reviewer_threshold_recommended']);
  if (AUDITED.has(key) && (!prev || prev.value !== value)) {
    try {
      const mask = (v) => (v && v.length > 12) ? v.slice(0, 6) + '...' + v.slice(-3) : (v || '(null)');
      const detail = key.includes('key') || key.includes('token')
        ? `${key}: ${mask(prev?.value)} → ${mask(value)}`
        : `${key}: ${prev?.value || '(null)'} → ${value}`;
      db.prepare(`INSERT INTO activity_log (entity_type, entity_id, action, detail) VALUES ('setting', 0, 'changed', ?)`).run(detail);
    } catch { /* audit 실패는 setSetting 차단 X */ }
  }
}

// Activity log helper
function logActivity(entityType, entityId, action, detail, actorId) {
  db.prepare(`
    INSERT INTO activity_log (entity_type, entity_id, action, detail, actor_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(entityType, entityId, action, detail, actorId);
}

function notify(userId, type, entityType, entityId, message) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, entity_type, entity_id, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, entityType, entityId, message);
}

function addMessage({ projectId, role, kind = 'text', content = null, artifactId = null, stepId = null, userId = null }) {
  const result = db.prepare(`
    INSERT INTO messages (project_id, role, kind, content, artifact_id, step_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, role, kind, content, artifactId, stepId, userId);
  return result.lastInsertRowid;
}

// P2-2: Reflexion lessons-learned — 실패 패턴 누적/조회
// recordLesson: 같은 (skill, pattern) 쌍이 이미 있으면 occurrences 증가, 없으면 신규
function recordLesson(skillName, pattern, lesson) {
  if (!skillName || !pattern || !lesson) return;
  db.prepare(`
    INSERT INTO skill_lessons (skill_name, pattern, lesson, occurrences, last_seen_at)
    VALUES (?, ?, ?, 1, datetime('now'))
    ON CONFLICT(skill_name, pattern) DO UPDATE SET
      occurrences = occurrences + 1,
      last_seen_at = datetime('now'),
      lesson = excluded.lesson
  `).run(skillName, pattern, lesson);
}

// getTopLessons: 해당 스킬의 자주 발생한 실패 N개 (occurrences 내림차순)
function getTopLessons(skillName, limit = 5) {
  return db.prepare(`
    SELECT pattern, lesson, occurrences, last_seen_at
    FROM skill_lessons
    WHERE skill_name = ?
    ORDER BY occurrences DESC, last_seen_at DESC
    LIMIT ?
  `).all(skillName, limit);
}

// P3-1: 토큰/비용 모니터링
// 모델별 USD 단가 — 1M 토큰당. Anthropic 공식 가격 기준 (2026-04).
// claude-opus-4-7과 4-6 동일 가격대로 가정; sonnet/haiku는 안정 가격.
const MODEL_PRICING = {
  'claude-opus-4-7':            { input: 15,    output: 75 },
  'claude-opus-4-6':            { input: 15,    output: 75 },
  'claude-sonnet-4-6':          { input: 3,     output: 15 },
  'claude-sonnet-4-5':          { input: 3,     output: 15 },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4 },
  'claude-haiku-4-5':           { input: 0.80,  output: 4 }
};
function calcCostUsd(model, inputTokens, outputTokens) {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return ((inputTokens || 0) * p.input + (outputTokens || 0) * p.output) / 1_000_000;
}
function recordTokenUsage({ projectId = null, pipelineId = null, stepId = null, skillName = null, task = null, model = null, provider = null, inputTokens = 0, outputTokens = 0, cacheCreationTokens = 0, cacheReadTokens = 0 }) {
  if (!model || (!inputTokens && !outputTokens)) return;
  // cost_usd:
  //   - claude-api  → 실제 청구 기준 (Anthropic 정가)
  //   - claude-code → API 환산 참고값 (구독 max plan 이므로 실비용 ≠ 이 값)
  //   - mock        → 0
  const cost = provider === 'mock' ? 0 : calcCostUsd(model, inputTokens, outputTokens);
  db.prepare(`
    INSERT INTO token_usage (
      project_id, pipeline_id, step_id, skill_name, task, model, provider,
      input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, pipelineId, stepId, skillName, task, model, provider,
         inputTokens, outputTokens, cacheCreationTokens || 0, cacheReadTokens || 0, cost);
}

// A10: 에러 로그 영속화 — console.warn/error 대신 DB에도 기록하여 운영 추적 가능
function logError({ source, code = null, message, stack = null, context = null, projectId = null, pipelineId = null, stepId = null }) {
  if (!source || !message) return;
  try {
    db.prepare(`
      INSERT INTO error_log (source, code, message, stack, context_json, project_id, pipeline_id, step_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(source, code, String(message).slice(0, 4000), stack ? String(stack).slice(0, 8000) : null,
           context ? JSON.stringify(context).slice(0, 4000) : null, projectId, pipelineId, stepId);
  } catch (e) { /* 로그 기록 실패는 흡수 */ }

  // F1: 에러 예산 임계 초과 시 활동 로그에 critical 기록 (24h 디바운스)
  //   exceeded 우선 — alert(80%) 보다 위험도 높음. 둘 다 발사 가능 (디바운스 키 분리).
  try {
    const eb = getErrorBudget();
    if (eb.hour.exceeded && _shouldFireErrorAlert('hour', 'exceeded')) {
      logActivity('system', null, 'error_budget_exceeded',
        `1시간 누적 에러 ${eb.hour.count}건 (한도 ${eb.hour.limit}건 초과)`, null);
    } else if (eb.hour.alert && _shouldFireErrorAlert('hour', 'alert')) {
      logActivity('system', null, 'error_budget_alert',
        `1시간 누적 에러 ${eb.hour.count}건 (한도 ${eb.hour.limit}건의 ${Math.round(eb.hour.pct * 100)}%)`, null);
    }
    if (eb.day.exceeded && _shouldFireErrorAlert('day', 'exceeded')) {
      logActivity('system', null, 'error_budget_exceeded',
        `24시간 누적 에러 ${eb.day.count}건 (한도 ${eb.day.limit}건 초과)`, null);
    } else if (eb.day.alert && _shouldFireErrorAlert('day', 'alert')) {
      logActivity('system', null, 'error_budget_alert',
        `24시간 누적 에러 ${eb.day.count}건 (한도 ${eb.day.limit}건의 ${Math.round(eb.day.pct * 100)}%)`, null);
    }
  } catch { /* 알람 실패는 흡수 — logError 자체는 성공 */ }
}

// A7: 비용 한도 모니터링
//   getCostUsage() — 오늘/이번 달 누적 비용 + 한도 + 경고 임계 반환
//   shouldAlertCost(scope) — 임계 초과 + 24h 디바운스 충족 시 true
function getCostUsage() {
  const dayRow = db.prepare(`
    SELECT COALESCE(SUM(cost_usd), 0) AS cost FROM token_usage
    WHERE DATE(created_at) = DATE('now', 'localtime')
  `).get();
  const monthRow = db.prepare(`
    SELECT COALESCE(SUM(cost_usd), 0) AS cost FROM token_usage
    WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
  `).get();
  const dailyLimit = parseFloat(getSetting('cost_limit_daily_usd') || '0') || 0;
  const monthlyLimit = parseFloat(getSetting('cost_limit_monthly_usd') || '0') || 0;
  const alertPct = Math.max(1, Math.min(100, parseFloat(getSetting('cost_alert_at_pct') || '80'))) / 100;

  const dayPct = dailyLimit > 0 ? (dayRow.cost / dailyLimit) : 0;
  const monthPct = monthlyLimit > 0 ? (monthRow.cost / monthlyLimit) : 0;

  return {
    daily: { cost: dayRow.cost, limit: dailyLimit, pct: dayPct, alert: dailyLimit > 0 && dayPct >= alertPct, exceeded: dailyLimit > 0 && dayPct >= 1 },
    monthly: { cost: monthRow.cost, limit: monthlyLimit, pct: monthPct, alert: monthlyLimit > 0 && monthPct >= alertPct, exceeded: monthlyLimit > 0 && monthPct >= 1 },
    alertPct
  };
}

// F1: 에러 예산 — 24h/1h 누적 에러 vs 임계
//   임계는 settings 테이블에 (admin이 PUT /api/settings/error-budget 으로 갱신)
//     error_budget_24h: 기본 50건 (0이면 비활성)
//     error_budget_1h:  기본 20건
//     error_alert_at_pct: 기본 80% (alert) / 100% (exceeded)
//   대시보드 응답에 포함되어 빨간 배지/critical 표시.
//   알람이 발사된 시각은 cost-alert와 동일 패턴으로 settings에 기록 → 24h 디바운스.
function getErrorBudget() {
  const dayCount = db.prepare(`
    SELECT COUNT(*) AS c FROM error_log
    WHERE created_at >= datetime('now', '-1 day')
  `).get().c;
  const hourCount = db.prepare(`
    SELECT COUNT(*) AS c FROM error_log
    WHERE created_at >= datetime('now', '-1 hour')
  `).get().c;
  const limit24 = parseInt(getSetting('error_budget_24h') || '50', 10) || 0;
  const limit1 = parseInt(getSetting('error_budget_1h') || '20', 10) || 0;
  const alertPct = Math.max(1, Math.min(100, parseFloat(getSetting('error_alert_at_pct') || '80'))) / 100;

  const day = {
    count: dayCount,
    limit: limit24,
    pct: limit24 > 0 ? dayCount / limit24 : 0,
    alert: limit24 > 0 && dayCount / limit24 >= alertPct,
    exceeded: limit24 > 0 && dayCount >= limit24
  };
  const hour = {
    count: hourCount,
    limit: limit1,
    pct: limit1 > 0 ? hourCount / limit1 : 0,
    alert: limit1 > 0 && hourCount / limit1 >= alertPct,
    exceeded: limit1 > 0 && hourCount >= limit1
  };

  // top 에러 코드 (1h)
  const topCodes = db.prepare(`
    SELECT code, source, COUNT(*) AS c
    FROM error_log
    WHERE created_at >= datetime('now', '-1 hour')
    GROUP BY code, source
    ORDER BY c DESC
    LIMIT 5
  `).all();

  return { day, hour, alertPct, top_codes: topCodes };
}

// 알람 발사 디바운스 — 동일 scope/level은 24h 내 한 번만
function _shouldFireErrorAlert(scope, level) {
  const key = `error_alert_last_${scope}_${level}`;
  const last = getSetting(key);
  if (last) {
    const lastTs = Date.parse(last);
    if (!Number.isNaN(lastTs) && Date.now() - lastTs < 24 * 3600 * 1000) return false;
  }
  setSetting(key, new Date().toISOString());
  return true;
}

// 24h 디바운스 — settings에 마지막 알림 시각을 저장하여 중복 알림 방지
function _shouldFireCostAlert(scope, level) {
  const key = `cost_alert_last_${scope}_${level}`;
  const last = getSetting(key);
  if (last) {
    const lastTs = Date.parse(last);
    if (!Number.isNaN(lastTs) && Date.now() - lastTs < 24 * 3600 * 1000) return false;
  }
  setSetting(key, new Date().toISOString());
  return true;
}

module.exports = {
  db, logActivity, getSetting, setSetting, notify, addMessage,
  recordLesson, getTopLessons,
  recordTokenUsage, calcCostUsd, MODEL_PRICING,
  logError,
  getCostUsage, _shouldFireCostAlert,
  isFts5Ready, indexArtifact, reindexAllArtifacts,
  isRagReady,
  isDiscoveryReady,
  isAssetSyncReady,
  getErrorBudget, _shouldFireErrorAlert
};
