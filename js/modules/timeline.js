export async function renderChangelog() {
  const announcementsContainer = document.getElementById('announcements-container');
  const historyContainer = document.getElementById('history-container');

  if (!announcementsContainer || !historyContainer) return;

  try {
    const response = await fetch('data/changelog.json');
    const data = await response.json();

    // 1. 渲染頂部最新公告 (前 3~5 條)
    announcementsContainer.innerHTML = data.announcements.map(ann => `
      <div class="announcement-card">
        <div class="announcement-header">
          <span class="announcement-badge">${ann.category}</span>
          <span class="announcement-date">${ann.date}</span>
        </div>
        <h3 class="announcement-title">${ann.title}</h3>
        <p class="announcement-content">${ann.content}</p>
      </div>
    `).join('');

    // 2. 渲染工具更新歷史時間軸（內建動態品牌漸層流光光束 .timeline-beam）
    historyContainer.innerHTML = data.history.map(tool => `
      <div class="timeline-tool-group">
        <h3 class="tool-group-title">🛠️ ${tool.toolName}</h3>
        <div class="timeline">
          <div class="timeline-beam" aria-hidden="true"></div>
          ${tool.logs.map((log, idx) => `
            <div class="timeline-item ${idx === 0 ? 'active' : ''}">
              <div class="timeline-dot"></div>
              <div class="timeline-header">
                <div class="version-info">
                  <span class="version-tag">${log.version}</span>
                  <span class="version-date">${log.date}</span>
                </div>
                <span class="toggle-icon">▼</span>
              </div>
              <div class="timeline-body">
                <ul class="details-list">
                  ${log.details.map(item => `<li>${item}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // 3. 綁定時間軸展開/收合點擊事件 & 啟動滾動導讀光束
    const updateBeams = initTimelineScrollBeam();
    initTimelineAccordion(updateBeams);
  } catch (error) {
    console.error('無法載入更新日誌資料：', error);
  }
}

/**
 * 動態品牌漸層流光導讀時間軸 (Scroll-Driven Timeline Beam)
 * 隨頁面滾動將湖水藍->珊瑚紅漸層光束注入時間軸，並依序點亮經過的版本圓點
 */
function initTimelineScrollBeam() {
  const timelines = document.querySelectorAll('.timeline');
  if (!timelines.length) return () => {};

  let rafPending = false;

  const updateBeams = () => {
    rafPending = false;
    // 閱讀焦點線設定於視窗高度 68% 處，符合人眼自然向下閱讀視線
    const triggerLine = window.innerHeight * 0.68;

    timelines.forEach((timeline) => {
      const beam = timeline.querySelector('.timeline-beam');
      const items = timeline.querySelectorAll('.timeline-item');
      if (!beam) return;

      const rect = timeline.getBoundingClientRect();
      const totalHeight = timeline.offsetHeight;

      // 計算閱讀焦點線相對於時間軸頂部的填充高度
      const rawFill = triggerLine - rect.top;
      const clampedHeight = Math.max(0, Math.min(rawFill, totalHeight));

      beam.style.height = `${clampedHeight}px`;

      if (clampedHeight > 4 && clampedHeight < totalHeight - 2) {
        beam.classList.add('is-flowing');
      } else {
        beam.classList.remove('is-flowing');
      }

      // 依序點亮光束前端已經過的版本節點
      items.forEach((item) => {
        const dotOffset = item.offsetTop + 16;
        if (clampedHeight >= dotOffset) {
          item.classList.add('is-lit');
        } else {
          item.classList.remove('is-lit');
        }
      });
    });
  };

  const requestUpdate = () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateBeams);
    }
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  // 初始計算一次
  requestAnimationFrame(updateBeams);

  return requestUpdate;
}

function initTimelineAccordion(onToggleCallback) {
  const timelineHeaders = document.querySelectorAll('.timeline-header');

  timelineHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active');

      // 手風琴展開/收合動畫過程中與結束後重新校準流光高度
      if (typeof onToggleCallback === 'function') {
        setTimeout(onToggleCallback, 160);
        setTimeout(onToggleCallback, 340);
      }
    });
  });
}