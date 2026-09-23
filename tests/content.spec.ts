import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGES, animationsDone, content, plain, roleOnly, watchErrors } from './helpers';

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
      for (const j of d.experience) expect(html).toContain(roleOnly(j.role).replace(/&/g, '&amp;'));
      // the achievements: their title and short sentence here, the full text only on the CV page
      const esc = (t: string) => plain(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      for (const b of d.experience.flatMap((j: { bullets?: { title: string; short: string; text: string }[] }) => j.bullets ?? [])) {
        expect(html).toContain(esc(b.title)); expect(html).toContain(esc(b.short));
        if (b.text !== b.short) expect(html).not.toContain(esc(b.text));
      }
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
    [...document.querySelectorAll('.reveal, .section-title')]
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

test('top bar: the LinkedIn mark is a 28 × 28 square, filled by its image', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('.topbar-linkedin').boundingBox();
  const img = await page.locator('.topbar-linkedin img.theme-light').boundingBox();
  expect([box?.width, box?.height]).toEqual([28, 28]);
  expect(img).toEqual(box);
});

test('a remembered theme applies before the scripts run (no flash of the system theme)', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('cv-theme', 'dark'); } catch { /* ignore */ } });
  await page.route('**/_astro/*.js', (r) => r.abort());   // the page's scripts never arrive: only the inline boot script runs
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
});

test('dark palette: the same colours from the system preference and from the switch', async ({ browser }, info) => {
  // every custom property declared on :root by the stylesheet, as computed on the page
  const palette = (page: Page) => page.evaluate(() => {
    const names = new Set<string>();
    const walk = (rules: CSSRuleList) => { for (const r of rules) {
      if (r instanceof CSSStyleRule && r.selectorText.includes(':root')) for (const p of r.style) { if (p.startsWith('--')) names.add(p); }
      if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    } };
    for (const s of document.styleSheets) walk(s.cssRules);
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries([...names].sort().map((n) => [n, cs.getPropertyValue(n).trim()]));
  });
  // without JavaScript nothing sets data-theme: only the media query can apply; with a light system, only the switch
  const open = async (colorScheme: 'light' | 'dark', theme?: string) => {
    const ctx = await browser.newContext({ ...info.project.use, colorScheme, javaScriptEnabled: !!theme });
    if (theme) await ctx.addInitScript((t) => localStorage.setItem('cv-theme', t), theme);
    const page = await ctx.newPage();
    await page.goto('/');
    const p = await palette(page);
    await ctx.close();
    return p;
  };
  const light = await open('light'), fromSystem = await open('dark'), fromSwitch = await open('light', 'dark');
  expect(Object.keys(fromSystem).length).toBeGreaterThan(8);
  expect(fromSwitch).toEqual(fromSystem);
  expect(fromSwitch['--paper']).not.toBe(light['--paper']);
  expect(await open('dark', 'light')).toEqual(light);   // and the light theme chosen on a dark system
});

test('footer finale: the pills carry the skills from the content, and never block the links', async ({ page }) => {
  await page.goto('/');
  const d = content('en');
  const skills = d.skills.flatMap((g: { items: string[] }) => g.items);
  const canvas = page.locator('.site-footer canvas.footer3d');
  expect(JSON.parse((await canvas.getAttribute('data-skills')) ?? '[]')).toEqual(skills);
  await expect(canvas).toHaveCSS('pointer-events', 'none');
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.footer-statement')).toHaveAttribute('href', `mailto:${d.identity.contact.email}`);
});

test('stage mode: the experiences with a demo tell their achievements next to the 3D phones', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 830 });
  await page.goto('/');
  test.skip(!(await page.evaluate(() => document.documentElement.classList.contains('stage'))), 'stage mode only');
  const d = content('en');
  const demos = d.experience.filter((j: { demo?: string }) => j.demo);
  expect(await page.locator('.job-demo .job-device').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.demo))).toEqual(demos.map((j: { demo: string }) => j.demo));
  const cols = await page.locator('.job-demo .story-steps').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(1);   // one achievement at a time
  const rails = page.locator('.job-demo .story-rail');
  await expect(rails).toHaveCount(demos.length);
  for (const [i, j] of demos.entries()) await expect(rails.nth(i).getByRole('tab')).toHaveCount(j.bullets.length);
  await expect(page.locator('.job-demo > .spotlight')).toHaveCount(demos.length);   // the client's name, giant, over the text
  for (const c of await page.locator('canvas.hero3d').all()) await expect(c).toBeHidden();   // stage mode: only the overlay draws
  await expect(page.locator('canvas.devices3d')).toHaveCSS('pointer-events', 'none');
});

test('before the 3D (and without WebGL), the phones are still images, in the page language', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phones only');
  await page.goto('/fr/');
  await expect(page.locator('.hero-poster')).toBeVisible();
  const srcs = await page.locator('.job-poster').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src')));
  expect(srcs.length).toBe(content('fr').experience.filter((j: { demo?: string }) => j.demo).length);
  for (const s of srcs) expect(s).toMatch(/-fr\.[^.]+\.webp$/);
});
