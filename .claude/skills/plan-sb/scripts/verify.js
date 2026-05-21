#!/usr/bin/env node
/**
 * 화면설계서 출력물 검증기 v2
 * Usage: node verify.js <output.html> [--output-dir path] [--context-dir path] [--data-file path]
 *
 * 검증 항목:
 * - [사전] wireframe[] type 유효성: element-types.js 등록 타입 외 사용 → WARN
 * - viewport: 1280×720 고정 확인
 * - overflow: .slide 내 scrollHeight > 720px → WARN
 * - 콘텐츠 밀도: 콘텐츠 영역 < 30% → WARN
 * - MSG Case 인라인: design 슬라이드 내 .msg-case 존재 → ERROR
 * - Description overflow: .description-panel scrollHeight > 실제 높이 → WARN
 * - fnRef 누락: 연계 모드(context/fn.md 존재)인데 fnRef 빈 슬라이드 → WARN
 */

const path = require('path');
const fs = require('fs');
const { ELEMENT_TYPES } = require('./lib/element-types');

const VALID_TYPES = new Set(ELEMENT_TYPES.map(e => e.type));

/**
 * items[] category 필드 커버리지 검증 (Phase 3.3 — 2026-05-11)
 * 액션 키워드(버튼/CTA/링크/제출 등)가 label에 있는 description에서
 * items[]에 category 키 있는 항목이 0건이면 WARN.
 * @param {Array} screens - data.json의 screens 배열
 * @returns {string[]} 경고 메시지 배열
 */
function checkItemsCategoryCoverage(screens) {
  const warnings = [];
  const VALID_CATEGORIES = new Set([
    'trigger', 'enable_cond', 'action', 'success', 'failure', 'state', 'permission'
  ]);
  // 액션 키워드 — description.label에 등장 시 category 작성 의무
  const ACTION_KW = /(버튼|btn|CTA|결제|로그인|로그아웃|회원가입|가입|신청|예약|문의|확인|취소|검색|선택|제출|전송|구매|주문|등록|저장|삭제|수정|편집|발송|업로드|다운로드|공유|좋아요|찜|즐겨찾기|북마크|구독|팔로우|토글|스위치|체크박스|드롭다운|탭|페이지네이션|페이징|더보기|infinite|페이지\s*전환|이동|링크)/i;

  screens.forEach((screen, si) => {
    if (!['design', 'msgCase', 'component'].includes(screen.screenType || 'design')) return;
    if (!Array.isArray(screen.descriptions)) return;

    screen.descriptions.forEach((d, di) => {
      const label = d.label || '';
      const items = Array.isArray(d.items) ? d.items : [];
      if (items.length === 0) return;

      const isActionable = ACTION_KW.test(label);
      const categorizedItems = items.filter(it => it && VALID_CATEGORIES.has(it.category));
      const invalidCategoryItems = items.filter(it => it && it.category && !VALID_CATEGORIES.has(it.category));

      // 무효 category enum (오타/잘못된 값) → WARN
      invalidCategoryItems.forEach(it => {
        warnings.push(
          `[WARN-PRE] Screen ${si + 1} marker ${d.marker} "${label}" — 무효 category: "${it.category}" (유효: trigger/enable_cond/action/success/failure/state/permission)`
        );
      });

      // 액션 키워드 있는데 category 0건 → WARN (category 작성 의무 영역)
      if (isActionable && categorizedItems.length === 0) {
        warnings.push(
          `[WARN-PRE] Screen ${si + 1} marker ${d.marker} "${label}" — 액션 요소이나 items[].category 0건 (CTA/액션 요소는 category 필수: trigger + action + success + failure 최소 4종 권장)`
        );
      }

      // 액션 키워드 있고 category 일부만 있는데 핵심 4종(trigger/action/success/failure) 중 누락 → INFO 수준 WARN
      if (isActionable && categorizedItems.length > 0) {
        const cats = new Set(categorizedItems.map(it => it.category));
        const missing = ['trigger', 'action', 'success', 'failure'].filter(c => !cats.has(c));
        if (missing.length > 0) {
          warnings.push(
            `[WARN-PRE] Screen ${si + 1} marker ${d.marker} "${label}" — category 일부 누락: ${missing.join('/')} (CTA 표준 4종: trigger+action+success+failure)`
          );
        }
      }
    });
  });
  return warnings;
}

