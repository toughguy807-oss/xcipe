// Artifact viewer (IA-P005, FN-020, FN-021, FN-023)
// B2: 파일 유형별 렌더링 (md/html/css/js) + TOC 사이드바 + 코드 복사 버튼
function isDesignArtifact(type) {
  const t = String(type || '').toLowerCase();
  return ['knowledge', 'layout', 'ui', 'benchmark', 'sb'].includes(t);
}

// 2026-05-15: figma_push_ready 메타 읽기 (figma-auto-push.js MVP1 결과)
function readFigmaPushReady(artifact) {
  try {
    const m = artifact.meta_json ? JSON.parse(artifact.meta_json) : null;
    return m && m.figma_push_ready ? m.figma_push_ready : null;
  } catch { return null; }
}

function getFileExtension(fileName) {
  const m = String(fileName || '').match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function showFigmaGuide(artifact) {
  const cmd = `/figma-push ${artifact.file_path || artifact.file_name}`;
  const ready = readFigmaPushReady(artifact);
  const existing = document.getElementById('figma-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'figma-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  const readyBlock = ready && ready.figma ? `
    <div style="background:#eef7ff;border:1px solid #b6dcff;border-radius:4px;padding:10px 14px;margin:0 0 14px;font-size:13px;line-height:1.55">
      <strong style="color:#0a64a4">자동 변환 완료</strong> (figma-prep.js · ${escapeHtml(ready.timestamp || '')})<br>
      <span style="color:var(--muted)">file_key:</span> <code>${escapeHtml(ready.figma.file_key)}</code>
      ${ready.figma.design_system ? ` · <span style="color:var(--muted)">DS:</span> ${escapeHtml(ready.figma.design_system)}` : ''}<br>
      <span style="color:var(--muted)">변환 파일 ${(ready.prepared_files || []).length}건:</span> ${(ready.prepared_files || []).slice(0, 3).map(p => `<code>${escapeHtml(p)}</code>`).join(', ')}${(ready.prepared_files || []).length > 3 ? ' …' : ''}
    </div>` : `
    <div style="background:#fff8e1;border:1px solid #ffe7a0;border-radius:4px;padding:10px 14px;margin:0 0 14px;font-size:13px;line-height:1.55">
      <strong style="color:#a06800">수동 변환 필요</strong> — 이 산출물에는 figma_push_ready 메타가 없습니다. 디자인 시스템에 <code>figma_file_key</code>가 등록되어 있고 안 A(.html primary) 적용 후 재실행하면 자동 변환됩니다.
    </div>`;
  modal.innerHTML = `
    <div style="background:#fff;max-width:560px;padding:28px 32px;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <h3 style="margin:0 0 12px;font-size:18px">Figma로 전송</h3>
      ${readyBlock}
      <p style="margin:0 0 16px;color:var(--muted);line-height:1.55">MCP 트리거는 Claude Code에서 <code>/figma-push</code> 커맨드로 수행합니다. 아래 커맨드를 복사해 붙여넣으세요.</p>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:12px 14px;font-family:Consolas,monospace;font-size:13px;word-break:break-all;margin-bottom:16px" id="figma-cmd">${escapeHtml(cmd)}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" id="figma-copy">커맨드 복사</button>
        <button class="btn" id="figma-close">닫기</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#figma-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#figma-copy').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(cmd);
      e.currentTarget.textContent = '복사됨 ✓';
    } catch {
      e.currentTarget.textContent = '복사 실패';
    }
  });
}

// 마크다운 렌더 결과에서 TOC 추출 (H1, H2, H3)
function buildTocFromHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const headers = div.querySelectorAll('h1, h2, h3');
  const items = [];
  headers.forEach((h, idx) => {
    const id = `toc-${idx}`;
    h.id = id;
    items.push({ id, text: h.textContent || '', level: parseInt(h.tagName.slice(1), 10) });
  });
  return { html: div.innerHTML, items };
}

function renderTocSidebar(items) {
  if (!items.length) return '';
  const links = items.map(it => `
    <a href="#${it.id}" class="toc-link toc-l${it.level}" data-toc-id="${it.id}">${escapeHtml(it.text)}</a>
  `).join('');
  return `
    <aside class="artifact-toc">
      <div class="toc-title">목차</div>
      <nav class="toc-nav">${links}</nav>
    </aside>
  `;
}

// 코드 블록(`<pre>`)에 복사 버튼 부착
function attachCodeCopyButtons(root) {
  if (!root) return;
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return;
    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'code-copy btn btn-sm';
    btn.type = 'button';
    btn.textContent = '복사';
    btn.style.cssText = 'position:absolute;top:6px;right:6px;font-size:11px;padding:2px 8px';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        btn.textContent = '복사됨 ✓';
        setTimeout(() => { btn.textContent = '복사'; }, 1200);
      } catch {
        btn.textContent = '실패';
      }
    });
    pre.appendChild(btn);
  });
}

// 코드 파일(html/css/js 등)을 위한 source view 렌더링
function renderSourceView(content, ext) {
  const escaped = escapeHtml(content);
  return `<pre class="code-source"><code class="lang-${escapeHtml(ext)}">${escaped}</code></pre>`;
}

// HTML 파일 미리보기 — 격리된 iframe
function renderHtmlPreview(content) {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  return `<iframe class="artifact-html-preview" src="${url}" sandbox="allow-same-origin allow-scripts" title="HTML 미리보기"></iframe>`;
}

const ArtifactViewerPage = {
  async render({ id, aid }) {
    Shell.render('<div class="empty">로딩 중...</div>', 'projects');
    try {
      const artifact = await API.get(`/projects/${id}/artifacts/${aid}`);
      const ext = getFileExtension(artifact.file_name);

      // META 파싱 (마크다운에서만)
      let meta = null;
      if (ext === 'md') {
        const metaMatch = (artifact.content || '').match(/<!--\s*META\s*(\{[\s\S]*?\})\s*-->/);
        if (metaMatch) {
          try { meta = JSON.parse(metaMatch[1]); } catch {}
        }
      }
      if (!meta && artifact.meta_json) {
        try { meta = JSON.parse(artifact.meta_json); } catch {}
      }

      // 파일 유형별 본문 + TOC 결정
      let bodyHtml = '';
      let tocItems = [];
      let tabBar = '';
      const rawContent = artifact.content || '';

      if (ext === 'md') {
        const contentWithoutMeta = rawContent.replace(/<!--\s*META[\s\S]*?-->/g, '');
        const rendered = typeof marked !== 'undefined' ? marked.parse(contentWithoutMeta) : escapeHtml(contentWithoutMeta);
        const tocResult = buildTocFromHtml(rendered);
        tocItems = tocResult.items;
        bodyHtml = `<div class="artifact-content">${tocResult.html}</div>`;
      } else if (ext === 'html' || ext === 'htm') {
        tabBar = `
          <div class="artifact-tabs">
            <button class="tab-btn active" data-tab="preview">렌더 미리보기</button>
            <button class="tab-btn" data-tab="source">소스</button>
          </div>
        `;
        bodyHtml = `
          <div class="tab-pane active" data-pane="preview">${renderHtmlPreview(rawContent)}</div>
          <div class="tab-pane" data-pane="source" style="display:none">${renderSourceView(rawContent, ext)}</div>
        `;
      } else if (ext === 'css' || ext === 'js' || ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'xml' || ext === 'sql') {
        bodyHtml = `<div class="artifact-content">${renderSourceView(rawContent, ext)}</div>`;
      } else {
        bodyHtml = `<div class="artifact-content"><pre class="code-source">${escapeHtml(rawContent)}</pre></div>`;
      }

      const html = `
        <div class="page-header">
          <div>
            <div class="page-title">${escapeHtml(artifact.type)} <span class="text-muted text-sm">${escapeHtml(artifact.version)}</span></div>
            <div class="page-subtitle">${escapeHtml(artifact.file_name)} · ${formatRelative(artifact.created_at)}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn" onclick="Router.navigate('/projects/${id}?tab=artifacts')">← 목록</button>
            <button class="btn" id="dl-btn">원본 (.${escapeHtml(ext || 'md')})</button>
            <button class="btn" id="dl-html-btn">HTML</button>
            <button class="btn-primary-sm" id="dl-pdf-btn">PDF</button>
            ${isDesignArtifact(artifact.type) ? '<button class="btn" id="figma-btn" title="Figma로 전송 (필요 시)">Send to Figma</button>' : ''}
          </div>
        </div>
        ${meta ? `
          <div class="meta-panel">
            <strong>META</strong>
            <div class="meta-row">
              ${meta.skill ? `<div>스킬: <code>${escapeHtml(meta.skill)}</code></div>` : ''}
              ${meta.version ? `<div>버전: ${escapeHtml(meta.version)}</div>` : ''}
              ${meta.self_check ? `<div>Self-Check: <span class="badge badge-${meta.self_check === 'PASS' ? 'resolved' : 'archived'}">${escapeHtml(meta.self_check)} ${meta.self_check_detail || ''}</span></div>` : ''}
              ${meta.counts ? `<div>수치: ${Object.entries(meta.counts).map(([k,v]) => `${k}=${v}`).join(', ')}</div>` : ''}
            </div>
          </div>
        ` : ''}
        ${tabBar}
        <div class="artifact-layout">
          ${tocItems.length ? renderTocSidebar(tocItems) : ''}
          <div class="artifact-body">${bodyHtml}</div>
        </div>
      `;
      Shell.render(html, 'projects');

      const baseName = artifact.file_name.replace(/\.[^.]+$/, '');
      document.getElementById('dl-btn').addEventListener('click', () => {
        API.download(`/projects/${id}/artifacts/${aid}/download`, artifact.file_name);
      });
      document.getElementById('dl-html-btn').addEventListener('click', () => {
        API.download(`/projects/${id}/artifacts/${aid}/export?format=html`, `${baseName}.html`);
      });
      document.getElementById('dl-pdf-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const orig = btn.textContent;
        btn.textContent = 'PDF 생성 중...';
        btn.disabled = true;
        try {
          await API.download(`/projects/${id}/artifacts/${aid}/export?format=pdf`, `${baseName}.pdf`);
        } catch (err) {
          alert('PDF 생성 실패: ' + err.message);
        } finally {
          btn.textContent = orig;
          btn.disabled = false;
        }
      });
      const figmaBtn = document.getElementById('figma-btn');
      if (figmaBtn) figmaBtn.addEventListener('click', () => showFigmaGuide(artifact));

      // Tab switching (HTML preview ↔ source)
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          document.querySelectorAll('.tab-pane').forEach(p => {
            const isActive = p.dataset.pane === target;
            p.classList.toggle('active', isActive);
            p.style.display = isActive ? '' : 'none';
          });
        });
      });

      // 코드 블록에 복사 버튼 부착
      attachCodeCopyButtons(document.querySelector('.artifact-body'));

      // TOC 클릭 시 부드럽게 스크롤
      document.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const id = link.dataset.tocId;
          const target = document.getElementById(id);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    } catch (err) {
      Shell.render(`<div class="empty">산출물을 찾을 수 없습니다: ${escapeHtml(err.message)}</div>`, 'projects');
    }
  }
};
