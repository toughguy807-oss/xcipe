// SPA Router — HTML5 History API
const Router = (() => {
  const routes = [];
  let current = null;

  function register(pattern, handler) {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ pattern, regex, keys, handler });
  }

  function resolve(pathname) {
    for (const r of routes) {
      const m = pathname.match(r.regex);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { handler: r.handler, params };
      }
    }
    return null;
  }

  async function render() {
    const path = location.pathname;
    const match = resolve(path);
    if (!match) { document.getElementById('app').innerHTML = '<div class="empty">페이지를 찾을 수 없습니다</div>'; return; }
    try {
      current = match;
      await match.handler(match.params);
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = `<div class="empty">오류: ${e.message}</div>`;
    }
  }

  function navigate(path) {
    if (location.pathname === path) return;
    history.pushState(null, '', path);
    render();
  }

  window.addEventListener('popstate', render);

  // Delegated link handling
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (a) { e.preventDefault(); navigate(a.getAttribute('href')); }
  });

  return { register, render, navigate };
})();
