// IntakePage (U-G23) — 통합 채팅 UX 진입점
//   /intake/:id — 사용자와 AI가 대화로 프로젝트 메타 채움
//   - 좌: 채팅 스트림 (user / assistant 말풍선)
//   - 우: 슬롯 진행도 패널 (필수/권장 체크리스트)
//   - confirm 모드 도달 시 [생성·시작] 버튼 활성화
//   - 폴링 없이 turn 응답으로 즉시 갱신

const IntakePage = {
  _sessionId: null,
  _slots: {},
  _mode: 'ask',
  _missing: [],
  _committed: false,
  _similar: null,
  _lastTurn: null,        // PR4-C: 마지막 turn 응답 — plan_markdown / tools_used 보존
  _lastMessages: [],      // 마지막 refresh 의 messages — plan-card "더 다듬기" 시 재렌더용
  _toolsLoading: false,   // 입력 중일 때 도구 prefetch 진행 상태 표시

  async render({ id }) {
    this._sessionId = id;

    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">새 프로젝트 — 대화로 시작</div>
          <div class="page-subtitle">필요한 정보를 짧은 대화로 채웁니다. 모르는 항목은 "알아서 추천"이라 적어도 됩니다.</div>
        </div>
        <div class="page-actions">
          <button class="btn" id="intake-cancel">취소</button>
        </div>
      </div>
      <div class="grid grid-2 intake-layout" style="gap:1rem">
        <div class="card chat-panel" style="display:flex;flex-direction:column;height:calc(100vh - 200px);min-height:480px">
          <div id="intake-stream" class="chat-stream" style="flex:1 1 0;min-height:0;overflow-y:auto;padding-bottom:1rem"></div>
          <div id="intake-tools" class="tool-chips" style="display:none"></div>
          <form id="intake-form" style="border-top:1px solid var(--border);padding-top:.75rem;margin-top:.5rem">
            <div class="chat-composer">
              <textarea id="intake-msg" rows="1" placeholder="답변 또는 추가 정보… (Shift+Enter로 줄바꿈)" autofocus></textarea>
              <button class="composer-send" type="submit" id="intake-send">보내기</button>
            </div>
            <div class="chat-composer-hint">
              <span><kbd>Enter</kbd> 보내기 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 줄바꿈</span>
            </div>
          </form>
          <div id="intake-cta" class="mt-2"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="card slot-panel">
            <h3 class="mb-3">수집 항목</h3>
            <div id="intake-slots"></div>
          </div>
          <div class="card similar-panel" id="intake-similar-card" style="display:none">
            <h3 class="mb-2">유사 사례 추천 <span class="text-muted text-sm" id="intake-similar-count"></span></h3>
            <div class="text-muted text-sm mb-2" id="intake-similar-hint"></div>
            <div id="intake-similar"></div>
          </div>
        </div>
      </div>
    `, '');

    document.getElementById('intake-cancel').addEventListener('click', async () => {
      if (!confirm('진행 중인 대화를 폐기할까요?')) return;
      try { await API.post(`/intake/${this._sessionId}/abandon`, {}); } catch {}
      Router.navigate('/');
    });

    document.getElementById('intake-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendTurn();
    });

    // PR4-C: textarea auto-grow + Enter 전송 / Shift+Enter 줄바꿈
    const msgEl = document.getElementById('intake-msg');
    if (msgEl) {
      const autoGrow = () => {
        msgEl.style.height = 'auto';
        msgEl.style.height = Math.min(msgEl.scrollHeight, 180) + 'px';
      };
      msgEl.addEventListener('input', autoGrow);
      msgEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          this.sendTurn();
        }
      });
    }

    await this.refresh();

    // PR4-C: 대시보드에서 넘어온 초기 메시지가 있으면 자동 전송
    const initialKey = `intake:${id}:initial`;
    const initialText = sessionStorage.getItem(initialKey);
    if (initialText) {
      sessionStorage.removeItem(initialKey);
      const msgEl = document.getElementById('intake-msg');
      if (msgEl) {
        msgEl.value = initialText;
        // 다음 tick에 발사 — refresh 가 막 끝났으므로 DOM 안정 후 호출
        setTimeout(() => this.sendTurn(), 0);
      }
    }
  },

  async refresh() {
    try {
      const data = await API.get(`/intake/${this._sessionId}`);
      this._slots = data.session.slots || {};
      if (data.session.status === 'committed') {
        this._committed = true;
        const pid = data.session.committed_project_id;
        if (pid) Router.navigate(`/projects/${pid}`);
        return;
      }
      this._lastMessages = data.messages || [];
      this._renderStream(this._lastMessages);
      this._renderSlots();
      this._renderSimilar();
      this._renderTools();
      this._wirePlanActions();
      // 마지막 어시스턴트 메시지가 confirm summary면 CTA 노출 (필수 슬롯 모두 채워졌을 때)
      this._mode = this._isReadyToCommit() ? 'confirm' : 'ask';
      this._renderCta();
    } catch (e) {
      Shell.render(`<div class="alert alert-error">${escapeHtml(e.message)}</div>`, '');
    }
  },

  _isReadyToCommit() {
    const required = ['name', 'code', 'type', 'description', 'completion_level'];
    return required.every(k => this._slots[k] !== undefined && this._slots[k] !== null && this._slots[k] !== '');
  },

  _renderStream(messages) {
    const el = document.getElementById('intake-stream');
    if (!el) return;
    if (!messages.length) {
      el.innerHTML = `<div class="text-muted text-sm" style="padding:2rem 1rem;text-align:center">대화를 시작하세요. 예: "카페 예약 사이트 만들고 싶어"</div>`;
      return;
    }
    // PR4-C: 마지막 turn 응답이 plan 모드면 마지막 assistant 말풍선 자리에 plan-card를 끼워 넣는다.
    //   서버는 messages 테이블에 assistant content 로 plan_markdown 을 저장하지 않을 수 있으므로,
    //   마지막 메시지가 user 면 그 다음 자리에 plan-card 만 추가, assistant 면 그 자리를 plan-card 로 대체.
    const last = messages[messages.length - 1];
    const lastIsAssistant = last && last.role === 'assistant';
    const turn = this._lastTurn;
    // mode='plan' 정상 응답 OR provider가 자연어 markdown 반환한 fallback — 둘 다 plan-card로 렌더
    const showPlanCard = !!(turn && turn.plan_markdown && (turn.mode === 'plan' || turn._parse_fallback));

    let bubbles;
    if (showPlanCard && lastIsAssistant) {
      bubbles = messages.slice(0, -1).map(m => this._bubble(m)).join('') + this._planCard(turn);
    } else if (showPlanCard) {
      bubbles = messages.map(m => this._bubble(m)).join('') + this._planCard(turn);
    } else {
      bubbles = messages.map(m => this._bubble(m)).join('');
    }
    el.innerHTML = bubbles;
    el.scrollTop = el.scrollHeight;
  },

  _bubble(m) {
    const isUser = m.role === 'user';
    const align = isUser ? 'flex-end' : 'flex-start';
    const bg = isUser ? 'var(--navy)' : 'var(--panel-soft)';
    const fg = isUser ? '#fff' : 'var(--text)';
    return `
      <div style="display:flex;justify-content:${align};margin:.5rem 0">
        <div style="max-width:78%;background:${bg};color:${fg};padding:.6rem .85rem;border-radius:12px;line-height:1.5;font-size:.86rem">
          ${escapeHtml(m.content || '').replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  },

  // PR4-C: plan 모드 응답 — markdown lite 렌더 (## / **bold** / - 리스트 / `code`)
  _planCard(turn) {
    const md = turn.plan_markdown || '';
    const html = this._renderMdLite(md);
    const stillMissing = turn.missing_required && turn.missing_required.length > 0;
    const actions = stillMissing
      ? '<div class="text-muted text-sm">미입력 항목이 있어 확정 전 추가 정보가 필요합니다.</div>'
      : `<button class="btn" id="plan-edit">더 다듬기</button>
         <button class="btn-primary-sm" id="plan-accept">이대로 진행</button>`;
    return `
      <div class="plan-card">
        <div class="plan-card-head">
          <span class="plan-card-badge">▸ Plan 제안</span>
          <span class="text-muted text-sm">${turn.intent ? `intent: ${escapeHtml(turn.intent.type || '?')} · L${escapeHtml(String(turn.intent.level || '?'))}` : ''}</span>
        </div>
        <div class="plan-body">${html}</div>
        <div class="plan-actions">${actions}</div>
      </div>
    `;
  },

  // 아주 가벼운 markdown 렌더 — XSS 방지를 위해 escapeHtml 후 패턴 치환
  _renderMdLite(md) {
    let s = escapeHtml(md || '');
    // 헤더 ## / ###
    s = s.replace(/^###\s+(.+)$/gm, '<h2 style="font-size:.78rem">$1</h2>');
    s = s.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    // **bold**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 리스트 - / *
    s = s.replace(/(^|\n)([-*])\s+(.+)/g, (_, br, _b, txt) => `${br}<li>${txt}</li>`);
    s = s.replace(/(<li>[\s\S]+?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    // 빈 줄 → 단락
    s = s.split(/\n{2,}/).map(p => /<(h2|ul|li|strong)/.test(p) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    return s;
  },

  // PR4-C: tools_used / intent 가시화 — 입력창 위에 작은 칩
  _renderTools() {
    const el = document.getElementById('intake-tools');
    if (!el) return;
    if (this._toolsLoading) {
      el.style.display = '';
      el.innerHTML = `
        <span class="tool-chip tool-chip-loading">⋯ 의도 분류 중</span>
        <span class="tool-chip tool-chip-loading">⋯ 회사 톤 조회</span>
        <span class="tool-chip tool-chip-loading">⋯ 유사 사례 검색</span>
        <span class="tool-chip tool-chip-loading">⋯ 사내 지식 매칭</span>`;
      return;
    }
    const t = this._lastTurn;
    if (!t || !t.tools_used || !t.tools_used.length) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    const labelMap = {
      intent: '의도 분류',
      similar: '유사 사례',
      company: '회사 정체성',
      rag: '사내 지식',
      lessons: '누적 학습',
      intent_seeded_slots: '슬롯 자동 시드'
    };
    const chips = t.tools_used
      .filter(k => labelMap[k])
      .map(k => `<span class="tool-chip tool-chip-on">✓ ${labelMap[k]}</span>`);
    if (!chips.length) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    el.innerHTML = chips.join('');
  },

  _renderSlots() {
    const el = document.getElementById('intake-slots');
    if (!el) return;
    const required = [
      ['name', '프로젝트명'],
      ['code', '코드'],
      ['type', '유형'],
      ['description', '설명'],
      ['completion_level', '완성 수준'],
    ];
    const optional = [
      ['tech_stack', '기술 스택'],
      ['framework', '프레임워크'],
      ['reference_url', '레퍼런스 URL'],
    ];
    const row = ([k, label]) => {
      const v = this._slots[k];
      const filled = v !== undefined && v !== null && v !== '';
      const icon = filled ? '<span style="color:#3aa55c">✓</span>' : '<span style="color:#888">○</span>';
      const valHtml = filled
        ? `<span class="text-sm">${escapeHtml(String(v).slice(0, 40))}</span>`
        : '<span class="text-muted text-sm">미입력</span>';
      return `<div class="slot-row" style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px dashed var(--border)">
        <span>${icon} <strong>${label}</strong></span>${valHtml}
      </div>`;
    };
    el.innerHTML = `
      <div class="text-muted text-sm mb-2">필수 (5)</div>
      ${required.map(row).join('')}
      <div class="text-muted text-sm mt-3 mb-2">권장 (3)</div>
      ${optional.map(row).join('')}
    `;
  },

  _renderSimilar() {
    const card = document.getElementById('intake-similar-card');
    const list = document.getElementById('intake-similar');
    const hint = document.getElementById('intake-similar-hint');
    const count = document.getElementById('intake-similar-count');
    if (!card || !list) return;
    const sim = this._similar;
    if (!sim || !sim.results || !sim.results.length) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';
    if (count) count.textContent = `(${sim.results.length})`;
    if (hint) hint.textContent = `검색어: "${sim.hint}"${sim.embed_used ? '' : ' · 키워드 매칭'}`;
    list.innerHTML = sim.results.map(p => {
      const tags = (p.tags || []).slice(0, 3).map(t => `<span class="text-sm" style="background:#fff;color:var(--text);border:1px solid var(--border);padding:.1rem .4rem;border-radius:4px;margin-right:.25rem">${escapeHtml(t)}</span>`).join('');
      const purpose = p.site_purpose ? escapeHtml(String(p.site_purpose).slice(0, 90)) : '';
      const url = p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="text-sm" style="color:var(--accent)">${escapeHtml(p.url.replace(/^https?:\/\//, ''))}</a>` : '';
      const live = p.source === 'live_site' ? '<span class="text-sm" style="color:#3aa55c">● 라이브</span>' : '<span class="text-sm text-muted">○ 브로셔</span>';
      return `
        <div style="padding:.6rem 0;border-bottom:1px dashed var(--border)">
          <div style="display:flex;justify-content:space-between;gap:.5rem">
            <strong class="text-sm">${escapeHtml(p.name || '(이름 없음)')}</strong>
            <span class="text-sm text-muted">${p.score}</span>
          </div>
          <div class="text-sm" style="margin:.2rem 0">${url} · ${live}</div>
          ${purpose ? `<div class="text-sm text-muted" style="margin:.2rem 0">${purpose}</div>` : ''}
          <div style="margin-top:.3rem">${tags}</div>
        </div>
      `;
    }).join('');
  },

  _renderCta() {
    const el = document.getElementById('intake-cta');
    if (!el) return;
    if (this._mode !== 'confirm') {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `
      <div class="alert alert-success mt-2">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.6rem">
          <div>필수 정보가 모두 채워졌습니다. 이대로 프로젝트를 생성하고 파이프라인을 시작할까요?</div>
          <div style="display:flex;gap:.5rem">
            <button class="btn" id="intake-edit">더 다듬기</button>
            <button class="btn-primary" id="intake-commit">생성·시작</button>
          </div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.85rem;align-items:center">
          <label>디자인 시스템:
            <select id="intake-ds" style="margin-left:.4rem;padding:.25rem .5rem">
              <option value="">없음 (백지)</option>
            </select>
          </label>
          <label>팀:
            <select id="intake-team" style="margin-left:.4rem;padding:.25rem .5rem">
              <option value="">개인</option>
            </select>
          </label>
          <label>파이프라인:
            <select id="intake-preset" style="margin-left:.4rem;padding:.25rem .5rem">
              <option value="">자동 (completion_level)</option>
              <option value="design-only">디자인만 (벤치마크→스타일가이드→레이아웃→UI)</option>
              <option value="plan-only">기획만 (5단계)</option>
              <option value="plan+design">기획+디자인</option>
              <option value="publish-only">퍼블만 (HTML/CSS/JS)</option>
              <option value="design+publish">디자인+퍼블</option>
              <option value="qa-only">QA만</option>
            </select>
          </label>
        </div>
      </div>
    `;
    document.getElementById('intake-edit').addEventListener('click', () => { el.innerHTML = ''; });
    document.getElementById('intake-commit').addEventListener('click', () => this.commit());
    // DS / team dropdown 데이터 로드
    this._loadDsOptions();
    this._loadTeamOptions();
  },

  async _loadDsOptions() {
    const sel = document.getElementById('intake-ds');
    if (!sel) return;
    try {
      const r = await API.get('/design-systems');
      for (const ds of (r.items || [])) {
        const opt = document.createElement('option');
        opt.value = ds.id;
        opt.textContent = `${ds.name} (${ds.slug}) v${ds.version}`;
        sel.appendChild(opt);
      }
    } catch { /* 401/없음 — 조용히 skip */ }
  },

  async _loadTeamOptions() {
    const sel = document.getElementById('intake-team');
    if (!sel) return;
    try {
      const r = await API.get('/admin/teams');
      for (const t of (r.items || [])) {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name + (t.member_count ? ` · 멤버 ${t.member_count}` : '');
        sel.appendChild(opt);
      }
    } catch { /* admin 아니면 401 — 조용히 skip (개인 모드로 진행) */ }
  },

  async sendTurn() {
    const input = document.getElementById('intake-msg');
    const send = document.getElementById('intake-send');
    const text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    send.disabled = true;
    send.textContent = '...';
    // PR4-C: 도구 prefetch 로딩 시각화
    this._toolsLoading = true;
    this._renderTools();
    try {
      const r = await API.post(`/intake/${this._sessionId}/turn`, { message: text });
      if (r && r.similar_projects) this._similar = r.similar_projects;
      this._lastTurn = r || null;
      // 즉시 갱신 — turn 응답에 slots 포함되어 있으면 refresh 기다리지 않고 즉시 표시
      if (r && r.slots) {
        this._slots = { ...this._slots, ...r.slots };
        this._renderSlots();
        this._mode = this._isReadyToCommit() ? 'confirm' : 'ask';
        this._renderCta();
      }
      await this.refresh();
    } catch (e) {
      alert('실패: ' + e.message);
    } finally {
      this._toolsLoading = false;
      this._renderTools();
      send.disabled = false;
      send.textContent = '보내기';
      input.focus();
    }
  },

  // PR4-C: plan-card "이대로 진행" / "더 다듬기" 핸들러
  _wirePlanActions() {
    const accept = document.getElementById('plan-accept');
    const edit = document.getElementById('plan-edit');
    if (accept) {
      accept.addEventListener('click', () => {
        if (this._isReadyToCommit()) {
          this.commit();
        } else {
          // 부족하면 confirm 단계로 흐름 유도
          this._mode = 'confirm';
          this._renderCta();
        }
      });
    }
    if (edit) {
      edit.addEventListener('click', () => {
        this._lastTurn = null;
        this._renderStream(this._lastMessages || []);
        const msg = document.getElementById('intake-msg');
        if (msg) msg.focus();
      });
    }
  },

  async commit() {
    const btn = document.getElementById('intake-commit');
    if (btn) { btn.disabled = true; btn.textContent = '생성 중...'; }
    // DS / team 선택값 (있으면 commit payload 에 포함)
    const ds = document.getElementById('intake-ds');
    const team = document.getElementById('intake-team');
    const payload = { start_pipeline: true };
    if (ds && ds.value) payload.design_system_id = parseInt(ds.value, 10);
    if (team && team.value) payload.team_id = parseInt(team.value, 10);
    const preset = document.getElementById('intake-preset');
    if (preset && preset.value) payload.preset = preset.value;
    try {
      const r = await API.post(`/intake/${this._sessionId}/commit`, payload);
      Router.navigate(`/projects/${r.project_id}`);
    } catch (e) {
      alert('생성 실패: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '생성·시작'; }
    }
  }
};

// escapeHtml은 다른 컴포넌트에 이미 정의됨 (전역). 없으면 fallback.
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
