import { test, expect, type Page } from '@playwright/test';
import { settle } from './helpers';

// Comparaison visuelle : prouve qu'un remaniement ne change rien à l'écran. Les captures de référence sont prises sur
// le Mac (fichiers *-darwin.png) ; le rendu des polices diffère sous Linux, donc ce test ne tourne pas en CI.
// Refaire les références après un changement VOULU : npx playwright test visual --update-snapshots
test.skip(!!process.env.CI, 'captures de référence propres au Mac');

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

test.describe('iPhone, page entière', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'iphone'); });
  for (const [lang, path] of [['en', '/'], ['fr', '/fr/']] as const) {
    test(`${lang}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(path);
      await still(page);
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot(`iphone-${lang}.png`, { ...opts, fullPage: true });
    });
  }
});
