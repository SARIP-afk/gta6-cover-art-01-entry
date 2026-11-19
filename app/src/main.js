// Wires the editor: photos, the one-click Auto GTA preset, layout and grade,
// caption fields, per-panel crop and position, and PNG export. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, exportCoverPng, findPhotoFocus, layoutPanelRects, coverGeometry } from './cover.js';
import { runShot } from './shots.js';
import { LAYOUTS, GRADES, SCENES, EXPORT_SIZES, DEFAULT_CAPTION, AUTO_GTA } from './presets.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const panelSelect = document.getElementById('panelSelect');
const panelPhoto = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');

/** The editor state: everything drawCover needs, plus the loaded photos. */
const state = {
  layout: 'hero-left',
  grade: 'sunset',
  size: 'wide',
  title: DEFAULT_CAPTION.title,
  tagline: DEFAULT_CAPTION.tagline,
  mission: DEFAULT_CAPTION.mission,
  cash: DEFAULT_CAPTION.cash,
  wanted: DEFAULT_CAPTION.wanted,
  photos: [],
  panels: [],
  selectedPanel: 0,
};

/** Varied crops so one photo fills different panels like different shots. */
const PHOTO_CROPS = [
  { zoom: 1, cx: 0.5, cy: 0.38 },
  { zoom: 1.25, cx: 0.35, cy: 0.42 },
  { zoom: 1.45, cx: 0.45, cy: 0.3 },
  { zoom: 1.2, cx: 0.6, cy: 0.35 },
];

/** Builds the panel list for the current layout, keeping fills where they fit.
 *  Photo-first: whenever photos are loaded, every panel is a photo (cycling the
 *  shelf with a different crop per panel). Drawn scenes are never a default —
 *  they only appear when the user picks one in the panel dropdown. With no
 *  photos loaded yet, scenes are the only thing to show, so they stay as the
 *  empty-state fallback. */
function panelsForLayout(layout, previous) {
  const count = LAYOUTS[layout].panels;
  const out = [];
  for (let i = 0; i < count; i++) {
    const old = previous[i];
    if (old && old.photo != null) {
      out.push(old);
      continue;
    }
    if (state.photos.length > 0) {
      const crop = PHOTO_CROPS[i % PHOTO_CROPS.length];
      out.push({
        photo: i % state.photos.length,
        scene: null,
        zoom: crop.zoom,
        cx: crop.cx,
        cy: crop.cy,
      });
      continue;
    }
    out.push(old || { photo: null, scene: i === 0 ? 'sunset' : 'skyline', zoom: 1, cx: 0.5, cy: 0.38 });
  }
  return out;
}

function applySizeToCanvas() {
  const size = EXPORT_SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
}

function redraw() {
  applySizeToCanvas();
  drawCover(canvas, state);
  refreshPanelControls();
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/** Adds a loaded image to the photo shelf and returns its index. */
function addPhoto(img, name) {
  const focus = findPhotoFocus(img);
  state.photos.push({ img, name, focus });
  renderPhotoShelf();
  return state.photos.length - 1;
}

function renderPhotoShelf() {
  const shelf = document.getElementById('photoShelf');
  shelf.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = photo.name;
    const thumbImg = document.createElement('img');
    thumbImg.src = photo.img.src;
    thumbImg.alt = photo.name;
    thumb.appendChild(thumbImg);
    const label = document.createElement('span');
    label.textContent = photo.name;
    thumb.appendChild(label);
    thumb.addEventListener('click', () => {
      assignPhotoToSelectedPanel(i);
      setStatus(`${photo.name} is now in panel ${state.selectedPanel + 1}.`);
    });
    shelf.appendChild(thumb);
  });
  const empty = document.getElementById('photoEmpty');
  if (empty) empty.hidden = state.photos.length > 0;
}

/** Assigns a photo to the selected panel, auto-cropping on its focus point. */
function assignPhotoToSelectedPanel(photoIndex) {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.photo = photoIndex;
  panel.scene = null;
  const focus = state.photos[photoIndex].focus;
  panel.cx = focus.cx;
  panel.cy = focus.cy;
  panel.zoom = 1;
  redraw();
}

