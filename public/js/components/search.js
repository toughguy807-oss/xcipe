// Cross-project search — 전 프로젝트 산출물·프로젝트 검색
const SearchPage = {
  _state: { q: '', type: '', days: '', scope: 'artifacts' },

  _debounceTimer: null,

  _readQueryString() {
    const p = new URLSearchParams(location.search);
    return {
      q: p.get('q') || '',
      type: p.get('type') || '',
      days: p.get('days') || '',
      scope: p.get('scope') === 'projects' ? 'projects' : 'artifacts'
    };
  },

  _writeQueryString(s) {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.type) p.set('type', s.type);
    if (s.days) p.set('days', s.days);
    if (s.scope && s.scope !== 'artifacts') p.set('scope', s.scope);
    const qs = p.toString();
    const newUrl = '/search' + (qs ? '?' + qs : '');
    if (location.pathname + location.search !== newUrl) {
      history.replaceState(null, '', newUrl);
    }
  },

  async render() {
    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">전체 검색</div>
          <div class="page-subtitle">프로젝트·산출물 본문 통합 검색</div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="flex gap-2" style="align-items:end;flex-wrap:wrap">
          <div class="form-group" style="flex:1;min-width:240px;margin:0">
            <label class="text-sm">검색어 (2글자 이상)</label>
            <input id="sq" type="text" placeholder="예: REQ-001, ChatGPT, 로그인 플로우..." autofocus>
          </div>
          <div class="form-group" style="min-width:140px;margin:0">
            <label class="text-sm">대상</label>
            <select id="sscope">
              <option value="artifacts" selected>산출물</option>
              <option value="projects">프로젝트</option>
            </select>
          </div>
          <div class="form-group" style="min-width:140px;margin:0">
            <label class="text-sm">유형 (산출물)</label>
            <select id="stype">
              <option value="">전체</option>
              <option value="qst">QST</option>
              <option value="req">REQ</option>
              <option value="fn">FN</option>
              <option value="ia">IA</option>
              <option value="wbs">WBS</option>
              <option value="sb">SB</option>
              <option value="dashboard">Dashboard</option>
              <option value="design">Design</option>
              <option value="publish">Publish</option>
              <option value="qa">QA</option>
            </select>
          </div>
          <div class="form-group" style="min-width:120px;margin:0">
            <label class="text-sm">기간</label>
            <select id="sdays">
              <option value="">전체</option>
              <option value="7">7일</option>
              <option value="30">30일</option>
              <option value="90">90일</option>
            </select>
          </div>
          <button class="btn-primary-sm" id="sgo">검색</button>
        </div>
      </div>

      <div class="card">
        <div class="flex-between mb-3">
          <h3 style="margin:0">결과</h3>
          <div class="text-sm text-muted" id="sinfo">검색어를 입력하세요</div>
        </div>
        <div id="sresults"><div class="empty">검색 대기 중</div></div>
      </div>
    `, 'search');

    document.getElementById('sgo').addEventListener('click', () => SearchPage.run());
    document.getElementById('sq').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (SearchPage._debounceTimer) clearTimeout(SearchPage._debounceTimer);
        SearchPage.run();
      }
    });
    document.getElementById('sq').addEventListener('input', (e) => {
      // 350ms debounce — 2자 이상이면 자동 검색
      if (SearchPage._debounceTimer) clearTimeout(SearchPage._debounceTimer);
      const v = e.target.value.trim();
      if (v.length < 2) return;
      SearchPage._debounceTimer = setTimeout(() => SearchPage.run(), 350);
    });
    document.getElementById('sscope').addEventListener('change', (e) => {
      document.getElementById('stype').disabled = e.target.value !== 'artifacts';
    });

    // URL 쿼리스트링에서 초기값 복원
    const qs = SearchPage._readQueryString();
    if (qs.q) document.getElementById('sq').value = qs.q;
    if (qs.type) document.getElementById('stype').value = qs.type;
    if (qs.days) document.getElementById('sdays').value = qs.days;
    if (qs.scope) {
      document.getElementById('sscope').value = qs.scope;
      document.getElementById('stype').disabled = qs.scope !== 'artifacts';
    }
    if (qs.q && qs.q.length >= 2) SearchPage.run();
  },

  async run() {
    const q = document.getElementById('sq').value.trim();
    if (q.length < 2) {
      alert('검색어는 2글자 이상 입력하세요');
      return;
    }
    const scope = document.getElementById('sscope').value;
    const type = document.getElementById('stype').value;
    const days = document.getElementById('sdays').value;

    SearchPage._writeQueryString({ q, scope, type, days });

    const results = document.getElementById('sresults');
    const info = document.getElementById('sinfo');
    results.innerHTML = '<div class="empty">검색 중...</div>';
    info.textContent = '...';

    try {
      const params = new URLSearchParams();
      params.set('q', q);
      if (type && scope === 'artifacts') params.set('type', type);
      if (days) params.set('days', days);

      const r = await API.get(`/search/${scope}?${params.toString()}`);
      info.textContent = scope === 'artifacts'
        ? `${r.total}건 (파일명 ${r.file_name_matches} + 본문 ${r.content_matches})`
        : `${r.total}건`;

      if (r.total === 0) {
        results.innerHTML = '<div class="empty">결과가 없습니다</div>';
        return;
      }

      if (scope === 'artifacts') {
        results.innerHTML = r.results.map((a, i) => `
          <div class="search-result" data-pid="${a.project_id}" data-aid="${a.id}" style="padding:12px;border-bottom:1px solid var(--border)">
            <div class="flex-between" style="margin-bottom:4px">
              <strong>
                <span class="text-muted text-sm" style="margin-right:6px">#${i + 1}</span>
                ${escapeHtml(a.file_name)}
              </strong>
              <div class="flex gap-2">
                <span class="badge badge-${a.match_in === 'content' ? 'info' : 'success'}">${a.match_in === 'content' ? '본문' : '파일명'}</span>
                <span class="badge badge-muted" title="관련도 점수">★ ${a.score || 0}</span>
              </div>
            </div>
            <div class="text-sm text-muted" style="margin-bottom:6px">
              <span class="badge badge-muted">${escapeHtml(a.type)}</span>
              ${escapeHtml(a.project_name)} (${escapeHtml(a.project_code)}) · ${formatRelative(a.created_at)}
            </div>
            ${a.snippet ? `<div class="text-sm" style="background:var(--bg);padding:6px 10px;border-radius:4px;margin-top:4px;border:1px solid var(--border)">${escapeHtml(a.snippet)}</div>` : ''}
            <div class="flex gap-2 mt-2" style="margin-top:8px">
              ${a.match_in === 'content' ? `<button class="btn-secondary-sm sr-expand" data-aid="${a.id}">컨텍스트 펼치기 ▾</button>` : ''}
              <button class="btn-secondary-sm sr-open" data-pid="${a.project_id}" data-aid="${a.id}">열기</button>
            </div>
            <div class="sr-context" data-aid="${a.id}" style="display:none;margin-top:8px"></div>
          </div>
        `).join('');

        results.querySelectorAll('.sr-open').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            Router.navigate(`/projects/${el.dataset.pid}/artifacts/${el.dataset.aid}`);
          });
        });
        results.querySelectorAll('.sr-expand').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            SearchPage.toggleContext(el, q);
          });
        });
      } else {
        results.innerHTML = r.results.map(p => `
          <div class="search-result" data-pid="${p.id}" style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer">
            <div class="flex-between" style="margin-bottom:4px">
              <strong>${escapeHtml(p.name)} <span class="text-muted">(${escapeHtml(p.code)})</span></strong>
              <span class="badge badge-${p.status}">${p.status}</span>
            </div>
            <div class="text-sm text-muted" style="margin-bottom:4px">
              ${escapeHtml(p.type || '-')} · L${p.completion_level || 1} · ${formatRelative(p.created_at)}
            </div>
            ${p.description ? `<div class="text-sm">${escapeHtml(p.description.slice(0, 200))}${p.description.length > 200 ? '…' : ''}</div>` : ''}
          </div>
        `).join('');

        results.querySelectorAll('.search-result').forEach(el => {
          el.addEventListener('click', () => {
            Router.navigate(`/projects/${el.dataset.pid}`);
          });
        });
      }
    } catch (err) {
      results.innerHTML = `<div class="empty text-danger">검색 실패: ${escapeHtml(err.message || String(err))}</div>`;
      info.textContent = '오류';
    }
  },

  async toggleContext(btn, q) {
    const aid = btn.dataset.aid;
    const target = document.querySelector(`.sr-context[data-aid="${aid}"]`);
    if (!target) return;
    if (target.style.display !== 'none' && target.dataset.loaded === '1') {
      target.style.display = 'none';
      btn.textContent = '컨텍스트 펼치기 ▾';
      return;
    }
    if (target.dataset.loaded === '1') {
      target.style.display = 'block';
      btn.textContent = '컨텍스트 접기 ▴';
      return;
    }
    target.style.display = 'block';
    target.innerHTML = '<div class="text-sm text-muted" style="padding:6px">불러오는 중…</div>';
    try {
      const r = await API.get(`/search/artifacts/${aid}/context?q=${encodeURIComponent(q)}`);
      if (!r.segments || r.segments.length === 0) {
        target.innerHTML = '<div class="text-sm text-muted" style="padding:6px">매칭 본문 없음</div>';
      } else {
        target.innerHTML = `
          <div class="text-sm text-muted" style="margin-bottom:6px">
            매칭 ${r.total_matches}건${r.truncated ? '+ (5개까지만 표시)' : ''}
          </div>
          ${r.segments.map(seg => {
            const before = escapeHtml(seg.text.slice(0, seg.match_in_segment));
            const hit    = escapeHtml(seg.text.slice(seg.match_in_segment, seg.match_in_segment + q.length));
            const after  = escapeHtml(seg.text.slice(seg.match_in_segment + q.length));
            return `
              <pre style="background:var(--bg);padding:10px 12px;border-radius:4px;border:1px solid var(--border);white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:13px;margin-bottom:6px">${seg.truncated_left ? '…' : ''}${before}<mark style="background:var(--yellow);color:var(--navy);padding:0 2px">${hit}</mark>${after}${seg.truncated_right ? '…' : ''}</pre>
            `;
          }).join('')}
        `;
      }
      target.dataset.loaded = '1';
      btn.textContent = '컨텍스트 접기 ▴';
    } catch (e) {
      target.innerHTML = `<div class="text-sm text-danger" style="padding:6px">${escapeHtml(e.message || '오류')}</div>`;
    }
  }
};
