// 백그라운드 파이프라인 워커 (FN-21)
// DB polling 방식. 브라우저 독립적으로 단계를 실행.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const { db, logActivity, notify, addMessage, recordLesson } = require('../db');

// skills/{skillName}/scripts/post-process.js 가 존재하면 호출 (SKILLS_DIR 기준).
// 인터페이스: node post-process.js <artifactPath> <outputDir> <projectInfoJson>
// 반환: { ok, generatedFiles: [{path, sizeBytes}], stdout, stderr }
function runPostProcessor(skillName, project, artifactPath, outputDir) {
  return new Promise((resolve) => {
    const { SKILLS_DIR: skillsRoot } = require('./skill-loader');
    const scriptPath = path.join(skillsRoot, skillName, 'scripts', 'post-process.js');
    if (!fs.existsSync(scriptPath)) return resolve({ ok: true, skipped: true });

    const projectInfo = {
      id: project.id, code: project.code, name: project.name,
      type: project.type, description: project.description || '',
      tech_stack: project.tech_stack || '', framework: project.framework || ''
    };
    const tmpProj = path.join(os.tmpdir(), `esys-proj-${crypto.randomBytes(6).toString('hex')}.json`);
    try { fs.writeFileSync(tmpProj, JSON.stringify(projectInfo, null, 2), 'utf8'); }
    catch (err) { return resolve({ ok: false, error: `Failed to write project info: ${err.message}` }); }

    const beforeFiles = new Set(fs.readdirSync(outputDir));
    const cmd = `node "${scriptPath}" "${artifactPath}" "${outputDir}" "${tmpProj}"`;
    const child = exec(cmd, {
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
      cwd: path.dirname(scriptPath),
      windowsHide: true
    }, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpProj); } catch {}
      const afterFiles = new Set(fs.readdirSync(outputDir));
      const newFiles = [...afterFiles].filter(f => !beforeFiles.has(f)).map(name => {
        const fp = path.join(outputDir, name);
        let sizeBytes = 0;
        try { sizeBytes = fs.statSync(fp).size; } catch {}
        return { path: name, sizeBytes };
      });
      if (err) {
        return resolve({
          ok: false, error: err.killed ? `post-process timeout` : (stderr || err.message),
          stdout, stderr, generatedFiles: newFiles
        });
      }
      resolve({ ok: true, generatedFiles: newFiles, stdout, stderr });
    });
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

const STEP_LABELS = {
  qst: '질의서', req: '요구사항', fn: '기능정의', ia: '정보구조', wbs: '작업분해',
  benchmark: '벤치마크', knowledge: '스타일가이드', layout: '레이아웃', ui: 'UI 명세',
  markup: 'HTML 마크업', style: 'CSS', interaction: '인터랙션',
  functional: '기능 테스트', accessibility: '접근성 테스트', performance: '성능 테스트',
  deploy: '배포'
};

// 단계별 예상 소요 시간 (Claude Code 기준, Mock은 즉시)
const STEP_ETA = {
  qst: '30초~1분', req: '1~3분', fn: '1~3분', ia: '1~2분', wbs: '30초~1분',
  benchmark: '2~5분', knowledge: '1~2분', layout: '1~2분', ui: '2~4분',
  markup: '3~8분', style: '3~8분', interaction: '2~5분',
  functional: '1~3분', accessibility: '1~3분', performance: '1~3분',
  deploy: '30초'
};
const { executeSkill } = require('./model-bridge');
const { loadSkill } = require('./skill-loader');
const { logError, getCostUsage, _shouldFireCostAlert } = require('../db');
const { reviewArtifact, parseMeta } = require('./pipeline/reviewer');
const { humanizeError, classifyFailurePattern, deriveImprovements, PATTERN_LESSONS } = require('./pipeline/failure-classifier');
const { validateArtifactContent, saveArtifact } = require('./pipeline/artifact-saver');

let _running = false;
let _interval = null;
let _staleInterval = null;  // v28: stale claim 회수 별도 인터벌 (30s) — tick(2s) 과 분리

// A7: 비용 한도 체크 — 한도가 설정된 경우만 동작. 임계 초과/한도 초과 시 admin 알림
function checkCostLimits() {
  const usage = getCostUsage();
  const fmtUsd = (n) => '$' + Number(n || 0).toFixed(4);
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all();
  if (admins.length === 0) return;

  const fire = (scope, level, msg) => {
    if (!_shouldFireCostAlert(scope, level)) return;
    for (const a of admins) {
      notify(a.id, level === 'exceeded' ? 'cost_exceeded' : 'cost_warning', 'system', null, msg);
    }
    // error_log에도 기록 — 운영 추적용 (level=warning은 INFO, exceeded는 WARN 코드)
    logError({
      source: 'cost-monitor',
      code: level === 'exceeded' ? 'COST_LIMIT_EXCEEDED' : 'COST_LIMIT_WARNING',
      message: msg,
      context: { scope, level, usage: { cost: usage[scope].cost, limit: usage[scope].limit, pct: usage[scope].pct } }
    });
  };

  // 우선순위: exceeded > alert. 동일 scope에서는 한 번만 발송 (디바운스 키 분리)
  for (const scope of ['daily', 'monthly']) {
    const u = usage[scope];
    const label = scope === 'daily' ? '오늘' : '이번 달';
    if (u.exceeded) {
      fire(scope, 'exceeded',
        `${label} API 비용이 한도를 초과했습니다: ${fmtUsd(u.cost)} / ${fmtUsd(u.limit)} (${(u.pct * 100).toFixed(1)}%)`);
    } else if (u.alert) {
      fire(scope, 'warning',
        `${label} API 비용이 임계 ${(usage.alertPct * 100).toFixed(0)}%를 넘었습니다: ${fmtUsd(u.cost)} / ${fmtUsd(u.limit)} (${(u.pct * 100).toFixed(1)}%)`);
    }
  }
}

// 이전 단계 산출물 로드 (컨텍스트 전파)
function getPreviousArtifacts(pipelineId) {
  const rows = db.prepare(`
    SELECT a.type, a.file_path
    FROM artifacts a
    JOIN pipeline_steps s ON s.id = a.pipeline_step_id
    WHERE s.pipeline_id = ? AND s.status = 'approved'
    ORDER BY s.step_order
  `).all(pipelineId);
  return rows.map(r => {
    let content = '';
    try { content = fs.readFileSync(r.file_path, 'utf-8'); } catch {}
    return { type: r.type, content };
  });
}

