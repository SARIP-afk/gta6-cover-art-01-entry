// Vector scenes drawn on the canvas: a sunset sky, a neon skyline, a palm
// boulevard and a dense neon downtown. All original shapes — no photo, no
// borrowed artwork. A panel can show one of these when it has no photo, so a
// cover still reads as a Vice City poster from a single uploaded picture.
//
// v2: every scene got denser. The sunset has layered cloud bands, a bigger
// bird flock and a sun-reflection column on the sea; the skyline has a third,
// farther tower row, antennae, more lit windows in three neon colours and a
// street with reflections and car lights at its base; the boulevard has six
// palms, a distant skyline silhouette and a sunlit road; and downtown is new
// — a neon street canyon with glowing signs, string lights and a wet street
// mirroring the signs. The palms themselves are richer too: nine fronds,
// ringed trunks and a three-coconut cluster.
//
// The scenes are a manual fallback only. The v2 cover engine fills every
// panel with a photo by default (all-photo panels, giant overlapping title,
// cinematic grade); a panel shows a drawn scene only when the user picks
// "Drawn scene" for it in the editor.

/** A small deterministic random generator, so a scene draws the same every time. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A flock of gull silhouettes: small two-arc birds scattered by `rand`. */
function drawBirdFlock(ctx, x, y, w, h, rand, count, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, h * 0.008);
  for (let i = 0; i < count; i++) {
    const bx = x + w * (0.08 + rand() * 0.84);
    const by = y + h * (0.06 + rand() * 0.3);
    const s = w * (0.018 + rand() * 0.022);
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.3, by - s * 0.6, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.3, by - s * 0.6, bx + s, by);
    ctx.stroke();
  }
  ctx.restore();
}

/** A band of soft horizontal clouds: overlapping translucent ellipses. */
function drawCloudBand(ctx, x, y, w, bandH, rand, color, count) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const cx = x + w * rand();
    const cy = y + bandH * rand();
    const cw = w * (0.1 + rand() * 0.22);
    const ch = bandH * (0.25 + rand() * 0.35);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Lit windows on one tower face: a sparse grid of tiny neon squares in
 *  three colours, denser near the tower's middle floors. */
function drawLitWindows(ctx, bx, by, bw, bh, rand, density) {
  const palette = [
    'rgba(125, 249, 255, 0.9)',
    'rgba(255, 214, 92, 0.9)',
    'rgba(255, 110, 199, 0.85)',
  ];
  const cols = Math.max(1, Math.floor(bw / (bw * 0.16 + 6)));
  const winRows = Math.max(1, Math.floor(bh / (bh * 0.09 + 5)));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < winRows; r++) {
      // Middle floors glow more; the top and bottom rows stay sparser.
      const band = 0.5 + 0.5 * Math.sin((Math.PI * (r + 0.5)) / winRows);
      if (rand() < density * band) {
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.fillRect(
          bx + bw * (0.1 + (c / cols) * 0.8),
          by + bh * (0.08 + (r / winRows) * 0.84),
          Math.max(2, bw * 0.09),
          Math.max(2, bh * 0.055),
        );
      }
    }
  }
}

/** Draws one palm tree silhouette: a leaning, ringed trunk and nine fronds
 *  that arch up from the crown and droop at the tips, with a coconut cluster. */
