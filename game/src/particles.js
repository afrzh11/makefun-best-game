// Sparks and floating score text. One pool, allocated once at boot, drawn
// additively so bright things glow against the dark glade. Nothing here knows
// about the rules; the world only asks for bursts and the renderer paints them.
import { POOL } from './config.js';

export function createParticles() {
  const sparks = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 0 });
  }
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, size: 16, color: '#ffffff' });
  }

  function free(list) {
    for (const item of list) if (!item.active) return item;
    return null;
  }

  return {
    sparks,
    texts,
    /** A burst of glowing sparks. */
    burst(x, y, color, count, speed, life, size) {
      for (let i = 0; i < count; i += 1) {
        const s = free(sparks);
        if (!s) return;
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        s.active = true;
        s.x = x;
        s.y = y;
        s.vx = Math.cos(angle) * v;
        s.vy = Math.sin(angle) * v;
        s.maxLife = life * (0.6 + Math.random() * 0.4);
        s.life = s.maxLife;
        s.size = size * (0.6 + Math.random() * 0.8);
        s.color = color;
        s.drag = 2.2;
      }
    },
    /** A quick expanding ring (lantern hits, brute deaths). */
    ring(x, y, color, size) {
      const s = free(sparks);
      if (!s) return;
      s.active = true;
      s.x = x;
      s.y = y;
      s.vx = 0;
      s.vy = 0;
      s.maxLife = 0.45;
      s.life = 0.45;
      s.size = size;
      s.color = color;
      s.drag = 0;
      s.ring = true;
    },
    /** Rising score text. */
    float(x, y, text, color, size = 16) {
      const t = free(texts);
      if (!t) return;
      t.active = true;
      t.x = x;
      t.y = y;
      t.text = text;
      t.maxLife = 0.9;
      t.life = 0.9;
      t.size = size;
      t.color = color;
    },
    step(dt) {
      for (const s of sparks) {
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          s.ring = false;
          continue;
        }
        const damp = Math.max(0, 1 - s.drag * dt);
        s.vx *= damp;
        s.vy *= damp;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        if (t.life <= 0) t.active = false;
        else t.y -= 42 * dt;
      }
    },
    clear() {
      for (const s of sparks) s.active = false;
      for (const t of texts) t.active = false;
    },
  };
}
