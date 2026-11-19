// The cover engine: turns photos, a caption and a grade into a multi-panel
// GTA-style poster on a 2D canvas. Everything is drawn — photos, vector scenes,
// gradient lettering, the mission banner, the wanted stars — so the cover is
// original art, with no logo, artwork or font file from any game.
import { GRADES, LAYOUTS } from './presets.js';
import { drawScene, mulberry32 } from './scenes.js';

/** The poster geometry for a canvas of W x H: frame, panel area, HUD, and the
 *  title band that overlaps the lower part of the panels (like the winning
 *  covers: the giant title sits ON the photos, not in a strip above them). */
export function coverGeometry(w, h) {
  const frame = Math.max(8, Math.round(w * 0.012));
  const hudH = Math.round(h * 0.085);
  // Panels fill nearly the whole canvas, down to the HUD strip.
  const area = {
    x: frame,
    y: frame,
    w: w - frame * 2,
    h: h - frame * 2 - hudH,
  };
  // The title band: the bottom ~24% of the panel area, overlapping the photos.
  const bandH = Math.round(area.h * 0.24);
  const bandY = area.y + area.h - bandH;
  return { frame, titleH: bandH, bandH, bandY, hudH, area };
}

/** Panel rectangles for a layout inside the panel area, with gutters between them. */
export function layoutPanelRects(layout, area, gutter) {
  const { x, y, w, h } = area;
  const g = gutter;
  if (layout === 'hero-top') {
    const heroH = h * 0.58 - g / 2;
    const rowY = y + heroH + g;
    const rowH = h - heroH - g;
    const cellW = (w - g * 2) / 3;
    return [
      { x, y, w, h: heroH },
      { x, y: rowY, w: cellW, h: rowH },
      { x: x + cellW + g, y: rowY, w: cellW, h: rowH },
      { x: x + cellW * 2 + g * 2, y: rowY, w: cellW, h: rowH },
    ];
  }
  if (layout === 'grid') {
    const cellW = (w - g) / 2;
    const cellH = (h - g) / 2;
    return [
      { x, y, w: cellW, h: cellH },
      { x: x + cellW + g, y, w: cellW, h: cellH },
      { x, y: y + cellH + g, w: cellW, h: cellH },
      { x: x + cellW + g, y: y + cellH + g, w: cellW, h: cellH },
    ];
  }
  // hero-left (default): one big hero panel, two stacked panels on the right.
  const heroW = w * 0.62 - g / 2;
  const sideX = x + heroW + g;
  const sideW = w - heroW - g;
  const halfH = (h - g) / 2;
  return [
    { x, y, w: heroW, h },
    { x: sideX, y, w: sideW, h: halfH },
    { x: sideX, y: y + halfH + g, w: sideW, h: halfH },
  ];
}

/** Finds where a photo's action is: the weighted centre of its strongest edges,
// biased toward the upper half where faces usually are. Used for auto-crop. */
export function findPhotoFocus(img) {
  const sw = 48;
  const sh = 48;
  const off = document.createElement('canvas');
  off.width = sw;
  off.height = sh;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, sw, sh);
  let data;
  try {
    data = octx.getImageData(0, 0, sw, sh).data;
  } catch {
    return { cx: 0.5, cy: 0.38 };
  }
  const lum = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0;
  let wx = 0;
  let wy = 0;
  for (let yy = 0; yy < sh - 1; yy++) {
    for (let xx = 0; xx < sw - 1; xx++) {
      const e = Math.abs(lum[yy * sw + xx] - lum[yy * sw + xx + 1])
        + Math.abs(lum[yy * sw + xx] - lum[(yy + 1) * sw + xx]);
      const weight = e * e * (1 - (yy / sh) * 0.35);
      sum += weight;
      wx += weight * (xx + 0.5);
      wy += weight * (yy + 0.5);
    }
  }
  if (sum <= 0) return { cx: 0.5, cy: 0.38 };
  const cx = Math.min(0.8, Math.max(0.2, wx / sum / sw));
  const cy = Math.min(0.75, Math.max(0.25, wy / sum / sh));
  return { cx, cy };
}

