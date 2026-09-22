import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { PAGES, settle } from './helpers';

// Visual comparison: proves that a refactor changes nothing on screen. One set of baselines per OS, since font rendering
// differs: *-darwin.png (the Mac) and *-linux.png (CI, Ubuntu 24.04).
// After an INTENDED change of appearance: on the Mac, npx playwright test visual --update-snapshots; for Linux, run the
// "Visual baselines (Linux)" workflow and commit its artifact.
// In CI, the test runs once the Linux baselines exist (or when VISUAL_IN_CI is set, to create them).
const linuxRefs = existsSync(new URL('./visual.spec.ts-snapshots/scene-light-0-desktop-linux.png', import.meta.url));
test.skip(!!process.env.CI && !process.env.VISUAL_IN_CI && !linuxRefs, 'no Linux baselines yet');

// The 3D is always moving: it is switched off (no WebGL ⇒ logos stay as images); it is tested elsewhere.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error: the method is replaced for the duration of the test
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); };
  });
});
const opts = { animations: 'disabled' as const, maxDiffPixels: 100 };
// Without CSS transitions or animations: the final layout state is compared. (With them, text sitting on a sub-pixel —
// the Betclic screen is centred at y = 167.27 px — was drawn half a pixel higher or lower depending on when the browser
// finished its animations: 1 % of pixels "different" without any real change.)
const still = (page: Page) => page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
const goToSlide = async (page: Page, k: number) => {
  await page.evaluate((i) => (document.querySelectorAll('.pager-tick')[i] as HTMLElement).click(), k);
  await settle(page);
  await page.waitForTimeout(300);
};

test.describe('desktop, stage mode', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop'); });
  for (const scheme of ['light', 'dark'] as const) {
    test(`every screen, ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await still(page);
      await page.waitForTimeout(800);
      const n = await page.locator('.slide').count();
      for (let k = 0; k < n; k++) {
        if (scheme === 'dark' && ![0, 2, n - 1].includes(k)) continue;   // in dark: home, one experience, footer
        if (k > 0) await goToSlide(page, k);
        await expect(page).toHaveScreenshot(`scene-${scheme}-${k}.png`, opts);
      }
    });
  }
});

test('desktop, reduced motion', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await still(page);
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('reduced-motion-0.png', opts);
  await goToSlide(page, 2);
  await expect(page).toHaveScreenshot('reduced-motion-2.png', opts);
});

test.describe('iPhone and tablet, full page', () => {
  test.beforeEach(({}, info) => { test.skip(!['iphone', 'tablet'].includes(info.project.name)); });
  for (const { lang, path } of PAGES) {
    test(`${lang}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(path);
      await still(page);
      // A full-page screenshot does not scroll: the final state of whatever appears on scroll is forced.
      // Through a CSS rule rather than by setting is-active: scroll.js removes is-active from off-screen panels at an
      // unpredictable moment.
      await page.addStyleTag({ content: 'html.js .reveal, html.js .section-title { opacity: 1 !important; transform: none !important; }' });
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot(`page-${lang}.png`, { ...opts, fullPage: true });
    });
  }
});
