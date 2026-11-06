import { openModal } from './modal.js';

export async function renderBentoGrid() {
  const container = document.getElementById('bento-container');
  if (!container) return;

  try {
    const response = await fetch('data/tools.json');
    if (!response.ok) throw new Error('無法讀取 tools.json');
    const tools = await response.json();

    // 1. 組合「標題區塊」與「卡片網格容器」
    const headerHtml = `
      <div class="section-title-wrapper">
        <h2 class="section-title">全系列教學工具箱</h2>
        <p class="section-subtitle">點擊任意圖卡查看工具細節與使用說明</p>
      </div>
    `;

    const cardsHtml = tools.map(tool => {
      const isFeatured = tool.featured ? 'featured' : '';
      const statusClass = `status-${tool.status}`;
      
      let statusBadge = '';
      if (tool.status === 'maintenance') statusBadge = '<span class="card-badge">維護中暫停使用</span>';
      if (tool.status === 'coming_soon') statusBadge = '<span class="card-badge">即將推出</span>';

      return `
        <div class="bento-card ${isFeatured} ${statusClass}" data-tilt data-id="${tool.id}">
          ${statusBadge}
          <div class="preview-wrapper">
            <img src="${tool.preview?.image || 'assets/images/previews/default.jpg'}" alt="${tool.title}" class="preview-img" />
            ${tool.preview?.video ? `<video src="${tool.preview.video}" loop muted playsinline class="preview-video"></video>` : ''}
          </div>
          <div class="card-content">
            <div class="platform-icons">
              ${(tool.platforms || []).map(p => `<span>${p}</span>`).join('')}
            </div>
            <h3 class="card-title">${tool.title}</h3>
          </div>
        </div>
      `;
    }).join('');

    // 2. 將標題與包覆在 .bento-grid 裡的卡片一次寫入容器
    container.innerHTML = `
      ${headerHtml}
      <div class="bento-grid">
        ${cardsHtml}
      </div>
    `;

    initCardEvents(tools);
  } catch (error) {
    console.error('無法載入工具資料：', error);
  }
}

function initCardEvents(tools) {
  // 1. 初始化 VanillaTilt 3D 微幅傾斜效果
  if (window.VanillaTilt) {
    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
      max: 10,
      speed: 400,
      glare: true,
      "max-glare": 0.2
    });
  }

  // 2. 卡片事件 Listeners
  document.querySelectorAll('.bento-card').forEach(card => {
    const toolId = card.getAttribute('data-id');
    const currentTool = tools.find(t => String(t.id) === String(toolId));

    // 滑鼠移入播放縮圖影片，移出暫停並歸零 (包含瀏覽器自動播放政策保護)
    const video = card.querySelector('.preview-video');
    if (video) {
      card.addEventListener('mouseenter', () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // 自動播放受限時靜默處理
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        video.pause();
        if (video.readyState >= 2) {
          video.currentTime = 0;
        }
      });
    }

    // 點擊卡片開啟 Modal 彈窗
    card.addEventListener('click', () => {
      if (currentTool) {
        openModal(currentTool);
      }
    });
  });
}