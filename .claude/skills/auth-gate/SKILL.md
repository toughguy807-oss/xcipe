---
name: auth-gate
description: >
  SYS_v4 산출물 사이트 접근 제어 스킬. 2-tier 설계:
  Tier-A(기본) — docs/ 클라이언트사이드 패스워드 게이트 (외부 SaaS 의존 0).
  Tier-B(고도 보안) — Cloudflare Workers + Resend Magic Link (선택, 외부 무료 tier).
  Notion 공유 링크 인증 대체.
user-invocable: false
---

# Auth Gate (산출물 접근 제어)

당신은 **SYS_v4 접근 제어 운영자**입니다.
GitHub Pages로 배포된 산출물을 외부 클라이언트가 인증 후 열람하도록 게이트를 설치합니다.

## 전제조건

- **필수**: `ops-deploy` 스킬로 `docs/` 빌드 사전 수행
- **Tier-A**: 추가 의존 0
- **Tier-B**: Cloudflare 계정 (무료) + Resend API Key (무료 100/day)
- **권장**: GitHub repo private 설정 + Pages 활성화

> **본의**: Notion이 가진 "공유 링크 + 게스트" 인증 흡수. 외부 SaaS 의존 우선순위 0.

---

## 보안 모델

| 위협 | Tier-A 방어 | Tier-B 방어 |
|------|-------------|-------------|
| 비인가 직접 URL 접근 | sessionStorage 토큰 검사 | Workers 401 응답 |
| 비밀번호 평문 노출 | bcrypt 해시 (사전 빌드) | 서버측 비교 |
| Brute-force | 클라이언트 로컬 (제한적) | Workers rate-limit |
| 토큰 탈취 | 7일 세션 + 동일 origin | HttpOnly + Secure 쿠키 |
| 화이트리스트 우회 | N/A (공유 비번) | 이메일 → 토큰 매핑 |

> Tier-A는 **"길거리 노출은 막지만 결심한 공격자는 못 막음"**. Notion 공유 링크와 동급. 산출물 자체에 PII/시크릿이 있으면 Tier-B 또는 별도 호스팅.

---

## Tier-A: 클라이언트 패스워드 게이트 (기본)

### 설치 위치

`ops-deploy` build.py가 생성하는 `docs/`에 추가:

- `docs/_auth/login.html` — 로그인 폼
- `docs/_auth/auth.js` — 검증 + sessionStorage 처리
- 모든 산출물 HTML 상단에 가드 스크립트 삽입

### login.html

```html
<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>접근 인증</title>
<style>
body{font-family:-apple-system,Segoe UI,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f9fafb;color:#1a1a1a}
.box{background:#fff;padding:2rem;border:1px solid #e5e5e5;border-radius:8px;width:min(360px,90vw)}
h1{margin:0 0 0.5rem;font-size:1.25rem}p{color:#666;font-size:0.9rem;margin:0 0 1.5rem}
input{width:100%;padding:0.6rem;border:1px solid #e5e5e5;border-radius:4px;font-size:1rem;box-sizing:border-box;margin-bottom:0.75rem}
button{width:100%;padding:0.7rem;background:#2563eb;color:#fff;border:0;border-radius:4px;font-size:0.95rem;cursor:pointer}
button:disabled{opacity:0.5;cursor:wait}.err{color:#dc2626;font-size:0.85rem;min-height:1.2em}
</style></head><body>
<form class="box" id="f">
<h1>접근 인증</h1><p>공유받은 비밀번호를 입력하세요.</p>
<input type="password" id="pw" autocomplete="current-password" required autofocus>
<button id="b">확인</button>
<div class="err" id="e"></div>
<p style="color:#888;font-size:0.78rem;margin:1rem 0 0">※ 인증은 기기·브라우저별로 적용됩니다. 새 기기에서 접속하면 다시 입력이 필요합니다.</p>
</form>
<script src="auth.js"></script>
<script>
const HASH = '__HASH_PLACEHOLDER__';  // 빌드 시 치환
document.getElementById('f').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = document.getElementById('b');
  const err = document.getElementById('e');
  btn.disabled = true; err.textContent = '';
  try {
    const ok = await AuthGate.verify(document.getElementById('pw').value, HASH);
    if (ok) {
      AuthGate.grant();
      const next = new URLSearchParams(location.search).get('next') || '../';
      location.replace(next);
    } else {
      err.textContent = '비밀번호가 일치하지 않습니다.';
      btn.disabled = false;
    }
  } catch (e) {
    err.textContent = '검증 중 오류가 발생했습니다.';
    btn.disabled = false;
  }
});
</script></body></html>
```

