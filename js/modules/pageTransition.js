/**
 * App-Shell 品牌藍圓形持續擴散轉場引擎 (Brand Blue Continuous Iris Transition)
 * 1. 按下站內按鈕/連結後，由點擊座標圓形擴散出品牌藍 (#009FB7) 波浪覆蓋主內容區（導覽列始終保留在最上方）
 * 2. 在藍幕完整遮蔽下完成無刷新 DOM 抽換與非同步 JSON 渲染（消除任何破圖重疊與白屏）
 * 3. 資料備妥後，光圈由內而外持續擴散推開，揭露全新頁面
 */

let pageHydrateHandler = null;
let isNavigating = false;
let progressBarTimer = null;
const pageHtmlCache = new Map();

/**
 * 註冊頁面局部切換後的模組重新掛載器（由 app.js 傳入）
 */
export function setPageHydrateHandler(handler) {
  pageHydrateHandler = handler;
}

/**
 * 判斷是否為站內可由 App-Shell 接管的三個核心頁面
 */
function isAppShellRoute(urlObj) {
  if (urlObj.origin !== window.location.origin) return false;
  const path = urlObj.pathname.toLowerCase();
  return (
    path === '/' ||
    path.endsWith('/') ||
    path.endsWith('/index.html') ||
    path.endsWith('/changelog.html') ||
    path.endsWith('/feedback.html')
  );
}

/**
 * 確保手機版漢堡選單與遮罩已關閉
 */
function forceCloseMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('nav-links');
  const navOverlay = document.getElementById('nav-overlay');

  if (hamburgerBtn) hamburgerBtn.classList.remove('active');
  if (navLinks) navLinks.classList.remove('active');
  if (navOverlay) navOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * 導覽列底部品牌流光進度條（弱網環境即時回饋）
 */
function showTopNavProgressBar() {
  clearTimeout(progressBarTimer);
  progressBarTimer = setTimeout(() => {
    let bar = document.getElementById('nav-loading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'nav-loading-progress';
      bar.className = 'nav-loading-progress';
      const header = document.querySelector('body > header');
      if (header) {
        header.appendChild(bar);
      } else {
        document.body.appendChild(bar);
      }
    }
    requestAnimationFrame(() => {
      bar.classList.add('is-loading');
    });
  }, 120);
}

function hideTopNavProgressBar() {
  clearTimeout(progressBarTimer);
  const bar = document.getElementById('nav-loading-progress');
  if (bar) {
    bar.classList.remove('is-loading');
    bar.classList.add('is-done');
    setTimeout(() => bar.remove(), 280);
  }
}

/**
 * 同步導覽列連結的 .active 狀態
 */
function syncNavbarActiveState(targetUrl) {
  const targetPath = targetUrl.pathname.toLowerCase();
  const isChangelog = targetPath.endsWith('changelog.html');
  const isFeedback = targetPath.endsWith('feedback.html');

  document.querySelectorAll('#nav-links a').forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    let shouldActive = false;

    if (isChangelog) {
      shouldActive = href.includes('changelog.html');
    } else if (isFeedback) {
      shouldActive = href.includes('feedback.html');
    } else {
      shouldActive = href.includes('index.html') || href === './' || href === '/';
    }

    a.classList.toggle('active', shouldActive);
  });
}

/**
 * 確保目標頁面專屬樣式表已載入並就緒
 */
async function ensurePageStylesheets(parsedDoc) {
  const incomingLinks = Array.from(parsedDoc.querySelectorAll('head link[rel="stylesheet"]'));
  const loadPromises = [];

  incomingLinks.forEach((linkEl) => {
    const href = linkEl.getAttribute('href');
    if (!href) return;

    const alreadyExists = Array.from(document.querySelectorAll('head link[rel="stylesheet"]')).some(
      (existing) => existing.getAttribute('href') === href
    );

    if (!alreadyExists) {
      const newLink = document.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = href;

      const p = new Promise((resolve) => {
        newLink.onload = resolve;
        newLink.onerror = resolve;
        setTimeout(resolve, 1200);
      });
      loadPromises.push(p);
      document.head.appendChild(newLink);
    }
  });

  if (loadPromises.length > 0) {
    await Promise.all(loadPromises);
  }
}

/**
 * 抓取並快取目標頁面 HTML
 */
async function fetchTargetDocument(urlStr) {
  if (pageHtmlCache.has(urlStr)) {
    return pageHtmlCache.get(urlStr);
  }

  const res = await fetch(urlStr, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`無法載入頁面: ${res.status}`);
  const htmlText = await res.text();
  pageHtmlCache.set(urlStr, htmlText);
  return htmlText;
}

/**
 * 懸停／觸控智慧預載引擎：提前快取 HTML 與對應 JSON 資料
 */
