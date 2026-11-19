// Solmarina Cover Maker — editor wiring and app state.
// Loads the sample photos, reads the URL query, wires every control, and
// exposes window.__coverApp for screenshots, export and verification.
import { COVER_SIZES, GRADES, drawCover, paintScene } from './cover.js';
import { shotModeFromParams, applyShotMode } from './shots.js';

const SAMPLES = {
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
  'hero-sunset': 'samples/hero-sunset.jpg',
  cruise: 'samples/cruise.jpg',
  rooftop: 'samples/rooftop.jpg',
};

const PHOTO_NAMES = Object.keys(SAMPLES);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${src}`));
    img.src = src;
  });
}

// Simple focus finder: scan a small copy for the brightest high-contrast
// column band, so faces and lit subjects land in the middle of a panel.
function detectFocus(img) {
  try {
    const probe = document.createElement('canvas');
    probe.width = 48;
    probe.height = 48;
    const pctx = probe.getContext('2d');
    pctx.drawImage(img, 0, 0, 48, 48);
    const data = pctx.getImageData(0, 0, 48, 48).data;
    let bestX = 24;
    let bestScore = -1;
    for (let x = 4; x < 44; x++) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let y = 0; y < 48; y++) {
        const i = (y * 48 + x) * 4;
        const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        sum += lum;
        sumSq += lum * lum;
        n++;
      }
      const mean = sum / n;
      const score = Math.sqrt(Math.max(0, sumSq / n - mean * mean)) + mean * 0.25;
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    let bestY = 20;
    let bestYScore = -1;
    for (let y = 4; y < 44; y++) {
      let sum = 0;
      let n = 0;
      for (let x = 0; x < 48; x++) {
        const i = (y * 48 + x) * 4;
        sum += 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        n++;
      }
      if (sum / n > bestYScore) {
        bestYScore = sum / n;
        bestY = y;
      }
    }
    return { cx: bestX / 48, cy: bestY / 48 };
  } catch {
    return { cx: 0.5, cy: 0.42 };
  }
}

// Face focus per photo, measured from the photo itself: where the face
// sits in the frame. The hero strip is wide and short, so its focus sits
// a little below the face to lift the whole face above the giant title;
// the near-square bottom panels centre on the face instead.
const PHOTO_FOCUS = {
  boulevard: { hero: { zoom: 1, cx: 0.5, cy: 0.22 }, panel: { zoom: 1, cx: 0.48, cy: 0.19 } },
  pier: { hero: { zoom: 1, cx: 0.38, cy: 0.32 }, panel: { zoom: 1, cx: 0.38, cy: 0.24 } },
  'hero-sunset': { hero: { zoom: 1, cx: 0.44, cy: 0.35 }, panel: { zoom: 1, cx: 0.44, cy: 0.27 } },
  cruise: { hero: { zoom: 1, cx: 0.5, cy: 0.36 }, panel: { zoom: 1, cx: 0.5, cy: 0.3 } },
  rooftop: { hero: { zoom: 1, cx: 0.5, cy: 0.38 }, panel: { zoom: 1, cx: 0.5, cy: 0.33 } },
};

function defaultPanels(photo) {
  // Hero first, then every other photo exactly once: four different bottom
  // panels, never a repeat.
  const names = [photo, ...PHOTO_NAMES.filter((n) => n !== photo)];
  return names.map((name, i) => {
    const focus = PHOTO_FOCUS[name]
      || { hero: { zoom: 1, cx: 0.5, cy: 0.4 }, panel: { zoom: 1, cx: 0.5, cy: 0.4 } };
    const crop = i === 0 ? focus.hero : focus.panel;
    return { photo: name, scene: null, zoom: crop.zoom, cx: crop.cx, cy: crop.cy };
  });
}

function readStateFromQuery(params) {
  const photo = PHOTO_NAMES.includes(params.get('photo') || '') ? params.get('photo') : 'boulevard';
  const wanted = Number.parseInt(params.get('wanted') || '3', 10);
  const size = COVER_SIZES[params.get('size') || ''] ? params.get('size') : 'wide';
  const layout = ['hero-top', 'hero-left', 'grid'].includes(params.get('layout') || '')
    ? params.get('layout')
    : 'hero-top';
  const grade = GRADES[params.get('grade') || ''] ? params.get('grade') : 'sunset';
  return {
    title: (params.get('caption') || 'SOLMARINA').toUpperCase(),
    tagline: (params.get('tagline') || 'SUNSET HEIST').toUpperCase(),
    mission: (params.get('mission') || 'BIG CATCH').toUpperCase(),
    cash: params.get('cash') || '$1,250',
    wanted: Number.isFinite(wanted) ? Math.max(0, Math.min(5, wanted)) : 3,
    layout,
    grade,
    size,
    panels: defaultPanels(photo),
  };
}

const params = new URLSearchParams(window.location.search);
const state = readStateFromQuery(params);
const photos = {};
let selectedPanel = 0;

const canvas = document.getElementById('cover');
const app = {
  state,
  photos,
  redraw() {
    drawCover(canvas, state, photos);
    const sizeNote = document.getElementById('sizeNote');
    if (sizeNote) {
      const s = COVER_SIZES[state.size] || COVER_SIZES.wide;
      sizeNote.textContent = `${s.label} — ${s.w} × ${s.h}px`;
    }
  },
  async exportCoverPng(givenState, sizeKey) {
    const useState = givenState || state;
    const size = COVER_SIZES[sizeKey] ? sizeKey : useState.size || 'wide';
    const off = document.createElement('canvas');
    drawCover(off, { ...useState, size }, photos);
    return new Promise((resolve, reject) => {
      off.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG export failed'));
      }, 'image/png');
    });
  },
  applyAutoGta() {
    const heroFocus = photos[state.panels[0].photo]
      ? detectFocus(photos[state.panels[0].photo])
      : { cx: 0.5, cy: 0.4 };
    state.panels = defaultPanels(state.panels[0].photo || 'boulevard');
    state.panels[0].cx = heroFocus.cx;
    state.panels[0].cy = heroFocus.cy;
    state.grade = 'sunset';
    state.layout = 'hero-top';
    syncControls();
    app.redraw();
  },
  selectPanel(i) {
    selectedPanel = i;
    syncPanelButtons();
    const sel = document.getElementById('panelPhoto');
    if (sel) sel.value = state.panels[i].photo || 'boulevard';
    const zoom = document.getElementById('panelZoom');
    if (zoom) zoom.value = String(state.panels[i].zoom || 1);
  },
};

function syncPanelButtons() {
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    const i = Number(btn.dataset.panel);
    btn.classList.toggle('active', i === selectedPanel);
    const p = state.panels[i];
    btn.textContent = `Panel ${i + 1} · ${p.photo ? p.photo : p.scene || 'scene'}`;
  });
}

function syncControls() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('title', state.title);
  set('tagline', state.tagline);
  set('mission', state.mission);
  set('cash', state.cash);
  set('wanted', String(state.wanted));
  set('layout', state.layout);
  set('grade', state.grade);
  set('size', state.size);
  syncPanelButtons();
  app.selectPanel(selectedPanel);
}

function wireControls() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { fn(el); app.redraw(); });
  };
  bind('title', (el) => { state.title = el.value.toUpperCase(); });
  bind('tagline', (el) => { state.tagline = el.value.toUpperCase(); });
  bind('mission', (el) => { state.mission = el.value.toUpperCase(); });
  bind('cash', (el) => { state.cash = el.value; });
  bind('wanted', (el) => { state.wanted = Number(el.value); });
  bind('layout', (el) => { state.layout = el.value; });
  bind('grade', (el) => { state.grade = el.value; });
  bind('size', (el) => { state.size = el.value; });
  bind('panelZoom', (el) => {
    state.panels[selectedPanel].zoom = Number(el.value);
  });
  const photoSel = document.getElementById('panelPhoto');
  if (photoSel) {
    photoSel.addEventListener('change', () => {
      const p = state.panels[selectedPanel];
      p.photo = photoSel.value;
      p.scene = null;
      syncPanelButtons();
      app.redraw();
    });
  }
  const auto = document.getElementById('autoGta');
  if (auto) auto.addEventListener('click', () => app.applyAutoGta());
  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => app.selectPanel(Number(btn.dataset.panel)));
  });
  const fileInput = document.getElementById('photoInput');
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        photos.custom = img;
        const sel = document.getElementById('panelPhoto');
        if (sel && ![...sel.options].some((o) => o.value === 'custom')) {
          const opt = document.createElement('option');
          opt.value = 'custom';
          opt.textContent = 'Your upload';
          sel.appendChild(opt);
        }
        state.panels[selectedPanel].photo = 'custom';
        state.panels[selectedPanel].scene = null;
        syncPanelButtons();
        app.redraw();
      } catch {
        // Keep the current cover if the upload cannot be read.
      }
    });
  }
  const exportBtn = document.getElementById('exportPng');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const blob = await app.exportCoverPng(state, state.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
      a.download = `${slug}-${state.size}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  }
}

async function boot() {
  const mode = shotModeFromParams(params);
  applyShotMode(document, mode);
  for (const name of PHOTO_NAMES) {
    try {
      photos[name] = await loadImage(SAMPLES[name]);
    } catch {
      // A missing sample leaves its panels to the painted scenes.
    }
  }
  // Keep the hand-set hero focus from defaultPanels: the brightness scan
  // used to drag the face down under the giant title, so it no longer
  // overrides the framing here. (Auto GTA still uses the scan on demand.)
  wireControls();
  syncControls();
  app.redraw();
  window.__coverApp = app;
  window.__shotReady = true;
}

boot().catch(() => {
  // Still mark ready with painted scenes so a shot never hangs.
  try {
    drawCover(canvas, state, photos);
  } catch {
    // Canvas unavailable: nothing more to do.
  }
  window.__coverApp = app;
  window.__shotReady = true;
});
