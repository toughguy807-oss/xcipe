// Activity feed — 전체 활동 로그 조회·필터 (FN-039 확장)
const ActivityPage = {
  _state: {
    page: 1,
    limit: 30,
    entity_type: '',
    action: '',
    days: '',
    q: ''
  },

  async render() {
    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">활동 피드</div>
          <div class="page-subtitle">시스템 전체 활동 로그</div>
        </div>
      </div>
      <div class="card mb-4">
        <div class="flex gap-2" style="align-items:end;flex-wrap:wrap">
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="text-sm">엔티티</label>
            <select id="af-entity"><option value="">전체</option></select>
          </div>
          <div class="form-group" style="min-width:160px;margin:0">
            <label class="text-sm">액션</label>
            <select id="af-action"><option value="">전체</option></select>
          </div>
          <div class="form-group" style="min-width:120px;margin:0">
            <label class="text-sm">기간</label>
            <select id="af-days">
              <option value="">전체</option>
              <option value="1">1일</option>
              <option value="7" selected>7일</option>
              <option value="30">30일</option>
              <option value="90">90일</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:200px;margin:0">
            <label class="text-sm">검색</label>
            <input id="af-q" type="text" placeholder="entity/action/detail 검색...">
          </div>
          <button class="btn-primary-sm" id="af-apply">적용</button>
          <button class="btn btn-sm" id="af-reset">초기화</button>
          <button class="btn-secondary-sm" id="af-csv">CSV 내보내기</button>
        </div>
      </div>

      <div class="card">
        <div class="flex-between mb-3">
          <h3 style="margin:0">로그</h3>
          <div class="flex gap-2" style="align-items:center">
            <span class="text-sm text-muted" id="af-live-status" style="display:none">● LIVE</span>
            <label class="text-sm" style="display:flex;align-items:center;gap:6px;margin:0">
              <input type="checkbox" id="af-live" style="width:auto;margin:0"> 실시간
            </label>
            <div class="text-sm text-muted" id="af-count">로딩 중...</div>
          </div>
        </div>
        <div id="af-list">로딩 중...</div>
        <div class="flex-between mt-3" id="af-pager" style="display:none">
          <button class="btn btn-sm" id="af-prev">← 이전</button>
          <span class="text-sm text-muted" id="af-page-info"></span>
          <button class="btn btn-sm" id="af-next">다음 →</button>
        </div>
      </div>
    `, 'activity');

    // 활동 페이지 진입 시 알림 일괄 읽음 처리 + 사이드바 배지 갱신
    try {
      await API.post('/notifications/read-all', {});
      if (typeof Shell !== 'undefined' && Shell.refreshNotifBadge) Shell.refreshNotifBadge();
    } catch { /* 무시 */ }

    // 기본 7일을 state에 반영
    ActivityPage._state.days = '7';

    // facets 로드 (엔티티/액션 옵션)
    try {
      const facets = await API.get('/activity/facets?days=30');
      const eSel = document.getElementById('af-entity');
      if (!eSel) return;  // await 도중 다른 페이지로 navigate 시 DOM 사라짐
      facets.entity_types.forEach(f => {
        const o = document.createElement('option');
        o.value = f.name; o.textContent = `${f.name} (${f.count})`;
        eSel.appendChild(o);
      });
      const aSel = document.getElementById('af-action');
      if (!aSel) return;
      facets.actions.forEach(f => {
        const o = document.createElement('option');
        o.value = f.name; o.textContent = `${f.name} (${f.count})`;
        aSel.appendChild(o);
      });
    } catch (err) { console.error('[activity facets]', err); }

    // 이벤트 바인딩
    document.getElementById('af-apply').addEventListener('click', () => {
      ActivityPage._state.entity_type = document.getElementById('af-entity').value;
      ActivityPage._state.action = document.getElementById('af-action').value;
      ActivityPage._state.days = document.getElementById('af-days').value;
      ActivityPage._state.q = document.getElementById('af-q').value.trim();
      ActivityPage._state.page = 1;
      ActivityPage.load();
    });
    document.getElementById('af-reset').addEventListener('click', () => {
      document.getElementById('af-entity').value = '';
      document.getElementById('af-action').value = '';
      document.getElementById('af-days').value = '7';
      document.getElementById('af-q').value = '';
      ActivityPage._state = { page: 1, limit: 30, entity_type: '', action: '', days: '7', q: '' };
      ActivityPage.load();
    });
    document.getElementById('af-q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('af-apply').click();
    });
    document.getElementById('af-prev').addEventListener('click', () => {
      if (ActivityPage._state.page > 1) { ActivityPage._state.page--; ActivityPage.load(); }
    });
    document.getElementById('af-next').addEventListener('click', () => {
      ActivityPage._state.page++; ActivityPage.load();
    });
    document.getElementById('af-live').addEventListener('change', (e) => {
      if (e.target.checked) ActivityPage.startLive(); else ActivityPage.stopLive();
    });
    document.getElementById('af-csv').addEventListener('click', () => {
      const s = ActivityPage._state;
      const params = new URLSearchParams();
      if (s.entity_type) params.set('entity_type', s.entity_type);
      if (s.action) params.set('action', s.action);
      if (s.days) params.set('days', s.days);
      if (s.q) params.set('q', s.q);
      const qs = params.toString();
      API.download(`/activity/export.csv${qs ? '?' + qs : ''}`, `activity_${new Date().toISOString().slice(0,10)}.csv`);
    });

    // 페이지 떠날 때 SSE 정리
    window.addEventListener('beforeunload', () => ActivityPage.stopLive());

    ActivityPage.load();
  },

  _es: null,
  _live: false,
  _retryAttempt: 0,
  _retryTimer: null,
  _lastId: 0,

  startLive() {
    if (ActivityPage._live) return;
    const tok = API.getToken && API.getToken();
    if (!tok) {
      alert('로그인이 필요합니다');
      document.getElementById('af-live').checked = false;
      return;
    }
    ActivityPage._live = true;
    ActivityPage._retryAttempt = 0;
    ActivityPage._lastId = 0;
    ActivityPage._connect();
  },

  _connect() {
    if (!ActivityPage._live) return;
    const tok = API.getToken && API.getToken();
    if (!tok) { ActivityPage.stopLive(); return; }
    const since = ActivityPage._lastId ? `&since=${ActivityPage._lastId}` : '';
    const url = `/api/activity/stream?access_token=${encodeURIComponent(tok)}${since}`;
    const es = new EventSource(url);
    ActivityPage._es = es;
    ActivityPage._setStatus('connecting');

    es.addEventListener('activity', (e) => {
      try {
        const a = JSON.parse(e.data);
        if (a.id) ActivityPage._lastId = Math.max(ActivityPage._lastId, a.id);
        ActivityPage._prependLive(a);
      } catch {}
    });
    es.addEventListener('sync', (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.last_id) ActivityPage._lastId = Math.max(ActivityPage._lastId, d.last_id);
      } catch {}
      ActivityPage._retryAttempt = 0;
      ActivityPage._setStatus('live');
    });
    es.onerror = () => {
      try { es.close(); } catch {}
      ActivityPage._es = null;
      if (!ActivityPage._live) return;
      // 지수 백오프: 1s → 2s → 4s → 8s → 최대 30s. since=lastId 로 누락 복구.
      const delay = Math.min(30000, 1000 * Math.pow(2, ActivityPage._retryAttempt));
      ActivityPage._retryAttempt += 1;
      ActivityPage._setStatus(`reconnect-${Math.round(delay / 1000)}s`);
      ActivityPage._retryTimer = setTimeout(() => ActivityPage._connect(), delay);
    };
  },

  stopLive() {
    ActivityPage._live = false;
    if (ActivityPage._retryTimer) { clearTimeout(ActivityPage._retryTimer); ActivityPage._retryTimer = null; }
    if (ActivityPage._es) {
      try { ActivityPage._es.close(); } catch {}
      ActivityPage._es = null;
    }
    ActivityPage._setStatus(null);
  },

  _setStatus(state) {
    const s = document.getElementById('af-live-status');
    if (!s) return;
    if (!state) { s.style.display = 'none'; return; }
    s.style.display = '';
    if (state === 'live') {
      s.textContent = '● LIVE';
      s.style.color = 'var(--success)';
    } else if (state === 'connecting') {
      s.textContent = '● 연결 중…';
      s.style.color = 'var(--muted)';
    } else if (state.startsWith('reconnect-')) {
      const sec = state.split('-')[1];
      s.textContent = `● 재연결 ${sec}`;
      s.style.color = 'var(--warn)';
    }
  },

  _prependLive(a) {
    const tbody = document.querySelector('#af-list tbody');
    if (!tbody) return;
    const link = ActivityPage._linkable(a);
    const tr = document.createElement('tr');
    if (link) { tr.dataset.link = link; tr.style.cursor = 'pointer'; tr.addEventListener('click', () => Router.navigate(link)); }
    tr.style.background = 'var(--success-bg)';
    tr.innerHTML = `
      <td class="text-sm text-muted" title="${escapeHtml(a.created_at)}">${formatRelative(a.created_at)}</td>
      <td><span class="badge badge-muted">${escapeHtml(a.entity_type)}</span></td>
      <td class="text-sm text-muted">${a.entity_id ?? '-'}</td>
      <td>${ActivityPage._actionBadge(a.action)}</td>
      <td class="text-sm">${escapeHtml(a.detail || '-')}</td>
      <td class="text-sm text-muted">${escapeHtml(a.actor_email || 'system')}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
    setTimeout(() => { tr.style.transition = 'background .8s ease'; tr.style.background = ''; }, 800);
    // 50개 초과시 끝 행 제거 (메모리 보호)
    while (tbody.children.length > 100) tbody.removeChild(tbody.lastChild);
  },

  async load() {
    const s = ActivityPage._state;
    const params = new URLSearchParams();
    params.set('page', s.page);
    params.set('limit', s.limit);
    if (s.entity_type) params.set('entity_type', s.entity_type);
    if (s.action) params.set('action', s.action);
    if (s.days) params.set('days', s.days);
    if (s.q) params.set('q', s.q);

    const list = document.getElementById('af-list');
    list.innerHTML = '<div class="empty">로딩 중...</div>';

    try {
      const r = await API.get(`/activity?${params.toString()}`);
      const total = r.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / s.limit));
      document.getElementById('af-count').textContent = `총 ${total.toLocaleString()}건`;

      if (r.data.length === 0) {
        list.innerHTML = '<div class="empty">조건에 맞는 활동이 없습니다</div>';
        document.getElementById('af-pager').style.display = 'none';
        return;
      }

      list.innerHTML = `
        <table>
          <thead><tr>
            <th style="width:140px">시간</th>
            <th style="width:110px">엔티티</th>
            <th style="width:60px">ID</th>
            <th style="width:140px">액션</th>
            <th>상세</th>
            <th style="width:160px">사용자</th>
          </tr></thead>
          <tbody>
            ${r.data.map(a => {
              const link = ActivityPage._linkable(a);
              return `
                <tr ${link ? `data-link="${link}" style="cursor:pointer"` : ''}>
                  <td class="text-sm text-muted" title="${escapeHtml(a.created_at)}">${formatRelative(a.created_at)}</td>
                  <td><span class="badge badge-muted">${escapeHtml(a.entity_type)}</span></td>
                  <td class="text-sm text-muted">${a.entity_id ?? '-'}</td>
                  <td>${ActivityPage._actionBadge(a.action)}</td>
                  <td class="text-sm">${escapeHtml(a.detail || '-')}</td>
                  <td class="text-sm text-muted">${escapeHtml(a.actor_email || 'system')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      list.querySelectorAll('[data-link]').forEach(row => {
        row.addEventListener('click', () => Router.navigate(row.dataset.link));
      });

      document.getElementById('af-pager').style.display = 'flex';
      document.getElementById('af-page-info').textContent = `${s.page} / ${totalPages} 페이지`;
      document.getElementById('af-prev').disabled = s.page <= 1;
      document.getElementById('af-next').disabled = s.page >= totalPages;
    } catch (err) {
      list.innerHTML = `<div class="empty text-danger">로드 실패: ${escapeHtml(err.message || String(err))}</div>`;
    }
  },

  _linkable(a) {
    // 엔티티별로 상세 페이지 링크 매핑
    if (!a.entity_id) return null;
    if (a.entity_type === 'project') return `/projects/${a.entity_id}`;
    if (a.entity_type === 'pipeline' || a.entity_type === 'pipeline_step') {
      // pipeline_id는 기록되어 있지만 project_id는 알 수 없어 detail로 직링크 어려움 — 무시
      return null;
    }
    if (a.entity_type === 'ticket') return '/tickets';
    return null;
  },

  _actionBadge(action) {
    const map = {
      started: 'info', created: 'info',
      approved: 'success', completed: 'success', resumed: 'success',
      rejected: 'danger', failed: 'danger', cancelled: 'danger',
      paused: 'warn', skipped: 'muted',
      retry: 'warn', zombie_recovered: 'warn', zombie_failed: 'danger'
    };
    const cls = map[action] || 'muted';
    return `<span class="badge badge-${cls}">${escapeHtml(action)}</span>`;
  }
};
