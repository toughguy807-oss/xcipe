// v28: 헤더 워커 상태 인디케이터 + 30초 polling + 상태 변화 토스트
//   - SPA 외부 fixed 위젯 — 모든 페이지에서 항상 표시
//   - 30s 간격 /api/dashboard/onboarding polling
//   - 상태 전이 (OK → 미가동 / 미가동 → OK) 시 토스트
//   - 클릭 시 워커 설정 모달 (DashboardPage.showWorkerSetup)
(function() {
  let lastStatus = null;
  let pollTimer = null;
  let lastPendingAlertAt = 0;

  function ensureUI() {
    if (document.getElementById('xcipe-worker-indicator')) return;
    const widget = document.createElement('div');
    widget.id = 'xcipe-worker-indicator';
    widget.style.cssText = 'position:fixed;top:12px;right:16px;z-index:9998;display:none;align-items:center;gap:8px;background:#fff;border:1px solid #e0e0e0;border-radius:20px;padding:6px 12px;font-size:13px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.08);cursor:pointer;user-select:none';
    widget.title = '워커 상태 (클릭: 설정 가이드)';
    widget.innerHTML = '<span id="xcipe-worker-dot" style="width:9px;height:9px;border-radius:50%;background:#aaa;display:inline-block"></span><span id="xcipe-worker-label">워커 확인 중…</span><a id="xcipe-worker-download-quick" href="#" style="margin-left:6px;font-size:11px;color:#0066cc;text-decoration:none" title="워커 다운로드">📥</a>';
    widget.addEventListener('click', (e) => {
      if (e.target.id === 'xcipe-worker-download-quick') return; // 다운로드 링크는 별도
      try {
        if (window.DashboardPage && typeof DashboardPage.showWorkerSetup === 'function') {
          DashboardPage.showWorkerSetup();
        }
      } catch {}
    });
    document.body.appendChild(widget);

    const toastBox = document.createElement('div');
    toastBox.id = 'xcipe-toast-container';
    toastBox.style.cssText = 'position:fixed;top:60px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:340px';
    document.body.appendChild(toastBox);
  }

  function setIndicator(state, label) {
    const widget = document.getElementById('xcipe-worker-indicator');
    const dot = document.getElementById('xcipe-worker-dot');
    const lbl = document.getElementById('xcipe-worker-label');
    const dl = document.getElementById('xcipe-worker-download-quick');
    if (!widget || !dot || !lbl) return;
    widget.style.display = 'flex';
    const color = state === 'ok' ? '#28a745' : state === 'lag' ? '#f59f00' : '#dc3545';
    dot.style.background = color;
    lbl.textContent = label;
    if (dl) {
      const tok = (window.API && API.getToken) ? API.getToken() : '';
      dl.href = `/api/worker/my-download?access_token=${tok || ''}`;
      dl.setAttribute('download', 'xcipe-worker.zip');
      dl.style.display = state === 'ok' ? 'none' : 'inline'; // 동작 중이면 다운로드 숨김
    }
  }

  function hideIndicator() {
    const widget = document.getElementById('xcipe-worker-indicator');
    if (widget) widget.style.display = 'none';
  }

  function toast(msg, type) {
    const c = document.getElementById('xcipe-toast-container');
    if (!c) return;
    const t = document.createElement('div');
    const bg = type === 'error' ? '#dc3545' : type === 'warn' ? '#f59f00' : '#28a745';
    t.style.cssText = `background:${bg};color:#fff;padding:10px 16px;border-radius:6px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:auto;cursor:pointer;line-height:1.4`;
    t.textContent = msg;
    t.onclick = () => t.remove();
    c.appendChild(t);
    setTimeout(() => { try { t.remove(); } catch {} }, 7000);
  }

  async function check() {
    ensureUI();
    if (!window.API || !API.getToken || !API.getToken()) {
      // 로그인 전 — 위젯 숨김 + polling 잠시 대기 (token 생기면 다음 사이클부터 표시)
      hideIndicator();
      return;
    }
    let ob;
    try {
      ob = await API.get('/dashboard/onboarding');
    } catch (e) {
      // 401/네트워크 에러 — 무시 (다음 사이클)
      return;
    }
    let state, label;
    if (ob.my_worker_active) {
      state = 'ok';
      label = '워커 OK';
    } else if (ob.my_claude_session && ob.my_claude_session.loggedIn) {
      state = 'lag';
      label = '워커 미가동';
    } else {
      state = 'down';
      label = '워커 설정 필요';
    }
    setIndicator(state, label);

    // 상태 전이 토스트
    if (lastStatus !== null && lastStatus !== state) {
      if (state === 'ok') {
        toast('✅ 워커 polling 시작됨 — 파이프라인 실행 가능', 'ok');
      } else if (lastStatus === 'ok') {
        toast('⚠️ 워커 polling 끊김 — 본인 PC 워커 상태 확인 필요', 'warn');
      }
    }
    lastStatus = state;

    // 큐 적체 알림 (5분 간격 제한)
    const now = Date.now();
    if (ob.my_pending_steps >= 3 && state !== 'ok' && now - lastPendingAlertAt > 5 * 60 * 1000) {
      toast(`📦 작업 ${ob.my_pending_steps}개 대기 중 — 워커 가동 필요`, 'warn');
      lastPendingAlertAt = now;
    }
  }

  function start() {
    if (pollTimer) return;
    check();
    pollTimer = setInterval(check, 30000);
  }

  function stop() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.WorkerIndicator = { check, start, stop };
})();
