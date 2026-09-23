// Renders the phone scenes of src/pages/tools/device-posters.astro to WebP stills (src/assets/devices/): the hero's,
// each client's in English and in French, the 404's failed test; then the link preview image (public/og-image.jpg).
// Needs a build: npm run build && npm run posters (then build again).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 4330, OUT = new URL('../src/assets/devices/', import.meta.url);
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], { stdio: 'ignore' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 2 })).newPage();
  for (const lang of ['en', 'fr']) {
    for (let i = 0; ; i++) {
      try { await page.goto(`http://localhost:${PORT}/tools/device-posters/?lang=${lang}`, { waitUntil: 'networkidle' }); break; }
      catch (e) { if (i > 40) throw e; await page.waitForTimeout(500); }
    }
    await page.waitForFunction(() => document.querySelectorAll('canvas.hero3d.is-ready').length === 4, null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    for (const name of ['hero', 'betting', 'booking', 'notfound']) {
      if ((name === 'hero' || name === 'notfound') && lang === 'fr') continue;   // no language-dependent text on those
      const png = await page.locator(`canvas[data-name="${name}"]`).screenshot({ omitBackground: true });
      // cropped to the phones (square, a small margin) and re-encoded as WebP by the browser itself
      const webp = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const src = document.createElement('canvas'); src.width = img.width; src.height = img.height;
        const g = src.getContext('2d'); g.drawImage(img, 0, 0);
        const a = g.getImageData(0, 0, img.width, img.height).data;
        let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
        for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
          if (a[(y * img.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        const side = Math.round(Math.max(x1 - x0, y1 - y0) * 1.06), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const out = document.createElement('canvas'); out.width = out.height = side;
        out.getContext('2d').drawImage(src, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);
        return out.toDataURL('image/webp', 0.86).split(',')[1];
      }, png.toString('base64'));
      const file = name === 'hero' || name === 'notfound' ? `${name}.webp` : `${name}-${lang}.webp`;
      writeFileSync(new URL(file, OUT), Buffer.from(webp, 'base64'));
      console.log(`${file}: ${(Buffer.from(webp, 'base64').length / 1024).toFixed(1)} kB`);
    }
  }
  // the link preview image, which shows the hero's still: 1200 × 630, JPEG (the format every platform accepts)
  const og = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  await og.goto(`http://localhost:${PORT}/tools/og-image/`, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  const jpg = await og.screenshot({ type: 'jpeg', quality: 86 });
  writeFileSync(new URL('../public/og-image.jpg', import.meta.url), jpg);
  console.log(`og-image.jpg: ${(jpg.length / 1024).toFixed(1)} kB`);
} finally {
  await browser.close();
  server.kill();
}
