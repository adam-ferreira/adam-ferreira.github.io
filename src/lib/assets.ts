// URLs of the files in src/assets, versioned by Vite (the name changes with the content).

export interface MarkAsset { url: string; width?: number; height?: number; darkUrl?: string }

const urls = import.meta.glob('../assets/marks/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const raws = import.meta.glob('../assets/marks/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** `assets/marks/betclic.svg` (path written in the JSON) → published URL, size taken from the viewBox, and the URL of
 *  the `<name>-dark.svg` variant when the folder has one (the mark drawn for dark mode). */
export function markAsset(src: string): MarkAsset {
  const key = `../assets/marks/${src.split('/').pop()}`;
  if (!urls[key]) throw new Error(`Mark not found in src/assets/marks/: ${src}`);
  const darkUrl = urls[key.replace(/\.svg$/, '-dark.svg')];
  const vb = raws[key].match(/viewBox="([^"]+)"/);
  if (!vb) return { url: urls[key], darkUrl };
  const [, , w, h] = vb[1].replace(/,/g, ' ').trim().split(/\s+/).map(Number);
  return { url: urls[key], width: Math.round(w), height: Math.round(h), darkUrl };
}