/**
 * wireframe[] JSON에서 미등록 타입 사전 검증 (HTML 렌더링 전)
 * @param {Array} screens - data.json의 screens 배열
 * @returns {string[]} 경고 메시지 배열
 */
function checkWireframeTypes(screens) {
  const warnings = [];
  screens.forEach((screen, si) => {
    if (!screen.wireframe) return;
    const check = (els, prefix) => {
      els.forEach(el => {
        if (!VALID_TYPES.has(el.type)) {
          warnings.push(`[WARN-PRE] Screen ${si + 1} (${screen.interfaceName || ''}) ${prefix}미등록 type: "${el.type}"`);
        }
        if (el.children) check(el.children, 'children > ');
      });
    };
    check(screen.wireframe, '');
  });
  return warnings;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output-dir' && args[i + 1]) {
      flags.outputDir = args[++i];
    } else if (args[i] === '--context-dir' && args[i + 1]) {
      flags.contextDir = args[++i];
    } else if (args[i] === '--data-file' && args[i + 1]) {
      flags.dataFile = args[++i];
    } else if (!args[i].startsWith('--')) {
      positional.push(args[i]);
    }
  }

  const htmlFile = positional[0];
  if (!htmlFile) {
    console.error('Usage: node verify.js <output.html> [--output-dir path] [--context-dir path]');
    console.error('Example: node verify.js output/PROJECT/20240101/SB_P001_v1.html');
    process.exit(1);
  }

  const htmlPath = path.resolve(htmlFile);
  if (!fs.existsSync(htmlPath)) {
    console.error(`File not found: ${htmlPath}`);
    process.exit(1);
  }

  const verifyDir = flags.outputDir
    ? path.resolve(flags.outputDir)
    : path.join(path.dirname(htmlPath), 'verify');

  if (!fs.existsSync(verifyDir)) fs.mkdirSync(verifyDir, { recursive: true });

  // 모드-산출물 정합성 검증 (Self-Check #27, #28 / 2026-04-27 추가)
  const projectRoot = path.dirname(path.dirname(path.dirname(htmlPath)));
  const inputDir = path.join(projectRoot, 'input');
  const contextPath = path.join(path.dirname(path.dirname(htmlPath)), 'context', 'sb.md');
  const modeIssues = [];
  if (fs.existsSync(inputDir)) {
    const files = fs.readdirSync(inputDir);
    const hasScreenshot = files.some(f => /screenshot.*\.png$/i.test(f) || /-pc\.png$/i.test(f) && !f.startsWith('mockup'));
    const hasMockup = files.some(f => /mockup.*\.(png|html)$/i.test(f) || /curation.*\.png$/i.test(f));
    let declaredMode = null;
    if (fs.existsSync(contextPath)) {
      const ctx = fs.readFileSync(contextPath, 'utf8');
      const m = ctx.match(/Mode\s*([ABC])/);
      if (m) declaredMode = m[1];
    }
    if (declaredMode === 'B' && !hasScreenshot) modeIssues.push(`[ERROR] Mode B 선언했으나 input/screenshot.png 또는 현행 캡쳐 없음 — visit.js 미실행 의심`);
    if (declaredMode === 'C' && !hasScreenshot) modeIssues.push(`[ERROR] Mode C 선언했으나 현행 캡쳐 없음 — Mode A로 선언하거나 visit.js 실행 후 재진행`);
    if (declaredMode === 'A' && hasScreenshot && !hasMockup) modeIssues.push(`[WARN] Mode A 선언했으나 mockup 자료 없이 screenshot만 있음 — Mode B로 변경 검토`);
  }

  // 연계 모드 판별: context/fn.md 존재 여부
  let isLinkedMode = false;
  if (flags.contextDir) {
    isLinkedMode = fs.existsSync(path.join(path.resolve(flags.contextDir), 'fn.md'));
  } else {
    // htmlFile 기준 상위 경로에서 context/fn.md 탐색 (output/{project}/{date}/... → output/{project}/context/fn.md)
    const dateDir = path.dirname(htmlPath);
    const projectDir = path.dirname(dateDir);
    const contextFn = path.join(projectDir, 'context', 'fn.md');
    isLinkedMode = fs.existsSync(contextFn);
  }

  // ─── [사전 검증] wireframe[] 타입 유효성 + items[] category 누락 ──────
  const preWarns = [];
  if (flags.dataFile) {
    const dataPath = path.resolve(flags.dataFile);
    if (fs.existsSync(dataPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        if (data.screens) {
          const typeWarns = checkWireframeTypes(data.screens);
          preWarns.push(...typeWarns);
          // ⑨ items[] category 누락 자동 감지 (Phase 3.3 — 2026-05-11 추가)
          const catWarns = checkItemsCategoryCoverage(data.screens);
          preWarns.push(...catWarns);
        }
      } catch (e) {
        preWarns.push(`[WARN-PRE] data-file 파싱 실패: ${e.message}`);
      }
    } else {
      preWarns.push(`[WARN-PRE] data-file 없음: ${dataPath}`);
    }
  }

  console.log(`[INFO] 검증 대상: ${htmlPath}`);
  console.log(`[INFO] 연계 모드: ${isLinkedMode ? 'YES (context/fn.md 존재)' : 'NO (독립 모드)'}`);
  console.log(`[INFO] 스크린샷 저장: ${verifyDir}`);
  if (flags.dataFile) {
    console.log(`[INFO] 사전 검증 (wireframe 타입): ${preWarns.length === 0 ? 'PASS' : `${preWarns.length}건 WARN`}`);
  }
  console.log('');

  // Playwright 자동 설치
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.log('[INFO] Playwright not found. 자동 설치 중...');
    const { execSync } = require('child_process');
    const installDir = path.join(__dirname, '..');
    execSync('npm install playwright --no-save', { stdio: 'inherit', cwd: installDir });
    execSync('npx playwright install chromium', { stdio: 'inherit', cwd: installDir });
    playwright = require('playwright');
  }

  // 1920×1080 뷰포트로 실행 (v2 PDF 규격과 일치)
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const baseName = path.basename(htmlFile, '.html');

  // ─── 검증 수행 (브라우저 내 평가) ───────────────────────────────────────

  const verifyResults = await page.evaluate((linkedMode) => {
    const SLIDE_HEIGHT = 1080;
    const results = {
      slideCount: 0,
      errors: [],
      warns: [],
      infos: []
    };

    const slides = document.querySelectorAll('.slide');
    results.slideCount = slides.length;

    if (slides.length === 0) {
      results.errors.push('[ERROR] .slide 요소를 찾을 수 없음 — v2 template.js 출력이 맞는지 확인');
      return results;
    }

    slides.forEach((slide, idx) => {
      const slideNum = idx + 1;
      const slideId = slide.dataset.slideId || `slide-${slideNum}`;
      const slideType = slide.dataset.slideType || 'unknown';

      // ① overflow 감지: .slide-body 또는 .slide 전체 scrollHeight
      const body = slide.querySelector('.slide-body');
      const checkEl = body || slide;
      const scrollH = checkEl.scrollHeight;
      const clientH = checkEl.clientHeight;
      if (scrollH > clientH + 2) {
        const overflowPx = scrollH - clientH;
        // 30px 이상 잘림 = 명백한 시각 결함 → ERROR
        if (overflowPx > 30) {
          results.errors.push(
            `[ERROR] 슬라이드 ${slideNum} (${slideId}) 슬라이드 본문 잘림: scrollHeight=${scrollH}px > clientHeight=${clientH}px (+${overflowPx}px) — 콘텐츠 줄이거나 분할 필요`
          );
        } else {
          results.warns.push(
            `[WARN] 슬라이드 ${slideNum} (${slideId}) overflow: +${overflowPx}px`
          );
        }
      }

      // ② 콘텐츠 밀도: 슬라이드 전체 면적 대비 콘텐츠 요소 면적
      // 슬라이드 타입·콘텐츠 종류별 차등 임계 (케이스 적은 정상 슬라이드 false-positive 방지)
      const contentEls = slide.querySelectorAll('p, li, td, th, .desc-row, .wireframe-area img, .wireframe-placeholder');
      let contentArea = 0;
      contentEls.forEach(el => {
        const r = el.getBoundingClientRect();
        contentArea += r.width * r.height;
      });
      const slideArea = 1280 * SLIDE_HEIGHT;
      const density = contentArea / slideArea;
      // 임계값 결정: msgCase는 케이스 수에 따라 완화 (1~4건이면 15%, 5건+ 25%, design은 30%)
      const rowCount = slide.querySelectorAll('tbody tr').length;
      let densityThreshold;
      if (slideType === 'msgCase') {
        densityThreshold = rowCount < 5 ? 0.15 : 0.25;
      } else if (slideType === 'description' || slideType === 'component') {
        densityThreshold = 0.20;
      } else {
        densityThreshold = 0.30;
      }
      if (density < densityThreshold && !['cover', 'end', 'divider', 'overview', 'history'].includes(slideType)) {
        results.warns.push(
          `[WARN] 슬라이드 ${slideNum} (${slideId}) 콘텐츠 밀도 부족: ${(density * 100).toFixed(1)}% < ${(densityThreshold * 100).toFixed(0)}% (${slideType}, ${rowCount}행)`
        );
      }

      // ③ MSG Case 인라인 혼재: design 슬라이드 내 .msg-case 존재 → ERROR
      if (slideType === 'design') {
        const inlineMsgCase = slide.querySelector('.msg-case');
        if (inlineMsgCase) {
          results.errors.push(
            `[ERROR] 슬라이드 ${slideNum} (${slideId}) design 슬라이드 내 .msg-case 인라인 혼재 — 별도 슬라이드로 분리 필요`
          );
        }
      }

      // ④ Description 패널 overflow — 잘림 절대 방지 (ERROR 격상)
      const descPanel = slide.querySelector('.description-panel');
      if (descPanel) {
        const dpScroll = descPanel.scrollHeight;
        const dpClient = descPanel.clientHeight;
        const overflow = dpScroll - dpClient;
        if (overflow > 2) {
          const hasContinuation = descPanel.querySelector('.desc-continuation, .desc-cont-row');
          if (hasContinuation) {
            results.infos.push(
              `[INFO] 슬라이드 ${slideNum} (${slideId}) description overflow 감지 — continuation 분할 적용됨`
            );
          } else if (overflow > 30) {
            // 30px 이상 잘림 = 사용자가 인지할 정도 → ERROR (전달 불가)
            results.errors.push(
              `[ERROR] 슬라이드 ${slideNum} (${slideId}) description-panel 잘림: scrollHeight=${dpScroll}px > clientHeight=${dpClient}px (+${overflow}px) — DESC_MAX_HEIGHT 보강 필요`
            );
          } else {
            results.warns.push(
              `[WARN] 슬라이드 ${slideNum} (${slideId}) description-panel overflow: +${overflow}px — continuation 분할 필요`
            );
          }
        }
        // description 행 수 7개 이상이면 분할 확인
        const descRows = descPanel.querySelectorAll('tr:not(.desc-common-row):not(.desc-section-row):not(.desc-cont-row)');
        if (descRows.length >= 7) {
          const hasCont = descPanel.querySelector('.desc-continuation, .desc-cont-row');
          if (!hasCont) {
            results.warns.push(
              `[WARN] 슬라이드 ${slideNum} (${slideId}) description ${descRows.length}개 — 7개 이상은 continuation 분할 권장`
            );
          }
        }
        // 슬라이드 넘버링 잘림·빈 값 감지 — 고객 전달 직접 영향 → ERROR
        const slideNumEl = slide.querySelector('.slide-num');
        if (slideNumEl) {
          const r = slideNumEl.getBoundingClientRect();
          const slideRect = slide.getBoundingClientRect();
          const text = (slideNumEl.textContent || '').trim();
          if (!text) {
            results.errors.push(
              `[ERROR] 슬라이드 ${slideNum} (${slideId}) 넘버링 빈 값 — DOMContentLoaded JS 실패 또는 .slide-num 누락`
            );
          } else if (r.right > slideRect.right - 4 || r.bottom > slideRect.bottom - 4 || r.top < slideRect.top || r.left < slideRect.left) {
            results.errors.push(
              `[ERROR] 슬라이드 ${slideNum} (${slideId}) 넘버링 위치 슬라이드 경계 초과 — CSS overflow 또는 위치 오류`
            );
          }
        } else {
          // .slide-num 자체가 없으면 (cover/divider/end 제외) ERROR
          if (!['cover', 'end', 'divider'].includes(slideType)) {
            results.errors.push(
              `[ERROR] 슬라이드 ${slideNum} (${slideId}) .slide-num 요소 누락 — renderSlideFooter 미적용 또는 footer 누락`
            );
          }
        }
        // 모바일 폰 프레임 시각 검증
        const mobileWrapper = slide.querySelector('.ui-capture[data-viewport="Mobile"] .ui-capture-inner');
        if (mobileWrapper) {
          const mw = mobileWrapper.getBoundingClientRect();
          if (mw.width < 380 && mw.height < 700) {
            // 폭+높이 둘 다 미달 = 명백한 시각 결함 → ERROR
            results.errors.push(
              `[ERROR] 슬라이드 ${slideNum} (${slideId}) 모바일 폰 프레임 너무 작음: ${Math.round(mw.width)}×${Math.round(mw.height)} (권장 460×980) — 고객 식별 불가`
            );
          } else if (mw.width < 380 || mw.height < 700) {
            results.warns.push(
              `[WARN] 슬라이드 ${slideNum} (${slideId}) 모바일 폰 프레임 작음: ${Math.round(mw.width)}×${Math.round(mw.height)} — 460×980 권장`
            );
          }
          const mobileImg = mobileWrapper.querySelector('img');
          if (mobileImg) {
            const ir = mobileImg.getBoundingClientRect();
            if (ir.bottom > mw.bottom + 4) {
              results.errors.push(
                `[ERROR] 슬라이드 ${slideNum} (${slideId}) 모바일 UI 이미지 폰 프레임 밖으로 잘림: ${Math.round(ir.bottom - mw.bottom)}px 초과`
              );
            }
          }
        }
      }

      // ⑤ fnRef 참조 누락: 연계 모드인데 description이 있는 design 슬라이드에 fnRef 없음
      if (linkedMode && slideType === 'design') {
        const descRows = slide.querySelectorAll('.desc-row');
        const fnRefSection = slide.querySelector('.fn-ref-section');
        if (descRows.length > 0 && !fnRefSection) {
          results.warns.push(
            `[WARN] 슬라이드 ${slideNum} (${slideId}) 연계 모드인데 fnRef 섹션 없음 — description fnRef 필드 확인 필요`
          );
        }
      }

      // ⑥ Placeholder 텍스트 감지 (Self-Check #20 시각 완결성, Phase 3.1)
      // "[Mobile UI 캡처 이미지 영역]", "[PC UI 캡처 이미지 영역]", "[이미지]", "[미확인]", "[미정]" 등
      if (slideType === 'design') {
        const wireframeArea = slide.querySelector('.wireframe-area');
        if (wireframeArea) {
          const text = wireframeArea.textContent || '';
          const placeholderPatterns = [
            /\[(?:Mobile|PC|MO)\s*UI\s*캡(쳐|처)\s*이미지\s*영역\]/i,
            /\[이미지\]/,
            /\[미확인[^\]]*\]/,
            /\[미정[^\]]*\]/,
            /\[TODO[^\]]*\]/i,
            /\[타겟\s*콘텐츠\s*필요/i
          ];
          for (const re of placeholderPatterns) {
            if (re.test(text)) {
              // placeholder 텍스트는 미완성 산출물 = 고객 전달 불가 → ERROR
              results.errors.push(
                `[ERROR] 슬라이드 ${slideNum} (${slideId}) placeholder 텍스트 감지 — uiImagePath 미주입 또는 [미확인]/[TODO] 항목 존재 (고객 전달 불가)`
              );
              break;
            }
          }
        }
      }

      // ⑦ 시각 완결성 5축 채점 (Phase 3.1)
      if (['design', 'msgCase', 'component'].includes(slideType)) {
        const score = { wireframeFilled: 0, descriptionFilled: 0, markerMatch: 0, placeholderFree: 0, contentDensity: 0 };
        // 7-1: wireframe 영역 채워짐
        const wf = slide.querySelector('.wireframe-area');
        if (wf) {
          const wfChildren = wf.querySelectorAll('*').length;
          score.wireframeFilled = wfChildren > 5 ? 1 : 0;
        } else {
          score.wireframeFilled = 1; // wireframe 없는 슬라이드 (msgCase 등)
        }
        // 7-2: Description 채워짐
        const dp = slide.querySelector('.description-panel');
        const tableRows = slide.querySelectorAll('table tr').length;
        score.descriptionFilled = (dp && dp.textContent.trim().length > 50) || tableRows > 2 ? 1 : 0;
        // 7-3: 마커 일치 (descriptions vs wireframe markers)
        const wfMarkers = slide.querySelectorAll('.wireframe-area .marker, .wireframe-area [data-marker]').length;
        const descMarkers = slide.querySelectorAll('.description-panel .desc-marker, .description-panel [data-marker]').length;
        score.markerMatch = wfMarkers === descMarkers ? 1 : 0;
        // 7-4: placeholder 없음 (위 ⑥ 결과 활용)
        const wText = (wf?.textContent || '') + (dp?.textContent || '');
        score.placeholderFree = !/\[(?:Mobile|PC|MO|이미지|미확인|미정|TODO)/i.test(wText) ? 1 : 0;
        // 7-5: 콘텐츠 밀도 (슬라이드 타입별 차등 임계 — 위에서 계산된 densityThreshold 재사용)
        score.contentDensity = density >= densityThreshold ? 1 : 0;

        const total = score.wireframeFilled + score.descriptionFilled + score.markerMatch + score.placeholderFree + score.contentDensity;
        if (total < 3) {
          results.errors.push(
            `[ERROR] 슬라이드 ${slideNum} (${slideId}) 시각 완결성 ${total}/5 — 고객 전달 불가 (wf:${score.wireframeFilled} desc:${score.descriptionFilled} marker:${score.markerMatch} ph-free:${score.placeholderFree} density:${score.contentDensity})`
          );
        } else if (total < 5) {
          results.warns.push(
            `[WARN] 슬라이드 ${slideNum} (${slideId}) 시각 완결성 ${total}/5 — 보강 권장`
          );
        }
      }

      // ⑧ overlay 좌표 정합성 검증 (Phase 3.2 — 2026-05-11 추가)
      // 위치 정합성: overlay가 wireframe-area 내부에 있고, 크기·겹침이 정당한가
      if (['design', 'msgCase'].includes(slideType)) {
        const overlays = slide.querySelectorAll('.marker-overlay');
        const wfAreaEl = slide.querySelector('.wireframe-area');
        if (wfAreaEl && overlays.length > 0) {
          const wfR = wfAreaEl.getBoundingClientRect();
          const wfArea = wfR.width * wfR.height;
          const ovList = Array.from(overlays).map(ov => ({ el: ov, rect: ov.getBoundingClientRect() }));

          ovList.forEach((o, oi) => {
            const r = o.rect;
            const TOL = 1; // 1px 허용 오차

            // 8-1: 경계 오버플로우 (wireframe-area 밖)
            const overflowL = r.left < wfR.left - TOL;
            const overflowT = r.top < wfR.top - TOL;
            const overflowR = r.right > wfR.right + TOL;
            const overflowB = r.bottom > wfR.bottom + TOL;
            if (overflowL || overflowT || overflowR || overflowB) {
              const dirs = [overflowL && 'left', overflowT && 'top', overflowR && 'right', overflowB && 'bottom'].filter(Boolean).join('/');
              results.errors.push(
                `[ERROR] 슬라이드 ${slideNum} (${slideId}) overlay #${oi + 1} 경계 오버플로우 (${dirs}) — wireframe-area 밖으로 벗어남`
              );
            }

            // 8-2: 너무 작음 (좌표 미세 추정 의심) — 20px 미만
            if (r.width < 20 || r.height < 20) {
              results.warns.push(
                `[WARN] 슬라이드 ${slideNum} (${slideId}) overlay #${oi + 1} 너무 작음 (${r.width.toFixed(0)}×${r.height.toFixed(0)}px) — 좌표 추정 의심, overlay-helper.js 측정 권장`
              );
            }

            // 8-3: 너무 큼 (wireframe-area 85% 초과) — 좌표 과도 확대 의심
            const ovArea = r.width * r.height;
            if (wfArea > 0 && ovArea > wfArea * 0.85) {
              results.warns.push(
                `[WARN] 슬라이드 ${slideNum} (${slideId}) overlay #${oi + 1} 너무 큼 (wireframe-area ${((ovArea / wfArea) * 100).toFixed(0)}%) — 좌표 과도 확대 의심`
              );
            }

            // 8-4: 인접 overlay와 50%+ 겹침 (중복 추정 의심)
            for (let oj = oi + 1; oj < ovList.length; oj++) {
              const r2 = ovList[oj].rect;
              const ix = Math.min(r.right, r2.right) - Math.max(r.left, r2.left);
              const iy = Math.min(r.bottom, r2.bottom) - Math.max(r.top, r2.top);
              if (ix > 0 && iy > 0) {
                const inter = ix * iy;
                const smallerArea = Math.min(ovArea, r2.width * r2.height);
                if (smallerArea > 0 && inter / smallerArea > 0.5) {
                  results.warns.push(
                    `[WARN] 슬라이드 ${slideNum} (${slideId}) overlay #${oi + 1}↔#${oj + 1} 50%+ 겹침 — 좌표 중복 추정 의심`
                  );
                }
              }
            }
          });
        }
      }
    });

    return results;
  }, isLinkedMode);

  // ─── 스크린샷 캡처 ───────────────────────────────────────────────────────

  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    const filename = path.join(verifyDir, `${baseName}-slide${String(i + 1).padStart(3, '0')}.png`);
    await slides[i].screenshot({ path: filename });
    console.log(`[SHOT] Slide ${i + 1}: ${path.basename(filename)}`);
  }

  await browser.close();

  // ─── 결과 출력 ───────────────────────────────────────────────────────────

  const hasError = verifyResults.errors.length > 0;

  console.log('');
  console.log('='.repeat(60));
  console.log('[검증 결과] plan-sb v2 — 1920×1080 landscape');
  console.log('='.repeat(60));
  console.log(`입력: ${htmlPath}`);
  console.log(`총 슬라이드: ${verifyResults.slideCount}개`);
  console.log(`스크린샷: ${verifyDir}`);
  console.log('');

  if (preWarns.length === 0 && verifyResults.errors.length === 0 && verifyResults.warns.length === 0) {
    console.log('[PASS] 모든 검증 항목 통과');
  }

  preWarns.forEach(w => console.log(w));
  modeIssues.forEach(m => {
    console.log(m);
    if (m.startsWith('[ERROR]')) verifyResults.errors.push(m);
    else verifyResults.warns.push(m);
  });
  verifyResults.errors.forEach(e => console.log(e));
  verifyResults.warns.forEach(w => console.log(w));

  console.log('');
  console.log(`PRE-WARN: ${preWarns.length}건 / ERROR: ${verifyResults.errors.length}건 / WARN: ${verifyResults.warns.length}건`);
  console.log('='.repeat(60));

  // ERROR 1건 이상이면 비정상 종료
  if (hasError) {
    process.exit(2);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
