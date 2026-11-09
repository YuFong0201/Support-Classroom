/**
 * Modal Module (彈窗控制模組)
 */

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
  if (!modal) return;

  // 先移除動畫淡出
  modal.classList.remove('active');

  // 等待淡出動畫完畢後隱藏元素
  setTimeout(() => {
    modal.style.display = 'none';
  }, 200);
}

export function openModal(tool) {
  const modal = document.getElementById('tool-modal');
  const modalBody = document.getElementById('modal-body');

  if (!modal || !modalBody) return;

  // 關鍵修復：將 Modal 強制移至 <body> 最外層，擺脫任何父容器 transform 造成的偏位或左下角掉落問題
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  let buttonHtml = `<a href="${tool.url || '#'}" target="_blank" class="modal-action-btn">立即開啟工具 ➔</a>`;
  if (tool.status === 'maintenance') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">系統維護中暫停使用</button>`;
  } else if (tool.status === 'coming_soon') {
    buttonHtml = `<button class="modal-action-btn disabled" disabled type="button">工具開發中，即將推出</button>`;
  }

  modalBody.innerHTML = `
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

  modal.style.display = 'flex';

  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
}