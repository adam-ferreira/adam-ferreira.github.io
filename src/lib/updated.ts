// Date of the last change to the CV content: that of the last commit touching src/content/cv/. It replaces {date} in
// "Updated {date}" on every build, so the mention is never out of date. Without Git history (a copy without .git),
// it is the build date. In CI, the repository is checked out with its full history (fetch-depth: 0).
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

/** "September 2026", "septembre 2026" (formatted in the page's language). */
export const monthYear = (lang: Lang) => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(contentUpdatedAt());
