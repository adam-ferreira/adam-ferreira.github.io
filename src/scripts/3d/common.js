// Helpers shared by the three 3D scenes: the phones (hero.js), the AF logo (logo.js) and the marks (marks.js).
import { DESKTOP, REDUCED_MOTION, matches } from '../media.js';
import { CUBEMAP } from './env.js';

/** A computer with a mouse and a wide enough window: where the 3D starts without waiting for a gesture. */
export const desktop = () => matches(DESKTOP);
export const reduced = () => matches(REDUCED_MOTION);

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/** The site's accent colour (--accent in the stylesheet): the page, the phones, the AF logo and the cursor share it. */
export const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb627';

/** The environment reflected by the phones and by the AF logo. */
export function loadEnv(THREE) {
  const env = new THREE.CubeTextureLoader().load(CUBEMAP);
  env.colorSpace = THREE.SRGBColorSpace;
  return env;
}

/** The accent material: the body of the Android phone, the AF logo. */
export const accentMaterial = (THREE, env) =>
  new THREE.MeshStandardMaterial({ color: new THREE.Color(accent()), metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });

/** Drawn above the screen density then scaled down by the browser: edges as fine as a flat image. */
export const setPixelRatio = (renderer, factor = 2, max = 4) => renderer.setPixelRatio(Math.min(window.devicePixelRatio * factor, max));

/** Follows pixel density changes (window dragged from a Retina screen to a standard one, browser zoom). */
export const onDprChange = (cb) => {
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  q.addEventListener('change', () => { cb(); onDprChange(cb); }, { once: true });
};

export const whenLoaded = (fn) => { if (document.readyState === 'complete') fn(); else window.addEventListener('load', fn); };

/** Deferred start, so the 3D costs nothing on arrival: on a computer, once the browser is idle after load; on a
 *  phone, on the first gesture (touch, scroll) or 5 s after the page. */
export function bootLazily(start, idleTimeout, fallbackDelay) {
  whenLoaded(() => {
    if (desktop()) return ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: idleTimeout }) : setTimeout(start, fallbackDelay);
    let done = false;
    const EVENTS = ['touchstart', 'pointerdown', 'scroll'];
    const go = () => { if (done) return; done = true; EVENTS.forEach((e) => window.removeEventListener(e, go)); start(); };
    EVENTS.forEach((e) => window.addEventListener(e, go, { passive: true }));
    setTimeout(go, 5000);
  });
}

/** An angle brought back into [-π, π]: an object returns to its rest pose by the shortest path. */
export const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Is the object on screen? Off screen, its scene stops drawing. */
export function watchVisible(el) {
  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(el);
  return () => visible;
}

/** A frame is worth drawing: the page is not moving (a move gets every frame it can), and 60 per second is enough, even
 *  on a 120 Hz screen. An object being dragged keeps drawing: it follows the hand. */
export const FRAME_MS = 15;
export const shouldRender = (now, lastDraw, grabbed = false) =>
  (grabbed || !document.documentElement.classList.contains('is-moving')) && now - lastDraw >= FRAME_MS;

/** Grab an object, drag it, throw it. `accept` filters the pointer (button, state), `onGrab` and `onDrag` do the work,
 *  `cls` marks the element while it is held, and past `clickSlop` pixels the gesture is a throw, not a click.
 *  Returns the state the animation loop reads: is it held, how far it moved, when it was released. */
export function makeGrabbable(el, { cls, accept, onGrab, onDrag, clickSlop }) {
  const state = { dragging: false, moved: 0, releasedAt: -1e9 };
  let last = null;
  el.addEventListener('pointerdown', (e) => {
    if (accept && !accept(e)) return;
    state.dragging = true; state.moved = 0;
    last = { x: e.clientX, y: e.clientY };
    onGrab?.();
    el.setPointerCapture(e.pointerId); el.classList.add(cls); e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    state.moved += Math.abs(dx) + Math.abs(dy);
    onDrag(dx, dy);
  });
  const release = (e) => {
    if (!state.dragging) return;
    state.dragging = false; state.releasedAt = performance.now();
    el.classList.remove(cls);
    try { el.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  // a throw is not a click: the link is not followed, the page is not reloaded
  if (clickSlop !== undefined) el.addEventListener('click', (e) => {
    if (state.moved > clickSlop) { e.preventDefault(); e.stopPropagation(); state.moved = 0; }
  });
  return state;
}

// ---------- hint gesture: now and then the object tilts and a shine sweeps across it, to show that it is 3D ----------
const HINT_MS = 1500;
/** First gesture: staggered from one object to the next (order = 0 LinkedIn, 1 Betclic, 2 Accor, 3 AF logo). */
const firstHint = (order) => performance.now() + 1500 + order * 1500;
/** Next gesture: every 4.5 to 6 s. */
const nextHintAt = (now) => now + 4500 + Math.random() * 1500;
const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/** The gesture of one object: when the next one is due, the tilt to apply while it plays, and the shine that sweeps
 *  across it. While it plays, the element carries data-hint (the tests read it). */
export class Hint {
  /** sweep: how far the band of light travels; amp: how far the object tilts. */
  constructor(el, shine, order, sweep, amp) {
    this.el = el; this.shine = shine; this.sweep = sweep; this.amp = amp;
    this.start = -1;
    this.next = firstHint(order);
  }
  get running() { return this.start >= 0; }
  due(now) { return now >= this.next; }
  begin(now) { this.start = now; this.el.dataset.hint = '1'; }
  /** Stops the gesture in progress, if any, and postpones the next one by at least `delay` ms. */
  stop(delay) {
    if (this.running) { this.start = -1; delete this.el.dataset.hint; this.shine.a.value = 0; }
    this.next = Math.max(this.next, performance.now() + delay);
  }
  /** One frame of the gesture: moves the shine and returns the tilt to apply, plus whether it has just ended. */
  step(now) {
    const u = Math.min(1, (now - this.start) / HINT_MS), sw = Math.sin(Math.PI * u);
    this.shine.t.value = -this.sweep + 2 * this.sweep * easeIO(u);
    this.shine.a.value = 0.75 * sw;
    const done = u >= 1;
    if (done) { this.start = -1; delete this.el.dataset.hint; this.shine.a.value = 0; this.next = nextHintAt(now); }
    return { y: this.amp * sw, x: -this.amp * 0.35 * sw, done };
  }
}

/** The shine: a diagonal band of light added to the material's shader (position t, width w, intensity a). */
export function withShine(material, shine) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uShineT = shine.t; sh.uniforms.uShineW = shine.w; sh.uniforms.uShineA = shine.a;
    sh.vertexShader = 'varying vec2 vShine;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vShine = mvPosition.xy;');
    sh.fragmentShader = 'uniform float uShineT, uShineW, uShineA;\nvarying vec2 vShine;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      '#include <opaque_fragment>\n  float sd = (vShine.x + vShine.y * 0.6) - uShineT;\n  gl_FragColor.rgb += vec3(1.0) * exp(-sd * sd / (uShineW * uShineW)) * uShineA;');
  };
  return material;
}

/** If the browser takes the GPU away from the page (tab put to sleep on a phone, driver restart), the canvas would
 *  stay blank. We then fall back to the non-3D version (fallback); the loop stops as soon as lost() is true. */
export function watchContextLoss(canvas, fallback) {
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => { lost = true; fallback(); }, { once: true });
  return () => lost;
}
