# BUILD_LOG — Last Lantern (make.fun best-game-01)

Built 2026-11-17 (WIB) for the "Make the best game" bounty ($1,000, deadline
Thu 19 Nov 2026 01:00 WIB). Entry repo: https://github.com/afrzh11/makefun-best-game
(local work dir only — NOT pushed; parent pushes via the Contents API and submits).

## What it is

**LAST LANTERN** — an original arena-defense game, built from scratch (no
copied game, no library, no network request at runtime).

You are the Keeper, a small wisp of light defending the last lantern in a dark
glade. Shadow wisps crawl in from the edges toward the lantern; blast them
with light bolts, gather the embers they burst into, and survive all 10 waves
until dawn breaks.

- Move: WASD or arrow keys. Aim: mouse. Fire: hold Click or Space.
- A wisp that reaches the lantern snuffs 1 of 5 flames; a wisp that touches
  you costs 1 of 3 hearts. Body-blocking a wisp to save the lantern is a real
  choice — it costs a heart.
- Slain wisps burst into embers (score, combo multiplier up to +100%).
  Gifts drop: Prism (3-way shots, 12 s), Magnet (embers fly to you, 12 s),
  Flame (+1 lantern flame).
- Enemies: drifters (steady), darts (zigzag, faster), Gloom Brutes (10 HP,
  slow, one per wave from wave 5, big with red eyes).
- Win: clear wave 10 ("Dawn breaks"). Lose: all flames or all hearts gone.
  Game-over screen shows score, best, waves survived, wisps banished, embers
  gathered, accuracy — and restart (Space / click). Best score in localStorage.
- Synthesised WebAudio sounds (no audio files): shots, kills, ember pickups,
  powerups, lantern/keeper hits, wave clear, win/lose stingers. P pause,
  M mute. Screen shake, particles, floating score text, lantern flicker.

## Files (repo root)

- `main.ts` — Node 22 entry: copies `game/` + `screenshots/` to /output and
  writes `dossier.json` via the vendored `buildDossier` (gates enforced:
  text ≤ 163,840 B, 4 screenshots ≤ 256 KiB each, game ≤ 993 files / 48 MiB).
- `vendor/makefun-game.ts` — copied from the kit UNCHANGED
  (sha256 dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129,
  matches kit.json).
- `game/index.html` + `game/src/` (10 files, 66,318 B): `config.js`
  (tuning), `random.js` (mulberry32, seeded), `input.js`, `audio.js`,
  `particles.js`, `world.js` (rules/state, fixed 1/60 s step, event bit
  flags), `render.js` (canvas 2D: glade, lantern glow, keeper, wisps, bolts,
  embers, HUD, title/paused/game-over/victory screens), `shots.js` (staged
  scenes with autopilot), `main.js` (loop, screens, `?shot=` staging +
  `window.__shotReady`).
- `game/src/world.js` has no drawing and no browser in it — the rules are
  testable headless (see smoke tests below).
