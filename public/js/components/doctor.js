// /doctor — 시스템 자가진단 (B5, admin 전용)
const DoctorPage = {
  _refreshTimer: null,

  async render() {
    // adminGuard에서 권한 검증 완료. AdminShell 사용.
    AdminShell.render(`
      <div class="page-header">
        <div>
          <div class="page-title">시스템 자가진단</div>
          <div class="page-subtitle">DB · 디스크 · 워커 · 환경 점검</div>
        </div>
        <div class="flex gap-2">
          <label class="text-sm text-muted" style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="auto-refresh" style="width:auto"> 자동 갱신 (30초)
          </label>
          <button class="btn-primary-sm" id="rerun-btn">다시 진단</button>
        </div>
      </div>

      <div id="doctor-overall" class="mb-4"></div>
      <div id="doctor-content">진단 중...</div>
    `, 'admin-doctor');

    document.getElementById('rerun-btn').addEventListener('click', () => DoctorPage.load());
    document.getElementById('auto-refresh').addEventListener('change', (e) => {
      if (e.target.checked) {
        DoctorPage._refreshTimer = setInterval(() => DoctorPage.load(), 30000);
      } else if (DoctorPage._refreshTimer) {
        clearInterval(DoctorPage._refreshTimer);
        DoctorPage._refreshTimer = null;
      }
    });

    DoctorPage.load();
  },

  async load() {
    const overall = document.getElementById('doctor-overall');
    const content = document.getElementById('doctor-content');
    if (!content) return;

    try {
      const r = await API.get('/doctor');
      overall.innerHTML = DoctorPage._renderOverall(r);
      content.innerHTML = DoctorPage._renderSections(r.sections);
    } catch (err) {
      content.innerHTML = `<div class="empty text-danger">진단 실패: ${escapeHtml(err.message || String(err))}</div>`;
    }
  },

  _renderOverall(r) {
    const { overall, summary, checked_at } = r;
    const cls = overall === 'PASS' ? 'success' : overall === 'WARN' ? 'warn' : 'danger';
    const icon = overall === 'PASS' ? '✓' : overall === 'WARN' ? '⚠' : '✗';
    const label = overall === 'PASS' ? '정상' : overall === 'WARN' ? '주의' : '실패';
    return `
      <div class="card doctor-overall-${cls}">
        <div class="flex-between" style="align-items:center">
          <div>
            <div style="font-size:1.4rem;font-weight:700">
              <span class="doctor-overall-icon">${icon}</span> 전체 상태: ${label}
            </div>
            <div class="text-muted text-sm mt-1">검사 시각 ${formatRelative(checked_at)}</div>
          </div>
          <div class="flex gap-2">
            <span class="badge badge-success">PASS ${summary.pass}</span>
            <span class="badge badge-warn">WARN ${summary.warn}</span>
            <span class="badge badge-danger">FAIL ${summary.fail}</span>
          </div>
        </div>
      </div>
    `;
  },

  _renderSections(sections) {
    const sectionLabels = {
      database: '데이터베이스',
      filesystem: '파일 시스템',
      worker: '파이프라인 워커',
      ai_provider: 'AI Provider · 세션',
      environment: '환경 변수',
      errors: '에러 로그',
      system: '시스템'
    };

    return Object.entries(sections).map(([key, checks]) => {
      const failCount = checks.filter(c => c.status === 'FAIL').length;
      const warnCount = checks.filter(c => c.status === 'WARN').length;
      const sectionStatus = failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';
      return `
        <div class="card mb-3">
          <div class="flex-between mb-3">
            <h3 style="margin:0">${sectionLabels[key] || key}</h3>
            <span class="badge badge-${sectionStatus === 'PASS' ? 'success' : sectionStatus === 'WARN' ? 'warn' : 'danger'}">${sectionStatus}</span>
          </div>
          <table class="doctor-table">
            <tbody>
              ${checks.map(c => `
                <tr>
                  <td style="width:30px">${DoctorPage._statusIcon(c.status)}</td>
                  <td style="width:200px;font-weight:600">${escapeHtml(c.label)}</td>
                  <td class="text-muted text-sm">${escapeHtml(c.detail || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  },

  _statusIcon(status) {
    if (status === 'PASS') return '<span class="doctor-icon doctor-icon-pass">✓</span>';
    if (status === 'WARN') return '<span class="doctor-icon doctor-icon-warn">⚠</span>';
    return '<span class="doctor-icon doctor-icon-fail">✗</span>';
  }
};
