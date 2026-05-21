#!/usr/bin/env node
// PNG OCR — 회사소개서 포트폴리오 페이지에서 텍스트 추출 (한+영)
//
// 사용:
//   node scripts/ocr-brochure.js \
//     --in data/brochure-png \
//     --out data/brochure-text \
//     --pattern "p0*"   (선택, 파일명 prefix 필터)

const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

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
  const inDir = args.in || 'data/brochure-png';
  const outDir = args.out || 'data/brochure-text';
  const pattern = args.pattern || '';
  fs.mkdirSync(outDir, { recursive: true });

  const all = fs.readdirSync(inDir)
    .filter(f => f.endsWith('.png'))
    .filter(f => !pattern || f.startsWith(pattern))
    .sort();

  if (!all.length) {
    console.error('대상 PNG 없음');
    process.exit(1);
  }
  console.log(`OCR 대상: ${all.length}개`);

  const worker = await createWorker(['kor', 'eng']);

  let success = 0;
  for (let i = 0; i < all.length; i++) {
    const f = all[i];
    const inPath = path.join(inDir, f);
    const outName = f.replace('.png', '.txt');
    const outPath = path.join(outDir, outName);
    if (fs.existsSync(outPath)) {
      console.log(`  [${i+1}/${all.length}] skip (already exists): ${f}`);
      success++;
      continue;
    }
    try {
      const { data: { text } } = await worker.recognize(inPath);
      fs.writeFileSync(outPath, text);
      const len = text.length;
      console.log(`  [${i+1}/${all.length}] ${f} → ${len}자`);
      success++;
    } catch (e) {
      console.warn(`  [${i+1}/${all.length}] FAIL ${f}: ${e.message}`);
    }
  }

  await worker.terminate();
  console.log(`\n완료: ${success}/${all.length}`);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
