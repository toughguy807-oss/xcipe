// Dashboard (IA-P002, FN-001~005)
const DashboardPage = {
  // 새 프로젝트 — 단일 진입점: intake-agent가 대화 맥락으로 슬롯·파이프라인 자동 결정
  //   별도 모달·다단계 폼·"파이프라인 시작" 확인 없음 (claude.ai 패턴)
  async startNewProject() {
    try {
      const { session_id } = await API.post('/intake/start', {});
      Router.navigate(`/intake/${session_id}`);
    } catch (e) {
      alert('새 프로젝트 시작 실패: ' + (e.message || e));
    }
  },

  async render() {
    Shell.render('<div class="empty">로딩 중...</div>', 'dashboard');
    const data = await API.get('/dashboard/summary');

    // 첫 사용자 온보딩: 프로젝트 0개일 때 별도 환영 화면
    if (data.projects.total === 0) {
      // U-G1: AI 키 설정 상태를 가져와 1단계 활성/완료 표시
      //   admin이 아니면 GET /admin/settings/ai 가 403 → catch로 흡수
      let aiState = null;
      try {
        aiState = await API.get('/admin/settings/ai');
      } catch { /* admin 아님 또는 미설정 */ }
      // v26: 모든 user 용 onboarding 정보 (aiState 가 null 이어도 가이드 표시)
      let onboarding = null;
      try { onboarding = await API.get('/dashboard/onboarding'); } catch {}
      const user = (typeof API.getUser === 'function') ? API.getUser() : null;
      Shell.render(this._renderOnboarding(aiState, user, onboarding), 'dashboard');
      return;
    }
    // v26: 프로젝트 있어도 본인 워커가 polling 안 하면 상단 배너로 가이드 표시
    try {
      const onboarding = await API.get('/dashboard/onboarding');
      if (onboarding && !onboarding.ai_ready) {
        // 상단에 워커 미감지 배너 표시 (대시보드 렌더 후)
        setTimeout(() => this._renderWorkerSetupBanner(onboarding), 100);
      }
    } catch {}

    const html = `
      <div class="page-header">
        <div>
          <div class="page-title">대시보드</div>
          <div class="page-subtitle">전체 프로젝트 현황 · ${data.projects.total}개 프로젝트 운영 중</div>
        </div>
        <div class="page-actions">
          ${this._renderErrorBudgetBadge(data.error_budget)}
          <button class="btn-primary" onclick="DashboardPage.startNewProject()">+ 새 프로젝트</button>
        </div>
      </div>

      <!-- U-G23: 통합 채팅 진입점 — 대시보드 메인 -->
      <div class="card mb-4 chat-intake-card">
        <div class="flex-between mb-2">
          <h3 style="margin:0">무엇을 만들까요?</h3>
        </div>
        <div class="text-muted text-sm mb-2">의도·목적·범위를 자유롭게 적어주세요. 사내 누적 데이터(유사 사례·회사 톤·관련 지식)를 자동 참조해 plan을 제안합니다.</div>
        <form id="intake-quickstart">
          <div class="chat-composer">
            <textarea id="intake-input" rows="2" placeholder="예시: 카페 예약 사이트를 만들고 싶어요. 모바일 우선이고 결제는 토스페이를 쓸 예정입니다." autofocus></textarea>
            <button class="composer-send" type="submit">보내기</button>
          </div>
          <div class="chat-composer-hint">
            <span><kbd>Enter</kbd> 보내기 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 줄바꿈</span>
            <span id="intake-quickerror" style="color:var(--danger-fg)"></span>
          </div>
        </form>
      </div>

      <div class="grid grid-4 mb-4">
        <div class="card stat-card" onclick="Router.navigate('/projects')" style="cursor:pointer">
          <div class="stat-label">전체 프로젝트</div>
          <div class="stat-value">${data.projects.total}</div>
          <div class="stat-sub">활성 ${data.projects.active} · 완료 ${data.projects.completed}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">산출물</div>
          <div class="stat-value">${data.artifacts.total}</div>
          <div class="stat-sub">전 프로젝트 누적</div>
        </div>
        <div class="card stat-card" onclick="Router.navigate('/tickets')" style="cursor:pointer">
          <div class="stat-label">열린 티켓</div>
          <div class="stat-value">${data.tickets.open + data.tickets.in_progress}</div>
          <div class="stat-sub">Open ${data.tickets.open} · 진행 ${data.tickets.in_progress}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">파이프라인</div>
          <div class="stat-value">${data.pipelines.running}</div>
          <div class="stat-sub">${data.pipelines.running > 0 ? '🟢 실행 중' : '대기'} · 완료 ${data.pipelines.completed}</div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="flex-between mb-3">
            <h3 style="margin:0">프로젝트 현황</h3>
            <a href="#/projects" class="text-sm text-muted">전체 보기 →</a>
          </div>
          <div id="project-grid">로딩 중...</div>
        </div>
        <div class="card">
          <h3 class="mb-3">최근 활동</h3>
          <div class="pipeline-steps">
            ${data.recent_activity.length === 0
              ? '<div class="empty-state-mini"><div>활동 기록이 없습니다</div><div class="text-muted text-sm mt-2">파이프라인을 실행하면 여기에 표시됩니다</div></div>'
              : data.recent_activity.map(a => `
                <div class="pipeline-step">
                  <div class="step-dot step-completed"></div>
                  <div style="flex:1">
                    <strong>${escapeHtml(a.entity_type)}</strong> ${escapeHtml(a.action)}
                    ${a.detail ? `— ${escapeHtml(a.detail)}` : ''}
                    <div class="text-muted text-sm">${formatRelative(a.created_at)} · ${escapeHtml(a.actor_email || 'system')}</div>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="flex-between mb-3">
          <h3 style="margin:0">토큰/비용 모니터링</h3>
          <select id="token-range" class="text-sm">
            <option value="1">최근 1일</option>
            <option value="7" selected>최근 7일</option>
            <option value="30">최근 30일</option>
          </select>
        </div>
        <div id="token-usage-body"><div class="empty-state-mini">로딩 중...</div></div>
      </div>

      <div class="card mt-4">
        <div class="flex-between mb-3">
          <h3 style="margin:0">오류 로그</h3>
          <select id="error-range" class="text-sm">
            <option value="1">최근 1일</option>
            <option value="7" selected>최근 7일</option>
            <option value="30">최근 30일</option>
          </select>
        </div>
        <div id="error-log-body"><div class="empty-state-mini">로딩 중...</div></div>
      </div>
    `;
    Shell.render(html, 'dashboard');

    // U-G23: 빠른 대화 시작 — 폼 제출 시 intake 세션 만들고 채팅 페이지로 이동
    //   PR4-C: textarea + auto-grow + Enter/Shift+Enter
    const intakeForm = document.getElementById('intake-quickstart');
    const intakeInput = document.getElementById('intake-input');
    if (intakeInput) {
      const autoGrow = () => {
        intakeInput.style.height = 'auto';
        intakeInput.style.height = Math.min(intakeInput.scrollHeight, 180) + 'px';
      };
      intakeInput.addEventListener('input', autoGrow);
      intakeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          if (intakeForm) intakeForm.requestSubmit();
        }
      });
    }
    // U-G23 정리: '상세 폼으로 입력' 링크는 intake 단일 흐름으로 통합되어 제거됨
    if (intakeForm) {
      intakeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('intake-input');
        const errBox = document.getElementById('intake-quickerror');
        const text = (input.value || '').trim();
        if (!text) return;
        errBox.textContent = '';
        const btn = intakeForm.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = '...';
        try {
          // 세션만 만들고 즉시 인테이크 페이지로 진입 — turn 응답(claude-code 30s+)을 거기서 처리.
          // 사용자는 자기 메시지가 채팅 스트림에 즉시 보이고, plan 응답은 progress chip 으로 대기 중임을 인지.
          const { session_id } = await API.post('/intake/start', {});
          sessionStorage.setItem(`intake:${session_id}:initial`, text);
          Router.navigate(`/intake/${session_id}`);
        } catch (err) {
          errBox.textContent = err.message || '시작 실패';
          btn.disabled = false;
          btn.textContent = '보내기';
        }
      });
    }

    // P3-1: 토큰/비용 패널 — 최초 로드 + 기간 선택 변경
    const renderTokenPanel = async (days) => {
      const body = document.getElementById('token-usage-body');
      if (!body) return;
      try {
        const t = await API.get(`/dashboard/token-usage?days=${days}`);
        body.innerHTML = this._renderTokenUsage(t);
      } catch (err) {
        body.innerHTML = `<div class="alert alert-error">토큰 데이터를 불러올 수 없습니다: ${escapeHtml(err.message)}</div>`;
      }
    };
    renderTokenPanel(7);
    const sel = document.getElementById('token-range');
    if (sel) sel.addEventListener('change', e => renderTokenPanel(e.target.value));

    // A10: 오류 로그 패널 — 최초 로드 + 기간 선택 변경
    const renderErrorPanel = async (days) => {
      const body = document.getElementById('error-log-body');
      if (!body) return;
      try {
        const e = await API.get(`/dashboard/errors?days=${days}`);
        body.innerHTML = this._renderErrorLog(e);
      } catch (err) {
        body.innerHTML = `<div class="alert alert-error">오류 로그를 불러올 수 없습니다: ${escapeHtml(err.message)}</div>`;
      }
    };
    renderErrorPanel(7);
    const errSel = document.getElementById('error-range');
    if (errSel) errSel.addEventListener('change', e => renderErrorPanel(e.target.value));

    // Load project grid (FN-003)
    const projects = await API.get('/projects?limit=6');
    const grid = document.getElementById('project-grid');
    if (projects.data.length === 0) {
      grid.innerHTML = `<div class="empty-state-mini"><div>표시할 프로젝트가 없습니다</div><button class="btn-primary mt-2" onclick="DashboardPage.startNewProject()">새 프로젝트 만들기</button></div>`;
    } else {
      grid.innerHTML = projects.data.map(p => `
        <div class="project-row" data-pid="${p.id}">
          <div class="project-row-info">
            <div><strong>${escapeHtml(p.name)}</strong> <span class="project-code">${escapeHtml(p.code)}</span></div>
            <div class="text-muted text-sm">산출물 ${p.artifact_count} · 티켓 ${p.open_ticket_count}</div>
            ${p.pipeline_progress != null ? `
              <div class="progress-bar mt-1">
                <div class="progress-fill" style="width:${p.pipeline_progress}%"></div>
              </div>
              <div class="text-muted text-sm">${p.pipeline_status || ''} · ${p.pipeline_progress}%</div>
            ` : ''}
          </div>
          <span class="badge badge-${p.status}">${p.status}</span>
        </div>
      `).join('');
      grid.querySelectorAll('[data-pid]').forEach(el => {
        el.addEventListener('click', () => Router.navigate(`/projects/${el.dataset.pid}`));
      });
    }
  },

  _renderTokenUsage(t) {
    const { total, byModel, bySkill, byDay, cost_usage } = t;
    if (!total || total.calls === 0) {
      return `<div class="empty-state-mini">
        <div>아직 토큰 사용 기록이 없습니다</div>
        <div class="text-muted text-sm mt-2">Claude API/Code provider로 파이프라인을 실행하면 자동 집계됩니다 (mock provider는 집계 제외)</div>
      </div>`;
    }
    const fmt = (n) => Number(n || 0).toLocaleString();
    const usd = (n) => '$' + Number(n || 0).toFixed(4);
    const usd2 = (n) => '$' + Number(n || 0).toFixed(2);
    const tierClass = (m) => /opus/.test(m) ? 'badge-danger' : /sonnet/.test(m) ? 'badge-warn' : /haiku/.test(m) ? 'badge-success' : 'badge-info';

    // A7: 비용 한도 진행바 — 한도가 설정된 경우에만 표시
    const renderLimit = (scope, label) => {
      const u = cost_usage && cost_usage[scope];
      if (!u || u.limit <= 0) return '';
      const pct = Math.min(100, u.pct * 100);
      const tone = u.exceeded ? 'progress-danger' : u.alert ? 'progress-warn' : 'progress-ok';
      return `
        <div class="cost-limit-bar">
          <div class="flex-between mb-1">
            <span class="text-sm"><strong>${label}</strong> ${usd2(u.cost)} / ${usd2(u.limit)}</span>
            <span class="text-sm ${u.exceeded ? 'text-danger' : u.alert ? 'text-warn' : 'text-muted'}">${pct.toFixed(1)}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${tone}" style="width:${pct}%"></div></div>
        </div>
      `;
    };
    const limits = (cost_usage && (cost_usage.daily.limit > 0 || cost_usage.monthly.limit > 0))
      ? `<div class="grid grid-2 mb-3">${renderLimit('daily', '오늘')}${renderLimit('monthly', '이번 달')}</div>`
      : '';

    const maxCost = Math.max(1e-9, ...byDay.map(d => d.cost_usd));
    const sparkBars = byDay.map(d => {
      const h = Math.round((d.cost_usd / maxCost) * 60);
      return `<div class="spark-bar" title="${d.day}: ${usd(d.cost_usd)}" style="height:${h}px"><span>${d.day.slice(5)}</span></div>`;
    }).join('');

    return `
      ${limits}
      <div class="grid grid-4 mb-3">
        <div class="stat-mini"><div class="stat-mini-label">총 호출</div><div class="stat-mini-value">${fmt(total.calls)}</div></div>
        <div class="stat-mini"><div class="stat-mini-label">입력 토큰</div><div class="stat-mini-value">${fmt(total.input_tokens)}</div></div>
        <div class="stat-mini"><div class="stat-mini-label">출력 토큰</div><div class="stat-mini-value">${fmt(total.output_tokens)}</div></div>
        <div class="stat-mini"><div class="stat-mini-label">예상 비용</div><div class="stat-mini-value">${usd2(total.cost_usd)}</div></div>
      </div>

      ${byDay.length > 1 ? `
        <div class="mb-3">
          <div class="text-sm text-muted mb-1">일별 비용 추이</div>
          <div class="spark-chart">${sparkBars}</div>
        </div>
      ` : ''}

      <div class="grid grid-2">
        <div>
          <div class="text-sm text-muted mb-2">모델별</div>
          <table class="table-mini">
            <thead><tr><th>모델</th><th>호출</th><th>입력</th><th>출력</th><th>비용</th></tr></thead>
            <tbody>
              ${byModel.map(m => `
                <tr>
                  <td><span class="badge ${tierClass(m.model)}">${escapeHtml(m.model || '-')}</span></td>
                  <td>${fmt(m.calls)}</td>
                  <td>${fmt(m.input_tokens)}</td>
                  <td>${fmt(m.output_tokens)}</td>
                  <td>${usd(m.cost_usd)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <div class="text-sm text-muted mb-2">스킬별 (Top 10)</div>
          <table class="table-mini">
            <thead><tr><th>스킬</th><th>호출</th><th>비용</th></tr></thead>
            <tbody>
              ${bySkill.slice(0, 10).map(s => `
                <tr>
                  <td>${escapeHtml(s.skill_name)}</td>
                  <td>${fmt(s.calls)}</td>
                  <td>${usd(s.cost_usd)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _renderErrorLog(e) {
    const { total, byCode, bySource, byDay, recent } = e;
    if (!total || total === 0) {
      return `<div class="empty-state-mini">
        <div>오류 기록 없음 — 시스템 양호</div>
        <div class="text-muted text-sm mt-2">파이프라인/HTTP 오류는 자동으로 여기 누적됩니다</div>
      </div>`;
    }
    const fmt = (n) => Number(n || 0).toLocaleString();
    const sourceClass = (s) => s === 'pipeline-worker' ? 'badge-warn' : s === 'http' ? 'badge-info' : 'badge-muted';

    const maxC = Math.max(1, ...byDay.map(d => d.c));
    const sparkBars = byDay.map(d => {
      const h = Math.round((d.c / maxC) * 60);
      return `<div class="spark-bar spark-bar-warn" title="${d.day}: ${d.c}건" style="height:${h}px"><span>${d.day.slice(5)}</span></div>`;
    }).join('');

    const recentRows = recent.slice(0, 30).map(r => {
      let ctx = '';
      try { ctx = r.context_json ? JSON.stringify(JSON.parse(r.context_json)) : ''; } catch { ctx = r.context_json || ''; }
      const proj = r.project_code ? `<span class="project-code">${escapeHtml(r.project_code)}</span>` : '';
      const msg = (r.message || '').slice(0, 160);
      return `
        <tr>
          <td class="text-muted text-sm">${formatRelative(r.created_at)}</td>
          <td><span class="badge ${sourceClass(r.source)}">${escapeHtml(r.source || '-')}</span></td>
          <td><code>${escapeHtml(r.code || '-')}</code></td>
          <td>${proj} ${escapeHtml(msg)}${(r.message || '').length > 160 ? '…' : ''}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="grid grid-3 mb-3">
        <div class="stat-mini"><div class="stat-mini-label">총 오류</div><div class="stat-mini-value">${fmt(total)}</div></div>
        <div class="stat-mini"><div class="stat-mini-label">소스 종류</div><div class="stat-mini-value">${bySource.length}</div></div>
        <div class="stat-mini"><div class="stat-mini-label">에러 코드</div><div class="stat-mini-value">${byCode.length}</div></div>
      </div>

      ${byDay.length > 1 ? `
        <div class="mb-3">
          <div class="text-sm text-muted mb-1">일별 발생 추이</div>
          <div class="spark-chart">${sparkBars}</div>
        </div>
      ` : ''}

      <div class="grid grid-2 mb-3">
        <div>
          <div class="text-sm text-muted mb-2">자주 발생하는 코드 (Top)</div>
          <table class="table-mini">
            <thead><tr><th>코드</th><th>발생</th><th>마지막</th></tr></thead>
            <tbody>
              ${byCode.map(c => `
                <tr>
                  <td><code>${escapeHtml(c.code || '-')}</code></td>
                  <td>${fmt(c.occurrences)}</td>
                  <td class="text-muted text-sm">${formatRelative(c.last_seen_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <div class="text-sm text-muted mb-2">소스별</div>
          <table class="table-mini">
            <thead><tr><th>소스</th><th>발생</th></tr></thead>
            <tbody>
              ${bySource.map(s => `
                <tr>
                  <td><span class="badge ${sourceClass(s.source)}">${escapeHtml(s.source || '-')}</span></td>
                  <td>${fmt(s.occurrences)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="text-sm text-muted mb-2">최근 오류 (30건)</div>
        <table class="table-mini">
          <thead><tr><th>시각</th><th>소스</th><th>코드</th><th>메시지</th></tr></thead>
          <tbody>${recentRows}</tbody>
        </table>
      </div>
    `;
  },

  // F1: 에러 예산 배지 — 임계 비활성/정상이면 작은 회색, alert는 노랑, exceeded는 빨강
  _renderErrorBudgetBadge(eb) {
    if (!eb) return '';
    const day = eb.day || {};
    const hour = eb.hour || {};
    const inactive = (day.limit || 0) === 0 && (hour.limit || 0) === 0;
    if (inactive) return '';
    const tone = (day.exceeded || hour.exceeded) ? 'badge-danger'
               : (day.alert || hour.alert) ? 'badge-warn'
               : 'badge-success';
    const label = (day.exceeded || hour.exceeded) ? '⚠ 예산 초과'
                : (day.alert || hour.alert) ? '⚠ 예산 경고'
                : '✓ 정상';
    const detail = `${hour.count || 0}/${hour.limit || '∞'} 1h · ${day.count || 0}/${day.limit || '∞'} 24h`;
    return `<span class="badge ${tone}" title="${escapeHtml(detail)}" style="margin-right:0.5rem">${label} (${detail})</span>`;
  },

  // v26: 워커 미감지 배너 (대시보드 상단에 동적 삽입)
  _renderWorkerSetupBanner(ob) {
    if (document.getElementById('xcipe-worker-banner')) return; // 이미 표시
    const div = document.createElement('div');
    div.id = 'xcipe-worker-banner';
    div.className = 'alert alert-warning';
    div.style.cssText = 'margin:16px 24px;padding:14px 18px;display:flex;gap:14px;align-items:center;border-left:4px solid #f59f00;background:linear-gradient(90deg,#fff8e1,#fff3cd)';
    const myStatus = ob.my_claude_session && ob.my_claude_session.loggedIn
      ? `✅ claude 로그인됨 (${ob.my_claude_session.email || ''})`
      : '❌ claude CLI 로그인 미감지';
    const workerStatus = ob.my_worker_active ? '✅ 워커 polling 중' : '❌ 워커 polling 안 함';
    div.innerHTML = `
      <div style="font-size:24px">⚠️</div>
      <div style="flex:1">
        <div style="font-weight:600;margin-bottom:4px">파이프라인 실행 불가 — 본인 PC 워커 설정 필요</div>
        <div style="font-size:12px;color:#555">${myStatus} · ${workerStatus} · 토큰 발급: ${ob.has_worker_token ? '✅' : '❌'}</div>
      </div>
      <button class="btn-primary" onclick="DashboardPage.showWorkerSetup()" style="width:auto;padding:8px 14px">설정 가이드 ▶</button>
      <button class="btn btn-sm" onclick="document.getElementById('xcipe-worker-banner').remove()" title="닫기">✕</button>
    `;
    const main = document.querySelector('main') || document.body;
    main.insertBefore(div, main.firstChild);
  },

  // v26: 워커 설정 가이드 모달 — 단계별 실시간 체크
  async showWorkerSetup() {
    let ob;
    try { ob = await API.get('/dashboard/onboarding'); }
    catch (e) { alert('onboarding 정보 조회 실패: ' + (e.message || e)); return; }

    const checkMark = (ok) => ok ? '<span style="color:#28a745;font-size:18px">✅</span>' : '<span style="color:#dc3545;font-size:18px">⭕</span>';
    const step1 = !!(ob.my_claude_session && ob.my_claude_session.loggedIn);
    const step2 = !!ob.has_worker_token;
    const step3 = !!ob.my_worker_active;
    const xcipeUser = (API.getUser && API.getUser()) || {};
    const claudeUser = ob.my_claude_session || {};
    const accountsDiffer = claudeUser.email && xcipeUser.email && claudeUser.email !== xcipeUser.email;

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML = `
      <div class="modal" style="max-width:680px;background:#fff;border-radius:12px;padding:24px;max-height:90vh;overflow-y:auto">
        <h3 style="margin:0 0 8px;font-size:22px">🚀 xcipe 워커 설정</h3>
        <p style="margin:0 0 16px;color:#666;font-size:14px">본인 PC 에서 본인 Claude 계정으로 파이프라인을 실행합니다. 3단계만 완료하면 됩니다.</p>

        <div style="background:#f8f9fa;border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px">
          <div style="font-weight:600;margin-bottom:6px;font-size:12px;color:#666">계정 정보 — 두 다른 시스템 (같지 않아도 정상)</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div>📋 <strong>xcipe 로그인</strong>: <code>${escapeHtml ? escapeHtml(xcipeUser.email || '-') : (xcipeUser.email || '-')}</code></div>
            <div>🤖 <strong>Claude CLI 로그인</strong>: <code>${escapeHtml ? escapeHtml(claudeUser.email || '미감지') : (claudeUser.email || '미감지')}</code>${claudeUser.plan ? ` <span style="color:#666">(${claudeUser.plan})</span>` : ''}</div>
          </div>
          ${accountsDiffer ? `<div style="margin-top:8px;font-size:12px;color:#856404;background:#fff3cd;padding:6px 10px;border-radius:4px">💡 두 계정이 다릅니다. <strong>정상</strong> — xcipe 는 UI/권한, Claude 는 LLM 사용량/구독에 사용됩니다. 본인 Claude 구독으로 작업이 청구됩니다.</div>` : ''}
        </div>

        <div style="border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:12px;${step1 ? 'opacity:0.6' : ''}">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:8px">${checkMark(step1)} 1단계: Claude CLI 설치 + 로그인</div>
          ${step1
            ? `<div style="color:#28a745;font-size:13px;padding-left:28px">완료 — ${ob.my_claude_session.email} (${ob.my_claude_session.plan || 'plan unknown'})</div>`
            : `<div style="padding-left:28px;font-size:13px">
                <p style="margin:4px 0">본인 PC PowerShell 에서 실행:</p>
                <pre style="background:#1a1a1a;color:#fff;padding:10px;border-radius:4px;font-size:12px;overflow:auto;margin:6px 0">npm install -g @anthropic-ai/claude-code
claude /login    # 본인 Claude 계정 OAuth 로그인
claude auth status    # 로그인 확인</pre>
              </div>`
          }
        </div>

        <div style="border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:12px;${step3 ? 'opacity:0.6' : ''}">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:8px">${checkMark(step3)} 2단계: 워커 다운로드 + 실행 (토큰 자동 발급)</div>
          ${step3
            ? `<div style="color:#28a745;font-size:13px;padding-left:28px">완료 — 워커가 polling 중</div>`
            : `<div style="padding-left:28px;font-size:13px">
                <p style="margin:4px 0">아래 버튼 클릭 → 본인 토큰 자동 발급 + 서버 URL 박힌 워커 파일 다운로드.</p>
                <a class="btn-primary" href="/api/worker/my-download?access_token=${(API.getToken && API.getToken()) || ''}" download="xcipe-worker.js" style="display:inline-block;padding:10px 18px;text-decoration:none;font-weight:600;margin:6px 0">📥 내 워커 다운로드</a>
                <p style="margin:8px 0 4px">다운받은 파일이 있는 폴더에서 실행:</p>
                <pre style="background:#1a1a1a;color:#fff;padding:10px;border-radius:4px;font-size:12px;overflow:auto;margin:6px 0">node xcipe-worker.js</pre>
                <p style="margin:8px 0 0;font-size:12px;color:#666">⚙️ 사용자가 환경변수 설정·토큰 복사할 필요 없음 (다운로드 파일 안에 자동 박힘). polling 시작 후 이 모달 새로고침하면 ✅ 표시.</p>
              </div>`
          }
        </div>

        ${step1 && step2 && step3
          ? `<div class="alert alert-success" style="padding:12px;border-radius:6px;background:#d4edda;color:#155724;text-align:center;font-weight:600">🎉 모든 설정 완료! 파이프라인 시작 가능합니다.</div>`
          : ''
        }

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-sm" onclick="DashboardPage.showWorkerSetup()" style="padding:8px 14px">🔄 새로고침</button>
          <button class="btn-primary" id="kds-setup-close" style="width:auto;padding:8px 20px">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector('#kds-setup-close').addEventListener('click', () => wrap.remove());
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  },

  // U-G1: 4-step 온보딩 (AI키 → 프로젝트 → 실행 → 결과)
  //   1단계 미완료(키 없거나 mock) 시 "+ 새 프로젝트" 버튼 비활성화 + 안내
  //   admin이 아니면 1단계는 "관리자에게 요청" 메시지로 대체
  _renderOnboarding(aiState, user, onboarding) {
    const isAdmin = user && user.role === 'admin';
    const provider = aiState && aiState.provider;
    const hasKey = !!(aiState && aiState.has_api_key);
    const session = aiState && aiState.session;
    // provider 별 ready 판정 — claude-api 는 키, claude-code 는 OS 세션 로그인이 기준
    const claudeApiReady  = provider === 'claude-api'  && hasKey;
    const claudeCodeReady = provider === 'claude-code' && session && session.loggedIn;
    // v25-26: 분산 워커 모드 — 본인 워커 polling + claude session 둘 다 OK
    //   admin 만 aiState 받을 수 있어 일반 user 는 onboarding 사용
    const distributedWorkerReady = (aiState && aiState.worker_mode === 'queue-only' && aiState.distributed_worker_ready)
      || (onboarding && onboarding.ai_ready && onboarding.provider === 'claude-code');
    const aiReady = claudeApiReady || claudeCodeReady || distributedWorkerReady;
    const aiKnown = !!aiState; // admin이라 상태를 가져왔는지
    const step1Done = aiReady;
    const step1Active = !step1Done;

    const codeReadyDetail = claudeCodeReady
      ? ` · <code>${escapeHtml(session.email || '')}</code>${session.plan ? ` · plan <code>${escapeHtml(session.plan)}</code>` : ''}`
      : '';

    // v25: 분산 워커 모드 표시 보강
    const workerDetail = distributedWorkerReady
      ? ` · 워커 토큰 <code>${aiState.worker_token_issued_count}개 발급</code>${aiState.active_worker_count > 0 ? ` · <strong>${aiState.active_worker_count}명 polling 중</strong>` : ' · <span class="text-muted">활성 워커 없음 — 본인 PC 에서 npm run worker 실행 필요</span>'}`
      : '';

    // v26: 모든 사용자(member 포함) 가 따라할 수 있는 단순화된 안내.
    //   분산 워커 모드는 사용자 본인이 PC 에 워커 다운로드 + 실행하면 됨.
    //   admin/settings 안내 제거 (일반 user 권한 없음).
    const myToken = API.getToken ? API.getToken() : '';
    const step1Body = distributedWorkerReady || aiReady
      ? `<p>✅ <strong>연결됨</strong> — 본인 Claude 계정으로 작업이 처리됩니다. 다음 단계로 진행하세요.</p>`
      : `<p>본인 PC 에서 <strong>워커</strong> 를 한 번만 띄우면 됩니다. 본인 Claude Max 구독으로 작업이 처리됩니다.</p>
         <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin:10px 0">
           <div style="font-weight:600;margin-bottom:8px">1. 본인 PC 에 claude CLI 로그인 (1회)</div>
           <pre style="background:#1a1a1a;color:#fff;padding:8px 10px;border-radius:4px;font-size:12px;margin:4px 0">npm install -g @anthropic-ai/claude-code
claude /login</pre>
           <div style="font-weight:600;margin:12px 0 8px">2. 본인 워커 다운로드 (토큰·서버 URL 자동 박힘)</div>
           <a href="/api/worker/my-download?access_token=${myToken}" download="xcipe-worker.js" class="btn-primary" style="display:inline-block;padding:10px 18px;text-decoration:none;font-weight:600">📥 내 워커 다운로드</a>
           <div style="font-weight:600;margin:12px 0 8px">3. 본인 PC 에서 한 줄 실행</div>
           <pre style="background:#1a1a1a;color:#fff;padding:8px 10px;border-radius:4px;font-size:12px;margin:4px 0">node xcipe-worker.js</pre>
           <p style="margin:8px 0 0;font-size:12px;color:#666">"polling 시작" 로그 출력 후 이 페이지 새로고침. ✅ 표시되면 끝.</p>
         </div>`;

    const newProjectBtn = step1Done
      ? `<button class="btn-primary mt-2" onclick="DashboardPage.startNewProject()">프로젝트 시작하기 →</button>`
      : `<button class="btn-primary mt-2" disabled title="먼저 워커 설정을 완료하세요">프로젝트 시작하기 →</button>
         <div class="text-muted text-sm mt-1">본인 PC 에서 claude /login + 워커 실행이 필요합니다.</div>
         <button class="btn-primary mt-2" onclick="DashboardPage.showWorkerSetup()" style="background:#f59f00">📖 워커 설정 가이드 보기</button>`;

    return `
      <div class="onboarding">
        <div class="onboarding-hero">
          <h1>환영합니다 👋</h1>
          <p class="onboarding-sub">5분 안에 첫 프로젝트를 시작할 수 있어요. 아래 4단계를 순서대로 진행하세요.</p>
        </div>

        <div class="onboarding-steps">
          <div class="onboarding-step ${step1Done ? 'done' : (step1Active ? 'active' : '')}">
            <div class="step-num">${step1Done ? '✓' : '1'}</div>
            <div class="step-body">
              <h3>AI 연결 ${step1Done ? '<span class="text-muted text-sm">완료</span>' : ''}</h3>
              ${step1Body}
            </div>
          </div>
          <div class="onboarding-step ${step1Done ? 'active' : ''}">
            <div class="step-num">2</div>
            <div class="step-body">
              <h3>프로젝트 만들기</h3>
              <p>프로젝트 정보(이름·유형·간단한 설명)만 입력하면 자동으로 14단계 파이프라인이 생성됩니다.</p>
              ${newProjectBtn}
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-num">3</div>
            <div class="step-body">
              <h3>파이프라인 실행</h3>
              <p>채팅창에서 <code>/run</code>을 입력하거나, 단계별로 승인하며 진행할 수 있습니다.</p>
            </div>
          </div>
          <div class="onboarding-step">
            <div class="step-num">4</div>
            <div class="step-body">
              <h3>결과 확인 & 승인</h3>
              <p>각 단계의 산출물(QST·REQ·FN·IA·WBS·시안·HTML·QA 리포트)을 검토하고 승인하면 다음 단계로 자동 진행됩니다.</p>
            </div>
          </div>
        </div>

        <div class="onboarding-help">
          <h4>도움이 필요하면</h4>
          <ul>
            <li><code>/doctor</code> — 시스템 자가 진단 (Claude Code CLI)</li>
            <li><code>/status</code> — 진행 현황 요약 (Claude Code CLI)</li>
            <li>관리자(admin)는 좌측 사이드바 하단 <strong>🛡 관리자 모드</strong> → 시스템 설정에서 AI 키 등록</li>
          </ul>
        </div>
      </div>
    `;
  }
};
