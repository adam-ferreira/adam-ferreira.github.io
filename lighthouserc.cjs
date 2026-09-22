// Lighthouse in CI: both pages, three runs each (the median run is kept), with thresholds that block publishing.
// Performance ≥ 90 rather than 100: GitHub runners are slower and noisier than real conditions (measured on the live
// site: 100). Reports stay on the runner (nothing is uploaded to a third-party service).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4322 --ignore-lock',   // --ignore-lock: see playwright.config.ts
      startServerReadyPattern: 'localhost:4322',
      url: ['http://localhost:4322/', 'http://localhost:4322/fr/'],
      numberOfRuns: 3,
      settings: { chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './lighthouse-report' },
  },
};
