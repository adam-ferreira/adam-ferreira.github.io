// Les deux langues du site : l'anglais à la racine, le français sous /fr/.
export type Lang = 'en' | 'fr';
export const pathOf = (l: Lang) => (l === 'en' ? '/' : '/fr/');
export const LOCALE: Record<Lang, string> = { en: 'en_US', fr: 'fr_FR' };