// 레퍼런스 컨텍스트 빌드 — reference_content(사용자 붙여넣기) + reference_url(자동 클론, 첫 실행 시만)
async function buildReferenceContext(project) {
  const parts = [];
  if (project.reference_content && project.reference_content.trim()) {
    parts.push({
      type: 'REFERENCE_CONTENT',
      content: '# 사용자 제공 레퍼런스 (기존 소스/문서)\n\n' + project.reference_content.slice(0, 40 * 1024)
    });
  }
  if (project.reference_url) {
    // 이미 클론된 HTML이 reference_content에 있으면 스킵
    if (!project.reference_content || !project.reference_content.includes('[CLONED_HTML:')) {
      try {
        const { cloneUrl } = require('./page-cloner');
        const result = await cloneUrl(project.reference_url);
        if (result.ok) {
          parts.push({
            type: 'CLONED_HTML',
            content: `[CLONED_HTML: ${result.url}]\n# 라이브 사이트 HTML 스냅샷\n- URL: ${result.url}\n- 상태: ${result.status}\n- 제목: ${result.title}\n- 바이트: ${result.bytes}${result.truncated ? ' (일부 잘림)' : ''}\n\n\`\`\`html\n${result.html}\n\`\`\``
          });
          // DB에도 캐싱 (재실행 시 재다운로드 방지)
          try {
            const cached = (project.reference_content || '') + '\n\n' + parts[parts.length - 1].content;
            db.prepare('UPDATE projects SET reference_content = ? WHERE id = ?').run(cached.slice(0, 200 * 1024), project.id);
            project.reference_content = cached;
          } catch {}
        } else {
          console.warn('[page-cloner] 실패:', result.error);
        }
      } catch (err) {
        console.warn('[page-cloner] 예외:', err.message);
      }
    }
  }
  return parts;
}

// U-G23: 미소비 사용자 피드백 → 컨텍스트 주입 (다음 step 직전 1회)
//   kind='user_feedback' 이면서 consumed_at IS NULL인 메시지를 모음
//   소비한 메시지는 consumed_at 마킹 (재주입 방지)
function consumeUserFeedback(projectId) {
  const rows = db.prepare(`
    SELECT id, content, created_at FROM messages
    WHERE project_id = ? AND kind = 'user_feedback' AND consumed_at IS NULL
    ORDER BY id ASC
    LIMIT 10
  `).all(projectId);
  if (!rows.length) return null;
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE messages SET consumed_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids);
  const text = rows.map((r, i) => `[#${i + 1} ${r.created_at}] ${r.content}`).join('\n\n');
  return {
    type: 'USER_FEEDBACK',
    content: '# 사용자 중간 피드백\n위 사용자 코멘트를 이번 단계 산출물에 반영하세요. 명시적으로 어긋나는 기존 산출물 내용은 사용자 의도에 맞게 조정합니다.\n\n' + text
  };
}

