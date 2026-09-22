// Interrupteur jour / nuit (ThemeToggle.astro) : le thème du système par défaut, ou le choix mémorisé du visiteur.
const root = document.documentElement;
const btn = document.querySelector('.theme-toggle');
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let saved = null;
try { saved = localStorage.getItem('cv-theme'); } catch { /* stockage indisponible (navigation privée) : le thème du système */ }

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
  try { localStorage.setItem('cv-theme', next); } catch { /* idem */ }
  apply(next);
});
mq.addEventListener('change', (e) => { if (!saved) apply(e.matches ? 'dark' : 'light'); });
