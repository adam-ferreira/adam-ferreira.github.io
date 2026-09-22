// The screens of the page (.slide) and the progress indicator that lists them: one tick per screen, a counter, a click
// to go there. Built here rather than written in the page: without JavaScript it would lead nowhere.
// stage.js (one screen at a time, on a computer) and scroll.js (normal scrolling) share it: they say which screen is
// current, and stage.js replaces the way a tick navigates.
import { REDUCED_MOTION, matches } from '../media.js';

const root = document.documentElement;
const fr = root.lang === 'fr';
export const slides = [...document.querySelectorAll('.slide')];
export const bar = document.querySelector('.topbar');

const labelOf = (p) => {
  if (p.classList.contains('header')) return fr ? 'Accueil' : 'Home';
  if (p.classList.contains('site-footer')) return 'Contact';
  const h = p.querySelector('.section-title, .entry-title');
  const txt = h ? h.textContent.trim() : '';
  if (p.classList.contains('job')) { const n = p.querySelector('.entry-num'); const parts = txt.split('—'); return (n ? n.textContent + ' ' : '') + (parts[1] || parts[0]).trim(); }
  return txt;
};
const pad = (n) => (n < 10 ? '0' : '') + n;

let pager = null, ticks = [], count = null;
/** What a tick does: scroll to the screen, unless stage.js takes over (the page does not scroll there). */
let navigate = (i) => slides[i].scrollIntoView({ behavior: matches(REDUCED_MOTION) ? 'auto' : 'smooth', block: 'start' });
export const setNavigator = (fn) => { navigate = fn; };

export function setCurrent(i) {
  if (!pager) return;
  ticks.forEach((t, k) => { t.classList.toggle('is-current', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  count.textContent = pad(i + 1) + ' / ' + pad(slides.length);
  pager.classList.toggle('is-inverted', slides[i].classList.contains('site-footer'));
}

if (slides.length) {
  pager = document.createElement('nav');
  pager.className = 'pager'; pager.setAttribute('aria-label', fr ? 'Écrans de la page' : 'Page sections');
  count = document.createElement('span'); count.className = 'pager-count label'; count.setAttribute('aria-hidden', 'true');
  pager.appendChild(count);
  ticks = slides.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pager-tick'; b.title = labelOf(p); b.setAttribute('aria-label', labelOf(p));
    b.addEventListener('click', () => navigate(i));
    pager.appendChild(b); return b;
  });
  // right after the top bar: keyboard users reach the indicator before the content (it is fixed, so its place on screen does not change)
  if (bar) bar.after(pager); else document.body.appendChild(pager);
  setCurrent(0);
}
