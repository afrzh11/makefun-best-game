// The game's rules and state, with no drawing and no browser in it: the keeper,
// the lantern, the waves of shadow wisps, light bolts, embers, gifts, score and
// combos. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react (sounds, announcements) without the world knowing
// about screens or sound. Nothing here allocates after createWorld returns,
// except the wave queue, which is rebuilt once per wave.
import { BOLT, COMBO_WINDOW, EMBER, FIELD, KEEPER, LANTERN, POOL, POWERUP, WAVE, WISP } from './config.js';

export const EVENT_SHOT = 1;
export const EVENT_KILL = 2;
export const EVENT_EMBER = 4;
export const EVENT_POWERUP = 8;
export const EVENT_HIT_KEEPER = 16;
export const EVENT_HIT_LANTERN = 32;
export const EVENT_WAVE_START = 64;
export const EVENT_WAVE_CLEAR = 128;
export const EVENT_OVER = 256;
export const EVENT_WIN = 512;
export const EVENT_BOLT_HIT = 1024;

const KIND_DRIFTER = 'drifter';
const KIND_DART = 'dart';
const KIND_BRUTE = 'brute';

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random, fx) {
  const keeper = {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 150,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hearts: KEEPER.hearts,
    invuln: 0,
    fireTimer: 0,
    prismUntil: 0,
    magnetUntil: 0,
  };
  const lantern = { flames: LANTERN.flames, flicker: 0 };
  const wisps = [];
  for (let i = 0; i < POOL.wisps; i += 1) {
    wisps.push({ active: false, kind: KIND_DRIFTER, x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, radius: 14, speed: 50, wobble: 0, wobbleSpeed: 0, hitFlash: 0, score: 50, embers: 3 });
  }
  const bolts = [];
  for (let i = 0; i < POOL.bolts; i += 1) bolts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const embers = [];
  for (let i = 0; i < POOL.embers; i += 1) embers.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, value: 10, life: 0 });
  const powerups = [];
  for (let i = 0; i < POOL.powerups; i += 1) powerups.push({ active: false, kind: 'prism', x: 0, y: 0, life: 0 });

  const state = {
    keeper,
    lantern,
    wisps,
    bolts,
    embers,
    powerups,
    score: 0,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    wavePhase: 'calm',
    calmTimer: WAVE.calm,
    banner: '',
    bannerTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    banished: 0,
    embersCollected: 0,
    shotsFired: 0,
    shotsHit: 0,
    elapsed: 0,
    shake: 0,
    over: false,
    won: false,
  };

  function reset() {
    keeper.x = FIELD.width / 2;
    keeper.y = FIELD.height / 2 + 150;
    keeper.vx = 0;
    keeper.vy = 0;
    keeper.angle = -Math.PI / 2;
    keeper.hearts = KEEPER.hearts;
    keeper.invuln = 0;
    keeper.fireTimer = 0;
    keeper.prismUntil = 0;
    keeper.magnetUntil = 0;
    lantern.flames = LANTERN.flames;
    lantern.flicker = 0;
    for (const w of wisps) w.active = false;
    for (const b of bolts) b.active = false;
    for (const e of embers) e.active = false;
    for (const p of powerups) p.active = false;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.wave = 1;
    state.wavePhase = 'calm';
    state.calmTimer = WAVE.calm;
    state.banner = 'Wave 1';
    state.bannerTimer = WAVE.calm;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.banished = 0;
    state.embersCollected = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.elapsed = 0;
    state.shake = 0;
    state.over = false;
    state.won = false;
  }

  function free(list) {
    for (const item of list) if (!item.active) return item;
    return null;
  }

  function comboMult() {
    return 1 + 0.1 * Math.min(state.combo, 10);
  }

  function spawnWisp(kind) {
    const w = free(wisps);
    if (!w) return;
    const spec = WISP[kind];
    const edge = Math.floor(random() * 4);
    const m = 30;
    if (edge === 0) {
      w.x = random() * FIELD.width;
      w.y = -m;
    } else if (edge === 1) {
      w.x = random() * FIELD.width;
      w.y = FIELD.height + m;
    } else if (edge === 2) {
      w.x = -m;
      w.y = random() * FIELD.height;
    } else {
      w.x = FIELD.width + m;
      w.y = random() * FIELD.height;
    }
    w.active = true;
    w.kind = kind;
    w.hp = spec.hp;
    w.maxHp = spec.hp;
    w.radius = spec.radius;
    w.speed = spec.speed + spec.speedPerWave * (state.wave - 1);
    w.wobble = random() * Math.PI * 2;
    w.wobbleSpeed = 2 + random() * 3;
    w.hitFlash = 0;
    w.score = spec.score;
    w.embers = spec.embers;
    w.vx = 0;
    w.vy = 0;
  }

  function buildWave() {
    const queue = [];
    const d = WAVE.drifters(state.wave);
    const t = WAVE.darts(state.wave);
    const b = WAVE.brutes(state.wave);
    for (let i = 0; i < d; i += 1) queue.push(KIND_DRIFTER);
    for (let i = 0; i < t; i += 1) queue.push(KIND_DART);
    for (let i = 0; i < b; i += 1) queue.push(KIND_BRUTE);
    // Shuffle with the seeded random so a seed replays the same wave.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    // Brutes lead the wave, so the player sees the big one first.
    queue.sort((a, b2) => (a === KIND_BRUTE ? -1 : 0) - (b2 === KIND_BRUTE ? -1 : 0));
    return queue;
  }

  function spawnBolt(angle) {
    const b = free(bolts);
    if (!b) return;
    b.active = true;
    b.x = keeper.x + Math.cos(angle) * 24;
    b.y = keeper.y + Math.sin(angle) * 24;
    b.vx = Math.cos(angle) * BOLT.speed;
    b.vy = Math.sin(angle) * BOLT.speed;
    b.life = BOLT.life;
  }

  function dropEmbers(x, y, count, baseValue) {
    for (let i = 0; i < count; i += 1) {
      const e = free(embers);
      if (!e) return;
      const angle = random() * Math.PI * 2;
      const speed = 60 + random() * 120;
      e.active = true;
      e.x = x;
      e.y = y;
      e.vx = Math.cos(angle) * speed;
      e.vy = Math.sin(angle) * speed;
      e.value = Math.round(baseValue * comboMult());
      e.life = EMBER.life;
    }
  }

  function dropPowerup(x, y, forceKind) {
    const p = free(powerups);
    if (!p) return;
    let kind = forceKind;
    if (!kind) {
      const roll = random();
      kind = roll < 0.4 ? 'prism' : roll < 0.75 ? 'magnet' : 'flame';
    }
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.life = POWERUP.life;
  }

  function killWisp(w) {
    w.active = false;
    state.banished += 1;
    state.score += w.score;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    fx.burst(w.x, w.y, w.kind === KIND_BRUTE ? '#ff8fa3' : '#b388ff', w.kind === KIND_BRUTE ? 26 : 12, 220, 0.5, 3);
    fx.float(w.x, w.y - 10, `+${w.score}`, '#ffd166', w.kind === KIND_BRUTE ? 22 : 15);
    dropEmbers(w.x, w.y, w.embers, EMBER.value);
    if (w.kind === KIND_BRUTE) {
      fx.ring(w.x, w.y, '#ff8fa3', 90);
      dropPowerup(w.x, w.y, lantern.flames < LANTERN.maxFlames ? 'flame' : 'prism');
    } else if (random() < POWERUP.dropChance) {
      dropPowerup(w.x, w.y, null);
    }
  }

  function waveInterval() {
    return Math.max(WAVE.minInterval, WAVE.interval * WAVE.intervalScale ** (state.wave - 1));
  }

  function activeWisps() {
    let n = 0;
    for (const w of wisps) if (w.active) n += 1;
    return n;
  }

  /**
   * One fixed step. ctrl: { mx, my, aimX, aimY, firing }. With `harmless` set
   * (the title screen's backdrop) wisps drift across and fade at the lantern:
   * nothing scores, nothing is hurt.
   */
  function step(dt, ctrl, harmless) {
    let events = 0;
    state.elapsed += dt;
    lantern.flicker += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;

    // The keeper steers toward the move vector, with a little smoothing.
    const tx = ctrl.mx * KEEPER.speed;
    const ty = ctrl.my * KEEPER.speed;
    keeper.vx += (tx - keeper.vx) * Math.min(1, 14 * dt);
    keeper.vy += (ty - keeper.vy) * Math.min(1, 14 * dt);
    keeper.x = Math.min(FIELD.width - 24, Math.max(24, keeper.x + keeper.vx * dt));
    keeper.y = Math.min(FIELD.height - 24, Math.max(24, keeper.y + keeper.vy * dt));
    keeper.angle = Math.atan2(ctrl.aimY - keeper.y, ctrl.aimX - keeper.x);
    if (keeper.invuln > 0) keeper.invuln -= dt;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Firing: one bolt, or three while the prism gift lasts.
    keeper.fireTimer -= dt;
    if (ctrl.firing && keeper.fireTimer <= 0 && !harmless) {
      const spread = keeper.prismUntil > state.elapsed;
      spawnBolt(keeper.angle);
      if (spread) {
        spawnBolt(keeper.angle - 0.18);
        spawnBolt(keeper.angle + 0.18);
      }
      keeper.fireTimer = BOLT.interval;
      state.shotsFired += 1;
      events |= EVENT_SHOT;
      fx.burst(keeper.x + Math.cos(keeper.angle) * 26, keeper.y + Math.sin(keeper.angle) * 26, '#bff3ff', 2, 120, 0.15, 2);
    }

    // Waves.
    if (!harmless) {
      if (state.wavePhase === 'calm') {
        state.calmTimer -= dt;
        if (state.calmTimer <= 0) {
          state.wavePhase = 'fight';
          state.spawnQueue = buildWave();
          state.spawnTimer = 0.4;
          state.banner = state.wave === WAVE.final ? `Final Wave — ${state.wave}` : `Wave ${state.wave}`;
          state.bannerTimer = 2;
          events |= EVENT_WAVE_START;
        }
      } else if (state.wavePhase === 'fight') {
        if (state.spawnQueue.length > 0) {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            spawnWisp(state.spawnQueue.shift());
            state.spawnTimer = waveInterval();
          }
        } else if (activeWisps() === 0) {
          const bonus = 100 * state.wave;
          state.score += bonus;
          state.wavePhase = 'clear';
          state.banner = `Wave ${state.wave} clear! +${bonus}`;
          state.bannerTimer = 2;
          events |= EVENT_WAVE_CLEAR;
          fx.float(LANTERN.x, LANTERN.y - 70, `Wave bonus +${bonus}`, '#ffd166', 20);
          if (state.wave >= WAVE.final) {
            state.won = true;
            events |= EVENT_WIN;
          } else {
            state.wave += 1;
            state.wavePhase = 'calm';
            state.calmTimer = WAVE.calm;
          }
        }
      }
    } else if (state.wavePhase === 'calm' && state.spawnQueue.length === 0) {
      // Title backdrop: a slow trickle of wisps drifting past the lantern.
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && activeWisps() < 5) {
        spawnWisp(random() < 0.7 ? KIND_DRIFTER : KIND_DART);
        state.spawnTimer = 1.6;
      }
    }

    // Wisps drift toward the lantern; darts weave as they come.
    for (const w of wisps) {
      if (!w.active) continue;
      if (w.hitFlash > 0) w.hitFlash -= dt;
      const dx = LANTERN.x - w.x;
      const dy = LANTERN.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = (dx / d) * w.speed;
      let vy = (dy / d) * w.speed;
      if (w.kind === KIND_DART) {
        const wob = Math.sin(state.elapsed * w.wobbleSpeed + w.wobble) * 0.9;
        vx += (-dy / d) * wob * w.speed;
        vy += (dx / d) * wob * w.speed;
      }
      w.vx = vx;
      w.vy = vy;
      w.x += vx * dt;
      w.y += vy * dt;

      if (harmless) {
        if (d < LANTERN.radius + 10) {
          w.active = false;
          fx.burst(w.x, w.y, '#b388ff', 6, 120, 0.4, 2);
        }
        continue;
      }
      // A wisp that reaches the lantern snuffs one flame.
      if (d < LANTERN.radius + w.radius - 4) {
        w.active = false;
        lantern.flames -= 1;
        state.shake = 1;
        state.combo = 0;
        state.comboTimer = 0;
        fx.ring(LANTERN.x, LANTERN.y, '#ff5d5d', 70);
        fx.burst(w.x, w.y, '#ff5d5d', 14, 200, 0.5, 3);
        events |= EVENT_HIT_LANTERN;
        if (lantern.flames <= 0) {
          lantern.flames = 0;
          state.over = true;
          events |= EVENT_OVER;
        }
        continue;
      }
      // A wisp that touches the keeper is destroyed — at the cost of a heart.
      const kd = Math.hypot(w.x - keeper.x, w.y - keeper.y);
      if (kd < w.radius + KEEPER.radius - 2 && keeper.invuln <= 0) {
        w.active = false;
        keeper.hearts -= 1;
        keeper.invuln = KEEPER.invulnerable;
        const nx = (keeper.x - w.x) / (kd || 1);
        const ny = (keeper.y - w.y) / (kd || 1);
        keeper.vx += nx * 320;
        keeper.vy += ny * 320;
        state.shake = 0.7;
        fx.burst(keeper.x, keeper.y, '#7fe7ff', 16, 260, 0.5, 3);
        events |= EVENT_HIT_KEEPER;
        if (keeper.hearts <= 0) {
          keeper.hearts = 0;
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }

    // Bolts fly straight and die on the first wisp they meet.
    for (const b of bolts) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      for (const w of wisps) {
        if (!w.active) continue;
        const rr = w.radius + BOLT.radius;
        if (dist2(b.x, b.y, w.x, w.y) < rr * rr) {
          b.active = false;
          w.hp -= BOLT.damage;
          w.hitFlash = 0.09;
          state.shotsHit += 1;
          fx.burst(b.x, b.y, '#ffffff', 4, 160, 0.25, 2);
          if (w.hp <= 0) {
            killWisp(w);
            events |= EVENT_KILL;
          } else {
            events |= EVENT_BOLT_HIT;
          }
          break;
        }
      }
    }

    // Embers drift, then fly to the keeper while magnet is up.
    const magnet = keeper.magnetUntil > state.elapsed;
    for (const e of embers) {
      if (!e.active) continue;
      e.life -= dt;
      if (e.life <= 0) {
        e.active = false;
        continue;
      }
      const dx = keeper.x - e.x;
      const dy = keeper.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (magnet || d < 130) {
        const pull = magnet ? EMBER.magnetSpeed : 190;
        e.vx += (dx / d) * pull * dt * 6;
        e.vy += (dy / d) * pull * dt * 6;
      } else {
        e.vx *= Math.max(0, 1 - 2 * dt);
        e.vy *= Math.max(0, 1 - 2 * dt);
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (d < EMBER.pickupRadius) {
        e.active = false;
        state.score += e.value;
        state.embersCollected += 1;
        fx.float(e.x, e.y - 8, `+${e.value}`, '#ffd166', 13);
        events |= EVENT_EMBER;
      }
    }

    // Gifts drift down and wait to be picked up.
    for (const p of powerups) {
      if (!p.active) continue;
      p.life -= dt;
      p.y += POWERUP.drift * dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      const d = Math.hypot(p.x - keeper.x, p.y - keeper.y);
      if (d < POWERUP.radius + KEEPER.radius + 6) {
        p.active = false;
        if (p.kind === 'prism') keeper.prismUntil = state.elapsed + POWERUP.prismSeconds;
        else if (p.kind === 'magnet') keeper.magnetUntil = state.elapsed + POWERUP.magnetSeconds;
        else if (p.kind === 'flame') lantern.flames = Math.min(LANTERN.maxFlames, lantern.flames + 1);
        fx.ring(keeper.x, keeper.y, '#ffd166', 46);
        fx.float(keeper.x, keeper.y - 24, p.kind === 'prism' ? 'PRISM SHOT!' : p.kind === 'magnet' ? 'MAGNET!' : '+1 FLAME', '#ffd166', 16);
        events |= EVENT_POWERUP;
      }
    }

    return events;
  }

  /** Wisps still to face this wave (queued plus alive). */
  function waveRemaining() {
    return state.spawnQueue.length + activeWisps();
  }

  reset();
  return { state, reset, step, waveRemaining };
}
