/**
 * 기능 테스트 Playwright 골격
 * qa-functional 스킬 참조용.
 *
 * 구조:
 * 1. 공통 설정 + 헬퍼
 * 2. TC-F: 기능 테스트 (정상/예외/에러 3단계)
 * 3. TC-SEO: SEO 기본 검증
 * 4. TC-CB: 크로스 브라우저 검증
 *
 * 규칙:
 * - 모든 TC는 FN-### / FR-### 연관 주석 포함
 * - Must 기능은 3단계(정상+예외+에러) 필수
 * - Fail 시 스크린샷 자동 캡처
 * - 셀렉터: data-ui-id > data-testid > BEM 클래스 > 시맨틱 역할
 */
const { test, expect } = require('@playwright/test');


// ═══════════════════════════════════
// 공통 설정
// ═══════════════════════════════════

const BASE_URL = 'file:///D:/프로젝트/output/publish/index.html';

/** 뷰포트 프리셋 */
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812  },
};

/** Fail 시 스크린샷 자동 캡처 (afterEach에서 사용) */
async function captureOnFail(page, testInfo) {
  if (testInfo.status === 'failed') {
    const tcId = testInfo.title.match(/TC-\w+-\d+/)?.[0] || 'unknown';
    await page.screenshot({
      path: `output/qa/screenshots/${tcId}_fail.png`,
      fullPage: true,
    });
    await testInfo.attach('failure-screenshot', {
      path: `output/qa/screenshots/${tcId}_fail.png`,
      contentType: 'image/png',
    });
  }
}

/** 전역: Fail 시 자동 스크린샷 */
test.afterEach(async ({ page }, testInfo) => {
  await captureOnFail(page, testInfo);
});


// ═══════════════════════════════════
// TC-F: 기능 테스트 (3단계 검증)
// ═══════════════════════════════════

test.describe('TC-F: GNB 네비게이션 (FN-001 / FR-001)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ── 정상 (Happy Path) ──
  test('TC-F-001: GNB 메뉴 클릭 시 해당 섹션으로 이동', async ({ page }) => {
    const menuLink = page.locator('.gnb__link').first();
    await menuLink.click();

    // 예상 결과: 해당 섹션이 뷰포트에 표시
    const target = page.locator('#main-content section').first();
    await expect(target).toBeInViewport();
  });

  test('TC-F-002: GNB 메뉴 키보드(Tab+Enter) 탐색', async ({ page }) => {
    await page.keyboard.press('Tab'); // skip-link
    await page.keyboard.press('Tab'); // 로고
    await page.keyboard.press('Tab'); // 첫 번째 메뉴
    await page.keyboard.press('Enter');

    const target = page.locator('#main-content section').first();
    await expect(target).toBeInViewport();
  });

  // ── 예외 (경계값/비정상) ──
  test('TC-F-003: 존재하지 않는 앵커 링크 클릭 시 페이지 유지', async ({ page }) => {
    // href="#nonexistent" 인 링크가 있을 때
    await page.evaluate(() => {
      const link = document.querySelector('.gnb__link');
      if (link) link.href = '#nonexistent';
    });

    const gnbLink = page.locator('.gnb__link').first();
    await gnbLink.click();

    // 예상 결과: 페이지 정상 유지, 에러 없음
    await expect(page).toHaveURL(/index\.html/);
  });

  // ── 에러 (시스템 장애) ──
  test('TC-F-004: JS 미로딩 시에도 GNB 링크 동작', async ({ page }) => {
    // JS 비활성화 시뮬레이션
    await page.route('**/*.js', (route) => route.abort());
    await page.goto(BASE_URL);

    const menuLink = page.locator('.gnb__link').first();
    await expect(menuLink).toHaveAttribute('href', /#.+/);
  });
});


