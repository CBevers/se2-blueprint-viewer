# SE2 Blueprint 3D Viewer

Standalone viewer/editor for Space Engineers 2 `grid.json` blueprints.

## Quick start (local)
- Open `index.html` directly, or run a static server:
  - Python: `python -m http.server 8080` and open http://localhost:8080
  - Node: `npx serve .`

## GitHub Pages
1. Create a repo (e.g., `se2-blueprint-viewer`) and upload this folder.
2. Settings → Pages → Source = `main` branch, root.
3. Visit the Pages URL.

Features: auto block size (2.5/0.5/0.25m), HSV/RGB parsing, selection, solid/linear/radial/cylindrical/gradient+noise/perlin/image painting, export, starfield, infinite-like sun shadows.
