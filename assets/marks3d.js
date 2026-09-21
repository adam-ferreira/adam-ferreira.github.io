// Les marques de la phrase d'accueil (Betclic, Accor) en volume : chaque SVG est extrudé avec Three.js.
// Écran large avec souris uniquement, après le chargement de la page ; ailleurs, le SVG plat reste affiché.
// Prise en main : cliquer-glisser fait tourner la marque, qui revient d'elle-même de face au relâcher.
const marks = [...document.querySelectorAll('.mark[data-svg]')];
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDark = () => document.documentElement.dataset.theme === 'dark';

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

async function start() {
  if (!marks.length || !wanted() || !webglOk()) return;
  const [THREE, { SVGLoader }] = await Promise.all([import('three'), import('three/addons/loaders/SVGLoader.js')]);
  const loader = new SVGLoader();
  for (const mark of marks) setup(mark, THREE, loader, SVGLoader);
}

async function setup(mark, THREE, loader, SVGLoader) {
  const svgText = await fetch(mark.dataset.svg).then((r) => r.text()).catch(() => null);
  if (!svgText) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'mark-3d';
  canvas.setAttribute('aria-hidden', 'true');
  mark.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  camera.position.set(0, 0, 400); camera.lookAt(0, 0, 0); // loin devant : l'extrusion ne doit jamais couper le plan proche
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(200, 300, 600); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(-300, -200, 400); scene.add(rim);

  // SVG → formes → volumes. Chaque chemin garde sa couleur ; le chemin suivant est posé un peu devant le précédent.
  const data = loader.parse(svgText);
  const group = new THREE.Group();
  const darkFill = mark.dataset.fillDark;
  data.paths.forEach((path, i) => {
    const base = path.userData.style.fill;
    if (!base || base === 'none') return;
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(base), metalness: 0.15, roughness: 0.55 });
    mat.userData.base = base;
    const depth = 14;
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 2, curveSegments: 6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = i * 2.5;
      group.add(mesh);
    }
  });
  // en mode nuit, les faces sombres prennent la couleur claire indiquée (le blanc reste blanc)
  const recolor = () => group.traverse((m) => {
    if (!m.isMesh) return;
    const b = m.material.userData.base;
    m.material.color.set(isDark() && darkFill && b.toLowerCase() !== '#ffffff' ? darkFill : b);
  });
  recolor();
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group();
  group.position.set(-center.x, -center.y, -center.z);
  wrap.add(group);
  wrap.scale.set(1, -1, 1); // le repère SVG a l'axe y vers le bas
  scene.add(wrap);

  function fit() {
    const w = mark.clientWidth || 60, h = mark.clientHeight || 24;
    renderer.setSize(w, h, false);
    const aspect = w / h, halfH = size.y * 0.58, halfW = halfH * aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }
  fit();
  renderer.render(scene, camera);
  mark.classList.add('is-3d');

  // interaction : rotation libre au glisser, retour de face au relâcher, léger balancement au repos
  let dragging = false, last = null, t = Math.random() * 6, hover = false;
  const target = { x: 0, y: 0 };
  canvas.addEventListener('pointerdown', (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    wrap.rotation.y += (e.clientX - last.x) * 0.014;
    wrap.rotation.x += (e.clientY - last.y) * 0.014;
    last = { x: e.clientX, y: e.clientY };
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerenter', () => { hover = true; }); canvas.addEventListener('pointerleave', () => { hover = false; });

  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);
  new MutationObserver(() => { recolor(); renderer.render(scene, camera); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduced()) return;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (!dragging) {
      t += 0.016;
      const restY = hover ? 0.28 : Math.sin(t * 0.9) * 0.06, restX = hover ? -0.18 : Math.sin(t * 0.7) * 0.03;
      wrap.rotation.y += (restY - wrap.rotation.y) * 0.08;
      wrap.rotation.x += (restX - wrap.rotation.x) * 0.08;
    }
    renderer.render(scene, camera);
  })();
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => (('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 500)));
