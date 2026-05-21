// Unit — rate limit 슬라이딩 윈도우
const test = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit, securityHeaders } = require('../../src/middleware/security');

function mockReqRes() {
  const req = { ip: '1.2.3.4', method: 'GET', path: '/api/foo' };
  let statusCode = null, body = null;
  const headers = {};
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (c) => { statusCode = c; return res; },
    json: (b) => { body = b; return res; },
    headers,
    get statusCode() { return statusCode; },
    get body() { return body; }
  };
  return { req, res };
}

test('rateLimit: max 미만은 통과', () => {
  const limiter = rateLimit({ windowMs: 1000, max: 3 });
  const calls = [];
  for (let i = 0; i < 3; i++) {
    const { req, res } = mockReqRes();
    limiter(req, res, () => calls.push('next'));
  }
  assert.equal(calls.length, 3);
});

test('rateLimit: max 초과 시 429 반환 + retry_after_sec', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, message: 'too many' });
  const passes = [];
  let blocked = null;

  for (let i = 0; i < 3; i++) {
    const { req, res } = mockReqRes();
    limiter(req, res, () => passes.push(i));
    if (res.statusCode === 429) blocked = res;
  }

  assert.equal(passes.length, 2, '2번까지 통과');
  assert.ok(blocked, '3번째는 차단');
  assert.equal(blocked.body.error, 'ESYS-RL-429');
  assert.equal(blocked.body.message, 'too many');
  assert.ok(typeof blocked.body.retry_after_sec === 'number');
  assert.ok(blocked.headers['Retry-After']);
});

test('rateLimit: 키 분리 — IP가 다르면 독립 카운트', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2 });
  let pass1 = 0, pass2 = 0;
  for (let i = 0; i < 2; i++) {
    const { res } = (() => { const m = mockReqRes(); m.req.ip = '1.1.1.1'; return m; })();
    const { req: r1 } = (() => { const m = mockReqRes(); m.req.ip = '1.1.1.1'; return m; })();
    limiter(r1, res, () => pass1++);
  }
  for (let i = 0; i < 2; i++) {
    const { req: r2, res } = (() => { const m = mockReqRes(); m.req.ip = '2.2.2.2'; return m; })();
    limiter(r2, res, () => pass2++);
  }
  assert.equal(pass1, 2);
  assert.equal(pass2, 2);
});

test('rateLimit: skipFn 동작', () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1, skipFn: (req) => req.ip === '9.9.9.9' });
  let passes = 0;
  for (let i = 0; i < 5; i++) {
    const { req, res } = mockReqRes();
    req.ip = '9.9.9.9';
    limiter(req, res, () => passes++);
  }
  assert.equal(passes, 5, 'skipFn=true이면 무제한');
});

test('securityHeaders: 필수 헤더 모두 설정', () => {
  const mw = securityHeaders();
  const { req, res } = mockReqRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  assert.ok(nextCalled);
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.ok(res.headers['Content-Security-Policy']);
  assert.match(res.headers['Content-Security-Policy'], /default-src 'self'/);
});