export function drawPalmTree(ctx, x, y, s, color, lean = 0.12) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a tapered, gently curving column leaning to the right.
  const topX = x + s * lean;
  const topY = y - s;
  ctx.lineWidth = Math.max(3, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * lean * 0.3, y - s * 0.55, topX, topY);
  ctx.stroke();
  // A slight second stroke makes the trunk read as a solid column, not a wire.
  ctx.lineWidth = Math.max(1.5, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(x + s * 0.03, y);
  ctx.quadraticCurveTo(x + s * lean * 0.3 + s * 0.03, y - s * 0.55, topX + s * 0.02, topY);
  ctx.stroke();
  // Ring marks up the trunk: short cross-strokes that follow the lean.
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const rx = x + (topX - x) * t;
    const ry = y - s * t;
    const half = Math.max(2, s * 0.035 * (1 - t * 0.4));
    ctx.beginPath();
    ctx.moveTo(rx - half, ry);
    ctx.lineTo(rx + half, ry - s * 0.012);
    ctx.stroke();
  }
  // Fronds: nine arcs fanning from the crown — up first, then drooping tips.
  // Outer fronds are longer and droop further; inner ones stay short and high.
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * (0.01 + (i / 8) * 0.98);
    const edge = Math.abs(i - 4) / 4;
    const len = s * (0.34 + edge * 0.16 + (i % 3) * 0.02);
    const tipX = topX + Math.cos(angle) * len;
    const tipY = topY + Math.sin(angle) * len * 0.28 + s * (0.14 + edge * 0.08);
    ctx.lineWidth = Math.max(2, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.5,
      topY - s * (0.22 - edge * 0.06),
      tipX,
      tipY,
    );
    ctx.stroke();
    // A midrib line down each frond keeps it from reading as a bare wire.
    ctx.lineWidth = Math.max(1, s * 0.01);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.45,
      topY - s * 0.16,
      topX + Math.cos(angle) * len * 0.85,
      topY + Math.sin(angle) * len * 0.24 + s * 0.12,
    );
    ctx.stroke();
  }
  // Coconuts: a cluster of three dots under the crown.
  ctx.beginPath();
  ctx.arc(topX - s * 0.035, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.035, topY + s * 0.04, s * 0.032, 0, Math.PI * 2);
  ctx.arc(topX, topY + s * 0.075, s * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A striped synthwave sun: a glowing disc with horizontal gaps cut through it,
 *  ringed by a faint halo so it reads against a bright sky. */
export function drawStripedSun(ctx, cx, cy, r, core, rim) {
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, rim);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.globalAlpha = 1;
  // Halo ring: a thin bright circle just outside the disc.
  ctx.strokeStyle = core;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, core);
  disc.addColorStop(1, rim);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Cut the stripes: only the lower half gets gaps, widening toward the bottom.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5; i++) {
    const y = cy + r * (0.08 + i * 0.17);
    ctx.fillRect(cx - r, y, r * 2, r * (0.03 + i * 0.018));
  }
  ctx.restore();
}

/** Sunset sky over a layered sea, with cloud bands, a bird flock, a
 *  sun-reflection column on the water and palms at the edges. */
export function drawSunsetScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const rand = mulberry32(7);
  // Two cloud bands: a faint high one and a warmer, denser one near the sun.
  drawCloudBand(ctx, x, y + h * 0.08, w, h * 0.12, rand, 'rgba(255, 220, 235, 0.16)', 6);
  drawCloudBand(ctx, x, y + h * 0.3, w, h * 0.14, rand, 'rgba(255, 170, 120, 0.28)', 7);
  drawStripedSun(ctx, x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.22, grade.sunCore, grade.sunRim);
  // Sea: a dark band with a bright reflection column under the sun and
  // light streaks that widen as they near the viewer.
  const seaY = y + h * 0.68;
  ctx.fillStyle = 'rgba(30, 8, 52, 0.85)';
  ctx.fillRect(x, seaY, w, y + h - seaY);
  const sunX = x + w * 0.5;
  ctx.fillStyle = 'rgba(255, 190, 120, 0.55)';
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const sy = seaY + (y + h - seaY) * (0.08 + t * 0.85);
    const sw = w * (0.08 + t * 0.3);
    ctx.fillRect(sunX - sw / 2, sy, sw, Math.max(2, h * 0.008));
  }
  ctx.fillStyle = 'rgba(255, 190, 120, 0.4)';
  for (let i = 0; i < 10; i++) {
    const sy = seaY + (y + h - seaY) * (0.12 + rand() * 0.8);
    const sw = w * (0.08 + rand() * 0.3);
    ctx.fillRect(x + w * rand() * 0.75, sy, sw, Math.max(2, h * 0.006));
  }
  // Palms: two tall ones at the edges and a small distant one on the horizon.
  ctx.fillStyle = 'rgba(20, 6, 34, 0.9)';
  drawPalmTree(ctx, x + w * 0.1, y + h * 0.97, h * 0.42, 'rgba(20, 6, 34, 0.92)', 0.15);
  drawPalmTree(ctx, x + w * 0.92, y + h * 0.99, h * 0.36, 'rgba(20, 6, 34, 0.92)', -0.12);
  drawPalmTree(ctx, x + w * 0.3, y + h * 0.7, h * 0.14, 'rgba(20, 6, 34, 0.75)', 0.1);
  // A six-bird flock above and around the sun.
  drawBirdFlock(ctx, x, y, w, h, rand, 6, 'rgba(20, 6, 34, 0.8)');
}

