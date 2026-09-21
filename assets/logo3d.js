// Le logo 3D d'Adam (assets/logo.glb) : en petit dans la barre, en grand sur la scène d'accueil.
// Un seul chargement du modèle, une scène par canvas. Écrans larges avec souris uniquement, après la page
// (mesuré : sur mobile, Three.js coûterait +1,5 s de calcul pour rien).
// Sous « réduire les animations » : rendu fixe, mais on peut toujours le manipuler à la main.
const ORANGE = 0xff7452;
const canvases = [...document.querySelectorAll('canvas.logo3d')];
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

async function start() {
  if (!canvases.length || !wanted() || !webglOk()) return;
  const [THREE, { GLTFLoader }] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]);
  const env = new THREE.CubeTextureLoader().setPath('assets/cubemaps/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
  env.colorSpace = THREE.SRGBColorSpace;
  new GLTFLoader().load('assets/logo.glb', (gltf) => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const k = 1.8 / Math.max(s.x, s.y, s.z);
    const mat = new THREE.MeshStandardMaterial({ color: ORANGE, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
    for (const canvas of canvases) {
      const logo = gltf.scene.clone(true);
      logo.position.sub(c.clone().multiplyScalar(k)); logo.scale.setScalar(k);
      logo.traverse((n) => { if (n.isMesh) n.material = mat; });
      const pivot = new THREE.Group(); pivot.add(logo);
      mount(THREE, canvas, pivot, canvas.classList.contains('logo3d-hero'));
    }
  });
}

function mount(THREE, canvas, logo, hero) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: hero ? 'high-performance' : 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-4, -2, 3); scene.add(rim);
  scene.add(logo);

  const half = hero ? 1.05 : 1.15;
  function fit() {
    const w = canvas.clientWidth || 200, h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  canvas.classList.add('is-ready');
  const stage = canvas.closest('.hero-stage'); if (stage) stage.classList.add('is-lit');

  // on l'attrape, on le lance, il continue sur son élan, puis il reprend sa rotation lente
  const target = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  let dragging = false, last = null, releasedAt = -1e9, idle = Math.random() * 6, visible = true;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const gain = hero ? 0.009 : 0.02;   // le grand logo demande un geste plus ample pour le même tour
  canvas.addEventListener('pointerdown', (e) => { dragging = true; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    vel.x = dx * gain; vel.y = dy * gain;
    logo.rotation.y += vel.x; logo.rotation.x += vel.y;
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); canvas.classList.remove('is-dragging'); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointermove', (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);

  if (reduced()) return;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (!dragging) {
      if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || performance.now() - releasedAt < 700) {
        logo.rotation.y += vel.x; logo.rotation.x += vel.y; vel.x *= 0.94; vel.y *= 0.94;
      } else {
        idle += 0.016;
        // sur la scène : lente oscillation ample qui suit un peu la souris ; dans la barre : presque immobile
        const ry = hero ? Math.sin(idle * 0.5) * 0.55 + target.x * 0.35 : Math.sin(idle * 0.8) * 0.12 + target.x * 0.25;
        const rx = hero ? Math.sin(idle * 0.37) * 0.12 + target.y * 0.2 : Math.sin(idle * 0.6) * 0.05 + target.y * 0.15;
        const ease = hero ? 0.03 : 0.045;
        logo.rotation.y = norm(logo.rotation.y) + (ry - norm(logo.rotation.y)) * ease;
        logo.rotation.x = norm(logo.rotation.x) + (rx - norm(logo.rotation.x)) * ease;
      }
    }
    renderer.render(scene, camera);
  })();
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => { ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300); });
