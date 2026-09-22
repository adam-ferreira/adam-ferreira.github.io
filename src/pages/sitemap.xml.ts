// Le plan du site pour les moteurs de recherche : les deux pages, chacune avec sa traduction (hreflang), et la date du
// dernier changement du contenu. Les outils (/tools/) n'y figurent pas.
import type { APIRoute } from 'astro';
import { pathOf, type Lang } from '../lib/i18n';
import { contentUpdatedAt } from '../lib/updated';

export const GET: APIRoute = ({ site }) => {
  const u = (l: Lang) => new URL(pathOf(l), site).href;
  const alt = (['en', 'fr'] as const).map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${u(l)}"/>`).join('')
    + `<xhtml:link rel="alternate" hreflang="x-default" href="${u('en')}"/>`;
  const lastmod = contentUpdatedAt().toISOString().slice(0, 10);
  const urls = (['en', 'fr'] as const).map((l) => `<url><loc>${u(l)}</loc><lastmod>${lastmod}</lastmod>${alt}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
