// Solmarina Cover Maker — cover drawing engine.
// Pure canvas code: given a state and a size, paints the whole poster.
// No network, no clock, no randomness at draw time, so the same state
// always paints the same pixels.
export const COVER_SIZES = {
  square: { w: 1080, h: 1080, label: '1:1 Square' },
  portrait: { w: 1080, h: 1350, label: '4:5 Portrait' },
  wide: { w: 1920, h: 1080, label: '16:9 Wide' },
  story: { w: 1080, h: 1920, label: '9:16 Story' },
};

export const GRADES = {
  sunset: { name: 'Solmarina Sunset', warm: 'rgba(255,122,26,0.20)', cool: 'rgba(8,64,92,0.20)', tint: 'rgba(255,166,66,0.10)' },
  neon: { name: 'Neon Night', warm: 'rgba(255,0,140,0.20)', cool: 'rgba(0,229,255,0.18)', tint: 'rgba(150,40,255,0.10)' },
  golden: { name: 'Golden Hour', warm: 'rgba(255,190,60,0.22)', cool: 'rgba(60,30,90,0.14)', tint: 'rgba(255,214,120,0.10)' },
};

export const LAYOUTS = ['hero-top', 'hero-left', 'grid'];

// Deterministic pseudo-random: same seed, same skyline, every render.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function panelRects(layout, w, h, banner) {
  const body = h - banner;
  if (layout === 'hero-left') {
    const heroW = Math.round(w * 0.58);
    const colH = body / 4;
    const rects = [{ x: 0, y: banner, w: heroW, h: body }];
    for (let i = 0; i < 4; i++) rects.push({ x: heroW, y: banner + i * colH, w: w - heroW, h: colH });
    return rects;
  }
  if (layout === 'grid') {
    const topH = Math.round(body * 0.52);
    const heroW = Math.round(w * 0.62);
    const rects = [
      { x: 0, y: banner, w: heroW, h: topH },
      { x: heroW, y: banner, w: w - heroW, h: topH },
    ];
    const bw = w / 3;
    for (let i = 0; i < 3; i++) rects.push({ x: i * bw, y: banner + topH, w: bw, h: body - topH });
    return rects;
  }
  // hero-top (default)
  const heroH = Math.round(body * 0.56);
  const rects = [{ x: 0, y: banner, w, h: heroH }];
  const bw = w / 4;
  for (let i = 0; i < 4; i++) rects.push({ x: i * bw, y: banner + heroH, w: bw, h: body - heroH });
  return rects;
}

function drawPhotoInto(ctx, img, rect, panel) {
  const zoom = panel.zoom || 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Put the focus point at the panel centre, then clamp so the photo
  // always covers the whole panel — no empty band at any edge.
  const wantX = rect.x + rect.w / 2 - (panel.cx ?? 0.5) * dw;
  const wantY = rect.y + rect.h / 2 - (panel.cy ?? 0.42) * dh;
  const dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, wantX));
  const dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, wantY));
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintSkyline(ctx, rect, rand, lit) {
  const base = rect.y + rect.h;
  let x = rect.x;
  while (x < rect.x + rect.w) {
    const bw = rect.w * (0.06 + rand() * 0.09);
    const bh = rect.h * (0.25 + rand() * 0.55);
    ctx.fillStyle = '#160b26';
    ctx.fillRect(x, base - bh, bw, bh);
    if (lit) {
      ctx.fillStyle = 'rgba(255,214,110,0.9)';
      const cols = Math.max(1, Math.floor(bw / 14));
      const rows = Math.max(1, Math.floor(bh / 18));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.42) ctx.fillRect(x + 3 + c * 14, base - bh + 4 + r * 18, 6, 8);
        }
      }
    }
    x += bw + 2;
  }
}

function paintPalm(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.22, y - s * 0.85);
  ctx.stroke();
  const topX = x + s * 0.22;
  const topY = y - s * 0.85;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.16);
    const len = s * (0.34 + (i % 2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.5 - s * 0.12,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len + s * 0.18,
    );
    ctx.stroke();
  }
}

// Painted fallback scenes, used only when a panel has no photo.
export function paintScene(ctx, scene, rect) {
  const rand = seeded(1234 + rect.w + rect.h * 7 + (scene ? scene.length * 131 : 0));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (scene === 'downtown') {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, '#0b1030');
    g.addColorStop(0.6, '#3b1d5e');
    g.addColorStop(1, '#0a0618');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,220,120,0.85)';
    for (let i = 0; i < 14; i++) ctx.fillRect(rect.x + rand() * rect.w, rect.y + rand() * rect.h * 0.3, 2, 2);
    paintSkyline(ctx, rect, rand, true);
    ctx.fillStyle = 'rgba(0,229,255,0.25)';
    ctx.fillRect(rect.x, rect.y + rect.h * 0.86, rect.w, rect.h * 0.14);
  } else if (scene === 'neon') {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, '#2b005e');
    g.addColorStop(0.55, '#c4006b');
    g.addColorStop(1, '#0d0221');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(0,229,255,0.7)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      const y = rect.y + (rect.h / 6) * i;
      ctx.beginPath(); ctx.moveTo(rect.x, y); ctx.lineTo(rect.x + rect.w, y); ctx.stroke();
    }
    paintSkyline(ctx, rect, rand, true);
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.arc(rect.x + rect.w * 0.72, rect.y + rect.h * 0.3, rect.w * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // sunset (default scene)
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, '#ff9a3d');
    g.addColorStop(0.5, '#ff5e62');
    g.addColorStop(1, '#4b1d6e');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(rect.x + rect.w * 0.68, rect.y + rect.h * 0.42, rect.w * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,120,60,0.35)';
    ctx.fillRect(rect.x, rect.y + rect.h * 0.62, rect.w, rect.h * 0.38);
    paintSkyline(ctx, { x: rect.x, y: rect.y + rect.h * 0.45, w: rect.w, h: rect.h * 0.55 }, rand, false);
    paintPalm(ctx, rect.x + rect.w * 0.12, rect.y + rect.h * 0.98, rect.h * 0.5, '#1c0a2e');
    paintPalm(ctx, rect.x + rect.w * 0.88, rect.y + rect.h * 0.98, rect.h * 0.42, '#1c0a2e');
  }
  ctx.restore();
}

