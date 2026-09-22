import { test, expect } from '@playwright/test';

// Le curseur et le compteur ?fps : ordinateur à la souris seulement.
test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'souris seulement'); });

test('curseur : suit la souris, gonfle au survol d\'un lien, puis s\'arrête', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(300, 300);
  await expect(page.locator('html')).toHaveClass(/has-cursor/);
  const dot = page.locator('.cursor');
  await page.mouse.move(420, 380, { steps: 5 });
  // arrivée sur la souris, puis plus d'étirement (scale 1, 1) : la boucle s'est arrêtée (le navigateur réécrit la valeur à sa façon)
  await expect.poll(() => dot.evaluate((d) => (d as HTMLElement).style.transform)).toMatch(/translate3d\(420px, 380px, 0px\).*scale\(1, 1\)/);
  await page.locator('.contact-link').first().hover();
  await expect(dot).toHaveClass(/is-hot/);
});

test('?fps : le compteur s\'affiche', async ({ page }) => {
  await page.goto('/?fps');
  await expect(page.getByText(/^FPS \d+/)).toBeVisible();
});
