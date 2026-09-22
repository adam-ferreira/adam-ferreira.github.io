// The marks in 3D: Betclic and Accor in the hero sentence, LinkedIn in the top bar. Three.js extrudes each SVG.
// On a computer, after load; on a phone, on the first gesture (touch, scroll) or 5 s after the page, so it costs
// nothing on arrival. At rest the 3D version is identical to the flat SVG: the switch from one to the other is invisible.
// · At rest, the 3D version overlays the flat SVG to the pixel: one SVG unit = mark height / viewBox height.
// · The canvas extends well beyond the mark (F times its size) and sits above the text: while rotating, the mark is
//   never clipped by the edges of a box.
// · You grab it on the mark itself, throw it, it spins on its momentum, then straightens up on its own.
// · LinkedIn is a cube: the square becomes a real volume, with the "in" embossed on the front and the back,
//   and it can be spun in every direction.
import { reduced, webglOk, onDprChange, bootLazily, whenLoaded, withShine, watchContextLoss, setPixelRatio, norm, watchVisible, shouldRender, makeGrabbable, Hint } from './common.js';
const F = 2.6;
const marks = [...document.querySelectorAll('.mark[data-svg]')];
const isDark = () => document.documentElement.dataset.theme === 'dark';

async function start() {
  if (!marks.length || !webglOk()) return;
  const THREE = await import('./three-lite.js');   // trimmed Three.js, loaders included
  const loader = new THREE.SVGLoader();
  marks.forEach((mark, i) => setup(mark, i, THREE, loader));
}

