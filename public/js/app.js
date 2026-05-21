// Route registration + init
//
// 영역 분리 (C안):
//   사용자 영역 (Shell)  : /, /projects, /intake, /tickets, /search, /activity
//   관리자 영역 (AdminShell): /admin, /admin/users, /admin/settings, /admin/doctor, /admin/assets
//   public               : /login, /invite/:token

// ── 사용자 영역
Router.register('/login', LoginPage.render);
Router.register('/invite/:token', InvitePage.render);
Router.register('/', guard(DashboardPage.render.bind(DashboardPage)));
Router.register('/projects', guard(ProjectsPage.render));
Router.register('/intake/:id', guard(IntakePage.render.bind(IntakePage)));
Router.register('/projects/:id', guard(ProjectDetailPage.render.bind(ProjectDetailPage)));
Router.register('/projects/:id/artifacts/:aid', guard(ArtifactViewerPage.render));
Router.register('/tickets', guard(TicketsPage.render));
Router.register('/search', guard(SearchPage.render));
// /activity는 활동 로그(타인 actor 포함)라 adminGuard로 보호
Router.register('/activity', adminGuard(ActivityPage.render));
Router.register('/me', guard(MePage.render));
Router.register('/kds-design', guard(KdsDesignPage.render.bind(KdsDesignPage)));

// ── 관리자 영역 (admin role 필수)
Router.register('/admin', adminGuard(AdminHomePage.render.bind(AdminHomePage)));
Router.register('/admin/users', adminGuard(AdminUsersPage.render.bind(AdminUsersPage)));
Router.register('/admin/settings', adminGuard(SettingsPage.render));
Router.register('/admin/doctor', adminGuard(DoctorPage.render));
Router.register('/admin/assets', adminGuard(AdminAssetsPage.render.bind(AdminAssetsPage)));
Router.register('/admin/design-systems', adminGuard(AdminDesignSystemsPage.render.bind(AdminDesignSystemsPage)));

// ── 구 URL 호환: /settings, /doctor 진입 시 /admin/settings, /admin/doctor 로 이동
Router.register('/settings', () => { history.replaceState(null, '', '/admin/settings'); return Router.render(); });
Router.register('/doctor',   () => { history.replaceState(null, '', '/admin/doctor');   return Router.render(); });

function guard(handler) {
  return async (params) => {
    if (!API.isAuthed()) {
      history.replaceState(null, '', '/login');
      return LoginPage.render();
    }
    return handler(params);
  };
}

function adminGuard(handler) {
  return async (params) => {
    if (!API.isAuthed()) {
      history.replaceState(null, '', '/login');
      return LoginPage.render();
    }
    const user = API.getUser();
    if (!user || user.role !== 'admin') {
      return AdminShell.renderDenied();
    }
    return handler(params);
  };
}

Router.render();
