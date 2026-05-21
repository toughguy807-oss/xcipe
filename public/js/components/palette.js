// Command Palette — Ctrl/Cmd+K 모달 (D1)
//
// 한 입력창에서:
//  1) 페이지 이동      (대시보드/프로젝트/검색/티켓/활동/설정/자가진단)
//  2) 빠른 액션        (새 프로젝트, Doctor 실행, 로그아웃)
//  3) 프로젝트 검색    (입력 2자 이상이면 /api/search/projects 자동 호출)
//
// 단축키 흐름:
//   - Ctrl/Cmd+K        팔레트 열기/포커스
//   - 화살표 ↑/↓        결과 이동
//   - Enter             선택
//   - Esc               닫기
const Palette = (() => {
  let open = false;
  let activeIdx = 0;
  let items = [];
  let searchTimer = null;

  function staticItems(user) {
    const isAdmin = user && user.role === 'admin';
    const list = [
      { kind: 'nav', label: '대시보드',     hint: 'g d', action: () => Router.navigate('/') },
      { kind: 'nav', label: '프로젝트',     hint: 'g p', action: () => Router.navigate('/projects') },
      { kind: 'nav', label: '검색 (전체)',  hint: 'g s', action: () => Router.navigate('/search') },
      { kind: 'nav', label: '티켓',         hint: 'g t', action: () => Router.navigate('/tickets') },
      { kind: 'nav', label: '활동',         hint: 'g a', action: () => Router.navigate('/activity') },
    ];
    if (isAdmin) {
      list.push({ kind: 'nav',    label: '설정',       hint: '',    action: () => Router.navigate('/settings') });
      list.push({ kind: 'nav',    label: '자가진단',   hint: 'g h', action: () => Router.navigate('/doctor') });
    }
    list.push({ kind: 'action', label: '새 프로젝트',     hint: '',  action: () => DashboardPage.startNewProject() });
    list.push({ kind: 'action', label: '단축키 도움말',   hint: '?', action: () => { close(); Shortcuts.showHelp(); } });
    list.push({ kind: 'action', label: '로그아웃',         hint: '',  action: () => { API.clearToken(); Router.navigate('/login'); } });
    return list;
  }

  function filter(q, base) {
    if (!q) return base;
    const lower = q.toLowerCase();
    return base.filter(it => it.label.toLowerCase().includes(lower));
  }

  function render() {
    const list = document.getElementById('cp-list');
    if (!list) return;
    if (items.length === 0) {
      list.innerHTML = '<div class="cp-empty" style="padding:20px;text-align:center;color:var(--text-muted)">결과 없음</div>';
      return;
    }
    list.innerHTML = items.map((it, i) => {
      const tag = ({ nav: '이동', project: '프로젝트', artifact: '산출물', ticket: '티켓', message: '메시지', action: '액션' })[it.kind] || it.kind;
      return `
        <div class="cp-item ${i === activeIdx ? 'active' : ''}" data-idx="${i}"
             id="cp-item-${i}" role="option" aria-selected="${i === activeIdx}"
             style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);${i === activeIdx ? 'background:var(--bg)' : ''}">
          <span class="badge badge-muted" style="min-width:54px;text-align:center">${tag}</span>
          <span style="flex:1">${escapeHtml(it.label)}</span>
          ${it.hint ? `<kbd style="padding:2px 6px;border:1px solid var(--border);border-radius:3px;font-family:monospace;font-size:11px;background:var(--bg)">${escapeHtml(it.hint)}</kbd>` : ''}
        </div>
      `;
    }).join('');
    const inp = document.getElementById('cp-input');
    if (inp && items.length > 0) inp.setAttribute('aria-activedescendant', `cp-item-${activeIdx}`);
    list.querySelectorAll('.cp-item').forEach(el => {
      el.addEventListener('mousemove', () => { activeIdx = parseInt(el.dataset.idx, 10); render(); });
      el.addEventListener('click', () => execute());
    });
    const active = list.querySelector('.cp-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  async function refresh(q) {
    const user = API.getUser() || {};
    const base = staticItems(user);
    const filtered = filter(q, base);
    items = filtered;
    activeIdx = 0;
    render();

    // T1-C: 통합 검색 — 2글자 이상이면 /search/all (projects + artifacts + tickets + messages)
    if (q && q.length >= 2) {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        try {
          const r = await API.get(`/search/all?q=${encodeURIComponent(q)}&limit=5`);
          if (!open) return;
          const cur = document.getElementById('cp-input');
          if (!cur || cur.value.trim() !== q) return;

          const dynItems = [];
          // Projects
          (r.categories?.projects?.items || []).forEach(p => dynItems.push({
            kind: 'project', label: `📁 ${p.name} (${p.code})`, hint: p.status,
            action: () => Router.navigate(`/projects/${p.id}`)
          }));
          // Artifacts
          (r.categories?.artifacts?.items || []).forEach(a => dynItems.push({
            kind: 'artifact', label: `📄 ${a.file_name}`, hint: `${a.project_code} · ${a.type}`,
            action: () => Router.navigate(`/projects/${a.project_id}/artifacts/${a.id}`)
          }));
          // Tickets
          (r.categories?.tickets?.items || []).forEach(t => dynItems.push({
            kind: 'ticket', label: `🎫 ${t.title}`, hint: `${t.ticket_number} · ${t.priority || 'normal'}`,
            action: () => Router.navigate(`/tickets`)
          }));
          // Messages
          (r.categories?.messages?.items || []).forEach(m => dynItems.push({
            kind: 'message', label: `💬 ${(m.preview || '').slice(0, 60)}…`, hint: `${m.project_code} · ${m.role}`,
            action: () => Router.navigate(`/projects/${m.project_id}`)
          }));
          items = [...filtered, ...dynItems];
          render();
        } catch { /* 비로그인/오류 무시 */ }
      }, 200);
    }
  }

  function execute() {
    const it = items[activeIdx];
    if (!it) return;
    close();
    try { it.action(); } catch (e) { console.error(e); }
  }

  function close() {
    open = false;
    const overlay = document.getElementById('cp-overlay');
    if (overlay) overlay.remove();
    if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
  }

  function show() {
    if (open) {
      const inp = document.getElementById('cp-input');
      if (inp) { inp.focus(); inp.select(); }
      return;
    }
    open = true;
    const overlay = document.createElement('div');
    overlay.id = 'cp-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-start;justify-content:center;z-index:9998;padding-top:10vh';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '명령 팔레트');
    overlay.innerHTML = `
      <div class="card" style="width:600px;max-width:92%;padding:0;overflow:hidden">
        <input id="cp-input" type="text" placeholder="명령 또는 프로젝트 검색…"
               role="combobox" aria-expanded="true" aria-controls="cp-list" aria-autocomplete="list"
               aria-activedescendant="cp-item-0"
               style="width:100%;padding:14px 18px;border:none;border-bottom:1px solid var(--border);background:transparent;font-size:15px;outline:none">
        <div id="cp-list" role="listbox" aria-label="명령 결과" style="max-height:50vh;overflow:auto"></div>
        <div style="padding:8px 14px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);display:flex;gap:14px">
          <span><kbd>↑↓</kbd> 이동</span>
          <span><kbd>Enter</kbd> 선택</span>
          <span><kbd>Esc</kbd> 닫기</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const input = document.getElementById('cp-input');
    input.addEventListener('input', () => refresh(input.value.trim()));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(items.length - 1, activeIdx + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); execute(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); /* 포커스 트랩 — input 외 포커스 이동 차단 */ }
    });

    refresh('');
    setTimeout(() => input.focus(), 30);
  }

  function isOpen() { return open; }

  return { show, close, isOpen };
})();
