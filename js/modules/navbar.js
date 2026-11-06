/**
 * 行動裝置漢堡選單互動控制模組
 */
export function initNavbar() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('nav-links');
  const navOverlay = document.getElementById('nav-overlay');

  if (!hamburgerBtn || !navLinks || !navOverlay) return;

  function toggleMenu() {
    const isOpen = navLinks.classList.contains('active');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function openMenu() {
    hamburgerBtn.classList.add('active');
    navLinks.classList.add('active');
    navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止底層畫面滑動
  }

  function closeMenu() {
    hamburgerBtn.classList.remove('active');
    navLinks.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // 事件綁定
  hamburgerBtn.addEventListener('click', toggleMenu);
  navOverlay.addEventListener('click', closeMenu);

  // 點擊選單項目後自動關閉（適合單頁或體驗流暢）
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}