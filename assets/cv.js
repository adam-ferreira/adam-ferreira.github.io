(function () {
  var root = document.documentElement, btn = document.querySelector('.theme-toggle');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var saved = null;
  try { saved = localStorage.getItem('cv-theme'); } catch (e) {}
  function apply(t) {
    root.dataset.theme = t;
    btn.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
    btn.title = t === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit';
  }
  apply(saved || (mq.matches ? 'dark' : 'light'));
  btn.addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    saved = next;
    try { localStorage.setItem('cv-theme', next); } catch (e) {}
    apply(next);
  });
  mq.addEventListener('change', function (e) { if (!saved) apply(e.matches ? 'dark' : 'light'); });
})();