### auth.js

```javascript
const AuthGate = {
  KEY: 'sys-v4-auth',
  TTL: 7 * 24 * 60 * 60 * 1000,  // 7일
  WARN_BEFORE: 24 * 60 * 60 * 1000,  // 만료 D-1 알림 임계 (24시간)

  async verify(password, expectedHash) {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const hash = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return hash === expectedHash;
  },

  grant() {
    const now = Date.now();
    const token = { iat: now, exp: now + this.TTL };
    sessionStorage.setItem(this.KEY, JSON.stringify(token));
    localStorage.setItem(this.KEY, JSON.stringify(token));
    // 방문 카운터 리셋 (운영자가 클라에 물어볼 때 참조)
    localStorage.setItem(this.KEY + '-visits', '0');
  },

  incrementVisit() {
    const k = this.KEY + '-visits';
    const cur = parseInt(localStorage.getItem(k) || '0', 10);
    localStorage.setItem(k, String(cur + 1));
  },

  read() {
    try {
      const raw = sessionStorage.getItem(this.KEY) || localStorage.getItem(this.KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  },

  isValid() {
    const t = this.read();
    return t && t.exp > Date.now();
  },

  // 만료 임박 — D-1
  isExpiringSoon() {
    const t = this.read();
    if (!t) return false;
    const remaining = t.exp - Date.now();
    return remaining > 0 && remaining < this.WARN_BEFORE;
  },

  remainingDays() {
    const t = this.read();
    if (!t) return 0;
    return Math.max(0, Math.ceil((t.exp - Date.now()) / (24 * 60 * 60 * 1000)));
  },

  issuedAtLabel() {
    const t = this.read();
    if (!t || !t.iat) return '';
    const d = new Date(t.iat);
    return d.toISOString().slice(0, 10);
  },

  guard() {
    // ?reauth=1 강제 재인증 (URL 파라미터)
    const params = new URLSearchParams(location.search);
    if (params.get('reauth') === '1') {
      this.logout();
      return;
    }
    if (!this.isValid()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('/_auth/login.html?next=' + next);
      return;
    }
    // 만료 임박 시 배너 표시 (DOMContentLoaded 후)
    if (this.isExpiringSoon()) {
      this.showExpiryBanner();
    }
    // 로그아웃 버튼 주입
    this.injectControlBar();
  },

  showExpiryBanner() {
    const days = this.remainingDays();
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.id = 'sys-auth-expiry-banner';
      banner.setAttribute('role', 'alert');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fff3cd;color:#664d03;border-bottom:1px solid #ffe69c;padding:0.5rem 1rem;font:0.9rem -apple-system,Segoe UI,sans-serif;z-index:99999;text-align:center';
      banner.innerHTML = `세션 만료까지 ${days}일 남았습니다. <a href="?reauth=1" style="color:#664d03;font-weight:600;margin-left:0.5rem">지금 재인증</a>`;
      document.body && document.body.insertBefore(banner, document.body.firstChild);
    });
  },

  injectControlBar() {
    document.addEventListener('DOMContentLoaded', () => {
      const bar = document.createElement('div');
      bar.id = 'sys-auth-controlbar';
      bar.style.cssText = 'position:fixed;right:0.75rem;bottom:0.75rem;background:rgba(0,0,0,0.6);color:#fff;font:0.75rem -apple-system,Segoe UI,sans-serif;padding:0.4rem 0.7rem;border-radius:999px;z-index:99998;display:flex;gap:0.5rem;align-items:center';
      const issued = this.issuedAtLabel();
      const days = this.remainingDays();
      bar.innerHTML = `<span style="opacity:0.7">${issued} · ${days}d</span><button id="sys-auth-logout" style="background:transparent;border:0;color:#fff;cursor:pointer;font:inherit;padding:0;text-decoration:underline">로그아웃</button>`;
      document.body && document.body.appendChild(bar);
      const btn = bar.querySelector('#sys-auth-logout');
      btn && btn.addEventListener('click', () => AuthGate.logout());
    });
  },

  logout() {
    sessionStorage.removeItem(this.KEY);
    localStorage.removeItem(this.KEY);
    location.replace('/_auth/login.html');
  }
};
```