// 단계 1개 실행
//   주의: 호출자(tick)가 이미 claim 트랜잭션에서 status='running' + started_at 을 atomic 으로 설정함.
//         여기서는 재 UPDATE 하지 않는다 (이중 UPDATE 시 started_at 갱신으로 duration 계산 왜곡).
async function executeStep(step) {
  const startedAt = Date.now();
  let lastContent = null; // 실패 시 다음 시도(replanContext)용 콘텐츠 보존

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(step.project_id);
    if (!project) throw new Error('Project not found');

    // 파이프라인 실행별 prompt override — POST /api/pipelines에서 prompt 지정 시 project.prompt 우선 대체
    const pipeline = db.prepare('SELECT prompt FROM pipelines WHERE id = ?').get(step.pipeline_id);
    if (pipeline && pipeline.prompt && pipeline.prompt.trim().length > 0) {
      project.prompt = pipeline.prompt;
    }

    // 작업 시작 메시지
    const stepLabel = STEP_LABELS[step.step] || step.step;
    const eta = STEP_ETA[step.step] || '알 수 없음';
    const isReplan = (step.retry_count || 0) > 0;
    addMessage({
      projectId: project.id, role: 'assistant', kind: 'status',
      content: isReplan
        ? `${stepLabel} 재시도 중 (${step.retry_count + 1}/3회차, 이전 실패 컨텍스트 반영)... (예상 ${eta})`
        : `${stepLabel} 생성 중... (예상 ${eta})`,
      stepId: step.id
    });

    const skillContent = loadSkill(step.skill_name); // null 가능 (Mock provider면 무관)
    const previousArtifacts = getPreviousArtifacts(step.pipeline_id);

    // 레퍼런스 컨텍스트 (reference_content / reference_url 클론) 첫 step에서만 의미 있으나 항상 주입
    const refParts = await buildReferenceContext(project);
    const feedbackPart = consumeUserFeedback(project.id);
    if (feedbackPart) {
      addMessage({
        projectId: project.id, role: 'system', kind: 'status',
        content: `중간 피드백 ${feedbackPart.content.split('[#').length - 1}건을 이번 단계에 반영합니다.`,
        stepId: step.id
      });
    }
    const enrichedArtifacts = [...refParts, ...(feedbackPart ? [feedbackPart] : []), ...previousArtifacts];

    // P2-1: replanContext — retry_count > 0이면 이전 실패 사유와 콘텐츠를 모델에 전달
    const replanContext = isReplan ? {
      attempt: step.retry_count + 1,
      reason: step.error_message || '이전 시도 실패 (사유 미기재)',
      improvements: deriveImprovements(step.error_message),
      previousContent: step.output_content || null
    } : null;

    // invocationId — subprocess 취소용 식별자
    const invocationId = `step-${step.id}-${Date.now()}`;
    const result = await executeSkill({
      skillName: step.skill_name,
      skillContent,
      project,
      previousArtifacts: enrichedArtifacts,
      invocationId,
      replanContext
    });
    lastContent = result && result.content ? result.content : null;

    // Major #6: token_usage 기록은 model-bridge.executeSkill 안에서 이미 수행 (provider/cache 토큰 포함).
    //   여기서 다시 호출하면 같은 호출이 2회 기록되어 cost-report 가 2배로 부풀어진다.
    //   비용 한도 모니터링만 유지 (recordTokenUsage 중복 제거).
    if (result && result.tokens) {
      try { checkCostLimits(); } catch (e) { /* 한도 체크 실패는 파이프라인을 막지 않음 */ }
    }

    const duration = Date.now() - startedAt;

    if (!result.ok) {
      throw new Error(result.error || 'Unknown error');
    }

    // sanity check — 부실 응답이면 자동 실패 처리하여 retry 유도
    const validation = validateArtifactContent(result.content, step.step);
    if (!validation.ok) {
      throw new Error(`[품질 검증 실패] ${validation.reason}`);
    }

    const meta = parseMeta(result.content);
    // META 없으면 UNKNOWN — Self-Check 없는 산출물은 신뢰도 낮음, UI에서 회색 배지로 구분
    // FAIL이 명시되면 즉시 throw하여 retry/HITL 트리거
    let selfCheck = meta && meta.self_check ? meta.self_check : 'UNKNOWN';
    if (selfCheck === 'FAIL') {
      throw new Error(`[self-check] 스킬이 FAIL 보고: ${meta.self_check_reason || '사유 미기재'}`);
    }

    // reviewer 스킬 호출 — 점수에 따라 분기 (P3-3: 임계값을 settings에서 동적 로드)
    //   ≥ auto      : 자동 진행 (high confidence)
    //   recommended ~ auto-1 : 진행하되 HITL 권고 (UI 강조)
    //   required ~ recommended-1 : HITL 필수 (사용자 결정 대기)
    //   < required  : 자동 retry (자동 재생성)
    let reviewScore = null;
    let reviewReason = null;
    let reviewGate = 'AUTO';  // AUTO | HITL_RECOMMENDED | HITL_REQUIRED
    try {
      const { getSetting } = require('../db');
      const TH_RETRY = parseInt(getSetting('reviewer_threshold_retry') || '60', 10);
      const TH_REQUIRED = parseInt(getSetting('reviewer_threshold_required') || '70', 10);
      const TH_RECOMMENDED = parseInt(getSetting('reviewer_threshold_recommended') || '90', 10);
      const providerName = require('./model-bridge').getProvider().getProviderName();
      if (providerName !== 'mock') {
        const reviewResult = await reviewArtifact({
          skillName: step.skill_name,
          content: result.content,
          project,
          pipelineId: step.pipeline_id,
          stepId: step.id
        });
        if (reviewResult && reviewResult.score !== null) {
          reviewScore = reviewResult.score;
          reviewReason = reviewResult.reason || '';
          if (reviewResult.score < TH_RETRY) {
            throw new Error(`[reviewer] 품질 점수 ${reviewResult.score}점 — 자동 재생성 트리거. 사유: ${reviewReason || '미달'}`);
          }
          if (reviewResult.score < TH_REQUIRED) reviewGate = 'HITL_REQUIRED';
          else if (reviewResult.score < TH_RECOMMENDED) reviewGate = 'HITL_RECOMMENDED';
          selfCheck = `${selfCheck} · ${reviewResult.score}점`;
        }
      }
    } catch (reviewErr) {
      if (reviewErr.message && reviewErr.message.startsWith('[reviewer]')) throw reviewErr;
      if (reviewErr.message && reviewErr.message.startsWith('[self-check]')) throw reviewErr;
      console.warn('[reviewer] 건너뜀:', reviewErr.message);
    }

    const artifact = saveArtifact(project, step, result.content, meta);

    // plan-sb 전용 사전 훅 — data.json 파싱 후 screen별 mockup HTML을 LLM으로 생성
    // post-process.js 실행 전에 mockups/ 폴더를 채워둔다
    let mockupGenMeta = null;
    if (step.skill_name === 'plan-sb') {
      try {
        const outputDir = path.dirname(artifact.file_path);
        const dataJsonPath = [
          path.join(outputDir, 'sb', 'data.json'),
          path.join(outputDir, 'SB', 'data.json'),
          path.join(outputDir, 'data.json')
        ].find(p => fs.existsSync(p));
        if (dataJsonPath) {
          const { generateMockups } = require('./plan-sb-mockup-gen');
          const { getProvider } = require('./model-bridge');
          const provider = getProvider();
          const providerName = provider.getProviderName();
          if (providerName !== 'mock') {
            console.log(`[mockup-gen] start for ${step.skill_name} (provider=${providerName})`);
            const mg = await generateMockups({ dataJsonPath, outputDir, project, provider });
            mockupGenMeta = mg;
            console.log(`[mockup-gen] done: generated=${mg.generated} errors=${(mg.errors || []).length}`);
          } else {
            console.log('[mockup-gen] skip (mock provider)');
          }
        }
      } catch (mgErr) {
        console.warn('[mockup-gen] 예외:', mgErr.message);
        mockupGenMeta = { ok: false, error: mgErr.message };
      }
    }

    // 스킬 후처리 훅 — ~/.claude/skills/{skill}/scripts/post-process.js 자동 실행
    let postProcessMeta = null;
    try {
      const outputDir = path.dirname(artifact.file_path);
      const pp = await runPostProcessor(step.skill_name, project, artifact.file_path, outputDir);
      if (!pp.skipped) {
        postProcessMeta = {
          ok: pp.ok,
          generated_files: pp.generatedFiles || [],
          error: pp.error || null
        };
        if (pp.ok && pp.generatedFiles && pp.generatedFiles.length > 0) {
          console.log(`[post-process] ${step.skill_name}: ${pp.generatedFiles.length}개 파일 생성`);
        } else if (!pp.ok) {
          console.warn(`[post-process] ${step.skill_name} 실패: ${pp.error}`);
        }
      }
    } catch (ppErr) {
      console.warn('[post-process] 예외:', ppErr.message);
      postProcessMeta = { ok: false, error: ppErr.message };
    }

    // F) publish-interaction 완료 후 최종 결합 index.html 자동 생성
    //   "단위별만 있고 최종 파일 없음" 해소 — MARKUP + STYLE + INTERACTION 을 link/script 로 묶음.
    if (step.skill_name === 'publish-interaction') {
      try {
        const { buildFinal } = require('./pipeline/final-builder');
        const fb = buildFinal({ projectId: project.id, step });
        if (fb.ok) {
          console.log(`[final-builder] index.html ${fb.bytes}B 생성 (markup=${fb.sources.markup}, style=${fb.sources.style}, js=${fb.sources.interaction})`);
        } else {
          console.warn('[final-builder] 건너뜀:', fb.error);
        }
      } catch (fErr) {
        console.warn('[final-builder] 예외:', fErr.message);
      }
    }

    // G) 시각 산출물 자동 verify — Major #8: 적용 범위 확장
    //   환경변수 AUTO_VISUAL_VERIFY=0 으로 비활성. 기본 켜짐.
    //   기존: design-ui, publish-style, publish-interaction 만
    //   확장: design-knowledge(preview.html), design-layout(wireframes/*), plan-sb(mockups/*) 시각 산출물 추가
    //   결과는 verify_meta 에 점수+axis 별 평가 저장
    let verifyMeta = null;
    const VERIFY_TARGETS = new Set([
      'design-knowledge',  // preview.html — 토큰 시각화
      'design-layout',     // wireframes/*.html — 페이지별 레이아웃
      'design-ui',         // components/*.html — 컴포넌트 시안
      'publish-style',     // CSS 적용 결과
      'publish-interaction', // JS 인터랙션 결과
      'plan-sb'            // mockups/*.png — 화면별 목업 (post-process 가 PNG 생성)
    ]);
    if (process.env.AUTO_VISUAL_VERIFY !== '0' && VERIFY_TARGETS.has(step.skill_name)) {
      try {
        const { runVisualVerify } = require('./visual-verify-runner');
        const outputDir = path.dirname(artifact.file_path);
        const vr = await runVisualVerify({ skillName: step.skill_name, project, outputDir, artifactPath: artifact.file_path });
        if (vr && !vr.skipped) {
          verifyMeta = vr;
          console.log(`[visual-verify] ${step.skill_name} score=${vr.score || '-'} gate=${vr.gate || '-'}`);
        }
      } catch (vErr) {
        console.warn('[visual-verify] 예외:', vErr.message);
        verifyMeta = { ok: false, error: vErr.message };
      }
    }

    const reviewMeta = reviewScore !== null
      ? { score: reviewScore, gate: reviewGate, reason: reviewReason }
      : null;

    // L1: post-process 가 생성한 파일들도 artifact.meta_json.sub_files 에 합산.
    //   plan-sb 의 *_SB_*.html / *.pdf, design-* preview/wireframes/components, mockup PNG 등
    let postProcessSubFiles = null;
    try {
      if (postProcessMeta && postProcessMeta.generated_files && postProcessMeta.generated_files.length > 0) {
        const { buildSubFilesEntry } = require('./pipeline/artifact-saver');
        const outDir = path.dirname(artifact.file_path);
        postProcessSubFiles = postProcessMeta.generated_files
          .map(f => {
            const abs = path.isAbsolute(f.path) ? f.path : path.join(outDir, f.path);
            return buildSubFilesEntry(abs, outDir);
          })
          .filter(Boolean);
      }
    } catch (e) { console.warn('[sub_files] post-process 통합 실패:', e.message); }

    // H) Figma Auto Push 준비 (MVP1, 2026-05-15) + step 큐잉 (MVP2, 2026-05-18)
    //   MVP1: design system 에 figma_file_key 등록 + 본문이 .html 일 때 figma-prep 변환 자동
    //   MVP2: prepare/finalize step 자동 큐잉 → LLM 이 MCP 호출 + 노드가 puppeteer 캡처
    //   FIGMA_AUTO_PUSH=0 : 변환·큐잉 모두 off
    //   FIGMA_AUTO_PUSH_AUTOTRIGGER=0 : 변환만 하고 step 큐잉은 off (MVP1 모드)
    let figmaPushMeta = null;
    if (process.env.FIGMA_AUTO_PUSH !== '0') {
      try {
        const { prepareFigmaPush, enqueueFigmaPushSteps } = require('./figma-auto-push');
        const outputDir = path.dirname(artifact.file_path);
        const subFiles = (postProcessSubFiles || (meta && meta.sub_files) || []);
        const fp = await prepareFigmaPush({
          skillName: step.skill_name, project, outputDir,
          artifactPath: artifact.file_path, subFiles
        });
        if (fp && !fp.skipped) {
          figmaPushMeta = fp;
          console.log(`[figma-auto-push] ${step.skill_name} prepared=${(fp.prepared_files || []).length} fileKey=${fp.figma && fp.figma.file_key}`);
          // MVP2: prepare/finalize step 자동 큐잉
          try {
            const enq = enqueueFigmaPushSteps({ parentStep: step, project, figmaPushReady: fp });
            if (enq && !enq.skipped) {
              figmaPushMeta.queued_steps = { prepare: enq.prepareStepId, finalize: enq.finalizeStepId };
              console.log(`[figma-auto-push] step 큐잉 ok prepare=${enq.prepareStepId} finalize=${enq.finalizeStepId}`);
            } else if (enq && enq.skipped) {
              figmaPushMeta.queue_skipped = enq.reason;
            }
          } catch (qErr) {
            console.warn('[figma-auto-push] step 큐잉 실패:', qErr.message);
            figmaPushMeta.queue_error = qErr.message;
          }
        }
      } catch (fErr) {
        console.warn('[figma-auto-push] 예외:', fErr.message);
        figmaPushMeta = { ok: false, error: fErr.message };
      }
    }

    // H2) figma-push-prepare 완료 시 puppeteer 캡처 자동 트리거 (MVP2)
    //   step 자체가 figma-push-prepare 이고 LLM 응답 META 에 captureId 있으면
    //   노드가 _figma/*-figma.html 을 capture URL 로 로드해 Figma 측에 캡처 데이터 전송
    if (step.skill_name === 'figma-push-prepare') {
      try {
        const { triggerCaptureAndPropagate } = require('./figma-auto-push');
        const cap = await triggerCaptureAndPropagate({
          prepareStep: step, prepareArtifact: artifact, project
        });
        console.log(`[figma-capture] step=${step.id} ok=${cap.ok} duration=${cap.durationMs}ms ${cap.error ? 'err=' + cap.error : ''}`);
        figmaPushMeta = Object.assign({}, figmaPushMeta || {}, { capture_trigger: cap });
      } catch (cErr) {
        console.warn('[figma-capture] 예외:', cErr.message);
        figmaPushMeta = Object.assign({}, figmaPushMeta || {}, { capture_trigger: { ok: false, error: cErr.message } });
      }
    }

    const finalMeta = (postProcessMeta || mockupGenMeta || reviewMeta || verifyMeta || figmaPushMeta || postProcessSubFiles)
      ? Object.assign({}, meta || {},
          postProcessMeta ? { post_process: postProcessMeta } : {},
          mockupGenMeta ? { mockup_gen: mockupGenMeta } : {},
          reviewMeta ? { review: reviewMeta } : {},
          verifyMeta ? { visual_verify: verifyMeta } : {},
          figmaPushMeta ? { figma_push_ready: figmaPushMeta } : {},
          // saveArtifact 에서 이미 sub_files 가 있으면 합치고, 없으면 새로 만든다
          postProcessSubFiles ? (() => {
            const existing = (meta && meta.sub_files) || [];
            const merged = [...existing];
            const seen = new Set(existing.map(s => s.path));
            for (const e of postProcessSubFiles) {
              if (!seen.has(e.path)) { merged.push(e); seen.add(e.path); }
            }
            return { sub_files: merged };
          })() : {})
      : meta;

    db.prepare(`
      UPDATE pipeline_steps
      SET status = 'awaiting_approval',
          output_file = ?,
          output_content = ?,
          meta_json = ?,
          self_check_result = ?,
          duration_ms = ?,
          completed_at = datetime('now'),
          error_message = NULL
      WHERE id = ?
    `).run(artifact.file_path, result.content, finalMeta ? JSON.stringify(finalMeta) : null, selfCheck, duration, step.id);

    logActivity('pipeline_step', step.id, 'completed', `${step.step} → ${selfCheck}`, null);

    // 프로젝트 담당자에게 알림
    if (project.created_by) {
      notify(project.created_by, 'approval_needed', 'pipeline_step', step.id,
        `${project.name}의 "${step.step}" 단계가 승인 대기 중입니다`);
    }

    // U-G10: HITL 게이트 시 외부 알림 (슬랙/이메일) — fire-and-forget
    if (reviewGate === 'HITL_REQUIRED' || reviewGate === 'HITL_RECOMMENDED') {
      try {
        const { notifyHitlGate } = require('./external-notify');
        const baseUrl = process.env.PUBLIC_BASE_URL || '';
        notifyHitlGate({ project, step, gate: reviewGate, score: reviewScore, reason: reviewReason, baseUrl });
      } catch { /* 외부 알림 실패는 흡수 */ }
    }

    // 산출물 메시지 (카드)
    addMessage({
      projectId: project.id, role: 'assistant', kind: 'artifact',
      content: `${stepLabel} 생성 완료 (${Math.round(duration / 1000)}초)`,
      artifactId: artifact.id, stepId: step.id
    });
    // 승인 요청 메시지
    addMessage({
      projectId: project.id, role: 'assistant', kind: 'approval_request',
      content: `내용을 확인하고 "승인" 또는 수정 지시를 입력해주세요.`,
      stepId: step.id
    });

    return { ok: true, artifactId: artifact.id };
  } catch (err) {
    const duration = Date.now() - startedAt;
    const retryCount = (step.retry_count || 0) + 1;
    const shouldRetry = retryCount < 3;

    // P2-1: 실패한 시도의 콘텐츠를 output_content에 저장 → 다음 시도에서 replanContext.previousContent로 활용
    // (saveArtifact는 성공 시에만 호출되므로 여기서 저장한 output_content가 다른 흐름과 충돌하지 않음)
    db.prepare(`
      UPDATE pipeline_steps
      SET status = ?,
          error_message = ?,
          retry_count = ?,
          duration_ms = ?,
          output_content = COALESCE(?, output_content)
      WHERE id = ?
    `).run(shouldRetry ? 'pending' : 'failed', err.message, retryCount, duration, lastContent, step.id);

    // P2-2: Reflexion — 실패 패턴을 skill_lessons에 누적 (다음 실행 시 systemPrompt에 주입)
    let failurePattern = null;
    try {
      failurePattern = classifyFailurePattern(err.message);
      const lesson = failurePattern && PATTERN_LESSONS[failurePattern];
      if (failurePattern && lesson && step.skill_name) {
        recordLesson(step.skill_name, failurePattern, lesson);
      }
    } catch (lessonErr) {
      console.warn('[lessons] 기록 실패:', lessonErr.message);
    }

    // A10: error_log 영구 기록 — 운영 진단 대시보드/사후 분석용
    try {
      logError({
        source: 'pipeline-worker',
        code: failurePattern || 'PIPELINE_STEP_FAILED',
        message: err.message,
        stack: err.stack,
        context: {
          skill: step.skill_name,
          step: step.step,
          retry: retryCount,
          willRetry: shouldRetry
        },
        pipelineId: step.pipeline_id,
        stepId: step.id
      });
    } catch (logErr) {
      console.warn('[error_log] 기록 실패:', logErr.message);
    }

    logActivity('pipeline_step', step.id, 'failed', `${err.message} (retry ${retryCount})`, null);

    // 매 시도마다 실패 로그를 채팅에 표시 (사용자가 진행 상황 파악)
    try {
      const project = db.prepare('SELECT id FROM projects WHERE id = (SELECT project_id FROM pipelines WHERE id = ?)').get(step.pipeline_id);
      if (project) {
        const stepLabel = STEP_LABELS[step.step] || step.step;
        const friendly = humanizeError(err.message, stepLabel);
        if (shouldRetry) {
          addMessage({
            projectId: project.id, role: 'system', kind: 'status',
            content: `⚠️ ${friendly} (${retryCount}/3회 자동 재시도)`,
            stepId: step.id
          });
        } else {
          addMessage({
            projectId: project.id, role: 'system', kind: 'error',
            content: `❌ ${stepLabel}: ${friendly}\n\n3회 모두 실패했습니다. 선택해주세요:\n• \`/retry\` — 다시 시도\n• \`/skip\` — 이 단계 건너뜀\n• 자유 텍스트 — 추가 지시(예: "더 짧게", "특정 섹션 보강")`,
            stepId: step.id
          });
        }
      }
    } catch {}

    if (!shouldRetry) {
      // Escalation — admin 알림
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all();
      for (const a of admins) {
        notify(a.id, 'step_failed', 'pipeline_step', step.id,
          `단계 실행이 3회 연속 실패했습니다: ${err.message}`);
      }
    }

    return { ok: false, error: err.message };
  }
}

