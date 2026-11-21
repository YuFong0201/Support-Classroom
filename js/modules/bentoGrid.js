import { openModal } from './modal.js';

const ALL_VALUE = 'ALL';

/**
 * 正規化平台名稱（將「電子白板 (推薦)」、「平板(需全螢幕)」等歸併為基礎載具名稱）
 */
function normalizePlatform(rawPlatform) {
  const cleaned = String(rawPlatform || '')
    .replace(/[\(（][^\)）]*[\)）]/g, '')
    .trim();
  return cleaned || String(rawPlatform || '').trim();
}

/**
 * 從 tools.json 自動萃取所有不重複的「工具類型」與「載具平台」篩選選項
 */
function extractFilterOptions(tools) {
  const categorySet = new Set();
  const platformSet = new Set();

  const preferredPlatformOrder = ['電子白板', '電腦', '平板', '手機'];

  tools.forEach((tool) => {
    (tool.categories || []).forEach((cat) => {
      const trimmed = String(cat || '').trim();
      if (trimmed) categorySet.add(trimmed);
    });

    (tool.platforms || []).forEach((plat) => {
      const normalized = normalizePlatform(plat);
      if (normalized) platformSet.add(normalized);
    });
  });

  const sortedPlatforms = Array.from(platformSet).sort((a, b) => {
    const idxA = preferredPlatformOrder.indexOf(a);
    const idxB = preferredPlatformOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  });

  return {
    categories: Array.from(categorySet),
    platforms: sortedPlatforms
  };
}

/**
 * 渲染雙排交集篩選膠囊列 HTML
 */