function initSmartPrefetcher() {
  const prefetchedJson = new Set();

  const warmUpRoute = (href) => {
    if (!href) return;
    let targetUrl;
    try {
      targetUrl = new URL(href, window.location.origin);
    } catch {
      return;
    }

    if (!isAppShellRoute(targetUrl)) return;
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      return;
    }

    fetchTargetDocument(targetUrl.href).catch(() => {});

    const pathLower = targetUrl.pathname.toLowerCase();
    if (pathLower.endsWith('changelog.html') && !prefetchedJson.has('changelog')) {
      prefetchedJson.add('changelog');
      fetch('data/changelog.json', { priority: 'low' }).catch(() => {});
    } else if (!pathLower.endsWith('feedback.html') && !prefetchedJson.has('tools')) {
      prefetchedJson.add('tools');
      fetch('data/tools.json', { priority: 'low' }).catch(() => {});
    }
  };

  document.addEventListener(
    'pointerenter',
    (e) => {
      const link = e.target.closest('a');
      if (link) warmUpRoute(link.getAttribute('href'));
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    'touchstart',
    (e) => {
      const link = e.target.closest('a');
      if (link) warmUpRoute(link.getAttribute('href'));
    },
    { capture: true, passive: true }
  );
}

/**
 * 取得或建立品牌藍圓形轉場遮罩層（層級位於主內容之上、導覽列之下）
 */
function getCircleOverlay() {
  let overlay = document.getElementById('brand-circle-transition');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'brand-circle-transition';
    overlay.className = 'brand-circle-transition';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }
  return overlay;
}

/**
 * 計算點擊座標，若無有效座標則回退至對應導覽按鈕中心或視窗中央
 */
function resolveOriginPoint(origin, targetUrl) {
  if (origin && Number.isFinite(origin.x) && Number.isFinite(origin.y) && (origin.x > 0 || origin.y > 0)) {
    return { x: origin.x, y: origin.y };
  }

  // 嘗試尋找導覽列上對應目標頁面的可見按鈕中心點
  const targetPath = targetUrl.pathname.toLowerCase();
  const matchedNav = Array.from(document.querySelectorAll('#nav-links a')).find((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (targetPath.endsWith('changelog.html')) return href.includes('changelog.html');
    if (targetPath.endsWith('feedback.html')) return href.includes('feedback.html');
    return href.includes('index.html') || href === './' || href === '/';
  });

  if (matchedNav) {
    const rect = matchedNav.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
  }

  return {
    x: window.innerWidth / 2,
    y: 44
  };
}

/**
 * 計算從 (x, y) 完整覆蓋整個螢幕四個角落所需的最大半徑
 */
function computeMaxRadius(x, y) {
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  return Math.ceil(Math.hypot(maxX, maxY)) + 24;
}

/**
 * 第一階段動畫：從點擊座標圓形擴散出品牌藍 (#009FB7) 覆蓋全螢幕主內容區
 */
function expandBrandCircleCover(x, y, maxRadius) {
  return new Promise((resolve) => {
    const overlay = getCircleOverlay();

    // 重置為點擊處半徑 0 的實心圓
    overlay.style.transition = 'none';
    overlay.style.opacity = '1';
    overlay.style.maskImage = 'none';
    overlay.style.webkitMaskImage = 'none';
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    overlay.style.webkitClipPath = `circle(0px at ${x}px ${y}px)`;
    overlay.classList.add('is-active');

    // 強制瀏覽器重排鎖定起點
    void overlay.offsetWidth;

    const duration = 360;
    overlay.style.transition = `clip-path ${duration}ms cubic-bezier(0.32, 0, 0.2, 1), -webkit-clip-path ${duration}ms cubic-bezier(0.32, 0, 0.2, 1)`;
    overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;
    overlay.style.webkitClipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;

    setTimeout(resolve, duration);
  });
}

/**
 * 第三階段動畫：持續向外擴散（從點擊中心打開透明圓洞向外推開品牌藍波浪，揭露新頁面）
 */