- `screenshots/` — 4 real renders of the game's own code (see below).
- `shots.json` — the 4 staged scenes: `start`, `play`, `battle`, `end`.
- `serve.ts` — static server for local play (`node serve.ts`, then
  http://localhost:8080; serves game/ on :8080).
- `.makefun/owner.json` — `{"wallet":"6DYzZByd9Ljf6HA8kViPjPYYA99iUXATjoGd3UezQmXb"}`.
- `LICENSE` (MIT, copied from the kit starter), `README.md` (game, controls,
  referral code 00whd2w5).

## How to run / play

```
cd ~/workspace/makefun-best-game
node serve.ts            # serves game/ on http://localhost:8080
```
Open http://localhost:8080 in a desktop browser. Click or press Space to
start. No install, no build step, no network request (verified: the page
loads only its own ES modules; sounds are synthesised in code).

Dossier build (what the grader runs):
```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
Verified 2026-11-17: exit 0, dossier.json 279,790 B, text 67,041 B (cap
163,840), 4 images, cover 0, all gates pass.

## Screenshots (real renders, 1280×720, all ≤ 256 KiB)

Taken in headless Google Chrome 157 via Playwright (script:
`~/workspace/makefun-best-game-shots/shots.mjs`; serves game/ on :8080,
opens each `?shot=` URL, waits for `window.__shotReady`, saves JPEG q82).
Each scene is a deterministic staged play-through from the real rules
(seed 1, autopilot), not a mock-up. All four were read back visually and
fixed until clean (see "Screenshot fixes" below).

- `screenshots/1-start.jpg` (61,076 B) — title screen: name, premise,
  controls, "Click or press Space to begin".
- `screenshots/2-play.jpg` (28,740 B) — wave 1 in play: keeper firing bolts,
  4 wisps on screen, embers, HUD (score 183, combo x2, wave 1/10, 5 flames,
  3 hearts).
- `screenshots/3-battle.jpg` (28,396 B) — wave 5: Gloom Brute visible
  top-right (big, spiked, red eyes), keeper mid-fight, score 5915, combo x3,
  18 wisps left, one flame already lost.
- `screenshots/4-end.jpg` (39,356 B) — game over: "THE LIGHT WENT OUT",
  Score 816, Best 816, Waves survived 2 of 10, Wisps banished 9, Embers
  gathered 17, Accuracy 18% (9 hits of 49 shots), "Press Space or click to
  play again".

## Tests run

- Logic smoke test (`node /tmp/test-game.mjs`, 2026-11-17): start → title,
  4 ambient wisps; play 24 s → wave 2, score 1238, 14 banished, 29 embers,
  flames 5, hearts 3; battle 120 s → wave 5, score 5610, 49 banished;
  end → game over, flames 0, hearts 2, score 0. All pass.
- Staged-scene test (`node /tmp/test-shots.mjs`, after the screenshot fixes):
  start (title, 4 ambient wisps), play (wave 1, score 183, 4 active wisps),
  battle (wave 5, score 5915, brute visible 147 px inside the field),
  end (game over, score 816, banished 9, flames 0, wave 2). All pass.
- `makefun check --kit <kit> --repo .`: kit verified (24 files); after
  commit, re-run to confirm the transcript gates — see "Unverified" below.
- Real-browser play: the game was rendered and screenshotted in headless
  Chrome 157 (see above). No live human play-test with keyboard/mouse was
  possible in this VM — the autopilot covers the same code paths.

## Screenshot fixes (what the first renders showed, and what changed)

1. First play/battle frames were cluttered with frozen burst particles and
   dozens of floating "+12" texts: the staged sim never decayed particles
   after staging. Fix: `runShot` now steps particles 60 times (1 s) before
   painting, so bursts (0.5 s) and texts (0.9 s) fade out.
2. First play frame was nearly empty (pilot too efficient, field cleared).
   Fix: the play scene now fights 4 s, holds fire 5 s so the wave fills the
   field, then opens up again for 1 s (repeats once if fewer than 4 wisps
   are active).
3. First battle frame had no brute visible: the pilot killed it at the edge
   before it walked in. Fix: the battle pilot ignores the brute until it is
   150 px inside the field (or 5 s have passed), fighting the other wisps
   meanwhile.
4. First end frame showed a 0-score game over (idle from the start — reads
   as "the player did nothing"). Fix: the end pilot plays well for 18 s,
   then stops, so the loss screen carries a real score and stats.

## Environment notes

- Node v24.22.1 on this VM; the entry uses only Node-22-compatible APIs
  (node:fs, node:path, node:url, erasable TypeScript in main.ts).
- No Chrome/Chromium was installed: Playwright's Chromium download is
  blocked by the egress proxy (cdn.playwright.dev returns
  "GatewayExceptionResponse"). Workaround: installed Google Chrome 157 from
  dl.google.com (the .deb needed a resume — the first fetch truncated at
  70 MB; `curl -C -` completed it to 147,497,676 B), then pointed Playwright
  at `/usr/bin/google-chrome` with `--no-sandbox`. The Playwright Chromium
  zip in /tmp was a 24-byte proxy error page, not a zip — deleted/ignored.
- The leftover `npx playwright install-deps` apt process from the failed
  Chromium install may still have been running when Chrome was installed;
  harmless (system libs only).

## Unverified / still to do (parent)

- `makefun check` transcript gates: the check refused before commit ("has no
  commit HEAD yet"). Re-run after this commit; the bundle (parent's step)
  is what the transcript gate actually validates — this builder session's
  transcripts are the Muse app sessions, recorded, not handed over.
- No live human keyboard/mouse play-test (see "Tests run"). The autopilot
  and headless renders cover the rules and visuals; a quick human play
  (WASD + mouse + click, pause, mute, restart) is worth 2 minutes before
  submitting if a browser is available.
- Balance is tuned by feel, not by play-testing against humans: wave 1 is
  gentle, brutes arrive wave 5, 10 waves to win. If it plays too easy/hard
  in a human test, the knobs are all in `game/src/config.js`.
- The `out/` build directory is local only (git-ignored, not committed).
  Screenshot tooling lives in `~/workspace/makefun-best-game-shots/`
  (outside the repo).
- DO NOT push/submit from this builder session — parent handles both.
