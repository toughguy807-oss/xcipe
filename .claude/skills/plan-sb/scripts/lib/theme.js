/**
 * 화면설계서 테마 로더
 *
 * 우선순위: data.theme 오버라이드 > 프리셋 JSON > DEFAULT_THEME
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_THEME = {
  primaryColor: '#3366CC',
  accentColor: '#CC3333',
  neutralColor: '#666666',
  logo: { type: 'none' },
  fonts: { primary: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" },
  frame: { width: 1280, height: 720, borderWidth: 2 },
  wireframe: {
    headerBg: '#e8e8e8',
    navBg: '#f0f0f0',
    elementBg: '#fafafa',
    groupBg: '#fcfcfc',
    placeholderBg: '#e0e0e0',
    borderLight: '#ddd',
    borderMedium: '#ccc',
    borderDark: '#bbb'
  }
};

/**
 * 테마를 로드한다.
 * 1. themes/{preset}.json 프리셋 로드
 * 2. data.theme 필드로 오버라이드
 */
function loadTheme(data) {
  const dataTheme = data.theme || {};
  const presetName = dataTheme.preset || 'default';

  // 프리셋 로드
  const presetPath = path.join(__dirname, '..', 'themes', `${presetName}.json`);
  let preset = {};
  if (fs.existsSync(presetPath)) {
    try {
      preset = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));
    } catch (e) {
      console.warn(`[WARN] 테마 프리셋 파싱 실패: ${presetPath}`);
    }
  } else if (presetName !== 'default') {
    console.warn(`[WARN] 테마 프리셋 미존재: ${presetPath} → default 사용`);
  }

  // 병합: DEFAULT < preset < data.theme
  const merged = {
    ...DEFAULT_THEME,
    ...preset,
    ...dataTheme,
    logo: { ...DEFAULT_THEME.logo, ...(preset.logo || {}), ...(dataTheme.logo || {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(preset.fonts || {}), ...(dataTheme.fonts || {}) },
    frame: { ...DEFAULT_THEME.frame, ...(preset.frame || {}), ...(dataTheme.frame || {}) },
    wireframe: { ...DEFAULT_THEME.wireframe, ...(preset.wireframe || {}), ...(dataTheme.wireframe || {}) }
  };

  return merged;
}

module.exports = { loadTheme, DEFAULT_THEME };
