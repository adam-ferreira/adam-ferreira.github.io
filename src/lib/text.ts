// Formatting of the CV text (carried over from the Python generator used before Astro, same output).
import type { MarkData } from './types';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

// Typography: a word of one or two letters ("I", "à", "de", "a") is tied to the next one, and French punctuation
// (" :", " ?", "« ") to its word, with a non-breaking space: never a short word or a colon alone at the end of a line.
const NBSP = '\u00a0';
const typo = (s: string) => s
  .replace(/(?<=^|[\s(])([\p{L}\d'’]{1,2}) (?=\S)/gu, `$1${NBSP}`)
  .replace(/ ([:;!?»])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`);

/** Plain text → HTML: escaping, **bold** → <strong>, then the typography above. */
export const md = (s: string) => typo(esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));

/** A role or a client without its trailing parenthesis: "QA Automation Engineer (Flutter mobile)" → "QA Automation Engineer". */
export const withoutNote = (s: string) => s.replace(/\s*\(.*\)$/, '');

/** "March 2026 - Present (Freelance)" → "Freelance · March 2026 – Present": the kind of contract first, then the dates. */
export const contractAndDates = (s: string) => {
  const [, range, note] = s.match(/^(.*?)\s*(?:\((.*)\))?$/) ?? [, s];
  const dates = (range ?? s).replace(/\s-\s/, ' – ');
  return note ? `${note} · ${dates}` : dates;
};

/** The same text without its **bold** markers: for an attribute read by a script (the labels of the indicator). */
export const plain = (s: string) => s.replace(/\*\*/g, '');

/** A word of the hero sentence: text, or a mark (name in identity.marks). i = rank, for the staggered entrance. */
export type HeroPiece = { i: number; text: string } | { i: number; mark: string };
/** A group = words stuck together without a space ("{{betclic}},": the mark and its comma), or a line break. */
type HeroGroup = 'br' | HeroPiece[];

/** The hero sentence split into groups, separated by a space (HeroLine.astro). {{name}} inserts a mark, {{br}} a line
 *  break; punctuation stuck to what precedes it joins that group, which will not break across lines. */
export function heroGroups(hero: string, marks: Record<string, MarkData>): HeroGroup[] {
  const out: HeroGroup[] = [];
  let i = 0, spaced = true;   // spaced: whitespace precedes the token (otherwise it is stuck to the previous one)
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

/** The same sentence, readable by a screen reader: marks replaced by their name. */
export const heroLabel = (hero: string, marks: Record<string, MarkData>) =>
  hero.replace(/\{\{(\w+)\}\}/g, (_, n) => (marks[n] ? marks[n].alt : ' '));
