// Settings (IA-P007, FN-033, FN-035, FN-041)
const SettingsPage = {
  async render() {
    // adminGuard에서 이미 권한 검증 완료. 여기서는 AdminShell 사용만.
    AdminShell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">설정</div>
          <div class="page-subtitle">AI 연결 · 시스템 · 사용자 관리</div>
        </div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-3">AI 연결</h3>
        <div class="text-muted text-sm mb-3">프로젝트 파이프라인이 어떤 AI를 사용할지 선택합니다.</div>
        <div id="ai-settings">로딩 중...</div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-3">외부 알림 (슬랙 / 이메일)</h3>
        <div class="text-muted text-sm mb-3">
          HITL 게이트 도달, 파이프라인 완료/실패 시 외부 채널로 푸시합니다. 슬랙 webhook은 URL만, 이메일은 SMTP URL과 수신/발신 주소가 모두 필요합니다.
          <br>· SMTP URL 예: <code>smtps://user:pass@smtp.gmail.com:465</code> (이메일 사용 시 <code>nodemailer</code> npm 설치 필요)
        </div>
        <div id="notify-settings">로딩 중...</div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-3">비용 한도 알림</h3>
        <div class="text-muted text-sm mb-3">
          API 비용이 한도에 가까워지거나 초과 시 admin에게 알림을 발송합니다 (24시간 디바운스).
          <br>· 0으로 두면 한도 비활성화 (모니터링만 진행)
        </div>
        <div id="cost-limits-settings">로딩 중...</div>
      </div>

      <div class="card mb-4">
        <div class="flex-between mb-3">
          <h3 style="margin:0">RAG 코퍼스 (~/.claude 자산 검색)</h3>
          <button class="btn-primary-sm" id="rag-reindex">재색인</button>
        </div>
        <div class="text-muted text-sm mb-3">
          <code>~/.claude</code>의 skills · lib/rules · ref · agents · AGENTS.md / SKILLS_CATALOG.md를 sqlite-fts5로 색인합니다.
          BM25 점수로 검색 가능 — <code>GET /api/rag/search?q=...</code>
        </div>
        <div id="rag-stats">로딩 중...</div>
        <div id="rag-search-box" class="mt-3">
          <div class="flex" style="gap:.5rem">
            <input type="text" id="rag-q" placeholder="검색어 (예: figma fidelity)" style="flex:1">
            <select id="rag-source">
              <option value="">전체</option>
              <option value="skill">skill</option>
              <option value="rule">rule</option>
              <option value="ref">ref</option>
              <option value="agent">agent</option>
              <option value="catalog">catalog</option>
            </select>
            <button class="btn-secondary-sm" id="rag-search-btn">검색</button>
          </div>
          <div id="rag-results" class="mt-2"></div>
        </div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-3">자동 검수 게이트 임계값 (reviewer)</h3>
        <div class="text-muted text-sm mb-3">
          각 단계 산출물을 0~100점으로 채점한 후 점수에 따라 자동/HITL 분기를 결정합니다.
          <br>· <strong>재시도 미만</strong>: 자동 재생성 트리거 · <strong>필수 미만</strong>: HITL 승인 필수 · <strong>권고 미만</strong>: HITL 권고(자동 진행)
        </div>
        <div id="reviewer-settings">로딩 중...</div>
      </div>

      <div class="card mb-4">
        <h3 class="mb-3">🎨 Figma 토큰 (디자인 시스템 양방향 sync)</h3>
        <div class="text-muted text-sm mb-3">
          Figma personal access token. <a href="https://www.figma.com/settings" target="_blank">figma.com/settings</a>의 "Personal access tokens" 섹션에서 발급. <code>figd_</code>로 시작합니다.
          <br>env <code>FIGMA_PERSONAL_ACCESS_TOKEN</code>이 설정되어 있으면 우선합니다. DB 값은 운영 환경 대비용.
        </div>
        <div id="figma-settings">로딩 중...</div>
      </div>

      <div class="card mb-4">
        <div class="flex-between mb-3">
          <h3 style="margin:0">DB 백업</h3>
          <button class="btn-primary-sm" id="bk-run">지금 백업</button>
        </div>
        <div class="text-muted text-sm mb-3">
          SQLite Online Backup API로 안전 스냅샷을 생성합니다 (실행 중 트랜잭션 차단 없음). gzip 압축 후 <code>backups/</code>에 저장되며 30개를 초과하면 가장 오래된 파일이 삭제됩니다.
        </div>
        <div id="bk-alert" class="mb-2"></div>
        <div id="bk-list">로딩 중...</div>
      </div>

    `, 'admin-settings');

    // AI 설정 로드
    SettingsPage.loadAiSettings();
    SettingsPage.loadReviewerSettings();
    SettingsPage.loadFigmaSettings();
    SettingsPage.loadCostLimitSettings();
    SettingsPage.loadNotifySettings();
    SettingsPage.loadRagStats();
    SettingsPage.loadBackupList();
    document.getElementById('bk-run').addEventListener('click', () => SettingsPage.runBackup());
    document.getElementById('rag-reindex').addEventListener('click', () => SettingsPage.runRagReindex());
    document.getElementById('rag-search-btn').addEventListener('click', () => SettingsPage.runRagSearch());
    document.getElementById('rag-q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') SettingsPage.runRagSearch();
    });

  },

  async loadRagStats() {
    const el = document.getElementById('rag-stats');
    if (!el) return;
    try {
      const s = await API.get('/rag/stats');
      const sources = s.sources || {};
      el.innerHTML = `
        <div class="grid grid-3 text-sm">
          <div><strong>총 문서</strong> <span class="badge">${s.total || 0}</span></div>
          <div><strong>경로</strong> <code class="text-muted">${escapeHtml(s.home || '')}</code></div>
          <div></div>
          <div>skill <span class="badge">${sources.skill || 0}</span></div>
          <div>rule <span class="badge">${sources.rule || 0}</span></div>
          <div>ref <span class="badge">${sources.ref || 0}</span></div>
          <div>agent <span class="badge">${sources.agent || 0}</span></div>
          <div>catalog <span class="badge">${sources.catalog || 0}</span></div>
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)} — FTS5 미지원이거나 색인 미완료</div>`;
    }
  },

  async runRagReindex() {
    const btn = document.getElementById('rag-reindex');
    if (btn) btn.disabled = true;
    const el = document.getElementById('rag-stats');
    el.innerHTML = '<div class="text-muted text-sm">재색인 중...</div>';
    try {
      const r = await API.post('/rag/reindex', {});
      el.innerHTML = `<div class="alert alert-success">재색인 완료 — ${r.total}건 (${r.ms}ms)</div>`;
      setTimeout(() => SettingsPage.loadRagStats(), 800);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async runRagSearch() {
    const q = (document.getElementById('rag-q').value || '').trim();
    const source = document.getElementById('rag-source').value || '';
    const out = document.getElementById('rag-results');
    if (!q) { out.innerHTML = ''; return; }
    out.innerHTML = '<div class="text-muted text-sm">검색 중...</div>';
    try {
      const params = new URLSearchParams({ q, limit: '8' });
      if (source) params.set('source', source);
      const r = await API.get(`/rag/search?${params}`);
      if (!r.results || !r.results.length) {
        out.innerHTML = '<div class="empty-state-mini">결과 없음</div>';
        return;
      }
      const safeSnippet = (s) => escapeHtml(s || '')
        .replace(/&lt;mark&gt;/g, '<mark>')
        .replace(/&lt;\/mark&gt;/g, '</mark>');
      out.innerHTML = r.results.map(row => `
        <div class="rag-hit" style="padding:.5rem 0;border-bottom:1px solid var(--border)">
          <div class="flex-between">
            <div><span class="badge">${escapeHtml(row.source)}</span> <strong>${escapeHtml(row.name)}</strong></div>
            <div class="text-muted text-sm">score ${(row.score || 0).toFixed(2)}</div>
          </div>
          <div class="text-muted text-sm">${safeSnippet(row.snippet)}</div>
          <div class="text-muted text-xs"><code>${escapeHtml(row.path || '')}</code></div>
        </div>
      `).join('');
    } catch (err) {
      out.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  async loadBackupList() {
    const el = document.getElementById('bk-list');
    if (!el) return;
    try {
      const { files } = await API.get('/admin/settings/backup/list');
      if (files.length === 0) {
        el.innerHTML = '<div class="empty-state-mini">아직 백업이 없습니다 — 위 "지금 백업"을 눌러 첫 백업을 생성하세요.</div>';
        return;
      }
      el.innerHTML = `
        <table class="table-mini">
          <thead><tr><th>파일</th><th>크기</th><th>시각</th></tr></thead>
          <tbody>${files.map(f => `
            <tr>
              <td><code>${escapeHtml(f.name)}</code></td>
              <td>${f.size_mb} MB</td>
              <td class="text-muted text-sm">${formatRelative(f.mtime)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      `;
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  async runBackup() {
    const btn = document.getElementById('bk-run');
    const alert = document.getElementById('bk-alert');
    if (btn) btn.disabled = true;
    if (alert) alert.innerHTML = '<div class="alert" style="background:var(--warn-bg);color:var(--warn-fg);border:1px solid var(--warn-border)">백업 중...</div>';
    try {
      const r = await API.post('/admin/settings/backup', {});
      alert.innerHTML = `<div class="alert alert-success">백업 완료 — ${escapeHtml(r.file)} (${r.size_mb} MB, ${r.duration_ms}ms)</div>`;
      SettingsPage.loadBackupList();
    } catch (err) {
      alert.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async loadCostLimitSettings() {
    const el = document.getElementById('cost-limits-settings');
    if (!el) return;
    try {
      const cfg = await API.get('/admin/settings/cost-limits');
      el.innerHTML = `
        <div class="grid grid-3">
          <div class="form-group">
            <label>일 한도 (USD)</label>
            <input type="number" id="cl-daily" min="0" step="0.01" value="${cfg.daily_usd}">
            <div class="text-muted text-sm">예: 10 = $10/일. 0이면 미적용</div>
          </div>
          <div class="form-group">
            <label>월 한도 (USD)</label>
            <input type="number" id="cl-monthly" min="0" step="1" value="${cfg.monthly_usd}">
            <div class="text-muted text-sm">예: 200 = $200/월. 0이면 미적용</div>
          </div>
          <div class="form-group">
            <label>경고 임계 (%)</label>
            <input type="number" id="cl-pct" min="1" max="100" step="1" value="${cfg.alert_at_pct}">
            <div class="text-muted text-sm">기본 80. 한도의 N% 도달 시 사전 경고</div>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-primary-sm" id="cl-save">저장</button>
          <button class="btn" id="cl-reset">기본값 복원</button>
        </div>
        <div id="cl-alert" class="mt-2"></div>
      `;
      const save = async (vals) => {
        try {
          await API.put('/admin/settings/cost-limits', vals);
          document.getElementById('cl-alert').innerHTML = '<div class="alert alert-success">저장됨.</div>';
        } catch (err) {
          document.getElementById('cl-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      };
      document.getElementById('cl-save').addEventListener('click', () => {
        save({
          daily_usd: parseFloat(document.getElementById('cl-daily').value) || 0,
          monthly_usd: parseFloat(document.getElementById('cl-monthly').value) || 0,
          alert_at_pct: parseFloat(document.getElementById('cl-pct').value) || 80
        });
      });
      document.getElementById('cl-reset').addEventListener('click', () => {
        document.getElementById('cl-daily').value = 0;
        document.getElementById('cl-monthly').value = 0;
        document.getElementById('cl-pct').value = 80;
        save({ daily_usd: 0, monthly_usd: 0, alert_at_pct: 80 });
      });
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  async loadReviewerSettings() {
    const el = document.getElementById('reviewer-settings');
    if (!el) return;
    try {
      const cfg = await API.get('/admin/settings/reviewer');
      el.innerHTML = `
        <div class="grid grid-3">
          <div class="form-group">
            <label>재시도 미만 (자동 재생성)</label>
            <input type="number" id="rv-retry" min="0" max="100" value="${cfg.retry}">
            <div class="text-muted text-sm">기본 60. 이 점수 미만이면 자동 재생성</div>
          </div>
          <div class="form-group">
            <label>HITL 필수 미만</label>
            <input type="number" id="rv-required" min="0" max="100" value="${cfg.required}">
            <div class="text-muted text-sm">기본 70. 이 점수 미만이면 사용자 승인 대기</div>
          </div>
          <div class="form-group">
            <label>HITL 권고 미만</label>
            <input type="number" id="rv-recommended" min="0" max="100" value="${cfg.recommended}">
            <div class="text-muted text-sm">기본 90. 이 점수 미만이면 권고 배지(자동 진행)</div>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-primary-sm" id="rv-save">저장</button>
          <button class="btn" id="rv-reset">기본값 복원</button>
        </div>
        <div id="rv-alert" class="mt-2"></div>
      `;
      const save = async (vals) => {
        try {
          await API.put('/admin/settings/reviewer', vals);
          document.getElementById('rv-alert').innerHTML = '<div class="alert alert-success">저장됨. 다음 단계부터 적용됩니다.</div>';
        } catch (err) {
          document.getElementById('rv-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      };
      document.getElementById('rv-save').addEventListener('click', () => {
        save({
          retry: parseInt(document.getElementById('rv-retry').value, 10),
          required: parseInt(document.getElementById('rv-required').value, 10),
          recommended: parseInt(document.getElementById('rv-recommended').value, 10)
        });
      });
      document.getElementById('rv-reset').addEventListener('click', () => {
        document.getElementById('rv-retry').value = 60;
        document.getElementById('rv-required').value = 70;
        document.getElementById('rv-recommended').value = 90;
        save({ retry: 60, required: 70, recommended: 90 });
      });
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  // Figma 토큰 카드 — env 우선순위 표시 + DB 입력 + 즉시 검증
  async loadFigmaSettings() {
    const el = document.getElementById('figma-settings');
    if (!el) return;
    try {
      const cfg = await API.get('/admin/settings/figma');
      const envBadge = cfg.env_source
        ? `<span class="badge badge-success">env: ${escapeHtml(cfg.env_source)}</span> <code>${escapeHtml(cfg.env_token || '')}</code>`
        : `<span class="badge badge-muted">env 미설정</span>`;
      const dbBadge = cfg.db_token
        ? `<code>${escapeHtml(cfg.db_token)}</code>`
        : `<span class="text-muted">미설정</span>`;
      const effBadge = cfg.effective_source
        ? `<span class="badge badge-success">${escapeHtml(cfg.effective_source.toUpperCase())}</span>`
        : `<span class="badge badge-danger">없음</span>`;
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:auto 1fr;gap:.5rem .8rem;font-size:.88rem;margin-bottom:.8rem">
          <div class="text-muted">현재 사용 중</div>
          <div>${effBadge}</div>
          <div class="text-muted">환경변수</div>
          <div>${envBadge}</div>
          <div class="text-muted">DB 값</div>
          <div>${dbBadge}</div>
        </div>
        <div class="text-sm text-muted mb-2">${escapeHtml(cfg.hint || '')}</div>
        <div class="form-group">
          <label>새 토큰 (DB 저장)</label>
          <input type="password" id="fg-token" placeholder="figd_..." autocomplete="off">
          <div class="text-muted text-sm">빈 값으로 저장 시 DB에서 제거</div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-primary-sm" id="fg-save">DB에 저장</button>
          <button class="btn" id="fg-test">현재 토큰 검증 (Figma /v1/me 호출)</button>
        </div>
        <div id="fg-alert" class="mt-2"></div>
      `;
      document.getElementById('fg-save').addEventListener('click', async () => {
        const val = document.getElementById('fg-token').value.trim();
        try {
          await API.put('/admin/settings/figma', { figma_access_token: val });
          document.getElementById('fg-alert').innerHTML = '<div class="alert alert-success">저장됨</div>';
          setTimeout(() => SettingsPage.loadFigmaSettings(), 600);
        } catch (err) {
          document.getElementById('fg-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
      document.getElementById('fg-test').addEventListener('click', async () => {
        document.getElementById('fg-alert').innerHTML = '<div class="text-muted">테스트 중...</div>';
        try {
          const r = await API.post('/admin/settings/figma/test', {});
          if (r.ok) {
            document.getElementById('fg-alert').innerHTML = `<div class="alert alert-success">✓ 인증 OK — ${escapeHtml(r.email || '')} (${escapeHtml(r.handle || '')})</div>`;
          } else {
            document.getElementById('fg-alert').innerHTML = `<div class="alert alert-error">✗ ${escapeHtml(r.error || '실패')}</div>`;
          }
        } catch (err) {
          document.getElementById('fg-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  // U-G10: 외부 알림 카드 — slack/email + 이벤트 토글 + 테스트 발송
  async loadNotifySettings() {
    const el = document.getElementById('notify-settings');
    if (!el) return;
    try {
      const cfg = await API.get('/admin/settings/notify');
      el.innerHTML = `
        <div class="form-group">
          <label>슬랙 Incoming Webhook URL</label>
          <input type="text" id="nt-slack" placeholder="https://hooks.slack.com/services/..." value="${escapeHtml(cfg.slack_webhook_url)}">
          <div class="text-muted text-sm">빈값이면 슬랙 비활성. 채널은 webhook 생성 시 지정한 채널로 발송됩니다.</div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>SMTP URL (이메일 발송용)</label>
            <input type="text" id="nt-smtp" placeholder="smtps://user:pass@host:465" value="${escapeHtml(cfg.smtp_url)}">
          </div>
          <div class="form-group">
            <label>발신 주소 (From)</label>
            <input type="text" id="nt-from" placeholder="noreply@example.com" value="${escapeHtml(cfg.email_from)}">
          </div>
        </div>
        <div class="form-group">
          <label>수신 주소 (To, 콤마 구분)</label>
          <input type="text" id="nt-to" placeholder="alice@example.com, bob@example.com" value="${escapeHtml(cfg.email_to)}">
        </div>
        <div class="form-group">
          <label>발송 이벤트</label>
          <label class="text-sm" style="display:block"><input type="checkbox" id="nt-hitl" ${cfg.on_hitl ? 'checked' : ''}> HITL 게이트 도달 시 (검토 권고/필수)</label>
          <label class="text-sm" style="display:block"><input type="checkbox" id="nt-done" ${cfg.on_pipeline_done ? 'checked' : ''}> 파이프라인 완료 시</label>
          <label class="text-sm" style="display:block"><input type="checkbox" id="nt-failed" ${cfg.on_pipeline_failed ? 'checked' : ''}> 파이프라인 실패 시</label>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-primary-sm" id="nt-save">저장</button>
          <button class="btn" id="nt-test">테스트 발송</button>
        </div>
        <div id="nt-alert" class="mt-2"></div>
      `;
      document.getElementById('nt-save').addEventListener('click', async () => {
        const body = {
          slack_webhook_url: document.getElementById('nt-slack').value,
          smtp_url: document.getElementById('nt-smtp').value,
          email_from: document.getElementById('nt-from').value,
          email_to: document.getElementById('nt-to').value,
          on_hitl: document.getElementById('nt-hitl').checked,
          on_pipeline_done: document.getElementById('nt-done').checked,
          on_pipeline_failed: document.getElementById('nt-failed').checked
        };
        try {
          await API.put('/admin/settings/notify', body);
          document.getElementById('nt-alert').innerHTML = '<div class="alert alert-success">저장됨</div>';
        } catch (err) {
          document.getElementById('nt-alert').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
      document.getElementById('nt-test').addEventListener('click', async () => {
        const alert = document.getElementById('nt-alert');
        alert.innerHTML = '<div class="alert" style="background:var(--warn-bg)">테스트 발송 중...</div>';
        try {
          const r = await API.post('/admin/settings/notify/test', {});
          const slackTxt = r.slack && r.slack.ok ? '슬랙 ✓' : (r.slack && r.slack.skipped ? `슬랙 ${r.slack.skipped}` : `슬랙 ✗ ${escapeHtml(r.slack && r.slack.error || '')}`);
          const emailTxt = r.email && r.email.ok ? '이메일 ✓' : (r.email && r.email.skipped ? `이메일 ${r.email.skipped}` : `이메일 ✗ ${escapeHtml(r.email && r.email.error || '')}`);
          alert.innerHTML = `<div class="alert alert-success">${slackTxt} · ${emailTxt}</div>`;
        } catch (err) {
          alert.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  async loadAiSettings() {
    const el = document.getElementById('ai-settings');
    try {
      const cfg = await API.get('/admin/settings/ai');

      const providers = [
        { id: 'mock', label: '테스트 (Mock)', desc: '더미 응답, 비용 0, UI 확인용' },
        { id: 'claude-code', label: '내 컴퓨터 Claude Code', desc: '로컬 Claude Code 사용. 비용 0, 본인만' },
        { id: 'claude-api', label: 'Claude 공식 서비스 (API)', desc: 'Anthropic API 키 필요. 팀용/프로덕션 (※ 키 미수급 시 claude-code 권장)' }
      ];

      el.innerHTML = `
        <div class="form-group">
          <label>연결 방식</label>
          ${providers.map(p => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;cursor:pointer;${cfg.provider === p.id ? 'border-color:var(--primary);background:var(--success-bg)' : ''}" data-provider="${p.id}">
              <input type="radio" name="provider" value="${p.id}" ${cfg.provider === p.id ? 'checked' : ''} style="margin-top:3px;width:auto">
              <div>
                <strong>${p.label}</strong>
                <div class="text-muted text-sm">${p.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div id="claude-api-config" style="display:${cfg.provider === 'claude-api' ? 'block' : 'none'}" class="mt-3">
          <div class="form-group">
            <label>Anthropic API 키</label>
            <input type="password" id="api-key" placeholder="${cfg.has_api_key ? '(저장됨 — 변경하려면 입력)' : 'sk-ant-...'}">
          </div>
          <div class="form-group">
            <label>모델</label>
            <select id="api-model">
              <option value="claude-opus-4-7" ${cfg.model === 'claude-opus-4-7' ? 'selected' : ''}>claude-opus-4-7 (Opus 4.7 GA · 권장)</option>
              <option value="claude-sonnet-4-6" ${cfg.model === 'claude-sonnet-4-6' ? 'selected' : ''}>claude-sonnet-4-6 (Sonnet 4.6)</option>
              <option value="claude-haiku-4-5-20251001" ${cfg.model === 'claude-haiku-4-5-20251001' ? 'selected' : ''}>claude-haiku-4-5 (Haiku 4.5)</option>
              ${cfg.model && !['claude-opus-4-7','claude-sonnet-4-6','claude-haiku-4-5-20251001'].includes(cfg.model) ? `<option value="${escapeHtml(cfg.model)}" selected>${escapeHtml(cfg.model)} (legacy)</option>` : ''}
            </select>
          </div>
        </div>

        <div class="flex gap-2 mt-3">
          <button class="btn-primary-sm" id="ai-save">저장</button>
          <button class="btn" id="ai-test">연결 테스트</button>
        </div>
        <div id="ai-alert" class="mt-2"></div>
      `;

      // 카드 클릭으로 라디오 선택
      el.querySelectorAll('[data-provider]').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.provider;
          el.querySelectorAll('input[name=provider]').forEach(r => r.checked = (r.value === id));
          el.querySelectorAll('[data-provider]').forEach(c => {
            c.style.borderColor = c.dataset.provider === id ? 'var(--primary)' : 'var(--border)';
            c.style.background = c.dataset.provider === id ? 'var(--success-bg)' : '';
          });
          document.getElementById('claude-api-config').style.display = id === 'claude-api' ? 'block' : 'none';
        });
      });

      document.getElementById('ai-save').addEventListener('click', async () => {
        const provider = el.querySelector('input[name=provider]:checked').value;
        const body = { provider };
        if (provider === 'claude-api') {
          const key = document.getElementById('api-key').value;
          if (key) body.api_key = key;
          body.model = document.getElementById('api-model').value;
        }
        const alertEl = document.getElementById('ai-alert');
        try {
          await API.put('/admin/settings/ai', body);
          // U-G4: 저장 직후 자동 헬스체크 — 키 오타/만료를 즉시 발견
          alertEl.innerHTML = '<div class="alert" style="background:var(--warn-bg)">저장됨. 연결 확인 중...</div>';
          try {
            const r = await API.post('/admin/settings/ai/test', { provider });
            if (r.ok) {
              alertEl.innerHTML = `<div class="alert alert-success">저장 + 연결 정상 — ${escapeHtml(r.message || r.provider)}${r.sample ? ' (응답: ' + escapeHtml(r.sample) + ')' : ''}</div>`;
            } else {
              alertEl.innerHTML = `<div class="alert alert-error">저장됨, 그러나 연결 실패 — ${escapeHtml(r.error || '알 수 없는 오류')}. 키/모델을 다시 확인하세요.</div>`;
            }
          } catch (testErr) {
            alertEl.innerHTML = `<div class="alert alert-error">저장됨, 그러나 헬스체크 실패 — ${escapeHtml(testErr.message)}</div>`;
          }
          // 사이드바 AI 뱃지 갱신
          if (typeof Shell !== 'undefined' && Shell.refreshAiPill) {
            Shell.refreshAiPill(true);
          }
        } catch (err) {
          alertEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });

      document.getElementById('ai-test').addEventListener('click', async () => {
        const provider = el.querySelector('input[name=provider]:checked').value;
        const alert = document.getElementById('ai-alert');
        alert.innerHTML = '<div class="alert" style="background:var(--warn-bg)">연결 테스트 중... (최대 30초)</div>';
        try {
          const r = await API.post('/admin/settings/ai/test', { provider });
          if (r.ok) {
            alert.innerHTML = `<div class="alert alert-success">연결 정상 — ${escapeHtml(r.message || r.provider)}${r.sample ? ' (응답: ' + escapeHtml(r.sample) + ')' : ''}</div>`;
          } else {
            alert.innerHTML = `<div class="alert alert-error">연결 실패 — ${escapeHtml(r.error || '알 수 없는 오류')}</div>`;
          }
        } catch (err) {
          alert.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  showInviteModal(onSuccess) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <h2>사용자 초대</h2>
        <div class="form-group"><label>이메일</label><input type="email" id="i-email" required></div>
        <div class="form-group"><label>역할</label>
          <select id="i-role">
            <option value="member">member (프로젝트 CRUD + 파이프라인)</option>
          </select>
        </div>
        <div id="invite-result"></div>
        <div class="modal-footer">
          <button class="btn" data-close>취소</button>
          <button class="btn-primary-sm" id="send-invite">초대 링크 생성</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('send-invite').addEventListener('click', async () => {
      try {
        const res = await API.post('/admin/invite', {
          email: document.getElementById('i-email').value,
          role: document.getElementById('i-role').value
        });
        const url = `${location.origin}/invite/${res.token}`;
        document.getElementById('invite-result').innerHTML = `
          <div class="alert alert-success mt-3">
            초대 링크:<br>
            <input readonly value="${escapeHtml(url)}" class="mt-2" onclick="this.select()">
            <div class="text-muted text-sm mt-2">만료: ${formatDate(res.expires_at)}</div>
          </div>
        `;
        onSuccess();
      } catch (err) { alert(err.message); }
    });
  }
};
