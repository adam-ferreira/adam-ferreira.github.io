// The site's two languages: English at the root, French under /fr/.
export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
export const pathOf = (l: Lang) => (l === 'en' ? '/' : '/fr/');
/** The detailed CV page (src/layouts/CvPage.astro), and its PDF next to the home page (made by tools/render-pdf.mjs). */
export const cvPathOf = (l: Lang) => `${pathOf(l)}cv/`;
export const pdfPathOf = (l: Lang) => `${pathOf(l)}adam-ferreira-cv.pdf`;
export const LOCALE: Record<Lang, string> = { en: 'en_US', fr: 'fr_FR' };
