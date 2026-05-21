// Login page (IA-P001, FN-029, FN-034)
const LoginPage = {
  async render() {
    document.getElementById('app').innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <h1 class="font-eluo"><span class="accent">ELUO</span> XCIPE</h1>
          <p>웹 에이전시의 기획·디자인·퍼블리싱·QA 워크플로우를<br>자동화하는 플랫폼</p>
          <div id="login-alert"></div>
          <form id="login-form">
            <div class="form-group">
              <label>이메일</label>
              <input type="email" id="email" required autofocus value="admin@eluo.kr">
            </div>
            <div class="form-group">
              <label>비밀번호</label>
              <input type="password" id="password" required value="admin1234">
            </div>
            <button type="submit" class="btn-primary" id="login-btn">로그인</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      btn.disabled = true; btn.textContent = '로그인 중...';
      try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const res = await API.post('/auth/login', { email, password });
        API.setToken(res.token);
        API.setUser(res.user);
        Router.navigate('/');
      } catch (err) {
        document.getElementById('login-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message || '로그인 실패')}</div>`;
        btn.disabled = false; btn.textContent = '로그인';
      }
    });
  }
};

// Invite accept page (FN-034)
const InvitePage = {
  async render({ token }) {
    document.getElementById('app').innerHTML = `<div class="login-page"><div class="login-card"><div id="invite-body">확인 중...</div></div></div>`;
    try {
      const info = await API.get(`/auth/invite/${token}`);
      document.getElementById('invite-body').innerHTML = `
        <h1><span class="accent">ELUO</span> 초대 수락</h1>
        <p>${escapeHtml(info.email)} (${info.role})</p>
        <form id="accept-form">
          <div class="form-group"><label>이름</label><input id="name" required></div>
          <div class="form-group"><label>비밀번호</label><input type="password" id="password" required minlength="8"></div>
          <button type="submit" class="btn-primary">계정 생성</button>
        </form>
      `;
      document.getElementById('accept-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const password = document.getElementById('password').value;
        const res = await API.post(`/auth/invite/${token}/accept`, { name, password });
        API.setToken(res.token);
        API.setUser(res.user);
        Router.navigate('/');
      });
    } catch (err) {
      document.getElementById('invite-body').innerHTML = `<div class="alert alert-error">초대가 유효하지 않습니다</div>`;
    }
  }
};