### 가드 스니펫 (모든 산출물 HTML `<head>` 최상단)

```html
<script src="/_auth/auth.js"></script>
<script>AuthGate.guard();</script>
```

> **예외 페이지**: `_auth/login.html`, `_auth/auth.js`, `manifest.webmanifest`, `sw.js` — 가드 미적용.

### build.py 통합

```python
import hashlib, getpass

def setup_auth_gate(password=None):
    """패스워드는 PROJECT.md의 auth.password_env 환경변수에서 읽거나 사용자 입력."""
    project = load_project()
    auth = project.get("auth")
    if not auth or auth.get("mode") != "password":
        return  # 인증 비활성
    pw = password or os.environ.get(auth.get("password_env", "SYS_AUTH_PASSWORD"))
    if not pw:
        raise RuntimeError("auth password not provided. set $SYS_AUTH_PASSWORD")
    pw_hash = hashlib.sha256(pw.encode("utf-8")).hexdigest()
    auth_dir = DOCS / "_auth"
    auth_dir.mkdir(exist_ok=True)
    (auth_dir / "auth.js").write_text(AUTH_JS, encoding="utf-8")
    (auth_dir / "login.html").write_text(
        LOGIN_HTML.replace("__HASH_PLACEHOLDER__", pw_hash), encoding="utf-8"
    )

def inject_guard(html_text):
    """모든 산출물 HTML <head> 직후에 가드 스니펫 삽입."""
    snippet = '<script src="/_auth/auth.js"></script>\n<script>AuthGate.guard();</script>\n'
    return html_text.replace("</head>", snippet + "</head>", 1)


def verify_guard_coverage(docs_dir, excluded=None):
    """build.py 후처리 — 모든 HTML이 가드를 가지는지 검사. 누락 시 RuntimeError."""
    excluded = excluded or {
        "_auth/login.html",
        "_auth/auth.js",
        "manifest.webmanifest",
        "sw.js",
    }
    missing = []
    total = 0
    for p in pathlib.Path(docs_dir).rglob("*.html"):
        rel = p.relative_to(docs_dir).as_posix()
        if rel in excluded:
            continue
        total += 1
        text = p.read_text(encoding="utf-8", errors="ignore")
        if "AuthGate.guard()" not in text:
            missing.append(rel)
    if missing:
        sample = "\n  ".join(missing[:10])
        more = f"\n  ... +{len(missing)-10} more" if len(missing) > 10 else ""
        raise RuntimeError(
            f"auth-gate 가드 주입 누락: {len(missing)}/{total}\n  {sample}{more}"
        )
    print(f"[auth-gate] coverage 100% ({total} files)")
```

### PROJECT.md 설정

```yaml
---
name: 비짓강남
auth:
  mode: password               # password | none | workers
  password_env: VGN_AUTH_PW    # GitHub Actions secret 이름
---
```

GitHub Actions에 secret `VGN_AUTH_PW` 등록 → workflow 실행 시 환경변수로 주입.

---

## Tier-B: Cloudflare Workers Magic Link (선택)

### 아키텍처

