// AdminAssetsPage (S1 + S2)
//   /admin/assets — claude-assets (skills/agents/rules/commands/ref/CLAUDE.md) 매니페스트
//   - 카테고리/상태 필터 + 검색
//   - 행 클릭 시 상세(본문 미리보기 + 최근 audit + 액션 버튼 + diff)
//   - 헤더: [재스캔] [Pull Now] [auto-sync 일괄] [강제 lock 해제]
//   - 행 액션: [Sync] (behind+promote) / [Approve] (major/new/orphan/divergent) / [Reject]
//   - diff viewer: RUNTIME vs MASTER 좌우 표시 (단순 fenced text — 추후 Monaco 교체 가능)

const AdminAssetsPage = {
  _items: [],
  _filter: { category: '', status: '', q: '' },
  _selected: null,
  _lock: null,

  async render() {
    // adminGuard에서 권한 검증 완료. AdminShell 사용.
    AdminShell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">자산 동기화</div>
          <div class="page-subtitle">~/.claude 의 skills · agents · rules · commands · ref · CLAUDE.md (4-tier: REMOTE→MASTER→SERVER→CLIENT)</div>
        </div>
        <div class="page-actions">
          <button class="btn-secondary-sm" id="assets-rebuild" title="RUNTIME 디스크를 다시 읽어 SHA·version 갱신">재스캔</button>
          <button class="btn" id="assets-pull" title="MASTER 와 비교해 status 갱신 (디스크 미변경)">Pull Now</button>
          <button class="btn-success" id="assets-sync-auto" title="status=behind && pending=promote 인 자산 일괄 sync">auto-sync 일괄</button>
        </div>
      </div>

      <div class="card mb-3" id="assets-summary">로딩 중...</div>
      <div class="card mb-3" id="assets-scheduler"></div>
      <div class="card mb-3" id="assets-alerts"></div>
      <div class="card mb-3" id="assets-lock"></div>

      <div class="grid grid-2" style="gap:1rem;align-items:flex-start">
        <div class="card">
          <div class="flex" style="gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem">
            <select id="f-category" style="flex:1">
              <option value="">전체 카테고리</option>
              <option value="skills">skills</option>
              <option value="agents">agents</option>
              <option value="rules">rules</option>
              <option value="commands">commands</option>
              <option value="ref">ref</option>
              <option value="claude-md">CLAUDE.md</option>
            </select>
            <select id="f-status" style="flex:1">
              <option value="">전체 상태</option>
              <option value="synced">synced</option>
              <option value="behind">behind</option>
              <option value="ahead">ahead</option>
              <option value="new">new</option>
              <option value="orphan">orphan</option>
              <option value="pending_approval">pending</option>
              <option value="divergent">divergent</option>
              <option value="unmanaged">unmanaged</option>
            </select>
            <input type="text" id="f-q" placeholder="path 검색…" style="flex:2">
          </div>
          <div id="assets-list" style="max-height:65vh;overflow:auto">로딩 중...</div>
        </div>

        <div class="card" id="assets-detail-panel">
          <div class="text-muted">왼쪽에서 자산을 선택하세요</div>
        </div>
      </div>
    `, 'admin-assets');

    document.getElementById('assets-rebuild').addEventListener('click', () => this.rebuild());
    document.getElementById('assets-pull').addEventListener('click', () => this.pull());
    document.getElementById('assets-sync-auto').addEventListener('click', () => this.syncAuto());
    document.getElementById('f-category').addEventListener('change', (e) => { this._filter.category = e.target.value; this.load(); });
    document.getElementById('f-status').addEventListener('change', (e) => { this._filter.status = e.target.value; this.load(); });
    let qTimer = null;
    document.getElementById('f-q').addEventListener('input', (e) => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { this._filter.q = e.target.value.trim(); this.load(); }, 220);
    });

    await Promise.all([this.loadSummary(), this.loadLock(), this.loadScheduler(), this.loadAlerts(), this.load()]);
  },

  async loadScheduler() {
    const el = document.getElementById('assets-scheduler');
    if (!el) return;
    try {
      const r = await API.get('/admin/assets/scheduler-status');
      const s = r.status || {};
      if (!s.enabled) {
        el.innerHTML = `<div class="text-sm"><span class="badge" style="background:#888;color:#fff">SCHEDULER OFF</span> auto-pull 비활성 (ASSET_SYNC_AUTO_PULL=false)</div>`;
        return;
      }
      const last = s.last_tick_at ? new Date(s.last_tick_at).toLocaleString() : '아직 실행 안 됨';
      const skipped = s.last_tick_skipped_reason ? ` <span style="color:#e0a23a">[skip: ${escapeHtml(s.last_tick_skipped_reason)}]</span>` : '';
      const lastAlert = s.last_alert_at ? `${new Date(s.last_alert_at).toLocaleString()} — ${escapeHtml((s.last_alert_changed || []).join(', ')) || '-'}` : '-';
      el.innerHTML = `
        <div class="text-sm" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
          <div>
            <span class="badge" style="background:#3aa55c;color:#fff">SCHEDULER ON</span>
            매 ${s.interval_min}분 · 누적 tick ${s.ticks} · alert ${s.alerts}
          </div>
          <div class="text-muted">
            last tick: ${escapeHtml(last)}${skipped}
          </div>
        </div>
        <div class="text-sm text-muted" style="margin-top:.25rem">last alert: ${lastAlert}</div>
      `;
    } catch (e) {
      el.innerHTML = `<div class="text-sm text-muted">scheduler 상태 로드 실패: ${escapeHtml(e.message)}</div>`;
    }
  },

  async loadAlerts() {
    const el = document.getElementById('assets-alerts');
    if (!el) return;
    try {
      const r = await API.get('/admin/assets/alerts?limit=10');
      if (!r.items || r.items.length === 0) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const unreadBadge = r.unread > 0
        ? `<span class="badge" style="background:#e74c3c;color:#fff">미확인 ${r.unread}</span>`
        : `<span class="badge" style="background:#3aa55c;color:#fff">모두 확인</span>`;
      const rows = r.items.map(a => {
        const ts = new Date(a.ts).toLocaleString();
        const changed = (a.changed || []).map(c => `<code style="font-size:.85em">${escapeHtml(c)}</code>`).join(' · ');
        const ackBtn = a.acked
          ? `<span class="text-muted text-sm">✓ ${escapeHtml(a.acked_by || '')} ${a.acked_at ? new Date(a.acked_at).toLocaleString() : ''}</span>`
          : `<button class="btn-sm" data-ack-id="${a.id}">확인</button>`;
        return `
          <div class="text-sm" style="display:flex;justify-content:space-between;gap:.5rem;align-items:center;padding:.35rem 0;border-bottom:1px solid #2a2a2a">
            <div>
              <span class="text-muted">${escapeHtml(ts)}</span>
              ${a.acked ? '' : '<span class="badge" style="background:#e74c3c;color:#fff;margin:0 .25rem">NEW</span>'}
              ${changed || '<span class="text-muted">(변화 없음)</span>'}
            </div>
            <div>${ackBtn}</div>
          </div>
        `;
      }).join('');
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
          <div><strong>📨 자산 동기화 알림</strong> ${unreadBadge}</div>
          ${r.unread > 0 ? '<button class="btn-sm" id="alerts-ack-all">모두 확인</button>' : ''}
        </div>
        <div>${rows}</div>
      `;
      el.querySelectorAll('[data-ack-id]').forEach(b => {
        b.addEventListener('click', () => this.ackAlert(parseInt(b.dataset.ackId, 10)));
      });
      const ackAll = document.getElementById('alerts-ack-all');
      if (ackAll) ackAll.addEventListener('click', () => this.ackAlert(null, true));
    } catch (e) {
      el.innerHTML = `<div class="text-sm text-muted">alerts 로드 실패: ${escapeHtml(e.message)}</div>`;
    }
  },

  async ackAlert(id, all = false) {
    try {
      await API.post('/admin/assets/alerts/ack', all ? { all: true } : { id });
      await this.loadAlerts();
    } catch (e) {
      alert('확인 처리 실패: ' + e.message);
    }
  },

  async loadSummary() {
    const el = document.getElementById('assets-summary');
    if (!el) return;
    try {
      const s = await API.get('/admin/assets/summary');
      const cats = Object.entries(s.byCategory).map(([c, n]) => `<span class="badge" style="margin-right:.25rem">${escapeHtml(c)}: ${n}</span>`).join('');
      const stats = Object.entries(s.byStatus).filter(([_, n]) => n > 0).map(([st, n]) => {
        const color = statusColor(st);
        return `<span class="text-sm" style="color:${color};margin-right:.5rem">● ${escapeHtml(st)}: ${n}</span>`;
      }).join('');

      // 카테고리 헬스 경고 — master_missing 인 카테고리만 표시
      const warnings = (s.category_health || []).filter(h => h.status === 'master_missing');
      const warnHtml = warnings.length === 0 ? '' : `
        <div class="alert alert-warning mt-2" style="font-size:.85rem">
          <strong>⚠️ MASTER 추적 누락</strong>
          <ul style="margin:.5rem 0 0 1.25rem;padding:0">
            ${warnings.map(w => `<li><code>${escapeHtml(w.category)}</code> — ${escapeHtml(w.message || '')}</li>`).join('')}
          </ul>
        </div>`;

      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;align-items:center">
          <div><strong>총 ${s.total}건</strong> ${cats}</div>
          <div>${stats}</div>
        </div>
        ${warnHtml}
      `;
    } catch (e) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  async loadLock() {
    const el = document.getElementById('assets-lock');
    if (!el) return;
    try {
      const r = await API.get('/admin/assets/lock');
      this._lock = r.lock;
      if (!r.lock) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
          <div>
            <span class="badge" style="background:#e0a23a;color:#fff">LOCK</span>
            <strong>${escapeHtml(r.lock.scope)}</strong> — ${escapeHtml(r.lock.holder)} 보유 중,
            <span class="text-muted text-sm">만료: ${escapeHtml(r.lock.expires_at)}</span>
          </div>
          <button class="btn-danger-sm" id="lock-force-release">강제 해제</button>
        </div>
      `;
      document.getElementById('lock-force-release').addEventListener('click', () => this.forceLockRelease());
    } catch (e) {
      el.style.display = '';
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  async forceLockRelease() {
    if (!confirm('lock을 강제 해제합니다. 진행 중이던 sync 가 있다면 중단됩니다. 계속하시겠습니까?')) return;
    try {
      await API.post('/admin/assets/lock/release', {});
      await this.loadLock();
    } catch (e) {
      alert('lock 해제 실패: ' + e.message);
    }
  },

  async load() {
    const el = document.getElementById('assets-list');
    if (!el) return;
    el.innerHTML = '<div class="text-muted text-sm">로딩 중...</div>';
    try {
      const params = new URLSearchParams();
      if (this._filter.category) params.set('category', this._filter.category);
      if (this._filter.status)   params.set('status',   this._filter.status);
      if (this._filter.q)        params.set('q',        this._filter.q);
      const res = await API.get(`/admin/assets/manifest?${params.toString()}`);
      this._items = res.items;
      this._renderList();
    } catch (e) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  _renderList() {
    const el = document.getElementById('assets-list');
    if (!el) return;
    if (!this._items.length) {
      el.innerHTML = '<div class="text-muted text-sm" style="padding:1rem">조건에 맞는 자산이 없습니다</div>';
      return;
    }
    el.innerHTML = this._items.map(it => {
      const stColor = statusColor(it.status);
      const sel = this._selected === it.path ? 'background:var(--card-alt,#2a2d31)' : '';
      const action = it.pending_action ? `<span class="badge" style="background:#444;color:#fff;font-size:.65rem;margin-left:.25rem">→${escapeHtml(it.pending_action)}</span>` : '';
      const verCmp = (it.version && it.master_version && it.version !== it.master_version)
        ? ` → <span style="color:#3aa55c">v${escapeHtml(it.master_version)}</span>` : '';
      return `
        <div class="asset-row" data-path="${escapeHtml(it.path)}"
             style="padding:.5rem .6rem;border-bottom:1px solid var(--border);cursor:pointer;${sel}">
          <div style="display:flex;justify-content:space-between;gap:.5rem">
            <span class="text-sm" style="font-family:monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(it.path)}">${escapeHtml(it.path)}</span>
            <span class="text-sm" style="color:${stColor};white-space:nowrap">● ${escapeHtml(it.status)}${action}</span>
          </div>
          <div class="text-sm text-muted" style="margin-top:.15rem">
            <span>v${escapeHtml(it.version || '-')}${verCmp}</span>
            · <span>${formatBytes(it.size)}</span>
            · <span title="${escapeHtml(it.sha256 || '')}">sha=${escapeHtml((it.sha256 || '').slice(0, 10) || '-')}</span>
            · <span>${escapeHtml(it.category)}</span>
          </div>
        </div>
      `;
    }).join('');
    el.querySelectorAll('.asset-row').forEach(row => {
      row.addEventListener('click', () => this.select(row.getAttribute('data-path')));
    });
  },

  async select(path) {
    this._selected = path;
    this._renderList();
    const panel = document.getElementById('assets-detail-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="text-muted text-sm">상세 로딩 중...</div>';
    try {
      const d = await API.get(`/admin/assets/detail?path=${encodeURIComponent(path)}`);
      const it = d.item;
      const meta = [
        ['카테고리', escapeHtml(it.category)],
        ['상태', `<span style="color:${statusColor(it.status)}">● ${escapeHtml(it.status)}</span>${it.pending_action ? ` <span class="text-muted">→ ${escapeHtml(it.pending_action)}</span>` : ''}`],
        ['version', `${escapeHtml(it.version || '-')} ${it.master_version ? `<span class="text-muted">→ master v${escapeHtml(it.master_version)}</span>` : ''}`],
        ['크기', formatBytes(it.size)],
        ['runtime sha', `<span style="font-family:monospace;font-size:.75rem">${escapeHtml(it.sha256 || '-')}</span>`],
        ['master sha', `<span style="font-family:monospace;font-size:.75rem">${escapeHtml(it.master_sha || '-')}</span>`],
        ['업데이트', escapeHtml(it.updated_at || '-')],
        ['승인', it.approved_by ? `${escapeHtml(it.approved_by)} <span class="text-muted">${escapeHtml(it.approved_at || '')}</span>` : '<span class="text-muted">-</span>']
      ];
      // snapshot 보유 SHA 조회 → audit 행에 [Rollback to <sha>] 버튼 표시
      let snapMap = {};
      try {
        const ss = await API.get(`/admin/assets/snapshot-status?path=${encodeURIComponent(path)}`);
        for (const a of (ss.items || [])) snapMap[a.id] = a;
      } catch (e) { /* swallow */ }

      const auditList = d.audit_recent || [];
      const auditRows = auditList.map(a => {
        const ss = snapMap[a.id] || {};
        const beforeOk = !!ss.before_snapshot;
        const afterOk = !!ss.after_snapshot;
        const beforeShort = (a.before_sha || '').slice(0, 10);
        const afterShort = (a.after_sha || '').slice(0, 10);
        const rollbackBefore = beforeOk && a.before_sha ?
          ` <button class="btn-secondary-sm act-rollback" data-sha="${escapeHtml(a.before_sha)}" title="이 시점 (before) 본문으로 디스크 복원">↶ before</button>` : '';
        const rollbackAfter = afterOk && a.after_sha && a.action !== 'rollback' ?
          ` <button class="btn-secondary-sm act-rollback" data-sha="${escapeHtml(a.after_sha)}" title="이 시점 (after) 본문으로 디스크 복원">↶ after</button>` : '';
        return `
          <div style="padding:.3rem 0;border-bottom:1px dashed var(--border);font-size:.85rem">
            <div><strong>${escapeHtml(a.action)}</strong> <span class="text-muted">${escapeHtml(a.ts)}</span> · ${escapeHtml(a.actor || '-')}</div>
            ${a.before_sha || a.after_sha ? `
              <div class="text-muted" style="font-family:monospace;font-size:.75rem;margin-top:.15rem">
                <span title="${beforeOk ? 'snapshot 보관됨' : 'snapshot 없음'}" style="color:${beforeOk ? '#3aa55c' : '#888'}">${beforeOk ? '●' : '○'} ${escapeHtml(beforeShort || '-')}</span>
                →
                <span title="${afterOk ? 'snapshot 보관됨' : 'snapshot 없음'}" style="color:${afterOk ? '#3aa55c' : '#888'}">${afterOk ? '●' : '○'} ${escapeHtml(afterShort || '-')}</span>
                ${rollbackBefore}${rollbackAfter}
              </div>` : ''}
          </div>
        `;
      }).join('') || '<div class="text-muted text-sm">감사 로그 없음</div>';

      const actions = this._renderActions(it);

      panel.innerHTML = `
        <div class="flex-between mb-2" style="display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start">
          <h3 style="margin:0;font-family:monospace;word-break:break-all;flex:1">${escapeHtml(it.path)}</h3>
        </div>
        <div style="margin-bottom:.75rem">${actions}</div>
        <table class="text-sm" style="width:100%;margin-bottom:1rem">
          ${meta.map(([k, v]) => `<tr><td class="text-muted" style="padding:.2rem .5rem .2rem 0;width:6rem">${k}</td><td style="padding:.2rem 0">${v}</td></tr>`).join('')}
        </table>

        <div id="diff-area"></div>

        <h4 class="mb-2">본문 미리보기 ${d.preview_total_size != null ? `<span class="text-muted text-sm">(${d.preview_total_size}자, 앞 2KB)</span>` : ''}</h4>
        <pre style="background:var(--card-alt,#2a2d31);padding:.6rem;border-radius:6px;max-height:30vh;overflow:auto;font-size:.78rem;white-space:pre-wrap;word-break:break-word">${escapeHtml(d.preview || '(미리보기 없음)')}</pre>

        <h4 class="mt-3 mb-2">최근 변경 (audit ${d.audit_recent ? d.audit_recent.length : 0})</h4>
        ${auditRows}
      `;

      // 액션 핸들러 바인딩
      const a1 = panel.querySelector('#act-sync');
      const a2 = panel.querySelector('#act-approve');
      const a3 = panel.querySelector('#act-reject');
      const a4 = panel.querySelector('#act-diff');
      if (a1) a1.addEventListener('click', () => this.actSync(it.path));
      if (a2) a2.addEventListener('click', () => this.actApprove(it));
      if (a3) a3.addEventListener('click', () => this.actReject(it.path));
      if (a4) a4.addEventListener('click', () => this.showDiff(it.path));
      panel.querySelectorAll('.act-rollback').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.actRollback(it.path, btn.getAttribute('data-sha'));
        });
      });
    } catch (e) {
      panel.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  _renderActions(it) {
    // 가능한 행위 결정
    const canSync = it.status === 'behind' && it.pending_action === 'promote';
    const canApprove = ['new', 'pending_approval', 'divergent', 'orphan'].includes(it.status)
      || ['add', 'promote_major', 'delete'].includes(it.pending_action);
    const canReject = !!it.pending_action;
    const canDiff = it.master_sha || it.status !== 'orphan'; // unmanaged/synced 도 diff 가능

    const buttons = [];
    if (canSync) {
      buttons.push(`<button class="btn-success-sm" id="act-sync" title="auto-eligible — MASTER 본문을 RUNTIME 으로 복사">Sync</button>`);
    }
    if (canApprove) {
      const label = it.pending_action === 'delete' ? 'Approve (삭제)' : 'Approve';
      buttons.push(`<button class="btn-sm" id="act-approve" title="major/new/orphan/divergent 승인 → MASTER 적용">${label}</button>`);
    }
    if (canReject) {
      buttons.push(`<button class="btn-secondary-sm" id="act-reject" title="pending_action 해제 (디스크 미변경)">Reject</button>`);
    }
    if (canDiff) {
      buttons.push(`<button class="btn-secondary-sm" id="act-diff" title="RUNTIME vs MASTER 본문 비교">diff 보기</button>`);
    }
    if (!buttons.length) return '<span class="text-muted text-sm">현재 상태에서 가능한 액션이 없습니다</span>';
    return buttons.join(' ');
  },

  async actSync(path) {
    if (!confirm(`'${path}' 의 MASTER 본문을 RUNTIME 으로 복사합니다. 계속하시겠습니까?`)) return;
    try {
      const r = await API.post('/admin/assets/sync', { path });
      const result = (r.results && r.results[0]) || {};
      if (!result.ok) {
        alert('sync 실패: ' + (result.error || '알 수 없음'));
      } else {
        alert(`sync 완료 — ${path}\nbefore: ${(result.before_sha || '-').slice(0, 10)}\nafter:  ${(result.after_sha || '-').slice(0, 10)}`);
      }
      await this._refresh();
    } catch (e) {
      alert('sync 실패: ' + e.message);
    }
  },

  async actApprove(it) {
    const verb = it.pending_action === 'delete' ? '삭제' : '동기화';
    if (!confirm(`'${it.path}' 를 승인하여 ${verb} 합니다. 계속하시겠습니까?`)) return;
    try {
      const r = await API.post('/admin/assets/approve', { path: it.path });
      alert(`approve 완료 — ${it.path}\n결과: ${JSON.stringify({
        action: r.action || (it.pending_action === 'delete' ? 'delete' : 'sync'),
        before: (r.before_sha || '-').slice(0, 10),
        after: (r.after_sha || '-').slice(0, 10)
      })}`);
      await this._refresh();
    } catch (e) {
      alert('approve 실패: ' + e.message);
    }
  },

  async actReject(path) {
    const reason = prompt('거부 사유 (선택):', '') || '';
    try {
      await API.post('/admin/assets/reject', { path, reason });
      await this._refresh();
    } catch (e) {
      alert('reject 실패: ' + e.message);
    }
  },

  async actRollback(path, target_sha) {
    if (!confirm(`'${path}' 의 디스크 본문을 SHA ${target_sha.slice(0, 12)}… 시점으로 되돌립니다.\n현재 본문은 자동 스냅샷 보관됩니다. 계속하시겠습니까?`)) return;
    try {
      const r = await API.post('/admin/assets/rollback', { path, target_sha });
      alert(`rollback 완료 — ${path}\nbefore: ${(r.before_sha || '-').slice(0, 12)}\nafter:  ${(r.after_sha || '-').slice(0, 12)}\nstatus: ${r.status}`);
      await this._refresh();
    } catch (e) {
      alert('rollback 실패: ' + e.message);
    }
  },

  async showDiff(p) {
    const area = document.getElementById('diff-area');
    if (!area) return;
    area.innerHTML = '<div class="text-muted text-sm">diff 로딩 중...</div>';
    try {
      const r = await API.get(`/admin/assets/diff?path=${encodeURIComponent(p)}`);
      const rt = r.runtimeText == null ? '' : r.runtimeText;
      const mt = r.masterText == null ? '' : r.masterText;
      const lang = guessLanguage(p);
      area.innerHTML = `
        <div style="margin:.5rem 0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>RUNTIME ↔ MASTER diff</strong>
            ${r.masterSourcePkg ? `<span class="text-muted text-sm">(master src: ${escapeHtml(r.masterSourcePkg)})</span>` : ''}
          </div>
          <div class="text-sm text-muted">
            <span style="margin-right:.5rem">← RUNTIME</span> | <span style="margin-left:.5rem">MASTER →</span>
          </div>
        </div>
        <div id="monaco-diff" style="height:55vh;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:#1e1e1e"></div>
      `;
      await loadMonaco();
      const container = document.getElementById('monaco-diff');
      if (!container) return;
      // 기존 인스턴스 dispose
      if (this._diffEditor) { try { this._diffEditor.dispose(); } catch (e) {} }
      const monaco = window.monaco;
      this._diffEditor = monaco.editor.createDiffEditor(container, {
        readOnly: true,
        renderSideBySide: true,
        automaticLayout: true,
        theme: 'vs-dark',
        fontSize: 12,
        wordWrap: 'on',
        renderWhitespace: 'none',
        diffWordWrap: 'on'
      });
      this._diffEditor.setModel({
        original: monaco.editor.createModel(rt, lang),
        modified: monaco.editor.createModel(mt, lang)
      });
    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  },

  async rebuild() {
    const btn = document.getElementById('assets-rebuild');
    if (!btn) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = '재스캔 중...';
    try {
      const r = await API.post('/admin/assets/rebuild', {});
      alert(`재스캔 완료 — 신규 ${r.added}, 변경 ${r.changed}, 동일 ${r.unchanged} (총 ${r.total})`);
      await this._refresh();
    } catch (e) {
      alert('재스캔 실패: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  },

  async pull() {
    const btn = document.getElementById('assets-pull');
    if (!btn) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Pull 중...';
    try {
      const r = await API.post('/admin/assets/pull', {});
      const lines = Object.entries(r.counts || {}).filter(([_, n]) => n > 0)
        .map(([k, v]) => `${k}: ${v}`).join(', ');
      alert(`Pull 완료 — runtime ${r.runtime} / master ${r.master} / total ${r.total}\n${lines}`);
      await this._refresh();
    } catch (e) {
      alert('pull 실패: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  },

  async syncAuto() {
    if (!confirm('status=behind 이고 pending=promote 인 자산을 일괄 동기화합니다. 계속하시겠습니까?')) return;
    const btn = document.getElementById('assets-sync-auto');
    if (!btn) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'sync 중...';
    try {
      const r = await API.post('/admin/assets/sync', {});
      const okCnt = (r.results || []).filter(x => x.ok).length;
      const errCnt = (r.results || []).filter(x => !x.ok).length;
      const errLines = (r.results || []).filter(x => !x.ok).map(x => `× ${x.path}: ${x.error}`).slice(0, 5).join('\n');
      alert(`auto-sync 완료 — 대상 ${r.total}, 성공 ${okCnt}, 실패 ${errCnt}${errLines ? '\n\n' + errLines : ''}`);
      await this._refresh();
    } catch (e) {
      alert('auto-sync 실패: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  },

  async _refresh() {
    await Promise.all([this.loadSummary(), this.loadLock(), this.loadScheduler(), this.loadAlerts(), this.load()]);
    if (this._selected) this.select(this._selected);
  }
};

// Monaco editor (CDN) 1회 로드 — AMD loader 방식
const MONACO_VERSION = '0.45.0';
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;
let _monacoLoading = null;
function loadMonaco() {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (_monacoLoading) return _monacoLoading;
  _monacoLoading = new Promise((resolve, reject) => {
    const loader = document.createElement('script');
    loader.src = `${MONACO_BASE}/loader.js`;
    loader.onload = () => {
      try {
        const req = window.require;
        req.config({ paths: { vs: MONACO_BASE } });
        // worker 크로스오리진 워크어라운드
        window.MonacoEnvironment = {
          getWorkerUrl() {
            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
              self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}/' };
              importScripts('${MONACO_BASE}/base/worker/workerMain.js');
            `)}`;
          }
        };
        req(['vs/editor/editor.main'], () => resolve(window.monaco));
      } catch (e) { reject(e); }
    };
    loader.onerror = () => reject(new Error('monaco loader 로드 실패'));
    document.head.appendChild(loader);
  });
  return _monacoLoading;
}

function guessLanguage(p) {
  if (!p) return 'plaintext';
  const ext = p.split('.').pop().toLowerCase();
  switch (ext) {
    case 'md': return 'markdown';
    case 'json': return 'json';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'yml':
    case 'yaml': return 'yaml';
    case 'html': case 'htm': return 'html';
    case 'css': return 'css';
    default: return 'plaintext';
  }
}

function statusColor(st) {
  switch (st) {
    case 'synced':           return '#3aa55c';
    case 'behind':           return '#3a8ee0';
    case 'ahead':            return '#888';
    case 'new':              return '#9b59b6';
    case 'orphan':           return '#888';
    case 'pending_approval': return '#e0a23a';
    case 'divergent':        return '#e74c3c';
    case 'unmanaged':        return '#666';
    default:                 return '#888';
  }
}

function formatBytes(n) {
  if (n == null) return '-';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}
