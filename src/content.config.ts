// Le contenu du CV : un fichier JSON par langue (src/content/cv/en.json, fr.json).
// Le schéma est vérifié à chaque construction : une clé mal orthographiée, un champ manquant ou en trop
// arrête la construction avec un message clair, au lieu de produire une page à moitié vide.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().min(1);
const mark = z.object({
  type: z.literal('img'),
  src: z.string().regex(/^assets\/marks\/[\w-]+\.svg$/, 'une marque vit dans src/assets/marks/'),
  alt: text,
  fill_dark: z.string().nullable().optional(),
}).strict();

const cv = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cv' }),
  schema: z.object({
    lang: z.enum(['en', 'fr']),
    meta: z.object({ title: text, description: text }).strict(),
    identity: z.object({
      first_name: text, last_name: text, headline: text, tagline: text, location: text,
      linkedin: z.object({ handle: text, url: z.string().url() }).strict(),
      photo: text,
      status_freelance: text, status_mode: text,
      hero: text,   // phrase d'accueil : {{nom}} insère une marque, {{br}} un retour à la ligne
      marks: z.record(z.string(), mark),
      contact: z.object({ email: z.string().email(), phone: text, phone_href: z.string().regex(/^\+\d+$/) }).strict(),
    }).strict(),
    skills: z.array(z.object({ label: text, items: z.array(text).min(1) }).strict()),
    experience: z.array(z.object({
      role: text, client: z.string().optional(), date: text,
      intro: z.string().optional(), subtitle: z.string().optional(), subintro: z.string().optional(),
      bullets: z.array(text).optional(), stack: z.array(text).optional(),
    }).strict()).min(1),
    projects: z.array(text).optional(),
    education: z.array(z.object({ title: text, date: text, text: text }).strict()),
    languages: z.array(z.object({ name: text, level: text }).strict()),
    interests: z.array(text),
    sections: z.object({ experience: text, projects: text, education: text, languages: text, interests: text }).strict(),
    ui: z.object({
      toggle_aria: text, toggle_title_dark: text, toggle_title_light: text, nav_aria: text,
      footer_note: z.string().optional(), scroll_hint: text, footer_statement: text, footer_availability: text,
      updated: text, stack_label: text,
    }).strict(),
  }).strict().superRefine((d, ctx) => {
    // chaque {{marque}} de la phrase d'accueil doit être décrite dans identity.marks
    for (const [, name] of d.identity.hero.matchAll(/\{\{(\w+)\}\}/g)) {
      if (name !== 'br' && !d.identity.marks[name]) ctx.addIssue({ code: 'custom', path: ['identity', 'hero'], message: `marque {{${name}}} absente de identity.marks` });
    }
  }),
});

export const collections = { cv };
