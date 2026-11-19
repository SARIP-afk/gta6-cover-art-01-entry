// Vector scenes drawn on the canvas: a sunset sky, a neon skyline and a palm
// boulevard. All original shapes — no photo, no borrowed artwork. A panel can show
// one of these when it has no photo, so a cover still reads as a Vice City poster
// from a single uploaded picture.

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

/** Draws one palm tree silhouette: a leaning, tapered trunk and seven fronds
 *  that arch up from the crown and droop at the tips. */
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
  // Fronds: seven arcs fanning from the crown — up first, then drooping tips.
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.02 + (i / 6) * 0.96);
    const len = s * (0.42 + (i % 3) * 0.04);
    const tipX = topX + Math.cos(angle) * len;
    const tipY = topY + Math.sin(angle) * len * 0.28 + s * 0.16;
    ctx.lineWidth = Math.max(2, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.5,
      topY - s * 0.2,
      tipX,
      tipY,
    );
    ctx.stroke();
  }
  // Coconuts: two dots under the crown.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A striped synthwave sun: a glowing disc with horizontal gaps cut through it. */
export function drawStripedSun(ctx, cx, cy, r, core, rim) {
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, rim);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
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

/** Sunset sky over a sea, with palms at the edges and birds in the sky. */
export function drawSunsetScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  drawStripedSun(ctx, x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.22, grade.sunCore, grade.sunRim);
  // Sea: a dark band with light streaks.
  const seaY = y + h * 0.68;
  ctx.fillStyle = 'rgba(30, 8, 52, 0.85)';
  ctx.fillRect(x, seaY, w, y + h - seaY);
  const rand = mulberry32(7);
  ctx.fillStyle = 'rgba(255, 190, 120, 0.5)';
  for (let i = 0; i < 9; i++) {
    const sy = seaY + (y + h - seaY) * (0.12 + rand() * 0.8);
    const sw = w * (0.1 + rand() * 0.35);
    ctx.fillRect(x + w * rand() * 0.7, sy, sw, Math.max(2, h * 0.006));
  }
  // Palms left and right, birds above the sun.
  ctx.fillStyle = 'rgba(20, 6, 34, 0.9)';
  drawPalmTree(ctx, x + w * 0.1, y + h * 0.97, h * 0.42, 'rgba(20, 6, 34, 0.92)', 0.15);
  drawPalmTree(ctx, x + w * 0.92, y + h * 0.99, h * 0.36, 'rgba(20, 6, 34, 0.92)', -0.12);
  ctx.strokeStyle = 'rgba(20, 6, 34, 0.8)';
  ctx.lineWidth = Math.max(2, h * 0.008);
  for (let i = 0; i < 3; i++) {
    const bx = x + w * (0.2 + i * 0.22);
    const by = y + h * (0.14 + i * 0.05);
    const s = w * 0.03;
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.3, by - s * 0.6, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.3, by - s * 0.6, bx + s, by);
    ctx.stroke();
  }
}

/** A night skyline: dark towers with lit windows under a neon horizon glow. */
export function drawSkylineScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
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
  // Towers, back row then front row, with lit windows.
  const rand = mulberry32(21);
  const rows = [
    { base: 0.72, min: 0.28, max: 0.5, color: 'rgba(24, 10, 48, 0.95)' },
    { base: 0.88, min: 0.12, max: 0.34, color: 'rgba(10, 4, 24, 0.98)' },
  ];
  for (const row of rows) {
    let bx = x;
    while (bx < x + w) {
      const bw = w * (0.09 + rand() * 0.12);
      const bh = h * (row.min + rand() * (row.max - row.min));
      const by = y + h * row.base - bh;
      ctx.fillStyle = row.color;
      ctx.fillRect(bx, by, bw, y + h - by);
      // Lit windows: a sparse grid of tiny neon squares.
      const cols = Math.max(1, Math.floor(bw / (w * 0.035)));
      const winRows = Math.max(1, Math.floor(bh / (h * 0.06)));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < winRows; r++) {
          if (rand() < 0.28) {
            ctx.fillStyle = rand() < 0.5 ? 'rgba(125, 249, 255, 0.9)' : 'rgba(255, 214, 92, 0.9)';
            ctx.fillRect(bx + bw * (0.14 + (c / cols) * 0.72), by + bh * (0.1 + (r / winRows) * 0.8), Math.max(2, w * 0.014), Math.max(2, h * 0.012));
          }
        }
      }
      bx += bw + w * 0.015;
    }
  }
}

/** A palm boulevard at golden hour: warm sky, road, and a row of palms. */
export function drawPalmsScene(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.6, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  drawStripedSun(ctx, x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.16, grade.sunCore, grade.sunRim);
  // Road: a dark band with a pale centre line.
  ctx.fillStyle = 'rgba(24, 8, 40, 0.9)';
  ctx.fillRect(x, y + h * 0.72, w, y + h - (y + h * 0.72));
  ctx.fillStyle = 'rgba(255, 240, 200, 0.85)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + w * (0.06 + i * 0.19), y + h * 0.85, w * 0.09, Math.max(2, h * 0.008));
  }
  // A row of palms receding to the right.
  const rand = mulberry32(42);
  for (let i = 0; i < 4; i++) {
    const px = x + w * (0.08 + i * 0.24);
    const ps = h * (0.5 - i * 0.07) * (0.9 + rand() * 0.2);
    drawPalmTree(ctx, px, y + h * 0.74, ps, 'rgba(18, 6, 32, 0.92)', 0.1 + rand() * 0.08);
  }
}

/** Draws the named scene into the rectangle. */
export function drawScene(ctx, name, x, y, w, h, grade) {
  if (name === 'skyline') drawSkylineScene(ctx, x, y, w, h, grade);
  else if (name === 'palms') drawPalmsScene(ctx, x, y, w, h, grade);
  else drawSunsetScene(ctx, x, y, w, h, grade);
}
