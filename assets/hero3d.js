// La scène d'accueil : deux téléphones, un iOS devant et un Android derrière, qui jouent le même test automatisé
// au même instant. Un cadre de sélection passe d'un élément à l'autre comme dans un inspecteur Appium, tape,
// vérifie, et chaque étape validée s'ajoute au journal du test en bas de l'écran.
// Écrans larges avec souris uniquement, après le chargement. On attrape la scène et on la fait tourner ; relâchée,
// elle reprend son balancement. Sous « réduire les animations » : l'image finale du test, sans boucle.
const canvas = document.querySelector('canvas.hero3d');
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORANGE = '#ff7452', GREEN = '#3ddc84', INK = '#161b22';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
// suit les changements de densité d'écran (fenêtre glissée d'un écran Retina vers un écran standard, zoom du navigateur)
const onDprChange = (cb) => {
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  q.addEventListener('change', () => { cb(); onDprChange(cb); }, { once: true });
};

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

// ---------- l'écran : la maquette d'une app, dessinée une fois ; le test est redessiné par-dessus à chaque image ----------
const SW = 480, SH = 1040, TS = 1.5;   // maquette en 480 × 1040, texture dessinée 1,5 fois plus fine
const R = {
  card: { x: 24, y: 150, w: 432, h: 180, r: 22 },
  row1: { x: 24, y: 346, w: 432, h: 68, r: 16 },
  row2: { x: 24, y: 426, w: 432, h: 68, r: 16 },
  cta: { x: 24, y: 512, w: 432, h: 64, r: 32 },
  tab: { x: 162, y: 968, w: 36, h: 36, r: 10 },
};
const STEPS = [
  { rect: R.card, verb: 'swipe', loc: '~promo_card' },
  { rect: R.row1, verb: 'tap', loc: '~offer_row_1' },
  { rect: R.row2, verb: 'assert', loc: '~offer_row_2' },
  { rect: R.cta, verb: 'tap', loc: '~cta_button' },
  { rect: R.tab, verb: 'tap', loc: '~tab_rewards' },
];
const STEP = 1.3, SUMMARY = 2.4, CYCLE = STEPS.length * STEP + SUMMARY;
const LOG_Y = 696, LOG_DY = 38, SUM_Y = 898;

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mix = (a, b, m) => ({ x: a.x + (b.x - a.x) * m, y: a.y + (b.y - a.y) * m, w: a.w + (b.w - a.w) * m, h: a.h + (b.h - a.h) * m, r: a.r + (b.r - a.r) * m });

