#!/usr/bin/env node
// project_index 의 host 중복 (www vs no-www) 병합
//
// 라이브 크롤 행을 canonical 로 유지하고, brochure stub의 auto_tags 만 병합 후 stub 삭제.
//
// 사용:
//   node scripts/merge-duplicate-hosts.js [--dry]

const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = true;
  }
  return out;
}

function bareHost(url) {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

(() => {
  const args = parseArgs(process.argv.slice(2));
  const { db } = require(path.join(__dirname, '..', 'src', 'db'));

  const rows = db.prepare(`SELECT id, external_path, name, auto_tags, feature_signature FROM project_index`).all();
  const byHost = new Map();
  for (const r of rows) {
    const host = bareHost(r.external_path);
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(r);
  }

  const dups = [...byHost.entries()].filter(([h, rs]) => rs.length > 1);
  if (dups.length === 0) {
    console.log('중복 host 없음');
    return;
  }

  console.log(`중복 host ${dups.length}개 발견`);

  const upd = db.prepare(`UPDATE project_index SET auto_tags = ?, updated_at = datetime('now') WHERE id = ?`);
  const del = db.prepare(`DELETE FROM project_index WHERE id = ?`);

  const tx = db.transaction(() => {
    for (const [host, rs] of dups) {
      const live = rs.find(r => (r.feature_signature || '').includes('"source":"live_site"'));
      const stubs = rs.filter(r => r !== live);

      if (!live) {
        // 라이브 없음 — www 없는 쪽을 canonical 로 (또는 첫 번째)
        console.log(`  [SKIP] ${host} : 라이브 없음, 수동 검토 필요 (${rs.map(r=>r.id).join(',')})`);
        continue;
      }

      // 라이브의 auto_tags + stub 의 auto_tags 합치기
      const allTags = new Set();
      for (const r of rs) {
        for (const t of (r.auto_tags || '').split(',').map(s => s.trim()).filter(Boolean)) {
          allTags.add(t);
        }
      }
      const merged = [...allTags].join(',');

      console.log(`  [MERGE] ${host}`);
      console.log(`    → 유지: id=${live.id} (${live.external_path})`);
      console.log(`    → 삭제: ${stubs.map(s => `id=${s.id}`).join(', ')}`);
      console.log(`    → tags: ${merged.slice(0, 80)}${merged.length > 80 ? '...' : ''}`);

      if (!args.dry) {
        upd.run(merged, live.id);
        for (const s of stubs) del.run(s.id);
      }
    }
  });

  tx();

  if (args.dry) {
    console.log('\n--dry — 변경 없음');
  } else {
    const total = db.prepare(`SELECT COUNT(*) as c FROM project_index`).get().c;
    console.log(`\nproject_index 총 ${total}건`);
  }
})();
