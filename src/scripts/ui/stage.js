// "Stage" mode (computer with a mouse, window at least 1100 x 680): the page no longer scrolls. Each screen (.slide) is
// a fixed scene, and moving from one to the next is done in CSS, on the GPU (transform, opacity). One gesture = one
// screen; a screen taller than the window scrolls inside first. The html.stage class is set from the <head>
// (src/components/BaseHead.astro) so nothing jumps on the first paint.
import { slides, bar, setCurrent, setNavigator } from './pager.js';
import { STAGE, REDUCED_MOTION, matches } from '../media.js';

const root = document.documentElement;
const reduced = matches(REDUCED_MOTION);
const stage = root.classList.contains('stage');
// the move lasts what the stylesheet says (--stage-duration in stage.css), so the two never drift apart
const cssMs = (name, fallback) => {
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  return v.endsWith('ms') ? parseFloat(v) : v.endsWith('s') ? parseFloat(v) * 1000 : fallback;
};
const DURATION = reduced ? 0 : cssMs('--stage-duration', 1000);
let cur = 0, moving = false, locked = false, lastWheel = 0, lastDelta = 0, moveTimer = 0;

// keepScroll: navigation triggered by focus (Tab key) — leave the screen's inner scroll alone, the browser has just set
// it to show the focused element
function goTo(n, keepScroll) {
  n = Math.max(0, Math.min(slides.length - 1, n));
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
  setNavigator(goTo);   // a click on a tick of the indicator moves the stage instead of scrolling
  // initial state, without animation
  root.classList.add('stage-init');
  slides.forEach((s, k) => {
    s.classList.toggle('is-current', k === 0); s.classList.toggle('is-active', k === 0);
    s.classList.toggle('is-after', k > 0); s.setAttribute('tabindex', '-1');
  });
  root.dataset.slide = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('stage-init')));
  // a screen taller than the window scrolls: it joins the Tab order, so the keyboard can reach and scroll it
  const tabbable = () => slides.forEach((s) => s.setAttribute('tabindex', s.scrollHeight > s.clientHeight + 2 ? '0' : '-1'));
  tabbable();
  window.addEventListener('resize', tabbable);

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
  window.matchMedia(STAGE).addEventListener('change', () => location.reload());
}
