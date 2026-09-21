#!/usr/bin/env python3
"""Construit le CV.

    python3 build.py            → génère les deux langues : index.html (anglais, content/cv.en.json)
                                  et fr/index.html (français, content/cv.fr.json)
    python3 build.py --lang fr  → une seule langue

Le contenu est du texte UTF-8 dans le JSON ; `**gras**` devient <strong>. Aucune dépendance hors bibliothèque standard.
Une page HTML par langue, une feuille de style (assets/cv.css, intégrée à la page). Plus de PDF depuis le 21/09/2026 :
le CV est l'application web ; les derniers PDF sont archivés dans ~/admin/PRO/01_ADMINISTRATIF/CV/.
"""
import argparse
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SITE = "https://adam-ferreira.github.io/"
THREE_VERSION = "0.170.0"
# L'anglais est à la racine, le français sous /fr/. La page française porte <base href="../"> : elle partage
# exactement les mêmes fichiers (assets, photo), et les scripts 3D trouvent leurs modèles sans rien changer.
LANGS = {
    "en": {"dir": "", "locale": "en_US", "code": "EN", "name": "English version"},
    "fr": {"dir": "fr", "locale": "fr_FR", "code": "FR", "name": "Version française"},
}

SUN_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41'
           'M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>')
MOON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'


def ver(rel: str) -> str:
    """`assets/x.svg` → `assets/x.svg?v=1a2b3c4d` : l'adresse change avec le contenu, plus jamais de vieux fichier en cache."""
    import hashlib
    p = ROOT / rel
    return f"{rel}?v={hashlib.sha1(p.read_bytes()).hexdigest()[:8]}" if p.exists() else rel


def md(text: str) -> str:
    """Texte brut → HTML : échappement, puis **gras** → <strong>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html.escape(text, quote=False))


def svg_size(rel: str) -> str:
    m = re.search(r'viewBox="([^"]+)"', (ROOT / rel).read_text(encoding="utf-8"))
    if not m:
        return ""
    w, h = (round(float(x)) for x in m.group(1).replace(",", " ").split()[2:4])
    return f'width="{w}" height="{h}"'


def hero_html(idn: dict) -> str:
    """La phrase d'accueil, mot par mot (animation décalée), avec les marques {{nom}} insérées dedans."""
    marks = idn.get("marks", {})
    out, i, spaced = [], 0, True   # spaced : un blanc précède le morceau (sinon il est collé au précédent, ex. « {{betclic}}, »)
    for tok in re.split(r"(\{\{\w+\}\}|\s+)", idn["hero"]):
        if not tok:
            continue
        if tok.isspace():
            spaced = True
            continue
        m = re.fullmatch(r"\{\{(\w+)\}\}", tok)
        if m and m.group(1) == "br":   # {{br}} : retour à la ligne voulu dans la phrase
            out.append("<br>")
            spaced = True
            continue
        if m and m.group(1) in marks:
            mk = marks[m.group(1)]
            inner = (f'<img src="{html.escape(ver(mk["src"]))}" alt="{md(mk["alt"])}" {svg_size(mk["src"])} decoding="async">' if mk["type"] == "img"
                     else f'<span class="mark-text" role="img" aria-label="{md(mk["alt"])}">{md(mk["label"])}</span>')
            attrs = f' data-svg="{html.escape(ver(mk["src"]))}"' if mk["type"] == "img" else ""
            if mk.get("fill_dark"):
                attrs += f' data-fill-dark="{html.escape(mk["fill_dark"])}"'
            piece = f'<span class="w mark mark-{m.group(1)}" style="--i:{i}"{attrs}>{inner}</span>'
        else:
            piece = f'<span class="w" style="--i:{i}">{md(tok)}</span>'
        if out and not spaced:   # ponctuation collée : même bloc insécable que ce qui précède, sans espace
            out[-1] = f'<span class="nowrap">{out[-1]}{piece}</span>' if not out[-1].startswith('<span class="nowrap">') else out[-1][:-7] + piece + '</span>'
        else:
            out.append(piece)
        spaced = False
        i += 1
    return " ".join(out)


def chips(items) -> str:
    return '<ul class="chips">' + " ".join(f"<li>{md(i)}</li>" for i in items) + "</ul>"


def section_open(sid: str, label: str) -> str:
    return (f'  <section class="section" id="{sid}" aria-labelledby="{sid}-title">\n'
            f'    <div class="section-title-wrapper"><h2 class="section-title" id="{sid}-title">{md(label)}</h2></div>\n')


