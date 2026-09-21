// Les marques en volume : Betclic et Accor dans la phrase d'accueil, LinkedIn dans la barre. Three.js extrude chaque SVG.
// Écran large avec souris uniquement, après le chargement de la page ; ailleurs, le SVG plat reste affiché.
// · Au repos, le volume se superpose au pixel près au SVG plat : une unité SVG = hauteur de la marque / hauteur du viewBox.
// · Le canvas déborde largement de la marque (F fois sa taille) et passe au-dessus du texte : en rotation,
//   la marque n'est jamais coupée par les bords d'une boîte.
// · On l'attrape sur la marque elle-même, on la lance, elle file sur son élan, puis se remet droite toute seule.
// · LinkedIn est un cube : le carré bleu devient un vrai volume, avec le « in » en relief devant et derrière,
//   et on peut le faire tourner dans tous les sens.
const F = 2.6;
const marks = [...document.querySelectorAll('.mark[data-svg]')];
const wanted = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDark = () => document.documentElement.dataset.theme === 'dark';
// suit les changements de densité d'écran (fenêtre glissée d'un écran Retina vers un écran standard, zoom du navigateur)
const onDprChange = (cb) => {
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  q.addEventListener('change', () => { cb(); onDprChange(cb); }, { once: true });
};

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

async function start() {
  if (!marks.length || !wanted() || !webglOk()) return;
  const [THREE, { SVGLoader }, { RoundedBoxGeometry }] = await Promise.all([
    import('three'), import('three/addons/loaders/SVGLoader.js'), import('three/addons/geometries/RoundedBoxGeometry.js'),
  ]);
  const loader = new SVGLoader();
  for (const mark of marks) setup(mark, THREE, loader, SVGLoader, RoundedBoxGeometry);
}

