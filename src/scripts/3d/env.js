// The six faces of the environment reflected by the 3D objects (phones, AF logo). Imported with ?url: Astro (Vite)
// copies them under a name that changes with their content, so a stale image is never served from cache.
import px from '../../assets/cubemaps/px.png?url';
import nx from '../../assets/cubemaps/nx.png?url';
import py from '../../assets/cubemaps/py.png?url';
import ny from '../../assets/cubemaps/ny.png?url';
import pz from '../../assets/cubemaps/pz.png?url';
import nz from '../../assets/cubemaps/nz.png?url';
export const CUBEMAP = [px, nx, py, ny, pz, nz];