/** Draws one photo into a panel rect, cover-fit, with zoom and a crop centre. */
export function drawPanelPhoto(ctx, img, rect, zoom, cx, cy) {
  const { x, y, w, h } = rect;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const s = base * Math.max(1, zoom);
  const dw = iw * s;
  const dh = ih * s;
  let dx = x + w / 2 - cx * dw;
  let dy = y + h / 2 - cy * dh;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Draws one panel: its photo or its vector scene, the grade tint, and a frame. */
export function drawPanel(ctx, rect, panel, photos, grade, isHero) {
  const { x, y, w, h } = rect;
  const r = Math.max(2, Math.round(w * 0.006));
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.clip();
  const entry = panel.photo != null ? photos[panel.photo] : null;
  // A photo entry is { img, name, focus }; accept a bare image too.
  const photo = entry && entry.img ? entry.img : entry;
  if (photo) {
    drawPanelPhoto(ctx, photo, rect, panel.zoom || 1, panel.cx ?? 0.5, panel.cy ?? 0.38);
  } else if (panel.scene) {
    drawScene(ctx, panel.scene, x, y, w, h, grade);
  } else {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, grade.skyTop);
    sky.addColorStop(1, grade.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
  }
  // The grade tint: warm sunset or neon wash over the whole panel.
  const tint = ctx.createLinearGradient(0, y, 0, y + h);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  // Cinematic grading: a warm soft-light wash from the top (sunset) and a
  // teal soft-light wash from the bottom (shadows), so the photos read warm
  // on top and cool below instead of flat.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const warm = ctx.createLinearGradient(0, y, 0, y + h * 0.55);
  warm.addColorStop(0, grade.warm || '#ff7a2a');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(x, y, w, h * 0.55);
  const cool = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
  cool.addColorStop(0, 'rgba(0,0,0,0)');
  cool.addColorStop(1, grade.cool || '#0e5a68');
  ctx.fillStyle = cool;
  ctx.fillRect(x, y + h * 0.45, w, h * 0.55);
  ctx.restore();
  // A soft vignette so the panel edges sit back against the frame.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Panel frame: a pale inner line and a dark outer line, poster style.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  // (v2: no halftone dots — the starburst badge now owns the hero corner.)
}

/** Halftone dots in a corner: a print-poster texture for the hero panel. */
export function drawHalftoneDots(ctx, x, y, w, h, scale) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  const step = Math.max(8, scale * 0.02);
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const d = Math.hypot(xx - (x + w), yy - y) / Math.hypot(w, h);
      const r = Math.max(1, step * 0.32 * (1 - d));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The big poster title: bold condensed capitals with a gradient fill, a thick
 *  black outline and a drop shadow, leaning slightly like hand-lettered art.
 *  The title is sized to ~58% of the band height and shrunk to fit ~96% of the
 *  canvas width, so it shouts at thumbnail size. The tagline underneath is a
 *  script face (falling back to bold italic sans if no script font exists). */
export function drawPosterTitle(ctx, w, bandY, bandH, grade, title, tagline) {
  const text = (title || 'SOLMARINA').trim().toUpperCase();
  const subRaw = (tagline || '').trim();
  // Script faces read best in mixed case, not all caps.
  const sub = subRaw.toLowerCase().replace(/(^|\s|-|')[a-z]/g, (c) => c.toUpperCase());
  let size = Math.round(bandH * 0.58);
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(s * 0.02)}px`; } catch { /* older canvas */ }
  };
  setFont(size);
  while (ctx.measureText(text).width > w * 0.96 && size > 24) {
    size -= 4;
    setFont(size);
  }
  const cx = w / 2;
  const titleY = bandY + bandH * (sub ? 0.42 : 0.52);
  ctx.save();
  ctx.translate(cx, titleY);
  ctx.transform(1, 0, -0.05, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.06;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.strokeStyle = '#12061d';
  ctx.strokeText(text, 0, 0);
  const fill = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  fill.addColorStop(0, grade.titleFrom);
  fill.addColorStop(1, grade.titleTo);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
  if (sub) {
    const subSize = Math.max(16, Math.round(bandH * 0.24));
    ctx.save();
    ctx.font = `700 italic ${subSize}px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.04)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.tagline;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.shadowOffsetY = subSize * 0.06;
    // If no script face exists the stack falls back to a generic cursive; if
    // even that is missing the text still renders, just in the default face.
    ctx.fillText(sub, cx, bandY + bandH * 0.76);
    ctx.restore();
  }
}

/** The city-silhouette strip along the bottom edge of the title band: dark
 *  towers with a few lit windows, deterministic so the cover is stable. */
