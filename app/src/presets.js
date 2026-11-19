// Presets for the Solmarina Cover Maker: the poster layouts, the colour grades and the
// default GTA-flavoured caption. Everything here is original art direction — no Rockstar
// logo, artwork or font is used anywhere in this app.

/** The three poster layouts. Each names its panels in reading order. */
export const LAYOUTS = {
  'hero-left': {
    label: 'Hero left',
    panels: 3,
    hint: 'One big hero panel, two stacked scenes on the right.',
  },
  'hero-top': {
    label: 'Hero top',
    panels: 4,
    hint: 'One wide hero panel, a strip of three scenes below it.',
  },
  grid: {
    label: 'Grid 2 x 2',
    panels: 4,
    hint: 'Four equal panels, like a classic multi-panel poster.',
  },
};

/** The colour grades. A grade is a set of overlay colours the drawing engine blends
 *  over every panel, plus the frame and band colours for the poster chrome. */
export const GRADES = {
  sunset: {
    label: 'Sunset Vice City',
    skyTop: '#ff9a3c',
    skyMid: '#ff5e7a',
    skyBottom: '#7b2f8b',
    sunCore: '#ffe9a3',
    sunRim: '#ff7a3c',
    tintTop: 'rgba(255, 122, 60, 0.16)',
    tintBottom: 'rgba(123, 47, 139, 0.30)',
    frame: '#14081f',
    band: '#1c0b2e',
    bandEdge: '#ff9a3c',
    titleFrom: '#ffe45c',
    titleTo: '#ff8a2a',
    tagline: '#ffd9ec',
    hud: '#12061d',
    mission: '#ffd400',
    cash: '#7dff8a',
    starOn: '#ff3b30',
    starOff: '#4a4450',
    gutter: '#f5efe6',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#0d1030',
    skyMid: '#2a1a5e',
    skyBottom: '#0a0618',
    sunCore: '#ff6ec7',
    sunRim: '#7a2bff',
    tintTop: 'rgba(122, 43, 255, 0.15)',
    tintBottom: 'rgba(255, 110, 199, 0.19)',
    frame: '#05030a',
    band: '#0d0620',
    bandEdge: '#ff6ec7',
    titleFrom: '#7df9ff',
    titleTo: '#ff6ec7',
    tagline: '#b8fff1',
    hud: '#070312',
    mission: '#00f0ff',
    cash: '#7dff8a',
    starOn: '#ff2e63',
    starOff: '#3a3350',
    gutter: '#0a0616',
  },
  pastel: {
    label: 'Pastel Day',
    skyTop: '#ffd9a0',
    skyMid: '#ffb3c7',
    skyBottom: '#a8c8e8',
    sunCore: '#fff3c4',
    sunRim: '#ffb347',
    tintTop: 'rgba(255, 179, 199, 0.14)',
    tintBottom: 'rgba(168, 200, 232, 0.22)',
    frame: '#2b2b3a',
    band: '#fff4e0',
    bandEdge: '#ff8a5c',
    titleFrom: '#ff5e7a',
    titleTo: '#ff9a3c',
    tagline: '#5c3a6e',
    hud: '#fff4e0',
    mission: '#ffd400',
    cash: '#1d9e4b',
    starOn: '#ff3b30',
    starOff: '#c9c2d1',
    gutter: '#ffffff',
  },
};

/** The drawn scenes a panel can show when it has no photo: all vector art drawn on
 *  the canvas, so the cover still reads as a Vice City poster with a single photo. */
export const SCENES = {
  sunset: { label: 'Sunset sky + palms' },
  skyline: { label: 'Neon skyline' },
  palms: { label: 'Palm boulevard' },
};

/** The post sizes the app exports, in pixels. */
export const EXPORT_SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** The caption the app starts with: a title, a tagline, a mission name, a cash
 *  amount and a wanted level — all editable, all drawn by the app itself. */
export const DEFAULT_CAPTION = {
  title: 'SOLMARINA',
  tagline: 'SUNSET HEIST',
  mission: 'PIER PRESSURE',
  cash: '$1,250',
  wanted: 3,
};

/** The one-click preset: a finished cover from the two bundled sample photos. */
export const AUTO_GTA = {
  layout: 'hero-left',
  grade: 'sunset',
  size: 'wide',
  caption: { ...DEFAULT_CAPTION },
  // panel fills: [photo index, scene name] — hero gets the boulevard portrait,
  // the top-right panel the pier photo, the bottom-right a drawn sunset scene.
  panels: [
    { photo: 1, scene: null },
    { photo: 0, scene: null },
    { photo: null, scene: 'sunset' },
  ],
};
