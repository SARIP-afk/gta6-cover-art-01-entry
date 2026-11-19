// Fixed scenes for screenshots: ?shot=editor shows the app with a sample photo
// loaded and the Auto GTA preset applied; ?shot=cover shows a cover alone.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the title, and the
// optional `layout`, `grade`, `size`, `tagline`, `mission`, `cash` and `wanted`
// params set the rest. window.__shotReady is set once painted.
//
// Unknown values never break a shot: an unknown ?shot= falls back to the
// editor view (with a console warning, so a typo in a shot URL is visible but
// harmless), and an unknown photo name falls back to the pier sample. That
// keeps a bad query string from producing a blank screenshot — the shot still
// renders, just with the defaults.
const KNOWN_SHOTS = new Set(['editor', 'cover']);
const KNOWN_PHOTOS = new Set(['pier', 'boulevard']);

export async function runShot(shot, query, load) {
  const safeShot = KNOWN_SHOTS.has(shot) ? shot : 'editor';
  if (safeShot !== shot) {
    console.warn(`[shots] unknown ?shot=${shot}, falling back to "editor"`);
  }
  if (safeShot === 'cover') document.body.classList.add('shot-cover');
  const requestedPhoto = query.get('photo') ?? 'pier';
  const photo = KNOWN_PHOTOS.has(requestedPhoto) ? requestedPhoto : 'pier';
  if (photo !== requestedPhoto) {
    console.warn(`[shots] unknown photo "${requestedPhoto}", falling back to "pier"`);
  }
  await load(`samples/${photo}.jpg`, query.get('caption') ?? 'Sunset Heist', query, photo);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
