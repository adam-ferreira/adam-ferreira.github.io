import { test, expect } from '@playwright/test';
import { PAGES, content } from './helpers';

// What search engines and link previews read. One pass is enough (desktop).
test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'device-independent'); });

for (const { lang, path } of PAGES) {
  test(`${lang}: title, Person card (schema.org) and security policy`, async ({ page }) => {
    const d = content(lang);
    await page.goto(path);
    await expect(page).toHaveTitle(d.meta.title);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe(`${d.identity.first_name} ${d.identity.last_name}`);
    expect(ld.sameAs).toContain(d.identity.linkedin.url);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self' 'sha256-");   // the only script written in the page is allowed by its hash
    await expect(page.locator('.hero-foot .label').first()).not.toContainText('{date}');   // content date filled in
  });
}

test('robots.txt and sitemap', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://adam-ferreira.github.io/sitemap.xml');
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const path of ['/', '/fr/', '/cv/', '/fr/cv/']) expect(xml).toContain(`<loc>https://adam-ferreira.github.io${path}</loc>`);
  expect(xml).not.toContain('/tools/');
});

test('404 page in the site style, in both languages', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: content('en').ui.not_found.title })).toBeVisible();
  await expect(page.getByRole('link', { name: content('fr').ui.not_found.home })).toHaveAttribute('href', '/fr/');
});
