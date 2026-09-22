"""Subsets the body font (Bricolage Grotesque) to the characters the site displays.

Humane (the giant titles) is not handled here: its current subset (letters, digits, French accents, 13.8 kB) is
already smaller than what this character set, meant for body text, would give.

Source in tools/fonts-src/, output in src/assets/fonts/ (same name as the one the stylesheet imports).
Kept: printable ASCII + everything in the two built pages (dist/) and the two content JSON files
+ the full French alphabet and its punctuation (so text edited later stays covered without re-running).
Both Bricolage axes (weight and optical size) are kept: they shape the site's look.

    npm run build && npm run fonts && npm run build
Measured on 22/09/2026: Bricolage 71.3 → 54.3 kB.
"""
import html, pathlib, re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "tools" / "fonts-src", ROOT / "src" / "assets" / "fonts"

chars = {chr(c) for c in range(0x20, 0x7F)} | set("àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ«»‘’“”…–—·€×→  ")
for p in ("dist/index.html", "dist/fr/index.html"):
    t = re.sub(r"<style>.*?</style>|<script.*?</script>", "", (ROOT / p).read_text(encoding="utf-8"), flags=re.S)
    chars |= set(html.unescape(re.sub(r"<[^>]+>", " ", t)))
    for a in re.findall(r'(?:title|aria-label|alt|content)="([^"]*)"', t):
        chars |= set(html.unescape(a))
for p in ("src/content/cv/en.json", "src/content/cv/fr.json"):
    chars |= set((ROOT / p).read_text(encoding="utf-8"))
text = "".join(sorted(c for c in chars if ord(c) >= 0x20))

for src, out, feats in (
    ("BricolageGrotesque-fr.woff2", "BricolageGrotesque-fr.woff2", ["kern", "locl", "tnum"]),   # tnum: the screen counter
):
    font = TTFont(SRC / src)
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = feats; opts.notdef_outline = True; opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts); sub.populate(text=text); sub.subset(font)
    font.flavor = "woff2"; font.save(OUT / out)
    print(f"{out:32} {(OUT / out).stat().st_size / 1024:6.1f} kB  ({len(text)} characters)")
