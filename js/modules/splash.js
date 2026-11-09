/**
 * Splash Screen Animation Module
 * 2.0s Orbital Swirl & Liquid Metaball Intro ("資源 ✕ 支援")
 * (已徹底解決開場白光與「支援」球體瞬閃問題)
 */
(function () {
  const heroWrapper = document.querySelector('.hero-wrapper');

  // 1. 檢查是否在當前 Session 中已經播放過
  if (sessionStorage.getItem('splashPlayed') === 'true') {
    if (heroWrapper) heroWrapper.classList.add('splash-ready');
    return;
  }

  let mainTl = null;

  // 2. 自動載入依賴套件 (FontAwesome & GSAP)
  function loadDependencies(callback) {
    let gsapLoaded = !!window.gsap;
    let faLoaded = !!document.querySelector('link[href*="font-awesome"]');

    if (!faLoaded) {
      const faLink = document.createElement('link');
      faLink.rel = 'stylesheet';
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(faLink);
    }

    if (gsapLoaded) {
      callback();
    } else {
      const gsapScript = document.createElement('script');
      gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
      gsapScript.onload = callback;
      document.head.appendChild(gsapScript);
    }
  }

  // 3. 注入元件所需 CSS 樣式 (預先將球體設為 opacity: 0 避免瞬閃)
  function injectStyles() {
    if (document.getElementById('splash-styles')) return;

    const style = document.createElement('style');
    style.id = 'splash-styles';
    style.innerHTML = `
      #splash-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #0B132B;
        overflow: hidden;
        user-select: none;
        font-family: 'Noto Sans TC', system-ui, -apple-system, sans-serif;
      }
      .gooey-container {
        filter: url("#metaball-goo");
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .splash-ball-base {
        position: absolute;
        width: 7rem;
        height: 7rem;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 900;
        font-size: 1.75rem;
        letter-spacing: 0.05em;
        top: 50%;
        left: 50%;
        margin-top: -3.5rem;
        margin-left: -3.5rem;
        /* 防瞬閃關鍵：預設完全透明與縮小 */
        opacity: 0;
        transform: scale(0);
      }
      #ball-resource {
        background-color: #009FB7;
        box-shadow: 0 0 35px rgba(0, 159, 183, 0.7);
      }
      #ball-support {
        background-color: #FE4A49;
        box-shadow: 0 0 35px rgba(254, 74, 73, 0.7);
      }
    `;
    document.head.appendChild(style);
  }

  // 4. 動態建構 DOM 元素
  function createSplashDOM() {
    if (document.getElementById('splash-overlay')) return;

    // SVG Gooey Filter
    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = `
      <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
        <defs>
          <filter id="metaball-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 24 -9" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    `;
    document.body.appendChild(svgContainer);

    // Splash Screen Overlay
    const overlay = document.createElement('div');
    overlay.id = 'splash-overlay';
    overlay.innerHTML = `
      <!-- Background Radial Ripple -->
      <div id="burst-ring" style="position: absolute; width: 4rem; height: 4rem; border-radius: 9999px; border: 2px solid rgba(34, 211, 238, 0.5); opacity: 0; pointer-events: none; transform: translate(-50%, -50%); left: 50%; top: 50%;"></div>
      <div id="burst-bg" style="position: absolute; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: linear-gradient(to top right, #009FB7, #FE4A49); opacity: 0; pointer-events: none; transform: translate(-50%, -50%); left: 50%; top: 50%;"></div>

      <!-- Orbit & Metaball Container -->
      <div id="orbit-center" style="position: relative; width: 20rem; height: 20rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        
        <!-- Liquid Gooey Container -->
        <div class="gooey-container">
          <div id="ball-resource" class="splash-ball-base">
            <span style="user-select: none; display: inline-block;">資源</span>
          </div>
          <div id="ball-support" class="splash-ball-base">
            <span style="user-select: none; display: inline-block;">支援</span>
          </div>
        </div>

        <!-- Center Fusion Badge Symbol (✕) -->
        <div id="badge-multiply" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 900; font-size: 1.75rem; color: rgba(255, 255, 255, 0.9); opacity: 0; z-index: 10; pointer-events: none;">
          ✕
        </div>

        <!-- Fusion Center Sparkle -->
        <div id="sparkle-core" style="position: absolute; top: 50%; left: 50%; width: 1rem; height: 1rem; margin-top: -0.5rem; margin-left: -0.5rem; border-radius: 9999px; background-color: #ffffff; opacity: 0; transform: scale(0); box-shadow: 0 0 20px #fff;"></div>

        <!-- Subtitle / Tagline -->
        <div id="splash-tagline" style="position: absolute; bottom: 2rem; text-align: center; opacity: 0; transform: translateY(12px); pointer-events: none; white-space: nowrap;">
          <p style="font-size: 0.875rem; font-weight: 500; letter-spacing: 0.25em; color: rgba(207, 250, 254, 0.9); margin: 0;">
            資源共享 <span style="color: #f87171; font-weight: 700; margin: 0 0.25rem;">‧</span> 普特共融
          </p>
          <div style="margin-top: 0.375rem; width: 3rem; height: 2px; margin-left: auto; margin-right: auto; background: linear-gradient(to right, #009FB7, #FE4A49); border-radius: 9999px; opacity: 0.8;"></div>
        </div>

      </div>
    `;
    document.body.appendChild(overlay);
  }

  // 5. 安全結束動畫並移除 DOM
  function finishAnimation() {
    sessionStorage.setItem('splashPlayed', 'true');
    if (heroWrapper) heroWrapper.classList.add('splash-ready');
    const splash = document.getElementById('splash-overlay');
    if (!splash) return;

    if (mainTl) mainTl.kill();
    splash.remove();
  }

  // 6. 執行 2.0 秒極速動畫時間軸
  function runAnimation() {
    const splash = document.getElementById('splash-overlay');
    const orbitCenter = document.getElementById('orbit-center');
    const ballResource = document.getElementById('ball-resource');
    const ballSupport = document.getElementById('ball-support');
    const badgeMultiply = document.getElementById('badge-multiply');
    const splashTagline = document.getElementById('splash-tagline');
    const sparkleCore = document.getElementById('sparkle-core');
    const burstRing = document.getElementById('burst-ring');
    const burstBg = document.getElementById('burst-bg');

    if (!splash) return;

    // 重設初始位置與旋轉中心
    gsap.set(splash, { display: 'flex', opacity: 1 });
    gsap.set(orbitCenter, { rotation: 0, transformOrigin: "50% 50%" });
    gsap.set(badgeMultiply, { scale: 0, opacity: 0 });
    gsap.set(splashTagline, { opacity: 0, y: 12 });
    gsap.set(sparkleCore, { scale: 0, opacity: 0 });
    gsap.set(burstRing, { scale: 1, opacity: 0 });
    gsap.set(burstBg, { scale: 1, opacity: 0 });

    // 建立 2.0s 主時間軸
    mainTl = gsap.timeline({
      onComplete: finishAnimation
    });

    // PHASE 1: 0.0s - 0.4s 從兩側向中心對稱登場 (透明度由 0 轉至 1)
    mainTl.fromTo(ballResource, 
      { scale: 0, x: -160, opacity: 0 }, 
      { scale: 1, x: -90, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }, 
      0.0
    );

    mainTl.fromTo(ballSupport, 
      { scale: 0, x: 160, opacity: 0 }, 
      { scale: 1, x: 90, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }, 
      0.0
    );

    // PHASE 2: 0.4s - 1.1s 圍繞正中心點 360 度旋轉與拉扯
    mainTl.to(orbitCenter, {
      rotation: 360,
      duration: 0.7,
      ease: "power2.inOut"
    }, 0.4);

    mainTl.to([ballResource.querySelector('span'), ballSupport.querySelector('span')], {
      rotation: -360,
      duration: 0.7,
      ease: "power2.inOut"
    }, 0.4);

    mainTl.to(ballResource, {
      x: -45,
      scaleX: 1.15,
      scaleY: 0.88,
      duration: 0.35,
      ease: "power1.in"
    }, 0.4);

    mainTl.to(ballSupport, {
      x: 45,
      scaleX: 1.15,
      scaleY: 0.88,
      duration: 0.35,
      ease: "power1.in"
    }, 0.4);

    mainTl.to(ballResource, {
      x: -54,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.35,
      ease: "power1.out"
    }, 0.75);

    mainTl.to(ballSupport, {
      x: 54,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.35,
      ease: "power1.out"
    }, 0.75);

    // PHASE 3: 1.1s - 1.5s 碰撞閃光、✕ 標誌與標語登場
    mainTl.to(sparkleCore, {
      scale: 2.8,
      opacity: 0.9,
      duration: 0.18,
      ease: "power1.out"
    }, 1.05);

    mainTl.to(sparkleCore, {
      scale: 0,
      opacity: 0,
      duration: 0.18
    }, 1.23);

    mainTl.to(badgeMultiply, {
      scale: 1,
      opacity: 1,
      duration: 0.3,
      ease: "back.out(2.2)"
    }, 1.1);

    mainTl.to(ballResource, {
      x: -58,
      duration: 0.4,
      ease: "elastic.out(1.2, 0.4)"
    }, 1.1);

    mainTl.to(ballSupport, {
      x: 58,
      duration: 0.4,
      ease: "elastic.out(1.2, 0.4)"
    }, 1.1);

    mainTl.to(splashTagline, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: "power2.out"
    }, 1.15);

    // PHASE 4: 1.6s - 2.0s 圓形擴散與平滑過渡進入首頁
    mainTl.to(burstRing, {
      opacity: 1,
      scale: 32,
      borderWidth: "1px",
      duration: 0.4,
      ease: "power2.out"
    }, 1.6);

    mainTl.to(burstBg, {
      opacity: 1,
      scale: 160,
      duration: 0.4,
      ease: "power3.inOut"
    }, 1.6);

    if (heroWrapper) heroWrapper.classList.add('splash-ready');

    mainTl.to(splash, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.inOut"
    }, 1.6);
  }

  // 初始化入口（立即注入樣式與 DOM）
  function init() {
    injectStyles();
    createSplashDOM();
    loadDependencies(runAnimation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();