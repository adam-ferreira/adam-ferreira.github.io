# CV — Adam Ferreira

Site : https://adam-ferreira.github.io/ (anglais) · https://adam-ferreira.github.io/fr/ (français). Plus de PDF depuis le 21/09/2026 : le CV est l'application web. Les derniers PDF sont archivés dans `~/admin/PRO/01_ADMINISTRATIF/CV/`.

## Où se trouve quoi

| Fichier | Rôle |
|---|---|
| `content/cv.en.json`, `content/cv.fr.json` | **Tout le contenu**, une version par langue, même structure : identité, accroche, compétences, expériences (puces), projets, formation, langues. Texte UTF-8, `**gras**` pour les mises en avant. |
| `assets/cv.css` | Le style **écran**, façon Awwwards : cadre fixe, scène d'accueil plein écran, titres de section géants en Humane dévoilés par un masque, expériences en deux colonnes (en-tête accroché), Formation/Langues/Intérêts sur une rangée, pied de page inversé dévoilé sous le contenu, mode nuit. **Intégré dans `index.html` par le build** (un aller-retour de moins au chargement) : on l'édite ici, jamais dans la page. |
| `assets/cv.js` | L'interrupteur jour / nuit (préférence dans `localStorage`), la barre du haut, le dévoilement des titres (on observe le **conteneur**, jamais le titre masqué), le nom qui se range dans le cadre, le défilement lissé Lenis et le curseur en bille 3D (ordinateur avec souris seulement, jamais sous « réduire les animations »). |
| `assets/hero3d.js` | La scène d'accueil : un iPhone et un Android qui jouent le même test (locators, tap, journal). L'écran est dessiné en canvas 2D et posé en texture. |
| `assets/marks3d.js` | Betclic, Accor et LinkedIn (en cube) en volume. Rendu 2,6 fois plus grand que la marque et au-dessus du texte ; au repos, calé au pixel près sur le SVG plat ; recalibré dès que la taille change. |
| `assets/logo3d.js` | Le logo AF de la barre (`assets/logo.glb` + `assets/cubemaps/`), chargé au survol ou quand l'accueil a quitté l'écran. |
| `assets/fonts/` | `Humane-name.woff2` (nom et titres : alphabet latin, accents français, ponctuation — à régénérer avec `pyftsubset` si un titre ajoute un caractère) et `BricolageGrotesque-fr.woff2` (le texte, SIL OFL, sous-ensemble latin). Auto-hébergées : aucune origine tierce à l'écran. |
| `tools/linkedin-cover.html` | La bannière LinkedIn (1584 × 396) : la scène des téléphones figée (`data-freeze`), le logo AF, Humane. Export : serveur local à la racine, puis Chrome headless `--window-size=1584,396 --force-device-scale-factor=2 --screenshot`. La photo de profil recouvre le coin bas gauche. |
| `build.py` | Assemble `index.html` depuis le JSON. Python standard, aucune dépendance. |
| `index.html`, `fr/index.html` | **Générés** — ne pas éditer à la main. La page française porte `<base href="../">` et partage les mêmes fichiers. |

## Modifier le CV

1. Éditer `content/cv.en.json` **et** `content/cv.fr.json` (ou `assets/cv.css` pour le style).
2. `python3 build.py` → régénère les deux langues (`--lang fr` pour une seule).
   ⚠️ Pour une capture « téléphone » en headless, Chrome impose 500 px de large minimum : mettre la page dans un `<iframe>` de 390 px.
   ⚠️ Chrome headless ne déclenche ni défilement ni IntersectionObserver dans une page défilée par script : les titres y restent masqués. Vérifier le défilement dans un vrai navigateur, onglet **visible** (un onglet en arrière-plan suspend aussi le rendu).
3. `git add -A && git commit && git push` → GitHub Pages publie en une à deux minutes.


## Couleur d'accent

Une seule couleur pilote tout : `--accent` (et ses dérivées `--accent-ink`, `--accent-hi`, `--accent-deep`) en tête de `assets/cv.css`.
Les téléphones 3D, le logo AF en 3D et le curseur la lisent au chargement. Mangue `#FFB627` depuis le 21/09/2026.
Trois choses ne suivent pas automatiquement si on la change : `assets/logo.png` (logo AF de la barre et icône d'onglet, recoloré),
`assets/marks/linkedin.svg` (carré à la couleur d'accent, « in » à l'encre sombre) et le `:root` de `tools/linkedin-cover.html`.

## Règles de contenu

- Une puce = point de départ, ce qui coinçait, ce que j'ai fait, ce que ça a changé. Première personne, mots du métier en anglais tels quels.
- Rien qui appartienne à un client : pas de nom interne, d'URL, de ticket, de chiffre de périmètre, ni de nom de projet non public.
- Toute modification de texte se fait dans les **deux** fichiers de contenu, anglais et français.
