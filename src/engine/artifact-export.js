// Artifact Export — markdown 산출물을 HTML/PDF로 변환
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 산출물 기본 print CSS — A4, 한글 폰트, 섹션 번호
const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', -apple-system, 'Segoe UI', sans-serif;
    color: #1a1a1a; line-height: 1.65; font-size: 11pt; letter-spacing: -0.2px;
    max-width: 860px; margin: 0 auto; padding: 24px;
  }
  h1 { font-size: 22pt; font-weight: 700; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin: 32px 0 20px; page-break-before: auto; }
  h2 { font-size: 16pt; font-weight: 700; margin: 28px 0 14px; padding-left: 10px; border-left: 4px solid #1a1a1a; }
  h3 { font-size: 13pt; font-weight: 700; margin: 20px 0 10px; color: #333; }
  h4 { font-size: 11.5pt; font-weight: 700; margin: 16px 0 8px; color: #555; }
  p { margin: 8px 0 12px; }
  ul, ol { margin: 8px 0 14px; padding-left: 22px; }
  li { margin: 4px 0; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; font-size: 10pt; }
  pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 12px 14px; overflow-x: auto; font-size: 9.5pt; page-break-inside: avoid; }
  pre code { background: transparent; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d0d0d0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 700; }
  blockquote { border-left: 4px solid #c0c0c0; margin: 12px 0; padding: 6px 14px; color: #555; background: #fafafa; }
  hr { border: none; border-top: 1px solid #d0d0d0; margin: 24px 0; }
  a { color: #0b5cad; text-decoration: none; border-bottom: 1px solid #0b5cad; }
  .doc-meta { font-size: 10pt; color: #666; margin-bottom: 24px; padding: 10px 14px; background: #fafafa; border: 1px solid #e0e0e0; }
  .doc-meta strong { color: #1a1a1a; }
`;

function renderHtml({ title, code, stepLabel, version, createdAt, markdown }) {
  marked.setOptions({ breaks: false, gfm: true, headerIds: true });
  const body = marked.parse(markdown || '');
  const date = createdAt ? new Date(createdAt).toLocaleString('ko-KR') : '';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}</style>
</head><body>
<div class="doc-meta">
  <strong>${escapeHtml(stepLabel || '')}</strong> · ${escapeHtml(code || '')} · ${escapeHtml(version || '')} · ${escapeHtml(date)}
</div>
${body}
</body></html>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function renderPdf(html, outPath) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' }
    });
  } finally {
    await browser.close();
  }
  return outPath;
}

// artifact DB 레코드 → { html, pdfPath } 변환
async function exportArtifact(artifact, project, stepLabel, format /* 'html' | 'pdf' */) {
  if (!fs.existsSync(artifact.file_path)) {
    throw new Error(`파일 없음: ${artifact.file_path}`);
  }
  const ext = path.extname(artifact.file_path).toLowerCase().replace('.', '');

  let html;
  // html/pdf 원본 파일이면 그대로 사용, md는 변환
  if (ext === 'html' || ext === 'htm') {
    html = fs.readFileSync(artifact.file_path, 'utf-8');
  } else if (ext === 'md' || ext === 'markdown' || ext === '') {
    const md = fs.readFileSync(artifact.file_path, 'utf-8');
    html = renderHtml({
      title: `${artifact.type} · ${project.code}`,
      code: project.code,
      stepLabel,
      version: artifact.version,
      createdAt: artifact.created_at,
      markdown: md
    });
  } else {
    throw new Error(`지원하지 않는 확장자: ${ext}`);
  }

  if (format === 'html') {
    return { mime: 'text/html; charset=utf-8', buffer: Buffer.from(html, 'utf-8'), extension: 'html' };
  }

  if (format === 'pdf') {
    const dir = path.dirname(artifact.file_path);
    const base = path.basename(artifact.file_path, path.extname(artifact.file_path));
    const pdfPath = path.join(dir, `${base}.pdf`);
    await renderPdf(html, pdfPath);
    const buffer = fs.readFileSync(pdfPath);
    return { mime: 'application/pdf', buffer, extension: 'pdf', cachedPath: pdfPath };
  }

  throw new Error(`알 수 없는 format: ${format}`);
}

module.exports = { exportArtifact, renderHtml, renderPdf };
