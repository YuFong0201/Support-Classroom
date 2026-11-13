// 1. 載入首頁開場動畫（並加上防卡死保險：若 splash.js 異常，2.5 秒後自動解除遮罩）
if (document.querySelector('.hero-wrapper')) {
  import('./modules/splash.js').catch((err) => {
    console.warn('Splash 模組載入略過：', err);
    document.documentElement.classList.remove('is-splashing');
    document.querySelector('.hero-wrapper')?.classList.add('splash-ready');
  });
}

import { initHero } from './modules/hero.js';
import { renderBentoGrid } from './modules/bentoGrid.js';
import { initModal, openCustomModal } from './modules/modal.js';
import { renderChangelog } from './modules/timeline.js';
import { initFeedbackForm } from './modules/feedback.js';
import { initNavbar } from './modules/navbar.js';
import { initLogoRotator } from './modules/logoRotator.js';
import { initPageTransition } from './modules/pageTransition.js';
import { initMagneticButtons, initKineticTitles, initClickRipples } from './modules/microInteractions.js';

/**
 * 建立極簡白色懸浮快速回頂部進度環 (Scroll Progress Ring)
 */
function createScrollProgressRing(getLenis) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-progress-btn';
  btn.setAttribute('aria-label', '回到頁面頂部');
  btn.title = '回到頂部';

  const radius = 23;
  const circumference = 2 * Math.PI * radius;

  btn.innerHTML = `
    <svg class="progress-ring-svg" viewBox="0 0 52 52" aria-hidden="true">
      <defs>
        <linearGradient id="brandProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#009FB7" />
          <stop offset="100%" stop-color="#FE4A49" />
        </linearGradient>
      </defs>
      <circle class="progress-ring-track" cx="26" cy="26" r="${radius}"></circle>
      <circle class="progress-ring-circle" cx="26" cy="26" r="${radius}"
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"></circle>
    </svg>
    <svg class="progress-ring-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 19V5"></path>
      <path d="M5 12l7-7 7 7"></path>
    </svg>
  `;

  document.body.appendChild(btn);

  const progressCircle = btn.querySelector('.progress-ring-circle');

  btn.addEventListener('click', () => {
    const lenisInstance = getLenis();
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { duration: 1.1 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  return (scrollY) => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;
    const offset = circumference * (1 - progress);

    progressCircle.style.strokeDashoffset = offset;

    if (scrollY > 220) {
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  };
}

/**
 * Hero 視差景深滾動計算 (Parallax Depth Scroll)
 */
function updateHeroParallax(scrollY) {
  const heroWrapper = document.querySelector('.hero-wrapper');
  const heroWindow = document.getElementById('hero-reveal-window');
  const heroBadge = document.querySelector('.hero-badge-tag');
  const scrollCue = document.getElementById('hero-scroll-cue');
  const glow1 = document.querySelector('.hero-glow-1');
  const glow2 = document.querySelector('.hero-glow-2');

  if (!heroWrapper || !heroWindow) return;

  const heroHeight = heroWrapper.offsetHeight || window.innerHeight;
  const progress = Math.min(Math.max(scrollY / heroHeight, 0), 1);

  const scale = 1 - progress * 0.06;
  const translateY = scrollY * 0.18;
  const opacity = 1 - progress * 0.65;

  heroWindow.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
  heroWindow.style.opacity = opacity;

  if (heroBadge) {
    heroBadge.style.transform = `translate3d(0, ${scrollY * 0.1}px, 0)`;
    heroBadge.style.opacity = Math.max(1 - progress * 1.6, 0);
  }
  if (scrollCue) {
    scrollCue.style.opacity = Math.max(1 - progress * 2.5, 0);
  }

  if (glow1) {
    glow1.style.transform = `translate3d(0, ${-scrollY * 0.25}px, 0)`;
  }
  if (glow2) {
    glow2.style.transform = `translate3d(0, ${scrollY * 0.22}px, 0)`;
  }
}

/**
 * 初始化適度阻尼絲滑滾動 (Lenis Smooth Scroll) 並連動視差與進度環
 */
function initSmoothScroll(onScrollCallback) {
  if (!window.Lenis) {
    window.addEventListener('scroll', () => {
      onScrollCallback(window.scrollY);
    }, { passive: true });
    return null;
  }

  const lenis = new window.Lenis({
    lerp: 0.14,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.2,
    smoothWheel: true
  });

  lenis.on('scroll', ({ scroll }) => {
    onScrollCallback(scroll);
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // 當 Modal 彈窗或 Ctrl+K 指令面板打開時暫停背景頁面滾動，關閉時恢復
  const syncLenisLock = () => {
    const modal = document.getElementById('tool-modal');
    const isModalOpen = modal && (modal.style.display === 'flex' || modal.style.display === 'block');
    const isCmdOpen = document.body.classList.contains('cmd-open');
    if (isModalOpen || isCmdOpen) {
      lenis.stop();
    } else {
      lenis.start();
    }
  };

  const modal = document.getElementById('tool-modal');
  if (modal) {
    const modalObserver = new MutationObserver(syncLenisLock);
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['style'] });
  }

  const bodyObserver = new MutationObserver(syncLenisLock);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return lenis;
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("初始化成功");

  let lenis = null;

  const updateProgressRing = createScrollProgressRing(() => lenis);

  const handleScrollUpdate = (scrollY) => {
    updateHeroParallax(scrollY);
    updateProgressRing(scrollY);
  };

  initPageTransition();

  lenis = initSmoothScroll(handleScrollUpdate);
  handleScrollUpdate(window.scrollY);

  initNavbar();
  initLogoRotator();
  initModal();

  // 安全動態載入快捷指令面板 (Ctrl+K / Cmd+K)，即使尚未建立該檔案也不影響網站運作
  try {
    const { initCommandPalette } = await import('./modules/commandPalette.js');
    initCommandPalette();
  } catch (err) {
    console.warn('commandPalette.js 尚未建立或載入失敗，已自動跳過：', err.message);
  }

  initMagneticButtons();
  if (typeof initClickRipples === 'function') {
    initClickRipples();
  }
  initKineticTitles();

  if (document.getElementById('hero-reveal-window')) {
    initHero();
  }

  const scrollCue = document.getElementById('hero-scroll-cue');
  const moreToolsSection = document.getElementById('more-tools');
  if (scrollCue && moreToolsSection) {
    scrollCue.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(moreToolsSection, { offset: -60, duration: 1.1 });
      } else {
        moreToolsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (document.getElementById('bento-container')) {
    await renderBentoGrid();
    initKineticTitles(document.getElementById('bento-container'));
    if (lenis) lenis.resize();
    handleScrollUpdate(window.scrollY);
  }

  // 安全動態載入空間物理「重力彈珠工具收藏盒」
  if (document.getElementById('physics-toybox-section')) {
    try {
      const { initPhysicsToybox } = await import('./modules/physicsToybox.js');
      await initPhysicsToybox();
      if (lenis) lenis.resize();
    } catch (err) {
      console.warn('physicsToybox.js 尚未建立或載入失敗，已自動跳過：', err.message);
    }
  }

  const yearSpan = document.getElementById('footer-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const aboutBtn = document.getElementById('btn-about-me');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      openCustomModal(`
        <div style="padding: 2rem 1.5rem; text-align: center;">
          <img src="assets/images/logo.png" alt="奇老師" style="width: 72px; height: 72px; border-radius: 18px; margin-bottom: 1rem; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
          <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #111827;">關於本站</h2>
          <p style="color: #009FB7; font-weight: 700; font-size: 0.95rem; margin: 0 0 1.25rem 0;">旨在教學工具共享的平台</p>
          <p style="color: #4B5563; line-height: 1.75; font-size: 1rem; text-align: left; max-width: 480px; margin: 0 auto 1.5rem auto;">
            作者為現任國小特教老師，興趣是在課餘時間製作各種自己在教學上會用到的工具，也希望能幫助其他老師們在教學現場更輕鬆、學生學習更投入。如果你有任何關於新工具的點子或改進建議，歡迎隨時透過「意見回饋」告訴我！
          </p>
          <a href="feedback.html" class="modal-action-btn" style="display: inline-block; width: auto; padding: 10px 28px;">前往意見回饋</a>
        </div>
      `);
    });
  }

  if (document.getElementById('announcements-container')) {
    renderChangelog();
    if (lenis) lenis.resize();
  }

  if (document.getElementById('feedback-form')) {
    initFeedbackForm();
  }
});