// Critical #1: pending step 을 atomic 으로 claim — SELECT-then-UPDATE 사이 race window 제거.
//   - 단일 트랜잭션 안에서 후보 SELECT + status='running' UPDATE 동시 수행
//   - 두 워커(또는 tick 중첩)가 같은 row 를 동시에 잡는 것을 SQLite 직렬화로 방지
//   - 다중 동시 step 처리는 Critical #4 에서 외부 루프(concurrency) 로 구현
const _claimNextStep = db.transaction(() => {
  const row = db.prepare(`
    SELECT s.*, p.project_id FROM pipeline_steps s
    JOIN pipelines p ON p.id = s.pipeline_id
    WHERE s.status = 'pending'
      AND p.status NOT IN ('paused', 'cancelled', 'completed', 'failed')
      AND NOT EXISTS (
        SELECT 1 FROM pipeline_steps prev
        WHERE prev.pipeline_id = s.pipeline_id
          AND prev.step_order < s.step_order
          AND prev.status NOT IN ('approved', 'skipped')
      )
    ORDER BY s.id ASC LIMIT 1
  `).get();
  if (!row) return null;
  db.prepare(`
    UPDATE pipeline_steps SET status = 'running', started_at = datetime('now') WHERE id = ?
  `).run(row.id);
  return { ...row, status: 'running' };
});

