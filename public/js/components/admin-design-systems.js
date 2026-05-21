// Admin: 디자인 시스템 등록·관리 페이지 (KDS, Material, shadcn 등)
//   목록 → 등록(JSON 파일 업로드 또는 직접 붙여넣기) → 단건 미리보기 + sync 상태
//
// 의존: AdminShell, API, escapeHtml
const AdminDesignSystemsPage = {
  _items: [],

  async render() {
    AdminShell.render(this._html(), 'admin-design-systems');
    await this.refresh();
  },

  _html() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">디자인 시스템</h1>
          <p class="page-subtitle">KDS · Material · shadcn 등 외부 DS baseline을 등록하면 프로젝트에 연결할 수 있습니다.</p>
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn-primary" id="ds-new-btn">+ 새 DS 등록</button>
        </div>
      </div>

      <div class="card mb-3" id="ds-list">로딩 중...</div>
      <div class="card mb-3" id="ds-detail" style="display:none"></div>

      <!-- 등록/편집 모달 -->
      <div id="ds-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;align-items:flex-start;justify-content:center;padding-top:5vh;overflow:auto">
        <div class="card" style="width:760px;max-width:95%;padding:0">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.9rem 1.1rem;border-bottom:1px solid var(--border)">
            <h3 id="ds-modal-title" style="margin:0">새 디자인 시스템 등록</h3>
            <button class="btn-sm" id="ds-modal-close">✕</button>
          </div>
          <form id="ds-form" style="padding:1.1rem;display:grid;gap:.7rem">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem">
              <label>이름 *<input name="name" required maxlength="50" placeholder="Korea Design System"></label>
              <label>slug *<input name="slug" required maxlength="50" pattern="[a-z0-9-]+" placeholder="kds"></label>
              <label>버전 *<input name="version" required placeholder="1.0.0"></label>
              <label>출처 URL<input name="source" placeholder="https://kds.kr"></label>
              <label>Figma file key<input name="figma_file_key" placeholder="abc123XYZ (URL의 /file/<key>/ 부분)"></label>
              <label>Figma node ID (선택)<input name="figma_node_id" placeholder="1:23"></label>
            </div>
            <label>baseline.json * (필수)
              <div style="display:flex;gap:.4rem;align-items:center;margin-top:.3rem">
                <input type="file" id="ds-baseline-file" accept=".json,application/json" style="font-size:.85rem">
                <span class="text-muted text-sm">또는 아래에 직접 붙여넣기</span>
              </div>
              <textarea name="baseline_json" rows="8" required placeholder='{"color":{"primary":{"500":"#0071e3"}},"typography":{"fontFamily":{"sans":"Pretendard"}}}' style="font-family:monospace;font-size:.82rem;width:100%;margin-top:.3rem"></textarea>
              <div id="ds-baseline-hint" class="text-sm" style="margin-top:.2rem"></div>
            </label>
            <label>tokens.css (선택, 자동 생성 가능)
              <div style="display:flex;gap:.4rem;align-items:center;margin-top:.3rem">
                <input type="file" id="ds-css-file" accept=".css,text/css" style="font-size:.85rem">
                <button type="button" class="btn-sm" id="ds-gen-css">baseline에서 자동 생성</button>
              </div>
              <textarea name="tokens_css" rows="6" placeholder=":root{--color-primary:#0071e3;--font-sans:Pretendard;}" style="font-family:monospace;font-size:.82rem;width:100%;margin-top:.3rem"></textarea>
            </label>
            <div style="display:flex;justify-content:flex-end;gap:.5rem;padding-top:.5rem;border-top:1px solid var(--border)">
              <button type="button" class="btn" id="ds-cancel">취소</button>
              <button type="submit" class="btn-primary">저장</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async refresh() {
    try {
      const r = await API.get('/design-systems');
      this._items = r.items || [];
      this._renderList();
      this._wire();
    } catch (e) {
      document.getElementById('ds-list').innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  _renderList() {
    const el = document.getElementById('ds-list');
    if (!el) return;
    if (this._items.length === 0) {
      el.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--muted)">등록된 디자인 시스템이 없습니다. <strong>새 DS 등록</strong> 버튼으로 추가하세요.</div>`;
      return;
    }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border);text-align:left;font-size:.82rem;color:var(--muted)">
            <th style="padding:.55rem .8rem">이름</th>
            <th>slug</th>
            <th>버전</th>
            <th>출처</th>
            <th>baseline</th>
            <th>tokens.css</th>
            <th style="text-align:right;padding-right:.8rem">액션</th>
          </tr>
        </thead>
        <tbody>
          ${this._items.map(d => `
            <tr style="border-bottom:1px dashed var(--border)">
              <td style="padding:.55rem .8rem"><strong>${escapeHtml(d.name)}</strong></td>
              <td><code>${escapeHtml(d.slug)}</code></td>
              <td>v${escapeHtml(d.version || '-')}</td>
              <td class="text-sm text-muted">${d.source ? escapeHtml(d.source).slice(0,40) : '-'}</td>
              <td class="text-sm">${(d.baseline_size || 0).toLocaleString()} B</td>
              <td class="text-sm">${d.css_size ? d.css_size.toLocaleString() + ' B' : '<span class="text-muted">없음</span>'}</td>
              <td style="text-align:right;padding-right:.8rem">
                <button class="btn-sm" data-act="view" data-id="${d.id}">상세</button>
                <button class="btn-sm" data-act="edit" data-id="${d.id}">편집</button>
                <button class="btn-danger-sm" data-act="del" data-id="${d.id}">삭제</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => this._action(e.currentTarget.dataset.act, +e.currentTarget.dataset.id));
    });
  },

  _wire() {
    const newBtn = document.getElementById('ds-new-btn');
    if (newBtn) newBtn.onclick = () => this._showModal(null);
    document.getElementById('ds-modal-close').onclick = () => this._hideModal();
    document.getElementById('ds-cancel').onclick = () => this._hideModal();
    document.getElementById('ds-form').onsubmit = (e) => this._submit(e);
    document.getElementById('ds-baseline-file').onchange = (e) => this._loadFile(e, 'baseline_json');
    document.getElementById('ds-css-file').onchange = (e) => this._loadFile(e, 'tokens_css');
    document.getElementById('ds-gen-css').onclick = () => this._genCss();
    const ta = document.querySelector('#ds-form [name="baseline_json"]');
    if (ta) ta.addEventListener('input', () => this._validateBaseline(ta.value));
  },

  _showModal(item) {
    const modal = document.getElementById('ds-modal');
    const title = document.getElementById('ds-modal-title');
    const form = document.getElementById('ds-form');
    form.reset();
    if (item) {
      title.textContent = `편집: ${item.name}`;
      form.elements.name.value = item.name || '';
      form.elements.slug.value = item.slug || '';
      form.elements.version.value = item.version || '';
      form.elements.source.value = item.source || '';
      form.elements.baseline_json.value = item.baseline_json || '';
      form.elements.tokens_css.value = item.tokens_css || '';
      form.elements.figma_file_key.value = item.figma_file_key || '';
      form.elements.figma_node_id.value = item.figma_node_id || '';
      form.dataset.editId = item.id;
    } else {
      title.textContent = '새 디자인 시스템 등록';
      delete form.dataset.editId;
    }
    modal.style.display = 'flex';
    setTimeout(() => form.elements.name.focus(), 50);
  },

  _hideModal() { document.getElementById('ds-modal').style.display = 'none'; },

  async _loadFile(e, fieldName) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    document.querySelector(`#ds-form [name="${fieldName}"]`).value = text;
    if (fieldName === 'baseline_json') this._validateBaseline(text);
  },

  _validateBaseline(text) {
    const hint = document.getElementById('ds-baseline-hint');
    if (!hint) return;
    if (!text.trim()) { hint.textContent = ''; return; }
    try {
      const obj = JSON.parse(text);
      const keys = Object.keys(obj);
      const colorCount = obj.color ? Object.keys(obj.color).length : 0;
      const typoCount = obj.typography ? Object.keys(obj.typography).length : 0;
      hint.style.color = '#3aa55c';
      hint.textContent = `✓ 유효한 JSON. 최상위 ${keys.length}개 키: ${keys.slice(0,5).join(', ')}${keys.length>5?'...':''} · color ${colorCount}개 / typography ${typoCount}개`;
    } catch (err) {
      hint.style.color = '#d73a49';
      hint.textContent = `✗ JSON 파싱 실패: ${err.message}`;
    }
  },

  // baseline.json → tokens.css 자동 생성 (간이 컨버터)
  _genCss() {
    const ta = document.querySelector('#ds-form [name="baseline_json"]');
    const out = document.querySelector('#ds-form [name="tokens_css"]');
    if (!ta.value.trim()) { alert('baseline.json을 먼저 입력하세요'); return; }
    try {
      const obj = JSON.parse(ta.value);
      const lines = [':root {'];
      function walk(node, prefix) {
        if (typeof node === 'string' || typeof node === 'number') {
          lines.push(`  --${prefix}: ${node};`);
          return;
        }
        if (node && typeof node === 'object') {
          for (const [k, v] of Object.entries(node)) {
            walk(v, prefix ? `${prefix}-${k}` : k);
          }
        }
      }
      walk(obj, '');
      lines.push('}');
      out.value = lines.join('\n');
    } catch (err) {
      alert('JSON 파싱 실패: ' + err.message);
    }
  },

  async _submit(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.elements.name.value.trim(),
      slug: form.elements.slug.value.trim(),
      version: form.elements.version.value.trim(),
      source: form.elements.source.value.trim() || null,
      baseline_json: form.elements.baseline_json.value.trim(),
      tokens_css: form.elements.tokens_css.value.trim() || null,
      figma_file_key: form.elements.figma_file_key.value.trim() || null,
      figma_node_id: form.elements.figma_node_id.value.trim() || null
    };
    try { JSON.parse(payload.baseline_json); }
    catch (err) { alert('baseline.json 형식 오류: ' + err.message); return; }
    try {
      const editId = form.dataset.editId;
      if (editId) {
        await API.put(`/design-systems/${editId}`, payload);
      } else {
        await API.post('/design-systems', payload);
      }
      this._hideModal();
      await this.refresh();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  },

  async _action(act, id) {
    if (act === 'view') {
      try {
        const d = await API.get(`/design-systems/${id}`);
        this._renderDetail(d);
      } catch (e) { alert(e.message); }
    } else if (act === 'edit') {
      try {
        const d = await API.get(`/design-systems/${id}`);
        this._showModal(d);
      } catch (e) { alert(e.message); }
    } else if (act === 'del') {
      if (!confirm('삭제하시겠습니까? 연결된 프로젝트는 design_system_id가 NULL로 변경됩니다.')) return;
      try {
        await API.del(`/design-systems/${id}`);
        await this.refresh();
        document.getElementById('ds-detail').style.display = 'none';
      } catch (e) { alert(e.message); }
    }
  },

  _renderDetail(d) {
    const el = document.getElementById('ds-detail');
    if (!el) return;
    el.style.display = '';
    let preview = '';
    try {
      const obj = JSON.parse(d.baseline_json || '{}');
      const colors = obj.color || {};
      const typos = obj.typography || {};
      preview = `
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
          ${Object.entries(colors).flatMap(([cat, vals]) =>
            (typeof vals === 'object' ? Object.entries(vals) : [['', vals]])
            .filter(([_, v]) => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v))
            .map(([k, v]) => `<div style="text-align:center;font-size:.75rem">
              <div style="width:48px;height:48px;border-radius:6px;background:${v};border:1px solid var(--border)"></div>
              <div class="text-muted">${cat}${k?'.'+k:''}</div>
              <div><code>${v}</code></div>
            </div>`)
          ).join('')}
        </div>
        ${typos.fontFamily ? `<div style="margin-top:.8rem"><strong>Typography</strong>: ${Object.entries(typos.fontFamily).map(([k,v])=>`<code>${escapeHtml(k)}=${escapeHtml(String(v))}</code>`).join(' · ')}</div>` : ''}
      `;
    } catch (e) { preview = `<div class="alert alert-warning">baseline.json 파싱 실패</div>`; }

    const figmaConnected = !!d.figma_file_key;
    const lastSync = d.last_synced_at ? `${d.last_synced_at} (${d.last_sync_direction || '?'})` : '없음';
    let syncMeta = null;
    try { syncMeta = d.sync_meta ? (typeof d.sync_meta === 'string' ? JSON.parse(d.sync_meta) : d.sync_meta) : null; } catch {}

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:.6rem">
        <div>
          <h3 style="margin:0">${escapeHtml(d.name)} <span class="text-muted text-sm">v${escapeHtml(d.version)} · ${escapeHtml(d.slug)}</span></h3>
          ${d.source ? `<div class="text-sm text-muted">source: <a href="${escapeHtml(d.source)}" target="_blank">${escapeHtml(d.source)}</a></div>` : ''}
          <div class="text-sm text-muted">사용 프로젝트: ${d.usage_count || 0}개</div>
        </div>
        <div style="display:flex;gap:.4rem">
          <a class="btn-sm" href="/api/design-systems/${d.id}/baseline.json" target="_blank">⬇ baseline.json</a>
          ${d.tokens_css ? `<a class="btn-sm" href="/api/design-systems/${d.id}/tokens.css" target="_blank">⬇ tokens.css</a>` : ''}
        </div>
      </div>
      <div style="background:var(--panel-soft);padding:.6rem .8rem;border-radius:6px;margin-bottom:.6rem">
        <strong>🎨 Figma sync</strong>
        ${figmaConnected ? `
          <div class="text-sm" style="margin-top:.3rem">
            file_key: <code>${escapeHtml(d.figma_file_key)}</code>${d.figma_node_id ? ` · node: <code>${escapeHtml(d.figma_node_id)}</code>` : ''}
          </div>
          <div class="text-sm text-muted">마지막 sync: ${escapeHtml(lastSync)}</div>
          ${syncMeta?.push_unavailable ? `<div class="text-sm" style="color:#d73a49">⚠️ push 권한 없음: ${escapeHtml(syncMeta.reason || '')}</div>` : ''}
          <div style="display:flex;gap:.4rem;margin-top:.5rem">
            <button class="btn-sm" data-sync="pull" data-id="${d.id}">⬇ Figma → DB (Pull)</button>
            <button class="btn-sm" data-sync="push" data-id="${d.id}">⬆ DB → Figma (Push)</button>
            <button class="btn-sm" data-sync="status" data-id="${d.id}">상태 새로고침</button>
          </div>
        ` : `
          <div class="text-sm text-muted" style="margin-top:.3rem">
            연결 안 됨 — <strong>편집</strong>에서 figma_file_key 입력하면 양방향 sync 가능
          </div>
        `}
      </div>
      <div>
        <strong>미리보기 (색상 팔레트)</strong>
        ${preview}
      </div>
    `;
    el.querySelectorAll('[data-sync]').forEach(btn => {
      btn.addEventListener('click', () => this._sync(btn.dataset.sync, parseInt(btn.dataset.id, 10)));
    });
  },

  async _sync(action, id) {
    try {
      if (action === 'pull') {
        if (!confirm('Figma의 Variables를 DB로 가져옵니다. 기존 baseline.json이 덮어쓰여질 수 있습니다. 진행할까요?')) return;
        const r = await API.post(`/design-systems/${id}/sync/from-figma`, {});
        alert(`Pull 완료\nchanged: ${r.changed}\nvariables: ${r.variables_count}`);
      } else if (action === 'push') {
        if (!confirm('DB baseline을 Figma로 보냅니다. (Enterprise + Beta 권한 필요)')) return;
        const r = await API.post(`/design-systems/${id}/sync/to-figma`, {});
        if (r.ok) alert('Push 완료');
        else alert(`Push 실패: ${r.error}\n${r.hint || ''}`);
      } else if (action === 'status') {
        const r = await API.get(`/design-systems/${id}/sync/status`);
        alert(`figma_token_set: ${r.figma_token_set}\nfile_key: ${r.figma_file_key || '(없음)'}\nlast_synced: ${r.last_synced_at || '(없음)'} ${r.last_sync_direction || ''}`);
      }
      // 상세 새로고침
      const d = await API.get(`/design-systems/${id}`);
      this._renderDetail(d);
    } catch (err) {
      alert('실패: ' + err.message);
    }
  }
};
