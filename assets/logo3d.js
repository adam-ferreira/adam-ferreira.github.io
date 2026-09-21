// Le logo 3D d'Adam (assets/logo.glb) dans l'en-tête.
// Chargé après la page, seulement si WebGL est là. Sous « réduire les animations », une image fixe : pas de rotation.
// Repris du portfolio (caméra orthographique, matière orange, environnement cubemap, suivi de la souris amorti).
// Écrans larges avec souris uniquement : sur mobile, Three.js coûterait plus qu'il n'apporte (mesuré : +1,5 s de calcul).
const ORANGE = 0xff7452;
const canvas = document.querySelector('canvas.logo3d');
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

async function start() {
  if (!canvas || !wanted() || !webglOk()) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.classList.add('is-loading');
  const [THREE, { GLTFLoader }] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]);

  const size = () => ({ w: canvas.clientWidth || 200, h: canvas.clientHeight || 200 });
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-4, -2, 3); scene.add(rim);

  const env = new THREE.CubeTextureLoader().setPath('assets/cubemaps/')
    .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
  env.colorSpace = THREE.SRGBColorSpace;

  let logo = null, target = { x: 0, y: 0 }, raf = 0, visible = true, idle = 0;
  // cliquer-glisser : rotation libre ; au relâcher, inertie qui s'amortit, puis retour à la rotation lente
  let dragging = false, last = null, vel = { x: 0, y: 0 };

  function fit() {
    const { w, h } = size();
    renderer.setSize(w, h, false);
    const aspect = w / h, half = 1.15;
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  new GLTFLoader().load('assets/logo.glb', (gltf) => {
    logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    const k = 1.8 / Math.max(s.x, s.y, s.z);
    logo.scale.setScalar(k);
    logo.traverse((n) => {
      if (n.isMesh) {
        n.material = new THREE.MeshStandardMaterial({ color: ORANGE, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
      }
    });
    scene.add(logo);
    fit();
    renderer.render(scene, camera);
    canvas.classList.remove('is-loading');
    canvas.classList.add('is-ready');
    loop();
  }, undefined, () => { canvas.classList.remove('is-loading'); });

  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let releasedAt = -1e9;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!logo || !visible || document.hidden) return;
    if (dragging) { renderer.render(scene, camera); return; }
    const sinceRelease = performance.now() - releasedAt;
    if (Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002 || sinceRelease < 1200) {
      logo.rotation.y += vel.x; logo.rotation.x += vel.y;   // sur son élan
      vel.x *= 0.965; vel.y *= 0.965;
    } else if (!reduced) {
      idle += 0.016;
      const restY = Math.sin(idle * 0.8) * 0.12 + target.x * 0.25, restX = Math.sin(idle * 0.6) * 0.05 + target.y * 0.15;
      logo.rotation.y = norm(logo.rotation.y) + (restY - norm(logo.rotation.y)) * 0.045;   // se redresse doucement
      logo.rotation.x = norm(logo.rotation.x) + (restX - norm(logo.rotation.x)) * 0.045;
    } else { return; }
    renderer.render(scene, camera);
  }
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; last = { x: e.clientX, y: e.clientY }; vel = { x: 0, y: 0 };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !logo) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    vel = { x: dx * 0.02, y: dy * 0.02 };
    logo.rotation.y += vel.x; logo.rotation.x += vel.y;
    if (reduced) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); canvas.classList.remove('is-dragging'); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('resize', () => { fit(); if (logo && reduced) renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(canvas);
  }
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => { ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300); });
