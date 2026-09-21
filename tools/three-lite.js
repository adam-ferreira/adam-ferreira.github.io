// Entrée du paquet Three.js du site : seulement ce que hero3d.js, logo3d.js et marks3d.js utilisent.
// esbuild ne garde que le code atteint par ces exports (tools/build-vendor.sh → assets/vendor/three.js).
// Un objet Three ajouté dans un de ces fichiers doit être ajouté ici, puis le paquet reconstruit.
export { AmbientLight, Box3, BoxGeometry, CanvasTexture, CircleGeometry, Color, CubeTextureLoader, CylinderGeometry, DirectionalLight, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Scene, Shape, ShapeGeometry, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
