// The contact screen's finale: the skills fall in as 3D pills and pile up above the contact details. With a mouse you
// can grab one and throw it; on a touch screen a tap makes it jump. Physics: Matter.js; drawing: Three.js. Both load
// when the screen before the footer becomes current, never on arrival. No WebGL: nothing is drawn.
// Under "reduce motion" the pile is already settled when it appears.
import { reduced, webglOk, loadEnv, setPixelRatio, onDprChange, watchContextLoss, shouldRender } from './common.js';
import { MOUSE, DARK, matches } from '../media.js';

const canvas = document.querySelector('.site-footer canvas.footer3d');
const footer = canvas?.closest('.site-footer');
const slides = [...document.querySelectorAll('.slide')];
const STEP = 1000 / 60;

let finale = null, loading = false;
const isActive = () => footer.classList.contains('is-active');
function check() {
  const watched = [slides[slides.indexOf(footer) - 1], footer].filter(Boolean);
  if (!loading && watched.some((s) => s.classList.contains('is-active'))) { loading = true; load(); }
  finale?.setActive(isActive());
}

async function load() {
  const [THREE, M] = await Promise.all([import('./three-lite.js'), import('matter-js')]);
  await document.fonts?.load('600 18px "Bricolage Grotesque"').catch(() => {});
  finale = createFinale(THREE, M.default ?? M);
  check();
}

