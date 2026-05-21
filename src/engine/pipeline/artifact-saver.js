// 산출물 검증/저장 + 멀티파일 처리
// pipeline-worker.js에서 분리 (A4 모듈 분할)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, indexArtifact } = require('../../db');

// G6: dedupe 키 — 콘텐츠 sha256
//   같은 project_id + type 내에서 동일 sha 발견 시 새 파일을 쓰지 않고 기존 file_path 재사용.
//   meta_json.dedupe_of = <원본 artifact id> 로 추적 가능.
//   멀티파일(extractMultiFiles) 케이스는 dedupe 미적용 (파일 다수 + 디렉터리 구조 보존)
function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function findDedupeTarget(projectId, type, sha) {
  return db.prepare(`
    SELECT id, file_path, file_name FROM artifacts
    WHERE project_id = ? AND type = ? AND content_sha256 = ?
    ORDER BY id ASC LIMIT 1
  `).get(projectId, type, sha);
}

// 통계 — 전체 artifact 수, dedupe된 수, 절약된 바이트 추정 (file 크기 × 중복 횟수)
function getDedupeStats() {
  const total = db.prepare(`SELECT COUNT(*) AS c FROM artifacts`).get().c;
  const dedupRows = db.prepare(`
    SELECT id, file_path, meta_json FROM artifacts
    WHERE meta_json LIKE '%"dedupe_of"%'
  `).all();
  let savedBytes = 0;
  for (const r of dedupRows) {
    try {
      if (fs.existsSync(r.file_path)) {
        savedBytes += fs.statSync(r.file_path).size;
      }
    } catch { /* skip */ }
  }
  return { total, deduped: dedupRows.length, saved_bytes: savedBytes };
}

const OUTPUT_ROOT = path.join(__dirname, '..', '..', '..', 'output');

// L1·L2: 부속 파일 역할/MIME 추정 — UI 가 시안/스펙/토큰을 구분해서 노출 가능하도록.
function inferMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html': 'text/html', '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
    '.yaml': 'text/yaml', '.yml': 'text/yaml',
    '.txt': 'text/plain'
  })[ext] || 'application/octet-stream';
}

