// Types du contenu, tirés du schéma (src/content.config.ts) : l'éditeur signale un champ absent ou mal orthographié.
import type { CollectionEntry } from 'astro:content';

export type Cv = CollectionEntry<'cv'>['data'];
export type Job = Cv['experience'][number];
