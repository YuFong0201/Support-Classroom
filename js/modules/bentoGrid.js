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
      <div class="section-title-wrapper wow-anime-header">
        <h2 class="section-title">全系列教學工具</h2>
        <p class="section-subtitle">點擊圖卡查看工具細節與使用說明</p>
      </div>
    `;

    const cardsHtml = tools.map((tool, index) => {
      const isFeatured = tool.featured ? 'featured' : '';
      const statusClass = `status-${tool.status}`;
      const slideDirection = index % 2 === 0 ? 'left' : 'right';
      
      let statusBadge = '';
      if (tool.status === 'maintenance') statusBadge = '<span class="card-badge">維護中暫停使用</span>';
      if (tool.status === 'coming_soon') statusBadge = '<span class="card-badge">即將推出</span>';

      return `
        <div class="bento-card wow-anime-card ${isFeatured} ${statusClass}" 
             data-tilt 
             data-id="${tool.id}" 
             data-slide="${slideDirection}" 
             data-index="${index}">
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
      <div class="bento-grid" id="bento-grid">
        ${cardsHtml}
      </div>
    `;

    initCardEvents(tools);
    initSpotlightEffect();
    initScrollAnimations();
  } catch (error) {
    console.error('無法載入工具資料：', error);
  }
}

/**
 * 游標聚光燈光暈邊框追蹤 (Spotlight Glow Border)
 */
function initSpotlightEffect() {
  const grid = document.getElementById('bento-grid');
  const cards = document.querySelectorAll('.bento-card');
  if (!grid || !cards.length) return;

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let rafId = null;

  grid.addEventListener('mousemove', (e) => {
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        card.style.setProperty('--spotlight-opacity', '1');
      });
    });
  }, { passive: true });

  grid.addEventListener('mouseleave', () => {
    if (rafId) cancelAnimationFrame(rafId);
    cards.forEach(card => {
      card.style.setProperty('--spotlight-opacity', '0');
    });
  });
}

/**
 * 結合 WOW.js (滾動觸發偵測) + Anime.js (原本的側邊平移進場動畫)
 */
function initScrollAnimations() {
  const cards = document.querySelectorAll('.wow-anime-card');
  if (!cards.length) return;

  cards.forEach(card => {
    const dir = card.getAttribute('data-slide');
    const startX = dir === 'left' ? -80 : 80;
    card.style.transform = `translateX(${startX}px)`;
    card.style.opacity = '0';
  });

  const triggerCardAnime = (card) => {
    if (card.classList.contains('is-animated')) return;
    card.classList.add('is-animated');

    const dir = card.getAttribute('data-slide');
    const startX = dir === 'left' ? -80 : 80;
    const staggerDelay = dir === 'right' ? 110 : 0;

    if (window.anime) {
      window.anime({
        targets: card,
        translateX: [startX, 0],
        opacity: [0, 1],
        duration: 950,
        delay: staggerDelay,
        easing: 'spring(1, 80, 13, 0)'
      });
    } else {
      card.style.transition = `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}ms, opacity 0.6s ease ${staggerDelay}ms`;
      card.style.transform = 'translateX(0)';
      card.style.opacity = '1';
    }
  };

  if (window.WOW) {
    const wow = new window.WOW({
      boxClass: 'wow-anime-card',
      animateClass: 'wow-triggered',
      offset: 80,
      mobile: true,
      live: false,
      callback: function (box) {
        triggerCardAnime(box);
      }
    });
    wow.init();
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerCardAnime(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach(card => observer.observe(card));
  }
}

function initCardEvents(tools) {
  if (window.VanillaTilt) {
    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
      max: 8,
      speed: 400,
      glare: true,
      "max-glare": 0.18
    });
  }

  document.querySelectorAll('.bento-card').forEach(card => {
    const toolId = card.getAttribute('data-id');
    const currentTool = tools.find(t => String(t.id) === String(toolId));
    const previewWrapper = card.querySelector('.preview-wrapper');

    const video = card.querySelector('.preview-video');
    if (video) {
      card.addEventListener('mouseenter', () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      });

      card.addEventListener('mouseleave', () => {
        video.pause();
        if (video.readyState >= 2) {
          video.currentTime = 0;
        }
      });
    }

    card.addEventListener('click', () => {
      if (currentTool) {
        openModal(currentTool, previewWrapper);
      }
    });
  });
}