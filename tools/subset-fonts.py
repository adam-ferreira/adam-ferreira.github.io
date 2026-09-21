"""Réduit la police de texte (Bricolage Grotesque) aux caractères que le site affiche.

Humane (les grands titres) n'est pas traitée ici : son sous-ensemble actuel (lettres, chiffres, accents
français, 13,8 ko) est déjà plus petit que ce que donnerait ce jeu de caractères, qui sert au texte courant.

Source dans tools/fonts-src/, sortie dans assets/fonts/ (même nom que celui que charge la page).
Jeu gardé : ASCII imprimable + tout ce que contiennent les deux pages et les deux JSON de contenu
+ l'alphabet français complet et sa ponctuation (un texte modifié plus tard reste couvert sans relancer).
Les deux axes de Bricolage (graisse et taille optique) sont conservés : ils font le dessin du site.

    uvx --from 'fonttools[woff]' python tools/subset-fonts.py && python3 build.py
Mesuré le 22/09/2026 : Bricolage 71,3 → 54,3 ko.
"""
import html, pathlib, re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "tools" / "fonts-src", ROOT / "assets" / "fonts"

chars = {chr(c) for c in range(0x20, 0x7F)} | set("àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ«»‘’“”…–—·€×→  ")
for p in ("index.html", "fr/index.html"):
    t = re.sub(r"<style>.*?</style>|<script.*?</script>", "", (ROOT / p).read_text(encoding="utf-8"), flags=re.S)
    chars |= set(html.unescape(re.sub(r"<[^>]+>", " ", t)))
    for a in re.findall(r'(?:title|aria-label|alt|content)="([^"]*)"', t):
        chars |= set(html.unescape(a))
for p in ("content/cv.en.json", "content/cv.fr.json"):
    chars |= set((ROOT / p).read_text(encoding="utf-8"))
text = "".join(sorted(c for c in chars if ord(c) >= 0x20))

for src, out, feats in (
    ("BricolageGrotesque-fr.woff2", "BricolageGrotesque-fr.woff2", ["kern", "locl", "tnum"]),   # tnum : le compteur des diapos
):
    font = TTFont(SRC / src)
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = feats; opts.notdef_outline = True; opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts); sub.populate(text=text); sub.subset(font)
    font.flavor = "woff2"; font.save(OUT / out)
    print(f"{out:32} {(OUT / out).stat().st_size / 1024:6.1f} ko  ({len(text)} caractères)")
