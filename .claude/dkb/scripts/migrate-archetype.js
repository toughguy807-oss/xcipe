#!/usr/bin/env node
/**
 * migrate-archetype.js
 *
 * 기존 references DNA.md에 interaction_archetype + platform 필드를 추가한다.
 * 2026-05-15 v1.1 dkb-analyze 진화 plan Phase 1.
 *
 * 사용법:
 *   node migrate-archetype.js --dry-run    # 분류 결과만 출력
 *   node migrate-archetype.js --apply      # 실제 DNA.md 수정
 *
 * 휴리스틱:
 *   - DNA.md 본문 키워드 매칭 → 4사분면 1개 할당
 *   - 모호한 케이스는 showcase 기본 + manual review queue 출력
 *
 * 출력:
 *   ~/.claude/dkb/migration-archetype-{date}.log
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DKB_ROOT = path.join(os.homedir(), '.claude', 'dkb');
const REFERENCES_DIR = path.join(DKB_ROOT, 'references');
const TIERS = ['tier-1', 'tier-2', 'tier-3'];

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';

const KEYWORDS = {
  showcase: [
    'landing', '랜딩', 'marketing', '마케팅', '브랜드', 'brand',
    'portfolio', '포트폴리오', 'hero', 'editorial', '회사 홈',
    'agency', 'studio', 'showcase'
  ],
  explorer: [
    'dashboard', '대시보드', 'docs', '문서', 'search', '검색',
    'catalog', '카탈로그', 'directory', 'listing', 'archive', 'feed'
  ],
  converter: [
    'checkout', '결제', 'payment', '가입', 'signup', 'sign up',
    'pricing', '이벤트 LP', '1-step', 'cta', 'lead capture',
    'conversion', '전환'
  ],
  tool: [
    'editor', '에디터', 'tool', '도구', 'calculator', '계산기',
    'settings', '설정', 'workflow', '워크플로', 'config', 'console',
    'admin', 'panel'
  ]
};

function detectPlatform(content) {
  const hasMobile = /375|mobile|모바일/i.test(content);
  const hasDesktop = /1440|desktop|데스크톱/i.test(content);
  if (hasMobile && hasDesktop) return 'hybrid';
  if (hasMobile && !hasDesktop) return 'mobile';
  return 'web';
}

function detectArchetype(content) {
  const lower = content.toLowerCase();
  const scores = { showcase: 0, explorer: 0, converter: 0, tool: 0 };
  for (const [archetype, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = lower.match(re);
      if (matches) scores[archetype] += matches.length;
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [winner, runnerUp] = sorted;
  const confidence = winner[1] === 0
    ? 'unknown'
    : (winner[1] >= runnerUp[1] * 2 ? 'high' : 'low');
  return {
    archetype: winner[1] === 0 ? 'showcase' : winner[0],
    confidence,
    scores
  };
}

function hasArchetypeLine(content) {
  return /\*\*interaction_archetype\*\*\s*:/i.test(content);
}

function injectMetadata(content, archetype, platform) {
  const tierLineMatch = content.match(/(\*\*Tier\*\*\s*:[^\n]+)\n/);
  if (!tierLineMatch) return null;
  const injection = `**interaction_archetype**: ${archetype}\n**platform**: ${platform}\n`;
  return content.replace(
    tierLineMatch[0],
    tierLineMatch[0] + injection
  );
}

function processDir(tier, domain) {
  const dnaPath = path.join(REFERENCES_DIR, tier, domain, 'DNA.md');
  if (!fs.existsSync(dnaPath)) return { tier, domain, status: 'no-dna', reason: 'DNA.md missing' };

  const content = fs.readFileSync(dnaPath, 'utf8');
  if (hasArchetypeLine(content)) {
    return { tier, domain, status: 'skip', reason: 'already migrated' };
  }

  const { archetype, confidence, scores } = detectArchetype(content);
  const platform = detectPlatform(content);
  const needsReview = confidence === 'unknown' || confidence === 'low';

  if (MODE === 'apply') {
    const newContent = injectMetadata(content, archetype, platform);
    if (!newContent) {
      return { tier, domain, status: 'error', reason: 'Tier line not found' };
    }
    fs.writeFileSync(dnaPath, newContent, 'utf8');
  }

  return {
    tier, domain,
    status: needsReview ? 'review' : 'ok',
    archetype, platform, confidence, scores
  };
}

function main() {
  const date = new Date().toISOString().slice(0, 10);
  const logPath = path.join(DKB_ROOT, `migration-archetype-${date}.log`);
  const results = [];

  for (const tier of TIERS) {
    const tierDir = path.join(REFERENCES_DIR, tier);
    if (!fs.existsSync(tierDir)) continue;
    const domains = fs.readdirSync(tierDir).filter(d =>
      fs.statSync(path.join(tierDir, d)).isDirectory()
    );
    for (const domain of domains) {
      results.push(processDir(tier, domain));
    }
  }

  const stats = {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    review: results.filter(r => r.status === 'review').length,
    skip: results.filter(r => r.status === 'skip').length,
    error: results.filter(r => r.status === 'error').length,
    no_dna: results.filter(r => r.status === 'no-dna').length,
    by_archetype: {}
  };
  for (const r of results) {
    if (r.archetype) {
      stats.by_archetype[r.archetype] = (stats.by_archetype[r.archetype] || 0) + 1;
    }
  }

  const lines = [];
  lines.push(`# Archetype Migration — ${date} (${MODE})`);
  lines.push(``);
  lines.push(`## Stats`);
  lines.push(`- Total: ${stats.total}`);
  lines.push(`- OK (high confidence): ${stats.ok}`);
  lines.push(`- REVIEW (low/unknown confidence): ${stats.review}`);
  lines.push(`- SKIP (already migrated): ${stats.skip}`);
  lines.push(`- ERROR: ${stats.error}`);
  lines.push(`- NO-DNA: ${stats.no_dna}`);
  lines.push(``);
  lines.push(`## By archetype`);
  for (const [a, n] of Object.entries(stats.by_archetype)) {
    lines.push(`- ${a}: ${n}`);
  }
  lines.push(``);
  lines.push(`## Manual Review Queue (${stats.review} cases)`);
  for (const r of results.filter(r => r.status === 'review')) {
    lines.push(`- [ ] ${r.tier}/${r.domain} -> ${r.archetype} (confidence: ${r.confidence}, scores: ${JSON.stringify(r.scores)})`);
  }
  lines.push(``);
  lines.push(`## All Results`);
  for (const r of results) {
    if (r.status === 'ok' || r.status === 'review') {
      lines.push(`- ${r.tier}/${r.domain} -> archetype=${r.archetype} platform=${r.platform} confidence=${r.confidence}`);
    } else if (r.status === 'skip') {
      lines.push(`- ${r.tier}/${r.domain} -> SKIP (${r.reason})`);
    } else {
      lines.push(`- ${r.tier}/${r.domain} -> ${r.status.toUpperCase()} (${r.reason})`);
    }
  }

  fs.writeFileSync(logPath, lines.join('\n'), 'utf8');

  console.log(`Mode: ${MODE}`);
  console.log(`Total: ${stats.total}, OK: ${stats.ok}, REVIEW: ${stats.review}, SKIP: ${stats.skip}, ERROR: ${stats.error}`);
  console.log(`By archetype:`, stats.by_archetype);
  console.log(`Log: ${logPath}`);
  if (MODE === 'dry-run') {
    console.log(`\n[DRY-RUN] Files not modified. Run with --apply to commit.`);
  }
}

main();