// Critical #4: 다중 step 동시 처리 — 환경변수 PIPELINE_WORKER_CONCURRENCY 로 제어
//   기본 2 (보수적). LLM 호출은 분 단위라 N=1 이면 SaaS 확장 0.
//   in-flight 카운터로 동시 실행 수 제한. 각 tick 사이클당 최대 (concurrency - inflight) 만큼 신규 claim.
const CONCURRENCY = Math.max(1, parseInt(process.env.PIPELINE_WORKER_CONCURRENCY || '2', 10));
let _inflight = 0;

// 워커 사이클: 가용 슬롯만큼 pending step 을 claim 해 병렬 실행
// v25-26: 분산 워커 분기
//   claude-code  : OAuth 필요. 컨테이너에 ~/.claude/credentials 없으면 워커 위임.
//   claude-api   : API 키만 있으면 서버 직접 처리.
//   mock         : 서버 직접 처리 (가짜 응답).
const WORKER_MODE_ENV = (process.env.WORKER_MODE || '').toLowerCase();

// 컨테이너에 ~/.claude/credentials 있는지 자동 감지 (캐시)
let _cachedHasOAuth = null;
function hasLocalClaudeOAuth() {
  if (_cachedHasOAuth !== null) return _cachedHasOAuth;
  try {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const home = os.homedir();
    const candidates = [
      path.join(home, '.claude', 'credentials.json'),
      path.join(home, '.claude', '.credentials.json'),
      path.join(home, '.claude', 'credentials')
    ];
    _cachedHasOAuth = candidates.some(p => fs.existsSync(p));
  } catch {
    _cachedHasOAuth = false;
  }
  return _cachedHasOAuth;
}

function shouldDelegateToWorker() {
  if (WORKER_MODE_ENV === 'queue-only') return true;
  if (WORKER_MODE_ENV === 'local') return false;
  try {
    const { getSetting } = require('../db');
    const provider = getSetting('ai_provider') || 'mock';
    if (provider !== 'claude-code') return false;
    // claude-code + 컨테이너에 OAuth 없음 → 자동 위임
    return !hasLocalClaudeOAuth();
  } catch {
    return false;
  }
}

