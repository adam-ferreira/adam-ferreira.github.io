# CV — Adam Ferreira

Site : https://adam-ferreira.github.io/ (anglais) · https://adam-ferreira.github.io/fr/ (français). Plus de PDF depuis le 21/09/2026 : le CV est l'application web. Les derniers PDF sont archivés dans `~/admin/PRO/01_ADMINISTRATIF/CV/`.

## Architecture

Site statique construit avec **[Astro](https://astro.build) 7** (depuis le 22/09/2026 ; avant : un générateur Python maison). Astro produit du HTML fixe et **n'ajoute aucun JavaScript à lui** : le navigateur ne reçoit que nos scripts (interface, 3D) et Three.js, chargé à la demande.
Choix mesuré sur une page témoin, JavaScript envoyé par le framework seul : Astro 0 ko · SvelteKit 27 ko · Nuxt 55 ko · Next.js 130 ko.

| Dossier / fichier | Rôle |
|---|---|
| `src/content/cv/en.json`, `fr.json` | **Tout le contenu**, une version par langue, même structure. Texte UTF-8, `**gras**` pour les mises en avant. |
| `src/content.config.ts` | Le **schéma** du contenu : un champ manquant, en trop ou mal orthographié arrête la construction avec un message clair. `src/lib/types.ts` en tire les types des composants. |
| `src/pages/index.astro`, `src/pages/fr/index.astro` | Les deux pages (anglais à la racine, français sous `/fr/`), qui appellent la mise en page. |
| `src/layouts/Cv.astro` | La page : `<head>` (métadonnées, langues, préchargement des polices, script qui pose `html.js` et `html.stage` avant l'affichage), les composants, et **le seul point d'entrée des scripts**. |
| `src/components/` | Chaque composant et **son style à côté** : `Topbar`, `Hero`, `Experience` + `Job` (une expérience par écran), `Facts` (formation, langues, intérêts), `Footer`, et trois briques réutilisées — `SectionTitle` (titre géant), `EntryHeader` (numéro, titre, date), `Chips` (pastilles). |
| `src/styles/index.css` | **L'ordre de la cascade**, à un seul endroit : il importe les feuilles dans l'ordre où elles doivent s'appliquer (plusieurs règles de même poids s'arbitrent par leur position). |
| `src/styles/` | Ce qui traverse la page : `base` (polices, couleurs clair / sombre), `layout`, `marks` (Betclic, Accor, LinkedIn), `screens` (grand écran : panneaux, transitions, repère), `stage` (mode scène), `cursor`. |
| `src/scripts/ui/` | L'interface, un module par fonction : `theme` (jour / nuit), `navigation` (repère, mode scène, défilement, Lenis), `brand` (le logo recharge la page), `cursor`, `fps` (`?fps` dans l'adresse). |
| `src/scripts/3d/` | La 3D : `hero` (les deux téléphones qui jouent un test), `logo` (le logo AF), `marks` (marques en volume), `common` (démarrage différé, WebGL, densité d'écran, geste d'invite, reflet), `three-lite` (les seules parties de Three.js utilisées, 153 ko compressés, chargées après la page), `env` (reflets). |
| `src/lib/` | `text.ts` (gras, phrase d'accueil avec les marques `{{betclic}}`), `assets.ts` (adresses et tailles des marques), `types.ts`. |
| `src/assets/` | Polices, photo, logo, modèle 3D, marques SVG, reflets 3D. Publiés sous un nom qui change avec leur contenu. |
| `public/photo.jpg` | L'image de partage (Open Graph), à adresse fixe. |
| `src/pages/tools/linkedin-cover.astro` | La bannière LinkedIn (1584 × 396), non indexée. Export : Chrome headless `--window-size=1584,396 --force-device-scale-factor=2 --screenshot` sur `/tools/linkedin-cover/`. |
| `tests/` | Les tests Playwright (voir plus bas). |
| `.github/workflows/deploy.yml` | Construction, tests, publication. |

**Pourquoi un seul fichier de scripts** plutôt qu'un `<script>` par composant : mesuré, 2 fichiers au chargement (13,1 ko) contre 6 (14,3 ko, certains en cascade). Chaque composant indique en tête les scripts qui le pilotent.

## Modifier le CV

```sh
npm install          # une fois
npm run dev          # http://localhost:4321, rechargé à chaque modification
```

1. Éditer `src/content/cv/en.json` **et** `fr.json` (ou le `.css` du composant concerné pour le style).
2. `npm test` → construit le site et le teste (ordinateur + iPhone).
3. `git push` → GitHub Actions reconstruit, reteste, et **ne publie que si tous les tests passent** (une à trois minutes).

## Tests

`npm test` (ou `npm run test:ui` pour les voir tourner). Ils s'exécutent sur le site **construit**, dans Chromium (ordinateur, 1512 × 830) et WebKit (iPhone 15), et lisent leurs attentes dans les fichiers de contenu :

- les deux langues se chargent sans aucune erreur JavaScript ni console ; tout le texte est déjà dans le HTML ; canonique et `hreflang` justes ;
- **accessibilité** : aucune violation WCAG 2.1 A/AA (axe) ; en mode scène, tout le contenu reste exposé aux lecteurs d'écran ; Tab vers un lien d'un autre écran y emmène la scène ;
- **sans JavaScript**, expériences et titres restent visibles ;
- mode scène : clavier, molette (un geste = un écran), sauts sans écrans qui traversent la fenêtre, logo AF (absent de l'accueil, un clic recharge en haut), 3D prête ;
- iPhone : aucun débordement horizontal, défilement normal.
- **comparaison visuelle** (`tests/visual.spec.ts`, sur le Mac seulement) : 17 captures de référence — les 8 écrans du mode scène en clair, 3 en sombre, 2 en « réduire les animations », les pages entières sur iPhone et sur tablette en paysage. Elle prouve qu'un remaniement ne change rien à l'écran (les pages entières sont capturées avec tout le contenu dévoilé, une capture ne faisant pas défiler) ; après un changement **voulu** : `npx playwright test visual --update-snapshots`.

Les tests de régression ont été vérifiés en réintroduisant chaque défaut corrigé : ils échouent bien.

## Couleur d'accent

Une seule couleur pilote tout : `--accent` (et ses dérivées `--accent-ink`, `--accent-hi`, `--accent-deep`) en tête de `src/styles/base.css`.
Les téléphones 3D, le logo AF en 3D et le curseur la lisent au chargement. Mangue `#FFB627` depuis le 21/09/2026.
Trois choses ne suivent pas automatiquement si on la change : `src/assets/logo.png` (recoloré), `src/assets/marks/linkedin.svg`
(carré à la couleur d'accent) et le `:root` de `src/pages/tools/linkedin-cover.astro`.

## Règles de contenu

- Une puce = point de départ, ce qui coinçait, ce que j'ai fait, ce que ça a changé. Première personne, mots du métier en anglais tels quels.
- Rien qui appartienne à un client : pas de nom interne, d'URL, de ticket, de chiffre de périmètre, ni de nom de projet non public.
- Toute modification de texte se fait dans les **deux** fichiers de contenu, anglais et français.

## Entretien

- Une fonction Three.js ajoutée dans un script 3D → l'ajouter à `src/scripts/3d/three-lite.js` (la construction le prend en compte).
- Un texte qui ajoute un caractère rare → `npm run build && npm run fonts && npm run build` (réduit la police Bricolage aux caractères du site, `tools/subset-fonts.py`, sources dans `tools/fonts-src/`).
- Mesures de référence (22/09/2026, Lighthouse sur le site en ligne, après la migration) : mobile 100 / 100 / 100 / 100, 125 ko et 12 requêtes (139 ko et 14 avant), élément principal 1,4 à 1,6 s ; ordinateur 100 / 100 / 100 / 100, 289 ko et 23 requêtes (308 ko et 25 avant) ; aucun domaine tiers. Juste après une publication, le cache de GitHub Pages est froid : un premier passage peut perdre 1 à 2 points.