function continueExpandIrisReveal(x, y, maxRadius) {
  return new Promise((resolve) => {
    const overlay = getCircleOverlay();
    const duration = 460;
    const startTime = performance.now();

    // 取消 clip-path，改用平滑徑向光圈遮罩由內而外持續擴散推開
    overlay.style.transition = 'none';
    overlay.style.clipPath = 'none';
    overlay.style.webkitClipPath = 'none';

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(rawProgress);

      // 內圈透明洞從 0 持續擴散至 maxRadius + 80px，邊緣保留柔和品牌藍光暈羽化帶
      const innerR = eased * (maxRadius + 80);
      const feather = 64;
      const outerR = innerR + feather;

      const maskGrad = `radial-gradient(circle at ${x}px ${y}px, transparent ${innerR.toFixed(1)}px, rgba(0, 0, 0, 0.55) ${(innerR + feather * 0.45).toFixed(1)}px, #000 ${outerR.toFixed(1)}px)`;
      overlay.style.maskImage = maskGrad;
      overlay.style.webkitMaskImage = maskGrad;

      if (rawProgress < 1) {
        requestAnimationFrame(step);
      } else {
        overlay.classList.remove('is-active');
        overlay.style.maskImage = 'none';
        overlay.style.webkitMaskImage = 'none';
        overlay.style.clipPath = 'circle(0px at 50% 50%)';
        overlay.style.webkitClipPath = 'circle(0px at 50% 50%)';
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

/**
 * 執行品牌藍圓形持續擴散無刷新轉場
 */
export async function navigateWithSpatialTransition(targetHref, { pushHistory = true, origin = null } = {}) {
  const targetUrl = new URL(targetHref, window.location.origin);

  // 若點擊當前頁面，平滑捲回頂部
  if (
    targetUrl.pathname === window.location.pathname &&
    targetUrl.search === window.location.search
  ) {
    forceCloseMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // 非站內三頁交由原生瀏覽器處理
  if (!isAppShellRoute(targetUrl)) {
    window.location.href = targetUrl.href;
    return;
  }

  if (isNavigating) return;
  isNavigating = true;

  // 在關閉手機選單前先鎖定點擊座標
  const { x, y } = resolveOriginPoint(origin, targetUrl);
  const maxRadius = computeMaxRadius(x, y);

  forceCloseMobileMenu();
  showTopNavProgressBar();

  try {
    // 同時啟動「品牌藍圓形擴散覆蓋動畫」與「背景抓取目標 HTML/CSS」
    const coverPromise = expandBrandCircleCover(x, y, maxRadius);
    const docPromise = fetchTargetDocument(targetUrl.href).then(async (htmlText) => {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(htmlText, 'text/html');
      await ensurePageStylesheets(parsedDoc);
      return parsedDoc;
    });

    const [, parsedDoc] = await Promise.all([coverPromise, docPromise]);

    // 此時整個主內容區已 100% 被品牌藍波浪覆蓋，在背後安全執行無刷新 DOM 抽換
    const incomingBlocks = Array.from(parsedDoc.body.children).filter((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'header' || tag === 'script') return false;
      if (el.classList.contains('site-footer')) return false;
      if (el.id === 'tool-modal' || el.id === 'brand-circle-transition') return false;
      return true;
    });

    const header = document.querySelector('body > header');
    const footer = document.querySelector('body > footer.site-footer');
    if (!header || !footer) {
      window.location.href = targetUrl.href;
      return;
    }

    let cursor = header.nextElementSibling;
    while (cursor && cursor !== footer) {
      const next = cursor.nextElementSibling;
      cursor.remove();
      cursor = next;
    }

    document.documentElement.classList.remove('is-splashing');
    const fragment = document.createDocumentFragment();
    incomingBlocks.forEach((node) => {
      const imported = document.importNode(node, true);
      if (imported.classList.contains('hero-wrapper')) {
        imported.classList.add('splash-ready');
      }
      fragment.appendChild(imported);
    });
    footer.parentNode.insertBefore(fragment, footer);

    if (parsedDoc.title) {
      document.title = parsedDoc.title;
    }
    if (pushHistory) {
      window.history.pushState({ url: targetUrl.href }, '', targetUrl.href);
    }
    syncNavbarActiveState(targetUrl);

    window.scrollTo(0, 0);

    // 等待新頁面資料（tools.json / changelog.json / Hero 媒體）渲染就緒
    if (typeof pageHydrateHandler === 'function') {
      await pageHydrateHandler();
    }

    hideTopNavProgressBar();

    // 品牌藍光圈由中心持續向外擴散推開，揭露已完全備妥的新頁面
    await continueExpandIrisReveal(x, y, maxRadius);
  } catch (error) {
    console.warn('圓形轉場發生異常，自動降級為標準導覽：', error);
    hideTopNavProgressBar();
    const overlay = document.getElementById('brand-circle-transition');
    if (overlay) overlay.classList.remove('is-active');
    window.location.href = targetUrl.href;
  } finally {
    isNavigating = false;
  }
}

export function initPageTransition() {
  try {
    pageHtmlCache.set(window.location.href, document.documentElement.outerHTML);
  } catch {
    // 忽略序列化異常
  }

  initSmartPrefetcher();

  // 攔截全站站內 <a> 連結點擊並擷取精準點擊座標
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
    if (!isAppShellRoute(targetUrl)) return;

    e.preventDefault();

    // 取得實際點擊座標；若為鍵盤 Enter 觸發 (clientX === 0 && clientY === 0) 則取按鈕中心點
    let origin = { x: e.clientX, y: e.clientY };
    if (origin.x === 0 && origin.y === 0) {
      const rect = link.getBoundingClientRect();
      origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    navigateWithSpatialTransition(targetUrl.href, { pushHistory: true, origin });
  });

  // 監聽瀏覽器上一頁 / 下一頁按鈕
  window.addEventListener('popstate', () => {
    navigateWithSpatialTransition(window.location.href, { pushHistory: false });
  });
}