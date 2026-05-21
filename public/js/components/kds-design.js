// KDS 디자인 페이지 — 대화형 요구사항 명확화 + KDS 화면 자동 생성.
//   사용자가 채팅으로 요구사항 입력 → 어시스턴트가 추가 질문 → 충분히 모이면 [READY] 시그널 →
//   KDS designer 에이전트 호출 → to-figma/ 저장 → 디자이너 Figma import.
const KdsDesignPage = {
  _sessionId: null,
  _pollTimer: null,
  _LS_SESSION: 'kds-design.sessionId',
  _LS_JOB: 'kds-design.jobId',

  async render() {
    // v25: 플러그인 설치 안내 dismiss 여부 (localStorage)
    const pluginGuideSeen = localStorage.getItem('kds.pluginGuideSeen') === '1';
    Shell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">KDS 디자인</div>
          <div class="page-subtitle">대화로 요구사항을 명확화한 뒤 KDS v4 워크플로우로 자동 생성. 파이프라인 무관.</div>
        </div>
        <div class="flex gap-2" style="position:relative">
          <button id="kds-plugin-btn" class="btn btn-sm" title="Figma 플러그인 설치 가이드 + 다운로드">🧩 Figma 플러그인</button>
          <button id="kds-history-btn" class="btn btn-sm" title="과거 대화 목록">대화 목록 ▼</button>
          <div id="kds-history-list" style="display:none;position:absolute;right:0;top:32px;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.1);min-width:340px;max-height:50vh;overflow-y:auto;z-index:50"></div>
          <button id="kds-new" class="btn btn-sm">새 대화</button>
        </div>
      </div>

      ${pluginGuideSeen ? '' : `
      <div id="kds-plugin-banner" class="card mb-3" style="padding:14px 16px;background:linear-gradient(90deg,#fff8e1 0%,#fff3cd 100%);border-left:4px solid #f59f00;display:flex;gap:12px;align-items:center">
        <div style="font-size:24px">🧩</div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">처음 사용하시나요? Figma 플러그인 설치가 필요합니다</div>
          <div style="font-size:13px;color:#555;line-height:1.5">KDS 디자인을 Figma 캔버스로 가져오려면 전용 플러그인을 한 번 설치해야 합니다. 다운로드 후 Figma 데스크톱에 import 하시면 됩니다.</div>
        </div>
        <button id="kds-plugin-show" class="btn-primary" style="width:auto;padding:8px 16px">설치 가이드 보기</button>
        <button id="kds-plugin-dismiss" class="btn btn-sm" title="다시 안 보기">✕</button>
      </div>
      `}

      <div class="grid" style="grid-template-columns: 1.5fr 1fr; gap: 16px">
        <!-- 좌: 채팅 영역 -->
        <div class="card" style="padding:0;display:flex;flex-direction:column;height:65vh">
          <div id="kds-chat" style="flex:1;overflow-y:auto;padding:16px"></div>
          <div id="kds-gen-status" style="padding:0 16px"></div>
          <div style="padding:12px 16px;border-top:1px solid var(--border)">
            <div class="flex gap-2">
              <textarea id="kds-input" rows="2" placeholder="예) 통신비 요금제 비교 카드 3개, 가격·데이터·특장점 표시, 하단 가입 CTA" style="flex:1;font-family:inherit;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:6px;resize:none"></textarea>
              <button id="kds-send" class="btn-primary" style="width:auto">전송</button>
            </div>
            <div style="font-size:11px;color:var(--text-secondary, #888);margin-top:4px">Enter = 전송 · Shift+Enter = 줄바꿈</div>
          </div>
        </div>

        <!-- 우: KDS preview 별도 창 + to-figma 콘텐츠 목록 -->
        <div>
          <button id="kds-open-preview" class="btn-primary" style="width:100%;margin-bottom:12px;padding:10px;font-weight:600">
            🖼  KDS preview 별도 창으로 열기 ↗
          </button>
          <div class="flex-between mb-2">
            <div style="font-weight:600;font-size:14px">KDS to-figma/ 파일</div>
            <button id="kds-refresh" class="btn btn-sm">새로고침</button>
          </div>
          <div id="kds-list" style="max-height:55vh;overflow-y:auto">로딩 중...</div>
          <div class="card mt-3" style="padding:10px;background:var(--bg-subtle, #f5f5f5);font-size:11px;line-height:1.6">
            Figma → <code>KDS Design Bridge</code> → "Claude에서 불러오기" 시 KDS preview 에서 선택한 파일(또는 가장 최근 mtime)이 import 됩니다.
          </div>
        </div>
      </div>
    `, 'kds-design');

    document.getElementById('kds-send').addEventListener('click', () => this.send());
    document.getElementById('kds-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    document.getElementById('kds-new').addEventListener('click', () => this.resetSession());
    document.getElementById('kds-refresh').addEventListener('click', () => this.loadList());
    document.getElementById('kds-open-preview').addEventListener('click', () => this.openKdsPreview());
    document.getElementById('kds-history-btn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleHistory(); });
    // v25: Figma 플러그인 설치 가이드
    document.getElementById('kds-plugin-btn').addEventListener('click', () => this.showPluginGuide());
    const banner = document.getElementById('kds-plugin-banner');
    if (banner) {
      document.getElementById('kds-plugin-show').addEventListener('click', () => this.showPluginGuide());
      document.getElementById('kds-plugin-dismiss').addEventListener('click', () => {
        localStorage.setItem('kds.pluginGuideSeen', '1');
        banner.remove();
      });
    }
    document.addEventListener('click', (e) => {
      const list = document.getElementById('kds-history-list');
      if (list && !list.contains(e.target) && e.target.id !== 'kds-history-btn') list.style.display = 'none';
    });
    // 페이지 진입 시 자동 시도 — 브라우저 popup blocker 막으면 위 버튼으로 사용자가 직접 열면 됨.
    setTimeout(() => this.openKdsPreview(), 500);

    // 세션/job 복원 — 페이지 이동했다가 돌아왔을 때 진행 상황 유지.
    const savedSession = localStorage.getItem(this._LS_SESSION);
    const savedJob = localStorage.getItem(this._LS_JOB);
    if (savedSession) {
      this._sessionId = savedSession;
      try {
        const s = await API.get(`/kds-design/session/${savedSession}`);
        if (s && Array.isArray(s.messages) && s.messages.length) {
          s.messages.forEach(m => this._appendMessage(m.role, m.content));
          this._knownMessageCount = s.messages.length;
        } else {
          this._appendMessage('assistant', '안녕하세요. 어떤 KDS 화면을 만들어 드릴까요?');
          this._knownMessageCount = 0;
        }
        this._renderJobHistoryBadge(s);  // 페이지 새로고침 후에도 과거 작업 상태 시각화
        // auto-chain 등으로 백엔드가 시작한 job 을 프론트가 인지 못한 경우를 방지.
        this._syncJobFromSession(s);
      } catch {
        localStorage.removeItem(this._LS_SESSION);
        this._sessionId = null;
        this._appendMessage('assistant', '안녕하세요. 어떤 KDS 화면을 만들어 드릴까요?');
        this._knownMessageCount = 0;
      }
    } else {
      this._appendMessage('assistant', '안녕하세요. 어떤 KDS 화면을 만들어 드릴까요? 화면 목적과 핵심 콘텐츠를 알려주시면 추가로 명확화 질문을 드린 뒤 생성하겠습니다.');
      this._knownMessageCount = 0;
    }
    if (savedJob && !this._pollTimer) {
      this._startGenerationPolling(savedJob);
    }
    // session 자동 폴링 — 디자이너 from-figma/ 변경 및 apply 작업 결과를 백엔드가 session.messages 에 push.
    // 5초마다 GET /session 으로 동기화 (이전 15초는 너무 김 — 결과 표시 지연).
    this._sessionPollTimer = setInterval(() => this._pollSession(), 5000);
    await this.loadList();
  },

  // 세션 로드/복원 직후 kds-gen-status 에 영구 작업 이력 뱃지 렌더.
  //   polling 없이 즉시 표시. running/pending 이 있으면 별도로 _startGenerationPolling 이 실시간 갱신.
  //   _startGenerationPolling 의 동적 뱃지는 #kds-gen-status .card 로 들어가므로, 본 영구 뱃지는
  //   #kds-job-history-badge 라는 별도 div 로 분리해 충돌 회피.
  _renderJobHistoryBadge(s) {
    const el = document.getElementById('kds-gen-status');
    if (!el) return;
    // 기존 영구 뱃지 제거 (loadSession 재호출 등)
    const old = document.getElementById('kds-job-history-badge');
    if (old) old.remove();
    const stats = s && s.jobStats;
    const total = (s && s.jobCount) || 0;
    if (!total) return;  // 작업 이력 없으면 표시 안 함
    const last = s.latestJobStatus;
    const parts = [];
    if (stats.done)    parts.push(`<span style="color:#1b8a3a">✓완료 ${stats.done}</span>`);
    if (stats.running) parts.push(`<span style="color:#1a73e8">▶진행 ${stats.running}</span>`);
    if (stats.failed)  parts.push(`<span style="color:#c0392b">✗실패 ${stats.failed}</span>`);
    if (stats.other)   parts.push(`<span style="color:#ff9800">⚠중단/취소 ${stats.other}</span>`);
    const lastLabel =
      last === 'done'      ? '<span style="color:#1b8a3a;font-weight:600">✓ 완료</span>' :
      last === 'running' || last === 'pending'
                           ? '<span style="color:#1a73e8;font-weight:600">▶ 진행 중</span>' :
      last === 'failed'    ? '<span style="color:#c0392b;font-weight:600">✗ 실패</span>' :
      last === 'orphaned'  ? '<span style="color:#ff9800;font-weight:600">⚠ 중단</span>' :
      last === 'cancelled' ? '<span style="color:#888;font-weight:600">취소</span>' :
                             `<span style="color:#888">${last || '-'}</span>`;
    const html = `
      <div id="kds-job-history-badge" class="card" style="padding:8px 12px;background:#fafafa;font-size:12px;margin-bottom:8px;border-left:3px solid #ddd;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div><b style="color:#555">작업 이력 ${total}건</b> <span style="color:#888">·</span> ${parts.join(' <span style="color:#ccc">·</span> ') || '-'}</div>
        <div style="font-size:11px;color:#666">최근 ${lastLabel}</div>
      </div>`;
    // 동적 뱃지(progress card) 가 있으면 그 위에, 없으면 컨테이너 첫 자리에.
    el.insertAdjacentHTML('afterbegin', html);
  },

  // 세션 목록 라벨 — jobHistory 집계(jobStats) 기반.
  //   대기:        [READY] 시그널 자체가 없는 세션 (작업 미시작)
  //   진행 중:     running/pending job 1건 이상
  //   ✓ 완료:      마지막 job 이 done (그 외 done 누적도 표시)
  //   ✗ 실패:      마지막 job 이 failed
  //   ⚠ 중단:      마지막 job 이 orphaned / cancelled
  //   READY뿐:    [READY] 는 있지만 jobHistory 기록 없음 (구버전 또는 jobId 누락)
  _historyStatusLabel(it) {
    const stats = it.jobStats || { done:0, running:0, failed:0, other:0 };
    const total = (it.jobCount != null) ? it.jobCount : (stats.done + stats.running + stats.failed + stats.other);
    if (!total) {
      if (it.has_ready) return '<span style="color:#888">READY (job 추적 없음)</span>';
      return '<span style="color:#888">대기</span>';
    }
    const last = it.latestJobStatus;
    const suffix = total > 1 ? ` (총 ${total}건, 완료 ${stats.done})` : '';
    if (stats.running > 0) return `<span style="color:#1a73e8">▶ 진행 중${suffix}</span>`;
    if (last === 'done')       return `<span style="color:#1b8a3a">✓ 완료${suffix}</span>`;
    if (last === 'failed')     return `<span style="color:#c0392b">✗ 실패${suffix}</span>`;
    if (last === 'orphaned')   return `<span style="color:#ff9800">⚠ 중단${suffix}</span>`;
    if (last === 'cancelled')  return `<span style="color:#888">취소${suffix}</span>`;
    if (stats.done > 0)        return `<span style="color:#1b8a3a">✓ 완료${suffix}</span>`;
    return `<span style="color:#888">작업 ${total}건</span>`;
  },

  async toggleHistory() {
    const list = document.getElementById('kds-history-list');
    if (list.style.display === 'block') { list.style.display = 'none'; return; }
    list.style.display = 'block';
    list.innerHTML = '<div style="padding:12px;font-size:12px;color:#888">로딩 중…</div>';
    try {
      const r = await API.get('/kds-design/sessions');
      if (!r.items || !r.items.length) {
        list.innerHTML = '<div style="padding:12px;font-size:12px;color:#888">과거 대화 없음</div>';
        return;
      }
      list.innerHTML = r.items.map(it => {
        const t = new Date(it.last_activity || it.created_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
        const isCurrent = it.id === this._sessionId;
        return `
          <div class="kds-hist-item" data-sid="${escapeHtml(it.id)}" style="padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;${isCurrent ? 'background:#fffde7' : ''}">
            <div style="font-weight:600;font-size:13px;color:#191A1B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.title)}</div>
            <div style="font-size:11px;color:#888;display:flex;justify-content:space-between;margin-top:2px">
              <span>${t} · ${it.messageCount}개 메시지</span>
              <span>${this._historyStatusLabel(it)}</span>
            </div>
            ${isCurrent ? '<div style="font-size:10px;color:#ff9800;margin-top:2px">● 현재 대화</div>' : ''}
          </div>`;
      }).join('') +
      `<div style="padding:10px 12px;border-top:1px solid #ddd;font-size:11px;color:#888;text-align:center;cursor:pointer" id="kds-hist-close">닫기</div>`;
      list.querySelectorAll('[data-sid]').forEach(el => el.addEventListener('click', () => {
        const sid = el.getAttribute('data-sid');
        list.style.display = 'none';
        this.loadSession(sid);
      }));
      document.getElementById('kds-hist-close').addEventListener('click', () => list.style.display = 'none');
    } catch (e) {
      list.innerHTML = `<div style="padding:12px;font-size:12px;color:#c00">로드 실패: ${escapeHtml(e.message || String(e))}</div>`;
    }
  },

  async loadSession(sessionId) {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    this._sessionId = sessionId;
    localStorage.setItem(this._LS_SESSION, sessionId);
    localStorage.removeItem(this._LS_JOB);  // 새 세션 진입 — 이전 job 추적 정지. 아래 sync 가 다시 살림.
    document.getElementById('kds-chat').innerHTML = '';
    document.getElementById('kds-gen-status').innerHTML = '';
    try {
      const s = await API.get(`/kds-design/session/${sessionId}`);
      if (s && Array.isArray(s.messages)) {
        s.messages.forEach(m => this._appendMessage(m.role, m.content));
        this._knownMessageCount = s.messages.length;
      }
      this._renderJobHistoryBadge(s);  // 과거 작업 완료/실패/중단 상태를 즉시 시각화
      this._syncJobFromSession(s);
    } catch (e) {
      this._appendMessage('assistant', `[대화 복원 실패] ${e.message}`);
    }
  },

  // 세션 응답의 generationJobId 와 localStorage 를 동기화. auto-chain 으로
  // 백엔드가 fire-and-forget 으로 시작한 job 을 프론트가 인지하지 못한 경우 대응.
  // ⚠ 이미 done/failed 로 처리한 jobId 는 _completedJobs Set 으로 가드 — 백엔드가 sess.generationJobId 를
  //   비우지 않으면 5초마다 _syncJobFromSession 이 같은 job 으로 polling 재시작 → "화면 생성 완료" 메시지 반복 push 버그.
  _completedJobs: new Set(),
  _syncJobFromSession(s) {
    if (!s) return;
    const sessionJob = s.generationJobId || null;
    if (!sessionJob) return;
    if (this._completedJobs.has(sessionJob)) return;  // 이미 done 처리한 job 은 무시
    const lsJob = localStorage.getItem(this._LS_JOB);
    if (sessionJob !== lsJob) {
      localStorage.setItem(this._LS_JOB, sessionJob);
      if (!this._pollTimer) this._startGenerationPolling(sessionJob);
    }
  },

  openKdsPreview() {
    // v29: 클라우드 배포 환경에서는 /kds-bridge/preview 로 proxy (Railway 단일 PORT).
    //   로컬 운영(npm start)에서는 그대로 localhost:3939 직접 접근.
    //   현재 페이지가 클라우드이면 same-origin /kds-bridge/preview 사용.
    try {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(window.location.origin);
      const url = isLocalhost
        ? 'http://localhost:3939/preview'
        : `${window.location.origin}/kds-bridge/preview`;
      const w = window.open(url, '_blank');
      if (w) w.focus();
    } catch {}
  },

  resetSession() {
    this._sessionId = null;
    localStorage.removeItem(this._LS_SESSION);
    localStorage.removeItem(this._LS_JOB);
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    document.getElementById('kds-chat').innerHTML = '';
    document.getElementById('kds-gen-status').innerHTML = '';
    this._appendMessage('assistant', '새 대화를 시작합니다. 어떤 KDS 화면을 만들어 드릴까요?');
  },

  async _pollSession() {
    if (!this._sessionId) return;
    if (this._inSend) return;  // send() 처리 중에는 폴링 정지 (중복 표시 방지)
    try {
      const s = await API.get(`/kds-design/session/${this._sessionId}`);
      const total = (s && s.messages && s.messages.length) || 0;
      const known = this._knownMessageCount || 0;
      if (total > known) {
        const newOnes = s.messages.slice(known);
        newOnes.forEach(m => this._appendMessage(m.role, m.content));
        this._knownMessageCount = total;
      } else if (this._knownMessageCount === undefined) {
        this._knownMessageCount = total;
      }
      // 매 폴링마다 job 상태 sync — auto-chain 이 도중에 designer job 을 시작해도 즉시 캐치.
      this._syncJobFromSession(s);
    } catch {}
  },

  _appendMessage(role, content) {
    const el = document.getElementById('kds-chat');
    if (!el) return;  // 페이지 전환 후 비동기 응답 도착 시 안전 가드
    const isUser = role === 'user';
    // 직전 메시지와 정확히 동일한 content 면 중복 출력 차단 — 폴링 무한루프/세션 푸시 중복 등 모든 원인 방어.
    const candidate = String(content || '').trim();
    if (el.lastElementChild && candidate.length > 0) {
      const lastBubble = el.lastElementChild.firstElementChild;
      const lastText = (lastBubble && lastBubble.textContent || '').trim();
      if (lastText === candidate) return;
    }
    const html = `
      <div data-role="${role}" style="margin-bottom:12px;display:flex;${isUser ? 'justify-content:flex-end' : ''}">
        <div style="max-width:80%;padding:10px 14px;border-radius:10px;${isUser ? 'background:var(--primary, #1a73e8);color:#fff' : 'background:var(--bg-subtle, #f1f3f4)'};font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word">${this._escapeForChat(content)}</div>
      </div>`;
    el.insertAdjacentHTML('beforeend', html);
    el.scrollTop = el.scrollHeight;
  },

  _escapeForChat(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\[READY\][^\n]*/g, '<i style="opacity:.6">[생성 시그널 감지됨 → 화면 생성 시작]</i>');
  },

  // typing 인디케이터 — 회색 풍선 + 점 3개 pulsing 애니메이션.
  // _appendMessage 의 '…' 텍스트보다 명확히 "응답 대기 중"임을 시각화.
  _appendThinking() {
    if (!document.getElementById('kds-thinking-style')) {
      const st = document.createElement('style');
      st.id = 'kds-thinking-style';
      st.textContent = `
        @keyframes kdsThinkingPulse { 0%, 80%, 100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-3px) } }
        .kds-thinking-dots { display: inline-flex; gap: 4px; align-items: center; padding: 2px 0; }
        .kds-thinking-dots span { width: 7px; height: 7px; border-radius: 50%; background: #888; display: inline-block; animation: kdsThinkingPulse 1.2s ease-in-out infinite; }
        .kds-thinking-dots span:nth-child(2) { animation-delay: .15s }
        .kds-thinking-dots span:nth-child(3) { animation-delay: .3s }
        .kds-thinking-label { font-size: 12px; color: #888; margin-left: 6px; vertical-align: middle; }
      `;
      document.head.appendChild(st);
    }
    const el = document.getElementById('kds-chat');
    if (!el) return null;  // 페이지 전환 후 비동기 응답 도착 시 안전 가드
    const html = `
      <div data-thinking="1" style="margin-bottom:12px;display:flex">
        <div style="max-width:80%;padding:12px 16px;border-radius:10px;background:var(--bg-subtle, #f1f3f4);font-size:14px;line-height:1.55">
          <span class="kds-thinking-dots"><span></span><span></span><span></span></span><span class="kds-thinking-label">답변 작성 중…</span>
        </div>
      </div>`;
    el.insertAdjacentHTML('beforeend', html);
    el.scrollTop = el.scrollHeight;
    return el.lastElementChild;
  },

  async send() {
    const input = document.getElementById('kds-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    this._inSend = true;  // 폴링 일시 정지 플래그
    this._appendMessage('user', message);

    const sendBtn = document.getElementById('kds-send');
    sendBtn.disabled = true;
    const thinkingEl = this._appendThinking();

    try {
      const r = await API.post('/kds-design/chat', { sessionId: this._sessionId, message });
      this._sessionId = r.sessionId;
      if (r.sessionId) localStorage.setItem(this._LS_SESSION, r.sessionId);

      // v30: 비동기 응답 — invocationId 받으면 polling 으로 결과 대기
      if (r.invocationId && r.status === 'pending') {
        const result = await this._pollChatInvocation(r.invocationId, thinkingEl);
        if (result && result.status === 'done') {
          this._appendMessage('assistant', result.assistant || '(응답 없음)');
          // chaining: [READY] 시그널 감지된 경우 generateDesign progress polling 시작
          if (result.ready && result.jobId) {
            localStorage.setItem(this._LS_JOB, result.jobId);
            this._startGenerationPolling(result.jobId, result.requirement);
          }
        } else if (result && result.status === 'failed') {
          this._appendMessage('assistant', `[오류] ${result.error || 'failed'}`);
        } else if (result && result.status === 'cancelled') {
          this._appendMessage('assistant', `[오류] 워커 응답 시간 초과 — 본인 PC 워커 polling 상태 확인 필요`);
        }
      } else {
        // 동기 응답 (local 모드)
        thinkingEl.remove();
        this._appendMessage('assistant', r.assistant || '(응답 없음)');
      }

      // 백엔드 session.messages 동기화
      try {
        const s = await API.get(`/kds-design/session/${this._sessionId}`);
        this._knownMessageCount = (s && s.messages && s.messages.length) || 0;
      } catch {}
      if (r.ready && r.jobId) {
        localStorage.setItem(this._LS_JOB, r.jobId);
        this._startGenerationPolling(r.jobId, r.requirement);
      }
    } catch (e) {
      thinkingEl.remove();
      this._appendMessage('assistant', `[오류] ${e.message || String(e)}`);
    } finally {
      sendBtn.disabled = false;
      input.focus();
      this._inSend = false;  // 폴링 재개
    }
  },

  // v30: invocation 결과 polling — 2초 간격, 최대 30분 (KDS chat/designer 긴 작업 대응)
  async _pollChatInvocation(invocationId, thinkingEl) {
    const startedAt = Date.now();
    const MAX_MS = 30 * 60 * 1000;  // 30분 — KDS 디자인 작업 최소치
    const POLL_MS = 2000;
    while (Date.now() - startedAt < MAX_MS) {
      try {
        const r = await API.get(`/kds-design/chat/poll/${invocationId}`);
        if (r.status === 'done' || r.status === 'failed' || r.status === 'cancelled') {
          if (thinkingEl) thinkingEl.remove();
          return r;
        }
      } catch (e) {
        // 일시적 오류는 재시도
      }
      await new Promise(r => setTimeout(r, POLL_MS));
    }
    if (thinkingEl) thinkingEl.remove();
    return { status: 'cancelled', error: 'client polling timeout' };
  },

  _formatEvents(events, elapsed) {
    const recent = (events || []).slice(-6);
    if (!recent.length) return `<div style="font-size:11px;color:#888">대기 중… (${elapsed}s)</div>`;
    return `<ul style="font-size:11px;margin:6px 0 0;padding-left:18px;line-height:1.7;list-style:none">
      ${recent.map(ev => {
        const t = new Date(ev.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const icon = ev.kind === 'new_file'
          ? (ev.fileKind === 'spec' ? '🟢' : (ev.fileKind === 'html' ? '📄' : '📦'))
          : (ev.kind === 'started' ? '▶' : (ev.kind === 'done' ? '✓' : (ev.kind === 'failed' ? '✗' : '·')));
        return `<li>${icon} <span style="color:#888">${t}</span> · ${this._escapeForChat(ev.text || '')}</li>`;
      }).join('')}
    </ul>`;
  },

  _fmtElapsed(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  },

  _startGenerationPolling(jobId, requirement) {
    const el = document.getElementById('kds-gen-status');
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._lastEventCount = undefined;  // 새 job 진입 시 이벤트 카운트 리셋
    this._pollTimer = setInterval(async () => {
      try {
        const job = await API.get(`/kds-design/job/${jobId}`);
        // 경과는 서버 created_at 기준 — 페이지 새로고침/복원 후에도 정확.
        const elapsedSec = ((Date.now() - (job.created_at || Date.now())) / 1000);
        const elapsedTxt = this._fmtElapsed(elapsedSec);
        if (job.status === 'running' || job.status === 'pending') {
          // 새 파일 생성 이벤트(phaseEvents 길이 증가) 감지 시 우측 to-figma 목록 자동 새로고침.
          // job.generated 는 완료 시점에만 채워지므로 phaseEvents 길이를 신호로 사용.
          const eventCount = (job.phaseEvents || []).length;
          if (this._lastEventCount === undefined) this._lastEventCount = eventCount;
          if (eventCount > this._lastEventCount) {
            this._lastEventCount = eventCount;
            this.loadList();  // 우측 to-figma/ 리스트 새로고침
          }
          el.innerHTML = `<div class="card" style="padding:12px;background:var(--bg-subtle, #f5f5f5);font-size:13px;margin-bottom:8px;border-left:3px solid #888">
            <div class="flex-between" style="align-items:center">
              <b>▶ 작업 중</b>
              <span style="font-size:11px;color:#888">${elapsedTxt} 경과</span>
            </div>
            <div style="font-size:11px;color:#888;margin-top:4px">오래 걸리는 작업이에요. 보통 30분~1시간 정도. 다른 페이지로 이동해도 계속 진행됩니다 — 완료되면 채팅으로 알려드릴게요.</div>
            ${this._formatEvents(job.phaseEvents, elapsedSec)}
          </div>`;
          return;
        }
        clearInterval(this._pollTimer); this._pollTimer = null;
        localStorage.removeItem(this._LS_JOB);
        this._completedJobs.add(jobId);  // _syncJobFromSession 이 같은 job 으로 재시작 못 하도록 등록
        if (job.status === 'done') {
          el.innerHTML = `<div class="card" style="padding:12px;background:#e8f5e9;font-size:13px;margin-bottom:8px;border-left:3px solid #4caf50">
            <b>✓ 생성 완료</b> <span style="color:#888;font-size:11px">${elapsedTxt} · ${job.generated.length}개 파일</span>
            ${this._formatEvents(job.phaseEvents, elapsedSec)}
          </div>`;
          this._appendMessage('assistant', `화면 생성 완료. 디자이너가 Figma 의 KDS Design Bridge 플러그인에서 "Claude에서 불러오기" 누르시면 import 됩니다.\n\n생성 파일:\n${job.generated.map(f => '• ' + f).join('\n')}`);
          await this.loadList();
        } else if (job.status === 'orphaned') {
          el.innerHTML = `<div class="card" style="padding:12px;background:#fff7e6;font-size:13px;margin-bottom:8px;border-left:3px solid #ff9800">
            <b>⚠ 작업 중단됨</b> <span style="color:#888;font-size:11px">서버 재시작</span>
            <div style="font-size:11px;color:#888;margin-top:4px">채팅에서 "이어서 만들어줘" 라고 요청해주세요.</div>
            ${this._formatEvents(job.phaseEvents, elapsedSec)}
          </div>`;
          this._appendMessage('assistant', '작업이 중단되었습니다 (서버 재시작 또는 환경 문제). 부분 결과는 KDS to-figma/ 에 남아있습니다. 이어서 진행하려면 "이어서 만들어줘" 라고 입력해주세요.');
        } else {
          el.innerHTML = `<div class="card" style="padding:12px;background:#ffebee;font-size:13px;margin-bottom:8px;border-left:3px solid #f44336">
            <b>✗ 작업 실패</b> <span style="color:#888;font-size:11px">${this._escapeForChat(job.error || 'unknown')}</span>
            ${this._formatEvents(job.phaseEvents, elapsedSec)}
          </div>`;
          this._appendMessage('assistant', `작업이 실패했습니다: ${job.error || 'unknown'}. 부분 결과가 남아있다면 채팅에서 "이어서 만들어줘" 또는 다른 요구로 요청해주세요.`);
        }
      } catch (e) {
        // 404 = 서버 재시작 등으로 job 사라짐. localStorage 정리 후 폴링 중단.
        if (e && e.status === 404) {
          clearInterval(this._pollTimer); this._pollTimer = null;
          localStorage.removeItem(this._LS_JOB);
          el.innerHTML = '';
          return;
        }
        // 5xx / 네트워크 일시 실패는 무시 — 다음 tick 재시도
      }
    }, 3000);
  },

  async loadList() {
    const el = document.getElementById('kds-list');
    try {
      const r = await API.get('/kds-design/list');
      if (!r.items || !r.items.length) {
        el.innerHTML = '<div class="empty" style="padding:16px;font-size:13px">비어있음</div>';
        return;
      }
      // 다수 선택 + 일괄 삭제 헤더
      el.innerHTML = `
        <div style="display:flex;gap:6px;align-items:center;padding:6px 8px;background:#f5f5f5;border-radius:6px;margin-bottom:8px;font-size:11px">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" id="kds-list-all"> 전체 선택
          </label>
          <button id="kds-list-bulk-delete" class="btn btn-sm" style="margin-left:auto;background:#f44336;color:#fff;border:0;padding:3px 10px;font-size:11px;border-radius:4px;cursor:pointer">선택 삭제</button>
        </div>` +
        r.items.map(item => {
          const ts = new Date(item.mtime).toLocaleString('ko-KR');
          return `
            <div class="card" style="padding:10px;margin-bottom:8px;font-size:12px;display:flex;align-items:flex-start;gap:10px">
              <input type="checkbox" data-pick="${escapeHtml(item.name)}" style="margin-top:2px;flex-shrink:0;cursor:pointer;width:16px;height:16px">
              <div style="flex:1;min-width:0">
                <div class="flex-between mb-1">
                  <div style="font-weight:600;word-break:break-all">${escapeHtml(item.name)}</div>
                  <button data-del="${escapeHtml(item.name)}" title="이 파일 삭제" style="background:#f44336;color:#fff;border:0;width:24px;height:24px;border-radius:50%;font-size:14px;font-weight:bold;cursor:pointer;flex-shrink:0;line-height:1">×</button>
                </div>
                <div style="color:var(--text-secondary, #888);font-size:11px;margin-bottom:6px">${ts}</div>
                <div class="flex gap-1" style="flex-wrap:wrap">
                  ${item.previewUrl ? `<a href="${item.previewUrl}" target="_blank" class="btn btn-sm" style="padding:2px 8px;font-size:11px">미리보기</a>` : ''}
                  <a href="http://localhost:3939/design?name=${encodeURIComponent(item.name)}" target="_blank" class="btn btn-sm" style="padding:2px 8px;font-size:11px">spec</a>
                </div>
              </div>
            </div>`;
        }).join('');
      // 개별 삭제
      el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        const n = b.getAttribute('data-del');
        if (!confirm(`삭제: ${n}\n(html + figma.json 2 파일)`)) return;
        await API.delete(`/kds-design/item/${encodeURIComponent(n)}`);
        await this.loadList();
      }));
      // 전체 선택 토글
      const allCb = document.getElementById('kds-list-all');
      if (allCb) allCb.addEventListener('change', () => {
        el.querySelectorAll('[data-pick]').forEach(cb => { cb.checked = allCb.checked; });
      });
      // 선택 삭제
      const bulkBtn = document.getElementById('kds-list-bulk-delete');
      if (bulkBtn) bulkBtn.addEventListener('click', async () => {
        const picked = Array.from(el.querySelectorAll('[data-pick]:checked')).map(cb => cb.getAttribute('data-pick'));
        if (!picked.length) { alert('삭제할 파일을 선택하세요'); return; }
        if (!confirm(`${picked.length}개 파일 삭제 (각 html + figma.json):\n\n${picked.join('\n')}`)) return;
        for (const n of picked) {
          try { await API.delete(`/kds-design/item/${encodeURIComponent(n)}`); } catch {}
        }
        await this.loadList();
      });
    } catch (e) {
      el.innerHTML = `<div class="empty" style="padding:16px;font-size:13px">목록 로드 실패</div>`;
    }
  },

  // v25: Figma 플러그인 설치 가이드 모달
  async showPluginGuide() {
    let info = null;
    try { info = await API.get('/kds-design/plugin/info'); } catch (e) {
      alert(`플러그인 정보 조회 실패: ${e.message || e}`);
      return;
    }
    const domainsList = (info.devAllowedDomains || []).map(d => `<code style="font-size:12px">${d}</code>`).join('<br>');
    const stepsHtml = (info.installSteps || []).map((s, i) => `<li style="margin-bottom:6px">${escapeHtml ? escapeHtml(s) : s}</li>`).join('');

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML = `
      <div class="modal" style="max-width:640px;background:#fff;border-radius:12px;padding:24px;max-height:90vh;overflow-y:auto">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="font-size:32px">🧩</div>
          <div>
            <h3 style="margin:0;font-size:20px">${info.name || 'KDS Change Tracker'} 설치</h3>
            <div style="font-size:13px;color:#666;margin-top:2px">Figma 데스크톱 앱 전용 (브라우저에서는 동작 안 함)</div>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <a href="${info.downloadUrl}?access_token=${API.getToken ? API.getToken() : ''}" download="kds-figma-plugin.zip" class="btn-primary" style="display:inline-block;padding:12px 20px;text-decoration:none;font-weight:600">📥 플러그인 다운로드 (zip)</a>
          <span style="font-size:12px;color:#666;margin-left:8px">압축 풀고 manifest.json 선택</span>
        </div>

        <h4 style="margin:16px 0 8px;font-size:15px">설치 단계</h4>
        <ol style="margin:0 0 16px 20px;padding:0;font-size:14px;line-height:1.6">${stepsHtml}</ol>

        <h4 style="margin:16px 0 8px;font-size:15px">플러그인이 허용된 도메인</h4>
        <div style="padding:10px;background:#f5f5f5;border-radius:6px;font-size:12px;line-height:1.8">${domainsList || '<em>없음</em>'}</div>
        <div style="font-size:12px;color:#666;margin-top:6px">현재 서버: <code>${info.currentOrigin || ''}</code></div>

        ${info.currentOrigin && info.devAllowedDomains && !info.devAllowedDomains.includes(info.currentOrigin) ? `
          <div style="margin-top:12px;padding:10px;background:#fff3cd;border-left:3px solid #f59f00;border-radius:4px;font-size:13px">
            ⚠️ 현재 서버 도메인 <code>${info.currentOrigin}</code> 이 플러그인 manifest 의 devAllowedDomains 에 등록되지 않았습니다. 관리자에게 manifest 갱신을 요청하세요.
          </div>
        ` : ''}

        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button id="kds-plugin-close" class="btn-primary" style="width:auto;padding:10px 24px">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector('#kds-plugin-close').addEventListener('click', () => {
      localStorage.setItem('kds.pluginGuideSeen', '1');
      wrap.remove();
      const banner = document.getElementById('kds-plugin-banner');
      if (banner) banner.remove();
    });
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  }
};
