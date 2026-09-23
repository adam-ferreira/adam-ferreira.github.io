# CV — Adam Ferreira

Site: https://adam-ferreira.github.io/ (English) · https://adam-ferreira.github.io/fr/ (French). No PDF since 21/09/2026: the CV is the web app.

**Everything in this repository is written in English** — code, comments, tests, CI, commit messages. The only French is the French CV itself (`src/content/cv/fr.json`) and the French labels shown on the French page.

## Architecture

Static site built with **[Astro](https://astro.build) 7** (since 22/09/2026; before that, a home-made Python generator). Astro outputs plain HTML and **adds no JavaScript of its own**: the browser only receives our scripts (UI, 3D) and Three.js, loaded on demand.
The choice was measured on a test page, JavaScript shipped by the framework alone: Astro 0 kB · SvelteKit 27 kB · Nuxt 55 kB · Next.js 130 kB.

| Folder / file | Role |
|---|---|
| `src/content/cv/en.json`, `fr.json` | **All the content**, one version per language, same structure. UTF-8 text, `**bold**` for emphasis. |
| `src/content.config.ts` | The content **schema**: a missing, extra or misspelled field stops the build with a clear message. `src/lib/types.ts` derives the component types from it. |
| `src/pages/index.astro`, `src/pages/fr/index.astro` | The two pages (English at the root, French under `/fr/`), which call the layout. |
| `src/layouts/Cv.astro` | The page: assembles the components and is **the single entry point of the scripts**. |
| `src/components/` | Each component with **its style next to it** (`X.css`), and its script when it is its own (`X.js`): `BaseHead` (what every page puts in its head: security policy, fonts, icon, and the script that sets `html.js`, the remembered theme and `html.stage` before first paint), `Head` (the CV's own metadata and languages), `Topbar` (+ `Topbar.js`: the logo reloads the page), `ThemeToggle` (+ `.css`, `.js`), `Hero` with `HeroLine` and `HeroWord` (the hero sentence, word by word), `Mark` (Betclic, Accor, LinkedIn: draws its images and carries its dark colours), `Experience` + `Job`, `Facts`, `Footer`, and the building blocks `Section` (a section and its giant title), `SectionTitle`, `EntryHeader` (`.entry-*`: an experience or a degree), `PillLink`, `Chips`. |
| `src/styles/index.css` | **The cascade order**, in one place: it imports the stylesheets in the order they must apply (several rules of equal weight are decided by their position). |
| `src/styles/` | What spans the whole page: `base` (fonts, light / dark colours, the shared measurements `--topbar-h`, `--gutter` and the two easing curves), `layout`, `screens` (large screens: panels, transitions, progress indicator), `stage` (stage mode), `cursor`. |
| `src/scripts/ui/` | Page-wide behaviour: `pager` (the screens and their progress indicator), `stage` (one screen at a time, on a computer), `scroll` (normal scrolling, reveals, Lenis), `cursor`, `fps` (`?fps` in the URL). The indicator, the cursor and the meter are created by JavaScript on purpose: without it they would be useless. `sound` (the sound switch, off by default: sounds synthesised with Web Audio, triggered by a `cv:sound` event from the other scripts), `magnetic` (buttons that lean towards the mouse). |
| `src/scripts/media.js`, `theme.js` | The media queries shared by the scripts and the stylesheet, and the key the chosen theme is remembered under. Plain constants: `BaseHead` reads them at build time to write the inline boot script. |
| `src/scripts/3d/` | The 3D: `hero` (the two phones running a test) with `hero-screen` (the 2D mock-up drawn on their screens), `logo` (the AF logo), `marks` (marks in relief), `common` (lazy start, WebGL, pixel density, grab and throw, visibility, frame rate, hint gesture, shine, materials, lost graphics context), `three-lite` (the only Three.js parts used — 166 kB compressed, loaded after the page), `env` (reflections). |
| `src/lib/` | `text.ts` (bold, plain text, splitting the hero sentence with its `{{betclic}}` marks), `assets.ts` (mark URLs, sizes and dark variant), `types.ts` (types from the schema), `i18n.ts` (the two languages, their paths and locales), `csp.ts` (the security policy), `updated.ts` (date of the last content change). |
| `src/assets/` | Fonts, photo, logo, 3D model, SVG marks, 3D reflections. Published under a name that changes with their content. |
| `public/photo.jpg`, `public/robots.txt` | The sharing image (Open Graph, 800 × 800) and the instructions for search engines. |
| `src/pages/sitemap.xml.ts`, `src/pages/404.astro` | The sitemap (both languages, with their date) and the page for unknown addresses (bilingual, texts from the JSON files; it loads only the three stylesheets it uses). |
| `src/pages/tools/linkedin-cover.astro` | The LinkedIn banner (1584 × 396), not indexed, built from the site's base stylesheet in its dark theme. Export: headless Chrome `--window-size=1584,396 --force-device-scale-factor=2 --screenshot` on `/tools/linkedin-cover/`. |
| `src/pages/tools/device-posters.astro`, `src/pages/tools/og-image.astro`, `tools/render-posters.mjs` | The phone scenes as still images (`src/assets/devices/`), shown where the 3D does not run (phones, touch tablets) and on the 404 page (a failed test): the hero's test, each client's in English and in French, the 404's. Then the link preview image (`public/og-image.jpg`, 1200 × 630). After a change to the phones or their screens: `npm run build && npm run posters`, then build again. |
| `tests/` | The Playwright tests (see below). |
| `.github/` | CI (`deploy.yml`), Linux visual baselines (`visual-baselines.yml`), Dependabot. |

**Why a single script file** rather than one `<script>` per component: measured, 2 files on load (13.1 kB) versus 6 (14.3 kB, some chained). Each component names the scripts that drive it in its header.

## Editing the CV

```sh
npm install          # once
npm run dev          # http://localhost:4321, reloaded on every change
```

1. Edit `src/content/cv/en.json` **and** `fr.json` (or the component's `.css` for styling).
2. `npm run check && npm test` → type check, then build and test the site (desktop + iPhone + visual comparison).
3. `git push` → GitHub Actions checks, builds, tests, runs Lighthouse, and **publishes only if everything passes** (about four minutes).

## Tests and CI

`npm test` (or `npm run test:ui` to watch them run). They run against the **built** site, in Chromium (desktop, 1512 × 830) and WebKit (iPhone 15, iPad in landscape for the visual comparison), and read their expectations from the content files:

- both languages load without any JavaScript or console error; all the text is already in the HTML; canonical and `hreflang` are right; title, `Person` card, CSP, `robots.txt`, sitemap and 404 page;
- **accessibility**: no WCAG 2.1 A/AA violation (axe); in stage mode, all the content stays exposed to screen readers; "Skip to content" first; Tab to a link on another screen brings the stage there;
- **without JavaScript**, experiences and titles stay visible, and the Accor mark still turns light on a dark system;
- **light / dark**: the remembered theme applies before the first paint (checked with the page scripts blocked), and the two dark blocks of `base.css` give the same palette, whether it comes from the system or from the switch;
- the LinkedIn mark of the top bar is a 40 × 40 square filled by its image;
- stage mode: keyboard, wheel (one gesture = one screen), jumps without screens crossing the window, AF logo (hidden on the home screen, a click reloads at the top), 3D ready, lost graphics context falls back to images;
- cursor and `?fps` meter; iPhone: no horizontal overflow, normal scrolling; **no broken link**;
- **visual comparison** (`tests/visual.spec.ts`): 17 baselines per OS (`-darwin` on the Mac, `-linux` in CI) — the 8 stage screens in light, 3 in dark, 2 in reduced motion, the full pages on iPhone and on a tablet in landscape. It proves a refactor changes nothing on screen. After an **intended** change: `npx playwright test visual --update-snapshots` on the Mac, and the **Visual baselines (Linux)** workflow for CI (commit its artifact).

Regression tests were verified by reintroducing each fixed bug: they do fail.

CI (`.github/workflows/deploy.yml`, Ubuntu 24.04): type check (`astro check`) → tests → **Lighthouse** (both pages, three runs; fails below 100 for accessibility, best practices and SEO, or 90 for performance) → build → deploy. **Dependabot** proposes grouped updates every Monday, each one going through the same CI.

## SEO, security, accessibility

- **Head**: descriptive title, `Person` card (schema.org: name, job, email, LinkedIn), full sharing preview, languages (canonical, `hreflang`).
- **"Updated {date}"**: the date of the last commit touching `src/content/cv/` (`src/lib/updated.ts`); CI fetches the full history to know it.
- **Content Security Policy** (`src/lib/csp.ts`), in production, on the CV pages and on the 404: nothing comes from anywhere but the site; the only script written in the page (the one that sets `html.js`, the remembered theme and `html.stage`) is allowed by its hash, computed at build time.
- **Keyboard**: "Skip to content" as the first Tab stop; the progress indicator comes right after the top bar; Tab to another screen brings the stage there.
- **3D**: if the browser takes the GPU away (tab put to sleep on a phone), every object falls back to its flat version.

## Accent colour

One colour drives everything: `--accent` (and its variants `--accent-ink`, `--accent-hi`, `--accent-deep`) at the top of `src/styles/base.css`.
The 3D phones, the 3D AF logo and the cursor read it on load. Mango `#FFB627` since 21/09/2026.
Two things do not follow automatically if it changes: `src/assets/logo.png` (recoloured) and `src/assets/marks/linkedin.svg`
(accent-coloured square, with its `linkedin-dark.svg` variant).

## Content rules

- One bullet = starting point, what was stuck, what I did, what it changed. First person, trade terms in English as they are.
- A brand mark = an SVG in `src/assets/marks/`, an entry in `identity.marks` (its `alt`, and `dark_map` for the colours that change in dark mode) and, if it needs one, a `<name>-dark.svg` next to it for its flat image.
- Nothing that belongs to a client: no internal name, URL, ticket, scope figure or non-public project name.
- Every text change is made in **both** content files, English and French.

## Maintenance

- A Three.js class used in a 3D script → add it to `src/scripts/3d/three-lite.js` (the build picks it up).
- Text that adds a rare character → `npm run build && npm run fonts && npm run build` (subsets the Bricolage font to the site's characters, `tools/subset-fonts.py`, sources in `tools/fonts-src/`).
- **Humane font** (giant titles): "Humane V2.0" by Rajesh Rajput ([source](https://rajputrajesh-448.gumroad.com/l/HUMANE)), free for personal and commercial use; its licence (embedded in the file) forbids **modifying** it without his written permission. So the site serves **the author's original file, untouched** (`src/assets/fonts/Humane.ttf`, 85 kB, about 40 kB compressed): no subsetting, no conversion to WOFF2 — `tools/subset-fonts.py` never touches it.
- Reference measurements (22/09/2026, Lighthouse on the live site): mobile 100 / 100 / 100 / 100, 125 kB and 12 requests; desktop 100 / 100 / 100 / 100, 289 kB and 23 requests; no third-party domain. Right after a deployment the GitHub Pages cache is cold: a first run can lose 1 or 2 points.
