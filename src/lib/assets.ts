// URLs of the files in src/assets, versioned by Vite (the name changes with the content).

export interface MarkAsset { url: string; width?: number; height?: number }

const urls = import.meta.glob('../assets/marks/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const raws = import.meta.glob('../assets/marks/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** `assets/marks/betclic.svg` (path written in the JSON) → published URL + size taken from the viewBox. */
export function markAsset(src: string): MarkAsset {
  const key = `../assets/marks/${src.split('/').pop()}`;
  if (!urls[key]) throw new Error(`Mark not found in src/assets/marks/: ${src}`);
  const vb = raws[key].match(/viewBox="([^"]+)"/);
  if (!vb) return { url: urls[key] };
  const [, , w, h] = vb[1].replace(/,/g, ' ').trim().split(/\s+/).map(Number);
  return { url: urls[key], width: Math.round(w), height: Math.round(h) };
}
