import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LAB_PAGES, PAGES, content, plain, watchErrors } from './helpers';

// The Lab (/lab/, /fr/lab/): two WebGL experiments, each replacing its poster once ready. The boulder generator shows a
// problem from a seed (the poster's first, then any other, shareable by ?problem=), the ripples a shader under the pointer.
const norm = (s: string) => plain(s).replace(/\s+/g, ' ').trim();
/** The problem line as a pattern: its number, its moves and its grade left open. */
const problemLine = (template: string) => new RegExp('^' + template.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
  .replace('{seed}', '\\d{4}').replace('{moves}', '\\d+').replace('{grade}', '[4-8][ABC]?\\+?') + '$');
/** On a phone the experiments wait for a first gesture: a small scroll starts them (a computer starts them on its own). */
const nudge = (page: Page) => page.evaluate(() => window.scrollBy(0, 1));

for (const { lang, path, home } of LAB_PAGES) {
  test.describe(`Lab ${lang} (${path})`, () => {
    test('its texts, its head and the way back', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(path);
      const d = content(lang), lab = d.lab;
      await expect(page).toHaveTitle(`${d.identity.first_name} ${d.identity.last_name} — ${lab.link}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', lab.description);
      const site = 'https://adam-ferreira.github.io';
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site + path);
      for (const l of LAB_PAGES) await expect(page.locator(`link[hreflang="${l.lang}"]`)).toHaveAttribute('href', site + l.path);
      const text = norm((await page.locator('main').textContent() ?? '').replace(/ /g, ' '));
      for (const t of [lab.heading, lab.intro, lab.boulder.title, lab.boulder.text, lab.ripples.title, lab.ripples.text]) expect(text, t).toContain(norm(t));
      await expect(page.getByRole('link', { name: lab.back })).toHaveAttribute('href', home);
      await expect(page.locator('.lab-problem')).toHaveText(problemLine(lab.boulder.problem));
      expect(errors).toEqual([]);
    });

    test('accessibility: no WCAG 2.1 A/AA violation found by axe, light and dark', async ({ page }) => {
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(r.violations.map((v) => `${colorScheme}: ${v.id} (${v.nodes.length}) : ${v.help}`)).toEqual([]);
      }
    });
  });
}

test('both experiments replace their poster, with no error', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/lab/');
  await nudge(page);
  await expect(page.locator('.lab-boulder.is-ready')).toBeAttached({ timeout: 15_000 });
  await page.locator('#ripples').scrollIntoViewIfNeeded();
  await expect(page.locator('.lab-ripples.is-ready')).toBeAttached({ timeout: 15_000 });
  expect(errors.filter((e) => !/KHR_parallel_shader_compile/.test(e))).toEqual([]);
});

test('"New problem": another problem, its number in the address, the same problem again from that address', async ({ page }) => {
  await page.goto('/lab/');
  await nudge(page);
  const line = page.locator('.lab-problem'), button = page.locator('.lab-new');
  await expect(button).toBeVisible({ timeout: 15_000 });   // shown once the 3D can change the problem
  const first = await line.textContent();
  await button.click();
  await expect(line).not.toHaveText(first!);
  await expect(line).toHaveText(problemLine(content('en').lab.boulder.problem));
  const seed = new URL(page.url()).searchParams.get('problem');
  expect(seed).toMatch(/^\d{4}$/);
  expect(await line.textContent()).toContain(`#${seed}`);
  const shown = await line.textContent();
  await page.reload();
  await nudge(page);
  await expect(page.locator('.lab-boulder.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(line).toHaveText(shown!);   // a problem is shared by its number
});

test('lost graphics context: the boulder wall falls back to its poster', async ({ page }) => {
  await page.goto('/lab/');
  await nudge(page);
  const stage = page.locator('.lab-boulder');
  await expect(stage).toHaveClass(/is-ready/, { timeout: 15_000 });
  await page.evaluate(() => {
    const c = document.querySelector('.lab-boulder canvas') as HTMLCanvasElement;
    (c.getContext('webgl2') as WebGL2RenderingContext).getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(stage).not.toHaveClass(/is-ready/);
  await expect(stage.locator('img')).toHaveCSS('opacity', '1');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the ripples hold still', async ({ page }) => {
    await page.goto('/lab/');
    await nudge(page);
    await page.locator('#ripples').scrollIntoViewIfNeeded();
    const canvas = page.locator('.lab-ripples canvas');
    await expect(page.locator('.lab-ripples.is-ready')).toBeAttached({ timeout: 15_000 });
    await page.waitForTimeout(700);   // the canvas's fade-in
    const a = await canvas.screenshot();
    await page.waitForTimeout(600);
    expect((await canvas.screenshot()).equals(a)).toBe(true);
  });
});

test('home page top bar: a "Lab" link, in the page language', async ({ page }) => {
  for (const { lang, path } of PAGES) {
    await page.goto(path);
    const d = content(lang), link = page.locator('.topbar-lab');
    await expect(link).toHaveText(d.lab.link);
    await expect(link).toHaveAccessibleName(d.lab.link_title);
    await expect(link).toHaveAttribute('href', LAB_PAGES.find((l) => l.lang === lang)!.path);
  }
});

test('iPhone: no horizontal overflow on the Lab', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone only');
  for (const { path } of LAB_PAGES) {
    await page.goto(path);
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(w);
  }
});
