// 1. 載入首頁開場動畫
if (document.querySelector('.hero-wrapper')) {
  import('./modules/splash.js');
}

import { initHero } from './modules/hero.js';
import { renderBentoGrid } from './modules/bentoGrid.js';
import { initModal } from './modules/modal.js';
import { renderChangelog } from './modules/timeline.js';
import { initFeedbackForm } from './modules/feedback.js';
import { initNavbar } from './modules/navbar.js';
import { initLogoRotator } from './modules/logoRotator.js'; 

document.addEventListener('DOMContentLoaded', () => {
  console.log("初始化成功");

  initNavbar();
  initLogoRotator(); 

  if (document.getElementById('hero-reveal-window')) {
    initHero();
  }

  const exploreBtn = document.getElementById('btn-explore');
  const moreToolsSection = document.getElementById('more-tools');
  let isRendered = false; // 用於記錄是否已渲染，避免重複點擊時重新 request/render

  if (exploreBtn && moreToolsSection) {
    // 預先初始化 Modal 事件（關閉按鈕、Esc 鍵、背景點擊）
    initModal();

    exploreBtn.addEventListener('click', async () => {
      // 顯示工具區域
      moreToolsSection.style.display = 'block';

      // 首次點擊時才載入與渲染 Bento Grid
      if (!isRendered) {
        await renderBentoGrid();
        isRendered = true;
      }

      // 流暢平滑捲動至工具區塊
      moreToolsSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (document.getElementById('announcements-container')) {
    renderChangelog();
  }

  if (document.getElementById('feedback-form')) {
    initFeedbackForm();
  }
});