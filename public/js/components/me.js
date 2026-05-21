// MePage — /me (본인 계정 · 비밀번호 변경)
//   모든 인증된 사용자(admin/member) 접근 가능. 일반 Shell 사용.
//   admin 전용 settings 페이지에 박혀 있던 비밀번호 변경 카드를 여기로 분리한다.
const MePage = {
  async render() {
    const me = API.getUser() || { email: '?', name: '-', role: 'member' };
    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">내 계정</div>
          <div class="page-subtitle">프로필 · 비밀번호</div>
        </div>
      </div>

      <div class="grid grid-2 mb-4">
        <div class="card">
          <h3 class="mb-3">프로필</h3>
          <table>
            <tr><td class="text-muted">이름</td><td>${escapeHtml(me.name || '-')}</td></tr>
            <tr><td class="text-muted">이메일</td><td>${escapeHtml(me.email)}</td></tr>
            <tr><td class="text-muted">역할</td><td><span class="badge badge-role-${me.role}">${me.role}</span></td></tr>
          </table>
        </div>

        <div class="card">
          <h3 class="mb-3">비밀번호 변경</h3>
          <div class="form-group"><label>현재 비밀번호</label><input type="password" id="cur-pw" autocomplete="current-password"></div>
          <div class="form-group"><label>새 비밀번호</label><input type="password" id="new-pw" autocomplete="new-password"></div>
          <button class="btn-primary-sm" id="pw-btn">변경</button>
          <div id="pw-alert" class="mt-2"></div>
        </div>
      </div>
    `, 'me');

    document.getElementById('pw-btn').addEventListener('click', async () => {
      const alert = document.getElementById('pw-alert');
      const cur = document.getElementById('cur-pw').value;
      const next = document.getElementById('new-pw').value;
      if (!cur || !next) {
        alert.innerHTML = '<div class="alert alert-error">두 필드 모두 입력하세요</div>';
        return;
      }
      try {
        await API.put('/users/me/password', { current_password: cur, new_password: next });
        alert.innerHTML = '<div class="alert alert-success">변경되었습니다</div>';
        document.getElementById('cur-pw').value = '';
        document.getElementById('new-pw').value = '';
      } catch (err) {
        alert.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      }
    });
  }
};
