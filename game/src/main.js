// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, game over and victory.
//
// ?seed=N fixes the night's pattern. ?shot=start|play|battle|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BOLT_HIT,
  EVENT_EMBER,
  EVENT_HIT_KEEPER,
  EVENT_HIT_LANTERN,
  EVENT_KILL,
  EVENT_OVER,
  EVENT_POWERUP,
  EVENT_SHOT,
  EVENT_WAVE_CLEAR,
  EVENT_WAVE_START,
  EVENT_WIN,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const particles = createParticles();
const world = createWorld(createRandom(seed), particles);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Let the sparks and floating texts from the staged game fade before the
  // picture is taken, or the frame is cluttered with frozen bursts. Texts
  // live 0.9 s, so 60 steps (1 s) clears them.
  for (let i = 0; i < 60; i += 1) particles.step(STEP);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000, particles);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    particles.clear();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Wave 1. ${world.state.lantern.flames} lantern flames.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.victory();
      announce(`Dawn breaks. You kept the lantern lit. Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.gameOver();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleEvents(events) {
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_BOLT_HIT) audio.hit();
    if (events & EVENT_KILL) audio.hit();
    if (events & EVENT_EMBER) audio.ember();
    if (events & EVENT_POWERUP) audio.powerup();
    if (events & EVENT_WAVE_START) audio.horn();
    if (events & EVENT_WAVE_CLEAR) audio.combo();
    if (events & EVENT_HIT_KEEPER) {
      audio.keeperHit();
      announce(world.state.keeper.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.keeper.hearts} hearts left.`);
    }
    if (events & EVENT_HIT_LANTERN) {
      audio.lanternHit();
      announce(world.state.lantern.flames === 1 ? 'A flame went out. 1 left.' : `A flame went out. ${world.state.lantern.flames} left.`);
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      const aim = input.aim();
      world.step(STEP, { mx: 0, my: 0, aimX: aim.x, aimY: aim.y, firing: false }, true);
      return;
    }
    const move = input.move();
    const aim = input.aim();
    const events = world.step(
      STEP,
      { mx: move.x, my: move.y, aimX: aim.x, aimY: aim.y, firing: input.isFiring() },
      false,
    );
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    particles.step(STEP);
    renderer.draw(world.state, screen, best, now / 1000, particles);
  }

  // Leaving the tab pauses a running game rather than letting wisps crawl unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Last Lantern. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
