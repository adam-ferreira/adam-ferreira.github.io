import { test, expect } from '@playwright/test';

// The cursor and the ?fps meter: desktop with a mouse only.
test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'mouse only'); });

test('cursor: follows the mouse, grows over a link, then stops', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(300, 300);
  await expect(page.locator('html')).toHaveClass(/has-cursor/);
  const dot = page.locator('.cursor');
  await page.mouse.move(420, 380, { steps: 5 });
  // the ball catches up with the pointer (within a pixel: on slow CI machines the last frames can lag), then stops
  const pos = () => dot.evaluate((d) => { const m = new DOMMatrix(getComputedStyle(d).transform); return [m.e, m.f]; });
  await expect.poll(async () => { const [x, y] = await pos(); return Math.hypot(x - 420, y - 380); }, { timeout: 10_000 }).toBeLessThan(1);
  await page.locator('.contact-link').first().hover();
  await expect(dot).toHaveClass(/is-hot/);
});

test('?fps: the meter shows up', async ({ page }) => {
  await page.goto('/?fps');
  await expect(page.getByText(/^FPS \d+/)).toBeVisible();
});
