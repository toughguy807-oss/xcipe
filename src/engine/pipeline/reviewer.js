// reviewer 에이전트 — 산출물 채점 + META 파싱
// pipeline-worker.js에서 분리 (A4 모듈 분할)

const { db, recordTokenUsage, getSetting } = require('../../db');

// Major #7: reviewer 자가 채점 편향 완화 — 생성자와 다른 모델 사용 강제.
//   기본: 생성이 heavy(Opus) 면 review 는 light(Haiku). 생성이 light/medium 이면 review 는 heavy(Opus).
//   동일 모델은 점수 인플레이션 경향 → 무조건 다른 tier 강제.
//   settings.reviewer_model_override 가 설정되어 있으면 그 값 사용 (운영자 명시 선택).
function _pickReviewerModel(generatorTier) {
  const override = getSetting && getSetting('reviewer_model_override');
  if (override) return override;
  // generator 가 heavy → reviewer 는 light (빠른 검토자)
  // generator 가 light/medium → reviewer 는 heavy (신중한 검토자)
  if (generatorTier === 'heavy') return 'claude-haiku-4-5-20251001';
  return 'claude-opus-4-7';
}

// reviewer 에이전트 호출 — 산출물을 채점 (0~100)
//
// 입력 한계 처리:
//   - HTML/CSS/JS 산출물은 60KB+ 가능 → 첫 8000 만 보면 reviewer 가 "헤더만 보고 본문 미확인"
//     으로 false negative (구조 완결성 -5 → 78점 BLOCK)
//   - 해결: 산출물이 크면 첫 12000 + ··· + 마지막 6000 (총 18KB 발췌) 로 양끝 보여줌
//     → 시작 태그 + 본문 일부 + 종료 태그 + META 블록 모두 확인 가능
function _excerptForReview(content) {
  const MAX = 18000;
  const HEAD = 12000;
  const TAIL = 6000;
  if (!content || content.length <= MAX) return content || '';
  return content.slice(0, HEAD) + '\n\n... [중간 생략 — 산출물 크기 ' + content.length + ' byte] ...\n\n' + content.slice(-TAIL);
}

async function reviewArtifact({ skillName, content, project, pipelineId = null, stepId = null }) {
  const { getProvider, pickTier } = require('../model-bridge');
  const provider = getProvider();
  const excerpt = _excerptForReview(content);
  const reviewPrompt = `당신은 산출물 품질 검토자입니다. 아래 산출물을 0~100점으로 채점하세요.
대상 스킬: ${skillName}
프로젝트: ${project.name} (${project.code})

⚠️ 채점 원칙 (점수 인플레이션 방지)
- 기본 70점 시작. 결함 발견 시 감점, 우수 요소 발견 시 가점.
- "그럴듯해 보이는" 만으론 90점 불가. 90+ 는 구체적 차별화 근거 5종 모두 충족 시에만.
- 디폴트 답안/제네릭 서술은 60점 이하.

⚠️ 발췌 처리
- 큰 산출물(HTML/CSS/JS)은 본문 가운데가 "[중간 생략]" 으로 잘려 보일 수 있습니다.
- 시작·끝·META 블록이 정상이고 메타 카운트가 self-check 와 일치하면 "본문 잘림"으로 감점하지 마세요.
- "잘렸으니 구조 미확인" 같은 추측 감점 금지.

채점 기준 (각 20점, 결함 발견 시 마이너스):
1. 구조 완결성 — 섹션·항목 누락 없음 (누락 1건 -5)
2. 구체성 — 수치·고유명사·도메인 특화 포함 (제네릭 서술이면 -10)
3. 일관성 — 용어·ID·수치 내부 모순 없음 (모순 1건 -5)
4. 실현 가능성 — 현실 제약·예산·일정 반영 (비현실 가정 시 -10)
5. 품질 기준 준수 — 스킬 가이드 Self-Check 항목 충족

응답은 JSON만 반환 (코드 펜스 없이):
{"score": 숫자, "reason": "감점/가점 근거 한 줄"}

--- 산출물 시작 ---
${excerpt}
--- 산출물 끝 ---`;

  try {
    // 생성자 tier 와 다른 모델 선택 (자가 채점 편향 차단)
    const generatorTier = pickTier({ task: 'execute-skill', skillName });
    const reviewerModel = _pickReviewerModel(generatorTier);
    const res = await provider.sendMessage({
      task: 'review',
      skillName: 'reviewer',
      systemPrompt: '당신은 산출물 품질 검토자입니다. 점수 인플레이션 금지. JSON만 반환합니다.',
      userPrompt: reviewPrompt,
      model: reviewerModel,
      tier: generatorTier === 'heavy' ? 'light' : 'heavy'
    });
    if (res && res.tokens && res.model) {
      try {
        recordTokenUsage({
          projectId: project.id,
          pipelineId,
          stepId,
          skillName: 'reviewer',
          task: 'review',
          model: res.model,
          inputTokens: res.tokens.input || 0,
          outputTokens: res.tokens.output || 0
        });
      } catch (e) { /* 기록 실패는 채점을 막지 않음 */ }
    }
    if (!res.ok) return { score: null, reason: res.error };
    const match = (res.content || '').match(/\{[\s\S]*\}/);
    if (!match) return { score: null, reason: 'JSON 파싱 실패' };
    const parsed = JSON.parse(match[0]);
    const score = Math.max(0, Math.min(100, +parsed.score || 0));
    return { score, reason: parsed.reason || '' };
  } catch (err) {
    return { score: null, reason: err.message };
  }
}

// META 블록 파싱
function parseMeta(content) {
  const m = content.match(/<!--\s*META\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

module.exports = { reviewArtifact, parseMeta };
