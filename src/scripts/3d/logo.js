// Adam's 3D logo (src/assets/logo.glb), in the top bar, top left.
// Same start as the marks: after load on a computer; on a phone, on the first gesture (touch, scroll) or 5 s after the
// page. It sways gently and follows the mouse a little; now and then it makes the same hint gesture as the marks (tilt +
// shine), last in the series. You can grab it and throw it, it keeps going on its momentum.
// Under "reduce motion": a static render, but it can still be moved by hand.
import { accent, reduced, webglOk, onDprChange, bootLazily, whenLoaded, withShine, watchContextLoss, loadEnv, accentMaterial, setPixelRatio, norm, watchVisible, shouldRender, makeGrabbable, Hint } from './common.js';
import LOGO_GLB from '../../assets/logo.glb?url';
const canvas = document.querySelector('.brand canvas.logo3d');
const ORDER = 3;   // in the series of hint gestures: after LinkedIn, Betclic and Accor

let started = false;
async function go() {
  if (started) return; started = true;
  const THREE = await import('./three-lite.js'), { GLTFLoader } = THREE;   // trimmed Three.js, model loader included
  const env = loadEnv(THREE);
  new GLTFLoader().load(LOGO_GLB, (gltf) => {
    const logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    logo.scale.setScalar(1.8 / Math.max(s.x, s.y, s.z));
    // shine: the same band of light as on the marks
    const shine = { t: { value: -1e5 }, w: { value: 0.3 }, a: { value: 0 } };
    // its own material: less metal and a touch of glow, so it reads as the bright accent of the flat logo (the metal
    // of the Android phone mirrors a dark environment, which turned this small logo brown)
    const base = accentMaterial(THREE, env);
    base.metalness = 0.18; base.roughness = 0.4; base.emissive = new THREE.Color(accent()).multiplyScalar(0.22);
    const mat = withShine(base, shine);
    logo.traverse((n) => { if (n.isMesh) n.material = mat; });
    mount(THREE, logo, shine);
  });
}

function mount(THREE, logo, shine) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const lost = watchContextLoss(canvas, () => canvas.classList.remove('is-ready'));   // GPU lost: the image logo comes back
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
    setPixelRatio(renderer);   // supersampled: small canvas, crisp edges
    renderer.setSize(w, h, false);
    camera.left = -half * w / h; camera.right = half * w / h; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');

  const target = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let idle = 0, hover = false, paused = false, shown = false;
  const SWEEP = 0.9 + 0.6 * 0.9 + 0.3 * 1.6;
  const hint = new Hint(canvas, shine, ORDER, SWEEP, 0.6);
  canvas.addEventListener('pointerenter', () => { hover = true; hint.stop(3000); });
  canvas.addEventListener('pointerleave', () => { hover = false; });
  // a throw is not a click: the page reloads only if the logo (almost) did not move under the pointer
  const grab = makeGrabbable(canvas, {
    cls: 'is-dragging',
    onGrab: () => { hint.stop(8000); vel.x = vel.y = 0; },
    onDrag: (dx, dy) => {
      vel.x = dx * 0.02; vel.y = dy * 0.02;
      pivot.rotation.y += vel.x; pivot.rotation.x += vel.y;
      if (reduced()) renderer.render(scene, camera);
    },
    clickSlop: 6,
  });
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
  onDprChange(() => { fit(); renderer.render(scene, camera); });
  const visible = watchVisible(canvas);

  if (reduced()) return;
  // at rest it sways at ~5°/s: less than a pixel from one frame to the next. It is only redrawn when its pose has moved
  // by at least 0.004 rad (~¼ pixel at the edge), or during the hint gesture (the shine moves even when the pose barely does).
  let lastDraw = 0, drawnX = NaN, drawnY = NaN;
  (function loop(now) {
    if (lost()) return;
    requestAnimationFrame(loop);
    if (!visible() || document.hidden) { paused = true; return; }
    if (!shouldRender(now, lastDraw)) return;   // frozen while the page moves, 60 fps at most
    if (!document.body.classList.contains('is-scrolled')) { shown = false; return; }   // hidden on the hero: it only appears once the visitor has left it
    if (!shown) { shown = true; hint.stop(0); hint.next = performance.now() + 1200; }   // when it appears, a quick hint gesture shows that it is 3D
    lastDraw = now;
    if (paused) { paused = false; hint.stop(1000 + ORDER * 1500); }
    if (!grab.dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || performance.now() - grab.releasedAt < 700) {
        pivot.rotation.y += vel.x; pivot.rotation.x += vel.y; vel.x *= 0.94; vel.y *= 0.94;   // on its momentum
      } else {
        const now = performance.now();
        if (!hover && !hint.running && hint.due(now)) hint.begin(now);
        let hy = 0, hx = 0, ease = 0.045;
        if (hint.running) {   // hint gesture: it tilts and a shine sweeps across it
          const h = hint.step(now);
          hy = h.y; hx = h.x; ease = 0.3;
        }
        idle += 0.016;
        const ry = Math.sin(idle * 0.8) * 0.12 + target.x * 0.25 + hy, rx = Math.sin(idle * 0.6) * 0.05 + target.y * 0.15 + hx;
        pivot.rotation.y = norm(pivot.rotation.y) + (ry - norm(pivot.rotation.y)) * ease;   // straightens up gently
        pivot.rotation.x = norm(pivot.rotation.x) + (rx - norm(pivot.rotation.x)) * ease;
      }
    }
    if (grab.dragging || hint.running || shine.a.value > 0 || !(Math.abs(pivot.rotation.x - drawnX) < 0.004 && Math.abs(pivot.rotation.y - drawnY) < 0.004)) {
      renderer.render(scene, camera); drawnX = pivot.rotation.x; drawnY = pivot.rotation.y;
    }
  })(performance.now());
}

whenLoaded(() => { if (canvas && webglOk()) bootLazily(go, 1500, 300); });
