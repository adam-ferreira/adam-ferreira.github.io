// Lab: the boulder generator. A 25° overhang laid out from a seed (boulder-problem.js): the mango holds are the problem,
// the grey ones the other circuits. One instanced mesh per hold shape (5 draw calls for up to 320 holds), and a soft decal
// under each hold for its contact shadow: no shadow map, the wall is still and a phone would pay for one every frame.
import { reduced, setPixelRatio, onDprChange, watchVisible, watchContextLoss, shouldRender, makeGrabbable } from '../3d/common.js';
import { DARK } from '../media.js';
import { WALL, SHAPES, generate, rng } from './boulder-problem.js';

const MAX = 64;                                    // holds of one shape, at most (generate() lays out 44 to 64 in all)
const POP = 0.5;                                   // s: a hold's pop-in
const REST = { yaw: -0.5, pitch: -0.12 };          // the camera at rest: off to the left and a little below, so the overhang shows
const BIG = 1.2;                                   // holds drawn a fifth larger than life: they still read on a phone
const easeOutBack = (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Mounts the generator on `canvas`, showing problem `seed` (popping in if `pop`, else at once). `freeze`: a still image
 *  with no motion (posters, tests). `onProblem(problem)` runs each time a problem is shown. Returns { show(seed), dispose() }. */
export async function mount(canvas, { seed, pop = false, freeze = false, onProblem } = {}) {
  const THREE = await import('../3d/three-lite.js');
  const { MathUtils } = THREE;
  const still = freeze || reduced();   // no pop-in, no sway: the problem simply appears

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-3, 7, 6);   // top left, in front: the decals below and to the right of each hold agree with it
  scene.add(key);

  // the wall leans towards the visitor; what is bolted on it lives in its frame (x across, y up the panel, z out of it)
  const tilt = MathUtils.degToRad(WALL.angle);
  const wall = new THREE.Group();
  wall.rotation.x = tilt;
  scene.add(wall);
  const panelMat = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  const panelGeo = new THREE.BoxGeometry(WALL.w, WALL.h, 0.06);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, WALL.h / 2, -0.03);
  wall.add(panel);
  const padMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const padGeo = new THREE.BoxGeometry(WALL.w + 0.4, 0.3, WALL.h * Math.sin(tilt));
  const pad = new THREE.Mesh(padGeo, padMat);   // the crash pad, under the overhang
  pad.position.set(0, 0.15, (WALL.h * Math.sin(tilt)) / 2 + 0.05);
  scene.add(pad);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

  // the T-nuts: a dot every 20 cm, one draw call
  const nutsX = Math.round(WALL.w / WALL.grid) - 1, nutsY = Math.round(WALL.h / WALL.grid) - 1;
  const nutGeo = new THREE.CircleGeometry(0.009, 10), nutMat = new THREE.MeshBasicMaterial();
  const nuts = new THREE.InstancedMesh(nutGeo, nutMat, nutsX * nutsY);
  for (let i = 0, k = 0; i < nutsX; i++) for (let j = 0; j < nutsY; j++) {
    nuts.setMatrixAt(k++, m.makeTranslation((i + 1) * WALL.grid - WALL.w / 2, (j + 1) * WALL.grid, 0.001));
  }
  wall.add(nuts);

  // one blob per hold shape: an icosphere, its surface bumped by a fixed noise, its back flattened against the wall
  function blob(shape, n) {
    let g = new THREE.IcosahedronGeometry(1, 4);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = THREE.mergeVertices(g);   // shared vertices: smooth normals, not facets
    const pos = g.attributes.position, v = new THREE.Vector3(), r = rng(n), k = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.multiplyScalar(1 + 0.14 * Math.sin(v.x * 3.1 + k[0]) * Math.sin(v.y * 2.7 + k[1]) * Math.sin(v.z * 3.3 + k[2]));
      if (shape === 'jug' && v.y > 0.1 && v.z > 0) v.z += 0.5 * (v.y - 0.1);   // a lip curling out: something to pull on
      if (v.z < 0) v.z *= 0.1;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  const holdMat = new THREE.MeshStandardMaterial({ roughness: 0.72 });
  const meshes = {};
  Object.keys(SHAPES).forEach((shape, i) => {
    const mesh = new THREE.InstancedMesh(blob(shape, 7 + i), holdMat, MAX);
    mesh.frustumCulled = false;   // the holds pop in: their bounding sphere would be stale
    meshes[shape] = mesh;
    wall.add(mesh);
  });

  // contact shadows: a soft dark disc under each hold, drawn before the holds so they sit on top of it
  const sc = document.createElement('canvas');
  sc.width = sc.height = 64;
  const sg = sc.getContext('2d'), grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.5, 'rgba(0,0,0,.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(sc);
  const quad = new THREE.PlaneGeometry(1, 1);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTex, transparent: true, depthWrite: false });
  const shadows = new THREE.InstancedMesh(quad, shadowMat, MAX * 2);
  shadows.frustumCulled = false;
  wall.add(shadows);
  // tape: a strip under each start hold, two under the top
  const tapeMat = new THREE.MeshBasicMaterial();
  const tapes = new THREE.InstancedMesh(quad, tapeMat, 6);
  tapes.frustumCulled = false;
  wall.add(tapes);

  let problem = null, born = 0;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /** The site's colours (light or dark theme) on the wall, its pad, its T-nuts and every hold. */
  function paint() {
    const chip = new THREE.Color(css('--chip')), ink = new THREE.Color(css('--ink')), paper = new THREE.Color(css('--paper'));
    const accent = new THREE.Color(css('--accent'));
    const dark = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.3;
    panelMat.color.copy(chip);
    padMat.color.copy(paper).lerp(ink, dark ? 0.05 : 0.2);
    nutMat.color.copy(chip).lerp(ink, 0.2);
    tapeMat.color.copy(accent);
    shadowMat.opacity = dark ? 0.6 : 0.3;
    const greys = (dark ? [0.07, 0.13, 0.19] : [0.28, 0.4, 0.52]).map((f) => chip.clone().lerp(ink, f));   // quieter than the mango line
    const n = {};
    for (const shape in meshes) n[shape] = 0;
    for (const h of problem.holds) meshes[h.shape].setColorAt(n[h.shape]++, h.role === 'other' ? greys[h.shade] : accent);
    for (const shape in meshes) if (meshes[shape].instanceColor) meshes[shape].instanceColor.needsUpdate = true;
  }

  /** Every hold, its decal and its tape at instant `t` (s since the problem appeared). True while one is still popping in. */
  function layout(t) {
    const n = {};
    for (const shape in meshes) n[shape] = 0;
    let popping = false, d = 0, k = 0;
    for (const h of problem.holds) {
      const u = clamp((t - h.delay) / POP, 0, 1);
      if (u < 1) popping = true;
      const g = u === 0 ? 1e-4 : easeOutBack(u);
      const x = h.x - WALL.w / 2;
      meshes[h.shape].setMatrixAt(n[h.shape]++, m.compose(p.set(x, h.y, 0), q.setFromEuler(e.set(0, 0, h.rot)), s.set((h.w / 2) * g * BIG, (h.h / 2) * g * BIG, h.d * g * BIG)));
      shadows.setMatrixAt(d++, m.compose(p.set(x + 0.02, h.y - 0.03, 0.002), q.identity(), s.set(h.w * 1.35 * g * BIG, h.h * 1.6 * g * BIG, 1)));
      if (h.role === 'start' || h.role === 'top') {
        for (let j = 0; j < (h.role === 'top' ? 2 : 1) && k < 6; j++) {
          tapes.setMatrixAt(k++, m.compose(p.set(x, h.y - (h.h / 2) * BIG - 0.05 - j * 0.045, 0.003), q.identity(), s.set(0.13 * g, 0.026 * g, 1)));
        }
      }
    }
    for (const shape in meshes) { meshes[shape].count = n[shape]; meshes[shape].instanceMatrix.needsUpdate = true; }
    shadows.count = d; shadows.instanceMatrix.needsUpdate = true;
    tapes.count = k; tapes.instanceMatrix.needsUpdate = true;
    return popping;
  }

  // the camera orbits the wall's middle; a drag turns it, and it drifts back to rest a moment after
  const target = new THREE.Vector3(0, (WALL.h / 2) * Math.cos(tilt), (WALL.h / 2) * Math.sin(tilt));
  let yaw = REST.yaw, pitch = REST.pitch, yawTo = yaw, pitchTo = pitch, dist = 12;
  function aim() {
    camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(target);
    camera.lookAt(target);
  }
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setPixelRatio(renderer, 1, 2);   // a large canvas: no supersampling
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    const radius = 0.5 * Math.hypot(WALL.w + 0.4, WALL.h);   // the wall and its pad, as a sphere
    const half = MathUtils.degToRad(camera.fov) / 2, halfW = Math.atan(Math.tan(half) * camera.aspect);
    dist = (radius / Math.sin(Math.min(half, halfW))) * 0.86;   // snug: the wall fills the frame, its top corner and the top hold still in
  }

  const lost = watchContextLoss(canvas, () => canvas.closest('.lab-stage')?.classList.remove('is-ready'));
  const visible = watchVisible(canvas);
  const grab = makeGrabbable(canvas, {
    cls: 'is-dragging',
    onDrag: (dx, dy) => { yawTo = clamp(yawTo - dx * 0.006, -0.95, 0.95); pitchTo = clamp(pitchTo + dy * 0.004, -0.3, 0.35); wake(); },
  });

  let raf = 0, lastDraw = -1e9, last = 0, popping = false;
  function frame(now) {
    raf = 0;
    if (lost()) return;
    const dt = Math.min(0.05, (now - last) / 1000), t = (now - born) / 1000;
    last = now;
    if (!grab.dragging && now - grab.releasedAt > 1200) {   // back to rest, swaying a little while nobody holds it
      yawTo = REST.yaw + (still ? 0 : 0.07 * Math.sin(t * 0.35));
      pitchTo = REST.pitch;
    }
    yaw = MathUtils.damp(yaw, yawTo, grab.dragging ? 14 : 2.5, dt);
    pitch = MathUtils.damp(pitch, pitchTo, grab.dragging ? 14 : 2.5, dt);
    if (popping) popping = layout(t);
    if (visible() && shouldRender(now, lastDraw, grab.dragging)) { aim(); renderer.render(scene, camera); lastDraw = now; }
    const settled = Math.abs(yaw - yawTo) < 1e-4 && Math.abs(pitch - pitchTo) < 1e-4;
    if (!still || popping || grab.dragging || !settled) raf = requestAnimationFrame(frame);
    else { aim(); renderer.render(scene, camera); }   // the last pose, exactly
  }
  function wake() { if (!raf && !lost()) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  /** Shows problem `n`: its holds pop in from the start to the top, or are simply there when the motion is reduced or
   *  `instant` (the first problem, already drawn on the poster the canvas replaces). */
  function show(n, instant = false) {
    problem = generate(n);
    paint();
    born = performance.now();
    popping = !still && !instant;
    layout(popping ? 0 : 1e9);
    onProblem?.(problem);
    wake();
  }

  const redraw = () => { paint(); wake(); };
  const theme = new MutationObserver(redraw);   // light / dark switch
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const system = window.matchMedia(DARK);
  system.addEventListener('change', redraw);
  const ro = new ResizeObserver(() => { fit(); aim(); renderer.render(scene, camera); });
  ro.observe(canvas);
  onDprChange(() => { fit(); wake(); });

  fit();
  show(seed, !pop);
  aim();
  await renderer.compileAsync(scene, camera);   // shaders compiled before the first visible frame: no stutter on arrival
  renderer.render(scene, camera);
  canvas.closest('.lab-stage')?.classList.add('is-ready');

  return {
    show,
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); theme.disconnect(); system.removeEventListener('change', redraw);
      for (const g of [panelGeo, padGeo, nutGeo, quad, ...Object.values(meshes).map((x) => x.geometry)]) g.dispose();
      for (const mat of [panelMat, padMat, nutMat, holdMat, shadowMat, tapeMat]) mat.dispose();
      shadowTex.dispose();
      renderer.dispose(); renderer.forceContextLoss();   // dispose() alone keeps the context alive
    },
  };
}