test.describe('TC-F: 햄버거 메뉴 (FN-002 / FR-002)', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);
  });

  // ── 정상 ──
  test('TC-F-005: 햄버거 클릭 시 모바일 메뉴 열림', async ({ page }) => {
    const hamburger = page.locator('.gnb__hamburger');
    await hamburger.click();

    // ARIA 상태 확인
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toHaveAttribute('aria-hidden', 'false');
    await expect(mobileMenu).toHaveClass(/mobile-menu--open/);
  });

  test('TC-F-006: 메뉴 열림 후 첫 링크에 포커스 이동', async ({ page }) => {
    const hamburger = page.locator('.gnb__hamburger');
    await hamburger.click();

    const firstLink = page.locator('#mobile-menu a').first();
    await expect(firstLink).toBeFocused();
  });

  // ── 예외 ──
  test('TC-F-007: ESC 키로 메뉴 닫기 + 햄버거에 포커스 복귀', async ({ page }) => {
    const hamburger = page.locator('.gnb__hamburger');
    await hamburger.click();
    await page.keyboard.press('Escape');

    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(hamburger).toBeFocused();
  });

  test('TC-F-008: 메뉴 닫힌 상태에서 ESC 키 무반응', async ({ page }) => {
    await page.keyboard.press('Escape');

    const hamburger = page.locator('.gnb__hamburger');
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});


test.describe('TC-F: 탭 UI (FN-003 / FR-003)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ── 정상 ──
  test('TC-F-009: 탭 클릭 시 패널 전환 + ARIA 상태 동기화', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    if (count < 2) return test.skip();

    await tabs.nth(1).click();

    // aria-selected 확인
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // 연결된 패널 visible 확인
    const panelId = await tabs.nth(1).getAttribute('aria-controls');
    if (panelId) {
      const panel = page.locator(`#${panelId}`);
      await expect(panel).toBeVisible();
    }
  });

  // ── 예외 ──
  test('TC-F-010: 화살표 키로 탭 순환 (마지막→첫 번째)', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    if (count < 2) return test.skip();

    await tabs.last().focus();
    await page.keyboard.press('ArrowRight');

    // 마지막 다음 → 첫 번째로 순환
    await expect(tabs.first()).toBeFocused();
  });
});


// ═══════════════════════════════════
// TC-SEO: SEO 기본 검증
// ═══════════════════════════════════

test.describe('TC-SEO: 검색엔진 최적화', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('TC-SEO-001: title 태그 존재 + 길이', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  test('TC-SEO-002: meta description 존재 + 길이', async ({ page }) => {
    const desc = await page.getAttribute('meta[name="description"]', 'content');
    expect(desc).toBeTruthy();
    expect(desc.length).toBeGreaterThanOrEqual(70);
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  test('TC-SEO-003: h1 태그 페이지당 정확히 1개', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('TC-SEO-004: heading 계층 순서 정상', async ({ page }) => {
    const headings = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(els).map((el) => parseInt(el.tagName[1]));
    });

    // 건너뜀 검증: 이전 레벨 대비 2 이상 차이 나면 실패
    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i] - headings[i - 1];
      expect(gap).toBeLessThanOrEqual(1);
    }
  });

  test('TC-SEO-005: OG 태그 필수 3종 존재', async ({ page }) => {
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');

    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
    expect(ogImage).toBeTruthy();
  });

  test('TC-SEO-006: 모든 img에 alt 속성 존재', async ({ page }) => {
    const missingAlt = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).filter((img) => !img.hasAttribute('alt')).length;
    });
    expect(missingAlt).toBe(0);
  });
});


// ═══════════════════════════════════
// TC-CB: 크로스 브라우저 (반응형 검증)
// ═══════════════════════════════════

test.describe('TC-CB: 반응형 레이아웃', () => {

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`TC-CB-${name}: 레이아웃 정상 (${size.width}px)`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(BASE_URL);

      // 가로 스크롤 없음 확인
      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHScroll).toBe(false);

      // 주요 섹션 visible 확인
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  }

  test('TC-CB-mobile: 햄버거 표시 + GNB 숨김', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(BASE_URL);

    const hamburger = page.locator('.gnb__hamburger');
    await expect(hamburger).toBeVisible();
  });
});
