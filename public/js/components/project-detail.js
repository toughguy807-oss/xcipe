// Project detail — chat-thread-centric UI (v4 redesign)
const ProjectDetailPage = {
  _pollTimer: null,
  _lastMsgId: 0,
  _projectId: null,

  STEP_LABELS: {
    qst: '질의서', req: '요구사항', fn: '기능정의', ia: '정보구조', wbs: '작업분해',
    benchmark: '벤치마크', knowledge: '스타일가이드', layout: '레이아웃', ui: 'UI 명세',
    markup: 'HTML 마크업', style: 'CSS', interaction: '인터랙션',
    functional: '기능 테스트', accessibility: '접근성 테스트', performance: '성능 테스트',
    deploy: '배포'
  },

  PHASE_LABELS: { planning: '기획', design: '디자인', publish: '퍼블', qa: 'QA', deploy: '배포' },

  _gateBadge(gate, score) {
    if (!gate) return '';
    if (gate === 'AUTO') return `<span class="gate-badge gate-auto" title="자동 진행 권장 (${score}점)">${score}</span>`;
    if (gate === 'HITL_RECOMMENDED') return `<span class="gate-badge gate-warn" title="검토 권장 (${score}점)">${score}⚠</span>`;
    if (gate === 'HITL_REQUIRED') return `<span class="gate-badge gate-danger" title="검토 필수 (${score}점)">${score}!</span>`;
    return `<span class="gate-badge">${score || '?'}</span>`;
  },

  async render({ id }) {
    ProjectDetailPage._projectId = id;
    ProjectDetailPage._lastMsgId = 0;
    ProjectDetailPage.stopPolling();

    Shell.render('<div class="empty">로딩 중...</div>', 'projects');

    const project = await API.get(`/projects/${id}`);

    const html = `
      <div class="page-header">
        <div>
          <div class="flex gap-2" style="align-items:center">
            <div class="page-title">${escapeHtml(project.name)}</div>
            <span class="project-code">${escapeHtml(project.code)}</span>
            <span class="badge badge-${project.status}">${project.status}</span>
          </div>
          <div class="page-subtitle">${escapeHtml(project.description || '설명 없음')}</div>
        </div>
        <button class="btn" onclick="Router.navigate('/projects')">← 목록</button>
      </div>

      <div class="chat-layout">
        <div class="chat-main">
          <div class="chat-header">
            <div>
              <div class="chat-header-title">대화</div>
              <div class="chat-header-meta" id="chat-header-meta">준비 중...</div>
            </div>
            <div class="flex gap-2" id="pipeline-controls">
              <button class="btn btn-sm" id="start-btn">파이프라인 시작</button>
              <button class="btn btn-sm" id="pause-btn" style="display:none">일시정지</button>
              <button class="btn btn-sm" id="resume-btn" style="display:none">재개</button>
              <button class="btn btn-sm" id="cancel-btn" style="display:none">취소</button>
              <button class="btn btn-sm" id="retry-all-btn" style="display:none">전체 실패 재시도</button>
              <button class="btn btn-sm" id="refresh-btn">새로고침</button>
            </div>
          </div>
          <div class="chat-thread" id="chat-thread">로딩 중...</div>
          <div class="chat-hints">
            <code>승인</code> 또는 <code>/approve</code> · <code>/retry</code> 실패 재시도 · <code>/skip</code> 건너뛰기
            <br>· 승인 대기 중이면 자유 입력 = 수정 지시(거절+재생성)
            <br>· 진행 중이면 자유 입력 = 다음 단계에 반영될 <strong>피드백</strong>으로 누적
          </div>
          <div class="chat-input">
            <textarea id="msg-input" placeholder="메시지 입력 또는 /approve, /retry, /skip" rows="1"></textarea>
            <div class="chat-input-tools">
              <button class="btn-primary-sm" id="send-btn">전송</button>
            </div>
          </div>
        </div>

        <div class="chat-sidebar">
          <div class="card">
            <h4>프로젝트</h4>
            <div class="side-row"><span>코드</span><strong>${escapeHtml(project.code)}</strong></div>
            <div class="side-row"><span>유형</span><strong>${escapeHtml(project.type || '-')}</strong></div>
            <div class="side-row"><span>완성도</span><strong>L${project.completion_level || 1}</strong></div>
            <div class="side-row"><span>산출물</span><strong>${project.artifact_count || 0}</strong></div>
          </div>

          ${project.prompt ? `
            <div class="card">
              <h4>원본 요청</h4>
              <div class="text-sm" style="white-space:pre-wrap;color:var(--muted);max-height:140px;overflow:auto">${escapeHtml(project.prompt)}</div>
            </div>
          ` : ''}

          <div class="card">
            <h4>진행 단계</h4>
            <div id="side-steps" class="side-steps">로딩 중...</div>
          </div>

          <div class="card">
            <h4>관리</h4>
            <button class="btn btn-sm" style="width:100%;margin-bottom:6px" id="view-artifacts">산출물 전체 보기</button>
            <button class="btn btn-sm" style="width:100%;margin-bottom:6px" id="view-files">📁 폴더 트리</button>
            <button class="btn btn-sm" style="width:100%;margin-bottom:6px" id="dl-all">전체 다운로드 (zip)</button>
            <button class="btn btn-sm" style="width:100%;margin-bottom:6px" id="export-json">JSON 백업</button>
            <button class="btn btn-sm" style="width:100%" id="edit-project">프로젝트 설정</button>
          </div>
        </div>
      </div>
    `;
    Shell.render(html, 'projects');

    // 이벤트 바인딩
    document.getElementById('send-btn').addEventListener('click', ProjectDetailPage.sendMessage);
    document.getElementById('msg-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ProjectDetailPage.sendMessage();
      }
    });
    document.getElementById('start-btn').addEventListener('click', ProjectDetailPage.startPipeline);
    document.getElementById('pause-btn').addEventListener('click', () => ProjectDetailPage.controlPipeline('pause'));
    document.getElementById('resume-btn').addEventListener('click', () => ProjectDetailPage.controlPipeline('resume'));
    document.getElementById('cancel-btn').addEventListener('click', () => ProjectDetailPage.controlPipeline('cancel'));
    document.getElementById('retry-all-btn').addEventListener('click', () => ProjectDetailPage.controlPipeline('retry-all'));
    document.getElementById('refresh-btn').addEventListener('click', () => ProjectDetailPage.loadMessages(true));
    document.getElementById('view-artifacts').addEventListener('click', () => ProjectDetailPage.showArtifactsModal());
    document.getElementById('view-files').addEventListener('click', () => ProjectDetailPage.showFileBrowserModal());
    document.getElementById('dl-all').addEventListener('click', () => {
      API.download(`/projects/${id}/artifacts.zip`, `${project.code}-artifacts.zip`);
    });
    document.getElementById('export-json').addEventListener('click', () => {
      API.download(`/projects/${id}/export.json`, `${project.code}-export.json`);
    });
    document.getElementById('edit-project').addEventListener('click', () => ProjectDetailPage.showSettingsModal(project));

    // 초기 로드
    await ProjectDetailPage.loadMessages(true);
    await ProjectDetailPage.loadPipelineStatus();
    ProjectDetailPage.startPolling();
  },

  async loadMessages(reset = false) {
    const id = ProjectDetailPage._projectId;
    const thread = document.getElementById('chat-thread');
    if (!thread) return;

    try {
      const since = reset ? 0 : ProjectDetailPage._lastMsgId;
      const res = await API.get(`/projects/${id}/messages?since=${since}&limit=500`);
      const messages = res.data || [];
      if (messages.length === 0 && reset) {
        thread.innerHTML = `
          <div class="chat-msg system">
            <div class="chat-bubble">아직 대화가 없습니다. [파이프라인 시작] 버튼을 눌러 생성을 시작하거나 메시지를 입력하세요.</div>
          </div>
        `;
        return;
      }
      if (reset) thread.innerHTML = '';

      const shouldScroll = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 100;
      for (const m of messages) {
        thread.insertAdjacentHTML('beforeend', ProjectDetailPage.renderMessage(m));
        ProjectDetailPage._lastMsgId = Math.max(ProjectDetailPage._lastMsgId, m.id);
      }
      ProjectDetailPage.bindMessageEvents(thread);

      if (shouldScroll || reset) thread.scrollTop = thread.scrollHeight;
    } catch (err) {
      console.error('[messages] load failed:', err);
    }
  },

  renderMessage(m) {
    const time = m.created_at ? new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    const meta = m.user_email ? `${escapeHtml(m.user_email.split('@')[0])} · ${time}` : time;

    // 시스템 메시지
    if (m.role === 'system') {
      const cls = m.kind === 'error' ? 'system error' : (m.kind === 'status' ? 'status' : 'system');
      return `
        <div class="chat-msg ${cls}">
          <div>
            <div class="chat-bubble">${escapeHtml(m.content || '')}</div>
            <div class="chat-meta" style="text-align:center">${time}</div>
          </div>
        </div>
      `;
    }

    // 사용자 메시지
    if (m.role === 'user') {
      const fbBadge = m.kind === 'user_feedback'
        ? `<span class="badge" style="background:#f3a72b;color:#fff;font-size:.62rem;margin-right:.4rem">피드백 → 다음 단계 반영</span>`
        : '';
      const consumedBadge = m.kind === 'user_feedback' && m.consumed_at
        ? `<span class="badge" style="background:#3aa55c;color:#fff;font-size:.62rem;margin-right:.4rem">반영 완료</span>`
        : '';
      return `
        <div class="chat-msg user">
          <div class="chat-avatar">나</div>
          <div>
            <div class="chat-bubble">${fbBadge}${consumedBadge}${escapeHtml(m.content || '')}</div>
            <div class="chat-meta" style="text-align:right">${meta}</div>
          </div>
        </div>
      `;
    }

    // 어시스턴트 메시지 — kind별 분기
    if (m.kind === 'artifact' && m.artifact_id) {
      const stepLabel = m.step_code ? (ProjectDetailPage.STEP_LABELS[m.step_code] || m.step_code) : '산출물';
      // 뱃지 렌더링 — UNKNOWN/null은 숨김, PASS는 녹색, 그 외는 회색
      let checkBadge = '';
      const check = m.self_check_result;
      if (check === 'PASS') {
        checkBadge = `<span class="badge badge-resolved" style="font-size:.65rem">PASS</span>`;
      } else if (check === 'DONE') {
        checkBadge = `<span class="badge badge-open" style="font-size:.65rem">완료</span>`;
      } else if (check && check !== 'UNKNOWN') {
        checkBadge = `<span class="badge badge-in_progress" style="font-size:.65rem">${escapeHtml(check)}</span>`;
      }
      return `
        <div class="chat-msg assistant">
          <div class="chat-avatar">AI</div>
          <div>
            <div class="chat-artifact-card">
              <div class="card-head">
                <div class="card-title">📄 ${escapeHtml(stepLabel)}</div>
                ${checkBadge}
              </div>
              <div class="card-body">${escapeHtml(m.content || '')}</div>
              <div class="card-actions">
                <button class="btn btn-sm" data-view-artifact="${m.artifact_id}">열람</button>
                <button class="btn btn-sm" data-dl-artifact="${m.artifact_id}" data-fn="${escapeHtml(m.artifact_file_name || 'file.md')}">다운로드</button>
              </div>
            </div>
            <div class="chat-meta">${time}</div>
          </div>
        </div>
      `;
    }

    if (m.kind === 'approval_request') {
      const stepLabel = m.step_code ? (ProjectDetailPage.STEP_LABELS[m.step_code] || m.step_code) : '단계';
      return `
        <div class="chat-msg assistant">
          <div class="chat-avatar">AI</div>
          <div>
            <div class="chat-approval">
              <div class="approval-title">${escapeHtml(stepLabel)} 승인 대기</div>
              <div class="approval-body">${escapeHtml(m.content || '')}</div>
              <div class="approval-actions">
                <button class="btn-primary-sm" data-approve-step="${m.step_id}">승인</button>
                <button class="btn btn-sm" data-reject-step="${m.step_id}">다시 만들기</button>
              </div>
            </div>
            <div class="chat-meta">${time}</div>
          </div>
        </div>
      `;
    }

    // 기본 어시스턴트 메시지 (status, text)
    const bubbleCls = m.kind === 'status' ? 'chat-bubble' : 'chat-bubble';
    const bubbleStyle = m.kind === 'status' ? 'background:var(--bg);color:var(--muted);font-style:italic' : '';
    return `
      <div class="chat-msg assistant">
        <div class="chat-avatar">AI</div>
        <div>
          <div class="${bubbleCls}" style="${bubbleStyle}">${escapeHtml(m.content || '')}</div>
          <div class="chat-meta">${time}</div>
        </div>
      </div>
    `;
  },

  bindMessageEvents(thread) {
    const id = ProjectDetailPage._projectId;
    thread.querySelectorAll('[data-view-artifact]').forEach(b => {
      if (b._bound) return; b._bound = true;
      b.addEventListener('click', () => ProjectDetailPage.showArtifactModal(b.dataset.viewArtifact));
    });
    thread.querySelectorAll('[data-dl-artifact]').forEach(b => {
      if (b._bound) return; b._bound = true;
      b.addEventListener('click', () => API.download(`/projects/${id}/artifacts/${b.dataset.dlArtifact}/download`, b.dataset.fn));
    });
    thread.querySelectorAll('[data-approve-step]').forEach(b => {
      if (b._bound) return; b._bound = true;
      b.addEventListener('click', () => ProjectDetailPage.quickSend('/approve'));
    });
    thread.querySelectorAll('[data-reject-step]').forEach(b => {
      if (b._bound) return; b._bound = true;
      b.addEventListener('click', () => {
        // 시스템 prompt 대신 채팅 입력창에 가이드 텍스트 + 포커스
        //   비어 있으면 "다시 만들어주세요" 자동 전송, 추가 지시 있으면 그대로 전송
        const input = document.getElementById('msg-input');
        if (!input) return;
        const placeholderEl = input;
        const originalPlaceholder = placeholderEl.placeholder;
        placeholderEl.placeholder = '추가 지시를 입력하거나 그대로 전송하면 "다시 만들어주세요"가 전송됩니다 (ESC로 취소)';
        input.value = '';
        input.focus();
        // 한 번만 동작하는 핸들러
        const onKey = (e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            const v = input.value.trim();
            input.value = '';
            placeholderEl.placeholder = originalPlaceholder;
            input.removeEventListener('keydown', onKey);
            input.removeEventListener('blur', onBlur);
            ProjectDetailPage.quickSend(v || '다시 만들어주세요');
          } else if (e.key === 'Escape') {
            placeholderEl.placeholder = originalPlaceholder;
            input.value = '';
            input.removeEventListener('keydown', onKey);
            input.removeEventListener('blur', onBlur);
          }
        };
        const onBlur = () => {
          placeholderEl.placeholder = originalPlaceholder;
          input.removeEventListener('keydown', onKey);
          input.removeEventListener('blur', onBlur);
        };
        input.addEventListener('keydown', onKey);
        input.addEventListener('blur', onBlur);
      });
    });
  },

  async sendMessage() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content) return;
    input.value = '';
    await ProjectDetailPage.quickSend(content);
  },

  async quickSend(content) {
    const id = ProjectDetailPage._projectId;
    try {
      await API.post(`/projects/${id}/messages`, { content });
      await ProjectDetailPage.loadMessages(false);
    } catch (err) {
      alert(err.message);
    }
  },

  async startPipeline() {
    const id = ProjectDetailPage._projectId;
    try {
      const p = await API.post('/pipelines', { project_id: +id });
      await ProjectDetailPage.quickSend(`[파이프라인 시작 요청]`);
      await ProjectDetailPage.loadPipelineStatus();
    } catch (err) {
      alert(err.message);
    }
  },

  async loadPipelineStatus() {
    const id = ProjectDetailPage._projectId;
    try {
      const list = await API.get(`/pipelines?project_id=${id}`);
      const items = Array.isArray(list) ? list : (list.data || []);
      if (items.length === 0) {
        const meta = document.getElementById('chat-header-meta');
        if (meta) meta.textContent = '아직 시작된 파이프라인 없음';
        const side = document.getElementById('side-steps');
        if (side) side.innerHTML = '<div class="text-muted text-sm">파이프라인 미시작</div>';
        ProjectDetailPage._activeStep = null;
        return;
      }
      const latest = items[0];
      const full = await API.get(`/pipelines/${latest.id}`);

      // 현재 running step 찾기 — 실시간 경과시간 표시용
      const running = full.steps.find(s => s.status === 'running');
      const awaiting = full.steps.find(s => s.status === 'awaiting_approval');
      ProjectDetailPage._activeStep = running || null;
      ProjectDetailPage._awaitingStep = awaiting || null;

      const hasFailedSteps = full.steps.some(s => s.status === 'failed');
      ProjectDetailPage.updateHeaderMeta(full);
      ProjectDetailPage.updateControlButtons(full.status, hasFailedSteps);
      const side = document.getElementById('side-steps');
      if (side) {
        const phases = {};
        full.steps.forEach(s => { (phases[s.phase] ||= []).push(s); });
        side.innerHTML = Object.entries(phases).map(([phase, steps]) => {
          const done = steps.filter(s => s.status === 'approved' || s.status === 'skipped').length;
          const total = steps.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const phaseStatus = steps.some(s => s.status === 'running' || s.status === 'awaiting_approval') ? 'active'
            : (done === total ? 'done' : 'idle');
          return `
            <div class="phase-block phase-${phaseStatus}">
              <div class="phase-header">
                <span class="phase-name">${ProjectDetailPage.PHASE_LABELS[phase] || phase}</span>
                <span class="phase-counter">${done}/${total}</span>
              </div>
              <div class="phase-progress">
                <div class="phase-progress-fill" style="width:${pct}%"></div>
              </div>
              ${steps.map(s => {
                const dotCls = s.status === 'approved' ? 'step-completed' : s.status === 'failed' ? 'step-failed' : (s.status === 'running' || s.status === 'awaiting_approval') ? 'step-running' : 'step-pending';
                const isActive = s.status === 'running' || s.status === 'awaiting_approval';
                let metaJson = null; try { metaJson = s.meta_json ? JSON.parse(s.meta_json) : null; } catch {}
                const review = metaJson && metaJson.review ? metaJson.review : null;
                const gateBadge = review ? this._gateBadge(review.gate, review.score) : '';
                return `
                  <div class="side-step ${isActive ? 'active' : ''}" ${review ? `title="reviewer ${review.score}점: ${escapeHtml(review.reason || '')}"` : ''}>
                    <div class="step-dot ${dotCls}"></div>
                    <span class="side-step-label">${ProjectDetailPage.STEP_LABELS[s.step] || s.step}</span>
                    ${gateBadge}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('[pipeline] status load failed:', err);
    }
  },

  updateControlButtons(status, hasFailedSteps) {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const retryAllBtn = document.getElementById('retry-all-btn');
    if (!startBtn || !pauseBtn || !resumeBtn || !cancelBtn || !retryAllBtn) return;

    const isRunning = status === 'running' || status === 'pending';
    const isPaused = status === 'paused';
    const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';

    startBtn.style.display = isTerminal ? '' : 'none';
    pauseBtn.style.display = isRunning ? '' : 'none';
    resumeBtn.style.display = isPaused ? '' : 'none';
    cancelBtn.style.display = (isRunning || isPaused) ? '' : 'none';
    retryAllBtn.style.display = hasFailedSteps ? '' : 'none';
  },

  async controlPipeline(action) {
    const labels = { pause: '일시정지', resume: '재개', cancel: '취소', 'retry-all': '전체 실패 재시도' };
    if (action === 'cancel' && !confirm('파이프라인을 취소하시겠습니까? 진행 중인 작업이 중단되며 복구할 수 없습니다.')) return;
    if (action === 'retry-all' && !confirm('실패한 모든 step을 일괄 재시도합니다. 진행할까요?')) return;

    try {
      const items = await API.get(`/pipelines?project_id=${ProjectDetailPage._projectId}`);
      const latest = (items.data || items)[0];
      if (!latest) return alert('실행 중인 파이프라인이 없습니다');
      const r = await API.post(`/pipelines/${latest.id}/${action}`, {});
      if (r.ok === false) return alert(`${labels[action]} 실패: ${r.message || r.error}`);
      if (action === 'retry-all' && r.retried) {
        alert(`${r.retried}개 step 재시도 시작: ${(r.steps || []).join(', ')}`);
      }
      await ProjectDetailPage.loadPipelineStatus();
    } catch (err) {
      console.error(`[pipeline ${action}]`, err);
      alert(`${labels[action]} 실패: ${err.message || err}`);
    }
  },

  updateHeaderMeta(full) {
    const meta = document.getElementById('chat-header-meta');
    if (!meta) return;

    const base = `진행률 ${full.progress}% · ${full.approved_steps}/${full.total_steps} 승인`;

    // paused/cancelled은 step 상태와 무관하게 우선 표시
    if (full.status === 'paused') {
      meta.innerHTML = `<span class="badge badge-warn">일시정지</span> ${base}`;
      return;
    }
    if (full.status === 'cancelled') {
      meta.innerHTML = `<span class="badge badge-danger">취소됨</span> ${base}`;
      return;
    }

    // running step이 있으면 실시간 경과 시간 표시
    if (ProjectDetailPage._activeStep) {
      const s = ProjectDetailPage._activeStep;
      const label = ProjectDetailPage.STEP_LABELS[s.step] || s.step;
      const startedAt = s.started_at ? new Date(s.started_at.replace(' ', 'T') + 'Z').getTime() : Date.now();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const minSec = elapsed >= 60 ? `${Math.floor(elapsed/60)}분 ${elapsed%60}초` : `${elapsed}초`;
      meta.innerHTML = `<span class="spinner spinner-dark"></span> <strong>${escapeHtml(label)} 생성 중</strong> · ${minSec} 경과 · ${base}`;
    } else if (ProjectDetailPage._awaitingStep) {
      const s = ProjectDetailPage._awaitingStep;
      const label = ProjectDetailPage.STEP_LABELS[s.step] || s.step;
      meta.innerHTML = `⏸ <strong>${escapeHtml(label)}</strong> 승인 대기 · ${base}`;
    } else {
      meta.textContent = `${base} · ${full.status}`;
    }
  },

  startPolling() {
    ProjectDetailPage.stopPolling();
    // 2초마다 서버 상태 확인
    ProjectDetailPage._pollTimer = setInterval(async () => {
      // 페이지 이탈 시 자동 중단 — chat-thread element가 사라졌다면 정리
      if (!document.getElementById('chat-thread')) {
        ProjectDetailPage.stopPolling();
        return;
      }
      try {
        await ProjectDetailPage.loadMessages(false);
        await ProjectDetailPage.loadPipelineStatus();
      } catch (err) {
        console.error('[poll]', err);
      }
    }, 2000);

    // 1초마다 경과 시간만 업데이트 (서버 호출 없이 로컬 계산)
    ProjectDetailPage._tickTimer = setInterval(() => {
      if (!document.getElementById('chat-header-meta')) { ProjectDetailPage.stopPolling(); return; }
      if (ProjectDetailPage._activeStep) {
        const s = ProjectDetailPage._activeStep;
        const startedAt = s.started_at ? new Date(s.started_at.replace(' ', 'T') + 'Z').getTime() : Date.now();
        const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        const minSec = elapsed >= 60 ? `${Math.floor(elapsed/60)}분 ${elapsed%60}초` : `${elapsed}초`;
        const label = ProjectDetailPage.STEP_LABELS[s.step] || s.step;
        const meta = document.getElementById('chat-header-meta');
        if (meta) meta.innerHTML = `<span class="spinner spinner-dark"></span> <strong>${escapeHtml(label)} 생성 중</strong> · ${minSec} 경과`;
      }
    }, 1000);
  },

  stopPolling() {
    if (ProjectDetailPage._pollTimer) {
      clearInterval(ProjectDetailPage._pollTimer);
      ProjectDetailPage._pollTimer = null;
    }
    if (ProjectDetailPage._tickTimer) {
      clearInterval(ProjectDetailPage._tickTimer);
      ProjectDetailPage._tickTimer = null;
    }
  },

  async showArtifactModal(artifactId) {
    const id = ProjectDetailPage._projectId;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `<div class="modal" style="max-width:900px;max-height:90vh;overflow:auto">
      <div class="flex-between mb-3">
        <h2 id="art-title">산출물 로딩 중...</h2>
        <div class="flex gap-2">
          <button class="btn btn-sm" id="art-dl">다운로드</button>
          <button class="btn btn-sm" data-close>닫기</button>
        </div>
      </div>
      <div id="art-body"><div class="empty">로딩 중...</div></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    try {
      const a = await API.get(`/projects/${id}/artifacts/${artifactId}`);
      const title = document.getElementById('art-title');
      const body = document.getElementById('art-body');
      const dlBtn = document.getElementById('art-dl');
      if (title) title.textContent = `${a.type} · ${a.file_name}`;
      if (dlBtn) dlBtn.addEventListener('click', () => API.download(`/projects/${id}/artifacts/${artifactId}/download`, a.file_name));

      // META 블록 제거하고 markdown 렌더
      const cleanContent = (a.content || '').replace(/<!--\s*META[\s\S]*?-->/g, '').trim();
      const rendered = (typeof marked !== 'undefined') ? marked.parse(cleanContent) : escapeHtml(cleanContent);
      if (body) body.innerHTML = `<div class="artifact-content">${rendered}</div>`;
    } catch (err) {
      const body = document.getElementById('art-body');
      if (body) body.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  async showArtifactsModal() {
    const id = ProjectDetailPage._projectId;
    const artifacts = await API.get(`/projects/${id}/artifacts`);
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    // M: 메인 + children 그룹화. role 별 색상/라벨로 시안/스펙/토큰 구분.
    const ROLE_LABEL = {
      mockup: '목업', wireframe: '와이어프레임', component: '컴포넌트',
      preview: '프리뷰', tokens: '토큰', 'sb-data': 'SB데이터', image: '이미지',
      screenshot: '스크린샷', document: '문서', config: '설정', spec: '스펙',
      stylesheet: 'CSS', script: 'JS', icon: '아이콘', reference: '참고', aesthetic: '미감'
    };
    const childRow = c => {
      const isHtml = (c.mime_type || '').startsWith('text/html') || /\.(html|htm)$/i.test(c.file_name);
      const isImage = (c.mime_type || '').startsWith('image/');
      const isPdf = (c.mime_type || '').includes('pdf');
      const previewBtn = (isHtml || isImage || isPdf)
        ? `<button class="btn btn-sm" data-preview="${c.id}" data-mime="${escapeHtml(c.mime_type || '')}" data-fn="${escapeHtml(c.file_name)}" data-static="${escapeHtml(c.static_url || '')}">미리보기</button>`
        : '';
      // R3: HTML 자식도 Figma push 가능
      const figmaBtn = isHtml
        ? `<button class="btn btn-sm" data-figma-push="${c.id}" data-fn="${escapeHtml(c.file_name)}" title="Figma 로 보내기">Figma↗</button>`
        : '';
      return `<div class="child-row" style="display:flex;gap:.5rem;align-items:center;padding:.25rem .5rem;border-top:1px dashed var(--border);font-size:.85rem">
        <span class="badge badge-${c.role || 'default'}" style="min-width:80px;text-align:center">${escapeHtml(ROLE_LABEL[c.role] || c.role || '-')}</span>
        <span style="flex:1;font-family:monospace">${escapeHtml(c.file_name)}</span>
        ${previewBtn}
        ${figmaBtn}
        <button class="btn btn-sm" data-dl-child="${c.id}" data-fn="${escapeHtml(c.file_name)}">DL</button>
      </div>`;
    };
    modal.innerHTML = `
      <div class="modal" style="max-width:900px;max-height:90vh;overflow:auto">
        <div class="flex-between mb-3">
          <h2>산출물 (${artifacts.length} 메인 / ${artifacts.reduce((s,a)=>s+(a.children?.length||0),0)} 부속)</h2>
          <button class="btn btn-sm" data-close>닫기</button>
        </div>
        ${artifacts.length === 0 ? '<div class="empty">산출물이 없습니다</div>' : artifacts.map(a => {
          const children = a.children || [];
          // M-fix: 메인 단일 HTML/CSS/이미지/PDF 도 미리보기 가능 (MARKUP, STYLE, INTERACTION 등)
          const mainMime = a.mime_type || (() => {
            const ext = (a.file_name || '').split('.').pop().toLowerCase();
            return ({ html: 'text/html', htm: 'text/html', css: 'text/css', js: 'application/javascript',
                     png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf' })[ext] || '';
          })();
          const mainPreviewable = /^(text\/html|image\/|application\/pdf)/.test(mainMime);
          return `
          <div class="artifact-card" style="border:1px solid var(--border);border-radius:6px;margin-bottom:.75rem;padding:.6rem">
            <div style="display:flex;gap:.5rem;align-items:center">
              <strong style="min-width:120px">${escapeHtml(a.type)}</strong>
              <span style="flex:1;font-family:monospace;font-size:.85rem">${escapeHtml(a.file_name)}</span>
              <span class="text-muted text-sm">${escapeHtml(a.version)}</span>
              <span class="text-muted text-sm">${formatRelative(a.created_at)}</span>
              ${a.review_score ? `<span class="badge badge-${a.review_score >= 90 ? 'resolved' : 'in-progress'}">${a.review_score}점</span>` : ''}
              ${mainPreviewable ? `<button class="btn btn-sm" data-preview-main="${a.id}" data-mime="${escapeHtml(mainMime)}" data-fn="${escapeHtml(a.file_name)}" data-static="${escapeHtml(a.static_url || '')}">미리보기</button>` : ''}
              ${/^text\/html/.test(mainMime) ? `<button class="btn btn-sm" data-figma-push="${a.id}" data-fn="${escapeHtml(a.file_name)}" title="Figma 로 보내기">Figma↗</button>` : ''}
              <button class="btn btn-sm" data-view="${a.id}">열람</button>
              <button class="btn btn-sm" data-dl="${a.id}" data-fn="${escapeHtml(a.file_name)}">DL</button>
            </div>
            ${children.length > 0 ? `
              <div style="margin-top:.4rem;border-top:1px solid var(--border);padding-top:.4rem">
                <div class="text-muted text-xs" style="margin-bottom:.25rem">부속 ${children.length}건 (시안/스펙/토큰)</div>
                ${children.map(childRow).join('')}
              </div>
            ` : ''}
          </div>`;
        }).join('')}
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      modal.remove();
      Router.navigate(`/projects/${id}/artifacts/${b.dataset.view}`);
    }));
    modal.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => {
      API.download(`/projects/${id}/artifacts/${b.dataset.dl}/download`, b.dataset.fn);
    }));
    // M-fix: 메인 단일 HTML/CSS/JS/이미지/PDF 도 미리보기. /artifacts/:aid/file 사용 (메인은 static_url 없음)
    modal.querySelectorAll('[data-preview-main]').forEach(b => b.addEventListener('click', () => {
      ProjectDetailPage._showChildPreview(id, b.dataset.previewMain, b.dataset.mime, b.dataset.fn, b.dataset.static || '');
    }));
    // 자식 파일 — 단건 서빙 라우트 (/file). API.getToken() 사용 (TOKEN_KEY=esys_token).
    modal.querySelectorAll('[data-dl-child]').forEach(b => b.addEventListener('click', () => {
      const url = `/api/projects/${id}/artifacts/${b.dataset.dlChild}/file?access_token=${encodeURIComponent(API.getToken() || '')}`;
      window.open(url, '_blank');
    }));
    modal.querySelectorAll('[data-preview]').forEach(b => b.addEventListener('click', () => {
      ProjectDetailPage._showChildPreview(id, b.dataset.preview, b.dataset.mime, b.dataset.fn, b.dataset.static);
    }));
    // R3: Figma push 버튼 (메인 + 자식 공통, data-figma-push 속성)
    modal.querySelectorAll('[data-figma-push]').forEach(b => b.addEventListener('click', async () => {
      const aid = b.dataset.figmaPush;
      const fn = b.dataset.fn;
      const orig = b.textContent;
      b.disabled = true; b.textContent = '⏳ 발급 중...';
      try {
        const r = await API.post(`/projects/${id}/figma-push`, { artifactId: parseInt(aid, 10) });
        if (r.ok && r.chromeUrl) {
          window.open(r.chromeUrl, '_blank');
          b.textContent = '✓ Chrome 열림';
        } else if (r.ok) {
          alert(`captureId: ${r.captureId || '(미발급)'}\nfigmaendpoint: ${r.figmaendpoint || '(없음)'}\n응답 미리보기: ${(r.content_preview || '').slice(0, 200)}`);
          b.textContent = '⚠ 부분성공';
        } else {
          alert(`Figma push 실패: ${r.message || r.error || '알 수 없음'}`);
          b.textContent = '✗ 실패';
        }
      } catch (e) {
        alert(`API 호출 실패: ${e.message}`);
        b.textContent = '✗ 에러';
      }
      setTimeout(() => { b.textContent = orig; b.disabled = false; }, 4000);
    }));
  },

  _showChildPreview(projectId, childId, mime, fileName, staticUrl) {
    const token = encodeURIComponent(API.getToken() || '');
    // M-fix: 미리보기는 /static/output/<rel> 우선 — iframe 의 상대 경로 src(이미지/CSS) 가
    //   자기 폴더 기준으로 해석되어야 깨지지 않음. static_url 없으면 /file fallback.
    const url = (staticUrl ? staticUrl : `/api/projects/${projectId}/artifacts/${childId}/file`)
      + `?access_token=${token}&t=${Date.now()}`;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    let bodyHtml = '';
    if (mime.startsWith('text/html')) {
      // sandbox 에서 allow-same-origin 유지 (이미지 인증용). allow-scripts 도 유지.
      bodyHtml = `<iframe src="${url}" sandbox="allow-same-origin allow-scripts" style="width:100%;height:75vh;border:1px solid var(--border);background:#fff"></iframe>`;
    } else if (mime.startsWith('image/')) {
      bodyHtml = `<img src="${url}" style="max-width:100%;max-height:75vh;background:#f5f5f5;display:block;margin:auto" alt="${escapeHtml(fileName)}">`;
    } else if (mime.includes('pdf')) {
      bodyHtml = `<embed src="${url}" type="application/pdf" style="width:100%;height:75vh">`;
    } else {
      bodyHtml = '<div class="empty">미리보기 미지원</div>';
    }
    modal.innerHTML = `
      <div class="modal" style="max-width:90vw;max-height:90vh">
        <div class="flex-between mb-2">
          <h3>${escapeHtml(fileName)}</h3>
          <div class="flex gap-2">
            <a class="btn btn-sm" href="${url}" target="_blank">새 탭</a>
            <button class="btn btn-sm" data-close>닫기</button>
          </div>
        </div>
        ${bodyHtml}
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  // T1-B: 산출물 폴더 트리 브라우저 — 좌측 트리 / 우측 파일 본문 미리보기
  async showFileBrowserModal() {
    const id = ProjectDetailPage._projectId;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = '<div class="modal" style="max-width:900px;height:80vh;display:flex;flex-direction:column"><div style="padding:2rem;text-align:center">로딩 중...</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    let data;
    try { data = await API.get(`/projects/${id}/files`); }
    catch (err) {
      modal.querySelector('.modal').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div><div style="text-align:right;margin-top:1rem"><button class="btn" data-close>닫기</button></div>`;
      modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
      return;
    }

    const renderTree = (nodes, prefix = '') => nodes.map(n => {
      const fullPath = prefix ? `${prefix}/${n.name}` : n.name;
      if (n.type === 'dir') {
        const badge = n.is_latest ? '<span class="badge badge-active text-xs" style="margin-left:4px">최신</span>' : '';
        return `
          <div style="margin:.3rem 0">
            <div style="font-weight:600;cursor:pointer" data-toggle="${fullPath}">📁 ${escapeHtml(n.name)} ${badge}</div>
            <div data-children-of="${fullPath}" style="margin-left:1rem;${n.is_latest ? '' : 'display:none'}">
              ${n.children ? renderTree(n.children, fullPath) : '<div class="text-muted text-xs">(하위 폴더 — 펼치기 필요)</div>'}
            </div>
          </div>
        `;
      } else {
        const sizeKB = n.size != null ? `${(n.size/1024).toFixed(1)}KB` : '';
        return `
          <div style="margin:.2rem 0 .2rem 1.2rem;cursor:pointer" data-file="${escapeHtml(fullPath)}" data-name="${escapeHtml(n.name)}">
            📄 <span class="file-name">${escapeHtml(n.name)}</span>
            <span class="text-xs text-muted">${sizeKB}</span>
          </div>
        `;
      }
    }).join('');

    modal.querySelector('.modal').innerHTML = `
      <div class="flex-between mb-3">
        <div>
          <h2 style="margin:0">📁 산출물 폴더</h2>
          <div class="text-muted text-sm">code: ${escapeHtml(data.project.code)} · latest: <strong>${escapeHtml(data.latest || '없음')}</strong></div>
        </div>
        <button class="btn-secondary-sm" data-close>✕</button>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:280px 1fr;gap:1rem;overflow:hidden">
        <div id="fb-tree" style="overflow-y:auto;font-size:.86rem;padding-right:.5rem;border-right:1px solid var(--border)">
          ${data.tree.length === 0 ? '<div class="empty">산출물 폴더가 비어있습니다</div>' : renderTree(data.tree)}
        </div>
        <div id="fb-preview" style="overflow-y:auto;padding-left:.5rem">
          <div class="text-muted" style="text-align:center;padding:2rem">왼쪽 파일을 클릭하면 미리보기가 표시됩니다</div>
        </div>
      </div>
    `;

    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));

    // 폴더 접고 펼치기
    modal.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', () => {
        const target = modal.querySelector(`[data-children-of="${el.dataset.toggle}"]`);
        if (target) target.style.display = target.style.display === 'none' ? 'block' : 'none';
      });
    });

    // 파일 클릭 → 우측 미리보기
    modal.querySelectorAll('[data-file]').forEach(el => {
      el.addEventListener('click', async () => {
        const preview = modal.querySelector('#fb-preview');
        const filePath = el.dataset.file;
        const fileName = el.dataset.name;
        preview.innerHTML = `<div class="text-muted" style="text-align:center;padding:2rem">로딩 중...</div>`;
        try {
          const r = await API.get(`/projects/${id}/files/raw?path=${encodeURIComponent(filePath)}`);
          const ext = r.ext;
          let rendered;
          if (ext === '.md' && typeof marked !== 'undefined') {
            rendered = `<div class="artifact-content">${marked.parse(r.content)}</div>`;
          } else if (ext === '.html') {
            rendered = `<div class="text-muted text-sm mb-2">HTML 미리보기 (텍스트):</div><pre style="white-space:pre-wrap;font-size:.78rem">${escapeHtml(r.content)}</pre>`;
          } else if (ext === '.json') {
            try { rendered = `<pre style="white-space:pre-wrap;font-size:.78rem">${escapeHtml(JSON.stringify(JSON.parse(r.content), null, 2))}</pre>`; }
            catch { rendered = `<pre style="white-space:pre-wrap;font-size:.78rem">${escapeHtml(r.content)}</pre>`; }
          } else {
            rendered = `<pre style="white-space:pre-wrap;font-size:.78rem">${escapeHtml(r.content)}</pre>`;
          }
          preview.innerHTML = `
            <div class="flex-between mb-2">
              <strong>${escapeHtml(fileName)}</strong>
              <span class="text-xs text-muted">${(r.size/1024).toFixed(1)}KB · ${escapeHtml(r.ext)}</span>
            </div>
            ${rendered}
          `;
        } catch (err) {
          preview.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    });
  },

  showSettingsModal(project) {
    const id = ProjectDetailPage._projectId;
    const user = API.getUser();
    const canEdit = user.role === 'admin' || user.role === 'member';
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="flex-between mb-3">
          <h2>프로젝트 설정</h2>
          <button class="btn btn-sm" data-close>닫기</button>
        </div>
        <div class="form-group"><label>이름</label><input id="s-name" value="${escapeHtml(project.name)}" ${!canEdit?'disabled':''}></div>
        <div class="form-group"><label>코드</label><input value="${escapeHtml(project.code)}" disabled></div>
        <div class="form-group"><label>설명</label><textarea id="s-desc" rows="3" ${!canEdit?'disabled':''}>${escapeHtml(project.description || '')}</textarea></div>
        <div class="form-group"><label>상태</label>
          <select id="s-status" ${!canEdit?'disabled':''}>
            ${['active','paused','completed','archived'].map(s => `<option value="${s}" ${project.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        ${canEdit ? `
          <div class="modal-footer">
            <button class="btn-danger-sm" id="archive-btn" style="margin-right:auto">아카이브</button>
            <button class="btn" data-close>취소</button>
            <button class="btn-primary-sm" id="save-btn">저장</button>
          </div>
        ` : ''}
        <div id="save-alert"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    if (canEdit) {
      document.getElementById('save-btn').addEventListener('click', async () => {
        try {
          await API.put(`/projects/${id}`, {
            name: document.getElementById('s-name').value,
            description: document.getElementById('s-desc').value
          });
          const status = document.getElementById('s-status').value;
          if (status !== project.status && status !== 'archived') {
            await API.put(`/projects/${id}/status`, { status });
          }
          document.getElementById('save-alert').innerHTML = '<div class="alert alert-success mt-2">저장됨</div>';
        } catch (err) { alert(err.message); }
      });
      document.getElementById('archive-btn').addEventListener('click', async () => {
        if (!confirm('이 프로젝트를 아카이브 처리하시겠습니까?')) return;
        await API.put(`/projects/${id}/status`, { status: 'archived' });
        modal.remove();
        Router.navigate('/projects');
      });
    }
  }
};

// 페이지 이탈 시 폴링 중단
window.addEventListener('beforeunload', () => ProjectDetailPage.stopPolling());
