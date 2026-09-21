# CV — Adam Ferreira

Site : https://adam-ferreira.github.io/ · PDF : https://adam-ferreira.github.io/dist/cv-adam-ferreira.pdf

## Où se trouve quoi

| Fichier | Rôle |
|---|---|
| `content/cv.fr.json` | **Tout le contenu** : identité, accroche, compétences, expériences (puces), projets, formation, langues. Texte UTF-8, `**gras**` pour les mises en avant. |
| `assets/cv.css` | Le style, y compris le mode nuit (`prefers-color-scheme` + `data-theme`) et les règles d'impression. |
| `assets/cv.js` | L'interrupteur jour / nuit (préférence mémorisée dans `localStorage`). |
| `build.py` | Assemble `index.html` depuis le JSON. Python standard, aucune dépendance. |
| `index.html` | **Généré** — ne pas éditer à la main. |
| `dist/cv-adam-ferreira.pdf` | **Généré** — la version imprimable, servie par GitHub Pages. |

## Modifier le CV

1. Éditer `content/cv.fr.json` (ou `assets/cv.css` pour le style).
2. `python3 build.py pdf` → régénère `index.html` et `dist/cv-adam-ferreira.pdf` (Chrome headless, 2 pages A4 attendues).
3. `git add -A && git commit && git push` → GitHub Pages publie en une à deux minutes.

`python3 build.py` seul régénère uniquement `index.html`. `--lang en` lira `content/cv.en.json` et écrira `en/index.html`.

## Règles de contenu

- Une puce = point de départ, ce qui coinçait, ce que j'ai fait, ce que ça a changé. Première personne, mots du métier en anglais tels quels.
- Rien qui appartienne à un client : pas de nom interne, d'URL, de ticket, de chiffre de périmètre, ni de nom de projet non public.
- L'e-mail n'apparaît qu'à l'impression (`.print-email`) ; en ligne, LinkedIn seul.
