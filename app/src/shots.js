// Fixed scenes for screenshots: ?shot=editor shows the app with a sample photo
// loaded and the Auto GTA preset applied; ?shot=cover shows a cover alone.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the title, and the
// optional `layout`, `grade`, `size`, `tagline`, `mission`, `cash` and `wanted`
// params set the rest. window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  await load(`samples/${photo}.jpg`, query.get('caption') ?? 'Sunset Heist', query, photo);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
