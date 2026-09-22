// Normal scrolling (phone, tablet, narrow window — everything but stage mode): the line under the top bar, the flag that
// tells the 3D the page is moving, the giant titles revealed when their section arrives, the name that moves into the
// top bar, the progress indicator following the screen at the top, and smooth scrolling on a large screen with a mouse.
import { slides, bar, setCurrent } from './pager.js';
import { DESKTOP, REDUCED_MOTION, matches } from '../media.js';

const root = document.documentElement;
const reduced = matches(REDUCED_MOTION);

if (!root.classList.contains('stage')) {
  const onScroll = () => {
    const y = window.scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 24);
    document.body.classList.toggle('is-scrolled', y > 80);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // the page is moving: 3D rendering freezes for the duration of the move
  let settleTimer = 0;
  window.addEventListener('scroll', () => {
    root.classList.add('is-moving'); clearTimeout(settleTimer);
    settleTimer = setTimeout(() => root.classList.remove('is-moving'), 140);
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    // the giant titles are revealed when their section arrives (we observe the wrapper, since the title itself is hidden)
    const reveal = (w) => w.querySelector('.section-title')?.classList.add('is-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.section-title-wrapper').forEach((w) => { if (reduced) reveal(w); else io.observe(w); });
    // the name moves into the top bar once the big name of the hero has left the screen
    const nm = document.querySelector('.header .name');
    if (nm) new IntersectionObserver((en) => {
      document.body.classList.toggle('name-away', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
    }, { rootMargin: '-60px 0px 0px 0px' }).observe(nm);
    // the current screen (the one at the top of the window) gets is-active, and the indicator follows
    const panelIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => { en.target.classList.toggle('is-active', en.isIntersecting); if (en.isIntersecting) setCurrent(slides.indexOf(en.target)); });
    }, { rootMargin: '-10% 0px -35% 0px' });
    slides.forEach((p) => panelIO.observe(p));
  } else {
    document.querySelectorAll('.section-title').forEach((t) => t.classList.add('is-in'));
  }

  // smooth scrolling (Lenis): large screens with a mouse outside stage mode, after load
  if (matches(DESKTOP) && !reduced) window.addEventListener('load', () => {
    import('lenis').then((m) => {   // loaded on demand, in its own file
      const Lenis = m.default || m.Lenis;
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }).catch(() => {});
  });
}
