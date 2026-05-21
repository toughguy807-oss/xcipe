#!/usr/bin/env node
// asset_manifest 백필/재계산 스크립트.
//   ~/.claude (skills/agents/lib/rules/commands/ref/CLAUDE.md) 를 스캔해
//   asset_manifest 테이블에 SHA256 + version 적재.
//
//   사용:
//     node scripts/build-asset-manifest.js
//     node scripts/build-asset-manifest.js --dry        # 스캔만, DB 미반영
//     node scripts/build-asset-manifest.js --json       # 결과 JSON 출력

const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv) if (a.startsWith('--')) out[a.slice(2)] = true;
  return out;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));
  const sync = require(path.join(__dirname, '..', 'src', 'engine', 'asset-sync'));

  console.log(`[1/2] RUNTIME 스캔: ${sync.RUNTIME_ROOT}`);
  const runtime = sync.scanRuntime();

  const byCat = runtime.reduce((m, r) => { m[r.category] = (m[r.category] || 0) + 1; return m; }, {});
  console.log(`  · 총 ${runtime.length}건 — ${Object.entries(byCat).map(([c, n]) => `${c}:${n}`).join(', ')}`);

  const explicit = runtime.filter(r => r.has_version).length;
  const implicit = runtime.length - explicit;
  console.log(`  · 명시 version: ${explicit}건, 기본 1.0.0 처리: ${implicit}건 (변경 발생 시 점진 추가)`);

  if (args.dry) {
    if (args.json) console.log(JSON.stringify(runtime, null, 2));
    else for (const r of runtime.slice(0, 10)) console.log(`  ${r.category.padEnd(10)} ${r.path}  v=${r.version || '-'}  sha=${r.sha256.slice(0, 12)}  size=${r.size}`);
    console.log(`--dry — DB 미반영`);
    return;
  }

  console.log(`[2/2] DB upsert ...`);
  const r = sync.rebuildManifest({ db, actor: 'cli:build-asset-manifest' });
  console.log(`  · 신규 ${r.added}건, 변경 ${r.changed}건, 동일 ${r.unchanged}건 (총 ${r.total}건)`);

  const s = sync.summary({ db });
  console.log(`\n[Summary] 총 ${s.total}건`);
  console.log(`  카테고리: ${Object.entries(s.byCategory).map(([c, n]) => `${c}:${n}`).join(', ')}`);
  console.log(`  상태:    ${Object.entries(s.byStatus).filter(([_, n]) => n > 0).map(([st, n]) => `${st}:${n}`).join(', ') || '없음'}`);

  if (args.json) {
    const all = sync.listManifest({ db });
    console.log(JSON.stringify(all, null, 2));
  }
})().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
