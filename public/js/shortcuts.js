// Global keyboard shortcuts (C4)
//
// 패턴:
// - Ctrl/Cmd + K     : 검색 페이지로 이동 후 검색창 포커스
// - g + d            : 대시보드
// - g + p            : 프로젝트
// - g + s            : 검색
// - g + t            : 티켓
// - g + a            : 활동
// - g + h            : 자가진단 (admin only)
// - Esc              : 모달/시퀀스 취소
// - ?                : 단축키 도움말 모달
//
// 입력 필드(input/textarea/select/contenteditable)에 포커스가 있을 때는
// Ctrl+K과 Esc만 동작하고 나머지 단일 키 시퀀스는 무시됨.
const Shortcuts = (() => {
  const SHORTCUTS = [
    { keys: ['Ctrl/Cmd', 'K'],  desc: '검색으로 이동 + 포커스' },
    { keys: ['g', 'd'],          desc: '대시보드' },
    { keys: ['g', 'p'],          desc: '프로젝트' },
    { keys: ['g', 's'],          desc: '검색' },
    { keys: ['g', 't'],          desc: '티켓' },
    { keys: ['g', 'a'],          desc: '활동' },
    { keys: ['g', 'h'],          desc: '자가진단 (admin)' },
    { keys: ['?'],               desc: '단축키 도움말' },
    { keys: ['Esc'],             desc: '모달 닫기 / 시퀀스 취소' }
  ];

  let pendingG = false;
  let pendingTimer = null;

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function clearPending() {
    pendingG = false;
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  }

  function navigateAndFocusSearch() {
    // Command Palette 가 로드되어 있으면 우선 사용 (D1)
    if (typeof Palette !== 'undefined' && Palette && typeof Palette.show === 'function') {
      Palette.show();
      return;
    }
    if (typeof Router === 'undefined') return;
    Router.navigate('/search');
    setTimeout(() => {
      const sq = document.getElementById('sq');
      if (sq) { sq.focus(); sq.select(); }
    }, 60);
  }

  function showHelp() {
    if (document.getElementById('shortcuts-help-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'shortcuts-help-modal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '단축키 도움말');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
    overlay.innerHTML = `
      <div class="card" style="max-width:480px;width:92%;max-height:80vh;overflow:auto">
        <div class="flex-between mb-3">
          <h3 style="margin:0">단축키</h3>
          <button class="btn-secondary-sm" id="sc-close">닫기 (Esc)</button>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            ${SHORTCUTS.map(s => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px 0">
                  ${s.keys.map(k => `<kbd style="display:inline-block;padding:2px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);font-family:monospace;font-size:12px;margin-right:4px">${k}</kbd>`).join('+ ')}
                </td>
                <td style="padding:8px 0;text-align:right" class="text-sm text-muted">${s.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="text-sm text-muted" style="margin-top:12px">
          입력창에 포커스가 있을 때는 <kbd>Ctrl/Cmd+K</kbd>와 <kbd>Esc</kbd>만 동작합니다.
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#sc-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function closeTopModal() {
    const help = document.getElementById('shortcuts-help-modal');
    if (help) { help.remove(); return true; }
    // 일반 modal-overlay 닫기 (다른 컴포넌트가 띄운 모달)
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) { overlay.remove(); return true; }
    return false;
  }

  function handle(e) {
    // Ctrl/Cmd + K — 어디서든 검색 호출
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      clearPending();
      navigateAndFocusSearch();
      return;
    }

    // Esc — 시퀀스 취소 + 모달 닫기 (입력창에서도 동작)
    if (e.key === 'Escape') {
      clearPending();
      if (closeTopModal()) e.preventDefault();
      return;
    }

    // 입력 중이면 단일 키 시퀀스는 무시
    if (isTypingTarget(e.target)) return;

    // 수정자 키와 함께 눌리면 무시 (Ctrl/Alt/Meta+letter는 브라우저/OS 단축키)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // ? — 도움말
    if (e.key === '?') {
      e.preventDefault();
      clearPending();
      showHelp();
      return;
    }

    // g 시퀀스 시작
    if (!pendingG && e.key === 'g') {
      pendingG = true;
      pendingTimer = setTimeout(() => clearPending(), 1500);
      return;
    }

    // g 다음 키
    if (pendingG) {
      const k = e.key.toLowerCase();
      const map = {
        d: '/',
        p: '/projects',
        s: '/search',
        t: '/tickets',
        a: '/activity',
        h: '/admin/doctor'
      };
      clearPending();
      if (map[k]) {
        e.preventDefault();
        Router.navigate(map[k]);
      }
    }
  }

  function init() {
    document.addEventListener('keydown', handle);
  }

  return { init, showHelp, SHORTCUTS };
})();

// 자동 초기화 — DOMContentLoaded 이전에 로드되어도 안전
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Shortcuts.init);
} else {
  Shortcuts.init();
}
