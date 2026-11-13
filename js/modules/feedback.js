export function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  const responseMsg = document.getElementById('response-message');
  const submitBtn = document.getElementById('submit-btn');

  if (!form || !submitBtn) return;

  const planeSvg = `
    <span class="submit-btn-icon" aria-hidden="true">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2 11 13"></path>
        <path d="m22 2-7 20-4-9-9-4Z"></path>
      </svg>
    </span>
  `;

  // 初始化按鈕內容為「紙飛機圖示 + 文字」
  const setButtonContent = (labelText) => {
    submitBtn.innerHTML = `${planeSvg}<span class="submit-btn-label">${labelText}</span>`;
  };

  setButtonContent('送出意見回饋');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.classList.remove('is-sent');
    setButtonContent('傳送中...');
    responseMsg.className = 'response-message';
    responseMsg.textContent = '';

    const formData = new FormData(form);
    formData.append("access_key", "afea166a-00d6-441f-8e95-15915c5d2995");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        submitBtn.disabled = false;
        setButtonContent('已成功送出回饋！');

        // 觸發 3D 紙飛機起飛動畫與品牌三色微粒彩帶慶祝
        requestAnimationFrame(() => {
          submitBtn.classList.add('is-sent');
          launchBrandConfetti(submitBtn);
        });

        responseMsg.className = 'response-message success';
        responseMsg.textContent = '感謝您的寶貴意見與許願！奇老師收到後會盡快評估與回覆。';
        form.reset();

        // 2.6 秒後平滑恢復為預設按鈕狀態，方便再次填寫
        setTimeout(() => {
          submitBtn.classList.remove('is-sent');
          setButtonContent('送出意見回饋');
        }, 2600);
      } else {
        submitBtn.disabled = false;
        setButtonContent('送出意見回饋');
        responseMsg.className = 'response-message error';
        responseMsg.textContent = '❌ 傳送失敗，請稍後再試。';
      }
    } catch (err) {
      submitBtn.disabled = false;
      setButtonContent('送出意見回饋');
      responseMsg.className = 'response-message error';
      responseMsg.textContent = '⚠️ 發生網路連線錯誤，請稍後再試。';
    }
  });
}

/**
 * 從按鈕中心向四周拋射克制的品牌三色幾何微粒彩帶
 */
function launchBrandConfetti(originEl) {
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  // 品牌三色：湖水藍、珊瑚紅、石墨黑
  const colors = ['#009FB7', '#FE4A49', '#111827', '#38BDF8'];
  const particleCount = 26;

  for (let i = 0; i < particleCount; i++) {
    const piece = document.createElement('span');
    piece.className = 'feedback-confetti-piece';

    const color = colors[i % colors.length];
    const isCircle = i % 3 === 0;
    const width = isCircle ? 7 : 8 + Math.random() * 4;
    const height = isCircle ? 7 : 4 + Math.random() * 3;

    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.backgroundColor = color;
    piece.style.borderRadius = isCircle ? '50%' : '2px';
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;

    document.body.appendChild(piece);

    // 向上扇形噴射角度 (-155° ~ -25°)
    const angle = (-155 + Math.random() * 130) * (Math.PI / 180);
    const velocity = 110 + Math.random() * 140;
    const targetX = Math.cos(angle) * velocity;
    const peakY = Math.sin(angle) * velocity;
    const fallY = peakY + 95 + Math.random() * 60;
    const spin = (Math.random() - 0.5) * 540;
    const duration = 850 + Math.random() * 350;

    if (window.anime) {
      window.anime({
        targets: piece,
        translateX: [0, targetX],
        translateY: [
          { value: peakY, duration: duration * 0.45, easing: 'easeOutCubic' },
          { value: fallY, duration: duration * 0.55, easing: 'easeInQuad' }
        ],
        rotate: [0, spin],
        opacity: [
          { value: 1, duration: duration * 0.65 },
          { value: 0, duration: duration * 0.35 }
        ],
        duration,
        complete: () => piece.remove()
      });
    } else {
      // 原生 Web Animations API 備援
      const anim = piece.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${targetX * 0.6}px, ${peakY}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${targetX}px, ${fallY}px) rotate(${spin}deg)`, opacity: 0 }
        ],
        { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
      anim.onfinish = () => piece.remove();
    }
  }
}