def job_html(j: dict, last: bool = False, stack_label: str = "Stack :") -> str:
    """Une expérience. À gauche (job-side) : numéro, titre, date, introduction, défi, puis la stack. À droite (job-main) : puces.
    Sur grand écran, chaque expérience remplit un écran ; ailleurs, les deux blocs s'enchaînent dans cet ordre."""
    title = md(j["role"]) + (f' &mdash; {md(j["client"])}' if j.get("client") else "")
    num = f'        <span class="job-num label">{j["num"]}</span>\n' if j.get("num") else ""
    short = "" if j.get("bullets") else " job-short"
    data_num = f' data-num="{j["num"]}"' if j.get("num") else ""
    out = [f'    <article class="job{short}"{data_num}>\n      <div class="job-side">\n      <div class="job-header"><div class="job-title-line">\n{num}'
           f'        <h3 class="job-title">{title}</h3>\n        <span class="job-date">{md(j["date"])}</span>\n      </div></div>\n']
    if j.get("intro"):
        out.append(f'      <p class="job-intro">{md(j["intro"])}</p>\n')
    if j.get("subtitle"):
        out.append(f'      <h4 class="sub-title">{md(j["subtitle"])}</h4>\n')
        if j.get("subintro"):
            out.append(f'      <p class="sub-intro">{md(j["subintro"])}</p>\n')
    out.append('      </div>\n')
    if j.get("bullets"):
        out.append('      <div class="job-main">\n      <ul class="bullets">\n' + "".join(f"        <li>{md(bl)}</li>\n" for bl in j["bullets"]) + "      </ul>\n      </div>\n")
    if j.get("stack"):
        out.append(f'      <div class="stack"><span class="stack-label">{md(stack_label)}</span> {chips(j["stack"])}</div>\n')
    out.append("    </article>\n")
    return "".join(out)


