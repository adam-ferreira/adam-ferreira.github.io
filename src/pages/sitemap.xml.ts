// The sitemap for search engines: the home page and the detailed CV, in both languages, each with its translation
// (hreflang), and the date of the last content change. The tools (/tools/) are left out.
import type { APIRoute } from 'astro';
import { LANGS, pathOf, cvPathOf, type Lang } from '../lib/i18n';
import { contentUpdatedAt } from '../lib/updated';

export const GET: APIRoute = ({ site }) => {
  const lastmod = contentUpdatedAt().toISOString().slice(0, 10);
  const urls = [pathOf, cvPathOf].flatMap((pathFor) => {
    const u = (l: Lang) => new URL(pathFor(l), site).href;
    const alt = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${u(l)}"/>`).join('')
      + `<xhtml:link rel="alternate" hreflang="x-default" href="${u('en')}"/>`;
    return LANGS.map((l) => `<url><loc>${u(l)}</loc><lastmod>${lastmod}</lastmod>${alt}</url>`);
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
