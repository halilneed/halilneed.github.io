#!/bin/sh
# covers.sh: cover images for the guides list, from page 1 of each PDF (496x702 PNG).
# Needs pdftoppm (poppler). Run after pdf.mjs:   sh tools/guides/covers.sh
set -e
cd "$(dirname "$0")/../.."
for dir in guides/*/; do
  slug=$(basename "$dir")
  [ -d "tools/guides/$slug" ] || continue
  for pdf in "$dir"*.pdf "$dir"tr/*.pdf; do
    [ -f "$pdf" ] || continue
    case "$pdf" in */tr/*) out="assets/img/guide-$slug-tr" ;; *) out="assets/img/guide-$slug" ;; esac
    pdftoppm -png -singlefile -f 1 -l 1 -scale-to-x 496 -scale-to-y 702 "$pdf" "$out"
    echo "wrote $out.png"
  done
done
