// The moving part of the phones' screen (hero.js), drawn by the GPU over the still mock-up: the selection frames and
// the tap ripples as rounded rectangles, the log lines and the locators' labels as cells of an atlas drawn once per test
// (hero-screen.js: drawAtlas, screenList). Nothing is uploaded while the test plays.
import { SW, SH } from './hero-screen.js';

const BOXES = 16, CELLS = 20;   // enough for the busiest instant: 5 kept frames and their labels, the log, the ripple

// a rounded rectangle, filled then stroked like the canvas's (the stroke straddles the edge), antialiased by its distance
const BOX_VS = `uniform vec4 uBox; uniform float uLineW; varying vec2 vPx;
void main() {
  vec2 q = position.xy + 0.5; float m = uLineW * 0.5 + 2.0;
  vPx = uBox.xy - m + vec2(q.x, 1.0 - q.y) * (uBox.zw + 2.0 * m);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPx, 0.0, 1.0);
}`;
const BOX_FS = `uniform vec4 uBox, uFill, uLine; uniform float uR, uLineW, uAlpha; varying vec2 vPx;
void main() {
  vec2 h = uBox.zw * 0.5, q = abs(vPx - uBox.xy - h) - h + uR;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR, aa = max(fwidth(d), 1e-3);
  float fa = uFill.a * clamp(0.5 - d / aa, 0.0, 1.0);
  float la = uLineW > 0.0 ? uLine.a * clamp(0.5 - (abs(d) - uLineW * 0.5) / aa, 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(uLine.rgb * la + uFill.rgb * fa * (1.0 - la), la + fa * (1.0 - la)) * uAlpha;
}`;
// a cell of the atlas (premultiplied), tinted
const CELL_VS = `uniform vec4 uRect, uCell; uniform vec2 uSize; varying vec2 vUv;
void main() {
  vec2 q = vec2(position.x + 0.5, 0.5 - position.y), a = uCell.xy + q * uCell.zw;
  vUv = vec2(a.x / uSize.x, 1.0 - a.y / uSize.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(uRect.xy + q * uRect.zw, 0.0, 1.0);
}`;
const CELL_FS = `uniform sampler2D uAtlas; uniform vec3 uTint; uniform float uAlpha; varying vec2 vUv;
void main() { vec4 c = texture2D(uAtlas, vUv); gl_FragColor = vec4(c.rgb * uTint, c.a) * uAlpha; }`;

/** The overlay of both phones: `phones`, groups with userData.screen = { w, h, z } (the screen's size and depth). */
export function createOverlay(THREE, phones, anisotropy) {
  const atlas = new THREE.CanvasTexture(document.createElement('canvas'));
  atlas.colorSpace = THREE.NoColorSpace;   // read as drawn: the canvas colours, like the mock-up's
  atlas.premultiplyAlpha = true; atlas.anisotropy = anisotropy;
  const geo = new THREE.PlaneGeometry(1, 1);
  // one layer per phone, in mock-up pixels (y down), just above the screen and below the camera cut-out
  const layers = phones.map((p) => {
    const { w, h, z } = p.userData.screen, o = new THREE.Group();
    o.position.set(-w / 2, h / 2, z + 0.0006); o.scale.set(w / SW, -h / SH, 1);
    p.add(o); return o;
  });
  const slot = (uniforms, vertexShader, fragmentShader) => {
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide });
    const meshes = layers.map((o) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; o.add(m); return m; });
    return { u: mat.uniforms, meshes };
  };
  const v4 = () => ({ value: new THREE.Vector4() }), f = (x) => ({ value: x });
  const boxes = Array.from({ length: BOXES }, () => slot({ uBox: v4(), uFill: v4(), uLine: v4(), uR: f(0), uLineW: f(0), uAlpha: f(1) }, BOX_VS, BOX_FS));
  const size = new THREE.Vector2(1, 1);
  const cells = Array.from({ length: CELLS }, () => slot({ uRect: v4(), uCell: v4(), uSize: f(size), uAtlas: f(atlas), uTint: { value: new THREE.Vector3(1, 1, 1) }, uAlpha: f(1) }, CELL_VS, CELL_FS));
  const NONE = [0, 0, 0, 0];

  return {
    /** The texts of a new test (drawAtlas): one upload. */
    setAtlas(a) { atlas.image = a.canvas; atlas.needsUpdate = true; size.set(a.w, a.h); },
    /** Shows a screenList, in its order. */
    show(list) {
      let b = 0, c = 0, order = 0;
      for (const p of list) {
        if (!(p.alpha > 0)) continue;
        const s = p.box ? boxes[b++] : cells[c++];
        if (!s) continue;
        const u = s.u; u.uAlpha.value = p.alpha;
        if (p.box) {
          const { x, y, w, h, r } = p.box;
          u.uBox.value.set(x, y, w, h); u.uR.value = Math.min(r, w / 2, h / 2); u.uLineW.value = p.lineW || 0;
          u.uFill.value.fromArray(p.fill); u.uLine.value.fromArray(p.line || NONE);
        } else {
          u.uRect.value.set(p.x, p.y, p.cell.w, p.cell.h); u.uCell.value.set(p.cell.x, p.cell.y, p.cell.w, p.cell.h);
          u.uTint.value.set(...(p.tint || [1, 1, 1]));
        }
        for (const m of s.meshes) { m.visible = true; m.renderOrder = 10 + order; }
        order++;
      }
      for (; b < BOXES; b++) for (const m of boxes[b].meshes) m.visible = false;
      for (; c < CELLS; c++) for (const m of cells[c].meshes) m.visible = false;
    },
  };
}
