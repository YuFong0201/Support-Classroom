/**
 * 空間物理「重力彈珠工具收藏盒」模組 (Matter.js Interactive Toybox)
 * 讀取 tools.json 將教學工具化為受真實重力與碰撞影響的可抓取圓角膠囊
 */
import { openModal } from './modal.js';

export async function initPhysicsToybox() {
  const section = document.getElementById('physics-toybox-section');
  if (!section || !window.Matter) return;

  try {
    const res = await fetch('data/tools.json');
    if (!res.ok) throw new Error('無法讀取 tools.json');
    const tools = await res.json();
    if (!tools.length) return;

    section.innerHTML = `
      <div class="toybox-header">
        <div>
          <h3 class="toybox-title">互動教具物理收藏盒</h3>
          <p class="toybox-subtitle">試著用滑鼠或觸控抓取、拋擲工具膠囊，點擊任一膠囊可直接開啟介紹</p>
        </div>
        <button type="button" id="toybox-reset-btn" class="toybox-reset-btn" title="重新掉落所有工具膠囊">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          <span>重新掉落</span>
        </button>
      </div>
      <div class="toybox-stage" id="toybox-stage">
        <div class="toybox-hint-watermark" aria-hidden="true">DRAG &amp; TOSS</div>
      </div>
    `;

    const stage = document.getElementById('toybox-stage');
    const resetBtn = document.getElementById('toybox-reset-btn');

    let hasInitialized = false;
    let setupSimulation = null;

    // 滾動進入視窗時才讓膠囊從上方掉落
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasInitialized) {
            hasInitialized = true;
            setupSimulation = startMatterWorld(stage, tools);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(stage);

    resetBtn.addEventListener('click', () => {
      if (typeof setupSimulation === 'function') {
        setupSimulation();
      }
    });
  } catch (err) {
    console.error('初始化物理收藏盒失敗：', err);
  }
}

function startMatterWorld(stage, tools) {
  const { Engine, World, Bodies, Body, Runner, Mouse, MouseConstraint, Events } = window.Matter;

  const engine = Engine.create({
    gravity: { x: 0, y: 0.95 }
  });

  const runner = Runner.create();
  Runner.run(runner, engine);

  let walls = [];
  let capsuleItems = [];

  const themes = [
    { bg: '#111827', text: '#FFFFFF', border: '#111827', dot: '#009FB7' },
    { bg: '#009FB7', text: '#FFFFFF', border: '#009FB7', dot: '#FFFFFF' },
    { bg: '#FFFFFF', text: '#111827', border: '#E5E7EB', dot: '#FE4A49' },
    { bg: '#FE4A49', text: '#FFFFFF', border: '#FE4A49', dot: '#FFFFFF' }
  ];

  const buildWalls = () => {
    if (walls.length) {
      World.remove(engine.world, walls);
    }
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const thickness = 80;

    walls = [
      Bodies.rectangle(w / 2, h + thickness / 2, w + 200, thickness, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(-thickness / 2, h / 2, thickness, h * 3, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(w + thickness / 2, h / 2, thickness, h * 3, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(w / 2, -h * 1.4, w + 200, thickness, { isStatic: true })
    ];

    World.add(engine.world, walls);
  };

  const mouse = Mouse.create(stage);
  mouse.pixelRatio = 1;
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.18,
      render: { visible: false }
    }
  });
  // 移除 Matter.js 預設滾輪攔截，避免頁面滾動到收藏盒時卡住
  mouse.element.removeEventListener('wheel', mouse.mousewheel);
  mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
  World.add(engine.world, mouseConstraint);

  let dragStartPos = { x: 0, y: 0 };
  let draggedBody = null;

  Events.on(mouseConstraint, 'startdrag', (e) => {
    draggedBody = e.body;
    dragStartPos = { x: mouse.position.x, y: mouse.position.y };
    stage.classList.add('is-grabbing');
  });

  Events.on(mouseConstraint, 'enddrag', (e) => {
    stage.classList.remove('is-grabbing');
    if (draggedBody && draggedBody === e.body) {
      const dist = Math.hypot(
        mouse.position.x - dragStartPos.x,
        mouse.position.y - dragStartPos.y
      );
      if (dist < 6 && draggedBody.toolData) {
        openModal(draggedBody.toolData);
      }
    }
    draggedBody = null;
  });

  const spawnCapsules = () => {
    capsuleItems.forEach(({ body, el }) => {
      World.remove(engine.world, body);
      el.remove();
    });
    capsuleItems = [];

    buildWalls();

    const stageW = stage.clientWidth;
    const isMobile = stageW < 640;
    const displayList = tools.length < 5 ? [...tools, ...tools] : tools;

    displayList.forEach((tool, idx) => {
      const theme = themes[idx % themes.length];
      const pillEl = document.createElement('div');
      pillEl.className = 'toybox-pill';
      pillEl.style.backgroundColor = theme.bg;
      pillEl.style.color = theme.text;
      pillEl.style.borderColor = theme.border;
      pillEl.innerHTML = `
        <span class="toybox-pill-dot" style="background-color: ${theme.dot};"></span>
        <span class="toybox-pill-text">${escapeHtml(tool.title)}</span>
      `;
      stage.appendChild(pillEl);

      const pillW = Math.min(pillEl.offsetWidth || (isMobile ? 140 : 185), stageW - 32);
      const pillH = pillEl.offsetHeight || (isMobile ? 42 : 48);

      const margin = pillW / 2 + 24;
      const startX = margin + Math.random() * Math.max(stageW - margin * 2, 20);
      const startY = -50 - idx * 55;

      const body = Bodies.rectangle(startX, startY, pillW, pillH, {
        chamfer: { radius: pillH / 2 },
        restitution: 0.62,
        friction: 0.15,
        frictionAir: 0.012,
        density: 0.0018
      });

      Body.setAngle(body, (Math.random() - 0.5) * 0.45);
      body.toolData = tool;

      World.add(engine.world, body);
      capsuleItems.push({ body, el: pillEl, w: pillW, h: pillH });
    });
  };

  const syncDomPositions = () => {
    for (let i = 0; i < capsuleItems.length; i++) {
      const { body, el, w, h } = capsuleItems[i];
      const x = body.position.x - w / 2;
      const y = body.position.y - h / 2;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${body.angle.toFixed(3)}rad)`;
    }
    requestAnimationFrame(syncDomPositions);
  };

  spawnCapsules();
  requestAnimationFrame(syncDomPositions);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildWalls();
      const maxW = stage.clientWidth;
      const maxH = stage.clientHeight;
      capsuleItems.forEach(({ body, w, h }) => {
        const clampedX = Math.max(w / 2 + 8, Math.min(body.position.x, maxW - w / 2 - 8));
        const clampedY = Math.min(body.position.y, maxH - h / 2 - 8);
        Body.setPosition(body, { x: clampedX, y: clampedY });
      });
    }, 150);
  });

  return spawnCapsules;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}