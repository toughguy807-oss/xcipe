#!/usr/bin/env node
// bundle-claude.js — ~/.claude → D:/SYS_v4/.claude 일방향 미러링
//
// 동기화 대상 (원칙 1·2: xcipe 사용자는 claude code 설치만으로 동작해야 함):
//   - skills/        (전체)
//   - lib/rules/     (전체)
//   - ref/           (전체)
//   - commands/      (9개 슬래시 — /figma-pull /figma-push /status 등)
//   - agents/        (8개 오케스트레이터 — pm-router, *-orchestrator, reviewer)
//   - dkb/           (Design Knowledge Base — references/ + section-packs/)
//   - AGENTS.md
//   - SKILLS_CATALOG.md
//   - CLAUDE.md      (글로벌 메모리 — 번들 보유로 sync drift 0)
//
// 사용:
//   node scripts/bundle-claude.js              # 전역 → 번들 동기화
//   node scripts/bundle-claude.js --dry        # 변경사항만 출력
//   node scripts/bundle-claude.js --check      # drift 확인 (CI용)
//   node scripts/bundle-claude.js --reverse    # 번들 → 전역 (위험, 명시적 플래그)

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const CHECK = argv.includes('--check');
const REVERSE = argv.includes('--reverse');

const GLOBAL = path.join(os.homedir(), '.claude');
const BUNDLE = path.resolve(__dirname, '..', '.claude');

const SRC = REVERSE ? BUNDLE : GLOBAL;
const DST = REVERSE ? GLOBAL : BUNDLE;

const TARGETS = [
  { type: 'dir',  name: 'skills' },
  { type: 'dir',  name: 'lib' },
  { type: 'dir',  name: 'ref' },
  { type: 'dir',  name: 'commands' },
  { type: 'dir',  name: 'agents' },
  { type: 'dir',  name: 'dkb' },
  { type: 'file', name: 'AGENTS.md' },
  { type: 'file', name: 'SKILLS_CATALOG.md' },
  { type: 'file', name: 'CLAUDE.md' }
];

// 동기화 제외 패턴 — 경로에 포함되면 skip
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  '.cache',
  'dist',
  'build',
  '.tmp',
  '.lock'
];

function shouldIgnore(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return IGNORE_PATTERNS.some(pat => {
    // 디렉토리 또는 파일명 매칭
    return normalized === pat
      || normalized.startsWith(pat + '/')
      || normalized.includes('/' + pat + '/')
      || normalized.endsWith('/' + pat)
      || normalized.endsWith(pat) && pat.startsWith('.');
  });
}

let stats = { copied: 0, skipped: 0, deleted: 0, errors: 0, drift: [] };

function hashFile(p) {
  try {
    const buf = fs.readFileSync(p);
    return crypto.createHash('md5').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function walkDir(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (shouldIgnore(rel)) continue;
    if (entry.isDirectory()) {
      out.push(...walkDir(full, base));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function copyFile(srcPath, dstPath) {
  if (CHECK || DRY) {
    const srcHash = hashFile(srcPath);
    const dstHash = hashFile(dstPath);
    if (srcHash !== dstHash) {
      stats.drift.push(path.relative(SRC, srcPath));
      if (DRY) console.log(`  [diff] ${path.relative(SRC, srcPath)}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  stats.copied++;
}

function syncDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`  [skip] source not found: ${srcDir}`);
    stats.skipped++;
    return;
  }
  const srcFiles = new Set(walkDir(srcDir));
  const dstFiles = new Set(walkDir(dstDir));

  // 추가/변경된 파일 복사
  for (const rel of srcFiles) {
    const srcPath = path.join(srcDir, rel);
    const dstPath = path.join(dstDir, rel);
    const srcHash = hashFile(srcPath);
    const dstHash = hashFile(dstPath);
    if (srcHash !== dstHash) {
      copyFile(srcPath, dstPath);
    }
  }

  // 삭제된 파일 정리 (CHECK/DRY 시는 출력만)
  for (const rel of dstFiles) {
    if (!srcFiles.has(rel)) {
      const dstPath = path.join(dstDir, rel);
      if (CHECK || DRY) {
        stats.drift.push(`(deleted) ${rel}`);
        if (DRY) console.log(`  [del] ${rel}`);
      } else {
        fs.unlinkSync(dstPath);
        stats.deleted++;
      }
    }
  }
}

function syncFile(srcPath, dstPath) {
  if (!fs.existsSync(srcPath)) {
    console.warn(`  [skip] source not found: ${srcPath}`);
    stats.skipped++;
    return;
  }
  const srcHash = hashFile(srcPath);
  const dstHash = hashFile(dstPath);
  if (srcHash !== dstHash) {
    copyFile(srcPath, dstPath);
  }
}

function main() {
  const mode = CHECK ? 'CHECK' : DRY ? 'DRY' : (REVERSE ? 'REVERSE-SYNC' : 'SYNC');
  console.log(`[bundle-claude] ${mode}: ${SRC} → ${DST}`);

  for (const t of TARGETS) {
    const srcPath = path.join(SRC, t.name);
    const dstPath = path.join(DST, t.name);
    if (t.type === 'dir') syncDir(srcPath, dstPath);
    else syncFile(srcPath, dstPath);
  }

  if (CHECK) {
    if (stats.drift.length > 0) {
      console.error(`\n❌ Drift detected (${stats.drift.length} files):`);
      stats.drift.slice(0, 20).forEach(f => console.error(`  - ${f}`));
      if (stats.drift.length > 20) console.error(`  ... and ${stats.drift.length - 20} more`);
      console.error(`\nRun: npm run bundle:claude`);
      process.exit(1);
    } else {
      console.log('✅ No drift. Bundle is in sync with global.');
      process.exit(0);
    }
  }

  if (DRY) {
    console.log(`\n[dry-run] ${stats.drift.length} file(s) would change.`);
  } else {
    console.log(`\n✅ Done. copied=${stats.copied} deleted=${stats.deleted} skipped=${stats.skipped} errors=${stats.errors}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`[bundle-claude] FATAL: ${err.message}`);
  process.exit(2);
}
