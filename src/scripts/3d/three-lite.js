// Three.js trimmed down to what hero.js (and screen-overlay.js), logo.js, marks.js, skills.js and the Lab (src/scripts/lab/)
// use. Loaded on demand (dynamic import): Astro (Vite) bundles only the code these exports reach, in one file shared by
// the scripts. A Three object used in one of those files must be added here (npm run build picks it up).
export { AmbientLight, Box3, BoxGeometry, CanvasTexture, CircleGeometry, Color, CubeTextureLoader, CylinderGeometry, DirectionalLight, DoubleSide, Euler, ExtrudeGeometry, Group, IcosahedronGeometry, InstancedMesh, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, NoColorSpace, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, ShaderMaterial, Shape, ShapeGeometry, SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
