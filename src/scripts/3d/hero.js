// The hero scene: two phones, an iOS one in front and an Android one behind, running the same automated test at the
// same moment. A selection frame moves from one element to the next as in an Appium inspector, taps, asserts, and each
// passed step is appended to the test log at the bottom of the screen.
// Wide screens with a mouse only, after load. You can grab the scene and spin it; once released, it goes back to
// swaying. Under "reduce motion": the final frame of the test, without a loop.
// Stage mode: the phones live in a fixed canvas over the screens (.devices3d) and travel with them from one anchor to the
// next (.hero-stage, .device-anchor): the hero, the "Experience" chapter, then each experience with a demo, where they
// play that job's test; a full turn when the app changes. Elsewhere, and in the LinkedIn banner, they stay in the hero's
// own canvas.
import { accent as accentColor, desktop, reduced, webglOk, onDprChange, watchContextLoss, loadEnv, accentMaterial, setPixelRatio, norm, watchVisible, shouldRender, makeGrabbable, bootLazily } from './common.js';
import { SW, SH, TS, CYCLE, SCENARIOS, loadLogos, drawBase, drawScreen, screenKey, rippleAt } from './hero-screen.js';   // the app mock-up drawn on the screens
const doc = document.documentElement;
const overlay = doc.classList.contains('stage') ? document.querySelector('canvas.devices3d') : null;
// elsewhere: each canvas.hero3d is its own scene (the hero; the still images of tools/device-posters, data-scenario)
const scenes = overlay ? [overlay] : [...document.querySelectorAll('canvas.hero3d')];
const easeIO = (u) => (u < 0.5 ? 8 * u ** 4 : 1 - (-2 * u + 2) ** 4 / 2);   // close to the screens' cubic-bezier(.76, 0, .24, 1)
const stageMs = () => {
  const v = getComputedStyle(doc).getPropertyValue('--stage-duration').trim();
  return reduced() ? 0 : (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 1000;
};

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

async function start(canvas) {
  if (!desktop() || !webglOk()) return;
  const initial = canvas.dataset.scenario;   // a scene frozen on one client's test (still images)
  const [THREE] = await Promise.all([import('./three-lite.js'), overlay || initial ? loadLogos() : null]);   // Three.js trimmed to what the site uses, loaded on demand; the clients' logos for their screens
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const heroStage = document.querySelector('.hero-stage');
  // GPU lost: the scene fades out (the rest of the page does not depend on it)
  const lost = watchContextLoss(canvas, () => { canvas.classList.remove('is-ready'); heroStage?.classList.remove('is-lit'); });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9cc, 1.0); rim.position.set(-4, -1, 2); scene.add(rim);
  const env = loadEnv(THREE);

  // a single screen for both phones: it is the same test, on iOS and Android, at the same moment
  let sc = SCENARIOS.hero, base = drawBase(sc), t0 = performance.now(), lastKey;
  const sc2d = document.createElement('canvas'); sc2d.width = SW * TS; sc2d.height = SH * TS;
  const sg = sc2d.getContext('2d');
  const tex = new THREE.CanvasTexture(sc2d);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paint = (t) => { drawScreen(sg, base, t, sc); tex.needsUpdate = true; };
  let androidBody = null;   // set once the phones exist
  const setScenario = (name) => {
    const next = SCENARIOS[name] || SCENARIOS.hero;
    if (next === sc) return;
    sc = next; base = drawBase(sc); t0 = performance.now(); lastKey = undefined;
    paint(freeze !== null ? freeze : reduced() ? CYCLE - 0.01 : 0);
    androidBody?.color.set(sc.body || accentColor());   // the Android phone in the client's colour
  };
  // data-freeze="seconds": a still frame of the test at that moment, without a loop (LinkedIn banner export)
  const freeze = canvas.dataset.freeze !== undefined ? parseFloat(canvas.dataset.freeze) : null;
  paint(freeze !== null ? freeze : reduced() ? CYCLE - 0.01 : 0);

  const graphite = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.8, roughness: 0.28, envMap: env, envMapIntensity: 1.2 });
  const accent = accentMaterial(THREE, env);
  androidBody = accent;
  const glass = new THREE.MeshStandardMaterial({ color: 0x07080a, metalness: 0.3, roughness: 0.15, envMap: env, envMapIntensity: 0.8 });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const ios = buildPhone(THREE, { body: graphite, glass, black, screenMat, notch: 'island' });
  const android = buildPhone(THREE, { body: accent, glass, black, screenMat, notch: 'hole' });
  ios.position.set(-0.36, -0.07, 0.32); ios.rotation.set(0, 0.06, -0.02);
  android.position.set(0.46, 0.14, -0.34); android.rotation.set(0, -0.05, 0.035);
  const phones = new THREE.Group(); phones.add(android, ios);
  const spin = new THREE.Group(); spin.add(phones);          // the full turn when the app changes
  const holder = new THREE.Group(); holder.add(spin); scene.add(holder);   // size, in overlay mode

  const REST_X = 0.1, REST_Y = -0.38;
  phones.rotation.set(REST_X, REST_Y, 0);
  let W = 1, H = 1;

  // ---------- placement (overlay mode): the phones sit on the anchor of the current screen ----------
  // The camera's principal point is moved onto the anchor (lens shift), so the phones are seen head-on wherever they
  // are, exactly as in the hero's own canvas; their size follows the anchor's square.
  const slides = [...document.querySelectorAll('.slide')];
  const anchorOf = (i) => slides[i]?.querySelector('.hero-stage, .device-anchor') || null;
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.min(r.width, r.height) * (+el.dataset.zoom || 1) }; };
  let slideIdx = +(doc.dataset.slide || 0), cur = null, shown = true, tw = null;
  function project() {
    camera.updateProjectionMatrix();
    if (!overlay || !cur) return;
    camera.projectionMatrix.elements[8] = -(cur.x / W * 2 - 1);
    camera.projectionMatrix.elements[9] = -(1 - cur.y / H * 2);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    holder.scale.setScalar(cur.s / H);
  }
  function fit() {
    W = overlay ? window.innerWidth : canvas.clientWidth; H = overlay ? window.innerHeight : canvas.clientHeight;
    if (!W || !H) return;
    setPixelRatio(renderer, 1.5, 2);   // 1.5× on a standard screen, 2× on Retina
    renderer.setSize(W, H, false); camera.aspect = W / H;
    if (overlay && !tw) { const a = anchorOf(slideIdx); if (a) cur = rectOf(a); }
    project();
  }
  if (overlay) {
    const a = anchorOf(slideIdx);
    shown = !!a; holder.visible = shown;
    if (a) { setScenario(a.dataset.demo); }
  } else if (initial) setScenario(initial);
  // entrance: the phones rise from below while turning into place, the first time the hero shows them
  const INTRO_MS = 1600;
  let intro = !reduced() && freeze === null && (!overlay || slideIdx === 0) ? { start: 0 } : null;
  const easeOut = (u) => 1 - (1 - u) ** 3;
  const introPose = (e) => { spin.position.y = (1 - e) * -1.5; spin.rotation.y = (1 - e) * -2.4; spin.scale.setScalar(0.7 + 0.3 * e); };
  if (intro) introPose(0);
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');
  heroStage?.classList.add('is-lit');

  // a screen change: the phones leave their anchor and reach the next one while the screens move
  function toSlide(n) {
    if (intro) { intro = null; introPose(1); }   // a screen change during the entrance: the move takes over
    const forward = n > slideIdx; slideIdx = n;
    const a = anchorOf(n), name = a ? (a.dataset.demo || 'hero') : null;
    const dur = stageMs();
    if (!a && !shown) return;
    if (a && !shown) {   // coming back into view: from below when moving forward, from above when going back
      const t = rectOf(a);
      cur = { x: t.x, y: forward ? H * 1.35 : -H * 0.35, s: t.s };
      setScenario(name); shown = true; holder.visible = true;
    }
    const flip = !!name && SCENARIOS[name] !== sc;
    tw = { from: { ...cur }, start: performance.now(), dur, a, off: forward ? -H * 0.4 : H * 1.4, flip, name, switched: !flip };
    if (!dur) { step(performance.now()); renderer.render(scene, camera); }
  }
  function step(now) {
    if (tw) {
      const u = tw.dur ? Math.min(1, (now - tw.start) / tw.dur) : 1, e = easeIO(u);
      const to = tw.a ? rectOf(tw.a) : { x: tw.from.x, y: tw.off, s: tw.from.s };
      cur = { x: tw.from.x + (to.x - tw.from.x) * e, y: tw.from.y + (to.y - tw.from.y) * e, s: tw.from.s + (to.s - tw.from.s) * e };
      spin.rotation.y = tw.flip ? e * Math.PI * 2 : 0;
      if (!tw.switched && e >= 0.5) { tw.switched = true; setScenario(tw.name); }
      if (u >= 1) { if (!tw.a) { shown = false; holder.visible = false; } tw = null; spin.rotation.y = 0; }
    } else if (shown) {
      const a = anchorOf(slideIdx); if (a) cur = rectOf(a);   // follows the anchor (window resized, screen scrolled)
    }
    project();
  }
  if (overlay) new MutationObserver(() => { const n = +(doc.dataset.slide || 0); if (n !== slideIdx) toSlide(n); })
    .observe(doc, { attributes: true, attributeFilter: ['data-slide'] });

  // interaction: grab the scene, throw it, it spins on its momentum, then goes back to swaying
  const target = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  const clampX = (a) => Math.max(-0.9, Math.min(0.9, a));
  const grabbable = overlay ? [...new Set(slides.map((_, i) => anchorOf(i)).filter(Boolean))] : [canvas];
  const grabs = grabbable.map((el) => makeGrabbable(el, {
    cls: 'is-dragging',
    onGrab: () => { vel.x = vel.y = 0; },
    onDrag: (dx, dy) => {
      vel.x = dx * 0.008; vel.y = dy * 0.006;
      phones.rotation.y += vel.x; phones.rotation.x = clampX(phones.rotation.x + vel.y);
      if (reduced()) renderer.render(scene, camera);
    },
  }));
  const dragging = () => grabs.some((g) => g.dragging);
  const releasedAt = () => Math.max(...grabs.map((g) => g.releasedAt));
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  const refit = () => { fit(); renderer.render(scene, camera); };
  if (overlay) window.addEventListener('resize', refit);
  else if ('ResizeObserver' in window) new ResizeObserver(refit).observe(canvas); else window.addEventListener('resize', refit);
  onDprChange(refit);
  const visible = watchVisible(canvas);

  if (reduced() || freeze !== null) return;
  let frame = 0, lastDraw = 0, lastRipple = -1;
  (function loop(now) {
    if (lost()) return;
    requestAnimationFrame(loop);
    if (!visible() || document.hidden) return;
    if (overlay) { const wasShown = shown; step(now); if (!shown) { if (wasShown) renderer.render(scene, camera); return; } }
    else if (doc.classList.contains('stage') && doc.dataset.slide !== '0') return;
    if (!shouldRender(now, lastDraw, !!tw)) return;   // during a screen change the phones travel with it: every frame
    lastDraw = now;
    const t = Math.max(0, (now - t0) / 1000);
    const ripple = rippleAt(t % CYCLE, sc);
    if (ripple >= 0 && lastRipple < 0) window.dispatchEvent(new CustomEvent('cv:sound', { detail: { name: 'tap' } }));   // sound.js, if the sound is on
    lastRipple = ripple;
    if (frame++ % 3 === 0) {   // the phone screen at 20 fps at most, and only when it changes: ~40 % fewer uploads to the GPU
      const k = screenKey(t, sc);
      if (k === null || k !== lastKey) paint(t % CYCLE);
      lastKey = k;
    }
    if (!dragging()) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || now - releasedAt() < 600) {
        phones.rotation.y += vel.x; phones.rotation.x = clampX(phones.rotation.x + vel.y); vel.x *= 0.95; vel.y *= 0.95;
      } else {
        const ry = REST_Y + Math.sin(t * 0.45) * 0.2 + target.x * 0.22, rx = REST_X + Math.sin(t * 0.33) * 0.05 + target.y * 0.1;
        phones.rotation.y = norm(phones.rotation.y) + (ry - norm(phones.rotation.y)) * 0.035;
        phones.rotation.x += (rx - phones.rotation.x) * 0.035;
      }
    }
    phones.position.y = Math.sin(t * 0.9) * 0.035;
    if (intro) {
      if (!intro.start) intro.start = now;
      const u = Math.min(1, (now - intro.start) / INTRO_MS);
      introPose(easeOut(u));
      if (u >= 1) intro = null;
    }
    renderer.render(scene, camera);
  })(performance.now());
}

if (webglOk()) scenes.forEach((c) => bootLazily(() => start(c), 1200, 300));
