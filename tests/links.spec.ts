import { test, expect } from '@playwright/test';
import { PAGES, content } from './helpers';

// No broken link: every internal address of both pages (links, images, icons, fonts, scripts) responds, and external
// links are well formed. LinkedIn is not called: it answers "999" to bots, which would make the test random.
test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'device-independent'); });

for (const { lang, path } of PAGES) {
  test(`${lang}: no broken link`, async ({ page, request, baseURL }) => {
    await page.goto(path);
    const urls = await page.evaluate(() => {
      const out = new Set<string>();
      document.querySelectorAll('a[href], link[href], img[src], script[src], source[srcset], img[srcset], [data-svg]').forEach((el) => {
        for (const attr of ['href', 'src', 'data-svg']) { const v = el.getAttribute(attr); if (v) out.add(v); }
        const ss = el.getAttribute('srcset'); if (ss) ss.split(',').forEach((c) => out.add(c.trim().split(/\s+/)[0]));
      });
      return [...out];
    });
    const d = content(lang);
    const internal = urls.filter((u) => u.startsWith('/') || u.startsWith(baseURL!));
    expect(internal.length).toBeGreaterThan(10);
    for (const u of internal) expect((await request.get(u)).status(), u).toBe(200);
    const external = urls.filter((u) => /^[a-z]+:/i.test(u) && !u.startsWith(baseURL!));
    for (const u of external) {
      if (u.startsWith('mailto:')) expect(u).toBe(`mailto:${d.identity.contact.email}`);
      else if (u.startsWith('tel:')) expect(u).toBe(`tel:${d.identity.contact.phone_href}`);
      else expect(u, 'unexpected external link').toMatch(/^https:\/\/(adam-ferreira\.github\.io|(www\.)?linkedin\.com)\//);
    }
  });
}