export function drawCityStrip(ctx, x, y, w, h, grade) {
  const rand = mulberry32(99);
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.03 + rand() * 0.05);
    const bh = h * (0.35 + rand() * 0.65);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    bx += bw + w * 0.008;
  }
  // A few lit windows, and two palm silhouettes at the edges.
  ctx.fillStyle = grade.titleFrom;
  const rand2 = mulberry32(7);
  for (let i = 0; i < Math.floor(w / 46); i++) {
    const wx = x + rand2() * w;
    const wy = y + h * (0.15 + rand2() * 0.6);
    ctx.globalAlpha = 0.55 + rand2() * 0.45;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.004), Math.max(2, h * 0.09));
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** The title band itself: a vivid gradient with a subtle sunburst behind the
 *  title, a bright edge line on top, and the city strip along its bottom. */
export function drawTitleBand(ctx, w, bandY, bandH, grade) {
  const x0 = Math.max(8, Math.round(w * 0.012));
  const bw = w - x0 * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, bandY, bw, bandH);
  ctx.clip();
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, grade.bandFrom || grade.band);
  band.addColorStop(0.55, grade.bandMid || grade.skyBottom);
  band.addColorStop(1, grade.bandTo || grade.skyBottom);
  ctx.fillStyle = band;
  ctx.fillRect(x0, bandY, bw, bandH);
  // Subtle sunburst: pale rays fanning up from a point just below the band.
  const cx = w / 2;
  const cy = bandY + bandH * 1.15;
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 13; i++) {
    const a0 = Math.PI * (1.08 + (i / 13) * 0.84);
    const a1 = a0 + Math.PI * 0.028;
    const r = bandH * 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawCityStrip(ctx, x0, bandY + bandH * 0.82, bw, bandH * 0.18, grade);
  ctx.restore();
  // Bright edge line on top of the band.
  ctx.fillStyle = grade.bandEdge;
  ctx.fillRect(x0, bandY, bw, Math.max(2, bandH * 0.02));
}

/** A yellow starburst badge ("EST. 2026") pinned to a corner of the hero panel. */
export function drawStarburst(ctx, cx, cy, r, grade) {
  const spikes = 16;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.76;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd400';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = '#12061d';
  ctx.stroke();
  ctx.fillStyle = '#12061d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.max(10, Math.round(r * 0.3));
  ctx.font = `900 ${fs}px "Arial Black", Arial, Helvetica, sans-serif`;
  ctx.fillText('EST.', cx, cy - fs * 0.55);
  ctx.fillText('2026', cx, cy + fs * 0.55);
  ctx.restore();
}

/** A diagonal ribbon across the top-left corner of the cover, carrying the
 *  tagline text in bold capitals. */
