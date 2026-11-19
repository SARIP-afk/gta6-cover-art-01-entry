# Solmarina Cover Maker

![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/reward.svg)

Entry for [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

## What it is

A web app that turns your photo and a caption into GTA-style poster cover art — multi-panel, giant bold title, Vice City sunset or neon grade — and exports it as a PNG. It runs fully offline in a desktop browser from static files; your photo never leaves your machine.

## How it works

1. **Upload a photo** (or use a sample) — one photo fills all five panels with different crops, or pick a different photo per panel.
2. **Auto GTA** — one click fills every panel with photos, centres the subject with a simple focus scan, and applies the Solmarina sunset grade.
3. **Edit the caption** — title, tagline, mission name, cash and wanted stars; pick one of 3 layouts and 3 grades.
4. **Export PNG** — 1:1 square (1080×1080), 4:5 portrait (1080×1350), 16:9 wide (1920×1080) or 9:16 story (1080×1920).

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Files

- `app/index.html` — the page and editor controls
- `app/style.css` — editor styling
- `app/src/cover.js` — the cover drawing engine (panels, grades, giant title)
- `app/src/main.js` — state, URL query, controls, PNG export
- `app/src/shots.js` — cover vs editor shot modes
- `app/samples/` — two model-made sample photos, free to use
- `main.ts` — builds `/output` (app + screenshots + dossier.json) for the grader

All art is drawn on this page in original code. No Rockstar logo, artwork or font is used.

Rendering is deterministic: the same state always paints the same pixels (no clock or random values at draw time), so a cover re-exported later is byte-identical.
