import { test, expect } from '@playwright/test';
import { content, watchErrors } from './helpers';

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
  await page.locator('.pill').first().hover();
  await expect(dot).toHaveClass(/is-hot/);
});

test('?fps: the meter shows up', async ({ page }) => {
  await page.goto('/?fps');
  await expect(page.getByText(/^FPS \d+/)).toBeVisible();
});

test('cursor: a word over some objects (the footer sentence: write)', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('End'); await page.waitForTimeout(1300);
  const s = await page.locator('.footer-statement').boundingBox();
  await page.mouse.move(s!.x + 20, s!.y + s!.height / 2, { steps: 4 });
  await expect(page.locator('.cursor')).toHaveClass(/has-label/);
  await expect(page.locator('.cursor-label')).toHaveText(content('en').ui.cursor_mail);
});

test('sound: off by default, on with the switch, the choice remembered', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const btn = page.locator('.sound-toggle');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('cv-sound'))).toBe('on');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400);   // a screen change plays its breath
  await page.reload();
  await expect(page.locator('.sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
