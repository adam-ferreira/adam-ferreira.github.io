// Light / dark switch (ThemeToggle.astro): the system theme by default, or the visitor's remembered choice (already
// applied before the first paint by the boot script in Head.astro).
import { THEME_KEY } from '../scripts/theme.js';
const root = document.documentElement;
const btn = document.querySelector('.theme-toggle');
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let saved = null;
try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable (private browsing): fall back to the system theme */ }
if (saved !== 'light' && saved !== 'dark') saved = null;

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
  try { localStorage.setItem(THEME_KEY, next); } catch { /* same as above */ }
  apply(next);
});
mq.addEventListener('change', (e) => { if (!saved) apply(e.matches ? 'dark' : 'light'); });
