#!/usr/bin/env node
// G5: RBAC 매트릭스 → docs/RBAC.md 자동 동기화
//
// 사용:
//   node scripts/sync-rbac-docs.js          → docs/RBAC.md 갱신
//   node scripts/sync-rbac-docs.js --check  → drift 감지 (변경 필요 시 exit 1)
//
// CI 통합 — `--check` 모드에서 drift 발견 시 빌드 실패. 개발자는 `--write`로 갱신.
const fs = require('fs');
const path = require('path');
const { ROUTE_MATRIX, CATEGORY_RULES, categorize, policyToText } = require('../src/rbac-matrix');

const DOCS_PATH = path.resolve(__dirname, '..', 'docs', 'RBAC.md');

function buildMarkdown() {
  const grouped = {};
  for (const [routeKey, def] of Object.entries(ROUTE_MATRIX)) {
    const cat = categorize(routeKey);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ routeKey, policy: def.policy });
  }

  const lines = [];
  lines.push('# RBAC 권한 매트릭스');
  lines.push('');
  lines.push('> **자동 생성 파일** — 직접 수정 금지. `src/rbac-matrix.js`를 수정한 뒤');
  lines.push('> `node scripts/sync-rbac-docs.js`로 재생성하세요.');
  lines.push('');
  lines.push('| 구분 | 의미 |');
  lines.push('| --- | --- |');
  lines.push('| 🌐 public | 인증 불필요 — 누구나 호출 가능 |');
  lines.push('| 🔐 authed | 로그인 필요, 역할 무관 |');
  lines.push('| 👤 admin / member / guest | 명시된 역할만 호출 가능 |');
  lines.push('');

  // 카테고리 순서대로 (CATEGORY_RULES) — '기타'는 마지막
  const orderedCats = CATEGORY_RULES.map(c => c.title).concat(['기타']);
  for (const cat of orderedCats) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    lines.push(`## ${cat}`);
    lines.push('');
    lines.push('| 메서드/경로 | 권한 정책 |');
    lines.push('| --- | --- |');
    for (const it of items) {
      lines.push(`| \`${it.routeKey}\` | ${policyToText(it.policy)} |`);
    }
    lines.push('');
  }

  // 통계
  const total = Object.keys(ROUTE_MATRIX).length;
  const byPolicy = { public: 0, authed: 0, admin_only: 0, admin_member: 0, other: 0 };
  for (const def of Object.values(ROUTE_MATRIX)) {
    if (def.policy === 'public') byPolicy.public++;
    else if (def.policy === 'authed') byPolicy.authed++;
    else if (typeof def.policy === 'object') {
      const r = def.policy.roles || [];
      if (r.length === 1 && r[0] === 'admin') byPolicy.admin_only++;
      else if (r.includes('admin') && r.includes('member')) byPolicy.admin_member++;
      else byPolicy.other++;
    }
  }
  lines.push('## 통계');
  lines.push('');
  lines.push(`- 총 라우트: **${total}**`);
  lines.push(`- 🌐 public: ${byPolicy.public}`);
  lines.push(`- 🔐 authed: ${byPolicy.authed}`);
  lines.push(`- 👤 admin only: ${byPolicy.admin_only}`);
  lines.push(`- 👤 admin + member: ${byPolicy.admin_member}`);
  if (byPolicy.other > 0) lines.push(`- 기타: ${byPolicy.other}`);
  lines.push('');

  return lines.join('\n');
}

function main() {
  const mode = process.argv[2] || '--write';
  const next = buildMarkdown();

  if (mode === '--check') {
    if (!fs.existsSync(DOCS_PATH)) {
      console.error(`✗ docs/RBAC.md 없음 — 먼저 \`node scripts/sync-rbac-docs.js\`로 생성하세요.`);
      process.exit(1);
    }
    const cur = fs.readFileSync(DOCS_PATH, 'utf8');
    if (cur.trim() !== next.trim()) {
      console.error('✗ docs/RBAC.md drift 발견 — `node scripts/sync-rbac-docs.js`로 재생성 후 커밋하세요.');
      process.exit(1);
    }
    console.log('✓ docs/RBAC.md is in sync with src/rbac-matrix.js');
    return;
  }

  // --write
  const dir = path.dirname(DOCS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const prior = fs.existsSync(DOCS_PATH) ? fs.readFileSync(DOCS_PATH, 'utf8') : '';
  if (prior.trim() === next.trim()) {
    console.log('✓ docs/RBAC.md unchanged (already in sync)');
    return;
  }
  fs.writeFileSync(DOCS_PATH, next);
  console.log(`✓ docs/RBAC.md generated (${Object.keys(ROUTE_MATRIX).length} routes)`);
}

main();
