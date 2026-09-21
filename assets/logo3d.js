// Le logo 3D d'Adam (assets/logo.glb) dans l'en-tête.
// Chargé après la page, seulement si WebGL est là. Sous « réduire les animations », une image fixe : pas de rotation.
// Repris du portfolio (caméra orthographique, matière orange, environnement cubemap, suivi de la souris amorti).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ORANGE = 0xff7452;
const canvas = document.querySelector('canvas.logo3d');

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

function start() {
  if (!canvas || !webglOk()) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.classList.add('is-loading');

  const size = () => ({ w: canvas.clientWidth || 200, h: canvas.clientHeight || 200 });
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-4, -2, 3); scene.add(rim);

  const env = new THREE.CubeTextureLoader().setPath('assets/cubemaps/')
    .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
  env.colorSpace = THREE.SRGBColorSpace;

  let logo = null, target = { x: 0, y: 0 }, idle = 0, raf = 0, visible = true;

  function fit() {
    const { w, h } = size();
    renderer.setSize(w, h, false);
    const aspect = w / h, half = 1.15;
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  new GLTFLoader().load('assets/logo.glb', (gltf) => {
    logo = gltf.scene;
    const box = new THREE.Box3().setFromObject(logo);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    logo.position.sub(c);
    const k = 1.8 / Math.max(s.x, s.y, s.z);
    logo.scale.setScalar(k);
    logo.traverse((n) => {
      if (n.isMesh) {
        n.material = new THREE.MeshStandardMaterial({ color: ORANGE, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
      }
    });
    scene.add(logo);
    fit();
    renderer.render(scene, camera);
    canvas.classList.remove('is-loading');
    canvas.classList.add('is-ready');
    if (!reduced) loop();
  }, undefined, () => { canvas.classList.remove('is-loading'); });

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!logo || !visible || document.hidden) return;
    idle += 0.004;
    const wantX = target.y * 0.35, wantY = target.x * 0.6 + Math.sin(idle) * 0.25;
    logo.rotation.x += (wantX - logo.rotation.x) * 0.06;
    logo.rotation.y += (wantY - logo.rotation.y) * 0.06;
    renderer.render(scene, camera);
  }

  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('resize', () => { fit(); if (logo && reduced) renderer.render(scene, camera); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(canvas);
  }
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', () => { ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300); });
