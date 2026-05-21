#!/usr/bin/env node
/**
 * aggregate-stats.js
 *
 * rejections.jsonl → stats.json 집계 헬퍼
 * dkb-search Step 7이 50건 단위로 호출. 의존성 0 (Node 표준 라이브러리만).
 *
 * 스키마: ~/.claude/dkb/feedback/README.md "stats.json" 섹션
 *
 * 사용:
 *   node aggregate-stats.js <rejections.jsonl 경로>
 *   → stdout으로 stats.json 출력 (>로 파일 리다이렉트)
 *
 * 시간 감쇠:
 *   - ≤90일: 1.0×
 *   - 90~180일: 0.5×
 *   - >180일: 무시
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;
const TRENDING_THRESHOLD = 5;
const TRENDING_WINDOW_DAYS = 30;

function parseArgs() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node aggregate-stats.js <rejections.jsonl>');
    process.exit(2);
  }
  return path.resolve(inputPath);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const events = [];
  raw.split('\n').forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      events.push(JSON.parse(trimmed));
    } catch (err) {
      console.error(`[warn] line ${idx + 1} parse error — skipped: ${err.message}`);
    }
  });
  return events;
}

function decayWeight(tsIso, nowMs) {
  const eventMs = Date.parse(tsIso);
  if (Number.isNaN(eventMs)) return 0;
  const ageDays = (nowMs - eventMs) / DAY_MS;
  if (ageDays > 180) return 0;
  if (ageDays > 90) return 0.5;
  return 1.0;
}

function shortRefPath(refPath) {
  // ~/.claude/dkb/references/tier-1/anthropic.com/DNA.md → tier-1/anthropic.com
  const m = refPath.match(/(?:references|section-packs|patterns)[\\/](.+?)(?:[\\/][^\\/]+)?$/);
  if (m) {
    return m[1].replace(/\\/g, '/').replace(/\/(DNA|PACK)\.md$/, '');
  }
  return refPath;
}

function contextKey(ctx) {
  if (!ctx || typeof ctx !== 'object') return 'unknown';
  return [ctx.industry, ctx.target, ctx.priority, ctx.tone]
    .map((v) => v || '*')
    .join('|');
}

function aggregate(events) {
  const nowMs = Date.now();
  const by_ref = {};
  const trendingCounter = {}; // ref_short → count (within 30d window)
  let total_rejects = 0;

  for (const ev of events) {
    if (!ev.ref_path || !ev.reason_code) continue;
    const weight = decayWeight(ev.ts, nowMs);
    if (weight === 0) continue;

    total_rejects += 1;
    const refShort = shortRefPath(ev.ref_path);
    const ctxKey = contextKey(ev.context);

    if (!by_ref[refShort]) {
      by_ref[refShort] = { count: 0, by_context: {}, by_reason: {} };
    }
    by_ref[refShort].count += 1;
    by_ref[refShort].by_context[ctxKey] = (by_ref[refShort].by_context[ctxKey] || 0) + 1;
    by_ref[refShort].by_reason[ev.reason_code] = (by_ref[refShort].by_reason[ev.reason_code] || 0) + 1;

    // Trending window: 30 days, count by ref+context
    const ageDays = (nowMs - Date.parse(ev.ts)) / DAY_MS;
    if (ageDays <= TRENDING_WINDOW_DAYS) {
      const trendKey = `${refShort}@${ctxKey}`;
      trendingCounter[trendKey] = (trendingCounter[trendKey] || 0) + 1;
    }
  }

  const trending_rejects_30d = Object.entries(trendingCounter)
    .filter(([, count]) => count >= TRENDING_THRESHOLD)
    .map(([key, count]) => {
      const [ref, ctx] = key.split('@');
      return { ref, context: ctx, count };
    })
    .sort((a, b) => b.count - a.count);

  return {
    generated_at: new Date().toISOString(),
    total_rejects,
    unique_refs: Object.keys(by_ref).length,
    by_ref,
    trending_rejects_30d,
    trending_threshold: TRENDING_THRESHOLD,
    trending_window_days: TRENDING_WINDOW_DAYS,
  };
}

function main() {
  const inputPath = parseArgs();
  const events = readJsonl(inputPath);
  const stats = aggregate(events);
  process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
}

main();
