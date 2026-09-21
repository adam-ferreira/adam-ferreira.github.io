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

  // Curseur : une bille orange ombrée comme une sphère, qui suit la souris avec un léger retard et s'étire dans le sens
  // du mouvement comme un objet physique ; au survol d'un lien ou d'un objet 3D, elle gonfle en bulle de verre.
  // Ordinateur avec souris seulement, jamais sous « réduire les animations » : le curseur natif reste alors.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    var cur = document.createElement('div');
    cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor-ball"></span>';
    document.body.appendChild(cur);
    var HOT = 'a, button, [role="switch"], .mark.is-3d, .hero3d, .brand';
    var mx = 0, my = 0, cx = 0, cy = 0, shown = false, hot = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; cx = mx; cy = my; root.classList.add('has-cursor'); tick(); }
      var h = !!(e.target && e.target.closest && e.target.closest(HOT));
      if (h !== hot) { hot = h; cur.classList.toggle('is-hot', hot); }
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-out'); });
    document.addEventListener('mouseenter', function () { cur.classList.remove('is-out'); });
    function tick() {
      var nx = cx + (mx - cx) * 0.35, ny = cy + (my - cy) * 0.35;
      var vx = nx - cx, vy = ny - cy; cx = nx; cy = ny;
      var s = Math.min(Math.sqrt(vx * vx + vy * vy) / 40, 0.4), a = Math.atan2(vy, vx) * 57.2958;
      // étirement le long du mouvement, sans faire tourner la lumière de la bille (rotation puis rotation inverse)
      cur.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) rotate(' + a.toFixed(1) + 'deg) scale(' + (1 + s).toFixed(3) + ',' + (1 - s * 0.5).toFixed(3) + ') rotate(' + (-a).toFixed(1) + 'deg)';
      requestAnimationFrame(tick);
    }
  }
})();