def render(d: dict) -> str:
    idn, ui, sec = d["identity"], d["ui"], d["sections"]
    full_name = f'{idn["first_name"]} {idn["last_name"]}'
    lang = d["lang"]
    here = LANGS[lang]
    other = next(k for k in LANGS if k != lang)
    url = SITE + (here["dir"] + "/" if here["dir"] else "")
    base_tag = '\n  <base href="../">' if here["dir"] else ""
    other_href = LANGS[other]["dir"] + "/" if LANGS[other]["dir"] else "./"
    alternates = "".join(f'\n  <link rel="alternate" hreflang="{k}" href="{SITE}{v["dir"] + "/" if v["dir"] else ""}">' for k, v in LANGS.items())
    # la feuille écran est intégrée à la page : un aller-retour réseau de moins avant le premier affichage (mesuré : FCP mobile 2,9 s)
    screen_css = (ROOT / "assets" / "cv.css").read_text(encoding="utf-8").replace('url("fonts/', 'url("assets/fonts/')
    screen_css = re.sub(r'url\("(assets/fonts/[^"]+)"\)', lambda m: f'url("{ver(m.group(1))}")', screen_css)
    parts = [f"""<!DOCTYPE html>
<html lang="{d["lang"]}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">{base_tag}
  <title>{md(d["meta"]["title"])}</title>
  <meta name="description" content="{html.escape(d["meta"]["description"])}">
  <meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1116" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="{html.escape(full_name + ' — ' + idn["headline"])}">
  <meta property="og:description" content="{html.escape(idn["tagline"])}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}{idn["photo"]}">
  <meta property="og:locale" content="{here["locale"]}">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="{url}">{alternates}
  <link rel="alternate" hreflang="x-default" href="{SITE}">
  <link rel="icon" href="{ver("assets/logo.png")}" type="image/png">
  <link rel="apple-touch-icon" href="{ver("assets/logo.png")}">
  <link rel="preload" as="font" type="font/woff2" href="{ver("assets/fonts/BricolageGrotesque-fr.woff2")}" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="{ver("assets/fonts/Humane-name.woff2")}" crossorigin>
  <style>
{screen_css}
  </style>
  <script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/build/three.module.min.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@{THREE_VERSION}/examples/jsm/"}}}}</script>
</head>
<body id="top">

  <nav class="topbar" aria-label="{md(ui["nav_aria"])}">
    <div class="brand" title="{md(full_name)}">
      <img class="brand-img" src="{ver("assets/logo.png")}" alt="{md(full_name)}" width="46" height="46" decoding="async">
      <canvas class="logo3d" aria-hidden="true"></canvas>
    </div>
    <span class="frame-status label" aria-hidden="true">{md(full_name)} &middot; {md(idn["headline"])}</span>
    <a class="lang-switch label" href="{other_href}" hreflang="{other}" lang="{other}" title="{LANGS[other]["name"]}" aria-label="{LANGS[other]["name"]}">{LANGS[other]["code"]}</a>
    <a class="mark mark-linkedin topbar-linkedin" href="{html.escape(idn["linkedin"]["url"])}" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn" data-svg="{ver("assets/marks/linkedin.svg")}" data-dark-map='{{"#000000":"#ffffff"}}'>
      <img class="theme-light" src="{ver("assets/marks/linkedin.svg")}" alt="" width="40" height="40" decoding="async">
      <img class="theme-dark" src="{ver("assets/marks/linkedin-dark.svg")}" alt="" width="40" height="40" decoding="async">
    </a>
    <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="{md(ui["toggle_aria"])}" title="{md(ui["toggle_title_light"])}" data-title-light="{md(ui["toggle_title_light"])}" data-title-dark="{md(ui["toggle_title_dark"])}">
      <span class="tt-icon tt-sun">{SUN_SVG}</span>
      <span class="tt-icon tt-moon">{MOON_SVG}</span>
      <span class="tt-knob"></span>
    </button>
  </nav>

  <div class="page">
  <header class="header">
    <div class="hero-stage" aria-hidden="true"><canvas class="hero3d"></canvas></div>
    <div class="header-left">
      <div class="portrait"><span class="portrait-disc" aria-hidden="true"></span><img src="{ver("assets/portrait.webp")}" alt="{md(full_name)}" class="portrait-img" width="420" height="562" fetchpriority="high"></div>
      <div class="header-name-block">
        <h1 class="name"><span class="name-first">{md(idn["first_name"])}</span> <span class="name-last">{md(idn["last_name"])}</span></h1>
        <p class="subtitle">{md(idn["headline"])}</p>
        <p class="hero-line" aria-label="{md(re.sub(r"\{\{(\w+)\}\}", lambda m: idn["marks"][m.group(1)]["alt"] if m.group(1) in idn["marks"] else " ", idn["hero"]))}">{hero_html(idn)}</p>
        <p class="location">
          <span class="flag" aria-hidden="true"><span class="flag-blue"></span><span class="flag-white"></span><span class="flag-red"></span></span><span class="meta-item">{md(idn["location"])}</span> <span class="meta-item">{md(idn["status_freelance"])}</span> <span class="meta-item">{md(idn["status_mode"])}</span>
        </p>
        <p class="contact">
          <a class="contact-link" href="mailto:{html.escape(idn["contact"]["email"])}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg><span>{md(idn["contact"]["email"])}</span></a>
          <a class="contact-link" href="tel:{html.escape(idn["contact"]["phone_href"])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.6 4.2-2.2 1.4a11 11 0 0 0 6.5 6.5l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/></svg><span>{md(idn["contact"]["phone"])}</span></a>
        </p>
      </div>
    </div>
    <div class="hero-foot">
      <span class="label">{md(ui["updated"])}</span>
      <span class="label scroll-hint">{md(ui["scroll_hint"])}</span>
    </div>
  </header>

  <main>
"""]
    # écran de chapitre : le grand titre « Experience » et les compétences
    skills = "".join(f'      <div class="skills-row"><span class="skills-label">{md(row["label"])}</span>{chips(row["items"])}</div>\n' for row in d["skills"])
    parts.append(section_open("experience", sec["experience"]).replace('    <div class="section-title-wrapper">', '    <div class="chapter">\n    <div class="section-title-wrapper">', 1))
    parts.append(f'    <div class="skills" id="skills">\n{skills}    </div>\n    </div>\n')
    jobs = d["experience"]
    for i, j in enumerate(jobs):
        j["num"] = f"{i + 1:02d}"
    parts.extend(job_html(j, last=(i == len(jobs) - 1), stack_label=ui["stack_label"]) for i, j in enumerate(jobs))
    parts.append("  </section>\n\n")

    if d.get("projects"):
        parts.append(section_open("projects", sec["projects"]))
        parts.extend(f'    <p class="job-intro reading">{md(p)}</p>\n' for p in d["projects"])
        parts.append("  </section>\n\n")

    parts.append('  <div class="facts">\n')
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
    parts.append("  </section>\n  </div>\n  </main>\n  </div>\n\n")

    parts.append(f"""  <footer class="site-footer">
    <a class="footer-statement" href="mailto:{html.escape(idn["contact"]["email"])}">{md(ui["footer_statement"])}</a>
    <div class="footer-grid label">
      <a class="nocase" href="mailto:{html.escape(idn["contact"]["email"])}">{md(idn["contact"]["email"])}</a>
      <a href="tel:{html.escape(idn["contact"]["phone_href"])}">{md(idn["contact"]["phone"])}</a>
      <span>{md(ui["footer_availability"])}<i class="dot" aria-hidden="true"></i></span>
    </div>
  </footer>

  <script src="{ver("assets/cv.js")}"></script>
  <script type="module" src="{ver("assets/hero3d.js")}"></script>
  <script type="module" src="{ver("assets/logo3d.js")}"></script>
  <script type="module" src="{ver("assets/marks3d.js")}"></script>
</body>
</html>
""")
    return "".join(parts)


def build(lang: str) -> pathlib.Path:
    data = json.loads((ROOT / "content" / f"cv.{lang}.json").read_text(encoding="utf-8"))
    out = ROOT / LANGS[lang]["dir"] / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(data), encoding="utf-8")
    print(f"✓ {out.relative_to(ROOT)} ({len(data['experience'])} expériences)")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=list(LANGS), help="une seule langue (défaut : toutes)")
    a = ap.parse_args()
    for lang in ([a.lang] if a.lang else list(LANGS)):
        build(lang)
    sys.exit(0)
