/**
 * Modal Module (彈窗控制模組 - 支援 View Transitions API 共享元素空間形變與背景景深縮放)
 */
import { initMagneticButtons } from './microInteractions.js';

let activeSourceElement = null;
let isTransitioning = false;

export function initModal() {
  const modal = document.getElementById('tool-modal');
  const modalClose = document.getElementById('modal-close');

  if (!modal) return;

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  // 點擊背景遮罩關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // 按下 Esc 鍵關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

export function closeModal() {
  const modal = document.getElementById('tool-modal');
  if (!modal || isTransitioning) return;

  const modalPreview = modal.querySelector('.modal-preview');
  const canUseViewTransition =
    typeof document.startViewTransition === 'function' &&
    activeSourceElement &&
    document.body.contains(activeSourceElement) &&
    modalPreview;

  // 若具備來源縮圖元素且瀏覽器支援 View Transitions API，執行反向飛回原位動畫
  if (canUseViewTransition) {
    isTransitioning = true;
    const sourceEl = activeSourceElement;
    activeSourceElement = null;

    document.documentElement.classList.add('is-vt-morphing');
    modalPreview.style.viewTransitionName = 'active-tool-preview';

    const transition = document.startViewTransition(() => {
      modalPreview.style.viewTransitionName = '';
      sourceEl.style.viewTransitionName = 'active-tool-preview';

      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      modal.style.display = 'none';
    });

    transition.finished.finally(() => {
      sourceEl.style.viewTransitionName = '';
      document.documentElement.classList.remove('is-vt-morphing');
      isTransitioning = false;
    });
    return;
  }

  // 標準關閉動畫（無來源元素或舊版瀏覽器備援）
  activeSourceElement = null;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');

  setTimeout(() => {
    modal.style.display = 'none';
  }, 240);
}

/**
 * 通用自訂內容開啟函式（供「關於我」等非工具類彈窗共用景深特效）
 */
export function openCustomModal(htmlContent, sourceElement = null) {
  const modal = document.getElementById('tool-modal');
  const modalBody = document.getElementById('modal-body');
  if (!modal || !modalBody || isTransitioning) return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const canUseViewTransition =
    typeof document.startViewTransition === 'function' &&
    sourceElement &&
    document.body.contains(sourceElement);

  if (canUseViewTransition) {
    isTransitioning = true;
    activeSourceElement = sourceElement;

    document.documentElement.classList.add('is-vt-morphing');
    sourceElement.style.viewTransitionName = 'active-tool-preview';

    const transition = document.startViewTransition(() => {
      sourceElement.style.viewTransitionName = '';

      modalBody.innerHTML = htmlContent;
      const newPreview = modalBody.querySelector('.modal-preview');
      if (newPreview) {
        newPreview.style.viewTransitionName = 'active-tool-preview';
      }

      modal.style.display = 'flex';
      modal.classList.add('active');
      document.body.classList.add('modal-open');
      initMagneticButtons(modalBody);
    });

    transition.finished.finally(() => {
      const newPreview = modalBody.querySelector('.modal-preview');
      if (newPreview) {
        newPreview.style.viewTransitionName = '';
      }
      document.documentElement.classList.remove('is-vt-morphing');
      isTransitioning = false;
    });
    return;
  }

  // 標準開啟動畫（例如從 Ctrl+K 面板或頁尾「關於本站」開啟）
  activeSourceElement = null;
  modalBody.innerHTML = htmlContent;
  modal.style.display = 'flex';

  initMagneticButtons(modalBody);

  requestAnimationFrame(() => {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  });
}

/**
 * 開啟工具詳情彈窗
 * @param {Object} tool - 工具資料物件
 * @param {HTMLElement|null} sourceElement - 觸發點擊的來源預覽圖框元素（用於共享元素空間形變）
 */
export function openModal(tool, sourceElement = null) {
  let buttonHtml = `<a href="${tool.url || '#'}" target="_blank" class="modal-action-btn">立即開啟工具 ➔</a>`;
  if (tool.status === 'maintenance') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">系統維護中暫停使用</button>`;
  } else if (tool.status === 'coming_soon') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">工具開發中，即將推出</button>`;
  }

  const contentHtml = `
    ${tool.preview ? `
      <div class="modal-preview">
        <img src="${tool.preview.image}" alt="${tool.title}" />
        ${tool.preview.video ? `<video src="${tool.preview.video}" autoplay loop muted playsinline></video>` : ''}
      </div>
    ` : ''}

    <div class="modal-body-content">
      <div class="modal-header-info">
        <span class="modal-version-tag">${tool.version || 'V1.0.0'}</span>
      </div>
      <h2 class="modal-title">${tool.title}</h2>
      
      <div class="modal-platforms">
        ${(tool.platforms || []).map(p => `<span class="modal-platform-badge">${p}</span>`).join('')}
      </div>

      <p class="modal-description">${tool.description || '暫無詳細說明。'}</p>
      
      ${tool.features && tool.features.length > 0 ? `
        <div class="modal-features">
          <h3>主要特色與課堂功能</h3>
          <ul>
            ${tool.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${buttonHtml}
    </div>
  `;

  openCustomModal(contentHtml, sourceElement);
}