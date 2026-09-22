// Light / dark switch (ThemeToggle.astro): the system theme by default, or the visitor's remembered choice.
const root = document.documentElement;
const btn = document.querySelector('.theme-toggle');
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let saved = null;
try { saved = localStorage.getItem('cv-theme'); } catch { /* storage unavailable (private browsing): fall back to the system theme */ }

function apply(t) {
  root.dataset.theme = t;
  if (!btn) return;
  btn.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
  btn.title = t === 'dark' ? (btn.dataset.titleDark || 'Switch to light mode') : (btn.dataset.titleLight || 'Switch to dark mode');
}
apply(saved || (mq.matches ? 'dark' : 'light'));
btn?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  saved = next;
  try { localStorage.setItem('cv-theme', next); } catch { /* same as above */ }
  apply(next);
});
mq.addEventListener('change', (e) => { if (!saved) apply(e.matches ? 'dark' : 'light'); });
