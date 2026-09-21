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
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-250, 350, 500); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(300, -200, 400); scene.add(rim);

  // SVG → formes → volumes. Chaque chemin garde sa couleur ; le chemin suivant est posé un peu devant le précédent.
  const data = loader.parse(svgText);
  const group = new THREE.Group();
  const darkFill = mark.dataset.fillDark;
  // épaisseur proportionnelle à la hauteur du dessin : un vrai objet, pas une feuille
  const vb = (svgText.match(/viewBox="([^"]+)"/) || [])[1];
  const svgH = vb ? parseFloat(vb.split(/[\s,]+/)[3]) : 100;
  const depth = svgH * 0.14;
  // la première couleur est la plaque (pleine épaisseur) ; une autre couleur = un relief fin gravé dessus (lettres, glyphe)
  const baseColor = (data.paths.find((p) => p.userData.style.fill && p.userData.style.fill !== 'none') || { userData: { style: {} } }).userData.style.fill;
  data.paths.forEach((path, i) => {
    const base = path.userData.style.fill;
    if (!base || base === 'none') return;
    const overlay = base.toLowerCase() !== String(baseColor).toLowerCase();
    const thickness = overlay ? depth * 0.16 : depth;
    // face avant : la couleur exacte du SVG, sans éclairage → au repos, indiscernable du logo plat
    const cap = new THREE.MeshBasicMaterial({ color: new THREE.Color(base) });
    // tranches : éclairées et un peu plus sombres → le volume n'apparaît que quand on l'incline
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.72), metalness: 0.1, roughness: 0.6 });
    cap.userData.base = side.userData.base = base;
    for (const shape of SVGLoader.createShapes(path)) {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 14 });
      const mesh = new THREE.Mesh(geo, [cap, side]);
      mesh.position.z = overlay ? depth - thickness * 0.35 : 0;   // gravé à fleur de la plaque
      group.add(mesh);
    }
  });
  // en mode nuit, les faces sombres prennent la couleur claire indiquée (le blanc reste blanc)
  const recolor = () => group.traverse((m) => {
    if (!m.isMesh) return;
    const [cap, side] = m.material;
    const b = cap.userData.base;
    const c = isDark() && darkFill && b.toLowerCase() !== '#ffffff' ? darkFill : b;
    cap.color.set(c); side.color.set(c).multiplyScalar(0.72);
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

  // interaction : on l'attrape, on le lance, il continue sur son élan, puis il se remet droit tout seul
  let dragging = false, last = null, t = Math.random() * 6, hover = false, moved = 0;
  const vel = { x: 0, y: 0 }; let releasedAt = -1e9;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // angle ramené dans [-π, π] : retour par le chemin le plus court
  const LIM_X = 0.9, LIM_Y = 1.15; // ~50° et ~65° : au-delà, ça résiste comme un élastique
  const soft = (a, lim) => (Math.abs(a) <= lim ? a : Math.sign(a) * (lim + (Math.abs(a) - lim) * 0.18));
  const clampRot = () => { wrap.rotation.x = soft(wrap.rotation.x, LIM_X); wrap.rotation.y = soft(wrap.rotation.y, LIM_Y); };
  canvas.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    wrap.rotation.y += dx * 0.018; wrap.rotation.x += dy * 0.018; clampRot();
    vel.x = dx * 0.018; vel.y = dy * 0.018;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  mark.addEventListener('click', (e) => { if (moved > 4) { e.preventDefault(); moved = 0; } }); // un glisser n'est pas un clic
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
      const sinceRelease = performance.now() - releasedAt;
      const spinning = Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002;
      if (spinning || sinceRelease < 700) {
        wrap.rotation.y += vel.x; wrap.rotation.x += vel.y; clampRot();   // sur son élan, freiné par la butée
        if (Math.abs(wrap.rotation.y) >= LIM_Y) vel.x *= 0.6;
        if (Math.abs(wrap.rotation.x) >= LIM_X) vel.y *= 0.6;
        vel.x *= 0.93; vel.y *= 0.93;
      } else {
        t += 0.016;
        const restY = hover ? 0.22 : 0, restX = hover ? -0.14 : 0;   // au repos : exactement à plat, comme le logo 2D
        wrap.rotation.y = norm(wrap.rotation.y) + (restY - norm(wrap.rotation.y)) * 0.06;   // se redresse doucement
        wrap.rotation.x = norm(wrap.rotation.x) + (restX - norm(wrap.rotation.x)) * 0.06;
      }
    }
    renderer.render(scene, camera);
  })();
  window.addEventListener('resize', () => { fit(); renderer.render(scene, camera); });
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => (('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 500)));