async function setup(mark, THREE, loader, SVGLoader, RoundedBoxGeometry) {
  const svgText = await fetch(mark.dataset.svg).then((r) => r.text()).catch(() => null);
  if (!svgText) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'mark-3d';
  canvas.setAttribute('aria-hidden', 'true');
  mark.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  // rendu à deux fois la densité de l'écran puis réduit par le navigateur : des bords aussi fins que le SVG plat
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
  camera.position.set(0, 0, 1500); camera.lookAt(0, 0, 0); // loin devant : l'extrusion ne coupe jamais le plan proche
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-250, 350, 500); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(300, -200, 400); scene.add(rim);

  const data = loader.parse(svgText);
  const vb = ((svgText.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100').split(/[\s,]+/).map(parseFloat);
  const [vbX, vbY, vbW, vbH] = vb;
  const cube = mark.classList.contains('mark-linkedin');
  const darkFill = mark.dataset.fillDark;
  const fills = data.paths.map((p) => p.userData.style.fill).filter((f) => f && f !== 'none');
  const baseColor = String(fills[0]).toLowerCase();
  // face avant : la couleur exacte du SVG, sans éclairage → au repos, indiscernable du logo plat ;
  // tranches : éclairées et un peu plus sombres → le volume n'apparaît que quand on l'incline
  const mats = (c) => {
    const cap = new THREE.MeshBasicMaterial({ color: new THREE.Color(c) });
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.72), metalness: 0.1, roughness: 0.6 });
    cap.userData.base = side.userData.base = c;
    return [cap, side];
  };
  const group = new THREE.Group();
  const depth = cube ? vbW : vbH * 0.14;   // un cube a la profondeur de sa largeur ; les autres, une vraie épaisseur d'objet
  const relief = (path, thickness) => {
    const [cap, side] = mats(path.userData.style.fill);
    const g = new THREE.Group();
    for (const shape of SVGLoader.createShapes(path)) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 14 }), [cap, side]);
      m.position.z = depth - thickness * 0.12;   // ancré dans la face avant, jamais en l'air
      g.add(m);
    }
    return g;
  };

  if (cube) {
    const [cap, side] = mats(baseColor);
    // groupes de faces d'une boîte : +x, -x, +y, -y, +z (avant), -z (arrière)
    const box = new THREE.Mesh(new RoundedBoxGeometry(vbW, vbH, depth, 5, Math.min(vbW, vbH) * 0.11), [side, side, side, side, cap, cap]);
    box.position.set(vbX + vbW / 2, vbY + vbH / 2, depth / 2);
    group.add(box);
    const front = new THREE.Group();
    data.paths.forEach((p) => { const f = p.userData.style.fill; if (f && f !== 'none' && f.toLowerCase() !== baseColor) front.add(relief(p, vbH * 0.07)); });
    group.add(front);
    // le « in » du dos : la même face tournée d'un demi-tour autour de l'axe vertical du cube, lisible de derrière
    const back = front.clone();
    back.rotation.y = Math.PI; back.position.set(2 * (vbX + vbW / 2), 0, depth);
    group.add(back);
  } else {
    // la première couleur est la plaque, pleine épaisseur ; une autre couleur = un relief gravé dessus (lettres, glyphe)
    data.paths.forEach((p) => {
      const f = p.userData.style.fill;
      if (!f || f === 'none') return;
      if (f.toLowerCase() === baseColor) {
        const [cap, side] = mats(f);
        for (const shape of SVGLoader.createShapes(p)) group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }), [cap, side]));
      } else group.add(relief(p, depth * 0.55));
    });
  }

  // en mode nuit, les faces sombres prennent la couleur claire indiquée (le blanc reste blanc)
  const recolor = () => group.traverse((m) => {
    if (!m.isMesh) return;
    const ms = [].concat(m.material);
    const cap = ms.find((x) => x.isMeshBasicMaterial), side = ms.find((x) => x.isMeshStandardMaterial);
    if (!cap || !side) return;
    const b = cap.userData.base;
    const c = isDark() && darkFill && b.toLowerCase() !== '#ffffff' ? darkFill : b;
    cap.color.set(c); side.color.set(c).multiplyScalar(0.72);
  });
  recolor();

  // pivot au centre du volume ; le centre du viewBox tombe au centre du canvas, lui-même centré sur la marque
  group.position.set(-(vbX + vbW / 2), -(vbY + vbH / 2), -depth / 2);
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.set(1, -1, 1); // le repère SVG a l'axe y vers le bas
  scene.add(wrap);

  let cw = 0, ch = 0;
  function fit() {
    const r = mark.getBoundingClientRect(), w = r.width, h = r.height;
    if (!w || !h) return false;
    cw = 2 * Math.round(w * F / 2); ch = 2 * Math.round(h * F / 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));
    renderer.setSize(cw, ch, false);
    const u = vbH / h;   // unités SVG par pixel
    camera.left = -cw / 2 * u; camera.right = cw / 2 * u; camera.top = ch / 2 * u; camera.bottom = -ch / 2 * u;
    camera.updateProjectionMatrix();
    snap(r);
    return true;
  }
  // un canvas posé entre deux pixels est rééchantillonné, donc flou : on le cale sur la grille de l'écran
  function snap(r = mark.getBoundingClientRect()) {
    const dpr = window.devicePixelRatio || 1;
    const x = r.left + (r.width - cw) / 2, y = r.top + (r.height - ch) / 2;
    canvas.style.left = (Math.round(x * dpr) / dpr - r.left) + 'px';
    canvas.style.top = (Math.round(y * dpr) / dpr - r.top) + 'px';
  }
  // recalibrer dès que la marque change de taille (image arrivée tard, police chargée, fenêtre redimensionnée)
  const refit = () => { if (fit()) { renderer.render(scene, camera); mark.classList.add('is-3d'); } };
  refit();
  if ('ResizeObserver' in window) new ResizeObserver(refit).observe(mark); else window.addEventListener('resize', refit);
  // la marque peut bouger sans changer de taille : fin de l'animation d'arrivée, polices chargées
  mark.addEventListener('animationend', refit);
  if (document.fonts) document.fonts.ready.then(refit);
  window.addEventListener('resize', refit);
  onDprChange(refit);

  // interaction, sur la marque elle-même (le canvas, plus grand, laisse passer la souris)
  let dragging = false, last = null, t = Math.random() * 6, hover = false, moved = 0;
  const vel = { x: 0, y: 0 }; let releasedAt = -1e9;
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // angle ramené dans [-π, π] : retour par le chemin le plus court
  const LIM_X = cube ? Infinity : 0.9, LIM_Y = cube ? Infinity : 1.15; // ~50° et ~65° pour les logos plats ; le cube tourne librement
  const soft = (a, lim) => (Math.abs(a) <= lim ? a : Math.sign(a) * (lim + (Math.abs(a) - lim) * 0.18));
  const clampRot = () => { wrap.rotation.x = soft(wrap.rotation.x, LIM_X); wrap.rotation.y = soft(wrap.rotation.y, LIM_Y); };
  const gain = cube ? 0.03 : 0.018;
  mark.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !mark.classList.contains('is-3d')) return;
    dragging = true; moved = 0; vel.x = vel.y = 0; last = { x: e.clientX, y: e.clientY };
    mark.setPointerCapture(e.pointerId); mark.classList.add('is-grabbed'); e.preventDefault();
  });
  mark.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    vel.x = dx * gain; vel.y = dy * gain;
    wrap.rotation.y += vel.x; wrap.rotation.x += vel.y; clampRot();
    last = { x: e.clientX, y: e.clientY };
    if (reduced()) renderer.render(scene, camera);
  });
  const release = (e) => { if (!dragging) return; dragging = false; releasedAt = performance.now(); mark.classList.remove('is-grabbed'); try { mark.releasePointerCapture(e.pointerId); } catch (_) {} };
  mark.addEventListener('pointerup', release); mark.addEventListener('pointercancel', release);
  mark.addEventListener('click', (e) => { if (moved > 4) { e.preventDefault(); moved = 0; } }); // un glisser n'est pas un clic
  mark.addEventListener('pointerenter', () => { hover = true; }); mark.addEventListener('pointerleave', () => { hover = false; });

  let visible = true, dirty = true, lastX = NaN, lastY = NaN;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(mark);
  new MutationObserver(() => { recolor(); renderer.render(scene, camera); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduced()) return;
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (!dragging) {
      const spinning = Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002;
      if (spinning || performance.now() - releasedAt < 700) {
        wrap.rotation.y += vel.x; wrap.rotation.x += vel.y; clampRot();   // sur son élan, freiné par la butée
        if (Math.abs(wrap.rotation.y) >= LIM_Y) vel.x *= 0.6;
        if (Math.abs(wrap.rotation.x) >= LIM_X) vel.y *= 0.6;
        vel.x *= cube ? 0.95 : 0.93; vel.y *= cube ? 0.95 : 0.93;
      } else {
        t += 0.016;
        const restY = hover ? 0.22 : 0, restX = hover ? -0.14 : 0;   // au repos : exactement à plat, comme le logo 2D
        const ey = restY - norm(wrap.rotation.y), ex = restX - norm(wrap.rotation.x);
        wrap.rotation.y = Math.abs(ey) < 1e-4 ? restY : norm(wrap.rotation.y) + ey * 0.06;   // se redresse doucement
        wrap.rotation.x = Math.abs(ex) < 1e-4 ? restX : norm(wrap.rotation.x) + ex * 0.06;
      }
    }
    // on ne redessine que ce qui bouge
    if (dirty || wrap.rotation.x !== lastX || wrap.rotation.y !== lastY) {
      renderer.render(scene, camera); lastX = wrap.rotation.x; lastY = wrap.rotation.y; dirty = false;
    }
  })();
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => (('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 500)));