/** A night skyline: dark towers with lit windows under a neon horizon glow,
 *  a moon, a street at the base with window reflections and car lights. */
export function drawSkylineScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const rand = mulberry32(21);
  // Stars: a sparse scatter in the top half of the sky.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 26; i++) {
    const sx = x + w * rand();
    const sy = y + h * rand() * 0.45;
    const sr = Math.max(1, w * 0.002 * (0.6 + rand()));
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moon.
  ctx.fillStyle = grade.sunCore;
  ctx.beginPath();
  ctx.arc(x + w * 0.78, y + h * 0.2, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Neon horizon glow.
  const glow = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h * 0.8);
  glow.addColorStop(0, 'rgba(255, 110, 199, 0)');
  glow.addColorStop(0.5, 'rgba(255, 110, 199, 0.45)');
  glow.addColorStop(1, 'rgba(255, 110, 199, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.25);
  // Towers in three rows — far, middle, front — so the skyline has depth.
  // Each row is denser and darker than the one behind it.
  const rows = [
    { base: 0.6, min: 0.3, max: 0.52, color: 'rgba(40, 18, 72, 0.9)', density: 0.2, antenna: false },
    { base: 0.72, min: 0.28, max: 0.5, color: 'rgba(24, 10, 48, 0.95)', density: 0.3, antenna: true },
    { base: 0.88, min: 0.12, max: 0.34, color: 'rgba(10, 4, 24, 0.98)', density: 0.38, antenna: true },
  ];
  for (const row of rows) {
    let bx = x;
    while (bx < x + w) {
      const bw = w * (0.08 + rand() * 0.1);
      const bh = h * (row.min + rand() * (row.max - row.min));
      const by = y + h * row.base - bh;
      ctx.fillStyle = row.color;
      ctx.fillRect(bx, by, bw, y + h - by);
      // A rooftop antenna with a red beacon on some towers.
      if (row.antenna && rand() < 0.4) {
        const ax = bx + bw * (0.3 + rand() * 0.4);
        ctx.strokeStyle = row.color;
        ctx.lineWidth = Math.max(2, w * 0.006);
        ctx.beginPath();
        ctx.moveTo(ax, by);
        ctx.lineTo(ax, by - h * 0.08);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 59, 48, 0.95)';
        ctx.beginPath();
        ctx.arc(ax, by - h * 0.08, Math.max(2, w * 0.008), 0, Math.PI * 2);
        ctx.fill();
      }
      drawLitWindows(ctx, bx, by, bw, bh, rand, row.density);
      bx += bw + w * 0.012;
    }
  }
  // Street: a dark band at the base with vertical window reflections and
  // paired car headlights driving through it.
  const streetY = y + h * 0.88;
  ctx.fillStyle = 'rgba(8, 3, 18, 0.95)';
  ctx.fillRect(x, streetY, w, y + h - streetY);
  for (let i = 0; i < 12; i++) {
    const rx = x + w * rand();
    ctx.fillStyle = rand() < 0.5 ? 'rgba(125, 249, 255, 0.35)' : 'rgba(255, 110, 199, 0.3)';
    ctx.fillRect(rx, streetY + h * 0.01, Math.max(2, w * 0.008), h * 0.09 * (0.5 + rand() * 0.5));
  }
  for (let i = 0; i < 3; i++) {
    const cx = x + w * (0.15 + i * 0.32);
    const cy = streetY + h * 0.06;
    ctx.fillStyle = 'rgba(255, 240, 180, 0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, w * 0.008), 0, Math.PI * 2);
    ctx.arc(cx + w * 0.03, cy, Math.max(2, w * 0.008), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A palm boulevard at golden hour: warm sky, a sunlit road, a distant
 *  skyline silhouette and a row of six palms receding to the right. */
export function drawPalmsScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.6, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const rand = mulberry32(42);
  drawCloudBand(ctx, x, y + h * 0.1, w, h * 0.1, rand, 'rgba(255, 230, 200, 0.2)', 5);
  drawStripedSun(ctx, x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.16, grade.sunCore, grade.sunRim);
  // Distant skyline silhouette on the horizon, behind the palms.
  ctx.fillStyle = 'rgba(40, 16, 64, 0.55)';
  let sx = x;
  while (sx < x + w) {
    const sw = w * (0.07 + rand() * 0.09);
    const sh = h * (0.08 + rand() * 0.14);
    ctx.fillRect(sx, y + h * 0.72 - sh, sw, sh);
    sx += sw + w * 0.02;
  }
  // Road: a dark band with a pale centre line and a warm sun reflection.
  ctx.fillStyle = 'rgba(24, 8, 40, 0.9)';
  ctx.fillRect(x, y + h * 0.72, w, y + h - (y + h * 0.72));
  ctx.fillStyle = 'rgba(255, 190, 120, 0.35)';
  ctx.fillRect(x + w * 0.6, y + h * 0.72, w * 0.24, h * 0.28);
  ctx.fillStyle = 'rgba(255, 240, 200, 0.85)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x + w * (0.04 + i * 0.16), y + h * 0.85, w * 0.08, Math.max(2, h * 0.008));
  }
  // A row of six palms receding to the right, alternating lean.
  for (let i = 0; i < 6; i++) {
    const px = x + w * (0.06 + i * 0.16);
    const ps = h * (0.52 - i * 0.05) * (0.9 + rand() * 0.2);
    drawPalmTree(ctx, px, y + h * 0.74, ps, 'rgba(18, 6, 32, 0.92)', (i % 2 === 0 ? 1 : -1) * (0.08 + rand() * 0.08));
  }
  drawBirdFlock(ctx, x, y, w, h, rand, 3, 'rgba(30, 10, 48, 0.7)');
}

