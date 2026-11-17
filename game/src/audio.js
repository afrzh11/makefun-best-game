// All sound is synthesised with WebAudio — no audio files, no network.
// Each effect is a few oscillators or a short noise burst through a master gain.
// The context is created lazily on the first user gesture (browsers demand that)
// and the whole set can be muted with M.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.5, delay = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.15, vol = 0.4, low = 400, delay = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from any user gesture so the context is allowed to start. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 880, to: 320, dur: 0.07, vol: 0.16 });
    },
    hit() {
      noise({ dur: 0.1, vol: 0.3, low: 900 });
      tone({ type: 'triangle', from: 220, to: 90, dur: 0.1, vol: 0.25 });
    },
    ember() {
      tone({ type: 'sine', from: 660, to: 990, dur: 0.09, vol: 0.22 });
    },
    combo() {
      tone({ type: 'sine', from: 990, to: 1320, dur: 0.08, vol: 0.2 });
    },
    powerup() {
      tone({ type: 'sine', from: 523, dur: 0.1, vol: 0.25 });
      tone({ type: 'sine', from: 659, dur: 0.1, vol: 0.25, delay: 0.08 });
      tone({ type: 'sine', from: 784, dur: 0.16, vol: 0.25, delay: 0.16 });
    },
    horn() {
      tone({ type: 'sawtooth', from: 196, dur: 0.35, vol: 0.2 });
      tone({ type: 'sawtooth', from: 294, dur: 0.35, vol: 0.2, delay: 0.02 });
    },
    lanternHit() {
      noise({ dur: 0.3, vol: 0.45, low: 300 });
      tone({ type: 'sawtooth', from: 110, to: 55, dur: 0.35, vol: 0.3 });
    },
    keeperHit() {
      tone({ type: 'sawtooth', from: 330, to: 110, dur: 0.18, vol: 0.3 });
      noise({ dur: 0.12, vol: 0.25, low: 600 });
    },
    gameOver() {
      [392, 311, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.28, delay: i * 0.22 }));
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'sine', from: f, dur: 0.28, vol: 0.26, delay: i * 0.12 }));
    },
  };
}
