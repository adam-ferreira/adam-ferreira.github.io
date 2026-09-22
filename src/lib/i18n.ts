// The site's two languages: English at the root, French under /fr/.
export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
export const pathOf = (l: Lang) => (l === 'en' ? '/' : '/fr/');
export const LOCALE: Record<Lang, string> = { en: 'en_US', fr: 'fr_FR' };
