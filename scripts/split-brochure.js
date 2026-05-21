#!/usr/bin/env node
// 대용량 PDF를 chunk 단위로 분할 (Read 도구 100MB 한도 우회용)
//
// 사용:
//   node scripts/split-brochure.js \
//     --in "C:\Users\hj.moon\Downloads\엘루오씨앤씨_회사소개서_2026.pdf" \
//     --out data/brochure-chunks \
//     --pages-per-chunk 10

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

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
    console.error('--in <pdf> --out <dir> [--pages-per-chunk N=10]');
    process.exit(1);
  }
  const inPath = args.in;
  const outDir = args.out;
  const ppc = parseInt(args['pages-per-chunk'], 10) || 10;

  if (!fs.existsSync(inPath)) {
    console.error('입력 PDF 없음:', inPath);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`로드: ${inPath} (${(fs.statSync(inPath).size / 1024 / 1024).toFixed(1)} MB)`);
  const buf = fs.readFileSync(inPath);
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  console.log(`총 페이지: ${total}`);

  const baseName = path.parse(inPath).name;
  let count = 0;
  for (let start = 0; start < total; start += ppc) {
    const end = Math.min(start + ppc, total);
    const chunk = await PDFDocument.create();
    const indices = [];
    for (let i = start; i < end; i++) indices.push(i);
    const copied = await chunk.copyPages(src, indices);
    copied.forEach(p => chunk.addPage(p));
    const outBytes = await chunk.save();
    const outName = `${baseName}_p${String(start+1).padStart(3,'0')}-p${String(end).padStart(3,'0')}.pdf`;
    const outPath = path.join(outDir, outName);
    fs.writeFileSync(outPath, outBytes);
    const sizeMb = (outBytes.length / 1024 / 1024).toFixed(1);
    console.log(`  [${count+1}] ${outName}  (${sizeMb} MB)`);
    count++;
  }
  console.log(`\n완료: ${count}개 chunk 생성`);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
