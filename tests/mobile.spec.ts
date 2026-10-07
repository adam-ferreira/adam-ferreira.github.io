import { test, expect, type Page } from '@playwright/test';
import { PAGES, content, withoutNote } from './helpers';

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

// ---------- full-screen views (src/styles/phone.css): the page snaps from one to the next, each one a screen tall ----------
/** The page's own snap points, in document order (the cards snap sideways inside their list: not these). Each view runs
 *  to the next snap point; `lowest` is the bottom edge of whatever the view holds, which must not pass that point. */
const views = (page: Page) => page.evaluate(() => {
  const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  const inner = (el: Element) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/auto|scroll/.test(o.overflowX + o.overflowY)) return true; } return false; };
  // layout positions (offsetTop), not painted ones: a block waiting for its entrance sits 26 px lower (transform) until it is in view
  const topOf = (el: HTMLElement) => { let y = 0; for (let e: Element | null = el; e instanceof HTMLElement; e = e.offsetParent) y += e.offsetTop; return y; };
  const snaps = [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((el) => getComputedStyle(el).scrollSnapAlign.startsWith('start') && !inner(el))
    .map((el) => ({ el, top: topOf(el) }))
    .sort((a, b) => a.top - b.top);
  const end = document.documentElement.scrollHeight;
  return {
    screen: innerHeight - topbar,
    list: snaps.map(({ el, top }, i) => {
      // the first view of an experience with a demo starts at its header: its content is the whole experience but the
      // achievements, which are the next view
      const head = el.classList.contains('spotlight');
      const scope = head ? el.parentElement! : el;
      let lowest = top;
      for (const d of scope.querySelectorAll<HTMLElement>('*')) {
        if (d.closest('.story-steps') || (head && d.closest('.job-main')) || !d.offsetHeight) continue;
        lowest = Math.max(lowest, topOf(d) + d.offsetHeight);
      }
      return { label: `${el.className.split(' ')[0]} ${el.dataset.label ?? ''}`.trim(), top, height: (snaps[i + 1]?.top ?? end) - top, lowest, stop: getComputedStyle(el).scrollSnapStop };
    }),
  };
});

for (const { lang, path } of PAGES) {
  test(`${lang}: full-screen views — the page snaps, every view is one screen tall, nothing spills past its view`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'y mandatory');
    await expect(page.locator('.scroll-hint')).toBeVisible();   // the home view keeps its "Scroll" hint
    const jobs = content(lang).experience as { demo?: string }[];
    const { screen, list } = await views(page);
    // home · each experience with a demo on two views · each short one on its own · education, languages, interests · contact
    expect(list.map((v) => v.label)).toHaveLength(1 + 2 * jobs.filter((j) => j.demo).length + jobs.filter((j) => !j.demo).length + 2);
    for (const v of list) {
      expect(Math.abs(v.height - screen), `${v.label}: ${v.height} px tall for a ${screen} px screen`).toBeLessThanOrEqual(2);
      expect(v.lowest, `${v.label}: its content ends ${v.lowest - v.top - v.height} px past its view`).toBeLessThanOrEqual(v.top + v.height + 1);
      expect(v.stop, `${v.label}: a flick must not skip it`).toBe('always');
    }
  });
}

test('full-screen views: a scroll that stops between two views lands on one of them', async ({ page }) => {
  await page.goto('/');
  const { screen } = await views(page);
  const scrollY = () => page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 150));
  await expect.poll(scrollY).toBe(0);
  await page.evaluate((y) => window.scrollTo(0, y), screen * 0.7);
  await expect.poll(async () => Math.abs((await scrollY()) - screen)).toBeLessThanOrEqual(2);
});

test('full-screen views: the indicator lists the screens, follows the scroll, and a tap goes to a screen', async ({ page }) => {
  await page.goto('/fr/');
  const ticks = page.locator('.pager-tick');
  await expect(page.locator('.pager')).toBeVisible();
  await expect(ticks).toHaveCount(await page.locator('.slide').count());
  await expect(ticks.first()).toHaveAttribute('aria-current', 'true');
  // a raw tap at the tick's centre: locator.tap() first scrolls "into view", which, on a fixed element over a snapping
  // page, moves the page by a whole view and loses the tap (WebKit emulation)
  const tap = async (k: number) => { const b = (await ticks.nth(k).boundingBox())!; await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const scrollY = () => page.evaluate(() => window.scrollY);
  const { screen } = await views(page);
  await tap(1);
  await expect.poll(async () => Math.abs((await scrollY()) - screen)).toBeLessThanOrEqual(2);   // the first experience: the second view
  const accor = page.locator('.job-demo').nth(1);
  await accor.scrollIntoViewIfNeeded();
  await expect(page.locator('.pager-tick[aria-current="true"]')).toHaveAttribute('aria-label', (await accor.getAttribute('data-label'))!);
  // the page must be at rest, and for a moment: a finger landing while it settles on its view, or just after, stops the
  // scroll instead of tapping (measured: 200 ms after it came to rest the tap was still lost, 400 ms was enough)
  await expect.poll(async () => { const y = await scrollY(); await page.waitForTimeout(100); return y === await scrollY(); }).toBe(true);
  await page.waitForTimeout(500);
  await tap(0);
  await expect.poll(scrollY).toBe(0);
});

test('full-screen views: the achievements of an experience say what comes next', async ({ page }) => {
  await page.goto('/fr/');
  const d = content('fr');
  const demos = (d.experience as { demo?: string; client: string }[]).map((j, i) => ({ j, i })).filter(({ j }) => j.demo);
  const cues = page.locator('.job-demo .story-cue-next');
  await expect(cues).toHaveCount(demos.length);
  for (const [k, { i }] of demos.entries()) {
    await cues.nth(k).scrollIntoViewIfNeeded();
    await expect(cues.nth(k)).toBeVisible();
    await expect(cues.nth(k)).toContainText(withoutNote(d.experience[i + 1].client));
  }
});

test.describe('a short screen (iPhone SE, with the browser bars out)', () => {
  test.use({ viewport: { width: 375, height: 553 } });
  test('no view would fit: the page keeps its normal flow, nothing snaps', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none');
    expect((await views(page)).list).toHaveLength(0);
    await expect(page.locator('.pager')).toBeHidden();
  });
});
