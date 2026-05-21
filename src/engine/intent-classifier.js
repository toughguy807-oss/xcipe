// 의도 분류기 — 사용자 한 줄 자연어를 받아 (type, level, scope) 추정.
//   - LLM 호출 없이 결정론적으로 동작 (mock/claude-code/claude-api 모두 동일 결과)
//   - intake-agent의 첫 turn 직전에 호출되어 slots 초기값을 채운다.
//   - confidence < THRESHOLD 이면 intake-agent가 다시 사용자에게 type/level 확인.
//
// 출력 스키마:
//   {
//     ok: true,
//     type: 'web' | 'booking' | 'ecommerce' | 'saas' | 'tourism',
//     level: 1..6,
//     scope: 'planning' | 'design' | 'publish' | 'fullstack' | 'deploy',
//     confidence: 0.0..1.0,
//     reasoning: string,           // 사람이 읽는 한 줄 근거
//     matched: { typeHits, levelHits }  // 디버깅용
//   }

const TYPE_KEYWORDS = {
  booking:   [/예약/i, /booking/i, /reserv/i, /\bappointment\b/i, /\bschedule\b/i],
  ecommerce: [/쇼핑/i, /결제/i, /상품/i, /장바구니/i, /\bshop\b/i, /\bcart\b/i, /\becommerce\b/i, /\bcheckout\b/i, /\bpayment\b/i],
  saas:      [/관리자/i, /어드민/i, /\badmin\b/i, /대시보드/i, /\bdashboard\b/i, /CMS/i, /CRM/i, /콘솔/i, /\bconsole\b/i],
  tourism:   [/관광/i, /여행/i, /투어/i, /\btour/i, /\btravel/i, /방문/i, /\bvisit/i],
  web:       [/홈페이지/i, /소개/i, /회사/i, /랜딩/i, /\blanding\b/i, /\bportfolio\b/i, /포트폴리오/i, /블로그/i, /\bblog\b/i]
};

// 완성 수준 키워드 — L1=기획만 .. L6=배포까지
const LEVEL_KEYWORDS = [
  { level: 1, patterns: [/기획만/i, /초안/i, /\bdraft\b/i, /\bplan(ning)? only\b/i, /기획서만/i] },
  { level: 2, patterns: [/풀기획/i, /화면설계/i, /와이어프레임/i, /\bwireframe/i, /\bSB\b/, /기획\s*\+\s*디자인/i] },
  { level: 3, patterns: [/SDD/i, /개발명세/i, /\bdev[\s-]?spec\b/i, /개발준비/i] },
  { level: 4, patterns: [/사이트\s*제작/i, /웹사이트/i, /퍼블리싱/i, /HTML/i, /웹페이지/i, /\bwebsite\b/i, /\bweb\s*page\b/i] },
  { level: 5, patterns: [/풀\s*앱/i, /\bapp\b/i, /API/i, /백엔드/i, /\bbackend\b/i, /프론트앱/i, /SPA/i, /react/i, /vue/i] },
  { level: 6, patterns: [/배포/i, /\bdeploy/i, /\bship\b/i, /운영/i, /production/i, /CI\/?CD/i, /도커/i, /docker/i] }
];

// type → 기본 level 매핑 (level 키워드가 없으면 type에서 추정)
const TYPE_DEFAULT_LEVEL = {
  booking: 4,    // 예약은 보통 풀 사이트
  ecommerce: 5,  // 결제·장바구니는 백엔드 동반
  saas: 5,       // 어드민도 백엔드 동반
  tourism: 4,
  web: 4         // 일반 사이트 (L4 = 사이트코드)
};

// scope = level 결과를 사람이 읽는 표현으로
function _scopeForLevel(level) {
  if (level <= 1) return 'planning';
  if (level <= 2) return 'design';
  if (level <= 4) return 'publish';
  if (level <= 5) return 'fullstack';
  return 'deploy';
}

function classify(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      ok: false,
      error: 'empty input',
      type: 'web', level: 4, scope: 'publish',
      confidence: 0, reasoning: '빈 입력 — 기본값(web/L4) 적용',
      matched: { typeHits: [], levelHits: [] }
    };
  }

  const input = text.trim();

  // 1) type 매칭 — 최다 hit 카테고리. tie면 우선순위 booking > ecommerce > saas > tourism > web
  const typeOrder = ['booking', 'ecommerce', 'saas', 'tourism', 'web'];
  const typeHits = [];
  let bestType = null;
  let bestTypeCount = 0;
  for (const t of typeOrder) {
    const hits = TYPE_KEYWORDS[t].filter(re => re.test(input));
    if (hits.length > 0) {
      typeHits.push({ type: t, count: hits.length, patterns: hits.map(r => r.source) });
      if (hits.length > bestTypeCount) {
        bestType = t;
        bestTypeCount = hits.length;
      }
    }
  }
  const typeMatched = !!bestType;
  if (!bestType) bestType = 'web';

  // 2) level 매칭 — 가장 높은 레벨 우선 (사용자가 "사이트 + 배포"라 하면 6)
  const levelHits = [];
  let bestLevel = null;
  for (const { level, patterns } of LEVEL_KEYWORDS) {
    const hits = patterns.filter(re => re.test(input));
    if (hits.length > 0) {
      levelHits.push({ level, count: hits.length, patterns: hits.map(r => r.source) });
      if (bestLevel === null || level > bestLevel) bestLevel = level;
    }
  }
  const levelMatched = bestLevel !== null;
  if (!levelMatched) bestLevel = TYPE_DEFAULT_LEVEL[bestType] ?? 4;

  // 3) confidence — type/level 매칭 여부와 hit 수 기반
  //    둘 다 매칭 = 0.9, type만 = 0.7, level만 = 0.6, 둘 다 미매칭 = 0.3
  let confidence;
  if (typeMatched && levelMatched) confidence = 0.9;
  else if (typeMatched)            confidence = 0.7;
  else if (levelMatched)           confidence = 0.6;
  else                             confidence = 0.3;
  // hit이 여러 개면 +0.05 (cap 0.95)
  if (bestTypeCount > 1) confidence = Math.min(0.95, confidence + 0.05);
  if (levelHits.length > 1) confidence = Math.min(0.95, confidence + 0.05);

  // 4) reasoning — 한 줄 근거
  const parts = [];
  if (typeMatched) parts.push(`type=${bestType} (키워드 ${bestTypeCount}개)`);
  else             parts.push(`type=${bestType} (기본값)`);
  if (levelMatched) parts.push(`level=${bestLevel} (키워드 매칭)`);
  else              parts.push(`level=${bestLevel} (type 기본값)`);
  const reasoning = parts.join(' · ');

  return {
    ok: true,
    type: bestType,
    level: bestLevel,
    scope: _scopeForLevel(bestLevel),
    confidence,
    reasoning,
    matched: { typeHits, levelHits }
  };
}

// 분류 결과를 intake slots 초기값으로 변환
//   - confidence가 충분(>=THRESHOLD)할 때만 type/completion_level 자동 채움.
//   - 부족하면 빈 슬롯으로 두어 intake-agent가 사용자에게 다시 묻도록.
const CONFIDENCE_THRESHOLD = 0.7;

function toInitialSlots(classification) {
  if (!classification || !classification.ok) return {};
  const slots = {};
  if (classification.confidence >= CONFIDENCE_THRESHOLD) {
    slots.type = classification.type;
    slots.completion_level = classification.level;
  }
  return slots;
}

module.exports = {
  classify,
  toInitialSlots,
  CONFIDENCE_THRESHOLD,
  TYPE_KEYWORDS,
  LEVEL_KEYWORDS
};
