// 페이지 클론 — puppeteer로 URL을 방문해 HTML 스냅샷 수집
// 렌더된 HTML 본문 + 스타일 정리 버전을 반환. 워커가 reference로 주입.

const dns = require('dns').promises;
const net = require('net');

let _puppeteer = null;
function getPuppeteer() {
  if (!_puppeteer) {
    try { _puppeteer = require('puppeteer'); }
    catch (err) { throw new Error('puppeteer 미설치: ' + err.message); }
  }
  return _puppeteer;
}

// Critical #3: SSRF 차단 — private/loopback/link-local/metadata 주소 거부
//   IPv4: 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10(CGNAT)
//   IPv6: ::1, fc00::/7, fe80::/10, ::ffff:0:0/96 (IPv4-mapped 도 IPv4 규칙으로 재검사)
//   호스트명 → DNS 해석 후 모든 응답 IP 가 public 인지 확인 (DNS rebinding 부분 완화)
function _isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(n => parseInt(n, 10));
    if (p.some(n => isNaN(n) || n < 0 || n > 255)) return true;
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;        // link-local / AWS metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] === 0) return true;
    if (p[0] >= 224) return true;                          // multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
    // IPv4-mapped (::ffff:a.b.c.d) → IPv4 규칙 재적용
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return _isPrivateIp(mapped[1]);
    return false;
  }
  return true; // 알 수 없는 형식은 거부
}

async function _assertPublicHost(hostname) {
  // 호스트가 이미 IP literal 이면 즉시 검사
  if (net.isIP(hostname)) {
    if (_isPrivateIp(hostname)) throw new Error(`사설/내부 IP 접근 차단: ${hostname}`);
    return;
  }
  // 호스트명 → 모든 A/AAAA 레코드 확인 (하나라도 사설이면 거부)
  let records = [];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new Error(`DNS 해석 실패: ${err.message}`);
  }
  for (const r of records) {
    if (_isPrivateIp(r.address)) {
      throw new Error(`호스트 ${hostname} 가 사설 IP(${r.address}) 로 해석됨 — 차단`);
    }
  }
}

// URL → 렌더된 HTML + 메타 (최대 크기 제한)
async function cloneUrl(url, { maxBytes = 60 * 1024, timeout = 20000 } = {}) {
  if (!/^https?:\/\//.test(url)) {
    return { ok: false, error: 'URL은 http(s)로 시작해야 합니다' };
  }
  // SSRF 1차 가드 — 호스트명 추출 후 사설 IP 거부
  let parsed;
  try { parsed = new URL(url); }
  catch (err) { return { ok: false, error: `유효하지 않은 URL: ${err.message}` }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: `허용되지 않은 프로토콜: ${parsed.protocol}` };
  }
  // 비표준 포트 차단 (관리자 콘솔/내부 서비스 노출 방지) — 표준 80/443/8080/8443 만 허용
  const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
  if (!ALLOWED_PORTS.has(parsed.port)) {
    return { ok: false, error: `허용되지 않은 포트: ${parsed.port}` };
  }
  try {
    await _assertPublicHost(parsed.hostname);
  } catch (err) {
    return { ok: false, error: err.message };
  }
  const puppeteer = getPuppeteer();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // SSRF 2차 가드 — 리다이렉트/navigation 중 사설 IP 로 가는 요청은 abort
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try {
        const rUrl = new URL(req.url());
        if (!['http:', 'https:'].includes(rUrl.protocol)) return req.abort();
        const host = rUrl.hostname;
        if (net.isIP(host) && _isPrivateIp(host)) return req.abort();
        req.continue();
      } catch { req.abort(); }
    });

    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout });
    const status = response ? response.status() : 0;
    const title = await page.title();

    // 렌더 후 HTML 수집
    let html = await page.content();
    // 불필요한 스크립트/스타일 제거 (용량 감소)
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // 크기 제한
    let truncated = false;
    if (html.length > maxBytes) {
      html = html.slice(0, maxBytes) + '\n<!-- [TRUNCATED] -->';
      truncated = true;
    }

    await browser.close();
    return { ok: true, url, status, title, html, bytes: html.length, truncated };
  } catch (err) {
    if (browser) { try { await browser.close(); } catch {} }
    return { ok: false, error: err.message };
  }
}

module.exports = { cloneUrl };
