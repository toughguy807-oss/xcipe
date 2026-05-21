#!/usr/bin/env node
/**
 * rewrite-marketing-copy.js
 *
 * HTML 산출물에서 마케팅 과잉어·placeholder·가짜 수치를 탐지하여
 * 재작성 후보 목록을 출력. 자동 교체는 하지 않고 사람이 결정.
 *
 * Usage:
 *   node rewrite-marketing-copy.js --html output/publish/index.html [--out report.json]
 *   (디렉토리 입력도 지원 — 재귀 탐색)
 *
 * 탐지 카테고리:
 *   - marketing-overhype : Elevate/Seamless/Unleash/Empower/Next-Gen 등
 *   - placeholder-name   : John Doe/Jane Doe/Acme/Lorem ipsum/Nexus/Globex
 *   - fake-clean-stat    : 99.99% / $100.00 / 10,000 / 24/7
 *   - lorem-ipsum        : Lorem/Bacon/Cupcake ipsum
 *   - emoji-overuse      : 한 페이지 이모지 5개 이상
 *
 * 판정:
 *   - 0건       = PASS
 *   - 1~3건     = WARN
 *   - 4건 이상  = FAIL
 */

const fs = require('node:fs');
const path = require('node:path');

const RULES = [
  {
    kind: 'marketing-overhype',
    re: /\b(Elevate|Seamless|Unleash|Empower|Next[- ]?Gen|Revolutionary|Cutting[- ]edge|World[- ]class|Game[- ]?changer)\b/gi,
    hint: '구체 동사 + 결과 수치로 교체 (예: "처리 시간 30% 단축")',
  },
  {
    kind: 'marketing-overhype-ko',
    re: /(혁신적|차세대|원활한|최첨단|세계\s*최고|업계\s*최고|차원이\s*다른|새로운\s*패러다임|게임\s*체인저|혁명적|독보적|압도적|초격차|올인원|토탈\s*솔루션|완벽한)/g,
    hint: '구체 동사 + 결과 수치로 교체 (예: "처리 시간 30% 단축", "재가공 비용 17% 절감")',
  },
  {
    kind: 'placeholder-name',
    re: /\b(John Doe|Jane Doe|Acme(?!\s*Corp)|Nexus(?!\s*Inc)|Globex|FooBar|Sample Inc)\b/gi,
    hint: '실제 고객 사례 또는 익명 인용 ("국내 대형 제조사 공정 엔지니어")',
  },
  {
    kind: 'placeholder-name-ko',
    re: /(홍길동|김철수|이영희|아무개|샘플\s*기업|예시\s*회사|테스트\s*고객|OO\s*회사|OO\s*기업|○○\s*회사|○○\s*기업)/g,
    hint: '실제 고객 사례 또는 익명 직책 인용 ("국내 대형 반도체 제조사 공정 엔지니어")',
  },
  {
    kind: 'fake-clean-stat',
    re: /\b(99\.99%|99\.9%|100,000|1,000,000|\$0\.00|\$100\.00|24\/7)\b/g,
    hint: '실측값 또는 organic messy data (94.7% / $87.23 / 9,472)',
  },
  {
    kind: 'fake-clean-stat-ko',
    re: /(99\.99%|99\.9%|24시간\s*365일|365일\s*24시간|업계\s*1위|국내\s*최초|세계\s*최초|국내\s*1위|글로벌\s*1위|점유율\s*1위)/g,
    hint: '실측값 또는 출처 명시 ("2025년 한국정보통신진흥협회 조사 기준 점유율 18.4%")',
  },
  {
    kind: 'lorem-ipsum',
    re: /Lorem ipsum|Bacon ipsum|Cupcake ipsum|Hipster ipsum/gi,
    hint: '실제 초안 카피로 교체. 자료 없으면 사용자에게 요청',
  },
];

function parseArgs() {
  const args = { html: null, out: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--html') args.html = argv[++i];
    else if (k === '--out') args.out = argv[++i];
  }
  return args;
}

function collectHtml(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let st;
      try { st = fs.statSync(p); } catch (e) { continue; }
      if (st.isDirectory()) walk(p);
      else if (/\.html?$/i.test(name)) files.push(p);
    }
  }
  walk(target);
  return files;
}

function getContext(text, matchIdx, matchLen, span = 50) {
  const start = Math.max(0, matchIdx - span);
  const end = Math.min(text.length, matchIdx + matchLen + span);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function countEmoji(text) {
  // Variation Selector + Emoji Presentation 우회: 단순 surrogate pair + 일반 이모지 범위
  const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  const m = text.match(re);
  return m ? m.length : 0;
}

function scanFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  const findings = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      findings.push({
        kind: rule.kind,
        match: m[0],
        context: getContext(text, m.index, m[0].length),
        hint: rule.hint,
        file: filePath,
      });
    }
  }

  const emoji = countEmoji(text);
  if (emoji >= 5) {
    findings.push({
      kind: 'emoji-overuse',
      match: `${emoji} 개`,
      context: '브랜드가 이모지 기반이 아닌 한 자제',
      hint: 'B2B/엔터프라이즈 사이트는 이모지 0~2개로 제한',
      file: filePath,
    });
  }

  return findings;
}

function main() {
  const args = parseArgs();
  if (!args.html) {
    console.error('Usage: --html <htmlFileOrDir> [--out <out.json>]');
    process.exit(2);
  }
  const files = collectHtml(args.html);
  if (files.length === 0) {
    console.error(`HTML 파일 없음: ${args.html}`);
    process.exit(2);
  }

  const findings = [];
  for (const f of files) findings.push(...scanFile(f));

  const byKind = findings.reduce((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {});

  const verdict = findings.length === 0 ? 'PASS' : findings.length <= 3 ? 'WARN' : 'FAIL';

  const result = {
    target: args.html,
    fileCount: files.length,
    total: findings.length,
    byKind,
    findings,
    verdict,
    note: '자동 교체 금지. kind별 hint를 참고하여 사용자/카피라이터가 재작성.',
  };

  const json = JSON.stringify(result, null, 2);
  if (args.out) fs.writeFileSync(args.out, json, 'utf8');
  console.log(json);
  process.exit(verdict === 'FAIL' ? 1 : 0);
}

main();
