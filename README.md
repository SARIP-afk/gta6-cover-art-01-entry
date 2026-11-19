# Solmarina Cover Maker

[![Make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)
[![Reward](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/reward.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)

Turn your photo and a caption into GTA-style multi-panel cover art — a big
hero panel, smaller scene panels, bold poster lettering, a Vice City sunset or
neon grade, a mission banner, cash and wanted stars — exported as a PNG to
share. Built for the make.fun bounty **gta6-cover-art-01** ("Make GTA 6 Cover
Art").

## What it does

- **Any photo**: load your own photos from your machine (they never leave it),
  or load the two bundled samples to try it instantly.
- **Crop and position each panel**: drag a photo inside its panel, zoom with a
  slider, or let the app auto-crop on the photo's focus point. One photo can
  fill every panel with a different crop, or each panel can hold a different
  photo. Panels without a photo show a drawn vector scene (sunset sky, neon
  skyline, palm boulevard).
- **Edit the caption**: title, tagline, mission name, cash amount and wanted
  stars — all drawn by the app in bold poster lettering.
- **Three layouts** (Hero left, Hero top, Grid 2 × 2) and **three grades**
  (Sunset Vice City, Neon Night, Pastel Day).
- **One click**: ★ Auto GTA turns the samples into a finished cover.
- **Export PNG** in the common post sizes: 1080 × 1080, 1080 × 1350 and
  1920 × 1080.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. The app is plain static files under `app/`
and works offline in desktop Chrome — no network requests, no build step.

## Originality

All art, lettering and scenes are original and drawn on the canvas: heavy
system fonts, gradient fills, vector palms, skies and skylines. No Rockstar
Games logo, official artwork, character or font is used anywhere.

## License

MIT — see [LICENSE](LICENSE).
