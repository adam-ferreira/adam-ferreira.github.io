// Adresses des fichiers de src/assets, versionnées par Vite (le nom change avec le contenu).
import type { MarkAsset } from './text';

const urls = import.meta.glob('../assets/marks/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const raws = import.meta.glob('../assets/marks/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** `assets/marks/betclic.svg` (chemin écrit dans le JSON) → adresse publiée + taille tirée du viewBox. */
export function markAsset(src: string): MarkAsset {
  const key = `../assets/marks/${src.split('/').pop()}`;
  if (!urls[key]) throw new Error(`Marque introuvable dans src/assets/marks/ : ${src}`);
  const vb = raws[key].match(/viewBox="([^"]+)"/);
  if (!vb) return { url: urls[key] };
  const [, , w, h] = vb[1].replace(/,/g, ' ').trim().split(/\s+/).map(Number);
  return { url: urls[key], width: Math.round(w), height: Math.round(h) };
}