/** The one-click preset: samples in, a finished cover out. */
async function applyAutoGta() {
  setStatus('Making your cover…');
  try {
    if (state.photos.length === 0) await loadSamples();
    state.layout = AUTO_GTA.layout;
    state.grade = AUTO_GTA.grade;
    state.size = AUTO_GTA.size;
    Object.assign(state, {
      title: AUTO_GTA.caption.title,
      tagline: AUTO_GTA.caption.tagline,
      mission: AUTO_GTA.caption.mission,
      cash: AUTO_GTA.caption.cash,
      wanted: AUTO_GTA.caption.wanted,
    });
    syncCaptionInputs();
    syncLayoutButtons();
    syncGradeButtons();
    syncSizeRadios();
    state.panels = AUTO_GTA.panels.map((fill) => {
      const panel = {
        photo: fill.photo,
        scene: fill.scene,
        zoom: fill.zoom ?? 1,
        cx: fill.cx ?? 0.5,
        cy: fill.cy ?? 0.38,
      };
      // A preset crop (zoom/cx/cy) wins; otherwise auto-crop on the focus point.
      if (fill.photo != null && state.photos[fill.photo]) {
        const focus = state.photos[fill.photo].focus;
        if (fill.cx == null) panel.cx = focus.cx;
        if (fill.cy == null) panel.cy = focus.cy;
      }
      return panel;
    });
    state.selectedPanel = 0;
    redraw();
    setStatus('Done — a finished cover. Tweak it, or export a PNG.');
  } catch (err) {
    setStatus(`Could not load the samples: ${err.message}`);
  }
}

/** Loads the two bundled sample photos (free to use, made for this bounty). */
async function loadSamples() {
  const [pier, boulevard] = await Promise.all([
    loadImage('samples/pier.jpg'),
    loadImage('samples/boulevard.jpg'),
  ]);
  // Pier first on the shelf (index 0), boulevard second (index 1).
  if (!state.photos.some((p) => p.name === 'pier.jpg')) addPhoto(pier, 'pier.jpg');
  if (!state.photos.some((p) => p.name === 'boulevard.jpg')) addPhoto(boulevard, 'boulevard.jpg');
  // Photo-first: any scene-only panel becomes a photo panel now that photos exist.
  state.panels = panelsForLayout(state.layout, state.panels);
  return state.photos;
}

function syncCaptionInputs() {
  document.getElementById('title').value = state.title;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('mission').value = state.mission;
  document.getElementById('cash').value = state.cash;
  document.getElementById('wanted').value = String(state.wanted);
}

function syncLayoutButtons() {
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
    b.setAttribute('aria-pressed', b.dataset.layout === state.layout ? 'true' : 'false');
  });
}

function syncGradeButtons() {
  document.querySelectorAll('.grade-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
    b.setAttribute('aria-pressed', b.dataset.grade === state.grade ? 'true' : 'false');
  });
}

function syncSizeRadios() {
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.checked = r.value === state.size;
  });
}

/** Refreshes the panel editor: which panel, which fill, and the zoom slider. */
function refreshPanelControls() {
  const count = LAYOUTS[state.layout].panels;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
  panelSelect.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = i === 0 ? `Panel ${i + 1} — hero` : `Panel ${i + 1}`;
    panelSelect.appendChild(opt);
  }
  panelSelect.value = String(state.selectedPanel);
  panelPhoto.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = `photo:${i}`;
    opt.textContent = `Photo: ${photo.name}`;
    panelPhoto.appendChild(opt);
  });
  Object.entries(SCENES).forEach(([key, scene]) => {
    const opt = document.createElement('option');
    opt.value = `scene:${key}`;
    opt.textContent = `Drawn scene: ${scene.label}`;
    panelPhoto.appendChild(opt);
  });
  const panel = state.panels[state.selectedPanel];
  if (panel) {
    panelPhoto.value = panel.photo != null ? `photo:${panel.photo}` : `scene:${panel.scene || 'sunset'}`;
    zoomInput.value = String(Math.round((panel.zoom || 1) * 100));
    zoomVal.textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  }
}

