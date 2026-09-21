// Le logo 3D d'Adam (assets/logo.glb), dans la barre en haut à gauche. Écrans larges avec souris uniquement.
// Chargé à la demande : au survol du logo, ou dès que la scène d'accueil a quitté l'écran. Jusque-là, l'image fixe
// (identique au repos) suffit, et on épargne un rendu 3D au chargement de la page.
// On l'attrape, on le lance, il continue sur son élan, puis reprend son léger balancement.
// Sous « réduire les animations » : rendu fixe, mais on peut toujours le manipuler à la main.
const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7452';   // l'accent du site
const canvas = document.querySelector('.brand canvas.logo3d');
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// suit les changements de densité d'écran (fenêtre glissée d'un écran Retina vers un écran standard, zoom du navigateur)
const onDprChange = (cb) => {
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  q.addEventListener('change', () => { cb(); onDprChange(cb); }, { once: true });
};

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

let started = false;
async function go() {
  if (started) return; started = true;
  const [THREE, { GLTFLoader }] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]);
  const env = new THREE.CubeTextureLoader().setPath('assets/cubemaps/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
  env.colorSpace = THREE.SRGBColorSpace;
  new GLTFLoader().load('assets/logo.glb', (gltf) => {
    const logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    logo.scale.setScalar(1.8 / Math.max(s.x, s.y, s.z));
    logo.traverse((n) => { if (n.isMesh) n.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(ACC), metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 }); });
    mount(THREE, logo);
  });
}

function mount(THREE, logo) {
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
  let dragging = false, last = null, releasedAt = -1e9, idle = 0, visible = true;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  canvas.addEventListener('pointerdown', (e) => { dragging = true; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    vel.x = dx * 0.02; vel.y = dy * 0.02;
    pivot.rotation.y += vel.x; pivot.rotation.x += vel.y;
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); canvas.classList.remove('is-dragging'); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
  onDprChange(() => { fit(); renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  if (reduced()) return;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (!dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || performance.now() - releasedAt < 700) {
        pivot.rotation.y += vel.x; pivot.rotation.x += vel.y; vel.x *= 0.94; vel.y *= 0.94;   // sur son élan
      } else {
        idle += 0.016;
        const ry = Math.sin(idle * 0.8) * 0.12 + target.x * 0.25, rx = Math.sin(idle * 0.6) * 0.05 + target.y * 0.15;
        pivot.rotation.y = norm(pivot.rotation.y) + (ry - norm(pivot.rotation.y)) * 0.045;   // se redresse doucement
        pivot.rotation.x = norm(pivot.rotation.x) + (rx - norm(pivot.rotation.x)) * 0.045;
      }
    }
    renderer.render(scene, camera);
  })();
}

function start() {
  if (!canvas || !wanted() || !webglOk()) return;
  canvas.closest('.brand').addEventListener('pointerenter', go, { once: true });
  const stage = document.querySelector('.hero-stage');
  if (!stage || getComputedStyle(stage).display === 'none' || !('IntersectionObserver' in window)) return go();
  new IntersectionObserver((en, obs) => { if (!en[0].isIntersecting) { obs.disconnect(); go(); } }).observe(stage);
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => { ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300); });
