// AdminUsersPage — /admin/users (사용자 · 초대 관리)
//   - GET /api/admin/users 로 목록
//   - POST /api/admin/invite 로 초대 토큰 발급
//   - PUT /api/admin/users/:id/role 로 역할 변경
const AdminUsersPage = {
  _users: [],

  async render() {
    AdminShell.render('<div class="empty">로딩 중...</div>', 'admin-users');
    await this.load();
  },

  async load() {
    try {
      const users = await API.get('/admin/users');
      this._users = Array.isArray(users) ? users : [];
    } catch (e) {
      this._users = [];
    }
    this.draw();
  },

  draw() {
    const me = API.getUser() || {};
    const rows = this._users.map(u => {
      const isMe = u.id === me.id;
      const roleSelect = isMe
        ? `<span class="badge badge-role-${u.role}">${u.role}</span><span class="text-muted text-sm" style="margin-left:8px">본인 — 변경 불가</span>`
        : `<select data-user-id="${u.id}" class="role-select">
            <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
            <option value="member" ${u.role==='member'?'selected':''}>member</option>
          </select>`;
      // v25: 워커 토큰 발급/회수 — 분산 워커 인증
      const workerCell = u.has_worker_token
        ? `<button class="btn-secondary-sm worker-rotate" data-user-id="${u.id}" data-email="${escapeHtml(u.email)}">재발급</button>
           <button class="btn-secondary-sm worker-revoke" data-user-id="${u.id}" data-email="${escapeHtml(u.email)}" style="margin-left:4px">회수</button>`
        : `<button class="btn-secondary-sm worker-issue" data-user-id="${u.id}" data-email="${escapeHtml(u.email)}">토큰 발급</button>`;
      return `
        <tr>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.name || '-')}</td>
          <td><div class="role-cell">${roleSelect}</div></td>
          <td>${formatDate(u.created_at)}</td>
          <td>${workerCell}</td>
        </tr>
      `;
    }).join('');

    AdminShell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">사용자 · 초대</div>
          <div class="page-subtitle">총 ${this._users.length}명 · admin/member/guest 역할 관리 · 초대 토큰 발급</div>
        </div>
        <div class="page-actions">
          <button class="btn-primary" id="invite-btn">+ 새 사용자 초대</button>
        </div>
      </div>

      <div id="invite-result"></div>

      <div class="card admin-users-table">
        <table>
          <thead>
            <tr>
              <th>이메일</th>
              <th>이름</th>
              <th>역할</th>
              <th>가입일</th>
              <th>워커 토큰</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:24px">사용자가 없습니다</td></tr>'}</tbody>
        </table>
      </div>
    `, 'admin-users');

    document.getElementById('invite-btn').addEventListener('click', () => this.showInviteModal());
    document.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-user-id');
        const newRole = e.target.value;
        if (!confirm(`이 사용자의 역할을 "${newRole}"로 변경합니다. 계속할까요?`)) {
          await this.load();
          return;
        }
        try {
          await API.put(`/admin/users/${id}/role`, { role: newRole });
          await this.load();
        } catch (err) {
          alert(`역할 변경 실패: ${err.message || err}`);
          await this.load();
        }
      });
    });

    // v25: 워커 토큰 발급/회수
    const issueOrRotate = async (e) => {
      const id = e.target.getAttribute('data-user-id');
      const email = e.target.getAttribute('data-email');
      const isRotate = e.target.classList.contains('worker-rotate');
      if (isRotate && !confirm(`${email}의 워커 토큰을 재발급합니다.\n기존 토큰은 즉시 무효화됩니다. 계속할까요?`)) return;
      try {
        const r = await API.post(`/admin/users/${id}/worker-token`);
        this.showWorkerTokenModal(email, r.worker_token);
        await this.load();
      } catch (err) {
        alert(`워커 토큰 발급 실패: ${err.message || err}`);
      }
    };
    document.querySelectorAll('.worker-issue, .worker-rotate').forEach(b => b.addEventListener('click', issueOrRotate));
    document.querySelectorAll('.worker-revoke').forEach(b => {
      b.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-user-id');
        const email = e.target.getAttribute('data-email');
        if (!confirm(`${email}의 워커 토큰을 회수합니다. 해당 사용자의 워커는 더 이상 작업을 받을 수 없습니다.`)) return;
        try {
          await API.del(`/admin/users/${id}/worker-token`);
          await this.load();
        } catch (err) {
          alert(`워커 토큰 회수 실패: ${err.message || err}`);
        }
      });
    });
  },

  // v25: 토큰 발급 결과 모달 — plaintext 1회 노출
  showWorkerTokenModal(email, token) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal" style="max-width:560px">
        <h3 class="mb-3">워커 토큰 발급 완료</h3>
        <p>대상: <strong>${escapeHtml(email)}</strong></p>
        <div class="alert alert-warning mb-2">
          이 토큰은 <strong>이번 1회</strong>만 표시됩니다. 안전한 곳에 저장하세요. 분실 시 재발급 필요.
        </div>
        <div class="form-group">
          <label>워커 토큰 (64자 hex)</label>
          <code style="display:block;padding:10px;background:#f5f5f5;border-radius:4px;word-break:break-all;font-size:12px">${token}</code>
        </div>
        <div class="form-group">
          <label>사용자 PC 설치 명령</label>
          <pre style="padding:10px;background:#1a1a1a;color:#fff;border-radius:4px;font-size:11px;overflow:auto">git clone https://github.com/eluoaxjun/xcipe.git
cd xcipe && npm install
npm install -g @anthropic-ai/claude-code
claude /login   # 본인 Claude 계정 OAuth

# 환경변수 설정 후 실행
export XCIPE_SERVER=${location.origin}
export XCIPE_WORKER_TOKEN=${token}
npm run worker</pre>
        </div>
        <div class="flex" style="gap:8px;justify-content:flex-end">
          <button class="btn-secondary-sm" id="copy-token-btn">토큰 복사</button>
          <button class="btn-primary" id="close-token-modal" style="width:auto;padding:10px 20px">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector('#copy-token-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(token);
      alert('토큰이 클립보드에 복사되었습니다');
    });
    wrap.querySelector('#close-token-modal').addEventListener('click', () => wrap.remove());
  },

  showInviteModal() {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal" style="max-width:440px">
        <h3 class="mb-3">새 사용자 초대</h3>
        <div class="form-group">
          <label>이메일</label>
          <input type="email" id="invite-email" placeholder="user@example.com" required>
        </div>
        <div class="form-group">
          <label>역할</label>
          <select id="invite-role">
            <option value="member" selected>member</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div class="flex" style="gap:8px;justify-content:flex-end">
          <button class="btn-secondary-sm" id="invite-cancel">취소</button>
          <button class="btn-primary" id="invite-submit" style="width:auto;padding:10px 20px">초대 발송</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('#invite-cancel').addEventListener('click', () => wrap.remove());
    wrap.querySelector('#invite-submit').addEventListener('click', async () => {
      const email = wrap.querySelector('#invite-email').value.trim();
      const role = wrap.querySelector('#invite-role').value;
      if (!email) return alert('이메일을 입력하세요');
      try {
        const r = await API.post('/admin/invite', { email, role });
        wrap.remove();
        const result = document.getElementById('invite-result');
        const link = `${location.origin}/invite/${r.token}`;
        result.innerHTML = `
          <div class="alert alert-success mb-3" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:240px">
              <strong>초대 토큰 생성:</strong> ${escapeHtml(email)} (${role})
              <br><small><code>${link}</code></small>
            </div>
            <button class="btn-secondary-sm" id="copy-invite">링크 복사</button>
          </div>
        `;
        document.getElementById('copy-invite').addEventListener('click', () => {
          navigator.clipboard.writeText(link);
          alert('초대 링크가 복사되었습니다');
        });
        await this.load();
      } catch (err) {
        alert(`초대 실패: ${err.message || err}`);
      }
    });
  }
};
