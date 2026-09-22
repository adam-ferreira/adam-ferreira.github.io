import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, animationsDone, content, plain, watchErrors } from './helpers';

for (const { lang, path } of PAGES) {
  test.describe(`page ${lang} (${path})`, () => {
    test('se charge sans aucune erreur JavaScript ni console', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(1500);   // le temps que la 3D démarre
      expect(errors).toEqual([]);
    });

    test('tout le texte est déjà dans le HTML (lisible sans JavaScript, indexable)', async ({ request }) => {
      const html = await (await request.get(path)).text();
      const d = content(lang);
      expect(html).toContain(`<html lang="${lang}"`);
      for (const j of d.experience) expect(html).toContain(plain(j.role).replace(/&/g, '&amp;'));
      expect(html).toContain(d.identity.contact.email);
    });

    test('en-tête : langue, adresse canonique et versions alternatives', async ({ page }) => {
      await page.goto(path);
      const site = 'https://adam-ferreira.github.io';
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + path);
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', site + '/');
      await expect(page.locator('link[hreflang="fr"]')).toHaveAttribute('href', site + '/fr/');
    });

    test('accessibilité : aucune violation WCAG 2.1 A/AA détectée par axe', async ({ page }) => {
      await page.goto(path);
      await animationsDone(page);   // contrast is measured on the final state, not on text that is still fading in
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`)).toEqual([]);
    });

    test('le bouton de thème bascule clair / sombre', async ({ page }) => {
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

test('sans JavaScript, les expériences et les titres sont visibles', async ({ browser }, info) => {
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
