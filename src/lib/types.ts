// Content types, derived from the schema (src/content.config.ts): the editor flags a missing or misspelled field.
import type { CollectionEntry } from 'astro:content';

export type Cv = CollectionEntry<'cv'>['data'];
export type Job = Cv['experience'][number];
export type MarkData = Cv['identity']['marks'][string];