async function tick() {
  if (_running) return;
  _running = true;
  try {
    // 모드 무관 — heartbeat 끊긴 워커 작업 회수
    recoverStaleClaims();

    // claude-code 모드: 서버는 claim 하지 않음. 외부 워커가 OAuth 로 처리.
    //   claude-api / mock 모드: 서버가 직접 처리 (아래 while 루프).
    if (shouldDelegateToWorker()) {
      return;
    }

    while (_inflight < CONCURRENCY) {
      const step = _claimNextStep();
      if (!step) break;
      _inflight++;
      // fire-and-forget — 다음 claim 즉시 시도
      (async () => {
        try {
          await executeStep(step);
          updatePipelineStatus(step.pipeline_id);
        } catch (err) {
          console.error('[pipeline-worker] executeStep error:', err);
        } finally {
          _inflight--;
        }
      })();
    }
  } catch (err) {
    console.error('[pipeline-worker] tick error:', err);
  } finally {
    _running = false;
  }
}

// v25: heartbeat 끊긴 워커 작업 회수
//   외부 워커가 죽거나 네트워크 단절 → status='running' 인 채 멈춤
//   60초 heartbeat 미수신 시 status='pending'으로 되돌려 재claim 가능하게 함
//   서버 사이드 worker_id (NULL) 와 외부 워커 작업 (worker_id NOT NULL) 모두 적용
function recoverStaleClaims() {
  try {
    const STALE_TIMEOUT_SEC = parseInt(process.env.WORKER_STALE_SEC || '60', 10);
    const cutoffIso = new Date(Date.now() - STALE_TIMEOUT_SEC * 1000).toISOString();
    const stale = db.prepare(`
      SELECT id, pipeline_id, worker_id, retry_count, claimed_at, heartbeat_at
      FROM pipeline_steps
      WHERE status = 'running' AND worker_id IS NOT NULL
        AND COALESCE(heartbeat_at, claimed_at) < ?
    `).all(cutoffIso);

    if (stale.length === 0) return;

    for (const s of stale) {
      const retryCount = s.retry_count || 0;
      const canRecover = retryCount < 3;
      if (canRecover) {
        db.prepare(`
          UPDATE pipeline_steps
          SET status='pending',
              worker_id=NULL, claim_token=NULL, claimed_at=NULL, heartbeat_at=NULL,
              retry_count=?,
              error_message=?
          WHERE id = ? AND status='running'
        `).run(retryCount + 1, `[stale-claim] 워커 ${s.worker_id} heartbeat 단절 (${STALE_TIMEOUT_SEC}s)`, s.id);
        logActivity && logActivity('pipeline_step', s.id, 'stale_recovered',
          `worker=${s.worker_id} → pending (retry ${retryCount + 1}/3)`, null);
      } else {
        db.prepare(`
          UPDATE pipeline_steps
          SET status='failed',
              error_message=?,
              completed_at=datetime('now')
          WHERE id = ? AND status='running'
        `).run(`[stale-claim] 재시도 한도 초과: 워커 ${s.worker_id} heartbeat 단절`, s.id);
        logActivity && logActivity('pipeline_step', s.id, 'stale_failed',
          `worker=${s.worker_id} 재시도 한도 초과`, null);
      }
      updatePipelineStatus(s.pipeline_id);
    }
  } catch (err) {
    console.warn('[pipeline-worker] recoverStaleClaims error:', err.message);
  }
}

function updatePipelineStatus(pipelineId) {
  const pipeline = db.prepare('SELECT status FROM pipelines WHERE id = ?').get(pipelineId);
  if (!pipeline) return;

  const steps = db.prepare('SELECT status FROM pipeline_steps WHERE pipeline_id = ?').all(pipelineId);
  const total = steps.length;
  if (total === 0) return;

  const doneCount = steps.filter(s => s.status === 'approved').length;
  const progress = Math.round((doneCount / total) * 100);

  // paused/cancelled는 사용자가 명시적으로 설정한 상태 — 진행률만 갱신, status는 유지
  if (pipeline.status === 'paused' || pipeline.status === 'cancelled') {
    db.prepare('UPDATE pipelines SET progress = ? WHERE id = ?').run(progress, pipelineId);
    return;
  }

  const statuses = new Set(steps.map(s => s.status));
  let pipelineStatus = 'running';

  if (statuses.has('failed')) pipelineStatus = 'failed';
  else if (statuses.size === 1 && statuses.has('approved')) pipelineStatus = 'completed';
  else if (statuses.has('running')) pipelineStatus = 'running';
  else if (statuses.has('awaiting_approval')) pipelineStatus = 'running';
  else if (statuses.has('pending')) pipelineStatus = 'running';

  db.prepare('UPDATE pipelines SET status = ?, progress = ? WHERE id = ?').run(pipelineStatus, progress, pipelineId);

  // U-G10: 파이프라인 종료(완료/실패) 전이 시 외부 알림 — 상태 변화 시 1회만
  if ((pipelineStatus === 'completed' || pipelineStatus === 'failed') && pipeline.status !== pipelineStatus) {
    try {
      const project = db.prepare('SELECT id, code, name FROM projects WHERE id = ?').get(pipeline.project_id);
      if (project) {
        const { notifyPipelineFinal } = require('./external-notify');
        const baseUrl = process.env.PUBLIC_BASE_URL || '';
        const failedStep = steps.find(s => s.status === 'failed');
        const summary = pipelineStatus === 'completed'
          ? `총 ${total}단계 모두 승인 완료 (${doneCount}/${total})`
          : `${failedStep ? `실패 단계: ${failedStep.step}` : '실패 발생'} · 진행률 ${progress}%`;
        notifyPipelineFinal({ project, status: pipelineStatus, summary, baseUrl });
      }
    } catch { /* 흡수 */ }
  }
}

// 파이프라인 일시정지 — 다음 tick부터 실행 보류
function pausePipeline(pipelineId, userId) {
  const p = db.prepare('SELECT status FROM pipelines WHERE id = ?').get(pipelineId);
  if (!p) return { ok: false, error: 'Pipeline not found' };
  if (!['running', 'pending'].includes(p.status)) {
    return { ok: false, error: `Cannot pause pipeline in status: ${p.status}` };
  }
  db.prepare("UPDATE pipelines SET status = 'paused' WHERE id = ?").run(pipelineId);
  logActivity('pipeline', pipelineId, 'paused', null, userId);
  return { ok: true, status: 'paused' };
}

