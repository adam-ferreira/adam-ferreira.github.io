// The site's two languages: English at the root, French under /fr/.
export type Lang = 'en' | 'fr';
export const pathOf = (l: Lang) => (l === 'en' ? '/' : '/fr/');
export const LOCALE: Record<Lang, string> = { en: 'en_US', fr: 'fr_FR' };
