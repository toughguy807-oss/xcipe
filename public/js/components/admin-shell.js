// Admin Shell — 관리자 전용 레이아웃
//   사용자 Shell과 색상/사이드바/상단 띠를 모두 분리해 시각적으로 강하게 구분.
//   adminGuard()를 통과한 핸들러만 이 Shell을 사용한다.
const AdminShell = {
  render(content, activeNav) {
    const user = API.getUser() || { email: '?', role: 'member' };

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar">
          <div class="admin-strip-banner">관리자 모드 · ADMIN</div>
          <div class="admin-sidebar-brand">
            <div class="brand-logo font-eluo"><span class="accent">ELUO</span> XCIPE</div>
            <small>v4.0 · Admin Console</small>
            <div class="admin-mode-pill">시스템 관리</div>
          </div>
          <nav>
            <div class="nav-section-title">개요</div>
            <div class="nav-item ${activeNav==='admin-home'?'active':''}" data-nav="/admin">관리자 홈</div>

            <div class="nav-section-title">운영</div>
            <div class="nav-item ${activeNav==='admin-users'?'active':''}" data-nav="/admin/users">사용자 · 초대</div>
            <div class="nav-item ${activeNav==='admin-assets'?'active':''}" data-nav="/admin/assets">자산 동기화</div>
            <div class="nav-item ${activeNav==='admin-design-systems'?'active':''}" data-nav="/admin/design-systems">디자인 시스템</div>

            <div class="nav-section-title">시스템</div>
            <div class="nav-item ${activeNav==='admin-settings'?'active':''}" data-nav="/admin/settings">시스템 설정</div>
            <div class="nav-item ${activeNav==='admin-doctor'?'active':''}" data-nav="/admin/doctor">자가진단</div>
          </nav>
          <div class="admin-sidebar-footer">
            <div class="user-email">${escapeHtml(user.email)}</div>
            <span class="role-badge">${user.role}</span>
            <button class="btn-secondary-sm" id="me-btn" style="margin-top:6px;width:100%" title="프로필 · 비밀번호 변경">👤 내 계정</button>
            <button class="exit-admin-btn" id="exit-admin-btn" title="사용자 영역으로 돌아가기">← 사용자 모드</button>
            <button class="logout-btn" id="logout-btn">로그아웃</button>
          </div>
        </aside>
        <main class="main">${content}</main>
      </div>
    `;

    app.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => Router.navigate(el.getAttribute('data-nav')));
    });
    const meBtn2 = app.querySelector('#me-btn');
    if (meBtn2) meBtn2.addEventListener('click', () => Router.navigate('/me'));
    app.querySelector('#exit-admin-btn').addEventListener('click', () => Router.navigate('/'));
    app.querySelector('#logout-btn').addEventListener('click', () => {
      API.clearToken();
      Router.navigate('/login');
    });
  },

  // admin이 아닌 사용자가 /admin/* 직접 진입 시 표시
  renderDenied() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="admin-denied">
        <h2>관리자 전용 영역</h2>
        <p>이 페이지는 admin 권한이 필요합니다. 일반 사용자 영역으로 돌아가세요.</p>
        <a class="btn" href="/" data-link>← 사용자 영역으로</a>
      </div>
    `;
  }
};
