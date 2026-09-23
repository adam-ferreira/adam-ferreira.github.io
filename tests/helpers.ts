import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

// The CV content, read from the same files as the site: tests follow the text without being rewritten.
export const content = (lang: 'en' | 'fr') =>
  JSON.parse(readFileSync(new URL(`../src/content/cv/${lang}.json`, import.meta.url), 'utf-8'));

export const PAGES = [
  { lang: 'en' as const, path: '/' },
  { lang: 'fr' as const, path: '/fr/' },
];
/** The detailed CV page of each language, and its PDF (made at the end of the build). */
export const CV_PAGES = [
  { lang: 'en' as const, path: '/cv/', home: '/', pdf: '/adam-ferreira-cv.pdf' },
  { lang: 'fr' as const, path: '/fr/cv/', home: '/fr/', pdf: '/fr/adam-ferreira-cv.pdf' },
];

/** Displayed text, without the JSON **bold** markup. */
export const plain = (s: string) => s.replace(/\*\*/g, '');

/** A role as the home page shows it: without its trailing parenthesis (src/lib/text.ts). */
export const roleOnly = (s: string) => plain(s).replace(/\s*\(.*\)$/, '');

/** Collects a page's JavaScript errors and console errors. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

/** Stage mode: waits until the move from one screen to the next is over. */
export async function settle(page: Page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-moving'));
}

/** Waits for every finite CSS animation and transition to end (the infinite "Scroll" hint is ignored). */
export async function animationsDone(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
}
