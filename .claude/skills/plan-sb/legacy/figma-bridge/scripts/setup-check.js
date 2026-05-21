#!/usr/bin/env node
/**
 * setup-check.js — figma-bridge 환경 자가 진단
 *
 * 점검 항목:
 *   1. Node 버전
 *   2. Playwright chromium 설치 여부
 *   3. daemon 포트 가용성 / 실행 상태
 *   4. Figma plugin polling 상태
 *   5. plugin manifest 존재 + 경로 안내
 *
 * 사용법: node setup-check.js
 *        node setup-check.js --json   (CI/슬래시 커맨드용 JSON 출력)
 */
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = join(BRIDGE_ROOT, 'plugin', 'manifest.json');
const DAEMON = process.env.DAEMON_URL || 'http://127.0.0.1:3457';
const wantJson = process.argv.includes('--json');

const checks = [];

function add(name, ok, detail, hint) {
  checks.push({ name, ok, detail, hint });
}

// 1. Node
const nodeVer = process.versions.node;
const major = parseInt(nodeVer.split('.')[0], 10);
add('node-version', major >= 18, `node ${nodeVer}`, major < 18 ? 'Node 18 이상 권장' : null);

// 2. Playwright (chromium 설치 여부)
let pwOk = false, pwDetail = '';
try {
  execSync('npx --yes playwright --version', { stdio: 'pipe' });
  pwOk = true; pwDetail = 'playwright cli 사용 가능';
} catch (_) {
  pwDetail = 'playwright 미설치';
}
add('playwright', pwOk, pwDetail, pwOk ? null : `cd "${BRIDGE_ROOT}" && npm i && npx playwright install chromium`);

// 3. Manifest 존재
const manifestExists = existsSync(MANIFEST_PATH);
add('plugin-manifest', manifestExists, manifestExists ? MANIFEST_PATH : 'manifest.json 없음', manifestExists ? null : 'figma-bridge 패키지 재설치 필요');

// 4 + 5. Daemon + Plugin (비동기)
async function checkDaemon() {
  try {
    const r = await fetch(DAEMON + '/health');
    if (!r.ok) { add('daemon', false, `HTTP ${r.status}`, 'daemon 자동 기동 됩니다 (push-html.js 실행 시)'); add('plugin-polling', false, 'unknown', null); return; }
    const j = await r.json();
    add('daemon', true, `running · mode=${j.mode} · pending=${j.pendingJobs}`, null);
    add('plugin-polling', !!j.pluginAlive, j.pluginAlive ? `polling alive (last seen ${j.pluginLastSeenMsAgo}ms ago)` : 'plugin 미감지', j.pluginAlive ? null : 'Figma 데스크탑 → Plugins → Development → "plan-sb Figma Push" 실행');
  } catch (_) {
    add('daemon', false, '미실행', 'push-html.js 실행 시 자동 기동됩니다');
    add('plugin-polling', false, 'daemon 미실행이라 확인 불가', null);
  }
}

(async () => {
  await checkDaemon();

  if (wantJson) {
    process.stdout.write(JSON.stringify({
      ok: checks.every(c => c.ok),
      checks,
      hints: {
        manifestPath: MANIFEST_PATH,
        importGuide: 'Figma 데스크탑 > Plugins > Development > Import plugin from manifest... → 위 경로 선택',
      },
    }, null, 2));
    return;
  }

  console.log('═══════════════════════════════════════');
  console.log(' figma-bridge 환경 자가 진단');
  console.log('═══════════════════════════════════════');
  for (const c of checks) {
    const tag = c.ok ? '✓' : '✗';
    console.log(` ${tag} ${c.name.padEnd(18)} ${c.detail}`);
    if (c.hint) console.log(`     → ${c.hint}`);
  }
  console.log('───────────────────────────────────────');
  if (!checks.every(c => c.ok)) {
    console.log(' Plugin import (1회성):');
    console.log(`   1. Figma 데스크탑 실행`);
    console.log(`   2. Plugins → Development → Import plugin from manifest...`);
    console.log(`   3. 선택: ${MANIFEST_PATH}`);
    console.log(`   4. Plugins → Development → "plan-sb Figma Push" 클릭하여 띄우기`);
  } else {
    console.log(' 모든 점검 통과 — 바로 push 가능합니다');
  }
  console.log('═══════════════════════════════════════');
})();
