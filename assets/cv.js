(function () {
  var root = document.documentElement;
  var btn = document.querySelector('.theme-toggle');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
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

  // La barre du haut prend un trait quand on a quitté l'en-tête.
  var bar = document.querySelector('.topbar');
  if (bar) {
    var onScroll = function () { bar.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
