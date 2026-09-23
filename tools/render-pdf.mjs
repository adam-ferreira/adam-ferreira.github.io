// Exports the detailed CV page (src/layouts/CvPage.astro) to PDF, one per language, as the last step of `npm run build`:
// the PDF is printed from the page just built, so it can never say something else. Each page names its own PDF (its
// download link), and the file is written there in dist/. The built files are handed to the browser straight from
// dist/, without a server.
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url), ORIGIN = 'http://cv.local';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const pages = readdirSync(DIST, { recursive: true }).map(String).filter((f) => /(^|\/)cv\/index\.html$/.test(f)).map((f) => f.replace(/index\.html$/, ''));
if (!pages.length) throw new Error('no CV page in dist/: run astro build first');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route(`${ORIGIN}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
    if (path === '' || path.endsWith('/')) path += 'index.html';
    const file = new URL(path, DIST);
    try { if (statSync(file).isFile()) return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(path)] ?? 'application/octet-stream' }); }
    catch { /* not built: answered below */ }
    return route.fulfill({ status: 404 });
  });
  for (const p of pages) {
    await page.goto(`${ORIGIN}/${p}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const href = await page.locator('a[download]').getAttribute('href');
    if (!href?.startsWith('/')) throw new Error(`${p}: no PDF link`);
    const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    writeFileSync(new URL(href.slice(1), DIST), pdf);
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    console.log(`${href}: ${(pdf.length / 1024).toFixed(0)} kB, ${pageCount} page${pageCount > 1 ? 's' : ''}`);
  }
} finally {
  await browser.close();
}
