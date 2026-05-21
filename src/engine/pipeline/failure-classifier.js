// 실패 패턴 분류 + 개선 지시 도출 + 휴먼화
// pipeline-worker.js에서 분리 (A4 모듈 분할). 순수 함수 — 외부 의존 없음.

// 에러 메시지 휴먼화 — 기술적 stack/원문을 사용자 친화적 1줄로 변환
// (raw는 디버그 용도로 콘솔/DB에는 그대로 보존, 채팅에만 변환된 메시지 사용)
function humanizeError(rawMessage, stepLabel) {
  if (!rawMessage) return '알 수 없는 오류가 발생했습니다';
  const m = String(rawMessage);

  if (/\[reviewer\]\s*품질 점수\s*(\d+)/.test(m)) {
    const score = m.match(/(\d+)점/)?.[1];
    return `품질 점수 ${score}점 미달 — 자동으로 다시 생성합니다 (사유 원문은 로그 참조)`;
  }
  if (/\[self-check\]\s*스킬이 FAIL/.test(m)) {
    return `스킬 자가검증 실패 — 응답 내용에 부족한 부분이 있어 다시 생성합니다`;
  }
  if (/\[품질 검증 실패\]/.test(m)) {
    if (/응답 길이 부족/.test(m)) return `${stepLabel} 결과가 너무 짧음 (요약/메타 응답으로 판단) — 재시도`;
    if (/메타 응답 패턴/.test(m)) return `${stepLabel}: 모델이 권한/확인 질문으로 응답 — 재시도`;
    if (/마크다운 섹션 부족/.test(m)) return `${stepLabel} 결과 구조 부족 — 재시도`;
    return `${stepLabel} 품질 기준 미달 — 재시도`;
  }
  if (/Timeout|killed/i.test(m)) {
    return `${stepLabel} 실행 시간 초과 — 모델이 응답하지 않거나 너무 오래 걸렸습니다 (재시도 권장)`;
  }
  if (/ECONNREFUSED|ENOTFOUND|getaddrinfo/i.test(m)) {
    return `네트워크 연결 실패 — Provider/CLI 연결을 확인하세요 (\`/doctor\` 실행 권장)`;
  }
  if (/API key|authentication|unauthorized/i.test(m)) {
    return `Provider 인증 실패 — 설정 → Provider에서 API 키/CLI 로그인을 확인하세요`;
  }
  if (/rate limit/i.test(m)) {
    return `Provider 요청 한도 초과 — 잠시 후 다시 시도하거나 다른 Provider로 전환하세요`;
  }
  if (/Empty response/i.test(m)) {
    return `Provider가 빈 응답 반환 — CLI 상태 확인 필요`;
  }
  if (/post-process timeout/i.test(m)) {
    return `${stepLabel} 후처리 스크립트 타임아웃 — 입력 데이터 크기를 확인하세요`;
  }

  return m.split('\n')[0].slice(0, 200);
}

// 에러 메시지 → 패턴 키 분류 (P2-2: Reflexion 누적용)
function classifyFailurePattern(rawMessage) {
  if (!rawMessage) return null;
  const m = String(rawMessage);
  if (/응답 길이 부족/.test(m) || /최소 \d+자/.test(m)) return 'short_response';
  if (/메타 응답 패턴/.test(m) || /권한이?\s*필요/.test(m) || /Would you like me to/i.test(m)) return 'meta_response';
  if (/마크다운 섹션 부족/.test(m) || /H1\/H2/.test(m)) return 'missing_sections';
  if (/\[reviewer\]\s*품질 점수/.test(m)) return 'reviewer_low_score';
  if (/self-check.*FAIL/i.test(m)) return 'self_check_fail';
  if (/Empty response/i.test(m)) return 'empty_response';
  if (/Timeout|killed/i.test(m)) return 'timeout';
  if (/ECONNREFUSED|ENOTFOUND/i.test(m)) return 'network_error';
  if (/rate limit/i.test(m)) return 'rate_limit';
  return 'other';
}

// 패턴 → lesson 텍스트 매핑 (skill_lessons.lesson에 저장. 다음 실행 시 systemPrompt에 주입)
const PATTERN_LESSONS = {
  short_response: '이전에 응답이 너무 짧아 실패한 적이 있습니다. 최소 800단어 이상의 충실한 본문을 작성하세요.',
  meta_response: '이전에 "권한이 필요합니다", "저장하시겠습니까" 같은 메타 응답으로 실패한 적이 있습니다. 본문을 즉시 출력하세요.',
  missing_sections: '이전에 H1/H2 섹션이 부족해 실패한 적이 있습니다. 명확한 헤더로 섹션을 구분하세요.',
  reviewer_low_score: '이전에 reviewer 품질 점수가 60점 미만으로 실패한 적이 있습니다. 구체성·도메인 특화·실현 가능성을 강화하세요.',
  self_check_fail: '이전에 Self-Check FAIL로 실패한 적이 있습니다. 스킬 가이드의 체크리스트를 모두 통과하도록 작성하세요.',
  empty_response: '이전에 응답이 끝까지 출력되지 않아 실패한 적이 있습니다. META 블록까지 완성하세요.',
  timeout: '이전에 타임아웃으로 실패한 적이 있습니다. 핵심 내용에 집중하고 불필요한 장황한 서술을 피하세요.'
};

// 에러 메시지 → 다음 시도용 개선 지시 도출 (P2-1: Plan-Execute-Verify-Replan)
function deriveImprovements(rawMessage) {
  if (!rawMessage) return [];
  const m = String(rawMessage);
  const tips = [];

  if (/응답 길이 부족/.test(m) || /최소 \d+자/.test(m)) {
    tips.push('최소 800단어 이상의 충실한 본문을 작성하세요. 요약/메타 응답 금지.');
  }
  if (/메타 응답 패턴/.test(m) || /권한이?\s*필요/.test(m) || /Would you like me to/i.test(m)) {
    tips.push('권한 요청·확인 질문·"저장하시겠습니까" 같은 메타 응답 절대 금지. 본문을 바로 출력하세요.');
  }
  if (/마크다운 섹션 부족/.test(m) || /H1\/H2/.test(m)) {
    tips.push('H1/H2 헤더로 명확하게 섹션을 구분하세요. 최소 2개 이상의 헤더가 필요합니다.');
  }
  if (/\[reviewer\]\s*품질 점수/.test(m)) {
    tips.push('reviewer 채점 기준(구조 완결성 / 구체성 / 일관성 / 실현 가능성 / 품질 기준 준수)을 모두 충족하세요.');
    tips.push('일반론·제네릭 서술 대신 프로젝트 도메인에 특화된 수치·예시·고유명사를 넣으세요.');
  }
  if (/self-check.*FAIL/i.test(m)) {
    tips.push('스킬 가이드의 Self-Check 항목을 다시 점검하고, 빠진 섹션·필드를 모두 채우세요.');
  }
  if (/Empty response/i.test(m) || /Timeout/i.test(m)) {
    tips.push('응답을 끝까지 완성하세요. 중간에 끊지 말고 META 블록까지 출력해야 합니다.');
  }

  if (tips.length === 0) {
    tips.push('이전 실패 사유를 분석하고 동일한 실수를 반복하지 마세요.');
    tips.push('스킬 가이드의 모든 요구사항을 빠짐없이 반영하세요.');
  }

  return tips;
}

module.exports = { humanizeError, classifyFailurePattern, deriveImprovements, PATTERN_LESSONS };
