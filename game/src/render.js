// Everything the eye sees, and nothing else: the glade, the lantern, the keeper,
// the wisps, the bolts, the embers, the particles, the HUD and every screen.
// The renderer never changes the world; it only reads state and paints it.
import { FIELD, FONT, KEEPER, LANTERN, PALETTE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

// A fixed starfield and firefly swarm, drawn from a constant seed so every
// visit — and every screenshot — shows the same sky.
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const skyRandom = mulberry32(1337);
const STARS = [];
for (let i = 0; i < 110; i += 1) {
  STARS.push({ x: skyRandom() * FIELD.width, y: skyRandom() * FIELD.height * 0.75, r: 0.6 + skyRandom() * 1.6, phase: skyRandom() * Math.PI * 2, speed: 0.4 + skyRandom() * 1.2 });
}
const FLIES = [];
for (let i = 0; i < 16; i += 1) {
  FLIES.push({ x: skyRandom() * FIELD.width, y: skyRandom() * FIELD.height, amp: 12 + skyRandom() * 26, speed: 0.2 + skyRandom() * 0.5, phase: skyRandom() * Math.PI * 2 });
}

function flamePath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.bezierCurveTo(x + size * 0.62, y - size * 0.25, x + size * 0.5, y + size * 0.55, x, y + size * 0.62);
  ctx.bezierCurveTo(x - size * 0.5, y + size * 0.55, x - size * 0.62, y - size * 0.25, x, y - size);
  ctx.closePath();
}

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.55);
  ctx.bezierCurveTo(x - size, y - size * 0.1, x - size * 0.45, y - size * 0.85, x, y - size * 0.25);
  ctx.bezierCurveTo(x + size * 0.45, y - size * 0.85, x + size, y - size * 0.1, x, y + size * 0.55);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function frame(time, state) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (state.shake > 0) {
      const s = state.shake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    return { dpr, scale };
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#0b0e1e');
    g.addColorStop(0.55, '#12162e');
    g.addColorStop(1, '#1a2040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Stars.
    for (const s of STARS) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cdd7ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Low hills at the bottom of the glade.
    ctx.fillStyle = '#0e1226';
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    ctx.bezierCurveTo(220, 560, 420, 640, 640, 600);
    ctx.bezierCurveTo(860, 560, 1080, 650, FIELD.width, 590);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
    // Fireflies drifting through the dark.
    for (const f of FLIES) {
      const x = f.x + Math.sin(time * f.speed + f.phase) * f.amp;
      const y = f.y + Math.cos(time * f.speed * 0.7 + f.phase) * f.amp * 0.5;
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.3 + f.phase * 3));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLantern(state, time) {
    const { x, y } = LANTERN;
    const flames = state.lantern.flames;
    const glowStrength = 0.25 + 0.75 * (flames / LANTERN.maxFlames);
    // Warm light spilling across the glade.
    const flicker = 1 + 0.05 * Math.sin(time * 9) + 0.03 * Math.sin(time * 23 + 1.7);
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 240 * flicker);
    glow.addColorStop(0, `rgba(255, 179, 71, ${0.34 * glowStrength})`);
    glow.addColorStop(0.5, `rgba(255, 150, 60, ${0.12 * glowStrength})`);
    glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 240 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Hanging chain and cap.
    ctx.strokeStyle = '#3a3f55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 96);
    ctx.lineTo(x, y - 52);
    ctx.stroke();
    ctx.fillStyle = '#2a2f45';
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 52);
    ctx.lineTo(x + 26, y - 52);
    ctx.lineTo(x + 18, y - 40);
    ctx.lineTo(x - 18, y - 40);
    ctx.closePath();
    ctx.fill();
    // Glass.
    const glass = ctx.createLinearGradient(x - 24, y - 40, x + 24, y + 30);
    glass.addColorStop(0, 'rgba(255, 220, 140, 0.28)');
    glass.addColorStop(1, 'rgba(255, 170, 80, 0.12)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 40);
    ctx.lineTo(x + 24, y - 40);
    ctx.lineTo(x + 20, y + 26);
    ctx.lineTo(x - 20, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a5068';
    ctx.lineWidth = 3;
    ctx.stroke();
    // The flame inside — it shrinks and dims as flames are lost.
    if (flames > 0) {
      const fs = (10 + flames * 1.6) * flicker;
      const fg = ctx.createRadialGradient(x, y - 4, 1, x, y - 4, fs * 2.2);
      fg.addColorStop(0, '#fff6c9');
      fg.addColorStop(0.45, '#ffcf5e');
      fg.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = fg;
      flamePath(ctx, x, y - 2, fs);
      ctx.fill();
    }
    // Base.
    ctx.fillStyle = '#2a2f45';
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 26);
    ctx.lineTo(x + 26, y + 26);
    ctx.lineTo(x + 20, y + 38);
    ctx.lineTo(x - 20, y + 38);
    ctx.closePath();
    ctx.fill();
    // Rising motes above the flame.
    if (flames > 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 5; i += 1) {
        const t = ((time * 0.35 + i * 0.2) % 1);
        ctx.beginPath();
        ctx.arc(x + Math.sin(i * 2.4 + time) * 10, y - 44 - t * 46, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawKeeper(state, time) {
    const k = state.keeper;
    const blink = k.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    // Cloak.
    ctx.fillStyle = '#12303e';
    ctx.beginPath();
    ctx.moveTo(k.x, k.y - 16);
    ctx.lineTo(k.x + 13, k.y + 12);
    ctx.lineTo(k.x - 13, k.y + 12);
    ctx.closePath();
    ctx.fill();
    // Glowing body.
    const g = ctx.createRadialGradient(k.x, k.y - 2, 1, k.x, k.y - 2, 17);
    g.addColorStop(0, '#eafcff');
    g.addColorStop(0.5, '#7fe7ff');
    g.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(k.x, k.y - 2, 17, 0, Math.PI * 2);
    ctx.fill();
    // Eyes, looking where the keeper aims.
    const ex = Math.cos(k.angle) * 3;
    const ey = Math.sin(k.angle) * 3;
    ctx.fillStyle = '#06222e';
    ctx.beginPath();
    ctx.arc(k.x - 5 + ex, k.y - 4 + ey, 2.2, 0, Math.PI * 2);
    ctx.arc(k.x + 5 + ex, k.y - 4 + ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Staff pointing at the aim.
    const sx = k.x + Math.cos(k.angle) * 20;
    const sy = k.y + Math.sin(k.angle) * 20;
    ctx.strokeStyle = '#7fe7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(k.x + Math.cos(k.angle) * 8, k.y + Math.sin(k.angle) * 8);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = '#eafcff';
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWisps(state, time) {
    for (const w of state.wisps) {
      if (!w.active) continue;
      const eyes = w.kind === 'brute' ? PALETTE.bruteEye : w.kind === 'dart' ? PALETTE.dartEye : PALETTE.wispEye;
      const wob = 1 + 0.06 * Math.sin(time * 5 + w.wobble);
      // Smoky body.
      const g = ctx.createRadialGradient(w.x, w.y, 1, w.x, w.y, w.radius * 1.5);
      g.addColorStop(0, w.kind === 'brute' ? '#4a2040' : '#3a2d5e');
      g.addColorStop(0.7, '#241a3d');
      g.addColorStop(1, 'rgba(36, 26, 61, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius * 1.5 * wob, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2148';
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius * wob, 0, Math.PI * 2);
      ctx.fill();
      if (w.kind === 'brute') {
        // Spikes around the brute.
        ctx.fillStyle = '#4a2040';
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + time * 0.4;
          const px = w.x + Math.cos(a) * w.radius;
          const py = w.y + Math.sin(a) * w.radius;
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a - 0.25) * 8, py + Math.sin(a - 0.25) * 8);
          ctx.lineTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16);
          ctx.lineTo(px + Math.cos(a + 0.25) * 8, py + Math.sin(a + 0.25) * 8);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Eyes, always watching the lantern.
      const look = Math.atan2(LANTERN.y - w.y, LANTERN.x - w.x);
      const ex = Math.cos(look) * 3;
      const ey = Math.sin(look) * 3;
      const eyeR = w.kind === 'brute' ? 5 : 3.2;
      const spread = w.radius * 0.38;
      const px = -Math.sin(look) * spread;
      const py = Math.cos(look) * spread;
      ctx.fillStyle = eyes;
      ctx.beginPath();
      ctx.arc(w.x + px + ex, w.y + py + ey, eyeR, 0, Math.PI * 2);
      ctx.arc(w.x - px + ex, w.y - py + ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      if (w.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.8, w.hitFlash * 6);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Brute health bar.
      if (w.kind === 'brute' && w.hp < w.maxHp) {
        const bw = 54;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(w.x - bw / 2, w.y - w.radius - 16, bw, 6);
        ctx.fillStyle = '#ff5d8f';
        ctx.fillRect(w.x - bw / 2, w.y - w.radius - 16, (bw * w.hp) / w.maxHp, 6);
      }
    }
  }

  function drawBolts(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bolts) {
      if (!b.active) continue;
      const len = 26;
      const d = Math.hypot(b.vx, b.vy) || 1;
      const nx = b.vx / d;
      const ny = b.vy / d;
      ctx.strokeStyle = 'rgba(191, 243, 255, 0.35)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(b.x - nx * len, b.y - ny * len);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = '#eafcff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x - nx * len, b.y - ny * len);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEmbers(state, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of state.embers) {
      if (!e.active) continue;
      const pulse = 0.75 + 0.25 * Math.sin(time * 6 + e.x);
      const blink = e.life < 2 ? (Math.floor(time * 8) % 2 === 0 ? 0.25 : 1) : 1;
      ctx.globalAlpha = pulse * blink;
      ctx.fillStyle = '#ffd166';
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(time * 2 + e.x);
      const s = e.value >= 20 ? 9 : 7;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPowerups(state, time) {
    for (const p of state.powerups) {
      if (!p.active) continue;
      const pulse = 1 + 0.12 * Math.sin(time * 5);
      const blink = p.life < 2 ? (Math.floor(time * 8) % 2 === 0 ? 0.3 : 1) : 1;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);
      const ring = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      ring.addColorStop(0, 'rgba(255, 209, 102, 0.5)');
      ring.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1430';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      if (p.kind === 'prism') {
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 6);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'magnet') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(0, -1, 7, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, -1);
        ctx.lineTo(-7, 6);
        ctx.moveTo(7, -1);
        ctx.lineTo(7, 6);
        ctx.stroke();
      } else {
        flamePath(ctx, 0, 1, 8);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles(particles) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of particles.sparks) {
      if (!s.active) continue;
      const a = Math.max(0, s.life / s.maxLife);
      if (s.ring) {
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.5, s.size * a), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of particles.texts) {
      if (!t.active) continue;
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `700 ${t.size}px ${FONT}`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best, time) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.font = `800 34px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`SCORE ${state.score}`, 24, 46);
    ctx.font = `600 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 24, 70);
    if (state.combo >= 2) {
      const comboA = 0.6 + 0.4 * Math.sin(time * 6);
      ctx.globalAlpha = comboA;
      ctx.font = `800 20px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`COMBO x${state.combo}`, 24, 98);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
      ctx.fillRect(24, 106, 90 * (state.comboTimer / 2.5), 4);
    }
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`WAVE ${state.wave} / 10`, FIELD.width / 2, 40);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    const remaining = state.wavePhase === 'fight' ? state.spawnQueue.length + state.wisps.filter((w) => w.active).length : 0;
    ctx.fillText(state.wavePhase === 'calm' ? 'get ready…' : `${remaining} wisps left`, FIELD.width / 2, 62);
    // Lantern flames and keeper hearts, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < LANTERN.maxFlames; i += 1) {
      const x = FIELD.width - 30 - i * 30;
      if (i < state.lantern.flames) {
        ctx.fillStyle = '#ffcf5e';
        flamePath(ctx, x, 34, 11);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(154, 163, 184, 0.5)';
        ctx.lineWidth = 2;
        flamePath(ctx, x, 34, 11);
        ctx.stroke();
      }
    }
    for (let i = 0; i < KEEPER.hearts; i += 1) {
      const x = FIELD.width - 30 - i * 30;
      ctx.fillStyle = '#ff5d8f';
      heartPath(ctx, x, 62, 9);
      ctx.fill();
    }
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('LANTERN', FIELD.width - 30, 92);
    ctx.fillText('KEEPER', FIELD.width - 30, 112);
    // Gift timers, bottom left.
    let ty = FIELD.height - 24;
    ctx.textAlign = 'left';
    ctx.font = `700 14px ${FONT}`;
    if (state.keeper.prismUntil > state.elapsed) {
      const left = state.keeper.prismUntil - state.elapsed;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`PRISM SHOT ${Math.ceil(left)}s`, 24, ty);
      ty -= 22;
    }
    if (state.keeper.magnetUntil > state.elapsed) {
      const left = state.keeper.magnetUntil - state.elapsed;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`MAGNET ${Math.ceil(left)}s`, 24, ty);
    }
    ctx.textAlign = 'left';
  }

  function drawBanner(state) {
    if (state.bannerTimer <= 0 || !state.banner) return;
    const a = Math.min(1, state.bannerTimer * 2);
    const pop = 1 + 0.12 * Math.max(0, state.bannerTimer - 1.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(FIELD.width / 2, 150);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.font = `800 52px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(state.banner, 4, 4);
    ctx.fillStyle = PALETTE.banner;
    ctx.fillText(state.banner, 0, 0);
    ctx.restore();
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = PALETTE.panel;
    const w = 620;
    const h = 120 + lines.length * 34;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2 - 20;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.font = `800 44px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(title, FIELD.width / 2, y + 62);
    ctx.font = `600 19px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, y + 108 + i * 34);
    });
    return { x, y, w, h };
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.font = `800 84px ${FONT}`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('LAST LANTERN', FIELD.width / 2, 218);
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('Keep the last light burning. Ten waves of night stand between you and dawn.', FIELD.width / 2, 262);
    ctx.font = `600 18px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    const lines = [
      'Move — WASD or Arrow keys      Aim — Mouse      Fire — hold Click or Space',
      'Shadow wisps crawl toward the lantern. Blast them, gather their embers.',
      'A wisp that reaches the lantern snuffs a flame. A wisp that touches you costs a heart.',
      'Body-block to save the lantern — but a heart is a heart. Gifts fall: Prism, Magnet, Flame.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 318 + i * 30));
    if (best > 0) {
      ctx.font = `800 20px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 470);
    }
    ctx.font = `800 26px ${FONT}`;
    ctx.fillStyle = Math.floor(performance.now() / 500) % 2 === 0 ? '#eef1f5' : '#9aa3b8';
    ctx.fillText('Click or press Space to begin', FIELD.width / 2, 530);
    ctx.font = `600 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('P pause · M mute', FIELD.width / 2, 566);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel('PAUSED', ['Press P or Esc to keep playing.'], PALETTE.text);
  }

  function statsLines(state, best) {
    const acc = state.shotsFired > 0 ? Math.round((100 * state.shotsHit) / state.shotsFired) : 0;
    return [
      `Score ${state.score}   ·   Best ${Math.max(best, state.score)}`,
      `Waves survived ${state.won ? 10 : state.wave - (state.wavePhase === 'calm' ? 1 : 0)} of 10`,
      `Wisps banished ${state.banished}   ·   Embers gathered ${state.embersCollected}`,
      `Accuracy ${acc}%  (${state.shotsHit} hits of ${state.shotsFired} shots)`,
    ];
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(5, 6, 15, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const box = panel('THE LIGHT WENT OUT', statsLines(state, best), PALETTE.danger);
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = Math.floor(performance.now() / 500) % 2 === 0 ? '#eef1f5' : '#9aa3b8';
    ctx.fillText('Press Space or click to play again', FIELD.width / 2, box.y + box.h + 44);
  }

  function drawWin(state, best) {
    const dawn = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    dawn.addColorStop(0, 'rgba(255, 190, 90, 0.28)');
    dawn.addColorStop(1, 'rgba(255, 120, 60, 0.05)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const box = panel('DAWN BREAKS', ['You kept the lantern lit through all ten waves.', ...statsLines(state, best)], '#ffd166');
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = Math.floor(performance.now() / 500) % 2 === 0 ? '#eef1f5' : '#9aa3b8';
    ctx.fillText('Press Space or click to play again', FIELD.width / 2, box.y + box.h + 44);
  }

  function draw(state, screen, best, time, particles) {
    frame(time, state);
    drawBackground(time);
    drawLantern(state, time);
    drawEmbers(state, time);
    drawPowerups(state, time);
    drawWisps(state, time);
    drawBolts(state);
    if (screen !== SCREEN_TITLE) drawKeeper(state, time);
    drawParticles(particles);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best, time);
      drawBanner(state);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_WIN) drawWin(state, best);
    // Vignette.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.45,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return { draw };
}
