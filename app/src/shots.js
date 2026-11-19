// Shot modes: how the page presents itself for a screenshot or a live edit.
// ?shot=cover shows only the finished poster, full-bleed; ?shot=editor (and
// anything else) shows the editor around the live preview. Unknown values
// fall back to the cover, so a bad link still renders something shippable.
export const SHOT_MODES = ['cover', 'editor'];

export function shotModeFromParams(params) {
  const raw = (params.get('shot') || '').trim().toLowerCase();
  return SHOT_MODES.includes(raw) ? raw : 'cover';
}

export function applyShotMode(doc, mode) {
  const body = doc.body;
  body.classList.remove('shot-cover', 'shot-editor');
  body.classList.add(mode === 'editor' ? 'shot-editor' : 'shot-cover');
  const editor = doc.getElementById('editorPanel');
  const stage = doc.getElementById('stage');
  if (editor) editor.hidden = mode !== 'editor';
  if (stage) stage.classList.toggle('full', mode !== 'editor');
  return mode;
}

// Viewport sizes the screenshot driver uses, keyed by shot size.
export function shotViewport(shot) {
  if (!shot) return { w: 1280, h: 800 };
  if (shot.size === 'portrait') return { w: 1080, h: 1350 };
  if (shot.size === 'square') return { w: 1080, h: 1080 };
  if (shot.size === 'story') return { w: 1080, h: 1920 };
  return { w: 1280, h: 800 };
}
