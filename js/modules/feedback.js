export function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  const responseMsg = document.getElementById('response-message');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 狀態設定
    submitBtn.disabled = true;
    submitBtn.textContent = '傳送中...';
    responseMsg.className = 'response-message';
    responseMsg.textContent = '';

    const formData = new FormData(form);

    /* 
      【註】這裡使用了 Web3Forms 的測試 Key (YOUR_WEB3FORMS_ACCESS_KEY)。
      奇老師可前往 https://web3forms.com/ 輸入 Email 免費申請專屬 Access Key，
      收到 Key 後替換下方字串，使用者送出的意見就會自動寄到您的信箱！
    */
    formData.append("access_key", "afea166a-00d6-441f-8e95-15915c5d2995");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        responseMsg.className = 'response-message success';
        responseMsg.textContent = '感謝您的寶貴意見！我會盡快回覆。';
        form.reset();
      } else {
        responseMsg.className = 'response-message error';
        responseMsg.textContent = '❌ 傳送失敗，請稍後再試。';
      }
    } catch (err) {
      responseMsg.className = 'response-message error';
      responseMsg.textContent = '⚠️ 發生網路連線錯誤，請稍後再試。';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '送出意見回饋';
    }
  });
}