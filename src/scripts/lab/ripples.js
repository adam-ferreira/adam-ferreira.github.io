// Lab: ripples. A full-frame shader drawn as a contour map in the site's colours: a slow field of level lines, and a
// ring that spreads from every point the pointer or a finger touches. Each ring is a damped wave added up in the fragment
// shader from its centre and its start time: nothing is simulated, so the picture is a function of time and of those
// few drops, and a still frame (reduced motion, posters, tests) is the same code at a chosen instant.
import { reduced, setPixelRatio, onDprChange, watchVisible, watchContextLoss, shouldRender } from '../3d/common.js';
import { DARK } from '../media.js';

const DROPS = 12;    // rings alive at once (a uniform array: its size is fixed in the shader)
const STILL = 6.5;   // s: the instant a still frame shows
const IDLE = 2.4;    // s between two drops of the surface's own
// the rings a still frame shows: x, y (0-1, y up), start time (s), strength
const STILL_DROPS = [[0.3, 0.62, 4.6, 1.2], [0.7, 0.35, 5.4, 1], [0.58, 0.72, 6.1, 0.7]];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// uInk, uPaper, uAccent: linear colours (THREE.Color converts the CSS hex); colorspace_fragment turns them back into sRGB
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uPaper, uLine, uAccent;
  uniform vec4 uDrops[${DROPS}];
  varying vec2 vUv;

  // a ring: a short train of waves travelling out from c since t0, fading with distance and age
  float ring(vec2 p, vec4 d) {
    float age = uTime - d.z;
    if (age < 0.0 || d.w == 0.0) return 0.0;
    float r = length(p - d.xy), front = age * 0.32;
    return d.w * sin((r - front) * 48.0) * exp(-pow((r - front) * 7.0, 2.0)) * exp(-age * 0.9);
  }

  vec2 hash2(float n) { return fract(sin(vec2(n * 12.9898, n * 78.233)) * 43758.5453); }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    // the slow field: two crossed swells drifting, like the level lines of a hillside
    float h = 0.55 * sin(p.x * 3.1 + uTime * 0.11) * sin(p.y * 2.4 - uTime * 0.08)
            + 0.35 * sin((p.x + p.y) * 4.3 - uTime * 0.17);
    float wave = 0.0;
    for (int i = 0; i < ${DROPS}; i++) wave += ring(p, vec4(uDrops[i].x * aspect, uDrops[i].yzw));
    // a drop of its own every ${IDLE} s, somewhere new each time: the surface stirs before anyone touches it
    for (int j = 0; j < 3; j++) {
      float k = floor(uTime / ${IDLE.toFixed(1)}) - float(j);
      wave += ring(p, vec4((0.15 + 0.7 * hash2(k)) * vec2(aspect, 1.0), k * ${IDLE.toFixed(1)}, 0.8));
    }
    h += wave;
    // level lines: a thin line wherever h crosses a multiple of 1/7, as wide on screen whatever the slope
    float k = h * 7.0, line = 1.0 - smoothstep(0.0, fwidth(k) * 1.4, abs(fract(k + 0.5) - 0.5));
    vec3 col = mix(uPaper, uLine, line * 0.85);
    // the rings take the accent colour, the field keeps the page's quiet line colour
    col = mix(col, uAccent, line * smoothstep(0.02, 0.35, abs(wave)));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** Mounts the ripples on `canvas`. `freeze`: a still frame with no motion (posters, tests). Returns { dispose() }. */
export async function mount(canvas, { freeze = false } = {}) {
  const THREE = await import('../3d/three-lite.js');
  const still = freeze || reduced();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const drops = Array.from({ length: DROPS }, () => new THREE.Vector4(0, 0, -1e3, 0));
  const uniforms = {
    uTime: { value: STILL }, uResolution: { value: new THREE.Vector2(1, 1) }, uDrops: { value: drops },
    uPaper: { value: new THREE.Color() }, uLine: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() },
  };
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  const plane = new THREE.Mesh(geometry, material);
  plane.frustumCulled = false;   // the vertex shader ignores the camera
  scene.add(plane);

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function paint() {
    uniforms.uPaper.value.set(css('--paper'));
    const ink = new THREE.Color(css('--ink')), paper = uniforms.uPaper.value;
    const dark = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.3;
    uniforms.uLine.value.copy(paper).lerp(ink, dark ? 0.22 : 0.32);   // the field's lines stay quiet next to the rings
    uniforms.uAccent.value.set(css('--accent'));
  }

  const lost = watchContextLoss(canvas, () => canvas.closest('.lab-stage')?.classList.remove('is-ready'));
  const visible = watchVisible(canvas);
  const t0 = performance.now();
  const now = () => (still ? STILL : (performance.now() - t0) / 1000);
  let next = 0, lastDrop = -1;
  function drop(e, strength) {
    if (still) return;
    const r = canvas.getBoundingClientRect(), t = now();
    if (strength < 1 && t - lastDrop < 0.07) return;   // a moving pointer leaves a ring every 70 ms, not one per event
    lastDrop = t;
    drops[next].set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, t, strength);
    next = (next + 1) % DROPS;
  }
  const onMove = (e) => drop(e, 0.55);
  const onDown = (e) => drop(e, 1.3);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  if (still) STILL_DROPS.forEach((d, i) => drops[i].set(...d));

  const draw = () => { uniforms.uTime.value = now() % 1000; renderer.render(scene, camera); };   // wrapped: mediump time on phones
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setPixelRatio(renderer, 1, 1.5);   // a full-frame shader: every pixel is paid for, so no more than 1.5 per CSS pixel
    renderer.setSize(r.width, r.height, false);
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    draw();
  }
  const redraw = () => { paint(); draw(); };
  const theme = new MutationObserver(redraw);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const system = window.matchMedia(DARK);
  system.addEventListener('change', redraw);
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  onDprChange(fit);

  paint();
  fit();
  await renderer.compileAsync(scene, camera);   // compiled before the first visible frame
  draw();
  canvas.closest('.lab-stage')?.classList.add('is-ready');

  let raf = 0, lastDraw = -1e9;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (lost() || !visible() || !shouldRender(t, lastDraw)) return;
    lastDraw = t;
    draw();
  }
  if (!still) raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); theme.disconnect(); system.removeEventListener('change', redraw);
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown);
      geometry.dispose(); material.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
