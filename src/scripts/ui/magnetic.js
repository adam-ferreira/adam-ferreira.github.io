// Buttons that lean towards the mouse: the contact pills and the switches of the top bar. Mouse only, never under
// "reduce motion". Loaded by the page (Cv.astro).
import { MOUSE, REDUCED_MOTION, matches } from '../media.js';

if (matches(MOUSE) && !matches(REDUCED_MOTION)) {
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));
  for (const el of document.querySelectorAll('.pill, .theme-toggle, .sound-toggle')) {
    el.classList.add('is-magnetic');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = clamp((e.clientX - (r.left + r.width / 2)) * 0.25, 6), dy = clamp((e.clientY - (r.top + r.height / 2)) * 0.35, 5);
      el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  }
}
