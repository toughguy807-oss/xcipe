// Unit — 키보드 단축키 카탈로그·매핑 일관성 회귀 방지
//
// public/js/shortcuts.js 는 브라우저 IIFE라 require 불가.
// 정적 파싱으로 다음을 검증:
//   1) SHORTCUTS 배열에 등록된 g+키 항목이 핸들러 map과 일치 (누락/탈자 방지)
//   2) Ctrl/Cmd+K, Esc, ? 가 카탈로그에 명시되어 있음
//   3) 모든 라우트 경로가 app.js 라우터에 등록되어 있음
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SHORTCUTS_PATH = path.join(__dirname, '..', '..', 'public', 'js', 'shortcuts.js');
const APP_PATH       = path.join(__dirname, '..', '..', 'public', 'js', 'app.js');

const src    = fs.readFileSync(SHORTCUTS_PATH, 'utf8');
const appSrc = fs.readFileSync(APP_PATH,       'utf8');

test('shortcuts: SHORTCUTS 카탈로그 + g-map 매핑이 일치', () => {
  // SHORTCUTS 카탈로그에서 keys: ['g', 'X'] 형태 추출
  const catRe = /\{\s*keys:\s*\[\s*'g'\s*,\s*'([a-z])'\s*\]\s*,\s*desc:/g;
  const catalogG = new Set();
  let m;
  while ((m = catRe.exec(src)) !== null) catalogG.add(m[1]);

  // 핸들러 map 객체 추출
  const mapBlock = src.match(/const map = \{([\s\S]*?)\};/);
  assert.ok(mapBlock, 'shortcuts.js에서 g-map 객체를 찾지 못함');
  const mapKeyRe = /^\s*([a-z]):\s*'([^']+)'/gm;
  const handlerMap = {};
  while ((m = mapKeyRe.exec(mapBlock[1])) !== null) handlerMap[m[1]] = m[2];

  const handlerKeys = new Set(Object.keys(handlerMap));

  // 카탈로그 ⊆ 핸들러 (카탈로그에만 있고 매핑 없으면 사용자 기만)
  for (const k of catalogG) {
    assert.ok(handlerKeys.has(k), `g+${k} 가 카탈로그에 있으나 핸들러 매핑 누락`);
  }
  // 핸들러 ⊆ 카탈로그 (핸들러에만 있으면 도움말에서 안 보임)
  for (const k of handlerKeys) {
    assert.ok(catalogG.has(k), `g+${k} 가 핸들러에 있으나 카탈로그 누락 — 사용자가 알 수 없음`);
  }
});

test('shortcuts: 필수 진입점(Ctrl/Cmd+K, Esc, ?)이 카탈로그에 명시', () => {
  assert.match(src, /keys:\s*\['Ctrl\/Cmd',\s*'K'\]/, 'Ctrl/Cmd+K 항목 누락');
  assert.match(src, /keys:\s*\['Esc'\]/,              'Esc 항목 누락');
  assert.match(src, /keys:\s*\['\?'\]/,               '? 항목 누락');
});

test('shortcuts: g-map 라우트 경로가 모두 app.js 에 등록', () => {
  const mapBlock = src.match(/const map = \{([\s\S]*?)\};/);
  const mapKeyRe = /^\s*([a-z]):\s*'([^']+)'/gm;
  const paths = [];
  let m;
  while ((m = mapKeyRe.exec(mapBlock[1])) !== null) paths.push(m[2]);

  for (const p of paths) {
    // Router.register('/', ...) 또는 Router.register('/projects', ...) 등
    const re = new RegExp(`Router\\.register\\(\\s*['"\`]${p}['"\`]`);
    assert.match(appSrc, re, `g-map 경로 '${p}' 가 app.js Router.register 에 없음`);
  }
});

test('shortcuts: Ctrl+K 핸들러가 검색 페이지로 이동 + 포커스', () => {
  // navigateAndFocusSearch 함수가 '/search' 로 이동하고 #sq 를 포커스
  const fn = src.match(/function navigateAndFocusSearch\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(fn, 'navigateAndFocusSearch 함수 누락');
  assert.match(fn[1], /Router\.navigate\(['"`]\/search['"`]\)/, '/search 로 navigate 호출 없음');
  assert.match(fn[1], /getElementById\(['"`]sq['"`]\)/,       '#sq (검색 입력) 포커스 누락');
});

test('shortcuts: 입력창에 포커스 있을 때 단일 키 무시 (isTypingTarget)', () => {
  // input/textarea/select/contenteditable 4종이 모두 분기에 포함
  const fn = src.match(/function isTypingTarget\(el\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(fn, 'isTypingTarget 함수 누락');
  const body = fn[1];
  assert.match(body, /'input'/);
  assert.match(body, /'textarea'/);
  assert.match(body, /'select'/);
  assert.match(body, /isContentEditable/);
});
