// Theme toggle (D3) — light / dark / auto(시스템)
//
// localStorage 'theme' = 'light' | 'dark' | 'auto'
// 'auto'는 prefers-color-scheme 따라감 — :root[data-theme] 미설정 시 CSS의
// @media (prefers-color-scheme: dark) 가 적용됨.
const Theme = (() => {
  const KEY = 'theme';

  function get() {
    return localStorage.getItem(KEY) || 'auto';
  }

  function apply(t) {
    const root = document.documentElement;
    if (t === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', t);
    }
  }

  function set(t) {
    if (!['light', 'dark', 'auto'].includes(t)) t = 'auto';
    localStorage.setItem(KEY, t);
    apply(t);
  }

  function cycle() {
    const cur = get();
    const next = cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto';
    set(next);
    return next;
  }

  function effective() {
    const cur = get();
    if (cur !== 'auto') return cur;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function init() {
    apply(get());
  }

  return { get, set, cycle, effective, init };
})();

// FOUC 방지 — 스크립트 로드 즉시 적용
Theme.init();
