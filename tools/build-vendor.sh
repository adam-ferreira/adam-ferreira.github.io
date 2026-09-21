#!/bin/sh
# Fabrique les deux bibliothèques hébergées par le site, puis reconstruit les pages :
#   assets/vendor/three.js  Three.js réduit à ce que le site utilise (tools/three-lite.js)
#   assets/vendor/lenis.js  le défilement lissé (écrans 861-1099 px, hors mode scène)
# Mesuré le 22/09/2026 : 158 ko compressés, contre 216 ko pour three.module.min.js et ses 4 modules
# chargés depuis jsDelivr (5 requêtes et une connexion de moins, aucune ressource tierce).
# Rien n'est installé dans le dépôt : un dossier temporaire, supprimé à la fin.
set -e
cd "$(dirname "$0")/.."
THREE=$(sed -n 's/^THREE_VERSION = "\([^"]*\)".*/\1/p' build.py)
LENIS=$(sed -n 's/^LENIS_VERSION = "\([^"]*\)".*/\1/p' build.py)
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
( cd "$W" && npm init -y >/dev/null && npm i -s "three@$THREE" "lenis@$LENIS" esbuild@0.25 >/dev/null )
cp tools/three-lite.js "$W/three-lite.js"
echo "export { default } from 'lenis';" > "$W/lenis-entry.js"
mkdir -p assets/vendor
for f in three-lite:three lenis-entry:lenis; do
  "$W/node_modules/.bin/esbuild" "$W/${f%%:*}.js" --bundle --format=esm --minify --target=es2020 --legal-comments=eof --log-level=warning --outfile="assets/vendor/${f##*:}.js"
done
python3 build.py
for f in assets/vendor/*.js; do printf '%-26s %4d ko compressé\n' "$f" $(( $(gzip -6 -c "$f" | wc -c) / 1024 )); done
