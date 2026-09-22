// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://adam-ferreira.github.io',   // a "<name>.github.io" repository: no base path to configure
  build: {
    inlineStylesheets: 'always',   // the stylesheet is inlined in the page: one network round trip less before first paint
  },
  vite: {
    build: { assetsInlineLimit: 0 },   // no file turned into a data: URI — each keeps its own versioned URL, cached separately
  },
});
