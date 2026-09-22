// Outils communs aux trois scènes 3D : les téléphones (hero.js), le logo AF (logo.js) et les marques (marks.js).

/** Ordinateur à la souris, fenêtre assez large : là où la 3D démarre sans attendre un geste. */
export const desktop = () => window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/** Suit les changements de densité d'écran (fenêtre glissée d'un écran Retina vers un écran standard, zoom du navigateur). */
export const onDprChange = (cb) => {
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  q.addEventListener('change', () => { cb(); onDprChange(cb); }, { once: true });
};

export const whenLoaded = (fn) => { if (document.readyState === 'complete') fn(); else window.addEventListener('load', fn); };

/** Démarrage différé, pour ne rien coûter à l'arrivée : sur ordinateur, quand le navigateur est libre après le
 *  chargement ; sur téléphone, au premier geste (toucher, défilement) ou 5 s après la page. */
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

// ---------- geste d'invite : de temps en temps, l'objet s'incline et un reflet le balaie, pour montrer qu'il est en volume ----------
export const HINT_MS = 1500;
/** Premier geste : décalé d'un objet à l'autre (order = 0 LinkedIn, 1 Betclic, 2 Accor, 3 logo AF). */
export const firstHint = (order) => performance.now() + 1500 + order * 1500;
/** Geste suivant : toutes les 4,5 à 6 s. */
export const nextHintAt = (now) => now + 4500 + Math.random() * 1500;
export const easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/** Le reflet : une bande de lumière en diagonale, ajoutée au shader du matériau (position t, largeur w, intensité a). */
export function withShine(material, shine) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uShineT = shine.t; sh.uniforms.uShineW = shine.w; sh.uniforms.uShineA = shine.a;
    sh.vertexShader = 'varying vec2 vShine;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vShine = mvPosition.xy;');
    sh.fragmentShader = 'uniform float uShineT, uShineW, uShineA;\nvarying vec2 vShine;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      '#include <opaque_fragment>\n  float sd = (vShine.x + vShine.y * 0.6) - uShineT;\n  gl_FragColor.rgb += vec3(1.0) * exp(-sd * sd / (uShineW * uShineW)) * uShineA;');
  };
  return material;
}

/** Si le navigateur retire la carte graphique à la page (onglet mis en veille sur téléphone, pilote qui redémarre), le
 *  canvas resterait vide. On revient alors à la version sans 3D (fallback) ; la boucle s'arrête dès que lost() est vrai. */
export function watchContextLoss(canvas, fallback) {
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => { lost = true; fallback(); }, { once: true });
  return () => lost;
}
