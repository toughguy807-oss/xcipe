// Projects list (IA-P003, FN-006~008)
const ProjectsPage = {
  async render() {
    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">프로젝트</div>
          <div class="page-subtitle">전체 프로젝트 목록</div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm" id="export-csv-btn" title="현재 필터로 보이는 목록을 CSV로 저장">CSV 내보내기</button>
          <button class="btn btn-sm" id="import-btn">JSON 가져오기</button>
          <button class="btn-primary" id="new-btn" style="width:auto">+ 새 프로젝트</button>
        </div>
      </div>
      <div class="flex gap-2 mb-4">
        <input id="search" placeholder="이름/코드 검색" style="max-width:300px">
        <select id="status-filter" style="max-width:150px">
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="paused">일시정지</option>
          <option value="completed">완료</option>
          <option value="archived">아카이브</option>
        </select>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none">
      <div id="project-list">로딩 중...</div>
    `, 'projects');

    const load = async () => {
      const search = document.getElementById('search').value;
      const status = document.getElementById('status-filter').value;
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      // archived 상태는 deleted_at IS NOT NULL 이므로 archived_only=1로 조회
      if (status === 'archived') {
        qs.set('archived_only', '1');
      } else if (status) {
        qs.set('status', status);
      }
      const res = await API.get(`/projects?${qs}`);
      const el = document.getElementById('project-list');
      if (res.data.length === 0) {
        if (status === 'archived') {
          el.innerHTML = `<div class="empty">아카이브된 프로젝트가 없습니다.</div>`;
        } else {
          el.innerHTML = `<div class="empty">
            <div>프로젝트가 없습니다.</div>
            <button class="btn-primary mt-2" onclick="DashboardPage.startNewProject()">+ 대화로 새 프로젝트 시작</button>
          </div>`;
        }
      } else {
        el.innerHTML = `<div class="grid grid-3">${res.data.map(p => {
          const isArchived = p.status === 'archived';
          return `
          <div class="card project-card${isArchived ? ' project-archived' : ''}" data-pid="${p.id}">
            <div class="flex-between mb-2">
              <span class="badge badge-${p.status}">${p.status}</span>
              <span class="project-code">${escapeHtml(p.code)}</span>
            </div>
            <h3>${escapeHtml(p.name)}</h3>
            <div class="text-muted text-sm mb-2">${escapeHtml(p.description || '설명 없음')}</div>
            <div class="text-sm">산출물 ${p.artifact_count} · 티켓 ${p.open_ticket_count}</div>
            <div class="flex-between mt-2">
              <span class="text-muted text-sm">${formatRelative(p.updated_at)}</span>
              ${isArchived ? `<button class="btn btn-sm" data-restore="${p.id}">복원</button>` : ''}
            </div>
          </div>
        `;}).join('')}</div>`;
        el.querySelectorAll('[data-pid]').forEach(c => {
          c.addEventListener('click', (e) => {
            // 복원 버튼 클릭 시 카드 진입 막음
            if (e.target.closest('[data-restore]')) return;
            Router.navigate(`/projects/${c.dataset.pid}`);
          });
        });
        el.querySelectorAll('[data-restore]').forEach(b => {
          b.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('이 프로젝트를 복원하시겠습니까?')) return;
            try {
              await API.post(`/projects/${b.dataset.restore}/restore`, {});
              load();
            } catch (err) { alert('복원 실패: ' + err.message); }
          });
        });
      }
    };

    document.getElementById('search').addEventListener('input', debounce(load, 300));
    document.getElementById('status-filter').addEventListener('change', load);
    // 새 프로젝트는 intake-agent 대화 흐름으로 단일 진입 — 모달 폼 폐지
    document.getElementById('new-btn').addEventListener('click', () => DashboardPage.startNewProject());

    // F4: CSV 내보내기 — 현재 검색/상태 필터 그대로 적용
    document.getElementById('export-csv-btn').addEventListener('click', async () => {
      const search = document.getElementById('search').value;
      const status = document.getElementById('status-filter').value;
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (status === 'archived') qs.set('archived_only', '1');
      else if (status) qs.set('status', status);
      const ts = new Date().toISOString().slice(0, 10);
      try {
        await API.download(`/projects/export.csv?${qs}`, `projects-${ts}.csv`);
      } catch (err) {
        alert('CSV 내보내기 실패: ' + (err.message || err));
      }
    });

    // C2: JSON 가져오기 — 파일 선택 → POST /api/projects/import
    const fileInput = document.getElementById('import-file');
    document.getElementById('import-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        const r = await API.post('/projects/import', data);
        const msg = r.code !== r.original_code
          ? `복원 완료. 코드 충돌로 ${r.original_code} → ${r.code} 로 변경됨.`
          : '복원 완료.';
        alert(msg);
        load();
      } catch (err) {
        alert('가져오기 실패: ' + (err.message || err));
      } finally {
        fileInput.value = '';
      }
    });

    load();
  }
};

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
