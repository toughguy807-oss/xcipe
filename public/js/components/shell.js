// App shell with sidebar GNB (IA-N001, FN-035)
const Shell = {
  render(content, activeNav) {
    const user = API.getUser() || { email: '?', role: 'member' };
    const isAdmin = user.role === 'admin';

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <div class="brand-logo font-eluo"><span class="accent">ELUO</span> XCIPE</div>
            <small>v4.0 · 자동화 플랫폼</small>
            <div id="ai-status-pill" class="ai-status-pill ai-status-unknown" title="AI 연결 상태"></div>
          </div>
          <nav>
            <div class="nav-item ${activeNav==='dashboard'?'active':''}" data-nav="/">대시보드</div>
            <div class="nav-item ${activeNav==='projects'?'active':''}" data-nav="/projects">프로젝트</div>
            <div class="nav-item ${activeNav==='search'?'active':''}" data-nav="/search">검색</div>
            <div class="nav-item ${activeNav==='tickets'?'active':''}" data-nav="/tickets">티켓</div>
            <div class="nav-item ${activeNav==='kds-design'?'active':''}" data-nav="/kds-design">
              KDS 디자인<span class="nav-badge" id="nav-kds-badge" style="display:none"></span>
            </div>
            ${isAdmin ? `<div class="nav-item ${activeNav==='activity'?'active':''}" data-nav="/activity">
              활동<span class="nav-badge" id="nav-notif-badge" style="display:none">0</span>
            </div>` : ''}
          </nav>
          <div class="sidebar-footer">
            <div class="user-email">${escapeHtml(user.email)}</div>
            <span class="badge badge-role-${user.role}">${user.role}</span>
            <button class="btn-secondary-sm" id="me-btn" style="margin-top:6px;width:100%" title="프로필 · 비밀번호 변경">👤 내 계정</button>
            <button class="btn-secondary-sm" id="shortcuts-btn" style="margin-top:6px;width:100%" title="? 키로도 열림">⌨ 단축키</button>
            ${isAdmin ? `<button class="enter-admin-btn" id="enter-admin-btn" title="관리자 콘솔로 이동">🛡 관리자 모드 →</button>` : ''}
            <button class="logout-btn" id="logout-btn">로그아웃</button>
          </div>
        </aside>
        <main class="main">${content}</main>
      </div>
    `;

    app.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => Router.navigate(el.getAttribute('data-nav')));
    });
    app.querySelector('#logout-btn').addEventListener('click', () => {
      API.clearToken();
      Router.navigate('/login');
    });
    const meBtn = app.querySelector('#me-btn');
    if (meBtn) meBtn.addEventListener('click', () => Router.navigate('/me'));
    const scBtn = app.querySelector('#shortcuts-btn');
    if (scBtn) scBtn.addEventListener('click', () => Shortcuts.showHelp());
    const enterAdminBtn = app.querySelector('#enter-admin-btn');
    if (enterAdminBtn) enterAdminBtn.addEventListener('click', () => Router.navigate('/admin'));
    Shell.refreshNotifBadge();
    Shell.refreshAiPill(isAdmin);
    Shell.startKdsJobPolling();
  },

  // KDS 진행 중 job 의 상태를 30초마다 폴링해 사이드바 badge 로 표시.
  // 다른 페이지(예: /projects, /tickets) 보고 있어도 KDS 작업이 완료되면 즉시 알림.
  // localStorage 의 kds-design.jobId 가 진실 source.
  _kdsBadgeTimer: null,
  startKdsJobPolling() {
    if (Shell._kdsBadgeTimer) clearInterval(Shell._kdsBadgeTimer);
    const tick = async () => {
      const badge = document.getElementById('nav-kds-badge');
      if (!badge) return;
      const jobId = localStorage.getItem('kds-design.jobId');
      const notify = localStorage.getItem('kds-design.notify');  // 완료된 알림 (현재 페이지 = kds-design 가 아니면 유지)
      // 현재 페이지가 KDS 디자인이면 알림 자동 해제
      if (location.pathname === '/kds-design') {
        localStorage.removeItem('kds-design.notify');
      }
      if (!jobId && !notify) { badge.style.display = 'none'; return; }
      if (notify) {
        badge.textContent = notify === 'done' ? '완료' : (notify === 'failed' ? '실패' : '중단');
        badge.style.background = notify === 'done' ? '#4caf50' : (notify === 'failed' ? '#f44336' : '#ff9800');
        badge.style.color = '#fff';
        badge.style.display = '';
        return;
      }
      // 진행 중 — 백엔드 폴링
      try {
        const job = await API.get(`/kds-design/job/${jobId}`);
        if (job.status === 'running' || job.status === 'pending') {
          badge.textContent = '진행 중';
          badge.style.background = '#888'; badge.style.color = '#fff';
          badge.style.display = '';
        } else {
          // 완료/실패/orphan — KDS 페이지가 아니면 notify flag 설정
          if (location.pathname !== '/kds-design') {
            localStorage.setItem('kds-design.notify', job.status === 'done' ? 'done' : (job.status === 'orphaned' ? 'orphaned' : 'failed'));
          } else {
            // KDS 페이지면 그쪽 polling 이 처리 — badge 만 정리
            localStorage.removeItem('kds-design.jobId');
          }
          tick(); // 즉시 badge 갱신
        }
      } catch (e) {
        if (e && e.status === 404) {
          localStorage.removeItem('kds-design.jobId');
          badge.style.display = 'none';
        }
      }
    };
    tick();
    Shell._kdsBadgeTimer = setInterval(tick, 30000);
  },

  // U-G3: AI provider 상태 뱃지 — admin만 GET /admin/settings/ai 가능
  //   mock 또는 미설정 시 노란색 경고. claude-api/code 정상 시 초록.
  async refreshAiPill(isAdmin) {
    const pill = document.getElementById('ai-status-pill');
    if (!pill) return;
    if (!isAdmin) {
      // admin이 아니면 상태 모름 — 작은 회색 라벨만 표시
      pill.classList.remove('ai-status-warn', 'ai-status-ok');
      pill.classList.add('ai-status-unknown');
      pill.textContent = 'AI: ?';
      pill.title = 'AI 연결 상태는 admin만 확인 가능';
      return;
    }
    try {
      const r = await API.get('/admin/settings/ai');
      const provider = r.provider || 'mock';
      const hasKey = !!r.has_api_key;
      const isMock = provider === 'mock';
      const needsKey = provider === 'claude-api' && !hasKey;
      const session = r.session || null;

      // claude-code 는 OS 로그인 필수 (키 무관). 미로그인 시 경고.
      const codeNotLogged = provider === 'claude-code' && session && !session.loggedIn;
      const ok = !isMock && !needsKey && !codeNotLogged;

      pill.classList.remove('ai-status-unknown', 'ai-status-warn', 'ai-status-ok');
      pill.classList.add(ok ? 'ai-status-ok' : 'ai-status-warn');

      let label;
      if (isMock) label = 'mock 모드';
      else if (needsKey) label = `${provider} · 키없음`;
      else if (codeNotLogged) label = `${provider} · 미로그인`;
      else if (provider === 'claude-code' && session && session.loggedIn) {
        label = session.plan ? `${provider} · ${session.plan}` : provider;
      } else {
        label = provider;
      }
      pill.textContent = `AI: ${label}`;

      // hover 툴팁: provider/model + email/plan + org
      const titleParts = [];
      if (ok) {
        titleParts.push(provider);
        if (r.model) titleParts.push(r.model);
        if (session && session.email) titleParts.push(session.email);
        if (session && session.plan) titleParts.push(`plan: ${session.plan}`);
        if (session && session.orgName) titleParts.push(session.orgName);
      } else if (isMock) {
        titleParts.push('mock 모드 — 실제 AI 호출 없음. 설정에서 변경 가능.');
      } else if (needsKey) {
        titleParts.push('API 키가 없습니다. 설정에서 등록하세요.');
      } else if (codeNotLogged) {
        titleParts.push(session.hint || '터미널에서 `claude /login` 실행 필요');
      }
      pill.title = titleParts.join(' · ');
      pill.style.cursor = 'pointer';
      pill.onclick = () => Router.navigate('/admin/settings');
    } catch {
      pill.classList.remove('ai-status-warn', 'ai-status-ok');
      pill.classList.add('ai-status-unknown');
      pill.textContent = 'AI: ?';
    }
  },

  async refreshNotifBadge() {
    const badge = document.getElementById('nav-notif-badge');
    if (!badge) return;
    try {
      const r = await API.get('/notifications/unread-count');
      const n = r.unread || 0;
      if (n > 0) {
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch { /* 비로그인/오류 시 무시 */ }
  },

  // 60초마다 배지 갱신 + 페이지 진입 시 호출
  startNotifPolling() {
    if (Shell._notifTimer) return;
    Shell._notifTimer = setInterval(() => Shell.refreshNotifBadge(), 60000);
  }
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(s) {
  if (!s) return '-';
  const d = new Date(s + (s.includes('T') ? '' : 'Z'));
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(s) {
  if (!s) return '-';
  const d = new Date(s + (s.includes('T') ? '' : 'Z'));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return formatDate(s);
}
