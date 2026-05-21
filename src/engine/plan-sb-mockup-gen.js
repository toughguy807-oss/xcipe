// plan-sb 산출물 후처리 — data.json screens를 순회하며 screen별 mockup HTML을 LLM으로 생성
// 생성된 HTML은 {outputDir}/mockups/{screenId}-pc.html 로 저장
// post-process.js가 이후 puppeteer로 PNG 캡쳐 + uiImagePath 주입

const fs = require('fs');
const path = require('path');

function buildMockupSystemPrompt() {
  return `당신은 시니어 기획자입니다. 화면설계서(SB) 좌측 60% 패널에 들어갈 **흑백 와이어프레임 목업**을 생성합니다. 이것은 디자인 시안이 아니라 **영역·기능 매핑 참고 자료**입니다.

## 핵심 원칙: 디자인 결정 금지

SB는 기획 단계 문서이고 디자인 결정은 **design-knowledge → design-layout → design-ui** 스킬이 전담합니다. SB 목업에서 다음을 **절대 결정하지 마십시오**:
- 브랜드 컬러 (primary/accent hex 값)
- 타이포그래피 (Noto Serif, 세리프/산세리프 선택)
- 비주얼 스타일 (그라디언트, 이미지, 장식)
- 시각적 감성 (따뜻한 톤, 모던 등)

## 규칙

- 1152px 너비. 높이는 내용에 맞춰 자연스럽게
- **색상은 무채색만**:
  - 배경: #ffffff / #fafafa / #f0f0f0 (영역 구분용 그레이 단계)
  - 테두리: #e0e0e0 / #cccccc
  - 텍스트: #333333 (본문) / #666666 (보조) / #999999 (라벨)
  - 플레이스홀더: #e0e0e0 (이미지 자리), #f5f5f5 (버튼/카드 배경)
- **마커 컬러만 예외**: 빨강 #e4002b (식별 목적, 브랜드와 무관)
- **폰트는 system sans만**: \`font-family: system-ui, -apple-system, sans-serif\`
- **금지**: 그라디언트, 브랜드 컬러 hex, 세리프·커스텀 폰트, 외부 이미지(picsum.photos 포함), 애니메이션
- 콘텐츠 텍스트는 실제 의미있는 1~2줄 (lorem ipsum 금지)
- 각 영역에 \`<div class="mark">\` + \`<span class="marker">N</span>\`
- 컨테이너에 \`overflow:hidden\` 금지 (마커 잘림 방지)
- 이미지 자리: \`<div style="background:#e0e0e0; color:#666; text-align:center; padding:60px 20px;">[이미지]</div>\` 처럼 플레이스홀더
- <!DOCTYPE html>부터 </html>까지 완전한 단일 HTML
- 설명·코드펜스·META·주석 없이 순수 HTML만 출력`;
}

