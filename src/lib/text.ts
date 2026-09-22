// Petites fonctions de mise en forme du texte du CV (reprises de l'ancien build.py, même rendu).

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

/** Texte brut → HTML : échappement, puis **gras** → <strong>. */
export const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** Liste de pastilles (stack, compétences). Les espaces entre <li> comptent : les pastilles sont en ligne. */
export const chips = (items: string[]) => '<ul class="chips">' + items.map((i) => `<li>${md(i)}</li>`).join(' ') + '</ul>';

export interface MarkAsset { url: string; width?: number; height?: number }
export interface Mark { type: 'img'; src: string; alt: string; fill_dark?: string | null }

/** La phrase d'accueil, mot par mot (animation décalée), avec les marques {{nom}} insérées dedans.
 *  La ponctuation collée à une marque (« {{betclic}}, ») reste dans le même bloc insécable. */
export function heroHtml(hero: string, marks: Record<string, Mark>, asset: (m: Mark) => MarkAsset): string {
  const out: string[] = [];
  let i = 0, spaced = true;
  for (const tok of hero.split(/(\{\{\w+\}\}|\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) { spaced = true; continue; }
    const m = tok.match(/^\{\{(\w+)\}\}$/);
    if (m && m[1] === 'br') { out.push('<br>'); spaced = true; continue; }
    let piece: string;
    if (m && marks[m[1]]) {
      const mk = marks[m[1]], a = asset(mk);
      const size = a.width && a.height ? ` width="${a.width}" height="${a.height}"` : '';
      const dark = mk.fill_dark ? ` data-fill-dark="${esc(mk.fill_dark)}"` : '';
      piece = `<span class="w mark mark-${m[1]}" style="--i:${i}" data-svg="${esc(a.url)}"${dark}><img src="${esc(a.url)}" alt="${md(mk.alt)}"${size} decoding="async"></span>`;
    } else {
      piece = `<span class="w" style="--i:${i}">${md(tok)}</span>`;
    }
    if (out.length && !spaced) {   // ponctuation collée : même bloc insécable que ce qui précède, sans espace
      const last = out[out.length - 1];
      out[out.length - 1] = last.startsWith('<span class="nowrap">') ? last.slice(0, -7) + piece + '</span>' : `<span class="nowrap">${last}${piece}</span>`;
    } else out.push(piece);
    spaced = false;
    i++;
  }
  return out.join(' ');
}

/** La même phrase, lisible par un lecteur d'écran : les marques remplacées par leur nom. */
export const heroLabel = (hero: string, marks: Record<string, Mark>) =>
  hero.replace(/\{\{(\w+)\}\}/g, (_, n) => (marks[n] ? marks[n].alt : ' '));
