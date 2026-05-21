// AdminHomePage — /admin (관리자 홈)
//   사용자 수, 시스템 상태, 자산 동기화 대기, 최근 admin 활동 요약을 한 화면에 모아 보여준다.
const AdminHomePage = {
  async render() {
    AdminShell.render('<div class="empty">로딩 중...</div>', 'admin-home');

    const [usersRes, doctorRes, assetsRes] = await Promise.allSettled([
      API.get('/admin/users'),
      API.get('/doctor'),
      API.get('/admin/assets/summary')
    ]);

    const users = usersRes.status === 'fulfilled' ? usersRes.value : [];
    const doctor = doctorRes.status === 'fulfilled' ? doctorRes.value : null;
    const assetSummary = assetsRes.status === 'fulfilled' ? assetsRes.value : null;

    const userCount = Array.isArray(users) ? users.length : 0;
    const adminCount = Array.isArray(users) ? users.filter(u => u.role === 'admin').length : 0;
    const memberCount = Array.isArray(users) ? users.filter(u => u.role === 'member').length : 0;

    const overall = doctor && doctor.overall ? doctor.overall : 'unknown';
    const overallText = { pass: '정상', warn: '주의', fail: '오류', unknown: '확인 필요' }[overall] || overall;
    const overallTone = { pass: 'success', warn: 'warn', fail: 'danger', unknown: 'muted' }[overall] || 'muted';

    const byStatus = (assetSummary && assetSummary.byStatus) || {};
    const pendingAssets = ['behind', 'divergent', 'orphan', 'new', 'pending_approval']
      .reduce((sum, k) => sum + (byStatus[k] || 0), 0);

    AdminShell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">관리자 홈</div>
          <div class="page-subtitle">시스템 운영 현황 · 사용자 · 자산 · 진단</div>
        </div>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="card stat-card" onclick="Router.navigate('/admin/users')" style="cursor:pointer">
          <div class="stat-label">사용자</div>
          <div class="stat-value">${userCount}</div>
          <div class="stat-sub">admin ${adminCount} · member ${memberCount}</div>
        </div>
        <div class="card stat-card" onclick="Router.navigate('/admin/doctor')" style="cursor:pointer">
          <div class="stat-label">시스템 진단</div>
          <div class="stat-value">
            <span class="badge badge-${overallTone}">${overallText}</span>
          </div>
          <div class="stat-sub">자가진단 결과</div>
        </div>
        <div class="card stat-card" onclick="Router.navigate('/admin/assets')" style="cursor:pointer">
          <div class="stat-label">자산 동기화 대기</div>
          <div class="stat-value">${pendingAssets}</div>
          <div class="stat-sub">behind · divergent · orphan · new</div>
        </div>
        <div class="card stat-card" onclick="Router.navigate('/admin/settings')" style="cursor:pointer">
          <div class="stat-label">시스템 설정</div>
          <div class="stat-value" style="font-size:1.05rem;line-height:1.4">AI · 알림 · 비용</div>
          <div class="stat-sub">설정 페이지로 이동</div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3 class="mb-3">빠른 작업</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <a href="/admin/users" data-link class="btn btn-secondary-sm" style="text-align:left;padding:10px 14px">👤 사용자 초대 / 역할 변경</a>
            <a href="/admin/settings" data-link class="btn btn-secondary-sm" style="text-align:left;padding:10px 14px">⚙ AI 키 · SMTP · 비용 한도</a>
            <a href="/admin/assets" data-link class="btn btn-secondary-sm" style="text-align:left;padding:10px 14px">📦 ~/.claude 자산 동기화</a>
            <a href="/admin/doctor" data-link class="btn btn-secondary-sm" style="text-align:left;padding:10px 14px">🩺 시스템 자가진단 실행</a>
          </div>
        </div>

        <div class="card">
          <h3 class="mb-3">사용자 영역</h3>
          <div class="text-muted text-sm mb-3">관리자도 일반 사용자와 동일하게 프로젝트를 작업할 수 있습니다. 사이드바 하단의 <strong>← 사용자 모드</strong> 버튼으로 전환하세요.</div>
          <a href="/" data-link class="btn-primary" style="display:inline-block;text-align:center;text-decoration:none;color:var(--navy)">사용자 영역으로 이동</a>
        </div>
      </div>
    `, 'admin-home');
  }
};
