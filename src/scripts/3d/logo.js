// Adam's 3D logo (src/assets/logo.glb), in the top bar, top left.
// Same start as the marks: after load on a computer; on a phone, on the first gesture (touch, scroll) or 5 s after the
// page. It sways gently and follows the mouse a little; now and then it makes the same hint gesture as the marks (tilt +
// shine), last in the series. You can grab it and throw it, it keeps going on its momentum.
// Under "reduce motion": a static render, but it can still be moved by hand.
import { CUBEMAP } from './env.js';
import { reduced, webglOk, onDprChange, bootLazily, whenLoaded, HINT_MS, firstHint, nextHintAt, easeIO, withShine, watchContextLoss } from './common.js';
import LOGO_GLB from '../../assets/logo.glb?url';
const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb627';   // the site's accent color
const canvas = document.querySelector('.brand canvas.logo3d');
const ORDER = 3;   // in the series of hint gestures: after LinkedIn, Betclic and Accor

let started = false;
async function go() {
  if (started) return; started = true;
  const THREE = await import('./three-lite.js'), { GLTFLoader } = THREE;   // trimmed Three.js, model loader included
  const env = new THREE.CubeTextureLoader().load(CUBEMAP);
  env.colorSpace = THREE.SRGBColorSpace;
  new GLTFLoader().load(LOGO_GLB, (gltf) => {
    const logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    logo.scale.setScalar(1.8 / Math.max(s.x, s.y, s.z));
    // shine: the same band of light as on the marks
    const shine = { t: { value: -1e5 }, w: { value: 0.3 }, a: { value: 0 } };
    const mat = withShine(new THREE.MeshStandardMaterial({ color: new THREE.Color(ACC), metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 }), shine);
    logo.traverse((n) => { if (n.isMesh) n.material = mat; });
    mount(THREE, logo, shine);
  });
}

function mount(THREE, logo, shine) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const lost = watchContextLoss(canvas, () => canvas.classList.remove('is-ready'));   // GPU lost: the image logo comes back
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));   // supersampled: small canvas, crisp edges
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-4, -2, 3); scene.add(rim);
  const pivot = new THREE.Group(); pivot.add(logo); scene.add(pivot);

  function fit() {
    const w = canvas.clientWidth || 62, h = canvas.clientHeight || 62, half = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));
    renderer.setSize(w, h, false);
    camera.left = -half * w / h; camera.right = half * w / h; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');

  const target = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let dragging = false, last = null, releasedAt = -1e9, idle = 0, visible = true, hover = false, paused = false, shown = false, moved = 0;
  const HINT_A = 0.6, SWEEP = 0.9 + 0.6 * 0.9 + 0.3 * 1.6;
  let hintStart = -1, nextHint = firstHint(ORDER);
  const stopHint = (delay) => { if (hintStart >= 0) { hintStart = -1; delete canvas.dataset.hint; shine.a.value = 0; } nextHint = Math.max(nextHint, performance.now() + delay); };
  canvas.addEventListener('pointerenter', () => { hover = true; stopHint(3000); });
  canvas.addEventListener('pointerleave', () => { hover = false; });
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  canvas.addEventListener('pointerdown', (e) => { stopHint(8000); dragging = true; moved = 0; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; moved += Math.abs(dx) + Math.abs(dy);
    vel.x = dx * 0.02; vel.y = dy * 0.02;
    pivot.rotation.y += vel.x; pivot.rotation.x += vel.y;
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); canvas.classList.remove('is-dragging'); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  // a throw is not a click: the page reloads only if the logo (almost) did not move under the pointer
  canvas.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } });
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
  onDprChange(() => { fit(); renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  if (reduced()) return;
  // at rest it sways at ~5°/s: less than a pixel from one frame to the next. It is only redrawn when its pose has moved
  // by at least 0.004 rad (~¼ pixel at the edge), or during the hint gesture (the shine moves even when the pose barely does).
  let lastDraw = 0, drawnX = NaN, drawnY = NaN;
  (function loop(now) {
    if (lost()) return;
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { paused = true; return; }
    if (document.documentElement.classList.contains('is-moving') || now - lastDraw < 15) return;   // frozen while the page moves, 60 fps at most
    if (!document.body.classList.contains('is-scrolled')) { shown = false; return; }   // hidden on the hero: it only appears once the visitor has left it
    if (!shown) { shown = true; stopHint(0); nextHint = performance.now() + 1200; }   // when it appears, a quick hint gesture shows that it is 3D
    lastDraw = now;
    if (paused) { paused = false; stopHint(0); nextHint = Math.max(nextHint, performance.now() + 1000 + ORDER * 1500); }
    if (!dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || performance.now() - releasedAt < 700) {
        pivot.rotation.y += vel.x; pivot.rotation.x += vel.y; vel.x *= 0.94; vel.y *= 0.94;   // on its momentum
      } else {
        const now = performance.now();
        if (!hover && hintStart < 0 && now >= nextHint) { hintStart = now; canvas.dataset.hint = '1'; }   // gesture marker (used by the tests)
        let hy = 0, hx = 0, ease = 0.045;
        if (hintStart >= 0) {   // hint gesture: it tilts and a shine sweeps across it
          const u = Math.min(1, (now - hintStart) / HINT_MS), sw = Math.sin(Math.PI * u);
          hy = HINT_A * sw; hx = -HINT_A * 0.35 * sw; ease = 0.3;
          shine.t.value = -SWEEP + 2 * SWEEP * easeIO(u); shine.a.value = 0.75 * sw;
          if (u >= 1) { hintStart = -1; delete canvas.dataset.hint; shine.a.value = 0; nextHint = nextHintAt(now); }
        }
        idle += 0.016;
        const ry = Math.sin(idle * 0.8) * 0.12 + target.x * 0.25 + hy, rx = Math.sin(idle * 0.6) * 0.05 + target.y * 0.15 + hx;
        pivot.rotation.y = norm(pivot.rotation.y) + (ry - norm(pivot.rotation.y)) * ease;   // straightens up gently
        pivot.rotation.x = norm(pivot.rotation.x) + (rx - norm(pivot.rotation.x)) * ease;
      }
    }
    if (dragging || hintStart >= 0 || shine.a.value > 0 || !(Math.abs(pivot.rotation.x - drawnX) < 0.004 && Math.abs(pivot.rotation.y - drawnY) < 0.004)) {
      renderer.render(scene, camera); drawnX = pivot.rotation.x; drawnY = pivot.rotation.y;
    }
  })(performance.now());
}

whenLoaded(() => { if (canvas && webglOk()) bootLazily(go, 1500, 300); });
