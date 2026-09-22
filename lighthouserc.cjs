// Lighthouse en CI : les deux pages, trois passages chacune (on garde la médiane), avec des seuils qui bloquent la
// publication. Performance ≥ 90 et non 100 : les machines de GitHub sont plus lentes et plus variables que le réel
// (mesuré sur le site en ligne : 100). Les rapports restent sur la machine (aucun envoi à un service tiers).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4322 --ignore-lock',   // --ignore-lock : voir playwright.config.ts
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
