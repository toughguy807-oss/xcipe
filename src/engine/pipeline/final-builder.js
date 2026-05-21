// 최종 결합 페이지 빌더 — MARKUP(.html) + STYLE(.css) + INTERACTION(.js) 를
// 하나의 동작 가능한 index.html 로 연결.
//   - MARKUP 의 인라인 <style>/<script> 는 보존
//   - <head> 끝에 <link rel="stylesheet"> 주입 (별도 STYLE_*.css)
//   - </body> 직전에 <script src> 주입 (별도 INTERACTION_*.js)
//   - 인라인 CSS 와 외부 CSS 가 충돌하지 않도록 외부 CSS 가 인라인보다 늦게 로드 (cascade 우선)
//
// 호출 위치:
//   1) pipeline-worker.js publish-interaction step 완료 후 자동 (이상적인 정공)
//   2) scripts/rebuild-final.js 로 기존 산출물에 수동 적용
//
// 산출: <project>/<date>/index.html
//      DB artifacts 테이블에 type=FINAL row 추가 (parent_artifact_id 없음, 자체 메인)

const fs = require('fs');
const path = require('path');
const { db, indexArtifact } = require('../../db');
const { OUTPUT_ROOT } = require('./artifact-saver');

function findArtifact(projectId, type) {
  return db.prepare(`
    SELECT id, file_path, file_name FROM artifacts
    WHERE project_id = ? AND type = ? AND parent_artifact_id IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(projectId, type);
}

function injectAssets(html, cssHref, jsSrc) {
  let out = html;
  // <head> 끝 직전에 stylesheet 주입 (인라인 <style> 보다 늦게)
  const linkTag = cssHref ? `<link rel="stylesheet" href="${cssHref}">` : '';
  if (linkTag) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `  ${linkTag}\n</head>`);
    } else {
      out = linkTag + '\n' + out;
    }
  }
  // </body> 직전에 script src 주입 (인라인 <script> 보다 늦게 — defer 효과)
  const scriptTag = jsSrc ? `<script src="${jsSrc}" defer></script>` : '';
  if (scriptTag) {
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `  ${scriptTag}\n</body>`);
    } else {
      out = out + '\n' + scriptTag;
    }
  }
  return out;
}

// project_id 기준으로 결합 index.html 생성. step 객체 옵션 (DB row 등록 시 pipeline_step_id 채움)
function buildFinal({ projectId, step = null }) {
  const project = db.prepare('SELECT id, code FROM projects WHERE id = ?').get(projectId);
  if (!project) return { ok: false, error: `project ${projectId} 없음` };

  const markup = findArtifact(projectId, 'MARKUP');
  if (!markup) return { ok: false, error: 'MARKUP artifact 없음 — publish-markup 단계가 끝나야 함' };

  const style = findArtifact(projectId, 'STYLE');
  const inter = findArtifact(projectId, 'INTERACTION');

  let html;
  try { html = fs.readFileSync(markup.file_path, 'utf-8'); }
  catch (e) { return { ok: false, error: `MARKUP 읽기 실패: ${e.message}` }; }

  // 자산 상대 경로 — index.html 과 같은 디렉터리에 있다는 가정
  const cssHref = style ? path.basename(style.file_path) : null;
  const jsSrc = inter ? path.basename(inter.file_path) : null;

  const merged = injectAssets(html, cssHref, jsSrc);

  // 저장 — MARKUP 과 같은 디렉터리에 index.html
  const outDir = path.dirname(markup.file_path);
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, merged, 'utf-8');

  // DB 등록 — type=FINAL, parent NULL (자체 메인). 기존 FINAL 있으면 교체.
  db.prepare(`UPDATE messages SET artifact_id = NULL WHERE artifact_id IN (SELECT id FROM artifacts WHERE project_id=? AND type='FINAL')`).run(projectId);
  db.prepare(`DELETE FROM artifacts WHERE project_id=? AND type='FINAL'`).run(projectId);

  const meta = {
    skill: 'final-builder',
    version: 'v1',
    project: project.code,
    sources: {
      markup: markup.file_name,
      style:  style ? style.file_name : null,
      interaction: inter ? inter.file_name : null
    },
    artifact_dir: path.relative(OUTPUT_ROOT, outDir).replace(/\\/g, '/')
  };

  const result = db.prepare(`
    INSERT INTO artifacts (project_id, type, version, file_path, file_name, meta_json, pipeline_step_id, role, mime_type)
    VALUES (?, 'FINAL', 'v1.0', ?, 'index.html', ?, ?, 'final-page', 'text/html')
  `).run(projectId, outPath, JSON.stringify(meta), step ? step.id : null);

  try { indexArtifact(result.lastInsertRowid); } catch {}

  return {
    ok: true,
    artifactId: result.lastInsertRowid,
    file_path: outPath,
    file_name: 'index.html',
    bytes: fs.statSync(outPath).size,
    sources: meta.sources
  };
}

module.exports = { buildFinal, injectAssets };
