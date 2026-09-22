// Helpers shared by the three 3D scenes: the phones (hero.js), the AF logo (logo.js) and the marks (marks.js).
import { DESKTOP, REDUCED_MOTION, matches } from '../media.js';

/** A computer with a mouse and a wide enough window: where the 3D starts without waiting for a gesture. */
export const desktop = () => matches(DESKTOP);
export const reduced = () => matches(REDUCED_MOTION);

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

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

// ---------- hint gesture: now and then the object tilts and a shine sweeps across it, to show that it is 3D ----------
export const HINT_MS = 1500;
/** First gesture: staggered from one object to the next (order = 0 LinkedIn, 1 Betclic, 2 Accor, 3 AF logo). */
export const firstHint = (order) => performance.now() + 1500 + order * 1500;
/** Next gesture: every 4.5 to 6 s. */
export const nextHintAt = (now) => now + 4500 + Math.random() * 1500;
export const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

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