async function setup(mark, order, THREE, loader) {
  const svgText = await fetch(mark.dataset.svg).then((r) => r.text()).catch(() => null);
  if (!svgText) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'mark-3d';
  canvas.setAttribute('aria-hidden', 'true');
  mark.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const lost = watchContextLoss(canvas, () => mark.classList.remove('is-3d'));   // GPU lost: the mark's image comes back
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
  camera.position.set(0, 0, 1500); camera.lookAt(0, 0, 0); // far in front: the extrusion never crosses the near plane
  scene.add(new THREE.AmbientLight(0xffffff, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-250, 350, 500); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(300, -200, 400); scene.add(rim);

  const data = loader.parse(svgText);
  const vb = ((svgText.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100').split(/[\s,]+/).map(parseFloat);
  const [vbX, vbY, vbW, vbH] = vb;
  const cube = mark.classList.contains('mark-linkedin');
  const darkMap = mark.dataset.darkMap ? JSON.parse(mark.dataset.darkMap) : {};
  const fills = data.paths.map((p) => p.userData.style.fill).filter((f) => f && f !== 'none');
  const baseColor = String(fills[0]).toLowerCase();
  // front face: the exact SVG color, unlit → at rest, indistinguishable from the flat logo;
  // sides: lit and slightly darker → the volume only shows when the mark is tilted
  // shine: a band of light sweeping diagonally across the mark (position and intensity shared by the whole mark)
  const shine = { t: { value: -1e5 }, w: { value: 1 }, a: { value: 0 } };
    const addShine = (m) => withShine(m, shine);
  const mats = (c) => {
    const cap = addShine(new THREE.MeshBasicMaterial({ color: new THREE.Color(c) }));
    const side = addShine(new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.72), metalness: 0.1, roughness: 0.6 }));
    cap.userData.base = side.userData.base = c;
    return [cap, side];
  };
  const group = new THREE.Group();
  const depth = cube ? vbW : vbH * 0.14;   // a cube is as deep as it is wide; the others get a real object thickness
  shine.w.value = vbW * 0.1 + vbH * 0.12;
  const sweep = vbW / 2 + 0.6 * vbH / 2 + shine.w.value * 1.6;   // from off-screen left to off-screen right
  const relief = (path, thickness) => {
    const [cap, side] = mats(path.userData.style.fill);
    const g = new THREE.Group();
    for (const shape of THREE.SVGLoader.createShapes(path)) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 14 }), [cap, side]);
      m.position.z = depth - thickness * 0.12;   // anchored in the front face, never floating
      g.add(m);
    }
    return g;
  };

  if (cube) {
    const [cap, side] = mats(baseColor);
    // face groups of a box: +x, -x, +y, -y, +z (front), -z (back)
    const box = new THREE.Mesh(new THREE.RoundedBoxGeometry(vbW, vbH, depth, 5, Math.min(vbW, vbH) * 0.11), [side, side, side, side, cap, cap]);
    box.position.set(vbX + vbW / 2, vbY + vbH / 2, depth / 2);
    group.add(box);
    const front = new THREE.Group();
    data.paths.forEach((p) => { const f = p.userData.style.fill; if (f && f !== 'none' && f.toLowerCase() !== baseColor) front.add(relief(p, vbH * 0.07)); });
    group.add(front);
    // the "in" on the back: the same face turned half a turn around the cube's vertical axis, readable from behind
    const back = front.clone();
    back.rotation.y = Math.PI; back.position.set(2 * (vbX + vbW / 2), 0, depth);
    group.add(back);
  } else {
    // the first color is the plate, full thickness; any other color = a relief engraved on it (letters, glyph)
    data.paths.forEach((p) => {
      const f = p.userData.style.fill;
      if (!f || f === 'none') return;
      if (f.toLowerCase() === baseColor) {
        const [cap, side] = mats(f);
        for (const shape of THREE.SVGLoader.createShapes(p)) group.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }), [cap, side]));
      } else group.add(relief(p, depth * 0.55));
    });
  }

  // in dark mode, the colors named by the mark's dark_map are replaced; the others keep theirs
  const recolor = () => group.traverse((m) => {
    if (!m.isMesh) return;
    const ms = [].concat(m.material);
    const cap = ms.find((x) => x.isMeshBasicMaterial), side = ms.find((x) => x.isMeshStandardMaterial);
    if (!cap || !side) return;
    const b = cap.userData.base;
    const c = (isDark() && darkMap[b.toLowerCase()]) || b;
    cap.color.set(c); side.color.set(c).multiplyScalar(0.72);
  });
  recolor();

  // pivot at the center of the volume; the viewBox center falls at the center of the canvas, itself centered on the mark
  group.position.set(-(vbX + vbW / 2), -(vbY + vbH / 2), -depth / 2);
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.set(1, -1, 1); // the SVG coordinate system has its y axis pointing down
  scene.add(wrap);

  let cw = 0, ch = 0;
  function fit() {
    const r = mark.getBoundingClientRect(), w = r.width, h = r.height;
    if (!w || !h) return false;
    cw = 2 * Math.round(w * F / 2); ch = 2 * Math.round(h * F / 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    setPixelRatio(renderer);   // rendered above the screen density then scaled down: edges as fine as the flat SVG
    renderer.setSize(cw, ch, false);
    const u = vbH / h;   // SVG units per pixel
    camera.left = -cw / 2 * u; camera.right = cw / 2 * u; camera.top = ch / 2 * u; camera.bottom = -ch / 2 * u;
    camera.updateProjectionMatrix();
    snap(r);
    return true;
  }
  // a canvas placed between two pixels is resampled, hence blurry: snap it to the screen's pixel grid
  function snap(r = mark.getBoundingClientRect()) {
    const dpr = window.devicePixelRatio || 1;
    const x = r.left + (r.width - cw) / 2, y = r.top + (r.height - ch) / 2;
    canvas.style.left = (Math.round(x * dpr) / dpr - r.left) + 'px';
    canvas.style.top = (Math.round(y * dpr) / dpr - r.top) + 'px';
  }
  // recalibrate whenever the mark changes size (late image, font loaded, window resized)
  const refit = () => { if (fit()) { renderer.render(scene, camera); mark.classList.add('is-3d'); } };
  refit();
  if ('ResizeObserver' in window) new ResizeObserver(refit).observe(mark); else window.addEventListener('resize', refit);
  // the mark can move without changing size: end of the entrance animation, fonts loaded
  mark.addEventListener('animationend', refit);
  if (document.fonts) document.fonts.ready.then(refit);
  window.addEventListener('resize', refit);
  onDprChange(refit);

  // interaction, on the mark itself (the larger canvas lets the pointer through)
  let t = Math.random() * 6, hover = false;
  const vel = { x: 0, y: 0 };
  const LIM_X = cube ? Infinity : 0.9, LIM_Y = cube ? Infinity : 1.15; // ~50° and ~65° for the flat logos; the cube spins freely
  const soft = (a, lim) => (Math.abs(a) <= lim ? a : Math.sign(a) * (lim + (Math.abs(a) - lim) * 0.18));
  const clampRot = () => { wrap.rotation.x = soft(wrap.rotation.x, LIM_X); wrap.rotation.y = soft(wrap.rotation.y, LIM_Y); };
  const gain = cube ? 0.03 : 0.018;
  // hint gesture: now and then the mark tilts a little and a shine sweeps across it, to show that it is 3D.
  // Staggered from one mark to the next, never during an interaction.
  const hint = new Hint(mark, shine, order, sweep, cube ? 0.7 : 0.42);
  const grab = makeGrabbable(mark, {   // a drag is not a click
    cls: 'is-grabbed',
    accept: (e) => e.button === 0 && mark.classList.contains('is-3d'),
    onGrab: () => { vel.x = vel.y = 0; hint.stop(8000); },
    onDrag: (dx, dy) => {
      vel.x = dx * gain; vel.y = dy * gain;
      wrap.rotation.y += vel.x; wrap.rotation.x += vel.y; clampRot();
      if (reduced()) renderer.render(scene, camera);
    },
    clickSlop: 4,
  });
  mark.addEventListener('pointerenter', () => { hover = true; }); mark.addEventListener('pointerleave', () => { hover = false; });

  let dirty = true, lastX = NaN, lastY = NaN, paused = false, lastDraw = 0;
  const visible = watchVisible(mark);
  new MutationObserver(() => { recolor(); renderer.render(scene, camera); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduced()) return;
  (function loop(now) {
    if (lost()) return;
    requestAnimationFrame(loop);
    if (!visible() || document.hidden) { paused = true; return; }
    if (!shouldRender(now, lastDraw, grab.dragging)) return;   // frozen while the page moves, 60 fps at most
    const inSlide = mark.closest('.slide');
    if (inSlide && document.documentElement.classList.contains('stage') && !inSlide.classList.contains('is-current')) { paused = true; return; }   // stage mode: screen not shown
    lastDraw = now;
    if (paused) {   // back on the tab or on the mark: re-stagger the gestures, otherwise all three would start together
      paused = false; hint.stop(1000 + order * 1500); dirty = true;
    }
    if (!grab.dragging) {
      const spinning = Math.abs(vel.x) > 0.002 || Math.abs(vel.y) > 0.002;
      if (spinning || performance.now() - grab.releasedAt < 700) {
        wrap.rotation.y += vel.x; wrap.rotation.x += vel.y; clampRot();   // on its momentum, slowed by the stop
        if (Math.abs(wrap.rotation.y) >= LIM_Y) vel.x *= 0.6;
        if (Math.abs(wrap.rotation.x) >= LIM_X) vel.y *= 0.6;
        vel.x *= cube ? 0.95 : 0.93; vel.y *= cube ? 0.95 : 0.93;
      } else if (!hover && (hint.running || (hint.due(performance.now()) && Math.abs(norm(wrap.rotation.y)) < 0.01 && Math.abs(norm(wrap.rotation.x)) < 0.01))) {
        const now = performance.now();
        if (!hint.running) hint.begin(now);
        const h = hint.step(now);
        wrap.rotation.y = h.y; wrap.rotation.x = h.x; dirty = true;
        if (h.done) wrap.rotation.set(0, 0, 0);
      } else {
        if (hint.running) { hint.stop(3000); dirty = true; }   // hovered during the gesture: stop it
        t += 0.016;
        const restY = hover ? 0.22 : 0, restX = hover ? -0.14 : 0;   // at rest: exactly flat, like the 2D logo
        const ey = restY - norm(wrap.rotation.y), ex = restX - norm(wrap.rotation.x);
        wrap.rotation.y = Math.abs(ey) < 1e-4 ? restY : norm(wrap.rotation.y) + ey * 0.06;   // straightens up gently
        wrap.rotation.x = Math.abs(ex) < 1e-4 ? restX : norm(wrap.rotation.x) + ex * 0.06;
      }
    }
    // only redraw what moves
    if (dirty || wrap.rotation.x !== lastX || wrap.rotation.y !== lastY) {
      renderer.render(scene, camera); lastX = wrap.rotation.x; lastY = wrap.rotation.y; dirty = false;
    }
  })(performance.now());
}

whenLoaded(() => { if (marks.length && webglOk()) bootLazily(start, 2000, 500); });
