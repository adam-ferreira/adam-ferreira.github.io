#!/usr/bin/env python3
"""Construit le CV.

    python3 build.py            → génère index.html depuis content/cv.fr.json + assets/
    python3 build.py pdf        → génère index.html puis dist/cv-adam-ferreira.pdf (Chrome headless)
    python3 build.py --lang en  → même chose depuis content/cv.en.json (à créer) vers en/index.html

Le contenu est du texte UTF-8 dans le JSON ; `**gras**` devient <strong>. Aucune dépendance hors bibliothèque standard.
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

LINKEDIN_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04'
                '-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z'
                'M5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" fill="white"/></svg>')
SUN_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41'
           'M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>')
MOON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'


def md(text: str) -> str:
    """Texte brut → HTML : échappement, puis **gras** → <strong>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html.escape(text, quote=False))


def joined(items, sep=" · "):
    return sep.join(html.escape(i, quote=False) for i in items)


def section_title(label: str, first: bool = False) -> str:
    style = "" if first else ' style="margin-top: 16px;"'
    line = '\n    <div class="section-line"></div>' if first else ""
    return f'  <div class="section-title-wrapper"{style}>\n    <div class="section-title">{md(label)}</div>{line}\n  </div>\n'


def job_header(title: str, date: str) -> str:
    return ('  <div class="job-header">\n    <div class="job-title-line">\n'
            f'      <span class="job-title">{title}</span>\n      <span class="job-date">{md(date)}</span>\n'
            '    </div>\n  </div>\n')


def job_html(j: dict, last: bool = False) -> str:
    title = md(j["role"]) + (f' &mdash; {md(j["client"])}' if j.get("client") else "")
    out = [f'  <!-- JOB: {j.get("client") or j["role"]} -->\n', job_header(title, j["date"])]
    if j.get("intro"):
        out.append(f'  <p class="job-intro">{md(j["intro"])}</p>\n')
    if j.get("subtitle"):
        out.append('  <div class="separator"></div>\n')
        out.append(f'  <div class="sub-title">{md(j["subtitle"])}</div>\n')
        if j.get("subintro"):
            out.append(f'  <p class="sub-intro">{md(j["subintro"])}</p>\n')
    if j.get("bullets"):
        out.append('  <ul class="bullets">\n' + "".join(f"    <li>{md(b)}</li>\n" for b in j["bullets"]) + "  </ul>\n")
    if j.get("stack"):
        out.append(f'  <div class="stack">Stack : {joined(j["stack"], " &middot; ")}</div>\n')
    if not last:
        out.append('  <div class="separator"></div>\n')
    return "".join(out)


def render(d: dict) -> str:
    idn, ui, sec = d["identity"], d["ui"], d["sections"]
    parts = [f"""<!DOCTYPE html>
<html lang="{d["lang"]}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{md(d["meta"]["title"])}</title>
  <meta name="description" content="{html.escape(d["meta"]["description"])}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/cv.css">
</head>
<body>

  <!-- ==================== HEADER ==================== -->
  <div class="header">
    <div class="header-left">
      <div class="photo-container"><img src="{idn["photo"]}" alt="{md(idn["first_name"] + " " + idn["last_name"])}" class="photo"></div>
      <div class="header-name-block">
        <div class="name">
          <span class="name-first">{md(idn["first_name"])}</span> <span class="name-last">{md(idn["last_name"])}</span>
        </div>
        <div class="subtitle">{md(idn["headline"])}</div>
        <div class="tagline">{md(idn["tagline"])}</div>
        <div class="location">
          <span class="flag"><span class="flag-blue"></span><span class="flag-white"></span><span class="flag-red"></span></span> {md(idn["location"])} &middot; {md(idn["status"])}
        </div>
      </div>
    </div>
    <div class="header-right">
      <a class="linkedin-item" href="{html.escape(idn["linkedin"]["url"])}" target="_blank">
        <span class="linkedin-icon">{LINKEDIN_SVG}</span>
        {md(idn["linkedin"]["handle"])}
      </a>
      <span class="print-email">{md(idn["email_print_only"])}</span>
      <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="{md(ui["toggle_aria"])}" title="{md(ui["toggle_title_light"])}">
        <span class="tt-icon tt-sun">{SUN_SVG}</span>
        <span class="tt-icon tt-moon">{MOON_SVG}</span>
        <span class="tt-knob"></span>
      </button>
    </div>
  </div>

  <div class="skills">
"""]
    for row in d["skills"]:
        parts.append(f'    <div class="skills-row"><span class="skills-label">{md(row["label"])}</span><span>{joined(row["items"], " &middot; ")}</span></div>\n')
    parts.append("  </div>\n\n")

    parts.append(section_title(sec["experience"], first=True) + "\n")
    jobs = d["experience"]
    parts.extend(job_html(j, last=(i == len(jobs) - 1)) + "\n" for i, j in enumerate(jobs))

    parts.append(section_title(sec["projects"]) + "\n")
    parts.extend(f'  <p class="job-intro">{md(p)}</p>\n\n' for p in d["projects"])

    parts.append(section_title(sec["education"]) + "\n")
    for e in d["education"]:
        parts.append(job_header(md(e["title"]), e["date"]) + f'  <p class="job-intro">{md(e["text"])}</p>\n\n')

    parts.append(section_title(sec["languages"]) + "\n")
    langs = " &nbsp;&middot;&nbsp; ".join(f'<strong>{md(l["name"])}</strong> &mdash; {md(l["level"])}' for l in d["languages"])
    parts.append(f'  <p class="job-intro">{langs}</p>\n\n')

    parts.append(section_title(sec["interests"]) + "\n")
    parts.extend(f'  <p class="job-intro">{md(i)}</p>\n' for i in d["interests"])

    parts.append('\n  <script src="assets/cv.js"></script>\n</body>\n</html>\n')
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
