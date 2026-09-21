#!/usr/bin/env python3
"""Construit le CV.

    python3 build.py            → génère index.html depuis content/cv.fr.json + assets/
    python3 build.py pdf        → génère index.html puis dist/cv-adam-ferreira.pdf (Chrome headless)
    python3 build.py --lang en  → même chose depuis content/cv.en.json (à créer) vers en/index.html

Le contenu est du texte UTF-8 dans le JSON ; `**gras**` devient <strong>. Aucune dépendance hors bibliothèque standard.
Une seule page HTML, deux feuilles : assets/cv.css (écran) et assets/print.css (impression, A4 compact).
"""
import argparse
import html
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SITE = "https://adam-ferreira.github.io/"
THREE_VERSION = "0.170.0"

LINKEDIN_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04'
                '-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z'
                'M5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" fill="white"/></svg>')
SUN_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41'
           'M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>')
MOON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
DOWNLOAD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M6 9l6 6 6-6M4 21h16"/></svg>'
FONTS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"  # Inter : impression seulement


def md(text: str) -> str:
    """Texte brut → HTML : échappement, puis **gras** → <strong>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html.escape(text, quote=False))


def hero_html(idn: dict) -> str:
    """La phrase d'accueil, mot par mot (animation décalée), avec les marques {{nom}} insérées dedans."""
    marks = idn.get("marks", {})
    out, i = [], 0
    for tok in re.split(r"(\{\{\w+\}\}|\s+)", idn["hero"]):
        if not tok or tok.isspace():
            continue
        m = re.fullmatch(r"\{\{(\w+)\}\}", tok)
        if m and m.group(1) in marks:
            mk = marks[m.group(1)]
            inner = (f'<img src="{html.escape(mk["src"])}" alt="{md(mk["alt"])}" loading="lazy">' if mk["type"] == "img"
                     else f'<span class="mark-text" role="img" aria-label="{md(mk["alt"])}">{md(mk["label"])}</span>')
            attrs = f' data-svg="{html.escape(mk["src"])}"' if mk["type"] == "img" else ""
            if mk.get("fill_dark"):
                attrs += f' data-fill-dark="{html.escape(mk["fill_dark"])}"'
            out.append(f'<span class="w mark mark-{m.group(1)}" style="--i:{i}"{attrs}>{inner}</span>')
        else:
            out.append(f'<span class="w" style="--i:{i}">{md(tok)}</span>')
        i += 1
    return " ".join(out)


def chips(items) -> str:
    return '<ul class="chips">' + " ".join(f"<li>{md(i)}</li>" for i in items) + "</ul>"


def section_open(sid: str, label: str) -> str:
    return (f'  <section class="section" id="{sid}" aria-labelledby="{sid}-title">\n'
            f'    <div class="section-title-wrapper"><h2 class="section-title" id="{sid}-title">{md(label)}</h2></div>\n')


def job_html(j: dict, last: bool = False) -> str:
    title = md(j["role"]) + (f' &mdash; {md(j["client"])}' if j.get("client") else "")
    out = [f'    <article class="job">\n      <div class="job-header"><div class="job-title-line">\n'
           f'        <h3 class="job-title">{title}</h3>\n        <span class="job-date">{md(j["date"])}</span>\n      </div></div>\n']
    if j.get("intro"):
        out.append(f'      <p class="job-intro">{md(j["intro"])}</p>\n')
    if j.get("subtitle"):
        out.append('      <div class="separator"></div>\n')
        out.append(f'      <h4 class="sub-title">{md(j["subtitle"])}</h4>\n')
        if j.get("subintro"):
            out.append(f'      <p class="sub-intro">{md(j["subintro"])}</p>\n')
    if j.get("bullets"):
        out.append('      <ul class="bullets">\n' + "".join(f"        <li>{md(b)}</li>\n" for b in j["bullets"]) + "      </ul>\n")
    if j.get("stack"):
        out.append(f'      <div class="stack"><span class="stack-label">Stack :</span> {chips(j["stack"])}</div>\n')
    if not last:
        out.append('      <div class="separator"></div>\n')
    out.append("    </article>\n")
    return "".join(out)