```
[클라이언트]                                     [Cloudflare]              [Resend]
    │                                                │                       │
    ├── GET /_auth/login → 이메일 입력 폼 ─────────→ Workers              │
    │                                                │                       │
    ├── POST /_auth/request {email} ────────────────→ Workers              │
    │                                                │ ─ 화이트리스트 검증   │
    │                                                │ ─ 토큰 생성 (JWT-like)│
    │                                                │ ─ KV 저장 (15분 TTL)  │
    │                                                │ ─ 이메일 전송 ───────→│
    │                                                │                       │
    │←── "메일 확인하세요" ─────────────────────────┤                       │
    │                                                                        │
    │                  [이메일 클릭]                                          │
    │                                                                        │
    ├── GET /_auth/verify?t=xxx ────────────────────→ Workers              │
    │                                                │ ─ KV에서 토큰 검증    │
    │                                                │ ─ 세션 쿠키 발급      │
    │←── 302 / + Set-Cookie ─────────────────────────┤                       │
    │                                                                        │
    ├── GET /any-page ──────────────────────────────→ Workers              │
    │                                                │ ─ 쿠키 검증           │
    │                                                │ ─ Pages 프록시        │
    │←── 산출물 HTML ────────────────────────────────┤                       │
```

### Workers 코드 (`workers/auth.js`)

```javascript
import { Resend } from 'resend';  // 또는 raw fetch
const PAGES_ORIGIN = 'https://<user>.github.io/<repo>';
const SESSION_TTL = 30 * 24 * 60 * 60;  // 30일

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/_auth/login') return loginPage();
    if (url.pathname === '/_auth/request') return requestLink(req, env);
    if (url.pathname === '/_auth/verify') return verifyLink(url, env);
    if (url.pathname === '/_auth/logout') return logout();
    return checkSessionAndProxy(req, env);
  }
};

async function requestLink(req, env) {
  const { email } = await req.json();
  if (!isWhitelisted(email, env.WHITELIST)) {
    return new Response('Forbidden', { status: 403 });
  }
  const token = crypto.randomUUID();
  await env.AUTH_KV.put(`token:${token}`, email, { expirationTtl: 900 });
  const link = `${PAGES_ORIGIN.replace('github.io', 'workers.dev')}/_auth/verify?t=${token}`;
  await sendEmail(email, link, env.RESEND_KEY);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' }
  });
}

async function verifyLink(url, env) {
  const token = url.searchParams.get('t');
  const email = await env.AUTH_KV.get(`token:${token}`);
  if (!email) return new Response('Expired', { status: 401 });
  await env.AUTH_KV.delete(`token:${token}`);
  const session = await signSession(email, env.SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      'location': '/',
      'set-cookie': `sys_auth=${session}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}; Path=/`
    }
  });
}

async function checkSessionAndProxy(req, env) {
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.match(/sys_auth=([^;]+)/)?.[1];
  if (!session || !(await verifySession(session, env.SESSION_SECRET))) {
    return Response.redirect(new URL('/_auth/login', req.url), 302);
  }
  const upstream = new URL(req.url);
  upstream.host = new URL(PAGES_ORIGIN).host;
  return fetch(upstream.toString(), req);
}

function isWhitelisted(email, whitelist) {
  return whitelist.split(',').map(s => s.trim()).includes(email.toLowerCase());
}
```

### KV + Secrets 설정

```bash
wrangler kv:namespace create AUTH_KV
wrangler secret put RESEND_KEY
wrangler secret put SESSION_SECRET
wrangler secret put WHITELIST  # "client-a@x.com,designer-b@y.com"
wrangler deploy
```

### Resend 이메일 (외부 의존 1개)

```javascript
async function sendEmail(to, link, apiKey) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to, subject: '[SYS_v4] 접근 링크',
      html: `<p>아래 링크로 접속하세요 (15분 유효):</p><p><a href="${link}">${link}</a></p>`
    })
  });
}
```

> Resend 무료 100통/일. 충분 (클라이언트 5명 × 30일 세션 = 거의 안 씀).

---

## 모드 선택 가이드

