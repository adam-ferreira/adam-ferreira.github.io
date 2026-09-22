// Navigation between the page's screens (Cv.astro): progress indicator, stage mode on a computer, normal scrolling
// elsewhere (and Lenis on medium-sized screens with a mouse).
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fr = root.lang === 'fr';

// ---------- "stage" mode (computer) ----------
// The page no longer scrolls: each screen (.slide) is a fixed scene, and moving from one to the next is done in CSS, on
// the GPU (transform, opacity). One gesture = one screen; a screen taller than the window scrolls inside first.
// The html.stage class is set from the <head> (src/components/Head.astro) so nothing jumps on first paint.
const stage = root.classList.contains('stage');
const slides = [...document.querySelectorAll('.slide')];
const DURATION = reduced ? 0 : 1000;
const bar = document.querySelector('.topbar');
let cur = 0, moving = false, locked = false, lastWheel = 0, lastDelta = 0, moveTimer = 0;

// progress indicator (large screens): one tick per screen, a counter, a click to go there
let pager = null, ticks = [], count = null;
const labelOf = (p) => {
  if (p.classList.contains('header')) return fr ? 'Accueil' : 'Home';
  if (p.classList.contains('site-footer')) return 'Contact';
  const h = p.querySelector('.section-title, .entry-title');
  const txt = h ? h.textContent.trim() : '';
  if (p.classList.contains('job')) { const n = p.querySelector('.entry-num'); const parts = txt.split('—'); return (n ? n.textContent + ' ' : '') + (parts[1] || parts[0]).trim(); }
  return txt;
};
const pad = (n) => (n < 10 ? '0' : '') + n;
function setCurrent(i) {
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
    b.addEventListener('click', () => goTo(i));
    pager.appendChild(b); return b;
  });
  // right after the top bar: keyboard users reach the indicator before the content (it is fixed, so its place on screen does not change)
  if (bar) bar.after(pager); else document.body.appendChild(pager);
  setCurrent(0);
}

// keepScroll: navigation triggered by focus (Tab key) — leave the screen's inner scroll alone, the browser has just set
// it to show the focused element
function goTo(n, keepScroll) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (!stage) { slides[n].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); return; }
  if (n === cur) return;
  const prev = cur, back = n < prev;
  cur = n; moving = true;
  root.classList.add('is-moving');
  // 1. Without transition: screens that are not part of the move (a jump with Home, End or the indicator) go straight to
  //    their off-screen place — they must not be seen crossing the window. The target screen, if it was parked above,
  //    first takes back its "receded" pose, which it returns from.
  const quiet = slides.filter((_, k) => k !== n && k !== prev);
  if (slides[n].classList.contains('is-parked')) quiet.push(slides[n]);
  quiet.forEach((s) => s.classList.add('no-trans'));
  slides.forEach((s, k) => {
    if (k === n) { s.classList.remove('is-parked'); return; }
    if (k === prev) return;
    s.classList.remove('is-current', 'is-active', 'is-leaving');
    s.classList.toggle('is-before', k < n); s.classList.toggle('is-parked', k < n); s.classList.toggle('is-after', k > n);
  });
  void document.body.offsetWidth;   // these positions are applied before transitions resume
  quiet.forEach((s) => s.classList.remove('no-trans'));
  // 2. The animated move: the current screen leaves (going back, it slides down over the other), the new one arrives.
  const from = slides[prev], to = slides[n];
  from.classList.remove('is-current', 'is-active');
  from.classList.toggle('is-before', !back); from.classList.toggle('is-after', back); from.classList.toggle('is-leaving', back);
  to.classList.remove('is-before', 'is-after'); to.classList.add('is-current', 'is-active');
  if (!keepScroll) to.scrollTop = back ? to.scrollHeight : 0;
  root.dataset.slide = String(n);
  document.body.classList.toggle('name-away', n > 0);
  document.body.classList.toggle('is-scrolled', n > 0);
  if (bar) bar.classList.toggle('is-scrolled', n > 0);
  setCurrent(n);
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    moving = false; locked = true;
    root.classList.remove('is-moving');
    // the screen that left through the top (already invisible) is parked off-screen: nothing left to draw
    slides.forEach((s, k) => { s.classList.remove('is-leaving'); if (k < cur) s.classList.add('is-parked'); });
  }, DURATION + 30);
}

if (stage && slides.length) {
  // initial state, without animation
  root.classList.add('stage-init');
  slides.forEach((s, k) => {
    s.classList.toggle('is-current', k === 0); s.classList.toggle('is-active', k === 0);
    s.classList.toggle('is-after', k > 0); s.setAttribute('tabindex', '-1');
  });
  root.dataset.slide = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('stage-init')));

  const canScroll = (s, dir) => (dir > 0 ? s.scrollTop + s.clientHeight < s.scrollHeight - 2 : s.scrollTop > 2);
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // pinch zoom, horizontal gesture: let the browser handle it
    const d = e.deltaY, dir = d > 0 ? 1 : -1, now = performance.now();
    const fresh = now - lastWheel > 180 || Math.abs(d) > Math.abs(lastDelta) * 1.5 + 6;   // a new gesture, not the momentum of the previous one
    lastWheel = now; lastDelta = d;
    if (!moving && canScroll(slides[cur], dir)) { locked = true; return; }   // the screen scrolls inside first
    e.preventDefault();
    if (moving || Math.abs(d) < 3) return;
    if (locked && !fresh) return;
    locked = false;
    goTo(cur + dir);
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = document.activeElement?.tagName ?? '';
    if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag) && e.key === ' ') return;
    const k = e.key;
    let dir = 0;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
    else if (k === 'Home') { e.preventDefault(); return goTo(0); }
    else if (k === 'End') { e.preventDefault(); return goTo(slides.length - 1); }
    if (!dir) return;
    e.preventDefault();
    if (moving) return;
    const s = slides[cur];
    if (canScroll(s, dir)) s.scrollBy({ top: dir * s.clientHeight * 0.8, behavior: reduced ? 'auto' : 'smooth' });
    else goTo(cur + dir);
  });
  // "Skip to content": the "Experience" screen, which receives focus (the next Tab starts from there)
  document.querySelector('.skip-link')?.addEventListener('click', (e) => { e.preventDefault(); goTo(1); slides[1].focus({ preventScroll: true }); });
  // keyboard: Tab to a link on another screen (the footer, for instance) takes the stage there
  document.addEventListener('focusin', (e) => {
    const s = e.target instanceof Element ? e.target.closest('.slide') : null;
    const i = s ? slides.indexOf(s) : -1;
    if (i >= 0 && i !== cur) goTo(i, true);
  });
  // switching to a narrow window (or back) changes mode: reload cleanly
  window.matchMedia('(min-width: 1100px) and (min-height: 680px) and (hover: hover) and (pointer: fine)')
    .addEventListener('change', () => location.reload());
}

// ---------- normal scrolling (phone, tablet, narrow window) ----------
if (!stage) {
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
  const wide = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
  if (wide && !reduced) window.addEventListener('load', () => {
    import('lenis').then((m) => {   // loaded on demand, in its own file
      const Lenis = m.default || m.Lenis;
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }).catch(() => {});
  });
}
