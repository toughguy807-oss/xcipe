// 자동 승인 루프 — pipeline의 awaiting_approval step을 approve로 전환하여 풀 파이프라인을 돌림
const PIPELINE_ID = +(process.argv[2] || 11);
const MAX_MIN = +(process.argv[3] || 60);
const START = Date.now();

async function login() {
  const r = await fetch('http://localhost:3747/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@eluo.kr', password: 'admin1234' })
  });
  return (await r.json()).token;
}

async function getPipeline(token) {
  const r = await fetch(`http://localhost:3747/api/pipelines/${PIPELINE_ID}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  return r.json();
}

async function approve(token, sid) {
  const r = await fetch(`http://localhost:3747/api/pipelines/${PIPELINE_ID}/steps/${sid}/approve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  let token = await login();
  let tokenTs = Date.now();
  while (true) {
    const elapsedMin = (Date.now() - START) / 60000;
    if (elapsedMin > MAX_MIN) {
      console.log(`[timeout] ${MAX_MIN}min exceeded. Stop.`);
      break;
    }
    // refresh token every 30min
    if (Date.now() - tokenTs > 30 * 60000) {
      token = await login();
      tokenTs = Date.now();
    }
    try {
      const p = await getPipeline(token);
      if (!p || !p.steps) { console.log('[err] no steps'); await sleep(5000); continue; }
      if (p.status === 'completed') { console.log('[done] pipeline completed'); break; }
      if (p.status === 'failed') { console.log('[fail] pipeline failed'); break; }

      // 가장 앞선 awaiting_approval step 하나를 approve
      const pending = p.steps.find(s => s.status === 'awaiting_approval');
      if (pending) {
        const r = await approve(token, pending.id);
        console.log(`[approve] step ${pending.step_order} (${pending.skill_name}) → ${r.status}`);
      } else {
        const running = p.steps.find(s => s.status === 'running');
        const status = running ? `running step ${running.step_order} (${running.skill_name})` : 'idle';
        const approvedCnt = p.steps.filter(s => s.status === 'approved').length;
        console.log(`[wait] ${status} | approved=${approvedCnt}/${p.total_steps} | ${elapsedMin.toFixed(1)}min`);
      }
    } catch (e) { console.log('[err]', e.message); }
    await sleep(15000);
  }
})();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