| 상황 | 권장 모드 |
|------|----------|
| 클라이언트 1명, 산출물 일반 공개 가능 | `none` (Tier 미사용) |
| 클라이언트 1~3명, 약식 보호 충분 | **Tier-A** (기본) |
| 외부 게스트 다수, 접근 추적 필요 | Tier-B |
| PII/계약/금액 포함, 감사 로그 필수 | Tier-B + 별도 감사 로그 |

---

## Self-Check

| # | 검증 항목 | 판정 기준 |
|---|----------|----------|
| 1 | mode 설정 | PROJECT.md의 `auth.mode` ∈ {none/password/workers} |
| 2 | 가드 주입 | `mode != none` 시 모든 산출물 HTML에 `AuthGate.guard()` 호출 |
| 3 | 패스워드 노출 0 | docs/ 어디에도 평문 비밀번호 미포함 (해시만) |
| 4 | 예외 페이지 | `_auth/login.html`, `_auth/auth.js`, `manifest.webmanifest`, `sw.js` 가드 미적용 |
| 5 | 세션 TTL | Tier-A 7일 / Tier-B 30일 (수정 시 명시) |
| 6 | secret 노출 0 | 코드/커밋에 password/RESEND_KEY/SESSION_SECRET 없음 (env/secret 사용) |
| 7 | 가드 주입률 100% | `verify_guard_coverage(docs_dir)` RuntimeError 미발생 — 빌드 중 자동 검증 |
| 8 | 만료 D-1 알림 | `AuthGate.WARN_BEFORE` 정의 + `showExpiryBanner()` 구현 |
| 9 | 로그아웃 UI | `injectControlBar()` 가 우하단 발급시각/남은일수/로그아웃 버튼 표시 |
| 10 | `?reauth=1` 강제 재인증 | 쿼리 파라미터 인식 → `logout()` 호출 |
| 11 | 다중 기기 안내 | login.html 하단에 "기기·브라우저별 적용" 1줄 명시 |

---

## 응답 제약

| # | 제약 | 사유 |
|---|------|------|
| 1 | 평문 비밀번호 코드 하드코딩 금지 | secret 누출 |
| 2 | 사용자 미확인 화이트리스트 변경 금지 | 접근 권한 임의 부여 방지 |
| 3 | Tier-B를 "안전" 판정 후 PII 산출물 게재 시 별도 감사 로그 미설치 금지 | 추적 불가 |
| 4 | Tier-A로 결제/계약 산출물 보호 금지 | 보안 등급 부족 (Tier-B 이상 필수) |

## CHANGELOG

| 일자 | 변경 |
|---|---|
| 2026-05-15 | Tier-A 즉시 패치 (Phase 3-A): 만료 D-1 알림 / 발급시각 표시 / 로그아웃 버튼 / `?reauth=1` 강제 재인증 / 다중 기기 안내. build.py에 `verify_guard_coverage()` 추가. Self-Check #7~#11 신설. |

## 흔한 AI 실수 (Anti-Patterns)

- ❌ **Tier-A를 결제/계약/PII 보호에 사용**: 클라이언트사이드 패스워드는 정보유출 방지 불가. PII = Tier-B 의무 (Magic Link 인증).
- ❌ **password 평문 저장**: 빌드 산출물에 평문 password 노출 → HTML 소스 보기로 우회. SHA-256 hash + salt 의무.
- ❌ **화이트리스트 사용자 미확인 추가**: "테스트 계정"이라며 임의 추가 → 후속 권한 회수 누락. 사용자 명시 동의 의무.
- ❌ **magic link 만료 시간 미설정**: Tier-B에서 만료 없는 토큰 → 1회용 보장 실패. 15분 기본값 + max 1시간.
- ❌ **Cloudflare Worker 환경변수 미보호**: Resend API key를 코드에 하드코딩 → 리포 공개 시 유출. wrangler secret 사용 의무.
- ❌ **Tier 선택을 산출물 종류 무관 일률 적용**: 모든 프로젝트를 Tier-A로 처리 → 보안 등급 불일치. visibility + PII 여부로 Tier 자동 결정.
