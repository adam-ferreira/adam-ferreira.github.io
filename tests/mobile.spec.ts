import { test, expect } from '@playwright/test';
import { PAGES } from './helpers';

test.beforeEach(async ({}, info) => { test.skip(info.project.name !== 'iphone', 'phone only'); });

for (const { lang, path } of PAGES) {
  test(`${lang}: no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(w);
  });
}

test('normal scrolling (no stage mode), and the AF logo appears when scrolling down', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/stage/);
  await expect(page.locator('a.brand')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(page.locator('a.brand')).toBeVisible();
});

test('achievements: swipeable cards, the dots follow the card in view and a dot brings its card', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('.job-demo .story-steps').first();
  await list.scrollIntoViewIfNeeded();
  const dots = page.locator('.swipe-dots').first().locator('.swipe-dot');
  await expect(dots).toHaveCount(await list.locator(':scope > li').count());
  await expect(dots.first()).toHaveAttribute('aria-current', 'true');
  await dots.nth(2).click();
  await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(dots.first()).toHaveAttribute('aria-current', 'false');
  expect(await list.evaluate((l) => l.scrollLeft)).toBeGreaterThan(0);
});

test('contact bar: hidden on the hero and on the footer, shown in between', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.phone-bar');
  await expect(bar).toBeHidden();
  await page.locator('.job-demo').first().scrollIntoViewIfNeeded();
  await expect(bar).toBeVisible();
  await expect(bar.locator('a')).toHaveAttribute('href', /^mailto:/);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(bar).toBeHidden();
});
