// 보안 미들웨어 (A1) — 외부 의존 없이 자체 구현
// 1) helmet 풍의 보안 헤더 (CSP/X-Frame/X-Content/Referrer/HSTS)
// 2) IP+경로 단위 슬라이딩 윈도우 rate limit (in-memory, 단일 노드 가정)

function securityHeaders() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // CSP — SPA·외부 폰트 CDN(jsdelivr) 허용. inline 스타일/스크립트는 인라인 컴포넌트 때문에 unsafe-inline 유지
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "img-src 'self' data: https: blob:",
      "connect-src 'self'",
      "frame-ancestors 'self'"
    ].join('; '));
    next();
  };
}

// 슬라이딩 윈도우 rate limiter — 키마다 (window, max) 큐를 유지
function rateLimit({ windowMs = 60_000, max = 60, keyFn = null, skipFn = null, message = '요청 빈도 초과' } = {}) {
  const store = new Map();
  const defaultKey = (req) => `${req.ip}:${req.method}:${req.path.split('/').slice(0, 4).join('/')}`;
  // 메모리 누수 방지 — 주기 청소
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, arr] of store) {
      const filtered = arr.filter(t => t > cutoff);
      if (filtered.length === 0) store.delete(k);
      else store.set(k, filtered);
    }
  }, Math.max(windowMs, 30_000)).unref();

  return (req, res, next) => {
    if (skipFn && skipFn(req)) return next();
    const key = keyFn ? keyFn(req) : defaultKey(req);
    const now = Date.now();
    const cutoff = now - windowMs;
    const arr = (store.get(key) || []).filter(t => t > cutoff);
    if (arr.length >= max) {
      const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'ESYS-RL-429',
        message,
        retry_after_sec: retryAfter
      });
    }
    arr.push(now);
    store.set(key, arr);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - arr.length));
    next();
  };
}

module.exports = { securityHeaders, rateLimit };
