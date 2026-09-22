// Three.js trimmed down to what hero.js, logo.js and marks.js use. Loaded on demand (dynamic import): Astro (Vite)
// bundles only the code these exports reach, in one file shared by the three scripts.
// A Three object used in one of those files must be added here (npm run build picks it up).
export { AmbientLight, Box3, BoxGeometry, CanvasTexture, CircleGeometry, Color, CubeTextureLoader, CylinderGeometry, DirectionalLight, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Scene, Shape, ShapeGeometry, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
