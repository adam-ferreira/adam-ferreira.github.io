// Mode jour / nuit : celui du système par défaut, ou le choix mémorisé du visiteur. Rattaché à la barre (Topbar.astro).
const root = document.documentElement;

var btn = document.querySelector('.theme-toggle');
var mq = window.matchMedia('(prefers-color-scheme: dark)');
var saved = null;
try { saved = localStorage.getItem('cv-theme'); } catch (e) {}
function apply(t) {
  root.dataset.theme = t;
  if (!btn) return;
  btn.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
  btn.title = t === 'dark' ? (btn.dataset.titleDark || 'Switch to light mode') : (btn.dataset.titleLight || 'Switch to dark mode');
}
apply(saved || (mq.matches ? 'dark' : 'light'));
if (btn) btn.addEventListener('click', function () {
  var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  saved = next;
  try { localStorage.setItem('cv-theme', next); } catch (e) {}
  apply(next);
});
mq.addEventListener('change', function (e) { if (!saved) apply(e.matches ? 'dark' : 'light'); });
