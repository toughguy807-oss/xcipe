#!/usr/bin/env node
// PDF → PNG 변환 (pdf-poppler 기반, Read 도구의 multimodal 입력용)
//
// 사용:
//   node scripts/pdf-to-png.js \
//     --in data/brochure-chunks/xxx.pdf \
//     --out data/brochure-png \
//     --prefix p001-p010

const fs = require('fs');
const path = require('path');
const poppler = require('pdf-poppler');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) {
    console.error('--in <pdf> --out <dir> [--prefix name]');
    process.exit(1);
  }
  const inPath = path.resolve(args.in);
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const prefix = args.prefix || path.parse(inPath).name;

  const scale = parseInt(args.scale, 10) || 2048;
  const opts = {
    format: 'png',
    out_dir: outDir,
    out_prefix: prefix,
    page: null,
    scale
  };
  console.log(`scale=${scale}`);

  console.log(`변환: ${inPath} → ${outDir}/${prefix}-*.png`);
  await poppler.convert(inPath, opts);
  const files = fs.readdirSync(outDir).filter(f => f.startsWith(prefix) && f.endsWith('.png'));
  console.log(`생성: ${files.length}개 PNG`);
  for (const f of files) {
    const sz = (fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0);
    console.log(`  ${f} (${sz} KB)`);
  }
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