function drawBase() {
  const c = document.createElement('canvas'); c.width = SW * TS; c.height = SH * TS;
  const g = c.getContext('2d'); g.scale(TS, TS);
  g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, SW, SH);
  // barre d'état
  g.fillStyle = INK; g.font = `600 24px ${SANS}`; g.fillText('9:41', 44, 46);
  for (let i = 0; i < 4; i++) g.fillRect(352 + i * 9, 44 - (i + 1) * 5, 6, (i + 1) * 5);
  g.lineWidth = 2; g.strokeStyle = INK; rr(g, 396, 29, 38, 17, 5); g.stroke(); g.fillRect(400, 33, 26, 9); g.fillRect(436, 34, 3, 7);
  // en-tête
  rr(g, 24, 84, 176, 28, 9); g.fill();
  g.fillStyle = '#c9d0da'; rr(g, 24, 120, 112, 14, 7); g.fill();
  g.fillStyle = '#ffd3c6'; g.beginPath(); g.arc(424, 108, 24, 0, Math.PI * 2); g.fill();
  // carte mise en avant
  const gr = g.createLinearGradient(24, 150, 456, 330); gr.addColorStop(0, '#ff7452'); gr.addColorStop(1, '#ffab88');
  g.fillStyle = gr; rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.fill();
  g.save(); rr(g, R.card.x, R.card.y, R.card.w, R.card.h, R.card.r); g.clip();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(410, 214, 74, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(452, 316, 50, 0, Math.PI * 2); g.fill(); g.restore();
  g.fillStyle = '#fff'; rr(g, 48, 182, 210, 24, 9); g.fill();
  g.fillStyle = 'rgba(255,255,255,.72)'; rr(g, 48, 218, 150, 14, 7); g.fill();
  g.fillStyle = '#fff'; rr(g, 48, 272, 124, 38, 19); g.fill();
  g.fillStyle = ORANGE; rr(g, 72, 285, 76, 12, 6); g.fill();
  // deux lignes de liste
  for (const r of [R.row1, R.row2]) {
    g.fillStyle = '#fff'; rr(g, r.x, r.y, r.w, r.h, r.r); g.fill();
    g.strokeStyle = '#e3e7ed'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffe3da'; rr(g, r.x + 14, r.y + 12, 44, 44, 12); g.fill();
    g.fillStyle = '#1f2630'; rr(g, r.x + 74, r.y + 16, 190, 14, 7); g.fill();
    g.fillStyle = '#c9d0da'; rr(g, r.x + 74, r.y + 40, 128, 12, 6); g.fill();
    g.fillStyle = '#ffd3c6'; rr(g, r.x + r.w - 72, r.y + 26, 50, 16, 8); g.fill();
  }
  // bouton principal
  g.fillStyle = INK; rr(g, R.cta.x, R.cta.y, R.cta.w, R.cta.h, R.cta.r); g.fill();
  g.fillStyle = '#fff'; rr(g, 180, 537, 120, 14, 7); g.fill();
  // panneau du journal de test
  g.fillStyle = '#0e1116'; rr(g, 16, 598, 448, 336, 24); g.fill();
  g.font = `500 17px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText('▶ smoke.feature', 40, 640);
  const dev = 'iOS · Android'; g.fillText(dev, 440 - g.measureText(dev).width, 640);
  g.fillStyle = '#232a33'; g.fillRect(40, 656, 400, 2);
  // barre d'onglets
  g.fillStyle = '#fff'; g.fillRect(0, 948, SW, 92); g.fillStyle = '#e3e7ed'; g.fillRect(0, 948, SW, 2);
  [72, 180, 300, 408].forEach((x, i) => { g.fillStyle = i === 0 ? ORANGE : '#c9d0da'; rr(g, x - 18, 968, 36, 36, 10); g.fill(); });
  g.fillStyle = INK; rr(g, 170, 1022, 140, 6, 3); g.fill();
  return c;
}

function drawScreen(g, base, t) {
  g.setTransform(TS, 0, 0, TS, 0, 0);
  g.drawImage(base, 0, 0, SW, SH);
  const n = STEPS.length, stepsEnd = n * STEP, inSteps = t < stepsEnd;
  const k = inSteps ? Math.floor(t / STEP) : n - 1;
  const p = inSteps ? (t - k * STEP) / STEP : 1;
  const step = STEPS[k];

  // le cadre de sélection glisse vers l'élément visé, affiche son locator, puis tape ou vérifie
  let alpha = inSteps ? (k === 0 ? Math.min(1, p / 0.2) : 1) : Math.max(0, 1 - (t - stepsEnd) / 0.5);
  if (alpha > 0) {
    const r = mix(k > 0 ? STEPS[k - 1].rect : step.rect, step.rect, ease(Math.min(1, p / 0.35)));
    const ok = step.verb === 'assert' && p > 0.55;
    const col = ok ? GREEN : ORANGE;
    g.save(); g.globalAlpha = alpha;
    rr(g, r.x - 6, r.y - 6, r.w + 12, r.h + 12, r.r + 6);
    g.fillStyle = ok ? 'rgba(61,220,132,.12)' : 'rgba(255,116,82,.10)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = col; g.stroke();
    g.font = `600 19px ${MONO}`;
    const lw = g.measureText(step.loc).width + 20, lx = Math.min(r.x - 6, SW - 8 - lw), ly = r.y - 6 - 34;
    g.fillStyle = col; rr(g, lx, ly, lw, 28, 8); g.fill();
    g.fillStyle = '#16100c'; g.fillText(step.loc, lx + 10, ly + 20);
    if (step.verb !== 'assert' && inSteps && p > 0.5 && p < 0.95) {
      const q = (p - 0.5) / 0.45;
      const cx = step.verb === 'swipe' ? r.x + r.w * (0.78 - 0.5 * ease(q)) : r.x + r.w / 2, cy = r.y + r.h / 2;
      g.fillStyle = `rgba(255,116,82,${0.35 * (1 - q)})`; g.beginPath(); g.arc(cx, cy, 12 + q * 44, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,116,82,${0.9 * (1 - q * 0.6)})`; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // le journal : une ligne verte par étape validée, l'étape en cours en gris
  const done = inSteps ? k + (p > 0.8 ? 1 : 0) : n;
  g.font = `500 20px ${MONO}`;
  for (let i = 0; i < done; i++) {
    g.globalAlpha = inSteps && i === done - 1 && p > 0.8 ? Math.min(1, (p - 0.8) / 0.12) : 1;
    const y = LOG_Y + i * LOG_DY;
    g.fillStyle = GREEN; g.fillText('✓', 44, y);
    g.fillStyle = '#d7dde6'; g.fillText(STEPS[i].verb.padEnd(7) + STEPS[i].loc, 74, y);
  }
  g.globalAlpha = 1;
  if (inSteps && p <= 0.8) {
    const y = LOG_Y + k * LOG_DY;
    g.fillStyle = (Math.floor(t * 4) % 2) ? ORANGE : '#6b7480'; g.fillText('▸', 46, y);
    g.fillStyle = '#6b7480'; g.fillText(step.verb.padEnd(7) + step.loc, 74, y);
  }
  if (!inSteps) {
    g.globalAlpha = Math.min(1, (t - stepsEnd) / 0.3);
    g.font = `700 22px ${MONO}`; g.fillStyle = GREEN; g.fillText('PASSED 5/5', 44, SUM_Y);
    const w = g.measureText('PASSED 5/5').width;
    g.font = `500 18px ${MONO}`; g.fillStyle = '#8e97a3'; g.fillText('· 2 devices · 7.8 s', 44 + w + 14, SUM_Y);
    g.globalAlpha = 1;
  }
}

