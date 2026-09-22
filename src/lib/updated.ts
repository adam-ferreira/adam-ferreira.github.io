// Date du dernier changement du contenu du CV : celle du dernier commit qui a touché src/content/cv/. Remplace {date}
// dans « Updated {date} » à chaque construction : la mention n'est plus jamais périmée. Sans historique Git (copie sans
// .git), c'est la date de la construction. En CI, le dépôt est récupéré avec tout son historique (fetch-depth: 0).
import { execFileSync } from 'node:child_process';
import type { Lang } from './i18n';

let cached: Date | undefined;
export function contentUpdatedAt(): Date {
  if (cached) return cached;
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'src/content/cv'], { encoding: 'utf-8' }).trim();
    cached = iso ? new Date(iso) : new Date();
  } catch { cached = new Date(); }
  return cached;
}

/** « September 2026 », « septembre 2026 ». */
export const monthYear = (lang: Lang) => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(contentUpdatedAt());
