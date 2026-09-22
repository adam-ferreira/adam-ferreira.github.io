import { defineConfig, devices } from '@playwright/test';

// Tests run against the built site (npm run build, then astro preview): exactly what will be published.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  webServer: {
    // --ignore-lock: Astro 7 keeps a lock file of preview servers; without this flag, a server left running (Lighthouse,
    // a previous session) prevents the test server from starting
    command: 'npm run build && npm run preview -- --port 4321 --ignore-lock',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // desktop with a mouse: stage mode, 3D
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1512, height: 830 } } },
    // iPhone (WebKit, Safari's engine): normal scrolling, narrow screen
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    // tablet in landscape: a large screen without a mouse, hence no stage mode — visual comparison only
    { name: 'tablet', use: { ...devices['iPad Pro 11 landscape'] }, testMatch: /visual\.spec\.ts/ },
  ],
});
