import { test, expect, type Page } from '@playwright/test';
import { content, plain, settle } from './helpers';

// Mode scène : ordinateur à la souris, fenêtre d'au moins 1100 × 680.
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mode scène : ordinateur seulement');
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/stage/);
});

const slideCount = (page: Page) => page.locator('.slide').count();
const current = (page: Page) => page.evaluate(() => document.documentElement.dataset.slide);

test('clavier : flèche bas, Fin et Début changent d\'écran', async ({ page }) => {
  const n = await slideCount(page);
  await page.keyboard.press('ArrowDown'); await settle(page);
  expect(await current(page)).toBe('1');
  await page.keyboard.press('End'); await settle(page);
  expect(await current(page)).toBe(String(n - 1));
  await page.keyboard.press('Home'); await settle(page);
  expect(await current(page)).toBe('0');
});

test('molette : un geste = un écran', async ({ page }) => {
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 120); await settle(page);
  expect(await current(page)).toBe('1');
});

test('lecteur d\'écran : tout le contenu est exposé, pas seulement l\'écran affiché', async ({ page }) => {
  const d = content('en');
  // getByRole ignore ce qui est retiré de l'arbre d'accessibilité (visibility:hidden, aria-hidden…)
  for (const j of d.experience) {
    await expect(page.getByRole('heading', { level: 3, name: plain(j.role), exact: false })).toHaveCount(1);
  }
  await expect(page.getByRole('heading', { level: 2, name: d.sections.education })).toHaveCount(1);
  await expect(page.getByRole('link', { name: d.identity.contact.email }).last()).toBeAttached();
});

test('Tab vers un lien d\'un autre écran y emmène la scène', async ({ page }) => {
  const n = await slideCount(page);
  await page.locator('footer .nocase').focus(); await settle(page);
  expect(await current(page)).toBe(String(n - 1));
  await expect(page.locator('footer.slide')).toHaveClass(/is-current/);
});

test('un saut (Fin, puis Début) ne fait pas traverser la fenêtre aux écrans intermédiaires', async ({ page }) => {
  // écrans du milieu en cours d'animation, juste après le départ d'un saut
  const crossing = () => page.evaluate(() => [...document.querySelectorAll('.slide')].slice(1, -1)
    .filter((s) => s.getAnimations().length > 0).length);
  await page.keyboard.press('End');
  await page.waitForTimeout(80);
  expect(await crossing()).toBe(0);
  await settle(page);
  await page.keyboard.press('Home');   // le cas délicat : les écrans rangés au-dessus repartent en dessous
  await page.waitForTimeout(80);
  expect(await crossing()).toBe(0);
  await settle(page);
});

test('logo AF : absent de l\'accueil, présent ensuite ; un clic recharge la page en haut', async ({ page }) => {
  const brand = page.locator('a.brand');
  await expect(brand).toBeHidden();
  await page.keyboard.press('ArrowDown'); await settle(page);
  await expect(brand).toBeVisible();
  await page.evaluate(() => { (window as any).__avant = 1; });
  await brand.click();
  await page.waitForLoadState('load');
  expect(await page.evaluate(() => (window as any).__avant)).toBeUndefined();   // c'est bien un rechargement
  expect(await current(page)).toBe('0');
});

test('3D : téléphones, logo AF et marques prêts', async ({ page }) => {
  await expect(page.locator('canvas.hero3d.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('canvas.logo3d.is-ready')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('.mark.is-3d')).toHaveCount(3, { timeout: 15_000 });
});

test('« Aller au contenu » : premier arrêt de Tab, visible, et mène à l\'écran Experience', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport({ ratio: 1 });   // attend la fin de son apparition (0,2 s) : entièrement visible
  await page.keyboard.press('Enter'); await settle(page);
  expect(await current(page)).toBe('1');
});

test('carte graphique perdue : la marque revient à son image', async ({ page }) => {
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
