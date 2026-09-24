import { test, expect, type Page } from '@playwright/test';
import { content, withoutNote, settle } from './helpers';

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

// the first experience with a demo: its screen, its achievements
const story = async (page: Page) => {
  const i = await page.locator('.slide').evaluateAll((els) => els.findIndex((e) => e.classList.contains('job-demo')));
  const n = content('en').experience.find((j: { demo?: string }) => j.demo).bullets.length;
  return { i, n, tabs: page.locator('.slide').nth(i).getByRole('tab'), anchor: page.locator('.slide').nth(i).locator('.device-anchor') };
};
const goToSlide = async (page: Page, i: number) => {
  for (let k = 0; k < 12 && Number(await current(page)) < i; k++) { await page.keyboard.press('PageDown'); await settle(page); }
  expect(await current(page)).toBe(String(i));
};

test('story: the arrows go through the achievements before the next screen, and back through them', async ({ page }) => {
  test.slow();   // every step redraws the phones' screen: on a CI machine without a GPU, 30 s is not enough (23/09)
  const { i, n, tabs, anchor } = await story(page);
  await goToSlide(page, i);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  for (let k = 1; k < n; k++) {
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(k)).toHaveAttribute('aria-selected', 'true');
    await expect(anchor).toHaveAttribute('data-step', String(k));   // the phones play this achievement's test
  }
  expect(await current(page)).toBe(String(i));
  await page.keyboard.press('ArrowDown'); await settle(page);
  expect(await current(page)).toBe(String(i + 1));
  await page.keyboard.press('ArrowUp'); await settle(page);   // back: the story resumes at its last achievement
  expect(await current(page)).toBe(String(i));
  await expect(tabs.nth(n - 1)).toHaveAttribute('aria-selected', 'true');
});

test('story: one wheel gesture = one achievement', async ({ page }) => {
  const { i, tabs } = await story(page);
  await goToSlide(page, i);
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 120);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(400);   // a new gesture, not the momentum of the previous one
  await page.mouse.wheel(0, 120);
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  expect(await current(page)).toBe(String(i));
});

test('story cues: "Scroll" until the story first moves, the next experience on its last achievement; the numeral counts', async ({ page }) => {
  const { i, n } = await story(page);
  await goToSlide(page, i);
  const slide = page.locator('.slide').nth(i), d = content('en');
  await expect(slide.locator('.story-cue-scroll')).toHaveCSS('opacity', '1');
  const numeral = slide.locator('.story-step.is-current .story-num'), of = `/${n}`;
  await expect(numeral).toHaveText(`1${of}`);   // the only counter: the big numeral and how many there are
  await page.keyboard.press('ArrowDown');
  await expect(numeral).toHaveText(`2${of}`);
  await expect(slide.locator('.story-cue-scroll')).toHaveCSS('opacity', '0');   // learned: it does not come back
  await expect(slide.locator('.story-cue-next')).toHaveCSS('opacity', '0');
  for (let k = 2; k < n; k++) await page.keyboard.press('ArrowDown');
  const next = d.experience[d.experience.findIndex((j: { demo?: string }) => j.demo) + 1];
  await expect(slide.locator('.story-cue-next')).toHaveCSS('opacity', '1');
  await expect(slide.locator('.story-cue-next')).toContainText(withoutNote(next.client ?? next.role));
});

test('story rail: a tab shows its achievement, the arrows move along the rail, only that achievement is exposed', async ({ page }) => {
  const { i, n, tabs } = await story(page);
  await goToSlide(page, i);
  const shown = page.locator('.slide').nth(i).locator('[role="tabpanel"]:not([inert])');   // the others are inert: out of reach
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(shown).toHaveCount(1);
  await expect(shown).toHaveAttribute('aria-labelledby', (await tabs.nth(2).getAttribute('id'))!);
  await tabs.nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(3)).toBeFocused();
  await page.keyboard.press('End');   // the rail's own End, not the stage's
  await expect(tabs.nth(n - 1)).toBeFocused();
  expect(await current(page)).toBe(String(i));
});

test('screen reader: all the content is exposed, not only the current screen', async ({ page }) => {
  const d = content('en');
  // getByRole ignores whatever is removed from the accessibility tree (visibility:hidden, aria-hidden…)
  for (const j of d.experience) {
    // its heading: the client (its name, or its logo's alt text) and the role held there
    const client = (j.client ?? '').replace(/\s*\(.*\)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const role = withoutNote(j.role).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page.getByRole('heading', { level: 3, name: new RegExp(`(?=.*${client})(?=.*${role})`, 'i') })).toHaveCount(1);
  }
  await expect(page.getByRole('heading', { level: 2, name: d.sections.education })).toHaveCount(1);
  await expect(page.getByRole('link', { name: d.identity.contact.email }).last()).toBeAttached();
});

test('Tab to a link on another screen brings the stage there', async ({ page }) => {
  const n = await slideCount(page);
  await page.locator('footer .footer-statement').focus(); await settle(page);   // the footer's link on a large screen
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
  await expect(page.locator('canvas.devices3d.is-ready')).toBeAttached({ timeout: 15_000 });   // stage mode: the phones' overlay
  await expect(page.locator('canvas.logo3d.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('.mark.is-3d')).toHaveCount(await page.locator('.mark[data-svg]').count(), { timeout: 15_000 });   // the hero's, the top bar's, the experiences'
});

test('"Skip to content": first Tab stop, visible, leads to the first experience', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport({ ratio: 1, timeout: 15_000 });   // its 0.2 s slide-in: much longer on a busy machine
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

test('the indicator: one tick per screen, the current one marked, a click goes there', async ({ page }) => {
  const ticks = page.locator('.pager-tick');
  await expect(ticks).toHaveCount(await slideCount(page));
  await expect(ticks.first()).toHaveAttribute('aria-current', 'true');
  await ticks.nth(2).click(); await settle(page);
  expect(await current(page)).toBe('2');
  await expect(ticks.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.pager-tick[aria-current]')).toHaveCount(1);
});
