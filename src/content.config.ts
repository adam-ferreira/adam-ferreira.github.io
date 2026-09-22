// The CV content: one JSON file per language (src/content/cv/en.json, fr.json).
// The schema is checked on every build: a misspelled key, a missing or extra field stops the build with a clear
// message, instead of producing a half-empty page.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { LANGS } from './lib/i18n';

const text = z.string().min(1);
const colour = z.string().regex(/^#[0-9a-f]{6}$/, 'a colour is written #rrggbb in lower case');
const mark = z.object({
  src: z.string().regex(/^assets\/marks\/[\w-]+\.svg$/, 'a mark lives in src/assets/marks/'),
  alt: text,
  // dark mode: the colours of the SVG that change, and what they become (the 3D volume and, if the mark ships a
  // <name>-dark.svg, its flat image already drawn that way)
  dark_map: z.record(colour, colour).optional(),
}).strict();

const cv = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cv' }),
  schema: z.object({
    lang: z.enum(LANGS),
    meta: z.object({ title: text, description: text }).strict(),
    identity: z.object({
      first_name: text, last_name: text, headline: text, tagline: text, location: text,
      linkedin: z.object({ url: z.url() }).strict(),
      photo: text,
      status_freelance: text, status_mode: text,
      hero: text,   // hero sentence: {{name}} inserts a mark, {{br}} a line break
      marks: z.record(z.string(), mark),
      contact: z.object({ email: z.email(), phone: text, phone_href: z.string().regex(/^\+\d+$/) }).strict(),
    }).strict(),
    skills: z.array(z.object({ label: text, items: z.array(text).min(1) }).strict()),
    experience: z.array(z.object({
      role: text, client: z.string().optional(), date: text,
      intro: z.string().optional(), subtitle: z.string().optional(), subintro: z.string().optional(),
      bullets: z.array(text).optional(), stack: z.array(text).optional(),
    }).strict()).min(1),
    education: z.array(z.object({ title: text, date: text, text: text }).strict()),
    languages: z.array(z.object({ name: text, level: text }).strict()),
    interests: z.array(text),
    sections: z.object({ experience: text, education: text, languages: text, interests: text }).strict(),
    ui: z.object({
      toggle_aria: text, toggle_title_dark: text, toggle_title_light: text, nav_aria: text,
      scroll_hint: text, footer_statement: text, footer_availability: text, stack_label: text,
      updated: z.string().includes('{date}', { message: 'ui.updated must contain {date} (date of the last content change)' }),
      skip_link: text,   // "skip to content" link, visible only when focused with the keyboard
      not_found: z.object({ title: text, text: text, home: text }).strict(),   // the 404 page
    }).strict(),
  }).strict().superRefine((d, ctx) => {
    // every {{mark}} in the hero sentence must be described in identity.marks
    for (const [, name] of d.identity.hero.matchAll(/\{\{(\w+)\}\}/g)) {
      if (name !== 'br' && !d.identity.marks[name]) ctx.addIssue({ code: 'custom', path: ['identity', 'hero'], message: `mark {{${name}}} missing from identity.marks` });
    }
    // the top bar shows the LinkedIn mark (Topbar.astro)
    if (!d.identity.marks.linkedin) ctx.addIssue({ code: 'custom', path: ['identity', 'marks'], message: 'mark "linkedin" missing (the top bar shows it)' });
  }),
});

export const collections = { cv };
