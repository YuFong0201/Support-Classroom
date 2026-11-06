/**
 * Hero Module (支援動畫影片/GIF與圖片動態切換)
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
      // 1. 判斷是否有影片路徑，若有影片則生成 <video>，無影片則生成 <img>
      const videoPath = featuredTool.preview?.video;
      const imagePath = featuredTool.preview?.image || 'https://via.placeholder.com/1200x600/111827/ffffff?text=Featured+Tool';

      let mediaHtml = '';
      if (videoPath) {
        // 自動播放 (autoplay)、靜音 (muted)、循環 (loop)、手機相容 (playsinline)
        mediaHtml = `<video src="${videoPath}" autoplay loop muted playsinline class="hero-reveal-img" id="hero-reveal-media"></video>`;
      } else {
        mediaHtml = `<img src="${imagePath}" alt="${featuredTool.title}" class="hero-reveal-img" id="hero-reveal-media" />`;
      }

      // 2. 將媒體元素塞入 Hero 視窗中（保留原本的 overlay 標題）
      const overlay = heroWindow.querySelector('.hero-reveal-overlay');
      // 先移除舊的媒體標籤（避免重複堆疊）
      const oldMedia = heroWindow.querySelector('.hero-reveal-img');
      if (oldMedia) oldMedia.remove();

      // 插入全新的媒體 DOM
      heroWindow.insertAdjacentHTML('afterbegin', mediaHtml);

      // 3. 更新顯示標題
      heroText.textContent = `經典熱門工具：${featuredTool.title} ${featuredTool.version || ''}`;

      // 4. 圖片/影片加載失敗防呆處理
      const mediaEl = document.getElementById('hero-reveal-media');
      if (mediaEl) {
        mediaEl.onerror = () => {
          console.warn('Hero 媒體資源載入失敗，切換為預備圖');
          heroWindow.insertAdjacentHTML('afterbegin', `<img src="https://via.placeholder.com/1200x600/111827/ffffff?text=Media+Not+Found" class="hero-reveal-img" />`);
          mediaEl.remove();
        };
      }

      // 5. 點擊開啟 Modal 彈窗
      heroWindow.onclick = () => openModal(featuredTool);
    }
  } catch (error) {
    console.error('無法載入 Hero 熱門工具資料：', error);
    heroText.textContent = '經典熱門工具：國小數學無限題庫 V1.0';
  }
}