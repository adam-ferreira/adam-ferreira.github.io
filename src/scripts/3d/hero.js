// The hero scene: two phones, an iOS one in front and an Android one behind, running the same automated test at the
// same moment. A selection frame moves from one element to the next as in an Appium inspector, taps, asserts, and each
// passed step is appended to the test log at the bottom of the screen.
// Wide screens with a mouse only, after load. You can grab the scene and spin it; once released, it goes back to
// swaying. Under "reduce motion": the final frame of the test, without a loop.
import { CUBEMAP } from './env.js';
import { desktop, reduced, webglOk, onDprChange, watchContextLoss } from './common.js';
import { SW, SH, TS, CYCLE, ACC, drawBase, drawScreen, screenKey } from './hero-screen.js';   // the app mock-up drawn on the screens
const canvas = document.querySelector('canvas.hero3d');

// ---------- the phones ----------
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
  // side buttons
  const btn = (x, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.014, h, 0.03), body); m.position.set(x, y, 0); g.add(m); };
  btn(W / 2 + 0.004, 0.3, 0.2); btn(-W / 2 - 0.004, 0.44, 0.12); btn(-W / 2 - 0.004, 0.27, 0.12);
  // camera bump on the back
  const bump = slab(THREE, 0.3, notch === 'island' ? 0.3 : 0.42, 0.08, 0.024, 0.008, body);
  bump.position.set(-W / 2 + 0.22, H / 2 - (notch === 'island' ? 0.22 : 0.28), -D / 2 - 0.01); g.add(bump);
  const lens = (x, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.026, 32), glass); m.rotation.x = Math.PI / 2; m.position.set(x, y, -D / 2 - 0.022); g.add(m); };
  const bx = bump.position.x, by = bump.position.y;
  if (notch === 'island') { lens(bx - 0.06, by + 0.06); lens(bx + 0.06, by - 0.06); }
  else { lens(bx, by + 0.11); lens(bx, by); lens(bx, by - 0.11); }
  return g;
}

async function start() {
  if (!canvas || !desktop() || !webglOk()) return;
  const THREE = await import('./three-lite.js');   // Three.js trimmed to what the site uses, loaded on demand
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // GPU lost: the scene fades out (the rest of the hero does not depend on it)
  const lost = watchContextLoss(canvas, () => { canvas.classList.remove('is-ready'); canvas.closest('.hero-stage')?.classList.remove('is-lit'); });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9cc, 1.0); rim.position.set(-4, -1, 2); scene.add(rim);
  const env = new THREE.CubeTextureLoader().load(CUBEMAP);
  env.colorSpace = THREE.SRGBColorSpace;

  // a single screen for both phones: it is the same test, on iOS and Android, at the same moment
  const base = drawBase();
  const sc = document.createElement('canvas'); sc.width = SW * TS; sc.height = SH * TS;
  const sg = sc.getContext('2d');
  const tex = new THREE.CanvasTexture(sc);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paint = (t) => { drawScreen(sg, base, t); tex.needsUpdate = true; };
  // data-freeze="seconds": a still frame of the test at that moment, without a loop (LinkedIn banner export)
  const freeze = canvas.dataset.freeze !== undefined ? parseFloat(canvas.dataset.freeze) : null;
  paint(freeze !== null ? freeze : reduced() ? CYCLE - 0.01 : 0);

  const graphite = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.8, roughness: 0.28, envMap: env, envMapIntensity: 1.2 });
  const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(ACC), metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.3, roughness: 0.15, envMap: env, envMapIntensity: 0.8 });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const ios = buildPhone(THREE, { body: graphite, glass, black, screenMat, notch: 'island' });
  const android = buildPhone(THREE, { body: accent, glass, black, screenMat, notch: 'hole' });
  ios.position.set(-0.36, -0.07, 0.32); ios.rotation.set(0, 0.06, -0.02);
  android.position.set(0.46, 0.14, -0.34); android.rotation.set(0, -0.05, 0.035);
  const root = new THREE.Group(); root.add(android, ios); scene.add(root);

  const REST_X = 0.1, REST_Y = -0.38;
  root.rotation.set(REST_X, REST_Y, 0);
  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 2));   // 1.5× on a standard screen, 2× on Retina
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');
  const stage = canvas.closest('.hero-stage'); if (stage) stage.classList.add('is-lit');

  // interaction: grab the scene, throw it, it spins on its momentum, then goes back to swaying
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

  if (reduced() || freeze !== null) return;
  const t0 = performance.now();
  let frame = 0, lastKey;
  let lastDraw = 0;
  (function loop(now) {
    if (lost()) return;
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (document.documentElement.classList.contains('is-moving')) return;   // the page is moving: leave all the room to the move
    if (document.documentElement.classList.contains('stage') && document.documentElement.dataset.slide !== '0') return;   // stage mode: the hero is not on screen
    if (now - lastDraw < 15) return;   // 60 fps is enough, even on a 120 Hz screen
    lastDraw = now;
    const t = Math.max(0, (now - t0) / 1000);
    if (frame++ % 3 === 0) {   // the phone screen at 20 fps at most, and only when it changes: ~40 % fewer uploads to the GPU
      const key = screenKey(t);
      if (key === null || key !== lastKey) paint(t % CYCLE);
      lastKey = key;
    }
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
