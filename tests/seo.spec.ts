import { test, expect } from '@playwright/test';
import { PAGES, content } from './helpers';

// Ce que lisent les moteurs de recherche et les aperçus de partage. Une seule passe suffit (ordinateur).
test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'indépendant de l\'appareil'); });

for (const { lang, path } of PAGES) {
  test(`${lang} : titre, fiche Person (schema.org) et politique de sécurité`, async ({ page }) => {
    const d = content(lang);
    await page.goto(path);
    await expect(page).toHaveTitle(d.meta.title);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe(`${d.identity.first_name} ${d.identity.last_name}`);
    expect(ld.sameAs).toContain(d.identity.linkedin.url);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self' 'sha256-");   // le seul script écrit dans la page est autorisé par son empreinte
    await expect(page.locator('.hero-foot .label').first()).not.toContainText('{date}');   // date du contenu remplie
  });
}

test('robots.txt et plan du site', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://adam-ferreira.github.io/sitemap.xml');
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const loc of ['https://adam-ferreira.github.io/', 'https://adam-ferreira.github.io/fr/']) expect(xml).toContain(`<loc>${loc}</loc>`);
  expect(xml).not.toContain('/tools/');
});

test('page 404 aux couleurs du site, dans les deux langues', async ({ page }) => {
  const res = await page.goto('/cette-page-n-existe-pas/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: content('en').ui.not_found.title })).toBeVisible();
  await expect(page.getByRole('link', { name: content('fr').ui.not_found.home })).toHaveAttribute('href', '/fr/');
});