export function drawRibbon(ctx, w, h, grade, text) {
  const label = (text || '').trim().toUpperCase();
  if (!label) return;
  const th = Math.max(20, Math.round(h * 0.032));
  const bw = w * 0.34;
  const d = w * 0.085;
  ctx.save();
  ctx.translate(d, d);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-bw / 2, -th / 2, bw, th);
  ctx.fillStyle = 'rgba(18, 6, 29, 0.9)';
  ctx.fillRect(-bw / 2, -th / 2, bw, Math.max(2, th * 0.1));
  ctx.fillRect(-bw / 2, th / 2 - Math.max(2, th * 0.1), bw, Math.max(2, th * 0.1));
  let fs = Math.round(th * 0.52);
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(s * 0.06)}px`; } catch { /* older canvas */ }
  };
  setFont(fs);
  while (ctx.measureText(label).width > bw * 0.92 && fs > 9) {
    fs -= 1;
    setFont(fs);
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

/** The bottom HUD strip: a yellow mission banner, the cash, and the wanted stars.
 *  Every element is measured and shrunk to fit, so nothing runs off the edge in
 *  any post size — portrait included. */
export function drawMissionHud(ctx, w, h, hudY, hudH, grade, caption) {
  ctx.fillStyle = grade.hud;
  ctx.fillRect(0, hudY, w, hudH);
  ctx.fillStyle = grade.bandEdge;
  ctx.fillRect(0, hudY, w, Math.max(2, hudH * 0.06));
  const pad = w * 0.02;
  // Mission banner: a yellow parallelogram with black bold text, shrunk to fit.
  const mission = `MISSION: ${(caption.mission || 'PIER PRESSURE').trim().toUpperCase()}`;
  let mSize = Math.round(hudH * 0.44);
  const setMissionFont = (s) => { ctx.font = `900 ${s}px "Arial Black", Arial, Helvetica, sans-serif`; };
  setMissionFont(mSize);
  const maxBannerW = w * 0.46;
  while (ctx.measureText(mission).width + mSize * 1.7 > maxBannerW && mSize > 12) {
    mSize -= 2;
    setMissionFont(mSize);
  }
  const bannerW = ctx.measureText(mission).width + mSize * 1.7;
  const bannerH = hudH * 0.68;
  const bannerY = hudY + (hudH - bannerH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pad + bannerH * 0.35, bannerY);
  ctx.lineTo(pad + bannerW, bannerY);
  ctx.lineTo(pad + bannerW - bannerH * 0.35, bannerY + bannerH);
  ctx.lineTo(pad, bannerY + bannerH);
  ctx.closePath();
  ctx.fillStyle = grade.mission;
  ctx.fill();
  ctx.fillStyle = '#12061d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mission, pad + bannerW / 2, bannerY + bannerH / 2 + 1);
  ctx.restore();
  // Cash, in green, right-aligned before the wanted block.
  const cash = (caption.cash || '$1,250').trim();
  ctx.save();
  ctx.font = `900 ${Math.round(hudH * 0.52)}px "Arial Black", Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grade.cash;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = hudH * 0.08;
  ctx.fillText(cash, w * 0.66, hudY + hudH * 0.52);
  ctx.restore();
  // Wanted stars, far right: the label above five stars, all fitted to the space.
  const wanted = Math.max(0, Math.min(5, caption.wanted ?? 3));
  const wantX = w * 0.70;
  const avail = w - pad - wantX;
  let starSize = Math.round(hudH * 0.5);
  ctx.save();
  ctx.font = `800 ${Math.round(hudH * 0.26)}px Arial, Helvetica, sans-serif`;
  const labelW = ctx.measureText('WANTED').width;
  const starAdvance = () => {
    ctx.font = `${starSize}px Arial, Helvetica, sans-serif`;
    return ctx.measureText('★').width + starSize * 0.08;
  };
  while (Math.max(labelW, 5 * starAdvance()) > avail && starSize > 12) starSize -= 2;
  ctx.font = `800 ${Math.round(hudH * 0.26)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = grade.tagline;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', wantX, hudY + hudH * 0.3);
  ctx.font = `${starSize}px Arial, Helvetica, sans-serif`;
  const advance = starAdvance();
  const starY = hudY + hudH * 0.72;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? grade.starOn : grade.starOff;
    ctx.fillText('★', wantX + i * advance, starY);
  }
  ctx.restore();
}

/** Light deterministic grain over the whole cover, for a printed-poster feel. */
export function drawGrain(ctx, w, h) {
  const rand = mulberry32(w * 7919 + h * 104729);
  ctx.save();
  for (let i = 0; i < 1400; i++) {
    const a = rand();
    ctx.fillStyle = a < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.restore();
}

/** Draws the whole cover onto the canvas, at the canvas's own size. v2 order:
 *  photo panels fill the canvas first; the giant title band overlaps their
 *  lower part; then the starburst badge, the corner ribbon, and the HUD. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] ? state.layout : 'hero-left';
  const { frame, bandH, bandY, hudH, area } = coverGeometry(w, h);
  const gutter = Math.max(6, Math.round(w * 0.012));
  ctx.fillStyle = grade.frame;
  ctx.fillRect(0, 0, w, h);
  // Panels: all photo in every default/preset/shot flow.
  const rects = layoutPanelRects(layout, area, gutter);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const panel = panels[i] || { photo: null, scene: 'sunset', zoom: 1, cx: 0.5, cy: 0.38 };
    drawPanel(ctx, rect, panel, state.photos || [], grade, i === 0);
  });
  // Title band overlapping the lower part of the panels, title + script tagline.
  drawTitleBand(ctx, w, bandY, bandH, grade);
  drawPosterTitle(ctx, w, bandY, bandH, grade, state.title, state.tagline);
  // Starburst badge on the hero panel's top-right corner.
  const hero = rects[0];
  if (hero) {
    const r = Math.max(26, Math.min(hero.w, hero.h) * 0.11);
    drawStarburst(ctx, hero.x + hero.w - r * 0.85, hero.y + r * 0.85, r, grade);
  }
  // Diagonal ribbon at the top-left corner of the cover.
  drawRibbon(ctx, w, h, grade, state.tagline);
  drawMissionHud(ctx, w, h, h - frame - hudH, hudH, grade, state);
  drawGrain(ctx, w, h);
}

/** Renders the cover at an export size and resolves to a PNG blob. */
export function exportCoverPng(state, sizeKey) {
  const size = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] }[sizeKey] || [1080, 1080];
  const canvas = document.createElement('canvas');
  canvas.width = size[0];
  canvas.height = size[1];
  drawCover(canvas, state);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}
