#!/usr/bin/env node
/**
 * check-images.js — HTML 이미지 무결성 검증
 *
 * 사용법:
 *   node check-images.js <html-파일> [<html-파일>...]
 *   node check-images.js output/publish/*.html
 *   node check-images.js --include-external output/publish/*.html  # 외부 URL HEAD 요청 포함
 *
 * 기능:
 *   - <img src>, <img srcset>, CSS url() (background-image) URL 추출
 *   - 로컬 파일 존재 여부 확인 (필수)
 *   - 외부 URL은 --include-external 플래그 시 HEAD 요청으로 검증
 *   - 결과 JSON(stdout)으로 출력
 *   - 깨진 이미지 1건 이상이면 exit code 1
 *
 * 출처: AX_website CLAUDE.md check_images.js 패턴 (파일 자체완결성 정책 연동)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const args = process.argv.slice(2);
const includeExternal = args.includes("--include-external");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("Usage: node check-images.js <html> [<html>...] [--include-external]");
  process.exit(2);
}

function extractImageUrls(html) {
  const urls = new Set();
  // <img src="...">
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) urls.add(m[1]);
  // <img srcset="a 1x, b 2x">
  for (const m of html.matchAll(/<img[^>]+srcset=["']([^"']+)["']/gi)) {
    for (const entry of m[1].split(",")) {
      const u = entry.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  // background-image: url('...')
  for (const m of html.matchAll(/background(?:-image)?\s*:\s*[^;]*url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    urls.add(m[1]);
  }
  // <source srcset> (picture)
  for (const m of html.matchAll(/<source[^>]+srcset=["']([^"']+)["']/gi)) {
    for (const entry of m[1].split(",")) {
      const u = entry.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  return [...urls].filter(Boolean).filter((u) => !u.startsWith("data:"));
}

function classify(url) {
  if (/^https?:\/\//i.test(url)) return "external";
  if (url.startsWith("//")) return "external";
  return "local";
}

function resolveLocal(url, htmlFile) {
  const baseDir = path.dirname(path.resolve(htmlFile));
  if (url.startsWith("/")) return path.join(baseDir, url.slice(1));
  return path.join(baseDir, url);
}

function headRequest(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request(
        { method: "HEAD", hostname: u.hostname, path: u.pathname + u.search, timeout: 5000 },
        (res) => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 })
      );
      req.on("error", (e) => resolve({ status: 0, ok: false, error: e.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ status: 0, ok: false, error: "timeout" });
      });
      req.end();
    } catch (e) {
      resolve({ status: 0, ok: false, error: e.message });
    }
  });
}

async function main() {
  const report = { files: [], summary: { total: 0, ok: 0, broken: 0, skipped: 0 } };

  for (const file of files) {
    if (!fs.existsSync(file)) {
      report.files.push({ file, error: "HTML file not found", urls: [] });
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    const urls = extractImageUrls(html);
    const results = [];

    for (const url of urls) {
      const kind = classify(url);
      report.summary.total++;

      if (kind === "local") {
        const abs = resolveLocal(url, file);
        const ok = fs.existsSync(abs);
        results.push({ url, kind, ok, resolved: abs, reason: ok ? null : "FILE_NOT_FOUND" });
        if (ok) report.summary.ok++;
        else report.summary.broken++;
      } else if (kind === "external") {
        if (!includeExternal) {
          results.push({ url, kind, ok: null, skipped: true, reason: "external (use --include-external)" });
          report.summary.skipped++;
          continue;
        }
        const { ok, status, error } = await headRequest(url);
        results.push({ url, kind, ok, status, reason: ok ? null : error || `HTTP ${status}` });
        if (ok) report.summary.ok++;
        else report.summary.broken++;
      }
    }

    report.files.push({ file, urls: results });
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.broken > 0 ? 1 : 0);
}

main();
