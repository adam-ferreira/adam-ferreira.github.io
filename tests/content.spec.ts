import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, animationsDone, content, plain, watchErrors } from './helpers';

for (const { lang, path } of PAGES) {
  test.describe(`page ${lang} (${path})`, () => {
    test('loads without any JavaScript or console error', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1500);   // time for the 3D to start
      expect(errors).toEqual([]);
    });

    test('all the text is already in the HTML (readable without JavaScript, indexable)', async ({ request }) => {
      const html = await (await request.get(path)).text();
      const d = content(lang);
      expect(html).toContain(`<html lang="${lang}"`);
      for (const j of d.experience) expect(html).toContain(plain(j.role).replace(/&/g, '&amp;'));
      expect(html).toContain(d.identity.contact.email);
    });

    test('head: language, canonical URL and alternate versions', async ({ page }) => {
      await page.goto(path);
      const site = 'https://adam-ferreira.github.io';
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + path);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', site + '/');
      await expect(page.locator('link[hreflang="fr"]')).toHaveAttribute('href', site + '/fr/');
    });

    test('accessibility: no WCAG 2.1 A/AA violation found by axe', async ({ page }) => {
      await page.goto(path);
      await animationsDone(page);   // contrast is measured on the final state, not on text that is still fading in
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`)).toEqual([]);
    });

    test('the theme switch toggles light / dark', async ({ page }) => {
      await page.goto(path);
      const t = page.locator('.theme-toggle');
      const before = await page.evaluate(() => document.documentElement.dataset.theme);
      await t.click();
      const after = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(after).not.toBe(before);
      await expect(t).toHaveAttribute('aria-checked', after === 'dark' ? 'true' : 'false');
    });
  });
}

test('without JavaScript, experiences and titles are visible', async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('.job-header, .job-intro, .bullets li, .section-title')]
      .filter((el) => { const s = getComputedStyle(el); return s.opacity !== '1' || (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)'); })
      .map((el) => el.textContent!.trim().slice(0, 40)));
  expect(hidden).toEqual([]);
  await ctx.close();
});

test('without JavaScript on a dark system, the dark Accor logo is turned light', async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('.mark-accor img')).not.toHaveCSS('filter', 'none');
  await ctx.close();
});

test('top bar: the LinkedIn mark is a 40 × 40 square, filled by its image', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('.topbar-linkedin').boundingBox();
  const img = await page.locator('.topbar-linkedin img.theme-light').boundingBox();
  expect([box?.width, box?.height]).toEqual([40, 40]);
  expect(img).toEqual(box);
});

test('a remembered theme applies before the scripts run (no flash of the system theme)', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('cv-theme', 'dark'); } catch { /* ignore */ } });
  await page.route('**/_astro/*.js', (r) => r.abort());   // the page's scripts never arrive: only the inline boot script runs
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});