// ---------- les téléphones ----------
function roundedRect(THREE, w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function flat(THREE, w, h, r, mat) {
  const geo = new THREE.ShapeGeometry(roundedRect(THREE, w, h, r), 12);
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return new THREE.Mesh(geo, mat);
}
function slab(THREE, w, h, r, d, bev, mat) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(THREE, w - 2 * bev, h - 2 * bev, Math.max(0.001, r - bev)),
    { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 5, curveSegments: 20 });
  geo.translate(0, 0, -(d - 2 * bev) / 2);
  return new THREE.Mesh(geo, mat);
}
function buildPhone(THREE, { body, glass, black, screenMat, notch }) {
  const sw = 0.725, sh = sw * SH / SW, W = sw + 0.075, H = sh + 0.075, D = 0.085;
  const g = new THREE.Group();
  g.add(slab(THREE, W, H, 0.125, D, 0.02, body));
  const front = flat(THREE, W - 0.028, H - 0.028, 0.11, glass); front.position.z = D / 2 + 0.001; g.add(front);
  const screen = flat(THREE, sw, sh, 0.085, screenMat); screen.position.z = D / 2 + 0.002; g.add(screen);
  const cut = notch === 'island'
    ? flat(THREE, 0.2, 0.056, 0.028, black)
    : new THREE.Mesh(new THREE.CircleGeometry(0.022, 24), black);
  cut.position.set(0, sh / 2 - (notch === 'island' ? 0.058 : 0.05), D / 2 + 0.003); g.add(cut);
  // boutons latéraux
  const btn = (x, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, 0.03), body); m.position.set(x, y, 0); g.add(m); };
  btn(W / 2 + 0.004, 0.3, 0.2); btn(-W / 2 - 0.004, 0.44, 0.12); btn(-W / 2 - 0.004, 0.27, 0.12);
  // bloc photo au dos
  const bump = slab(THREE, 0.3, notch === 'island' ? 0.3 : 0.42, 0.08, 0.024, 0.008, body);
  bump.position.set(-W / 2 + 0.22, H / 2 - (notch === 'island' ? 0.22 : 0.28), -D / 2 - 0.01); g.add(bump);
  const lens = (x, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.026, 32), glass); m.rotation.x = Math.PI / 2; m.position.set(x, y, -D / 2 - 0.022); g.add(m); };
  const bx = bump.position.x, by = bump.position.y;
  if (notch === 'island') { lens(bx - 0.06, by + 0.06); lens(bx + 0.06, by - 0.06); }
  else { lens(bx, by + 0.11); lens(bx, by); lens(bx, by - 0.11); }
  return g;
}

