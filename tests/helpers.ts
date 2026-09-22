import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

// Le contenu du CV, lu dans les mêmes fichiers que le site : les tests suivent le texte sans être réécrits.
export const content = (lang: 'en' | 'fr') =>
  JSON.parse(readFileSync(new URL(`../src/content/cv/${lang}.json`, import.meta.url), 'utf-8'));

export const PAGES = [
  { lang: 'en' as const, path: '/' },
  { lang: 'fr' as const, path: '/fr/' },
];

/** Texte affiché, sans le balisage **gras** du JSON. */
export const plain = (s: string) => s.replace(/\*\*/g, '');

/** Collecte des erreurs JavaScript et des erreurs console d'une page. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

/** Mode scène : attend la fin du passage d'un écran à l'autre. */
export async function settle(page: Page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-moving'));
}