function gradePanel(ctx, rect, gradeKey) {
  const g = GRADES[gradeKey] || GRADES.sunset;
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  grad.addColorStop(0, g.warm);
  grad.addColorStop(1, g.cool);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = g.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function fitTitle(ctx, text, maxW, startSize, capSize) {
  // Scale the title up or down so it spans nearly the full cover width:
  // a giant title is the whole point of the poster.
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  const atStart = ctx.measureText(text).width || 1;
  size = Math.floor((size * maxW) / atStart);
  size = Math.max(24, Math.min(capSize, size));
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxW) {
    size = Math.floor(size * 0.96);
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

export function drawCover(canvas, state, photos) {
  const sizeKey = COVER_SIZES[state.size] ? state.size : 'wide';
  const { w, h } = COVER_SIZES[sizeKey];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const banner = Math.round(h * 0.075);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout || 'hero-top', w, h, banner);
  const panels = state.panels || [];
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const panel = panels[i] || { photo: null, scene: 'sunset', zoom: 1, cx: 0.5, cy: 0.42 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.clip();
    const img = panel.photo ? photos[panel.photo] : null;
    if (img) drawPhotoInto(ctx, img, rect, panel);
    else paintScene(ctx, panel.scene || 'sunset', rect);
    gradePanel(ctx, rect, state.grade || 'sunset');
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, Math.round(w / 480));
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  }

  // Mission banner: yellow strip, black bold text, readable at thumbnail size.
  // Shrink the type until the left and right halves both fit, never overlap.
  ctx.fillStyle = '#ffd400';
  ctx.fillRect(0, 0, w, banner);
  ctx.fillStyle = '#111';
  let bannerSize = Math.round(banner * 0.52);
  const stars = '★'.repeat(Math.max(0, Math.min(5, state.wanted ?? 3)));
  const left = `  MISSION: ${(state.mission || 'BIG CATCH').toUpperCase()}`;
  const right = `${state.cash || '$1,250'}   WANTED ${stars}  `;
  ctx.font = `900 ${bannerSize}px Arial, sans-serif`;
  while (bannerSize > 16
    && ctx.measureText(left).width + ctx.measureText(right).width > w * 0.96) {
    bannerSize = Math.floor(bannerSize * 0.94);
    ctx.font = `900 ${bannerSize}px Arial, sans-serif`;
  }
  ctx.textBaseline = 'middle';
  ctx.fillText(left, 0, banner / 2 + 1);
  const rightW = ctx.measureText(right).width;
  ctx.fillText(right, w - rightW, banner / 2 + 1);

  // Giant title overlapping the hero panel, sized to the hero's own width
  // so it never spills into the side panels, and kept clear of the tagline
  // and the bottom ribbon.
  const title = (state.title || 'SOLMARINA').toUpperCase();
  const hero = rects[0];
  const titleX = hero.x + hero.w * 0.02;
  const titleSize = fitTitle(ctx, title, hero.w * 0.96, Math.round(h * 0.135), Math.round(h * 0.17));
  const titleY = Math.min(hero.y + hero.h - Math.round(h * 0.055), h - Math.round(h * 0.10));
  ctx.font = `900 ${titleSize}px "Arial Black", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,5,20,0.95)';
  ctx.lineWidth = Math.max(4, Math.round(titleSize / 9));
  ctx.strokeText(title, titleX, titleY);
  const titleGrad = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
  titleGrad.addColorStop(0, '#fff3b0');
  titleGrad.addColorStop(0.55, '#ffd400');
  titleGrad.addColorStop(1, '#ff8a00');
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, titleX, titleY);

  // Tagline in script italic under the title.
  if (state.tagline) {
    const tagSize = Math.round(h * 0.038);
    ctx.font = `italic 700 ${tagSize}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(10,5,20,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(tagSize / 8));
    const tag = state.tagline.toUpperCase();
    const tagY = titleY + Math.round(h * 0.045);
    ctx.strokeText(tag, titleX + w * 0.005, tagY);
    ctx.fillText(tag, titleX + w * 0.005, tagY);
  }

  // Bottom ribbon: place line, small but bold, never the main read.
  const ribSize = Math.round(h * 0.026);
  ctx.font = `900 ${ribSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('SOLMARINA  •  VICE CITY  •  LEONIDA', w * 0.02, h - Math.round(h * 0.018));
  return { w, h };
}
