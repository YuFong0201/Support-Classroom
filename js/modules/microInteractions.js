/**
 * 進階微互動與動態排版模組
 * 1. Proximity Magnetic Field (力場距離感應磁吸按鈕 - 連續平滑跟隨與回彈)
 * 2. Kinetic Typography Reveal (標題文字幾何遮罩逐字揭露)
 * 3. Tactile Click Ripple (全站觸控/點擊微光波紋)
 */

const magneticRegistry = new Map();
let isMagneticLoopRunning = false;
let pointerX = -9999;
let pointerY = -9999;
let isPointerActive = false;

/**
 * 啟動全域磁吸物理模擬迴圈 (60fps 阻尼插值，徹底避免卡頓或瞬間跳動)
 */
function ensureMagneticLoop() {
  if (isMagneticLoopRunning) return;
  isMagneticLoopRunning = true;

  window.addEventListener(
    'mousemove',
    (e) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      isPointerActive = true;
    },
    { passive: true }
  );

  document.addEventListener('mouseleave', () => {
    isPointerActive = false;
  });

  function updateMagneticPhysics() {
    magneticRegistry.forEach((state, btn) => {
      if (!document.body.contains(btn)) {
        magneticRegistry.delete(btn);
        return;
      }

      const isNavLink = btn.closest('.nav-links') !== null;
      if ((isNavLink && window.innerWidth <= 768) || btn.offsetParent === null) {
        state.targetX = 0;
        state.targetY = 0;
      } else if (isPointerActive) {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dxEdge = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
        const dyEdge = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
        const edgeDistance = Math.hypot(dxEdge, dyEdge);

        const triggerRadius = state.radius;

        if (edgeDistance < triggerRadius) {
          const proximity = 1 - edgeDistance / triggerRadius;
          const easedPull = proximity * proximity * (3 - 2 * proximity);

          const halfW = Math.max(rect.width / 2, 1);
          const halfH = Math.max(rect.height / 2, 1);
          const normX = Math.max(-1.25, Math.min(1.25, (pointerX - centerX) / halfW));
          const normY = Math.max(-1.25, Math.min(1.25, (pointerY - centerY) / halfH));

          state.targetX = normX * state.maxX * easedPull;
          state.targetY = normY * state.maxY * easedPull;
        } else {
          state.targetX = 0;
          state.targetY = 0;
        }
      } else {
        state.targetX = 0;
        state.targetY = 0;
      }

      state.currentX += (state.targetX - state.currentX) * 0.16;
      state.currentY += (state.targetY - state.currentY) * 0.16;

      if (
        Math.abs(state.currentX) < 0.02 &&
        Math.abs(state.currentY) < 0.02 &&
        state.targetX === 0 &&
        state.targetY === 0
      ) {
        if (state.isDirty) {
          state.currentX = 0;
          state.currentY = 0;
          btn.style.transform = '';
          state.isDirty = false;
        }
      } else {
        btn.style.transform = `translate3d(${state.currentX.toFixed(2)}px, ${state.currentY.toFixed(2)}px, 0)`;
        state.isDirty = true;
      }
    });

    requestAnimationFrame(updateMagneticPhysics);
  }

  requestAnimationFrame(updateMagneticPhysics);
}

/**
 * 1. 註冊磁吸式按鈕（依按鈕尺寸自動設定安全位移上限，絕不超出容器邊界）
 */
export function initMagneticButtons(root = document) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  ensureMagneticLoop();

  const selectors = [
    '.nav-links a',
    '.nav-cmd-btn',
    '.footer-about-btn',
    '.modal-action-btn:not(.disabled)',
    '.submit-btn'
  ].join(', ');

  const targets = root.querySelectorAll(selectors);

  targets.forEach((btn) => {
    if (magneticRegistry.has(btn)) return;

    const isWideButton =
      btn.classList.contains('modal-action-btn') || btn.classList.contains('submit-btn');

    magneticRegistry.set(btn, {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      maxX: isWideButton ? 9 : 10,
      maxY: isWideButton ? 6 : 7,
      radius: isWideButton ? 75 : 55,
      isDirty: false
    });
  });
}

/**
 * 2. 初始化標題文字「幾何遮罩逐字揭露」動畫
 */
export function initKineticTitles(root = document) {
  const titles = root.querySelectorAll('.section-title, .page-title');
  if (!titles.length) return;

  titles.forEach((titleEl) => {
    if (titleEl.dataset.kineticInit === 'true') return;
    titleEl.dataset.kineticInit = 'true';

    const rawText = titleEl.textContent.trim();
    if (!rawText) return;

    titleEl.setAttribute('aria-label', rawText);
    titleEl.classList.add('kinetic-title');

    const chars = Array.from(rawText);
    titleEl.innerHTML = chars
      .map((char) => {
        if (char === ' ') {
          return '<span class="kinetic-space">&nbsp;</span>';
        }
        return `<span class="kinetic-char-mask" aria-hidden="true"><span class="kinetic-char">${char}</span></span>`;
      })
      .join('');

    const charNodes = titleEl.querySelectorAll('.kinetic-char');

    const playReveal = () => {
      if (titleEl.dataset.kineticPlayed === 'true') return;
      titleEl.dataset.kineticPlayed = 'true';

      if (window.anime) {
        window.anime({
          targets: charNodes,
          translateY: ['115%', '0%'],
          opacity: [0, 1],
          duration: 780,
          delay: window.anime.stagger(38, { start: 60 }),
          easing: 'cubicBezier(0.16, 1, 0.3, 1)'
        });
      } else {
        charNodes.forEach((node, idx) => {
          node.style.transition = `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 35}ms, opacity 0.5s ease ${idx * 35}ms`;
          node.style.transform = 'translateY(0%)';
          node.style.opacity = '1';
        });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playReveal();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(titleEl);
  });
}

/**
 * 3. 全站觸控/點擊微光波紋 (Tactile Click Ripple)
 * 在滑鼠點擊或電子白板觸控落點綻放品牌雙色微光漣漪，不阻擋任何原有點擊事件
 */
export function initClickRipples() {
  if (document.body.dataset.clickRippleInit === 'true') return;
  document.body.dataset.clickRippleInit = 'true';

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const ripple = document.createElement('span');
      ripple.className = 'tactile-click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);

      ripple.addEventListener(
        'animationend',
        () => {
          ripple.remove();
        },
        { once: true }
      );
    },
    { passive: true }
  );
}