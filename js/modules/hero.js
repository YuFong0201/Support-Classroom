/**
 * Hero Module (支援動畫影片/GIF與圖片動態切換 + View Transitions 共享元素形變開啟彈窗)
 */
import { openModal } from './modal.js';

export function initHero() {
  const btnExplore = document.getElementById('btn-explore');
  const moreToolsSection = document.getElementById('more-tools');

  if (btnExplore && moreToolsSection) {
    btnExplore.addEventListener('click', () => {
      moreToolsSection.style.display = 'block';
      moreToolsSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  loadFeaturedTool();
}

async function loadFeaturedTool() {
  const heroWindow = document.getElementById('hero-reveal-window');
  const heroText = document.getElementById('hero-reveal-text');

  if (!heroWindow || !heroText) return;

  try {
    const response = await fetch('data/tools.json');
    if (!response.ok) throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);

    const tools = await response.json();
    const featuredTool = tools.find(t => t.featured === true) || tools[0];

    if (featuredTool) {
      const videoPath = featuredTool.preview?.video;
      const imagePath = featuredTool.preview?.image || 'https://via.placeholder.com/1200x600/111827/ffffff?text=Featured+Tool';

      let mediaHtml = '';
      if (videoPath) {
        mediaHtml = `<video src="${videoPath}" autoplay loop muted playsinline class="hero-reveal-img" id="hero-reveal-media"></video>`;
      } else {
        mediaHtml = `<img src="${imagePath}" alt="${featuredTool.title}" class="hero-reveal-img" id="hero-reveal-media" />`;
      }

      const oldMedia = heroWindow.querySelector('.hero-reveal-img');
      if (oldMedia) oldMedia.remove();

      heroWindow.insertAdjacentHTML('afterbegin', mediaHtml);
      heroText.textContent = `最近更新：${featuredTool.title} ${featuredTool.version || ''}`;

      const mediaEl = document.getElementById('hero-reveal-media');
      if (mediaEl) {
        mediaEl.onerror = () => {
          console.warn('Hero 媒體資源載入失敗，切換為預備圖');
          heroWindow.insertAdjacentHTML('afterbegin', `<img src="https://via.placeholder.com/1200x600/111827/ffffff?text=Media+Not+Found" class="hero-reveal-img" />`);
          mediaEl.remove();
        };
      }

      // 點擊 Hero 大圖卡時，以 heroWindow 作為共享元素起點平滑延展成 Modal 頂部預覽大圖
      heroWindow.onclick = () => openModal(featuredTool, heroWindow);
    }
  } catch (error) {
    console.error('無法載入 Hero 熱門工具資料：', error);
    heroText.textContent = '最近更新：國小數學無限題庫 V1.0.0';
  }
}