async function start() {
  if (!canvas || !wanted() || !webglOk()) return;
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9cc, 1.0); rim.position.set(-4, -1, 2); scene.add(rim);
  const env = new THREE.CubeTextureLoader().setPath('assets/cubemaps/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
  env.colorSpace = THREE.SRGBColorSpace;

  // un seul écran pour les deux téléphones : c'est le même test, sur iOS et Android, au même instant
  const base = drawBase();
  const sc = document.createElement('canvas'); sc.width = SW * TS; sc.height = SH * TS;
  const sg = sc.getContext('2d');
  const tex = new THREE.CanvasTexture(sc);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paint = (t) => { drawScreen(sg, base, t); tex.needsUpdate = true; };
  paint(reduced() ? CYCLE - 0.01 : 0);

  const graphite = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.8, roughness: 0.28, envMap: env, envMapIntensity: 1.2 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7452, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.3, roughness: 0.15, envMap: env, envMapIntensity: 0.8 });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const ios = buildPhone(THREE, { body: graphite, glass, black, screenMat, notch: 'island' });
  const android = buildPhone(THREE, { body: orange, glass, black, screenMat, notch: 'hole' });
  ios.position.set(-0.36, -0.07, 0.32); ios.rotation.set(0, 0.06, -0.02);
  android.position.set(0.46, 0.14, -0.34); android.rotation.set(0, -0.05, 0.035);
  const root = new THREE.Group(); root.add(android, ios); scene.add(root);

  const REST_X = 0.1, REST_Y = -0.38;
  root.rotation.set(REST_X, REST_Y, 0);
  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 2));   // 1,5× sur écran standard, 2× sur Retina
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');
  const stage = canvas.closest('.hero-stage'); if (stage) stage.classList.add('is-lit');

  // interaction : on attrape la scène, on la lance, elle file sur son élan, puis reprend son balancement
  const target = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let dragging = false, last = null, releasedAt = -1e9, visible = true;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const clampX = (a) => Math.max(-0.9, Math.min(0.9, a));
  canvas.addEventListener('pointerdown', (e) => { dragging = true; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    vel.x = dx * 0.008; vel.y = dy * 0.006;
    root.rotation.y += vel.x; root.rotation.x = clampX(root.rotation.x + vel.y);
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); canvas.classList.remove('is-dragging'); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  const refit = () => { fit(); renderer.render(scene, camera); };
  if ('ResizeObserver' in window) new ResizeObserver(refit).observe(canvas); else window.addEventListener('resize', refit);
  onDprChange(refit);
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  if (reduced()) return;
  const t0 = performance.now();
  let frame = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    if ((frame++ & 1) === 0) paint(t % CYCLE);   // l'écran à 30 images/s suffit
    if (!dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || now - releasedAt < 600) {
        root.rotation.y += vel.x; root.rotation.x = clampX(root.rotation.x + vel.y); vel.x *= 0.95; vel.y *= 0.95;
      } else {
        const ry = REST_Y + Math.sin(t * 0.45) * 0.2 + target.x * 0.22, rx = REST_X + Math.sin(t * 0.33) * 0.05 + target.y * 0.1;
        root.rotation.y = norm(root.rotation.y) + (ry - norm(root.rotation.y)) * 0.035;
        root.rotation.x += (rx - root.rotation.x) * 0.035;
      }
    }
    root.position.y = Math.sin(t * 0.9) * 0.035;
    renderer.render(scene, camera);
  })(performance.now());
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => { ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 300); });
