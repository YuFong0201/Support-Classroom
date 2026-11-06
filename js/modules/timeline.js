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

    // 2. 渲染工具更新歷史時間軸
    historyContainer.innerHTML = data.history.map(tool => `
      <div class="timeline-tool-group">
        <h3 class="tool-group-title">🛠️ ${tool.toolName}</h3>
        <div class="timeline">
          ${tool.logs.map(log => `
            <div class="timeline-item">
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

    // 3. 綁定時間軸展開/收合點擊事件
    initTimelineAccordion();
  } catch (error) {
    console.error('無法載入更新日誌資料：', error);
  }
}

function initTimelineAccordion() {
  const timelineHeaders = document.querySelectorAll('.timeline-header');

  timelineHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active');
    });
  });
}