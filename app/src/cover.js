// The cover engine: turns photos, a caption and a grade into a multi-panel
// GTA-style poster on a 2D canvas. Everything is drawn — photos, vector scenes,
// gradient lettering, the mission banner, the wanted stars — so the cover is
// original art, with no logo, artwork or font file from any game.
import { GRADES, LAYOUTS } from './presets.js';
import { drawScene, mulberry32 } from './scenes.js';

/** The poster geometry for a canvas of W x H: frame, title band, panel area, HUD. */
export function coverGeometry(w, h) {
  const frame = Math.max(8, Math.round(w * 0.012));
  const titleH = Math.round(h * 0.165);
  const hudH = Math.round(h * 0.085);
  const area = {
    x: frame,
    y: frame + titleH,
    w: w - frame * 2,
    h: h - frame * 2 - titleH - hudH,
  };
  return { frame, titleH, hudH, area };
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
  if (isHero) drawHalftoneDots(ctx, x + w * 0.82, y + h * 0.03, w * 0.15, h * 0.2, w);
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
 *  black outline and a drop shadow, leaning slightly like hand-lettered art. */
export function drawPosterTitle(ctx, w, bandY, bandH, grade, title, tagline) {
  const text = (title || 'SOLMARINA').trim().toUpperCase();
  const sub = (tagline || '').trim().toUpperCase();
  let size = Math.round(bandH * 0.56);
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(s * 0.02)}px`; } catch { /* older canvas */ }
  };
  setFont(size);
  while (ctx.measureText(text).width > w * 0.92 && size > 24) {
    size -= 4;
    setFont(size);
  }
  const cx = w / 2;
  const titleY = bandY + bandH * (sub ? 0.5 : 0.58);
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
    const subSize = Math.max(16, Math.round(bandH * 0.17));
    ctx.save();
    ctx.font = `800 ${subSize}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.3)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.tagline;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, cx, bandY + bandH * 0.86);
    ctx.restore();
  }
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

/** Draws the whole cover onto the canvas, at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] ? state.layout : 'hero-left';
  const { frame, titleH, hudH, area } = coverGeometry(w, h);
  const gutter = Math.max(6, Math.round(w * 0.012));
  ctx.fillStyle = grade.frame;
  ctx.fillRect(0, 0, w, h);
  // Title band: a deep gradient with a bright edge line.
  const band = ctx.createLinearGradient(0, frame, 0, frame + titleH);
  band.addColorStop(0, grade.band);
  band.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = band;
  ctx.fillRect(frame, frame, w - frame * 2, titleH);
  ctx.fillStyle = grade.bandEdge;
  ctx.fillRect(frame, frame + titleH - Math.max(2, h * 0.004), w - frame * 2, Math.max(2, h * 0.004));
  drawPosterTitle(ctx, w, frame, titleH, grade, state.title, state.tagline);
  // Panels.
  const rects = layoutPanelRects(layout, area, gutter);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const panel = panels[i] || { photo: null, scene: 'sunset', zoom: 1, cx: 0.5, cy: 0.38 };
    drawPanel(ctx, rect, panel, state.photos || [], grade, i === 0);
  });
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
