# Pokédex (FR) – offline PWA

Static site in `public/` (plain HTML/CSS/JS, no framework, no backend).

## Run
    python3 -m http.server 8765 --directory public
then open http://localhost:8765 (service worker needs localhost or HTTPS).

## Rebuild data (Node 20+, Internet)
    cd build && npm install
    node fetch-data.mjs      # PokéAPI -> public/data/pokedex.json (cached in build/.cache)
    node fetch-images.mjs    # official artwork -> 256px WebP in public/img/
    node make-icons.mjs      # PWA icons
After changing any file in `public/`, bump `VERSION` in `public/sw.js` so installed apps refresh.

## Deploy
Upload the content of `public/` to any static host (GitHub Pages, Netlify, Cloudflare Pages...). All paths are relative, so sub-paths work.
