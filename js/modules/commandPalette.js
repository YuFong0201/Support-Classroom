/**
 * 全站快捷指令搜尋面板模組 (Command Palette: Ctrl+K / Cmd+K)
 * 支援即時搜尋 tools.json 教學工具、鍵盤上下鍵導覽、快速開啟工具彈窗與站內頁面跳轉
 */
import { openModal, openCustomModal } from './modal.js';

let cachedTools = null;
let isPaletteOpen = false;
let selectedIndex = 0;
let currentResults = [];

async function getToolsData() {
  if (cachedTools) return cachedTools;
  try {
    const res = await fetch('data/tools.json');
    if (!res.ok) throw new Error('讀取 tools.json 失敗');
    cachedTools = await res.json();
    return cachedTools;
  } catch (err) {
    console.error('Command Palette 載入工具資料失敗：', err);
    return [];
  }
}

export function initCommandPalette() {
  if (document.getElementById('cmd-palette-overlay')) return;

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  // 1. 在導覽列自動植入極簡搜尋觸發按鈕（全站 3 頁同步生效）
  const navLinks = document.getElementById('nav-links');
  if (navLinks && !document.getElementById('nav-cmd-trigger')) {
    const li = document.createElement('li');
    li.className = 'nav-cmd-item';
    li.innerHTML = `
      <button type="button" id="nav-cmd-trigger" class="nav-cmd-btn" aria-label="搜尋教學工具 (${shortcutLabel})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <span class="nav-cmd-text">搜尋</span>
        <kbd class="nav-cmd-kbd">${shortcutLabel}</kbd>
      </button>
    `;
    navLinks.appendChild(li);

    li.querySelector('#nav-cmd-trigger').addEventListener('click', () => {
      openCommandPalette();
    });
  }

  // 2. 建立快捷指令面板 DOM
  const overlay = document.createElement('div');
  overlay.id = 'cmd-palette-overlay';
  overlay.className = 'cmd-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '快捷搜尋與指令面板');

  overlay.innerHTML = `
    <div class="cmd-dialog">
      <div class="cmd-input-wrapper">
        <svg class="cmd-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <input type="text" id="cmd-search-input" class="cmd-input" placeholder="搜尋教學工具名稱、功能或適用平台（如：數學、電子白板）..." autocomplete="off" spellcheck="false" />
        <button type="button" id="cmd-esc-btn" class="cmd-esc-tag">ESC</button>
      </div>
      <div class="cmd-results" id="cmd-results-list"></div>
      <div class="cmd-footer">
        <div class="cmd-hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> 選擇</span>
          <span><kbd>Enter</kbd> 開啟</span>
          <span><kbd>Esc</kbd> 關閉</span>
        </div>
        <span class="cmd-brand-tip">奇老師快捷指令</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('cmd-search-input');
  const resultsList = document.getElementById('cmd-results-list');
  const escBtn = document.getElementById('cmd-esc-btn');

  // 渲染搜尋結果清單
  const renderResults = async (query = '') => {
    const tools = await getToolsData();
    const q = query.trim().toLowerCase();

    const quickNavItems = [
      {
        type: 'nav',
        id: 'nav-home',
        title: '前往首頁',
        subtitle: '瀏覽最新工具與全系列教學資源',
        badge: '頁面',
        action: () => { window.location.href = 'index.html'; }
      },
      {
        type: 'nav',
        id: 'nav-changelog',
        title: '查看更新日誌',
        subtitle: '檢視網站最新公告與各工具版本歷程',
        badge: '頁面',
        action: () => { window.location.href = 'changelog.html'; }
      },
      {
        type: 'nav',
        id: 'nav-feedback',
        title: '填寫意見回饋 / 新工具許願',
        subtitle: '向奇老師提出功能建議或問題回報',
        badge: '頁面',
        action: () => { window.location.href = 'feedback.html'; }
      },
      {
        type: 'about',
        id: 'nav-about',
        title: '關於本站與作者介紹',
        subtitle: '了解奇老師的資源教室創立初衷',
        badge: '資訊',
        action: () => {
          const aboutBtn = document.getElementById('btn-about-me');
          if (aboutBtn) {
            aboutBtn.click();
          } else {
            openCustomModal('<div style="padding:2rem;text-align:center;"><h2>關於本站</h2><p>旨在教學工具共享的平台</p></div>');
          }
        }
      }
    ];

    const matchedTools = tools
      .filter((t) => {
        if (!q) return true;
        const haystack = [
          t.title,
          t.description,
          ...(t.platforms || []),
          ...(t.features || [])
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .map((tool) => ({
        type: 'tool',
        id: tool.id,
        title: tool.title,
        subtitle: tool.description || '點擊查看工具細節與使用說明',
        platforms: tool.platforms || [],
        status: tool.status,
        thumb: tool.preview?.image || '',
        action: () => openModal(tool)
      }));

    const matchedNavs = quickNavItems.filter((item) => {
      if (!q) return true;
      return `${item.title} ${item.subtitle}`.toLowerCase().includes(q);
    });

    currentResults = [...matchedTools, ...matchedNavs];
    selectedIndex = 0;

    if (!currentResults.length) {
      resultsList.innerHTML = `
        <div class="cmd-empty">
          找不到與「<strong>${escapeHtml(query)}</strong>」相符的工具或頁面
        </div>
      `;
      return;
    }

    let html = '';
    let globalIdx = 0;

    if (matchedTools.length > 0) {
      html += `<div class="cmd-group-label">教學工具 (${matchedTools.length})</div>`;
      matchedTools.forEach((item) => {
        const isActive = globalIdx === selectedIndex ? 'is-selected' : '';
        const statusTag =
          item.status === 'maintenance'
            ? '<span class="cmd-status-pill is-maint">維護中</span>'
            : item.status === 'coming_soon'
            ? '<span class="cmd-status-pill is-soon">即將推出</span>'
            : '';

        html += `
          <div class="cmd-item ${isActive}" data-cmd-idx="${globalIdx}">
            ${item.thumb ? `<img src="${item.thumb}" alt="" class="cmd-item-thumb" />` : '<div class="cmd-item-icon">🧰</div>'}
            <div class="cmd-item-info">
              <div class="cmd-item-title-row">
                <span class="cmd-item-title">${escapeHtml(item.title)}</span>
                ${statusTag}
              </div>
              <div class="cmd-item-sub">${escapeHtml(item.subtitle)}</div>
            </div>
            <div class="cmd-item-tags">
              ${item.platforms.slice(0, 2).map((p) => `<span>${escapeHtml(p)}</span>`).join('')}
            </div>
          </div>
        `;
        globalIdx++;
      });
    }

    if (matchedNavs.length > 0) {
      html += `<div class="cmd-group-label">快速導覽</div>`;
      matchedNavs.forEach((item) => {
        const isActive = globalIdx === selectedIndex ? 'is-selected' : '';
        html += `
          <div class="cmd-item ${isActive}" data-cmd-idx="${globalIdx}">
            <div class="cmd-item-icon">➔</div>
            <div class="cmd-item-info">
              <div class="cmd-item-title-row">
                <span class="cmd-item-title">${escapeHtml(item.title)}</span>
              </div>
              <div class="cmd-item-sub">${escapeHtml(item.subtitle)}</div>
            </div>
            <div class="cmd-item-tags"><span>${item.badge}</span></div>
          </div>
        `;
        globalIdx++;
      });
    }

    resultsList.innerHTML = html;

    // 綁定滑鼠移入與點擊事件
    resultsList.querySelectorAll('.cmd-item').forEach((el) => {
      const idx = Number(el.dataset.cmdIdx);
      el.addEventListener('mouseenter', () => {
        selectedIndex = idx;
        updateSelectionHighlight();
      });
      el.addEventListener('click', () => {
        executeItem(idx);
      });
    });
  };

  const updateSelectionHighlight = () => {
    const items = resultsList.querySelectorAll('.cmd-item');
    items.forEach((el, idx) => {
      if (idx === selectedIndex) {
        el.classList.add('is-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-selected');
      }
    });
  };

  const executeItem = (idx) => {
    const target = currentResults[idx];
    if (!target) return;
    closeCommandPalette();
    setTimeout(() => {
      target.action();
    }, 120);
  };

  function openCommandPalette() {
    if (isPaletteOpen) return;
    isPaletteOpen = true;
    overlay.style.display = 'flex';
    input.value = '';
    renderResults('');

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      document.body.classList.add('cmd-open');
      input.focus();
    });
  }

  function closeCommandPalette() {
    if (!isPaletteOpen) return;
    isPaletteOpen = false;
    overlay.classList.remove('is-open');
    document.body.classList.remove('cmd-open');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 200);
  }

  // 輸入即時過濾
  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // 面板內鍵盤上下鍵與 Enter 操作
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        updateSelectionHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
        updateSelectionHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    }
  });

  escBtn.addEventListener('click', closeCommandPalette);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette();
  });

  // 全域快捷鍵 Ctrl + K / Cmd + K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isPaletteOpen) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}