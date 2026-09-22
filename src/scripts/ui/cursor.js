// Une bille à la couleur d'accent, ombrée comme une sphère, qui suit la souris avec un léger retard et s'étire dans le sens
// du mouvement ; au survol d'un lien ou d'un objet 3D, elle gonfle en bulle de verre. Souris seulement, jamais sous
// « réduire les animations ». Chargé par la page (Cv.astro).
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
  const dot = document.createElement('div');
  dot.className = 'cursor'; dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = '<span class="cursor-ball"></span>';
  document.body.appendChild(dot);
  const HOT = 'a, button, [role="switch"], .mark.is-3d, .hero3d, .brand';
  let mx = 0, my = 0, cx = 0, cy = 0, shown = false, hot = false, running = false;
  const tick = () => {
    const nx = cx + (mx - cx) * 0.35, ny = cy + (my - cy) * 0.35;
    const vx = nx - cx, vy = ny - cy; cx = nx; cy = ny;
    let sp = Math.min(Math.hypot(vx, vy) / 40, 0.4);
    const a = Math.atan2(vy, vx) * 57.2958;
    const still = Math.abs(mx - cx) < 0.05 && Math.abs(my - cy) < 0.05;
    if (still) { cx = mx; cy = my; sp = 0; }
    dot.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0) rotate(${a.toFixed(1)}deg) scale(${(1 + sp).toFixed(3)},${(1 - sp * 0.5).toFixed(3)}) rotate(${(-a).toFixed(1)}deg)`;
    // arrivée sur la souris : on arrête la boucle (plus aucune image produite tant que la souris ne bouge pas)
    if (still) running = false; else requestAnimationFrame(tick);
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; cx = mx; cy = my; root.classList.add('has-cursor'); }
    if (!running) { running = true; requestAnimationFrame(tick); }
    const h = e.target instanceof Element && !!e.target.closest(HOT);
    if (h !== hot) { hot = h; dot.classList.toggle('is-hot', hot); }
  }, { passive: true });
  document.addEventListener('pointerdown', () => dot.classList.add('is-down'));
  document.addEventListener('pointerup', () => dot.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => dot.classList.add('is-out'));
  document.addEventListener('mouseenter', () => dot.classList.remove('is-out'));
}