// 파이프라인 재개 — running으로 복원
function resumePipeline(pipelineId, userId) {
  const p = db.prepare('SELECT status FROM pipelines WHERE id = ?').get(pipelineId);
  if (!p) return { ok: false, error: 'Pipeline not found' };
  if (p.status !== 'paused') {
    return { ok: false, error: `Cannot resume pipeline in status: ${p.status}` };
  }
  db.prepare("UPDATE pipelines SET status = 'running' WHERE id = ?").run(pipelineId);
  logActivity('pipeline', pipelineId, 'resumed', null, userId);
  // 재개 직후 즉시 status 재계산 (모든 step이 approved면 completed로)
  updatePipelineStatus(pipelineId);
  return { ok: true, status: 'running' };
}

// 파이프라인 취소 — 모든 pending/running/awaiting_approval step을 cancelled 처리
function cancelPipeline(pipelineId, userId) {
  const p = db.prepare('SELECT status FROM pipelines WHERE id = ?').get(pipelineId);
  if (!p) return { ok: false, error: 'Pipeline not found' };
  if (['completed', 'cancelled', 'failed'].includes(p.status)) {
    return { ok: false, error: `Cannot cancel pipeline in status: ${p.status}` };
  }

  // 실행 중 provider 강제 종료 (best-effort)
  try {
    const { getProvider } = require('./model-bridge');
    const prov = getProvider();
    if (prov && typeof prov.cancel === 'function') prov.cancel();
  } catch {}

  db.exec('BEGIN');
  try {
    // 미완료 step → skipped 처리 (cancelled는 step CHECK에 없음, skipped로 통일)
    db.prepare(`
      UPDATE pipeline_steps
      SET status = 'skipped', error_message = COALESCE(error_message, '') || ' [pipeline cancelled]'
      WHERE pipeline_id = ? AND status IN ('pending','running','awaiting_approval','failed')
    `).run(pipelineId);

    db.prepare("UPDATE pipelines SET status = 'cancelled', completed_at = datetime('now') WHERE id = ?").run(pipelineId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return { ok: false, error: err.message };
  }

  logActivity('pipeline', pipelineId, 'cancelled', null, userId);
  return { ok: true, status: 'cancelled' };
}

// 승인 시 다음 단계를 pending으로 전환
function approveStep(stepId, userId) {
  const step = db.prepare('SELECT * FROM pipeline_steps WHERE id = ?').get(stepId);
  if (!step) return { ok: false, error: 'Step not found' };
  if (step.status !== 'awaiting_approval') {
    return { ok: false, error: `Cannot approve step in status: ${step.status}` };
  }
  db.prepare(`
    UPDATE pipeline_steps
    SET status = 'approved', approved_by = ?, approved_at = datetime('now')
    WHERE id = ?
  `).run(userId, stepId);

  // 다음 단계(step_order 기준) pending으로
  const next = db.prepare(`
    SELECT id FROM pipeline_steps
    WHERE pipeline_id = ? AND step_order > ? AND status = 'pending'
    ORDER BY step_order ASC LIMIT 1
  `).get(step.pipeline_id, step.step_order);
  // pending이면 이미 처리 대기 중. 단지 로그만.

  logActivity('pipeline_step', stepId, 'approved', step.step, userId);
  updatePipelineStatus(step.pipeline_id);
  return { ok: true, nextStep: next };
}

function rejectStep(stepId, userId, additionalPrompt = '') {
  const step = db.prepare('SELECT * FROM pipeline_steps WHERE id = ?').get(stepId);
  if (!step) return { ok: false, error: 'Step not found' };

  // 현재 실행 중인 이 step의 subprocess가 있으면 강제 종료
  try {
    const { cancelInvocation } = require('./model-bridge');
    cancelInvocation(`step-${step.id}`); // prefix 매칭으로는 불가하니 best-effort
    // 좀 더 공격적으로: 해당 step이 running이었다면 전체 provider cancel
    if (step.status === 'running') {
      const { getProvider } = require('./model-bridge');
      const p = getProvider();
      if (p && typeof p.cancel === 'function') p.cancel();
    }
  } catch {}

  // 재실행 — 해당 step을 pending으로 되돌림
  db.prepare(`
    UPDATE pipeline_steps
    SET status = 'pending', retry_count = 0, error_message = ?, approved_by = NULL, approved_at = NULL,
        output_file = NULL, output_content = NULL, meta_json = NULL, self_check_result = NULL,
        started_at = NULL, completed_at = NULL, duration_ms = NULL
    WHERE id = ?
  `).run(additionalPrompt ? `재작성 요청: ${additionalPrompt}` : null, stepId);

  // 연쇄 처리 — step_order 이후 단계 중 이미 진행된 것들을 초기화
  // 대상: approved / awaiting_approval / running / pending(이미 완료후 재pending됐을 수도) / failed
  //       단, 'skipped'는 유지 (사용자가 명시적으로 건너뛴 것)
  const downstream = db.prepare(`
    SELECT id, step, status, output_file FROM pipeline_steps
    WHERE pipeline_id = ? AND step_order > ? AND status != 'skipped'
  `).all(step.pipeline_id, step.step_order);

  let resetCount = 0;
  for (const ds of downstream) {
    // running 중이면 가능한 한 정리 (provider 레벨 cancel은 P3-B에서)
    db.prepare(`
      UPDATE pipeline_steps
      SET status = 'pending', retry_count = 0, error_message = NULL,
          approved_by = NULL, approved_at = NULL,
          output_file = NULL, output_content = NULL, meta_json = NULL, self_check_result = NULL,
          started_at = NULL, completed_at = NULL, duration_ms = NULL
      WHERE id = ?
    `).run(ds.id);

    // 해당 step의 artifact 정리 (DB 레코드 삭제 — 파일은 유지)
    // messages.artifact_id FK 제약 회피: artifact 참조하는 messages를 먼저 NULL 처리
    db.prepare(`UPDATE messages SET artifact_id = NULL WHERE artifact_id IN (SELECT id FROM artifacts WHERE pipeline_step_id = ?)`).run(ds.id);
    db.prepare('DELETE FROM artifacts WHERE pipeline_step_id = ?').run(ds.id);
    resetCount++;
  }

  // 해당 step 자체의 이전 artifact 레코드도 정리 (중복 방지)
  db.prepare(`UPDATE messages SET artifact_id = NULL WHERE artifact_id IN (SELECT id FROM artifacts WHERE pipeline_step_id = ?)`).run(stepId);
  db.prepare('DELETE FROM artifacts WHERE pipeline_step_id = ?').run(stepId);

  logActivity('pipeline_step', stepId, 'rejected',
    `${additionalPrompt || '재작성 요청'} (하위 ${resetCount}개 step 연쇄 초기화)`, userId);
  return { ok: true, reset_downstream: resetCount };
}

function retryStep(stepId, userId) {
  const step = db.prepare('SELECT pipeline_id FROM pipeline_steps WHERE id = ?').get(stepId);
  db.prepare(`
    UPDATE pipeline_steps
    SET status = 'pending', retry_count = 0, error_message = NULL
    WHERE id = ? AND status = 'failed'
  `).run(stepId);
  if (step) {
    db.prepare(`
      UPDATE pipelines SET status = 'running', completed_at = NULL
      WHERE id = ? AND status IN ('failed', 'paused', 'cancelled')
    `).run(step.pipeline_id);
  }
  logActivity('pipeline_step', stepId, 'retry', null, userId);
  return { ok: true };
}

// 파이프라인 내 모든 failed step을 일괄 재시도. 파이프라인 상태도 'failed/cancelled' → 'running' 복귀
function retryFailedSteps(pipelineId, userId) {
  const failedSteps = db.prepare(`
    SELECT id, step FROM pipeline_steps
    WHERE pipeline_id = ? AND status = 'failed'
    ORDER BY step_order
  `).all(pipelineId);

  if (failedSteps.length === 0) {
    return { ok: false, error: '실패한 step이 없습니다' };
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE pipeline_steps
      SET status = 'pending', retry_count = 0, error_message = NULL,
          started_at = NULL, completed_at = NULL, duration_ms = NULL
      WHERE pipeline_id = ? AND status = 'failed'
    `).run(pipelineId);
    db.prepare(`
      UPDATE pipelines SET status = 'running', completed_at = NULL
      WHERE id = ? AND status IN ('failed', 'paused', 'cancelled')
    `).run(pipelineId);
  });
  tx();

  for (const s of failedSteps) {
    logActivity('pipeline_step', s.id, 'retry', `(전체 실패 재시도)`, userId);
  }
  logActivity('pipeline', pipelineId, 'retry_all', `${failedSteps.length}개 step 재시도`, userId);
  return { ok: true, retried: failedSteps.length, steps: failedSteps.map(s => s.step) };
}

// 좀비 정리 — 서버 시작 시 메모리에 child가 없으므로 'running' 또는 오래된 'pending'은 모두 좀비
// 처리 정책:
//   - 'running' 좀비: retry_count < 3 이면 'pending'으로 복원 (자동 재실행) / >= 3이면 'failed'
//   - started_at이 1시간 넘은 'pending' (worker가 죽은 사이 찍혔지만 진행 안된 것): 그대로 유지하고 알림만
function recoverZombies() {
  const runningZombies = db.prepare(`
    SELECT id, pipeline_id, step, retry_count, error_message, started_at FROM pipeline_steps WHERE status = 'running'
  `).all();

  if (runningZombies.length > 0) {
    console.log(`[pipeline-worker] Recovering ${runningZombies.length} running zombie step(s)`);
    for (const z of runningZombies) {
      const retryCount = z.retry_count || 0;
      const canRecover = retryCount < 3;
      const reason = z.error_message || '서버 재시작 중에 작업이 중단됨';

      if (canRecover) {
        // 재시도 가능 — pending으로 복원하고 retry_count 증가
        db.prepare(`
          UPDATE pipeline_steps
          SET status = 'pending', retry_count = ?, error_message = ?, started_at = NULL
          WHERE id = ?
        `).run(retryCount + 1, `[zombie-recovered] ${reason}`, z.id);
        logActivity('pipeline_step', z.id, 'zombie_recovered', `running → pending (retry ${retryCount + 1}/3)`, null);
      } else {
        // 재시도 한도 초과 — failed
        db.prepare(`
          UPDATE pipeline_steps
          SET status = 'failed', error_message = ?, completed_at = datetime('now')
          WHERE id = ?
        `).run(`[zombie-failed] 재시도 한도 초과: ${reason}`, z.id);
        logActivity('pipeline_step', z.id, 'zombie_failed', `재시도 한도 초과 (${retryCount}/3)`, null);
      }
      updatePipelineStatus(z.pipeline_id);
    }
  }

  // 서버 stuck 감지 — worker_lock이 있다면 해제 (better-sqlite3는 자체 락이라 OS 레벨 락은 없지만 in-process 락 변수는 리셋)
  _running = false;
}

// v28: 운영 중 stale claim 회수 — 분산 워커가 heartbeat 끊긴 채로 running 상태에 묶인 step 복원
//   recoverZombies (서버 부팅 시 1회) 와 다름. 본 함수는 30초마다 호출되어 워커가 죽어도 자동 복구.
//   임계: heartbeat_at 또는 started_at 이 5분 이상 끊긴 running step (doctor 의 stale 임계와 일치)
const STALE_THRESHOLD_MIN = 5;
function recoverStaleClaims() {
  const stale = db.prepare(`
    SELECT id, pipeline_id, retry_count, worker_id, heartbeat_at
    FROM pipeline_steps
    WHERE status = 'running'
      AND (heartbeat_at IS NULL OR heartbeat_at < datetime('now', ?))
      AND (started_at IS NULL OR started_at < datetime('now', ?))
  `).all(`-${STALE_THRESHOLD_MIN} minutes`, `-${STALE_THRESHOLD_MIN} minutes`);
  if (stale.length === 0) return;
  console.log(`[pipeline-worker] Recovering ${stale.length} stale claim(s) — heartbeat ${STALE_THRESHOLD_MIN}min+ 미수신`);
  for (const z of stale) {
    const retryCount = z.retry_count || 0;
    const canRecover = retryCount < 3;
    const workerLabel = z.worker_id || 'unknown';
    if (canRecover) {
      db.prepare(`
        UPDATE pipeline_steps
        SET status='pending', retry_count=?, error_message=?, started_at=NULL, worker_id=NULL, heartbeat_at=NULL
        WHERE id=?
      `).run(retryCount + 1, `[stale-recovered] worker ${workerLabel} heartbeat ${STALE_THRESHOLD_MIN}min+ 미수신`, z.id);
      logActivity('pipeline_step', z.id, 'stale_recovered', `running → pending (retry ${retryCount + 1}/3) worker=${workerLabel}`, null);
    } else {
      db.prepare(`
        UPDATE pipeline_steps
        SET status='failed', error_message=?, completed_at=datetime('now')
        WHERE id=?
      `).run(`[stale-failed] 재시도 한도 초과 (worker ${workerLabel} heartbeat ${STALE_THRESHOLD_MIN}min+ 미수신)`, z.id);
      logActivity('pipeline_step', z.id, 'stale_failed', `재시도 한도 초과 (${retryCount}/3) worker=${workerLabel}`, null);
    }
    updatePipelineStatus(z.pipeline_id);
  }
}

function start() {
  if (_interval) return;
  recoverZombies();
  console.log(`[pipeline-worker] Started (polling every 2s, concurrency=${CONCURRENCY}, stale-recovery every 30s)`);
  _interval = setInterval(() => { tick().catch(console.error); }, 2000);
  // v28: stale claim 회수 — 워커가 죽어 heartbeat 끊긴 running step 을 30초마다 검사
  _staleInterval = setInterval(() => {
    try { recoverStaleClaims(); } catch (e) { console.error('[pipeline-worker] recoverStaleClaims error:', e); }
  }, 30000);
}

function stop() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  if (_staleInterval) { clearInterval(_staleInterval); _staleInterval = null; }
}

module.exports = { start, stop, tick, approveStep, rejectStep, retryStep, retryFailedSteps, updatePipelineStatus, pausePipeline, resumePipeline, cancelPipeline };
