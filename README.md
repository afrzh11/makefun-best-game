# Last Lantern

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/afrzh11/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/afrzh11/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Keep the last light burning. Ten waves of night stand between you and dawn.**

A complete, original arcade defense game that runs in a desktop browser from
static files — no network, no libraries, no build step. Open `game/index.html`
(or serve it with `node serve.ts` and visit http://localhost:8080) and play.

## The game

You are the Keeper, a small wisp of light guarding the last lantern in a dark
glade. Shadow wisps crawl in from the edges of the night to snuff its flames.
Blast them with light bolts, gather the embers they leave behind, and survive
all ten waves until dawn breaks.

- **Move** — WASD or Arrow keys
- **Aim** — Mouse
- **Fire** — hold Click or Space
- **Pause** — P or Esc · **Mute** — M

## Rules

- The lantern holds **5 flames**. A wisp that reaches it snuffs one. Lose them
  all and the light goes out.
- You have **3 hearts**. A wisp that touches you is destroyed — at the cost of
  a heart. Body-block to save the lantern, but a heart is a heart.
- Slain wisps burst into **embers**: walk over them to score. Quick kills in a
  row build a **combo** that makes every ember worth more.
- **Waves** grow harder: drifters, then fast zigzagging darts, then a massive
  **Gloom Brute** every fifth wave. Clear wave 10 and dawn breaks — you win.
- Slain wisps sometimes drop gifts: **Prism** (three-way shots), **Magnet**
  (embers fly to you), **Flame** (relights one lantern flame).
- Your best score is kept in this browser between visits.

## Files

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  `config.js` (tuning and palette), `random.js` (seeded RNG), `input.js`
  (keyboard, mouse, touch), `audio.js` (synthesised WebAudio sound),
  `world.js` (rules and state), `particles.js` (sparks and floating text),
  `render.js` (everything the eye sees), `shots.js` (staged screenshot
  scenes), `main.js` (boot and the fixed-step loop).
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged.
- `shots.json` — the four staged screenshots: title, play, the wave-5 brute,
  and game over.

Made for make.fun's "Make the best game" bounty. Referral code: `00whd2w5`.

## Run it

```sh
node serve.ts
# open http://localhost:8080 — or open game/index.html directly
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=00whd2w5&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