function buildMockupUserPrompt(screen, data, project) {
  const theme = data.theme || {};
  const overview = data.overview || {};
  const desc = (screen.descriptions || []).map(d => {
    const items = (d.items || []).map(i => `   - ${i.text || i}`).join('\n');
    return `  [${d.marker}] ${d.label}\n${items}`;
  }).join('\n');

  return `# 프로젝트
- 이름: ${project.name || data.project?.title || ''}
- 요약: ${overview.purpose || ''}

# 이 화면
- ID: ${screen.id}
- 화면명: ${screen.interfaceName}
- 뷰포트: ${screen.viewportType || 'PC'}
- IA 경로: ${screen.location || ''}

# Description 마커 (HTML의 .marker 번호와 1:1 매칭)
${desc || '(없음)'}

# HTML 목업 요구 (흑백 와이어프레임만 — 디자인 결정 금지)

색상 팔레트 (이 외 금지):
- 배경/영역: #ffffff, #fafafa, #f0f0f0
- 테두리: #e0e0e0, #cccccc
- 텍스트: #333333, #666666, #999999
- 플레이스홀더 박스: #e0e0e0, #f5f5f5
- 마커 전용 빨강: #e4002b

폰트: \`font-family: system-ui, -apple-system, "Segoe UI", sans-serif\` 고정. 세리프·커스텀 폰트 절대 금지.

레이아웃:
- ${screen.viewportType === 'Mobile' ? 'Mobile 390px' : 'PC 1152px'} 너비, 높이 자연스럽게
- 영역 구분은 얇은 테두리(#e0e0e0) 또는 배경 그레이 단계로만
- 이미지 자리는 \`<div style="background:#e0e0e0;color:#666;padding:60px 20px;text-align:center;">[이미지]</div>\` 플레이스홀더

마커 — **요소별 서브 넘버링** (description의 items[]와 1:1 매칭):
- description의 marker N 영역 내부에 있는 **각 요소(element)에 개별 서브 마커** 부여
- 서브 마커 형식: \`N-1\`, \`N-2\`, \`N-3\` ... (description items 순서와 동일)
- 영역 자체에는 큰 마커(N)만 두고, 영역 테두리로 시각 구분
- 각 요소(로고/버튼/링크 등)는 \`<span class="marker">N-n</span>\`으로 감쌈
- **마커 텍스트가 "1-1" 등 3자 이상** 이므로 원형 대신 pill 형태
- 필수 CSS (그대로 포함):
  .mark { position:relative; outline:2px dashed #e4002b; outline-offset:4px; overflow:visible; }
  .mark-area { position:relative; outline:2px solid #e4002b; outline-offset:8px; overflow:visible; padding:4px; }
  .marker { position:absolute; top:-12px; left:-12px; min-width:28px; height:24px; padding:0 8px; background:#e4002b; color:#fff; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.25); white-space:nowrap; font-family:system-ui,sans-serif; }
  .marker--area { top:-14px; left:-14px; min-width:32px; height:28px; font-size:14px; background:#c00000; }

예시 (영역 1 = GNB, items = [로고, 메뉴, 매장, 문의, 예약]):
  <header class="mark-area">
    <span class="marker marker--area">1</span>
    <div class="logo mark"><span class="marker">1-1</span>로고</div>
    <nav>
      <a class="mark"><span class="marker">1-2</span>메뉴</a>
      <a class="mark"><span class="marker">1-3</span>매장</a>
      <a class="mark"><span class="marker">1-4</span>문의</a>
    </nav>
    <button class="mark"><span class="marker">1-5</span>예약</button>
  </header>

- 컨테이너에 \`overflow:hidden\` 금지

콘텐츠:
- 실제 의미있는 1~2줄 텍스트 (lorem ipsum 금지)
- 장식 카피("시선을 사로잡는" 등) 금지
- 브랜드명·슬로건은 실제 텍스트만 사용

금지:
- 브랜드 컬러 hex (#B5623B, #F5EFE6 등 프로젝트 톤)
- 그라디언트, box-shadow (마커 외)
- 외부 이미지 URL (picsum.photos 포함)
- 세리프·커스텀 폰트

지금 <!DOCTYPE html>부터 순수 HTML만 출력하세요.`;
}

function extractHtml(text) {
  if (!text) return '';
  // 코드펜스 제거
  const fence = text.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  const body = fence ? fence[1] : text;
  // <!DOCTYPE html> 첫 등장부터 </html>까지
  const m = body.match(/<!DOCTYPE[\s\S]*?<\/html>/i);
  if (m) return m[0];
  // fallback: <html로 시작하는 블록
  const m2 = body.match(/<html[\s\S]*?<\/html>/i);
  return m2 ? m2[0] : body.trim();
}

async function generateMockups({ dataJsonPath, outputDir, project, provider, maxScreens = 10 }) {
  if (!fs.existsSync(dataJsonPath)) {
    return { ok: false, error: 'data.json not found', generated: 0 };
  }

  let data;
  try { data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8')); }
  catch (e) { return { ok: false, error: `data.json 파싱 실패: ${e.message}`, generated: 0 }; }

  const mockupsDir = path.join(outputDir, 'mockups');
  fs.mkdirSync(mockupsDir, { recursive: true });

  const designScreens = (data.screens || []).filter(s => (s.screenType || 'design') === 'design').slice(0, maxScreens);
  if (designScreens.length === 0) {
    return { ok: true, generated: 0, skipped: '디자인 화면 없음' };
  }

  const systemPrompt = buildMockupSystemPrompt();
  let generated = 0;
  const errors = [];

  for (const screen of designScreens) {
    const variant = (screen.viewportType || 'PC').toLowerCase().includes('mobile') ? 'mo' : 'pc';
    const outPath = path.join(mockupsDir, `${screen.id}-${variant}.html`);
    if (fs.existsSync(outPath)) {
      console.log(`[mockup-gen] 기존 파일 유지: ${path.basename(outPath)}`);
      continue;
    }

    const userPrompt = buildMockupUserPrompt(screen, data, project);
    try {
      const r = await provider.sendMessage({
        task: 'execute-skill',
        skillName: 'plan-sb-mockup',
        context: { name: project.name, code: project.code, prompt: project.prompt },
        systemPrompt,
        userPrompt
      });
      if (!r || !r.ok) {
        errors.push(`${screen.id}: ${r?.error || 'no response'}`);
        continue;
      }
      const html = extractHtml(r.content || r.text || '');
      if (!html || html.length < 200) {
        errors.push(`${screen.id}: HTML too short (${html.length}B)`);
        continue;
      }
      fs.writeFileSync(outPath, html, 'utf8');
      generated++;
      console.log(`[mockup-gen] ✓ ${screen.id}-${variant}.html (${html.length}B)`);
    } catch (e) {
      errors.push(`${screen.id}: ${e.message}`);
    }
  }

  return { ok: true, generated, totalScreens: designScreens.length, errors };
}

module.exports = { generateMockups };
