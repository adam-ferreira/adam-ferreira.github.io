import { test, expect } from '@playwright/test';
import { PAGES } from './helpers';

test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'iphone', 'téléphone seulement'); });

for (const { lang, path } of PAGES) {
  test(`${lang} : aucun débordement horizontal`, async ({ page }) => {
    await page.goto(path);
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(w);
  });
}

test('défilement normal (pas de mode scène) et logo AF qui apparaît en descendant', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/stage/);
  await expect(page.locator('a.brand')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(page.locator('a.brand')).toBeVisible();
});
