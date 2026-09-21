# CV — Adam Ferreira

Site : https://adam-ferreira.github.io/ — le PDF n'est plus publié (retiré le 21/09/2026) : il se génère en local pour l'envoyer.

## Où se trouve quoi

| Fichier | Rôle |
|---|---|
| `content/cv.fr.json` | **Tout le contenu** : identité, accroche, compétences, expériences (puces), projets, formation, langues. Texte UTF-8, `**gras**` pour les mises en avant. |
| `assets/cv.css` | Le style **écran**, façon Awwwards : cadre fixe, scène d'accueil plein écran, titres de section géants en Humane dévoilés par un masque, expériences en deux colonnes (en-tête accroché), Formation/Langues/Intérêts sur une rangée, pied de page inversé dévoilé sous le contenu, mode nuit. **Intégré dans `index.html` par le build** (un aller-retour de moins au chargement) : on l'édite ici, jamais dans la page. |
| `assets/print.css` | Le style **impression** (`media="print"`) : l'A4 compact d'origine, deux pages. C'est lui qui fait le PDF. |
| `assets/cv.js` | L'interrupteur jour / nuit (préférence dans `localStorage`), la barre du haut, le dévoilement des titres (on observe le **conteneur**, jamais le titre masqué), le nom qui se range dans le cadre, le défilement lissé Lenis (ordinateur seulement). |
| `assets/hero3d.js` | La scène d'accueil : un iPhone et un Android qui jouent le même test (locators, tap, journal). L'écran est dessiné en canvas 2D et posé en texture. |
| `assets/marks3d.js` | Betclic, Accor et LinkedIn (en cube) en volume. Rendu 2,6 fois plus grand que la marque et au-dessus du texte ; au repos, calé au pixel près sur le SVG plat ; recalibré dès que la taille change. |
| `assets/logo3d.js` | Le logo AF de la barre (`assets/logo.glb` + `assets/cubemaps/`), chargé au survol ou quand l'accueil a quitté l'écran. |
| `assets/fonts/` | `Humane-name.woff2` (nom et titres : alphabet latin, accents français, ponctuation — à régénérer avec `pyftsubset` si un titre ajoute un caractère) et `BricolageGrotesque-fr.woff2` (le texte, SIL OFL, sous-ensemble latin). Auto-hébergées : aucune origine tierce à l'écran. |
| `build.py` | Assemble `index.html` depuis le JSON. Python standard, aucune dépendance. |
| `index.html` | **Généré** — ne pas éditer à la main. |
| `dist/` | **Généré en local, ignoré par Git** — le PDF à envoyer. |

## Modifier le CV

1. Éditer `content/cv.fr.json` (ou `assets/cv.css` pour le style).
2. `python3 build.py` → régénère `index.html`. `python3 build.py pdf` fait aussi `dist/cv-adam-ferreira.pdf` en local (Chrome headless, 2 pages A4 attendues).
   ⚠️ Pour une capture « téléphone » en headless, Chrome impose 500 px de large minimum : mettre la page dans un `<iframe>` de 390 px.
   ⚠️ Chrome headless ne déclenche ni défilement ni IntersectionObserver dans une page défilée par script : les titres y restent masqués. Vérifier le défilement dans un vrai navigateur, onglet **visible** (un onglet en arrière-plan suspend aussi le rendu).
3. `git add -A && git commit && git push` → GitHub Pages publie en une à deux minutes.

`python3 build.py` seul régénère uniquement `index.html`. `--lang en` lira `content/cv.en.json` et écrira `en/index.html`.

## Règles de contenu

- Une puce = point de départ, ce qui coinçait, ce que j'ai fait, ce que ça a changé. Première personne, mots du métier en anglais tels quels.
- Rien qui appartienne à un client : pas de nom interne, d'URL, de ticket, de chiffre de périmètre, ni de nom de projet non public.
- L'e-mail n'apparaît qu'à l'impression (`.print-email`) ; en ligne, LinkedIn seul.
