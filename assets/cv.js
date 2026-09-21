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
    btn.title = t === 'dark' ? (btn.dataset.titleDark || 'Switch to light mode') : (btn.dataset.titleLight || 'Switch to dark mode');
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
  // … mais jamais là où le défilement se cale écran par écran (grand écran) : les deux se battraient.
  var wide = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
  var snapping = window.matchMedia('(min-width: 1100px) and (min-height: 680px)').matches;
  if (wide && !snapping && !reduced) {
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

  // Écrans : l'écran courant est celui qui occupe la bande haute de la fenêtre (marche aussi pour un écran plus haut qu'elle).
  // Il reçoit is-active (son contenu se pose en cascade, cv.css) ; le repère de droite suit et permet d'y aller en un clic.
  var panels = [].slice.call(document.querySelectorAll('.header, .chapter, .job, .facts, .site-footer'));
  if (panels.length && 'IntersectionObserver' in window) {
    var fr = document.documentElement.lang === 'fr';
    var labelOf = function (p) {
      if (p.classList.contains('header')) return fr ? 'Accueil' : 'Home';
      if (p.classList.contains('site-footer')) return 'Contact';
      var h = p.querySelector('.section-title, .job-title');
      var txt = h ? h.textContent.trim() : '';
      if (p.classList.contains('job')) { var n = p.querySelector('.job-num'); var parts = txt.split('\u2014'); return (n ? n.textContent + ' ' : '') + (parts[1] || parts[0]).trim(); }
      return txt;
    };
    var pager = document.createElement('nav');
    pager.className = 'pager'; pager.setAttribute('aria-label', fr ? 'Écrans de la page' : 'Page sections');
    var count = document.createElement('span'); count.className = 'pager-count label'; count.setAttribute('aria-hidden', 'true');
    pager.appendChild(count);
    var ticks = panels.map(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pager-tick'; b.title = labelOf(p); b.setAttribute('aria-label', labelOf(p));
      b.addEventListener('click', function () { goTo(i); });
      pager.appendChild(b); return b;
    });
    document.body.appendChild(pager);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var setCurrent = function (i) {
      ticks.forEach(function (t, k) { t.classList.toggle('is-current', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      count.textContent = pad(i + 1) + ' / ' + pad(panels.length);
      pager.classList.toggle('is-inverted', panels[i].classList.contains('site-footer'));
    };
    setCurrent(0);
    var panelIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-active', en.isIntersecting);
        if (en.isIntersecting) setCurrent(panels.indexOf(en.target));
      });
    }, { rootMargin: '-10% 0px -35% 0px' });   // actif dès que son haut passe aux deux tiers de la fenêtre : le contenu arrive pendant la transition
    panels.forEach(function (p) { panelIO.observe(p); });
  }

  // ---------- transitions entre écrans, conduites à la main (grand écran) ----------
  // Un geste (molette, trackpad, flèches, Page suivante, Espace) = un mouvement unique d'environ une seconde vers l'écran
  // suivant, avec une courbe douce. L'élan résiduel du trackpad est ignoré jusqu'au geste suivant. Un écran plus haut que
  // la fenêtre se fait d'abord défiler jusqu'en bas. Le calage natif du navigateur saccadait avec l'élan : on s'en passe.
  var snapMQ = window.matchMedia('(min-width: 1100px) and (min-height: 680px)');
  var BAR = 60, tween = null, locked = false, lastWheel = 0, lastDelta = 0;
  var topOf = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
  var ease = function (u) { return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2; };   // easeInOutQuart
  function scrollToY(y, ms) {
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight));
    if (reduced) { window.scrollTo(0, y); return; }
    var y0 = window.scrollY, t0 = performance.now();
    if (tween) cancelAnimationFrame(tween);
    (function frame(now) {
      var u = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, y0 + (y - y0) * ease(u));
      if (u < 1) tween = requestAnimationFrame(frame); else { tween = null; locked = true; }
    })(t0);
  }
  function currentIndex() {
    var y = window.scrollY + BAR + 4, k = 0;
    for (var n = 0; n < panels.length; n++) if (topOf(panels[n]) <= y) k = n;
    return k;
  }
  function goTo(n) {
    if (!panels.length) return;
    n = Math.max(0, Math.min(panels.length - 1, n));
    if (!snapMQ.matches) { panels[n].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); return; }
    scrollToY(topOf(panels[n]) - BAR, 1000);
  }
  function step(dir) {
    var i = currentIndex(), p = panels[i], top = topOf(p), bottom = top + p.offsetHeight;
    var viewTop = window.scrollY + BAR, viewBottom = window.scrollY + window.innerHeight, page = window.innerHeight - BAR;
    if (dir > 0 && bottom > viewBottom + 2) return scrollToY(Math.min(window.scrollY + page * 0.85, bottom - window.innerHeight), 600);
    if (dir < 0 && top < viewTop - 2) return scrollToY(Math.max(window.scrollY - page * 0.85, top - BAR), 600);
    if (i + dir < 0 || i + dir >= panels.length) return;
    goTo(i + dir);
  }
  if (panels.length) {
    window.addEventListener('wheel', function (e) {
      if (!snapMQ.matches || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // zoom au pincement, défilement horizontal : on laisse faire
      e.preventDefault();
      var now = performance.now(), d = e.deltaY;
      var fresh = now - lastWheel > 180 || Math.abs(d) > Math.abs(lastDelta) * 1.5 + 6;   // nouveau geste, pas l'élan du précédent
      lastWheel = now; lastDelta = d;
      if (tween || Math.abs(d) < 3) return;
      if (locked && !fresh) return;
      locked = false;
      step(d > 0 ? 1 : -1);
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (!snapMQ.matches || e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      var k = e.key, dir = 0;
      if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
      else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
      else if (k === 'Home') { e.preventDefault(); return goTo(0); }
      else if (k === 'End') { e.preventDefault(); return goTo(panels.length - 1); }
      if (!dir) return;
      e.preventDefault();
      if (!tween) step(dir);
    });
  }
})();
