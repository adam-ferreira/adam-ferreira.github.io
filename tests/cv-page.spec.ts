import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CV_PAGES, PAGES, content, plain, watchErrors } from './helpers';

// The detailed CV page (/cv/, /fr/cv/): the full texts that the home page only tells in short, a page that prints, and
// its PDF, printed from it at the end of the build.
const norm = (s: string) => plain(s).replace(/\s+/g, ' ').trim();

for (const { lang, path, home, pdf } of CV_PAGES) {
  test.describe(`detailed CV ${lang} (${path})`, () => {
    test('every text in full: intros, challenges, each achievement; never the short versions of the home page', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(path);
      const text = norm(await page.locator('main').textContent() ?? '');
      const d = content(lang);
      const full: string[] = [];
      for (const j of d.experience) {
        for (const t of [j.role, j.intro, j.subtitle, j.subintro, ...(j.stack ?? [])]) if (t) full.push(norm(t));
        for (const b of j.bullets ?? []) full.push(norm(b.title), norm(b.text));
      }
      for (const t of full) expect(text, t).toContain(t);
      for (const j of d.experience) {
        const shorts = [j.lead, ...(j.bullets ?? []).map((b: { short: string }) => b.short)].filter(Boolean).map(norm);
        for (const s of shorts) if (!full.some((f) => f.includes(s))) expect(text, s).not.toContain(s);
      }
      for (const s of d.skills) for (const i of s.items) expect(text).toContain(norm(i));
      expect(text).toContain(d.identity.contact.email);
      expect(errors).toEqual([]);
    });

    test('its own page: no screens, no 3D, the way back and the PDF', async ({ page, request }) => {
      await page.goto(path);
      const d = content(lang);
      await expect(page).toHaveTitle(`${d.ui.cv_page.title} — ${d.identity.first_name} ${d.identity.last_name}`);
      await expect(page.locator('html')).not.toHaveClass(/stage/);
      await expect(page.locator('canvas, .pager')).toHaveCount(0);
      await expect(page.getByRole('link', { name: d.ui.cv_page.back })).toHaveAttribute('href', home);
      const link = page.getByRole('link', { name: d.ui.cv_page.pdf });
      await expect(link).toHaveAttribute('href', pdf);
      await expect(link).toHaveAttribute('download', '');
      const res = await request.get(pdf);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/pdf');
      const body = await res.body();
      expect(body.subarray(0, 5).toString()).toBe('%PDF-');
      expect((body.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length, 'the PDF fits on two pages').toBeLessThanOrEqual(2);
    });

    test('head: canonical URL and alternate versions', async ({ page }) => {
      await page.goto(path);
      const site = 'https://adam-ferreira.github.io';
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + path);
      for (const c of CV_PAGES) await expect(page.locator(`link[hreflang="${c.lang}"]`)).toHaveAttribute('href', site + c.path);
    });

    test('accessibility: no WCAG 2.1 A/AA violation found by axe, light and dark', async ({ page }) => {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(r.violations.map((v) => `${colorScheme}: ${v.id} (${v.nodes.length}) : ${v.help}`)).toEqual([]);
      }
    });

    test('on paper: light, without the bar and its buttons, with the site address', async ({ page }) => {
      await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
      await page.goto(path);
      await expect(page.locator('.cv-bar')).toBeHidden();
      await expect(page.locator('.theme-toggle')).toBeHidden();
      await expect(page.locator('.print-only')).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
    });
  });
}

test('the theme switch, the page\'s only script, toggles light / dark', async ({ page }) => {
  await page.goto('/cv/');
  const t = page.locator('.theme-toggle');
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await t.click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);
});

test('iPhone: no horizontal overflow on the detailed CV', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone only');
  for (const { path } of CV_PAGES) {
    await page.goto(path);
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(w);
  }
});

test('top bar of the home page: a "CV" link to the detailed CV, in the page language', async ({ page }) => {
  for (const { lang, path } of PAGES) {
    await page.goto(path);
    const d = content(lang);
    const link = page.locator('.topbar-cv');
    await expect(link).toHaveText(d.ui.cv_page.link);
    await expect(link).toHaveAccessibleName(d.ui.cv_page.link_title);
    await expect(link).toHaveAttribute('href', CV_PAGES.find((c) => c.lang === lang)!.path);
  }
});

test('top bar at 1000 px: the contact line still fits before the CV link', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse, window 1000 px wide');
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 1200));   // the contact line shows once the name has left the screen
  await expect(page.locator('body')).toHaveClass(/name-away/);
  const status = page.locator('.frame-status');
  await expect(status).toBeVisible();
  const [s, cv] = [await status.boundingBox(), await page.locator('.topbar-cv').boundingBox()];
  expect(s!.x + s!.width).toBeLessThan(cv!.x);
  expect(await status.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1000);
});