function buildFilterBarHtml(categories, platforms) {
  const categoryPills = categories
    .map((cat) => `<button type="button" class="filter-pill" data-group="category" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`)
    .join('');

  const platformPills = platforms
    .map((plat) => `<button type="button" class="filter-pill" data-group="platform" data-value="${escapeHtml(plat)}">${escapeHtml(plat)}</button>`)
    .join('');

  return `
    <div class="bento-filter-bar" id="bento-filter-bar" role="region" aria-label="教學工具篩選器">
      ${categories.length > 0 ? `
        <div class="filter-row">
          <span class="filter-row-label">工具類型</span>
          <div class="filter-track-scroll">
            <div class="filter-track" data-group="category">
              <div class="filter-active-indicator indicator-category" aria-hidden="true"></div>
              <button type="button" class="filter-pill is-active" data-group="category" data-value="${ALL_VALUE}">全部類型</button>
              ${categoryPills}
            </div>
          </div>
        </div>
      ` : ''}

      ${platforms.length > 0 ? `
        <div class="filter-row">
          <span class="filter-row-label">支援載具</span>
          <div class="filter-track-scroll">
            <div class="filter-track" data-group="platform">
              <div class="filter-active-indicator indicator-platform" aria-hidden="true"></div>
              <button type="button" class="filter-pill is-active" data-group="platform" data-value="${ALL_VALUE}">全部載具</button>
              ${platformPills}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="filter-status-bar">
        <span class="filter-count-text" id="filter-count-text">顯示全部工具</span>
        <button type="button" class="filter-clear-btn" id="filter-clear-btn" style="display: none;">清除篩選</button>
      </div>
    </div>
  `;
}

/**
 * 渲染單張工具卡片 HTML（包含半透明磨砂紅「工具類型」與湖水藍「載具平台」雙色標籤）
 */
function buildCardHtml(tool, index) {
  const isFeatured = tool.featured ? 'featured' : '';
  const statusClass = `status-${tool.status}`;
  const slideDirection = index % 2 === 0 ? 'left' : 'right';

  let statusBadge = '';
  if (tool.status === 'maintenance') statusBadge = '<span class="card-badge">維護中暫停使用</span>';
  if (tool.status === 'coming_soon') statusBadge = '<span class="card-badge">即將推出</span>';

  const normalizedPlatforms = (tool.platforms || []).map(normalizePlatform);
  const categoriesAttr = escapeHtml(JSON.stringify(tool.categories || []));
  const platformsAttr = escapeHtml(JSON.stringify(normalizedPlatforms));

  const categoryTagsHtml = (tool.categories || [])
    .map((c) => `<span class="tag-category">${escapeHtml(c)}</span>`)
    .join('');

  const platformTagsHtml = (tool.platforms || [])
    .map((p) => `<span class="tag-platform">${escapeHtml(p)}</span>`)
    .join('');

  return `
    <div class="bento-card wow-anime-card ${isFeatured} ${statusClass}" 
         data-tilt 
         data-id="${escapeHtml(tool.id)}" 
         data-slide="${slideDirection}" 
         data-index="${index}"
         data-categories="${categoriesAttr}"
         data-platforms="${platformsAttr}">
      ${statusBadge}
      <div class="preview-wrapper">
        <img src="${escapeHtml(tool.preview?.image || 'assets/images/previews/default.jpg')}" alt="${escapeHtml(tool.title)}" class="preview-img" />
        ${tool.preview?.video ? `<video src="${escapeHtml(tool.preview.video)}" loop muted playsinline class="preview-video"></video>` : ''}
      </div>
      <div class="card-content">
        <div class="platform-icons">
          ${categoryTagsHtml}
          ${platformTagsHtml}
        </div>
        <h3 class="card-title">${escapeHtml(tool.title)}</h3>
      </div>
    </div>
  `;
}

export async function renderBentoGrid() {
  const container = document.getElementById('bento-container');
  if (!container) return;

  try {
    const response = await fetch('data/tools.json');
    if (!response.ok) throw new Error('無法讀取 tools.json');
    const tools = await response.json();

    const { categories, platforms } = extractFilterOptions(tools);

    const headerHtml = `
      <div class="section-title-wrapper wow-anime-header">
        <h2 class="section-title">全系列教學工具</h2>
        <p class="section-subtitle">點擊圖卡查看工具細節與使用說明</p>
      </div>
    `;

    const filterBarHtml = buildFilterBarHtml(categories, platforms);
    const cardsHtml = tools.map((tool, index) => buildCardHtml(tool, index)).join('');

    container.innerHTML = `
      ${headerHtml}
      ${filterBarHtml}
      <div class="bento-grid" id="bento-grid">
        ${cardsHtml}
      </div>
      <div class="bento-empty-state" id="bento-empty-state" style="display: none;">
        <p class="empty-state-title">找不到同時符合這兩個條件的工具</p>
        <p class="empty-state-desc">試試切換其他工具類型，或點擊下方按鈕查看全部工具</p>
        <button type="button" class="empty-state-reset-btn" id="empty-state-reset-btn">顯示全部工具</button>
      </div>
    `;

    initCardEvents(tools);
    initSpotlightEffect();
    initScrollAnimations();
    initFilterController(tools.length);
  } catch (error) {
    console.error('無法載入工具資料：', error);
  }
}

/**
 * 將卡片永久標記為已完成進場（徹底移除 wow-anime-card，避免任何情況下退回 opacity: 0）
 */
function markCardReady(card) {
  if (!card) return;
  card.classList.remove('wow-anime-card');
  card.classList.add('is-animated');
}

/**
 * 更新液態滑動指示底框位置，並於手機端自動將選中膠囊捲動至可視中央
 */
function updateSlidingIndicator(trackEl, activeBtn, scrollToCenter = false) {
  if (!trackEl || !activeBtn) return;
  const indicator = trackEl.querySelector('.filter-active-indicator');
  if (!indicator) return;

  const left = activeBtn.offsetLeft;
  const width = activeBtn.offsetWidth;

  indicator.style.width = `${width}px`;
  indicator.style.transform = `translate3d(${left}px, 0, 0)`;
  indicator.style.opacity = '1';

  if (scrollToCenter && typeof activeBtn.scrollIntoView === 'function') {
    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/**
 * 為退場卡片建立不干擾真實 DOM 的純視覺離場替身，在原地縮小淡出
 */
function spawnExitGhost(grid, card, rect, gridRect) {
  if (!window.anime || !rect || !gridRect) return;

  const ghost = card.cloneNode(true);
  ghost.removeAttribute('data-tilt');
  ghost.removeAttribute('data-id');
  ghost.classList.remove('bento-card', 'wow-anime-card', 'is-filtered-out');
  ghost.classList.add('bento-exit-ghost');

  // 移除替身內的 video 避免額外解碼開銷
  ghost.querySelectorAll('video').forEach((v) => v.remove());

  Object.assign(ghost.style, {
    position: 'absolute',
    left: `${rect.left - gridRect.left}px`,
    top: `${rect.top - gridRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: '24px',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '0',
    transformOrigin: 'center center'
  });

  grid.appendChild(ghost);

  window.anime({
    targets: ghost,
    opacity: [1, 0],
    scale: [1, 0.92],
    duration: 260,
    easing: 'easeOutCubic',
    complete: () => {
      ghost.remove();
    }
  });
}

