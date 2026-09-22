// Navigation entre les écrans de la page (Cv.astro) : repère de progression, mode scène sur ordinateur, défilement
// normal ailleurs (et Lenis sur les écrans moyens à la souris).
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fr = root.lang === 'fr';

// ---------- mode « scène » (ordinateur) ----------
// La page ne défile plus : chaque écran (.slide) est une scène fixe, et le passage de l'une à l'autre se fait en CSS,
// par la carte graphique (transform, opacity). Un geste = un écran ; un écran plus haut que la fenêtre défile d'abord
// à l'intérieur. La classe html.stage est posée dès le <head> (src/components/Head.astro) pour éviter tout saut à l'affichage.
const stage = root.classList.contains('stage');
const slides = [...document.querySelectorAll('.slide')];
const DURATION = reduced ? 0 : 1000;
const bar = document.querySelector('.topbar');
let cur = 0, moving = false, locked = false, lastWheel = 0, lastDelta = 0, moveTimer = 0;

// repère de progression (grand écran) : un trait par écran, un compteur, un clic pour y aller
let pager = null, ticks = [], count = null;
const labelOf = (p) => {
  if (p.classList.contains('header')) return fr ? 'Accueil' : 'Home';
  if (p.classList.contains('site-footer')) return 'Contact';
  const h = p.querySelector('.section-title, .job-title');
  const txt = h ? h.textContent.trim() : '';
  if (p.classList.contains('job')) { const n = p.querySelector('.job-num'); const parts = txt.split('—'); return (n ? n.textContent + ' ' : '') + (parts[1] || parts[0]).trim(); }
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
  // juste après la barre : au clavier, on atteint le repère avant le contenu (il est fixe, sa place à l'écran ne change pas)
  if (bar) bar.after(pager); else document.body.appendChild(pager);
  setCurrent(0);
}

// keepScroll : navigation déclenchée par le focus (touche Tab) — on ne touche pas au défilement interne de l'écran,
// que le navigateur vient de régler pour montrer l'élément focalisé
function goTo(n, keepScroll) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (!stage) { slides[n].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); return; }
  if (n === cur) return;
  const prev = cur, back = n < prev;
  cur = n; moving = true;
  root.classList.add('is-moving');
  // 1. Sans transition : les écrans qui ne font pas partie du passage (saut par Début, Fin ou le repère) vont
  //    directement à leur place hors champ — on ne doit pas les voir traverser la fenêtre. L'écran d'arrivée, s'il
  //    était rangé au-dessus, reprend sa pose « reculée », d'où il revient.
  const quiet = slides.filter((_, k) => k !== n && k !== prev);
  if (slides[n].classList.contains('is-parked')) quiet.push(slides[n]);
  quiet.forEach((s) => s.classList.add('no-trans'));
  slides.forEach((s, k) => {
    if (k === n) { s.classList.remove('is-parked'); return; }
    if (k === prev) return;
    s.classList.remove('is-current', 'is-active', 'is-leaving');
    s.classList.toggle('is-before', k < n); s.classList.toggle('is-parked', k < n); s.classList.toggle('is-after', k > n);
  });
  void document.body.offsetWidth;   // ces positions sont appliquées avant que les transitions ne reprennent
  quiet.forEach((s) => s.classList.remove('no-trans'));
  // 2. Le passage, animé : l'écran courant part (en revenant, il redescend par-dessus), le nouveau arrive.
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
    // l'écran sorti par le haut (déjà invisible) est rangé hors champ : plus rien à dessiner
    slides.forEach((s, k) => { s.classList.remove('is-leaving'); if (k < cur) s.classList.add('is-parked'); });
  }, DURATION + 30);
}

if (stage && slides.length) {
  // état de départ, sans animation
  root.classList.add('stage-init');
  slides.forEach((s, k) => {
    s.classList.toggle('is-current', k === 0); s.classList.toggle('is-active', k === 0);
    s.classList.toggle('is-after', k > 0); s.setAttribute('tabindex', '-1');
  });
  root.dataset.slide = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('stage-init')));

  const canScroll = (s, dir) => (dir > 0 ? s.scrollTop + s.clientHeight < s.scrollHeight - 2 : s.scrollTop > 2);
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // zoom au pincement, geste horizontal : on laisse faire
    const d = e.deltaY, dir = d > 0 ? 1 : -1, now = performance.now();
    const fresh = now - lastWheel > 180 || Math.abs(d) > Math.abs(lastDelta) * 1.5 + 6;   // nouveau geste, pas l'élan du précédent
    lastWheel = now; lastDelta = d;
    if (!moving && canScroll(slides[cur], dir)) { locked = true; return; }   // l'écran défile d'abord à l'intérieur
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
  // « Aller au contenu » : l'écran « Experience », qui reçoit le focus (le Tab suivant part de là)
  document.querySelector('.skip-link')?.addEventListener('click', (e) => { e.preventDefault(); goTo(1); slides[1].focus({ preventScroll: true }); });
  // clavier : Tab vers un lien d'un autre écran (le pied de page, par exemple) y emmène la scène
  document.addEventListener('focusin', (e) => {
    const s = e.target instanceof Element ? e.target.closest('.slide') : null;
    const i = s ? slides.indexOf(s) : -1;
    if (i >= 0 && i !== cur) goTo(i, true);
  });
  // passer en fenêtre étroite (ou revenir) change de mode : on recharge proprement
  window.matchMedia('(min-width: 1100px) and (min-height: 680px) and (hover: hover) and (pointer: fine)')
    .addEventListener('change', () => location.reload());
}

// ---------- défilement normal (téléphone, tablette, fenêtre étroite) ----------
if (!stage) {
  const onScroll = () => {
    const y = window.scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 24);
    document.body.classList.toggle('is-scrolled', y > 80);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // la page bouge : les rendus 3D se figent le temps du mouvement
  let settleTimer = 0;
  window.addEventListener('scroll', () => {
    root.classList.add('is-moving'); clearTimeout(settleTimer);
    settleTimer = setTimeout(() => root.classList.remove('is-moving'), 140);
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    // les titres géants se dévoilent à l'arrivée de leur section (on observe le conteneur, le titre étant masqué)
    const reveal = (w) => w.querySelector('.section-title')?.classList.add('is-in');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.section-title-wrapper').forEach((w) => { if (reduced) reveal(w); else io.observe(w); });
    // le nom se range dans le cadre du haut quand le grand nom de l'accueil est sorti de l'écran
    const nm = document.querySelector('.header .name');
    if (nm) new IntersectionObserver((en) => {
      document.body.classList.toggle('name-away', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
    }, { rootMargin: '-60px 0px 0px 0px' }).observe(nm);
    // l'écran courant (celui qui occupe le haut de la fenêtre) reçoit is-active, et le repère suit
    const panelIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => { en.target.classList.toggle('is-active', en.isIntersecting); if (en.isIntersecting) setCurrent(slides.indexOf(en.target)); });
    }, { rootMargin: '-10% 0px -35% 0px' });
    slides.forEach((p) => panelIO.observe(p));
  } else {
    document.querySelectorAll('.section-title').forEach((t) => t.classList.add('is-in'));
  }

  // défilement lissé (Lenis) : grands écrans à la souris hors mode scène, après le chargement
  const wide = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
  if (wide && !reduced) window.addEventListener('load', () => {
    import('lenis').then((m) => {   // chargé à la demande, dans son propre fichier
      const Lenis = m.default || m.Lenis;
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }).catch(() => {});
  });
}
