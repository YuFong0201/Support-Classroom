/**
 * 全站頁面切換平滑淡入淡出轉場模組 (Smooth Page Transition)
 * 攔截站內連結點擊，播放優雅的淡出過渡後再跳轉，並支援瀏覽器上一頁/下一頁快取恢復
 */
export function initPageTransition() {
  // 1. 動態建立轉場遮罩層（首頁首次播放 Splash 時則交由 Splash 接管，不重複遮罩）
  let overlay = document.getElementById('page-transition-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    document.body.appendChild(overlay);
  }

  // 頁面載入後，下一幀立即淡出遮罩，呈現平滑進場效果
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('is-loaded');
    });
  });

  // 處理瀏覽器點擊「上一頁 / 下一頁」(bfcache) 時卡在黑/白畫面的問題
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      overlay.classList.remove('is-leaving');
      overlay.classList.add('is-loaded');
    }
  });

  // 2. 監聽全站站內連結點擊，觸發離場淡出動畫
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    const target = link.getAttribute('target');

    // 排除外部連結、新分頁開啟、錨點 (#)、mailto/tel 或修飾鍵點擊
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      target === '_blank' ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    // 檢查是否為同網域站內頁面
    const targetUrl = new URL(link.href, window.location.origin);
    if (targetUrl.origin !== window.location.origin) return;

    // 若點擊的是當前所在頁面（且無不同 hash），僅平滑捲回頂部即可
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 攔截預設跳轉，播放離場動畫後再切換網址
    e.preventDefault();
    overlay.classList.remove('is-loaded');
    overlay.classList.add('is-leaving');

    setTimeout(() => {
      window.location.href = link.href;
    }, 280);
  });
}