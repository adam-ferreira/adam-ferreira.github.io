(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fr = root.lang === 'fr';

  // ---------- mode jour / nuit ----------
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

  // ---------- mode « scène » (ordinateur) ----------
  // La page ne défile plus : chaque écran (.slide) est une scène fixe, et le passage de l'une à l'autre se fait en CSS,
  // par la carte graphique (transform, opacity). Un geste = un écran ; un écran plus haut que la fenêtre défile d'abord
  // à l'intérieur. La classe html.stage est posée dès le <head> (src/components/Head.astro) pour éviter tout saut à l'affichage.
  var stage = root.classList.contains('stage');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var cur = 0, moving = false, locked = false, lastWheel = 0, lastDelta = 0, moveTimer = 0;
  var DURATION = reduced ? 0 : 1000;
  var bar = document.querySelector('.topbar');

  // repère de progression (grand écran) : un trait par écran, un compteur, un clic pour y aller
  var pager = null, ticks = [], count = null;
  var labelOf = function (p) {
    if (p.classList.contains('header')) return fr ? 'Accueil' : 'Home';
    if (p.classList.contains('site-footer')) return 'Contact';
    var h = p.querySelector('.section-title, .job-title');
    var txt = h ? h.textContent.trim() : '';
    if (p.classList.contains('job')) { var n = p.querySelector('.job-num'); var parts = txt.split('—'); return (n ? n.textContent + ' ' : '') + (parts[1] || parts[0]).trim(); }
    return txt;
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function setCurrent(i) {
    if (!pager) return;
    ticks.forEach(function (t, k) { t.classList.toggle('is-current', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    count.textContent = pad(i + 1) + ' / ' + pad(slides.length);
    pager.classList.toggle('is-inverted', slides[i].classList.contains('site-footer'));
  }
  if (slides.length) {
    pager = document.createElement('nav');
    pager.className = 'pager'; pager.setAttribute('aria-label', fr ? 'Écrans de la page' : 'Page sections');
    count = document.createElement('span'); count.className = 'pager-count label'; count.setAttribute('aria-hidden', 'true');
    pager.appendChild(count);
    ticks = slides.map(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pager-tick'; b.title = labelOf(p); b.setAttribute('aria-label', labelOf(p));
      b.addEventListener('click', function () { goTo(i); });
      pager.appendChild(b); return b;
    });
    document.body.appendChild(pager);
    setCurrent(0);
  }

  // keepScroll : navigation déclenchée par le focus (touche Tab) — on ne touche pas au défilement interne de l'écran,
  // que le navigateur vient de régler pour montrer l'élément focalisé
  function goTo(n, keepScroll) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (!stage) { slides[n].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); return; }
    if (n === cur) return;
    var prev = cur, back = n < prev;
    cur = n; moving = true;
    root.classList.add('is-moving');
    // 1. Sans transition : les écrans qui ne font pas partie du passage (saut par Début, Fin ou le repère) vont
    //    directement à leur place hors champ — on ne doit pas les voir traverser la fenêtre. L'écran d'arrivée, s'il
    //    était rangé au-dessus, reprend sa pose « reculée », d'où il revient.
    var quiet = slides.filter(function (s, k) { return k !== n && k !== prev; });
    if (slides[n].classList.contains('is-parked')) quiet.push(slides[n]);
    quiet.forEach(function (s) { s.classList.add('no-trans'); });
    slides.forEach(function (s, k) {
      if (k === n) { s.classList.remove('is-parked'); return; }
      if (k === prev) return;
      s.classList.remove('is-current', 'is-active', 'is-leaving');
      s.classList.toggle('is-before', k < n); s.classList.toggle('is-parked', k < n); s.classList.toggle('is-after', k > n);
    });
    void document.body.offsetWidth;   // ces positions sont appliquées avant que les transitions ne reprennent
    quiet.forEach(function (s) { s.classList.remove('no-trans'); });
    // 2. Le passage, animé : l'écran courant part (en revenant, il redescend par-dessus), le nouveau arrive.
    var from = slides[prev], to = slides[n];
    from.classList.remove('is-current', 'is-active');
    from.classList.toggle('is-before', !back); from.classList.toggle('is-after', back); from.classList.toggle('is-leaving', back);
    to.classList.remove('is-before', 'is-after'); to.classList.add('is-current', 'is-active');
    if (!keepScroll) { if (back) slides[n].scrollTop = slides[n].scrollHeight; else slides[n].scrollTop = 0; }
    root.dataset.slide = String(n);
    document.body.classList.toggle('name-away', n > 0);
    document.body.classList.toggle('is-scrolled', n > 0);
    if (bar) bar.classList.toggle('is-scrolled', n > 0);
    setCurrent(n);
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function () {
      moving = false; locked = true;
      root.classList.remove('is-moving');
      // l'écran sorti par le haut (déjà invisible) est rangé hors champ : plus rien à dessiner
      slides.forEach(function (s, k) { s.classList.remove('is-leaving'); if (k < cur) s.classList.add('is-parked'); });
    }, DURATION + 30);
  }

  if (stage && slides.length) {
    // état de départ, sans animation
    root.classList.add('stage-init');
    slides.forEach(function (s, k) {
      s.classList.toggle('is-current', k === 0); s.classList.toggle('is-active', k === 0);
      s.classList.toggle('is-after', k > 0); s.setAttribute('tabindex', '-1');
    });
    root.dataset.slide = '0';
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('stage-init'); }); });

    var canScroll = function (s, dir) { return dir > 0 ? s.scrollTop + s.clientHeight < s.scrollHeight - 2 : s.scrollTop > 2; };
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // zoom au pincement, geste horizontal : on laisse faire
      var d = e.deltaY, dir = d > 0 ? 1 : -1, now = performance.now();
      var fresh = now - lastWheel > 180 || Math.abs(d) > Math.abs(lastDelta) * 1.5 + 6;   // nouveau geste, pas l'élan du précédent
      lastWheel = now; lastDelta = d;
      if (!moving && canScroll(slides[cur], dir)) { locked = true; return; }   // l'écran défile d'abord à l'intérieur
      e.preventDefault();
      if (moving || Math.abs(d) < 3) return;
      if (locked && !fresh) return;
      locked = false;
      goTo(cur + dir);
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag) && e.key === ' ') return;
      var k = e.key, dir = 0;
      if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
      else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
      else if (k === 'Home') { e.preventDefault(); return goTo(0); }
      else if (k === 'End') { e.preventDefault(); return goTo(slides.length - 1); }
      if (!dir) return;
      e.preventDefault();
      if (moving) return;
      var s = slides[cur];
      if (canScroll(s, dir)) s.scrollBy({ top: dir * s.clientHeight * 0.8, behavior: reduced ? 'auto' : 'smooth' });
      else goTo(cur + dir);
    });
    // clavier : Tab vers un lien d'un autre écran (le pied de page, par exemple) y emmène la scène
    document.addEventListener('focusin', function (e) {
      var s = e.target && e.target.closest ? e.target.closest('.slide') : null;
      var i = s ? slides.indexOf(s) : -1;
      if (i >= 0 && i !== cur) goTo(i, true);
    });
    // passer en fenêtre étroite (ou revenir) change de mode : on recharge proprement
    var stageMQ = window.matchMedia('(min-width: 1100px) and (min-height: 680px) and (hover: hover) and (pointer: fine)');
    stageMQ.addEventListener('change', function () { location.reload(); });
  }

  // ---------- défilement normal (téléphone, tablette, fenêtre étroite) ----------
  if (!stage) {
    var onScroll = function () {
      var y = window.scrollY;
      if (bar) bar.classList.toggle('is-scrolled', y > 24);
      document.body.classList.toggle('is-scrolled', y > 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // la page bouge : les rendus 3D se figent le temps du mouvement
    var settleTimer = 0;
    window.addEventListener('scroll', function () {
      root.classList.add('is-moving'); clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { root.classList.remove('is-moving'); }, 140);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      // les titres géants se dévoilent à l'arrivée de leur section (on observe le conteneur, le titre étant masqué)
      var wraps = document.querySelectorAll('.section-title-wrapper');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { var t = en.target.querySelector('.section-title'); if (t) t.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -10% 0px' });
      wraps.forEach(function (w) { if (reduced) { var t = w.querySelector('.section-title'); if (t) t.classList.add('is-in'); } else io.observe(w); });
      // le nom se range dans le cadre du haut quand le grand nom de l'accueil est sorti de l'écran
      var nm = document.querySelector('.header .name');
      if (nm) new IntersectionObserver(function (en) {
        document.body.classList.toggle('name-away', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
      }, { rootMargin: '-60px 0px 0px 0px' }).observe(nm);
      // l'écran courant (celui qui occupe le haut de la fenêtre) reçoit is-active, et le repère suit
      var panelIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('is-active', en.isIntersecting); if (en.isIntersecting) setCurrent(slides.indexOf(en.target)); });
      }, { rootMargin: '-10% 0px -35% 0px' });
      slides.forEach(function (p) { panelIO.observe(p); });
    } else {
      document.querySelectorAll('.section-title').forEach(function (t) { t.classList.add('is-in'); });
    }

    // défilement lissé (Lenis) : grands écrans à la souris hors mode scène, après le chargement
    var wide = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
    if (wide && !reduced) window.addEventListener('load', function () {
      import('lenis').then(function (m) {   // chargé à la demande, dans son propre fichier
        var Lenis = m.default || m.Lenis;
        var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      }).catch(function () {});
    });
  }

  // ---------- curseur ----------
  // Une bille à la couleur d'accent, ombrée comme une sphère, qui suit la souris avec un léger retard et s'étire dans le sens
  // du mouvement ; au survol d'un lien ou d'un objet 3D, elle gonfle en bulle de verre. Souris seulement, jamais sous
  // « réduire les animations ».
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    var dot = document.createElement('div');
    dot.className = 'cursor'; dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<span class="cursor-ball"></span>';
    document.body.appendChild(dot);
    var HOT = 'a, button, [role="switch"], .mark.is-3d, .hero3d, .brand';
    var mx = 0, my = 0, cx = 0, cy = 0, shown = false, hot = false, running = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; cx = mx; cy = my; root.classList.add('has-cursor'); }
      if (!running) { running = true; requestAnimationFrame(tick); }
      var h = !!(e.target && e.target.closest && e.target.closest(HOT));
      if (h !== hot) { hot = h; dot.classList.toggle('is-hot', hot); }
    }, { passive: true });
    document.addEventListener('pointerdown', function () { dot.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { dot.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { dot.classList.add('is-out'); });
    document.addEventListener('mouseenter', function () { dot.classList.remove('is-out'); });
    var tick = function () {
      var nx = cx + (mx - cx) * 0.35, ny = cy + (my - cy) * 0.35;
      var vx = nx - cx, vy = ny - cy; cx = nx; cy = ny;
      var sp = Math.min(Math.sqrt(vx * vx + vy * vy) / 40, 0.4), a = Math.atan2(vy, vx) * 57.2958;
      var still = Math.abs(mx - cx) < 0.05 && Math.abs(my - cy) < 0.05;
      if (still) { cx = mx; cy = my; sp = 0; }
      dot.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) rotate(' + a.toFixed(1) + 'deg) scale(' + (1 + sp).toFixed(3) + ',' + (1 - sp * 0.5).toFixed(3) + ') rotate(' + (-a).toFixed(1) + 'deg)';
      // arrivée sur la souris : on arrête la boucle (plus aucune image produite tant que la souris ne bouge pas)
      if (still) running = false; else requestAnimationFrame(tick);
    };
  }

  // ---------- le logo de la barre recharge la page, en repartant du haut (et en gardant ?fps s'il y est) ----------
  var brand = document.querySelector('a.brand');
  if (brand) brand.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    location.replace(location.pathname + location.search);
  });

  // ---------- compteur de fluidité (?fps dans l'adresse) ----------
  if (/[?&]fps\b/.test(location.search)) {
    var meter = document.createElement('div');
    meter.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.78);color:#fff;font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none';
    document.body.appendChild(meter);
    var frames = [], last = performance.now(), stats = null, lastMove = '—';
    // Chrome plafonne les animations à 30 i/s sur batterie faible (Économiseur d'énergie, ≤ 20 % par défaut) : on l'affiche pour ne pas le confondre avec un défaut du site
    var power = '';
    if (navigator.getBattery) navigator.getBattery().then(function (b) {
      var upd = function () { power = 'batterie ' + Math.round(b.level * 100) + ' % · ' + (b.charging ? 'sur secteur' : 'sur batterie'); };
      upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
    });
    (function fps(now) {
      var dt = now - last; last = now; frames.push(dt); if (frames.length > 120) frames.shift();
      if (root.classList.contains('is-moving')) { if (!stats) stats = { n: 0, slow: 0, worst: 0 }; stats.n++; if (dt > 20) stats.slow++; if (dt > stats.worst) stats.worst = dt; }
      else if (stats) { lastMove = stats.n + ' images, ' + stats.slow + ' lentes (> 20 ms), pire ' + stats.worst.toFixed(1) + ' ms'; stats = null; }
      var avg = frames.reduce(function (a, b) { return a + b; }, 0) / frames.length;
      var capped = avg > 32 && avg < 35 && Math.max.apply(null, frames) < 36;   // toutes les images à 33 ms pile : un plafond, pas une page qui peine
      meter.textContent = 'FPS ' + (1000 / avg).toFixed(0) + '  (image moyenne ' + avg.toFixed(1) + ' ms)\ndernier mouvement : ' + lastMove +
        (power ? '\n' + power : '') + (capped ? '\n⚠ cadence plafonnée à 30 i/s par le navigateur (économie d\'énergie ?)' : '');
      requestAnimationFrame(fps);
    })(last);
  }
})();
