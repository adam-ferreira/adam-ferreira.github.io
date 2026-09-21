(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saved = null;
  try { saved = localStorage.getItem('cv-theme'); } catch (e) {}

  function apply(t) {
    root.dataset.theme = t;
    if (!btn) return;
    btn.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
    btn.title = t === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit';
  }
  apply(saved || (mq.matches ? 'dark' : 'light'));
  if (btn) {
    btn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      saved = next;
      try { localStorage.setItem('cv-theme', next); } catch (e) {}
      apply(next);
    });
  }
  mq.addEventListener('change', function (e) { if (!saved) apply(e.matches ? 'dark' : 'light'); });

  // La barre prend un trait et l'indice « défiler » s'efface dès qu'on a quitté le haut de page.
  var bar = document.querySelector('.topbar');
  function onScroll() {
    var y = window.scrollY;
    if (bar) bar.classList.toggle('is-scrolled', y > 24);
    document.body.classList.toggle('is-scrolled', y > 80);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Les titres géants se dévoilent quand leur section arrive à l'écran (une fois).
  // On observe le CONTENEUR : le titre, décalé sous son masque, n'est jamais « visible » pour l'observateur.
  var wraps = document.querySelectorAll('.section-title-wrapper');
  var reveal = function (w) { var t = w.querySelector('.section-title'); if (t) t.classList.add('is-in'); };
  if (reduced || !('IntersectionObserver' in window)) {
    wraps.forEach(reveal);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    wraps.forEach(function (w) { io.observe(w); });
  }

  // Le nom et le rôle se rangent dans le cadre du haut quand le grand nom de l'accueil est sorti de l'écran.
  var name = document.querySelector('.header .name');
  if (name && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      document.body.classList.toggle('name-away', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
    }, { rootMargin: '-60px 0px 0px 0px' }).observe(name);
  }

  // Défilement lissé (Lenis) : écran large avec souris seulement, après le chargement, jamais sous « réduire les animations ».
  var wide = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
  if (wide && !reduced) {
    window.addEventListener('load', function () {
      import('https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.mjs').then(function (m) {
        var Lenis = m.default || m.Lenis;
        var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
      }).catch(function () {});
    });
  }
})();
