// Les six faces de l'environnement que reflètent les objets 3D (téléphones, logo AF). Importées avec ?url : Astro (Vite)
// les copie sous un nom qui change avec leur contenu, donc jamais de vieille image en cache.
import px from '../assets/cubemaps/px.png?url';
import nx from '../assets/cubemaps/nx.png?url';
import py from '../assets/cubemaps/py.png?url';
import ny from '../assets/cubemaps/ny.png?url';
import pz from '../assets/cubemaps/pz.png?url';
import nz from '../assets/cubemaps/nz.png?url';
export const CUBEMAP = [px, nx, py, ny, pz, nz];
