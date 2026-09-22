import { defineConfig, devices } from '@playwright/test';

// Les tests tournent contre le site construit (npm run build, puis astro preview) : exactement ce qui sera publié.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  webServer: {
    // --ignore-lock : Astro 7 tient un verrou des serveurs de prévisualisation ; sans lui, un serveur resté ouvert (Lighthouse,
    // une session précédente) empêche celui des tests de démarrer
    command: 'npm run build && npm run preview -- --port 4321 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // ordinateur à la souris : mode scène, 3D
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1512, height: 830 } } },
    // iPhone (WebKit, le moteur de Safari) : défilement normal, écran étroit
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    // tablette en paysage : grand écran sans souris, donc sans mode scène — seulement pour la comparaison visuelle
    { name: 'tablette', use: { ...devices['iPad Pro 11 landscape'] }, testMatch: /visual\.spec\.ts/ },
  ],
});
