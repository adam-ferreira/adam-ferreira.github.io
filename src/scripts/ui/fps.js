// Smoothness meter: add ?fps to the URL. Frames per second, summary of the last move, battery state.
const root = document.documentElement;

if (/[?&]fps\b/.test(location.search)) {
  const meter = document.createElement('div');
  meter.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.78);color:#fff;font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none';
  document.body.appendChild(meter);
  const frames = [];
  let last = performance.now(), stats = null, lastMove = '—';
  // Chrome caps animations at 30 fps on low battery (Energy Saver, ≤ 20 % by default): shown so it is not mistaken for a site problem
  let power = '';
  navigator.getBattery?.().then((b) => {
    const upd = () => { power = `battery ${Math.round(b.level * 100)} % · ${b.charging ? 'plugged in' : 'on battery'}`; };
    upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
  });
  (function fps(now) {
    const dt = now - last; last = now; frames.push(dt); if (frames.length > 120) frames.shift();
    if (root.classList.contains('is-moving')) { stats ??= { n: 0, slow: 0, worst: 0 }; stats.n++; if (dt > 20) stats.slow++; if (dt > stats.worst) stats.worst = dt; }
    else if (stats) { lastMove = `${stats.n} frames, ${stats.slow} slow (> 20 ms), worst ${stats.worst.toFixed(1)} ms`; stats = null; }
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const capped = avg > 32 && avg < 35 && Math.max(...frames) < 36;   // every frame at exactly 33 ms: a cap, not a struggling page
    meter.textContent = `FPS ${(1000 / avg).toFixed(0)}  (average frame ${avg.toFixed(1)} ms)\nlast move: ${lastMove}` +
      (power ? '\n' + power : '') + (capped ? '\n⚠ frame rate capped at 30 fps by the browser (energy saver?)' : '');
    requestAnimationFrame(fps);
  })(last);
}