/** The panel rectangles on the preview canvas, for hit-testing drags. */
function panelRectsOnCanvas() {
  const { area } = coverGeometry(canvas.width, canvas.height);
  const gutter = Math.max(6, Math.round(canvas.width * 0.012));
  return layoutPanelRects(state.layout, area, gutter);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(point) {
  return panelRectsOnCanvas().findIndex(
    (r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h,
  );
}

// Drag on the preview to pan the selected panel's photo.
let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(point);
  if (hit < 0) return;
  state.selectedPanel = hit;
  refreshPanelControls();
  drag = { panel: state.panels[hit], start: point, cx: state.panels[hit].cx, cy: state.panels[hit].cy };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = drag.panel;
  const photo = panel.photo != null ? state.photos[panel.photo] : null;
  if (!photo) return;
  const rect = panelRectsOnCanvas()[state.selectedPanel];
  const img = photo.img;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * base * Math.max(1, panel.zoom || 1);
  const dh = img.naturalHeight * base * Math.max(1, panel.zoom || 1);
  panel.cx = Math.min(1, Math.max(0, drag.cx - (point.x - drag.start.x) / dw));
  panel.cy = Math.min(1, Math.max(0, drag.cy - (point.y - drag.start.y) / dh));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// --- Controls ---------------------------------------------------------------
document.getElementById('photos').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name);
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  if (files.length > 0) {
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded — click a thumbnail to put it in a panel, or press Auto GTA.`);
    // Photo-first: scene-only panels become photo panels now that photos exist.
    state.panels = panelsForLayout(state.layout, state.panels);
    redraw();
  }
});
document.getElementById('loadSamples').addEventListener('click', async () => {
  try {
    await loadSamples();
    setStatus('Sample photos loaded — click one to put it in a panel.');
    redraw();
  } catch (err) {
    setStatus(`Could not load the samples: ${err.message}`);
  }
});
document.getElementById('autoGta').addEventListener('click', applyAutoGta);
document.querySelectorAll('.layout-btn').forEach((button) => {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    state.panels = panelsForLayout(state.layout, state.panels);
    syncLayoutButtons();
    redraw();
  });
});
document.querySelectorAll('.grade-btn').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    syncGradeButtons();
    redraw();
  });
});
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    redraw();
  });
});
const captionFields = ['title', 'tagline', 'mission', 'cash'];
captionFields.forEach((field) => {
  document.getElementById(field).addEventListener('input', (event) => {
    state[field] = event.target.value;
    redraw();
  });
});
document.getElementById('wanted').addEventListener('change', (event) => {
  state.wanted = Number(event.target.value);
  redraw();
});
panelSelect.addEventListener('change', () => {
  state.selectedPanel = Number(panelSelect.value);
  refreshPanelControls();
});
panelPhoto.addEventListener('change', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  const [kind, value] = panelPhoto.value.split(':');
  if (kind === 'photo') {
    assignPhotoToSelectedPanel(Number(value));
  } else {
    panel.photo = null;
    panel.scene = value;
    redraw();
  }
});
zoomInput.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(zoomInput.value) / 100;
  zoomVal.textContent = `${zoomInput.value}%`;
  redraw();
});
document.getElementById('useInAll').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel || panel.photo == null) {
    setStatus('Pick a photo for this panel first, then use it in all panels.');
    return;
  }
  state.panels.forEach((p, i) => {
    if (i === state.selectedPanel) return;
    p.photo = panel.photo;
    p.scene = null;
    // A different crop per panel, so one photo fills the poster differently.
    const focus = state.photos[panel.photo].focus;
    p.cx = i % 2 === 0 ? Math.min(0.85, focus.cx + 0.18) : Math.max(0.15, focus.cx - 0.18);
    p.cy = focus.cy;
    p.zoom = 1.15;
  });
  redraw();
  setStatus('That photo now fills every panel, each with its own crop.');
});
document.getElementById('centerCrop').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.cx = 0.5;
  panel.cy = 0.38;
  panel.zoom = 1;
  redraw();
});
document.getElementById('exportBtn').addEventListener('click', async () => {
  setStatus('Exporting…');
  try {
    const blob = await exportCoverPng(state, state.size);
    const size = EXPORT_SIZES[state.size];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved cover-${size.w}x${size.h}.png — share it anywhere.`);
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (err) {
    setStatus(`Export failed: ${err.message}`);
  }
});

// --- Start ------------------------------------------------------------------
state.panels = panelsForLayout(state.layout, []);
syncCaptionInputs();
syncLayoutButtons();
syncGradeButtons();
syncSizeRadios();
redraw();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (sample, text, q, photoName) => {
    if (q.get('layout')) state.layout = q.get('layout');
    if (q.get('grade')) state.grade = q.get('grade');
    if (q.get('size')) state.size = q.get('size');
    if (q.get('title')) state.title = q.get('title');
    else if (text) state.title = text;
    if (q.get('tagline')) state.tagline = q.get('tagline');
    if (q.get('mission')) state.mission = q.get('mission');
    if (q.get('cash')) state.cash = q.get('cash');
    if (q.get('wanted')) state.wanted = Number(q.get('wanted'));
    syncCaptionInputs();
    syncLayoutButtons();
    syncGradeButtons();
    syncSizeRadios();
    if (shot === 'editor') {
      await applyAutoGta();
    } else {
      await loadSamples();
      // All-photo: the hero is the requested sample, the other panels cycle the
      // two samples with different crops/zooms — no drawn scene anywhere.
      const photoIndex = photoName === 'boulevard' ? 1 : 0;
      const other = photoIndex === 0 ? 1 : 0;
      const crops = [
        { photo: photoIndex, zoom: 1, cx: 0.5, cy: 0.38 },
        { photo: other, zoom: 1.15, cx: 0.42, cy: 0.4 },
        { photo: photoIndex, zoom: 1.45, cx: 0.42, cy: 0.22 },
        { photo: other, zoom: 1.35, cx: 0.7, cy: 0.35 },
      ];
      state.panels = panelsForLayout(state.layout, []).map((_, i) => ({
        ...crops[i],
        scene: null,
      }));
      state.selectedPanel = 0;
      redraw();
    }
  });
}

// Test hook: the screenshot driver and the export check use this, not the UI.
window.__coverApp = { state, drawCover, exportCoverPng, redraw };
