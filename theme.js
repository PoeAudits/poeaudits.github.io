const themeSelect = document.querySelector('#theme-select');
const themeKey = 'fanime-theme';
const fallbackTheme = 'manga-chapter';
const themes = new Set([
  'neon',
  'paper',
  'midnight',
  'clean',
  'scrapbook',
  'manga',
  'manga-ink',
  'manga-zine',
  'manga-chapter',
  'arcade',
]);

applyTheme(localStorage.getItem(themeKey) || fallbackTheme);

themeSelect?.addEventListener('change', () => {
  applyTheme(themeSelect.value);
  localStorage.setItem(themeKey, themeSelect.value);
});

function applyTheme(theme) {
  const safeTheme = themes.has(theme) ? theme : fallbackTheme;
  document.body.dataset.theme = safeTheme;

  if (themeSelect) {
    themeSelect.value = safeTheme;
  }
}
