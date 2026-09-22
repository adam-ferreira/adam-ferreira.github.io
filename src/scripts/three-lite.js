// Three.js réduit à ce que hero3d.js, logo3d.js et marks3d.js utilisent. Chargé à la demande (import dynamique) :
// Astro (Vite) n'embarque que le code atteint par ces exports, dans un fichier partagé par les trois scripts.
// Un objet Three ajouté dans un de ces fichiers doit être ajouté ici (npm run build le prend en compte).
export { AmbientLight, Box3, BoxGeometry, CanvasTexture, CircleGeometry, Color, CubeTextureLoader, CylinderGeometry, DirectionalLight, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Scene, Shape, ShapeGeometry, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
