#!/usr/bin/env node
/**
 * design-bench-scrape post-process 어댑터
 * Usage: node post-process.js <artifactPath> <outputDir> <projectInfoJson>
 *
 * urls.txt(### FILE 블록)에서 URL 읽어 curl로 HTML/CSS 수집 → 모던 CSS 기법 자동 감지.
 * 결과: outputDir/scrape/{domain}/ (html, css), outputDir/scrape/findings.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 감지 패턴 — design-bench-scrape SKILL.md의 "감지 대상" 기반
const CSS_MODERN_PATTERNS = {
  ':has()': /:has\s*\(/g,
  'Container Query': /@container\b/g,
  'View Transitions': /view-transition-name|::view-transition/g,
  'Subgrid': /grid-template[^:]*:\s*[^;]*subgrid/g,
  'Anchor Positioning': /anchor-name\s*:|position-anchor\s*:/g,
  'color-mix()': /color-mix\s*\(/g,
  '@layer': /@layer\s+/g,
  'scroll-driven animation': /animation-timeline\s*:|scroll\s*\(\)/g
};

const LAYOUT_PATTERNS = {
  'Bento Grid (grid-template-areas)': /grid-template-areas\s*:/g,
  'Subgrid': /\bsubgrid\b/g,
  'Scroll Snap': /scroll-snap-type|scroll-snap-align/g,
  'Horizontal Scroll': /overflow-x\s*:\s*(auto|scroll)/g,
  'CSS Grid 12-col': /grid-template-columns\s*:\s*repeat\s*\(\s*12/g
};

const MOTION_LIBS = {
  'GSAP': /gsap\.|gsap\.min\.js|TweenMax|TweenLite/gi,
  'Framer Motion': /framer-motion/gi,
  'Lenis (smooth scroll)': /lenis\.min|@studio-freight\/lenis/gi,
  'Lottie': /lottie\.js|lottie-web|bodymovin/gi,
  'Anime.js': /anime\.min\.js|animejs/gi,
  'Three.js': /three\.min\.js|three\.module/gi,
  'Swiper': /swiper[-.]/gi
};

function safeDirName(url) {
  try {
    const u = new URL(url);
    return u.host.replace(/[^a-zA-Z0-9.-]/g, '_');
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40);
  }
}

function fetchText(url, timeoutMs = 20000) {
  try {
    const out = execSync(`curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --max-time ${Math.floor(timeoutMs/1000)} "${url}"`, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: timeoutMs + 5000,
      encoding: 'utf8',
      windowsHide: true
    });
    return out;
  } catch (err) {
    return null;
  }
}

function extractCssLinks(html, baseUrl) {
  const links = [];
  const re = /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[0].match(/href=["']([^"']+)["']/i);
    if (!href) continue;
    try {
      const absUrl = new URL(href[1], baseUrl).toString();
      links.push(absUrl);
    } catch {}
  }
  return links.slice(0, 8); // 최대 8개 CSS 파일
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    scripts.push(m[1]);
  }
  return scripts;
}

function countPatterns(text, patterns) {
  const hits = {};
  for (const [name, re] of Object.entries(patterns)) {
    const matches = text.match(re);
    if (matches && matches.length > 0) hits[name] = matches.length;
  }
  return hits;
}

function analyzeSite(url, siteDir) {
  const report = { url, errors: [], modern_css: {}, layout: {}, motion: {}, fonts: [] };
  fs.mkdirSync(siteDir, { recursive: true });

  const html = fetchText(url);
  if (!html) { report.errors.push('HTML fetch failed'); return report; }
  fs.writeFileSync(path.join(siteDir, 'index.html'), html, 'utf8');

  // 인라인 CSS 분석
  const inlineStyles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
  let cssBlob = inlineStyles;

  // 외부 CSS 수집
  const cssLinks = extractCssLinks(html, url);
  let cssIdx = 0;
  for (const cssUrl of cssLinks) {
    const cssText = fetchText(cssUrl);
    if (!cssText) continue;
    cssBlob += '\n' + cssText;
    fs.writeFileSync(path.join(siteDir, `style-${cssIdx}.css`), cssText, 'utf8');
    cssIdx++;
  }

  // 모션 라이브러리는 script 태그에서
  const scripts = extractScripts(html);
  const scriptBlob = scripts.join('\n') + '\n' + html;

  report.modern_css = countPatterns(cssBlob, CSS_MODERN_PATTERNS);
  report.layout = countPatterns(cssBlob, LAYOUT_PATTERNS);
  report.motion = countPatterns(scriptBlob, MOTION_LIBS);

  // 폰트 스택
  const fontFamilyMatches = cssBlob.match(/font-family\s*:\s*([^;}]+)/gi) || [];
  const fonts = new Set();
  for (const f of fontFamilyMatches.slice(0, 20)) {
    const val = f.split(':')[1].trim().replace(/['"]/g, '');
    val.split(',').forEach(x => { const t = x.trim(); if (t && !t.startsWith('var(')) fonts.add(t); });
  }
  report.fonts = Array.from(fonts).slice(0, 15);
  report.css_files = cssIdx;
  report.script_count = scripts.length;

  return report;
}

function readUrls(outputDir, artifactPath) {
  const candidates = [
    path.join(outputDir, 'BENCH_SCRAPE', 'urls.txt'),
    path.join(outputDir, 'bench_scrape', 'urls.txt'),
    path.join(outputDir, 'urls.txt')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s.startsWith('http'));
    }
  }
  // fallback: artifact md에서 URL 추출
  const content = fs.readFileSync(artifactPath, 'utf8');
  const urls = (content.match(/https?:\/\/[^\s)"'<>]+/g) || []).slice(0, 10);
  return urls;
}

async function main() {
  const artifactPath = process.argv[2];
  const outputDir = process.argv[3];
  if (!artifactPath || !outputDir) { console.error('Usage: node post-process.js <artifactPath> <outputDir>'); process.exit(1); }

  const urls = readUrls(outputDir, artifactPath);
  if (urls.length === 0) {
    console.log('[design-bench-scrape pp] URL 없음. skip.');
    process.exit(0);
  }

  const scrapeDir = path.join(outputDir, 'scrape');
  fs.mkdirSync(scrapeDir, { recursive: true });

  const reports = [];
  for (const url of urls.slice(0, 10)) {
    const dir = path.join(scrapeDir, safeDirName(url));
    console.log(`[design-bench-scrape pp] ${url}`);
    reports.push(analyzeSite(url, dir));
  }

  // findings.md
  const lines = ['# 벤치마크 코드 분석 결과', ''];
  for (const r of reports) {
    lines.push(`## ${r.url}`);
    if (r.errors.length > 0) { lines.push(`- ERROR: ${r.errors.join(', ')}`); continue; }
    lines.push(`- CSS 파일: ${r.css_files}, Script: ${r.script_count}`);
    const modern = Object.entries(r.modern_css);
    if (modern.length) lines.push(`- **모던 CSS**: ${modern.map(([k,v]) => `${k}(${v})`).join(', ')}`);
    const layout = Object.entries(r.layout);
    if (layout.length) lines.push(`- **레이아웃 패턴**: ${layout.map(([k,v]) => `${k}(${v})`).join(', ')}`);
    const motion = Object.entries(r.motion);
    if (motion.length) lines.push(`- **모션 라이브러리**: ${motion.map(([k,v]) => `${k}(${v})`).join(', ')}`);
    if (r.fonts.length) lines.push(`- **폰트 스택**: ${r.fonts.slice(0, 5).join(', ')}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(scrapeDir, 'findings.md'), lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(scrapeDir, 'findings.json'), JSON.stringify(reports, null, 2), 'utf8');

  console.log(`[design-bench-scrape pp] ${reports.length}개 사이트 분석 → scrape/findings.md`);
}

main().catch(err => { console.error('[design-bench-scrape pp] error:', err.message); process.exit(1); });
