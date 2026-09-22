// Le logo 3D d'Adam (src/assets/logo.glb), dans la barre en haut à gauche.
// Même activation que les marques : après le chargement sur ordinateur ; sur téléphone, au premier geste (toucher,
// défilement) ou 5 s après la page. Il se balance doucement et suit un peu la souris ; de temps en temps il fait le même
// geste d'invite que les marques (inclinaison + reflet), en dernier de la série. On l'attrape, on le lance, il continue sur son élan.
// Sous « réduire les animations » : rendu fixe, mais on peut toujours le manipuler à la main.
import { CUBEMAP } from './env.js';
import { reduced, webglOk, onDprChange, bootLazily, whenLoaded, HINT_MS, firstHint, nextHintAt, easeIO, withShine } from './common.js';
import LOGO_GLB from '../../assets/logo.glb?url';
const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb627';   // l'accent du site
const canvas = document.querySelector('.brand canvas.logo3d');
const ORDER = 3;   // dans la série des gestes d'invite : après LinkedIn, Betclic et Accor

let started = false;
async function go() {
  if (started) return; started = true;
  const THREE = await import('./three-lite.js'), { GLTFLoader } = THREE;   // Three.js réduit, chargeur de modèles compris
  const env = new THREE.CubeTextureLoader().load(CUBEMAP);
  env.colorSpace = THREE.SRGBColorSpace;
  new GLTFLoader().load(LOGO_GLB, (gltf) => {
    const logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    logo.scale.setScalar(1.8 / Math.max(s.x, s.y, s.z));
    // reflet : la même bande de lumière que sur les marques
    const shine = { t: { value: -1e5 }, w: { value: 0.3 }, a: { value: 0 } };
    const mat = withShine(new THREE.MeshStandardMaterial({ color: new THREE.Color(ACC), metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 }), shine);
    logo.traverse((n) => { if (n.isMesh) n.material = mat; });
    mount(THREE, logo, shine);
  });
}

function mount(THREE, logo, shine) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));   // suréchantillonné : petit canvas, bords nets
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
  // un lancer n'est pas un clic : on ne recharge la page que si le logo n'a (presque) pas bougé sous le doigt
  canvas.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } });
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
  onDprChange(() => { fit(); renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  if (reduced()) return;
  // au repos il se balance de ~5°/s : d'une image à l'autre, moins d'un pixel. On ne le redessine que quand sa pose a bougé
  // d'au moins 0,004 rad (~¼ de pixel au bord), ou pendant le geste d'invite (le reflet bouge même quand la pose change peu).
  let lastDraw = 0, drawnX = NaN, drawnY = NaN;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { paused = true; return; }
    if (document.documentElement.classList.contains('is-moving') || now - lastDraw < 15) return;   // figé pendant les mouvements de page, 60 images/s au plus
    if (!document.body.classList.contains('is-scrolled')) { shown = false; return; }   // caché sur l'accueil : il n'apparaît qu'une fois qu'on l'a quitté
    if (!shown) { shown = true; stopHint(0); nextHint = performance.now() + 1200; }   // à son apparition, un geste d'invite rapide montre qu'il est en 3D
    lastDraw = now;
    if (paused) { paused = false; stopHint(0); nextHint = Math.max(nextHint, performance.now() + 1000 + ORDER * 1500); }
    if (!dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || performance.now() - releasedAt < 700) {
        pivot.rotation.y += vel.x; pivot.rotation.x += vel.y; vel.x *= 0.94; vel.y *= 0.94;   // sur son élan
      } else {
        const now = performance.now();
        if (!hover && hintStart < 0 && now >= nextHint) { hintStart = now; canvas.dataset.hint = '1'; }   // marqueur du geste (utile au test)
        let hy = 0, hx = 0, ease = 0.045;
        if (hintStart >= 0) {   // geste d'invite : il s'incline et un reflet le balaie
          const u = Math.min(1, (now - hintStart) / HINT_MS), sw = Math.sin(Math.PI * u);
          hy = HINT_A * sw; hx = -HINT_A * 0.35 * sw; ease = 0.3;
          shine.t.value = -SWEEP + 2 * SWEEP * easeIO(u); shine.a.value = 0.75 * sw;
          if (u >= 1) { hintStart = -1; delete canvas.dataset.hint; shine.a.value = 0; nextHint = nextHintAt(now); }
        }
        idle += 0.016;
        const ry = Math.sin(idle * 0.8) * 0.12 + target.x * 0.25 + hy, rx = Math.sin(idle * 0.6) * 0.05 + target.y * 0.15 + hx;
        pivot.rotation.y = norm(pivot.rotation.y) + (ry - norm(pivot.rotation.y)) * ease;   // se redresse doucement
        pivot.rotation.x = norm(pivot.rotation.x) + (rx - norm(pivot.rotation.x)) * ease;
      }
    }
    if (dragging || hintStart >= 0 || shine.a.value > 0 || !(Math.abs(pivot.rotation.x - drawnX) < 0.004 && Math.abs(pivot.rotation.y - drawnY) < 0.004)) {
      renderer.render(scene, camera); drawnX = pivot.rotation.x; drawnY = pivot.rotation.y;
    }
  })(performance.now());
}

whenLoaded(() => { if (canvas && webglOk()) bootLazily(go, 1500, 300); });
