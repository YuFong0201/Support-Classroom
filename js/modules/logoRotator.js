export function initLogoRotator() {
  const words = document.querySelectorAll('.logo-rotator .logo-word');
  if (words.length < 2) return;

  let currentIndex = 0;
  const intervalTime = 2500; 

  setInterval(() => {
    const currentWord = words[currentIndex];
    const nextIndex = (currentIndex + 1) % words.length;
    const nextWord = words[nextIndex];

    // 1. 當前文字向上滑出
    currentWord.classList.remove('active');
    currentWord.classList.add('leave');

    // 2. 下一個文字從下方滑入顯示
    nextWord.classList.remove('leave');
    nextWord.classList.add('active');

    // 3. 重置離場文字的位置
    setTimeout(() => {
      currentWord.classList.remove('leave');
    }, 600); // 配合 CSS 0.6s transition

    currentIndex = nextIndex;
  }, intervalTime);
}