def render(d: dict) -> str:
    idn, ui, sec = d["identity"], d["ui"], d["sections"]
    full_name = f'{idn["first_name"]} {idn["last_name"]}'
    # la feuille écran est intégrée à la page : un aller-retour réseau de moins avant le premier affichage (mesuré : FCP mobile 2,9 s)
    screen_css = (ROOT / "assets" / "cv.css").read_text(encoding="utf-8").replace('url("fonts/', 'url("assets/fonts/')
    parts = [f"""<!DOCTYPE html>
<html lang="{d["lang"]}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{md(d["meta"]["title"])}</title>
  <meta name="description" content="{html.escape(d["meta"]["description"])}">
  <meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1116" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="{html.escape(full_name + ' — ' + idn["headline"])}">
  <meta property="og:description" content="{html.escape(idn["tagline"])}">
  <meta property="og:url" content="{SITE}">
  <meta property="og:image" content="{SITE}{idn["photo"]}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="assets/logo.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/logo.png">
  <link rel="preload" as="font" type="font/woff2" href="assets/fonts/BricolageGrotesque-fr.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="assets/fonts/Humane-name.woff2" crossorigin>
  <link rel="stylesheet" href="{FONTS_URL}" media="print">
  <style media="screen">
{screen_css}
  </style>
  <link rel="stylesheet" href="assets/print.css" media="print">
  <script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/examples/jsm/"}}}}</script>
</head>
<body id="top">

  <nav class="topbar" aria-label="{md(ui["nav_aria"])}">
    <div class="brand" title="{md(full_name)}">
      <img class="brand-img" src="assets/logo.png" alt="{md(full_name)}" width="46" height="46" decoding="async">
      <canvas class="logo3d" aria-hidden="true"></canvas>
    </div>
    <a class="linkedin-item topbar-linkedin" href="{html.escape(idn["linkedin"]["url"])}" target="_blank" rel="noopener">
      <span class="linkedin-icon">{LINKEDIN_SVG}</span>
      <span class="linkedin-handle">{md(idn["linkedin"]["handle"])}</span>
    </a>
    <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="{md(ui["toggle_aria"])}" title="{md(ui["toggle_title_light"])}">
      <span class="tt-icon tt-sun">{SUN_SVG}</span>
      <span class="tt-icon tt-moon">{MOON_SVG}</span>
      <span class="tt-knob"></span>
    </button>
  </nav>

  <header class="header">
    <div class="header-left">
      <div class="photo-container"><img src="{idn["photo"]}" alt="{md(full_name)}" class="photo" width="300" height="400" fetchpriority="high"></div>
      <div class="header-name-block">
        <h1 class="name"><span class="name-first">{md(idn["first_name"])}</span> <span class="name-last">{md(idn["last_name"])}</span></h1>
        <p class="subtitle">{md(idn["headline"])}</p>
        <p class="hero-line screen-only" aria-label="{md(re.sub(r"\{\{(\w+)\}\}", lambda m: idn["marks"][m.group(1)]["alt"], idn["hero"]))}">{hero_html(idn)}</p>
        <p class="tagline print-only">{md(idn["tagline"])}</p>
        <p class="location">
          <span class="flag" aria-hidden="true"><span class="flag-blue"></span><span class="flag-white"></span><span class="flag-red"></span></span><span class="meta-item">{md(idn["location"])}</span> <span class="meta-item">{md(idn["status_freelance"])}</span> <span class="meta-item">{md(idn["status_mode"])}</span>
        </p>
      </div>
    </div>
    <div class="header-right print-only">
      <a class="linkedin-item" href="{html.escape(idn["linkedin"]["url"])}" target="_blank" rel="noopener">
        <span class="linkedin-icon">{LINKEDIN_SVG}</span>
        {md(idn["linkedin"]["handle"])}
      </a>
    </div>
  </header>

  <div class="skills" id="skills">
"""]
    for row in d["skills"]:
        parts.append(f'    <div class="skills-row"><span class="skills-label">{md(row["label"])}</span>{chips(row["items"])}</div>\n')
    parts.append("  </div>\n\n  <main>\n")

    parts.append(section_open("experience", sec["experience"]))
    jobs = d["experience"]
    parts.extend(job_html(j, last=(i == len(jobs) - 1)) for i, j in enumerate(jobs))
    parts.append("  </section>\n\n")

    if d.get("projects"):
        parts.append(section_open("projects", sec["projects"]))
        parts.extend(f'    <p class="job-intro reading">{md(p)}</p>\n' for p in d["projects"])
        parts.append("  </section>\n\n")

    parts.append(section_open("education", sec["education"]))
    for e in d["education"]:
        parts.append(f'    <div class="job-header"><div class="job-title-line">\n      <h3 class="job-title">{md(e["title"])}</h3>\n'
                     f'      <span class="job-date">{md(e["date"])}</span>\n    </div></div>\n    <p class="job-intro reading">{md(e["text"])}</p>\n')
    parts.append("  </section>\n\n")

    parts.append(section_open("languages", sec["languages"]))
    langs = " &nbsp;&middot;&nbsp; ".join(f'<strong>{md(l["name"])}</strong> &mdash; {md(l["level"])}' for l in d["languages"])
    parts.append(f'    <p class="job-intro reading">{langs}</p>\n  </section>\n\n')

    parts.append(section_open("interests", sec["interests"]))
    parts.extend(f'    <p class="job-intro reading">{md(i)}</p>\n' for i in d["interests"])
    parts.append("  </section>\n  </main>\n\n")

    parts.append(f"""  <footer class="site-footer">
    <a href="{html.escape(idn["linkedin"]["url"])}" target="_blank" rel="noopener">LinkedIn</a>
    <a href="{html.escape(idn["pdf"])}" download>{md(ui["pdf_label"])}</a>
    <span>{md(ui["footer_note"])}</span>
  </footer>

  <script src="assets/cv.js"></script>
  <script type="module" src="assets/logo3d.js"></script>
  <script type="module" src="assets/marks3d.js"></script>
</body>
</html>
""")
    return "".join(parts)


def build(lang: str) -> pathlib.Path:
    data = json.loads((ROOT / "content" / f"cv.{lang}.json").read_text(encoding="utf-8"))
    out = ROOT / "index.html" if lang == "fr" else ROOT / lang / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(data), encoding="utf-8")
    print(f"✓ {out.relative_to(ROOT)} ({len(data['experience'])} expériences)")
    return out


def pdf(page: pathlib.Path, out: pathlib.Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out}", f"file://{page}"], check=True, capture_output=True)
    info = subprocess.run(["pdfinfo", str(out)], capture_output=True, text=True).stdout
    pages = next((l.split()[-1] for l in info.splitlines() if l.startswith("Pages")), "?")
    print(f"✓ {os.path.relpath(out, ROOT)} — {pages} page(s)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", nargs="?", default="build", choices=["build", "pdf"])
    ap.add_argument("--lang", default="fr")
    ap.add_argument("--out", help="chemin du PDF (défaut : dist/cv-adam-ferreira.pdf)")
    a = ap.parse_args()
    page = build(a.lang)
    if a.command == "pdf":
        pdf(page, pathlib.Path(a.out).resolve() if a.out else ROOT / "dist" / "cv-adam-ferreira.pdf")
    sys.exit(0)
