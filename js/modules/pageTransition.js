export function initPageTransition() {
  let overlay = document.getElementById('page-transition-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.innerHTML = '<div class="wipe-accent-edge"></div>';
    document.body.appendChild(overlay);
  }

  // 頁面載入後，下一幀讓幕簾繼續向上滑開揭露新頁面
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('is-revealed');
    });
  });

  // 處理瀏覽器點擊「上一頁 / 下一頁」(bfcache) 時的狀態重置
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      overlay.classList.remove('is-entering', 'no-transition');
      overlay.classList.add('is-revealed');
    }
  });

  // 監聽全站站內連結點擊，觸發幕簾由下往上掃過覆蓋
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    const target = link.getAttribute('target');

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

    const targetUrl = new URL(link.href, window.location.origin);
    if (targetUrl.origin !== window.location.origin) return;

    // 若點擊當前所在頁面，僅平滑捲回頂部
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    e.preventDefault();

    // 先瞬間歸位至畫面正下方（無過渡動畫），再由下往上掃過螢幕
    overlay.classList.add('no-transition');
    overlay.classList.remove('is-revealed', 'is-entering');
    void overlay.offsetHeight; // 強制觸發重排

    overlay.classList.remove('no-transition');
    overlay.classList.add('is-entering');

    setTimeout(() => {
      window.location.href = link.href;
    }, 360);
  });
}