function createFinale(THREE, Matter) {
  const { Engine, Bodies, Body, Composite, Constraint, Query, Sleeping } = Matter;
  const labels = JSON.parse(canvas.dataset.skills || '[]');
  const mouse = matches(MOUSE);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  setPixelRatio(renderer, 1.5, 3);
  watchContextLoss(canvas, () => canvas.classList.remove('is-ready'));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-300, 500, 700); scene.add(key);
  const env = loadEnv(THREE);

  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.1;
  const pills = [];
  let W = 0, H = 0, walls = [], pillH = 44;

  const measure = document.createElement('canvas').getContext('2d');
  const font = () => `600 ${Math.round(pillH * 0.4)}px "Bricolage Grotesque", system-ui, sans-serif`;

  function labelTexture(text, w, h, color) {
    const dpr = Math.min(window.devicePixelRatio * 2, 4);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.font = font(); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // a stadium extruded with a bevel: a flat face for the label, rounded edges that catch the light
  function pillGeometry(w, h) {
    const bevel = h * 0.1, r = h / 2 - bevel, x = w / 2 - bevel - r;
    const s = new THREE.Shape();
    s.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.absarc(-x, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h * 0.35, bevelEnabled: true, bevelThickness: h * 0.12, bevelSize: bevel, bevelSegments: 5, curveSegments: 20 });
    geo.center();
    return geo;
  }

  const colors = () => ({ accent: css('--accent') || '#ffb627', plain: css('--paper') || '#f6f7f9', ink: css('--ink') || '#161b22' });

  function paint(p) {
    const c = colors();
    const face = p.accent ? c.accent : c.plain, text = p.accent ? '#161b22' : c.ink;
    p.body3d.material.color.set(face);
    p.label.material.map?.dispose();
    p.label.material.map = labelTexture(p.text, p.w, p.h, text);
    p.label.material.needsUpdate = true;
  }

  function addPill(text, i, x, y) {
    measure.font = font();
    const h = pillH, w = Math.ceil(measure.measureText(text).width + h * 1.1);
    const accent = i % 3 === 0;
    const body3d = new THREE.Mesh(pillGeometry(w, h), new THREE.MeshStandardMaterial({
      metalness: accent ? 0.35 : 0.1, roughness: accent ? 0.3 : 0.45, envMap: env, envMapIntensity: accent ? 1 : 0.6,
    }));
    const label = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true }));
    label.position.z = h * 0.3;
    const mesh = new THREE.Group(); mesh.add(body3d, label); scene.add(mesh);
    const body = Bodies.rectangle(x, y, w, h, {
      chamfer: { radius: h / 2 - 1 }, restitution: 0.3, friction: 0.4, frictionStatic: 0.7, frictionAir: 0.012, density: 0.0015,
      angle: (Math.random() - 0.5) * 1.2,
    });
    Composite.add(engine.world, body);
    const p = { text, w, h, accent, body, mesh, body3d, label, tx: (Math.random() - 0.5) * 0.5, ty: (Math.random() - 0.5) * 0.5 };
    paint(p);
    pills.push(p);
    return p;
  }

  // the floor is just above the contact details, so the pile never covers them
  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
    pillH = W < 640 ? 36 : 44;
    const grid = footer.querySelector('.footer-grid');
    const floor = Math.min(H, (grid ? grid.offsetTop : H) - 10);
    Composite.remove(engine.world, walls);
    const T = 400;
    walls = [
      Bodies.rectangle(W / 2, floor + T / 2, W * 3, T, { isStatic: true }),
      Bodies.rectangle(-T / 2, floor - 2000, T, 4000 + T, { isStatic: true }),
      Bodies.rectangle(W + T / 2, floor - 2000, T, 4000 + T, { isStatic: true }),
    ];
    Composite.add(engine.world, walls);
    for (const p of pills) {
      Sleeping.set(p.body, false);
      if (p.body.position.x > W - p.w / 2 || p.body.position.y > floor) Body.setPosition(p.body, { x: Math.min(p.body.position.x, W - p.w / 2 - 4), y: Math.min(p.body.position.y, floor - p.h) });
    }
    wake();
  }

  let dropped = false;
  function drop() {
    dropped = true;
    const spawn = (text, i) => addPill(text, i, W * 0.1 + Math.random() * W * 0.8, -pillH * (1.5 + Math.random() * 3));
    if (reduced()) {
      labels.forEach((t, i) => { const p = spawn(t, i); Body.setPosition(p.body, { x: p.body.position.x, y: -i * pillH * 1.2 }); });
      for (let i = 0; i < 900; i++) Engine.update(engine, STEP);
      canvas.classList.add('is-ready'); sync(); draw(); return;
    }
    canvas.classList.add('is-ready');
    labels.forEach((t, i) => setTimeout(() => { spawn(t, i); wake(); }, i * 110));
  }

  function sync() {
    for (const p of pills) {
      const { x, y } = p.body.position, v = p.body.velocity;
      const damp = (a, b) => a + (b - a) * 0.15;
      p.tx = damp(p.tx, Math.max(-0.5, Math.min(0.5, v.y * 0.03)) + 0.18);
      p.ty = damp(p.ty, Math.max(-0.5, Math.min(0.5, v.x * 0.03)));
      p.mesh.position.set(x, -y, 0);
      p.mesh.rotation.set(p.tx, p.ty, -p.body.angle);
    }
  }
  const draw = () => renderer.render(scene, camera);

  let active = false, raf = 0, last = 0, acc = 0, lastDraw = 0, drag = null;
  const awake = () => drag || pills.some((p) => !p.body.isSleeping) || pills.length < labels.length;
  function frame(now) {
    raf = 0;
    acc += Math.min(now - last, 50); last = now;
    for (let n = 0; acc >= STEP && n < 3; n++, acc -= STEP) Engine.update(engine, STEP);
    acc = Math.min(acc, STEP);
    sync();
    if (shouldRender(now, lastDraw, !!drag)) { draw(); lastDraw = now; }
    if (active && awake()) raf = requestAnimationFrame(frame);
    else draw();
  }
  function wake() { if (active && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // grab and throw (mouse); a tap makes a pill jump (touch)
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (pt) => Query.point(pills.map((p) => p.body), pt)[0];
  let swallowClick = false;
  footer.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !pills.length) return;
    const pt = local(e), b = hit(pt);
    if (!b) return;
    swallowClick = true;
    Sleeping.set(b, false);
    if (!mouse || e.pointerType !== 'mouse') {
      Body.setVelocity(b, { x: (Math.random() - 0.5) * 8, y: -16 });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.4);
      wake(); return;
    }
    e.preventDefault();
    footer.setPointerCapture(e.pointerId);
    drag = Constraint.create({ pointA: pt, bodyB: b, pointB: { x: pt.x - b.position.x, y: pt.y - b.position.y }, stiffness: 0.2, damping: 0.1, length: 0 });
    Composite.add(engine.world, drag);
    footer.classList.add('is-grabbing');
    wake();
  });
  footer.addEventListener('pointermove', (e) => {
    if (drag) { drag.pointA = local(e); return; }
    if (mouse && pills.length) footer.classList.toggle('is-over-pill', !!hit(local(e)));
  });
  const release = (e) => {
    if (!drag) return;
    Composite.remove(engine.world, drag); drag = null;
    footer.classList.remove('is-grabbing');
    try { footer.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  footer.addEventListener('pointerup', release);
  footer.addEventListener('pointercancel', release);
  footer.addEventListener('pointerleave', () => footer.classList.remove('is-over-pill'));
  // playing with a pill is not a click on the sentence or the contact details behind it
  footer.addEventListener('click', (e) => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);

  // theme switch: the pills take the new colours
  const repaint = () => { pills.forEach(paint); draw(); };
  new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia(DARK).addEventListener('change', repaint);
  new ResizeObserver(layout).observe(canvas);
  onDprChange(() => { setPixelRatio(renderer, 1.5, 3); draw(); });
  layout();

  return {
    setActive(on) {
      active = on;
      if (on && !dropped) drop();
      if (on) wake();
    },
  };
}

if (canvas && footer && webglOk()) {
  const watched = [slides[slides.indexOf(footer) - 1], footer].filter(Boolean);
  const mo = new MutationObserver(check);
  watched.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
  check();
}
