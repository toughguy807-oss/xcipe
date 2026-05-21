/**
 * 인터랙션 스타터 골격
 * publish-interaction 스킬 참조용.
 *
 * 구조:
 * 1. IIFE로 전역 오염 방지
 * 2. 유틸리티 헬퍼
 * 3. 컴포넌트별 init 함수
 * 4. DOMContentLoaded에서 일괄 초기화
 *
 * 규칙:
 * - 바닐라 JS 전용 (jQuery/프레임워크 금지)
 * - 이벤트 위임 패턴 사용
 * - ARIA 상태 즉시 동기화
 * - prefers-reduced-motion 존중
 * - 요소 미존재 시 가드 처리
 */
(function() {
  'use strict';

  // ═══════════════════════════════
  // 유틸리티
  // ═══════════════════════════════

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** 모션 축소 설정 확인 */
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 스크롤 최적화 래퍼 */
  function onScroll(callback) {
    let ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          callback();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }


  // ═══════════════════════════════
  // 컴포넌트: GNB 스크롤 축소
  // ═══════════════════════════════

  function initGNBScroll() {
    const header = $('.header');
    if (!header) return;

    const SCROLL_THRESHOLD = 50;

    onScroll(function() {
      if (window.scrollY > SCROLL_THRESHOLD) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }
    });
  }


  // ═══════════════════════════════
  // 컴포넌트: 햄버거 메뉴
  // ═══════════════════════════════

  function initHamburger() {
    const btn = $('.gnb__hamburger');
    const menu = $('#mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function() {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      btn.setAttribute('aria-expanded', String(!isOpen));
      menu.setAttribute('aria-hidden', String(isOpen));
      menu.classList.toggle('mobile-menu--open', !isOpen);

      // 열릴 때 첫 메뉴에 포커스
      if (!isOpen) {
        const firstLink = $('a', menu);
        if (firstLink) firstLink.focus();
      }
    });

    // ESC로 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        btn.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        menu.classList.remove('mobile-menu--open');
        btn.focus();
      }
    });
  }


  // ═══════════════════════════════
  // 컴포넌트: 탭
  // ═══════════════════════════════

  function initTabs() {
    $$('[role="tablist"]').forEach(function(tablist) {
      const tabs = $$('[role="tab"]', tablist);
      const panels = tabs.map(function(tab) {
        return $('#' + tab.getAttribute('aria-controls'));
      });

      function activateTab(index) {
        tabs.forEach(function(t, i) {
          t.setAttribute('aria-selected', String(i === index));
          t.setAttribute('tabindex', i === index ? '0' : '-1');
        });
        panels.forEach(function(p, i) {
          if (!p) return;
          p.hidden = i !== index;
        });
      }

      // 클릭
      tablist.addEventListener('click', function(e) {
        const tab = e.target.closest('[role="tab"]');
        if (!tab) return;
        const idx = tabs.indexOf(tab);
        if (idx >= 0) activateTab(idx);
      });

      // 키보드 좌우 화살표
      tablist.addEventListener('keydown', function(e) {
        const tab = e.target.closest('[role="tab"]');
        if (!tab) return;
        const idx = tabs.indexOf(tab);

        let newIdx = idx;
        if (e.key === 'ArrowRight') newIdx = (idx + 1) % tabs.length;
        if (e.key === 'ArrowLeft') newIdx = (idx - 1 + tabs.length) % tabs.length;

        if (newIdx !== idx) {
          e.preventDefault();
          activateTab(newIdx);
          tabs[newIdx].focus();
        }
      });
    });
  }


  // ═══════════════════════════════
  // 컴포넌트: 아코디언
  // ═══════════════════════════════

  function initAccordion() {
    $$('[data-accordion]').forEach(function(accordion) {
      accordion.addEventListener('click', function(e) {
        const trigger = e.target.closest('[aria-expanded]');
        if (!trigger) return;

        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        const panelId = trigger.getAttribute('aria-controls');
        const panel = $('#' + panelId);
        if (!panel) return;

        trigger.setAttribute('aria-expanded', String(!isOpen));
        panel.hidden = isOpen;
      });

      // Enter/Space 토글
      accordion.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          const trigger = e.target.closest('[aria-expanded]');
          if (!trigger) return;
          e.preventDefault();
          trigger.click();
        }
      });
    });
  }


  // ═══════════════════════════════
  // 컴포넌트: 스크롤 애니메이션
  // ═══════════════════════════════

  function initScrollAnimation() {
    // 모션 축소 설정 존중
    if (prefersReducedMotion()) return;

    const targets = $$('.scroll-fade-in');
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-fade-in--visible');
          observer.unobserve(entry.target); // 1회성 — 메모리 해제
        }
      });
    }, { threshold: 0.1 });

    targets.forEach(function(el) {
      observer.observe(el);
    });
  }


  // ═══════════════════════════════
  // 초기화
  // ═══════════════════════════════

  document.addEventListener('DOMContentLoaded', function() {
    initGNBScroll();
    initHamburger();
    initTabs();
    initAccordion();
    initScrollAnimation();

    // 프로젝트별 추가 컴포넌트는 여기에 init 함수 호출 추가
  });

})();
