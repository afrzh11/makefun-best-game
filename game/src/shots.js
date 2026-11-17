// The screenshot scenes behind ?shot=start|play|battle|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
//
// The autopilot: drift toward the nearest ember when one is close, otherwise
// hold a ring around the lantern; aim at the nearest wisp and fire whenever one
// is in range. The play scene holds fire for a stretch so its frame is busy
// with wisps instead of an empty field, and the battle scene leaves the brute
// alone until it has walked well in. The end pilot plays well for a while and
// then stops, so its game-over screen carries a real score, as a lost game does.
import { LANTERN, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const BATTLE_SECONDS = 150;
const END_PLAY_SECONDS = 18;
const END_LIMIT_SECONDS = 600;

function nearestWisp(state, skipBrute) {
  let best = null;
  let bestD = Infinity;
  for (const w of state.wisps) {
    if (!w.active) continue;
    if (skipBrute && w.kind === 'brute') continue;
    const d = Math.hypot(w.x - state.keeper.x, w.y - state.keeper.y);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

function nearestEmber(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.embers) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - state.keeper.x, e.y - state.keeper.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function activeWisps(state) {
  let n = 0;
  for (const w of state.wisps) if (w.active) n += 1;
  return n;
}

function pilot(state, range, skipBrute = false, allowFire = true) {
  const keeper = state.keeper;
  const ember = nearestEmber(state);
  const wisp = nearestWisp(state, skipBrute);
  let tx = LANTERN.x;
  let ty = LANTERN.y - 190;
  if (ember && Math.hypot(ember.x - keeper.x, ember.y - keeper.y) < 260) {
    tx = ember.x;
    ty = ember.y;
  } else if (wisp) {
    // Stand between the nearest wisp and the lantern, at bolt range.
    const dx = LANTERN.x - wisp.x;
    const dy = LANTERN.y - wisp.y;
    const d = Math.hypot(dx, dy) || 1;
    tx = wisp.x + (dx / d) * 210;
    ty = wisp.y + (dy / d) * 210;
  }
  const mx = tx - keeper.x;
  const my = ty - keeper.y;
  const md = Math.hypot(mx, my) || 1;
  const aim = wisp ?? { x: LANTERN.x, y: LANTERN.y - 200 };
  const wispDist = wisp ? Math.hypot(wisp.x - keeper.x, wisp.y - keeper.y) : Infinity;
  return {
    mx: md > 12 ? mx / md : 0,
    my: md > 12 ? my / md : 0,
    aimX: aim.x,
    aimY: aim.y,
    firing: allowFire && wisp !== null && wispDist < range,
  };
}

function idleCtrl() {
  return { mx: 0, my: 0, aimX: LANTERN.x, aimY: LANTERN.y - 200, firing: false };
}

/**
 * Set `world` to the named scene (start, play, battle or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'battle' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, idleCtrl(), true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    for (let i = 0; i < END_PLAY_SECONDS / STEP; i += 1) {
      if (world.step(STEP, pilot(world.state, 640), false) & EVENT_OVER) break;
    }
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, idleCtrl(), false) & EVENT_OVER) break;
    }
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_OVER, best: world.state.score };
  }
  if (name === 'battle') {
    let bruteSeenAt = -1;
    for (let i = 0; i < BATTLE_SECONDS / STEP; i += 1) {
      // The pilot fights everything except the brute, so the brute walks in
      // unmolested while the keeper is busy — the frame catches it mid-field.
      const events = world.step(STEP, pilot(world.state, 640, true), false);
      if (events & EVENT_OVER) break;
      if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
      let brute = null;
      for (const w of world.state.wisps) {
        if (w.active && w.kind === 'brute') brute = w;
      }
      if (brute && bruteSeenAt < 0) bruteSeenAt = world.state.elapsed;
      if (bruteSeenAt >= 0 && !brute) break; // brute slain before it got in
      if (brute && bruteSeenAt >= 0) {
        const inside = Math.min(brute.x, 1280 - brute.x, brute.y, 720 - brute.y);
        if (inside > 150 || world.state.elapsed - bruteSeenAt > 5) break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // play: fight a little, then hold fire so the wave fills the field, then
  // open up again — the frame catches a busy field with bolts in the air.
  for (let i = 0; i < 4 / STEP; i += 1) {
    const events = world.step(STEP, pilot(world.state, 640), false);
    if (events & EVENT_OVER) break;
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
  }
  for (let round = 0; round < 2; round += 1) {
    for (let i = 0; i < 5 / STEP; i += 1) {
      const events = world.step(STEP, pilot(world.state, 640, false, false), false);
      if (events & EVENT_OVER) break;
      if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    }
    for (let i = 0; i < 1 / STEP; i += 1) {
      const events = world.step(STEP, pilot(world.state, 640), false);
      if (events & EVENT_OVER) break;
      if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    }
    if (activeWisps(world.state) >= 4) break;
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