/** A neon downtown street canyon at night: towers on both sides, glowing
 *  shop signs, string lights across the street and a wet road mirroring it
 *  all. New in v2. */
export function drawDowntownScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.7, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const rand = mulberry32(99);
  // A sliver of sky and a small moon down the middle of the canyon.
  ctx.fillStyle = grade.sunCore;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.14, Math.min(w, h) * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Tower walls left and right, leaning inward toward the vanishing point.
  const signColors = ['#ff6ec7', '#7df9ff', '#ffd65c', '#7dff8a', '#ff5e7a'];
  const walls = [
    { side: -1, color: 'rgba(16, 6, 32, 0.98)' },
    { side: 1, color: 'rgba(12, 4, 26, 0.98)' },
  ];
  for (const wall of walls) {
    const edge = wall.side < 0 ? x : x + w;
    const inner = wall.side < 0 ? x + w * 0.34 : x + w * 0.66;
    ctx.fillStyle = wall.color;
    ctx.beginPath();
    ctx.moveTo(edge, y);
    ctx.lineTo(inner, y + h * 0.1);
    ctx.lineTo(inner, y + h);
    ctx.lineTo(edge, y + h);
    ctx.closePath();
    ctx.fill();
    // Vertical neon signs down the wall: glowing bars with bright cores.
    for (let i = 0; i < 5; i++) {
      const sy = y + h * (0.14 + i * 0.15);
      const sh = h * (0.07 + rand() * 0.04);
      const signX = wall.side < 0
        ? x + w * (0.03 + rand() * 0.1)
        : x + w * (0.82 - rand() * 0.1);
      const signW = w * (0.05 + rand() * 0.04);
      const color = signColors[Math.floor(rand() * signColors.length)];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(6, w * 0.02);
      ctx.fillStyle = color;
      ctx.fillRect(signX, sy, signW, sh);
      ctx.restore();
      // Bright core bar inside each sign.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(signX + signW * 0.2, sy + sh * 0.25, signW * 0.6, sh * 0.16);
      ctx.fillRect(signX + signW * 0.2, sy + sh * 0.55, signW * 0.6, sh * 0.16);
    }
    // Lit windows on the wall above the signs.
    const winRand = mulberry32(100 + (wall.side < 0 ? 0 : 7));
    for (let i = 0; i < 18; i++) {
      if (winRand() < 0.5) {
        ctx.fillStyle = winRand() < 0.5 ? 'rgba(125, 249, 255, 0.85)' : 'rgba(255, 214, 92, 0.85)';
        const wx = wall.side < 0
          ? x + w * (0.02 + winRand() * 0.24)
          : x + w * (0.74 + winRand() * 0.24);
        ctx.fillRect(wx, y + h * (0.05 + winRand() * 0.5), Math.max(2, w * 0.015), Math.max(2, h * 0.012));
      }
    }
  }
  // String lights across the street: two sagging lines of warm bulbs.
  for (let row = 0; row < 2; row++) {
    const ly = y + h * (0.2 + row * 0.09);
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.5)';
    ctx.lineWidth = Math.max(1, h * 0.003);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, ly - h * 0.02);
    ctx.quadraticCurveTo(x + w * 0.5, ly + h * 0.04, x + w * 0.7, ly - h * 0.02);
    ctx.stroke();
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const bx = x + w * (0.3 + t * 0.4);
      const by = ly - h * 0.02 + Math.sin(t * Math.PI) * h * 0.035;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 214, 92, 0.95)' : 'rgba(255, 110, 199, 0.95)';
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(2, w * 0.008), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Wet street: a dark band with long vertical reflections of the signs and
  // a bright centre line leading to the vanishing point.
  const streetY = y + h * 0.72;
  ctx.fillStyle = 'rgba(10, 4, 22, 0.96)';
  ctx.fillRect(x, streetY, w, y + h - streetY);
  for (let i = 0; i < 14; i++) {
    const rx = x + w * (0.06 + rand() * 0.88);
    ctx.fillStyle = signColors[Math.floor(rand() * signColors.length)];
    ctx.globalAlpha = 0.3 + rand() * 0.25;
    ctx.fillRect(rx, streetY + h * 0.02, Math.max(2, w * 0.01), h * (0.08 + rand() * 0.16));
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 240, 200, 0.8)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.485, streetY);
  ctx.lineTo(x + w * 0.515, streetY);
  ctx.lineTo(x + w * 0.56, y + h);
  ctx.lineTo(x + w * 0.44, y + h);
  ctx.closePath();
  ctx.fill();
}

/** Draws the named scene into the rectangle. Unknown names fall back to the
 *  sunset so a stale panel value can never blank a panel. */
export function drawScene(ctx, name, x, y, w, h, grade) {
  if (name === 'skyline') drawSkylineScene(ctx, x, y, w, h, grade);
  else if (name === 'palms') drawPalmsScene(ctx, x, y, w, h, grade);
  else if (name === 'downtown') drawDowntownScene(ctx, x, y, w, h, grade);
  else drawSunsetScene(ctx, x, y, w, h, grade);
}
