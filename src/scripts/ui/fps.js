// Compteur de fluidité : ajouter ?fps à l'adresse. Images par seconde, bilan du dernier mouvement, état de la batterie.
const root = document.documentElement;

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
