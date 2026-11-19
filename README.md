# Solmarina Cover Maker

[![Make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/rank.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)
[![Reward](https://make.fun/badge/gta6-cover-art-01/SARIP-afk/gta6-cover-art-01-entry/reward.svg)](https://make.fun/c/gta6-cover-art-01/leaderboard)

Turn your photo and a caption into GTA-style multi-panel cover art — all-photo
panels, one giant overlapping title, a cinematic grade, a mission banner, cash
and wanted stars — exported as a PNG to share. Built for the make.fun bounty
**gta6-cover-art-01** ("Make GTA 6 Cover Art").

## What changed in v2

v1 mixed photo panels with drawn vector scenes. v2 is all-photo by default:

- **All-photo panels**: every panel shows one of your photos, each with its
  own crop and zoom. No panel is ever a filler scene unless you ask for one.
- **Giant overlapping title**: the title is drawn huge across the panels,
  like a real game cover, instead of sitting in a separate band above them.
- **Cinematic grade**: a filmic grade over the whole cover — warm highlights,
  lifted shadows, a subtle vignette — applied on top of the Sunset Vice City,
  Neon Night and Pastel Day grades.
- **Richer drawn scenes**: the manual "Drawn scene" fallback got denser —
  cloud bands, a bird flock and a sun reflection on the sunset sea; a third
  tower row, antennae, three-colour windows and a street with car lights in
  the skyline; six palms and a distant skyline on the boulevard; plus a new
  fourth scene, a neon downtown street canyon with glowing signs, string
  lights and a wet road mirroring them.
- **Auto GTA still one click**: ★ Auto GTA turns the samples into a finished
  all-photo cover — no drawn scene anywhere in it.

## What it does

- **Any photo**: load your own photos from your machine (they never leave it),
  or load the two bundled samples to try it instantly.
- **Crop and position each panel**: drag a photo inside its panel, zoom with a
  slider, or let the app auto-crop on the photo's focus point. One photo can
  fill every panel with a different crop, or each panel can hold a different
  photo. Panels without a photo show a drawn vector scene (sunset sky, neon
  skyline, palm boulevard, neon downtown) — a fallback you pick by hand, never
  a default.
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
