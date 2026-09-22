// Mise en forme du texte du CV (reprise du générateur Python d'avant Astro, même rendu).

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

/** Texte brut → HTML : échappement, puis **gras** → <strong>. */
export const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export interface MarkAsset { url: string; width?: number; height?: number }
export interface Mark { type: 'img'; src: string; alt: string; fill_dark?: string | null }

/** Un mot de la phrase d'accueil : du texte, ou une marque (nom dans identity.marks). i = rang, pour l'arrivée décalée. */
export type HeroPiece = { i: number; text: string } | { i: number; mark: string };
/** Un groupe = des mots collés sans espace (« {{betclic}}, » : la marque et sa virgule), ou un retour à la ligne. */
export type HeroGroup = 'br' | HeroPiece[];

/** La phrase d'accueil découpée en groupes, séparés par un espace (HeroLine.astro). {{nom}} insère une marque, {{br}}
 *  un retour à la ligne ; la ponctuation collée à ce qui précède rejoint son groupe, qui restera insécable. */
export function heroGroups(hero: string, marks: Record<string, Mark>): HeroGroup[] {
  const out: HeroGroup[] = [];
  let i = 0, spaced = true;   // spaced : un blanc précède le morceau (sinon il est collé au précédent)
  for (const tok of hero.split(/(\{\{\w+\}\}|\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) { spaced = true; continue; }
    const m = tok.match(/^\{\{(\w+)\}\}$/);
    if (m && m[1] === 'br') { out.push('br'); spaced = true; continue; }
    const piece: HeroPiece = m && marks[m[1]] ? { i, mark: m[1] } : { i, text: tok };
    const last = out[out.length - 1];
    if (last && last !== 'br' && !spaced) last.push(piece); else out.push([piece]);
    spaced = false;
    i++;
  }
  return out;
}

/** La même phrase, lisible par un lecteur d'écran : les marques remplacées par leur nom. */
export const heroLabel = (hero: string, marks: Record<string, Mark>) =>
  hero.replace(/\{\{(\w+)\}\}/g, (_, n) => (marks[n] ? marks[n].alt : ' '));
