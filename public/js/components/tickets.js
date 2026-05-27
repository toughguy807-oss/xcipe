// Ticket board — kanban (IA-P006, FN-024~028)
// T1-A: Asana baseline — priority/due_date/assignee/labels/comments + 상세 모달
const TicketsPage = {
  _users: [],
  _projects: [],

  async render() {
    const user = API.getUser();
    const canEdit = user.role === 'admin' || user.role === 'member';

    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">티켓 보드</div>
          <div class="page-subtitle">운영 티켓 칸반 — 우선순위·담당자·기한·라벨·댓글</div>
        </div>
        ${canEdit ? '<button class="btn-primary" id="new-btn" style="width:auto">+ 새 티켓</button>' : ''}
      </div>
      <div class="flex gap-2 mb-4">
        <select id="project-filter" style="max-width:250px"><option value="">전체 프로젝트</option></select>
        <select id="priority-filter" style="max-width:150px">
          <option value="">전체 우선순위</option>
          <option value="urgent">🔴 긴급</option>
          <option value="high">🟠 높음</option>
          <option value="normal">🟡 보통</option>
          <option value="low">⚪ 낮음</option>
        </select>
        <select id="assignee-filter" style="max-width:200px"><option value="">전체 담당자</option></select>
      </div>
      <div id="kanban" class="kanban">로딩 중...</div>
    `, 'tickets');

    // 프로젝트 목록 + 사용자(담당자 후보) 목록 동시 로드
    const [projects, usersRes] = await Promise.all([
      API.get('/projects?limit=100'),
      // member이면 자기 자신만, admin이면 전체 — admin/users는 admin만 가능하니 try/fallback
      API.get('/admin/users').catch(() => ({}))
    ]);
    this._projects = projects.data;
    this._users = Array.isArray(usersRes) ? usersRes : (usersRes.data || [user]);

    const projFilter = document.getElementById('project-filter');
    if (!projFilter) return;  // await 도중 KDS 등 다른 페이지로 navigate 시 DOM 사라짐
    this._projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = `${p.name} (${p.code})`;
      projFilter.appendChild(opt);
    });
    const aFilter = document.getElementById('assignee-filter');
    if (!aFilter) return;
    this._users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = u.email;
      aFilter.appendChild(opt);
    });

    const load = async () => {
      const qs = new URLSearchParams();
      if (projFilter.value) qs.set('project_id', projFilter.value);
      const pri = document.getElementById('priority-filter').value;
      if (pri) qs.set('priority', pri);
      const asg = document.getElementById('assignee-filter').value;
      if (asg) qs.set('assignee_id', asg);

      const tickets = await API.get(`/tickets?${qs}`);
      const groups = { open: [], in_progress: [], resolved: [], closed: [] };
      tickets.forEach(t => groups[t.status]?.push(t));

      const kanban = document.getElementById('kanban');
      kanban.innerHTML = Object.entries(groups).map(([status, list]) => `
        <div class="kanban-col">
          <h3>${TicketsPage._statusLabel(status)} (${list.length})</h3>
          ${list.map(t => TicketsPage._renderCard(t, canEdit)).join('')}
          ${list.length === 0 ? '<div class="text-muted text-sm" style="text-align:center;padding:20px 0">없음</div>' : ''}
        </div>
      `).join('');

      // 카드 클릭 → 상세 모달
      kanban.querySelectorAll('[data-ticket]').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('[data-next]')) return; // 다음상태 버튼은 별도
          TicketsPage.showDetailModal(+card.dataset.ticket, load, canEdit);
        });
      });
      // 다음 상태 버튼
      kanban.querySelectorAll('[data-next]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await API.put(`/tickets/${btn.dataset.next}/status`, { status: btn.dataset.to });
            load();
          } catch (err) { alert(err.message); }
        });
      });
    };

    projFilter.addEventListener('change', load);
    document.getElementById('priority-filter').addEventListener('change', load);
    document.getElementById('assignee-filter').addEventListener('change', load);
    if (canEdit) {
      document.getElementById('new-btn').addEventListener('click', () => TicketsPage.showCreateModal(load));
    }
    load();
  },

  _statusLabel(s) {
    return ({ open: '열림', in_progress: '진행 중', resolved: '해결됨', closed: '닫힘' })[s] || s;
  },

  _priorityBadge(p) {
    const map = {
      urgent: { icon: '🔴', cls: 'badge-danger',  label: '긴급' },
      high:   { icon: '🟠', cls: 'badge-warn',    label: '높음' },
      normal: { icon: '🟡', cls: 'badge-info',    label: '보통' },
      low:    { icon: '⚪', cls: 'badge-muted',   label: '낮음' }
    };
    const m = map[p] || map.normal;
    return `<span class="badge ${m.cls}" title="우선순위: ${m.label}">${m.icon} ${m.label}</span>`;
  },

  _formatDue(due) {
    if (!due) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(due); d.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    const cls = diff < 0 ? 'text-danger' : diff <= 3 ? 'text-warn' : 'text-muted';
    const txt = diff < 0 ? `지남 ${-diff}d` : diff === 0 ? '오늘' : `${diff}d`;
    return `<span class="text-sm ${cls}" title="기한: ${due}">📅 ${txt}</span>`;
  },

  _renderCard(t, canEdit) {
    const labels = (t.labels || []).slice(0, 3).map(l =>
      `<span class="badge badge-muted text-xs">${escapeHtml(l)}</span>`).join(' ');
    const assignee = t.assignee_email
      ? `<span class="text-xs text-muted" title="담당: ${escapeHtml(t.assignee_email)}">👤 ${escapeHtml(t.assignee_email.split('@')[0])}</span>`
      : '<span class="text-xs text-muted">👤 미배정</span>';
    const comments = t.comment_count > 0
      ? `<span class="text-xs text-muted">💬 ${t.comment_count}</span>`
      : '';
    const next = getNextStatus(t.status);
    const nextBtn = canEdit && next
      ? `<button class="btn-primary-sm mt-2" data-next="${t.id}" data-to="${next}" style="font-size:.7rem">→ ${TicketsPage._statusLabel(next)}</button>`
      : '';

    return `
      <div class="kanban-card" data-ticket="${t.id}" style="cursor:pointer">
        <div class="flex-between" style="gap:.4rem;margin-bottom:.3rem">
          ${TicketsPage._priorityBadge(t.priority)}
          <span class="badge badge-${t.type === 'BUG' ? 'archived' : 'open'} text-xs">${t.type}</span>
        </div>
        <h4 style="margin:.3rem 0 .2rem">${escapeHtml(t.title)}</h4>
        <div class="text-muted text-xs">${escapeHtml(t.ticket_number)}</div>
        ${labels ? `<div style="margin-top:.3rem;display:flex;gap:.2rem;flex-wrap:wrap">${labels}</div>` : ''}
        <div class="kanban-meta" style="margin-top:.5rem;gap:.5rem;display:flex;align-items:center;flex-wrap:wrap">
          ${assignee}
          ${TicketsPage._formatDue(t.due_date)}
          ${comments}
        </div>
        ${nextBtn}
      </div>
    `;
  },

  // T1-A: 티켓 상세 모달 — 좌측 정보·편집 / 우측 댓글 스레드
  async showDetailModal(id, onChange, canEdit) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = '<div class="modal" style="max-width:780px"><div style="padding:2rem;text-align:center">로딩 중...</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    let ticket, comments, history;
    try {
      [ticket, comments, history] = await Promise.all([
        API.get(`/tickets/${id}`),
        API.get(`/tickets/${id}/comments`),
        API.get(`/tickets/${id}/history`)
      ]);
    } catch (err) {
      modal.querySelector('.modal').innerHTML = `<div class="alert alert-error">${err.message}</div><div style="text-align:right;margin-top:1rem"><button class="btn" data-close>닫기</button></div>`;
      modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
      return;
    }

    const labelsStr = (ticket.labels || []).join(', ');
    const usersOpts = TicketsPage._users.map(u =>
      `<option value="${u.id}" ${ticket.assignee_id === u.id ? 'selected' : ''}>${escapeHtml(u.email)}</option>`).join('');

    modal.querySelector('.modal').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 320px;gap:1.5rem;max-height:80vh">
        <!-- 좌측 본문 -->
        <div style="overflow-y:auto;padding-right:.5rem">
          <div class="flex-between" style="margin-bottom:.5rem">
            <div>
              ${TicketsPage._priorityBadge(ticket.priority)}
              <span class="badge badge-${ticket.type === 'BUG' ? 'archived' : 'open'}">${ticket.type}</span>
              <span class="badge badge-${ticket.status === 'closed' ? 'completed' : 'active'}">${TicketsPage._statusLabel(ticket.status)}</span>
            </div>
            <button class="btn-secondary-sm" data-close>✕</button>
          </div>
          <h2 style="margin-bottom:.3rem">${escapeHtml(ticket.title)}</h2>
          <div class="text-muted text-sm mb-3">${escapeHtml(ticket.ticket_number)} · ${escapeHtml(ticket.project_name || '')}</div>

          <div class="form-group">
            <label>설명</label>
            <textarea id="td-desc" rows="4" ${canEdit ? '' : 'disabled'}>${escapeHtml(ticket.description || '')}</textarea>
          </div>

          <hr style="margin:1.5rem 0;border:none;border-top:1px solid var(--border)">

          <h3 style="margin-bottom:.5rem">💬 댓글 (${comments.length})</h3>
          <div id="td-comments" style="max-height:300px;overflow-y:auto;background:var(--panel-soft);padding:.75rem;border-radius:6px;margin-bottom:.75rem">
            ${comments.length === 0
              ? '<div class="text-muted text-sm" style="text-align:center;padding:1rem 0">아직 댓글이 없습니다.</div>'
              : comments.map(c => `
                <div style="padding:.5rem 0;border-bottom:1px solid var(--border)">
                  <div class="flex-between text-xs text-muted" style="margin-bottom:.2rem">
                    <span>${escapeHtml(c.actor_email || '시스템')}</span>
                    <span>${formatRelative(c.created_at)}</span>
                  </div>
                  <div style="white-space:pre-wrap;font-size:.86rem">${escapeHtml(c.body)}</div>
                </div>
              `).join('')}
          </div>

          ${canEdit ? `
            <div class="flex" style="gap:.5rem">
              <textarea id="td-comment-input" rows="2" placeholder="댓글 작성... (Cmd/Ctrl+Enter로 전송)" style="flex:1"></textarea>
              <button class="btn-primary-sm" id="td-comment-send">전송</button>
            </div>
          ` : ''}

          <hr style="margin:1.5rem 0;border:none;border-top:1px solid var(--border)">

          <h3 style="margin-bottom:.5rem">📜 활동 이력 (${history.length})</h3>
          <div style="max-height:200px;overflow-y:auto;font-size:.82rem">
            ${history.map(h => `
              <div class="text-muted" style="padding:.2rem 0">
                ${escapeHtml(h.actor_email || '시스템')} — ${escapeHtml(h.action)}: ${escapeHtml(h.detail || '')} <span class="text-xs">(${formatRelative(h.created_at)})</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 우측 사이드바 -->
        <div style="background:var(--panel-soft);padding:1rem;border-radius:6px;overflow-y:auto">
          <h4 style="margin-bottom:.75rem">속성</h4>
          <div class="form-group">
            <label>담당자</label>
            <select id="td-assignee" ${canEdit ? '' : 'disabled'}>
              <option value="">미배정</option>
              ${usersOpts}
            </select>
          </div>
          <div class="form-group">
            <label>우선순위</label>
            <select id="td-priority" ${canEdit ? '' : 'disabled'}>
              <option value="urgent" ${ticket.priority === 'urgent' ? 'selected' : ''}>🔴 긴급</option>
              <option value="high"   ${ticket.priority === 'high' ? 'selected' : ''}>🟠 높음</option>
              <option value="normal" ${ticket.priority === 'normal' ? 'selected' : ''}>🟡 보통</option>
              <option value="low"    ${ticket.priority === 'low' ? 'selected' : ''}>⚪ 낮음</option>
            </select>
          </div>
          <div class="form-group">
            <label>기한</label>
            <input id="td-due" type="date" value="${ticket.due_date || ''}" ${canEdit ? '' : 'disabled'}>
          </div>
          <div class="form-group">
            <label>예상 (시간)</label>
            <input id="td-estimate" type="number" min="0" value="${ticket.estimate || ''}" ${canEdit ? '' : 'disabled'}>
          </div>
          <div class="form-group">
            <label>라벨 (쉼표 구분)</label>
            <input id="td-labels" value="${escapeHtml(labelsStr)}" placeholder="frontend, urgent" ${canEdit ? '' : 'disabled'}>
          </div>
          ${canEdit ? `<button class="btn-primary" id="td-save" style="width:100%">저장</button>` : ''}
          <div class="text-muted text-xs" style="margin-top:1rem">
            생성: ${escapeHtml(ticket.creator_email || '?')}<br>
            ${formatDate(ticket.created_at)}<br><br>
            ${ticket.started_at ? `시작: ${formatDate(ticket.started_at)}<br>` : ''}
            ${ticket.closed_at ? `종료: ${formatDate(ticket.closed_at)}<br>` : ''}
          </div>
        </div>
      </div>
    `;

    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));

    if (canEdit) {
      // 댓글 전송
      const sendComment = async () => {
        const ta = modal.querySelector('#td-comment-input');
        const body = (ta.value || '').trim();
        if (!body) return;
        try {
          await API.post(`/tickets/${id}/comments`, { body });
          modal.remove();
          await TicketsPage.showDetailModal(id, onChange, canEdit);
          onChange();
        } catch (err) { alert(err.message); }
      };
      modal.querySelector('#td-comment-send').addEventListener('click', sendComment);
      modal.querySelector('#td-comment-input').addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendComment();
      });

      // 속성 저장
      modal.querySelector('#td-save').addEventListener('click', async () => {
        const labels = modal.querySelector('#td-labels').value
          .split(',').map(s => s.trim()).filter(Boolean);
        const data = {
          description: modal.querySelector('#td-desc').value,
          assignee_id: modal.querySelector('#td-assignee').value ? +modal.querySelector('#td-assignee').value : null,
          priority: modal.querySelector('#td-priority').value,
          due_date: modal.querySelector('#td-due').value || null,
          estimate: modal.querySelector('#td-estimate').value ? +modal.querySelector('#td-estimate').value : null,
          labels
        };
        try {
          await API.put(`/tickets/${id}`, data);
          modal.remove();
          onChange();
        } catch (err) { alert(err.message); }
      });
    }
  },

  showCreateModal(onSuccess) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    const usersOpts = TicketsPage._users.map(u =>
      `<option value="${u.id}">${escapeHtml(u.email)}</option>`).join('');

    modal.innerHTML = `
      <div class="modal" style="max-width:560px">
        <h2>새 티켓</h2>
        <div class="form-group"><label>프로젝트</label>
          <select id="t-project">
            ${TicketsPage._projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.code)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>제목</label><input id="t-title" required></div>
        <div class="flex gap-2">
          <div class="form-group" style="flex:1"><label>타입</label>
            <select id="t-type">
              <option value="TXT">TXT (텍스트)</option>
              <option value="STR">STR (구조)</option>
              <option value="FNC" selected>FNC (기능)</option>
              <option value="IMG">IMG (이미지)</option>
              <option value="BUG">BUG (버그)</option>
            </select>
          </div>
          <div class="form-group" style="flex:1"><label>우선순위</label>
            <select id="t-priority">
              <option value="urgent">🔴 긴급</option>
              <option value="high">🟠 높음</option>
              <option value="normal" selected>🟡 보통</option>
              <option value="low">⚪ 낮음</option>
            </select>
          </div>
        </div>
        <div class="flex gap-2">
          <div class="form-group" style="flex:1"><label>담당자</label>
            <select id="t-assignee">
              <option value="">미배정</option>${usersOpts}
            </select>
          </div>
          <div class="form-group" style="flex:1"><label>기한</label>
            <input id="t-due" type="date">
          </div>
        </div>
        <div class="flex gap-2">
          <div class="form-group" style="flex:1"><label>예상 (시간)</label>
            <input id="t-estimate" type="number" min="0">
          </div>
          <div class="form-group" style="flex:1"><label>라벨 (쉼표 구분)</label>
            <input id="t-labels" placeholder="frontend, urgent">
          </div>
        </div>
        <div class="form-group"><label>설명</label><textarea id="t-desc" rows="3"></textarea></div>
        <div class="modal-footer">
          <button class="btn" data-close>취소</button>
          <button class="btn-primary-sm" id="create-t">생성</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('create-t').addEventListener('click', async () => {
      const labels = document.getElementById('t-labels').value
        .split(',').map(s => s.trim()).filter(Boolean);
      try {
        await API.post('/tickets', {
          project_id: +document.getElementById('t-project').value,
          title: document.getElementById('t-title').value,
          type: document.getElementById('t-type').value,
          priority: document.getElementById('t-priority').value,
          assignee_id: document.getElementById('t-assignee').value ? +document.getElementById('t-assignee').value : null,
          due_date: document.getElementById('t-due').value || null,
          estimate: document.getElementById('t-estimate').value ? +document.getElementById('t-estimate').value : null,
          labels,
          description: document.getElementById('t-desc').value
        });
        modal.remove();
        onSuccess();
      } catch (err) { alert(err.message); }
    });
  }
};

function getNextStatus(current) {
  const map = { open: 'in_progress', in_progress: 'resolved', resolved: 'closed', closed: null };
  return map[current];
}
