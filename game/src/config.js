// Last Lantern — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lantern stands at the middle of the glade. */
export const LANTERN = { x: 640, y: 360, radius: 34, flames: 5, maxFlames: 5 };

export const KEEPER = {
  radius: 15,
  speed: 340,
  hearts: 3,
  /** Seconds of mercy after the keeper is struck. */
  invulnerable: 1.2,
};

export const BOLT = {
  speed: 680,
  radius: 6,
  damage: 1,
  /** Seconds between shots while the trigger is held. */
  interval: 0.16,
  /** How long a bolt lives before it fades (it crosses the field in about 2 s). */
  life: 1.6,
};

/** Wisp kinds. Speed grows a little with the wave; hp does not. */
export const WISP = {
  drifter: { radius: 14, hp: 1, speed: 52, speedPerWave: 4, score: 50, embers: 3 },
  dart: { radius: 11, hp: 1, speed: 118, speedPerWave: 6, score: 80, embers: 4 },
  brute: { radius: 30, hp: 10, speed: 34, speedPerWave: 1, score: 300, embers: 12 },
};

/** Waves: how many of each kind arrive, and how fast they are sent in. */
export const WAVE = {
  /** The wave that ends the night: clear it and dawn breaks (victory). */
  final: 10,
  /** Seconds of calm (and a banner) before a wave begins. */
  calm: 2.5,
  /** Base seconds between spawns; multiplied down as waves rise. */
  interval: 1.15,
  intervalScale: 0.93,
  minInterval: 0.35,
  drifters: (wave) => 5 + 2 * wave,
  darts: (wave) => (wave < 2 ? 0 : wave),
  brutes: (wave) => (wave % 5 === 0 ? 1 : 0),
};

export const EMBER = {
  value: 10,
  radius: 7,
  /** Seconds an ember waits on the ground before it winks out. */
  life: 9,
  /** How fast an ember flies to the keeper while magnet is up. */
  magnetSpeed: 420,
  /** Radius inside which the keeper sweeps embers up. */
  pickupRadius: 30,
};

/** Seconds a kill chain stays alive; each kill inside it raises the combo. */
export const COMBO_WINDOW = 2.5;

export const POWERUP = {
  /** Chance a slain wisp leaves a gift behind. */
  dropChance: 0.07,
  /** Seconds a gift waits on the ground. */
  life: 10,
  radius: 15,
  drift: 26,
  prismSeconds: 12,
  magnetSeconds: 12,
};

/** Pool sizes; everything is allocated once, at boot. */
export const POOL = { wisps: 48, bolts: 64, embers: 96, powerups: 8, particles: 320, texts: 32 };

export const PALETTE = {
  backdrop: '#0b0e1e',
  glade: '#12162e',
  ground: '#1a2040',
  glowWarm: '#ffb347',
  flame: '#ffcf5e',
  ember: '#ffd166',
  keeper: '#7fe7ff',
  keeperCore: '#eafcff',
  bolt: '#bff3ff',
  wisp: '#3a2d5e',
  wispEye: '#c77dff',
  dartEye: '#ff5d8f',
  bruteEye: '#ff3b30',
  text: '#eef1f5',
  muted: '#9aa3b8',
  banner: '#ffd166',
  danger: '#ff5d5d',
  panel: 'rgba(16, 20, 40, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'last-lantern.best';
