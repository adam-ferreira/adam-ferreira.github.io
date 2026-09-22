import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { settle } from './helpers';

// Comparaison visuelle : prouve qu'un remaniement ne change rien à l'écran. Une série de références par système, le rendu
// des polices différant : *-darwin.png (le Mac) et *-linux.png (la CI, Ubuntu 24.04).
// Après un changement d'apparence VOULU : sur le Mac, npx playwright test visual --update-snapshots ; pour Linux, le
// workflow « Captures de référence (Linux) », dont on committe l'artefact.
// En CI, le test attend que les références Linux existent (VISUAL_IN_CI ou présence des fichiers).
const linuxRefs = existsSync(new URL('./visual.spec.ts-snapshots/scene-light-0-desktop-linux.png', import.meta.url));
test.skip(!!process.env.CI && !process.env.VISUAL_IN_CI && !linuxRefs, 'pas encore de références Linux');

// La 3D bouge en permanence : on la coupe (WebGL indisponible ⇒ les logos restent en image), elle est testée ailleurs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error : on remplace la méthode pour la durée du test
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); };
  });
});
const opts = { animations: 'disabled' as const, maxDiffPixels: 100 };
// Sans transitions ni animations CSS : on compare l'état final de la mise en page. (Avec elles, un texte posé sur un
// sous-pixel — l'écran Betclic est centré à y = 167,27 px — était dessiné un demi-pixel plus haut ou plus bas selon
// l'instant où le navigateur finissait ses animations : 1 % de pixels « différents » sans aucun changement réel.)
const still = (page: Page) => page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
const goToSlide = async (page: Page, k: number) => {
  await page.evaluate((i) => (document.querySelectorAll('.pager-tick')[i] as HTMLElement).click(), k);
  await settle(page);
  await page.waitForTimeout(300);
};

test.describe('ordinateur, mode scène', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop'); });
  for (const scheme of ['light', 'dark'] as const) {
    test(`chaque écran, thème ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await still(page);
      await page.waitForTimeout(800);
      const n = await page.locator('.slide').count();
      for (let k = 0; k < n; k++) {
        if (scheme === 'dark' && ![0, 2, n - 1].includes(k)) continue;   // en sombre : accueil, une expérience, pied de page
        if (k > 0) await goToSlide(page, k);
        await expect(page).toHaveScreenshot(`scene-${scheme}-${k}.png`, opts);
      }
    });
  }
});

test('ordinateur, « réduire les animations »', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await still(page);
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('reduit-0.png', opts);
  await goToSlide(page, 2);
  await expect(page).toHaveScreenshot('reduit-2.png', opts);
});

test.describe('iPhone et tablette, page entière', () => {
  test.beforeEach(({}, info) => { test.skip(!['iphone', 'tablette'].includes(info.project.name)); });
  for (const [lang, path] of [['en', '/'], ['fr', '/fr/']] as const) {
    test(`${lang}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(path);
      await still(page);
      // Une capture « page entière » ne fait pas défiler : on impose l'état final de ce qui apparaît au fil du défilement.
      // Par une règle CSS et non en posant is-active : cv.js retire is-active aux écrans hors champ, à un instant variable.
      await page.addStyleTag({ content: `
        html.js .job .job-header, html.js .job .job-intro, html.js .job .sub-title, html.js .job .sub-intro, html.js .job .bullets li,
        html.js .job .stack, html.js .chapter .skills-row, html.js .facts .section > *, html.js .section-title { opacity: 1 !important; transform: none !important; }` });
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot(`page-${lang}.png`, { ...opts, fullPage: true });
    });
  }
});
