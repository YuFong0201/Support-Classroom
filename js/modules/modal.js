/**
 * Modal Module (彈窗控制模組 - 支援全卡片多層次 View Transitions 共享元素空間形變)
 */
import { initMagneticButtons } from './microInteractions.js';

let activeSourceElement = null;
let isTransitioning = false;

/**
 * 依據傳入的來源元素（整張 .bento-card 或單純的 Hero 預覽框）綁定或清除對應的 viewTransitionName
 */
function applySourceTransitionNames(sourceEl, enable) {
  if (!sourceEl) return;

  const isFullCard = sourceEl.classList.contains('bento-card');
  if (isFullCard) {
    sourceEl.style.viewTransitionName = enable ? 'active-tool-card' : '';
    const preview = sourceEl.querySelector('.preview-wrapper');
    const title = sourceEl.querySelector('.card-title');
    const platforms = sourceEl.querySelector('.platform-icons');

    if (preview) preview.style.viewTransitionName = enable ? 'active-tool-preview' : '';
    if (title) title.style.viewTransitionName = enable ? 'active-tool-title' : '';
    if (platforms) platforms.style.viewTransitionName = enable ? 'active-tool-platforms' : '';
  } else {
    sourceEl.style.viewTransitionName = enable ? 'active-tool-preview' : '';
  }
}

/**
 * 綁定或清除目標 Modal 內對應層級的 viewTransitionName
 */
function applyModalTransitionNames(modal, hasFullCardSource, enable) {
  if (!modal) return;

  const modalCard = modal.querySelector('.modal-card');
  const modalPreview = modal.querySelector('.modal-preview');
  const modalTitle = modal.querySelector('.modal-title');
  const modalPlatforms = modal.querySelector('.modal-platforms');

  if (modalCard) {
    modalCard.style.viewTransitionName = enable && hasFullCardSource ? 'active-tool-card' : '';
  }
  if (modalPreview) {
    modalPreview.style.viewTransitionName = enable ? 'active-tool-preview' : '';
  }
  if (modalTitle) {
    modalTitle.style.viewTransitionName = enable && hasFullCardSource ? 'active-tool-title' : '';
  }
  if (modalPlatforms) {
    modalPlatforms.style.viewTransitionName = enable && hasFullCardSource ? 'active-tool-platforms' : '';
  }
}

export function initModal() {
  const modal = document.getElementById('tool-modal');
  const modalClose = document.getElementById('modal-close');

  if (!modal) return;

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

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

  if (canUseViewTransition) {
    isTransitioning = true;
    const sourceEl = activeSourceElement;
    const isFullCard = sourceEl.classList.contains('bento-card');
    activeSourceElement = null;

    document.documentElement.classList.add('is-vt-morphing');
    applyModalTransitionNames(modal, isFullCard, true);

    const transition = document.startViewTransition(() => {
      applyModalTransitionNames(modal, isFullCard, false);
      applySourceTransitionNames(sourceEl, true);

      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      modal.style.display = 'none';
    });

    transition.finished.finally(() => {
      applySourceTransitionNames(sourceEl, false);
      document.documentElement.classList.remove('is-vt-morphing');
      isTransitioning = false;
    });
    return;
  }

  activeSourceElement = null;
  modal.classList.remove('active');
  document.body.classList.remove('modal-open');

  setTimeout(() => {
    modal.style.display = 'none';
  }, 240);
}

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
    const isFullCard = sourceElement.classList.contains('bento-card');

    document.documentElement.classList.add('is-vt-morphing');
    applySourceTransitionNames(sourceElement, true);

    const transition = document.startViewTransition(() => {
      applySourceTransitionNames(sourceElement, false);

      modalBody.innerHTML = htmlContent;
      applyModalTransitionNames(modal, isFullCard, true);

      modal.style.display = 'flex';
      modal.classList.add('active');
      document.body.classList.add('modal-open');
      initMagneticButtons(modalBody);
    });

    transition.finished.finally(() => {
      applyModalTransitionNames(modal, isFullCard, false);
      document.documentElement.classList.remove('is-vt-morphing');
      isTransitioning = false;
    });
    return;
  }

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
 * 開啟工具詳情彈窗（同步渲染工具類型標籤與載具平台標籤）
 */
export function openModal(tool, sourceElement = null) {
  let buttonHtml = `<a href="${tool.url || '#'}" target="_blank" class="modal-action-btn">立即開啟工具 ➔</a>`;
  if (tool.status === 'maintenance') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">系統維護中暫停使用</button>`;
  } else if (tool.status === 'coming_soon') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">工具開發中，即將推出</button>`;
  }

  const categoryBadgesHtml = (tool.categories || [])
    .map(c => `<span class="modal-category-badge">${c}</span>`)
    .join('');

  const platformBadgesHtml = (tool.platforms || [])
    .map(p => `<span class="modal-platform-badge">${p}</span>`)
    .join('');

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
        ${categoryBadgesHtml}
        ${platformBadgesHtml}
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