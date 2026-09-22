import { test, expect, type Page } from '@playwright/test';
import { content, plain, settle } from './helpers';

// Stage mode: a desktop with a mouse, window at least 1100 × 680.
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'stage mode: desktop only');
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/stage/);
});

const slideCount = (page: Page) => page.locator('.slide').count();
const current = (page: Page) => page.evaluate(() => document.documentElement.dataset.slide);

test('keyboard: Arrow Down, End and Home change screen', async ({ page }) => {
  const n = await slideCount(page);
  await page.keyboard.press('ArrowDown'); await settle(page);
  expect(await current(page)).toBe('1');
  await page.keyboard.press('End'); await settle(page);
  expect(await current(page)).toBe(String(n - 1));
  await page.keyboard.press('Home'); await settle(page);
  expect(await current(page)).toBe('0');
});

test('wheel: one gesture = one screen', async ({ page }) => {
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 120); await settle(page);
  expect(await current(page)).toBe('1');
});

test('screen reader: all the content is exposed, not only the current screen', async ({ page }) => {
  const d = content('en');
  // getByRole ignores whatever is removed from the accessibility tree (visibility:hidden, aria-hidden…)
  for (const j of d.experience) {
    await expect(page.getByRole('heading', { level: 3, name: plain(j.role), exact: false })).toHaveCount(1);
  }
  await expect(page.getByRole('heading', { level: 2, name: d.sections.education })).toHaveCount(1);
  await expect(page.getByRole('link', { name: d.identity.contact.email }).last()).toBeAttached();
});

test('Tab to a link on another screen brings the stage there', async ({ page }) => {
  const n = await slideCount(page);
  await page.locator('footer .nocase').focus(); await settle(page);
  expect(await current(page)).toBe(String(n - 1));
  await expect(page.locator('footer.slide')).toHaveClass(/is-current/);
});

test('a jump (End, then Home) never lets the screens in between cross the window', async ({ page }) => {
  // middle screens being animated, right after a jump starts
  const crossing = () => page.evaluate(() => [...document.querySelectorAll('.slide')].slice(1, -1)
    .filter((s) => s.getAnimations().length > 0).length);
  await page.keyboard.press('End');
  await page.waitForTimeout(80);
  expect(await crossing()).toBe(0);
  await settle(page);
  await page.keyboard.press('Home');   // the tricky case: screens parked above go back below
  await page.waitForTimeout(80);
  expect(await crossing()).toBe(0);
  await settle(page);
});

test('AF logo: hidden on the home screen, shown afterwards; a click reloads the page at the top', async ({ page }) => {
  const brand = page.locator('a.brand');
  await expect(brand).toBeHidden();
  await page.keyboard.press('ArrowDown'); await settle(page);
  await expect(brand).toBeVisible();
  await page.evaluate(() => { (window as any).__before = 1; });
  await brand.click();
  await page.waitForLoadState('load');
  expect(await page.evaluate(() => (window as any).__before)).toBeUndefined();   // it really is a reload
  expect(await current(page)).toBe('0');
});

test('3D: phones, AF logo and marks ready', async ({ page }) => {
  await expect(page.locator('canvas.hero3d.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('canvas.logo3d.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('.mark.is-3d')).toHaveCount(3, { timeout: 15_000 });
});

test('"Skip to content": first Tab stop, visible, leads to the Experience screen', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport({ ratio: 1 });   // waits for its 0.2 s slide-in: fully visible
  await page.keyboard.press('Enter'); await settle(page);
  expect(await current(page)).toBe('1');
});

test('lost graphics context: the mark falls back to its image', async ({ page }) => {
  const mark = page.locator('.mark-linkedin');
  await expect(mark).toHaveClass(/is-3d/, { timeout: 15_000 });
  await page.evaluate(() => {
    const c = document.querySelector('.mark-linkedin canvas') as HTMLCanvasElement;
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(mark).not.toHaveClass(/is-3d/);
  await expect(mark.locator('img.theme-light')).toHaveCSS('opacity', '1');
});