function inferRole(filePath) {
  const p = filePath.replace(/\\/g, '/').toLowerCase();
  const base = path.basename(p);
  // 디렉터리 우선
  if (/(^|\/)mockups\//.test(p)) return 'mockup';
  if (/(^|\/)wireframes\//.test(p)) return 'wireframe';
  if (/(^|\/)components\//.test(p)) return 'component';
  if (/(^|\/)assets\/(images|icons|reference)\//.test(p)) {
    if (p.includes('/reference/')) return 'reference';
    if (p.includes('/icons/')) return 'icon';
    return 'image';
  }
  if (/(^|\/)benchmark\//.test(p)) return 'benchmark';
  if (/(^|\/)knowledge\//.test(p)) {
    if (base === 'preview.html') return 'preview';
    if (base === 'tokens.json') return 'tokens';
    return 'spec';
  }
  if (/(^|\/)sb\//.test(p)) {
    if (base === 'data.json') return 'data';
    return 'spec';
  }
  // 파일명 기반
  if (base === 'preview.html') return 'preview';
  if (base === 'tokens.json') return 'tokens';
  if (base === 'data.json') return 'data';
  if (base === 'urls.txt' || base === 'targets.json' || base === 'capture.json') return 'config';
  // 확장자 기반
  const ext = path.extname(p).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'screenshot';
  if (ext === '.svg') return 'icon';
  if (ext === '.pdf') return 'document';
  if (ext === '.html') return 'mockup';
  if (ext === '.css') return 'stylesheet';
  if (ext === '.js') return 'script';
  if (ext === '.json') return 'data';
  if (ext === '.yaml' || ext === '.yml') return 'spec';
  return 'spec';
}

function buildSubFilesEntry(absPath, baseDir) {
  try {
    const stat = fs.statSync(absPath);
    const relPath = path.relative(baseDir, absPath).replace(/\\/g, '/');
    return {
      path: relPath,
      role: inferRole(relPath),
      mime: inferMime(relPath),
      size: stat.size
    };
  } catch { return null; }
}

function collectSubFilesFromDir(baseDir, excludePaths = []) {
  const excludeSet = new Set(excludePaths.map(p => path.resolve(p)));
  const out = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (excludeSet.has(path.resolve(full))) continue;
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) {
        const entry = buildSubFilesEntry(full, baseDir);
        if (entry) out.push(entry);
      }
    }
  }
  walk(baseDir);
  return out;
}

// 산출물 sanity check — 부실한 응답(권한 요청/요약만/너무 짧음) 탐지
// Major #5: stepName 별 출력 형식 분기 — markup/style/interaction 은 HTML/CSS/JS 라
//   markdown H1/H2 검사가 false negative 를 만들어 정상 산출물을 retry 로 폐기함.
function validateArtifactContent(content, stepName) {
  if (!content || typeof content !== 'string') {
    return { ok: false, reason: '응답이 비어 있음' };
  }
  const text = content.trim();

  if (text.length < 300) {
    return { ok: false, reason: `응답 길이 부족 (${text.length}자, 최소 300자 필요)` };
  }

  const metaPatterns = [
    /권한이?\s*필요/,
    /승인해?주시면/,
    /저장하시겠습니까/,
    /파일을?\s*(생성|만들|저장)하시겠습니까/,
    /산출물\s*작성\s*권한/,
    /Would you like me to/i,
    /Shall I (save|create|write)/i,
    /I need permission/i
  ];
  for (const pat of metaPatterns) {
    if (pat.test(text.slice(0, 800))) {
      return { ok: false, reason: `메타 응답 패턴 감지: "${text.slice(0, 120).replace(/\n/g, ' ')}..."` };
    }
  }

  // 출력 형식별 구조 검증
  const ext = getArtifactExtension(stepName);
  if (ext === 'html') {
    // HTML: <!DOCTYPE html> 또는 <html 시작 + </html> 종료 + 본문 태그 1종 이상
    const head = text.slice(0, 200).toLowerCase();
    if (!/<!doctype html|<html[\s>]/i.test(head)) {
      return { ok: false, reason: 'HTML 시작 태그 누락 (<!DOCTYPE html> 또는 <html>)' };
    }
    if (!/<\/html>/i.test(text)) {
      return { ok: false, reason: 'HTML 종료 태그 </html> 누락' };
    }
    const tagCount = (text.match(/<(div|section|main|header|footer|nav|article|aside|p|h[1-6])\b/gi) || []).length;
    if (tagCount < 3) {
      return { ok: false, reason: `HTML 본문 구조 빈약 (시맨틱 태그 ${tagCount}개, 최소 3개 필요)` };
    }
    return { ok: true };
  }
  if (ext === 'css') {
    // CSS: 셀렉터 { ... } 블록 최소 5개
    const ruleCount = (text.match(/[^{}\n]+\{[^{}]*\}/g) || []).length;
    if (ruleCount < 5) {
      return { ok: false, reason: `CSS 규칙 부족 (${ruleCount}개 블록, 최소 5개 필요)` };
    }
    return { ok: true };
  }
  if (ext === 'js') {
    // JS: function/const/let/var/class/=> 최소 1개 + 추가로 ; 또는 {} 다수
    if (!/\b(function|const|let|var|class|export|import)\b|=>/.test(text)) {
      return { ok: false, reason: 'JS 코드 구조 감지 불가 (function/const/class/=> 등)' };
    }
    const stmtCount = (text.match(/[;}]/g) || []).length;
    if (stmtCount < 5) {
      return { ok: false, reason: `JS 문장 수 부족 (${stmtCount}개, 최소 5개 필요)` };
    }
    return { ok: true };
  }
  // markdown (default) — H1/H2 최소 2개
  const headerCount = (text.match(/^#{1,2}\s+.+$/gm) || []).length;
  if (headerCount < 2) {
    return { ok: false, reason: `마크다운 섹션 부족 (H1/H2 ${headerCount}개, 최소 2개 필요)` };
  }
  return { ok: true };
}

// 스킬별 산출물 확장자 매핑
// 2026-05-15 안 A 적용: 디자인/SB 본문을 HTML primary로 전환.
//   - knowledge → preview.html (KDS 토큰 시각화)
//   - layout    → wireframes 메인 (그리드/페이지 레이아웃)
//   - ui        → components 갤러리
//   - sb        → SB HTML (mockups 통합)
//   - benchmark/bench_scrape는 분석 보고서이므로 .md 유지
function getArtifactExtension(stepName) {
  const map = {
    qst: 'md', req: 'md', fn: 'md', ia: 'md', wbs: 'md',
    benchmark: 'md', bench_scrape: 'md',
    knowledge: 'html', layout: 'html', ui: 'html',
    sb: 'html',
    functional: 'md', accessibility: 'md', performance: 'md',
    security: 'md', debug: 'md',
    persona: 'md', premortem: 'md', competitor: 'md', swot: 'md',
    stakeholder: 'md', prioritize: 'md', dashboard: 'md',
    lighthouse: 'md',
    markup: 'html', style: 'css', interaction: 'js',
    dev_spec: 'md', dev_api: 'md', dev_component: 'md', dev_test: 'md',
    deploy: 'md'
  };
  return map[stepName] || 'md';
}

// 복수 파일 응답 파싱 — `### FILE: path/file.ext` 헤더 + ```lang ... ``` 코드펜스 추출
function extractMultiFiles(content) {
  const files = [];
  const re = /^###\s+FILE:\s*(.+?)\s*$/gm;
  const matches = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    matches.push({ path: m[1].trim(), startIdx: m.index, headerLen: m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextStart = (i + 1 < matches.length) ? matches[i + 1].startIdx : content.length;
    const segment = content.slice(cur.startIdx + cur.headerLen, nextStart);
    const fenceMatch = segment.match(/```(?:[a-z]+)?\s*\n([\s\S]*?)\n```/);
    if (fenceMatch) {
      const safePath = cur.path.replace(/\\/g, '/').replace(/\.\.+/g, '').replace(/^\/+/, '');
      files.push({ path: safePath, content: fenceMatch[1] });
    }
  }
  return files;
}

// 코드 펜스 제거 (Claude가 ```html, ```css, ```js 로 감싼 경우)
function stripCodeFence(content, ext) {
  if (!['html', 'css', 'js'].includes(ext)) return content;
  const fenceRegex = /^\s*```(?:html|css|javascript|js|xml)?\s*\n([\s\S]*?)\n```\s*$/;
  const m = content.trim().match(fenceRegex);
  return m ? m[1] : content;
}

// 멀티파일을 루트(dir) 직접 배치하는 step 화이트리스트
const FLAT_MULTI_STEPS = new Set(['markup', 'style', 'interaction']);

// L1·L2: 부속 파일 → role + mime 매핑
function mimeOf(filePath) {
  const ext = (path.extname(filePath) || '').toLowerCase().replace(/^\./, '');
  const map = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript', mjs: 'application/javascript',
    json: 'application/json',
    yaml: 'application/yaml', yml: 'application/yaml',
    md: 'text/markdown', txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    svg: 'image/svg+xml', gif: 'image/gif',
    pdf: 'application/pdf'
  };
  return map[ext] || 'application/octet-stream';
}
function roleOf(stepName, relPath) {
  const p = (relPath || '').replace(/\\/g, '/').toLowerCase();
  if (/(^|\/)mockups?\//.test(p) || /mockup/.test(p)) return 'mockup';
  if (/wireframes?\//.test(p)) return 'wireframe';
  if (/components?\//.test(p)) return 'component';
  if (/preview\.html?$/.test(p) || /\/preview\//.test(p)) return 'preview';
  if (/tokens?\.(json|css)$/.test(p)) return 'tokens';
  if (/aesthetic-contract\.ya?ml$/.test(p)) return 'aesthetic';
  if (/^sb\/data\.json$|\/sb\/data\.json$|^data\.json$/.test(p)) return 'sb-data';
  if (/_sb_.*\.html?$/i.test(p) || /screen-blueprint.*\.html?$/i.test(p)) return 'sb-html';
  if (/_sb_.*\.pdf$/i.test(p) || /screen-blueprint.*\.pdf$/i.test(p)) return 'sb-pdf';
  if (/capture\.json$|targets\.json$|urls\.txt$/.test(p)) return 'config';
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(p)) return 'image';
  if (/index\.html?$/.test(p)) return 'gallery';
  if (/\.html?$/.test(p)) return 'html';
  if (/\.css$/.test(p)) return 'css';
  if (/\.js$/.test(p)) return 'js';
  if (/\.json$/.test(p)) return 'data';
  if (/\.md$/.test(p)) return 'spec';
  return 'asset';
}

// 산출물 파일 저장 + DB 등록
function saveArtifact(project, step, content, meta) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dir = path.join(OUTPUT_ROOT, project.code, dateStr);
  fs.mkdirSync(dir, { recursive: true });

  const type = step.step.toUpperCase();
  const version = (meta && meta.version) || 'v1.0';
  const ext = getArtifactExtension(step.step);
  const cleanContent = stripCodeFence(content, ext);

  const multiFiles = extractMultiFiles(content);
  const useFlat = FLAT_MULTI_STEPS.has(step.step) && multiFiles.length > 0;

  let fileName, filePath;
  let multiFilesCount = 0;
  let dedupeOf = null;
  let contentSha = null;

  // G6: 단일 파일 케이스 — dedupe 가능. 멀티파일(useFlat 또는 multiFiles>0)은 제외
  const isSingleFile = !useFlat && multiFiles.length === 0;

  if (isSingleFile) {
    contentSha = sha256(cleanContent);
    const dup = findDedupeTarget(project.id, type, contentSha);
    if (dup) {
      // 동일 콘텐츠 재사용 — fs 쓰기 스킵, 기존 file_path 가리키기
      dedupeOf = dup.id;
      filePath = dup.file_path;
      fileName = dup.file_name;
    } else {
      fileName = `${type}_${project.code}_${version}.${ext}`;
      filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, cleanContent, 'utf-8');
    }
  } else if (useFlat) {
    fileName = `${type}_README.md`;
    filePath = path.join(dir, fileName);
    const bodyWithoutFiles = content.replace(/###\s+FILE:\s*[^\n]*\n```[\s\S]*?```/g, '').trim();
    const fileList = '\n\n## 생성된 파일\n' + multiFiles.map(f => `- \`${f.path}\``).join('\n');
    fs.writeFileSync(filePath, bodyWithoutFiles + fileList, 'utf-8');
  } else {
    fileName = `${type}_${project.code}_${version}.${ext}`;
    filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, cleanContent, 'utf-8');
  }

  // L1: 부속 파일 디스크 저장 (DB INSERT 는 메인 행 INSERT 이후 일괄)
  const subFilePaths = []; // { fullPath, relPath }
  if (multiFiles.length > 0) {
    const targetDir = useFlat ? dir : path.join(dir, type.toLowerCase());
    if (!useFlat) fs.mkdirSync(targetDir, { recursive: true });
    for (const f of multiFiles) {
      const fp = path.join(targetDir, f.path);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, f.content, 'utf-8');
      multiFilesCount++;
      subFilePaths.push({ fullPath: fp, relPath: f.path });
    }
    if (useFlat) {
      const idx = multiFiles.find(f => /(^|\/)index\.html?$/i.test(f.path)) || multiFiles[0];
      if (idx) {
        filePath = path.join(dir, idx.path);
        fileName = idx.path;
      }
    }
  }

  // 2026-05-13: messages.artifact_id FK(ON DELETE NO ACTION) 위반 회피
  //   step 재실행 시 기존 artifact 삭제 전, 그 artifact 를 참조하는 messages 의 artifact_id 를 먼저 끊는다.
  //   메시지 본문(예: "벤치마크 생성 완료")은 보존, 단지 산출물 링크만 NULL 처리.
  db.prepare(`
    UPDATE messages SET artifact_id = NULL
    WHERE artifact_id IN (SELECT id FROM artifacts WHERE pipeline_step_id = ?)
  `).run(step.id);
  db.prepare('DELETE FROM artifacts WHERE pipeline_step_id = ?').run(step.id);

  const fullMeta = Object.assign({}, meta || {}, {
    multi_files: multiFilesCount,
    artifact_dir: path.relative(OUTPUT_ROOT, dir).replace(/\\/g, '/')
  });
  if (dedupeOf) fullMeta.dedupe_of = dedupeOf;

  // L1: 메인 행 INSERT — role=null (메인 식별자), mime=메인 확장자
  const mainMime = mimeOf(filePath);
  const mainRole = (ext === 'html') ? 'markup' : (ext === 'css') ? 'css' : (ext === 'js') ? 'js' : 'spec';
  const result = db.prepare(`
    INSERT INTO artifacts (project_id, type, version, file_path, file_name, meta_json, pipeline_step_id, content_sha256, parent_artifact_id, role, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(project.id, type, version, filePath, fileName, JSON.stringify(fullMeta), step.id, contentSha, mainRole, mainMime);
  const mainId = result.lastInsertRowid;

  // L1: 부속 파일 1급 등록 — parent_artifact_id=메인.id, role=mockup/wireframe/preview/tokens/...
  const insertSub = db.prepare(`
    INSERT INTO artifacts (project_id, type, version, file_path, file_name, meta_json, pipeline_step_id, parent_artifact_id, role, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const sf of subFilePaths) {
    if (sf.fullPath === filePath) continue; // useFlat 시 메인으로 승격된 index.html 중복 방지
    const role = roleOf(step.step, sf.relPath);
    const mime = mimeOf(sf.fullPath);
    const subName = sf.relPath.replace(/^.*[\\\/]/, '');
    insertSub.run(
      project.id, type, version,
      sf.fullPath, subName,
      JSON.stringify({ parent_type: type, sub_rel_path: sf.relPath }),
      step.id, mainId, role, mime
    );
  }

  // F2: FTS5 색인 — 실패는 검색 라우트 LIKE 폴백이 처리하므로 흡수
  try { indexArtifact(result.lastInsertRowid); } catch { /* skip */ }

  return { id: result.lastInsertRowid, file_path: filePath, file_name: fileName };
}

module.exports = {
  validateArtifactContent,
  getArtifactExtension,
  extractMultiFiles,
  stripCodeFence,
  FLAT_MULTI_STEPS,
  saveArtifact,
  sha256,
  findDedupeTarget,
  getDedupeStats,
  OUTPUT_ROOT,
  inferMime,
  inferRole,
  buildSubFilesEntry,
  collectSubFilesFromDir
};