/**
 * 初始化雙排交集篩選與高流暢度 FLIP 空間重排動畫控制器
 */
function initFilterController(totalCount) {
  const filterBar = document.getElementById('bento-filter-bar');
  const grid = document.getElementById('bento-grid');
  const emptyState = document.getElementById('bento-empty-state');
  const emptyResetBtn = document.getElementById('empty-state-reset-btn');
  const clearBtn = document.getElementById('filter-clear-btn');
  const countText = document.getElementById('filter-count-text');

  if (!filterBar || !grid) return;

  const state = {
    category: ALL_VALUE,
    platform: ALL_VALUE
  };

  let filterRunId = 0;

  const syncAllIndicators = (scrollToCenter = false) => {
    filterBar.querySelectorAll('.filter-track').forEach((track) => {
      const group = track.getAttribute('data-group');
      const currentVal = state[group];
      const buttons = track.querySelectorAll('.filter-pill');
      let targetBtn = null;

      buttons.forEach((btn) => {
        const isMatch = btn.getAttribute('data-value') === currentVal;
        btn.classList.toggle('is-active', isMatch);
        if (isMatch) targetBtn = btn;
      });

      if (targetBtn) {
        updateSlidingIndicator(track, targetBtn, scrollToCenter);
      }
    });
  };

  requestAnimationFrame(() => syncAllIndicators(false));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => syncAllIndicators(false));
  }
  window.addEventListener('resize', () => syncAllIndicators(false), { passive: true });

  const applyFilterWithFLIP = () => {
    const currentRun = ++filterRunId;
    const cards = Array.from(grid.querySelectorAll('.bento-card'));
    if (!cards.length) return;

    // 清除尚未完成的上一次離場替身與進行中動畫
    grid.querySelectorAll('.bento-exit-ghost').forEach((g) => g.remove());
    if (window.anime) {
      window.anime.remove(cards);
      window.anime.remove(grid);
    }

    // 記錄篩選前的網格高度，供後續平滑高度過渡使用
    const startGridHeight = grid.offsetHeight;

    grid.classList.add('is-filtering');

    // 1. FIRST：記錄當前所有可見卡片的精確座標（包含還在移動中的即時位置）
    const gridRect = grid.getBoundingClientRect();
    const firstRects = new Map();
    cards.forEach((card) => {
      markCardReady(card);
      if (!card.classList.contains('is-filtered-out')) {
        firstRects.set(card, card.getBoundingClientRect());
      }
      // 清除殘留 inline transform，讓下方 Last 測量取得純淨網格目標座標
      card.style.transform = '';
      card.style.opacity = '';
    });

    // 2. 切換真實 DOM 顯示狀態，並為退場卡片產生視覺替身
    const stayingCards = [];
    const enteringCards = [];

    cards.forEach((card) => {
      let cardCats = [];
      let cardPlats = [];
      try {
        cardCats = JSON.parse(card.getAttribute('data-categories') || '[]');
        cardPlats = JSON.parse(card.getAttribute('data-platforms') || '[]');
      } catch {
        cardCats = [];
        cardPlats = [];
      }

      const matchCategory = state.category === ALL_VALUE || cardCats.includes(state.category);
      const matchPlatform = state.platform === ALL_VALUE || cardPlats.includes(state.platform);
      const shouldShow = matchCategory && matchPlatform;
      const wasHidden = card.classList.contains('is-filtered-out');

      if (shouldShow) {
        card.classList.remove('is-filtered-out');
        card.style.display = '';
        if (wasHidden) {
          enteringCards.push(card);
        } else {
          stayingCards.push(card);
        }
      } else {
        card.classList.add('is-filtered-out');
        card.style.display = 'none';
        if (!wasHidden && firstRects.has(card)) {
          spawnExitGhost(grid, card, firstRects.get(card), gridRect);
        }
      }
    });

    const visibleCount = stayingCards.length + enteringCards.length;
    const isDefaultState = state.category === ALL_VALUE && state.platform === ALL_VALUE;

    if (countText) {
      countText.textContent = isDefaultState
        ? `顯示全部 ${totalCount} 款工具`
        : `篩選結果：共 ${visibleCount} / ${totalCount} 款工具`;
    }
    if (clearBtn) {
      clearBtn.style.display = isDefaultState ? 'none' : 'inline-flex';
    }
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // 測量新網格的自然目標高度
    grid.style.height = 'auto';
    const endGridHeight = grid.offsetHeight;

    // 3. LAST & INVERT：計算每張留存卡片「舊座標 - 新目標座標」的位移差，直接傳給 Anime.js 作為動畫起點
    const movingItems = [];
    stayingCards.forEach((card) => {
      const first = firstRects.get(card);
      if (!first) return;
      const last = card.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;

      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        movingItems.push({ card, deltaX, deltaY });
      }
    });

    const finishFiltering = () => {
      if (currentRun !== filterRunId) return;
      stayingCards.forEach((c) => {
        c.style.transform = '';
        c.style.opacity = '';
        c.style.zIndex = '';
      });
      enteringCards.forEach((c) => {
        c.style.transform = '';
        c.style.opacity = '';
        c.style.zIndex = '';
      });
      grid.style.height = '';
      grid.classList.remove('is-filtering');
      window.dispatchEvent(new Event('resize'));
    };

    // 4. PLAY：明確指定 [起點, 終點] 執行絲滑空間滑動與新卡片交錯浮現
    if (window.anime && (movingItems.length > 0 || enteringCards.length > 0 || startGridHeight !== endGridHeight)) {
      const tasks = [];

      if (startGridHeight !== endGridHeight) {
        grid.style.height = `${startGridHeight}px`;
        tasks.push(
          window.anime({
            targets: grid,
            height: [startGridHeight, endGridHeight],
            duration: 460,
            easing: 'cubicBezier(0.22, 1, 0.36, 1)'
          }).finished
        );
      }

      movingItems.forEach(({ card, deltaX, deltaY }, idx) => {
        card.style.zIndex = '2';
        tasks.push(
          window.anime({
            targets: card,
            translateX: [deltaX, 0],
            translateY: [deltaY, 0],
            duration: 480,
            delay: idx * 25,
            easing: 'cubicBezier(0.22, 1, 0.36, 1)'
          }).finished
        );
      });

      if (enteringCards.length > 0) {
        enteringCards.forEach((c) => {
          c.style.opacity = '0';
          c.style.zIndex = '1';
        });
        tasks.push(
          window.anime({
            targets: enteringCards,
            opacity: [0, 1],
            scale: [0.93, 1],
            translateY: [22, 0],
            duration: 440,
            delay: window.anime.stagger(45, { start: 50 }),
            easing: 'cubicBezier(0.22, 1, 0.36, 1)'
          }).finished
        );
      }

      Promise.all(tasks).then(finishFiltering);
    } else {
      finishFiltering();
    }
  };

  filterBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    const group = pill.getAttribute('data-group');
    const value = pill.getAttribute('data-value');
    if (!group || !value) return;

    if (state[group] === value && value !== ALL_VALUE) {
      state[group] = ALL_VALUE;
    } else {
      state[group] = value;
    }

    syncAllIndicators(true);
    applyFilterWithFLIP();
  });

  const resetAllFilters = () => {
    state.category = ALL_VALUE;
    state.platform = ALL_VALUE;
    syncAllIndicators(true);
    applyFilterWithFLIP();
  };

  if (clearBtn) clearBtn.addEventListener('click', resetAllFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);
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
    if (grid.classList.contains('is-filtering')) return;
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      cards.forEach(card => {
        if (card.classList.contains('is-filtered-out')) return;
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
 * 結合 WOW.js (滾動觸發偵測) + Anime.js (側邊平移進場動畫)
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
        easing: 'spring(1, 80, 13, 0)',
        complete: () => {
          card.style.transform = '';
          card.style.opacity = '';
          markCardReady(card);
        }
      });
    } else {
      card.style.transition = `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${staggerDelay}ms, opacity 0.6s ease ${staggerDelay}ms`;
      card.style.transform = 'translateX(0)';
      card.style.opacity = '1';
      setTimeout(() => {
        card.style.transform = '';
        card.style.opacity = '';
        markCardReady(card);
      }, 750 + staggerDelay);
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
        openModal(currentTool, card);
      }
    });
  });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}